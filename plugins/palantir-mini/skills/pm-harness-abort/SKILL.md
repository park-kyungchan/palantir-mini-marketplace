---
name: pm-harness-abort
category: core-workflow
surfaceStatus: public-core
description: "Force-terminate a FeedbackLoop. Preserves all iteration artifacts + evidence, emits..."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__close_feedback_loop mcp__plugin_palantir-mini_palantir-mini__emit_event SendMessage
argument-hint: "<loop-rid>   (FeedbackLoopRid from pm-harness-status)"
effort: medium
disable-model-invocation: false
---

# pm-harness-abort — Force-terminate a FeedbackLoop

## When to use

- A loop is stuck in negotiation > 3 rounds with no convergence.
- Sprint scope changed materially; finishing current loop wastes tokens.
- User realized the spec is wrong and wants to revise before continuing.
- User says "abort", "stop", "kill", or `/palantir-mini:pm-harness-abort <loop-rid>`.

## Prerequisites

- Loop RID known (run `/palantir-mini:pm-harness-status` if unsure).
- User has confirmed intent to abort (this is a destructive action for the sprint, though artifacts are preserved).

## Process

1. Validate loop RID exists + state is active (not terminal).
2. Send shutdown_request to Generator + Evaluator:
```
SendMessage({
  to: "harness-generator",
  message: { type: "shutdown_request", request_id: "<uuid>", reason: "pm-harness-abort <loop-rid>" }
})
// same for harness-evaluator, harness-orchestrator
```
3. Wait for shutdown_response (or 30s timeout).
4. Call `close_feedback_loop` MCP:
```
close_feedback_loop({
  project: "<absolute>",
  loopId: "<rid>",
  verdict: "aborted",
  terminationCondition: {
    type: "abort",
    rationale: "user-initiated abort via pm-harness-abort",
    terminatedAt: "<ISO8601>"
  }
})
```
5. MCP emits `feedback_loop_opened` close event with terminationCondition.
6. Write `loop-summary.md` with aborted-state snapshot (best iteration, scores, artifacts preserved).
7. Do NOT delete any files — artifacts are audit record.

## Output

```
# pm-harness-abort report — <loop-rid>

Prior state: evaluating (iteration 4/15)
Best iteration so far: 3 (score 6.2 / 10)
Termination: abort (user-initiated)

Teammates shut down:
  harness-generator → shutdown_response received
  harness-evaluator → shutdown_response received
  harness-orchestrator → shutdown_response received

Preserved artifacts:
  .palantir-mini/harness/sprints/sprint-NNN/contract.json
  .palantir-mini/harness/sprints/sprint-NNN/iterations/iteration-*/
  .palantir-mini/harness/sprints/sprint-NNN/loop-summary.md (updated with abort marker)

Next:
  - Revise spec.md and re-plan via /palantir-mini:pm-harness-plan
  - OR fix contract and re-run sprint via /palantir-mini:pm-harness-sprint <N>
```

## Constraints

- Does NOT delete files. Artifacts are audit record.
- Does NOT modify events.jsonl. Append-only.
- Does NOT implicitly abort other active loops — this aborts exactly the loop whose RID was passed.

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — abort appends events, never rewrites.
- `~/.claude/rules/12-lead-protocol-v2.md §Session lifecycle` — shutdown_request / shutdown_response protocol.
- `~/.claude/research/claude-code/lead-system-v2.md` §2.5 — structured SendMessage protocol.
