/**
 * palantir-mini schema primitive — FDE 17-Criterion Grading Rubric.
 *
 * Canonical declaration of the FDE Ontology Build Readiness rubric (17
 * criteria; weights sum = 1.0) used by FDEGapReportDetailed (`./fde-gap-report`)
 * to produce a recommendation-only scorecard across 4 review slices: ontology,
 * chatbot, AI FDE / MCP, governance + eval.
 *
 * HARD READ-ONLY INVARIANT: the rubric never authorizes mutation. It only
 * scores readiness. Downstream consumers (FDEGapReportDetailed) MUST surface
 * the score paired with literal `recommendationOnly: true`. Mutation authority
 * remains with SemanticIntentContract + DigitalTwinChangeContract — see
 * `./semantic-intent-contract` + `./digital-twin-change-contract`.
 *
 * Authority:
 *   /home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §10
 *   /home/palantirkc/.claude/plans/splendid-mapping-lemur.md Slice 3 (user-approved plan)
 *
 * Slice 3.A of sprint-138 FDE introduction (Slice 1 already landed
 * FDEOntologyBuildSession + FDEReviewLevel + FDEReviewLevelGap). Schema-only;
 * lib/fde-build/ scorecard composer arrives in Slice 3.B + 3.C.
 *
 * Composition pattern: this rubric is registered with
 * `GRADING_RUBRIC_REGISTRY` (from `./grading-rubric`) so handlers can cite it
 * by RID and reject unregistered/mutated variants. Per-criterion declarations
 * inline the title + scoring config; the rubric declaration carries only the
 * criterionRid list + aggregator.
 *
 * @owner palantirkc-ontology
 * @purpose 17-criterion FDE readiness rubric (recommendation only)
 */

import {
  GRADING_CRITERION_REGISTRY,
  gradingCriterionRid,
  type GradingCriterionDeclaration,
} from "./grading-criterion";
import {
  GRADING_RUBRIC_REGISTRY,
  gradingRubricRid,
  type GradingRubricDeclaration,
} from "./grading-rubric";

// =============================================================================
// Schema version constant
// =============================================================================

export const FDE_GRADING_RUBRIC_SCHEMA_VERSION =
  "palantir-mini/fde-grading-rubric/v1" as const;

// =============================================================================
// 17-criterion declarations (brief §10)
// =============================================================================

/**
 * Internal helper — every FDE criterion shares the same evidence schema (free-
 * form JSON object with optional reasoning + evidence array). Inline rather
 * than imported to keep this file self-contained.
 */
const FDE_EVIDENCE_SCHEMA = JSON.stringify({
  type: "object",
  additionalProperties: true,
  properties: {
    reasoning: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
  },
});

/** Helper: build a model-domain criterion (1-10 scale). */
function modelCriterion(
  id: string,
  title: string,
  weight: number,
  threshold: number,
  scoringPrompt: string,
): GradingCriterionDeclaration {
  return {
    criterionId: gradingCriterionRid(id),
    title,
    description:
      `FDE Ontology Build Readiness criterion (brief §10). ${title}.`,
    rubricDomain: "model",
    passFailLogic: { threshold, scale: "0-10" },
    weightInRubric: weight,
    evidenceSchema: FDE_EVIDENCE_SCHEMA,
    scoringPrompt,
    appliesToDomain: "ontology",
    provenance:
      "/home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §10",
  };
}

/** Helper: build a rule-domain criterion (pass-fail). */
function ruleCriterion(
  id: string,
  title: string,
  weight: number,
  validationExpression: string,
): GradingCriterionDeclaration {
  return {
    criterionId: gradingCriterionRid(id),
    title,
    description:
      `FDE Ontology Build Readiness criterion (brief §10). ${title}.`,
    rubricDomain: "rule",
    passFailLogic: { threshold: 1, scale: "pass-fail" },
    weightInRubric: weight,
    evidenceSchema: FDE_EVIDENCE_SCHEMA,
    validationExpression,
    appliesToDomain: "ontology",
    provenance:
      "/home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §10",
  };
}

