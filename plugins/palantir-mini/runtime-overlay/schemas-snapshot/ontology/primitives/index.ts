/**
 * @palantirKC/claude-schemas — primitives barrel (v1.62.0)
 *
 * Single import surface for every canonical primitive under ontology/primitives/.
 * Import the barrel when you want the full primitive API; import individual
 * files when you want a narrow surface.
 *
 * Primitive inventory (canonical re-exported files across vintages):
 *   pre-v1.0 carryover (5) — action-type, interface-type, link-type,
 *                            object-type, property-type
 *   v1.0 core (9)          — struct, value-type, shared-property-type,
 *                            capability-token, marking-declaration,
 *                            automation-declaration, webhook-declaration,
 *                            scenario-sandbox, aip-logic-function
 *   v1.13 governance (11)  — research-document, memory-index-entry,
 *                            hook-event-allowlist,
 *                            plugin-manifest, project-schema-pin,
 *                            file-complexity-budget, dead-code-marker,
 *                            lineage-conformance-policy,
 *                            managed-settings-fragment,
 *                            codegen-header-contract, impact-edge
 *   v1.14 harness (5)      — harness-agent, sprint-contract, feedback-loop,
 *                            grading-criterion, playwright-scenario
 *                            (Prithvi Rajasekaran 3-agent + AIP Evals 5-evaluator)
 *   v1.15 pedagogy (2)     — pedagogy-contract, feedback-loop-closed
 *                            (mathcrew H4 Sprint 2 + H3 D4 fix)
 * v1.16 added 5 event-type variants (lineage/event-types.ts — not primitives).
 * v1.17 added object-type + link-type sub-path exports (package.json).
 *
 * Semantic-frontmatter.ts is a compile-time schema helper, not a primitive —
 * lives alongside primitives but is intentionally NOT re-exported here.
 *
 * @owner palantirkc-ontology
 * @purpose primitives barrel
 */

// --- v1.0 core (9) ---
export * from "./struct";
export * from "./value-type";
export * from "./shared-property-type";
export * from "./capability-token";
export * from "./marking-declaration";
export * from "./automation-declaration";
export * from "./webhook-declaration";
export * from "./scenario-sandbox";
export * from "./aip-logic-function";

// --- pre-v1.0 carryover ---
export * from "./action-type";
export * from "./interface-type";
export * from "./link-type";
export * from "./object-type";
export * from "./property-type";

// --- Role primitive (prim-security-NN) — GOVERNANCE/ACTORS gap closure ---
// principal->permission grant the prior RBAC surface (marking / object-security
// / property-security / capability-token) lacked. Explicitly NON-overlapping
// with CapabilityToken: Role = the principal-permission binding; token = the
// issued grant artifact minted from it. See role.ts file comment.
export * from "./role";

// --- v1.13 governance primitives (A1.1 - A1.12) ---
export * from "./research-document";
export * from "./memory-index-entry";
export * from "./hook-event-allowlist";
export * from "./plugin-manifest";
export * from "./project-schema-pin";
export * from "./file-complexity-budget";
export * from "./dead-code-marker";
export * from "./lineage-conformance-policy";
export * from "./managed-settings-fragment";
export * from "./codegen-header-contract";
export * from "./impact-edge";

// --- v1.14 harness primitives (H1.1 - H1.5) ---
// Prithvi Rajasekaran 3-agent harness + AIP Evals 5-evaluator pattern.
// Companions: palantir-mini v2.0 agents/ + bridge/harness MCP handlers.
export * from "./harness-agent";
export * from "./sprint-contract";
export * from "./feedback-loop";
export * from "./grading-criterion";
export * from "./playwright-scenario";

// --- v1.61 GradingRubric primitive (prim-data-NN, sprint-111 PR 5.1) ---
// Formalizes the previously conceptual "rubric" (Set<GradingCriterion>) as a
// RID-identifiable, immutable-once-registered schema primitive. Adds
// GradingRubricDeclaration + GradingRubricRegistry + RubricRegistrationStatus
// + canonicalRubricRid self-pointer. Enables grade_outcome_with_rubric bypass
// guard for non-canonical rubrics (plugin v6.21.0). Per canonical plan v2 §4 row 5.1.
export * from "./grading-rubric";

