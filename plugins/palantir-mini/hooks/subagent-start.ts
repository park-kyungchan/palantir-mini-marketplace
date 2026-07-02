// palantir-mini v1.1 — SubagentStart hook handler
// Fires on: SubagentStart (subagent begins execution)
//
// Emits a subagent_start event for team pipeline tracking (the former Lead-Protocol policy §Team default + Lazy-spawn).
// Renamed from AgentStart → SubagentStart to match Claude Code v2.1.110+ event schema.
//
// Phase B3 D3: env injection from agent .md frontmatter.
// Reads `env:` block from agent .md file (searched in 3 paths) and injects
// key=value pairs into process.env ONLY when the key was previously unset.
// Silent on missing file, parse errors, or file-read errors — never blocks agent start.
//
// PR 5.5 (sprint-116) — Per-agent isolated correlation marker.
// When SubagentStart payload carries agent_id, allocates a fresh correlationId
// and writes a per-agent marker file at:
//   <cwd>/.palantir-mini/session/correlation-markers/<sessionId>/<agentId>.json
// This eliminates the concurrent-subagent misattribution race from the legacy
// timestamp-keyed shared-dir approach (canonical plan v2 §4 row 5.5).
// Also emits subagent_correlation_bound event for audit trail.

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../scripts/log";
import { resolvePalantirMiniRoot } from "../lib/config/root";
import { writeCorrelationMarker } from "../lib/correlation/marker";
import { analyzeAgentMarkdown, formatOutputContractStatus, statusRequiresBlocking } from "../lib/agents/inventory";

interface HookPayload {
  agent_id?:        string;
  agent_name?:      string;
  task_id?:         string;
  session_id?:      string;
  cwd?:             string;
  transcript_path?: string;
  // Optional payload field carried by some Claude Code versions; not relied upon
  subagent_type?:   string;
}

/**
 * v1.36 / sprint-025 / W1.6 — Resolve a stable agent name when the SubagentStart
 * payload lacks `agent_name`. Pre-W1.6 behavior fell back to `agent_id` (an
 * opaque hash like "ab0ad9107e204d228"), which broke per-agent grading
 * histograms (rule 26 §Axis E + Agent #4 audit empirical evidence: 100% of
 * agent_start rows were nameless → NoAgentDefinition errorClass 56/56).
 *
 * Resolution order:
 *   1. payload.agent_name (when Claude Code populates it; v2.1.111+ for some Agent forms)
 *   2. payload.subagent_type (Claude Code Agent tool's `subagent_type` arg, sometimes propagates)
 *   3. payload.task_id slug-prefix match — task_id like "researcher-rule26-substrate-..." → "researcher"
 *   4. literal "subagent-unnamed" — final fallback (NEVER returns the opaque hash)
 *
 * The opaque agent_id hash is always preserved separately on the envelope's
 * `agentId` field for unique-spawn tracking; this function only resolves the
 * human-readable / histogram-bucketable name.
 */
export function resolveAgentName(p: HookPayload, knownAgentNames: Set<string>): string {
  if (p.agent_name && p.agent_name.length > 0) return p.agent_name;
  if (p.subagent_type && p.subagent_type.length > 0) return p.subagent_type;
  if (p.task_id) {
    // task_id pattern: "<agent-slug>-<task-tail>" (no underscore separator); pick longest known-name prefix
    for (const name of knownAgentNames) {
      if (p.task_id.startsWith(`${name}-`)) return name;
    }
  }
  return "subagent-unnamed";
}

/**
 * Build a Set of known agent slugs by reading directory listings of the 3
 * agent .md candidate paths. Filenames are <slug>.md; we strip the .md.
 * Silent on errors; returns empty Set when no paths resolve.
 */
export function collectKnownAgentNames(cwd: string): Set<string> {
  const names = new Set<string>();
  const home       = process.env.HOME ?? os.homedir();
  const pluginRoot = resolvePalantirMiniRoot();
  const dirs: string[] = [
    path.join(cwd, ".claude", "agents"),
    path.join(home, ".claude", "agents"),
    path.join(pluginRoot, "agents"),
  ];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith(".md")) names.add(entry.slice(0, -3));
      }
    } catch {
      // silent
    }
  }
  return names;
}

/**
 * Parses a simple YAML `env:` block from agent .md frontmatter.
 *
 * Expected shape inside the frontmatter block:
 *   env:
 *     KEY: "value"
 *     ANOTHER: value_no_quotes
 *
 * Rules:
 *   - Only reads key-value pairs that are 2-space-indented under `env:`.
 *   - Stops at the first non-indented line after the `env:` header.
 *   - Strips surrounding quotes (single or double) from values.
 *   - Returns an empty record on any parse issue (silent).
 */
