// palantir-mini — lead-direct-edit-watch hook (W1.B; sprint-056 W2.C2; sprint-060 W1.1)
// sprint-059 W1.3: added sprint-bind detection — resets session counter on sprint_contract_bound
// sprint-060 W1.1: P1.LD1 threshold reconcile (import from lib/lead-orchestration-thresholds)
//                  P1.LD2 synthesis-path tighten (synthesisEditCount tracked separately)
// Fires on: PostToolUse(Edit|Write|MultiEdit|NotebookEdit)
//
// PURPOSE: Downstream governance counter. Count cumulative Lead-direct file edits
// per session AND per sprint, and enforce cost-optimization thresholds per rule
// 12 v3.4.0 §Lead-direct edit threshold. This hook does not prove prompt/DTC
// approval; prompt-front-door-capture + pm_semantic_intent_gate own that proof.
//
// Lead-direct identification:
//   byWhom.agentName === "claude-code"  → Lead-direct (top-level Claude session)
//   byWhom.agentName === "subagent-unnamed" AND no subagent_type → Lead-direct
//   Any other named agent               → subagent edit; skip counter increment
//
// Synthesis path handling (P1.LD2 tighten):
//   Files matching ~/.claude/plans/** OR ending with BROWSE.md / INDEX.md (case-
//   sensitive) are EXEMPT from the production counter — but still increment a
//   separate synthesisEditCount in .lead-synthesis-edit-counter.json.
//   When synthesisEditCount >= SYNTHESIS_MIXED_MIN_COUNT AND a production edit
//   follows within SYNTHESIS_MIXED_WINDOW_MIN (30 min), emits
//   synthesis_followed_by_production_advisory event.
//   Emits lead_direct_edit_exempt event with errorClass="synthesis_path_exempt".
//
// Session counter:
//   Persisted in <projectRoot>/.palantir-mini/session/.lead-direct-edit-counter.json
//   Shape: { count: number, lastEditTimestamp: string }
//   Atomic write: write .tmp then rename.
//   Reset to 0 on SessionStart (lead-direct-counter-reset hook) AND on sprint_contract_bound
//   detected in events.jsonl tail within last 60 seconds.
//
// Synthesis counter (P1.LD2):
//   Persisted in <projectRoot>/.palantir-mini/session/.lead-synthesis-edit-counter.json
//   Same shape. Not reset at sprint boundary (synthesis work spans sprints).
//
// Per-sprint counter (sprint-056 W2.C2):
//   Persisted in <sprintDir>/.lead-direct-edit-counter.json (same shape).
//   SprintDir resolved from latest sprint_contract_bound event for current session,
//   OR from findBoundContract() helper (no events lookup needed).
//   Per-sprint thresholds: advisory@LEAD_DIRECT_SPRINT_ADVISORY (3), block@LEAD_DIRECT_SPRINT_BLOCKING (5).
//   Harder gate wins: if per-sprint count hits threshold before session count → per-sprint gate applies.
//
// Session thresholds (from lib/lead-orchestration-thresholds):
//   count === LEAD_DIRECT_ADVISORY (5)  → advisory; emit validation_phase_completed
//   5 < count < LEAD_DIRECT_BLOCKING    → silent pass-through
//   count >= LEAD_DIRECT_BLOCKING (15)  → block; emit lead_direct_edit_blocked; return deny
//
// Per-sprint thresholds:
//   count === LEAD_DIRECT_SPRINT_ADVISORY (3) → advisory
//   count >= LEAD_DIRECT_SPRINT_BLOCKING (5)  → block
//
// Bypass:
//   PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 → pass-through; emit lead_direct_bypass_invoked
//
// Cross-ref: rule 12 v3.4.0 §Lead-direct edit threshold + §Single sprint context + rule 26 §Axis E
//
// async: true — best-effort emit; only blocking on N>=LEAD_DIRECT_BLOCKING (session) or N>=LEAD_DIRECT_SPRINT_BLOCKING (per-sprint).
// timeout: 5 seconds.