// --- v1.15 pedagogy + harness D4 fix (P1.1, P1.2) ---
// mathcrew H4 Sprint 2: promotes PedagogyContract from project-local to canonical.
// Also closes H3 retrospective D4: feedback_loop_closed split from _opened.
export * from "./pedagogy-contract";
export * from "./feedback-loop-closed";

// --- v1.18 rules-redesign (R2, prim-ops-19) ---
// Rule primitive backs ~/.claude/rules/NN-*.md frontmatter + rules/CONTEXT.md §5.
// v2.26.0 (D9) consolidated 3 MCP handlers into pm_rule_query.
// Consumed by pm_rule_query / pm_rule_audit MCP handlers (R2b/R2c/D9).
// Import via shared-core; never import this path directly from consumer projects (rule 08).
export * from "./rule";

// --- v1.27 Phase 2d (prim-ops-22, prim-ops-23) ---
// AgentDefinition + SkillDefinition primitives back the plugin-only-portable
// architecture migration. Filesystem-authoritative this version; advisory
// cross-check via pm_plugin_self_check. Codegen automation arrives v1.28+.
export * from "./agent-definition";
export * from "./skill-definition";

// --- v1.32 BackProp loop closure (sprint-006 Tier-B T2) ---
// 3 new primitives closing the harness BackPropagation substrate gap:
//   failure-category         — enum: 6-member root-cause classification
//   sprint-completed         — event payload for sprint terminal-state
//   failure-mode-synthesized — event payload for analyzer hypothesis
// Consumed by palantir-mini hooks: sprint-terminal-detector (sprint_completed),
// sprint-completed-learning-synthesizer (learning_captured prefix enforcement),
// analyzer-output-injector (failure_mode_synthesized + FailureCategory tag).
// Import via shared-core; never import these paths directly from consumer
// projects (rule 08 authority chain).
export * from "./failure-category";



// --- v1.33 ontology-promotion primitives (S3a — spicy-knitting-garden) ---
// 3 primitives promoted from palantir-math project-local types to canonical
// schema surface, enabling W5-A consumer surface migration.
// Import via shared-core; never import these paths directly from consumer
// projects (rule 08 authority chain).




// --- v1.34 propagation-audit substrate (cosmic-hatching-pizza W6 — distributed-wishing-manatee) ---
// 3 primitives backing the ForwardProp/BackwardProp audit MCP surface:
//   propagation-audit  — forward chain audit result + PropagationStep SSoT
//   propagation-replay — backward 5-dim trace from a seed events.jsonl row
//   propagation-health — aggregate chain health score + drift signals
// PropagationStep enum + PROPAGATION_STEPS const live in propagation-audit.ts
// and are re-exported by both propagation-replay.ts and propagation-health.ts
// (sibling helper-types pattern; avoids circular dependency).
// Import via shared-core; never import these paths directly from consumer
// projects (rule 08 authority chain). Handlers wired Phase 4 (palantir-mini).
export * from "./propagation-audit";
// Re-export aliasing: replay + health both re-export PropagationStep symbols
// from propagation-audit, so we list them explicitly to avoid ambiguity.
export type { PropagationReplayPayload, PropagationReplayNode, LineageDimension } from "./propagation-replay";
export { isPropagationReplayPayload } from "./propagation-replay";
export type { PropagationHealthPayload } from "./propagation-health";
export { isPropagationHealthPayload } from "./propagation-health";

