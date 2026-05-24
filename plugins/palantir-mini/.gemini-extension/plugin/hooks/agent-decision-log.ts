// palantir-mini PR-13 — Hook enforcement level
//   enforcement: advisory
//   rationale:   async:true in hooks.json; logs agent rationale events for apply_edit_function/commit_edits/emit_event; never blocks.
// palantir-mini — agent-decision-log hook (W1.E sprint-037; recursion filter sprint-060 W1.4)
// Fires on: PreToolUse + PostToolUse for apply_edit_function, commit_edits,
//           emit_event MCP tools.
//
// PreToolUse logic (decision rationale gate):
//   - Lead (agentName="claude-code") is EXEMPT — full-context Lead-direct.
//   - Subagent with missing / empty / <10-char reasoning → advisory (or deny
//     when PALANTIR_MINI_RATIONALE_BLOCKING=1).
//
// PostToolUse logic (always-emit decision log):
//   - Computes sha256 of canonical input JSON as inputDigest.
//   - Truncates reasoning/hypothesis to ≤1000 chars.
//   - Attempts to read correlationId from subagent-correlations/ (W1.G).
//   - Emits validation_phase_completed{errorClass:"agent_decision_logged"}.
//
// Recursion filter (sprint-060 W1.4, closes P1.LD5/D.10):
//   Architecture review found agent_decision_logged envelopes mostly
//   self-referenced Lead's own emit_event calls, creating a recursion loop
//   that inflated T1 count without informational value. The filter skips
//   PostToolUse emission when Lead-tier agents call emit_event. Specifically:
//     - toolName = mcp__plugin_palantir-mini_palantir-mini__emit_event
//     - agentName matches /^lead-/ OR is "claude-code"
//   Non-Lead agents emitting emit_event are kept (e.g. researcher logging a finding).
//   A recursion_filter_applied counter is maintained in a 1h sliding window
//   at /tmp/claude-hooks/<sessionId>/recursion-filter-counts.json.
//
// Invocation: bun run hooks/agent-decision-log.ts pre|post
// (Hook is run directly as a Bun script, not via scripts/run.ts, because it
//  needs pre/post mode dispatch from argv.)
//
// Authority:
//   rule 12 v3.4.0 §Subagent decision audit invariant
//   rule 26 §Axis E (audit substrate — episodic + procedural + semantic + working)
//
// Cross-ref code comment: // rule 12 v3.4.0 §Subagent decision audit invariant + rule 26 §Axis E (audit substrate)

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { readCorrelationMarker, readAllMarkersForSession } from "../lib/correlation/marker";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?:   string;
    sprintRef?: string;
    sprintId?:  string;
    envelope?: {
      byWhom?:    { agentName?: string; identity?: string };
      withWhat?:  { reasoning?: string; hypothesis?: string; memoryLayers?: string[] };
      payload?:   Record<string, unknown>;
    };
    // For apply_edit_function / commit_edits the byWhom/withWhat may be top-level
    byWhom?:   { agentName?: string; identity?: string };
    withWhat?: { reasoning?: string; hypothesis?: string; memoryLayers?: string[] };
    [key: string]: unknown;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const EMIT_EVENT_TOOL = "emit_event";

const DECISION_LOG_TOOLS = new Set([
  "apply_edit_function",
  "commit_edits",
  EMIT_EVENT_TOOL,
]);

const MAX_TEXT_LEN = 1000;
const TRUNCATE_SUFFIX = "... [truncated]";

// ─── Recursion-filter constants (sprint-060 W1.4) ────────────────────────────

/**
 * Agent name patterns that are considered "Lead-tier emitters".
 * When such an agent calls emit_event, the PostToolUse decision-log emission
 * is suppressed to break the self-referential recursion loop (P1.LD5/D.10).
 *
 * Matches:
 *   - "claude-code"  — the default Lead-direct agent identity
 *   - /^lead-/       — any explicitly-named Lead variant (e.g. "lead-opus[1m]")
 */
const LEAD_AGENT_PATTERN = /^(claude-code$|lead-)/;

