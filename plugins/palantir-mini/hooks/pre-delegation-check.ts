// palantir-mini PR-13 — Hook enforcement level
//   enforcement: scoped-blocking
//   rationale:   permissionDecision=defer + blocks only when cumulative session edits ≥3 and no delegation_recipe_generated event; synthesis paths exempt.
// palantir-mini v4.12.0 — pre-delegation-check hook (sprint-056 W2.C1; sprint-060 W1.1; sprint-060 W2.2 R3-F9)
// Fires on: PreToolUse(Edit|Write|MultiEdit) — NOT Bash, NOT NotebookEdit
//
// PURPOSE: Enforce downstream rule 12 v3.4.0 §Pre-delegation analysis framework.
// This hook is not prompt-front-door proof. Prompt/DTC proof is the
// prompt-front-door-capture envelope + pm_semantic_intent_gate approved refs.
// When Lead has made ≥3 cumulative file edits in this session (rule 12 §Single
// sprint context: ≤3 files Lead-direct OK) AND no delegation recipe has been
// generated (via /palantir-mini:pm-delegate-or-direct), block further edits.
//
// Logic:
//   1. Read session edit counter from .palantir-mini/session/.lead-direct-edit-counter.json
//   2. If counter < PRE_DELEGATION_TRIGGER (3) → pass-through
//   3. If counter >= 3:
//      a. Check events.jsonl for delegation event in current sessionId (last 30 min)
//         → validation_phase_completed{errorClass:"delegation_recipe_generated"}
//      b. Check active SprintContract mode — if mode === "full" → pass-through
//         (R3-F9 sprint-060 W2.2: emits pre_delegation_full_mode_bypass event for audit trail)
//      c. Check .complex-task-pending.json marker (from complex-task-detector)
//      d. Otherwise → deny with actionable message citing rule 12 v3.4.0
//   4. Synthesis paths EXEMPT from blocking (plans/**, BROWSE.md, INDEX.md):
//      - Still increment .lead-synthesis-edit-counter.json (separate counter)
//      - When synthesisEditCount >= 3 AND a non-synthesis edit follows within
//        PRE_DELEGATION_COOLDOWN_MIN (30 min), emit synthesis_followed_by_production_advisory
//   5. Bypass: PALANTIR_MINI_PREDELEGATION_BYPASS=1 (audited)
//
// Cross-ref: rule 12 v3.4.0 §Pre-delegation analysis framework
//            rule 12 v3.4.0 §Lead-direct edit threshold
//            rule 26 §Axis E (memory-mapped)
//            sprint-060 W1.1 P1.LD1 (threshold reconcile) + P1.LD2 (synthesis-path tighten)
//            sprint-060 W2.2 R3-F9 (full-mode bypass audit trail)
//
// permissionDecision: "deny" on block
// async: false (blocking hook)
// timeout: 8 seconds.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";
import { findActiveBoundContractPath } from "../lib/harness/active-contract";
import { readEvents } from "../lib/event-log/read";
import { eventsPathFor } from "../scripts/log";
import { isPlanArtifactPath } from "../lib/plan-root/resolve-plan-root";
import {
  PRE_DELEGATION_TRIGGER,
  PRE_DELEGATION_COOLDOWN_MIN,
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
  /** byWhom fields in some CC versions */
  byWhom?: {
    agentName?:  string;
    identity?:   string;
  };
  agent_name?:    string;
  subagent_type?: string;
}

interface CounterFile {
  count:             number;
  lastEditTimestamp: string;
}

interface ComplexTaskMarker {
  sessionId:         string;
  conditionsMatched: string[];
  when:              string;
}