// --- v1.35 valuable-data substrate (nifty-mixing-diffie — rule 26) ---
// 5 primitives backing the "Valuable Data Operating Standard". Anchored to
// Palantir's "Connecting Agents to Decisions" (2026-04-29) which formalizes
// decision lineage as the substrate refining 4-layer agentic memory.
//   value-grade            — T0..T4 importance enum (substrate routing)
//   agentic-memory-layer   — 4-layer enum (working/episodic/semantic/procedural)
//   lineage-refs           — typed cross-reference (actionRid/dryRunRef/...)
//   outcome-pairing        — before/after pairing for intervention measurement
//   refinement-target      — typed pointer to DH/HC/rubric/etc.
// Consumed by palantir-mini hooks (value-grade-assigner, outcome-pair-tracker,
// memory-layer-validator) + handlers (pm-value-grade-metrics, pm-outcome-pair-
// audit, pm-event-query-by-grade, pm-memory-layer-audit). Import via
// shared-core; never import these paths directly from consumer projects
// (rule 08 authority chain).
export * from "./value-grade";
export * from "./agentic-memory-layer";
export * from "./lineage-refs";
export * from "./outcome-pairing";
export * from "./refinement-target";

// --- v1.37 AIP/Foundry operational surface (2026-05-05 SSoT drift audit) ---
// Practical FDE work needs more than ObjectType/ActionType atoms: Object Views
// make ontology operational in apps, branch/proposal lifecycle makes AI FDE
// edits reviewable, AIP Evals make nondeterministic agents measurable, and
// AIP Agent declarations bind scoped tools/models/evals/deployment state.
export * from "./object-view";
export * from "./ontology-branch-proposal";
export * from "./aip-evaluation";

// --- v1.39 ResearchSourceManifest (W1.C SSoT-9) ---
// Typed manifest declaring evidence-source structure + refresh contracts.
// One MANIFEST.json per research-library subdirectory; replaces free-form
// directory globs with versioned interface so staleness audits + refresh
// workflows operate on structured metadata. Pairs with ResearchDocument
// (per-doc) — manifest is per-library / per-source.
// (Note: v1.38 reserved for SSoT-2 W2.A — skipped here per task spec.)
export * from "./research-source-manifest";

// --- v1.41 CanonicalSourceRegistry (SSoT-3 W2.C) ---
// Registry-level typed knowledge: 10 canonical 1차 자료 sources (5 Palantir +
// 3 Anthropic + 2 Claude Code) with retrieval cadence per source class.
// Companion to v1.39 ResearchSourceManifest — manifest is per-subdir, registry
// is control-plane-wide. Backs cold-start automation:
//   pm-cold-start-orchestrate skill (W2.A) + cold-start-browse-index-loader
//   hook (W2.B) read this registry instead of hardcoded paths.
// Authority cites: research/palantir-foundry/aip/{blog-securing-agents-2026-
// 01-22, ai-fde-overview-2026-03-12, aip-evals-overview-2026-04-14,
// connecting-ai-to-decisions-2024-01, blog-connecting-agents-2026-04-29}.md +
// research/anthropic/{effective-harnesses-2025-11-26, scaling-managed-agents-
// 2026-04-08, harness-design-2026-03-24}.md + research/claude-code/{features,
// agent-system-design}.md.
// Import via shared-core; never import this path directly from consumer
// projects (rule 08 authority chain).


// --- v1.42 sprint-047 W2.A — Claude Harness Infra primitives (4) ---
// 3 new + 1 extension. Backs the Claude Harness 5-Wave pivot
// (plans/mellow-plotting-oasis.md): Opus 4.7 `/effort xhigh` + GPT-5.5
// 5-level reasoning effort + OpenAI Agents SDK Manifest schema + 4-vendor
// pricing-split arbitrage positioning.
//   grader-effort                  — 5-level GraderEffortLevel enum +
//                                     mapTierToClaudeCodeEffort helper.
//   hands-manifest                 — HandsManifestDeclaration mirroring
//                                     OpenAI Manifest schema (LocalDir/
//                                     GitRepo/EnvVar/S3+GCS+R2 mounts) +
//                                     workspace-relative dst validation.
//   harness-species-cost-profile   — HarnessSpeciesCostProfileDeclaration
//                                     + 7-vendor inventory const
//                                     (claude-code-cli-max + 4-vendor +
//                                     copilot-studio + local-ollama).
//   grading-criterion EXTEND       — adds optional `tier` field (5-level
//                                     GraderEffortLevel) to support per-
//                                     criterion grader-effort routing.
// Authority: research/anthropic/opus-4-7-whats-new-platform.md +
// research/openai/{gpt-5-5-introducing-2026-04-23, sandbox-agents-
// developer-docs}.md + research/harness-engineering-2026/the-new-stack-4-
// vendor-harness-pricing-split-2026-04.md.
// Rule cross-refs: rule 16 v4.1.0 §Roles, rule 26 v1.0.0 §Axes B + D.
// Import via shared-core; never import these paths directly from consumer
// projects (rule 08 authority chain).
export * from "./grader-effort";
export * from "./hands-manifest";

