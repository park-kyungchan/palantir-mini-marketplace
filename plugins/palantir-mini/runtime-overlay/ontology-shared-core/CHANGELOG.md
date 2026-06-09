# shared-core CHANGELOG

Authority chain: `~/.claude/schemas/ontology/primitives/` → `~/ontology/shared-core/index.ts` → per-project `ontology/`. This file tracks SHARED_CORE_VERSION bumps + which schema primitives entered the consumer surface.

Versioning: SemVer.
- MAJOR: breaking export rename / removal.
- MINOR: additive primitive surface (new re-export).
- PATCH: doc/typo, no API change.

---

## 1.24.0 — 2026-06-10

PR-C schema structural minimalism. Drops the consumer-surface re-exports for the dead 0-consumer primitives removed in schemas-snapshot v1.82.0 / ontology axis 1.72.0, and folds the 6 edge-cluster re-exports into a single `EdgeBaseDeclaration` + `EdgeKind` discriminator surface. Every dropped re-export was verified to have zero real-logic consumers, so this is graded MINOR despite the export-surface reduction (no consumer breaks).

- Removed re-exports: `aip-mode-and-skill` (`AIPMode`/`AIPSkill`/…), `grader-domain-extension` (`AIPEvalsEvaluatorType` + 4 values), `aip-architecture-axis` (`AIPArchitectureAxis*`/`AIP_AXIS_NAMES`), `event` (`EventRid`/`EventDeclaration`/`eventRid`), `learning` (`LearningRid`/`LearningDeclaration`/`learningRid`), and the 6 edge cluster types `structural-edge`/`governance-edge`/`routing-edge`/`lineage-edge`/`refinement-edge`/`taxonomy-edge`.
- Edge surface: `edge-base-type` re-export now also exposes `EdgeKind` + `EDGE_KINDS` (the 6 cluster discriminators folded onto `EdgeBaseDeclaration.kind`). `impact-edge` is unaffected.

`SHARED_CORE_VERSION` bumped 1.23.0 → 1.24.0.

## 1.23.0 — 2026-05-13

MINOR bump. Re-exports schemas v1.65.0 RetentionManifest primitive (sprint-106 PR 4.4).

- `RetentionManifestRid` / `RetentionPolicy` / `RetentionManifestEntry` types
- `retentionManifestRid` factory / `DEFAULT_RETENTION_MANIFEST` const / `isRetentionManifestEntry` guard
- Per canonical plan v2 §4 row 4.4 + rule 26 §Substrate routing.

`SHARED_CORE_VERSION` bumped 1.22.0 → 1.23.0.

## 1.22.0 — 2026-05-13

Re-exports schemas v1.64.0 BackPropValueIndex primitive (18-key typed index for T3+ event substrate). Per canonical plan v2 §4 row 4.1b + rule 26 §valuable-data 5-axes.

New exports from `@palantirKC/claude-schemas/ontology/primitives/back-prop-value-index`:
- Types: `BackPropValueIndexRid`, `BackPropValueIndexEntry`
- Values: `backPropValueIndexRid`, `isBackPropValueIndexEntry`

`SHARED_CORE_VERSION` bumped from `"1.21.0"` to `"1.22.0"`.

Backs Convex `decisionEvents` 7→18 field extension (sprint-101 PR 4.1b). Additive only.

---

## 1.21.0 — 2026-05-13

Re-exports schemas v1.63.0 RuntimeFingerprint primitive (typed byWhom companion). Per canonical plan v2 §4 row 6.6.

New exports from `@palantirKC/claude-schemas/ontology/primitives/runtime-fingerprint`:
- Types: `RuntimeKind`, `ProcessKind`, `RuntimeFingerprint`
- Values: `RUNTIME_KINDS`, `isRuntimeKind`, `PROCESS_KINDS`, `isProcessKind`, `isRuntimeFingerprint`, `detectRuntimeFingerprint`

---

## 1.20.0 — 2026-05-13

**Additive — re-exports new `OntologyContextSeed` primitive surface + `SemanticIntentContract` additive field types (schemas v1.62.0, sprint-120 PR 5.9).**

New exports from `@palantirKC/claude-schemas/ontology/primitives/ontology-context-seed`:
- Types: `OntologyContextSeedRid`, `OntologyContextSeedStatus`, `OntologyContextSeedScopeHint`, `OntologyContextSeedDeclaration`, `OntologyContextSeedRegistry`
- Values: `ontologyContextSeedRid`, `ONTOLOGY_CONTEXT_SEED_REGISTRY`

