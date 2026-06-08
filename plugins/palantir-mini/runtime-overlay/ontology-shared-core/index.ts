/**
 * @stable — shared-core ontology namespace (v1.0.0)
 *
 * Single import surface for per-project ontology/. ForwardProp authority chain:
 *   ~/.claude/schemas/ontology/primitives/   (v1.0 canonical source)
 *       ↓
 *   ~/ontology/shared-core/index.ts          (this file — home-repo shared core)
 *       ↓
 *   ~/palantir-math/ontology/  and  ~/mathcrew/ontology/
 *
 * Per-project consumers import SharedCore.* instead of importing directly from
 * ~/.claude/schemas. This makes the home-repo the authority layer between the
 * schema package and per-project namespaces, repairing the broken ForwardProp
 * chain (OBS-05, WMO-031). See ~/UNIVERSALIZATION.md for migration guide.
 *
 * D/L/A domain: LOGIC (re-export / traversal namespace — apply SH-01:
 * "delete this file, do objects still describe reality?" YES → LOGIC)
 */

// --- v0.2 primitives ---

export type {
  ObjectTypeRid,
  ObjectTypeDeclaration,
  ObjectTypeRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/object-type";

export {
  objectTypeRid,
  OBJECT_TYPE_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/object-type";

export type {
  LinkTypeRid,
  LinkTypeDeclaration,
  PlainLinkTypeDeclaration,
  ObjectBackedLinkTypeDeclaration,
  Cardinality,
  LinkTypeRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/link-type";

export {
  linkTypeRid,
  LINK_TYPE_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/link-type";

// --- v1.0 additive primitives ---

export type {
  StructRid,
  StructDeclaration,
  StructFieldDeclaration,
  StructRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/struct";

export { structRid, STRUCT_REGISTRY } from "@palantirKC/claude-schemas/ontology/primitives/struct";

export type {
  ValueTypeRid,
  ValueTypeDeclaration,
  ValueTypeConstraint,
  BaseScalarType,
  ValueTypeRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/value-type";

export {
  valueTypeRid,
  VALUE_TYPE_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/value-type";

export type {
  SharedPropertyTypeRid,
  SharedPropertyTypeDeclaration,
  SharedPropertyFieldDeclaration,
  SharedPropertyTypeRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/shared-property-type";

export {
  sharedPropertyTypeRid,
  SHARED_PROPERTY_TYPE_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/shared-property-type";

export type {
  CapabilityTokenRid,
  CapabilityTokenDeclaration,
  CapabilityTokenRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/capability-token";

export {
  capabilityTokenRid,
  CAPABILITY_TOKEN_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/capability-token";

export type {
  MarkingRid,
  MarkingDeclaration,
  SensitivityLevel,
  MarkingDeclarationRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/marking-declaration";

export {
  markingRid,
  MARKING_DECLARATION_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/marking-declaration";

export type {
  AutomationRid,
  AutomationDeclaration,
  AutomationDeclarationRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/automation-declaration";

export {
  automationRid,
  AUTOMATION_DECLARATION_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/automation-declaration";

export type {
  WebhookRid,
  WebhookDeclaration,
  WebhookDeclarationRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/webhook-declaration";

export {
  webhookRid,
  WEBHOOK_DECLARATION_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/webhook-declaration";

export type {
  ScenarioRid,
  ScenarioSandboxDeclaration,
  ScenarioIsolation,
  ScenarioSandboxRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/scenario-sandbox";

export {
  scenarioRid,
  SCENARIO_SANDBOX_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/scenario-sandbox";

export type {
  AIPLogicFunctionRid,
  AIPLogicFunctionDeclaration,
  AIPLogicFunctionRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/aip-logic-function";

export {
  aipLogicFunctionRid,
  AIP_LOGIC_FUNCTION_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/aip-logic-function";

// --- home-specific primitives ---

export type {
  TeammateRid,
  TeammateRole,
  CrossProjectTeammateDeclaration,
  CrossProjectTeammateRegistry,
} from "./cross-project-teammate";

export { teammateRid, CROSS_PROJECT_TEAMMATE_REGISTRY } from "./cross-project-teammate";

export type {
  WaveId,
  WaveNumber,
  WaveStatus,
  CoordinatedPRWaveDeclaration,
  CoordinatedPRWaveRegistry,
} from "./coordinated-pr-wave";

export { waveId, COORDINATED_PR_WAVE_REGISTRY } from "./coordinated-pr-wave";

// --- v1.14 harness primitives (home-consumed) ---
// Prithvi Rajasekaran 3-agent harness + AIP Evals 5-evaluator pattern.
// palantir-mini v2.0 substrate for cross-project harness orchestration.

export type {
  HarnessAgentRid,
  HarnessAgentRole,
  HarnessAgentPhase,
  HarnessAgentModel,
  HarnessAgentBinding,
  HarnessAgentDeclaration,
  HarnessAgentRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/harness-agent";

export {
  harnessAgentRid,
  HARNESS_AGENT_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/harness-agent";

export type {
  SprintContractRid,
  SprintContractStatus,
  DisagreementResolution,
  FeatureSpecRef,
  HardThresholdPolicy,
  SprintContractDeclaration,
  SprintContractRegistry,
  // v1.48.0 (sprint-060 W1.13) — back-compat alias narrowing DispatchContract
  // discriminated union to species-5 (palantir-mini-sprint-harness).
  SprintContract,
} from "@palantirKC/claude-schemas/ontology/primitives/sprint-contract";

export {
  sprintContractRid,
  SPRINT_CONTRACT_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/sprint-contract";

// --- v1.50 sprint-060 W2.1 — HarnessSpeciesEnum primitive (R1-F4) ---
// Schema v1.50.0 (2026-05-09). Promotes the 7-species `HarnessSpeciesId`
// literal union from a `dispatch-contract`-local declaration to a
// stand-alone canonical primitive. Closes architecture review §3.4 R1-F4
// (Minor): species inventory was duplicated across 3 surfaces with no
// single SSoT primitive.
//
// Cross-species dispatch consumers (palantir-mini bridge handlers
// dispatch-route-decide / pm-dispatch-cost-estimate / negotiate-dispatch-
// contract Wave-N) can now import HarnessSpeciesId + HARNESS_SPECIES_IDS +
// HARNESS_SPECIES_DESCRIPTIONS + isHarnessSpeciesId from a single typed
// canonical source. Existing `dispatch-contract` consumers unaffected —
// dispatch-contract.ts re-exports HarnessSpeciesId for back-compat.
//
// Cross-refs: rule 16 v4.1.0 §0 (predecessor 5-species governance),
// rule 24 v1.1.0 §Dispatch flowchart step 1, CONTEXT.md §15 (canonical
// 7-species enumeration). Authority chain: research -> schemas -> shared-core.
export type { HarnessSpeciesId } from "@palantirKC/claude-schemas/ontology/primitives/harness-species-enum";
export {
  HARNESS_SPECIES_IDS,
  HARNESS_SPECIES_DESCRIPTIONS,
  isHarnessSpeciesId,
} from "@palantirKC/claude-schemas/ontology/primitives/harness-species-enum";

// --- v1.48 sprint-060 W1.13 — DispatchContract abstract superclass ---
// Promotes SprintContract (prim-action-05, species-5) to species-5 concrete
// subtype of a 7-species discriminated union substrate covering CONTEXT.md
// §15 species 1-7. Closes architecture review §5.A.3 / R1-F9 (B2).
//
// Cross-species dispatch consumers (Agent SDK harness, Managed Agents,
// Gemini Enterprise, Microsoft Foundry, ...) import the discriminated union
// + species-specific subtypes from this surface. Existing SprintContract
// consumers unaffected — back-compat alias preserved above.
// v1.50.0 sprint-060 W2.1 R1-F4: HarnessSpeciesId / HARNESS_SPECIES_IDS /
// isHarnessSpeciesId now sourced from harness-species-enum primitive
// (re-exported above). Removed from this block to avoid duplicate-export.
export type {
  DispatchContractRid,
  DispatchContractStatus,
  DispatchContractBase,
  DispatchConsumptionBudget,
  ClaudeCodeCliDispatchContract,
  ClaudeAgentSdkDispatchContract,
  TaskSpecificDispatchContract,
  AnthropicManagedAgentsDispatchContract,
  PalantirMiniSprintDispatchContract,
  GeminiEnterpriseDispatchContract,
  MicrosoftFoundryDispatchContract,
  DispatchContract,
  DispatchContractRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/dispatch-contract";

export {
  dispatchContractRid,
  isDispatchContractStatus,
  isDispatchContract,
  DISPATCH_CONTRACT_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/dispatch-contract";

export type {
  FeedbackLoopRid,
  FeedbackLoopState,
  TerminationCondition,
  FeedbackLoopDeclaration,
  FeedbackLoopRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/feedback-loop";

export {
  feedbackLoopRid,
  FEEDBACK_LOOP_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/feedback-loop";

export type {
  GradingCriterionRid,
  RubricDomain,
  CriterionApplicability,
  PassFailLogic,
  GradingCriterionDeclaration,
  GradingCriterionRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/grading-criterion";

export {
  gradingCriterionRid,
  GRADING_CRITERION_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/grading-criterion";

// --- v1.19.0 GradingRubric primitive (sprint-111 PR 5.1) ---
// Re-exports schemas v1.61.0 GradingRubric: RID-identifiable, immutable-once-
// canonical primitive formalizing Set<GradingCriterion>. Enables
// grade_outcome_with_rubric bypass guard in plugin v6.21.0.
// Per canonical plan v2 §4 row 5.1.
export type {
  GradingRubricRid,
  RubricRegistrationStatus,
  GradingRubricDeclaration,
  GradingRubricRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/grading-rubric";

export {
  gradingRubricRid,
  GRADING_RUBRIC_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/grading-rubric";

export type {
  PlaywrightScenarioRid,
  PlaywrightStepKind,
  PlaywrightStep,
  EvidenceCaptureSpec,
  PlaywrightMcpBinding,
  PlaywrightScenarioDeclaration,
  PlaywrightScenarioRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/playwright-scenario";

export {
  playwrightScenarioRid,
  PLAYWRIGHT_SCENARIO_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/playwright-scenario";

// --- v1.15 pedagogy + harness D4 fix ---
// mathcrew H4 Sprint 2: canonical PedagogyContract primitive surface.
// Also closes H3 D4: feedback_loop_closed split from feedback_loop_opened.

export type {
  PedagogyId,
  BloomLevel,
  RepresentationLayer,
  VariationPattern,
  PFPhase,
  ConstructionVerb,
  CpaSequencing,
  PedagogyApplication,
  PedagogyParams,
  CognitiveLoadConstraint,
  PedagogyContract,
  PedagogyContractRid,
  PedagogyContractRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/pedagogy-contract";

export {
  pedagogyContractRid,
  PEDAGOGY_CONTRACT_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/pedagogy-contract";

export type {
  FeedbackLoopClosedPayload,
  FeedbackLoopClosedTerminationCondition,
} from "@palantirKC/claude-schemas/ontology/primitives/feedback-loop-closed";

// --- pre-v1.0 carryover primitives (completeness fill — A14 2026-04-21) ---
// Earlier shared-core versions shipped only object-type + link-type from the
// carryover set. action-type / interface-type / property-type were omitted,
// forcing consumers needing them to import from @palantirKC/claude-schemas
// directly (rule-08 authority-chain violation). Fill-in closes the gap.

export * from "@palantirKC/claude-schemas/ontology/primitives/action-type";
export * from "@palantirKC/claude-schemas/ontology/primitives/interface-type";
export * from "@palantirKC/claude-schemas/ontology/primitives/property-type";

// --- v1.13 governance primitives (12 — completeness fill — A14 2026-04-21) ---
// All 12 governance primitives introduced in schemas v1.13 (A1.1-A1.12).
// palantir-math already imports project-schema-pin + codegen-header-contract
// + impact-edge directly from schemas (rule-08 violation). Re-exporting them
// here lets those imports migrate to shared-core on their own cadence.

export * from "@palantirKC/claude-schemas/ontology/primitives/research-document";
export * from "@palantirKC/claude-schemas/ontology/primitives/memory-index-entry";
export * from "@palantirKC/claude-schemas/ontology/primitives/hook-event-allowlist";
export * from "@palantirKC/claude-schemas/ontology/primitives/plugin-manifest";
export * from "@palantirKC/claude-schemas/ontology/primitives/project-schema-pin";
export * from "@palantirKC/claude-schemas/ontology/primitives/file-complexity-budget";
export * from "@palantirKC/claude-schemas/ontology/primitives/dead-code-marker";
export * from "@palantirKC/claude-schemas/ontology/primitives/lineage-conformance-policy";
export * from "@palantirKC/claude-schemas/ontology/primitives/managed-settings-fragment";
export * from "@palantirKC/claude-schemas/ontology/primitives/codegen-header-contract";
export * from "@palantirKC/claude-schemas/ontology/primitives/impact-edge";

// v1.18 rules-redesign (R2): Rule primitive.
export * from "@palantirKC/claude-schemas/ontology/primitives/rule";

// --- Wave 2: SemanticRid (ontology-first semantic impact substrate) ---

export type {
  SemanticRidKind,
  SemanticRid,
  SemanticRidDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/semantic-rid";

export {
  semanticRid,
  parseSemanticRid,
  SemanticRidRegistry,
  SEMANTIC_RID_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/semantic-rid";

// --- v1.34 propagation-audit primitives (W6 ForwardProp/BackwardProp audit) ---
// Schema v1.34.0 (2026-05-01). Rule 01 v2.1.0 §ForwardProp/BackwardProp Audit.
// Plugin v3.10.0+ propagation_audit_forward / propagation_audit_backward / propagation_chain_health MCP handlers.

export * from "@palantirKC/claude-schemas/ontology/primitives/propagation-audit";

// propagation-replay re-exports (selective — `LineageDimension` already comes from lineage-conformance-policy above; canonical 5-dim taxonomy)
export type {
  PropagationReplayNode,
  PropagationReplayPayload,
} from "@palantirKC/claude-schemas/ontology/primitives/propagation-replay";
export { isPropagationReplayPayload } from "@palantirKC/claude-schemas/ontology/primitives/propagation-replay";

export * from "@palantirKC/claude-schemas/ontology/primitives/propagation-health";

// --- v1.35 rule 26 valuable-data substrate primitives ---
// Schema v1.35.0 (2026-05-03). Rule 26 v1.0.0 §Definition + §Auto-grade + §Substrate routing.
// Plugin v4.1.0+ value-grade-assigner / outcome-pair-tracker / memory-layer-validator hooks +
// pm_value_grade_metrics / pm_outcome_pair_audit / pm_memory_layer_audit / pm_event_query_by_grade MCP handlers.

export * from "@palantirKC/claude-schemas/ontology/primitives/value-grade";
export * from "@palantirKC/claude-schemas/ontology/primitives/agentic-memory-layer";
export * from "@palantirKC/claude-schemas/ontology/primitives/lineage-refs";
export * from "@palantirKC/claude-schemas/ontology/primitives/outcome-pairing";
export * from "@palantirKC/claude-schemas/ontology/primitives/refinement-target";

// --- v1.39 ResearchSourceManifest (W1.C SSoT-9) ---
// Schema v1.39.0 (2026-05-06). Typed evidence-source manifest with refresh-class
// governance (hot/warm/cold default 7/30/90 days). One MANIFEST.json per
// research-library subdirectory; consumed by palantir-mini research-staleness-
// check hook + research_staleness_audit MCP handler + pm-research-staleness-
// audit skill. Pairs with ResearchDocument (per-doc lineage); manifest is
// per-library / per-source. Authority chain: research -> schemas -> shared-core.

export * from "@palantirKC/claude-schemas/ontology/primitives/research-source-manifest";

// --- v1.40 SSoT-2 W2.A AIP/Foundry/MCP operational primitives (10) ---
// Schema v1.40.0 (2026-05-06). 10 cross-cutting primitives capturing the
// practical AIP/Foundry/MCP build surface so consumer projects (palantir-math,
// mathcrew, hyperframes) can express MCP-tool registration, ontology-edit
// simulation graphs, Global Branching proposal lifecycle, granular row /
// column / cell / object security + property visibility policies, Workflow
// Lineage source executors + graph snapshots, the AI FDE 8-mode router +
// agent/domain skill taxonomy, the AIP Evals 19-evaluator → 6-RubricDomain
// mapping, and a typed retry-policy union without rule-08 authority-chain
// violations. Authority chain: research -> schemas -> shared-core.

export * from "@palantirKC/claude-schemas/ontology/primitives/mcp-tool-declaration";
export * from "@palantirKC/claude-schemas/ontology/primitives/ontology-simulation";
export * from "@palantirKC/claude-schemas/ontology/primitives/global-branching-proposal";
export * from "@palantirKC/claude-schemas/ontology/primitives/object-security-policy";
export * from "@palantirKC/claude-schemas/ontology/primitives/property-security-policy";
export * from "@palantirKC/claude-schemas/ontology/primitives/source-executor";
export * from "@palantirKC/claude-schemas/ontology/primitives/workflow-lineage-graph";
export * from "@palantirKC/claude-schemas/ontology/primitives/aip-mode-and-skill";
// grader-domain-extension uses named explicit exports to avoid ambient
// ambiguity with the existing `RubricDomain` symbol re-exported earlier
// via the v1.14 grading-criterion surface.
export type {
  AIPEvalsEvaluatorType,
} from "@palantirKC/claude-schemas/ontology/primitives/grader-domain-extension";
export {
  AIP_EVALS_EVALUATOR_TYPES,
  AIP_EVALS_EVALUATOR_TYPE_TO_RUBRIC_DOMAIN,
  isAIPEvalsEvaluatorType,
  rubricDomainForEvaluator,
} from "@palantirKC/claude-schemas/ontology/primitives/grader-domain-extension";
export * from "@palantirKC/claude-schemas/ontology/primitives/retry-policy";

// --- v1.46 sprint-059 W2.1 — DerivedPropertyDeclaration (prim-data-26) ---
// Schema v1.47.0 (2026-05-08). Foundry-equivalent typed declarative compute-
// binding primitive promoted from the long-standing forward reference in
// schemas/.../object-type.ts:5-6. Closes architecture review PR #329 §5.G.2
// (R5-F2 Major). Coexists with the LOGIC closure variant at
// schemas/ontology/functions/derived-property.ts (prim-logic-04). Authority
// chain: research -> schemas -> shared-core -> per-project ontology.
export * from "@palantirKC/claude-schemas/ontology/primitives/derived-property";

// --- v1.51 Prompt-to-DTC canonical contract primitives ---
// Schema authority for palantir-mini prompt-front-door and contract governance.
// Runtime behavior stays in the plugin; shared-core exposes the typed contract
// graph for resolver/gate/project ontology consumers.
export * from "@palantirKC/claude-schemas/ontology/primitives/approval-ref";
export * from "@palantirKC/claude-schemas/ontology/primitives/ontology-engineering-ref";
export * from "@palantirKC/claude-schemas/ontology/primitives/prompt-envelope";
export * from "@palantirKC/claude-schemas/ontology/primitives/semantic-intent-contract";
export * from "@palantirKC/claude-schemas/ontology/primitives/digital-twin-change-contract";
export * from "@palantirKC/claude-schemas/ontology/primitives/prompt-contract-record";

// --- v1.42 Brain layer abstraction (Wave 3 W3.A) ---
// Lance Martin "Scaling Managed Agents" 2026-04-08 Brain/Hands/Session model.
// Provider-neutral BrainProvider interface + Anthropic (claude -p subprocess,
// Max X20 path) + Ollama stub (D3 K-LLM consensus prep, rule 26 §Axis D3).
// Authority chain: rules/CONTEXT.md §17 → shared-core/brain-provider.ts →
// bridge/handlers/* consumers.
export type {
  ChatMessage,
  BrainInvokeOptions,
  BrainResponse,
  BrainProvider,
} from "./brain-provider";
export { createAnthropicBrain, createOllamaBrain } from "./brain-provider";

// --- v1.42 Hands layer abstraction (Wave 3 W3.C) ---
// Lance Martin Brain/Hands/Session 2026-04-08 — *cattle, not pets*.
// Provider-neutral SandboxClient interface + UnixLocalSandboxClient (git
// worktree adapter; matches existing Agent({isolation:"worktree"}) semantics
// from rule 16 v4.1.0). Future E2B/Modal/Vercel/Cloudflare adapters deferred.
export type {
  SerializedSessionState,
  Session,
  SandboxClient,
} from "./sandbox-client";
export { UnixLocalSandboxClient } from "./sandbox-client";

// --- v1.53 ProjectOntologyIndex generic primitive (foamy-giggling-kettle PR-1) ---
// Schema v1.53.0 (2026-05-12). Generic shape for per-project capability +
// surface + validation-pack + known-issue + project-scope indexes. Promoted
// from palantir-mini plugin lib so cross-project consumers can type-check
// index instances without reaching into plugin internals. Plugin specializes
// the generic with concrete CapabilityContract / KnownIssue /
// ProjectScopeDefinition (those primitives remain plugin-local).
export * from "./project-ontology-index";

// --- v1.54 UniversalOntologyEntry type shape (foamy-giggling-kettle PR-3) ---
// Schema v1.54.0 (2026-05-13). Promotes the UniversalOntologyEntry type shape
// from the palantir-mini plugin (lib/ontology-entry/universal-entry.ts) to
// schema-level authority. TYPE SHAPE ONLY — classifier logic and factory
// function (createUniversalOntologyEntry) remain in the plugin. The lifecycle
// transition function (transitionUniversalOntologyEntry) also lives in the
// plugin at lib/ontology-entry/lifecycle.ts.
export * from "./universal-ontology-entry";

// --- v1.14 DocumentCorpus primitive (foamy-giggling-kettle PR-12) ---
// Schema v1.56.0 (2026-05-13). Document corpus type shape for AIP #3 Chatbot
// Studio document retrieval alongside ontology context. Exports DocumentCorpus,
// DocumentCorpusEntry, DocumentRetrievalMode, topK, DOCUMENT_CORPUS_SCHEMA_VERSION,
// isDocumentCorpus, isDocumentCorpusSchemaVersionV1.
// Consumed by palantir-mini lib/ontology-context/document-context.ts when
// ontology_context_query opts in via includeDocumentContext:true.
export * from "./document-corpus";

// --- v1.15 ModelTrustProfile primitive (foamy-giggling-kettle PR-14) ---
// Schema v1.57.0 (2026-05-13). Per-model governance trust posture with 5 bypass
// flags ALL false by invariant. Consumed by palantir-mini pm_lead_brief (best-
// effort read from <project>/.palantir-mini/model-trust-profile.json).
export * from "./model-trust-profile";

// --- v1.16 Phase 2 ImpactGraph node-type primitives (sprint-078 PR 2.1) ---
// Schema v1.58.0 (2026-05-13). 21 new primitives (12 missing + 9 wrappers) that
// complete the Phase 2 node-type surface so PR 2.2 (edges) + PR 2.3
// (ProjectOntologyIndex store) can declare typed-graph nodes against canonical names.
// Authority chain: proposal §7.1 -> plan §4 row 2.1 -> schemas v1.58.0 -> this file.

// 12 MISSING primitives
export type {
  UserPromptRid,
  UserPromptDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/user-prompt";
export { userPromptRid } from "@palantirKC/claude-schemas/ontology/primitives/user-prompt";

export type {
  ContextCapsuleRid,
  ContextCapsuleDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/context-capsule";
export { contextCapsuleRid } from "@palantirKC/claude-schemas/ontology/primitives/context-capsule";

export type {
  AIPArchitectureAxisRid,
  AIPArchitectureAxisDeclaration,
  AIPAxisName,
} from "@palantirKC/claude-schemas/ontology/primitives/aip-architecture-axis";
export {
  AIP_AXIS_NAMES,
  aipArchitectureAxisRid,
} from "@palantirKC/claude-schemas/ontology/primitives/aip-architecture-axis";

export type {
  ProjectBrowseDocRid,
  ProjectBrowseDocDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/project-browse-doc";
export { projectBrowseDocRid } from "@palantirKC/claude-schemas/ontology/primitives/project-browse-doc";

export type {
  ProjectIndexDocRid,
  ProjectIndexDocDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/project-index-doc";
export { projectIndexDocRid } from "@palantirKC/claude-schemas/ontology/primitives/project-index-doc";

export type {
  HookRid,
  HookDeclaration,
  HookEventName,
  HookScope,
} from "@palantirKC/claude-schemas/ontology/primitives/hook";
export { hookRid } from "@palantirKC/claude-schemas/ontology/primitives/hook";

export type {
  McpHandlerRid,
  McpHandlerDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/mcp-handler";
export { mcpHandlerRid } from "@palantirKC/claude-schemas/ontology/primitives/mcp-handler";

export type {
  RuntimeEntrypointRid,
  RuntimeEntrypointDeclaration,
  EntrypointRuntime,
  EntrypointKind,
} from "@palantirKC/claude-schemas/ontology/primitives/runtime-entrypoint";
export { runtimeEntrypointRid } from "@palantirKC/claude-schemas/ontology/primitives/runtime-entrypoint";

export type {
  SourceFileRid,
  SourceFileDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/source-file";
export { sourceFileRid } from "@palantirKC/claude-schemas/ontology/primitives/source-file";

export type {
  TestRid,
  TestDeclaration,
  TestFramework,
  TestKind,
} from "@palantirKC/claude-schemas/ontology/primitives/test";
export { testRid } from "@palantirKC/claude-schemas/ontology/primitives/test";

export type {
  CommitRid,
  CommitDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/commit";
export { commitRid } from "@palantirKC/claude-schemas/ontology/primitives/commit";

export type {
  PullRequestRid,
  PullRequestDeclaration,
  PRMergeability,
} from "@palantirKC/claude-schemas/ontology/primitives/pull-request";
export { pullRequestRid } from "@palantirKC/claude-schemas/ontology/primitives/pull-request";

// 9 WRAPPER primitives
export type {
  OfficialResearchDocRid,
  OfficialResearchLibrary,
} from "@palantirKC/claude-schemas/ontology/primitives/official-research-doc";
export { isOfficialResearchDoc } from "@palantirKC/claude-schemas/ontology/primitives/official-research-doc";

export type {
  SkillRid,
} from "@palantirKC/claude-schemas/ontology/primitives/skill";

export type {
  FunctionRid,
  FunctionKind,
} from "@palantirKC/claude-schemas/ontology/primitives/function";

export type {
  ToolRid,
  ToolKind,
} from "@palantirKC/claude-schemas/ontology/primitives/tool";

export type {
  GraderRid,
  GraderDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/grader";
export { graderRid } from "@palantirKC/claude-schemas/ontology/primitives/grader";

export type {
  GeneratedArtifactRid,
  GeneratedArtifactDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/generated-artifact";
export { generatedArtifactRid } from "@palantirKC/claude-schemas/ontology/primitives/generated-artifact";

export type {
  EventRid,
  EventDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/event";
export { eventRid } from "@palantirKC/claude-schemas/ontology/primitives/event";

export type {
  FailureModeRid,
  FailureModeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/failure-mode";
export { failureModeRid } from "@palantirKC/claude-schemas/ontology/primitives/failure-mode";

export type {
  LearningRid,
  LearningDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/learning";
export { learningRid } from "@palantirKC/claude-schemas/ontology/primitives/learning";

// --- v1.17.0 additive: Phase 2 edge-type primitives (sprint-079 PR 2.2) ---
// Schema v1.59.0 (2026-05-13). 7 new edge-type primitives (1 base + 6 cluster
// files, 22 total edge kinds) that complete the Phase 2 edge-type surface so
// PR 2.3 (lib/ontology-graph/store.ts) can persist edges between the 32 PR 2.1
// nodes against canonical names. Authority chain:
// proposal §7.2 -> plan §4 row 2.2 -> schemas v1.59.0 -> this file.

export type {
  EdgeRid,
  EdgeBaseDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/edge-base-type";
export { edgeRid } from "@palantirKC/claude-schemas/ontology/primitives/edge-base-type";

export type {
  StructuralEdgeRid,
  StructuralEdgeKind,
  StructuralEdgeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/structural-edge";

export type {
  GovernanceEdgeRid,
  GovernanceEdgeKind,
  GovernanceEdgeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/governance-edge";

export type {
  RoutingEdgeRid,
  RoutingEdgeKind,
  RoutingEdgeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/routing-edge";

export type {
  LineageEdgeRid,
  LineageEdgeKind,
  LineageEdgeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/lineage-edge";

export type {
  RefinementEdgeRid,
  RefinementEdgeKind,
  RefinementEdgeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/refinement-edge";

export type {
  TaxonomyEdgeRid,
  TaxonomyEdgeKind,
  TaxonomyEdgeDeclaration,
} from "@palantirKC/claude-schemas/ontology/primitives/taxonomy-edge";

// --- v1.20.0 OntologyContextSeed promotion + SemanticIntentContract strengthening ---
// Schema v1.62.0 (2026-05-13, sprint-120 PR 5.9).
// OntologyContextSeed promoted from ghost primitive to typed schema-level
// authority. Resolves the permanent "unapproved-context-seed" stuck state.
// SemanticIntentContract strengthened with additive fields: seedRid +
// fillSequence (SicFillStep) + verdict + gradeRubricRid.
// Per canonical plan v2 §4 row 5.9.
export type {
  OntologyContextSeedRid,
  OntologyContextSeedStatus,
  OntologyContextSeedScopeHint,
  OntologyContextSeedDeclaration,
  OntologyContextSeedRegistry,
} from "@palantirKC/claude-schemas/ontology/primitives/ontology-context-seed";
export {
  ontologyContextSeedRid,
  ONTOLOGY_CONTEXT_SEED_REGISTRY,
} from "@palantirKC/claude-schemas/ontology/primitives/ontology-context-seed";

// SemanticIntentContract additive field types (v1.62.0)
export type {
  SicFillSource,
  SicFillStep,
} from "@palantirKC/claude-schemas/ontology/primitives/semantic-intent-contract";

// RuntimeFingerprint primitive (schemas v1.63.0 — sprint-133 PR 6.6)
// Per canonical plan v2 §4 row 6.6 + rule 27 §Cross-runtime substrate.
export type {
  RuntimeKind,
  ProcessKind,
  RuntimeFingerprint,
} from "@palantirKC/claude-schemas/ontology/primitives/runtime-fingerprint";
export {
  RUNTIME_KINDS,
  isRuntimeKind,
  PROCESS_KINDS,
  isProcessKind,
  isRuntimeFingerprint,
  detectRuntimeFingerprint,
} from "@palantirKC/claude-schemas/ontology/primitives/runtime-fingerprint";

// --- v1.22.0 BackPropValueIndex primitive (schemas v1.64.0 — sprint-101 PR 4.1b) ---
// 18-key typed index entry for T3+ event substrate per canonical plan §4 row 4.1b.
// Backs Convex decisionEvents 7→18 field extension + rule 26 valuable-data 5-axes.
export type {
  BackPropValueIndexRid,
  BackPropValueIndexEntry,
} from "@palantirKC/claude-schemas/ontology/primitives/back-prop-value-index";
export {
  backPropValueIndexRid,
  isBackPropValueIndexEntry,
} from "@palantirKC/claude-schemas/ontology/primitives/back-prop-value-index";

// --- v1.23.0 RetentionManifest primitive (schemas v1.65.0 — sprint-106 PR 4.4) ---
// Per-tier T0-T4 event retention policy + provenance per canonical plan §4 row 4.4.
// Backs lib/event-log/retention-writer.ts + rule 26 §Substrate routing.
export type {
  RetentionManifestRid,
  RetentionPolicy,
  RetentionManifestEntry,
} from "@palantirKC/claude-schemas/ontology/primitives/retention-manifest";
export {
  retentionManifestRid,
  DEFAULT_RETENTION_MANIFEST,
  isRetentionManifestEntry,
} from "@palantirKC/claude-schemas/ontology/primitives/retention-manifest";

export const SHARED_CORE_VERSION = "1.23.0";