// --- v1.40 SSoT-2 W2.A AIP/Foundry/MCP operational primitives (10) ---
// Additive MINOR. Promotes 10 cross-cutting primitives capturing the
// practical AIP/Foundry build surface so consumer projects can import
// MCP-tool registration, ontology simulation graphs, Global Branching
// proposal lifecycle, granular row/column/cell/object security policies,
// property visibility policies, Workflow Lineage source executors + graph
// snapshots, the AI FDE 8-mode router + skill taxonomy, the AIP Evals
// 19-evaluator → 6-RubricDomain mapping, and a typed retry-policy union.
// Authority cites: research/palantir-foundry/dev-toolchain/palantir-mcp-
// and-ontology-mcp-2026-03-26.md, research/palantir-foundry/aip/aip-evals-
// overview-and-ontology-edits-2026-04-14.md, research/palantir-foundry/
// ontology/global-branching-overview-2026-05-05.md, research/palantir-
// foundry/aip/workflow-lineage-and-aip-observability-2026-03-03.md,
// research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-
// 2026-03-12.md.
export * from "./mcp-tool-declaration";
export * from "./ontology-simulation";
export * from "./global-branching-proposal";
export * from "./object-security-policy";
export * from "./property-security-policy";
export * from "./source-executor";
export * from "./workflow-lineage-graph";
export * from "./retry-policy";

// --- v1.50 sprint-060 W2.1 — HarnessSpeciesEnum primitive (prim-meta-02) ---
// Promotes the 7-species literal union from a `dispatch-contract`-local
// declaration to a stand-alone schema-canonical primitive. Closes architecture
// review §3.4 R1-F4 (Minor): species inventory was duplicated across 3
// surfaces (dispatch-contract local union, harness-species-cost-profile vendor
// axis, rules/CONTEXT.md §15) with no single SSoT primitive. This consolidates
// the architectural-class axis as a single typed canonical source.
//
// Cross-refs:
//   - rule 16 v4.1.0 §0 (predecessor 5-species governance).
//   - rule 24 v1.1.0 §Dispatch flowchart step 1 (identify species).
//   - HarnessSpeciesVendor (vendor axis) — parallel axis in
//     harness-species-cost-profile.ts (vendor != species).
//   - dispatch-contract.ts — re-exports HarnessSpeciesId from this primitive
//     for back-compat (consumers importing from `dispatch-contract` continue
//     to work unchanged; type identity preserved).
//
// Import via shared-core; never import this path directly from consumer
// projects (rule 08 authority chain).
export * from "./harness-species-enum";