interface SynthesisCounterFile {
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

/** Read the session edit counter. Returns { count: 0 } if missing or malformed. */
function readCounter(projectRoot: string): CounterFile {
  const counterPath = path.join(
    projectRoot, ".palantir-mini", "session", ".lead-direct-edit-counter.json"
  );
  try {
    const raw = fs.readFileSync(counterPath, "utf8");
    const parsed = JSON.parse(raw) as CounterFile;
    if (typeof parsed.count === "number") return parsed;
  } catch { /* missing or malformed */ }
  return { count: 0, lastEditTimestamp: new Date().toISOString() };
}

/** Path for the synthesis-edit counter file. */
function synthCounterFilePath(projectRoot: string): string {
  return path.join(
    projectRoot, ".palantir-mini", "session", ".lead-synthesis-edit-counter.json"
  );
}

/** Read the synthesis counter file. Returns { count: 0 } if missing or malformed. */
function readSynthCounter(projectRoot: string): SynthesisCounterFile {
  const counterPath = synthCounterFilePath(projectRoot);
  try {
    const raw = fs.readFileSync(counterPath, "utf8");
    const parsed = JSON.parse(raw) as SynthesisCounterFile;
    if (typeof parsed.count === "number") return parsed;
  } catch { /* missing or malformed */ }
  return { count: 0, lastEditTimestamp: null };
}

/** Atomic write for synthesis counter. */
function writeSynthCounter(projectRoot: string, state: SynthesisCounterFile): void {
  const counterPath = synthCounterFilePath(projectRoot);
  const tmpPath = counterPath + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(state));
  fs.renameSync(tmpPath, counterPath);
}

/**
 * Increment the synthesis edit counter.
 * Returns the new count.
 */
export function incrementSynthCounter(projectRoot: string): number {
  const current = readSynthCounter(projectRoot);
  const newCount = current.count + 1;
  writeSynthCounter(projectRoot, {
    count:             newCount,
    lastEditTimestamp: new Date().toISOString(),
  });
  return newCount;
}

/**
 * Determine whether a mixed-session advisory should fire.
 * Condition: synthesisEditCount >= SYNTHESIS_MIXED_MIN_COUNT AND
 * the most recent synthesis edit was within SYNTHESIS_MIXED_WINDOW_MIN minutes.
 */
export function isMixedSession(projectRoot: string): { mixed: boolean; synthCount: number } {
  const synthCounter = readSynthCounter(projectRoot);
  if (synthCounter.count < SYNTHESIS_MIXED_MIN_COUNT) {
    return { mixed: false, synthCount: synthCounter.count };
  }
  if (!synthCounter.lastEditTimestamp) {
    return { mixed: false, synthCount: synthCounter.count };
  }
  const ageMs = Date.now() - new Date(synthCounter.lastEditTimestamp).getTime();
  const windowMs = SYNTHESIS_MIXED_WINDOW_MIN * 60 * 1000;
  return {
    mixed:      ageMs <= windowMs,
    synthCount: synthCounter.count,
  };
}

/** Resolve absolute path, expanding ~ prefix. */
function resolveAbsPath(filePath: string): string {
  const home = process.env.HOME ?? "/home/palantirkc";
  if (filePath.startsWith("~/")) {
    return path.resolve(home, filePath.slice(2));
  }
  return path.resolve(filePath);
}

/**
 * Check if file is a synthesis path — exempt from pre-delegation gate.
 * Exempt: <project>/.palantir-mini/plan/**, legacy ~/.claude/plans/**,
 * files ending with BROWSE.md or INDEX.md.
 */
function isSynthesisPath(absPath: string, cwd = process.cwd()): boolean {
  if (isPlanArtifactPath(absPath, { projectRoot: cwd, cwd })) return true;
  const base = path.basename(absPath);
  if (base === "BROWSE.md" || base === "INDEX.md") return true;
  return false;
}

/**
 * Determine whether this is a Lead-direct edit (not a spawned subagent).
 * Uses same logic as lead-direct-edit-watch.ts.
 */
function isLeadDirect(p: HookPayload): boolean {
  const agentName = p.byWhom?.agentName ?? p.agent_name;
  const subagentType = p.subagent_type;

  if (agentName === "claude-code") return true;
  if (
    agentName &&
    agentName !== "claude-code" &&
    agentName !== "subagent-unnamed"
  ) {
    return false;
  }
  if (agentName === "subagent-unnamed") {
    return !subagentType || subagentType === "claude-code";
  }
  if (!agentName) {
    return !p.subagent_type;
  }
  return false;
}

/**
 * Search events.jsonl for a delegation recipe event in the current sessionId
 * within the last 30 minutes.
 * Looks for: validation_phase_completed{errorClass:"delegation_recipe_generated"}
 */
