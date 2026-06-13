import type { FDEOntologyEngineeringSession } from "../fde-ontology-engineering/types";
import type {
  DigitalTwinDecisionDomain,
  DigitalTwinRequiredUserDecision,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { SicAxisStatus } from "#schemas/ontology/primitives/semantic-intent-contract";
import {
  semanticIntentContractRefFromApproved,
  type ApprovedSemanticIntentContract,
} from "../semantic-intent/approved-contract";
import {
  deriveValidationPlan,
  FALLBACK_VALIDATION_PLAN,
} from "./validation-plan-from-success-eval";

export const CONTEXT_ENGINEERING_PLAN_SCHEMA_VERSION =
  "palantir-mini/context-engineering-plan/v1" as const;

export const CONTEXT_ENGINEERING_PLAN_V2_SCHEMA_VERSION =
  "palantir-mini/context-engineering-plan/v2" as const;

export const CONTEXT_ENGINEERING_PLAN_V3_SCHEMA_VERSION =
  "palantir-mini/context-engineering-plan/v3" as const;

export type ContextEngineeringMirrorSurface =
  | "session-state"
  | "decisions"
  | "evals"
  | "workflow-traces"
  | "feedback"
  | "lightweight-state";

export interface TechnologyRecommendation {
  readonly recommendationId: string;
  readonly backend: "convex";
  readonly policy: "convex-only-backend";
  readonly mirrorOnly: true;
  readonly mirrorSurfaces: readonly ContextEngineeringMirrorSurface[];
  readonly mustNeverReplaceAuthority: readonly string[];
  readonly unapprovedWritebackPolicy: "forbidden";
  readonly rationale: string;
}

export interface TechnologyRecommendationV2 extends TechnologyRecommendation {
  readonly schemaVersion: "palantir-mini/technology-recommendation/v2";
  readonly runtimePolicy: "frontend-runtime-plus-mirror-backend";
  readonly convexAuthority: "mirror-only";
  readonly mirrorTables: readonly {
    readonly tableName: string;
    readonly purpose: string;
    readonly authority: "mirror";
  }[];
}

export interface FrontendRuntimeRecommendation {
  readonly recommendationId: string;
  readonly runtimeSurface: "chatbot-studio-workbench" | "plugin-internal-handler";
  readonly primaryView: "lead-ontology-turn-card" | "context-engineering-review";
  readonly stateInputs: readonly string[];
  readonly mutationPolicy: "review-only";
  readonly rationale: string;
}

export interface ContextPlanSection {
  readonly summary: string;
  readonly sourceRefs: readonly string[];
}

export interface ContextEngineeringStructuredItem {
  readonly itemId: string;
  readonly label: string;
  readonly evidenceRefs: readonly string[];
}

export interface ContextEngineeringPlanV2Section extends ContextPlanSection {
  readonly domain: "DATA" | "LOGIC" | "ACTION";
  readonly structuredItems: readonly ContextEngineeringStructuredItem[];
}

export type ContextEngineeringPlanV3LaneId = "DATA" | "LOGIC" | "ACTION" | "SECURITY";

export interface ContextEngineeringPlanV3Lane extends ContextPlanSection {
  readonly lane: ContextEngineeringPlanV3LaneId;
  readonly domain: ContextEngineeringPlanV3LaneId;
  readonly boundary: string;
  readonly evidenceRefs: readonly string[];
  readonly structuredItems: readonly ContextEngineeringStructuredItem[];
  readonly advisoryOnly: true;
  readonly mutationAuthorizedFromCard: false;
}

/**
 * One advisory projection of a non-DATA/LOGIC/ACTION/SECURITY understand-phase axis
 * (context / successEval / constraintsNonGoals / actors / memoryPrior) onto the plan.
 * These are ADVISORY background context for review only — never a mutation lane and
 * never a blocking decision (Q4). The DATA/LOGIC/ACTION/SECURITY axes already drive the
 * plan's lanes; these 5 carry the rest of the 9-axis heart through for the reviewer.
 *
 * 자문용 축 투영: 9축 중 lane이 아닌 5개 축을 검토용 배경 맥락으로 전달한다.
 */
export interface ContextEngineeringAxisProjection {
  readonly axisKey: "context" | "successEval" | "constraintsNonGoals" | "actors" | "memoryPrior";
  readonly summary: string;
  readonly refs: readonly string[];
  // Pass-through of the source axis status (incl. session-derived `draft`).
  readonly status: SicAxisStatus;
  readonly advisoryOnly: true;
}

export interface ContextEngineeringPlan {
  readonly schemaVersion: typeof CONTEXT_ENGINEERING_PLAN_SCHEMA_VERSION;
  readonly planId: string;
  readonly semanticIntentContractRef: string;
  readonly fdeSessionRef: string;
  readonly projectRoot: string;
  readonly projectIndexRef?: string;
  readonly data: ContextPlanSection;
  readonly logic: ContextPlanSection;
  readonly action: ContextPlanSection;
  readonly technologyRecommendation: TechnologyRecommendation;
  readonly authorityBoundaries: readonly string[];
  readonly sourceRefs: readonly string[];
}

export interface DtcContextEngineeringReviewCard {
  readonly cardId: string;
  readonly title: string;
  readonly domain: "DATA" | "LOGIC" | "ACTION" | "SECURITY" | "TECHNOLOGY" | "GOVERNANCE";
  readonly plainSummary: string;
  readonly sourceRefs: readonly string[];
  readonly recommendedDecision: string;
  readonly mutationAuthorizedFromCard: false;
}

export type ContextEngineeringPlanRequiredUserDecision = DigitalTwinRequiredUserDecision;

export interface ContextEngineeringPlanV2 {
  readonly schemaVersion: typeof CONTEXT_ENGINEERING_PLAN_V2_SCHEMA_VERSION;
  readonly planId: string;
  readonly legacyPlanId: string;
  readonly semanticIntentContractRef: string;
  readonly fdeSessionRef: string;
  readonly projectRoot: string;
  readonly data: ContextEngineeringPlanV2Section;
  readonly logic: ContextEngineeringPlanV2Section;
  readonly action: ContextEngineeringPlanV2Section;
  readonly technologyRecommendation: TechnologyRecommendationV2;
  readonly frontendRuntimeRecommendation: FrontendRuntimeRecommendation;
  readonly validationPlan: readonly {
    readonly validationId: string;
    readonly command: string;
    readonly required: boolean;
    readonly reason: string;
  }[];
  readonly requiredUserDecisions: readonly ContextEngineeringPlanRequiredUserDecision[];
  readonly reviewCards: readonly DtcContextEngineeringReviewCard[];
  readonly axisProjections: readonly ContextEngineeringAxisProjection[];
  readonly authorityBoundaries: readonly string[];
  readonly sourceRefs: readonly string[];
}

export interface ContextEngineeringPlanV3 {
  readonly schemaVersion: typeof CONTEXT_ENGINEERING_PLAN_V3_SCHEMA_VERSION;
  readonly planId: string;
  readonly v2PlanId: string;
  readonly legacyPlanId: string;
  readonly semanticIntentContractRef: string;
  readonly fdeSessionRef: string;
  readonly projectRoot: string;
  readonly data: ContextEngineeringPlanV3Lane;
  readonly logic: ContextEngineeringPlanV3Lane;
  readonly action: ContextEngineeringPlanV3Lane;
  readonly security: ContextEngineeringPlanV3Lane;
  readonly lanes: readonly ContextEngineeringPlanV3Lane[];
  readonly technologyRecommendation: TechnologyRecommendationV2;
  readonly frontendRuntimeRecommendation: FrontendRuntimeRecommendation;
  readonly validationPlan: ContextEngineeringPlanV2["validationPlan"];
  readonly requiredUserDecisions: readonly ContextEngineeringPlanRequiredUserDecision[];
  readonly reviewCards: readonly DtcContextEngineeringReviewCard[];
  readonly axisProjections: readonly ContextEngineeringAxisProjection[];
  readonly authorityBoundaries: readonly string[];
  readonly sourceRefs: readonly string[];
}

export interface ProjectIndexContext {
  readonly projectRoot: string;
  readonly indexRef?: string;
  readonly authorityRefs?: readonly string[];
  readonly runtimeSurfaceRefs?: readonly string[];
  readonly validationRefs?: readonly string[];
  readonly sourceRefs?: readonly string[];
}

export interface BuildContextEngineeringPlanInput {
  readonly semanticIntentContract: SemanticIntentContract;
  readonly fdeSession: Pick<
    FDEOntologyEngineeringSession,
    | "sessionId"
    | "projectRoot"
    | "sourceRefs"
    | "confirmedUserGoal"
    | "missionModel"
    | "evidenceModel"
    | "objectCandidates"
    | "linkCandidates"
    | "actionCandidates"
    | "functionCandidates"
    | "chatbotContextCandidates"
  >;
  readonly projectIndex: ProjectIndexContext;
}

const CONVEX_MIRROR_SURFACES: readonly ContextEngineeringMirrorSurface[] = [
  "session-state",
  "decisions",
  "evals",
  "workflow-traces",
  "feedback",
  "lightweight-state",
] as const;

const AUTHORITY_BOUNDARIES = [
  "Convex mirrors context-engineering state; it never replaces ontology authority.",
  "Convex mirrors decisions, evals, workflow traces, feedback, and lightweight state only.",
  "Schema, ontology, research, reference-pack, and project INDEX authority remain read-first inputs.",
  "Unapproved writeback from mirrored state is forbidden.",
] as const;

export function buildConvexOnlyTechnologyRecommendation(
  planId: string,
): TechnologyRecommendation {
  return {
    recommendationId: `${planId}:technology`,
    backend: "convex",
    policy: "convex-only-backend",
    mirrorOnly: true,
    mirrorSurfaces: CONVEX_MIRROR_SURFACES,
    mustNeverReplaceAuthority: [
      "ontology/schema authority",
      "research authority",
      "reference-pack authority",
      "project INDEX/BROWSE authority",
      "approved SIC/DTC authority",
    ],
    unapprovedWritebackPolicy: "forbidden",
    rationale:
      "Use Convex only as a fast mirror for current context, decisions, evals, workflow traces, feedback, and lightweight state; keep authoritative ontology and schema decisions in the approved contracts and local authority chain.",
  };
}

export function buildTechnologyRecommendationV2(
  planId: string,
): TechnologyRecommendationV2 {
  return {
    ...buildConvexOnlyTechnologyRecommendation(planId),
    schemaVersion: "palantir-mini/technology-recommendation/v2",
    runtimePolicy: "frontend-runtime-plus-mirror-backend",
    convexAuthority: "mirror-only",
    mirrorTables: [
      {
        tableName: "fdeOntologyEngineeringSessions",
        purpose: "Mirror current session state and stable summaries.",
        authority: "mirror",
      },
      {
        tableName: "contextEngineeringPlans",
        purpose: "Mirror DATA/LOGIC/ACTION plan projections and review decisions.",
        authority: "mirror",
      },
      {
        tableName: "dtcReviewCards",
        purpose: "Mirror non-authorizing DTC review cards for UI feedback.",
        authority: "mirror",
      },
      {
        tableName: "evalRuns",
        purpose: "Mirror evaluation outcomes for workbench visibility.",
        authority: "mirror",
      },
    ],
  };
}

function compact(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

function names<T extends { readonly plainName?: string }>(items: readonly T[]): string {
  return compact(items.map((item) => item.plainName)).join(", ") || "none identified";
}

function structuredItems<T extends { readonly candidateId: string; readonly plainName: string; readonly evidenceRefs?: readonly string[] }>(
  items: readonly T[],
): ContextEngineeringPlanV2Section["structuredItems"] {
  return items.map((item) => ({
    itemId: item.candidateId,
    label: item.plainName,
    evidenceRefs: item.evidenceRefs ?? [],
  }));
}

export function buildContextEngineeringPlan(
  input: BuildContextEngineeringPlanInput,
): ContextEngineeringPlan {
  const sic = input.semanticIntentContract as ApprovedSemanticIntentContract;
  const semanticIntentContractRef = semanticIntentContractRefFromApproved(sic);
  const planId = `context-plan:${semanticIntentContractRef.replace(/[^a-zA-Z0-9._:-]+/g, "-")}`;
  const sourceRefs = compact([
    ...(input.fdeSession.sourceRefs ?? []),
    ...(input.projectIndex.sourceRefs ?? []),
    ...(input.projectIndex.authorityRefs ?? []),
    input.projectIndex.indexRef,
  ]);

  return {
    schemaVersion: CONTEXT_ENGINEERING_PLAN_SCHEMA_VERSION,
    planId,
    semanticIntentContractRef,
    fdeSessionRef: `fde-ontology-engineering-session:${input.fdeSession.sessionId}`,
    projectRoot: input.projectIndex.projectRoot || input.fdeSession.projectRoot,
    ...(input.projectIndex.indexRef ? { projectIndexRef: input.projectIndex.indexRef } : {}),
    data: {
      summary:
        `DATA: mirror session state, decisions, eval runs, workflow traces, feedback, and lightweight state for ${input.fdeSession.confirmedUserGoal ?? input.semanticIntentContract.confirmedIntent}. Candidate objects: ${names(input.fdeSession.objectCandidates)}. Candidate links: ${names(input.fdeSession.linkCandidates)}.`,
      sourceRefs,
    },
    logic: {
      summary:
        `LOGIC: keep ontology/schema/reference-pack authority outside the mirror; use approved functions only for deterministic reasoning. Candidate functions: ${names(input.fdeSession.functionCandidates)}.`,
      sourceRefs: compact([
        ...(input.projectIndex.authorityRefs ?? []),
        ...(input.projectIndex.validationRefs ?? []),
      ]),
    },
    action: {
      summary:
        `ACTION: require explicit DTC approval before mutation or writeback. Candidate actions: ${names(input.fdeSession.actionCandidates)}.`,
      sourceRefs: compact([
        ...(input.projectIndex.runtimeSurfaceRefs ?? []),
        ...(input.projectIndex.validationRefs ?? []),
      ]),
    },
    technologyRecommendation: buildConvexOnlyTechnologyRecommendation(planId),
    authorityBoundaries: AUTHORITY_BOUNDARIES,
    sourceRefs,
  };
}

function buildV3Lane(
  lane: ContextEngineeringPlanV3LaneId,
  section: ContextEngineeringPlanV2Section | ContextPlanSection,
  structuredItemsForLane: readonly ContextEngineeringStructuredItem[],
  boundary: string,
  evidenceRefs: readonly string[],
): ContextEngineeringPlanV3Lane {
  return {
    ...section,
    lane,
    domain: lane,
    boundary,
    evidenceRefs,
    structuredItems: structuredItemsForLane,
    advisoryOnly: true,
    mutationAuthorizedFromCard: false,
  };
}

function buildReviewCards(plan: ContextEngineeringPlanV2): readonly DtcContextEngineeringReviewCard[] {
  return [
    {
      cardId: `${plan.planId}:review:data`,
      title: "DATA Review",
      domain: "DATA",
      plainSummary: plan.data.summary,
      sourceRefs: plan.data.sourceRefs,
      recommendedDecision: "Use mirrored state for review only; keep authority in approved contracts and source evidence.",
      mutationAuthorizedFromCard: false,
    },
    {
      cardId: `${plan.planId}:review:logic`,
      title: "LOGIC Review",
      domain: "LOGIC",
      plainSummary: plan.logic.summary,
      sourceRefs: plan.logic.sourceRefs,
      recommendedDecision: "Keep deterministic functions behind approved logic and validation.",
      mutationAuthorizedFromCard: false,
    },
    {
      cardId: `${plan.planId}:review:action`,
      title: "ACTION Review",
      domain: "ACTION",
      plainSummary: plan.action.summary,
      sourceRefs: plan.action.sourceRefs,
      recommendedDecision: "Do not authorize writeback from this card; require approved DTC and submission criteria.",
      mutationAuthorizedFromCard: false,
    },
    {
      cardId: `${plan.planId}:review:technology`,
      title: "TECHNOLOGY Review",
      domain: "TECHNOLOGY",
      plainSummary:
        `${plan.technologyRecommendation.policy}; ` +
        `${plan.technologyRecommendation.runtimePolicy}; Convex authority is ${plan.technologyRecommendation.convexAuthority}.`,
      sourceRefs: plan.sourceRefs,
      recommendedDecision:
        "Use Convex as a mirror-only backend and keep runtime/workbench state review-only.",
      mutationAuthorizedFromCard: false,
    },
    {
      cardId: `${plan.planId}:review:governance`,
      title: "GOVERNANCE Review",
      domain: "GOVERNANCE",
      plainSummary: [
        ...plan.authorityBoundaries,
        ...plan.validationPlan.map((item) =>
          `${item.validationId}: ${item.command} (${item.required ? "required" : "optional"})`
        ),
      ].join("\n"),
      sourceRefs: plan.sourceRefs,
      recommendedDecision:
        "Resolve required user decisions and run validation before any governed mutation path.",
      mutationAuthorizedFromCard: false,
    },
  ];
}

const ADVISORY_AXIS_KEYS = [
  "context",
  "successEval",
  "constraintsNonGoals",
  "actors",
  "memoryPrior",
] as const;

const ADVISORY_AXIS_TITLES: Record<ContextEngineeringAxisProjection["axisKey"], string> = {
  context: "CONTEXT (advisory)",
  successEval: "SUCCESS-EVAL (advisory)",
  constraintsNonGoals: "CONSTRAINTS / NON-GOALS (advisory)",
  actors: "ACTORS (advisory)",
  memoryPrior: "MEMORY / PRIOR (advisory)",
};

/**
 * Project the 5 non-lane understand-phase axes (context / successEval /
 * constraintsNonGoals / actors / memoryPrior) from the SIC into advisory projections.
 * Carries the rest of the 9-axis heart through for review WITHOUT making them mutation
 * lanes or blocking decisions (Q4). Legacy / axes-less SIC → empty array (back-compat).
 *
 * lane이 아닌 5개 축을 자문용 투영으로 변환한다. axes가 없으면 빈 배열을 반환한다.
 */
function buildAxisProjections(
  sic: SemanticIntentContract,
): readonly ContextEngineeringAxisProjection[] {
  const axes = sic.axes;
  if (!axes) {
    return [];
  }
  return ADVISORY_AXIS_KEYS.map((axisKey) => {
    const axis = axes[axisKey];
    return {
      axisKey,
      summary: axis.summary,
      refs: axis.refs,
      status: axis.status,
      advisoryOnly: true as const,
    };
  });
}

/**
 * One ADVISORY review card per non-empty axis projection. Advisory context only —
 * recommendedDecision says so, and mutationAuthorizedFromCard stays false (Q4). Empty
 * (open, no summary) projections are skipped so the reviewer only sees surfaced axes.
 */
function buildAdvisoryAxisReviewCards(
  planId: string,
  projections: readonly ContextEngineeringAxisProjection[],
): readonly DtcContextEngineeringReviewCard[] {
  return projections
    .filter((projection) => projection.summary.trim().length > 0)
    .map((projection) => ({
      cardId: `${planId}:review:axis:${projection.axisKey}`,
      title: ADVISORY_AXIS_TITLES[projection.axisKey],
      domain: "GOVERNANCE",
      plainSummary: projection.summary,
      sourceRefs: projection.refs,
      recommendedDecision:
        "Review only — advisory context, not a mutation lane. / 검토 전용 — 변경 lane이 아닌 자문 맥락입니다.",
      mutationAuthorizedFromCard: false,
    }));
}

function buildSecurityReviewCard(
  plan: Omit<ContextEngineeringPlanV3, "reviewCards">,
): DtcContextEngineeringReviewCard {
  return {
    cardId: `${plan.planId}:review:security`,
    title: "SECURITY Review",
    domain: "SECURITY",
    plainSummary: `${plan.security.summary}\nBoundary: ${plan.security.boundary}`,
    sourceRefs: plan.security.evidenceRefs,
    recommendedDecision:
      "Keep V3 lane evidence advisory-only; no card, lane, mirror, or DTC draft authorizes mutation.",
    mutationAuthorizedFromCard: false,
  };
}

function requiredDecision(
  planId: string,
  domain: DigitalTwinDecisionDomain,
  label: string,
  evidenceRefs: readonly string[],
): ContextEngineeringPlanRequiredUserDecision {
  return {
    decisionId: `${planId}:decision:${domain.toLowerCase()}`,
    domain,
    label,
    status: "open",
    blocking: true,
    evidenceRefs: [...evidenceRefs],
  };
}

function buildRequiredUserDecisions(
  plan: Omit<ContextEngineeringPlanV2, "requiredUserDecisions" | "reviewCards">,
): readonly ContextEngineeringPlanRequiredUserDecision[] {
  return [
    requiredDecision(
      plan.planId,
      "DATA",
      "Approve DATA boundary",
      plan.data.sourceRefs.length > 0 ? plan.data.sourceRefs : plan.sourceRefs,
    ),
    requiredDecision(
      plan.planId,
      "LOGIC",
      "Approve LOGIC boundary",
      plan.logic.sourceRefs.length > 0 ? plan.logic.sourceRefs : plan.sourceRefs,
    ),
    requiredDecision(
      plan.planId,
      "ACTION",
      "Approve ACTION/writeback boundary",
      plan.action.sourceRefs.length > 0 ? plan.action.sourceRefs : plan.sourceRefs,
    ),
    requiredDecision(
      plan.planId,
      "TECHNOLOGY",
      "Approve TECHNOLOGY mirror-only boundary",
      plan.sourceRefs,
    ),
    requiredDecision(
      plan.planId,
      "GOVERNANCE",
      "Approve GOVERNANCE and validation boundary",
      plan.sourceRefs,
    ),
  ];
}

export function buildContextEngineeringPlanV2(
  input: BuildContextEngineeringPlanInput,
): ContextEngineeringPlanV2 {
  const legacy = buildContextEngineeringPlan(input);
  const planId = `${legacy.planId}:v2`;
  const axisProjections = buildAxisProjections(input.semanticIntentContract);
  const v2WithoutCardsAndDecisions: Omit<
    ContextEngineeringPlanV2,
    "requiredUserDecisions" | "reviewCards"
  > = {
    schemaVersion: CONTEXT_ENGINEERING_PLAN_V2_SCHEMA_VERSION,
    planId,
    legacyPlanId: legacy.planId,
    semanticIntentContractRef: legacy.semanticIntentContractRef,
    fdeSessionRef: legacy.fdeSessionRef,
    projectRoot: legacy.projectRoot,
    data: {
      ...legacy.data,
      domain: "DATA",
      structuredItems: [
        ...structuredItems(input.fdeSession.objectCandidates),
        ...structuredItems(input.fdeSession.linkCandidates),
        ...structuredItems(input.fdeSession.chatbotContextCandidates),
      ],
    },
    logic: {
      ...legacy.logic,
      domain: "LOGIC",
      structuredItems: structuredItems(input.fdeSession.functionCandidates),
    },
    action: {
      ...legacy.action,
      domain: "ACTION",
      structuredItems: structuredItems(input.fdeSession.actionCandidates),
    },
    technologyRecommendation: buildTechnologyRecommendationV2(planId),
    frontendRuntimeRecommendation: {
      recommendationId: `${planId}:frontend-runtime`,
      runtimeSurface: "chatbot-studio-workbench",
      primaryView: "lead-ontology-turn-card",
      stateInputs: [
        "FDEOntologyEngineeringSession",
        "FDESemanticIntentContext",
        "ContextEngineeringPlanV2",
        "DtcContextEngineeringReviewCard",
      ],
      mutationPolicy: "review-only",
      rationale:
        "Use the workbench as the review/runtime surface while keeping mutation authorization in approved SIC/DTC and submission criteria.",
    },
    validationPlan: deriveValidationPlan(input.semanticIntentContract, FALLBACK_VALIDATION_PLAN),
    axisProjections,
    authorityBoundaries: legacy.authorityBoundaries,
    sourceRefs: legacy.sourceRefs,
  };
  const v2WithoutCards: Omit<ContextEngineeringPlanV2, "reviewCards"> = {
    ...v2WithoutCardsAndDecisions,
    requiredUserDecisions: buildRequiredUserDecisions(v2WithoutCardsAndDecisions),
  };
  return {
    ...v2WithoutCards,
    reviewCards: [
      ...buildReviewCards(v2WithoutCards as ContextEngineeringPlanV2),
      ...buildAdvisoryAxisReviewCards(v2WithoutCards.planId, axisProjections),
    ],
  };
}

export function buildContextEngineeringPlanV3(
  input: BuildContextEngineeringPlanInput,
): ContextEngineeringPlanV3 {
  const v2 = buildContextEngineeringPlanV2(input);
  const planId = `${v2.legacyPlanId}:v3`;
  const laneEvidenceRefs = (sectionRefs: readonly string[]) =>
    compact([...sectionRefs, ...v2.sourceRefs]);
  const securityEvidenceRefs = compact([
    ...v2.sourceRefs,
    ...(input.projectIndex.authorityRefs ?? []),
    ...(input.projectIndex.runtimeSurfaceRefs ?? []),
    ...(input.projectIndex.validationRefs ?? []),
  ]);
  const securityStructuredItems: readonly ContextEngineeringStructuredItem[] = [
    {
      itemId: `${planId}:security:advisory-only`,
      label: "V3 lanes are advisory-only",
      evidenceRefs: securityEvidenceRefs,
    },
    {
      itemId: `${planId}:security:mutation-authority`,
      label: "mutationAuthorizedFromCard remains false",
      evidenceRefs: securityEvidenceRefs,
    },
    {
      itemId: `${planId}:security:approved-dtc-required`,
      label: "Approved SIC/DTC remains required before mutation",
      evidenceRefs: securityEvidenceRefs,
    },
  ];
  const data = buildV3Lane(
    "DATA",
    v2.data,
    v2.data.structuredItems,
    "Mirror state and source evidence only; authoritative DATA remains in approved contracts and local authority inputs.",
    laneEvidenceRefs(v2.data.sourceRefs),
  );
  const logic = buildV3Lane(
    "LOGIC",
    v2.logic,
    v2.logic.structuredItems,
    "Use deterministic, approved LOGIC for review; do not infer schema or ontology mutation from advisory projections.",
    laneEvidenceRefs(v2.logic.sourceRefs),
  );
  const action = buildV3Lane(
    "ACTION",
    v2.action,
    v2.action.structuredItems,
    "Treat ACTION items as review proposals only; require approved DTC and governed commit path before writeback.",
    laneEvidenceRefs(v2.action.sourceRefs),
  );
  const security = buildV3Lane(
    "SECURITY",
    {
      summary:
        "SECURITY: keep DATA, LOGIC, ACTION, review cards, Convex mirrors, and DTC drafts advisory-only; no lane grants mutation authority.",
      sourceRefs: securityEvidenceRefs,
    },
    securityStructuredItems,
    "No review card, lane, mirror, or DTC draft authorizes ontology/schema/reference-pack mutation.",
    securityEvidenceRefs,
  );
  const lanes = [data, logic, action, security] as const;
  const v3WithoutReviewCards: Omit<ContextEngineeringPlanV3, "reviewCards"> = {
    schemaVersion: CONTEXT_ENGINEERING_PLAN_V3_SCHEMA_VERSION,
    planId,
    v2PlanId: v2.planId,
    legacyPlanId: v2.legacyPlanId,
    semanticIntentContractRef: v2.semanticIntentContractRef,
    fdeSessionRef: v2.fdeSessionRef,
    projectRoot: v2.projectRoot,
    data,
    logic,
    action,
    security,
    lanes,
    technologyRecommendation: v2.technologyRecommendation,
    frontendRuntimeRecommendation: {
      ...v2.frontendRuntimeRecommendation,
      stateInputs: [
        ...v2.frontendRuntimeRecommendation.stateInputs,
        "ContextEngineeringPlanV3",
      ],
    },
    validationPlan: [
      ...v2.validationPlan,
      {
        validationId: "context-plan-v3-security-lane",
        command: "bun test tests/lib/context-engineering",
        required: true,
        reason: "DATA/LOGIC/ACTION/SECURITY lanes must stay advisory-only and non-authorizing.",
      },
    ],
    axisProjections: v2.axisProjections,
    requiredUserDecisions: [
      ...v2.requiredUserDecisions,
      requiredDecision(
        planId,
        "SECURITY" as DigitalTwinDecisionDomain,
        "Approve SECURITY advisory-only boundary",
        securityEvidenceRefs,
      ),
    ],
    authorityBoundaries: [
      ...v2.authorityBoundaries,
      "ContextEngineeringPlanV3 SECURITY lane is advisory evidence only and cannot authorize mutation.",
      "mutationAuthorizedFromCard must remain false for every V3 review card.",
    ],
    sourceRefs: v2.sourceRefs,
  };
  return {
    ...v3WithoutReviewCards,
    reviewCards: [
      ...v2.reviewCards,
      buildSecurityReviewCard(v3WithoutReviewCards),
    ],
  };
}