// --- v1.48 sprint-060 W1.13 — DispatchContract abstract superclass (prim-action-12) ---
// Promotes SprintContract (prim-action-05, species-5 concrete) into the
// 7-species discriminated union substrate. Closes architecture review §5.A.3
// (R1-F9 / B2) — rule 24 step 3 unconditionally requires SprintContract bind,
// but the contract primitive itself was sprint-harness-species-specific. This
// abstract base + per-species subtypes lets cross-species dispatch (Agent SDK
// species 2, Managed Agents species 4, Gemini Enterprise species 6, Microsoft
// Foundry species 7, ...) carry an analogous typed gate.
//
// Back-compat: `SprintContractDeclaration` consumers unaffected; sprint-
// contract.ts re-exports `SprintContract` as a type alias narrowing the
// dispatch union to the species-5 case.
//
// W2.1 R1-F4 dependency: HarnessSpeciesId is declared as a local string-
// literal union in dispatch-contract.ts pending W2.1's HarnessSpeciesEnum
// promotion. When that lands, the union here is replaced with a re-export
// (additive MINOR; type identity preserved).
//
// Cross-refs: rule 16 v4.1.0 §SprintContract, rule 24 v1.1.0 §Dispatch
// flowchart step 3, CONTEXT.md §15 7-species enumeration.
export * from "./dispatch-contract";

// --- v1.46 sprint-059 W2.1 — DerivedPropertyDeclaration (prim-data-26) ---
// Foundry-equivalent derived-property primitive promoted from the long-
// standing forward reference in object-type.ts:5-6. Typed declarative
// compute-binding (DATA layer) — points to AIPLogicFunctionRid OR a
// stable-name SourceExecutorFunction. Coexists intentionally with the
// LOGIC closure variant at ontology/functions/derived-property.ts
// (prim-logic-04) which exposes an inline `compute` reference.
// Cross-refs: source-executor.ts (computeFunctionRid resolution),
// aip-logic-function.ts (AIPLogicFunctionRid binding target),
// architecture review PR #329 §5.G.2 (R5-F2 Major).
// Import via shared-core; never import this path directly from consumer
// projects (rule 08 authority chain).
export * from "./derived-property";

// --- v1.51 Prompt-to-DTC canonical contract primitives ---
// Runtime behavior remains in palantir-mini; these primitives promote the
// PromptEnvelope, ApprovalRef, SemanticIntentContract, DigitalTwinChangeContract,
// PromptContractRecord, and typed OntologyEngineeringRef graph to schema-level
// authority for future resolver/gate waves.
export * from "./approval-ref";
export * from "./ontology-engineering-ref";
export * from "./prompt-envelope";
export * from "./semantic-intent-contract";
export * from "./digital-twin-change-contract";
export * from "./prompt-contract-record";

// --- v1.83 TurnCardDecisionSpec promotion (SIC/DTC consolidation) ---
// Runtime-neutral clarification decision contract, promoted from the plugin
// runtime type lib/lead-intent/contracts.ts so the canonical
// SemanticClarificationQuestion can reference it without an uphill lib/ import.
export * from "./turn-card-decision-spec";

// --- v1.53 cross-project capability index (1) ---
export * from "./project-ontology-index";

// --- v1.54 UniversalOntologyEntry promotion (1) ---
export * from "./universal-ontology-entry";

// --- v1.55 OntologyContextApproval promotion (1) ---
// Closes the gap where OntologyContextSeed was stuck at "unapproved-context-seed".
// Adds the per-prompt approval boundary that downstream agents (project-implementer
// etc.) can rely on without re-running the semantic intent gate.
// Three kinds: auto-low-risk (pm_intent_router auto-created) / lead-approved
// (pm_lead_brief resume) / user-approved (semantic intent gate workbench).
export * from "./ontology-context-approval";

// --- v1.62 OntologyContextSeed promotion (canonical plan v2 §4 row 5.9) ---
// Promotes OntologyContextSeed from ghost primitive to typed schema-level
// authority. Resolves the permanent "unapproved-context-seed" stuck state
// (see ontology-context-approval.ts:5) by giving the proto-context a canonical
// shape: seedId + status lifecycle + scopeHints + supportingResearchRefs +
// confidenceScore + missingEdges + approvalRef back-pointer.
// Also strengthens SemanticIntentContract with additive fields: seedRid +
// fillSequence + verdict + gradeRubricRid (unblocks PR 5.10 + PR 5.13).
export * from "./ontology-context-seed";