function hasDelegationEvent(projectRoot: string, sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  try {
    const eventsPath = eventsPathFor(projectRoot);
    const events = readEvents(eventsPath);
    const cutoff = Date.now() - PRE_DELEGATION_COOLDOWN_MIN * 60 * 1000;

    for (const evt of events) {
      // Check sessionId via throughWhich.sessionId
      const evtSessionId = (evt as unknown as { throughWhich?: { sessionId?: string } }).throughWhich?.sessionId;
      if (evtSessionId !== sessionId) continue;

      if (evt.type !== "validation_phase_completed") continue;
      const payload = evt.payload as { errorClass?: string };
      if (payload?.errorClass !== "delegation_recipe_generated") continue;

      const evtWhen = new Date(evt.when).getTime();
      if (evtWhen >= cutoff) return true;
    }
  } catch { /* best-effort */ }
  return false;
}

/**
 * Check if the active SprintContract has mode="full".
 * Full-mode contracts = explicit multi-file expectation → bypass gate.
 */
function isFullModeContract(projectRoot: string): boolean {
  try {
    const contractRel = findActiveBoundContractPath(projectRoot);
    if (!contractRel) return false;
    const contractPath = path.join(projectRoot, contractRel);
    const raw = fs.readFileSync(contractPath, "utf8");
    const obj = JSON.parse(raw) as { mode?: string };
    return obj.mode === "full";
  } catch { /* best-effort */ }
  return false;
}

/**
 * Check if the .complex-task-pending.json marker exists in the session dir.
 * Written by complex-task-detector when ≥2 heuristic conditions matched.
 */
function hasComplexTaskMarker(projectRoot: string, sessionId: string | undefined): ComplexTaskMarker | null {
  try {
    const markerPath = path.join(
      projectRoot, ".palantir-mini", "session", ".complex-task-pending.json"
    );
    if (!fs.existsSync(markerPath)) return null;
    const raw = fs.readFileSync(markerPath, "utf8");
    const marker = JSON.parse(raw) as ComplexTaskMarker;
    // Validate it belongs to current session
    if (sessionId && marker.sessionId !== sessionId) return null;
    return marker;
  } catch { /* best-effort */ }
  return null;
}

