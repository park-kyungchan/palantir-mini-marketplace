---
name: pm-eval-suite-run
category: merge-candidate
description: "Execute an authored AIPEvaluationSuiteDeclaration over a target artifact — dispatches per-criterion grade_outcome_with_rubric calls, aggregates per-criterion scores, persists..."
allowed-tools: mcp__palantir-mini__grade_outcome_with_rubric mcp__palantir-mini__pm_grader_dispatch mcp__palantir-mini__emit_event Read Write Bash
effort: high
disable-model-invocation: false
---

# pm-eval-suite-run — AIP Evals run dispatcher

## When to use

- After `/pm-eval-suite-author` to execute the suite over a candidate artifact.
- During CI/release gates to grade a target before promotion.
- When `/palantir-mini:pm-eval-suite-run` is invoked or these phrases appear: "run eval suite", "execute eval", "evaluate X against suite Y", "AIP Evals run".

## Prerequisites

- Schemas v1.37.0+ (`AIPEvaluationSuiteDeclaration` already authored).
- Schemas v1.40.0+ for `AIPEvalsEvaluatorType` mapping.
- Plugin v4.5.0+ (this skill).
- Authored suite JSON at `<project>/.palantir-mini/eval-suites/<suiteId>.json`.

## Inputs

- `<suiteId>`: AIPEvaluationSuiteRid of an authored suite
- `<artifactPath>`: absolute path to the candidate artifact (file, dir, or RID)
- Optional `<runLabel>`: human-readable label for this run (default: "<suiteId>-<ISO-date>")

## How to run

### Step 1 — Load suite

Read `<project>/.palantir-mini/eval-suites/<suiteId>.json`. Validate against `isAIPEvaluationSuiteDeclaration` (schemas v1.37 type guard).

### Step 2 — Dispatch per-criterion grading

For each `criterion` in the suite (loop):
- Determine the `RubricDomain` from `AIPEvalsEvaluatorTypeToRubricDomain` (schemas v1.40).
- If domain ∈ {`code`, `rule`, `simulator`, `human`, `hybrid`}: call `mcp__palantir-mini__grade_outcome_with_rubric` (in-process).
- If domain == `model`: call `mcp__palantir-mini__pm_grader_dispatch` (fresh subprocess; eliminates self-grading bias per rule 16 §Roles).
- Capture per-criterion `{score, evidenceUrl?, durationMs}`.

### Step 3 — Run all test cases

For each test case in `suite.testCaseIds[]`:
- Execute the target with `testCase.input`.
- Capture output.
- Apply each criterion's grading from Step 2 against this case's output.

### Step 4 — Aggregate

Compute:
- `aggregateScore` = weighted mean per `criterion.weightInRubric`
- `passedCriteria` = count where score ≥ `evaluatorPolicy.minimumPassingScore`
- `failedCriteria` = total - passedCriteria
- `status` = `"passed"` if `aggregateScore ≥ minimumPassingScore` AND no `requireHumanReviewForMutation` violations; else `"failed"` or `"inconclusive"`.

### Step 5 — Persist AIPEvaluationRunDeclaration

```typescript
{
  runId: aipEvaluationRunRid("run:<suiteId>:<unix-ms>"),
  suiteId,
  target: suite.target,
  status: "passed" | "failed" | "inconclusive",
  startedAt: <ISO start>,
  completedAt: <ISO end>,
  modelRef: "<active model name from session>",
  ontologyVersionRef: "<git HEAD SHA>",
  codeVersionRef: "<artifact mtime or content hash>",
  aggregateScore,
  criterionScores: [{ criterionId, score, evidenceUrl?: }, ...],
}
```

Write to `<project>/.palantir-mini/eval-suites/runs/<runId>.json`.

### Step 6 — Emit run completion event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "grading_completed",
  payload: {
    project, rubricId: suiteId, artifactPath,
    overallScore: aggregateScore, maxPossibleScore: 1,
    passedCriteria, failedCriteria,
    humanReviewRequired: <count where requireHumanReview hit>
  },
  withWhat: {
    reasoning: "AIP Evals run for suite '<name>' — <passed>/<total> criteria",
    memoryLayers: ["procedural", "semantic"],
    refinementTarget: status==="failed" ? { kind: "grading-criterion-threshold", filePathOrRid: failedCriterionRid, description: "Reduce threshold or improve target", confidenceLevel: "medium" } : undefined
  },
  lineageRefs: { actionRid: suiteId, evidenceUrls: [<runId path>] }
})
```

## Output

```
# Eval run complete — <suite-name>

Run ID: <runId>
Status: passed | failed | inconclusive
Aggregate: <score>/1.0
Per-criterion: <list with ✓/✗>

Persisted: <runId path>
Next: /pm-eval-suite-compare <baselineRunId> <runId>
```

## Authority + cross-refs

- Schemas: `aip-evaluation.ts` v1.37, `grader-domain-extension.ts` v1.40.
- Companion: `/pm-eval-suite-author` (creates suite), `/pm-eval-suite-compare` (compares 2 runs).
- 1차 자료: `~/.claude/research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`.
- Plan §3.W2.B — `~/.claude/plans/mossy-mapping-eich.md`.