New re-exported types from `@palantirKC/claude-schemas/ontology/primitives/semantic-intent-contract`:
- `SicFillSource`, `SicFillStep` (new additive types for 8-turn fill sequence)

`SHARED_CORE_VERSION` bumped from `"1.19.0"` to `"1.20.0"`.

Resolves ghost-primitive gap. Per canonical plan v2 §4 row 5.9. Unblocks PR 5.10 (8-turn SIC fill) + PR 5.13 (SIC grader).

---

## 1.19.0 — 2026-05-13

**Additive — re-exports new `GradingRubric` primitive surface (schemas v1.61.0, sprint-111 PR 5.1).**

New exports from `@palantirKC/claude-schemas/ontology/primitives/grading-rubric`:
- Types: `GradingRubricRid`, `RubricRegistrationStatus`, `GradingRubricDeclaration`, `GradingRubricRegistry`
- Values: `gradingRubricRid`, `GRADING_RUBRIC_REGISTRY`

Per canonical plan v2 §4 row 5.1. Enables plugin v6.21.0 bypass guard in `grade_outcome_with_rubric`.

---

## 1.18.0 — 2026-05-13

**Additive — underlying `ProjectOntologyIndex` primitive widened with `TNode`/`TEdge` generic parameters (schemas v1.60.0, sprint-080 PR 2.3).**

The `ProjectOntologyIndex<TCapability, TKnownIssue, TProjectScope>` interface now accepts two additional
optional generic parameters `TNode = unknown` and `TEdge = unknown`, plus `readonly nodes?: readonly TNode[]`
and `readonly edges?: readonly TEdge[]` optional fields. Both `ProjectOntologyIndex` and
`ProjectOntologyIndexFragment` are widened.

Consumers using the 3-parameter form (palantir-math, mathcrew, kosmos, palantirkc) compile unchanged —
all new generics default to `unknown` for backward compatibility.

Shared-core `index.ts` re-exports `ProjectOntologyIndex` + `ProjectOntologyIndexFragment` structurally;
TypeScript picks up the new optional fields automatically — no syntactic change to `index.ts` required.

Companion plugin deliverable: `lib/ontology-graph/` typed-graph store (generic-only stub; concrete typed
projection deferred to snapshot-refresh chore PR or PR 2.14 ImpactGraph integrated query layer).

---

## 1.17.0 — 2026-05-13

**Additive — re-exports 7 Phase 2 ImpactGraph edge-type primitives from schemas v1.59.0 (sprint-079 PR 2.2).**

Re-exported primitives (1 base + 6 cluster files):

- `edge-base-type` — `EdgeRid`, `EdgeBaseDeclaration`, `edgeRid`
- `structural-edge` — `StructuralEdgeRid`, `StructuralEdgeKind`, `StructuralEdgeDeclaration`
- `governance-edge` — `GovernanceEdgeRid`, `GovernanceEdgeKind`, `GovernanceEdgeDeclaration`
- `routing-edge` — `RoutingEdgeRid`, `RoutingEdgeKind`, `RoutingEdgeDeclaration`
- `lineage-edge` — `LineageEdgeRid`, `LineageEdgeKind`, `LineageEdgeDeclaration`
- `refinement-edge` — `RefinementEdgeRid`, `RefinementEdgeKind`, `RefinementEdgeDeclaration`
- `taxonomy-edge` — `TaxonomyEdgeRid`, `TaxonomyEdgeKind`, `TaxonomyEdgeDeclaration`

Total edge kinds across 6 cluster files: 6+3+4+3+4+2 = **22**. Plan: `~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md` §4 row 2.2 (sprint-079 PR 2.2).

---

## 1.16.0 — 2026-05-13

**Additive — re-exports 21 Phase 2 ImpactGraph node-type primitives from schemas v1.58.0 (sprint-078 PR 2.1).**

Re-exported primitives (12 missing + 9 wrappers):

