---
name: pm-eval-suite
category: maintenance
surfaceStatus: public-core
description: "AIP-Evals lifecycle — author | run | compare modes over an EvaluationSuite (test..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__ontology_schema_get mcp__palantir-mini__grade_outcome_with_rubric mcp__palantir-mini__pm_grader_dispatch Read Write Edit Bash
effort: high
disable-model-invocation: false
---

# pm-eval-suite — AIP Evals lifecycle (author | run | compare)

One skill, three modes selected by the first argument:

| Mode | Trigger | Use when |
|------|---------|----------|
| `author` | `/palantir-mini:pm-eval-suite author …` | Create a new EvaluationSuite for a target |
| `run` | `/palantir-mini:pm-eval-suite run <suiteId> <artifactPath>` | Execute an authored suite over a candidate artifact |
| `compare` | `/palantir-mini:pm-eval-suite compare <baselineRunId> <candidateRunId>` | Decide promote/hold/rollback between 2 runs |

## Prerequisites

- Schemas v1.37.0+ (AIPEvaluation* primitives); v1.40.0+ for the `AIPEvalsEvaluatorType` 19-type taxonomy via `grader-domain-extension.ts`.
- Plugin v4.5.0+.

---

## Mode: author — AIP Evals authoring workflow

### When to use

- Creating a new evaluation suite for a target (AIP Logic function, AIP Agent, ActionType, OSDK app, MCP tool, prompt template).
- Codifying eval cases that previously lived as ad-hoc prompts or one-off rubrics.
- Phrases: "author eval suite", "create AIP evaluation suite", "build evaluation suite for X", "AIP Evals authoring".

### Inputs

- `<target-kind>`: one of `aip-agent | aip-logic-function | action-type | osdk-application | mcp-tool | prompt-template`
- `<target-rid>`: branded RID for the target (e.g. `aip-agent-rid:abc123`)
- `<suite-name>`: human-readable name (e.g. "DAW music-gen 16-criteria")
- Optional `<baseline-run-id>`: if comparing against a prior run baseline

### Steps

1. **Ask the user for test cases (interactive).** Walk through 3-15 representative cases. For each: `title`, `input` (JSON), `expectedOutputSchema` (optional JSONSchema), `expectedBehavior` (optional NL), `tags`. Default 5 (AIP Evals minimum); encourage 10-15 for production agents.
2. **Choose evaluator policy.** Pick 1-3 evaluator domains from the 19-type taxonomy (schemas v1.40 `AIPEvalsEvaluatorType`):
   - Deterministic: `exact-match`, `regex`, `range`, `levenshtein`, `keyword-checker`, `exact-set-match`, `fuzzy-match`, `json-schema-conformance`
   - Heuristic: `rouge`, `embedding-similarity`
   - LLM-judge: `llm-as-judge`, `rubric-grader`, `contains-key-details`
   - Domain-specific: `required-actions-match`, `function-backed-custom`, `tool-use-validator`, `structured-output-validator`
   - Special: `ontology-edit-simulator`, `human-review`
   Map each chosen type to a `RubricDomain` via `AIPEvalsEvaluatorTypeToRubricDomain` (schemas v1.40).
3. **Compose AIPEvaluationSuiteDeclaration JSON:**

```typescript
{
  suiteId: aipEvaluationSuiteRid("suite:<slug>"),
  name: "<suite-name>",
  target: { kind: "<target-kind>", rid: "<target-rid>", versionRef: "<commit-sha-or-version>" },
  testCaseIds: [/* generated TestCaseRid for each authored test case */],
  criteria: [/* GradingCriterionRid[] — created via grade_outcome_with_rubric or hand-authored */],
  evaluatorPolicy: {
    allowedDomains: ["<one or more RubricDomain>"],
    requireHumanReviewForMutation: true,  // default for ACTION-type targets
    minimumPassingScore: 0.7,
  },
  baselineRunId: "<optional run RID>",
}
```

   Plus 1 `AIPEvaluationTestCaseDeclaration` per test case.
