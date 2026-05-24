// palantir-mini v5.x — briefing-task-count-limit hook
// Fires on: PreToolUse with matcher "Agent" (subagent spawn)
//
// Per rule 12 v3.17.0 §Tasks-per-spawn ceiling + user explicit ask 2026-05-12
// mid sprint-064 PR-2:
//   "EnterPlanMode에서 작업 분해에 대해서 rule이나 hooks가 제대로 등록이 안되었나?
//    작업량을 훨씬 나누어서 하면 되잖아."
//
// Observation that drove this hook: PR-2 (foamy-giggling-kettle plan) was
// briefed with 10 task IDs (T1-T10) in claim-order. Sonnet implementer has
// maxTurns=30. At ~5 turns/task (read + plan + edit + verify per file),
// 30 / 10 = 3 turns/task — too tight. Both agent #1 and #2 ran out of
// turns mid-T4/T6.
//
// Existing hooks (task-context-budget-enforcer 10K/15K + briefing-template-
// validate 5-section structural check) do NOT count tasks. This hook closes
// the gap.
//
// Algorithm:
//   1. Read tool_input.prompt (subagent briefing text)
//   2. Find "Claim order" section + extract numbered/T-prefixed task IDs
//   3. Count distinct task IDs (Set dedup)
//   4. Determine agent tier from subagent_type (sonnet vs opus)
//   5. Compare to ceiling:
//      sonnet: advisory at >4, blocking at >7 (maxTurns=30 ÷ 5 turns/task ≈ 6; 4 leaves headroom)
//      opus  : advisory at >6, blocking at >9 (maxTurns=40 typical; more headroom)
//
// Pattern for task IDs:
//   - `T1`, `T2`, ..., `T10` (alphanumeric prefix)
//   - `F1`, `F2` (alternative prefix for follow-up / phase)
//   - `T1.1`, `T2.3` (sub-task notation)
//   - `Task 1`, `Task 2` (verbose)
//
// Bypass: PALANTIR_MINI_BRIEFING_TASK_COUNT_BYPASS=1 (audited via emit_event)
//
// Pairs with:
//   - task-context-budget-enforcer (SIZE check)
//   - briefing-template-validate (STRUCTURE check, 5-section)
//   - pre-delegation-check (gate-on-edit)
//
// Authority: rule 12 v3.17.0 §Tasks-per-spawn ceiling

import { emit } from "../scripts/log";

// Thresholds per agent tier
// v3.18.0: raised from 4/7 (sonnet) + 6/9 (opus) per claude-code-guide research 2026-05-12.
// sonnet maxTurns 30→80 at ~5 turns/task gives ~16 nominal task ceiling; 10/15 adds headroom.
// opus maxTurns ~40 + more reasoning headroom: 12/18.
export const TASK_COUNT_ADVISORY_SONNET = 10;
export const TASK_COUNT_BLOCKING_SONNET = 15;
export const TASK_COUNT_ADVISORY_OPUS = 12;
export const TASK_COUNT_BLOCKING_OPUS = 18;

interface ToolInput {
  prompt?: string;
  subagent_type?: string;
  description?: string;
}

interface HookPayload {
  cwd?: string;
  session_id?: string;
  tool_name?: string;
  tool_input?: ToolInput;
}

interface HookResult {
  message: string;
  hookSpecificOutput?: {
    permissionDecision?: "deny" | "allow" | "ask";
    permissionDecisionReason?: string;
    additionalContext?: string;
  };
}

/**
 * Extract distinct task IDs from a briefing prompt.
 *
 * Recognized patterns:
 *   - T<n> / F<n> with optional sub-index (T1, T2.3, F5a)
 *   - "Task <n>" / "Phase <n>"
 *
 * Returns Set<string> of normalized IDs (uppercased prefix + index).
 */
export function extractTaskIds(prompt: string): Set<string> {
  const ids = new Set<string>();

  // Pattern 1: T<n>, F<n>, T<n>.<m>, T<n><letter>
  const prefixed = prompt.matchAll(/\b([TF])(\d+)(?:\.(\d+))?([a-z])?\b/g);
  for (const match of prefixed) {
    const prefix = match[1];
    const num = match[2];
    if (!prefix || !num) continue;
    const sub = match[3] ? `.${match[3]}` : "";
    const letter = match[4] ?? "";
    ids.add(`${prefix.toUpperCase()}${num}${sub}${letter}`);
  }

  // Pattern 2: "Task <n>" / "Phase <n>" (case-insensitive)
  const verbose = prompt.matchAll(/\b(?:Task|Phase)\s+(\d+)\b/gi);
  for (const match of verbose) {
    const num = match[1];
    if (!num) continue;
    ids.add(`Task${num}`);
  }

  return ids;
}

/**
 * Resolve agent tier (sonnet vs opus) from subagent_type name.
 * Returns "sonnet" by default (conservative); use "opus" when the agent
 * is one of the known opus-tier roles.
 */
export function resolveTier(subagentType: string): "sonnet" | "opus" {
  const opusAgents = new Set([
    "researcher",
    "docs-researcher",
    "ontology-steward",
    "protocol-designer",
    "harness-planner",
    "harness-evaluator",
    "harness-analyzer",
    "eval-judge",
    "lead-orchestrator",
    "agent-author",
    "verifier-correctness",
    "verifier-adversarial",
  ]);
  // subagent_type may be "palantir-mini:ontology-steward" or just "ontology-steward"
  const bare = subagentType.replace(/^[\w-]+:/, "");
  return opusAgents.has(bare) ? "opus" : "sonnet";
}