// --- v1.56 DocumentCorpus primitive (foamy-giggling-kettle PR-12) ---
// Document corpus type shape for AIP #3 Chatbot Studio document retrieval.
// Declares DocumentCorpus + DocumentCorpusEntry + DocumentRetrievalMode (full-
// document / chunk-mode) + topK. Consumed by palantir-mini
// lib/ontology-context/document-context.ts when ontology_context_query opts in
// via includeDocumentContext:true. Corpus file lives at
// <project>/.palantir-mini/document-corpus.json.
export * from "./document-corpus";

// --- v1.57 ModelTrustProfile primitive (foamy-giggling-kettle PR-14) ---
// Per-model governance trust posture with 5 bypass flags ALL false by invariant:
//   mayBypassOntologyContextQuery, mayBypassDtcForMutation,
//   mayBypassValidationForCommit, mayBypassWorkflowTrace,
//   mayBypassProjectScopeBoundary.
// Only mayReduceClarificationQuestions is operator-tunable. The type system
// enforces the invariant via literal-false types — any attempt to construct a
// profile with a true bypass flag is a TypeScript error.
// Consumed by palantir-mini pm_lead_brief (best-effort read from
// <project>/.palantir-mini/model-trust-profile.json).
export * from "./model-trust-profile";

// --- v1.63 RuntimeFingerprint primitive (prim-data-NN, sprint-133 PR 6.6) ---
// Structured byWhom.runtimeFingerprint companion for the 5-dim event envelope.
// Carries: RuntimeKind + HarnessSpeciesId + ProcessKind unions + RuntimeFingerprint
// interface + detectRuntimeFingerprint env-based auto-detect factory +
// isRuntimeFingerprint type guard.
// Additive only — no existing byWhom field changes (backward-compat preserved).
// Per canonical plan v2 §4 row 6.6 + rule 27 §Cross-runtime substrate.
export * from "./runtime-fingerprint";

// --- v1.64 BackPropValueIndex primitive (prim-data-NN, sprint-101 PR 4.1b) ---
// 18-key typed index entry for T3+ event substrate per canonical plan §4 row 4.1b.
// Backs Convex decisionEvents table (7→18 fields) enabling fast indexed query
// on the append-only events.jsonl mirror without full-scan.
// Axis coverage (rule 26 §5-Axes): A(eventId/when) + B(evalSuiteId/evalRunId)
// + C(refinementTarget) + D(runtime) + E(memoryLayers).
// Foundry equivalence: claude-extension (no direct Foundry counterpart).
// Per canonical plan v2 §4 row 4.1b + rule 26 §valuable-data.
export * from "./back-prop-value-index";

// RetentionManifest primitive (v1.65.0 — sprint-106 PR 4.4)
// Per-tier T0-T4 event retention policy + provenance.
// Foundry equivalence: claude-extension.
// Per canonical plan v2 §4 row 4.4 + rule 26 §Substrate routing.
export * from "./retention-manifest";

// --- FDE ontology-build session primitive (sprint-138 Slice 1.A) ---
// Read-only composed projection for FDE-style 9-level ontology build review:
//   FDEOntologyBuildSession (composed projection) + FDEGapReport (recommendation).
// HARD READ-ONLY INVARIANT: mutationAuthorized is literal `false`;
// recommendationOnly is literal `true`. NEVER authorizes mutation — mutation
// authority remains with SemanticIntentContract + DigitalTwinChangeContract.
// Self-contained: no cross-axis primitive imports. Explicitly named re-exports
// (this is a composed projection over existing primitives, not a standalone surface).
// Source: docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md
//         plans/splendid-mapping-lemur.md (user-approved plan).
export type {
  FDEReviewLevel,
  FDEReadinessVerdict,
  FDEReviewLevelGap,
  FDEMissionDecision,
  FDEObjectTypeReview,
  FDELinkTypeReview,
  FDEActionWritebackReview,
  FDEFunctionReview,
  FDEChatbotStudioReview,
  FDEAIFDEMcpBoundaryReview,
  FDEBranchReleaseReview,
  FDEEvalObservabilityReview,
  FDEOntologyBuildSession,
  FDEGapReport,
} from "./fde-ontology-build-session";
export {
  FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION,
  FDE_GAP_REPORT_SCHEMA_VERSION,
} from "./fde-ontology-build-session";

