# @palantirKC/claude-schemas — CHANGELOG

Root-level aggregator. Each axis has its own CHANGELOG:
- `ontology/CHANGELOG.md` (canonical for ontology axis, currently at v1.12.0)
- `interaction/` (no CHANGELOG; see types.ts version constants)
- `meta/` (no CHANGELOG; see types.ts)
- `rendering/` (no CHANGELOG; see types.ts)

---

## v1.73.0 — 2026-06-09 (self-Ontology Wave 4: register ActionType verbs + Function bound-logic)

Additive MINOR (rule 08 — additive ActionType + Function instances, no edits to existing primitives). self-Ontology Wave 4 —
register 21 ActionType verbs + 76 Function bound-logic (incl 34 hidden sub-mode handlers); ACTION_TYPE_REGISTRY 1->~22;
Functions registered. Adds `ontology/self/action-types.ts` + `ontology/self/functions.ts`, re-exported from
`ontology/self/index.ts` (side-effect self-registers into `ACTION_TYPE_REGISTRY` + the Function registry). Paired drift
tests under plugin `tests/ontology/self/`. No edits to existing primitives.

## v1.72.1 — 2026-06-09

fix: PluginManifest self-Ontology seed no longer pins volatile version (CLAUDE.md section 6); keeps structural drift guards; restores 8-fail baseline.

## v1.72.0 — 2026-06-09 (self-Ontology Wave 3: wire self/links.ts LinkType graph)

