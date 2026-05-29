---
name: pm-harness-grade
category: core-workflow
description: "Standalone rubric grading — apply a GradingRubric to any artifact without running a..."
allowed-tools: Agent mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric mcp__plugin_palantir-mini_palantir-mini__emit_event
argument-hint: "<artifactPath>   (file or directory to grade; rubric resolved via --rubric flag or default eval-rubric.md)"
effort: high
disable-model-invocation: false
---

# pm-harness-grade — Standalone rubric grading

## When to use

- User wants to score an artifact without executing a full sprint.
- Comparing two implementations against the same rubric.
- Post-hoc audit of a past iteration's artifact.
- User says "grade this", "score against rubric", "evaluate".
- `/palantir-mini:pm-harness-grade <artifactPath>` invocation.

## Process

1. Resolve artifact:
   - `$ARGUMENTS` is a file/dir path (relative to project root OK).
   - Verify existence; error if missing.

2. Resolve rubric:
   - Default: `<project>/.palantir-mini/harness/eval-rubric.md` (latest planner output).
   - Override: if `$ARGUMENTS` contains `--rubric <path>`, use that.
   - Parse rubric JSON block at end of markdown.

3. Call `grade_outcome_with_rubric` MCP:
```
grade_outcome_with_rubric({
  project: "<absolute>",
  artifactPath: "<resolved>",
  rubricJson: { ... },
  evidenceDir: null   // no playwright run — static grading
})
```

4. MCP dispatches per-criterion:
   - `rubricDomain=code` → `grader-code` agent
   - `rubricDomain=model` → `grader-model` agent
   - `rubricDomain=rule` → inline JSONSchema / regex check (handler only)
   - `rubricDomain=human` → write marker to feedback.md, exit partial
   - `rubricDomain=hybrid` → compose per `combinator`

5. Aggregate weighted score, emit `grading_completed` event.

## Output

```
# pm-harness-grade report — <artifactPath>

Rubric: <source>
Criteria scored: <N>
Weighted score: <float> / 10

Per-criterion:
| Criterion | Domain | Score | Weight | Weighted |
|-----------|--------|-------|--------|----------|
| ...       | model  | 7.5   | 0.30   | 2.25     |
| ...       | code   | 1.0   | 0.20   | 2.00     |

Overall verdict: PASS|FAIL|PARTIAL (human-review-required)
Evidence: .palantir-mini/harness/ad-hoc-grading/<timestamp>/
```

## Difference from pm-harness-sprint

- pm-harness-grade = one-shot, static, no Playwright, no iteration loop.
- pm-harness-sprint = full Generator↔Evaluator iteration until threshold or exhaustion.

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — grading_completed event persists scoring for replay.
- `~/.claude/research/palantir-foundry/aip/aip-evals-run-suite.md` — 5-evaluator dispatch pattern.