export default async function preDelegationCheck(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";

  try {
    // Bypass via env var (audited)
    if (process.env.PALANTIR_MINI_PREDELEGATION_BYPASS === "1") {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "pre_delegation_bypass_invoked",
          },
          toolName,
          cwd,
          sessionId:   p.session_id,
          identity:    "monitor",
          memoryLayers: ["working"],
          reasoning:   `pre-delegation-check: bypass via PALANTIR_MINI_PREDELEGATION_BYPASS=1 (tool=${toolName})`,
          refinementTarget: {
            kind:            "other",
            filePathOrRid:   "hooks/pre-delegation-check.ts",
            description:     "Pre-delegation gate bypassed via PALANTIR_MINI_PREDELEGATION_BYPASS=1 — audited per rule 12 v3.4.0.",
            confidenceLevel: "high",
          },
        });
      } catch { /* best-effort */ }
      return { message: "palantir-mini: pre-delegation-check BYPASS (env)" };
    }

    // Skip for non-Lead-direct edits (subagents have no delegation obligation)
    if (!isLeadDirect(p)) {
      return {
        message: `palantir-mini: pre-delegation-check skipped (subagent edit, tool=${toolName})`,
      };
    }

    // Resolve file path for synthesis path check
    const rawFilePath = p.tool_input?.file_path ?? p.tool_input?.notebook_path;
    if (rawFilePath && typeof rawFilePath === "string" && rawFilePath.length > 0) {
      const absPath = resolveAbsPath(rawFilePath);
      if (isSynthesisPath(absPath, cwd)) {
        // Synthesis paths are EXEMPT from blocking (pass-through), BUT still increment
        // the synthesis-edit counter so mixed-session detection (P1.LD2) can fire.
        const synthProjectRoot = findProjectRoot(cwd);
        if (synthProjectRoot) {
          try {
            incrementSynthCounter(synthProjectRoot);
          } catch { /* best-effort */ }
        }
        try {
          await emit({
            type: "validation_phase_completed",
            payload: {
              phase:      "design",
              passed:     true,
              errorClass: "pre_delegation_synthesis_exempt",
            },
            toolName,
            cwd,
            sessionId:   p.session_id,
            identity:    "monitor",
            memoryLayers: ["working", "semantic"],
            reasoning:   `pre-delegation-check: synthesis path exempt — ${absPath} (tool=${toolName}). Plans/** + BROWSE.md + INDEX.md exempt per rule 12 v3.4.0 §Pre-delegation. Synthesis counter incremented for mixed-session tracking (sprint-060 W1.1 P1.LD2).`,
          });
        } catch { /* best-effort */ }
        return {
          message: `palantir-mini: pre-delegation-check EXEMPT (synthesis path: ${path.basename(absPath)})`,
        };
      }
    }

    // Find project root for counter + events
    const projectRoot = findProjectRoot(cwd);
    if (!projectRoot) {
      return {
        message: `palantir-mini: pre-delegation-check skipped (no project root for cwd=${cwd})`,
      };
    }

    // Read session edit counter
    const counter = readCounter(projectRoot);

    // If counter < PRE_DELEGATION_TRIGGER (3), threshold not yet reached — pass-through.
    // But still check for mixed-session (synthesis edits already done) and emit advisory.
    if (counter.count < PRE_DELEGATION_TRIGGER) {
      // Mixed-session advisory: synthesis edits happened recently, production edit follows.
      const { mixed, synthCount } = isMixedSession(projectRoot);
      if (mixed) {
        try {
          await emit({
            type: "validation_phase_completed",
            payload: {
              phase:      "design",
              passed:     true,
              errorClass: "synthesis_followed_production_advisory",
            },
            toolName,
            cwd:        projectRoot,
            sessionId:  p.session_id,
            identity:   "monitor",
            memoryLayers: ["procedural", "semantic"],
            reasoning:  `pre-delegation-check: mixed session detected — synthesisEditCount=${synthCount} within last ${SYNTHESIS_MIXED_WINDOW_MIN}min, productionEditCount=${counter.count + 1}. sprint-060 W1.1 P1.LD2.`,
          });
        } catch { /* best-effort */ }
      }
      return {
        message: `palantir-mini: pre-delegation-check OK (count=${counter.count} < ${PRE_DELEGATION_TRIGGER})`,
      };
    }

    // Counter >= PRE_DELEGATION_TRIGGER — check delegation receipt.
    // Also fire mixed-session advisory if applicable.
    const sessionId = p.session_id;

    const { mixed: mixedPostThreshold, synthCount: synthCountPostThreshold } = isMixedSession(projectRoot);
    if (mixedPostThreshold) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "synthesis_followed_production_advisory",
          },
          toolName,
          cwd:        projectRoot,
          sessionId,
          identity:   "monitor",
          memoryLayers: ["procedural", "semantic"],
          reasoning:  `pre-delegation-check: mixed session post-threshold — synthesisEditCount=${synthCountPostThreshold} within last ${SYNTHESIS_MIXED_WINDOW_MIN}min, productionEditCount=${counter.count}. sprint-060 W1.1 P1.LD2.`,
        });
      } catch { /* best-effort */ }
    }

    // Check 1: Delegation event in events.jsonl (last PRE_DELEGATION_COOLDOWN_MIN min)
    if (hasDelegationEvent(projectRoot, sessionId)) {
      return {
        message: `palantir-mini: pre-delegation-check OK (delegation event found, count=${counter.count})`,
      };
    }

    // Check 2: Full-mode SprintContract
    // sprint-060 W2.2 R3-F9: emit explicit audit event when mode=full bypass fires so
    // substrate lineage can distinguish "full-mode was active" from "delegation recipe exists".
    // Architecture review §5.D.9: full-mode SprintContract must NOT trigger pre-delegation gate;
    // bypass is intentional and correct — but must be auditable.
    if (isFullModeContract(projectRoot)) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "pre_delegation_full_mode_bypass",
          },
          toolName,
          cwd:        projectRoot,
          sessionId,
          identity:   "monitor",
          memoryLayers: ["working", "procedural"],
          reasoning:   `pre-delegation-check: mode=full SprintContract bypass applied (count=${counter.count}, tool=${toolName}). Full-mode contracts declare explicit multi-file expectation — delegation gate is intentionally bypassed per rule 12 v3.6.0 §Pre-delegation hard gate. Audit trail per sprint-060 W2.2 R3-F9.`,
        });
      } catch { /* best-effort */ }
      return {
        message: `palantir-mini: pre-delegation-check OK (mode=full SprintContract, count=${counter.count})`,
      };
    }

    // Check 3: Complex-task marker present (escalation path)
    const complexMarker = hasComplexTaskMarker(projectRoot, sessionId);
    const markerEscalation = complexMarker !== null;

    // Block: counter >= PRE_DELEGATION_TRIGGER, no delegation event, not full-mode
    const blockMessage = markerEscalation
      ? [
          `palantir-mini pre-delegation-check BLOCK in ${projectRoot}`,
          ``,
          `ESCALATED: Complex-task heuristic flagged this session (${complexMarker!.conditionsMatched.join(", ")})`,
          `AND no delegation recipe has been generated (no validation_phase_completed{delegation_recipe_generated} in last ${PRE_DELEGATION_COOLDOWN_MIN} min).`,
          ``,
          `Lead-direct cumulative edit count = ${counter.count} (threshold = ${PRE_DELEGATION_TRIGGER} per rule 12 v3.4.0 §Single sprint context).`,
          ``,
          `=== REQUIRED ACTION ===`,
          `After prompt-front-door capture + pm_semantic_intent_gate continuity, invoke /palantir-mini:pm-delegate-or-direct BEFORE proceeding with file edits.`,
          `This generates the 9-field delegation recipe (rule 12 §Pre-delegation analysis framework).`,
          ``,
          `Cross-ref: rule 12 v3.4.0 §Pre-delegation analysis framework + §Complex-task EnterPlanMode protocol`,
          ``,
          `Bypass for emergency only: PALANTIR_MINI_PREDELEGATION_BYPASS=1 (audited).`,
        ].join("\n")
      : [
          `palantir-mini pre-delegation-check BLOCK in ${projectRoot}`,
          ``,
          `Lead-direct cumulative edit count = ${counter.count} (threshold = ${PRE_DELEGATION_TRIGGER} per rule 12 v3.4.0 §Single sprint context).`,
          ``,
          `=== REQUIRED ACTION ===`,
          `After prompt-front-door capture + pm_semantic_intent_gate continuity, invoke /palantir-mini:pm-delegate-or-direct BEFORE making further file edits.`,
          `This generates the 9-field delegation recipe (agent / mcp_tools / skills / sprint_args /`,
          `critical_files / verify_command / memory_layers / out_of_scope / briefing_template).`,
          ``,
          `Alternatively: bind a mode="full" SprintContract if this is explicit multi-file work.`,
          ``,
          `Cross-ref: rule 12 v3.4.0 §Pre-delegation analysis framework`,
          ``,
          `Bypass for emergency only: PALANTIR_MINI_PREDELEGATION_BYPASS=1 (audited).`,
        ].join("\n");

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:     "design",
          passed:    false,
          errorClass: "pre_delegation_gate_blocked",
        },
        toolName,
        cwd:        projectRoot,
        sessionId,
        identity:   "monitor",
        memoryLayers: ["working", "procedural"],
        reasoning:  `pre-delegation-check BLOCK: count=${counter.count} >= ${PRE_DELEGATION_TRIGGER} AND no delegation event AND mode != "full" in ${projectRoot}. markerEscalation=${markerEscalation}. rule 12 v3.4.0 §Pre-delegation analysis framework.`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/pre-delegation-check.ts",
          description:     `Pre-delegation gate blocked: Lead edit count ${counter.count} >= ${PRE_DELEGATION_TRIGGER} without delegation recipe. ${markerEscalation ? "Complex-task marker present (escalated)." : "No complex-task marker."}`,
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort emit; still block */ }

    return {
      message: `palantir-mini: pre-delegation-check BLOCK (count=${counter.count}, escalated=${markerEscalation})`,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: blockMessage,
        additionalContext:        `Prompt/DTC proof stays in prompt-front-door-capture + pm_semantic_intent_gate. Invoke /palantir-mini:pm-delegate-or-direct to generate downstream delegation recipe. Bypass: PALANTIR_MINI_PREDELEGATION_BYPASS=1 (audited).`,
      },
    };

  } catch (err) {
    // Never fail the hook — always allow through to avoid blocking Claude catastrophically
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(`[palantir-mini/pre-delegation-check] unexpected error (suppressed): ${errMsg}\n`);
    } catch { /* truly silent */ }
    return { message: `palantir-mini: pre-delegation-check error suppressed (${errMsg})` };
  }
}