export default async function briefingTaskCountLimit(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "Agent";
  const sessionId = p.session_id;
  const subagentType = p.tool_input?.subagent_type ?? "(unspecified)";
  const description = p.tool_input?.description ?? "(unspecified)";

  // Bypass via env (audited)
  if (process.env.PALANTIR_MINI_BRIEFING_TASK_COUNT_BYPASS === "1") {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "briefing_task_count_bypass_invoked",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `briefing-task-count-limit: bypass via PALANTIR_MINI_BRIEFING_TASK_COUNT_BYPASS=1 (subagent_type=${subagentType})`,
        refinementTarget: {
          kind: "other",
          filePathOrRid: "hooks/briefing-task-count-limit.ts",
          description: "Briefing task-count ceiling bypassed via env — audited per rule 12 §Tasks-per-spawn ceiling.",
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort */ }
    return { message: `palantir-mini: briefing-task-count-limit BYPASS (env)` };
  }

  const prompt = p.tool_input?.prompt ?? "";
  if (!prompt || typeof prompt !== "string" || prompt.length === 0) {
    return {
      message: `palantir-mini: briefing-task-count-limit skipped (no prompt content for ${subagentType})`,
    };
  }

  const taskIds = extractTaskIds(prompt);
  const taskCount = taskIds.size;
  const tier = resolveTier(subagentType);
  const advisoryThreshold = tier === "opus" ? TASK_COUNT_ADVISORY_OPUS : TASK_COUNT_ADVISORY_SONNET;
  const blockingThreshold = tier === "opus" ? TASK_COUNT_BLOCKING_OPUS : TASK_COUNT_BLOCKING_SONNET;

  // No task IDs detected — pass through with minimal note (might be a free-form briefing).
  if (taskCount === 0) {
    return {
      message: `palantir-mini: briefing-task-count-limit no task IDs detected in ${subagentType} briefing`,
    };
  }

  // Block above hard ceiling
  if (taskCount > blockingThreshold) {
    const reason = [
      `palantir-mini: briefing-task-count-limit BLOCK — ${taskCount} task IDs detected in ${subagentType} briefing exceeds ${tier} blocking ceiling of ${blockingThreshold}.`,
      ``,
      `Subagent: ${subagentType} | Description: ${description} | Tier: ${tier}`,
      `Detected task IDs: ${[...taskIds].sort().join(", ")}`,
      ``,
      `Rule 12 v3.17.0 §Tasks-per-spawn ceiling caps subagent claim-order list at ${advisoryThreshold} tasks (sonnet) / ${TASK_COUNT_ADVISORY_OPUS} (opus) for advisory, ${blockingThreshold} (sonnet) / ${TASK_COUNT_BLOCKING_OPUS} (opus) for blocking.`,
      `Sonnet maxTurns=30 ÷ ~5 turns/task (read+plan+edit+verify) = ~6 task ceiling. ${blockingThreshold} hard-caps with headroom for context gathering + reporting.`,
      ``,
      `To resolve:`,
      `  1. Split this spawn into 2+ parallel/sequential spawns with disjoint task scope.`,
      `  2. Group related tasks into ≤${advisoryThreshold} per spawn (sonnet) / ≤${TASK_COUNT_ADVISORY_OPUS} (opus).`,
      `  3. If tasks are truly indivisible, escalate to opus tier or use bypass envvar.`,
      ``,
      `Bypass (audited): PALANTIR_MINI_BRIEFING_TASK_COUNT_BYPASS=1`,
    ].join("\n");

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: false,
          errorClass: "briefing_task_count_blocked",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working", "procedural"],
        reasoning: `briefing-task-count-limit: BLOCK at ${taskCount} tasks (subagent_type=${subagentType}, tier=${tier}, ceiling=${blockingThreshold})`,
        refinementTarget: {
          kind: "other",
          filePathOrRid: "hooks/briefing-task-count-limit.ts",
          description: `Briefing exceeded ${tier} task-count ceiling (${taskCount} > ${blockingThreshold}).`,
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort */ }

    return {
      message: reason,
      hookSpecificOutput: {
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  }

  // Advisory above soft threshold
  if (taskCount > advisoryThreshold) {
    const advisory = [
      `palantir-mini: briefing-task-count-limit ADVISORY — ${taskCount} task IDs in ${subagentType} briefing exceeds ${tier} advisory threshold of ${advisoryThreshold}.`,
      `Hard ceiling: ${blockingThreshold}. Consider splitting into smaller spawns.`,
      `Detected: ${[...taskIds].sort().join(", ")}`,
    ].join("\n");

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "briefing_task_count_advisory",
        },
        toolName,
        cwd,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working"],
        reasoning: `briefing-task-count-limit: advisory at ${taskCount} tasks (subagent_type=${subagentType}, tier=${tier}, ceiling=${blockingThreshold})`,
      });
    } catch { /* best-effort */ }

    return {
      message: advisory,
      hookSpecificOutput: {
        additionalContext: advisory,
      },
    };
  }

  // Under thresholds — pass silently
  return {
    message: `palantir-mini: briefing-task-count-limit OK (${taskCount} tasks ≤ ${advisoryThreshold} ${tier} advisory)`,
  };
}
