// palantir-mini v4.12.0 — task-context-budget-enforcer hook (sprint-057 W6; sprint-060 W1.1/W2.3)
// Fires on: PreToolUse with matcher "Agent" (subagent spawn)
//
// sprint-060 W1.1 (P1.LD1): thresholds now imported from lib/lead-orchestration-thresholds.ts
//   (replaces hardcoded ADVISORY_THRESHOLD_TOKENS + BLOCK_THRESHOLD_TOKENS exports).
//   Old export names preserved as re-exports for backwards compatibility with tests.
//
// sprint-060 W2.3 (R6-F13): add metrics emission for `budget_block_invoked` events.
//   Architecture review §5.I.6 suggests tracking block counts to detect false positives
//   (if false-positive rate >5% over 30 days, raise threshold or refine tokenizer).
//   New: emit `budget_block_invoked` event on every block with tokenEstimate + threshold
//   so audit queries can surface false-positive rates over time.
//
// Per rule 12 §Task granularity ("Context budget ≤ 15K tokens per task") +
// user explicit ask 2026-05-07: "extra usage 필요한 것들은 다시 200K로 바꾸어라.
// 그대신 Lead가 tasks를 더 분할하도록 hooks 등을 강제해야겠다."
//
// Estimates the briefing prompt's token cost (chars / 3.5 conservative ≈ tokens).
// Threshold:
//   - Advisory at TASK_BUDGET_ADVISORY_TOKENS (10K tokens) — encouragement to split
//   - Block at TASK_BUDGET_BLOCKING_TOKENS (15K tokens) — rule 12 §Task granularity hard ceiling
//
// Bypass: PALANTIR_MINI_TASK_BUDGET_BYPASS=1 env (audited via emit_event).
//
// Pairs with briefing-template-validate.ts (SubagentStart, structural check) +
// pre-delegation-check.ts (PreToolUse Edit|Write|MultiEdit, gate before edit).
// This hook checks SIZE specifically, not structure — preventing 200K context
// exhaustion now that 22 plugin agents are 200K (post sprint-057 W1 revert).
//
// Authority: rule 12 (lead-protocol) §Task granularity — Context budget ≤ 15K tokens
//            ~/.claude/plans/quirky-popping-frog.md §W6
//            sprint-057 W1 — agents reverted to 200K (sprint-056 W4 [1m] reverted)
//            ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.I.6 (R6-F13)

import { emit } from "../scripts/log";
import {
  TASK_BUDGET_ADVISORY_TOKENS,
  TASK_BUDGET_BLOCKING_TOKENS,
} from "../lib/lead-orchestration-thresholds";

// Re-export threshold constants for backwards compatibility with existing tests
// (tests import ADVISORY_THRESHOLD_TOKENS + BLOCK_THRESHOLD_TOKENS from this module).
export { TASK_BUDGET_ADVISORY_TOKENS as ADVISORY_THRESHOLD_TOKENS };
export { TASK_BUDGET_BLOCKING_TOKENS as BLOCK_THRESHOLD_TOKENS };

interface ToolInput {
  /** Subagent spawn briefing prompt (the work description). */
  prompt?: string;
  /** Subagent type / agent name. */
  subagent_type?: string;
  /** Description (short). */
  description?: string;
}

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: ToolInput;
}

