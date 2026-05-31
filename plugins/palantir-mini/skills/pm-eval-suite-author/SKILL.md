---
name: pm-eval-suite-author
category: merge-candidate
surfaceStatus: public-core
description: "Author an AIP-Evals-style EvaluationSuite (test cases + target + evaluator policy +..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__ontology_schema_get Read Write Edit Bash
effort: high
disable-model-invocation: false
---

# pm-eval-suite-author — AIP Evals authoring workflow

## When to use

- Creating a new evaluation suite for a target (AIP Logic function, AIP Agent, ActionType, OSDK app, MCP tool, prompt template).
- Codifying eval cases that previously lived as ad-hoc prompts or one-off rubrics.
- When `/palantir-mini:pm-eval-suite-author` is invoked or any of these phrases appear: "author eval suite", "create AIP evaluation suite", "build evaluation suite for X", "AIP Evals authoring".

## Prerequisites

- Schemas v1.37.0+ (AIPEvaluation* primitives) — current schemas at v1.40.0+.
- Schemas v1.40.0+ for `AIPEvalsEvaluatorType` 19-type taxonomy via `grader-domain-extension.ts`.
- Plugin v4.5.0+ (this skill).

## Inputs

- `<target-kind>`: one of `aip-agent | aip-logic-function | action-type | osdk-application | mcp-tool | prompt-template`
- `<target-rid>`: branded RID for the target (e.g. `aip-agent-rid:abc123`)
- `<suite-name>`: human-readable name (e.g. "DAW music-gen 16-criteria")
- Optional `<baseline-run-id>`: if comparing against a prior run baseline

## How to run

### Step 1 — Ask the user for test cases (interactive)

Walk the user through 3-15 representative test cases. For each:
- `title`: 1-line scenario name
- `input`: JSON object the target will receive
- `expectedOutputSchema` (optional): JSONSchema string the output must conform to
- `expectedBehavior` (optional): natural-language description of correct behavior
- `tags`: array of strings (categorization)

Default test-case count: 5 (matches AIP Evals minimum suite size). Encourage 10-15 for production agents.

### Step 2 — Choose evaluator policy

Pick 1-3 evaluator domains from the 19-type AIP Evals taxonomy (schemas v1.40 `AIPEvalsEvaluatorType`):
- Deterministic family: `exact-match`, `regex`, `range`, `levenshtein`, `keyword-checker`, `exact-set-match`, `fuzzy-match`, `json-schema-conformance`
- Heuristic family: `rouge`, `embedding-similarity`
- LLM-judge family: `llm-as-judge`, `rubric-grader`, `contains-key-details`
- Domain-specific: `required-actions-match`, `function-backed-custom`, `tool-use-validator`, `structured-output-validator`
- Special: `ontology-edit-simulator` (uses simulator rubric domain), `human-review` (manual)

Map each chosen type to a `RubricDomain` via `AIPEvalsEvaluatorTypeToRubricDomain` (schemas v1.40).

### Step 3 — Compose AIPEvaluationSuiteDeclaration JSON

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

### Step 4 — Persist

Write to `<project>/.palantir-mini/eval-suites/<suiteId>.json` (mkdir if absent). Append to `<project>/.palantir-mini/eval-suites/INDEX.json` for discoverability.

### Step 5 — Emit authored event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "aip-eval-suite-authored",
    taskId: "<suiteId>",
    validations: ["test-cases-≥3", "evaluator-policy-set", "target-rid-valid"]
  },
  withWhat: {
    reasoning: "AIP Evals suite '<name>' authored over <N> test cases × <M> evaluators",
    memoryLayers: ["semantic", "procedural"],
    refinementTarget: { kind: "primitive-field-add", filePathOrRid: "<suiteId>", description: "Author EvaluationSuite for <target>", confidenceLevel: "high" }
  }
})
```

## Output

```
# Eval suite authored — <suite-name>

Suite ID: <suiteId>
Target: <kind>:<rid>
Test cases: <N>
Evaluators: <list of AIPEvalsEvaluatorType>
Persisted: <path>

Next: /palantir-mini:pm-eval-suite-run <suiteId> <artifact-path>
```

## Authority + cross-refs

- Schemas: `~/.claude/schemas/ontology/primitives/aip-evaluation.ts` (v1.37+), `grader-domain-extension.ts` (v1.40+).
- 1차 자료: `~/.claude/research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`.
- Companion skills: `/pm-eval-suite-run`, `/pm-eval-suite-compare`.
- Plan §3.W2.B — `~/.claude/plans/mossy-mapping-eich.md`.