/** 1-hour sliding window in milliseconds for the recursion-filter counter. */
const FILTER_WINDOW_MS = 60 * 60 * 1000;

/** Bucket file path for the 1h sliding window counter. */
function filterCountPath(sessionId: string): string {
  const dir = path.join("/tmp", "claude-hooks", sessionId);
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* best-effort */ }
  return path.join(dir, "recursion-filter-counts.json");
}

interface FilterBucket { count: number; windowStart: number; }

/**
 * Increment the 1h sliding window counter for recursion_filter_applied.
 * Returns the updated total count for the current window.
 * Best-effort: never throws.
 */
function incrementFilterCount(sessionId: string): number {
  const fpath = filterCountPath(sessionId);
  let bucket: FilterBucket = { count: 0, windowStart: Date.now() };
  try {
    if (fs.existsSync(fpath)) {
      const raw = JSON.parse(fs.readFileSync(fpath, "utf8")) as FilterBucket;
      if (Date.now() - raw.windowStart < FILTER_WINDOW_MS) {
        bucket = raw;
      }
      // else: window expired → reset
    }
  } catch { /* best-effort */ }
  bucket.count += 1;
  try { fs.writeFileSync(fpath, JSON.stringify(bucket), "utf8"); } catch { /* best-effort */ }
  return bucket.count;
}

/**
 * Returns true when the PostToolUse log-emission SHOULD BE SKIPPED.
 *
 * Condition: the tool is emit_event AND the calling agent is Lead-tier.
 * This breaks the self-referential loop: Lead emits event → hook fires →
 * hook emits another event → hook fires again (repeat).
 *
 * Non-Lead agents calling emit_event are intentional (e.g. researcher logging
 * a finding) and are KEPT.
 */
function shouldFilterRecursion(toolName: string, agentName: string): boolean {
  return (
    normalizePalantirMiniMcpToolName(toolName) === EMIT_EVENT_TOOL &&
    LEAD_AGENT_PATTERN.test(agentName)
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Truncate a string to ≤maxLen chars, appending suffix if cut. */
function truncate(s: string | undefined, maxLen: number): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - TRUNCATE_SUFFIX.length) + TRUNCATE_SUFFIX;
}