4. **Persist** to `<project>/.palantir-mini/eval-suites/<suiteId>.json` (mkdir if absent); append to `<project>/.palantir-mini/eval-suites/INDEX.json`.
5. **Emit authored event:**

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "aip-eval-suite-authored", taskId: "<suiteId>", validations: ["test-cases-≥3", "evaluator-policy-set", "target-rid-valid"] },
  withWhat: {
    reasoning: "AIP Evals suite '<name>' authored over <N> test cases × <M> evaluators",
    memoryLayers: ["semantic", "procedural"],
    refinementTarget: { kind: "primitive-field-add", filePathOrRid: "<suiteId>", description: "Author EvaluationSuite for <target>", confidenceLevel: "high" }
  }
})
```

### Output

```
# Eval suite authored — <suite-name>
Suite ID: <suiteId>
Target: <kind>:<rid>
Test cases: <N>
Evaluators: <list of AIPEvalsEvaluatorType>
Persisted: <path>

Next: /palantir-mini:pm-eval-suite run <suiteId> <artifact-path>
```

---

## Mode: run — AIP Evals run dispatcher

### When to use

- After `author` to execute the suite over a candidate artifact.
- During CI/release gates to grade a target before promotion.
- Phrases: "run eval suite", "execute eval", "evaluate X against suite Y", "AIP Evals run".

### Inputs

- `<suiteId>`: AIPEvaluationSuiteRid of an authored suite
- `<artifactPath>`: absolute path to the candidate artifact (file, dir, or RID)
- Optional `<runLabel>`: human-readable label (default `<suiteId>-<ISO-date>`)

### Steps

1. **Load suite.** Read `<project>/.palantir-mini/eval-suites/<suiteId>.json`; validate against `isAIPEvaluationSuiteDeclaration` (schemas v1.37 type guard).
2. **Dispatch per-criterion grading.** For each `criterion`:
   - Determine `RubricDomain` from `AIPEvalsEvaluatorTypeToRubricDomain` (schemas v1.40).
   - domain ∈ {`code`, `rule`, `simulator`, `human`, `hybrid`}: `mcp__palantir-mini__grade_outcome_with_rubric` (in-process).
   - domain == `model`: `mcp__palantir-mini__pm_grader_dispatch` (fresh subprocess; eliminates self-grading bias).
   - Capture per-criterion `{score, evidenceUrl?, durationMs}`.
3. **Run all test cases.** For each in `suite.testCaseIds[]`: execute target with `testCase.input`, capture output, apply each criterion's grading.
4. **Aggregate.** `aggregateScore` = weighted mean per `criterion.weightInRubric`; `passedCriteria` = count where score ≥ `evaluatorPolicy.minimumPassingScore`; `status` = `"passed"` if `aggregateScore ≥ minimumPassingScore` AND no `requireHumanReviewForMutation` violations; else `"failed"` / `"inconclusive"`.
5. **Persist AIPEvaluationRunDeclaration:**

```typescript
{
  runId: aipEvaluationRunRid("run:<suiteId>:<unix-ms>"),
  suiteId, target: suite.target,
  status: "passed" | "failed" | "inconclusive",
  startedAt: <ISO start>, completedAt: <ISO end>,
  modelRef: "<active model name from session>",
  ontologyVersionRef: "<git HEAD SHA>",
  codeVersionRef: "<artifact mtime or content hash>",
  aggregateScore,
  criterionScores: [{ criterionId, score, evidenceUrl?: }, ...],
}
```

   Write to `<project>/.palantir-mini/eval-suites/runs/<runId>.json`.
6. **Emit run completion event:**

```
mcp__palantir-mini__emit_event({
  type: "grading_completed",
  payload: { project, rubricId: suiteId, artifactPath, overallScore: aggregateScore, maxPossibleScore: 1, passedCriteria, failedCriteria, humanReviewRequired: <count where requireHumanReview hit> },
  withWhat: {
    reasoning: "AIP Evals run for suite '<name>' — <passed>/<total> criteria",
    memoryLayers: ["procedural", "semantic"],
    refinementTarget: status==="failed" ? { kind: "grading-criterion-threshold", filePathOrRid: failedCriterionRid, description: "Reduce threshold or improve target", confidenceLevel: "medium" } : undefined
  },
  lineageRefs: { actionRid: suiteId, evidenceUrls: [<runId path>] }
})
```

### Output

```
# Eval run complete — <suite-name>
Run ID: <runId>
Status: passed | failed | inconclusive
Aggregate: <score>/1.0
Per-criterion: <list with ✓/✗>

