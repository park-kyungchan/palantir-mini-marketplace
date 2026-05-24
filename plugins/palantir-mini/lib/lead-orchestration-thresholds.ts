// palantir-mini — Lead Orchestration Thresholds (sprint-060 W1.1, closes P1.LD1)
//
// Single source of truth for Lead-direct orchestration gate thresholds.
// Used by:
//   - hooks/pre-delegation-check.ts   (PreToolUse gate on file edits)
//   - hooks/lead-direct-edit-watch.ts (PostToolUse advisory + blocking counters)
//   - hooks/task-context-budget-enforcer.ts (PreToolUse gate on Agent spawns)
//
// Tuning rationale:
//   PRE_DELEGATION_TRIGGER = 3:
//     Matches rule 12 v3.4.0 "≤3 files Lead-direct OK; >3 files MUST /pm-delegate-or-direct".
//     Three edits is enough to establish context; a 4th edit without a delegation recipe
//     signals Lead is drifting into hands-on executor mode rather than orchestrator mode.
//
//   PRE_DELEGATION_COOLDOWN_MIN = 30:
//     Delegation recipes have a 30-minute validity window. A recipe older than 30 min
//     likely does not cover the current task scope (Sprint boundary or scope change).
//     Matches the session-level advisory cadence in lead-direct-edit-watch.
//
//   LEAD_DIRECT_ADVISORY = 5:
//     Session-cumulative advisory fires at 5 edits. Provides a soft reminder before
//     the hard blocking threshold. Intent: Lead notices and adjusts *before* being blocked.
//
//   LEAD_DIRECT_BLOCKING = 15:
//     Session-cumulative block fires at 15 edits. High enough to not impede legitimate
//     Lead synthesis work (docs, plans, BROWSE/INDEX), low enough to prevent unchecked
//     hands-on work that should be delegated. Bypass: PALANTIR_MINI_LEAD_DIRECT_BYPASS=1.
//
//   LEAD_DIRECT_SPRINT_ADVISORY = 3:
//     Per-sprint advisory at 3 (same as PRE_DELEGATION_TRIGGER — aligned intentionally).
//     Triggers the /pm-delegate-or-direct suggestion at the sprint's threshold boundary.
//
//   LEAD_DIRECT_SPRINT_BLOCKING = 5:
//     Per-sprint block at 5. Tighter than session-level because a single sprint should
//     have narrow scope. If Lead hits 5 within one sprint, task splitting is overdue.
//
//   TASK_BUDGET_ADVISORY_TOKENS = 20_000:
//     Advisory fires at ~20K tokens (70K chars). Raised from 10K per claude-code-guide
//     research 2026-05-12: sonnet 200K context at 80 turns allows larger briefings while
//     still flagging before the hard ceiling.
//
//   TASK_BUDGET_BLOCKING_TOKENS = 25_000:
//     Hard ceiling at 25K tokens (87.5K chars). Raised from 15K per claude-code-guide
//     research 2026-05-12: 80-turn maxTurns + 10-15-task briefings require more room.
//     Post sprint-057 W1: 22 agents reverted to 200K (from [1m]). Finer task splitting
//     is the compensating control; ceiling raised to match new briefing scale.
//
// Cross-ref: rule 12 v3.4.0 §Lead-direct edit threshold + §Pre-delegation analysis framework
//            + §Task granularity; rule 26 §Axis E (procedural + semantic memory layers)

/** Trigger threshold for pre-delegation-check gate (edits before delegation required). */
export const PRE_DELEGATION_TRIGGER = 3;

/** Cooldown window in minutes: delegation recipe older than this is considered stale. */
export const PRE_DELEGATION_COOLDOWN_MIN = 30;

/** Session-cumulative advisory threshold (fires at exactly this edit count). */
export const LEAD_DIRECT_ADVISORY = 5;

/** Session-cumulative blocking threshold (fires at >= this count). */
export const LEAD_DIRECT_BLOCKING = 15;

/** Per-sprint advisory threshold (fires at exactly this count within a sprint). */
export const LEAD_DIRECT_SPRINT_ADVISORY = 3;

/** Per-sprint blocking threshold (fires at >= this count within a sprint). */
export const LEAD_DIRECT_SPRINT_BLOCKING = 5;

/** Advisory token budget per subagent briefing (chars / 3.5 estimate). */
export const TASK_BUDGET_ADVISORY_TOKENS = 20_000;

/** Hard blocking token ceiling per subagent briefing (chars / 3.5 estimate). */
export const TASK_BUDGET_BLOCKING_TOKENS = 25_000;

/**
 * Synthesis-edit detection window (minutes).
 * Mixed-session advisory fires when a synthesis edit is followed by a
 * production edit within this window (Task B — P1.LD2).
 */
export const SYNTHESIS_MIXED_WINDOW_MIN = 30;

/**
 * Minimum synthesis edits before mixed-session advisory triggers.
 * Prevents noise from a single accidental synthesis file.
 */
export const SYNTHESIS_MIXED_MIN_COUNT = 3;