- `user-prompt` — `UserPromptRid`, `UserPromptDeclaration`, `userPromptRid`
- `context-capsule` — `ContextCapsuleRid`, `ContextCapsuleDeclaration`, `contextCapsuleRid`
- `aip-architecture-axis` — `AIPArchitectureAxisRid`, `AIPArchitectureAxisDeclaration`, `AIPAxisName`, `AIP_AXIS_NAMES`, `aipArchitectureAxisRid`
- `project-browse-doc` — `ProjectBrowseDocRid`, `ProjectBrowseDocDeclaration`, `projectBrowseDocRid`
- `project-index-doc` — `ProjectIndexDocRid`, `ProjectIndexDocDeclaration`, `projectIndexDocRid`
- `hook` — `HookRid`, `HookDeclaration`, `HookEventName`, `HookScope`, `hookRid`
- `mcp-handler` — `McpHandlerRid`, `McpHandlerDeclaration`, `mcpHandlerRid`
- `runtime-entrypoint` — `RuntimeEntrypointRid`, `RuntimeEntrypointDeclaration`, `EntrypointRuntime`, `EntrypointKind`, `runtimeEntrypointRid`
- `source-file` — `SourceFileRid`, `SourceFileDeclaration`, `sourceFileRid`
- `test` — `TestRid`, `TestDeclaration`, `TestFramework`, `TestKind`, `testRid`
- `commit` — `CommitRid`, `CommitDeclaration`, `commitRid`
- `pull-request` — `PullRequestRid`, `PullRequestDeclaration`, `PRMergeability`, `pullRequestRid`
- `official-research-doc` — `OfficialResearchDocRid`, `OfficialResearchLibrary`, `isOfficialResearchDoc`, `researchDocumentRid`
- `skill` — `SkillRid`, `SkillDefinitionRid`, `SkillDefinitionDeclaration`, `skillDefinitionRid`
- `function` — `FunctionRid`, `FunctionKind`, `AIPLogicFunctionRid`, `aipLogicFunctionRid`
- `tool` — `ToolRid`, `ToolKind`, `MCPToolDeclarationRid`, `mcpToolDeclarationRid`
- `grader` — `GraderRid`, `GraderDeclaration`, `GraderEffortLevel`, `AIPEvalsEvaluatorType`, `graderRid`
- `generated-artifact` — `GeneratedArtifactRid`, `GeneratedArtifactDeclaration`, `generatedArtifactRid`
- `event` — `EventRid`, `EventDeclaration`, `LineageRefs`, `eventRid`
- `failure-mode` — `FailureModeRid`, `FailureModeDeclaration`, `FailureCategory`, `failureModeRid`
- `learning` — `LearningRid`, `LearningDeclaration`, `learningRid`

Plan: `~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md` §4 row 2.1 (sprint-078 PR 2.1).

---

## 1.15.0 — 2026-05-13

**Additive — re-exports ModelTrustProfile from schemas v1.57.0 (PR-14).**

Re-exported primitive:

- `model-trust-profile` — `ModelTrustProfile`, `MODEL_TRUST_PROFILE_SCHEMA_VERSION`, `DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE`, `modelTrustProfileFoundryEquivalent`. 5 bypass flags ALL false by invariant (`mayBypassOntologyContextQuery`, `mayBypassDtcForMutation`, `mayBypassValidationForCommit`, `mayBypassWorkflowTrace`, `mayBypassProjectScopeBoundary`); only `mayReduceClarificationQuestions` is operator-tunable.

Consumed by `palantir-mini bridge/handlers/pm-lead-brief.ts` (best-effort read from `<project>/.palantir-mini/model-trust-profile.json`).

Plan: `~/.claude/plans/foamy-giggling-kettle.md` lines 905-947 (PR-14).

---

## 1.14.0 — 2026-05-13

**Additive — re-exports DocumentCorpus from schemas v1.56.0 (PR-12).**

Re-exported primitive:

- `document-corpus` — `DocumentCorpus`, `DocumentCorpusEntry`, `DocumentRetrievalMode` (`full-document | chunk-mode`), `DOCUMENT_CORPUS_SCHEMA_VERSION`, `isDocumentCorpus`, `isDocumentCorpusSchemaVersionV1`, `documentCorpusFoundryEquivalent`.

Consumed by `palantir-mini lib/ontology-context/document-context.ts` when `ontology_context_query` opts in via `includeDocumentContext:true`. Corpus file lives at `<project>/.palantir-mini/document-corpus.json`.

Plan: `~/.claude/plans/foamy-giggling-kettle.md` lines 832-863 (PR-12).

---

## 1.12.0 — 2026-05-10

**Additive — exposes Prompt-to-DTC canonical contract primitives.**

Re-exported primitives (from schemas v1.51.0):

- `approval-ref`
- `ontology-engineering-ref`
- `prompt-envelope`
- `semantic-intent-contract`
- `digital-twin-change-contract`
- `prompt-contract-record`

These give palantir-mini and project ontology consumers a shared schema-level
surface for prompt identity, user approval provenance, semantic contracts,
Digital Twin change boundaries, and typed ontology engineering refs. Runtime
gate behavior remains unchanged.

---

## 1.9.0 — 2026-05-08

**Additive — closes ForwardProp authority chain for the new `DerivedPropertyDeclaration` primitive.**

