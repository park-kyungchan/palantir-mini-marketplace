// palantir-mini v6.25.0 — PreToolUse hook: agent-decision-trail-enforce
// Fires when a subagent invokes a gate-crossing MCP tool.
// Verifies that an agent_decision_logged event was emitted in the last 30s
// with the same correlationId. Advisory on miss; blocking after 5 strikes.
//
// Per canonical plan v2 §4 row 5.6 + rule 12 v3.4.0 §Subagent decision audit invariant.
//
// Gate-crossing tools:
//   mcp__plugin_palantir-mini_palantir-mini__apply_edit_function
//   mcp__plugin_palantir-mini_palantir-mini__commit_edits
//   mcp__plugin_palantir-mini_palantir-mini__emit_event
//   (excluded when emitting agent_decision_logged itself to avoid recursion)
//
// Bypass: PALANTIR_MINI_DECISION_AUDIT_BYPASS=1 (audited).
// Strike counter: .palantir-mini/session/decision-audit-strikes.json
// Reset strikes: PALANTIR_MINI_DECISION_AUDIT_RESET=1

import * as fs   from "fs";
import * as path from "path";
import { emit, eventsPathFor } from "../scripts/log";
import { readEvents }          from "../lib/event-log/read";
import { findProjectRoot }     from "./harness-base-mode-advisory";
import { readCorrelationMarker } from "../lib/correlation/marker";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?:   string;
    envelope?:  {
      byWhom?:   { agentName?: string; identity?: string };
      withWhat?: { reasoning?: string };
      payload?:  { errorClass?: string };
    };
    byWhom?:   { agentName?: string; identity?: string };
    withWhat?: { reasoning?: string };
    [key: string]:  unknown;
  };
}

interface HookResult {
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

interface StrikeFile {
  count:     number;
  sessionId: string;
  lastMiss:  string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GATE_CROSSING_TOOLS = new Set([
  "apply_edit_function",
  "commit_edits",
  "emit_event",
]);

const EMIT_EVENT_TOOL  = "emit_event";
const TRAIL_WINDOW_MS  = 30 * 1000;   // 30-second look-back window
const STRIKE_THRESHOLD = 5;           // blocking starts at strike 6 (after 5 advisory)

// Lead patterns — exempt from enforcement (same as agent-decision-log.ts)
const LEAD_AGENT_PATTERN = /^(claude-code$|lead-)/;

// ─── Strike file helpers ──────────────────────────────────────────────────────

function strikeFilePath(projectRoot: string): string {
  const dir = path.join(projectRoot, ".palantir-mini", "session");
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* best-effort */ }
  return path.join(dir, "decision-audit-strikes.json");
}

function readStrikes(projectRoot: string, sessionId: string): StrikeFile {
  const fp = strikeFilePath(projectRoot);
  try {
    if (fs.existsSync(fp)) {
      const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as StrikeFile;
      // Reset if session changed
      if (raw.sessionId === sessionId) return raw;
    }
  } catch { /* best-effort */ }
  return { count: 0, sessionId, lastMiss: new Date().toISOString() };
}

function writeStrikes(projectRoot: string, state: StrikeFile): void {
  const fp = strikeFilePath(projectRoot);
  const tmp = fp + ".tmp";
  try {
    fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
    fs.renameSync(tmp, fp);
  } catch { /* best-effort */ }
}

function incrementStrikes(projectRoot: string, sessionId: string): number {
  const current = readStrikes(projectRoot, sessionId);
  const updated: StrikeFile = {
    count:     current.count + 1,
    sessionId,
    lastMiss:  new Date().toISOString(),
  };
  writeStrikes(projectRoot, updated);
  return updated.count;
}

// ─── Agent name extraction ────────────────────────────────────────────────────

function extractAgentName(p: HookPayload): string {
  const inp = p.tool_input ?? {};
  const envelope = inp.envelope;
  const byWhom   = envelope?.byWhom ?? inp.byWhom ?? {};
  return byWhom.agentName ?? byWhom.identity ?? "unknown";
}

// ─── correlationId resolution (mirrors agent-decision-log.ts readCorrelationId) ─

function resolveCorrelationId(cwd: string, sessionId?: string): string | null {
  try {
    const subagentId = process.env["PALANTIR_MINI_SUBAGENT_ID"];
    const effectiveSessionId =
      sessionId ??
      process.env["CLAUDE_SESSION_ID"] ??
      process.env["PALANTIR_MINI_SESSION_ID"];

    if (subagentId && effectiveSessionId) {
      const marker = readCorrelationMarker({
        projectRoot: cwd,
        sessionId:   effectiveSessionId,
        subagentId,
      });
      if (marker) return marker.correlationId;
    }

    // Env-direct fallback
    const envId = process.env["PALANTIR_MINI_CORRELATION_ID"];
    if (envId && envId.length > 0) return envId;

    return null;
  } catch {
    return null;
  }
}

// ─── Trail check — scan events.jsonl tail for matching agent_decision_logged ───

function hasRecentDecisionLog(
  projectRoot: string,
  correlationId: string,
  windowMs: number,
): boolean {
  try {
    const eventsPath = eventsPathFor(projectRoot);
    const events     = readEvents(eventsPath);
    const cutoff     = Date.now() - windowMs;

    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i]!;
      if (new Date(ev.when).getTime() < cutoff) break;  // events sorted ASC; early-exit

      if (ev.type !== "validation_phase_completed") continue;

      const payload    = ev.payload as { errorClass?: string; correlationId?: string };
      if (payload.errorClass !== "agent_decision_logged") continue;
      if (payload.correlationId === correlationId)        return true;
    }
  } catch { /* best-effort */ }
  return false;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Read stdin ────────────────────────────────────────────────────────────
  async function readStdin(): Promise<string> {
    if (process.stdin.isTTY) return "";
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  const raw = await readStdin();
  let p: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      p = JSON.parse(raw) as HookPayload;
    } catch {
      process.stderr.write("[agent-decision-trail-enforce] stdin not valid JSON — skipping\n");
      process.stdout.write(JSON.stringify({ message: "agent-decision-trail-enforce: stdin parse error — skipping", decision: "continue" }) + "\n");
      process.exit(0);
      return;
    }
  }

  let result: HookResult;
  try {
    result = await handlePreToolUse(p);
  } catch (err) {
    process.stderr.write(`[agent-decision-trail-enforce] unhandled error: ${(err as Error).message}\n`);
    result = { message: "agent-decision-trail-enforce: unhandled error — continuing", decision: "continue" };
  }

  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

