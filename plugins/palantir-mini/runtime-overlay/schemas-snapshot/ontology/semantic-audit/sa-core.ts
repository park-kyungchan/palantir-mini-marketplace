/**
 * Semantic Audit — Core auditSemantics()
 *
 * Split from legacy semantic-audit.ts v1.13.1 (D3, 2026-04-19).
 * The monolithic audit function remains intact in this file; it is an
 * internal implementation that walks all 32 SA sections and composes
 * the SemanticAuditReport. Follow-up refactor may split further by axis
 * (twin layers / HRP / LEARN / security / infrastructure / frontend-runtime)
 * using a shared AuditContext — deferred to keep this split compile-clean.
 *
 * Consumers MUST import from the parent barrel: `from "../semantic-audit"`.
 */

import type { OntologyExports } from "../types";
import type {
  SectionAudit,
  UpgradeSpec,
  UpgradePriority,
  SemanticAuditReport,
} from "./sa-types";

// =========================================================================
// Audit Logic
// =========================================================================

export function auditSemantics(exports: OntologyExports): SemanticAuditReport {
  const sections: SectionAudit[] = [];

  // --- SA-01: Digital Twin SENSE (DATA layer) ---
  const hasEntities = exports.data.objectTypes.length > 0;
  const hasProperties = exports.data.objectTypes.some((e) => e.properties.length > 0);
  sections.push({
    section: "SA-01: SENSE (DATA Layer)",
    semanticsRef: "DIGITAL_TWIN_LOOP[0], DATA_SEMANTICS",
    coverage: hasEntities && hasProperties ? "implemented" : hasEntities ? "partial" : "missing",
    evidence: `${exports.data.objectTypes.length} entities, ${exports.data.objectTypes.reduce((s, e) => s + e.properties.length, 0)} properties`,
    whyItMatters: "Without DATA entities, the twin has nothing to sense. Entities ARE the ground truth snapshot of reality.",
    evidenceKind: "structural",
  });

  // --- SA-02: Digital Twin DECIDE (LOGIC layer) ---
  const hasLinks = exports.logic.linkTypes.length > 0;
  const hasFunctions = exports.logic.functions.length > 0;
  const hasDerived = exports.logic.derivedProperties.length > 0;
  const hasQueries = exports.logic.queries.length > 0;
  const logicRichness = [hasLinks, hasFunctions, hasDerived, hasQueries].filter(Boolean).length;
  sections.push({
    section: "SA-02: DECIDE (LOGIC Layer)",
    semanticsRef: "DIGITAL_TWIN_LOOP[1], LOGIC_SEMANTICS, Impact Propagation Graph",
    coverage: logicRichness >= 3 ? "implemented" : logicRichness >= 1 ? "partial" : "missing",
    evidence: `${exports.logic.linkTypes.length} links, ${exports.logic.functions.length} functions, ${exports.logic.derivedProperties.length} derived, ${exports.logic.queries.length} queries`,
    whyItMatters: "Without LOGIC, the twin is a dead mirror — data exists but nobody reasons about it. Links form the Impact Propagation Graph; functions encode tribal knowledge.",
    upgradeAction: logicRichness < 3 ? "Add derived properties (computed values) and functions (expert reasoning) to transform raw data into actionable intelligence." : undefined,
    priority: logicRichness < 3 ? "high" : undefined,
  });

  // --- SA-03: Digital Twin ACT (ACTION layer) ---
  const hasMutations = exports.action.mutations.length > 0;
  const hasWebhooks = exports.action.webhooks.length > 0;
  const hasAutomations = exports.action.automations.length > 0;
  sections.push({
    section: "SA-03: ACT (ACTION Layer)",
    semanticsRef: "DIGITAL_TWIN_LOOP[2], ACTION_SEMANTICS",
    coverage: hasMutations ? (hasWebhooks || hasAutomations ? "implemented" : "partial") : "missing",
    evidence: `${exports.action.mutations.length} mutations, ${exports.action.webhooks.length} webhooks, ${exports.action.automations.length} automations`,
    whyItMatters: "Without ACTIONs, the twin observes but cannot intervene. Mutations are the levers that change reality.",
    upgradeAction: !hasWebhooks && !hasAutomations ? "Add webhooks (external system sync) or automations (scheduled/event-driven execution) to complete the ACTION layer." : undefined,
    priority: !hasMutations ? "high" : "medium",
  });

  // --- SA-04: Hallucination Reduction Pattern 1 — OAG (Ontology-Augmented Generation) ---
  // Evidence: DATA entities exist and queries are defined → LLMs can query the ontology
  sections.push({
    section: "SA-04: HRP-01 OAG (Ontology-Augmented Generation)",
    semanticsRef: "HALLUCINATION_REDUCTION_PATTERNS[0], HRP-01",
    coverage: hasEntities && hasQueries ? "implemented" : hasEntities ? "partial" : "missing",
    evidence: hasQueries ? `${exports.logic.queries.length} queries available for LLM grounding` : "No queries — LLMs cannot query ontology data",
    whyItMatters: "Without OAG, LLMs hallucinate organization-specific facts. Queries let LLMs ask the ontology for real data instead of inventing answers.",
    upgradeAction: !hasQueries ? "Add queries (getById, list, filter) so LLM sessions can retrieve trusted entity data." : undefined,
    priority: !hasQueries ? "high" : undefined,
  });

  // --- SA-05: HRP-02 Logic Tool Handoff ---
  const toolExposedFns = exports.logic.functions.filter((f) => f.toolExposure === true);
  const agentGuidedMutations = exports.action.mutations.filter((m) => m.agentToolDescription !== undefined);
  sections.push({
    section: "SA-05: HRP-02 Logic Tool Handoff",
    semanticsRef: "HALLUCINATION_REDUCTION_PATTERNS[1], HRP-02, DH-LOGIC-13",
    coverage: toolExposedFns.length > 0 ? "implemented" : hasFunctions ? "partial" : "missing",
    evidence: toolExposedFns.length > 0
      ? `${toolExposedFns.length}/${exports.logic.functions.length} functions have toolExposure=true`
      : hasFunctions ? `${exports.logic.functions.length} functions exist but none have toolExposure=true` : "No functions defined",
    whyItMatters: "Without toolExposure, LLMs approximate computations (distance, forecasting, risk) instead of delegating to deterministic functions. Wrong answers compound.",
    evidenceKind: "typed",
    upgradeAction: hasFunctions && toolExposedFns.length === 0
      ? "Review functions and set toolExposure=true on those that compute values LLMs cannot reliably do (DH-LOGIC-13 litmus test: would an LLM get the WRONG answer?)."
      : undefined,
    priority: hasFunctions && toolExposedFns.length === 0 ? "medium" : undefined,
  });

  // --- SA-06: HRP-03 Human-in-the-Loop / Progressive Autonomy ---
  const reviewedMutations = exports.action.mutations.filter((m) => m.reviewLevel !== undefined);
  const autonomyAutomations = exports.action.automations.filter((a) => a.autonomyLevel !== undefined);
  const paCount = reviewedMutations.length + autonomyAutomations.length;
  sections.push({
    section: "SA-06: Progressive Autonomy (PA-01..05)",
    semanticsRef: "PROGRESSIVE_AUTONOMY_LEVELS, HRP-03, ACTION_GOVERNANCE AG-03",
    coverage: paCount > 0 ? (paCount >= exports.action.mutations.length * 0.5 ? "implemented" : "partial") : "missing",
    evidence: `${reviewedMutations.length}/${exports.action.mutations.length} mutations have reviewLevel, ${autonomyAutomations.length}/${exports.action.automations.length} automations have autonomyLevel`,
    whyItMatters: "Without PA levels, all actions are either fully manual or fully autonomous — no graduated trust. PA enables 'monitor → recommend → approve → act → autonomous' progression as trust builds.",
    evidenceKind: "typed",
    upgradeAction: paCount === 0
      ? "Add reviewLevel to mutations (e.g., 'approve-then-act' for high-impact, 'recommend' for advisory). Start at PA-01 (monitor) and graduate based on accuracy."
      : undefined,
    priority: paCount === 0 ? "high" : undefined,
  });

  // --- SA-07: Action Governance — Submission Criteria ---
  const validatedMutations = exports.action.mutations.filter((m) => m.validationFns && m.validationFns.length > 0);
  sections.push({
    section: "SA-07: Action Governance — Submission Criteria",
    semanticsRef: "ACTION_GOVERNANCE AG-02, HC-ACTION-05",
    coverage: validatedMutations.length > 0 ? (validatedMutations.length >= exports.action.mutations.length * 0.5 ? "implemented" : "partial") : "missing",
    evidence: `${validatedMutations.length}/${exports.action.mutations.length} mutations have validationFns`,
    whyItMatters: "Without submission criteria, any input is accepted — no business rule gate before execution. HC-ACTION-05: ALL criteria must pass before an action can execute.",
    upgradeAction: validatedMutations.length === 0
      ? "Add validationFns to mutations that modify critical data. Each validation function is a LOGIC-layer gate on ACTION execution."
      : undefined,
    priority: validatedMutations.length === 0 ? "medium" : undefined,
  });

  // --- SA-08: Twin Fidelity — Entity Correspondence (TF-01) ---
  const entityCompleteness = exports.data.objectTypes.every((e) =>
    e.properties.length >= 3 && e.primaryKey && e.titleKey && e.description,
  );
  sections.push({
    section: "SA-08: Twin Fidelity — Entity Correspondence (TF-01)",
    semanticsRef: "TWIN_FIDELITY_DIMENSIONS[0], TF-01",
    coverage: entityCompleteness ? "implemented" : hasEntities ? "partial" : "missing",
    evidence: entityCompleteness
      ? "All entities have ≥3 properties, PK, titleKey, and description"
      : `Some entities lack description or have <3 properties`,
    whyItMatters: "Without exhaustive entity definition, different LLM sessions model the same concept differently — the twin diverges from reality.",
    upgradeAction: !entityCompleteness ? "Ensure every entity has: description (BilingualDesc), ≥3 typed properties, primaryKey, titleKey. This is the minimum for entity correspondence." : undefined,
    priority: !entityCompleteness ? "medium" : undefined,
  });

  // --- SA-09: Twin Fidelity — Relationship Faithfulness (TF-02) ---
  const allLinksHaveCardinality = exports.logic.linkTypes.every((l) =>
    ["1:1", "M:1", "1:M", "M:N"].includes(l.cardinality),
  );
  sections.push({
    section: "SA-09: Twin Fidelity — Relationship Faithfulness (TF-02)",
    semanticsRef: "TWIN_FIDELITY_DIMENSIONS[1], TF-02",
    coverage: hasLinks && allLinksHaveCardinality ? "implemented" : hasLinks ? "partial" : "missing",
    evidence: hasLinks ? `${exports.logic.linkTypes.length} links with typed cardinality` : "No links defined — entities are isolated",
    whyItMatters: "Without typed links, entity relationships are ambiguous — M:1 vs M:N confusion causes different traversal results per session.",
    upgradeAction: !hasLinks ? "Add LinkTypes connecting your entities. Every real-world relationship (Patient→Doctor, Article→Stock) needs a typed link." : undefined,
    priority: !hasLinks ? "high" : undefined,
  });

  // --- SA-10: LEARN — Write-Back (LEARN-01) ---
  // Evidence: mutations exist → outcomes can be written back as new data
  sections.push({
    section: "SA-10: LEARN-01 Write-Back",
    semanticsRef: "LEARN_MECHANISMS[0], LEARN-01",
    coverage: hasMutations ? "implemented" : "missing",
    evidence: hasMutations ? "Mutations exist — action outcomes can be persisted as new entity state" : "No mutations — no write-back path",
    whyItMatters: "Without write-back, the twin is read-only. ACTION outcomes must become new DATA for the next SENSE cycle to close the loop.",
  });

  const typedLearn = exports.learn;
  const hasTypedFeedbackSurface =
    Boolean(typedLearn?.feedbackEntityRef)
    || (typedLearn?.feedbackMutationRefs?.length ?? 0) > 0;
  const hasTypedEvaluationSurface =
    Boolean(typedLearn?.evaluationEntityRef)
    || (typedLearn?.evaluationMutationRefs?.length ?? 0) > 0
    || (typedLearn?.evaluationFunctionRefs?.length ?? 0) > 0;
  const hasTypedOutcomeSurface =
    Boolean(typedLearn?.outcomeEntityRef)
    || (typedLearn?.outcomeMutationRefs?.length ?? 0) > 0;
  const hasTypedRefinementSurface =
    Boolean(typedLearn?.accuracyEntityRef)
    || Boolean(typedLearn?.refinementSignalEntityRef)
    || (typedLearn?.graduationMutationRefs?.length ?? 0) > 0;
  const hasTypedWorkflowLineage = (typedLearn?.workflowLineageEntityRefs?.length ?? 0) > 0;

  // --- SA-11: LEARN — Eval Feedback (LEARN-02) ---
  // Typed path: prefer learn refs / declarations over name heuristics
  const hasTypedEvalResults = typedLearn?.hasEvaluatorResults === true || (hasTypedFeedbackSurface && hasTypedEvaluationSurface);
  // Inferential fallback: detect from ontology name heuristics
  const hasFeedbackEntity = exports.data.objectTypes.some((e) =>
    e.apiName.toLowerCase().includes("feedback") || e.apiName.toLowerCase().includes("rating"),
  );
  const hasFeedbackMutation = exports.action.mutations.some((m) =>
    m.apiName.toLowerCase().includes("feedback") || m.apiName.toLowerCase().includes("rate") || m.apiName.toLowerCase().includes("review"),
  );
  const hasEvaluationEntity = exports.data.objectTypes.some((e) => {
    const lower = e.apiName.toLowerCase();
    return lower.includes("evaluation") || lower.includes("rubric") || lower.includes("score");
  });
  const hasEvaluationMutation = exports.action.mutations.some((m) => {
    const lower = m.apiName.toLowerCase();
    return lower.includes("evaluation") || lower.includes("evaluate") || lower.includes("rubric") || lower.includes("score");
  });
  const hasEvaluationFunction = exports.logic.functions.some((f) => {
    const lower = f.apiName.toLowerCase();
    return lower.includes("evaluation") || lower.includes("evaluate") || lower.includes("rubric") || lower.includes("judge");
  });
  const hasExplicitRubrics = hasEvaluationEntity || hasEvaluationMutation || hasEvaluationFunction;
  const hasFeedbackLoop = hasFeedbackEntity || hasFeedbackMutation;
  sections.push({
    section: "SA-11: LEARN-02 Eval Feedback",
    semanticsRef: "LEARN_MECHANISMS[1], LEARN-02, LEARN_EVALUATION_SURFACES, PLATFORM_OPEN_SOURCE_BOUNDARY",
    coverage: hasTypedEvalResults
      ? "implemented"
      : (hasTypedFeedbackSurface || hasTypedEvaluationSurface)
        ? "partial"
        : (hasFeedbackLoop && hasExplicitRubrics ? "implemented" : hasFeedbackLoop ? "partial" : "missing"),
    evidence: [
      typedLearn?.hasEvaluatorResults === true ? "learn.hasEvaluatorResults=true (typed)" : undefined,
      typedLearn?.feedbackEntityRef ? `feedbackEntityRef=${typedLearn.feedbackEntityRef}` : undefined,
      (typedLearn?.feedbackMutationRefs?.length ?? 0) > 0 ? `feedbackMutationRefs=${typedLearn!.feedbackMutationRefs!.join(",")}` : undefined,
      typedLearn?.evaluationEntityRef ? `evaluationEntityRef=${typedLearn.evaluationEntityRef}` : undefined,
      (typedLearn?.evaluationMutationRefs?.length ?? 0) > 0 ? `evaluationMutationRefs=${typedLearn!.evaluationMutationRefs!.join(",")}` : undefined,
      (typedLearn?.evaluationFunctionRefs?.length ?? 0) > 0 ? `evaluationFunctionRefs=${typedLearn!.evaluationFunctionRefs!.join(",")}` : undefined,
      hasFeedbackEntity ? "Feedback entity exists" : undefined,
      hasFeedbackMutation ? "Feedback mutation exists" : undefined,
      hasEvaluationEntity ? "Evaluation/rubric entity exists" : undefined,
      hasEvaluationMutation ? "Evaluation mutation exists" : undefined,
      hasEvaluationFunction ? "Evaluation function exists" : undefined,
      !hasTypedEvalResults && !hasTypedFeedbackSurface && !hasTypedEvaluationSurface && !hasFeedbackLoop && !hasExplicitRubrics ? "No feedback or rubric mechanism detected in ontology" : undefined,
    ].filter(Boolean).join("; "),
    whyItMatters:
      "Without eval feedback, there is no signal from end-users about AI output quality. "
      + "But feedback alone is still insufficient for self-improvement. Palantir's latest official LEARN surface "
      + "uses explicit evaluators and rubrics so decisions can be scored, compared, and backpropagated.",
    evidenceKind: hasTypedEvalResults || hasTypedFeedbackSurface || hasTypedEvaluationSurface ? "typed" : "inferential",
    upgradeAction: hasTypedEvalResults ? undefined : (!(hasTypedFeedbackSurface || hasFeedbackLoop)
      ? "Add a Feedback entity (rating, comment, hookEventId) and submitFeedback mutation. This closes the human-in-the-loop feedback path."
      : !(hasTypedEvaluationSurface || hasExplicitRubrics)
        ? "Add explicit evaluation/rubric support: an EvaluationRecord or EvaluationRubric entity plus recordEvaluation mutation or evaluation function carrying evaluatorSource, summaryScore, normalizedDelta, and rationale."
        : undefined),
    priority: hasTypedEvalResults ? undefined : (!(hasTypedFeedbackSurface || hasFeedbackLoop) || !(hasTypedEvaluationSurface || hasExplicitRubrics) ? "medium" : undefined),
  });

  // --- SA-12: LEARN — Decision Outcome Tracking (LEARN-03) ---
  // Typed path: prefer learn refs / declarations over name heuristics
  const hasTypedOutcomes = typedLearn?.hasOutcomeRecords === true || hasTypedOutcomeSurface;
  // Inferential fallback: detect from ontology name heuristics
  const hasOutcomeEntity = exports.data.objectTypes.some((e) =>
    e.apiName.toLowerCase().includes("outcome") || e.apiName.toLowerCase().includes("prediction"),
  );
  sections.push({
    section: "SA-12: LEARN-03 Decision Outcome Tracking",
    semanticsRef: "LEARN_MECHANISMS[2], LEARN-03, DH_REFINEMENT_PROTOCOL",
    coverage: hasTypedOutcomes ? "implemented" : (hasOutcomeEntity ? "implemented" : "missing"),
    evidence: hasTypedOutcomes
      ? [
          typedLearn?.hasOutcomeRecords === true ? "learn.hasOutcomeRecords=true (typed)" : undefined,
          typedLearn?.outcomeEntityRef ? `outcomeEntityRef=${typedLearn.outcomeEntityRef}` : undefined,
          (typedLearn?.outcomeMutationRefs?.length ?? 0) > 0 ? `outcomeMutationRefs=${typedLearn!.outcomeMutationRefs!.join(",")}` : undefined,
        ].filter(Boolean).join("; ")
      : (hasOutcomeEntity ? "Outcome/prediction entity exists" : "No outcome tracking entity detected"),
    whyItMatters: "Without outcome tracking, the system cannot measure whether its decisions were correct. This is the foundation of the entire BackPropagation chain (REF-01..05).",
    evidenceKind: hasTypedOutcomes ? "typed" : "inferential",
    upgradeAction: hasTypedOutcomes ? undefined : (!hasOutcomeEntity
      ? "Add OutcomeRecord entity with: dhId, predictedOutcome, actualOutcome, delta. This enables the REF chain to measure accuracy and refine DH constants."
      : undefined),
    priority: hasTypedOutcomes ? undefined : (!hasOutcomeEntity ? "low" : undefined),
  });

  // --- SA-13: Scenarios/COA Framework ---
  const hasScenarioSupport = exports.data.objectTypes.some((e) =>
    e.apiName.toLowerCase().includes("scenario") || e.apiName.toLowerCase().includes("coa"),
  );
  sections.push({
    section: "SA-13: Scenarios/COA Framework (SCN-01..04)",
    semanticsRef: "SCENARIOS_FRAMEWORK, DH-ACTION-15",
    coverage: hasScenarioSupport ? "implemented" : "missing",
    evidence: hasScenarioSupport ? "Scenario entity detected" : "No scenario support — single-path decisions only",
    whyItMatters: "Without scenarios, the AI picks one option without showing alternatives. Trade-off comparison enables better decision-making for multi-path situations.",
    upgradeAction: !hasScenarioSupport
      ? "For complex decisions (DH-ACTION-15), add Scenario entity with: label, editSet, tradeoffs{time,cost,risk}, reasoning. Enable side-by-side comparison."
      : undefined,
    priority: "low",
  });

  // --- SA-14: Security Governance ---
  const hasRoles = exports.security.roles.length > 0;
  const hasPermissions = exports.security.permissionMatrix.length > 0;
  const hasMarkings = exports.security.markings.length > 0;
  const hasPolicies = exports.security.objectPolicies.length > 0;
  const hasPropertyPolicies = (exports.security.propertyPolicies?.length ?? 0) > 0;
  const securityDepth = [hasRoles, hasPermissions, hasMarkings, hasPolicies, hasPropertyPolicies].filter(Boolean).length;
  sections.push({
    section: "SA-14: Security Governance (4-Layer Model: RBAC + Markings + Object Policies + Property Policies)",
    semanticsRef: "SECURITY_OVERLAY, AG-01, HC-SEC-13..18 (cell-level security)",
    coverage: securityDepth >= 4 ? "implemented" : securityDepth >= 2 ? "partial" : securityDepth >= 1 ? "partial" : "missing",
    evidence: `Roles: ${exports.security.roles.length}, Permissions: ${exports.security.permissionMatrix.length}, Markings: ${exports.security.markings.length}, ObjectPolicies: ${exports.security.objectPolicies.length}, PropertyPolicies: ${exports.security.propertyPolicies?.length ?? 0}`,
    whyItMatters: "Without security governance, the ontology has no access control model. The 4-layer model (RBAC → Markings → Object Security → Property/Cell-Level Security) provides defense-in-depth. Even declaration-only (CC adapter limitation), roles define the organizational trust model. (OFFICIAL FACT: Palantir docs describe object + property security policies achieving cell-level security.)",
    upgradeAction: securityDepth < 2 ? "Add markings (classification labels) and objectPolicies (RLS/CLS) for fine-grained access control declarations. Add propertyPolicies for column-level nullability (cell-level security)." : undefined,
    priority: securityDepth < 2 ? "medium" : undefined,
  });

  // --- SA-15: Domain Isolation (SH-01..03 + TRANSITION_ZONES) ---
  // SH-01: DATA concepts in data, LOGIC in logic, ACTION in action
  // TRANSITION_ZONES: LinkType/Interface/Query/DerivedProperty must be in LOGIC, not DATA
  // Check: no LOGIC concepts leaked into DATA (e.g., linkTypes in data.objectTypes)
  const dataHasLogicNames = exports.data.objectTypes.some((e) =>
    e.apiName.toLowerCase().includes("link") && e.apiName.toLowerCase().includes("type"),
  );
  sections.push({
    section: "SA-15: Domain Isolation (SH-01..03)",
    semanticsRef: "SEMANTIC_HEURISTICS SH-01..03, TRANSITION_ZONES, CI-03 Acyclic Reads",
    coverage: !dataHasLogicNames && hasLinks ? "implemented" : hasLinks ? "partial" : "missing",
    evidence: `${exports.data.objectTypes.length} DATA entities, ${exports.logic.linkTypes.length} LOGIC links, ${exports.logic.functions.length} LOGIC functions — ${dataHasLogicNames ? "WARNING: DATA contains link-like entities" : "clean separation"}`,
    whyItMatters: "SH-01 mandates: DATA=EXISTS, LOGIC=REASON, ACTION=CHANGE. Mixing domains causes inconsistent classification across LLM sessions. TRANSITION_ZONES (LinkType, Interface, Query, DerivedProperty) must live in LOGIC despite structural similarity to DATA.",
    upgradeAction: dataHasLogicNames ? "Move link-type entities from data.ts to logic.ts — TRANSITION_ZONES require LinkType in LOGIC domain." : undefined,
    priority: dataHasLogicNames ? "high" : undefined,
  });

  // --- SA-16: Consistency Invariant CI-03 Acyclic Reads ---
  // ACTION mutations should only reference DATA entities (not LOGIC concepts)
  // LOGIC links should reference DATA entities
  const allLogicConcepts = new Set([
    ...exports.logic.linkTypes.map((l) => l.apiName),
    ...exports.logic.functions.map((f) => f.apiName),
    ...exports.logic.queries.map((q) => q.apiName),
  ]);
  const mutationRefsLogic = exports.action.mutations.some((m) => allLogicConcepts.has(m.entityApiName));
  sections.push({
    section: "SA-16: Acyclic Dependencies (CI-03)",
    semanticsRef: "CONSISTENCY_INVARIANTS CI-03: DATA reads nothing, LOGIC reads DATA, ACTION reads DATA∪LOGIC",
    coverage: !mutationRefsLogic ? "implemented" : "partial",
    evidence: mutationRefsLogic
      ? "WARNING: Some mutations reference LOGIC concepts as entityApiName — should reference DATA entities"
      : "All mutations reference DATA entities — acyclic dependency maintained",
    whyItMatters: "CI-03 ensures DATA→LOGIC→ACTION dependency order. If ACTION references LOGIC concepts directly, the dependency graph has a shortcut that breaks the compilation pipeline.",
    upgradeAction: mutationRefsLogic ? "Mutations should reference DATA entity apiNames. If a mutation operates on derived data, it should target the source entity, not the derivation." : undefined,
    priority: mutationRefsLogic ? "high" : undefined,
  });

  // --- SA-17: Decision Lineage 5D ---
  // Typed path: check exports.learn.hookEventsTable for 5D fields
  const hasTypedHookEvents = exports.learn?.hookEventsTable !== undefined;
  const hookEvents5D = exports.learn?.hookEventsTable;
  const typedLineageDimensions = hookEvents5D ? [
    hookEvents5D.timestamp,      // WHEN
    hookEvents5D.atopCommit,     // ATOP WHICH
    hookEvents5D.sessionId,      // THROUGH WHICH (part 1)
    hookEvents5D.byIdentity,     // BY WHOM
    hookEvents5D.withReasoning,  // WITH WHAT
  ].filter(Boolean).length : 0;
  // Inferential fallback: detect from ontology name heuristics
  const hasTimestampFields = exports.data.objectTypes.some((e) =>
    e.properties.some((p) => p.apiName.toLowerCase().includes("timestamp") || p.apiName.toLowerCase().includes("createdat") || p.apiName === "createdAt"),
  );
  const hasReasoningField = exports.data.objectTypes.some((e) =>
    e.properties.some((p) => p.apiName.toLowerCase().includes("reasoning") || p.apiName.toLowerCase().includes("rationale")),
  );
  const hasIdentityField = exports.data.objectTypes.some((e) =>
    e.properties.some((p) => p.apiName.toLowerCase().includes("createdby") || p.apiName.toLowerCase().includes("updatedby") || p.apiName.toLowerCase().includes("author")),
  );
  const lineageDimensions = [hasTimestampFields, hasIdentityField, hasReasoningField].filter(Boolean).length;
  sections.push({
    section: "SA-17: Decision Lineage (5D Capture)",
    semanticsRef: "DECISION_LINEAGE: WHEN, ATOP_WHICH_DATA, THROUGH_WHICH_APP, BY_WHOM, WITH_WHAT_REASONING",
    coverage: hasTypedHookEvents
      ? (typedLineageDimensions >= 5 ? "implemented" : typedLineageDimensions >= 3 ? "partial" : "missing")
      : (lineageDimensions >= 3 ? "implemented" : lineageDimensions >= 1 ? "partial" : "missing"),
    evidence: hasTypedHookEvents
      ? `hookEventsTable declared (typed): WHEN=${hookEvents5D!.timestamp ? "yes" : "no"}, ATOP=${hookEvents5D!.atopCommit ? "yes" : "no"}, THROUGH=${hookEvents5D!.sessionId ? "yes" : "no"}, BY=${hookEvents5D!.byIdentity ? "yes" : "no"}, WITH=${hookEvents5D!.withReasoning ? "yes" : "no"} — ${typedLineageDimensions}/5 dimensions`
      : `WHEN(timestamp): ${hasTimestampFields ? "yes" : "no"}, BY(identity): ${hasIdentityField ? "yes" : "no"}, WITH(reasoning): ${hasReasoningField ? "yes" : "no"} — ${lineageDimensions}/3 detectable dimensions`,
    whyItMatters: "Decision Lineage captures WHY a decision was made (WHEN/ATOP/THROUGH/BY/WITH). Without it, the system cannot audit past decisions or learn from outcomes. This is the observation layer that BackPropagation reads.",
    evidenceKind: hasTypedHookEvents ? "typed" : "inferential",
    upgradeAction: hasTypedHookEvents
      ? (typedLineageDimensions < 5 ? "Add missing 5D fields to hookEventsTable declaration (atopCommit, withReasoning are optional but recommended)." : undefined)
      : (lineageDimensions < 2
        ? "Add audit fields to key entities: createdAt (WHEN), createdBy/updatedBy (BY), reasoning (WITH). These enable Decision Lineage capture."
        : undefined),
    priority: hasTypedHookEvents
      ? (typedLineageDimensions < 5 ? "low" : undefined)
      : (lineageDimensions < 2 ? "medium" : undefined),
  });

  // --- SA-18: Tribal Knowledge Progression ---
  // Evidence: project uses typed descriptions (BilingualDesc), DH reasoning in design
  const allHaveDescriptions = exports.data.objectTypes.every((e) => e.description !== undefined);
  const propertiesHaveDescriptions = exports.data.objectTypes.every((e) =>
    e.properties.every((p) => p.description !== undefined),
  );
  const tribalScore = [allHaveDescriptions, propertiesHaveDescriptions, hasFunctions, toolExposedFns.length > 0].filter(Boolean).length;
  sections.push({
    section: "SA-18: Tribal Knowledge Encoding (Stage 1→3)",
    semanticsRef: "TRIBAL_KNOWLEDGE_PROGRESSION stages 1-3",
    coverage: tribalScore >= 3 ? "implemented" : tribalScore >= 2 ? "partial" : "missing",
    evidence: `Entity descriptions: ${allHaveDescriptions ? "all" : "some missing"}, Property descriptions: ${propertiesHaveDescriptions ? "all" : "some missing"}, Functions: ${hasFunctions ? "yes" : "no"}, Tool-exposed: ${toolExposedFns.length > 0 ? "yes" : "no"}`,
    whyItMatters: "Tribal Knowledge Progression: Stage 1 (implicit) → Stage 2 (encoded as DH/HC) → Stage 3 (LLM-accessible via toolExposure). BilingualDesc descriptions encode expert knowledge; functions with toolExposure make it LLM-accessible.",
    upgradeAction: tribalScore < 3
      ? "Add BilingualDesc to all entities and properties (Stage 2). Set toolExposure=true on computation functions (Stage 3). This codifies tribal knowledge for LLM grounding."
      : undefined,
    priority: tribalScore < 3 ? "medium" : undefined,
  });

  // --- SA-19: K-LLM Readiness ---
  // K-LLM works when multiple sessions produce identical results from same ontology.
  // Evidence: typed constants (descriptions, constraints) ensure determinism.
  const hasConstraints = exports.data.valueTypes.some((v) => v.constraints.length > 0) ||
    exports.data.objectTypes.some((e) => e.properties.some((p) => p.constraints && p.constraints.length > 0));
  const vendorTokens = ["anthropic", "claude", "openai", "gpt", "codex", "gemini", "grok", "xai", "bedrock", "vertex"] as const;
  const vendorLeakageRefs: string[] = [];
  const collectIfVendorShaped = (label: string, value: string | undefined) => {
    const normalized = value?.toLowerCase();
    if (!normalized) return;
    if (vendorTokens.some((token) => normalized.includes(token))) {
      vendorLeakageRefs.push(`${label}:${value}`);
    }
  };

  for (const entity of exports.data.objectTypes) {
    collectIfVendorShaped(`entity:${entity.apiName}`, entity.apiName);
    collectIfVendorShaped(`entity:${entity.apiName}:display`, entity.displayName);
    collectIfVendorShaped(`entity:${entity.apiName}:desc`, entity.description?.en);
    for (const property of entity.properties) {
      collectIfVendorShaped(`property:${entity.apiName}.${property.apiName}`, property.apiName);
      collectIfVendorShaped(`property:${entity.apiName}.${property.apiName}:desc`, property.description?.en);
    }
  }
  for (const fn of exports.logic.functions) {
    collectIfVendorShaped(`function:${fn.apiName}`, fn.apiName);
    collectIfVendorShaped(`function:${fn.apiName}:desc`, fn.description?.en);
  }
  for (const mutation of exports.action.mutations) {
    collectIfVendorShaped(`mutation:${mutation.apiName}`, mutation.apiName);
    collectIfVendorShaped(`mutation:${mutation.apiName}:desc`, mutation.description?.en);
  }

  // Typed path: check exports.learn.providerNeutral
  const hasTypedProviderNeutral = exports.learn?.providerNeutral === true;
  const llmiReady = hasConstraints && allHaveDescriptions && vendorLeakageRefs.length === 0;
  const llmiReadyFull = llmiReady || (hasTypedProviderNeutral && allHaveDescriptions && vendorLeakageRefs.length === 0);
  sections.push({
    section: "SA-19: K-LLM Multi-Model Readiness",
    semanticsRef: "K_LLM, LLM_INDEPENDENCE, OOSD-01 Code in Business Language",
    coverage: llmiReadyFull ? "implemented" : allHaveDescriptions && vendorLeakageRefs.length === 0 ? "partial" : "missing",
    evidence: [
      hasTypedProviderNeutral ? "learn.providerNeutral=true (typed)" : undefined,
      `ValueTypes: ${exports.data.valueTypes.length}`,
      `Constraints: ${hasConstraints ? "present" : "absent"}`,
      `Descriptions: ${allHaveDescriptions ? "complete" : "incomplete"}`,
      `Vendor leakage: ${vendorLeakageRefs.length === 0 ? "none" : vendorLeakageRefs.slice(0, 3).join("; ")}`,
    ].filter(Boolean).join(", "),
    whyItMatters: "K-LLM: multiple LLMs reasoning against the SAME ontology produce consensus. Typed constraints and complete descriptions ensure every session interprets the domain identically. LLM-independence extends this: provider identity must stay separate from domain semantics so Claude/Codex coexistence does not rewrite ontology meaning.",
    evidenceKind: hasTypedProviderNeutral ? "typed" : (vendorLeakageRefs.length > 0 ? "inferential" : "structural"),
    upgradeAction: !llmiReadyFull
      ? "Add ValueTypes with constraints (regex, range, enum), ensure all entities/properties have BilingualDesc, and remove vendor-specific words from ontology semantics. Runtime traces should keep provider-neutral fields such as actorType, interfaceFamily, normalizedModel, and modelProvider so multi-model audit remains independent of any one vendor."
      : undefined,
    priority: vendorLeakageRefs.length > 0 || !allHaveDescriptions ? "medium" : undefined,
  });

  // --- SA-20: OOSD Compliance ---
  // OOSD-01: Business language (entities named in domain terms)
  // OOSD-03: Marginal cost → zero (typed → codegen ready)
  const entitiesHavePlurals = exports.data.objectTypes.every((e) => e.pluralName && e.pluralName.length > 0);
  const entitiesHaveDisplayNames = exports.data.objectTypes.every((e) => e.displayName && e.displayName.length > 0);
  sections.push({
    section: "SA-20: OOSD Principles (4 Principles)",
    semanticsRef: "OOSD_PRINCIPLES: Code in Business Language, Abstraction, Marginal Cost→Zero, Defragmentation",
    coverage: entitiesHavePlurals && entitiesHaveDisplayNames && allHaveDescriptions ? "implemented" : "partial",
    evidence: `DisplayNames: ${entitiesHaveDisplayNames ? "all" : "some missing"}, PluralNames: ${entitiesHavePlurals ? "all" : "some missing"}, Descriptions: ${allHaveDescriptions ? "all" : "some missing"}`,
    whyItMatters: "OOSD mandates business concepts as first-class API objects. DisplayName + pluralName + description make entities self-documenting for code generation. Without them, generated code uses technical names instead of business language.",
  });

  // --- SA-21: DH Refinement Protocol (REF-01..05 BackPropagation) ---
  // Already checked SA-12 for outcome entity; here check for refinement infrastructure
  const hasRefinementEntity = exports.data.objectTypes.some((e) =>
    e.apiName.toLowerCase().includes("accuracy") || e.apiName.toLowerCase().includes("refinement") || e.apiName.toLowerCase().includes("graduation"),
  );
  const hasTypedBackPropagation = hasTypedOutcomes && hasTypedRefinementSurface;
  sections.push({
    section: "SA-21: BackPropagation Infrastructure (REF-01..05)",
    semanticsRef: "DH_REFINEMENT_PROTOCOL: Outcome Collection → Accuracy → Drift → Update → Graduation",
    coverage: hasTypedBackPropagation
      ? "implemented"
      : (hasTypedOutcomes || hasTypedRefinementSurface)
        ? "partial"
        : hasOutcomeEntity && hasRefinementEntity ? "implemented" : hasOutcomeEntity ? "partial" : "missing",
    evidence: hasTypedBackPropagation || hasTypedOutcomes || hasTypedRefinementSurface
      ? [
          typedLearn?.outcomeEntityRef ? `outcomeEntityRef=${typedLearn.outcomeEntityRef}` : undefined,
          typedLearn?.accuracyEntityRef ? `accuracyEntityRef=${typedLearn.accuracyEntityRef}` : undefined,
          typedLearn?.refinementSignalEntityRef ? `refinementSignalEntityRef=${typedLearn.refinementSignalEntityRef}` : undefined,
          (typedLearn?.graduationMutationRefs?.length ?? 0) > 0 ? `graduationMutationRefs=${typedLearn!.graduationMutationRefs!.join(",")}` : undefined,
          hasTypedBackPropagation ? "typed REF chain declared" : "typed REF chain partially declared",
        ].filter(Boolean).join("; ")
      : hasRefinementEntity
        ? "Refinement/accuracy/graduation entities detected — BackPropagation infrastructure present"
        : hasOutcomeEntity ? "Outcome entity exists but no refinement infrastructure" : "No BackPropagation entities",
    whyItMatters: "REF-01..05 is the BACKPROPAGATION chain: outcomes flow backward to refine DH constants and graduate PA levels. Without it, LEARN mechanisms record but do not refine — the system improves only when a human manually adjusts.",
    evidenceKind: hasTypedBackPropagation || hasTypedOutcomes || hasTypedRefinementSurface ? "typed" : "inferential",
    upgradeAction: hasTypedBackPropagation ? undefined : (!(hasTypedOutcomes || hasOutcomeEntity)
      ? "This is Stage 5 (Living System) infrastructure. Add OutcomeRecord, AccuracyScore, RefinementSignal entities to enable automated DH refinement from tracked decision outcomes."
      : !(hasTypedRefinementSurface || hasRefinementEntity)
        ? "Declare typed BackPropagation refs in learn: accuracyEntityRef, refinementSignalEntityRef, and graduationMutationRefs so REF-02..05 are explicit instead of inferred."
        : undefined),
    priority: hasTypedBackPropagation ? undefined : "low",
  });

  // --- SA-22: Workflow Lineage (WL-01..04) ---
  const hasLogEntity = exports.data.objectTypes.some((e) =>
    e.apiName.toLowerCase().includes("log") || e.apiName.toLowerCase().includes("trace") || e.apiName.toLowerCase().includes("audit"),
  );
  sections.push({
    section: "SA-22: Workflow Lineage (WL-01..04)",
    semanticsRef: "WORKFLOW_LINEAGE: Function Trace, Action Trace, Automation Trace, LM Trace",
    coverage: hasTypedWorkflowLineage ? "implemented" : hasLogEntity ? "implemented" : "missing",
    evidence: hasTypedWorkflowLineage
      ? `workflowLineageEntityRefs=${typedLearn!.workflowLineageEntityRefs!.join(",")}`
      : hasLogEntity ? "Log/trace/audit entity detected — execution tracing present" : "No trace entities — function/action/automation executions are not logged",
    whyItMatters: "Workflow Lineage traces every function invocation, action execution, automation run, and LM call with full I/O. Without it, the system operates in the dark — no visibility into what happened, when, and why.",
    evidenceKind: hasTypedWorkflowLineage ? "typed" : "inferential",
    upgradeAction: !(hasTypedWorkflowLineage || hasLogEntity)
      ? "Add an AuditLog or ActionTrace entity capturing: timestamp, actor, action, input, output, duration. This enables Workflow Lineage for compliance and debugging."
      : undefined,
    priority: !(hasTypedWorkflowLineage || hasLogEntity) ? "medium" : undefined,
  });

  // --- SA-23: Ontology MCP (External Agent Grounding) ---
  // Evidence: external agent surface can be grounded via queries/functions and
  // agent-guided actions.
  const mcpReady = hasQueries && (toolExposedFns.length > 0 || agentGuidedMutations.length > 0);
  sections.push({
    section: "SA-23: Ontology MCP Readiness (MCP-01..03)",
    semanticsRef: "ONTOLOGY_MCP: Entity Schema Access, Function Invocation, Action Proposal",
    coverage: mcpReady ? "implemented" : (toolExposedFns.length > 0 || agentGuidedMutations.length > 0 || hasQueries) ? "partial" : "missing",
    evidence:
      `Tool-exposed functions: ${toolExposedFns.length}, Queries: ${exports.logic.queries.length}, `
      + `Mutations with agentToolDescription: ${agentGuidedMutations.length} — `
      + `${mcpReady ? "ready for MCP external agent grounding" : "incomplete MCP surface"}`,
    whyItMatters:
      "Ontology MCP enables external agents (Claude Code, LangChain) to access the ontology via standardized protocol. "
      + "Official action guidance and query/function surfaces reduce ambiguous tool use and keep submissions inside review and criteria gates.",
    upgradeAction: !mcpReady
      ? "Ensure queries exist, set toolExposure=true on computation functions where appropriate, and add agentToolDescription to externally callable mutations."
      : undefined,
    priority: !mcpReady ? "low" : undefined,
  });

  // --- SA-24: Agent Composition (ACP-01..05) ---
  // Evidence: multi-step patterns — mutations that reference other mutations or have sideEffects
  const hasMultiStepMutations = exports.action.mutations.some((m) =>
    (m.sideEffects && m.sideEffects.length > 0) || (m.edits.length > 2),
  );
  sections.push({
    section: "SA-24: Agent Composition Protocol (ACP-01..05)",
    semanticsRef: "AGENT_COMPOSITION_PROTOCOL: Context → Reasoning → Proposal → Lineage → Recovery",
    coverage: hasMultiStepMutations && hasFunctions && hasQueries ? "implemented" : (hasFunctions || hasQueries) ? "partial" : "missing",
    evidence: `Queries(Context): ${exports.logic.queries.length}, Functions(Reasoning): ${exports.logic.functions.length}, Multi-step mutations: ${hasMultiStepMutations ? "yes" : "no"}`,
    whyItMatters: "ACP defines how agents chain DATA queries → LOGIC tools → ACTION proposals. Without queries (ACP-01 Context), functions (ACP-02 Reasoning), and multi-step mutations (ACP-03 Proposal), agents cannot compose ontology-grounded workflows.",
    upgradeAction: !hasMultiStepMutations
      ? "Add sideEffects (webhooks, notifications) to mutations and ensure queries + functions exist for the full ACP pipeline."
      : undefined,
    priority: !hasMultiStepMutations ? "low" : undefined,
  });

  // --- SA-25: Edge Semantics (EDGE-01..04) ---
  // Future capability — mark as not_applicable for most projects
  sections.push({
    section: "SA-25: Edge Semantics (EDGE-01..04)",
    semanticsRef: "EDGE_SEMANTICS: DATA/LOGIC/ACTION at Edge + Central Sync Protocol",
    coverage: "missing",
    evidence: "Edge deployment not assessed — requires NVIDIA hardware integration (future capability)",
    whyItMatters: "Edge Semantics enables the ontology to run on disconnected edge devices (factory floors, vehicles, battlefield sensors) and reconcile with central on reconnect. Future capability for most projects.",
  });

  // --- SA-26: Project Scope Frontend Views ---
  const frontendViewCount = exports.frontend?.views.length ?? 0;
  const hasFrontendViews = frontendViewCount > 0;
  const hasFrontendInteraction = exports.frontend?.interaction !== undefined;
  const hasFrontendRendering = exports.frontend?.rendering !== undefined;
  sections.push({
    section: "SA-26: Project Scope Frontend Views (PS-01..04)",
    semanticsRef: "PROJECT_SCOPE_ONTOLOGY_SURFACES PS-01..04, HUMAN_AGENT_LEVERAGE_CRITERIA HAL-01..02",
    coverage: hasFrontendViews ? "implemented" : (hasFrontendInteraction || hasFrontendRendering ? "partial" : "missing"),
    evidence: hasFrontendViews
      ? `${frontendViewCount} frontend views declared in typed ontology scope`
      : hasFrontendInteraction || hasFrontendRendering
        ? "Interaction/rendering declarations exist but no typed frontend view scope"
        : "No frontend ontology scope detected",
    whyItMatters:
      "Without typed frontend views, AI agents still have to invent routes, primary data bindings, and action surfaces. "
      + "That breaks shared mutable context between backend ontology and user-facing applications.",
    upgradeAction: !hasFrontendViews
      ? "Add ontology/frontend.ts with typed FrontendView declarations linking routes to entities, queries, functions, and actions."
      : undefined,
    priority: !hasFrontendViews ? "medium" : undefined,
  });

  // --- SA-27: Agent-Facing Frontend Surfaces ---
  const frontendAgentSurfaceCount = exports.frontend?.agentSurfaces?.length ?? 0;
  const hasFrontendAgentSurfaces = frontendAgentSurfaceCount > 0;
  sections.push({
    section: "SA-27: Agent-Facing Frontend Surfaces",
    semanticsRef: "PROJECT_SCOPE_ONTOLOGY_SURFACES PS-03, HUMAN_AGENT_LEVERAGE_CRITERIA HAL-01..03, HRP-02/03",
    coverage: hasFrontendAgentSurfaces ? "implemented" : ((toolExposedFns.length > 0 || hasMutations) ? "partial" : "missing"),
    evidence: hasFrontendAgentSurfaces
      ? `${frontendAgentSurfaceCount} typed agent surfaces declared`
      : (toolExposedFns.length > 0 || hasMutations)
        ? "Backend agent/tool surfaces exist but no typed frontend agent surface"
        : "No agent-facing surface detected",
    whyItMatters:
      "DevCon 5 treats agent panels, voice agents, and workflow inboxes as first-class builder surfaces. "
      + "Without typed agent-facing UI contracts, HITL reduction stops at backend tools and never reaches operator workflows.",
    upgradeAction: !hasFrontendAgentSurfaces && (toolExposedFns.length > 0 || hasMutations)
      ? "Add FrontendAgentSurface declarations for workflow inboxes, assistant panels, or voice agents consuming backend queries/functions/actions."
      : undefined,
    priority: !hasFrontendAgentSurfaces && (toolExposedFns.length > 0 || hasMutations) ? "medium" : undefined,
  });

  // --- SA-28: Sandbox / Scenario Review Flows ---
  const frontendScenarioFlowCount = exports.frontend?.scenarioFlows?.length ?? 0;
  const hasFrontendScenarioFlows = frontendScenarioFlowCount > 0;
  sections.push({
    section: "SA-28: Sandbox Review Flows",
    semanticsRef: "PROJECT_SCOPE_ONTOLOGY_SURFACES PS-04, SCENARIOS_FRAMEWORK, Progressive Autonomy",
    coverage: hasFrontendScenarioFlows ? "implemented" : (hasScenarioSupport ? "partial" : "missing"),
    evidence: hasFrontendScenarioFlows
      ? `${frontendScenarioFlowCount} typed scenario/sandbox flows declared`
      : hasScenarioSupport
        ? "Scenario entity exists but no typed frontend compare/submit/commit flow"
        : "No scenario or sandbox flow detected",
    whyItMatters:
      "Scenario entities alone do not reduce HITL. Minimal-HITL systems need explicit compare, submit, and commit surfaces so humans review proposals in sandbox before production mutation.",
    upgradeAction: hasScenarioSupport && !hasFrontendScenarioFlows
      ? "Add FrontendScenarioFlow declarations mapping scenario entities to comparison functions and submit/commit actions."
      : undefined,
    priority: hasScenarioSupport && !hasFrontendScenarioFlows ? "medium" : undefined,
  });

  // --- SA-29: Runtime View Bindings ---
  const runtimeViewBindingCount = exports.runtime?.viewBindings.length ?? 0;
  const hasRuntimeViewBindings = runtimeViewBindingCount > 0;
  sections.push({
    section: "SA-29: Runtime View Bindings",
    semanticsRef: "ORCH-03 Runtime Digital Twin, DC5-09 continuously propagating code surface",
    coverage: hasRuntimeViewBindings ? "implemented" : hasFrontendViews ? "partial" : "missing",
    evidence: hasRuntimeViewBindings
      ? `${runtimeViewBindingCount} typed runtime view bindings declared`
      : hasFrontendViews
        ? "Frontend view scope exists but runtime bindings are still implicit in adapters"
        : "No runtime view binding layer detected",
    whyItMatters:
      "Project-scope ontology is incomplete if routes, loaders, and persistence precedence stay hidden inside React or backend adapters. "
      + "Runtime view bindings make execution inspectable instead of ad hoc.",
    upgradeAction: hasFrontendViews && !hasRuntimeViewBindings
      ? "Add RuntimeOntology view bindings mapping frontend views to canonical routes, components, source bindings, and persistence targets."
      : undefined,
    priority: hasFrontendViews && !hasRuntimeViewBindings ? "medium" : undefined,
  });

  // --- SA-30: Runtime Review / Transaction Contracts ---
  const runtimeReviewBindingCount = exports.runtime?.reviewBindings?.length ?? 0;
  const runtimeTransactionBindingCount = exports.runtime?.transactionBindings?.length ?? 0;
  const hasRuntimeReviewContracts = runtimeReviewBindingCount > 0;
  const hasRuntimeTransactionContracts = runtimeTransactionBindingCount > 0;
  sections.push({
    section: "SA-30: Runtime Review and Transaction Contracts",
    semanticsRef: "DC5-10 Scenarios/Security/Transactions, Progressive Autonomy",
    coverage: (hasRuntimeReviewContracts && hasRuntimeTransactionContracts)
      ? "implemented"
      : (hasFrontendScenarioFlows || hasScenarioSupport)
        ? "partial"
        : "missing",
    evidence: `reviewBindings=${runtimeReviewBindingCount}, transactionBindings=${runtimeTransactionBindingCount}`,
    whyItMatters:
      "Scenarios and approval semantics are not enough unless the runtime also declares where staged review happens and what the transaction boundary is. "
      + "Without that, sandbox-first human-agent teaming remains conceptual instead of enforceable.",
    upgradeAction: (hasFrontendScenarioFlows || hasScenarioSupport) && (!hasRuntimeReviewContracts || !hasRuntimeTransactionContracts)
      ? "Add runtime review bindings and transaction bindings that map scenario flows to staged submit/commit behavior and explicit mutation boundaries."
      : undefined,
    priority: (hasFrontendScenarioFlows || hasScenarioSupport) && (!hasRuntimeReviewContracts || !hasRuntimeTransactionContracts) ? "medium" : undefined,
  });

  // --- SA-31: Runtime Audit / LEARN Closure ---
  const runtimeAuditBindingCount = exports.runtime?.auditBindings?.length ?? 0;
  const hasRuntimeAuditBindings = runtimeAuditBindingCount > 0;
  sections.push({
    section: "SA-31: Runtime Audit and LEARN Closure",
    semanticsRef: "ORCH-04 Governance/Lineage, ORCH-05 LEARN, DC5-10 Workflow Lineage",
    coverage: hasRuntimeAuditBindings ? "implemented" : (hasTypedEvalResults || hasTypedOutcomes || hasOutcomeEntity) ? "partial" : "missing",
    evidence: hasRuntimeAuditBindings
      ? `${runtimeAuditBindingCount} typed runtime audit bindings declared`
      : (hasTypedEvalResults || hasTypedOutcomes || hasOutcomeEntity)
        ? "LEARN entities exist but runtime audit/eval closure is not typed"
        : "No runtime audit/eval closure detected",
    whyItMatters:
      "Workflow Lineage and LEARN are only trustworthy when runtime surfaces explicitly declare how hook events, audit logs, evaluations, outcomes, and accuracy signals are connected.",
    upgradeAction: (hasTypedEvalResults || hasTypedOutcomes || hasOutcomeEntity) && !hasRuntimeAuditBindings
      ? "Add runtime audit bindings that connect hook-event capture, audit logs, eval records, outcome records, and accuracy signals."
      : undefined,
    priority: (hasTypedEvalResults || hasTypedOutcomes || hasOutcomeEntity) && !hasRuntimeAuditBindings ? "medium" : undefined,
  });

  // --- SA-32: Local-first / Embedded Ontology Surfaces ---
  const offlineViews = exports.frontend?.views.filter((view) =>
    view.supportsOffline || view.surface === "embeddedOntologyApp" || (view.syncEntityApiNames?.length ?? 0) > 0
  ) ?? [];
  const embeddedOntologySupportCount = exports.runtime?.supportBindings?.filter((support) => support.kind === "embeddedOntology").length ?? 0;
  const offlineSyncEntityCount = offlineViews.reduce((sum, view) => sum + (view.syncEntityApiNames?.length ?? 0), 0);
  sections.push({
    section: "SA-32: Embedded Ontology / Local-first App Surface",
    semanticsRef: "EMBEDDED_ONTOLOGY_APP_SURFACES EO-01..05, PROJECT_SCOPE_ONTOLOGY_SURFACES PS-02",
    coverage:
      offlineViews.length > 0
        ? (embeddedOntologySupportCount > 0 && offlineSyncEntityCount > 0 ? "implemented" : "partial")
        : embeddedOntologySupportCount > 0
          ? "partial"
          : "missing",
    evidence:
      `offlineViews=${offlineViews.length}, syncEntityApiNames=${offlineSyncEntityCount}, `
      + `runtimeEmbeddedSupport=${embeddedOntologySupportCount}`,
    whyItMatters:
      "DevCon 5's local-first builder story is now backed by official embedded ontology guidance. "
      + "If a project claims offline or local-first operation, it should declare both the synced entity set and the runtime support surface explicitly.",
    upgradeAction:
      offlineViews.length > 0 && (embeddedOntologySupportCount === 0 || offlineSyncEntityCount === 0)
        ? "For offline-capable or embedded ontology views, declare syncEntityApiNames on the frontend view and add a runtime support binding with kind=\"embeddedOntology\"."
        : undefined,
    priority:
      offlineViews.length > 0 && (embeddedOntologySupportCount === 0 || offlineSyncEntityCount === 0)
        ? "medium"
        : undefined,
  });

  // --- Compute Twin Maturity Stage ---
  const stage1 = hasEntities && hasProperties; // Snapshot
  const stage2 = stage1; // Mirror (real-time — can't detect from ontology, assume if stage1)
  const stage3 = stage2 && logicRichness >= 2; // Model (LOGIC layer active)
  const stage4 = stage3 && hasMutations; // Operator (ACTION layer active)
  const learnActive =
    hasTypedEvalResults
    || hasTypedOutcomes
    || hasTypedFeedbackSurface
    || hasTypedEvaluationSurface
    || hasFeedbackEntity
    || hasFeedbackMutation
    || hasOutcomeEntity;
  const backpropActive = hasTypedBackPropagation || (hasOutcomeEntity && hasRefinementEntity);
  const stage5 = stage4 && learnActive && backpropActive; // Living System (LEARN + BackPropagation)

  const maturity = stage5 ? 5 : stage4 ? 4 : stage3 ? 3 : stage2 ? 2 : stage1 ? 1 : 0;
  const maturityNames = ["No Twin", "Snapshot", "Mirror", "Model", "Operator", "Living System"];

  const maturityEvidence = [
    stage1 ? "DATA: entities + properties exist" : "DATA: missing entities",
    stage3 ? "LOGIC: links + functions/derived/queries active" : "LOGIC: insufficient reasoning layer",
    stage4 ? "ACTION: mutations exist" : "ACTION: no mutations",
    learnActive ? "LEARN: feedback/outcome mechanism detected" : "LEARN: no feedback loop",
  ].join("; ");

  // --- Coverage calculation ---
  const implementedCount = sections.filter((s) => s.coverage === "implemented").length;
  const partialCount = sections.filter((s) => s.coverage === "partial").length;
  const coveragePercent = Math.round(((implementedCount + partialCount * 0.5) / sections.length) * 100);

  // --- Upgrade recommendations (sorted by priority) ---
  const priorityOrder: Record<UpgradePriority, number> = { high: 0, medium: 1, low: 2 };
  const upgrades = sections
    .filter((s) => s.upgradeAction !== undefined)
    .sort((a, b) => priorityOrder[a.priority ?? "low"] - priorityOrder[b.priority ?? "low"]);

  // --- Generate machine-readable UpgradeSpecs ---
  const specs: UpgradeSpec[] = [];

  // SA-05: toolExposure on functions
  if (hasFunctions && toolExposedFns.length === 0) {
    for (const fn of exports.logic.functions) {
      specs.push({
        sectionId: "SA-05",
        priority: "medium",
        domain: "logic",
        operation: "modifyFunction",
        target: fn.apiName,
        details: { field: "toolExposure", value: true },
        reason: "DH-LOGIC-13: function computes values LLMs cannot reliably do → expose as tool",
      });
    }
  }

  // SA-11: Feedback entity + mutation (skip when typed evidence already declares feedback surface)
  if (!hasTypedEvalResults && !hasTypedFeedbackSurface && !hasFeedbackLoop) {
    specs.push({
      sectionId: "SA-11",
      priority: "medium",
      domain: "data",
      operation: "addEntity",
      target: "FeedbackRecord",
      details: {
        properties: [
          { apiName: "feedbackId", baseType: "string", required: true, readonly: true },
          { apiName: "targetEntityId", baseType: "string", required: true, readonly: false },
          { apiName: "rating", baseType: "string", required: true, readonly: false },
          { apiName: "comment", baseType: "string", required: false, readonly: false },
          { apiName: "createdBy", baseType: "string", required: true, readonly: false },
          { apiName: "createdAt", baseType: "timestamp", required: true, readonly: true },
        ],
        primaryKey: "feedbackId",
        titleKey: "rating",
      },
      reason: "LEARN-02: end-user feedback loop for AI output quality measurement",
    });
    specs.push({
      sectionId: "SA-11",
      priority: "medium",
      domain: "action",
      operation: "addMutation",
      target: "submitFeedback",
      details: {
        entityApiName: "FeedbackRecord",
        mutationType: "create",
        parameters: [
          { name: "targetEntityId", type: "string", required: true },
          { name: "rating", type: "string", required: true },
          { name: "comment", type: "string", required: false },
        ],
        reviewLevel: "monitor",
      },
      reason: "LEARN-02: mutation to capture user feedback on AI decisions",
    });
  }

  if (!hasTypedEvalResults && !hasTypedEvaluationSurface && !hasExplicitRubrics) {
    specs.push({
      sectionId: "SA-11",
      priority: "medium",
      domain: "data",
      operation: "addEntity",
      target: "EvaluationRecord",
      details: {
        properties: [
          { apiName: "evaluationId", baseType: "string", required: true, readonly: true },
          { apiName: "targetDhId", baseType: "string", required: true, readonly: false },
          { apiName: "evaluatorSource", baseType: "string", required: true, readonly: false },
          { apiName: "summaryScore", baseType: "float", required: true, readonly: false },
          { apiName: "normalizedDelta", baseType: "float", required: true, readonly: false },
          { apiName: "rationale", baseType: "string", required: false, readonly: false },
          { apiName: "judgedAt", baseType: "timestamp", required: true, readonly: true },
        ],
        primaryKey: "evaluationId",
        titleKey: "targetDhId",
      },
      reason: "LEARN-02: explicit rubric/evaluator artifact for self-improving decision systems",
    });
    specs.push({
      sectionId: "SA-11",
      priority: "medium",
      domain: "action",
      operation: "addMutation",
      target: "recordEvaluation",
      details: {
        entityApiName: "EvaluationRecord",
        mutationType: "create",
        parameters: [
          { name: "targetDhId", type: "string", required: true },
          { name: "evaluatorSource", type: "string", required: true },
          { name: "summaryScore", type: "number", required: true },
          { name: "normalizedDelta", type: "number", required: true },
          { name: "rationale", type: "string", required: false },
        ],
        reviewLevel: "monitor",
      },
      reason: "LEARN-02: persist rubric/evaluator results so the REF chain can consume explicit scores, not just feedback comments",
    });
  }

  // SA-12: Outcome tracking entity (skip when typed evidence confirms outcome records)
  if (!hasTypedOutcomes && !hasOutcomeEntity) {
    specs.push({
      sectionId: "SA-12",
      priority: "low",
      domain: "data",
      operation: "addEntity",
      target: "OutcomeRecord",
      details: {
        properties: [
          { apiName: "outcomeId", baseType: "string", required: true, readonly: true },
          { apiName: "decisionId", baseType: "string", required: true, readonly: false },
          { apiName: "predictedOutcome", baseType: "string", required: true, readonly: false },
          { apiName: "actualOutcome", baseType: "string", required: false, readonly: false },
          { apiName: "delta", baseType: "float", required: false, readonly: false },
          { apiName: "recordedAt", baseType: "timestamp", required: true, readonly: true },
          { apiName: "status", baseType: "string", required: true, readonly: false },
        ],
        primaryKey: "outcomeId",
        titleKey: "decisionId",
      },
      reason: "LEARN-03 + REF-01: decision outcome tracking for BackPropagation chain",
    });
  }

  // SA-17: Decision Lineage fields on entities (skip when typed hookEvents provides 5D)
  if (!hasTypedHookEvents && lineageDimensions < 2) {
    for (const entity of exports.data.objectTypes) {
      const propNames = new Set(entity.properties.map((p) => p.apiName));
      const missing: Array<{ apiName: string; baseType: string }> = [];
      if (!propNames.has("createdAt") && !entity.properties.some((p) => p.apiName.toLowerCase().includes("createdat"))) {
        missing.push({ apiName: "createdAt", baseType: "timestamp" });
      }
      if (!propNames.has("updatedBy") && !entity.properties.some((p) => p.apiName.toLowerCase().includes("updatedby"))) {
        missing.push({ apiName: "updatedBy", baseType: "string" });
      }
      if (missing.length > 0) {
        specs.push({
          sectionId: "SA-17",
          priority: "medium",
          domain: "data",
          operation: "addProperty",
          target: entity.apiName,
          details: { properties: missing },
          reason: "Decision Lineage 5D: WHEN (createdAt) + BY (updatedBy) capture",
        });
      }
    }
  }

  // SA-22: AuditLog entity
  if (!hasTypedWorkflowLineage && !hasLogEntity) {
    specs.push({
      sectionId: "SA-22",
      priority: "medium",
      domain: "data",
      operation: "addEntity",
      target: "AuditLog",
      details: {
        properties: [
          { apiName: "logId", baseType: "string", required: true, readonly: true },
          { apiName: "actionName", baseType: "string", required: true, readonly: false },
          { apiName: "actor", baseType: "string", required: true, readonly: false },
          { apiName: "input", baseType: "string", required: false, readonly: false },
          { apiName: "output", baseType: "string", required: false, readonly: false },
          { apiName: "durationMs", baseType: "integer", required: false, readonly: false },
          { apiName: "timestamp", baseType: "timestamp", required: true, readonly: true },
        ],
        primaryKey: "logId",
        titleKey: "actionName",
      },
      reason: "WL-01..04: Workflow Lineage — trace function/action/automation/LM executions",
    });
  }

  // SA-26: typed frontend view scope
  if (!hasFrontendViews && exports.logic.queries.length > 0) {
    const firstQuery = exports.logic.queries[0];
    specs.push({
      sectionId: "SA-26",
      priority: "medium",
      domain: "frontend",
      operation: "addFrontendView",
      target: `${firstQuery.entityApiName}Dashboard`,
      details: {
        route: "/",
        surface: "dashboard",
        entityApiName: firstQuery.entityApiName,
        primaryQueryRef: firstQuery.apiName,
        mutationActionRefs: exports.action.mutations
          .filter((m) => m.entityApiName === firstQuery.entityApiName)
          .slice(0, 3)
          .map((m) => m.apiName),
      },
      reason: "PS-02: typed frontend route/view contract grounded in backend ontology",
    });
  }

  // SA-27: typed agent-facing surface
  if (!hasFrontendAgentSurfaces && (toolExposedFns.length > 0 || hasMutations)) {
    const firstFn = toolExposedFns[0] ?? exports.logic.functions[0];
    const firstMutation = exports.action.mutations[0];
    specs.push({
      sectionId: "SA-27",
      priority: "medium",
      domain: "frontend",
      operation: "addFrontendAgentSurface",
      target: "OperationsAssistant",
      details: {
        surface: "agentPanel",
        entityApiName: firstMutation?.entityApiName ?? exports.logic.queries[0]?.entityApiName,
        queryRefs: exports.logic.queries.slice(0, 2).map((q) => q.apiName),
        functionRefs: firstFn ? [firstFn.apiName] : [],
        actionRefs: firstMutation ? [firstMutation.apiName] : [],
        reviewLevel: firstMutation?.reviewLevel ?? "recommend",
      },
      reason: "PS-03: typed agent-facing UI surface for ontology-grounded workflows",
    });
  }

  // SA-28: typed sandbox/compare/commit flow
  if (hasScenarioSupport && !hasFrontendScenarioFlows) {
    const scenarioEntity = exports.data.objectTypes.find((e) => {
      const lower = e.apiName.toLowerCase();
      return lower.includes("scenario") || lower.includes("coa");
    });
    const comparisonFns = exports.logic.functions
      .filter((f) => {
        const lower = f.apiName.toLowerCase();
        return lower.includes("compare") || lower.includes("tradeoff") || lower.includes("score") || lower.includes("simulate");
      })
      .slice(0, 3)
      .map((f) => f.apiName);
    const submitMutation = exports.action.mutations.find((m) => {
      const lower = m.apiName.toLowerCase();
      return lower.includes("submit") || lower.includes("propose") || lower.includes("request");
    }) ?? exports.action.mutations[0];
    const commitMutation = exports.action.mutations.find((m) => {
      const lower = m.apiName.toLowerCase();
      return lower.includes("commit") || lower.includes("merge") || lower.includes("approve");
    });
    if (scenarioEntity && submitMutation) {
      specs.push({
        sectionId: "SA-28",
        priority: "medium",
        domain: "frontend",
        operation: "addScenarioFlow",
        target: `${scenarioEntity.apiName}ReviewFlow`,
        details: {
          scenarioEntityApiName: scenarioEntity.apiName,
          comparisonFunctionRefs: comparisonFns,
          submitActionRef: submitMutation.apiName,
          commitActionRef: commitMutation?.apiName,
        },
        reason: "PS-04: typed sandbox compare/submit/commit flow for scenario review before production mutation",
      });
    }
  }

  return {
    twinMaturityStage: maturity,
    twinMaturityName: maturityNames[maturity] ?? "Unknown",
    twinMaturityEvidence: maturityEvidence,
    sections,
    coveragePercent,
    upgradeRecommendations: upgrades,
    upgradeSpecs: specs,
  };
}
