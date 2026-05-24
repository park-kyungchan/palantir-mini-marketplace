---
name: pm-harness-status
category: core-workflow
description: "Query current state of all active FeedbackLoops in a project. Shows per-loop iterationCount, state, best score so far, time remaining (vs timeoutMs), and pending gate action...."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__replay_lineage mcp__plugin_palantir-mini_palantir-mini__pm_preamble mcp__plugin_palantir-mini_palantir-mini__pm_harness_strictness_audit
effort: low
disable-model-invocation: false
---

# pm-harness-status — Query active FeedbackLoops

## When to use

- User wants a snapshot of all running harness loops.
- Before aborting or changing a sprint.
- Cold-start after session resume — surface current loop state.
- User says "status", "where are we", "current sprint", or `/palantir-mini:pm-harness-status`.

## Process

1. Call `pm_preamble` for project context.
2. Call `replay_lineage` MCP:
```
replay_lineage({
  project: "<absolute>",
  filter: {
    eventTypes: ["feedback_loop_opened", "harness_agent_spawned", "grading_completed", "sprint_contract_bound", "sprint_contract_negotiated", "playwright_scenario_executed"],
    sinceSequence: null   // full history
  }
})
```
3. **W2 Strictness Audit** (rule 16 v3.3.0 §Roles): for each active sprint, call `pm_harness_strictness_audit` MCP with `{ sprintNumber, projectPath }`. Append the `verdict` + `driftingCriteria.length` to that sprint's line of the output (`[strictness: clean]` or `[strictness: drift-suspected, N criteria]`). Read-only — no event emission from this skill.
4. Fold events into per-loop snapshots:
   - Latest state per loopId
   - iterationCount (max)
   - Latest feedback.md path + verdict + overall score
   - Last event timestamp (for staleness check)
5. Read open FeedbackLoop registry (in-memory or from session/snapshots).
6. Check timeoutMs vs current time for each loop.
6. Print table.

## Output

```
# Harness status — <project>  (as of ISO8601)

Active loops:
| Loop RID | Sprint | State | Iter | Best Score | Time Used / Budget | Pending Gate |
|----------|--------|-------|------|-----------|---------------------|--------------|
| fl-abc   | 1      | evaluating | 3    | 6.2 / 10  | 45min / 4h          | Evaluator running Playwright |
| fl-def   | 2      | negotiating | 0    | —         | 12min / 4h          | Generator + Evaluator contract round 2 |

Terminated loops:
| Loop RID | Sprint | Verdict | Iter | Final Score | Terminated At |
|----------|--------|---------|------|------------|---------------|
| fl-xyz   | 0      | passed  | 4    | 8.1 / 10   | ISO8601       |

Total harness sessions: <N>
Total iterations run: <N>
Average iterations to pass: <N>
Average wall-clock per sprint: <min>
```

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — status = fold of events.jsonl (not a separate store).
- `~/.claude/rules/12-lead-protocol-v2.md §Session lifecycle` — timeout check against 4h teammate cap.