Additive MINOR (rule 08 — additive LinkType instances, no edits to existing primitives). self-Ontology Wave 3 —
wire `self/links.ts` LinkType graph (33 edges; self LinkType 0->33; the #1 DoD graph gap closed). Registers all
33 control-plane relationships as Palantir `LinkType` instances under `ontology/self/links.ts`, re-exported from
`ontology/self/index.ts` (side-effect self-registers into `LINK_TYPE_REGISTRY`). Every endpoint is a `self/`
ObjectType RID (imported, never re-derived); all edges are plain LinkTypes except
`ManagedSettingsFragmentGrantsMcpTool` (object-backed, carries an allow/deny `mode` property). Paired plugin
`tests/ontology/self/links-registration.test.ts` drift test (8 pass / 0 fail). Completes the self-modeling set
(Waves 1-2 = ObjectTypes; Wave 3 = the relationships among them). Paired plugin release 6.112.0.

## v1.71.0 — 2026-06-09 (self-Ontology Wave 2: register remaining ~23 ObjectTypes)

Additive MINOR (rule 08 — additive instances, no edits to existing primitives). Registers the remaining ~23
control-plane surfaces as Ontology ObjectTypes under `ontology/self/`: `CapabilityContract`, `CapabilityToken`,
`ContextCapsule`, `DigitalTwinChangeContract`, `EditFunction`, `EvalSuite`, `FdeOntologyBuildSession`,
`GradingRubric`, `ImpactEdge`, `Learning`, `ManagedSettingsFragment`, `Monitor`, `PluginManifest`,
`ProjectOntologyIndex`, `PromptEnvelope`, `Rule`, `RuntimeAdapter`, `RuntimeDecision`, `ScenarioSandbox`,
`SubmissionCriterion`, `UniversalOntologyEntry`, `WorkflowTrace`. `OBJECT_TYPE_REGISTRY` grows 7 → ~30. Each
ObjectType is paired with a registration drift test (plugin `tests/ontology/self/*-registration.test.ts`)
asserting the catalogued instance set stays in sync. Self-Ontology Wave 2 (completes the core self-modeling set
begun in Wave 1). Paired plugin release 6.111.0.

## v1.70.0 — 2026-06-09 (self-Ontology Wave 1: register 5 core surface ObjectTypes)

Additive MINOR (rule 08 — additive instances, no edits to existing primitives). Registers the plugin's own
control-plane surfaces as Ontology ObjectTypes under `ontology/self/`: `Skill` (61 instances), `Agent` (15),
`Hook` (64), `McpHandler` (63), `EventEnvelope` (83). `OBJECT_TYPE_REGISTRY` grows 2 → 7. Each ObjectType is
paired with a registration drift test (plugin `tests/ontology/self/*-registration.test.ts`) asserting the
catalogued instance set stays in sync. Self-Ontology Wave 1 of the palantir-mini self-modeling effort.
Catalog: `_workspace/palantir-mini-self-ontology-engineering-2026-06-05/.../context/06`. Paired plugin
release 6.110.0.

## v1.69.0 — 2026-06-08 (harness redesign W3b-2a: remove harness-species-cost-profile primitive)

Removal (breaking, but no surviving code consumer — only doc-comment cross-refs in sprint-contract /
dispatch-contract / harness-species-enum remain). Drops `ontology/primitives/harness-species-cost-profile.ts`
(`HarnessSpeciesVendor` / `HarnessSpeciesCostProfileDeclaration` / `HARNESS_SPECIES_COST_PROFILES`) — vendor
cost/model profiling is a runtime-adapter concern, not the neutral SSoT. Pruned from the primitives barrel,
foundry-equivalent map, package.json exports, and MANIFEST.json. Sole code consumer (`pm_intent_router`
dispatchSpecies) removed in the same plugin release (6.94.0).

## v1.68.0 — 2026-06-08 (harness redesign W3b-1: remove claude-code-version primitive)

Removal (breaking, but no surviving consumer). Drops `ontology/primitives/claude-code-version.ts`
(`ClaudeCodeVersionRegistry` / `compareClaudeCodeVersions` / `ClaudeCodeVersionDeclaration`) — a
Claude-Code-specific version-pin primitive that does not belong in the runtime-neutral SSoT (version
pinning is a Claude-adapter concern). Pruned from the primitives barrel, foundry-equivalent map,
package.json exports, MANIFEST.json, and .manifest.json. Sole code consumer (the unregistered
`cc-allowlist-drift-check` hook) removed in the same plugin release (6.93.0).

## v1.67.0 — 2026-05-14 (sprint-114 PR 5.4a: AIPEvaluation Convex shapes)

MINOR. Adds Convex-aligned row shapes + type guards to `ontology/primitives/aip-evaluation.ts`.

- NEW `AIPEvaluationSuiteConvexRow` interface — maps 1:1 to `evalSuites` Convex table.
- NEW `AIPEvaluationRunConvexRow` interface — maps 1:1 to `evalRuns` Convex table.
- NEW `AIPEvaluationRunVerdict` type — `"pass" | "revise" | "reject"` union.
- NEW `isAIPEvaluationSuiteConvexRow` + `isAIPEvaluationRunConvexRow` type guards.
- Companion: plugin v6.64.0 `convex/schema.ts` gains `evalSuites` + `evalRuns` tables.
- Companion: shared-core v1.24.0 re-exports the 5 new symbols.

## v1.66.0 — 2026-05-14 (sprint-105 PR 4.3: events_summarized)

MINOR. Add `events_summarized` to EVENT_TYPE_NAMES + registry (primaryDomain: data). Plugin EventsSummarizedEnvelope + union + snapshot + guard. Per canonical plan v2 §4 row 4.3.

## v1.65.0 — 2026-05-13 (sprint-106 PR 4.4: RetentionManifest primitive)

MINOR bump.

- NEW `ontology/primitives/retention-manifest.ts`: per-tier T0-T4 event retention policy primitive.
  - `RetentionManifestRid` branded RID + factory.
  - `RetentionPolicy` interface (tier + liveDays + archiveDays + purgeAfterDays + cloudMirrorEnabled + reason).
  - `RetentionManifestEntry` interface (manifestId + tierPolicies + createdAt + provenance).
  - `DEFAULT_RETENTION_MANIFEST` const: 5-tier default policy aligned with rule 26 §Substrate routing (T0 7d live/30d purge → T4 365d live/2555d archive/Cloud-mirrored).
  - Foundry equivalence: `claude-extension` (rule 26 substrate routing has no direct Foundry counterpart).
- `ontology/primitives/index.ts`: barrel re-exports + foundry-equiv registry entry.
- `package.json` exports adds `./ontology/primitives/retention-manifest` deep path.

Per canonical plan v2 §4 row 4.4 + rule 26 §Substrate routing.

## v1.64.0 — 2026-05-13 (sprint-101 PR 4.1b: BackPropValueIndex primitive)

**Additive MINOR — new BackPropValueIndex primitive (18-key typed index for T3+ event substrate).**

`~/.claude/schemas/ontology/primitives/back-prop-value-index.ts` (NEW):
- `BackPropValueIndexRid`: branded string type + `backPropValueIndexRid` factory.
- `BackPropValueIndexEntry` interface: 18 keys covering all rule 26 §5-Axes 14-Criteria axes:
  - A (Contractual): `eventId`, `when`
  - B (Verifiable): `evalSuiteId`, `evalRunId`
  - C (Refining): `refinementTarget`
  - D (Shareable): `runtime` (`"claude" | "codex" | "gemini" | "cursor" | "unknown"`)
  - E (Memory-mapped): `memoryLayers`
  - Linking fields: `promptId`, `promptHash`, `sessionId`, `semanticIntentContractRef`, `digitalTwinChangeContractRef`, `sprintContractRef`, `correlationId`, `agentId`, `toolName`, `commitSha`, `branchName`, `pullRequestNumber`, `affectedRid`, `valueGrade`
- `isBackPropValueIndexEntry(value)` type guard (requires `eventId` + `when`).
- `backPropValueIndexFoundryEquivalent`: `claude-extension` kind (no Foundry counterpart).

`index.ts`: added `export * from "./back-prop-value-index"` + aggregator import + registry entry `"back-prop-value-index"`.

`package.json`: added `"./ontology/primitives/back-prop-value-index"` sub-path export.

**Backs Convex `decisionEvents` table 7→18 fields (sprint-101 PR 4.1b). Additive only — no existing primitive changes.**

Per canonical plan v2 §4 row 4.1b + rule 26 §valuable-data 5-axes.

---

## v1.63.0 — 2026-05-13 (sprint-133 PR 6.6: RuntimeFingerprint primitive)

**Additive MINOR — new RuntimeFingerprint primitive (structured byWhom.runtimeFingerprint companion).**

`~/.claude/schemas/ontology/primitives/runtime-fingerprint.ts` (NEW):
- `RuntimeKind`: `"claude-code" | "codex-cli" | "gemini-cli" | "cursor" | "unknown"` union + `RUNTIME_KINDS` const + `isRuntimeKind` guard.
- `HarnessSpeciesId`: 7-species local union mirroring `harness-species-enum.ts` (no circular dep) + `HARNESS_SPECIES_IDS` const + `isHarnessSpeciesId` guard.
- `ProcessKind`: `"lead" | "subagent" | "hook" | "script" | "mcp-server" | "unknown"` union + `PROCESS_KINDS` const + `isProcessKind` guard.
- `RuntimeFingerprint` interface: `runtime` + `runtimeVersion?` + `harnessSpecies` + `platform?` + `processKind` + `sessionId?` + `subagentId?` + `osVersion?`.
- `isRuntimeFingerprint(value)` type guard.
- `detectRuntimeFingerprint(env?)` env-based auto-detect factory: reads `CLAUDE_CODE_SESSION_ID` / `CODEX_SESSION_ID` / `GEMINI_SESSION_ID` / `CURSOR_SESSION_ID` + WSL heuristic + `PALANTIR_MINI_SUBAGENT_ID` / `PALANTIR_MINI_HOOK_MODE` / `PALANTIR_MINI_SCRIPT_MODE` / `PALANTIR_MINI_MCP_SERVER`. Falls back to `"unknown"` for unrecognized environments. Never throws.
- `runtimeFingerprintFoundryEquivalent`: `claude-extension` kind (no Foundry counterpart).

`index.ts`: added `export * from "./runtime-fingerprint"` + aggregator import + registry entry.

**Additive only — no existing byWhom field changes. Backward-compat preserved.**

Per canonical plan v2 §4 row 6.6 + rule 27 §Cross-runtime substrate.

---

## v1.62.1 — 2026-05-13 (chore: PR 5.9 typecheck hotfix)

PATCH bump.

Hotfix for 5 type errors surfaced after PR 5.9 (sprint-120) landed:

- `ontology-context-seed.ts`: FoundryEquivalence used invalid kind `"novel"`. Replaced with valid kind `"claude-extension"` + `rationale` field (per category-foundry-equivalent.ts enum).
- `package.json`: added `./ontology/primitives/ontology-context-seed` to `exports` so `~/ontology/shared-core/index.ts` deep imports resolve.
- `tests/primitives/ontology-context-seed.test.ts`: replaced raw string `"test-rid"` toBe expectation with `ontologyContextSeedRid("test-rid")` (branded RID).
- `tests/primitives/semantic-intent-contract-v1.62.test.ts`: same branded-RID fix for `seedRid` + `gradeRubricRid` expectations.

No schema body changes. PATCH bump preserves v1.62.x semver lane.

## v1.62.0 — 2026-05-13 (sprint-120 PR 5.9)

**Additive MINOR — OntologyContextSeed promoted to typed primitive; SemanticIntentContract strengthened (additive fields).**

`~/.claude/schemas/ontology/primitives/ontology-context-seed.ts` (NEW):
- `OntologyContextSeedRid` branded type + `ontologyContextSeedRid()` factory.
- `OntologyContextSeedStatus`: `"drafted" | "approved" | "rejected" | "expired" | "superseded"`.
- `OntologyContextSeedScopeHint`: `{ path, weight }` typed scope inference hint.
- `OntologyContextSeedDeclaration`: full typed shape with `seedId`, `status`, `generatedAt`, `expiresAt?`, `sourcePromptId?`, `sourceSessionId?`, `sourceRids`, `scopeHints`, `supportingResearchRefs`, `confidenceScore?`, `missingEdges?`, `approvalRef?`, `provenance?`.
- `OntologyContextSeedRegistry`: `.register()`, `.get()`, `.list()`, `.byStatus()`.
- `ONTOLOGY_CONTEXT_SEED_REGISTRY` singleton.
- `ontologyContextSeedFoundryEquivalent` metadata (kind: novel).
- Resolves ghost-primitive gap where `OntologyContextSeed` was permanently stuck at `"unapproved-context-seed"` with no canonical typed shape (ontology-context-approval.ts:5).

`~/.claude/schemas/ontology/primitives/semantic-intent-contract.ts` (STRENGTHENED, additive only):
- Version comment bumped to v1.62.0.
- New import: `OntologyContextSeedRid` from `./ontology-context-seed`.
- New import: `GradingRubricRid` from `./grading-rubric`.
- New types: `SicFillSource` (`"user" | "agent" | "system"`) + `SicFillStep` (`{ step, question?, answer?, filledAt, source }`).
- New optional fields on `SemanticIntentContract`:
  - `seedRid?: OntologyContextSeedRid` — links SIC to its proto-seed.
  - `fillSequence?: readonly SicFillStep[]` — 8-turn fill steps (PR 5.10 target).
  - `verdict?: "draft" | "filled" | "approved" | "rejected"` — fill workflow outcome.
  - `gradeRubricRid?: GradingRubricRid` — links to canonical rubric (PR 5.13 target).
- No existing fields removed or renamed; `isSemanticIntentContract()` guard unchanged.

`~/.claude/schemas/ontology/primitives/index.ts`:
- Added `export * from "./ontology-context-seed"` under v1.62 block.
- Added `ontologyContextSeedFoundryEquivalent` to `FOUNDRY_EQUIVALENTS_REGISTRY`.
- Barrel comment bumped to v1.62.0.

Resolves ghost-primitive gap. Per canonical plan v2 §4 row 5.9. Unblocks PR 5.10 (8-turn SIC fill) + PR 5.13 (SIC grader).

---

## v1.61.0 — 2026-05-13 (sprint-111 PR 5.1)

**Additive MINOR — new GradingRubric primitive (formalizes Set<GradingCriterion> as RID-identifiable + immutable once registered).**

`~/.claude/schemas/ontology/primitives/grading-rubric.ts` (NEW):
- `GradingRubricRid` branded type + `gradingRubricRid()` factory.
- `RubricRegistrationStatus`: `"draft" | "canonical" | "deprecated"`.
- `GradingRubricDeclaration`: ordered `criterionRids`, `aggregator: PassFailLogic`, `appliesToDomain`, `canonicalRubricRid` self-pointer, `status`, `registeredAt`, `provenance`, `schemaVersionAtRegistration`.
- `GradingRubricRegistry`: `.register()` with immutability guard (canonical rubrics reject mutation), `.get()`, `.isCanonical()`, `.list()`.
- `GRADING_RUBRIC_REGISTRY` singleton.
- `gradingRubricFoundryEquivalent` metadata (kind: over-specified).

`~/.claude/schemas/ontology/primitives/index.ts`:
- Added `export * from "./grading-rubric"` under v1.61 harness block.

Per canonical plan v2 §4 row 5.1. Plugin v6.21.0 adds bypass guard in `grade_outcome_with_rubric`.

---

## v1.60.0 — 2026-05-13 (sprint-080 PR 2.3)

**Additive MINOR — extended `ProjectOntologyIndex` with TNode + TEdge generic parameters and optional `nodes?` + `edges?` fields.**

`~/.claude/schemas/ontology/primitives/project-ontology-index.ts`:
- Added two new generic parameters `TNode = unknown` and `TEdge = unknown` (defaulted for backward compat).
  Consumers using the 3-parameter form `ProjectOntologyIndex<A, B, C>` compile unchanged.
- Added `readonly nodes?: readonly TNode[]` to `ProjectOntologyIndex` and `ProjectOntologyIndexFragment`.
- Added `readonly edges?: readonly TEdge[]` to both interfaces.
- Fragment loaders continue to parse cleanly — all new fields are `?` optional.

Phase 2 PR 2.3 (sprint-080). Authority: `~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md` §8 Stage 4.
Companion plugin deliverable: `lib/ontology-graph/` typed-graph store (generic-only; concrete typed projection deferred to snapshot-refresh chore PR or PR 2.14).

---

## v1.59.0 — 2026-05-13 (sprint-079 PR 2.2)

**Additive MINOR — 7 Phase 2 ImpactGraph edge-type primitives (1 base + 6 cluster files, 22 total edge kinds).**

Authoring rationale: PR 2.2 declares the 22 typed graph-edge kinds + 1 edge base type primitive in
`~/.claude/schemas/ontology/primitives/` so PR 2.3 (`lib/ontology-graph/store.ts`) can persist
edges between the 32 PR 2.1 nodes against canonical names. Option B chosen (6 cluster files + 1 base
= 7 files). No existing primitives were modified. `impact-edge.ts` unchanged (PR 2.15 deprecation).

**7 new edge-type primitives:**

- `edge-base-type.ts` — `EdgeRid` branded type + `edgeRid` factory + `EdgeBaseDeclaration` interface
  (rid, fromRid, toRid, confidence, evidence?, registeredAt, verifiedAt?). Base shared by all 6 clusters.
- `structural-edge.ts` — `StructuralEdgeRid` + `StructuralEdgeKind` (6 kinds: describes | implements |
  imports | reads | writes | emits) + `StructuralEdgeDeclaration` + `isStructuralEdge` guard.
- `governance-edge.ts` — `GovernanceEdgeRid` + `GovernanceEdgeKind` (3 kinds: validates | gates |
  requiresApprovalFrom) + `GovernanceEdgeDeclaration` + `isGovernanceEdge` guard.
- `routing-edge.ts` — `RoutingEdgeRid` + `RoutingEdgeKind` (4 kinds: routesTo | usesTool | delegatesTo |
  spawnsAgent) + `RoutingEdgeDeclaration` + `isRoutingEdge` guard.
- `lineage-edge.ts` — `LineageEdgeRid` + `LineageEdgeKind` (3 kinds: correlatesWith | evaluates |
  failedBecause) + `LineageEdgeDeclaration` + `isLineageEdge` guard.
- `refinement-edge.ts` — `RefinementEdgeRid` + `RefinementEdgeKind` (4 kinds: mitigates | refines |
  supersedes | conflictsWith) + `RefinementEdgeDeclaration` + `isRefinementEdge` guard.
- `taxonomy-edge.ts` — `TaxonomyEdgeRid` + `TaxonomyEdgeKind` (2 kinds: belongsToAipAxis |
  safeToPruneAfterPromotion) + `TaxonomyEdgeDeclaration` + `isTaxonomyEdge` guard.

Total edge kinds: 6 + 3 + 4 + 3 + 4 + 2 = **22**. Plan: `~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md` §4 row 2.2 (sprint-079 PR 2.2).

---

## v1.58.0 — 2026-05-13 (sprint-078 PR 2.1)

**Additive MINOR — 21 Phase 2 ImpactGraph node-type primitives (12 missing + 9 wrappers).**

Authoring rationale: PR 2.1 ensures `~/.claude/schemas/ontology/primitives/` covers all 32
Phase 2 Node-type primitives so PR 2.2 (edges) + PR 2.3 (`ProjectOntologyIndex` store) can
declare typed-graph nodes against canonical names. No existing primitives were modified.

**12 new MISSING primitives (each exports branded RID + Declaration interface + isXxx guard):**

- `user-prompt.ts` — `UserPromptRid` / `UserPromptDeclaration`: atomic raw user-prompt identity
  node (promptId, promptHash, sessionId, runtime, capturedAt, projectRoot); complements PromptEnvelope.
- `context-capsule.ts` — `ContextCapsuleRid` / `ContextCapsuleDeclaration`: frozen retrieved-context
  snapshot (capsuleId, capturedAt, sourceRid, contentHash, byteSize, expiresAt?).
- `aip-architecture-axis.ts` — `AIPArchitectureAxisRid` / `AIPArchitectureAxisDeclaration`: one of 7
  AIP axes (Ontology|Logic|Foundry-Data|Pipelines|Modules|Workshop|Evals) with palantirAnchor +
  ourCounterpart. Exports `AIPAxisName` literal-union + `AIP_AXIS_NAMES` constant.
- `project-browse-doc.ts` — `ProjectBrowseDocRid` / `ProjectBrowseDocDeclaration`: typed pointer to
  a project's BROWSE.md (projectRoot, filePath, lastIndexed, byteSize).
- `project-index-doc.ts` — `ProjectIndexDocRid` / `ProjectIndexDocDeclaration`: mirrors
  ProjectBrowseDoc shape targeting INDEX.md.
- `hook.ts` — `HookRid` / `HookDeclaration`: typed mirror of hooks.json entry (hookId, slug,
  eventName, scope, filePath, ruleCitations?). Exports `HookEventName` + `HookScope`.
- `mcp-handler.ts` — `McpHandlerRid` / `McpHandlerDeclaration`: handler IMPLEMENTATION node
  (handlerId, slug, mcpServerName, filePath, exportedFnName, schemaInputRef?, schemaOutputRef?).
- `runtime-entrypoint.ts` — `RuntimeEntrypointRid` / `RuntimeEntrypointDeclaration`: cross-runtime
  mount point (entrypointId, runtime: claude|codex|gemini|cursor, filePath, kind: plugin|hook|mcp-server|skill).
- `source-file.ts` — `SourceFileRid` / `SourceFileDeclaration`: source file node (fileId, projectRoot,
  relativePath, language, byteSize, lastModified). Imports edges declared in PR 2.2.
- `test.ts` — `TestRid` / `TestDeclaration`: test file node (testId, filePath,
  framework: bun|vitest|playwright, kind: unit|integration|e2e|eval).
- `commit.ts` — `CommitRid` / `CommitDeclaration`: git-log row node (commitSha primary key, repoRoot,
  branchName, authorEmail, committedAt, parentShas, messageFirstLine).
- `pull-request.ts` — `PullRequestRid` / `PullRequestDeclaration`: gh pr view row node (prNumber,
  repoSlug, branchName, isDraft, mergeable: MERGEABLE|CONFLICTING|UNKNOWN, mergedAt?, mergedSha?, title).

**9 new WRAPPER primitives (alias-wrapper b1 per spec.md §4; no existing primitives extended):**

- `official-research-doc.ts` — `OfficialResearchDocRid = ResearchDocumentRid` alias + `OfficialResearchLibrary`
  union + `isOfficialResearchDoc()` helper asserting library ∈ palantir-foundry|palantir-developers.
- `skill.ts` — `SkillRid = SkillDefinitionRid` alias; re-exports SkillDefinitionDeclaration + SkillScope.
- `function.ts` — `FunctionRid = AIPLogicFunctionRid` alias + `FunctionKind` literal-union
  (aip-logic|edit-function|convex-mutation|convex-query) reserved for later indexers.
- `tool.ts` — `ToolRid = MCPToolDeclarationRid` alias + `ToolKind` literal-union
  (mcp|skill|claude-native|shell) reserved for later indexers.
- `grader.ts` — new `GraderRid` brand + `GraderDeclaration { graderId, criterionRef: GradingCriterionRid,
  tier: GraderEffortLevel, domain: AIPEvalsEvaluatorType }` linking the three existing grader primitives.
- `generated-artifact.ts` — new `GeneratedArtifactRid` brand + `GeneratedArtifactDeclaration
  { artifactId, filePath, contractRef: CodegenHeaderContractRid, generatedAt, sourceHash }`.
- `event.ts` — new `EventRid` brand + `EventDeclaration { eventId, type, when, lineageRefs?: LineageRefs }`
  as typed graph-node mirror of one events.jsonl row.
- `failure-mode.ts` — new `FailureModeRid` brand + `FailureModeDeclaration
  { failureId, category: FailureCategory, originatingEventRef?: EventRid }`.
- `learning.ts` — new `LearningRid` brand + `LearningDeclaration
  { learningId, sourceLoopRef?, summary, capturedAt }` as durable lesson node.

**Package sub-path exports:** 21 new entries added to `package.json` exports map (one per file).

Additive MINOR; no edits to v1.0–v1.57 primitives.

## v1.57.0 — 2026-05-13 (foamy-giggling-kettle PR-14)

**Additive MINOR — ModelTrustProfile primitive.**

- Added: `ontology/primitives/model-trust-profile.ts` — declares per-model trust posture with 5 bypass flags ALL false by invariant (`mayBypassOntologyContextQuery`, `mayBypassDtcForMutation`, `mayBypassValidationForCommit`, `mayBypassWorkflowTrace`, `mayBypassProjectScopeBoundary`). The type system enforces the invariant via literal-false types — any attempt to construct a profile with a true bypass flag is a TypeScript error. Only `mayReduceClarificationQuestions` is operator-tunable. Exports `MODEL_TRUST_PROFILE_SCHEMA_VERSION`, `ModelTrustProfile` interface, `DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE`, and `modelTrustProfileFoundryEquivalent`.
- Added: sub-path export `"./ontology/primitives/model-trust-profile"` in `package.json` exports map.
- Added: barrel re-export in `ontology/primitives/index.ts` (v1.57 section) + foundry-equivalents registry entry.
- Companion: `palantir-mini bridge/handlers/pm-lead-brief.ts` consumes `<project>/.palantir-mini/model-trust-profile.json` (best-effort read; default template applies if absent) and surfaces `modelTrustProfile` in cold-start output.
- Additive MINOR; no edits to v1.0–v1.56 primitives.

## v1.56.0 — 2026-05-13 (foamy-giggling-kettle PR-12)

**Additive MINOR — DocumentCorpus primitive.**

- Added: `ontology/primitives/document-corpus.ts` — type-shape primitive declaring a project's document corpus for retrieval alongside ontology context. Exports `DocumentCorpus`, `DocumentCorpusEntry`, `DocumentRetrievalMode` (`full-document | chunk-mode`), `topK`, `DOCUMENT_CORPUS_SCHEMA_VERSION` (`"palantir-mini/document-corpus/v1"`), type guards `isDocumentCorpus` + `isDocumentCorpusSchemaVersionV1`, and `documentCorpusFoundryEquivalent`.
- Added: sub-path export `"./ontology/primitives/document-corpus"` in `package.json` exports map.
- Added: barrel re-export in `ontology/primitives/index.ts` (v1.56 section).
- Companion: `palantir-mini lib/ontology-context/document-context.ts` exports `retrieveDocumentContext()` with two modes (full-document: each named doc as one 2KB-truncated chunk; chunk-mode: split on ## headings, score by token overlap, return top-K). `ontology_context_query` MCP accepts `includeDocumentContext?: boolean` (default false). `ChatbotStudioRetrievalContext` extended with `documentRefs` field. `pm-project-onboard` documents `document-corpus.json` placeholder on first onboarding.
- Additive MINOR; no edits to v1.0–v1.55 primitives.

## v1.55.0 — 2026-05-13 (foamy-giggling-kettle PR-4)

**Additive MINOR — OntologyContextApproval primitive.**

- Added: `ontology/primitives/ontology-context-approval.ts` — type-shape primitive (no factory; runtime helpers live in plugin `lib/ontology-context/approval.ts`). 12 fields including `approvalId` (sha256:16), `approvalKind` enum (`auto-low-risk | lead-approved | user-approved`), `sourceQueryRef`, `universalOntologyEntryRef`, `approvedCapabilityRefs`, `rejectedCapabilityRefs`, `approvedSurfaceRefs`, `forbiddenSurfaceRefs`, `approverIdentity`, optional `promptId` + `promptHash`.
- Added: sub-path export in `package.json` exports map.
- Companion plugin internal handler `bridge/handlers/internal/ontology-context-approval-create.ts` wraps the factory; `pm_intent_router` auto-creates approvals when `requiredDtc=false AND selectedCapabilities>0 AND impactContext.confidence='high'`; `pm_lead_brief` surfaces `pendingContextApprovals[]`.
- Additive MINOR; no edits to v1.0–v1.54 primitives.

## v1.54.0 — 2026-05-12 (foamy-giggling-kettle PR-3 minimal wrap)

**Additive MINOR — UniversalOntologyEntry primitive promotion.**

- Added: `ontology/primitives/universal-ontology-entry.ts` — promoted from plugin `lib/ontology-entry/universal-entry.ts`. Carries `UniversalOntologyEntry` type + 6-status literal union + factory + ref helpers.
- Added: barrel re-export from `ontology/primitives/index.ts`.
- Added: sub-path export in `package.json`.
- Companion: plugin lib `lib/ontology-entry/lifecycle.ts` exports `transitionUniversalOntologyEntry(entry, nextStatus, refs, projectRoot)` — persists new status JSON, updates current.json pointer, emits `phase_completed` event with `phaseTag: "universal-ontology-entry-transitioned"` (event-type union doesn't yet admit a dedicated `universal_ontology_entry_transitioned` type; tagged form per same pattern as PR-2 agent-router-suggestion-emit hook).
- Wired into 4 callers (prompt-front-door-capture + ontology-context-query + pm-semantic-intent-gate + pm-intent-router).
- DEFERRED to PR-3b: integration test suite (multi-spawn complexity drift; cleaner to re-author tests against landed types).
- No breaking changes. Consumer peerDep `>=1.47.0 <2.0.0` accepts v1.54 unchanged.
- Plan: `~/.claude/plans/foamy-giggling-kettle.md` §6 PR-3.

---

## v1.53.0 — 2026-05-12 (foamy-giggling-kettle PR-1)

**Additive MINOR — ProjectOntologyIndex schemas promotion.**

- Added: `ontology/primitives/project-ontology-index.ts` — generic primitive
  `ProjectOntologyIndex<TCapability, TKnownIssue, TProjectScope>`,
  `ProjectOntologyIndexFragment<TCapability>`, `ProjectOntologySurface`,
  `ValidationPackContract`, and `PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION` constant.
- Added: barrel re-export from `ontology/primitives/index.ts`.
- Added: sub-path export `./ontology/primitives/project-ontology-index` in
  `package.json`.
- Promotion source: `~/.claude/plugins/palantir-mini/lib/capability/project-ontology-index.ts`
  (lived in plugin lib only, breaking the ForwardProp chain). Plugin now
  re-exports the generic and specializes with concrete `CapabilityContract`,
  `KnownIssue`, `ProjectScopeDefinition` (kept in plugin until a future
  promotion PR). Helper functions and `loadProjectOntologyIndex` impl stay
  in plugin lib.
- No breaking changes. Consumers pinning `>=1.47.0 <2.0.0` accept v1.53
  unchanged.
- Plan: `~/.claude/plans/foamy-giggling-kettle.md` §6 PR-1.

---

## v1.51.0 — 2026-05-10 (palantir-mini Prompt-to-DTC canonical contract primitives)

### Added (MINOR additive)

- Added six Prompt-to-DTC primitives:
  - `approval-ref`
  - `ontology-engineering-ref`
  - `prompt-envelope`
  - `semantic-intent-contract`
  - `digital-twin-change-contract`
  - `prompt-contract-record`
- These promote palantir-mini prompt-front-door identity, user approval
  provenance, SemanticIntentContract, DigitalTwinChangeContract, and typed
  ref graph fields into the schema authority layer.
- Legacy runtime string fields remain compatible. Typed refs are additive and
  optional in this wave; runtime gate defaults are unchanged.

### Compat

- Backwards-compatible MINOR. No generated files changed. Runtime behavior
  remains owned by palantir-mini.
- shared-core companion bump: v1.12.0 re-exports the six new primitives.

---

## v1.50.0 — 2026-05-09 (sprint-060 W2.1 — HarnessSpeciesEnum primitive + R5-F3 Function partial-mapping refinement)

### Added (MINOR additive)

- **HarnessSpeciesEnum primitive** (`ontology/primitives/harness-species-enum.ts`, prim-meta-02) — Promotes the 7-species `HarnessSpeciesId` literal union from a `dispatch-contract`-local declaration to a stand-alone schema-canonical primitive. Closes architecture review §3.4 R1-F4 (Minor): until v1.50.0 the species inventory was duplicated across 3 surfaces with no single SSoT primitive — `dispatch-contract.ts` declared a local literal union (W1.13), `harness-species-cost-profile.ts` declared `HarnessSpeciesVendor` (parallel vendor axis), and `rules/CONTEXT.md §15` carried the human-readable enumeration. This consolidates the architectural-class axis as a single typed canonical source.
- New types: `HarnessSpeciesId` (7-species literal union; covers claude-code-cli + claude-agent-sdk + task-specific-harness + anthropic-managed-agents + palantir-mini-sprint-harness + gemini-enterprise + microsoft-foundry per CONTEXT.md §15) + `HARNESS_SPECIES_IDS` runtime inventory + **NEW** `HARNESS_SPECIES_DESCRIPTIONS` frozen `Record<HarnessSpeciesId, string>` carrying 1-line description per species (mirrors CONTEXT.md §15 glossary; useful for dispatch UIs + audit reports) + `isHarnessSpeciesId` runtime type guard.
- `dispatch-contract.ts` (v1.48.0) — local literal union replaced with re-export from the new canonical primitive. Type identity preserved; consumers importing `HarnessSpeciesId / HARNESS_SPECIES_IDS / isHarnessSpeciesId` from `dispatch-contract` continue to work unchanged. Internal `isHarnessSpeciesId(c.species)` use in `isDispatchContract` validator imports the function locally for runtime use.

### Refined (MINOR — `categoryFoundryEquivalent.kind` change)

- **`source-executor.ts` Foundry mapping refined `equivalent` → `partial`** (prim-action-08). Closes architecture review §5.G.3 R5-F3 (Minor): the discriminated-union shape covers 5 executor variants (action / automation / aip-logic / aip-agent / function), 4 of which map equivalent to Foundry's Workflow Lineage SourceExecutor 5-kind union. The `function` variant (`SourceExecutorFunction`) uses a stable-name reference (`executorRid: string + signature: string`) rather than a typed RID brand because Foundry TS/Python functions are registered at deploy time and do not have a typed schema RID surface in palantir-mini's ontology layer. Marking `partial` overall captures this asymmetry honestly. The `gaps[]` field enumerates the two affected concepts: SourceExecutorFunction stable-name pattern + the parallel EditFunction reference in `action-type.ts:60-61` (`editFunctionName: string`).

### Verified (no body change — architecture review carry-over closure confirmation)

- **R5-F6 Rule primitive** (`rule.ts`) — `categoryFoundryEquivalent: { kind: "claude-extension", rationale: "Claude-local rules behavioral overlay; no Foundry equivalent" }` confirmed present (W1.12 baseline).
- **R5-F7 Claude-extension trio** — `agent-definition.ts` + `skill-definition.ts` + `managed-settings-fragment.ts` all carry `kind: "claude-extension"` stamps with appropriate rationale strings (W1.12 baseline).
- **R5-F10 Codebase-governance trio** — `dead-code-marker.ts` + `file-complexity-budget.ts` + `codegen-header-contract.ts` all carry `kind: "claude-extension"` stamps (W1.12 baseline).
- **R5-F12 Anchored regex header** — `verify-codegen-headers.ts:96-101` uses `singleLineRegex.test(headerRegion)` + `MULTILINE_HEADER_PATTERN.test(headerRegion)` per sprint-059 W2.2; `body.includes()` strict-replacement landed.
- **R5-F13 MIGRATION.md cross-ref** — `~/.claude/schemas/MIGRATION.md` exists at repo root (sprint-059 W2.3, v1.46.0). CHANGELOG entries for v1.46.0 + v1.48.0 already cite the runbook for v2.0 migration governance.

### Deferred (R5-F9 — explicit cross-agent coordination handoff)

- **R5-F9 (`primitives/harness/` subdir reorg)** — DEFERRED to a follow-up wave coordinated with `hook-builder` agent. Moving `harness-species-cost-profile.ts` + `hands-manifest.ts` + `grader-effort.ts` into a `harness/` subdir would force import-path migration across 4 plugin handlers (`dispatch-route-decide.ts`, `pm-dispatch-cost-estimate.ts`, `pm-grader-dispatch.ts`, `grade-outcome/{types,model}.ts`) + 2 test files. `bridge/handlers/**` is hook-builder's writable scope per rule 07 §Agent file-ownership; ontology-steward cannot mutate consumer paths without coordination. Recommended next-wave plan: hook-builder owns the import-path migration in lockstep with ontology-steward's file move, gated on a single PR to avoid mid-tree breakage.

### Compat

- Backwards-compat MINOR. No edits to existing primitive types, fields, or runtime semantics. All v1.48-v1.49 consumers continue to validate. Consumers importing `HarnessSpeciesId / HARNESS_SPECIES_IDS / isHarnessSpeciesId` from `dispatch-contract` see identical types via re-export. Consumer projects pinning `>=1.32.0 <2.0.0` validate as before; HarnessSpeciesEnum-aware substrate (`pm_dispatch_route_decide`, future `negotiate_dispatch_contract`) may pin `>=1.50.0 <2.0.0` in a follow-up wave. The `source-executor.ts` `kind` change is metadata-only — no field shape change to `SourceExecutor` discriminated union; the FoundryEquivalence transition is `equivalent → partial` (a refinement, not a breaking change to the registry shape).

### Cross-refs

- Architecture review PR #329 §3.4 (R1-F4 Minor), §5.G.3 (R5-F3 Minor), §3.4 R5-F6/F7/F10/F12/F13 (verified).
- rule 16 v4.1.0 §0 (predecessor 5-species governance — superseded by the 7-species enum).
- rule 24 v1.1.0 §Dispatch flowchart step 1 ("identify species" — now backed by canonical primitive).
- CONTEXT.md §15 (canonical 7-species enumeration — primitive mirrors verbatim).
- HarnessSpeciesCostProfile (v1.42.0) — vendor axis is parallel, not synonymous (vendor != species; see `harness-species-enum.ts` JSDoc for mapping table).
- shared-core companion bump → v1.11.0 (W2.1 same wave): re-exports `HarnessSpeciesId / HARNESS_SPECIES_IDS / HARNESS_SPECIES_DESCRIPTIONS / isHarnessSpeciesId`. Removed the previously-duplicated `HarnessSpeciesId / HARNESS_SPECIES_IDS / isHarnessSpeciesId` re-exports from the dispatch-contract block to avoid duplicate-export ambiguity.
- See `~/.claude/schemas/MIGRATION.md` for the v2.0 migration runbook governing future MAJOR transitions.

---

## v1.49.0 — 2026-05-09 (sprint-060 W1.12 + W1-cleanup-A — categoryFoundryEquivalent metadata)

### Added (MINOR additive)

- **`categoryFoundryEquivalent` per-primitive metadata** (`ontology/primitives/category-foundry-equivalent.ts` + per-file stamps, prim-meta-01) — Machine-readable Foundry-mapping metadata for every schema primitive. Closes architecture review §3.4 R5-F14 (S3): until v1.49.0 the relation between palantir-mini schema primitives and their Palantir Foundry counterparts was prose-only (primitive file leading comments + Appendix C of `~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md`).
- New types: `FoundryEquivalence` discriminated union (`equivalent` / `partial` / `over-specified` / `claude-extension`) + `FOUNDRY_EQUIVALENCE_KINDS` const + `FoundryEquivalenceKind` literal type + `isFoundryEquivalence` runtime guard + 4 convenience constructors (`foundryEquivalent`, `foundryPartial`, `foundryOverSpecified`, `claudeExtension`).
- 73 primitives now stamp a module-local `const categoryFoundryEquivalent: FoundryEquivalence` followed by a slug-prefixed re-export `<camelSlug>FoundryEquivalent` (e.g. `actionTypeFoundryEquivalent`, `objectTypeFoundryEquivalent`, `dispatchContractFoundryEquivalent`, `sprintContractFoundryEquivalent`). Module-local + alias pattern lets the primitives barrel keep `export *` re-exports without name-collision.
- Aggregator: primitives barrel exports `FOUNDRY_EQUIVALENTS_REGISTRY` (frozen `Record<slug, FoundryEquivalence>`) + `getFoundryEquivalents()` helper. Audits and migration tooling MUST go through the aggregator instead of importing each primitive's marker individually so future primitive additions propagate via a single barrel update.

### Fixed (W1-cleanup-A — non-semantic cleanup of W1.12 + W1.13 land sequence)

- **`~/ontology/shared-core/tsconfig.json`** — added `allowImportingTsExtensions: true` + `noEmit: true` (drops unused `outDir`/`rootDir`). Required because re-exported primitive sources (e.g. `plugin-manifest.ts` at line 27 with `import "./hook-event-allowlist.ts"`) carry sibling `.ts` extension imports that bundler-mode TS otherwise rejects (TS5097). Mirrors the schemas-side tsconfig. Package is `private: true` Bun workspace — runtime resolution goes through `@palantirKC/claude-schemas` directly; this config is verification-only.
- Verified: `bunx tsc --noEmit -p ~/.claude/schemas/tsconfig.json` exit 0; `bunx tsc --noEmit -p ~/ontology/shared-core/tsconfig.json` exit 0. All 74 per-primitive `<slug>FoundryEquivalent` stamps unique (73 primitives + the self-stamp on `category-foundry-equivalent.ts`).
- Triplicate-stamp audit (W1.13 carry-over flag): `sprint-contract.ts` and `dispatch-contract.ts` each carry exactly 1 stamp — no dedupe needed.

### Compat

- Backwards-compat MINOR. No edits to existing primitive types or fields. Consumer projects pinning `>=1.32.0 <2.0.0` validate as before; FoundryEquivalence-aware audits + migration tooling may pin `>=1.49.0 <2.0.0` in a follow-up wave.

### Cross-refs

- Architecture review PR #329 §3.4 (R5-F14 / S3).
- `getFoundryEquivalents()` aggregator in `ontology/primitives/index.ts`.
- shared-core tsconfig adjustment ships in this same wave (no shared-core version bump required — package is private workspace).

---

## v1.48.0 — 2026-05-09 (sprint-060 W1.13 — DispatchContract abstract superclass)

### Added (MINOR additive)

- **DispatchContract abstract base + 7-species discriminated union** (`ontology/primitives/dispatch-contract.ts`, prim-action-12) — Promotes `SprintContract` (prim-action-05) from a species-5-only primitive into the species-5 concrete subtype of a cross-species substrate. Closes architecture review §5.A.3 / R1-F9 (B2): rule 24 step 3 unconditionally requires SprintContract bind, but only species 1+5 had a formal contract primitive; cross-species dispatch (Agent SDK, Managed Agents, Gemini Enterprise, Microsoft Foundry, ...) lacked an analogous gate substrate.
- New types: `DispatchContractRid` branded string + `dispatchContractRid()` constructor + `HarnessSpeciesId` 7-species literal union + `HARNESS_SPECIES_IDS` runtime inventory + `DispatchContractStatus` + `DispatchContractBase` + 7 concrete subtypes (`ClaudeCodeCliDispatchContract`, `ClaudeAgentSdkDispatchContract`, `TaskSpecificDispatchContract`, `AnthropicManagedAgentsDispatchContract`, `PalantirMiniSprintDispatchContract`, `GeminiEnterpriseDispatchContract`, `MicrosoftFoundryDispatchContract`) + `DispatchContract` discriminated union + `DispatchConsumptionBudget` (Gemini/Foundry budget shape) + `isHarnessSpeciesId` / `isDispatchContractStatus` / `isDispatchContract` runtime validators + `DispatchContractRegistry` class + `DISPATCH_CONTRACT_REGISTRY` default instance.
- **REFACTOR**: `SprintContract` is now exported from `sprint-contract.ts` as `Extract<DispatchContract, { species: "palantir-mini-sprint-harness" }>` (back-compat alias). `SprintContractDeclaration` field surface unchanged — the dispatch base wraps it via `dispatch.sprint: SprintContractDeclaration` so all sprint-specific fields (sprintNumber, inputs, successCriteriaRids, iterationLimit, hardThreshold, mode, taskFitness, projectSlug, ...) survive verbatim.
- New package.json export: `./ontology/primitives/dispatch-contract`.

### Compat

- Backwards-compat MINOR. Existing `SprintContractDeclaration` consumers (palantir-math, mathcrew, hyperframes, palantir-mini handlers) unaffected — no field changes; only an additional sibling abstraction layered above. Consumer pin `>=1.32.0 <2.0.0` validates as before. Cross-species dispatch consumers may pin `>=1.48.0 <2.0.0` in a follow-up wave.

### W2.1 R1-F4 dependency

- `HarnessSpeciesId` is declared as a local string-literal union in this primitive pending W2.1's `HarnessSpeciesEnum` promotion to a stand-alone primitive. When W2.1 lands, the local union is replaced with a re-export (additive MINOR; type identity preserved). Documented in `dispatch-contract.ts` JSDoc.

### Cross-refs

- Architecture review PR #329 §5.A.3 (R1-F9 Major / B2).
- rule 16 v4.1.0 §SprintContract (species-5 contract).
- rule 24 v1.1.0 §Dispatch flowchart step 3 ("SprintContract or species-native contract").
- CONTEXT.md §15 7-species enumeration.
- HarnessSpeciesCostProfile (v1.42.0) — vendor cost profile is a parallel axis (vendor != species).
- shared-core companion bump → v1.10.0 (W1.13 same wave).

---

## v1.47.0 — 2026-05-08 (sprint-059 W2.1 — DerivedPropertyDeclaration primitive)

### Added (MINOR additive)

- **DerivedPropertyDeclaration primitive** (`ontology/primitives/derived-property.ts`, prim-data-26) — Foundry-equivalent typed declarative compute-binding promoted from the long-standing forward reference in `object-type.ts:5-6`. Points to an `AIPLogicFunctionRid` OR a stable-name `SourceExecutorFunction` registered at deploy time; carries `cacheStrategy` (no-cache / request-scoped / session-scoped / ttl) + optional `dependsOnProperties` for change-propagation invalidation.
- `DerivedPropertyRid` branded string + `derivedPropertyRid()` constructor + `validateDerivedProperty()` runtime validator + `DerivedPropertyRegistryV2` class + `DERIVED_PROPERTY_REGISTRY_V2` default registry instance + `CacheStrategyConfig` discriminated union (`CacheStrategySimple | CacheStrategyTtl`).
- New test file `tests/primitives/derived-property.test.ts` with 13 cases (rid round-trip + 4 pass cases + 6 fail cases + 2 registry cases).
- `object-type.ts:5-6` reference updated — the closure-based LOGIC variant at `ontology/functions/derived-property.ts` (prim-logic-04) coexists intentionally with the new DATA primitive.

### Compat

- Backwards-compat MINOR. No edits to existing fields. Consumer projects pinning `>=1.32.0 <2.0.0` validate as before; DerivedProperty consumers may pin `>=1.47.0 <2.0.0` in a follow-up wave.
- Existing `ontology/functions/derived-property.ts` (closure-based, in-process compute) preserved unchanged — no consumers; coexistence is by design (different D/L/A domain).

### Coordination note

- Sibling Wave W2.3 already claimed v1.46.0 for the MIGRATION.md runbook (docs-only, semantically PATCH but labeled MINOR). W2.1 takes the next available MINOR slot to avoid a parallel-wave version collision.

### Cross-refs

- Architecture review PR #329 §5.G.2 (R5-F2 Major).
- `source-executor.ts` (computeFunctionRid resolution at read-time).
- `aip-logic-function.ts` (AIPLogicFunctionRid binding target).
- shared-core companion bump → v1.9.0 (W2.1 same wave).

---

## v1.46.0 — 2026-05-08 (sprint-059 W2.3 — MIGRATION.md runbook)

### Added (PATCH — docs only)

- **`MIGRATION.md`** — v2.0 migration runbook: triggers, parallel-peerDep window, 4-consumer staged order (palantir-math → mathcrew → hyperframes → plugin), codegen replay validation, rollback gates, sprint governance. No primitive changes. Closes architecture review R6-F5 Major (PR #329 §5.J.2).

### Cross-refs

- rule 08 (schema-versioning) §CHANGELOG — referenced from runbook §7.
- rule 25 (auto-merge-cleanup) §Wave-split policy — referenced from runbook §7.
- Sprint-059 W2.3 plan.

---

## v1.45.0 — 2026-05-07 (sprint-053 W3D — costClass field)

### Added (MINOR additive)

- **SkillDefinition / SkillDeclaration `costClass?: "low" | "medium" | "high"`** — economic cost tier orthogonal to existing `effort` field. `low` = haiku-tier; `medium` = sonnet subagent or ≥2 MCP roundtrips; `high` = opus subagent or multi-iter sprint. Consumed by `pm_dispatch_cost_estimate` handler (W4 sprint-046) + audit §C cost-attribution criterion.

### Compat

- Backwards-compat MINOR. Existing skill declarations without `costClass` validate as before. Consumer pin `>=1.32.0 <2.0.0` unaffected.

### Cross-refs

- Sprint-053 W3D plan §3D.
- Audit §C cost-class field criterion.
- Skill primitive: `ontology/primitives/skill.ts`.

---

## v1.44.0 (2026-05-07)

### Added

- `SprintContractDeclaration.taskBudgetTokens?: number` — advisory token budget per sprint (min 20K). Surfaced as advisory countdown to graders. Pairs with rule 16 v4.1.0 §Quick Sprint budget tracking. (sprint-052 W4.B)
- `SprintContractDeclaration.taskFitness?: { species, expectedBenchmark, observedScore? }` — per-task species selection record + post-hoc fitness. Enables `pm_recap` aggregation of per-species win rates. Cross-ref `HarnessSpeciesCostProfile.vendor` (schemas v1.42.0 W2.A.3). (sprint-052 W4.B)
- `validateTaskBudgetTokens` + `validateTaskFitness` exports.
- `TaskFitness` named interface (hoisted from inline object literal for ergonomic re-use by `pm_recap` aggregators).

### Notes

- Both fields optional + additive — backwards-compatible MINOR. Consumers (palantir-math + mathcrew + hyperframes) pin v1.43.0; v1.44.0 compatible without regen, though pm-codegen will refresh generated types.
- No primitive added; existing `SprintContractDeclaration` interface extended.

---

## v1.43.0 — 2026-05-09 (sprint-049 W3.E)

### Added

- Add `"visual"` to `RubricDomain` enum (Wave 3 W3.E — pairs with grade-outcome/visual.ts handler that wraps run_playwright_scenario for screenshot-diff scoring).

---

## [1.42.0] — 2026-05-08

### Added — 3 new primitives + 1 extension (sprint-047 W2.A — Claude Harness 5-Wave pivot)

Additive MINOR. Grounds the Claude Harness Infra pivot (Opus 4.7 + GPT-5.5
+ OpenAI Agents SDK April 2026 + 4-vendor pricing split) in typed
primitives so subsequent Waves (W2.B handler-usage audit + W3.A
BrainProvider + W3.C SandboxClient) consume a versioned interface rather
than ad-hoc shapes. No edits to v1.0-v1.41 primitive bodies; v1.42 strictly
additive.

- `ontology/primitives/grader-effort.ts` — NEW. `GraderEffortLevel` enum
  (`"none" | "low" | "normal" | "high" | "critical"`) +
  `GRADER_EFFORT_LEVELS` const + `isGraderEffortLevel` type guard +
  `mapTierToClaudeCodeEffort(tier) → "high" | "xhigh" | undefined` (the
  canonical bridge from palantir-mini criterion tier to Anthropic Claude
  Code CLI `/effort` flag) + `tierRequiresModelCall` +
  `tierSelectsOpus` helpers. Authority: `research/anthropic/opus-4-7-
  whats-new-platform.md` (xhigh introduced 2026-04-16; budget_tokens
  removed; thinking off-by-default) + `research/openai/gpt-5-5-
  introducing-2026-04-23.md` + `research/openai/gpt-5-5-model-developer-
  page.md` (5-level reasoning.effort).

- `ontology/primitives/hands-manifest.ts` — NEW. `HandsManifestDeclaration`
  + 6 entry-kind interfaces (`LocalDirEntry` / `GitRepoEntry` /
  `EnvVarEntry` / `S3MountEntry` / `GCSMountEntry` / `R2MountEntry`) +
  `HandsManifestEntry` discriminated union + `HandsManifestRid` brand +
  `HANDS_MANIFEST_ENTRY_KINDS` const + `isHandsManifestEntryKind` type
  guard + `validateHandsManifest(m) → { valid, errors }` (workspace-
  relative dst path discipline rejecting `..` traversal + absolute host
  src + POSIX env var name pattern) + `isHandsManifestDeclaration` type
  guard. Mirrors OpenAI Agents SDK Manifest schema (April 2026 launch;
  9 sandbox providers Unix-local + Docker + Blaxel + Cloudflare +
  Daytona + E2B + Modal + Runloop + Vercel). Authority: `research/
  openai/sandbox-agents-developer-docs.md` (Manifest schema verbatim) +
  `research/openai/agents-sdk-next-evolution-2026-04-15.md`.

- `ontology/primitives/harness-species-cost-profile.ts` — NEW.
  `HarnessSpeciesVendor` enum (7 vendors) + `CostBillingAxis` enum (8
  axes) + `CostAmount` interface + `HarnessSpeciesCostProfileDeclaration`
  + 7-vendor `HARNESS_SPECIES_COST_PROFILES` inventory const
  (`claude-code-cli-max` $200/mo flat = the BYO-CLI-via-Max 3rd pricing
  arbitrage option; `anthropic-managed-agents` $0.08/session-hour;
  `openai-agents-sdk` free runtime + BYO sandbox; `google-gemini-
  enterprise` per-component metered; `microsoft-foundry` $0.0994/vCPU-
  hour + memory; `microsoft-copilot-studio` flat tier + per-message
  overage; `local-ollama` electricity-only fallback) + type guards +
  `costProfileForVendor` lookup + `isFlatSubscriptionVendor` predicate.
  Authority: `research/harness-engineering-2026/the-new-stack-4-vendor-
  harness-pricing-split-2026-04.md` (Janakiram MSV, 2026-04-18) +
  `research/anthropic/scaling-managed-agents-2026-04-08.md` +
  `research/openai/agents-sdk-next-evolution-2026-04-15.md`.

### Changed — `ontology/primitives/grading-criterion.ts` (sprint-047 W2.A.4)

Additive interface change. Adds optional `tier?: GraderEffortLevel` field
to `GradingCriterionDeclaration` for per-criterion grader-effort routing
(replaces the informal binary `default | critical` referenced in
palantir-mini CHANGELOG v3.5.0). Backwards-compat: missing `tier` is
treated as `"normal"`; rubrics that used the literal string `"default"`
map to `"normal"`. JSDoc header bumped 1.35.0 → 1.42.0 with v1.42.0
addendum noting the binary-to-5-level migration. No edits to existing
fields or behavior. Cross-refs: rule 16 v4.1.0 §Roles
(`pm_grader_dispatch` Sonnet 4.6 / Opus 4.7 split); rule 26 v1.0.0
§Axis B (Verifiable).

### Updated

- `ontology/primitives/index.ts` — barrel export adds three new lines:
  `export * from "./grader-effort"`, `export * from "./hands-manifest"`,
  `export * from "./harness-species-cost-profile"` under a new v1.42
  section header.

- `package.json` — `version` 1.41.0 → 1.42.0; three new `exports` entries
  (`./ontology/primitives/grader-effort`, `./ontology/primitives/hands-
  manifest`, `./ontology/primitives/harness-species-cost-profile`);
  description prepended with v1.42 surface summary.

### Authority

- Plan: `~/.claude/plans/mellow-plotting-oasis.md` §Wave 2 W2.A.
- Audit baseline: `~/.claude/plans/2026-05-08-claude-harness-audit.md`.
- Sprint contract: `~/.palantir-mini/harness/sprints/sprint-047/contract.json`
  (`monorepo-root-sprint-047-quick`).
- 1차 자료 mirrors: `~/.claude/research/{anthropic, openai, harness-
  engineering-2026}/`.

### Rule cross-refs

- rule 08 v2.0.0 §Schema as semver-tracked interface — additive MINOR
  bump consistent; no consumer breaks.
- rule 16 v4.1.0 §Roles — `criterion.tier` field now strongly typed.
- rule 26 v1.0.0 §Axis B (Verifiable) + §Axis D (Shareable — provider-
  neutral cost profile).
- rule 10 v3.0.0 §propagationDepth — manifest materialization is the
  origin layer of a sandbox-bound execution chain (Wave 3 wiring).

### Consumer impact

None breaking. Three new optional import paths; `GradingCriterion.tier`
is optional with backwards-compat semantics. Consumer projects
(palantir-math, mathcrew, kosmos, palantir-mini plugin) MAY pin
`@palantirKC/claude-schemas: ^1.42.0` to import the new surface; existing
`>=1.15.0 <2.0.0` peer ranges remain compatible.

---

## [1.41.0] — 2026-05-06

### Added — `CanonicalSourceRegistry` primitive (SSoT-3 W2.C)

Additive MINOR. NEW primitive `CanonicalSourceRegistry` — declares 10 canonical
1차 자료 sources (5 Palantir + 3 Anthropic + 2 Claude Code) + retrieval cadence
(hot/warm/cold) per source class. Companion to v1.39.0 `ResearchSourceManifest`.
Cited by W2.A skill `pm-cold-start-orchestrate` + W2.B hook
`cold-start-browse-index-loader`.

- `ontology/primitives/canonical-source-registry.ts` —
  `CanonicalSourceRegistryDeclaration`, `CanonicalSourceEntry`,
  `CanonicalSourceClass` (3-class enum: `"palantir-foundry-canonical" |
  "claude-code-native-runtime-canonical" | "claude-code-reference"`),
  `CanonicalSourceRegistryRid` (branded), `CanonicalSourceEntryRid` (branded),
  `ISO8601` + `SemVer` brands, `CANONICAL_SOURCE_CLASS_DEFAULT_CADENCE` lookup
  (palantir-foundry/claude-code-native: cold; claude-code-reference: warm),
  `CanonicalSourceRegistry` class with `register`, `registerAll`, `get`, `list`,
  `byClass`, `staleEntries(now)` selectors, singleton `CANONICAL_SOURCE_REGISTRY`.
  Type guards: `isCanonicalSourceClass`, `isCanonicalSourceEntry`,
  `isCanonicalSourceRegistryDeclaration`. Imports `RefreshClass` from
  `research-source-manifest` (sibling primitive) to share the cadence taxonomy.

  Sibling distinction:
  - `ResearchSourceManifest` (v1.39.0) is per-subdir (one MANIFEST.json per
    `~/.claude/research/<topic>/`) — *manifest of arbitrary sources*.
  - `CanonicalSourceRegistry` (v1.41.0) is registry-level (collection of
    sources promoted to canonical 1차 자료 status across the whole control
    plane) — *the structured truth Cold-Start automation queries*.

  Concrete inventory (documented in primitive JSDoc as comment-level inventory;
  populated by W2.D research mirroring + downstream registration):

  palantir-foundry-canonical (5):
  - `blog-securing-agents-agentic-runtime-1-2026-01-22` (topic: agentic-runtime)
  - `ai-fde-overview-and-modes-skills-2026-03-12` (topic: ai-fde)
  - `aip-evals-overview-and-ontology-edits-2026-04-14` (topic: aip-evals)
  - `connecting-ai-to-decisions-2024-01` (topic: decision-lineage)
  - `blog-connecting-agents-2026-04-29` (topic: agentic-memory)

  claude-code-native-runtime-canonical (3):
  - `effective-harnesses-2025-11-26` (Justin Young; topic: harness-taxonomy)
  - `scaling-managed-agents-2026-04-08` (Lance Martin; topic: managed-agents)
  - `harness-design-2026-03-24` (Prithvi Rajasekaran; topic: 3-agent-harness)

  claude-code-reference (2):
  - `claude-code/features` (topic: claude-code-features)
  - `claude-code/agent-system-design` (topic: agent-system-design)

  Authority cites: `research/palantir-foundry/aip/{blog-securing-agents-
  agentic-runtime-1-2026-01-22, ai-fde-overview-and-modes-skills-2026-03-12,
  aip-evals-overview-and-ontology-edits-2026-04-14, connecting-ai-to-decisions-
  2024-01, blog-connecting-agents-2026-04-29}.md` + `research/anthropic/
  {effective-harnesses-2025-11-26, scaling-managed-agents-2026-04-08,
  harness-design-2026-03-24}.md` + `research/claude-code/{features,
  agent-system-design}.md`.

  Rule cross-refs: rule 02 v3.1.0 §Research retrieval, rule 26 v1.0.0 §Axis A3
  (evidence-cited), rule 26 §Anchors footer, rule 16 v4.0.0 §Anchors.

  Plan reference: `~/.claude/plans/vast-giggling-mccarthy.md` §3 Wave 2 W2.C.

- `ontology/primitives/index.ts` — barrel export `export * from
  "./canonical-source-registry"` under v1.41 section.

- `package.json` — `version` 1.40.0 → 1.41.0; new export entry
  `./ontology/primitives/canonical-source-registry`; description updated to
  reflect new primitive.

---

## [1.40.0] — 2026-05-06

### Added — 10 AIP/Foundry/MCP operational primitives (W2.A SSoT-2)

Additive MINOR. Promotes 10 cross-cutting primitives capturing the practical
AIP/Foundry/MCP build surface so consumer projects (palantir-math, mathcrew,
hyperframes) can express MCP-tool registration, ontology simulation graphs,
Global Branching proposal lifecycle, granular security policies, Workflow
Lineage source executors + graph snapshots, the AI FDE 8-mode router + skill
taxonomy, the AIP Evals 19-evaluator → 6-RubricDomain mapping, and a typed
retry-policy union without rule-08 authority-chain violations.

(Note: v1.38 was originally reserved for SSoT-2 W2.A; W1.C SSoT-9 jumped
1.37→1.39 first, so this Wave 2 expansion lands at v1.40 — the 1.38 slot
remains a permanent gap, intentionally.)

- `ontology/primitives/mcp-tool-declaration.ts` — `MCPToolDeclaration`,
  `MCPArchitectureKind` (`"builder" | "consumer"`), `MCPPermissionsMatrix`
  (readScopes / writeScopes / deployScopes), `MCPToolDeclarationRid` (branded),
  `MCPToolDeclarationRegistry` with `byKind / byServer`. Type guards:
  `isMCPArchitectureKind`, `isMCPToolDeclaration`. Maps Palantir MCP (builder,
  modifies ontology types) vs Ontology MCP / OMCP (consumer, reads/writes
  ontology data via Application Scopes). Cites
  `research/palantir-foundry/dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md`.

- `ontology/primitives/ontology-simulation.ts` — `OntologySimulation`,
  `OntologyEdit`, `OntologySimulationDisposalPolicy`
  (`"immediate" | "7d-archive" | "on-merge"`), `OntologySimulationRid`
  (branded), `OntologySimulationRegistry` with `byDisposalPolicy`. Type
  guards: `isOntologySimulation`, `isOntologySimulationDisposalPolicy`.
  Promotes the AIP Evals "ontology simulation" pattern to first-class.
  Pairs with the existing `RubricDomain="simulator"` evaluator domain
  (schemas v1.31.0+) — that primitive is the grader, this one is the
  artifact the grader observes. Cites
  `research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` §B.

- `ontology/primitives/global-branching-proposal.ts` —
  `GlobalBranchingProposal` (composes prim-learn-19
  `OntologyProposalDeclaration`), `GlobalBranchingApprovalPolicy`
  (eligibleReviewers / requiredApprovals / allowSelfApprove),
  `GlobalBranchingProposalLifecycleState` (`"draft" | "in-review" |
  "approved" | "merged" | "rejected" | "deferred"`),
  `GlobalBranchingResourceCheckResult`,
  `GlobalBranchingProposalRegistry` with `byLifecycleState`. Type guards:
  `isGlobalBranchingProposal`, `isGlobalBranchingProposalLifecycleState`.
  Captures GA-week (2026-05-18) Global Branching capabilities:
  cross-application unified branching, project-owner approval policies,
  branch-cost / resource-checks, and review lifecycle including
  doNotMerge gating. Cites `research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md`.

- `ontology/primitives/object-security-policy.ts` — `ObjectSecurityPolicy`,
  `ObjectSecurityPolicyScope` (`"row" | "column" | "cell" | "object"`),
  `ObjectSecurityPolicyRid` (branded), `ObjectSecurityPolicyRegistry` with
  `byObjectType / byScope`. Type guards: `isObjectSecurityPolicy`,
  `isObjectSecurityPolicyScope`. Granular access policy with predicate
  + markings + optional purpose binding. Sister of MarkingDeclaration
  (prim-security-03) — that classifies, this gates.

- `ontology/primitives/property-security-policy.ts` — `PropertySecurityPolicy`,
  `PropertySecurityVisibility` (`"always" | "by-marking" | "by-purpose" |
  "hidden"`), `PropertySecurityPolicyRid` (branded),
  `PropertySecurityPolicyRegistry` with `byProperty / byVisibility`. Type
  guards: `isPropertySecurityPolicy`, `isPropertySecurityVisibility`.
  Property-level RBAC with structural cross-checks (markingRids required
  when visibility="by-marking"; purposes required when visibility=
  "by-purpose").

- `ontology/primitives/source-executor.ts` — `SourceExecutor` discriminator
  union (5 kinds: function / action / automation / aip-logic / aip-agent),
  per-kind interfaces (`SourceExecutorFunction`, `SourceExecutorAction`,
  `SourceExecutorAutomation`, `SourceExecutorAIPLogic`,
  `SourceExecutorAIPAgent`), `SourceExecutorRegistry` with `byKind`.
  Per-kind type guards (`isSourceExecutorFunction`, etc.) plus structural
  guard `isSourceExecutor` and `isSourceExecutorKind`. Backs Workflow
  Lineage's typed handle for executor nodes. Cites
  `research/palantir-foundry/aip/workflow-lineage-and-aip-observability-2026-03-03.md` §A.

- `ontology/primitives/workflow-lineage-graph.ts` — `WorkflowLineageGraph`,
  `WorkflowLineageNode`, `WorkflowLineageEdge`, `WorkflowLineageNodeKind`
  (`"data-source" | "transform" | "action" | "agent"`),
  `WorkflowLineageEdgeKind` (`"feeds" | "triggers" | "produces" | "calls"`),
  `WorkflowLineageGraphRid` (branded), `WorkflowLineageGraphRegistry`. Type
  guards: `isWorkflowLineageGraph`, `isWorkflowLineageNode`,
  `isWorkflowLineageEdge`, `isWorkflowLineageNodeKind`,
  `isWorkflowLineageEdgeKind`. Typed graph snapshot for Workflow Lineage
  with explicit `traceWindowDays` (mirrors AIP observability 7-day default).

- `ontology/primitives/aip-mode-and-skill.ts` — `AIPMode` (8 canonical
  modes per Palantir docs §B verbatim: `"data-integration" |
  "ontology-editing" | "functions-editing" | "exploration" | "governance" |
  "machine-learning" | "osdk-react" | "platform-qa"`),
  `AIP_MODES` const, `AIPSkill`, `AIPSkillCategory` (`"agent-skill" |
  "domain-skill"`), `AIPSkillId` (branded), `AIPSkillRegistry` with
  `byCategory / byMode`. Type guards: `isAIPMode`, `isAIPSkill`,
  `isAIPSkillCategory`. Captures the AI FDE mode router + agent/domain
  skill taxonomy (mid-task toggleable). Cites
  `research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md` §B.

- `ontology/primitives/grader-domain-extension.ts` —
  `AIPEvalsEvaluatorType` (19-evaluator literal union),
  `AIP_EVALS_EVALUATOR_TYPES` const, `AIP_EVALS_EVALUATOR_TYPE_TO_RUBRIC_DOMAIN`
  (`Record<AIPEvalsEvaluatorType, RubricDomain>` mapping each AIP Evals
  evaluator to one of 6 canonical RubricDomain values),
  `rubricDomainForEvaluator` helper, `isAIPEvalsEvaluatorType` guard.
  **Extension pattern, no edit to `grading-criterion.ts`** — preserves
  rule 08 backcompat for the harness loop's exhaustive switches over the
  6-domain core. Cites
  `research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`.

- `ontology/primitives/retry-policy.ts` — `RetryPolicy` discriminator
  union (3 kinds: `constant-backoff` / `exponential-backoff` / `no-retry`),
  per-kind interfaces (`RetryPolicyConstantBackoff`,
  `RetryPolicyExponentialBackoff`, `RetryPolicyNoRetry`),
  `RETRY_POLICY_KINDS` const, `retryDelayMs` helper. Per-kind type guards
  (`isRetryPolicyConstantBackoff`, etc.) plus structural guard
  `isRetryPolicy` and `isRetryPolicyKind`. Pairs with action-type.ts
  Tier-2 + automation-declaration.ts to formalize transient-failure
  handling.

D/L/A domains: ACTION (mcp-tool-declaration, source-executor, retry-policy),
DATA (ontology-simulation, workflow-lineage-graph, grader-domain-extension),
LEARN (global-branching-proposal), SECURITY (object-security-policy,
property-security-policy), OPS (aip-mode-and-skill).

Authority chain: research → schemas → shared-core → per-project ontology.

ForwardProp chain on consumer pin: `1.40.0` up from `1.39.0`. No breaking
change — additive primitives only, no edits to existing v1.0-v1.39 surfaces,
and `grading-criterion.ts` uses the extension pattern (separate file, no edit
to the existing 6-domain `RubricDomain` union).

Provenance: sprint-032 / W2.A SSoT-2 / 2026-05-06.

---

## [1.39.0] — 2026-05-06

### Added — ResearchSourceManifest primitive (W1.C SSoT-9)

Additive MINOR. Introduces a versioned interface for declaring evidence-source
metadata + refresh contracts in research-library subdirectories. Pairs with the
existing `ResearchDocument` primitive (per-doc lineage) — the manifest captures
per-source URL/mirror/refresh-class structure for an entire library.

(Note: v1.38 is reserved for SSoT-2 W2.A landing in parallel; this bump skips
1.38 intentionally per task spec.)

- `ontology/primitives/research-source-manifest.ts` — `ResearchSourceManifest`,
  `ResearchSource`, `RefreshClass` (`"hot" | "warm" | "cold"`),
  `RESEARCH_REFRESH_CLASS_DAYS` (`{ hot: 7, warm: 30, cold: 90 }`),
  `ResearchSourceManifestRid` (branded), `ResearchSourceManifestRegistry`
  with `register / get / list / staleEntries(now)` methods. Type guards:
  `isResearchSource`, `isResearchSourceManifest`, `isRefreshClass`.

Consumed by:
- `~/.claude/research/<topic>/MANIFEST.json` files (4 seeded with this
  release: `palantir-foundry/`, `anthropic/`, `palantir-vision/aipcon-devcon/`,
  `claude-code/`).
- `palantir-mini/hooks/research-staleness-check.ts` (SessionStart advisory).
- `palantir-mini/bridge/handlers/research-staleness-audit.ts`
  (`research_staleness_audit` MCP handler).
- `palantir-mini/skills/pm-research-staleness-audit/SKILL.md`.

D/L/A domain: LEARN. Authority chain: research -> schemas -> shared-core.

ForwardProp chain on consumer pin: `1.39.0` up from `1.37.0` (skip 1.38).
No breaking change — additive primitive only.

Provenance: sprint-030 / W1.C SSoT-9 / 2026-05-06.

---

## [1.37.0] — 2026-05-05

### Added — AIP/Foundry operational primitives + minimal context routing

Additive MINOR. Captures the practical FDE/AIP build loop as TypeScript
contracts, so agents can understand ontology exposure, branch/proposal review,
eval loops, and governed agent tools without reading broad research folders.

- `ontology/primitives/object-view.ts` — Object View exposure boundary for
  apps, workflows, and agent tools.
- `ontology/primitives/ontology-branch-proposal.ts` — Global Branching /
  AI FDE branch and proposal lifecycle.
- `ontology/primitives/aip-evaluation.ts` — AIP Evals suite, test case, run,
  and experiment declarations.
- `ontology/primitives/aip-agent.ts` — AIP Chatbot / AI FDE agent declaration
  with ontology scope, tool bindings, eval suites, observability, and
  deployment stage.
- `object-type.ts`, `action-type.ts`, `aip-logic-function.ts` — optional
  operational fields for API names, object views, actions, branch policy,
  approval policy, eval suites, model comparison, and observability.
- `primitives/index.ts` + `package.json` — new exports and version bump.

No breaking changes: all existing primitive fields remain valid; new fields are
optional and additive.

---

## [1.36.0] — 2026-05-04

### Changed — Plugin seed sync + rule-registry regen (palantirkc-sprint-002-quick PR-D)

Additive MINOR. No primitive changes; pure seed + registry refresh:

- `ontology/seeds/skill-definitions.ts` — added 6 plugin-skill seed entries: `pm-decision-replay`, `pm-harness-base-mode-audit`, `pm-lineage`, `pm-memory-map`, `pm-quick-sprint`, `pm-value-audit`. Closes filesystemOnly drift detected by `pm_plugin_self_check`.
- `ontology/seeds/agent-definitions.ts` — removed deprecated `doc-writer` agent seed (file absent on disk; agent retired 2026-05-03 nifty-mixing-diffie Phase 6, consolidated into `docs-researcher`). Closes seedOnly drift.
- `src/generated/rule-registry.ts` — regenerated via `gen-rule-registry.ts`; picks up rule 26 (valuable-data-standard, added 2026-05-03 schemas v1.35.0) which had been missing from the codegen output. Closes file-count drift (15 disk vs 14 registered).

No breaking changes. Consumer projects do not need to bump peer pin.

---

## [1.34.0] — 2026-05-01

### Added — 3 propagation-audit substrate primitives (cosmic-hatching-pizza W6 — distributed-wishing-manatee Phase 1)

Additive MINOR. 3 new primitives + 3 new subpath exports backing the
ForwardProp/BackwardProp audit MCP surface that lands in Phase 4 (palantir-mini
handlers `propagation_audit_forward`, `propagation_audit_backward`,
`propagation_chain_health`). v1.34 ships the typed payload surface so the new
handlers can emit conformant envelopes without parallel hand-authored types.

- `propagation-audit.ts` (prim-data-18, DATA) — `PropagationAuditPayload`
  envelope `{auditId, chainSteps, firstFailureStep, perStepResult, verdict, auditedAt}`
  for forward-walk audits of the 6-step authority chain. Houses the canonical
  `PropagationStep` string-union (`research | schema | shared-core |
  project-ontology | contracts | runtime`) plus runtime-readable
  `PROPAGATION_STEPS` array, `isPropagationStep` type guard,
  `PropagationStepResult` per-step record, and `isPropagationAuditPayload`
  envelope guard. PropagationStep enum is the SSoT for the v1.34 trio.

- `propagation-replay.ts` (prim-data-19, DATA) — `PropagationReplayPayload`
  envelope `{replayId, seedEventId, tracedDimensions, firstViolationStep,
  lineageNodes, replayedAt}` for backward 5-dim Decision Lineage replay seeded
  at a single events.jsonl row. Includes `LineageDimension` union (5 members
  matching rule 10 §The 5 dimensions: when | atopWhich | throughWhich | byWhom
  | withWhat), `PropagationReplayNode` record, `isPropagationReplayPayload`
  guard. Re-exports `PropagationStep` symbols from `propagation-audit.ts`
  (sibling helper-types pattern; avoids circular dependency).

- `propagation-health.ts` (prim-data-20, DATA) — `PropagationHealthPayload`
  envelope `{score, perStepHealth, driftSignals, verdict, measuredAt}` reporting
  a continuous 0..1 chain-health score plus per-step scores and human-readable
  drift hints. `verdict` bucket policy (`healthy | drift-suspected | broken`)
  lives in the handler, not the schema. Re-exports `PropagationStep` symbols
  from `propagation-audit.ts`.

### Modified (additive)

- `primitives/index.ts` — Added 3 new barrel re-exports under the v1.34
  propagation-audit substrate section. `PropagationStep` is exported via the
  star re-export of `propagation-audit`; `propagation-replay` and
  `propagation-health` are added with explicit named exports to avoid ambient
  ambiguity (their files already re-export PropagationStep symbols).
- `package.json` — Added 3 new subpath exports + bumped version to 1.34.0
  + description prepended with v1.34 propagation-audit summary.

### Why MINOR

Purely additive: 3 new primitive files + 3 new subpath exports + barrel
extension. No removals or renames. Rule 08 MINOR policy applies. Existing
consumers pinned at `^1.33.0` continue to work untouched.

### Authority + provenance

- Plan: `~/.claude/plans/distributed-wishing-manatee.md` §Phase 1.
- Parent: `~/.claude/plans/cosmic-hatching-pizza.md` §W6 (substrate primitives).
- Sprint: `sprint-018-quick` (Quick Sprint contract, mode=quick, 1-iter).

---

## [1.33.0] — 2026-05-01

### Added — 3 ontology-promotion primitives (S3a sprint-018 — spicy-knitting-garden W5-A prep)

Additive MINOR. 3 new primitives promoted from palantir-math project-local types
to canonical schema surface, enabling W5-A consumer surface migration (S3b will
update palantir-math imports to reference `@palantirKC/claude-schemas/ontology/primitives/*`
rather than hand-authored types).

- `canvas-layout-stage.ts` (prim-data-16, DATA) — `CanvasLayoutStage = -2 | -1 | 0 | 1 | 2`
  linear layout stage axis for swipe-driven dual-canvas resizing. Includes
  `STAGE_LABELS: Readonly<Record<CanvasLayoutStage, string>>`, `StageWidths` interface
  (`primaryPct`, `secondPct`, `primaryDocked`, `secondDocked`), and signature stubs
  for `resolveStageWidths(stage)` + `clampStage(n)` (implementations stay in
  palantir-math/src/lib/canvasLayout.ts per W5-A migration plan).
  Promoted from `palantir-math/src/types/seq-data.ts:1540` + `src/lib/canvasLayout.ts:91-143`.

- `delegation-token.ts` (prim-action-06, ACTION) — `DelegationToken` interface with
  `DelegationTokenStatus` lifecycle (`pending | active | revoked | expired`),
  `DelegationCapability` scope union (5 affordance types), `DelegationTokenLifecycle`
  discriminated union for 4 state transition events (`grant | revoke | expire | accept`),
  and signature stubs for `resolveActiveDelegation` + `isDelegationPermitted`.
  Promoted from `palantir-math/src/lib/playbook/controlDelegation.ts:1-100`.

- `scene-coupling-v4.ts` (prim-data-17, DATA) — `SceneCouplingV4` 12-kind discriminated
  union (integral / derivative / zoom / mirror / independent / expression / tangent /
  perpendicular / reflection / mirrorpoint / intersection / curveintersection) with
  `SceneCouplingBase`, `FunctionSourceBinding`, `FunctionDependencyMode`, and 13 type
  guard functions (`isIntegralCoupling`, `isAxisShareCoupling`, etc.).
  Promoted from `palantir-math/src/types/seq-data.ts:1618-1778`.

### Modified (additive)

- `primitives/index.ts` — Added 3 new barrel re-exports under the v1.33
  ontology-promotion section.
- `package.json` — Added 3 new subpath exports + bumped version to 1.33.0
  + description updated with v1.33 summary.

### Migration notes

- Consumers (palantir-math) will migrate in S3b sprint to import from
  `@palantirKC/claude-schemas/ontology/primitives/{canvas-layout-stage,delegation-token,scene-coupling-v4}`
  rather than hand-authored types.
- `resolveStageWidths` and `clampStage` are declared as `declare function` stubs —
  consumers must supply their own implementation until S3b wires the shared-core
  re-export with runtime backing.
- `FunctionDependencyMode` and `FunctionSourceBinding` are re-declared in
  `scene-coupling-v4.ts` (not imported from palantir-math) to keep the primitive
  renderer-free and independently importable.

### Why MINOR

Purely additive: 3 new primitive files + 3 new subpath exports + barrel extension.
No removals or renames. Rule 08 MINOR policy applies. Existing consumers pinned at
`^1.32.0` continue to work untouched.

### Authority + provenance

- Sprint: `sprint-018` (S3a Ontology-Promotion, spicy-knitting-garden master plan).
- Contract: `/home/palantirkc/projects/palantir-math/.palantir-mini/harness/sprints/sprint-018/contract.json`.

---

## [1.32.0] — 2026-04-30

### Added — 3 BackProp loop closure primitives (sprint-006 Tier-B T2)

Additive MINOR. 3 new primitives + 3 new subpath exports closing the harness
BackPropagation substrate gap surfaced by sprint-005 evidence
(`learning_captured` topic `backprop-loop-automation-gap`, confidence 0.95):
1062 events with `learning_captured`=0, `sprint_completed`=0,
`failure_mode_synthesized`=0. Substrate existed but emitters were empty —
v1.32 ships the typed payload surface so the new palantir-mini v3.13.0 hooks
(sprint-terminal-detector / sprint-completed-learning-synthesizer /
analyzer-output-injector extension) can emit conformant envelopes.

- `failure-category.ts` (prim-data-13, DATA) — `FailureCategory` discriminated
  string-union with 6 members (`spec_misalignment` / `scope_overreach` /
  `threshold_too_strict` / `regression` / `rule_conformance_violation` /
  `unknown`). Includes runtime-readable `FAILURE_CATEGORIES` array +
  `isFailureCategory(s)` type guard.
- `sprint-completed.ts` (prim-data-14, DATA) — `SprintCompletedPayload`
  `{project, sprintNumber, contractId, verdict: passed|failed|timeout|aborted,
  iterationCount, bestScore, terminationCriteria: readonly string[]}`.
  Terminal-state transition for a SprintContract; emitted exactly once per
  contract close by `sprint-terminal-detector` PostToolUse hook.
- `failure-mode-synthesized.ts` (prim-data-15, DATA) —
  `FailureModeSynthesizedPayload {sprintNumber, iteration, failureCategory:
  FailureCategory, rootCauseHypothesis, suggestedPatchType?, smallestPatch?}`.
  Structured root-cause hypothesis tag emitted per iteration whose
  `analysis-NNN.md` carries a `§Failure category` section.

### Modified (additive)

- `primitives/index.ts` — Added 3 new barrel re-exports under the v1.32
  BackProp loop closure section.
- `package.json` — Added 3 new subpath exports + bumped version to 1.32.0
  + description prepended with v1.32 BackProp summary.

### Plugin sync (palantir-mini v3.13.0 — separate PR)

`lib/event-log/types.ts` gains 2 new envelope variants
(`SprintCompletedEnvelope` + `FailureModeSynthesizedEnvelope`),
EventEnvelope union extension, EventSnapshot counter additions
(`sprint_completed: number` + `failure_mode_synthesized: number`),
`fold-snapshot.ts` switch case extension, plus paired test in
`tests/lib/event-log/types.test.ts`. Plugin v3.13.0 PR pins
`compatibleSchemaVersions: ">=1.32.0 <2.0.0"`.

### Why MINOR

Purely additive: 3 new primitive files + 3 new subpath exports + plugin lib
union extension (also additive). No removals or renames. Rule 08 MINOR policy
applies. Existing consumers pinned at `^1.31.0` continue to work untouched.

### Authority + provenance

- Plan: `~/.claude/plans/tidy-stargazing-papert.md` §Confirmed Decisions
  Q1*-Q3 + §T2 task spec.
- Cold-start: `~/.claude/plans/2026-04-30-sprint-006-backprop-closure-coldstart.md`.
- Survey: `~/.claude/plans/2026-04-30-backprop-automation-survey.md`.

---

## [1.22.0] — 2026-04-23

### Added — research authority crosswalk for schema consumers

- `ontology/research-source-map.ts` — schema-local resolver that translates legacy `research/palantir/*` citations into the active split authority model:
  - `palantir-developers/` = builder-entry
  - `palantir-foundry/` = official fact
  - `palantir-vision/` = synthesis / interpretation
  - `_archive/2026-04-20-palantir-consolidation/` = explicit legacy bridge
- `ontology/research-authority.test.ts` — deterministic guardrail for:
  - entry files must not claim bare legacy `research/palantir/*` authority
  - domain `source:` strings must resolve through the schema-local crosswalk
  - representative legacy refs must map to the correct active or archive destination

### Changed

- `ontology/primitives/research-document.ts` now models research-layer semantics with `library`, `authorityClass`, `archived`, `supersededBy`, `canonicalRefs`, `migrationNote`, and `agentDirective`.
- `ontology/BROWSE.md`, `ontology/INDEX.md`, `ontology/semantics.ts`, and all 4 domain schema headers now describe schema as a downstream consumer of the split research SSoT instead of claiming the old monolithic `research/palantir/` authority.
- Root package exports now include `./ontology/research-source-map`.

### Why MINOR

Purely additive and contract-clarifying: one new exported module, one new deterministic test, and richer provenance metadata on an existing primitive. No removal or rename of existing import paths.

---

## [1.21.0] — 2026-04-23

### Added — 2 Wave 3 event types

- `semantic_drift_audited` (primaryDomain: learn) — graph-integrity audit result. Emitted by palantir-mini/bridge/handlers/semantic-drift-audit.ts.
- `diff_semantic_impact_computed` (primaryDomain: learn) — semantic superset of pre_sprint_diff_computed. Emitted by palantir-mini/bridge/handlers/diff-semantic-impact.ts.

### Why MINOR

Purely additive: 2 new event-type variants. No removal or rename. Per rule 08, additive → MINOR.

### References

- Plan: `~/.claude/plans/dapper-baking-treasure.md` §Wave 3
- Wave 2 event types (v1.20.0): `semantic_manifest_refreshed` + `semantic_change_plan_emitted`.

---

## [1.20.0] — 2026-04-23

### Added — SemanticRid primitive + 2 semantic-graph event types

**`ontology/primitives/semantic-rid.ts`** — new primitive for ontology-first semantic impact.

- `SemanticRid = string & { readonly __brand: "SemanticRid" }`
- `SemanticRidKind = "ontology" | "gen" | "runtime" | "eval" | "mon" | "doc" | "lineage" | "artifact" | "file"`
- `SemanticRidDeclaration { rid, kind, value, label?, registeredAt }`
- `SemanticRidRegistry` class with `register()`, `get()`, `listByKind()`, `list()`, `size()`, `clear()`
- Factory `semanticRid(kind, value)` + parser `parseSemanticRid(rid)`
- Global `SEMANTIC_RID_REGISTRY` singleton

`file:*` is demoted to evidence-only identity. Primary graph identity for Wave 2+ is `SemanticRid` across ontology, generated contracts, runtime surfaces, evals, monitoring scopes, docs, lineage events, and artifact versions.

**`ontology/lineage/event-types.ts`** — 2 new event-type variants:

- `semantic_manifest_refreshed` (primaryDomain: learn) — per-project semantic manifest persisted via `lib/semantic-graph/manifest-writer.ts`.
- `semantic_change_plan_emitted` (primaryDomain: learn) — `semantic_change_plan` MCP handler returned a plan to a caller.

### Consumer impact

- `palantir-mini` v2.6.0 ships the producers + `semantic_change_plan` MCP tool that consume this primitive.
- `palantir-math` + `mathcrew` — consumers will see the new `SharedCore.SemanticRid` export after `/palantir-mini:pm-codegen` refresh.
- Existing `ImpactEdge` primitive (prim-learn-12) — unchanged; continues to serve AST-evidence edges as Wave 2's `producer-ast-evidence` internal backbone.

### Why MINOR

Purely additive: new primitive file + 2 new event-type variants. No removal or rename of existing surface. Existing consumers on `^1.19.0` remain compatible — they will see the new exports but are not required to consume them. Per rule 08, additive primitive + event additions → MINOR bump.

### References

- Plan: `~/.claude/plans/dapper-baking-treasure.md` §Wave 2
- Proposal §L1 Semantic RID Model: `~/.claude/research/palantir-vision/synthesis/2026-04-23-palantir-mini-ontology-first-rebuild-proposal.md`

---

## [1.19.0] — 2026-04-23

### Added — 3 harness instrumentation events for palantir-mini v2.4.0

Register three new event types in `ontology/lineage/event-types.ts` so the palantir-mini v2.4.0 handler tranche can emit conformant lineage records without tripping event-registry drift:

- `chrome_ratio_measured` — emitted by `chrome_ratio_measure`; captures surface label, chrome/content percentages, and geometry breakdown metadata for viewport audits.
- `pre_sprint_diff_computed` — emitted by `pre_sprint_diff`; captures `base`, `head`, `changedRids`, and the forward-propagated downstream consumers derived from `impact_query`.
- `drift_gate_evaluated` — emitted by `gate_on_drift`; captures `gatePassed` and the list of `failedChecks` that blocked the next iteration.

### Consumer impact

- palantir-mini plugin v2.4.0 consumes these events directly. `compatibleSchemaVersions >=1.15.0 <2.0.0` remains valid because this is a purely additive MINOR bump.
- `~/ontology/shared-core/` unchanged — no new primitive re-export surface required.
- palantir-math / mathcrew / kosmos — untouched unless they inspect raw event-type registries.

### Why MINOR

This is an additive event-type surface change only. No existing names, payload semantics, or validators were removed or repurposed. Per rule 08, additive schema/event surface → MINOR bump.

---

## [1.17.0] — 2026-04-21

### Added — `object-type` + `link-type` sub-path exports (Track 2 G2 monorepo consolidation dependency)

Expand `exports` map to include v0.2 canonical primitives (`object-type`, `link-type`) as sub-path imports. These primitives existed in `ontology/primitives/` since v0.2 but were never added to `exports`, forcing `~/ontology/shared-core/index.ts` to use absolute `/home/palantirkc/...` paths to reach them. Track 2 G2 monorepo consolidation's `import_path_purity` hard-fail criterion requires workspace-isolated bare-import form.

- `./ontology/primitives/object-type` → `./ontology/primitives/object-type.ts`
- `./ontology/primitives/link-type` → `./ontology/primitives/link-type.ts`

### Consumer impact

- `~/ontology/shared-core/index.ts` — migrates all 35 `/home/palantirkc/.claude/schemas/ontology/primitives/<X>.ts` absolute paths to `@palantirKC/claude-schemas/ontology/primitives/<X>` bare-import form (see R13 in Track 2 G2 spec.md §3).
- palantir-mini plugin — untouched; additive exports surface. `compatibleSchemaVersions >=1.15.0 <2.0.0` still satisfied.
- palantir-math / mathcrew / kosmos — untouched at source; downstream consumers see shared-core re-exports unchanged.

### Authority + provenance

- Sprint Track 2 G2 resume prompt §2.B2 (`~/.claude/plans/2026-04-21-track-2-g2-resume-prompt.md`).
- Discovered in-flight during B2 resolution 2026-04-21 (resume prompt assumed kosmos-only; actual scope includes home-repo shared-core).

---

## [1.16.0] — 2026-04-21

### Added — 5 retire/deprecate/ultrareview lifecycle events (palantir-mini v2.1.0 substrate)

Preflight for the palantir-mini v2.1.0 harness slimdown bundle (4 DEPRECATE groups + 13 RETIRE items). Without these variants registered at the schemas layer, every tombstone emit would trip the PreCompact 5-dim conformance gate (rule 18 strict mode). Ships before v2.1.0 plugin PR so consumers can emit conformant events on tombstone rename.

- **`ontology/lineage/event-types.ts`** — EVENT_TYPE_NAMES + EVENT_TYPE_REGISTRY expanded 36 → 41 with 5 new entries (all `primaryDomain: "learn"`):
  - `skill_retired` — a palantir-mini plugin skill moved to `commands/.disabled/` tombstone; payload carries skill id + 30d invocation count + substitute.
  - `agent_retired` — a plugin agent moved to `agents/.disabled/` tombstone; payload carries agent name + 30d spawn count + substitute.
  - `primitive_deprecated` — an ontology primitive or MCP handler deprecated via `.disabled/` tombstone or `@deprecated` JSDoc; captures primitive id + deprecation mode + removal window.
  - `pedagogy_contract_resolved` — a PedagogyContract (v1.15 primitive) finished plug-in resolution; captures conceptId + bloomTarget + final SceneTree hash + CognitiveLoadConstraint warnings for BackwardProp replay.
  - `ultrareview_completed` — `pm-ultrareview` skill finished N parallel `claude -p` reviews; captures N + per-review weighted scores + consensus verdict. Fills the Decision Lineage gap in Anthropic's native `/ultrareview` command (session-scoped only; no events emit).

### Consumer impact

- palantir-mini plugin `compatibleSchemaVersions` remains `>=1.15.0 <2.0.0` — v1.16 is additive, no pin bump required. Plugin v2.1.0 bundle PR will emit these events from tombstone handlers.
- `~/ontology/shared-core/index.ts` — `SHARED_CORE_VERSION` bumped `1.2.0` → `1.3.0`. No re-exports added (event type names are not shared-core surface — consumers import from palantir-mini event-log layer directly).
- palantir-math / mathcrew / kosmos — untouched; additive event-type surface, pin compatibility preserved.

### Authority + provenance

- `~/.claude/plans/2026-04-20-next-session-execute-prompt.md` §3 — Phase D T1 specification.
- `~/.claude/plans/2026-04-20-solo-dev-direction.md` §C.5 T1 — DELETE/ADD/KEEP/VERIFY contract for this PR.
- `~/.claude/rules/18-events-5d-conformance.md` — 5-dim gate contract that this preflight unblocks.

### Why MINOR

All changes are additive: 5 new EVENT_TYPE_NAMES entries + 5 new EVENT_TYPE_REGISTRY entries. No existing types renamed, removed, or repurposed. Consumers pinned at `^1.15.0` (inclusive of `1.15.0 ≤ x < 2.0.0`) continue to work untouched. Per rule 08, additive event-type surface → MINOR bump.

---

## [1.15.0] — 2026-04-20

### Added — PedagogyContract primitive (mathcrew H4 Sprint 2)

- **`ontology/primitives/pedagogy-contract.ts`** (LEARN, `prim-learn-12`) — Composable pedagogy plug-in framework promoted from mathcrew project-local `ontology/pedagogy.ts`. Declares `PedagogyContract` (conceptId + bloomTarget + pedagogies[] + cognitiveLoad), `PedagogyApplication` (id + role + params), `PedagogyParams` discriminated union over 4 PedagogyId variants (cpa / productive-failure / constructionism / variation-theory), plus CognitiveLoadConstraint meta-audit shape. Provenance: CPA = Bruner (1966) → Singapore Math; PF = Kapur (2008-2024); Constructionism = Papert (1980); VT = Marton; Bloom = Anderson & Krathwohl (CLASSIFICATION axis only); CLT = Sweller (META-CONSTRAINT only). Registry mirrors HARNESS_AGENT_REGISTRY pattern (in-memory, consumer-populated at startup).

### Added — feedback_loop_closed event type split (H3 D4 fix)

- **`ontology/primitives/feedback-loop-closed.ts`** (DATA, `prim-data-09`) — Declares `FeedbackLoopClosedPayload` + `FeedbackLoopClosedTerminationCondition` so the terminal-state transition has its own schema. Cleaner Decision Lineage: "when did this loop open" = filter by `feedback_loop_opened`; "when did it close" = filter by `feedback_loop_closed`. Replaces the v1.14 pattern of overloading FeedbackLoopOpenedEnvelope with `payload.transition: "close"`.
- **`ontology/lineage/event-types.ts`** — EVENT_TYPE_NAMES + EVENT_TYPE_REGISTRY expanded 35 → 36; new `feedback_loop_closed` entry (primaryDomain: logic).

### Deprecated — one MINOR cycle (removal in v1.16)

- Producers SHOULD emit `feedback_loop_closed` instead of `feedback_loop_opened` with `payload.transition: "close"`.
- Consumers SHOULD accept BOTH variants during v1.15. `FeedbackLoopOpenedEnvelope` retains optional `transition` / `verdict` / `terminationCondition` fields for backward compatibility.
- v1.16 will remove the deprecated overload fields.

### Consumer impact

- palantir-mini plugin bumps `compatibleSchemaVersions` `>=1.14.0 <2.0.0` → `>=1.15.0 <2.0.0` (v2.0.2 PATCH). `close-feedback-loop.ts` handler emits `feedback_loop_closed` (new type) instead of `feedback_loop_opened` with transition overload. EventSnapshot fold + switch gain a new counter (exhaustive union coverage preserved).
- mathcrew bumps peerDep to `>=1.15.0 <2.0.0` (Sprint 2 P1); project-local `ontology/pedagogy.ts` becomes a thin re-export.
- shared-core (`~/ontology/shared-core/`) bumps version 1.1.0 → 1.2.0 and re-exports `pedagogy-contract` + `feedback-loop-closed`.
- palantir-math / kosmos — untouched; additive surface, pin compatibility preserved.

### Authority + provenance

- `research/palantir-vision/synthesis/2026-04-20-mathcrew-redesign-research.md` §Topic 2 — PedagogyContract framework spec.
- `research/claude-code/harness-h3-retrospective.md` §D4 — feedback_loop_closed split rationale.

### Why MINOR

All changes are additive: 2 new primitive files, 1 new event type, 2 new subpath exports, deprecation notice on existing `FeedbackLoopOpenedEnvelope` (fields retained). Consumers pinned at `^1.14.0` (inclusive of `1.14.0 ≤ x < 2.0.0`) continue to work untouched; those that don't import the new primitives remain untouched. Per rule 08, additive primitive surface → MINOR bump.

---

## [1.14.0] — 2026-04-20

### Added — 5 harness primitives + 6 lifecycle events (palantir-mini v2.0 substrate)
v1.14.0 lands the ontology substrate for the 3-agent harness (Planner / Generator / Evaluator + Orchestrator + AIP Evals 4-grader specializations) that palantir-mini v2.0 will consume as its runtime layer. Purely additive — consumer projects (kosmos, palantir-math, mathcrew, palantir-mini v1.6.x) pinned at `^1.13.0` continue to work; plugin `compatibleSchemaVersions` range `>=1.13.0 <2.0.0` covers this bump.

Design rationale: merges Prithvi Rajasekaran's Anthropic Labs harness pattern (3-agent GAN-inspired separation; research/claude-code/features.md §26) with Palantir AIP Evals 5-evaluator taxonomy (research/palantir-foundry/aip/aip-evals-*.md, 10 verbatim official docs) so that Prithvi's 4-criteria frontend rubric (Design / Originality / Craft / Functionality) is recoverable as one domain-specific instance of a GradingRubric assembled from GradingCriterion primitives, while 3D-scene / ontology-audit / teaching / backend rubrics compose from the same primitive.

- **5 new primitive files** under `ontology/primitives/`:
  - `harness-agent.ts` (LEARN, `prim-learn-11`) — HarnessAgentRid + HarnessAgentRole (8 roles: planner/generator/evaluator/orchestrator/grader_code/grader_rule/grader_model/grader_human) + HarnessAgentPhase + HarnessAgentDeclaration + registry. Binds agent .md frontmatter semantics to an ontology primitive so the phase-gate (SubagentStop) + model-SoT (Lead Protocol v2 §Model policy) + output-contract validation surfaces have a shared type.
  - `sprint-contract.ts` (ACTION, `prim-action-05`) — SprintContractRid + FeatureSpecRef + HardThresholdPolicy (per-criterion floors + overall ceiling) + SprintContractDeclaration + registry. File-based Generator↔Evaluator agreement defining "what done looks like"; mirrors Palantir Two-Tier Action (Tier-2 function-backed). Status state machine: drafting → negotiating → bound (frozen) → aborted.
  - `feedback-loop.ts` (LOGIC, `prim-logic-04`) — FeedbackLoopRid + FeedbackLoopState (7-state machine: negotiating / generating / evaluating / feedback / passed / failed / aborted) + TerminationCondition + FeedbackLoopDeclaration + registry. Tracks Generator↔Evaluator iteration loop for a bound SprintContract; iteration cap 5-15 per Prithvi's paper.
  - `grading-criterion.ts` (DATA, `prim-data-08`) — GradingCriterionRid + RubricDomain (5: code/rule/model/human/hybrid — AIP Evals 5-evaluator) + CriterionApplicability (9-domain scope) + PassFailLogic + GradingCriterionDeclaration + registry. Composable atom — rubrics are ordered Set<GradingCriterion> with sum(weightInRubric)=1.0.
  - `playwright-scenario.ts` (LEARN, `prim-learn-04`) — PlaywrightScenarioRid + 17 PlaywrightStepKind + PlaywrightStep + EvidenceCaptureSpec + PlaywrightMcpBinding (mcp__playwright__* | mcp__claude-in-chrome__*) + PlaywrightScenarioDeclaration + registry. Live-app browser automation scenario — Evaluator substrate for evidence-based QA.

- **`ontology/primitives/index.ts`** — barrel updated to v1.14.0, re-exports all 5 new primitives; inventory comment now lists 26 files (21 → 26).

- **EVENT_TYPE_REGISTRY expanded 29→35** in `ontology/lineage/event-types.ts`:
  - `harness_agent_spawned` (LEARN)
  - `sprint_contract_negotiated` (ACTION)
  - `sprint_contract_bound` (ACTION)
  - `feedback_loop_opened` (LOGIC)
  - `playwright_scenario_executed` (LEARN)
  - `grading_completed` (LEARN)

- **New `package.json` subpath exports** — 5 new entries (one per harness primitive) under `./ontology/primitives/*`.

- **`~/ontology/shared-core/index.ts`** — 5 harness primitive re-exports added; `SHARED_CORE_VERSION` bumped `1.0.0` → `1.1.0`.

### Authority + provenance
- Primary synthesis: Prithvi Rajasekaran (Anthropic Labs) — https://www.anthropic.com/engineering/harness-design-long-running-apps (referenced via research/claude-code/features.md + features.md §Managed Agents)
- AIP Evals alignment: research/palantir-foundry/aip/aip-evals-*.md (10 files, 2026-04-20 fetch)
- Lead Protocol v2 integration: research/claude-code/lead-system-v2.md §3 (frontmatter spec), §5 (protocol principles)
- Managed Agents Session/Harness/Sandbox mirroring: research/palantir-vision/synthesis/2026-04-20-managed-agents-harness-mapping.md (closes gap #1 — "No Outcomes-style grader loop")

### Why MINOR
All changes are additive: new primitive files, new event types, new subpath exports. No existing type shapes renamed, no existing semantics changed, no validator behavior altered. Consumers pinned at `^1.13.0` (inclusive of `1.13.0 ≤ x < 2.0.0`) gain access to new primitives by import; those that don't import remain untouched. Per rule 08 (`~/.claude/rules/08-schema-versioning.md`), additive primitive surface → MINOR bump.

### Consumer impact
- palantir-mini plugin (`compatibleSchemaVersions >=1.13.0 <2.0.0`) — compatible, no version pin update required. Phase H2 consumes this surface via 5 new MCP handlers + 6 new agents.
- Downstream repos (kosmos, palantir-math, mathcrew) — additive, no migration needed. mathcrew ontology refactor (Phase H4) will adopt these primitives.

---

## [1.13.1] — 2026-04-19

### Changed — ontology/project-validator.ts file-structure refactor (D2, steward-splits)
Split 1265-LOC `ontology/project-validator.ts` into 8 sub-files under
`ontology/project-validator/` plus a barrel. Externally additive: all prior
exports reachable through the unchanged `ontology/project-validator.ts`
barrel; consumer imports continue to resolve.

- **New subfolder** `ontology/project-validator/` containing:
  - `pv-01-naming.ts` (~81 LOC) — `validateNaming`,
    `RESERVED_FRONTEND_ACTION_PREFIXES`, `isReservedFrontendAction`
  - `pv-02-referential.ts` (~118 LOC) — `validateReferentialIntegrity`
  - `pv-03-hc-compliance.ts` (~58 LOC) — `validateHcCompliance`
  - `pv-04-structural.ts` (~72 LOC) — `validateStructuralCompleteness`
  - `pv-05-propagation.ts` (~80 LOC) — `validatePropagationGraph`
  - `pv-07-frontend.ts` (~116 LOC) — `validateFrontendOntology`
  - `pv-08-runtime.ts` (~165 LOC) — `validateRuntimeOntology`
  - `pv-runner.ts` (~609 LOC) — `runProjectValidation` orchestrator +
    `validateProjectOntology` (no-test structured-report API; contains
    inline PV-01..07 + PV-06 security checks)
  - `index.ts` — subfolder barrel
- **`ontology/project-validator.ts`** rewritten as 52-line re-export barrel.
- Each PV-0X sub-file is ≤ 200 LOC per task spec; `pv-runner.ts` exceeds
  the target because it houses the non-test `validateProjectOntology`
  inline form (duplicated logic for PV-01..07 + PV-06). Future work may
  collapse this duplication by sharing the per-PV helpers.

### Changed — ontology/semantic-audit.ts file-structure refactor (D3, steward-splits)
Split 1153-LOC `ontology/semantic-audit.ts` into 3 sub-files under
`ontology/semantic-audit/` plus a barrel. Externally additive: all prior
exports reachable through the unchanged `ontology/semantic-audit.ts`
barrel; consumer imports (`from "./semantic-audit"`) continue to resolve.

- **New subfolder** `ontology/semantic-audit/` containing:
  - `sa-types.ts` (~70 LOC) — `CoverageLevel`, `UpgradePriority`,
    `EvidenceKind`, `SectionAudit`, `UpgradeSpec`, `SemanticAuditReport`
  - `sa-core.ts` (~1046 LOC) — `auditSemantics(exports)` monolith kept
    intact. Walks all 32 SA sections, computes maturity stage, builds
    upgrade specs. Deeper per-axis split (twin layers / HRP / LEARN /
    security / infrastructure / frontend-runtime) is deferred because
    the sections share local computations (e.g. `learnActive`,
    `toolExposedFns`) that would otherwise need a shared `AuditContext`
    refactor — flagged as a follow-up.
  - `sa-runner.ts` (~56 LOC) — `runSemanticAudit(exports)` bun:test
    driver
  - `index.ts` — subfolder barrel (parent barrel is still canonical)
- **`ontology/semantic-audit.ts`** rewritten as 32-line re-export barrel.
- **Note**: `sa-core.ts` exceeds the 700-LOC target. Deferring the deeper
  per-axis refactor preserves behavior parity and keeps this PR scoped
  to a safe structural split. Future work: extract `AuditContext` +
  per-axis section builders (`auditTwinLayers(ctx)`, `auditHrp(ctx)`,
  `auditLearn(ctx)`, `auditSecurity(ctx)`, `auditInfrastructure(ctx)`,
  `auditFrontendRuntime(ctx)`) returning `SectionAudit[]`, composed by
  `auditSemantics` orchestrator.

### Changed — ontology/types.ts file-structure refactor (D4, steward-splits)
Split 894-LOC `ontology/types.ts` into 6 sub-files under `ontology/types/`
matching the six primitive families. Externally additive: all prior exports
remain reachable through the unchanged `ontology/types.ts` barrel; consumer
imports (`from "../types"`) continue to resolve.

- **New subfolder** `ontology/types/` containing:
  - `types-core.ts` (~242 LOC) — test infrastructure (TestResult,
    DomainGateResult), shared enums/unions (OntologyDomain,
    OntologyPropertyType, BasePropertyType, LinkCardinality, MutationType,
    QueryType, FunctionCategory, AutonomyLevel, PermissionModel,
    MarkingType, CrudOperation, ImplementationStatus, etc.), StructuralRule,
    BilingualDesc, ValueConstraint, PropagationEdge/Graph, SemanticIssue,
    VALID_PK_TYPES / VALID_BASE_TYPES / SPECIAL_TYPES
  - `types-data.ts` (~148 LOC) — DATA entity shapes (Property, ObjectType,
    ValueType, StructType, SharedPropertyType, geo/temporal/vector/cipher,
    DerivedProperty, OntologyData)
  - `types-logic.ts` (~88 LOC) — LOGIC shapes (LinkType, OntologyInterface,
    OntologyQuery, Parameter, OntologyFunction, OntologyLogic)
  - `types-action.ts` (~76 LOC) — ACTION shapes (OntologyMutation, Webhook,
    Automation, OntologyAction)
  - `types-security.ts` (~80 LOC) — SECURITY shapes (Role, Marking,
    RLSPolicy, CLSPolicy, Object/PropertySecurityPolicy, OntologySecurity)
  - `types-learn.ts` (~325 LOC) — HookEventSchema, LearnInfrastructure,
    BackendOntology, FrontendOntology (views, agent surfaces, scenario
    flows), RuntimeOntology (source/write/review/transaction/audit/support/
    view bindings), ProjectOntologyScope, OntologyExports
  - `index.ts` — subfolder barrel (parent barrel is still canonical)
- **`ontology/types.ts`** rewritten as 30-line star-re-export barrel.
- All cross-file imports resolve at load time via explicit per-file `import
  type` declarations; no implicit global scope relied on.

### Changed — ontology/semantics.ts file-structure refactor (D1, steward-splits)
Split 3549-LOC `ontology/semantics.ts` into 6 sub-files under `ontology/semantics/`
to bring the module under the per-file complexity budget. Externally additive:
all prior exports remain reachable through the unchanged `ontology/semantics.ts`
barrel (consumers keep `from "../semantics"` imports; package export map
`./ontology/semantics` resolves to the same file).

- **New subfolder** `ontology/semantics/` containing:
  - `semantics-core.ts` (~495 LOC) — terminology charter, base types,
    heuristics, transitions, `DOMAIN_SEMANTICS`, `DIGITAL_TWIN_LOOP`,
    `CONCEPT_OWNER`, `CONSISTENCY_INVARIANTS`
  - `semantics-security.ts` (~72 LOC) — `SECURITY_OVERLAY` + overlay type
  - `semantics-data.ts` (~172 LOC) — `DATA_SEMANTICS`
  - `semantics-logic.ts` (~174 LOC) — `LOGIC_SEMANTICS`
  - `semantics-action.ts` (~172 LOC) — `ACTION_SEMANTICS`
  - `semantics-learn.ts` (~2524 LOC) — philosophy meta-layer, LEARN
    mechanisms, twin fidelity/maturity, evaluation taxonomy, LEARN
    evaluation surfaces, workflow lineage, Ontology MCP, scenarios,
    platform boundary, orchestration map, governance surfaces
  - `index.ts` — subfolder barrel (parent barrel is still canonical)
- **`ontology/semantics.ts`** rewritten as 32-line star-re-export barrel.
- **No semantic change**: identical export surface, identical constant
  values, identical `SCHEMA_VERSION = "1.12.0"`.
- **Note**: `semantics-learn.ts` exceeds the 700-LOC target because the
  task spec fixes the file count at 6 and learn-axis cross-references are
  best kept co-located. A future MAJOR may split it further
  (learn-philosophy / learn-governance / learn-ops).

### Why PATCH
Pure file-structure refactor — no added, removed, or renamed exports.
ForwardProp chain (~/.claude/schemas/ → ~/ontology/shared-core/ → consumers)
unaffected; barrel import paths preserved. Per rule 08, structural
refactors with identical public surface are PATCH.

---

## [1.13.0] — 2026-04-19

### Added — governance primitive surface (palantir-mini v1.3 substrate)
v1.13.0 lands the 12-primitive governance surface that palantir-mini v1.3 needs for
Context Engineering (impact queries), BackwardProp closure, schema-pin verification,
dead-code reaping, file-budget audits, managed-settings drift detection, and doc-drift
tracking. Purely additive — all pre-existing exports, type shapes, and semantics are
preserved.

- **12 new primitive files** under `ontology/primitives/`:
  - `research-document.ts` (LEARN) — ResearchDocumentRid + declaration + registry
  - `memory-index-entry.ts` (LEARN) — MEMORY.md index-line primitive
  - `claude-code-version.ts` (LEARN) — runtime version pin primitive
  - `hook-event-allowlist.ts` (LEARN) — which events a hook may observe
  - `plugin-manifest.ts` (LEARN) — typed plugin.json mirror
  - `project-schema-pin.ts` (LEARN) — rule 08 pin-verification substrate
  - `file-complexity-budget.ts` (LEARN) — per-path line/symbol budgets (+ 3 default budgets)
  - `dead-code-marker.ts` (LEARN) — gated/@deprecated tracking with reapableAfter
  - `lineage-conformance-policy.ts` (LEARN) — 5-dim requirement policy (+ DEFAULT_POLICY + SESSION_STARTED_POLICY)
  - `managed-settings-fragment.ts` (LEARN) — typed RBAC fragment + drift audit
  - `codegen-header-contract.ts` (LEARN) — rule 11 header contract (+ DEFAULT_CONTRACT)
  - `impact-edge.ts` (LEARN, **CRITICAL**) — Context Engineering graph substrate with O(1) forward/backward + walkTransitive
- **`ontology/primitives/index.ts`** — new barrel re-exporting all 21 primitive files
- **EVENT_TYPE_REGISTRY expanded 16→20** in `ontology/lineage/event-types.ts`:
  `doc_drift_detected`, `refinement_proposed`, `review_decision`, `impact_edge_registered`
  (all LEARN domain)
- **`BACKWARD_PROP_V1`** in `ontology/policies/propagation.ts` — closes the two V0
  non-durable gaps (refinement persistence + ontologist review as LEARN event)
  via the new `refinement_proposed` + `review_decision` events. Exported
  `BACKWARD_PROP_V1_EMISSIONS` declares the emission contract for each event.
  `BACKWARD_PROP_V0` is retained and tagged `@deprecated` for back-compat.
- **New `package.json` subpath exports** — 13 new entries (barrel + 12 individual
  primitive paths)
- **Root `index.ts`** re-exports all 12 new primitives alongside the v1.0 set

### Rationale
- Palantir-mini v1.3 consumes this surface for `impact_query`, `audit_events_5d_conformance`,
  `verify_schema_pin`, `scan_file_size_violations`, `scan_dead_code`,
  `validate_managed_settings_fragments`, `verify_codegen_headers`, and `detect_doc_drift`
  MCP handlers. Without these primitives the handlers would need ad-hoc type shapes.
- Context Engineering (`impact-edge.ts`) is load-bearing: the whole "if I edit X, what
  propagates?" question becomes a deterministic graph walk instead of grep + intuition.
- BackwardProp V1 formalises that refinements and reviews ARE lineage, not a parallel
  inbox-only log — keeps the events.jsonl substrate authoritative.

### Per-Axis Delta (v1.0.0 → v1.13.0)
| Axis | v1.0.0 | v1.13.0 | Delta |
|------|--------|---------|-------|
| ontology/types.ts | 1.12.0 | 1.12.0 (unchanged) | primitives surface extended separately |
| ontology/primitives/ | 14 files | 21 files (+barrel) | +12 primitives +1 barrel |
| ontology/lineage/event-types | 16 events | 20 events | +4 LEARN events |
| ontology/policies/propagation | V0 only | V0 (@deprecated) + V1 + emissions | BackwardProp closed |
| interaction | 0.1.2 | 0.1.2 | unchanged |
| meta | 0.1.0 | 0.1.0 | unchanged |
| rendering | 0.1.0 | 0.1.0 | unchanged |
| root package | 1.0.0 | 1.13.0 | MINOR bump (additive) |

### Consumer impact
- Additive-only — consumers pinned at `^1.0.0` continue to work untouched.
- Consumers that want the new surface should import from
  `@palantirKC/claude-schemas/ontology/primitives` (barrel) or an explicit
  per-primitive subpath. No peerDep pin change required for access.

---

## [1.0.0] — 2026-04-17

### Major Version Signal
v1.0.0 introduces the canonical primitive surface under `ontology/primitives/`. This is
a major version bump to signal a stable, enumerable primitive API for consumer projects
and the home shared-core layer (W3). Zero actual breaking changes — all v0.2.x exports
are preserved. Existing consumer peerDependency pins at `0.2.1` continue to work until
explicitly migrated to `1.0.0` in W5.

### Added
- **9 new primitive files** under `ontology/primitives/`:
  - `struct.ts` (DATA) — StructRid + StructDeclaration + StructRegistry
  - `value-type.ts` (DATA) — ValueTypeRid + ValueTypeDeclaration + ValueTypeRegistry + BaseScalarType
  - `shared-property-type.ts` (DATA) — SharedPropertyTypeRid + SharedPropertyTypeDeclaration + SharedPropertyTypeRegistry
  - `capability-token.ts` (SECURITY L2) — CapabilityTokenRid + CapabilityTokenDeclaration + CapabilityTokenRegistry
  - `marking-declaration.ts` (SECURITY L2/L3) — MarkingRid + MarkingDeclaration + MarkingDeclarationRegistry
  - `automation-declaration.ts` (ACTION) — AutomationRid + AutomationDeclaration + AutomationDeclarationRegistry
  - `webhook-declaration.ts` (ACTION) — WebhookRid + WebhookDeclaration + WebhookDeclarationRegistry
  - `scenario-sandbox.ts` (LEARN) — ScenarioRid + ScenarioSandboxDeclaration + ScenarioSandboxRegistry
  - `aip-logic-function.ts` (LOGIC) — AIPLogicFunctionRid + AIPLogicFunctionDeclaration + AIPLogicFunctionRegistry
- **EVENT_TYPE_REGISTRY expanded 10→16** in `ontology/lineage/event-types.ts`:
  `ontology_registered`, `capability_token_issued`, `schema_locked`, `scenario_created`, `pr_body_generated`, `session_complete`
- **New primitive subpath exports** in `package.json` — 9 new `./ontology/primitives/*` export entries
- **Root `index.ts`** re-exports all 9 new primitives under the `Ontology` namespace
- **`breaking-changes`** note in `package.json` clarifying the major version signal

### Per-Axis Delta (v0.2.1 → v1.0.0)
| Axis | v0.2.1 | v1.0.0 | Delta |
|------|--------|--------|-------|
| ontology/types.ts | 1.12.0 | 1.12.0 (unchanged) | primitives/ surface added separately |
| ontology/primitives/ | 5 files | 14 files | +9 new files |
| ontology/lineage/event-types | 10 events | 16 events | +6 events |
| interaction | 0.1.2 | 0.1.2 | unchanged |
| meta | 0.1.0 | 0.1.0 | unchanged |
| rendering | 0.1.0 | 0.1.0 | unchanged |
| root package | 0.2.1 | 1.0.0 | major bump |

---

## [0.2.1] — 2026-04-17

### Added

- **Extended `exports` map** in `package.json` — explicit subpath exports for `./ontology/types`, `./rendering/types`, `./interaction/types`, `./meta/types`, and semantics/helpers entrypoints. Lets consumer projects import from either the axis shortcut (`@palantirKC/claude-schemas/ontology`) or the explicit types path (`@palantirKC/claude-schemas/ontology/types`) without needing to restructure existing import sites.
- **Root `index.ts`** — namespaced re-exports (`Ontology`, `Rendering`, `Interaction`, `Meta`) for consumers that want a single import surface.
- **Public `README.md`** — consumer pin reference, OSDK-style distribution rationale, install instructions.
- **`repository` field** in `package.json` pointing at the GitHub repo.
- Dropped `"private": true` — the schemas repo (`park-kyungchan/claude-schemas`) is the public distribution channel consumed via git-URL peerDeps.

### Notes

- v0.2.1 is purely additive. Zero changes to type definitions, semantics, validators, or codegen.
- Consumer projects (kosmos, palantir-math, mathcrew) bumped their peerDep pin from `v0.2.0` → `v0.2.1` in the same rollout to gain the extended exports.

---

## [0.2.0] — 2026-04-17

### Added (Universalization additive metadata layer)

- **Root `package.json`** — declares `@palantirKC/claude-schemas` v0.2.0 with per-axis exports, engine pins, and compatibleConsumers map.
- **Root `CHANGELOG.md`** — this file; aggregates per-axis history.
- **Root `.manifest.json`** — machine-readable axis + version registry for consumer pinning and `pm-verify` compatibility checks.
- **`interaction/index.ts`** — unified entrypoint exporting types, semantics, validator.
- **`meta/index.ts`** — unified entrypoint exporting types.
- **`rendering/index.ts`** — unified entrypoint exporting types + semantics.
- **`ontology/codegen/manifest.ts`** — structured generator manifest (generator id, inputs, outputs, version) for codegen consumers.

### Notes

- v0.2.0 is **purely additive metadata**. Zero changes to existing type definitions, validators, or codegen.
- No version bump to ontology axis (remains at 1.12.0 per its own CHANGELOG).
- Consumer projects pin `@palantirKC/claude-schemas@0.2.x` via `peerDependencies` per rule 08.

---

## Per-Axis Version Matrix (as of 0.2.0)

| Axis | Version | Source |
|------|---------|--------|
| ontology | 1.12.0 | `ontology/CHANGELOG.md` + `ontology/semantics.ts` |
| interaction | 0.1.2 | `interaction/types.ts` + `.manifest.json` |
| meta | 0.1.0 | `meta/types.ts` |
| rendering | 0.1.0 | `rendering/types.ts` + `rendering/semantics.ts` |
| **root** | **0.2.0** | **this file + package.json** |

---

## [0.1.x] — pre-universalization baseline

Per-axis work accumulated before this root aggregator existed. See each axis's own CHANGELOG or `git log` for detailed history.
