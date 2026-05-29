---
name: pm-harness-base-mode-audit
category: merge-candidate
description: "B1 → B2 escalation observation audit (palantir-mini v3.11.0+ CT-5 W3.1d). Reads..."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__pm_harness_base_mode_audit mcp__plugin_palantir-mini_palantir-mini__pm_preamble
effort: medium
disable-model-invocation: false
---

# pm-harness-base-mode-audit — B1 → B2 escalation observation

## When to use

- Weekly snapshot during the 4-week shakedown window (2026-04-29 → ~2026-05-27).
- Before authorizing B1 → B2 escalation in `~/.claude/rules/16-3-agent-harness.md` §Default-On Policy.
- When investigating workflow friction caused by `commit-edits-precondition` gate blocks.
- Suggested cron pattern: `/loop 7d /palantir-mini:pm-harness-base-mode-audit` for hands-off weekly observation.
- User says "shakedown audit", "ready for B2?", "harness base-mode audit", or invokes `/palantir-mini:pm-harness-base-mode-audit`.

## Process

1. Call `pm_preamble` for project context.
2. Parse `$ARGUMENTS`:
   - `--sinceDays=N` (default 7) — rolling window in days
   - `--projectPath=<absolute>` — override (defaults to PALANTIR_MINI_PROJECT or cwd)
3. Call `pm_harness_base_mode_audit` MCP:
```
pm_harness_base_mode_audit({
  projectPath: "<absolute>",   // optional
  sinceDays: 7                  // default
})
```
4. Render the result table + reasoning + recommendation.

## Output

```
# Harness base-mode audit — <projectPath>
Window: <sinceISO> → <untilISO>  (sinceDays=<N>)

## Totals
| Outcome   | Count |
|-----------|-------|
| passed    | <N>   |
| bypassed  | <N>   |
| blocked   | <N>   |

## Block reasons (top 5)
| errorClass             | Count |
|------------------------|-------|
| no-bound-contract      | <N>   |
| missing-dry-run-ref    | <N>   |
| ...                    |       |

## Rates
- bypass: <X.X>%   (ceiling for B2: 5%)
- block:  <X.X>%   (ceiling for B2: 20%)

## Recommendation: <ready-for-B2 | more-data-needed | investigate-friction>

<reasoning text from MCP>
```

## Decision logic

The MCP handler computes `recommendation` from totals:

- **`ready-for-B2`** (escalate per rule 16 §Default-On Policy): `bypassRate < 5%` AND `blockRate < 20%` AND `passed ≥ 50`.
- **`more-data-needed`** (continue B1 shakedown): `passed < 20`.
- **`investigate-friction`** (workflow friction; address before escalation): otherwise.

## Suggested follow-ups

- `recommendation: ready-for-B2` → invoke escalation steps from `~/.claude/plans/2026-05-27-b2-escalation-followup.md`: bump rule 16 v3.3.0 → v3.4.0 + extend `commit-edits-precondition.ts` matcher in `hooks.json` to `Write|Edit|MultiEdit` + ship plugin v3.12.0.
- `recommendation: more-data-needed` → re-run weekly until floor met (≥ 50 passed events for ready-for-B2).
- `recommendation: investigate-friction` → drill into top block reasons; if `no-harness-dir` dominates, projects need `/palantir-mini:pm-init` or harness bootstrap; if `dry-run-graded-fail` dominates, generator pipeline needs tuning.

## Rule citations

- `~/.claude/rules/16-3-agent-harness.md §Default-On Policy` — B1 → B2 transition criteria.
- `~/.claude/rules/10-events-jsonl.md` — gate behavior derived from append-only event log.
- `~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md CT-5` — audit infrastructure motivation.