export function parseEnvBlock(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    // Extract frontmatter block (--- ... ---)
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!fmMatch) return result;
    const fm = fmMatch[1] ?? "";

    const lines = fm.split("\n");
    let inEnv = false;

    for (const line of lines) {
      if (!inEnv) {
        // Look for top-level `env:` key
        if (/^env\s*:/.test(line)) {
          inEnv = true;
        }
        continue;
      }

      // We are inside the env block.
      // A 2-space-indented line continues the block.
      const indentMatch = line.match(/^  ([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)/);
      if (indentMatch) {
        const key = indentMatch[1]!;
        let val   = (indentMatch[2] ?? "").trim();
        // Strip surrounding quotes (single or double)
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
        continue;
      }

      // Any non-indented (or differently indented) line ends the env block.
      if (line.length > 0 && !line.startsWith("  ")) {
        break;
      }
    }
  } catch {
    // silent
  }
  return result;
}

/**
 * Resolves candidate paths for an agent .md file given its name.
 *
 * Search order:
 *   1. <cwd>/.claude/agents/<name>.md  (project-local)
 *   2. <HOME>/.claude/agents/<name>.md (user-global)
 *   3. <palantir-mini-root>/agents/<name>.md (plugin-bundled)
 */
export function agentMdCandidates(agentName: string, cwd: string): string[] {
  const home       = process.env.HOME ?? os.homedir();
  const pluginRoot = resolvePalantirMiniRoot();
  const candidates: string[] = [
    path.join(cwd, ".claude", "agents", `${agentName}.md`),
    path.join(home, ".claude", "agents", `${agentName}.md`),
    path.join(pluginRoot, "agents", `${agentName}.md`),
  ];
  return candidates;
}

/**
 * Finds and reads the first resolvable agent .md file for the given name.
 * Returns null when none of the candidate paths exist.
 */
export function readAgentMd(agentName: string, cwd: string): string | null {
  try {
    for (const candidate of agentMdCandidates(agentName, cwd)) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, "utf8");
      }
    }
  } catch {
    // silent
  }
  return null;
}

/**
 * Injects env vars from an agent .md `env:` block into process.env.
 * Only injects a key if it was previously unset (process.env[key] === undefined).
 * Silent on all errors.
 */
export function injectEnvFromAgentMd(agentName: string, cwd: string): void {
  try {
    const content = readAgentMd(agentName, cwd);
    if (!content) return;
    const envVars = parseEnvBlock(content);
    for (const [key, value] of Object.entries(envVars)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // silent — never block agent start
  }
}

export function outputContractStartAdvisory(agentName: string, cwd: string): string | null {
  try {
    const content = readAgentMd(agentName, cwd);
    if (!content) return null;
    const entry = analyzeAgentMarkdown(content, `agents/${agentName}.md`);
    if (!statusRequiresBlocking(entry)) return null;
    return `output contract advisory for mutation-capable agent "${agentName}": ${formatOutputContractStatus(entry)}`;
  } catch {
    return null;
  }
}

/**
 * Read a frontmatter field from agent .md content using a simple regex scan.
 * Returns the value as a string if found; null otherwise.
 * Never throws — silent on any parse error.
 */
export function readFrontmatterField(content: string, field: string): string | null {
  try {
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!fmMatch) return null;
    const fm = fmMatch[1] ?? "";
    // Match either:
    //   field: value
    //   field: "value"
    //   field: 'value'
    const re = new RegExp(`^${field}\\s*:\\s*(.+)$`, "m");
    const m = fm.match(re);
    if (!m) return null;
    let val = (m[1] ?? "").trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  } catch {
    return null;
  }
}

/**
 * Determine the current sprint number from the active sprint contracts.
 * Reads .palantir-mini/harness/sprints/ directory and picks the highest
 * sprint number found. Falls back to a hard-coded sentinel when unreadable.
 */
