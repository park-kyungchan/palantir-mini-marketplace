---
title: Code-Level Gap Analysis — DevCon5 / AIPCon9 Alignment
slug: adapter-gap-analysis
fileClass: vision-architecture-gap
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Code-Level Gap Analysis — DevCon5 / AIPCon9 Alignment

> Date: 2026-03-17
> Purpose: trace the current local implementation from schema to runtime and identify the remaining gaps between Palantir's public product surface and this codebase's local analogue.
> Scope: `frontend-dashboard/convex/*`, `frontend-dashboard/src/components/*`, `frontend-dashboard/ontology/*`, `.claude/schemas/ontology/*`
> **Provenance:** Mixed — local code inspection [Local] compared against upstream Palantir research and official platform docs [Official].
> **Schema anchors:** `ORCH-01..06`, `WL-01..05`, `REF-01..05`, `WLG-01..10`, `MCP-01..03`, `PB-01..03`, `LWR-01..24`, `LWE-01..24`

## [§GAP-01] 1. What Is Already Real In Code

### [§GAP-02] A. Decision Lineage / Workflow-Lineage Analogue

- `frontend-dashboard/convex/http.ts`
  - `/hooks/event` ingests 5D lineage fields: `atopCommit`, `withReasoning`, `byIdentity`
- `frontend-dashboard/convex/schema.ts`
  - `hookEvents` stores the 5D lineage fields
- `frontend-dashboard/src/components/lineage/useDecisionStream.ts`
  - turns raw lineage events into SENSE / DECIDE / ACT lanes
- `frontend-dashboard/src/components/audit/AuditPanel.tsx`
  - exposes lineage, rubric, outcome, and refinement visibility in the UI

This means the codebase already has a practical local analogue for Palantir's `Decision Lineage` concept, but it is still event-stream-centric rather than a full multi-resource Workflow Lineage graph.

### [§GAP-03] B. LEARN Loop / AIP Evals Analogue

- `frontend-dashboard/convex/schema.ts`
  - `evaluationRubrics`
  - `rubricEvaluations`
  - `outcomeRecords`
  - `dhAccuracyScores`
  - `refinementSignals`
  - `dhUpdateProposals`
  - `automationGraduation`
- `frontend-dashboard/convex/http.ts`
  - `/hooks/evals` ingests evaluator runs from `human | llmJudge | customFunction | ontologyEditSimulator`
- `frontend-dashboard/convex/refinement.ts`
  - `recordPrediction` -> `recordActualOutcome` -> `measureAccuracy` -> `detectDrift` -> `proposeDhUpdate` -> `evaluateGraduation`

This is already a real closed loop. It is no longer just philosophy in docs.

### [§GAP-04] C. Schema Self-Audit BackPropagation

- `frontend-dashboard/convex/http.ts`
  - `/hooks/schema-audit` inserts structured audit findings
- `frontend-dashboard/convex/schemaAuditActions.ts`
  - bridges non-implemented audit sections into `outcomeRecords`

This is a strong local extension. It is not an official Palantir product primitive, but it is directionally consistent with the `LEARN` idea.

## [§GAP-05] 2. Code-Level Corrections Applied In This Session

### [§GAP-06] A. Rubric Score Integrity

Files:

- `frontend-dashboard/convex/refinement.ts`
- `frontend-dashboard/convex/refinementHelpers.ts`

Changes:

- rubric evaluations now reject duplicate criterion scores
- rubric evaluations now enforce `evaluatorSource` consistency with the rubric definition
- rubric evaluations now compute the weighted rubric score from criterion inputs instead of blindly trusting `summaryScore`
- a tolerance check now rejects mismatched client-provided summary scores

Why this matters:

- AIP Evals is rubric-driven, not "accept arbitrary scalar score and hope it is honest"
- without this, the local LEARN loop could ingest internally inconsistent evaluation records

### [§GAP-07] B. Graduation Boundary Tightening

Files:

- `frontend-dashboard/convex/refinement.ts`
- `frontend-dashboard/convex/refinementHelpers.ts`

Changes:

- auto-registration for `automationGraduation` is now limited to `tool:*` and `DH-ACTION-*`
- non-automation identifiers such as `DH-DATA-*`, `DH-LOGIC-*`, or `SA-*` are no longer silently promoted into the autonomy table

Why this matters:

- Palantir's `graduation` logic is about staged autonomy of actions/automations
- the previous logic blurred the boundary between `decision heuristics` and `automation candidates`

### [§GAP-08] C. Structured Outcome Records

Files:

- `frontend-dashboard/convex/schema.ts`
- `frontend-dashboard/convex/refinement.ts`
- `frontend-dashboard/convex/outcomeActions.ts`
- `frontend-dashboard/convex/schemaAuditActions.ts`
- `frontend-dashboard/convex/internalQueries.ts`

Changes:

- `outcomeRecords` now carry typed envelopes:
  - `expectedState`
  - `actualState`
  - `decisionContext`
  - `measurement`