import * as fs from "fs";
import * as path from "path";
import { emit, eventsPathFor } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";
import { findActiveBoundContractPath } from "../lib/harness/active-contract";
import { readEvents } from "../lib/event-log/read";
import {
  LEAD_DIRECT_ADVISORY,
  LEAD_DIRECT_BLOCKING,
  LEAD_DIRECT_SPRINT_ADVISORY,
  LEAD_DIRECT_SPRINT_BLOCKING,
  SYNTHESIS_MIXED_WINDOW_MIN,
  SYNTHESIS_MIXED_MIN_COUNT,
} from "../lib/lead-orchestration-thresholds";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?:     string;
    notebook_path?: string;
  };
  /** byWhom fields passed through PostToolUse payloads in some Claude Code versions */
  byWhom?: {
    agentName?:  string;
    identity?:   string;
  };
  /** agent_name flat field (alternative payload shape) */
  agent_name?:    string;
  /** subagent_type — present for Claude Code subagent spawns */
  subagent_type?: string;
}

interface CounterFile {
  count:              number;
  lastEditTimestamp:  string | null;
}

interface HookResult {
  message:  string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

/** Resolve the session counter file path for this project. */
export function counterFilePath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", ".lead-direct-edit-counter.json");
}

/** Resolve the synthesis counter file path for this project. */
export function synthCounterFilePath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", ".lead-synthesis-edit-counter.json");
}

/** Read the counter file. Returns { count: 0, ... } if missing or malformed. */
export function readCounter(counterPath: string): CounterFile {
  try {
    const raw = fs.readFileSync(counterPath, "utf8");
    const parsed = JSON.parse(raw) as CounterFile;
    if (typeof parsed.count === "number") return parsed;
  } catch {
    // missing or malformed — start fresh
  }
  return { count: 0, lastEditTimestamp: null };
}

/** Atomic write: write to .tmp then rename. */
export function writeCounter(counterPath: string, state: CounterFile): void {
  const tmpPath = counterPath + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(state));
  fs.renameSync(tmpPath, counterPath);
}

/**
 * Increment the synthesis edit counter (P1.LD2).
 * Returns the new count, or 0 if the project root is unavailable.
 */
export function incrementSynthCounterWatch(projectRoot: string): number {
  const cPath = synthCounterFilePath(projectRoot);
  try {
    const current = readCounter(cPath);
    const newCount = current.count + 1;
    writeCounter(cPath, {
      count:             newCount,
      lastEditTimestamp: new Date().toISOString(),
    });
    return newCount;
  } catch {
    return 0;
  }
}

/**
 * Check for mixed session: synthesisEditCount >= SYNTHESIS_MIXED_MIN_COUNT AND
 * most recent synthesis edit was within SYNTHESIS_MIXED_WINDOW_MIN minutes.
 * Returns { mixed, synthCount }.
 */
export function isMixedSessionWatch(projectRoot: string): { mixed: boolean; synthCount: number } {
  const cPath = synthCounterFilePath(projectRoot);
  const counter = readCounter(cPath);
  if (counter.count < SYNTHESIS_MIXED_MIN_COUNT) {
    return { mixed: false, synthCount: counter.count };
  }
  if (!counter.lastEditTimestamp) {
    return { mixed: false, synthCount: counter.count };
  }
  const ageMs = Date.now() - new Date(counter.lastEditTimestamp).getTime();
  const windowMs = SYNTHESIS_MIXED_WINDOW_MIN * 60 * 1000;
  return {
    mixed:      ageMs <= windowMs,
    synthCount: counter.count,
  };
}

/**
 * Resolve the per-sprint counter file path.
 * Uses findBoundContract() to find the active sprint directory.
 * Returns null if no bound contract found or sprint dir not determinable.
 */
function sprintCounterFilePath(projectRoot: string): string | null {
  try {
    const contractRel = findActiveBoundContractPath(projectRoot);
    if (!contractRel) return null;
    // contractRel is like ".palantir-mini/harness/sprints/sprint-NNN-foo/contract.json"
    const sprintDir = path.join(projectRoot, path.dirname(contractRel));
    return path.join(sprintDir, ".lead-direct-edit-counter.json");
  } catch {
    return null;
  }
}

/**
 * Read + increment the per-sprint counter.
 * Returns the new count, or null if no sprint dir found.
 */