/** Compute sha256 of canonical (sorted-key) JSON string. */
function sha256Canonical(input: unknown): string {
  const canonical = JSON.stringify(input, Object.keys(input as Record<string, unknown>).sort());
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Extract byWhom + withWhat from the payload.
 * For emit_event the envelope nests these; for apply_edit_function / commit_edits
 * they may appear at the top level of tool_input.
 */
function extractFields(p: HookPayload): {
  agentName:    string;
  reasoning:    string | undefined;
  hypothesis:   string | undefined;
  memoryLayers: string[] | undefined;
  sprintRef:    string | undefined;
} {
  const inp = p.tool_input ?? {};

  // Prefer envelope (emit_event MCP pattern)
  const envelope = inp.envelope;
  const byWhom   = envelope?.byWhom   ?? inp.byWhom   ?? {};
  const withWhat = envelope?.withWhat ?? inp.withWhat ?? {};

  const agentName = byWhom.agentName ?? byWhom.identity ?? "unknown";
  const reasoning   = withWhat.reasoning;
  const hypothesis  = withWhat.hypothesis;
  const memoryLayers = withWhat.memoryLayers;
  const sprintRef  = inp.sprintRef ?? inp.sprintId ?? undefined;

  return { agentName, reasoning, hypothesis, memoryLayers, sprintRef };
}

/**
 * PR 5.5 (sprint-116): Resolve correlationId using per-agent isolated marker files.
 *
 * Resolution order (eliminates concurrent-subagent misattribution race):
 *   1. Per-agent marker: reads correlation-markers/<sessionId>/<subagentId>.json
 *      using PALANTIR_MINI_CORRELATION_ID env (set during subagent spawn) or
 *      PALANTIR_MINI_SUBAGENT_ID env as the subagentId key.
 *   2. Env fallback: if PALANTIR_MINI_CORRELATION_ID is set directly, use it.
 *   3. Legacy shared-dir fallback: reads most-recently-sorted file from
 *      .subagent-correlations/ (backward compat for pre-PR-5.5 spawns).
 *      Emits advisory when falling back to legacy path.
 *
 * Never throws — returns null on any error.
 *
 * Authority: canonical plan v2 §4 row 5.5 + rule 12 §Subagent decision audit invariant
 */
function readCorrelationId(cwd: string, sessionId?: string): {
  correlationId: string | null;
  source: "per-agent" | "env-direct" | "legacy" | "none";
} {
  try {
    // Path 1: per-agent marker via env-supplied subagentId (set by subagent-start.ts hook)
    const subagentId = process.env["PALANTIR_MINI_SUBAGENT_ID"];
    const effectiveSessionId = sessionId ?? process.env["CLAUDE_SESSION_ID"] ?? process.env["PALANTIR_MINI_SESSION_ID"];

    if (subagentId && effectiveSessionId) {
      const marker = readCorrelationMarker({
        projectRoot: cwd,
        sessionId:   effectiveSessionId,
        subagentId,
      });
      if (marker) {
        return { correlationId: marker.correlationId, source: "per-agent" };
      }
    }

    // Path 2: env-direct fallback (PALANTIR_MINI_CORRELATION_ID set by subagent-start.ts)
    const envCorrelationId = process.env["PALANTIR_MINI_CORRELATION_ID"];
    if (envCorrelationId && typeof envCorrelationId === "string" && envCorrelationId.length > 0) {
      return { correlationId: envCorrelationId, source: "env-direct" };
    }

    // Path 3: legacy shared-dir fallback (backward compat for pre-PR-5.5 spawns).
    // Reads most-recently-sorted file; this is the old race-prone path.
    // Advisory is emitted in the PostToolUse handler when source === "legacy".
    const corrDir = path.join(cwd, ".palantir-mini", "session", ".subagent-correlations");
    if (!fs.existsSync(corrDir)) return { correlationId: null, source: "none" };
    const files = fs.readdirSync(corrDir)
      .filter((f: string) => f.endsWith(".json"))
      .sort()
      .reverse(); // latest first
    if (files.length === 0) return { correlationId: null, source: "none" };
    const raw = fs.readFileSync(path.join(corrDir, files[0]!), "utf8");
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const cid = typeof obj["correlationId"] === "string" ? obj["correlationId"] : null;
    return { correlationId: cid, source: cid !== null ? "legacy" : "none" };
  } catch {
    return { correlationId: null, source: "none" };
  }
}

// ─── PreToolUse handler ───────────────────────────────────────────────────────

async function handlePre(p: HookPayload): Promise<HookResult> {
  const toolName = p.tool_name ?? "";
  const normalizedToolName = normalizePalantirMiniMcpToolName(toolName);
  const cwd      = p.cwd ?? process.cwd();

  if (!DECISION_LOG_TOOLS.has(normalizedToolName)) {
    return { message: `agent-decision-log (pre): skipped (tool=${toolName})`, decision: "continue" };
  }

  const { agentName, reasoning } = extractFields(p);

  // Lead-direct is exempt (rule 12 v3.4.0 §Subagent decision audit invariant)
  if (agentName === "claude-code") {
    return {
      message: "agent-decision-log (pre): Lead-direct exempt",
      decision: "continue",
    };
  }

  // Evaluate rationale presence
  const rationaleOk = typeof reasoning === "string" && reasoning.trim().length >= 10;

  if (rationaleOk) {
    return {
      message: `agent-decision-log (pre): rationale OK (agent=${agentName})`,
      decision: "continue",
    };
  }

  // Blocking mode
  if (process.env.PALANTIR_MINI_RATIONALE_BLOCKING === "1") {
    const denyReason = [
      `agent-decision-log BLOCK: subagent rationale missing or too short (agent=${agentName})`,
      ``,
      `Rule 12 v3.4.0 §Subagent decision audit invariant + rule 26 §Axis E:`,
      `Subagent must declare withWhat.reasoning (≥10 chars) before MCP edit/emit.`,
      `Use /palantir-mini:pm-delegate-or-direct briefing template.`,
      ``,
      `To opt out: PALANTIR_MINI_RATIONALE_BLOCKING=0`,
    ].join("\n");

    // Best-effort emit advisory event
    void emit({
      type:    "validation_phase_completed",
      payload: { phase: "design", passed: false, errorClass: "decision_rationale_blocking" },
      toolName: "PreToolUse",
      cwd,
      sessionId:  p.session_id,
      identity:   "monitor",
      agentName,
      memoryLayers: ["procedural"],
      reasoning: `agent-decision-log BLOCK: rationale absent/short for agent=${agentName} tool=${toolName}`,
      refinementTarget: {
        kind:            "rule-conformance-policy",
        filePathOrRid:   "rule 12 v3.4.0 §Subagent decision audit invariant",
        description:     `Subagent ${agentName} issued ${toolName} without adequate reasoning`,
        confidenceLevel: "high",
      },
    }).catch(() => {});

    return {
      message:  `agent-decision-log (pre): BLOCK — rationale absent (agent=${agentName})`,
      decision: "block",
      reason:   denyReason,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: denyReason,
        additionalContext:
          "Subagent must declare reasoning before MCP edit/emit. Use /palantir-mini:pm-delegate-or-direct briefing template.",
      },
    };
  }

  // Advisory mode (default)
  void emit({
    type:    "validation_phase_completed",
    payload: { phase: "design", passed: false, errorClass: "decision_rationale_advisory" },
    toolName: "PreToolUse",
    cwd,
    sessionId:  p.session_id,
    identity:   "monitor",
    agentName,
    memoryLayers: ["procedural"],
    reasoning: `agent-decision-log advisory: rationale absent/short for agent=${agentName} tool=${toolName}`,
    refinementTarget: {
      kind:            "rule-conformance-policy",
      filePathOrRid:   "rule 12 v3.4.0 §Subagent decision audit invariant",
      description:     `Subagent ${agentName} issued ${toolName} without adequate reasoning`,
      confidenceLevel: "medium",
    },
  }).catch(() => {});

  return {
    message:  `agent-decision-log (pre): advisory — rationale absent (agent=${agentName})`,
    decision: "continue",
    hookSpecificOutput: {
      additionalContext:
        "Subagent must declare reasoning before MCP edit/emit. Use /palantir-mini:pm-delegate-or-direct briefing template.",
    },
  };
}