async function handlePreToolUse(p: HookPayload): Promise<HookResult> {
  const toolName  = p.tool_name ?? "";
  const normalizedToolName = normalizePalantirMiniMcpToolName(toolName);
  const cwd       = p.cwd ?? process.cwd();
  const sessionId = p.session_id;

  // ── 1. Only inspect gate-crossing tools ───────────────────────────────────
  if (!GATE_CROSSING_TOOLS.has(normalizedToolName)) {
    return {
      message: `agent-decision-trail-enforce: skipped (tool=${toolName})`,
      decision: "continue",
    };
  }

  // ── 2. Skip when emit_event is emitting agent_decision_logged itself ───────
  // Prevents the agent-decision-log PostToolUse hook from triggering this check
  // for its own emission, which would be a self-referential loop.
  if (normalizedToolName === EMIT_EVENT_TOOL) {
    const errorClass =
      p.tool_input?.envelope?.payload?.errorClass ??
      (p.tool_input?.["payload"] as { errorClass?: string } | undefined)?.errorClass;
    if (errorClass === "agent_decision_logged") {
      return {
        message: "agent-decision-trail-enforce: skipped (emitting agent_decision_logged itself)",
        decision: "continue",
      };
    }
  }

  // ── 3. Bypass via env var ─────────────────────────────────────────────────
  if (process.env.PALANTIR_MINI_DECISION_AUDIT_BYPASS === "1") {
    void emit({
      type:    "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "decision_audit_bypass_invoked" },
      toolName: "PreToolUse",
      cwd,
      sessionId,
      identity:     "monitor",
      memoryLayers: ["procedural"],
      reasoning:    `agent-decision-trail-enforce: bypass via PALANTIR_MINI_DECISION_AUDIT_BYPASS=1 (tool=${toolName})`,
    }).catch(() => {});
    return {
      message:  "agent-decision-trail-enforce: BYPASS (env PALANTIR_MINI_DECISION_AUDIT_BYPASS=1)",
      decision: "continue",
    };
  }

  // ── 4. Lead-direct is exempt (rule 12 v3.4.0 §Subagent decision audit) ────
  const agentName = extractAgentName(p);
  if (LEAD_AGENT_PATTERN.test(agentName)) {
    return {
      message:  `agent-decision-trail-enforce: Lead-direct exempt (agent=${agentName})`,
      decision: "continue",
    };
  }

  // ── 5. Resolve project root ───────────────────────────────────────────────
  const projectFromInput = p.tool_input?.project;
  const projectRoot = (typeof projectFromInput === "string" && projectFromInput.length > 0)
    ? projectFromInput
    : findProjectRoot(cwd);

  if (!projectRoot) {
    return {
      message:  "agent-decision-trail-enforce: skipped (no project root)",
      decision: "continue",
    };
  }

  // ── 6. Resolve correlationId for this subagent ────────────────────────────
  const correlationId = resolveCorrelationId(cwd, sessionId);

  if (!correlationId) {
    // No correlationId → cannot verify trail; emit advisory and continue.
    void emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     false,
        errorClass: "agent_decision_trail_missing",
        reason:     "no_correlation_id",
        agentName,
        toolName,
        advisory:   "agent-decision-trail-enforce: no correlationId available — cannot verify trail. Upgrade to PR 5.5+ subagent-start marker write (canonical plan v2 §4 row 5.5).",
      } as Record<string, unknown>,
      toolName: "PreToolUse",
      cwd,
      sessionId,
      identity:     "monitor",
      agentName,
      memoryLayers: ["procedural"],
      reasoning:    `agent-decision-trail-enforce advisory: no correlationId for agent=${agentName} tool=${toolName} — cannot verify decision trail pairing`,
      refinementTarget: {
        kind:            "rule-conformance-policy",
        filePathOrRid:   "rule 12 v3.4.0 §Subagent decision audit invariant",
        description:     `Subagent ${agentName} issued ${toolName} but correlationId unavailable (PR 5.5 marker not set)`,
        confidenceLevel: "medium",
      },
    }).catch(() => {});

    return {
      message:  `agent-decision-trail-enforce: advisory (no correlationId, agent=${agentName})`,
      decision: "continue",
      hookSpecificOutput: {
        additionalContext:
          "Subagent correlationId not available. Ensure subagent-start.ts sets PALANTIR_MINI_SUBAGENT_ID (PR 5.5).",
      },
    };
  }

  // ── 7. Check for paired agent_decision_logged event in last 30s ───────────

  // Optional reset: clear strike counter
  if (process.env.PALANTIR_MINI_DECISION_AUDIT_RESET === "1") {
    writeStrikes(projectRoot, { count: 0, sessionId: sessionId ?? "unknown", lastMiss: new Date().toISOString() });
  }

  const trailFound = hasRecentDecisionLog(projectRoot, correlationId, TRAIL_WINDOW_MS);

  if (trailFound) {
    return {
      message:  `agent-decision-trail-enforce: trail OK (correlationId=${correlationId.slice(0, 8)}… agent=${agentName} tool=${toolName})`,
      decision: "continue",
    };
  }

  // ── 8. Trail missing — increment strike counter ───────────────────────────
  const strikeCount = incrementStrikes(projectRoot, sessionId ?? "unknown");

  // Emit advisory event regardless of strike count
  void emit({
    type:    "validation_phase_completed",
    payload: {
      phase:         "design",
      passed:        false,
      errorClass:    "agent_decision_trail_missing",
      agentName,
      toolName,
      correlationId,
      strikeCount,
      advisory:      `No agent_decision_logged event found for correlationId=${correlationId} in last ${TRAIL_WINDOW_MS / 1000}s. ` +
                     `Strike ${strikeCount}/${STRIKE_THRESHOLD} — blocking starts at strike ${STRIKE_THRESHOLD + 1}.`,
    } as Record<string, unknown>,
    toolName: "PreToolUse",
    cwd,
    sessionId,
    identity:     "monitor",
    agentName,
    memoryLayers: ["procedural", "episodic"],
    reasoning:    `agent-decision-trail-enforce: no paired agent_decision_logged for correlationId=${correlationId} agent=${agentName} tool=${toolName}. Strike ${strikeCount}/${STRIKE_THRESHOLD}. Rule 12 v3.4.0 §Subagent decision audit invariant.`,
    refinementTarget: {
      kind:            "rule-conformance-policy",
      filePathOrRid:   "rule 12 v3.4.0 §Subagent decision audit invariant",
      description:     `Subagent ${agentName} issued ${toolName} without a paired agent_decision_logged event in last ${TRAIL_WINDOW_MS / 1000}s (strike ${strikeCount})`,
      confidenceLevel: "high",
    },
  }).catch(() => {});

  // ── 9. Strike count < STRIKE_THRESHOLD → advisory only ───────────────────
  if (strikeCount <= STRIKE_THRESHOLD) {
    return {
      message:  `agent-decision-trail-enforce: advisory — trail missing (correlationId=${correlationId.slice(0, 8)}… agent=${agentName} strike=${strikeCount}/${STRIKE_THRESHOLD})`,
      decision: "continue",
      hookSpecificOutput: {
        additionalContext: [
          `agent-decision-trail-enforce: no paired agent_decision_logged event within last ${TRAIL_WINDOW_MS / 1000}s for correlationId=${correlationId}.`,
          `Strike ${strikeCount} of ${STRIKE_THRESHOLD} — after ${STRIKE_THRESHOLD} advisory strikes, the 6th gate-crossing MCP call will be blocked.`,
          ``,
          `Likely cause: the preceding MCP tool call did not have a paired agent_decision_logged event`,
          `emitted by agent-decision-log PostToolUse hook. Ensure rule 12 v3.4.0 §Subagent decision`,
          `audit invariant is satisfied (agent-decision-log.ts PostToolUse hook active and not suppressed).`,
          ``,
          `Bypass: PALANTIR_MINI_DECISION_AUDIT_BYPASS=1 (audited).`,
          `Reset strike count: PALANTIR_MINI_DECISION_AUDIT_RESET=1`,
        ].join("\n"),
      },
    };
  }

  // ── 10. Strike count > STRIKE_THRESHOLD → block 6th+ gate-crossing call ──
  const blockReason = [
    `palantir-mini agent-decision-trail-enforce BLOCK (agent=${agentName})`,
    ``,
    `Strike count = ${strikeCount} exceeds threshold of ${STRIKE_THRESHOLD}.`,
    ``,
    `This subagent has issued gate-crossing MCP calls (apply_edit_function / commit_edits / emit_event)`,
    `without paired agent_decision_logged events ${strikeCount} times in this session.`,
    ``,
    `=== RULE ===`,
    `Rule 12 v3.4.0 §Subagent decision audit invariant:`,
    `"Every spawned subagent's MCP tool calls auto-emit agent_decision_logged event"`,
    ``,
    `=== DIAGNOSIS ===`,
    `The agent-decision-log PostToolUse hook (agent-decision-log.ts) is either:`,
    `  - Not active or suppressed for this agent`,
    `  - Running but failing to emit within the ${TRAIL_WINDOW_MS / 1000}s window`,
    `  - Blocked by a recursion filter incorrectly classifying this agent as Lead-tier`,
    ``,
    `=== REMEDIATION ===`,
    `1. Verify agent-decision-log PostToolUse hook is active: check hooks.json PreToolUse/PostToolUse entries.`,
    `2. Check the LEAD_AGENT_PATTERN — confirm agent="${agentName}" is not being classified as Lead-tier.`,
    `3. Inspect recent events.jsonl for agent_decision_logged entries.`,
    ``,
    `Bypass for emergency only: PALANTIR_MINI_DECISION_AUDIT_BYPASS=1 (audited).`,
    `Reset strike count: PALANTIR_MINI_DECISION_AUDIT_RESET=1`,
    ``,
    `Cross-ref: canonical plan v2 §4 row 5.6 + rule 12 v3.4.0 §Subagent decision audit invariant`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/agent-decision-trail-enforce] BLOCK ${blockReason}\n`);

  void emit({
    type:    "validation_phase_completed",
    payload: {
      phase:         "design",
      passed:        false,
      errorClass:    "agent_decision_trail_blocked",
      agentName,
      toolName,
      correlationId,
      strikeCount,
    } as Record<string, unknown>,
    toolName: "PreToolUse",
    cwd,
    sessionId,
    identity:     "monitor",
    agentName,
    memoryLayers: ["procedural", "episodic"],
    reasoning:    `agent-decision-trail-enforce BLOCK: strikeCount=${strikeCount} > threshold=${STRIKE_THRESHOLD} for agent=${agentName} tool=${toolName} (canonical plan v2 §4 row 5.6 + rule 12 v3.4.0 §Subagent decision audit invariant)`,
    refinementTarget: {
      kind:            "rule-conformance-policy",
      filePathOrRid:   "rule 12 v3.4.0 §Subagent decision audit invariant",
      description:     `Blocking ${agentName} after ${strikeCount} missed agent_decision_logged events (threshold ${STRIKE_THRESHOLD}); escalated from advisory to blocking`,
      confidenceLevel: "high",
    },
  }).catch(() => {});

  return {
    message:  `agent-decision-trail-enforce: BLOCK (strikeCount=${strikeCount} > ${STRIKE_THRESHOLD}, agent=${agentName})`,
    decision: "block",
    reason:   blockReason,
    hookSpecificOutput: {
      permissionDecision:       "deny",
      permissionDecisionReason: blockReason,
      additionalContext:
        "agent-decision-trail-enforce blocked: audit trail enforcement. " +
        "Bypass: PALANTIR_MINI_DECISION_AUDIT_BYPASS=1. Reset: PALANTIR_MINI_DECISION_AUDIT_RESET=1.",
    },
  };
}

void main();