function incrementSprintCounter(projectRoot: string): number | null {
  const cPath = sprintCounterFilePath(projectRoot);
  if (!cPath) return null;
  try {
    const current = readCounter(cPath);
    const newCount = current.count + 1;
    const newState: CounterFile = {
      count:             newCount,
      lastEditTimestamp: new Date().toISOString(),
    };
    writeCounter(cPath, newState);
    return newCount;
  } catch {
    return null;
  }
}

/**
 * Sprint-bind detection (sprint-059 W1.3).
 *
 * Read the tail of events.jsonl for the project and check whether a
 * sprint_contract_bound event exists with a `when` timestamp within the
 * last 60 seconds. If so, the session-cumulative counter should be reset
 * to 0 so the new sprint starts with a clean slate.
 *
 * This covers the case where a sprint is bound mid-session: the SessionStart
 * hook (lead-direct-counter-reset) fires once at session open; this function
 * covers subsequent sprint binds within the same session.
 *
 * Returns true if a recent sprint_contract_bound event was found.
 * Best-effort — returns false on any error.
 */
export function hasRecentSprintBind(projectRoot: string, windowMs: number = 60_000): boolean {
  try {
    const eventsPath = eventsPathFor(projectRoot);
    if (!fs.existsSync(eventsPath)) return false;

    // Read events; check only the most recent 200 to bound cost.
    const events = readEvents(eventsPath);
    const tail = events.slice(-200);
    const cutoff = Date.now() - windowMs;

    for (const ev of tail) {
      if (ev.type === "sprint_contract_bound") {
        const ts = new Date(ev.when).getTime();
        if (!isNaN(ts) && ts >= cutoff) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Determine whether this edit is Lead-direct.
 *
 * Lead-direct = top-level Claude Code session (not a spawned subagent).
 * Rules:
 *   1. byWhom.agentName === "claude-code"                              → Lead
 *   2. byWhom.agentName === "subagent-unnamed" AND no subagent_type    → Lead
 *   3. flat agent_name === "claude-code"                               → Lead
 *   4. flat agent_name === "subagent-unnamed" AND no subagent_type     → Lead
 *   5. Any other named agent (hook-builder, researcher, etc.)          → subagent; skip
 *   6. Neither byWhom nor agent_name present + no subagent_type        → assume Lead
 */
function isLeadDirect(p: HookPayload): boolean {
  // Prefer nested byWhom object if present
  const agentName = p.byWhom?.agentName ?? p.agent_name;
  const subagentType = p.subagent_type ?? p.byWhom?.identity;

  // Explicit claude-code identity → Lead
  if (agentName === "claude-code") return true;

  // Explicit non-Lead named agent → subagent
  if (
    agentName &&
    agentName !== "claude-code" &&
    agentName !== "subagent-unnamed"
  ) {
    return false;
  }

  // subagent-unnamed with no subagent_type → likely Lead-direct top-level session
  if (agentName === "subagent-unnamed") {
    // If subagent_type is present (e.g. "Explore", "Plan") → actual subagent
    return !subagentType || subagentType === "claude-code";
  }

  // No agent name at all — if subagent_type is set, it's a subagent; else assume Lead
  if (!agentName) {
    return !p.subagent_type;
  }

  return false;
}

/**
 * Synthesis path check — exempt files that Lead legitimately edits directly.
 *
 * Exempt:
 *   - Any path under ~/.claude/plans/  (absolute match)
 *   - Any file ending with BROWSE.md (case-sensitive)
 *   - Any file ending with INDEX.md  (case-sensitive)
 */
function isSynthesisPath(absPath: string): boolean {
  const home = process.env.HOME ?? "/home/palantirkc";
  const plansPrefix = path.join(home, ".claude", "plans") + path.sep;
  if (absPath.startsWith(plansPrefix)) return true;
  const base = path.basename(absPath);
  if (base === "BROWSE.md" || base === "INDEX.md") return true;
  return false;
}

/** Expand ~ prefix and resolve to absolute path. */
function resolveAbsPath(filePath: string): string {
  const home = process.env.HOME ?? "/home/palantirkc";
  if (filePath.startsWith("~/")) {
    return path.resolve(home, filePath.slice(2));
  }
  return path.resolve(filePath);
}

export default async function leadDirectEditWatch(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";

  try {
    // Bypass via env var (audited, pass-through)
    if (process.env.PALANTIR_MINI_LEAD_DIRECT_BYPASS === "1") {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:     "post_write",
            passed:    true,
            errorClass: "lead_direct_bypass_invoked",
          },
          toolName,
          cwd,
          sessionId:   p.session_id,
          identity:    "monitor",
          memoryLayers: ["working"],
          reasoning:   `lead-direct-edit-watch: bypass via PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 (tool=${toolName})`,
        });
      } catch {
        // best-effort
      }
      return { message: "palantir-mini: lead-direct-edit-watch BYPASS (env)" };
    }

    // Determine if this is a Lead-direct edit
    if (!isLeadDirect(p)) {
      return {
        message: `palantir-mini: lead-direct-edit-watch skipped (subagent edit, tool=${toolName})`,
      };
    }

    // Resolve file path for synthesis exemption check
    const rawFilePath = p.tool_input?.file_path ?? p.tool_input?.notebook_path;
    if (rawFilePath && typeof rawFilePath === "string" && rawFilePath.length > 0) {
      const absPath = resolveAbsPath(rawFilePath);
      if (isSynthesisPath(absPath)) {
        // Synthesis paths: exempt from production counter, BUT increment synthesis counter
        // so mixed-session detection (P1.LD2) can fire.
        const synthProjectRoot = findProjectRoot(cwd);
        let newSynthCount = 0;
        if (synthProjectRoot) {
          try {
            newSynthCount = incrementSynthCounterWatch(synthProjectRoot);
          } catch { /* best-effort */ }
        }
        try {
          await emit({
            type: "validation_phase_completed",
            payload: {
              phase:      "post_write",
              passed:     true,
              errorClass: "lead_direct_edit_exempt",
            },
            toolName,
            cwd,
            sessionId:   p.session_id,
            identity:    "monitor",
            memoryLayers: ["working", "semantic"],
            reasoning:   `lead-direct-edit-watch: synthesis path exempt — ${absPath} (tool=${toolName}). synthesisEditCount=${newSynthCount}. sprint-060 W1.1 P1.LD2.`,
          });
        } catch {
          // best-effort
        }
        return { message: `palantir-mini: lead-direct-edit-watch EXEMPT (synthesis path: ${absPath}, synthCount=${newSynthCount})` };
      }
    }

    // Find project root for counter file
    const projectRoot = findProjectRoot(cwd);
    if (!projectRoot) {
      // No tracked project — let it through silently
      return { message: `palantir-mini: lead-direct-edit-watch skipped (no project root for cwd=${cwd})` };
    }

    // Ensure session dir exists for counter file
    const sessionDir = path.join(projectRoot, ".palantir-mini", "session");
    fs.mkdirSync(sessionDir, { recursive: true });

    // Sprint-bind detection (sprint-059 W1.3): reset session-cumulative counter
    // when a sprint_contract_bound event is detected in events.jsonl within the
    // last 60 seconds. This keeps the session counter aligned to sprint boundaries
    // when a new sprint is bound mid-session (complementing the SessionStart reset
    // performed by lead-direct-counter-reset hook).
    const cPath = counterFilePath(projectRoot);
    if (hasRecentSprintBind(projectRoot)) {
      const resetState: CounterFile = { count: 0, lastEditTimestamp: null };
      writeCounter(cPath, resetState);
      // Emit sprint-bind reset event (best-effort)
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "runtime",
            passed:     true,
            errorClass: "lead_direct_counter_reset",
          },
          toolName,
          cwd:        projectRoot,
          sessionId:  p.session_id,
          identity:   "monitor",
          memoryLayers: ["procedural", "semantic"],
          reasoning:  `lead-direct-edit-watch: session-cumulative counter reset to 0 on sprint_contract_bound detection (within 60s). Rule 12 v3.4.0 §Lead-direct edit threshold.`,
        });
      } catch {
        // best-effort
      }
    }

    // Read, increment, write session counter
    const current = readCounter(cPath);
    const newCount = current.count + 1;
    const newState: CounterFile = {
      count:              newCount,
      lastEditTimestamp:  new Date().toISOString(),
    };
    writeCounter(cPath, newState);

    // Mixed-session advisory (P1.LD2): check if synthesis edits preceded this production edit
    const { mixed, synthCount } = isMixedSessionWatch(projectRoot);
    if (mixed) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "post_write",
            passed:     true,
            errorClass: "synthesis_followed_production_advisory",
          },
          toolName,
          cwd:        projectRoot,
          sessionId:  p.session_id,
          identity:   "monitor",
          memoryLayers: ["procedural", "semantic"],
          reasoning:  `lead-direct-edit-watch: mixed session — synthesisEditCount=${synthCount} synthesis edits within last ${SYNTHESIS_MIXED_WINDOW_MIN}min, productionEditCount=${newCount}. sprint-060 W1.1 P1.LD2.`,
        });
      } catch { /* best-effort */ }
    }

    // Per-sprint counter (sprint-056 W2.C2)
    // Increment per-sprint counter; apply harder gate if threshold hit.
    const sprintCount = incrementSprintCounter(projectRoot);

    // Per-sprint threshold: block at >= LEAD_DIRECT_SPRINT_BLOCKING (5)
    if (sprintCount !== null && sprintCount >= LEAD_DIRECT_SPRINT_BLOCKING) {
      const blockMessage = [
        `palantir-mini lead-direct-edit-watch BLOCK (per-sprint) in ${projectRoot}`,
        `Lead-direct per-sprint edit count = ${sprintCount} (sprint threshold = ${LEAD_DIRECT_SPRINT_BLOCKING}).`,
        `Session cumulative count = ${newCount}.`,
        ``,
        `Per rule 12 v3.4.0 §Single sprint context: ≤${LEAD_DIRECT_SPRINT_ADVISORY} files Lead-direct OK.`,
        `Spawn an implementer subagent for remaining file work via:`,
        `  /palantir-mini:pm-delegate-or-direct`,
        ``,
        `Cross-ref: rule 12 v3.4.0 §Lead-direct edit threshold + §Single sprint context`,
        ``,
        `Bypass for emergency only: PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 (audited).`,
      ].join("\n");

      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:     "post_write",
            passed:    false,
            errorClass: "lead_direct_edit_blocked",
          },
          toolName,
          cwd:        projectRoot,
          sessionId:  p.session_id,
          identity:   "monitor",
          memoryLayers: ["working", "procedural"],
          refinementTarget: {
            kind:            "other",
            filePathOrRid:   "lead-direct-edit-watch",
            description:     `Lead-direct per-sprint edit count ${sprintCount} exceeded sprint block threshold (${LEAD_DIRECT_SPRINT_BLOCKING}); delegation required`,
            confidenceLevel: "high",
          },
          reasoning:  `lead-direct-edit-watch BLOCK (per-sprint): sprintCount=${sprintCount} >= ${LEAD_DIRECT_SPRINT_BLOCKING} in ${projectRoot}. rule 12 v3.4.0 §Single sprint context + §Lead-direct edit threshold.`,
        });
      } catch {
        // best-effort emit; still block
      }

      return {
        message: `palantir-mini: lead-direct-edit-watch BLOCK (per-sprint count=${sprintCount}, threshold=${LEAD_DIRECT_SPRINT_BLOCKING})`,
        hookSpecificOutput: {
          permissionDecision:       "deny",
          permissionDecisionReason: blockMessage,
          additionalContext:        `Per-sprint edit count ${sprintCount} >= ${LEAD_DIRECT_SPRINT_BLOCKING}. Spawn an implementer subagent via /palantir-mini:pm-delegate-or-direct. Bypass: PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 (audited).`,
        },
      };
    }

    // Per-sprint threshold: advisory at exactly LEAD_DIRECT_SPRINT_ADVISORY (3)
    if (sprintCount !== null && sprintCount === LEAD_DIRECT_SPRINT_ADVISORY) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:     "post_write",
            passed:    true,
            errorClass: "lead_direct_edit_advisory",
          },
          toolName,
          cwd:        projectRoot,
          sessionId:  p.session_id,
          identity:   "monitor",
          memoryLayers: ["working", "semantic"],
          reasoning:  `lead-direct-edit-watch: per-sprint Lead-direct count = ${LEAD_DIRECT_SPRINT_ADVISORY} (advisory). Rule 12 v3.4.0 §Single sprint context: ≤${LEAD_DIRECT_SPRINT_ADVISORY} files OK; next edit will need /palantir-mini:pm-delegate-or-direct.`,
        });
      } catch {
        // best-effort
      }
    }

    // Session-level threshold: block at >= LEAD_DIRECT_BLOCKING (15)
    if (newCount >= LEAD_DIRECT_BLOCKING) {
      const blockMessage = [
        `palantir-mini lead-direct-edit-watch BLOCK in ${projectRoot}`,
        `Lead-direct cumulative edit count = ${newCount} (threshold = ${LEAD_DIRECT_BLOCKING}).`,
        ``,
        `Spawn an implementer subagent for remaining file work via:`,
        `  /palantir-mini:pm-delegate-or-direct`,
        ``,
        `Cross-ref: rule 12 v3.4.0 §Lead-direct edit threshold + rule 26 §Axis E (audit substrate)`,
        ``,
        `Bypass for emergency only: PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 (audited).`,
      ].join("\n");

      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:     "post_write",
            passed:    false,
            errorClass: "lead_direct_edit_blocked",
          },
          toolName,
          cwd:        projectRoot,
          sessionId:  p.session_id,
          identity:   "monitor",
          memoryLayers: ["working", "procedural"],
          refinementTarget: {
            kind:            "other",
            filePathOrRid:   "lead-direct-edit-watch",
            description:     `Lead-direct edit count exceeded blocking threshold (${LEAD_DIRECT_BLOCKING}); delegation required`,
            confidenceLevel: "high",
          },
          reasoning:  `lead-direct-edit-watch BLOCK: count=${newCount} >= ${LEAD_DIRECT_BLOCKING} in ${projectRoot}. rule 12 v3.4.0 §Lead-direct edit threshold.`,
        });
      } catch {
        // best-effort emit; still block
      }

      return {
        message: `palantir-mini: lead-direct-edit-watch BLOCK (count=${newCount}, threshold=${LEAD_DIRECT_BLOCKING})`,
        hookSpecificOutput: {
          permissionDecision:       "deny",
          permissionDecisionReason: blockMessage,
          additionalContext:        `Spawn an implementer subagent via /palantir-mini:pm-delegate-or-direct. Bypass: PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 (audited).`,
        },
      };
    }

    // Threshold: advisory at exactly LEAD_DIRECT_ADVISORY (5)
    if (newCount === LEAD_DIRECT_ADVISORY) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:     "post_write",
            passed:    true,
            errorClass: "lead_direct_edit_advisory",
          },
          toolName,
          cwd:        projectRoot,
          sessionId:  p.session_id,
          identity:   "monitor",
          memoryLayers: ["working", "semantic"],
          reasoning:  `lead-direct-edit-watch: Lead-direct edit count = ${LEAD_DIRECT_ADVISORY} (advisory threshold). Consider /palantir-mini:pm-delegate-or-direct for next ≥3-file task.`,
        });
      } catch {
        // best-effort
      }

      return {
        message: `palantir-mini: lead-direct-edit-watch ADVISORY (count=${newCount})`,
        hookSpecificOutput: {
          additionalContext: `Lead-direct edit count = ${newCount}; consider /palantir-mini:pm-delegate-or-direct for next ≥3-file task`,
        },
      };
    }

    // LEAD_DIRECT_ADVISORY < count < LEAD_DIRECT_BLOCKING → silent pass-through
    return {
      message: `palantir-mini: lead-direct-edit-watch OK (count=${newCount})`,
    };
  } catch (err) {
    // Never fail the hook — always exit 0 to avoid blocking Claude
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(`[palantir-mini/lead-direct-edit-watch] unexpected error (suppressed): ${errMsg}\n`);
    } catch {
      // truly silent fallback
    }
    return { message: `palantir-mini: lead-direct-edit-watch error suppressed (${errMsg})` };
  }
}