// ─── PostToolUse handler ──────────────────────────────────────────────────────

async function handlePost(p: HookPayload): Promise<HookResult> {
  const toolName = p.tool_name ?? "";
  const normalizedToolName = normalizePalantirMiniMcpToolName(toolName);
  const cwd      = p.cwd ?? process.cwd();

  if (!DECISION_LOG_TOOLS.has(normalizedToolName)) {
    return { message: `agent-decision-log (post): skipped (tool=${toolName})`, decision: "continue" };
  }

  const { agentName, reasoning, hypothesis, memoryLayers, sprintRef } = extractFields(p);

  // ─── Recursion filter (sprint-060 W1.4, closes P1.LD5/D.10) ─────────────
  // When Lead calls emit_event, skip logging the agent_decision_logged event to
  // avoid the self-referential recursion loop. Track the suppression in a 1h
  // sliding window counter so it is observable without polluting events.jsonl.
  if (shouldFilterRecursion(toolName, agentName)) {
    const sessionId = p.session_id ?? "unknown";
    const windowCount = incrementFilterCount(sessionId);
    return {
      message: `agent-decision-log (post): recursion_filter_applied — skipped emit_event from Lead-tier agent=${agentName} (1h window count=${windowCount})`,
      decision: "continue",
    };
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Compute input digest (sha256 of canonical JSON of tool_input)
  let inputDigest = "unknown";
  try {
    inputDigest = sha256Canonical(p.tool_input ?? {});
  } catch {
    // best-effort
  }

  const truncatedReasoning  = truncate(reasoning,  MAX_TEXT_LEN);
  const truncatedHypothesis = truncate(hypothesis, MAX_TEXT_LEN);

  // PR 5.5 (sprint-116) — Resolve correlationId using per-agent isolated marker.
  // Eliminates concurrent-subagent misattribution race (canonical plan v2 §4 row 5.5).
  const { correlationId, source: corrSource } = readCorrelationId(cwd, p.session_id);

  // Emit advisory when falling back to legacy shared-dir marker (backward compat path).
  if (corrSource === "legacy") {
    void emit({
      type:    "validation_phase_completed",
      payload: {
        phase:          "post_write",
        passed:         false,
        errorClass:     "legacy_correlation_marker",
        agentName,
        toolName,
        advisory:       "agent-decision-log reading correlationId from legacy shared-dir (.subagent-correlations). " +
                        "Concurrent subagents may be misattributed. Upgrade to PR 5.5+ per-agent marker path " +
                        "(canonical plan v2 §4 row 5.5).",
      } as Record<string, unknown>,
      toolName: "PostToolUse",
      cwd,
      sessionId:   p.session_id,
      identity:    "monitor",
      agentName,
      memoryLayers: ["procedural"],
      reasoning:   `agent-decision-log: legacy correlation source detected for agent=${agentName} — correlation-markers per-agent path not populated; falling back to shared-dir (misattribution risk per canonical plan v2 §4 row 5.5)`,
      refinementTarget: {
        kind:            "rule-conformance-policy",
        filePathOrRid:   "hooks/subagent-orchestration-audit.ts",
        description:     "Legacy correlation path used — upgrade to per-agent marker write (PR 5.5)",
        confidenceLevel: "medium",
      },
    }).catch(() => {});
  }

  // Always emit agent_decision_logged (rule 12 + rule 26 §Axis E)
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "post_write",
      passed:     true,
      errorClass: "agent_decision_logged",
      // Extended decision-log payload
      toolName,
      agentName,
      inputDigest,
      reasoning:    truncatedReasoning,
      hypothesis:   truncatedHypothesis,
      sprintRef,
      memoryLayers,
      correlationId,
      correlationSource: corrSource,  // PR 5.5: expose resolution path for audit
    } as Record<string, unknown>,
    toolName: "PostToolUse",
    cwd,
    sessionId:   p.session_id,
    identity:    "monitor",
    agentName,
    memoryLayers: (memoryLayers as import("#schemas/ontology/primitives/agentic-memory-layer").AgenticMemoryLayer[] | undefined) ?? ["episodic", "procedural"],
    reasoning: `agent-decision-log: captured decision for agent=${agentName} tool=${toolName} digest=${inputDigest} corrSource=${corrSource}`,
  }).catch(() => {});

  return {
    message: `agent-decision-log (post): agent_decision_logged emitted (agent=${agentName} tool=${toolName} digest=${inputDigest.slice(0, 12)}… corrSource=${corrSource})`,
    decision: "continue",
  };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const mode = process.argv[2]; // "pre" | "post"

  /** Read stdin as UTF-8 (same as scripts/run.ts pattern). */
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
      process.stderr.write("[agent-decision-log] stdin is not valid JSON — skipping\n");
      process.exit(0);
    }
  }

  try {
    let result: HookResult;
    if (mode === "pre") {
      result = await handlePre(payload);
    } else if (mode === "post") {
      result = await handlePost(payload);
    } else {
      process.stderr.write(`[agent-decision-log] unknown mode="${mode ?? ""}"; expected pre or post\n`);
      process.exit(0);
      return;
    }

    if (result !== undefined) {
      process.stdout.write(JSON.stringify(result) + "\n");
    }
    process.exit(0);
  } catch (e) {
    // Never fail — advisory-only hook must not block Claude
    process.stderr.write(`[agent-decision-log] unhandled error: ${(e as Error).message}\n`);
    process.exit(0);
  }
}

void main();
