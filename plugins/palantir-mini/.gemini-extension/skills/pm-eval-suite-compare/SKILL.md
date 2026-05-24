---
name: pm-eval-suite-compare
category: merge-candidate
description: "Compare two AIPEvaluationRun results (baseline vs candidate) and produce AIPExperimentDeclaration with promote/hold/rollback decision + rationale."
allowed-tools: mcp__palantir-mini__emit_event Read Write Bash
effort: high
disable-model-invocation: false
---

# pm-eval-suite-compare — AIP Experiment decision dispatcher

## When to use

- After 2+ `/pm-eval-suite-run` invocations against the same suite (baseline + candidate).
- During release gating to decide whether a model/code change improves vs regresses the target.
- When `/palantir-mini:pm-eval-suite-compare` is invoked or these phrases appear: "compare eval runs", "AIP experiment", "promote candidate", "experiment baseline X candidate Y".

## Prerequisites

- Schemas v1.37.0+ (`AIPExperimentDeclaration` primitive).
- 2 prior `/pm-eval-suite-run` invocations producing AIPEvaluationRunDeclaration files.
- Plugin v4.5.0+ (this skill).

## Inputs

- `<baselineRunId>`: AIPEvaluationRunRid of the baseline run
- `<candidateRunId>`: AIPEvaluationRunRid of the candidate run
- Optional `<promotionThreshold>`: aggregate-score delta required for "promote" verdict (default: +0.05)

## How to run

### Step 1 — Load both runs

Read `<project>/.palantir-mini/eval-suites/runs/<baselineRunId>.json` and `<candidateRunId>.json`. Both must reference the same `suiteId` (else fail with mismatch error). Both must have `status: "passed" | "failed"` (not "inconclusive").

### Step 2 — Compute per-criterion deltas

```typescript
{
  perCriterion: criterionScores.map(criterion => ({
    criterionId,
    baselineScore: baseline.criterionScores[i].score,
    candidateScore: candidate.criterionScores[i].score,
    delta: candidate - baseline,
    direction: delta > 0 ? "improvement" : delta < 0 ? "regression" : "tie"
  })),
  aggregateDelta: candidate.aggregateScore - baseline.aggregateScore,
  improvedCriteria: count(direction === "improvement"),
  regressedCriteria: count(direction === "regression"),
  tiedCriteria: count(direction === "tie")
}
```

### Step 3 — Decision logic

Decision rules (apply in order):

1. If `regressedCriteria > 0` AND any regression touches a criterion with `weightInRubric > 0.3` (load-bearing): **decision = "rollback"**, rationale cites the specific load-bearing criterion.
2. Else if `aggregateDelta >= promotionThreshold`: **decision = "promote"**, rationale cites the top-3 improved criteria.
3. Else if `aggregateDelta > 0` (positive but below threshold): **decision = "hold"**, rationale cites "improvement insufficient — re-run with more samples or wider eval suite".
4. Else if `aggregateDelta == 0`: **decision = "hold"**, rationale cites "no signal".
5. Else (`aggregateDelta < 0` but no load-bearing regression): **decision = "needs-human-review"**, rationale cites the regression specifics.

### Step 4 — Persist AIPExperimentDeclaration

```typescript
{
  experimentId: aipExperimentRid("exp:<suiteId>:<unix-ms>"),
  suiteId: baseline.suiteId,
  baselineRunId,
  candidateRunIds: [candidateRunId],
  decision: "promote" | "hold" | "rollback" | "needs-human-review",
  rationale: "<from Step 3>",
  decidedAt: <ISO>
}
```

Write to `<project>/.palantir-mini/eval-suites/experiments/<experimentId>.json`.

### Step 5 — Emit experiment event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "aip-experiment-decision",
    taskId: experimentId,
    validations: ["delta-computed", "decision-rule-applied", "experiment-persisted"]
  },
  withWhat: {
    reasoning: "Experiment <experimentId>: <decision> (delta=<aggregateDelta>; <improved>/<regressed>/<tied>)",
    hypothesis: decision === "promote" ? "Candidate is shippable" : decision === "rollback" ? "Candidate breaks load-bearing criterion" : "Inconclusive — gather more signal",
    memoryLayers: ["semantic", "procedural", "episodic"],
    refinementTarget: decision === "rollback" ? { kind: "other", filePathOrRid: candidateRunId, description: "Rollback candidate; re-run after fix", confidenceLevel: "high" } : undefined
  },
  lineageRefs: { actionRid: baseline.suiteId, evidenceUrls: [<baselineRunId path>, <candidateRunId path>] }
})
```

## Output

```
# Experiment decision — <experimentId>

Suite: <suite-name>
Baseline: <baselineRunId> (aggregate=<X>)
Candidate: <candidateRunId> (aggregate=<Y>)
Delta: +/- <Z> (<improved>↑ <regressed>↓ <tied>=)

Decision: promote | hold | rollback | needs-human-review
Rationale: <from Step 3>

Persisted: <experimentId path>
```

## Authority + cross-refs

- Schemas: `aip-evaluation.ts` v1.37 (`AIPExperimentDeclaration`).
- Companion: `/pm-eval-suite-author`, `/pm-eval-suite-run`.
- 1차 자료: `~/.claude/research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` (AIP Experiments section).
- Plan §3.W2.B — `~/.claude/plans/mossy-mapping-eich.md`.