export function inferCurrentSprint(cwd: string): number {
  const FALLBACK = 77; // sprint-077 as of PR-14 cleanup (2026-05-13)
  try {
    const sprintsDir = path.join(cwd, ".palantir-mini", "harness", "sprints");
    if (!fs.existsSync(sprintsDir)) return FALLBACK;
    const entries = fs.readdirSync(sprintsDir);
    let max = 0;
    for (const entry of entries) {
      // Pattern: sprint-NNN-... or sprint-NNN_quick etc.
      const m = entry.match(/^sprint-(\d+)/);
      if (m) {
        const n = parseInt(m[1]!, 10);
        if (!isNaN(n) && n > max) max = n;
      }
    }
    return max > 0 ? max : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/**
 * Check if an agent is past its deprecation window and should be blocked.
 * Returns { blocked: true, reason } when the agent should be denied.
 * Returns { blocked: false } when the agent is allowed to start.
 *
 * Criteria (the former project-agent-authority policy §Deprecation window mechanics):
 *   - Agent frontmatter has `deprecated: true`
 *   - Agent frontmatter has `deprecationWindowEndsSprint: N` where N <= currentSprint
 */
export function checkDeprecationGate(
  agentName: string,
  cwd: string,
): { blocked: false } | { blocked: true; reason: string; endedSprint: number; currentSprint: number } {
  try {
    const content = readAgentMd(agentName, cwd);
    if (!content) return { blocked: false };

    const deprecatedVal = readFrontmatterField(content, "deprecated");
    if (deprecatedVal !== "true") return { blocked: false };

    const windowEndStr = readFrontmatterField(content, "deprecationWindowEndsSprint");
    if (!windowEndStr) return { blocked: false }; // no window end set — advisory only, not hard block

    const endedSprint   = parseInt(windowEndStr, 10);
    if (isNaN(endedSprint)) return { blocked: false };

    const currentSprint = inferCurrentSprint(cwd);
    if (currentSprint <= endedSprint) return { blocked: false }; // still in window

    const reason =
      `Agent '${agentName}' is RETIRED (the former project-agent-authority policy §Deprecation window mechanics): ` +
      `deprecationWindowEndsSprint=${endedSprint}, currentSprint=${currentSprint}. ` +
      `Use 'project-implementer' instead. See agents/${agentName}.md for tombstone details.`;
    return { blocked: true, reason, endedSprint, currentSprint };
  } catch {
    return { blocked: false }; // silent — never block on parse error
  }
}

export default async function subagentStart(payload: unknown): Promise<{ message: string } | { permissionDecision: "deny"; denialMessage: string }> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // W1.6 / sprint-025 — Resolve a stable name even when payload lacks agent_name.
  // Pre-fix this fell back to the opaque agent_id hash, which broke histograms.
  const knownNames        = collectKnownAgentNames(cwd);
  const resolvedAgentName = resolveAgentName(p, knownNames);
  const isHashFallback    = !p.agent_name && resolvedAgentName === "subagent-unnamed";

  // PR-14a (sprint-077) — Deprecation gate (the former project-agent-authority policy §Deprecation window mechanics).
  // Emit project_agent_collision_detected + deny spawn for agents past their window.
  if (resolvedAgentName !== "subagent-unnamed") {
    const gate = checkDeprecationGate(resolvedAgentName, cwd);
    if (gate.blocked) {
      // Emit event BEFORE denying (rule 10 — append-only; emit before action)
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:          "design",
            passed:         false,
            errorClass:     "project_agent_collision_detected",
            agentName:      resolvedAgentName,
            agentId:        p.agent_id ?? "unknown",
            endedSprint:    gate.endedSprint,
            currentSprint:  gate.currentSprint,
            recommendation: "use project-implementer",
            action:         "deny-spawn",
          } as Record<string, unknown>,
          toolName:    "SubagentStart",
          cwd,
          sessionId:   p.session_id,
          identity:    "claude-code",
          agentName:   resolvedAgentName,
          memoryLayers: ["procedural"],
          reasoning:   `Blocking spawn of retired agent '${resolvedAgentName}': deprecationWindowEndsSprint=${gate.endedSprint} expired at sprint ${gate.currentSprint}. Per the former project-agent-authority policy §Deprecation window mechanics, SubagentStart hook emits validation_phase_completed errorClass=project_agent_collision_detected and denies spawn. Use project-implementer for project-scoped implementation work.`,
        });
      } catch {
        // best-effort — emit failure must not suppress the deny
      }
      return {
        permissionDecision: "deny",
        denialMessage: gate.reason,
      };
    }
  }

  let outputContractAdvisory: string | null = null;
  if (resolvedAgentName !== "subagent-unnamed") {
    outputContractAdvisory = outputContractStartAdvisory(resolvedAgentName, cwd);
    if (outputContractAdvisory) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     false,
            errorClass: "agent_output_contract_advisory",
            agentName:  resolvedAgentName,
          } as Record<string, unknown>,
          toolName:    "SubagentStart",
          cwd,
          sessionId:   p.session_id,
          identity:    "monitor",
          agentName:   resolvedAgentName,
          memoryLayers: ["procedural", "semantic"],
          reasoning:   outputContractAdvisory,
        });
      } catch {
        // best-effort — advisory must not block SubagentStart.
      }
    }
  }

  // Phase B3 D3: inject env vars from agent .md before emit (silent on error).
  // Only attempt when we resolved a real agent name (not "subagent-unnamed").
  if (resolvedAgentName !== "subagent-unnamed") {
    injectEnvFromAgentMd(resolvedAgentName, cwd);
  }

  // PR 5.5 (sprint-116) — Per-agent isolated correlation marker binding.
  // Uses agent_id (the opaque hash from SubagentStart payload) as the stable
  // per-spawn subagentId key.  This guarantees at-most-one writer per spawn and
  // eliminates the concurrent-subagent misattribution race present in the legacy
  // timestamp-keyed shared-dir approach (canonical plan v2 §4 row 5.5).
  let boundCorrelationId: string | null = null;
  const agentIdForMarker = p.agent_id;
  const sessionIdForMarker = p.session_id;

  if (agentIdForMarker && agentIdForMarker !== "unknown" && sessionIdForMarker) {
    const correlationId = crypto.randomUUID();
    const spawnedAt = new Date().toISOString();
    const written = writeCorrelationMarker({
      projectRoot:   cwd,
      sessionId:     sessionIdForMarker,
      subagentId:    agentIdForMarker,
      correlationId,
      agentName:     resolvedAgentName,
      spawnedAt,
      extra: {
        taskId:    p.task_id,
      },
    });
    if (written) {
      boundCorrelationId = correlationId;
      // Emit subagent_correlation_bound audit event (rule 10 §5-dim, the former Lead-Protocol policy §Subagent decision audit invariant).
      // Uses validation_phase_completed errorClass="subagent_correlation_bound" since the EventEnvelope
      // discriminated union does not yet carry a dedicated variant (PR 5.5 follow-up to add it).
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:          "design",
            passed:         true,
            errorClass:     "subagent_correlation_bound",
            correlationId,
            subagentId:     agentIdForMarker,
            agentName:      resolvedAgentName,
            sessionId:      sessionIdForMarker,
            taskId:         p.task_id,
            spawnedAt,
            markerPath:     `correlation-markers/${sessionIdForMarker}/${agentIdForMarker}.json`,
          } as Record<string, unknown>,
          toolName:    "SubagentStart",
          cwd,
          sessionId:   sessionIdForMarker,
          identity:    "claude-code",
          agentName:   resolvedAgentName,
          memoryLayers: ["episodic", "procedural"],
          reasoning:
            `PR 5.5 sprint-116: subagent correlationId bound via per-agent isolated marker file at ` +
            `correlation-markers/${sessionIdForMarker}/${agentIdForMarker}.json. ` +
            `Eliminates concurrent-subagent misattribution race per canonical plan v2 §4 row 5.5 ` +
            `and the former Lead-Protocol policy §Subagent decision audit invariant. correlationId=${correlationId.slice(0, 8)}…`,
        });
      } catch {
        // best-effort — never block subagent start
      }
    }
  }

  // v1.35.0 / rule 26 §R4 — Tag with procedural memory layer (subagent spawn =
  // procedural how-to knowledge: which agent, which task) + episodic (this
  // specific spawn instance). agent_start replaces the earlier
  // subagent_state_validation duplicate per R4 plan.
  try {
    const agentNameSource = p.agent_name        ? "payload.agent_name"
                          : p.subagent_type     ? "payload.subagent_type"
                          : isHashFallback      ? "fallback-unnamed"
                          :                       "task_id-prefix";
    await emit({
      type: "agent_start",
      payload: {
        agentId:          p.agent_id ?? "unknown",       // opaque hash (unique spawn key)
        agentName:        resolvedAgentName,             // resolved, never the hash
        taskId:           p.task_id,
        // PR 5.5: include boundCorrelationId when marker write succeeded
        ...(boundCorrelationId !== null ? { correlationId: boundCorrelationId } : {}),
      },
      toolName:    "SubagentStart",
      cwd,
      sessionId:   p.session_id,
      identity:    "claude-code",
      agentName:   resolvedAgentName,
      memoryLayers: ["procedural", "episodic"],
      reasoning:   `subagent spawned; routes to procedural memory (agent role: ${resolvedAgentName}) + episodic memory (spawn instance). agentNameSource=${agentNameSource}. corrBound=${boundCorrelationId !== null ? "yes" : "no"}.`,
    });
  } catch {
    // best-effort
  }

  const corrMsg = boundCorrelationId !== null
    ? ` correlationId=${boundCorrelationId.slice(0, 8)}…`
    : "";
  const advisoryMsg = outputContractAdvisory ? `; ${outputContractAdvisory}` : "";
  return { message: `palantir-mini: subagent_start recorded (agent=${resolvedAgentName}${corrMsg})${advisoryMsg}` };
}