const FDE_CRITERIA: readonly GradingCriterionDeclaration[] = [
  modelCriterion(
    "mission_decision_alignment",
    "Mission Decision Alignment",
    0.10,
    7,
    "Score 1-10: does the ontology serve a named operational decision with owner + frequency + current/target decision path?",
  ),
  modelCriterion(
    "object_type_quality",
    "Object Type Quality",
    0.08,
    7,
    "Score 1-10: are object types real-world entities/events with primary-key strategy + human-meaningful title + required vs optional properties + source datasets?",
  ),
  modelCriterion(
    "link_type_quality",
    "Link Type Quality",
    0.07,
    7,
    "Score 1-10: link types declare source + target + cardinality + business meaning + traversal use cases + chatbot exposure policy?",
  ),
  modelCriterion(
    "action_type_and_writeback_quality",
    "Action Type + Writeback Quality",
    0.08,
    7,
    "Score 1-10: actions declare operational intent + CRUD scope + required parameters + side effects + writeback dataset + chatbot confirmation policy?",
  ),
  ruleCriterion(
    "submission_criteria_quality",
    "Submission Criteria Quality",
    0.06,
    "submissionCriteriaNeedsHumanReview must be empty OR explicitly flagged in scorecard",
  ),
  modelCriterion(
    "function_contract_quality",
    "Function Contract Quality",
    0.06,
    7,
    "Score 1-10: AIP Logic / TS / SQL / external functions declare input/output contracts + determinism + chatbot tool usage + eval suite + version policy?",
  ),
  modelCriterion(
    "aip_chatbot_studio_configuration",
    "AIP Chatbot Studio Configuration",
    0.07,
    7,
    "Score 1-10: chatbot declares ontology + action + function scope + retrieval + document + function-backed context + tool set + citation/confirmation policy + eval suite + session-trace availability?",
  ),
  ruleCriterion(
    "application_state_determinism",
    "Application State Determinism",
    0.05,
    "applicationStateVariables present AND deterministic transitions documented",
  ),
  modelCriterion(
    "retrieval_context_quality",
    "Retrieval Context Quality",
    0.05,
    7,
    "Score 1-10: retrieval context + document context + function-backed context bindings adequate for the named decision?",
  ),
  ruleCriterion(
    "citation_and_evidence_quality",
    "Citation + Evidence Quality",
    0.05,
    "citationPolicy must be required OR optional; never none for high-impact actions",
  ),
  modelCriterion(
    "ai_fde_branching_and_tool_governance",
    "AI FDE Branching + Tool Governance",
    0.06,
    7,
    "Score 1-10: branch-proposal policy + audit policy + mutating-tools-require-approval flag align with Palantir vs Ontology MCP boundary?",
  ),
  ruleCriterion(
    "palantir_mcp_omcp_boundary_control",
    "Palantir MCP + OMCP Boundary Control",
    0.05,
    "palantirMcpInScope XOR ontologyMcpInScope (or both with clear taskKind classification)",
  ),
  ruleCriterion(
    "osdk_resource_scoping",
    "OSDK Resource Scoping",
    0.04,
    "resourcesChanged list present AND scope matches branch declaration",
  ),
  modelCriterion(
    "eval_coverage",
    "Eval Coverage",
    0.06,
    7,
    "Score 1-10: AIP Evals suite covers target functions + chatbot targets + ontology-edit simulation + variance checks + regression baseline + audit session-trace evidence?",
  ),
  ruleCriterion(
    "auditability_and_observability",
    "Auditability + Observability",
    0.04,
    "auditSessionTraceEvidence must be non-empty AND sessionTraceAvailable must be true",
  ),
  ruleCriterion(
    "release_and_change_management",
    "Release + Change Management",
    0.04,
    "branchName present AND reviewersRequired non-empty AND rollbackPlan present",
  ),
  ruleCriterion(
    "post_rename_naming_compliance",
    "Post-Rename Naming Compliance",
    0.04,
    "legacyNamingFindings array empty across all FDEChatbotStudioReview entries",
  ),
];

// =============================================================================
// Weight invariant (sum = 1.0 within 1e-9 tolerance)
// =============================================================================

/**
 * Module-load assertion: criterion weights MUST sum to 1.0. Any drift in the
 * literal table above is a hard error — caught at first import.
 */
const FDE_WEIGHT_SUM = FDE_CRITERIA.reduce(
  (acc, c) => acc + c.weightInRubric,
  0,
);
if (Math.abs(FDE_WEIGHT_SUM - 1.0) > 1e-9) {
  throw new Error(
    `[fde-grading-rubric] FDE criterion weights must sum to 1.0; got ${FDE_WEIGHT_SUM}`,
  );
}

// =============================================================================
// Register all 17 criteria with the canonical GradingCriterionRegistry
// =============================================================================

for (const c of FDE_CRITERIA) {
  GRADING_CRITERION_REGISTRY.register(c);
}

// =============================================================================
// FDE_GRADING_RUBRIC declaration + registry registration
// =============================================================================

/**
 * Canonical FDE Ontology Build Readiness rubric. Cites the 17 criteria by RID
 * and declares weighted aggregation. Composed via `GRADING_RUBRIC_REGISTRY`
 * (immutable once registered as canonical).
 *
 * `overallPassFail.threshold = 0.70`: weighted sum across normalized criterion
 * scores must reach 0.70 (out of 1.0) to clear the rubric. The composer
 * derives normalization by dividing each criterion's raw score by its scale
 * max (10 for model, 1 for rule) before applying weightInRubric.
 *
 * HARD READ-ONLY INVARIANT: the rubric never authorizes mutation. It scores
 * readiness only. FDEGapReportDetailed wraps the score with literal
 * `recommendationOnly: true`.
 */
export const FDE_GRADING_RUBRIC: GradingRubricDeclaration = {
  rubricId: gradingRubricRid("rubric:fde-readiness/v1"),
  canonicalRubricRid: gradingRubricRid("rubric:fde-readiness/v1"),
  title: "FDE Ontology Build Readiness — 17 criteria",
  description:
    "Per brief §10. Recommendation-only; never authorizes mutation. " +
    "Score weighted across 4 review slices (ontology / chatbot / AI FDE MCP / " +
    "governance + eval) to produce an FDEGapReportDetailed scorecard.",
  criterionRids: FDE_CRITERIA.map((c) => c.criterionId),
  aggregator: {
    threshold: 0.70,
    scale: "0-1",
    combinator: "weighted",
  },
  appliesToDomain: "ontology",
  status: "canonical",
  registeredAt: "2026-05-14T00:00:00.000Z",
  provenance:
    "/home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §10 + " +
    "/home/palantirkc/.claude/plans/splendid-mapping-lemur.md Slice 3",
  schemaVersionAtRegistration: FDE_GRADING_RUBRIC_SCHEMA_VERSION,
};

GRADING_RUBRIC_REGISTRY.register(FDE_GRADING_RUBRIC);

// =============================================================================
// Foundry equivalence (R5-F14 / S3)
// =============================================================================

import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "FDE rubric blends AIP Evals 5-evaluator semantics with palantir-mini-local " +
    "9-level review levels; no direct Foundry counterpart.",
};
export { categoryFoundryEquivalent as fdeGradingRubricFoundryEquivalent };