Sprint sprint-059 / W2.1.

Re-exported primitive (from schemas v1.47.0):

- `derived-property` — `DerivedPropertyDeclaration` + `DerivedPropertyRid` + `derivedPropertyRid()` + `validateDerivedProperty()` + `DerivedPropertyRegistryV2` + `DERIVED_PROPERTY_REGISTRY_V2` + `CacheStrategyConfig` (`CacheStrategySimple | CacheStrategyTtl`) + `CacheStrategyKind`.

Foundry-equivalent typed declarative compute-binding (DATA layer); points to an `AIPLogicFunctionRid` OR a stable-name `SourceExecutorFunction`. Coexists with the LOGIC closure variant at `schemas/ontology/functions/derived-property.ts` (prim-logic-04) — different D/L/A domain.

Closes architecture review PR #329 §5.G.2 (R5-F2 Major).

Cross-refs:
- schemas CHANGELOG v1.47.0 entry.
- `source-executor.ts` (computeFunctionRid resolution at read-time).
- `aip-logic-function.ts` (AIPLogicFunctionRid binding target).

---

## 1.8.0 — 2026-05-06

**Additive — closes ForwardProp authority chain for 10 W2.A AIP/Foundry/MCP operational primitives.**

Sprint sprint-032 / W2.A SSoT-2.

Re-exported primitives (from schemas v1.40.0):

- `mcp-tool-declaration` — `MCPToolDeclaration`, `MCPArchitectureKind`,
  `MCPPermissionsMatrix`, `MCPToolDeclarationRid`,
  `MCPToolDeclarationRegistry`, `MCP_TOOL_DECLARATION_REGISTRY` + guards.
- `ontology-simulation` — `OntologySimulation`, `OntologyEdit`,
  `OntologySimulationDisposalPolicy`, `OntologySimulationRid`,
  `OntologySimulationRegistry`, `ONTOLOGY_SIMULATION_REGISTRY` + guards.
- `global-branching-proposal` — `GlobalBranchingProposal`,
  `GlobalBranchingApprovalPolicy`,
  `GlobalBranchingProposalLifecycleState`,
  `GlobalBranchingResourceCheckResult`,
  `GlobalBranchingProposalRegistry`,
  `GLOBAL_BRANCHING_PROPOSAL_REGISTRY` + guards.
- `object-security-policy` — `ObjectSecurityPolicy`,
  `ObjectSecurityPolicyScope`, `ObjectSecurityPolicyRid`,
  `ObjectSecurityPolicyRegistry`, `OBJECT_SECURITY_POLICY_REGISTRY` +
  guards.
- `property-security-policy` — `PropertySecurityPolicy`,
  `PropertySecurityVisibility`, `PropertySecurityPolicyRid`,
  `PropertySecurityPolicyRegistry`, `PROPERTY_SECURITY_POLICY_REGISTRY` +
  guards.
- `source-executor` — `SourceExecutor` 5-kind discriminator union (function
  / action / automation / aip-logic / aip-agent), per-kind interfaces,
  `SourceExecutorRegistry`, `SOURCE_EXECUTOR_REGISTRY`, per-kind type
  guards + structural guard.
- `workflow-lineage-graph` — `WorkflowLineageGraph`, `WorkflowLineageNode`,
  `WorkflowLineageEdge`, `WorkflowLineageNodeKind`,
  `WorkflowLineageEdgeKind`, `WorkflowLineageGraphRid`,
  `WorkflowLineageGraphRegistry`, `WORKFLOW_LINEAGE_GRAPH_REGISTRY` +
  guards.
- `aip-mode-and-skill` — `AIPMode` 8-canonical-mode union, `AIP_MODES`
  const, `AIPSkill`, `AIPSkillCategory`, `AIPSkillId`, `AIPSkillRegistry`,
  `AIP_SKILL_REGISTRY` + guards.
- `grader-domain-extension` (named explicit exports) —
  `AIPEvalsEvaluatorType`, `AIP_EVALS_EVALUATOR_TYPES`,
  `AIP_EVALS_EVALUATOR_TYPE_TO_RUBRIC_DOMAIN`, `rubricDomainForEvaluator`,
  `isAIPEvalsEvaluatorType`. Named exports avoid ambient ambiguity with
  the existing `RubricDomain` symbol re-exported via the v1.14
  grading-criterion surface.
- `retry-policy` — `RetryPolicy` 3-kind discriminator union, per-kind
  interfaces, `RETRY_POLICY_KINDS` const, `retryDelayMs` helper, per-kind
  + structural guards.

Schema pin bumped from `1.39.0` to `1.40.0`.

