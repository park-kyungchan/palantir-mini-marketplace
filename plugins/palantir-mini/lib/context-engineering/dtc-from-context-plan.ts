import type { FDEOntologyEngineeringSession } from "../fde-ontology-engineering/types";
import type {
  DigitalTwinChangeContract,
  DigitalTwinRequiredUserDecision,
  DigitalTwinRiskRecord,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { DigitalTwinChangeBoundary } from "../prompt-front-door/boundary-field";
import { semanticIntentContractRefFromApproved } from "../semantic-intent/approved-contract";
import type {
  ContextEngineeringPlan,
  ContextEngineeringPlanV2,
  ContextEngineeringPlanV3,
  ContextEngineeringPlanV3LaneId,
  ProjectIndexContext,
} from "./context-plan-builder";

export interface DtcReviewBeforeMutationApproval {
  readonly data: string;
  readonly logic: string;
  readonly action: string;
  readonly approvalInstruction: string;
}

export interface DraftDtcFromContextPlanInput {
  readonly semanticIntentContract: SemanticIntentContract;
  readonly fdeSession: Pick<
    FDEOntologyEngineeringSession,
    "sessionId" | "projectRoot" | "sourceRefs" | "confirmedUserGoal"
  >;
  readonly contextEngineeringPlan: ContextEngineeringPlan;
  readonly projectIndex: ProjectIndexContext;
}

export interface DraftDtcFromContextPlanResult {
  readonly digitalTwinChangeContract: DigitalTwinChangeContract;
  readonly reviewBeforeMutationApproval: DtcReviewBeforeMutationApproval;
}

export interface DtcReviewBeforeMutationApprovalV2 extends DtcReviewBeforeMutationApproval {
  readonly structuredData: readonly string[];
  readonly structuredLogic: readonly string[];
  readonly structuredAction: readonly string[];
  readonly technology: string;
  readonly frontendRuntime: string;
  readonly validationPlan: readonly string[];
  readonly risks: readonly string[];
  readonly requiredUserDecisions: readonly DigitalTwinRequiredUserDecision[];
}

export interface DtcReviewLaneBoundary {
  readonly lane: ContextEngineeringPlanV3LaneId;
  readonly summary: string;
  readonly boundary: string;
  readonly evidenceRefs: readonly string[];
  readonly advisoryOnly: true;
  readonly mutationAuthorizedFromCard: false;
}

export interface DtcReviewBeforeMutationApprovalV3 extends DtcReviewBeforeMutationApprovalV2 {
  readonly security: string;
  readonly structuredSecurity: readonly string[];
  readonly laneBoundaries: readonly DtcReviewLaneBoundary[];
}

export interface DraftDtcFromContextPlanV2Input
  extends Omit<DraftDtcFromContextPlanInput, "contextEngineeringPlan"> {
  readonly contextEngineeringPlan: ContextEngineeringPlanV2;
}

export interface DraftDtcFromContextPlanV2Result {
  readonly digitalTwinChangeContract: DigitalTwinChangeContract;
  readonly reviewBeforeMutationApproval: DtcReviewBeforeMutationApprovalV2;
}

export interface DraftDtcFromContextPlanV3Input
  extends Omit<DraftDtcFromContextPlanInput, "contextEngineeringPlan"> {
  readonly contextEngineeringPlan: ContextEngineeringPlanV3;
}

export interface DraftDtcFromContextPlanV3Result {
  readonly digitalTwinChangeContract: DigitalTwinChangeContract;
  readonly reviewBeforeMutationApproval: DtcReviewBeforeMutationApprovalV3;
}

function joinLines(lines: readonly string[]): string {
  return lines.filter((line) => line.trim().length > 0).join("\n");
}

function riskRecords(
  plan: Pick<ContextEngineeringPlan, "technologyRecommendation">,
): DigitalTwinRiskRecord[] {
  return [
    {
      riskId: "context-plan.convex-authority",
      kind: "storage-indexing",
      status: "mitigated",
      description:
        "Convex is allowed only as a mirror for session state, decisions, evals, workflow traces, feedback, and lightweight state.",
      mitigation: plan.technologyRecommendation.rationale,
    },
    {
      riskId: "context-plan.unapproved-writeback",
      kind: "permission",
      status: "mitigated",
      description:
        "Mirrored context cannot authorize ontology/schema/reference-pack mutation or unapproved writeback.",
      mitigation: "Require approved DigitalTwinChangeContract before any mutation.",
    },
  ];
}

function riskRecordsV2(plan: ContextEngineeringPlanV2): DigitalTwinRiskRecord[] {
  return [
    ...riskRecords(plan),
    {
      riskId: "context-plan-v2.frontend-runtime-review-only",
      kind: "runtime-portability",
      status: "mitigated",
      description:
        "Frontend/workbench runtime state is a review surface and cannot grant mutation authority.",
      mitigation: plan.frontendRuntimeRecommendation.rationale,
      designAlternative: "Route mutation only through approved SIC/DTC and governed commit paths.",
    },
    {
      riskId: "context-plan-v2.validation-before-mutation",
      kind: "evaluation",
      status: "mitigated",
      description:
        "Required validation commands must remain tied to the DTC review before any mutation path.",
      mitigation: plan.validationPlan.map((item) => item.command).join("; "),
    },
    {
      riskId: "context-plan-v2.required-user-decisions",
      kind: "permission",
      status: "mitigated",
      description:
        "DATA, LOGIC, ACTION, TECHNOLOGY, and GOVERNANCE decisions must be reviewed separately.",
      mitigation: "DTC v2 review result exposes requiredUserDecisions before approval.",
    },
  ];
}

function riskRecordsV3(plan: ContextEngineeringPlanV3): DigitalTwinRiskRecord[] {
  return [
    ...riskRecords(plan),
    {
      riskId: "context-plan-v3.frontend-runtime-review-only",
      kind: "runtime-portability",
      status: "mitigated",
      description:
        "Frontend/workbench runtime state is a review surface and cannot grant mutation authority.",
      mitigation: plan.frontendRuntimeRecommendation.rationale,
      designAlternative: "Route mutation only through approved SIC/DTC and governed commit paths.",
    },
    {
      riskId: "context-plan-v3.validation-before-mutation",
      kind: "evaluation",
      status: "mitigated",
      description:
        "Required validation commands must remain tied to the DTC review before any mutation path.",
      mitigation: plan.validationPlan.map((item) => item.command).join("; "),
    },
    {
      riskId: "context-plan-v3.required-user-decisions",
      kind: "permission",
      status: "mitigated",
      description:
        "DATA, LOGIC, ACTION, SECURITY, TECHNOLOGY, and GOVERNANCE decisions must be reviewed separately.",
      mitigation: "DTC v3 review result exposes requiredUserDecisions before approval.",
    },
    {
      riskId: "context-plan-v3.security-lane-advisory-only",
      kind: "permission",
      status: "mitigated",
      description:
        "The SECURITY lane records boundary evidence but keeps mutationAuthorizedFromCard false.",
      mitigation:
        "Require approved SIC/DTC and governed commit path; review cards, lanes, mirrors, and DTC drafts remain advisory-only.",
    },
  ];
}

export function draftDtcFromContextPlan(
  input: DraftDtcFromContextPlanInput,
): DraftDtcFromContextPlanResult {
  const semanticIntentContractRef = semanticIntentContractRefFromApproved(
    input.semanticIntentContract,
  );
  const sourceRefs = [
    ...input.contextEngineeringPlan.sourceRefs,
    ...(input.fdeSession.sourceRefs ?? []),
    ...(input.projectIndex.sourceRefs ?? []),
  ];
  const affectedSurfaces = [
    ...input.semanticIntentContract.affectedSurfaces,
    ...(input.projectIndex.runtimeSurfaceRefs ?? []),
  ].filter((surface, index, all) => surface.trim().length > 0 && all.indexOf(surface) === index);

  const reviewBeforeMutationApproval: DtcReviewBeforeMutationApproval = {
    data: input.contextEngineeringPlan.data.summary,
    logic: input.contextEngineeringPlan.logic.summary,
    action: input.contextEngineeringPlan.action.summary,
    approvalInstruction:
      "Before mutation approval, review DATA, LOGIC, and ACTION separately; approval of mirrored context is not approval for ontology/schema/reference-pack writeback.",
  };

  const digitalTwinChangeContract: DigitalTwinChangeContract = {
    contractId: `digital-twin-change:${input.contextEngineeringPlan.planId}`,
    status: "draft",
    semanticIntentContractRef,
    affectedSurfaces,
    changeBoundary: joinLines([
      reviewBeforeMutationApproval.data,
      reviewBeforeMutationApproval.logic,
      reviewBeforeMutationApproval.action,
    ]),
    branchProposalPolicy:
      "Use branch/proposal review for any mutation. Context plan approval alone is not mutation approval.",
    permissionBoundary:
      "Convex mirror reads are allowed for context engineering; ontology/schema/reference-pack writeback remains forbidden until DTC approval.",
    replayMigrationPlan:
      "No replay or migration is authorized by this draft. Mirror state can be replayed only as evidence for review.",
    observabilityPlan:
      `Mirror workflow traces and eval decisions to Convex; preserve authoritative lineage in append-only events and approved contracts. Source refs: ${sourceRefs.join(", ") || "none"}.`,
    toolSurfaceReadiness:
      "DTC review must display DATA, LOGIC, and ACTION plainly before mutation approval.",
    evaluationPlan:
      "Validate context-plan builder, Convex-only technology policy, DTC draft review sections, and prompt-front-door persistence.",
    risks: riskRecords(input.contextEngineeringPlan),
  };

  return {
    digitalTwinChangeContract,
    reviewBeforeMutationApproval,
  };
}

function structuredLabels(
  section: Pick<ContextEngineeringPlanV2["data"], "structuredItems">,
): readonly string[] {
  return section.structuredItems.map((item) => item.label);
}

function boundaryField(
  value: string,
  rationale: string,
  evidenceRefs: readonly string[],
  designAlternative?: string,
): DigitalTwinChangeBoundary["changeBoundary"] {
  return {
    value,
    status: "mitigated",
    rationale,
    evidenceRefs,
    ...(designAlternative ? { designAlternative } : {}),
  };
}

function structuredBoundaryFromV2(
  plan: ContextEngineeringPlanV2,
  review: DtcReviewBeforeMutationApprovalV2,
): DigitalTwinChangeBoundary {
  return {
    changeBoundary: boundaryField(
      [
        review.data,
        `Structured DATA: ${review.structuredData.join(", ") || "none"}`,
        review.logic,
        `Structured LOGIC: ${review.structuredLogic.join(", ") || "none"}`,
        review.action,
        `Structured ACTION: ${review.structuredAction.join(", ") || "none"}`,
      ].join("\n"),
      "DTC draft boundary is derived from ContextEngineeringPlanV2 review cards.",
      plan.sourceRefs,
    ),
    branchProposalPolicy: boundaryField(
      "Use branch/proposal review for any mutation. Context plan approval alone is not mutation approval.",
      "Branch/proposal review remains separate from context review.",
      plan.sourceRefs,
    ),
    permissionBoundary: boundaryField(
      "Projection cards, workbench choices, Convex mirrors, and DTC review cards are review-only.",
      "Mutation authority remains in approved SIC/DTC plus governed commit path.",
      plan.sourceRefs,
    ),
    replayMigrationPlan: boundaryField(
      "No replay or migration is authorized by this draft. Historical sessions remain readable through additive fields.",
      "PR #524 follow-up is additive and health-audit surfaces missing historical artifacts.",
      plan.sourceRefs,
    ),
    observabilityPlan: boundaryField(
      "Mirror workflow traces and eval decisions for visibility; keep append-only events and approved contracts authoritative.",
      "Observability is mirror-only and audit-oriented.",
      plan.sourceRefs,
    ),
    toolSurfaceReadiness: boundaryField(
      `${review.technology}\n${review.frontendRuntime}`,
      "Technology and runtime recommendations are review-only and require validation.",
      plan.sourceRefs,
      "Keep the flow internal until a later approved DTC promotes a public MCP surface.",
    ),
    evaluationPlan: boundaryField(
      review.validationPlan.join("\n"),
      "Validation commands are required before governed mutation.",
      plan.sourceRefs,
    ),
  };
}

function laneEvidenceRefs(plan: ContextEngineeringPlanV3): readonly string[] {
  return [
    ...new Set(
      plan.lanes.flatMap((lane) => [
        ...lane.evidenceRefs,
        ...lane.sourceRefs,
      ]),
    ),
  ];
}

function laneBoundaries(plan: ContextEngineeringPlanV3): readonly DtcReviewLaneBoundary[] {
  return plan.lanes.map((lane) => ({
    lane: lane.lane,
    summary: lane.summary,
    boundary: lane.boundary,
    evidenceRefs: lane.evidenceRefs,
    advisoryOnly: true,
    mutationAuthorizedFromCard: false,
  }));
}

function structuredBoundaryFromV3(
  plan: ContextEngineeringPlanV3,
  review: DtcReviewBeforeMutationApprovalV3,
): DigitalTwinChangeBoundary {
  const evidenceRefs = laneEvidenceRefs(plan);
  return {
    changeBoundary: boundaryField(
      [
        ...review.laneBoundaries.map((lane) =>
          `${lane.lane}: ${lane.summary}\nBoundary: ${lane.boundary}`
        ),
        `Structured DATA: ${review.structuredData.join(", ") || "none"}`,
        `Structured LOGIC: ${review.structuredLogic.join(", ") || "none"}`,
        `Structured ACTION: ${review.structuredAction.join(", ") || "none"}`,
        `Structured SECURITY: ${review.structuredSecurity.join(", ") || "none"}`,
      ].join("\n"),
      "DTC draft boundary is derived from ContextEngineeringPlanV3 advisory lane evidence.",
      evidenceRefs.length > 0 ? evidenceRefs : plan.sourceRefs,
    ),
    branchProposalPolicy: boundaryField(
      "Use branch/proposal review for any mutation. ContextEngineeringPlanV3 approval alone is not mutation approval.",
      "Branch/proposal review remains separate from advisory lane review.",
      evidenceRefs.length > 0 ? evidenceRefs : plan.sourceRefs,
    ),
    permissionBoundary: boundaryField(
      [
        review.security,
        "No review card, lane, mirror, or DTC draft grants mutation authority.",
      ].join("\n"),
      "The SECURITY lane is advisory-only and preserves mutation authorization outside context plans.",
      plan.security.evidenceRefs.length > 0 ? plan.security.evidenceRefs : plan.sourceRefs,
    ),
    replayMigrationPlan: boundaryField(
      "No replay or migration is authorized by this draft. V3 lane evidence is additive and historical V2 plans remain readable.",
      "V3 extends V2 without requiring replay/backfill.",
      evidenceRefs.length > 0 ? evidenceRefs : plan.sourceRefs,
    ),
    observabilityPlan: boundaryField(
      "Mirror workflow traces, eval decisions, and lane evidence for visibility; keep append-only events and approved contracts authoritative.",
      "Observability is mirror-only and audit-oriented.",
      evidenceRefs.length > 0 ? evidenceRefs : plan.sourceRefs,
    ),
    toolSurfaceReadiness: boundaryField(
      [
        review.technology,
        review.frontendRuntime,
        `Lane boundaries: ${review.laneBoundaries.map((lane) => lane.lane).join(", ")}`,
      ].join("\n"),
      "Technology, runtime, and lane recommendations are review-only and require validation.",
      evidenceRefs.length > 0 ? evidenceRefs : plan.sourceRefs,
      "Keep the flow internal until a later approved DTC promotes a public MCP surface.",
    ),
    evaluationPlan: boundaryField(
      review.validationPlan.join("\n"),
      "Validation commands are required before governed mutation.",
      evidenceRefs.length > 0 ? evidenceRefs : plan.sourceRefs,
    ),
  };
}

export function draftDtcFromContextPlanV2(
  input: DraftDtcFromContextPlanV2Input,
): DraftDtcFromContextPlanV2Result {
  const semanticIntentContractRef = semanticIntentContractRefFromApproved(
    input.semanticIntentContract,
  );
  const plan = input.contextEngineeringPlan;
  const sourceRefs = [
    ...plan.sourceRefs,
    ...(input.fdeSession.sourceRefs ?? []),
    ...(input.projectIndex.sourceRefs ?? []),
  ];
  const affectedSurfaces = [
    ...input.semanticIntentContract.affectedSurfaces,
    ...(input.projectIndex.runtimeSurfaceRefs ?? []),
  ].filter((surface, index, all) => surface.trim().length > 0 && all.indexOf(surface) === index);
  const reviewBeforeMutationApproval: DtcReviewBeforeMutationApprovalV2 = {
    data: plan.data.summary,
    logic: plan.logic.summary,
    action: plan.action.summary,
    structuredData: structuredLabels(plan.data),
    structuredLogic: structuredLabels(plan.logic),
    structuredAction: structuredLabels(plan.action),
    technology:
      `${plan.technologyRecommendation.policy}; Convex authority=${plan.technologyRecommendation.convexAuthority}; mirror tables=${plan.technologyRecommendation.mirrorTables.map((table) => table.tableName).join(", ")}`,
    frontendRuntime:
      `${plan.frontendRuntimeRecommendation.runtimeSurface}/${plan.frontendRuntimeRecommendation.primaryView}; mutation=${plan.frontendRuntimeRecommendation.mutationPolicy}`,
    validationPlan: plan.validationPlan.map((item) =>
      `${item.validationId}: ${item.command} (${item.required ? "required" : "optional"})`
    ),
    risks: riskRecordsV2(plan).map((risk) => `${risk.riskId}: ${risk.description}`),
    requiredUserDecisions: plan.requiredUserDecisions,
    approvalInstruction:
      "Before mutation approval, review DATA, LOGIC, ACTION, TECHNOLOGY, and GOVERNANCE separately; this draft is not approval for ontology/schema/reference-pack writeback.",
  };
  const structuredBoundary = structuredBoundaryFromV2(plan, reviewBeforeMutationApproval);
  const digitalTwinChangeContract: DigitalTwinChangeContract = {
    contractId: `digital-twin-change:${plan.planId}`,
    status: "draft",
    semanticIntentContractRef,
    affectedSurfaces,
    changeBoundary: structuredBoundary.changeBoundary.value,
    branchProposalPolicy: structuredBoundary.branchProposalPolicy.value,
    permissionBoundary: structuredBoundary.permissionBoundary.value,
    replayMigrationPlan: structuredBoundary.replayMigrationPlan.value,
    observabilityPlan: [
      structuredBoundary.observabilityPlan.value,
      `Source refs: ${sourceRefs.join(", ") || "none"}.`,
    ].join("\n"),
    toolSurfaceReadiness: structuredBoundary.toolSurfaceReadiness.value,
    evaluationPlan: structuredBoundary.evaluationPlan.value,
    structuredBoundary,
    risks: riskRecordsV2(plan),
    requiredUserDecisions: [...plan.requiredUserDecisions],
  };

  return {
    digitalTwinChangeContract,
    reviewBeforeMutationApproval,
  };
}

export function draftDtcFromContextPlanV3(
  input: DraftDtcFromContextPlanV3Input,
): DraftDtcFromContextPlanV3Result {
  const semanticIntentContractRef = semanticIntentContractRefFromApproved(
    input.semanticIntentContract,
  );
  const plan = input.contextEngineeringPlan;
  const sourceRefs = [
    ...plan.sourceRefs,
    ...(input.fdeSession.sourceRefs ?? []),
    ...(input.projectIndex.sourceRefs ?? []),
  ];
  const affectedSurfaces = [
    ...input.semanticIntentContract.affectedSurfaces,
    ...(input.projectIndex.runtimeSurfaceRefs ?? []),
  ].filter((surface, index, all) => surface.trim().length > 0 && all.indexOf(surface) === index);
  const reviewBeforeMutationApproval: DtcReviewBeforeMutationApprovalV3 = {
    data: plan.data.summary,
    logic: plan.logic.summary,
    action: plan.action.summary,
    security: plan.security.summary,
    structuredData: structuredLabels(plan.data),
    structuredLogic: structuredLabels(plan.logic),
    structuredAction: structuredLabels(plan.action),
    structuredSecurity: structuredLabels(plan.security),
    laneBoundaries: laneBoundaries(plan),
    technology:
      `${plan.technologyRecommendation.policy}; Convex authority=${plan.technologyRecommendation.convexAuthority}; mirror tables=${plan.technologyRecommendation.mirrorTables.map((table) => table.tableName).join(", ")}`,
    frontendRuntime:
      `${plan.frontendRuntimeRecommendation.runtimeSurface}/${plan.frontendRuntimeRecommendation.primaryView}; mutation=${plan.frontendRuntimeRecommendation.mutationPolicy}`,
    validationPlan: plan.validationPlan.map((item) =>
      `${item.validationId}: ${item.command} (${item.required ? "required" : "optional"})`
    ),
    risks: riskRecordsV3(plan).map((risk) => `${risk.riskId}: ${risk.description}`),
    requiredUserDecisions: plan.requiredUserDecisions,
    approvalInstruction:
      "Before mutation approval, review DATA, LOGIC, ACTION, SECURITY, TECHNOLOGY, and GOVERNANCE separately; this draft is not approval for ontology/schema/reference-pack writeback.",
  };
  const structuredBoundary = structuredBoundaryFromV3(plan, reviewBeforeMutationApproval);
  const digitalTwinChangeContract: DigitalTwinChangeContract = {
    contractId: `digital-twin-change:${plan.planId}`,
    status: "draft",
    semanticIntentContractRef,
    affectedSurfaces,
    changeBoundary: structuredBoundary.changeBoundary.value,
    branchProposalPolicy: structuredBoundary.branchProposalPolicy.value,
    permissionBoundary: structuredBoundary.permissionBoundary.value,
    replayMigrationPlan: structuredBoundary.replayMigrationPlan.value,
    observabilityPlan: [
      structuredBoundary.observabilityPlan.value,
      `Lane evidence refs: ${laneEvidenceRefs(plan).join(", ") || "none"}.`,
      `Source refs: ${sourceRefs.join(", ") || "none"}.`,
    ].join("\n"),
    toolSurfaceReadiness: structuredBoundary.toolSurfaceReadiness.value,
    evaluationPlan: structuredBoundary.evaluationPlan.value,
    structuredBoundary,
    risks: riskRecordsV3(plan),
    requiredUserDecisions: [...plan.requiredUserDecisions],
  };

  return {
    digitalTwinChangeContract,
    reviewBeforeMutationApproval,
  };
}
