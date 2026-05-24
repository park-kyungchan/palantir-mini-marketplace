// palantir-mini — subagent-orchestration-audit hook (W1.G sprint-037)
// Fires on: PostToolUse — Agent tool only
//
// Captures full Lead → subagent spawn event: correlationId, promptDigest,
// resolved model, spawn metadata. Writes a correlation file so W1.E
// agent-decision-log.ts can pair subsequent agent_decision_logged events
// to the originating spawn.
//
// Logic:
//   1. Parse Agent tool_input (subagent_type, description, prompt, team_name, mode, model).
//   2. Resolve model from agent .md frontmatter (strips namespace prefix, scans
//      <cwd>/.claude/agents/<name>.md → ~/.claude/agents/<name>.md → <PLUGIN_ROOT>/agents/<name>.md).
//   3. Generate UUIDv4 correlationId.
//   4. Compute promptDigest = sha256(full prompt).
//   5. Persist correlation file at <sessionDir>/.subagent-correlations/<ts>.json.
//   6. Emit validation_phase_completed{errorClass:"subagent_orchestration_audited"}.
//   7. async:true + timeout:5. Errors → stderr only, exit 0 always.
//
// Authority:
//   // rule 12 v3.4.0 §Subagent decision audit invariant + rule 26 §Axis E (audit substrate; orchestration trace)

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { resolvePalantirMiniRoot } from "../lib/config/root";
import { writeCorrelationMarker } from "../lib/correlation/marker";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    subagent_type?: string;
    description?:   string;
    prompt?:        string;
    team_name?:     string;
    mode?:          string;
    model?:         string;
    [key: string]:  unknown;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROMPT_DIGEST_MAX   = 2000; // chars to store in correlation file
const PROMPT_PREVIEW_MAX  = 500;  // chars in event payload
const DESC_MAX            = 200;  // description truncation
const TRUNCATE_SUFFIX     = "... [truncated]";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(s: string | undefined, maxLen: number): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - TRUNCATE_SUFFIX.length) + TRUNCATE_SUFFIX;
}

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Parses frontmatter `model:` field from an agent .md file content.
 * Returns "unknown" when not found.
 */
function parseModelFromFrontmatter(content: string): string {
  try {
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!fmMatch) return "unknown";
    const fm = fmMatch[1] ?? "";
    for (const line of fm.split("\n")) {
      const m = line.match(/^model\s*:\s*(.*)/);
      if (m) {
        let val = (m[1] ?? "").trim();
        // Strip surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return val.length > 0 ? val : "unknown";
      }
    }
  } catch {
    // silent
  }
  return "unknown";
}

/**
 * Resolve agent model from agent .md frontmatter.
 * subagent_type may be "palantir-mini:implementer" or bare "implementer".
 * Search order:
 *   1. <cwd>/.claude/agents/<name>.md  (project-local)
 *   2. <HOME>/.claude/agents/<name>.md (user-global)
 *   3. <palantir-mini-root>/agents/<name>.md (plugin-bundled)
 *
 * Returns "unknown" when no .md found or frontmatter missing model field.
 */
function resolveAgentModel(subagentType: string | undefined, cwd: string): string {
  if (!subagentType || subagentType.trim().length === 0) return "unknown";

  // Strip namespace prefix (e.g. "palantir-mini:implementer" → "implementer")
  const name = subagentType.includes(":") ? subagentType.split(":").slice(1).join(":") : subagentType;
  if (!name || name.trim().length === 0) return "unknown";

  const home       = process.env.HOME ?? "/home/palantirkc";
  const pluginRoot = resolvePalantirMiniRoot();

  const candidates: string[] = [
    path.join(cwd, ".claude", "agents", `${name}.md`),
    path.join(home, ".claude", "agents", `${name}.md`),
    path.join(pluginRoot, "agents", `${name}.md`),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const content = fs.readFileSync(candidate, "utf8");
      const model = parseModelFromFrontmatter(content);
      if (model !== "unknown") return model;
    } catch {
      // try next candidate
    }
  }

  return "unknown";
}

/**
 * Write a JSON file at <sessionDir>/.subagent-correlations/<spawnTimestamp>.json.
 * Creates the directory if absent.
 */