Consumer impact: kosmos / palantir-math / mathcrew currently pin
`>=1.32.0 <2.0.0` (plugin compatibleSchemaVersions); v1.40.0 is additive
and within the existing range. No breaking change. No re-export rename or
removal. `grading-criterion.ts` (prim-data-08) is NOT modified — the AIP
Evals 19-evaluator taxonomy is exposed via the separate
`grader-domain-extension.ts` primitive and maps to the existing 6
canonical `RubricDomain` values.

Cross-refs:
- Rule 08 §Schema as semver-tracked interface.
- Rule 16 v4.0.0 §GradingRubric (RubricDomain stable).
- Rule 26 v1.0.0 §Axis B + §Axis D (verifiable + shareable substrate).
- `~/.claude/schemas/CHANGELOG.md` v1.40.0 entry.
- `~/.palantir-mini/harness/sprints/sprint-032/contract.json`.

---

## 1.7.1 — 2026-05-06

**Additive — closes ForwardProp authority chain for ResearchSourceManifest (W1.C SSoT-9).**

Sprint sprint-030 / W1.C SSoT-9.

Re-exported primitives:

- v1.39 ResearchSourceManifest (rule 02 v3.1.0 §Research retrieval +
  rule 26 v1.0.0 §Axis A3 evidence-cited):
  - `ResearchSourceManifest`, `ResearchSource`, `RefreshClass`,
    `RESEARCH_REFRESH_CLASS_DAYS`, `ResearchSourceManifestRid`,
    `ResearchSourceManifestRegistry`, `RESEARCH_SOURCE_MANIFEST_REGISTRY`
  - Type guards: `isResearchSource`, `isResearchSourceManifest`, `isRefreshClass`
  - Branded RID factory: `researchSourceManifestRid`

Schema pin bumped from `1.37.0` to `1.39.0` (skip 1.38 reserved for SSoT-2 W2.A).

Consumer impact: kosmos / palantir-math / mathcrew currently pin `>=1.32.0 <2.0.0`
(plugin compatibleSchemaVersions); v1.39.0 is additive and within the existing
range. No breaking change. No re-export rename or removal.

---

## 1.7.0 — 2026-05-06

**Additive — closes ForwardProp authority chain for rule 26 (valuable-data) + rule 01 v2.1.0 (propagation audit).**

Sprint S-substrate-revival Phase 1 W1.7 (`~/.claude/plans/async-jingling-garden.md`).

Re-exported primitives:

- v1.34 propagation-audit (Rule 01 v2.1.0 §ForwardProp/BackwardProp Audit):
  - `PropagationAuditPayload` from `propagation-audit`
  - `PropagationReplayPayload` from `propagation-replay`
  - `PropagationHealthPayload` from `propagation-health`
- v1.35 rule 26 valuable-data substrate (Rule 26 v1.0.0):
  - `ValueGrade` from `value-grade`
  - `AgenticMemoryLayer` from `agentic-memory-layer`
  - `LineageRefs` from `lineage-refs`
  - `OutcomePairing` from `outcome-pairing`
  - `RefinementTarget` from `refinement-target`

**Why now**: Empirical audit (4 opus researchers, 2026-05-06) confirmed `palantir-math` + `mathcrew` could not import these primitives via the W5 authority chain because they were not re-exported here. Result: per-project events.jsonl conformance was zero (mathcrew valueGrade=4.1%, palantir-math=0.3%). This re-export closes the chain so per-project ontology code can `import { ValueGrade, AgenticMemoryLayer, OutcomePairing, RefinementTarget, LineageRefs, PropagationAuditPayload } from "~/ontology/shared-core"` without rule-08 authority-chain violation.

**Compat**: Additive only. Existing v1.0-v1.18 + v1.14 harness + v1.15 pedagogy re-exports retained verbatim.

**Cross-refs**:
- Rule 26 v1.0.0 §Definition + §Auto-grade + §Substrate routing.
- Rule 01 v2.1.0 §ForwardProp/BackwardProp Audit.
- Rule 08 §Schema as semver-tracked interface.
- `~/.claude/schemas/CHANGELOG.md` v1.34.0 + v1.35.0 entries.
- `~/.claude/plans/async-jingling-garden.md` Phase 1 W1.7.

---

## Pre-1.7.0 history

Prior versions (1.0-1.6) were tracked in:
- `index.ts` SHARED_CORE_VERSION constant only (no separate CHANGELOG).
- Git history: `git log --oneline ~/ontology/shared-core/index.ts`.

This CHANGELOG.md was introduced in 1.7.0; future entries will be authored here per release.