Persisted: <runId path>
Next: /palantir-mini:pm-eval-suite compare <baselineRunId> <runId>
```

---

## Mode: compare — AIP Experiment decision dispatcher

### When to use

- After 2+ `run` invocations against the same suite (baseline + candidate).
- During release gating to decide whether a model/code change improves vs regresses the target.
- Phrases: "compare eval runs", "AIP experiment", "promote candidate", "experiment baseline X candidate Y".

### Inputs

- `<baselineRunId>`: AIPEvaluationRunRid of the baseline run
- `<candidateRunId>`: AIPEvaluationRunRid of the candidate run
- Optional `<promotionThreshold>`: aggregate-score delta required for "promote" (default +0.05)

### Steps

1. **Load both runs.** Read `runs/<baselineRunId>.json` and `<candidateRunId>.json`. Both must reference the same `suiteId` (else fail with mismatch). Both must have `status: "passed" | "failed"` (not "inconclusive").
2. **Compute per-criterion deltas:**

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

3. **Decision logic** (apply in order):
   1. `regressedCriteria > 0` AND any regression touches a criterion with `weightInRubric > 0.3` (load-bearing): **rollback**, rationale cites the load-bearing criterion.
   2. Else `aggregateDelta >= promotionThreshold`: **promote**, rationale cites top-3 improved criteria.
   3. Else `aggregateDelta > 0` (positive but below threshold): **hold**, rationale "improvement insufficient — re-run with more samples or wider eval suite".
   4. Else `aggregateDelta == 0`: **hold**, rationale "no signal".
   5. Else (`aggregateDelta < 0` but no load-bearing regression): **needs-human-review**, rationale cites regression specifics.
4. **Persist AIPExperimentDeclaration:**

```typescript
{
  experimentId: aipExperimentRid("exp:<suiteId>:<unix-ms>"),
  suiteId: baseline.suiteId,
  baselineRunId, candidateRunIds: [candidateRunId],
  decision: "promote" | "hold" | "rollback" | "needs-human-review",
  rationale: "<from Step 3>",
  decidedAt: <ISO>
}
```

   Write to `<project>/.palantir-mini/eval-suites/experiments/<experimentId>.json`.
5. **Emit experiment event:**

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "aip-experiment-decision", taskId: experimentId, validations: ["delta-computed", "decision-rule-applied", "experiment-persisted"] },
  withWhat: {
    reasoning: "Experiment <experimentId>: <decision> (delta=<aggregateDelta>; <improved>/<regressed>/<tied>)",
    hypothesis: decision === "promote" ? "Candidate is shippable" : decision === "rollback" ? "Candidate breaks load-bearing criterion" : "Inconclusive — gather more signal",
    memoryLayers: ["semantic", "procedural", "episodic"],
    refinementTarget: decision === "rollback" ? { kind: "other", filePathOrRid: candidateRunId, description: "Rollback candidate; re-run after fix", confidenceLevel: "high" } : undefined
  },
  lineageRefs: { actionRid: baseline.suiteId, evidenceUrls: [<baselineRunId path>, <candidateRunId path>] }
})
```

### Output

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

---

## Authority + cross-refs

- Schemas: `~/.claude/schemas/ontology/primitives/aip-evaluation.ts` (v1.37+, `AIPEvaluationSuiteDeclaration` / `AIPEvaluationRunDeclaration` / `AIPExperimentDeclaration`), `grader-domain-extension.ts` (v1.40+).
- Design-authority (WHY, primary): `~/harness-upstream/ssot/palantir/aip-evals/` (scan `ssot/palantir/BROWSE.md` → `INDEX.md` → smallest slice). Design grounds, source governs; distinct from the raw research firehose and pm's `.ssot-authority.json`.
- 1차 자료 (raw research, reference-only): `~/.claude/research/palantir-official/foundry/aip/`.
- Plan §3.W2.B — `~/.claude/plans/mossy-mapping-eich.md`.