- `recordPrediction` now persists tool / actor / commit / target context
- `recordActualOutcome` now persists measurement source metadata
- schema-audit-bridged outcomes now write structured audit context
- outcome records now persist deterministic `expectedStateHash` / `actualStateHash`
- approval and scenario-selection flows now emit measured governance outcomes into the LEARN corpus
- outcome records now include a typed `effectManifest`

Why this matters:

- the loop is no longer only `predictedOutcome:string -> actualOutcome:string`
- each outcome can now preserve provenance about what was decided, on what target, by whom, and how it was measured
- governance decisions are no longer invisible to the learning system

### [§GAP-09] D. Graduation Policy Externalized

Files:

- `frontend-dashboard/convex/schema.ts`
- `frontend-dashboard/convex/refinement.ts`
- `frontend-dashboard/convex/refinementHelpers.ts`

Changes:

- `autonomyGraduationPolicies` is now a persisted table
- default graduation policy records are auto-seeded when the graduation cron runs
- `evaluateGraduation` now resolves thresholds from policy records instead of hard-coded constants
- `automationGraduation` now stores `policyId`

Why this matters:

- graduation rules now have provenance and can be audited or overridden without rewriting runtime code
- the runtime is aligned with the rest of the schema-driven approach instead of hiding autonomy semantics in one TS constant

### [§GAP-10] E. Evaluation Suite / Run Layer Added

Files:

- `frontend-dashboard/convex/schema.ts`
- `frontend-dashboard/convex/refinement.ts`
- `frontend-dashboard/convex/http.ts`

Changes:

- `evaluationSuites` groups rubric/evaluator configurations
- `evaluationRuns` stores run-level experiment records over rubric evaluations
- `/hooks/evals` accepts optional `suite_id`, `target_ref`, `target_version`, `run_label`

Why this matters:

- the evaluator layer can now represent more than isolated rubric events
- this gets closer to Palantir's suite/compare/run semantics, even though it is still a local analogue

### [§GAP-11] F. Workflow Lineage Resource Graph Added

Files:

- `frontend-dashboard/convex/schema.ts`
- `frontend-dashboard/convex/mutations.ts`
- `frontend-dashboard/convex/queries.ts`
- `frontend-dashboard/convex/http.ts`
- `frontend-dashboard/convex/crons.ts`
- `frontend-dashboard/src/components/audit/AuditPanel.tsx`

Changes:

- `workflowResources`, `workflowEdges`, `workflowExecutions` tables added
- session graph rebuild now derives resource nodes from:
  - session
  - tool
  - trackable id
  - outcome
  - refinement signal
  - proposal
  - rubric
  - evaluation
  - evaluation suite
  - autonomy policy
  - automation tracker
- graph refresh runs on event ingest, eval ingest, schema-audit ingest, and periodic cron
- dashboard audit view now exposes graph size and resource mix

Why this matters:

- lineage is no longer only a chronological event list
- the system now has an initial resource graph layer closer to Workflow Lineage semantics

### [§GAP-12] G. LLM-Independence Runtime Contract Added

Files:

- `frontend-dashboard/convex/schema.ts`
- `frontend-dashboard/convex/mutations.ts`
- `frontend-dashboard/convex/queries.ts`
- `frontend-dashboard/convex/llmRuntimeHelpers.ts`
- `frontend-dashboard/src/components/audit/AuditPanel.tsx`

Changes:

- sessions/events now store normalized:
  - `actorType`
  - `interfaceFamily`
  - `normalizedModel`
  - `modelProvider`
- workflow graph now includes:
  - `agent`
  - `model`
  - `provider`
  resources
- audit view now exposes provider/interface/model mix per session

Why this matters:

- Claude/Codex coexistence is no longer an implicit assumption
- the runtime now models provider-neutral identity separately from vendor-specific model strings

## [§GAP-13] 3. Verified Remaining Gaps

### [§GAP-14] GAP-01. Outcome records are much stronger, but still not fully decision-native

Current state:

- `outcomeRecords` now preserve `expectedState`, `actualState`, `decisionContext`, and `measurement`
- they now also preserve `expectedStateHash` / `actualStateHash`, `effectManifest`, and can capture scenario/approval outcomes
- but they still do not persist full edit manifests, downstream effect sets, or exact state diffs

Implication:

- this is materially better than plain strings
- but still short of a true ontology-native decision object model

Recommended next artifact:

- `DecisionOutcomeRecord`
  - `decisionId`
  - `scenarioId?`
  - `expectedEditSet`
  - `actualEditSet`
  - `expectedStateHash`
- `actualStateHash`
- `deltaBreakdown`

### [§GAP-15] GAP-02. Evaluation suite/run exists, but gap is DEEPER than initially assessed

**Severity upgraded (2026-03-17 audit):** Palantir AIP Evals has significantly more depth:

Palantir AIP Evals capabilities (verified 2026-03-17):
- **16 built-in deterministic evaluators** (exact match, regex, Levenshtein, range, temporal, etc.)
- **3 marketplace LLM-backed evaluators** (Rubric Grader, Contains Key Details, ROUGE)
- **Custom evaluation functions** (any published function)
- **Grid search experiments** (parameter combinatorial testing across models/prompts)
- **Ontology simulation sandbox** (edit functions tested without real mutations)
- **Results analyzer** (LLM-powered failure clustering + prompt optimization suggestions)
- **Multi-version function targeting** (last saved vs published vs multiple implementations)
- **Intermediate parameter evaluation** (tap into multi-step pipeline block outputs)
- **Results dataset** (project-scoped, persisted, writes to Foundry dataset)
- **Up to 4-run comparison** with diff view

Current local state:
- `evaluationRubrics` (multi-criterion) + `rubricEvaluations` (scored runs) — present
- `evaluationSuites` + `evaluationRuns` — present
- `BuiltInEvaluatorType` taxonomy (16 official deterministic evaluator types) — now present in `semantics.ts`
- Runtime still implements 0 of 16 built-in evaluator types
- No grid search / experiment concept
- No ontology simulation sandbox
- No results analyzer
- No multi-version targeting

Recommended next artifacts:
- `EvaluationExperiment` concept with grid parameters
- `EvaluationTarget` with version tracking

### [§GAP-16] GAP-03. Workflow lineage has an initial resource graph, but it is still derived and shallow

Current state:

- lineage now has both:
  - event stream (`hookEvents` + 5D fields)
  - resource graph (`workflowResources` / `workflowEdges` / `workflowExecutions`)
- current runtime graph spans 24 resource types and 24 edge types
- but the graph is still derived from local runtime records, not a full product-grade DAG of applications, workflows, functions, automations, and ontology resources

Implication:

- this is materially beyond a pure event stream
- but still shallower than Palantir's full Workflow Lineage surface

Recommended next artifact:

- `WorkflowResource`
- `WorkflowEdge`
- `WorkflowExecution`
- `WorkflowLogSearchIndex`
- application / workflow / function / automation / ontology-object typed subgraphs

### [§GAP-17] GAP-04. ~~LLM-independence not in SSoT~~ **RESOLVED** (2026-03-17)

**Status:** RESOLVED — `LLM_INDEPENDENCE` (LLMI-01..03) exists in `semantics.ts` §9 since v1.7.0.

Current state:

- `semantics.ts` exports `LLM_INDEPENDENCE` with 3 invariants:
  - LLMI-01: Ontology Before Vendor — business semantics without vendor names
  - LLMI-02: Provider-Neutral Identity — separate actorType/interfaceFamily/normalizedModel/modelProvider
  - LLMI-03: Evaluation Independence — rubrics score quality, not vendor loyalty
- `llmRuntimeHelpers.ts` implements LLMI-02 (normalizeModel, inferProvider, inferInterfaceFamily, buildNormalizedActorProfile)
- Workflow graph includes provider/model/agent resource types
- Evaluation suites are evaluatorSource-agnostic

Remaining sub-gap: no automated audit check that rejects provider-specific logic leakage. LLMI invariants are declared but not enforced by tests.

### [§GAP-18] GAP-05. Open-source boundary remains example-level, not engine-level

Verified boundary:

- official public/community examples exist, including Palantir's `aip-community-registry`
- community examples include `feedback-loop-with-aip-evals`
- but the core `AIP Evals + Workflow Lineage + autonomy graduation` engine is still a platform-native surface, not a verified official OSS package exposing internals

Implementation rule:

- consume public examples for patterns
- keep the actual decision/rubric/graduation engine local and typed inside this repo

## [§GAP-19] 4. Immediate Next Build Cuts

If the next step is implementation rather than more research, the highest-value order is:

1. Add decision-native edit/state payloads on top of the new structured outcome envelope.
2. Add experiment-summary and target-version comparison objects above `evaluationRuns`.
3. Deepen the workflow graph from derived runtime nodes into application/workflow/function/automation/object subgraphs.
4. Lift LLM-independence from runtime normalization into full SSoT/schema invariants.

## [§GAP-20] 5. Primary Sources

- https://www.palantir.com/docs/foundry/announcements/2026-03/
- https://www.palantir.com/docs/foundry/announcements/2026-02/
- https://www.palantir.com/docs/foundry/announcements/2026-01/
- https://www.palantir.com/docs/foundry/ai-fde/overview/
- https://www.palantir.com/docs/foundry/palantir-mcp/overview/
- https://www.palantir.com/docs/foundry/ontology-mcp/overview/
- https://www.palantir.com/docs/foundry/aip-evals/create-suite/
- https://www.palantir.com/docs/foundry/aip-evals/analyze-run-results/
- https://www.palantir.com/docs/foundry/aip-evals/write-run-results-to-a-dataset/
- https://www.palantir.com/docs/foundry/ontology/why-ontology/
- https://community.palantir.com/t/aip-community-registry-has-launched/2373
- https://github.com/palantir/aip-community-registry