interface HookResult {
  message:  string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow" | "ask";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

/**
 * Conservative tokens estimate from string length.
 * 3.5 chars/token is a safe lower bound for English (actual tends to be 3.5-4).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export default async function taskContextBudgetEnforcer(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "Agent";
  const sessionId = p.session_id;
  const subagentType = p.tool_input?.subagent_type ?? "(unspecified)";
  const description = p.tool_input?.description ?? "(unspecified)";

  // Bypass via env (audited)
  if (process.env.PALANTIR_MINI_TASK_BUDGET_BYPASS === "1") {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     true,
          errorClass: "task_budget_bypass_invoked",
        },
        toolName,
        cwd,
        sessionId,
        identity:    "monitor",
        memoryLayers: ["working"],
        reasoning:   `task-context-budget-enforcer: bypass via PALANTIR_MINI_TASK_BUDGET_BYPASS=1 (subagent_type=${subagentType})`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/task-context-budget-enforcer.ts",
          description:     "Task context budget enforcer bypassed via env — audited per rule 12 §Task granularity.",
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort */ }
    return { message: `palantir-mini: task-context-budget-enforcer BYPASS (env)` };
  }

  const prompt = p.tool_input?.prompt ?? "";
  if (!prompt || typeof prompt !== "string" || prompt.length === 0) {
    return {
      message: `palantir-mini: task-context-budget-enforcer skipped (no prompt content for ${subagentType})`,
    };
  }

  const tokenEstimate = estimateTokens(prompt);

  // Block above hard ceiling
  if (tokenEstimate >= TASK_BUDGET_BLOCKING_TOKENS) {
    const reason = [
      `palantir-mini: task-context-budget-enforcer BLOCK — briefing prompt ~${tokenEstimate} tokens ≥ ${TASK_BUDGET_BLOCKING_TOKENS} hard ceiling.`,
      ``,
      `Subagent: ${subagentType} | Description: ${description}`,
      `Prompt size: ${prompt.length} chars / ~${tokenEstimate} tokens.`,
      ``,
      `Rule 12 (lead-protocol) §Task granularity caps subagent task context at ${TASK_BUDGET_BLOCKING_TOKENS} tokens.`,
      `Sprint-057 W1 reverted 22 plugin agents from [1m] (1M ctx) to standard 200K — finer task splitting required.`,
      ``,
      `To resolve:`,
      `  1. Split into 2+ smaller subagent spawns with disjoint scope.`,
      `  2. Move shared context (file paths, exact strings) to a plan file (~/.claude/plans/) — synthesis path exempt.`,
      `  3. Use TaskCreate to enumerate sub-tasks; spawn one subagent per task chunk.`,
      ``,
      `Bypass (audited): PALANTIR_MINI_TASK_BUDGET_BYPASS=1`,
    ].join("\n");

    try {
      // Primary block event (existing)
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass: "task_context_budget_blocked",
        },
        toolName,
        cwd,
        sessionId,
        identity:    "monitor",
        memoryLayers: ["working", "procedural"],
        reasoning:   `task-context-budget-enforcer: BLOCK at ${tokenEstimate} tokens (subagent_type=${subagentType}, description="${description}")`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/task-context-budget-enforcer.ts",
          description:     `Subagent spawn blocked — briefing exceeds ${TASK_BUDGET_BLOCKING_TOKENS} token ceiling per rule 12 §Task granularity. Lead must split task.`,
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort */ }

    try {
      // sprint-060 W2.3 (R6-F13): emit budget_block_invoked metric event for
      // false-positive rate tracking (architecture review §5.I.6).
      // Query: count budget_block_invoked over 30d window; if >5% of agent spawns,
      // raise threshold or refine tokenizer estimate.
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:           "design",
          passed:          false,
          errorClass:      "budget_block_invoked",
          tokenEstimate,
          blockingThreshold: TASK_BUDGET_BLOCKING_TOKENS,
          advisoryThreshold: TASK_BUDGET_ADVISORY_TOKENS,
          promptLengthChars: prompt.length,
          subagentType,
        } as Record<string, unknown>,
        toolName,
        cwd,
        sessionId,
        identity:    "monitor",
        memoryLayers: ["procedural"],
        reasoning:   `task-context-budget-enforcer: budget_block_invoked metric — tokenEstimate=${tokenEstimate}, blockingThreshold=${TASK_BUDGET_BLOCKING_TOKENS} (R6-F13 audit trail for false-positive threshold tuning)`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/task-context-budget-enforcer.ts",
          description:     `budget_block_invoked count tracks threshold false-positive rate. If >5% of subagent spawns blocked over 30d, raise threshold per architecture review §5.I.6.`,
          confidenceLevel: "medium",
        },
      });
    } catch { /* best-effort */ }

    return {
      message: `palantir-mini: task-context-budget-enforcer BLOCK (~${tokenEstimate} tokens ≥ ${TASK_BUDGET_BLOCKING_TOKENS})`,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: reason,
      },
    };
  }

  // Advisory above soft threshold
  if (tokenEstimate >= TASK_BUDGET_ADVISORY_TOKENS) {
    const advisory = [
      `palantir-mini: task-context-budget-enforcer ADVISORY — briefing ~${tokenEstimate} tokens (>${TASK_BUDGET_ADVISORY_TOKENS}, < ${TASK_BUDGET_BLOCKING_TOKENS} block ceiling).`,
      `Consider splitting into smaller subagent spawns. Rule 12 §Task granularity recommends ≤${TASK_BUDGET_BLOCKING_TOKENS} tokens.`,
      `Subagent: ${subagentType} | Description: ${description}`,
    ].join("\n");

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     true,
          errorClass: "task_context_budget_advisory",
        },
        toolName,
        cwd,
        sessionId,
        identity:    "monitor",
        memoryLayers: ["working", "procedural"],
        reasoning:   `task-context-budget-enforcer: ADVISORY at ${tokenEstimate} tokens (subagent_type=${subagentType})`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/task-context-budget-enforcer.ts",
          description:     `Subagent spawn approaching ${TASK_BUDGET_BLOCKING_TOKENS} token ceiling — Lead should consider splitting.`,
          confidenceLevel: "medium",
        },
      });
    } catch { /* best-effort */ }

    return {
      message: `palantir-mini: task-context-budget-enforcer ADVISORY (~${tokenEstimate} tokens approaching ${TASK_BUDGET_BLOCKING_TOKENS})`,
      hookSpecificOutput: {
        additionalContext: advisory,
      },
    };
  }

  // Pass-through under threshold
  return {
    message: `palantir-mini: task-context-budget-enforcer OK (~${tokenEstimate} tokens < ${TASK_BUDGET_ADVISORY_TOKENS} for ${subagentType})`,
  };
}