function writeCorrelationFile(
  cwd: string,
  filename: string,
  data: Record<string, unknown>,
): void {
  const corrDir = path.join(cwd, ".palantir-mini", "session", ".subagent-correlations");
  fs.mkdirSync(corrDir, { recursive: true });
  const filePath = path.join(corrDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  /** Read stdin as UTF-8. */
  async function readStdin(): Promise<string> {
    if (process.stdin.isTTY) return "";
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  const raw = await readStdin();
  let payload: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as HookPayload;
    } catch {
      process.stderr.write("[subagent-orchestration-audit] stdin is not valid JSON — skipping\n");
      process.exit(0);
    }
  }

  try {
    const cwd       = payload.cwd ?? process.cwd();
    const sessionId = payload.session_id;
    const inp       = payload.tool_input ?? {};

    const subagentType  = inp.subagent_type;
    const description   = inp.description;
    const prompt        = typeof inp.prompt === "string" ? inp.prompt : "";
    const teamName      = inp.team_name;
    const mode          = inp.mode;
    // Note: inp.model is the override field (should be absent per rule 12 §Model policy)
    // We report the frontmatter-resolved model instead.

    // 1. Resolve model from agent frontmatter
    const resolvedModel = resolveAgentModel(subagentType, cwd);

    // 2. Generate correlationId (UUIDv4)
    const correlationId = crypto.randomUUID();

    // 3. Compute promptDigest over FULL prompt
    const promptDigest = sha256Hex(prompt);

    // 4. Timestamps and filenames
    const spawnTimestamp = new Date().toISOString();
    // Filename: ISO timestamp sanitized to be filesystem-safe + correlationId prefix
    const safeTs = spawnTimestamp.replace(/[:.]/g, "-");
    const filename = `${safeTs}.json`;

    // 5a. Persist legacy timestamp-keyed correlation file (backward compat).
    // Kept for readers that have not yet migrated to per-agent marker files.
    const correlationData: Record<string, unknown> = {
      correlationId,
      leadAgent:       "claude-code",
      spawnedAgent:    subagentType,
      model:           resolvedModel,
      description:     truncate(description, DESC_MAX),
      promptDigest,
      spawnTimestamp,
      ...(teamName !== undefined ? { team_name: teamName } : {}),
      ...(mode     !== undefined ? { mode }                : {}),
    };

    try {
      writeCorrelationFile(cwd, filename, correlationData);
    } catch (writeErr) {
      process.stderr.write(
        `[subagent-orchestration-audit] Failed to write legacy correlation file: ${(writeErr as Error).message}\n`,
      );
      // Continue — best-effort; still emit the event
    }

    // 5b. PR 5.5 (sprint-116) — Write per-agent isolated correlation marker.
    // Key: <sessionId>/<correlationId>.json (correlationId acts as the stable
    // per-spawn identifier since agent_id is not available in PostToolUse context).
    // This eliminates the concurrent-subagent misattribution race (canonical plan v2 §4 row 5.5).
    const perAgentSubagentId = correlationId; // correlationId is UUIDv4, unique per spawn
    const effectiveSessionId = sessionId ?? "unknown-session";
    writeCorrelationMarker({
      projectRoot:   cwd,
      sessionId:     effectiveSessionId,
      subagentId:    perAgentSubagentId,
      correlationId,
      agentName:     subagentType ?? "unknown",
      spawnedAt:     spawnTimestamp,
      extra: {
        leadAgent:    "claude-code",
        model:        resolvedModel,
        description:  truncate(description, DESC_MAX),
        promptDigest,
        ...(teamName !== undefined ? { team_name: teamName } : {}),
        ...(mode     !== undefined ? { mode }                : {}),
      },
    });

    // 6. Emit validation_phase_completed{errorClass:"subagent_orchestration_audited"}
    const eventPayload: Record<string, unknown> = {
      phase:          "post_write",
      passed:         true,
      errorClass:     "subagent_orchestration_audited",
      // Extended spawn audit payload
      leadAgent:      "claude-code",
      spawnedAgent:   subagentType,
      model:          resolvedModel,
      description:    truncate(description, DESC_MAX),
      promptDigest,
      promptPreview:  truncate(prompt, PROMPT_PREVIEW_MAX),
      correlationId,
      // PR 5.5: expose per-agent subagentId so consumers can resolve the isolated marker
      subagentId:     perAgentSubagentId,
      markerPath:     `correlation-markers/${effectiveSessionId}/${perAgentSubagentId}.json`,
      spawnTimestamp,
      ...(teamName !== undefined ? { team_name: teamName } : {}),
      ...(mode     !== undefined ? { mode }                : {}),
    };

    await emit({
      type:    "validation_phase_completed",
      payload: eventPayload,
      toolName:    "PostToolUse",
      cwd,
      sessionId,
      identity:    "monitor",
      agentName:   "claude-code",
      memoryLayers: ["episodic", "procedural", "semantic", "working"],
      reasoning:
        `subagent-orchestration-audit: spawn captured. spawnedAgent=${subagentType ?? "unknown"} ` +
        `model=${resolvedModel} correlationId=${correlationId.slice(0, 8)}… ` +
        `promptDigest=${promptDigest.slice(0, 12)}…`,
    });

    // Output a hook result so Claude Code sees a structured response
    const result = {
      message: `palantir-mini: subagent_orchestration_audited — agent=${subagentType ?? "unknown"} model=${resolvedModel} correlationId=${correlationId.slice(0, 8)}…`,
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  } catch (e) {
    // Never fail — async advisory hook must not block Claude
    process.stderr.write(`[subagent-orchestration-audit] unhandled error: ${(e as Error).message}\n`);
    process.exit(0);
  }
}

void main();