// --- FDE naming classification primitive (sprint-138 Slice 2.A) ---
// Read-only 3-way naming classification (preferred-user-facing /
// legacy-user-facing / compatibility-identifier) + baseline term table
// encoding brief §8 (11 entries). Consumed by lib/fde-build/naming-classifier.ts
// (Slice 2.B) to drive the read-only pm-fde-naming-audit skill.
// HARD INVARIANTS: NamingAuditReport.readOnly is literal `true`;
// compatibilityIdentifiersPreserved is literal `true`. Compatibility
// identifiers (agentRid, AIPAgentDeclaration, aipAgentRid, AIP_AGENT_REGISTRY,
// legacyNames) MUST never be renamed — each carries a compatibilityReason.
// Source: docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §8
//         plans/splendid-mapping-lemur.md Slice 2.
export type {
  NamingTerm,
  NamingTermSeverity,
  NamingAuditFinding,
  NamingAuditReport,
  NamingTermSpec,
} from "./fde-naming-classification";
export {
  FDE_NAMING_CLASSIFICATION_SCHEMA_VERSION,
  NAMING_TERM_BASELINE_TABLE,
} from "./fde-naming-classification";

// --- FDE grading rubric + detailed gap report (sprint-138 Slice 3.A) ---
// 17-criterion FDE Ontology Build Readiness rubric (brief §10) +
// FDEGapReportDetailed scorecard wrapper. Recommendation-only; weights sum =
// 1.0; registered with GRADING_RUBRIC_REGISTRY as canonical
// `rubric:fde-readiness/v1`. Composer (lib/fde-build/, Slice 3.B/3.C) routes
// criteria across 4 scorecard slices (ontology / chatbot / AI FDE MCP /
// governance + eval). HARD INVARIANT: never authorizes mutation.
export type {
  FDECriterionScore,
  FDEGapReportDetailed,
} from "./fde-gap-report";
export { FDE_GAP_REPORT_DETAILED_SCHEMA_VERSION } from "./fde-gap-report";
export {
  FDE_GRADING_RUBRIC,
  FDE_GRADING_RUBRIC_SCHEMA_VERSION,
} from "./fde-grading-rubric";

// --- FDE workbench panel projection primitive (sprint-138 Slice 4.A) ---
// Read-only projection derived from FDEOntologyBuildSession; surfaces non-
// developer-friendly status to the workbench panel.
// HARD INVARIANT: mutationAuthorizedFromPanel is literal `false`. NEVER
// authorizes mutation — observation/communication surface only.
// Source: docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §11
//         plans/splendid-mapping-lemur.md Slice 4.
export type {
  FDEPanelProjection,
  FDEPanelBuilderHints,
} from "./fde-panel";
export { FDE_PANEL_SCHEMA_VERSION } from "./fde-panel";

// --- v1.70 EventEnvelope primitive (audit G3 — highest-leverage ADD) ---
// Promotes the canonical 5-dim Decision Lineage envelope (rule 10:
// when / atopWhich / throughWhich / byWhom / withWhat) from the runtime type
// palantir-mini/lib/event-log/types.ts to schema-level authority. Declares
// EventEnvelopeBase + EventId/SessionId/CommitSha brands + a REPRESENTATIVE
// discriminated EventEnvelope subset (full ~40-variant union stays in the
// runtime mirror per OCP) + isEventEnvelope guard. Complements event.ts
// (prim-learn-27, EventRid graph-node identity) — that covers the node, this
// covers the full envelope. No uphill import from lib/ (schema is authority).
// Import via shared-core; never import this path directly from consumer
// projects (rule 08 authority chain).
export * from "./event-envelope";
