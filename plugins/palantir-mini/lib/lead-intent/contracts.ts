// palantir-mini — Lead Intent to Digital Twin runtime contract helpers.
//
// This is the runtime-side minimum for the proposal in
// ~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md.
// Canonical schema promotion should be a separate schema/codegen slice.

import { validateApprovalRefValue } from "../prompt-front-door/approval-ref";
import type { ApprovalRef } from "../prompt-front-door/approval-ref";
import type { DigitalTwinChangeBoundary } from "../prompt-front-door/boundary-field";
import { validateDigitalTwinBoundaryFields } from "../prompt-front-door/boundary-field";
import { resolveOntologyRefs } from "./ontology-ref-resolver";
import { projectScopePolicyForLaneIds } from "./project-scope-policy";
import { contextEngineeringSicReadinessIssues } from "../semantic-intent/context-engineering-sic-fill-sequence";
import { ontologyDtcBuildReadinessIssues } from "../semantic-intent/ontology-dtc-build-sequence";
import { semanticConsistencyGateMode } from "../semantic-consistency/policy";
import { assessSemanticConsistencyPromotionGate } from "../semantic-consistency/promotion-gate";
import type { SemanticConsistencyResolverOutput } from "../semantic-consistency/types";
import type {
  ActionTypeRef,
  BranchPolicyRef,
  FunctionRef,
  LinkTypeRef,
  MutationSurfaceRef,
  ObjectTypeRef,
  OntologyEngineeringRef,
  PermissionPolicyRef,
  ProjectLaneRef,
  ProjectSurfaceRef,
  ValidationPackRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";
import type { OntologyRefResolutionResult } from "./ontology-ref-resolver";
import type { ProjectScopePolicyProjection } from "./project-scope-policy";

export type {
  ApprovalRef,
  ApprovalSurface,
  StructuredApprovalRef,
} from "../prompt-front-door/approval-ref";
export {
  approvalRefToString,
  createUserApprovalRef,
  hasApprovalRef,
  hashUserVisibleSummary,
  isStructuredApprovalRef,
} from "../prompt-front-door/approval-ref";

export type ClarificationMateriality = "blocking" | "important" | "non-blocking";

export type SemanticClarificationStatus =
  | "open"
  | "answered"
  | "accepted-risk"
  | "out-of-scope";

export type SemanticClarificationAmbiguityType =
  | "operational-noun"
  | "operational-verb"
  | "decision"
  | "workflow"
  | "scope"
  | "permission"
  | "branch-proposal"
  | "tool-surface"
  | "data-context"
  | "replay-migration"
  | "evaluation"
  | "risk"
  | "runtime-portability";

export type PalantirArchitectureTerm =
  | "ObjectType"
  | "LinkType"
  | "ActionType"
  | "Function"
  | "AIP Agent"
  | "AIP Eval"
  | "Global Branch"
  | "Ontology Proposal"
  | "Application State"
  | "Retrieval Context"
  | "Submission Criteria"
  | "Unknown";

export interface TurnCardDecisionChoice {
  choiceId: string;
  label: string;
  consequence: string;
  recommended?: boolean;
  stateEffectPreview?: string;
  contractPatchPreview?: Record<string, unknown>;
}

export interface TurnCardDecisionSpec {
  decisionId: string;
  phase: string;
  plainKoreanTitle: string;
  plainKoreanSummary: string;
  whyItMatters: string;
  recommendedChoiceId: string;
  choices: readonly TurnCardDecisionChoice[];
  evidenceRefs: readonly string[];
  blocking: boolean;
  freeTextAllowed: boolean;
  stateEffectPreview?: string;
  contractPatchPreview?: Record<string, unknown>;
}

export interface SemanticClarificationQuestion {
  questionId: string;
  ambiguityType: SemanticClarificationAmbiguityType;
  materiality: ClarificationMateriality;
  /**
   * Runtime-neutral decision contract. Codex render this as ordinary
   * assistant text and record the user's answer as a UserDecisionRecord.
   */
  decisionSpec: TurnCardDecisionSpec;
  whyItMatters: string;
  plainLanguageExplanation: string;
  palantirArchitectureMapping: {
    operationalMeaning: string;
    platformTerm: PalantirArchitectureTerm;
  };
  defaultIfUserAcceptsRecommendation: string;
  whatWillNotHappen: string[];
  requiresUserApproval: boolean;
  answer?: {
    value: string;
    acceptedRecommendation: boolean;
    capturedAt: string;
    userApprovalRef: string;
  };
  status: SemanticClarificationStatus;
}

export interface SemanticIntentContract {
  contractId: string;
  status: "draft" | "approved" | "superseded";
  rawIntent: string;
  confirmedIntent: string;
  nonGoals: string[];
  approvedNouns: string[];
  approvedVerbs: string[];
  affectedSurfaces: string[];
  approvedObjectTypeRefs?: ObjectTypeRef[];
  approvedActionTypeRefs?: ActionTypeRef[];
  approvedFunctionRefs?: FunctionRef[];
  approvedLinkTypeRefs?: LinkTypeRef[];
  approvedSurfaceRefs?: ProjectSurfaceRef[];
  approvedLaneRefs?: ProjectLaneRef[];
  approvedCanonicalTermRefs?: string[];
  approvedTermMappingRefs?: string[];
  semanticConsistencyResultRef?: string;
  permissionsAndProposal: string;
  acceptedRisks: string[];
  downstreamAllowed: string[];
  downstreamForbidden: string[];
  clarificationQuestions: SemanticClarificationQuestion[];
  approvalRef?: ApprovalRef;
}

export interface DigitalTwinRiskRecord {
  riskId: string;
  kind:
    | "permission"
    | "branch-proposal"
    | "tool-surface"
    | "replay-migration"
    | "storage-indexing"
    | "observability"
    | "runtime-portability"
    | "evaluation";
  status: "not-applicable" | "accepted" | "mitigated" | "open";
  description: string;
  mitigation?: string;
  designAlternative?: string;
}

export type DigitalTwinDecisionDomain =
  | "DATA"
  | "LOGIC"
  | "ACTION"
  | "TECHNOLOGY"
  | "GOVERNANCE";

export type DigitalTwinRequiredDecisionStatus =
  | "open"
  | "approved"
  | "accepted-risk"
  | "out-of-scope";

export interface DigitalTwinRequiredUserDecision {
  decisionId: string;
  domain: DigitalTwinDecisionDomain;
  label: string;
  status: DigitalTwinRequiredDecisionStatus;
  blocking: boolean;
  evidenceRefs: string[];
  approvalRef?: ApprovalRef;
  acceptedRiskRef?: ApprovalRef;
}

export interface DigitalTwinChangeContract {
  contractId: string;
  status: "draft" | "approved" | "superseded";
  semanticIntentContractRef: string;
  affectedSurfaces: string[];
  changeBoundary: string;
  branchProposalPolicy: string;
  permissionBoundary: string;
  replayMigrationPlan: string;
  observabilityPlan: string;
  toolSurfaceReadiness: string;
  evaluationPlan: string;
  structuredBoundary?: DigitalTwinChangeBoundary;
  touchedOntologyRefs?: OntologyEngineeringRef[];
  permittedMutationSurfaces?: MutationSurfaceRef[];
  requiredEvaluationRefs?: ValidationPackRef[];
  requiredBranchPolicyRef?: BranchPolicyRef;
  requiredPermissionPolicyRef?: PermissionPolicyRef;
  fillPolicy?: string;
  ontologyDtcBuildSequence?: readonly unknown[];
  ontologyDtcBuildReadiness?: Record<string, unknown>;
  semanticConsistencyRefs?: string[];
  risks: DigitalTwinRiskRecord[];
  requiredUserDecisions?: DigitalTwinRequiredUserDecision[];
  approvalRef?: ApprovalRef;
}

export type WorkContractStatus = "draft" | "bound" | "superseded";

export type WorkContractBindingMode = "derived-from-approved-contracts";

export type RouterBindingSource =
  | "pm_intent_router"
  | "pm-delegate-or-direct"
  | "delegation-recipe"
  | "lead-direct"
  | "runtime-native-gap";

export type RouterDelegationMode =
  | "lead-direct"
  | "delegated"
  | "runtime-native-gap";

export interface ContractBindingRefContext {
  semanticIntentContractRef?: string;
  digitalTwinChangeContractRef?: string;
  workContractRef?: string;
  semanticConsistencyResultRef?: string;
}

export interface RouterBinding {
  bindingId: string;
  status: "attached" | "superseded";
  source: RouterBindingSource;
  delegationMode: RouterDelegationMode;
  semanticIntentContractRef: string;
  digitalTwinChangeContractRef: string;
  workContractRef?: string;
  routerBasis?: ContractRoutingBasisKind;
  routerOutputRef?: string;
  delegationRecipeRef?: string;
  attachedOutputRefs: string[];
  rationale: string;
}

export interface WorkContract {
  contractId: string;
  status: WorkContractStatus;
  bindingMode: WorkContractBindingMode;
  semanticIntentContractRef: string;
  digitalTwinChangeContractRef: string;
  workSummary: string;
  scopePaths: string[];
  nonGoals: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  touchedOntologyRefs?: OntologyEngineeringRef[];
  requiredEvaluationRefs?: ValidationPackRef[];
  semanticConsistencyResultRef?: string;
  routerBinding?: RouterBinding;
}

export interface WorkContractValidationContext extends ContractBindingRefContext {
  semanticIntentContract?: SemanticIntentContract;
  digitalTwinChangeContract?: DigitalTwinChangeContract;
  semanticConsistencyResult?: SemanticConsistencyResolverOutput;
}

export interface LeadIntentGateInput {
  intent: string;
  scopePaths?: string[];
  complexityHint?: "trivial" | "single-file" | "multi-file" | "cross-cutting";
  projectRoot?: string;
  semanticIntentContractRef?: string;
  digitalTwinChangeContractRef?: string;
  semanticConsistencyResultRef?: string;
  semanticIntentContract?: SemanticIntentContract;
  digitalTwinChangeContract?: DigitalTwinChangeContract;
  semanticConsistencyResult?: SemanticConsistencyResolverOutput;
}

export interface ContractValidationIssue {
  field: string;
  message: string;
  severity?: "blocking" | "advisory";
}

export interface ContractValidationResult {
  valid: boolean;
  issues: ContractValidationIssue[];
}

export interface ContractGateResult {
  status: "not_required" | "pass" | "contract_required" | "blocked_for_clarification";
  allowsRouting: boolean;
  reason: string;
  contractPolicy: "ambient" | "approval-required";
  riskClass: "low" | "semantic" | "digital-twin";
  requiredContracts: Array<"SemanticIntentContract" | "DigitalTwinChangeContract">;
  recommendedContracts: Array<"SemanticIntentContract" | "DigitalTwinChangeContract">;
  questions: SemanticClarificationQuestion[];
  semanticIntent: ContractValidationResult;
  digitalTwin: ContractValidationResult;
}

export type ContractRoutingBasisKind =
  | "raw-intent"
  | "approved-contract-refs"
  | "approved-inline-contracts"
  | "unresolved-contract-refs"
  // FAIL-CLOSED: ontology-affecting intent with no typed-ref DTC present.
  // Surfaced by projectRoutingFromContracts when the predicate fires.
  // Treated as "contract_required" by routeIntent (sprint-097 W5-A dtc-T5).
  | "ontology-affecting-raw-intent-fail-closed";

export interface ContractRoutingProjection {
  basis: ContractRoutingBasisKind;
  intent: string;
  scopePaths: string[];
  complexityHint?: LeadIntentGateInput["complexityHint"];
  hasContractFields: boolean;
  rationale: string;
  contractRefs: {
    semanticIntent?: string;
    digitalTwin?: string;
    semanticConsistency?: string;
  };
  typedRefResolution?: OntologyRefResolutionResult;
  projectScopePolicy?: ProjectScopePolicyProjection;
}

const SEMANTIC_SCOPE_MARKERS = [
  "ontology/",
  "schemas/",
  ".claude/schemas/",
  "contracts/",
  "capabilities",
  "changecontracts",
  "bridge/handlers/",
  "lib/delegation-recipe/",
  "agents/",
  "skills/",
  "projects/palantir-math",
  "src/generated/",
];

const SEMANTIC_INTENT_MARKERS = [
  "ontology",
  "schema",
  "primitive",
  "objecttype",
  "linktype",
  "actiontype",
  "action type",
  "function",
  "aip",
  "global branch",
  "ontology proposal",
  "permission",
  "replay",
  "migration",
  "backfill",
  "observability",
  "digital twin",
  "semanticintentcontract",
  "digitaltwinchangecontract",
  "askuserquestion",
  "lineage",
  "surface",
  "frontend",
  "backend",
  "agent",
  "evaluator",
  "generator",
  "router",
  "sprintcontract",
  "scene3d",
  "geometry3d",
  "statespace",
  "visualkind",
  "3d",
];

const CONTRACT_NAMES = [
  "SemanticIntentContract",
  "DigitalTwinChangeContract",
] as const;

const IMPLEMENTATION_MARKERS = [
  "implement",
  "edit",
  "write",
  "change",
  "build",
  "add",
  "remove",
  "delete",
  "refactor",
  "migrate",
  "apply",
  "fix",
];

const READ_ONLY_MARKERS = [
  "read-only",
  "triage",
  "inspect",
  "summarize",
  "review",
  "find",
  "locate",
  "audit",
  "wait",
  "no edit",
];

function hasAny(input: string, markers: readonly string[]): boolean {
  const lower = input.toLowerCase();
  return markers.some((marker) => lower.includes(marker));
}

const NEGATED_IMPLEMENTATION_PATTERNS = [
  /\bno\s+(?:code\s+)?edits?\b/g,
  /\bno\s+(?:runtime\s+)?mutation\b/g,
  /\bwithout\s+(?:code\s+)?edits?\b/g,
  /\bdo\s+not\s+(?:edit|write|change|modify|mutate|implement|build|add|remove|delete|refactor|migrate|apply|fix)\b/g,
];

function stripNegatedImplementationPhrases(input: string): string {
  return NEGATED_IMPLEMENTATION_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, " "),
    input.toLowerCase(),
  );
}

function hasNegatedImplementationPhrase(input: string): boolean {
  return NEGATED_IMPLEMENTATION_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}

function normalizeScope(scopePaths: readonly string[]): string {
  return scopePaths.join(" ").toLowerCase();
}

function uniqueNonEmpty(values: readonly unknown[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values ?? []) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function validateStringArrayElements(
  issues: ContractValidationIssue[],
  field: string,
  values: readonly unknown[],
): void {
  values.forEach((value, index) => {
    if (typeof value === "string" && value.trim().length > 0) return;
    issues.push({
      field: `${field}.${index}`,
      message: `${field} entries must be non-empty strings`,
    });
  });
}

function contractValidationResult(
  issues: ContractValidationIssue[],
): ContractValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity !== "advisory"),
    issues,
  };
}

function semanticConsistencyIssueSeverity(): "blocking" | "advisory" | undefined {
  const mode = semanticConsistencyGateMode();
  if (mode === "off") return undefined;
  return mode === "blocking" ? "blocking" : "advisory";
}

function semanticConsistencyRefsForContracts(input: {
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly digitalTwinChangeContract?: DigitalTwinChangeContract;
  readonly semanticConsistencyResultRef?: string;
}): string[] {
  return uniqueNonEmpty([
    input.semanticConsistencyResultRef,
    input.semanticIntentContract?.semanticConsistencyResultRef,
    ...(input.digitalTwinChangeContract?.semanticConsistencyRefs ?? []),
  ]);
}

function pushSemanticConsistencyIssue(
  issues: ContractValidationIssue[],
  field: string,
  message: string,
): void {
  const severity = semanticConsistencyIssueSeverity();
  if (!severity) return;
  issues.push({ field, message, severity });
}

function semanticConsistencyPromotionIssuesForContracts(input: {
  readonly ontologyAffecting: boolean;
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly digitalTwinChangeContract?: DigitalTwinChangeContract;
  readonly semanticConsistencyResultRef?: string;
  readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
}): ContractValidationIssue[] {
  const gate = assessSemanticConsistencyPromotionGate({
    subject: "sic-dtc-pair",
    ontologyAffecting: input.ontologyAffecting,
    semanticConsistencyResult: input.semanticConsistencyResult,
    attachedResolverRunRefs: semanticConsistencyRefsForContracts(input),
  });
  return gate.findings
    .filter((issue) => issue.blocking)
    .map((issue) => ({
      field:
        issue.field === "attachedResolverRunRefs"
          ? "semanticConsistencyResultRef"
          : issue.field,
      message: `${issue.code}: ${issue.message}`,
      severity: "blocking" as const,
    }));
}

export function isReadOnlyIntent(intent: string): boolean {
  const lower = intent.toLowerCase();
  const readOnly =
    hasAny(lower, READ_ONLY_MARKERS) || hasNegatedImplementationPhrase(lower);
  const implementation = hasAny(stripNegatedImplementationPhrases(lower), IMPLEMENTATION_MARKERS);
  return readOnly && !implementation;
}

export function isComplexOntologyAffecting(input: LeadIntentGateInput): boolean {
  const scopePaths = input.scopePaths ?? [];
  const complex =
    input.complexityHint === "multi-file" ||
    input.complexityHint === "cross-cutting" ||
    scopePaths.length >= 3;
  if (isReadOnlyIntent(input.intent)) return false;
  return isOntologyAffectingIntent(input) && complex;
}

export function isOntologyAffectingIntent(input: LeadIntentGateInput): boolean {
  const scopeText = normalizeScope(input.scopePaths ?? []);
  const intent = input.intent.toLowerCase();
  return (
    hasAny(intent, SEMANTIC_INTENT_MARKERS) ||
    hasAny(scopeText, SEMANTIC_SCOPE_MARKERS)
  );
}

/**
 * Mirror of isOntologyAffectingIntent operating on DigitalTwinChangeContract.
 * Used by validateDigitalTwinChangeContract to decide whether typed-ref
 * enforcement should fire.
 *
 * Returns true if any of:
 * - affectedSurfaces matches SEMANTIC_SCOPE_MARKERS
 * - touchedOntologyRefs is non-empty
 * - permittedMutationSurfaces is non-empty
 * - changeBoundary matches SEMANTIC_INTENT_MARKERS
 * - structuredBoundary.changeBoundary.value matches SEMANTIC_INTENT_MARKERS
 */
export function isOntologyAffectingDtc(contract: DigitalTwinChangeContract): boolean {
  const surfaces = Array.isArray(contract.affectedSurfaces)
    ? contract.affectedSurfaces.join(" ").toLowerCase()
    : "";
  if (hasAny(surfaces, SEMANTIC_SCOPE_MARKERS)) return true;
  if ((contract.touchedOntologyRefs?.length ?? 0) > 0) return true;
  if ((contract.permittedMutationSurfaces?.length ?? 0) > 0) return true;
  const boundary =
    typeof contract.changeBoundary === "string" ? contract.changeBoundary.toLowerCase() : "";
  if (hasAny(boundary, SEMANTIC_INTENT_MARKERS)) return true;
  const structured =
    typeof contract.structuredBoundary?.changeBoundary.value === "string"
      ? contract.structuredBoundary.changeBoundary.value.toLowerCase()
      : "";
  if (hasAny(structured, SEMANTIC_INTENT_MARKERS)) return true;
  return false;
}

export function requiresContractApproval(input: LeadIntentGateInput): boolean {
  if (isReadOnlyIntent(input.intent)) return false;
  if (!isOntologyAffectingIntent(input)) return false;
  if (isComplexOntologyAffecting(input)) return true;
  return hasAny(input.intent, IMPLEMENTATION_MARKERS);
}

function decisionSpec(input: {
  questionId: string;
  phase: string;
  title: string;
  summary: string;
  whyItMatters: string;
  recommended: string;
  alternatives: Array<{ label: string; consequence: string }>;
  evidenceRefs?: string[];
  blocking?: boolean;
  stateEffectPreview?: string;
}): TurnCardDecisionSpec {
  const recommendedChoiceId = `${input.questionId}.recommended`;
  return {
    decisionId: input.questionId,
    phase: input.phase,
    plainKoreanTitle: input.title,
    plainKoreanSummary: input.summary,
    whyItMatters: input.whyItMatters,
    recommendedChoiceId,
    choices: [
      {
        choiceId: recommendedChoiceId,
        label: "추천 경계 확인",
        consequence: input.recommended,
        recommended: true,
        stateEffectPreview: input.stateEffectPreview,
      },
      ...input.alternatives.slice(0, 2).map((alternative, index) => ({
        choiceId: `${input.questionId}.alternative-${index + 1}`,
        label: alternative.label,
        consequence: alternative.consequence,
        recommended: false,
      })),
    ],
    evidenceRefs: input.evidenceRefs ?? [],
    blocking: input.blocking ?? true,
    freeTextAllowed: true,
    stateEffectPreview: input.stateEffectPreview,
  };
}

export function createSemanticClarificationQuestions(
  input: LeadIntentGateInput,
): SemanticClarificationQuestion[] {
  const scopePaths = input.scopePaths ?? [];
  const scopeText = normalizeScope(scopePaths);
  const questions: SemanticClarificationQuestion[] = [];

  questions.push({
    questionId: "semantic-intent.confirm-operational-meaning",
    ambiguityType: "decision",
    materiality: "blocking",
    decisionSpec: decisionSpec({
      questionId: "semantic-intent.confirm-operational-meaning",
      phase: "semantic-intent",
      title: "작업 의미 승인",
      summary:
        "구현 전에 이 요청을 단순 코드 작업이 아니라 승인된 의미 계약 변경으로 다룰지 확정합니다.",
      recommended:
        "Yes. Treat the approved user meaning as the authority and block implementation until the contract names nouns, verbs, surfaces, and non-goals.",
      alternatives: [
        {
          label: "Treat as code task",
          consequence:
            "Faster start, but the router may implement a correct-looking route for the wrong interpretation.",
        },
        {
          label: "Keep read-only",
          consequence:
            "No implementation risk, but no runtime proof that the proposal works.",
        },
      ],
      whyItMatters:
        "The router must not dispatch ontology-affecting execution from privately inferred user meaning.",
      evidenceRefs: ["contract:SemanticIntentContract"],
      stateEffectPreview: "Close semantic-intent blocking decision before DTC authoring.",
    }),
    whyItMatters:
      "The router must not dispatch ontology-affecting execution from privately inferred user meaning.",
    plainLanguageExplanation:
      "This asks what the user actually wants changed and what must stay untouched before any agent starts editing.",
    palantirArchitectureMapping: {
      operationalMeaning: "Approved user decision and workflow boundary",
      platformTerm: "Ontology Proposal",
    },
    defaultIfUserAcceptsRecommendation:
      "Create an approved SemanticIntentContract before routing implementation.",
    whatWillNotHappen: [
      "No downstream agent may invent a new ontology noun or action from context alone.",
      "No implementation work may expand the affected surfaces silently.",
    ],
    requiresUserApproval: true,
    status: "open",
  });

  questions.push({
    questionId: "digital-twin.map-surfaces-and-risks",
    ambiguityType: "risk",
    materiality: "blocking",
    decisionSpec: decisionSpec({
      questionId: "digital-twin.map-surfaces-and-risks",
      phase: "digital-twin-change",
      title: "변경 경계 승인",
      summary:
        "실제 변경될 런타임 표면, replay 위험, 권한, branch/proposal 정책, 평가 범위를 계약으로 확정합니다.",
      recommended:
        "Map frontend, backend, ontology, agent, evaluation, replay, and observability impacts explicitly; mark non-applicable risks as such.",
      alternatives: [
        {
          label: "Backend only",
          consequence:
            "May miss frontend, agent, evaluator, or presentation-surface drift.",
        },
        {
          label: "Runtime only",
          consequence:
            "May ship visible behavior without ontology lineage or replay evidence.",
        },
      ],
      whyItMatters:
        "Digital Twin work is broader than a backend schema; the contract must describe surfaces and risk boundaries.",
      evidenceRefs: ["contract:DigitalTwinChangeContract"],
      stateEffectPreview: "Close Digital Twin blocking decision before routing.",
    }),
    whyItMatters:
      "Digital Twin work is broader than a backend schema; the contract must describe surfaces and risk boundaries.",
    plainLanguageExplanation:
      "This prevents an implementation from passing tests while changing the wrong user-facing behavior or hiding migration cost.",
    palantirArchitectureMapping: {
      operationalMeaning: "Inspectable model of affected nouns, actions, state, applications, and evaluation",
      platformTerm: "Application State",
    },
    defaultIfUserAcceptsRecommendation:
      "Create an approved DigitalTwinChangeContract before routing implementation.",
    whatWillNotHappen: [
      "No replay, backfill, permission, or tool-surface risk is treated as implicit.",
      "No evaluator may pass code that violates the approved semantic contract.",
    ],
    requiresUserApproval: true,
    status: "open",
  });

  if (scopeText.includes("3d") || input.intent.toLowerCase().includes("3d")) {
    questions.push({
      questionId: "digital-twin.confirm-3d-primitive-path",
      ambiguityType: "runtime-portability",
      materiality: "important",
      decisionSpec: decisionSpec({
        questionId: "digital-twin.confirm-3d-primitive-path",
        phase: "digital-twin-change",
        title: "3D primitive 경계 승인",
        summary:
          "3D를 기존 SceneV4 확장이 아니라 별도 Scene3D primitive 경로로 둘지 확정합니다.",
        recommended:
          "Use a separate Scene3D primitive path and keep SceneV4 2D-only unless a later approved contract changes that boundary.",
        alternatives: [
          {
            label: "Widen SceneV4",
            consequence:
              "Smaller first diff, but risks two-axis authoring ambiguity between visualKind and dimension.",
          },
          {
            label: "Use R3F now",
            consequence:
              "More rendering power, but adds dependency and bundle questions before the first 3D proof.",
          },
        ],
        whyItMatters:
          "3D geometry changes can split semantic ownership if the renderer path and primitive path disagree.",
        evidenceRefs: ["contract:DigitalTwinChangeContract", "surface:renderer"],
        blocking: false,
        stateEffectPreview: "Record a non-blocking 3D runtime portability decision.",
      }),
      whyItMatters:
        "3D geometry changes can split semantic ownership if the renderer path and primitive path disagree.",
      plainLanguageExplanation:
        "This chooses whether 3D is a new kind of scene or an extra option inside the current 2D graph scene.",
      palantirArchitectureMapping: {
        operationalMeaning: "Rendering surface and authoring object boundary",
        platformTerm: "ObjectType",
      },
      defaultIfUserAcceptsRecommendation:
        "Scene3D is the additive semantic path; SceneV4 remains the graph2D path.",
      whatWillNotHappen: [
        "No new 3D renderer dependency is added before the first approved proof slice.",
        "No 2D graph contract is silently widened to carry 3D-only fields.",
      ],
      requiresUserApproval: true,
      status: "open",
    });
  }

  return questions;
}

export function validateSemanticIntentContract(
  contract?: SemanticIntentContract,
): ContractValidationResult {
  const issues: ContractValidationIssue[] = [];
  if (!contract) {
    return {
      valid: false,
      issues: [{ field: "semanticIntentContract", message: "missing inline contract" }],
    };
  }
  if (contract.status !== "approved") {
    issues.push({ field: "status", message: "contract is not approved" });
  }
  issues.push(...validateApprovalRefValue("approvalRef", contract.approvalRef));
  if (typeof contract.confirmedIntent !== "string" || !contract.confirmedIntent.trim()) {
    issues.push({ field: "confirmedIntent", message: "confirmedIntent is required" });
  }
  if (!Array.isArray(contract.approvedNouns) || contract.approvedNouns.length === 0) {
    issues.push({ field: "approvedNouns", message: "at least one approved noun is required" });
  } else {
    validateStringArrayElements(issues, "approvedNouns", contract.approvedNouns);
  }
  if (!Array.isArray(contract.approvedVerbs) || contract.approvedVerbs.length === 0) {
    issues.push({ field: "approvedVerbs", message: "at least one approved verb is required" });
  } else {
    validateStringArrayElements(issues, "approvedVerbs", contract.approvedVerbs);
  }
  if (!Array.isArray(contract.affectedSurfaces) || contract.affectedSurfaces.length === 0) {
    issues.push({ field: "affectedSurfaces", message: "at least one affected surface is required" });
  } else {
    validateStringArrayElements(issues, "affectedSurfaces", contract.affectedSurfaces);
  }
  const openBlocking = Array.isArray(contract.clarificationQuestions)
    ? contract.clarificationQuestions.filter(
        (q) => q.materiality === "blocking" && q.status === "open",
      )
    : [];
  if (!Array.isArray(contract.clarificationQuestions)) {
    issues.push({
      field: "clarificationQuestions",
      message: "clarificationQuestions must be an array",
    });
  }
  if (openBlocking.length > 0) {
    issues.push({
      field: "clarificationQuestions",
      message: `${openBlocking.length} blocking clarification question(s) remain open`,
    });
  }
  if (
    ((contract.approvedNouns?.length ?? 0) > 0 || (contract.approvedVerbs?.length ?? 0) > 0) &&
    (contract.approvedCanonicalTermRefs?.length ?? 0) === 0 &&
    (contract.approvedTermMappingRefs?.length ?? 0) === 0 &&
    !contract.semanticConsistencyResultRef
  ) {
    pushSemanticConsistencyIssue(
      issues,
      "semanticConsistencyResultRef",
      "approved nouns/verbs should include deterministic SemanticConsistencyResolver evidence before promotion",
    );
  }
  issues.push(...contextEngineeringSicReadinessIssues(contract));
  return contractValidationResult(issues);
}

export function validateDigitalTwinChangeContract(
  contract?: DigitalTwinChangeContract,
): ContractValidationResult {
  const issues: ContractValidationIssue[] = [];
  if (!contract) {
    return {
      valid: false,
      issues: [{ field: "digitalTwinChangeContract", message: "missing inline contract" }],
    };
  }
  if (contract.status !== "approved") {
    issues.push({ field: "status", message: "contract is not approved" });
  }
  issues.push(...validateApprovalRefValue("approvalRef", contract.approvalRef));
  if (!contract.semanticIntentContractRef) {
    issues.push({
      field: "semanticIntentContractRef",
      message: "semanticIntentContractRef is required",
    });
  }
  if (!Array.isArray(contract.affectedSurfaces) || contract.affectedSurfaces.length === 0) {
    issues.push({ field: "affectedSurfaces", message: "at least one affected surface is required" });
  } else {
    validateStringArrayElements(issues, "affectedSurfaces", contract.affectedSurfaces);
  }
  for (const field of [
    "changeBoundary",
    "branchProposalPolicy",
    "permissionBoundary",
    "replayMigrationPlan",
    "observabilityPlan",
    "toolSurfaceReadiness",
    "evaluationPlan",
  ] as const) {
    if (typeof contract[field] !== "string" || !contract[field].trim()) {
      issues.push({ field, message: `${field} is required` });
    }
  }
  // Typed-ref enforcement: ontology-affecting DTCs require at least one touchedOntologyRef
  // and at least one requiredEvaluationRef. Backward-compat: non-affecting DTCs skip this block.
  const ontologyAffecting = isOntologyAffectingDtc(contract);
  const bypass = process.env["PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"] === "1";
  const usesOntologyDtcBuild =
    (contract as { fillPolicy?: string }).fillPolicy === "ontology-dtc-build";
  if (ontologyAffecting && !bypass && !usesOntologyDtcBuild) {
    if (!contract.touchedOntologyRefs || contract.touchedOntologyRefs.length === 0) {
      issues.push({
        field: "touchedOntologyRefs",
        message:
          "ontology-affecting DTC requires at least one touchedOntologyRef (ObjectType/LinkType/ActionType/Function)",
      });
    }
    if (!contract.requiredEvaluationRefs || contract.requiredEvaluationRefs.length === 0) {
      issues.push({
        field: "requiredEvaluationRefs",
        message:
          "ontology-affecting DTC requires at least one requiredEvaluationRef (ValidationPackRef)",
      });
    }
  }
  if (ontologyAffecting && (contract.semanticConsistencyRefs?.length ?? 0) === 0) {
    pushSemanticConsistencyIssue(
      issues,
      "semanticConsistencyRefs",
      "ontology-affecting DTC should reference deterministic semantic consistency evidence or explicit non-applicable evidence",
    );
  }
  if (contract.structuredBoundary) {
    issues.push(
      ...validateDigitalTwinBoundaryFields(contract.structuredBoundary).map((issue) => ({
        field: issue.field,
        message: issue.message,
      })),
    );
  }
  const openRisks = Array.isArray(contract.risks)
    ? contract.risks.filter((risk) => risk.status === "open")
    : [];
  if (!Array.isArray(contract.risks)) {
    issues.push({ field: "risks", message: "risks must be an array" });
  }
  if (openRisks.length > 0) {
    issues.push({
      field: "risks",
      message: `${openRisks.length} Digital Twin risk(s) remain open`,
    });
  }
  const unsupportedWithoutAlternative = Array.isArray(contract.risks)
    ? contract.risks.filter(
        (risk) =>
          risk.kind === "tool-surface" &&
          risk.status !== "not-applicable" &&
          !risk.designAlternative,
      )
    : [];
  if (unsupportedWithoutAlternative.length > 0) {
    issues.push({
      field: "risks.tool-surface",
      message: "tool-surface risks require a designAlternative",
    });
  }
  for (const decision of contract.requiredUserDecisions ?? []) {
    if (!decision.decisionId.trim()) {
      issues.push({
        field: "requiredUserDecisions.decisionId",
        message: "required user decision decisionId is required",
      });
    }
    if (!decision.label.trim()) {
      issues.push({
        field: `requiredUserDecisions.${decision.decisionId || "unknown"}.label`,
        message: "required user decision label is required",
      });
    }
    if (decision.evidenceRefs.length === 0) {
      issues.push({
        field: `requiredUserDecisions.${decision.decisionId || "unknown"}.evidenceRefs`,
        message: "required user decision evidenceRefs must include at least one ref",
      });
    }
    if (decision.status === "approved") {
      issues.push(
        ...validateApprovalRefValue(
          `requiredUserDecisions.${decision.decisionId || "unknown"}.approvalRef`,
          decision.approvalRef,
        ),
      );
    }
    if (decision.status === "accepted-risk") {
      issues.push(
        ...validateApprovalRefValue(
          `requiredUserDecisions.${decision.decisionId || "unknown"}.acceptedRiskRef`,
          decision.acceptedRiskRef,
        ),
      );
    }
  }
  if (contract.status === "approved") {
    const openBlockingDecisions = (contract.requiredUserDecisions ?? []).filter(
      (decision) => decision.blocking && decision.status === "open",
    );
    if (openBlockingDecisions.length > 0) {
      issues.push({
        field: "requiredUserDecisions",
        message:
          `${openBlockingDecisions.length} blocking required user decision(s) remain open: ` +
          openBlockingDecisions.map((decision) => decision.domain).join(", "),
      });
    }
  }
  issues.push(...ontologyDtcBuildReadinessIssues(contract, { requirePolicy: ontologyAffecting }));
  return contractValidationResult(issues);
}

function validateRequiredString(
  issues: ContractValidationIssue[],
  field: string,
  value: string | undefined,
): void {
  if (!value?.trim()) {
    issues.push({ field, message: `${field} is required` });
  }
}

function pushPrefixedIssues(
  issues: ContractValidationIssue[],
  prefix: string,
  result: ContractValidationResult,
): void {
  if (result.issues.length === 0) return;
  for (const issue of result.issues) {
    issues.push({
      field: `${prefix}.${issue.field}`,
      message: issue.message,
      ...(issue.severity ? { severity: issue.severity } : {}),
    });
  }
}

function requireExpectedRef(
  issues: ContractValidationIssue[],
  field: string,
  actual: string,
  expected: string | undefined,
): void {
  if (!expected || !actual.trim()) return;
  if (actual !== expected) {
    issues.push({
      field,
      message: `${field} must match ${expected}`,
    });
  }
}

function requireAllowedRef(
  issues: ContractValidationIssue[],
  field: string,
  actual: string,
  allowedRefs: readonly string[],
): void {
  if (!actual.trim() || allowedRefs.length === 0) return;
  if (!allowedRefs.includes(actual)) {
    issues.push({
      field,
      message: `${field} must match one of: ${allowedRefs.join(", ")}`,
    });
  }
}

interface RidRef {
  kind: string;
  rid: string;
}

function refKey(ref: RidRef): string {
  return `${ref.kind}:${ref.rid}`;
}

function refsOutsideApprovedSet(
  requested: readonly RidRef[] | undefined,
  approved: readonly RidRef[] | undefined,
): string[] {
  if (!requested || requested.length === 0 || !approved) return [];
  const approvedKeys = new Set(approved.map(refKey));
  return requested.map(refKey).filter((key) => !approvedKeys.has(key));
}

export function validateRouterBinding(
  binding?: RouterBinding,
  expectedRefs: ContractBindingRefContext = {},
): ContractValidationResult {
  const issues: ContractValidationIssue[] = [];
  if (!binding) {
    return {
      valid: false,
      issues: [{ field: "routerBinding", message: "missing router binding" }],
    };
  }

  validateRequiredString(issues, "bindingId", binding.bindingId);
  validateRequiredString(
    issues,
    "semanticIntentContractRef",
    binding.semanticIntentContractRef,
  );
  validateRequiredString(
    issues,
    "digitalTwinChangeContractRef",
    binding.digitalTwinChangeContractRef,
  );
  validateRequiredString(issues, "rationale", binding.rationale);
  requireExpectedRef(
    issues,
    "semanticIntentContractRef",
    binding.semanticIntentContractRef,
    expectedRefs.semanticIntentContractRef,
  );
  requireExpectedRef(
    issues,
    "digitalTwinChangeContractRef",
    binding.digitalTwinChangeContractRef,
    expectedRefs.digitalTwinChangeContractRef,
  );
  if (binding.workContractRef || expectedRefs.workContractRef) {
    validateRequiredString(issues, "workContractRef", binding.workContractRef);
    requireExpectedRef(
      issues,
      "workContractRef",
      binding.workContractRef ?? "",
      expectedRefs.workContractRef,
    );
  }
  if (binding.attachedOutputRefs.length === 0) {
    issues.push({
      field: "attachedOutputRefs",
      message: "at least one router or delegation output ref must be attached",
    });
  }
  if (binding.source === "delegation-recipe" || binding.delegationMode === "delegated") {
    validateRequiredString(issues, "delegationRecipeRef", binding.delegationRecipeRef);
  }
  return contractValidationResult(issues);
}

export function validateWorkContract(
  contract?: WorkContract,
  context: WorkContractValidationContext = {},
): ContractValidationResult {
  const issues: ContractValidationIssue[] = [];
  if (!contract) {
    return {
      valid: false,
      issues: [{ field: "workContract", message: "missing work contract" }],
    };
  }

  validateRequiredString(issues, "contractId", contract.contractId);
  if (contract.status !== "bound") {
    issues.push({ field: "status", message: "WorkContract is not bound" });
  }
  if (contract.bindingMode !== "derived-from-approved-contracts") {
    issues.push({
      field: "bindingMode",
      message: "WorkContract must be derived from approved SIC/DTC contracts",
    });
  }
  validateRequiredString(
    issues,
    "semanticIntentContractRef",
    contract.semanticIntentContractRef,
  );
  validateRequiredString(
    issues,
    "digitalTwinChangeContractRef",
    contract.digitalTwinChangeContractRef,
  );
  validateRequiredString(issues, "workSummary", contract.workSummary);
  if (contract.scopePaths.length === 0) {
    issues.push({ field: "scopePaths", message: "at least one scope path is required" });
  }
  if (contract.allowedActions.length === 0) {
    issues.push({ field: "allowedActions", message: "at least one allowed action is required" });
  }
  if (contract.forbiddenActions.length === 0) {
    issues.push({
      field: "forbiddenActions",
      message: "at least one forbidden action is required",
    });
  }

  const semanticRefs = uniqueNonEmpty(
    [
    context.semanticIntentContractRef,
    context.semanticIntentContract?.contractId,
    ].filter((ref): ref is string => typeof ref === "string"),
  );
  const digitalTwinRefs = uniqueNonEmpty(
    [
    context.digitalTwinChangeContractRef,
    context.digitalTwinChangeContract?.contractId,
    ].filter((ref): ref is string => typeof ref === "string"),
  );
  requireAllowedRef(
    issues,
    "semanticIntentContractRef",
    contract.semanticIntentContractRef,
    semanticRefs,
  );
  requireAllowedRef(
    issues,
    "digitalTwinChangeContractRef",
    contract.digitalTwinChangeContractRef,
    digitalTwinRefs,
  );

  if (context.semanticIntentContract) {
    pushPrefixedIssues(
      issues,
      "semanticIntentContract",
      validateSemanticIntentContract(context.semanticIntentContract),
    );
  }
  if (context.digitalTwinChangeContract) {
    pushPrefixedIssues(
      issues,
      "digitalTwinChangeContract",
      validateDigitalTwinChangeContract(context.digitalTwinChangeContract),
    );
    const allowedSemanticRefs = uniqueNonEmpty([
      ...semanticRefs,
      contract.semanticIntentContractRef,
    ]);
    requireAllowedRef(
      issues,
      "digitalTwinChangeContract.semanticIntentContractRef",
      context.digitalTwinChangeContract.semanticIntentContractRef,
      allowedSemanticRefs,
    );
  }

  const approvedScopePaths = uniqueNonEmpty([
    ...(context.semanticIntentContract?.affectedSurfaces ?? []),
    ...(context.digitalTwinChangeContract?.affectedSurfaces ?? []),
  ]);
  if (approvedScopePaths.length > 0) {
    const outOfScopePaths = contract.scopePaths.filter(
      (scopePath) => !approvedScopePaths.includes(scopePath.trim()),
    );
    if (outOfScopePaths.length > 0) {
      issues.push({
        field: "scopePaths",
        message:
          "WorkContract scopePaths must be a subset of approved SIC/DTC affectedSurfaces: " +
          outOfScopePaths.join(", "),
      });
    }
  }

  const outsideOntologyRefs = refsOutsideApprovedSet(
    contract.touchedOntologyRefs,
    context.digitalTwinChangeContract?.touchedOntologyRefs,
  );
  if (outsideOntologyRefs.length > 0) {
    issues.push({
      field: "touchedOntologyRefs",
      message:
        "WorkContract touchedOntologyRefs must be a subset of DTC touchedOntologyRefs: " +
        outsideOntologyRefs.join(", "),
    });
  }
  const outsideEvaluationRefs = refsOutsideApprovedSet(
    contract.requiredEvaluationRefs,
    context.digitalTwinChangeContract?.requiredEvaluationRefs,
  );
  if (outsideEvaluationRefs.length > 0) {
    issues.push({
      field: "requiredEvaluationRefs",
      message:
        "WorkContract requiredEvaluationRefs must be a subset of DTC requiredEvaluationRefs: " +
        outsideEvaluationRefs.join(", "),
    });
  }

  if (contract.routerBinding) {
    pushPrefixedIssues(
      issues,
      "routerBinding",
      validateRouterBinding(contract.routerBinding, {
        semanticIntentContractRef: contract.semanticIntentContractRef,
        digitalTwinChangeContractRef: contract.digitalTwinChangeContractRef,
        workContractRef: contract.contractId,
      }),
    );
  }

  return contractValidationResult(issues);
}

export function deriveWorkContractFromContracts(input: {
  contractId?: string;
  semanticIntentContract: SemanticIntentContract;
  digitalTwinChangeContract: DigitalTwinChangeContract;
  semanticIntentContractRef?: string;
  digitalTwinChangeContractRef?: string;
  workSummary?: string;
  routerBinding?: RouterBinding;
}): WorkContract {
  const semanticIntentContractRef =
    input.semanticIntentContractRef ?? input.semanticIntentContract.contractId;
  const digitalTwinChangeContractRef =
    input.digitalTwinChangeContractRef ?? input.digitalTwinChangeContract.contractId;
  const semanticResult = validateSemanticIntentContract(input.semanticIntentContract);
  const digitalTwinResult = validateDigitalTwinChangeContract(input.digitalTwinChangeContract);
  const semanticConsistencyResultRef = semanticConsistencyRefsForContracts({
    semanticIntentContract: input.semanticIntentContract,
    digitalTwinChangeContract: input.digitalTwinChangeContract,
  }).find((ref) => ref.startsWith("semantic-resolver-run:"));
  return {
    contractId:
      input.contractId ??
      makeContractId(
        "work-contract",
        input.semanticIntentContract.confirmedIntent ||
          input.semanticIntentContract.rawIntent ||
          input.digitalTwinChangeContract.changeBoundary,
      ),
    status: semanticResult.valid && digitalTwinResult.valid ? "bound" : "draft",
    bindingMode: "derived-from-approved-contracts",
    semanticIntentContractRef,
    digitalTwinChangeContractRef,
    workSummary:
      input.workSummary ||
      input.semanticIntentContract.confirmedIntent ||
      input.digitalTwinChangeContract.changeBoundary,
    scopePaths: uniqueNonEmpty([
      ...input.semanticIntentContract.affectedSurfaces,
      ...input.digitalTwinChangeContract.affectedSurfaces,
    ]),
    nonGoals: [...input.semanticIntentContract.nonGoals],
    allowedActions: [...input.semanticIntentContract.downstreamAllowed],
    forbiddenActions: [...input.semanticIntentContract.downstreamForbidden],
    touchedOntologyRefs: input.digitalTwinChangeContract.touchedOntologyRefs,
    requiredEvaluationRefs: input.digitalTwinChangeContract.requiredEvaluationRefs,
    ...(semanticConsistencyResultRef ? { semanticConsistencyResultRef } : {}),
    ...(input.routerBinding ? { routerBinding: input.routerBinding } : {}),
  };
}

function refsSatisfyRequirement(input: LeadIntentGateInput): boolean {
  return Boolean(input.semanticIntentContractRef && input.digitalTwinChangeContractRef);
}

function unresolvedRefIssue(field: string): ContractValidationResult {
  return {
    valid: false,
    issues: [
      {
        field,
        message:
          "Contract ref was supplied without a dereferenced approved contract body; ref strings alone are not execution authority.",
      },
    ],
  };
}

export function projectRoutingFromContracts(
  input: LeadIntentGateInput,
): ContractRoutingProjection {
  const rawProjection: ContractRoutingProjection = {
    basis: "raw-intent",
    intent: input.intent,
    scopePaths: uniqueNonEmpty(input.scopePaths),
    complexityHint: input.complexityHint,
    hasContractFields: false,
    rationale: "No approved contract fields are available; routing uses the raw Lead intent.",
    contractRefs: {
      semanticIntent: input.semanticIntentContractRef,
      digitalTwin: input.digitalTwinChangeContractRef,
    },
  };

  const semantic = input.semanticIntentContract;
  const digitalTwin = input.digitalTwinChangeContract;
  if (semantic && digitalTwin) {
    const semanticResult = validateSemanticIntentContract(semantic);
    const digitalTwinResult = validateDigitalTwinChangeContract(digitalTwin);
    const promotionIssues = semanticConsistencyPromotionIssuesForContracts({
      ontologyAffecting: requiresContractApproval(input),
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      semanticConsistencyResultRef: input.semanticConsistencyResultRef,
      semanticConsistencyResult: input.semanticConsistencyResult,
    });
    if (semanticResult.valid && digitalTwinResult.valid && promotionIssues.length === 0) {
      const typedRefResolution = resolveOntologyRefs({
        semanticIntentContract: semantic,
        digitalTwinChangeContract: digitalTwin,
        scopePaths: input.scopePaths,
        projectRoot: input.projectRoot,
      });
      const projectScopePolicy = projectScopePolicyForLaneIds(
        typedRefResolution.approvedLaneRefs.map((ref) => ref.laneId),
        input.projectRoot,
      );
      const projectedScopePaths = uniqueNonEmpty([
        ...semantic.affectedSurfaces,
        ...digitalTwin.affectedSurfaces,
      ]);
      const intentSections = [
        `Confirmed intent: ${semantic.confirmedIntent}`,
        `Approved nouns: ${semantic.approvedNouns.join(", ")}`,
        `Approved verbs: ${semantic.approvedVerbs.join(", ")}`,
        `Non-goals: ${semantic.nonGoals.join(", ") || "none"}`,
        `Downstream allowed: ${semantic.downstreamAllowed.join(", ") || "none"}`,
        `Downstream forbidden: ${semantic.downstreamForbidden.join(", ") || "none"}`,
        `Digital Twin boundary: ${digitalTwin.changeBoundary}`,
        `Permission boundary: ${digitalTwin.permissionBoundary}`,
        `Branch/proposal policy: ${digitalTwin.branchProposalPolicy}`,
        `Evaluation plan: ${digitalTwin.evaluationPlan}`,
      ];
      if (typedRefResolution.approvedLaneRefs.length > 0) {
        intentSections.push(
          `Typed lane refs: ${typedRefResolution.approvedLaneRefs
            .map((ref) => `${ref.laneId} (${ref.axisId})`)
            .join(", ")}`,
        );
      }
      if (typedRefResolution.approvedMcpToolRefs.length > 0) {
        intentSections.push(
          `Typed MCP tool refs: ${typedRefResolution.approvedMcpToolRefs
            .map((ref) => ref.toolName ?? ref.displayName ?? ref.rid)
            .join(", ")}`,
        );
      }
      if (typedRefResolution.unresolvedTerms.length > 0) {
        intentSections.push(
          `Unresolved typed refs: ${typedRefResolution.unresolvedTerms
            .map((term) => `${term.source}:${term.term}`)
            .join(", ")}`,
        );
      }
      if (projectScopePolicy.validationPacks.length > 0) {
        intentSections.push(
          `ProjectScope validation packs: ${projectScopePolicy.validationPacks.join(", ")}`,
        );
      }
      return {
        basis: "approved-inline-contracts",
        intent: intentSections.join("\n"),
        scopePaths: projectedScopePaths.length > 0 ? projectedScopePaths : rawProjection.scopePaths,
        complexityHint: input.complexityHint,
        hasContractFields: true,
        rationale:
          "Routing uses approved SemanticIntentContract and DigitalTwinChangeContract fields " +
          "instead of raw prompt wording.",
        contractRefs: {
          semanticIntent: input.semanticIntentContractRef ?? semantic.contractId,
          digitalTwin: input.digitalTwinChangeContractRef ?? digitalTwin.contractId,
        },
        typedRefResolution,
        ...(projectScopePolicy.matches.length > 0 ? { projectScopePolicy } : {}),
      };
    }
  }

  if (refsSatisfyRequirement(input)) {
    return {
      ...rawProjection,
      basis: "unresolved-contract-refs",
      rationale:
        "Contract refs are present, but no approved contract fields were dereferenced; " +
        "routing must stay blocked until prompt-front-door refs resolve to approved records.",
      contractRefs: {
        semanticIntent: input.semanticIntentContractRef,
        digitalTwin: input.digitalTwinChangeContractRef,
      },
    };
  }

  return rawProjection;
}

export function assessContractGate(input: LeadIntentGateInput): ContractGateResult {
  const approvalRequired = requiresContractApproval(input);
  const questions = approvalRequired ? createSemanticClarificationQuestions(input) : [];
  let semanticIntent = input.semanticIntentContract
    ? validateSemanticIntentContract(input.semanticIntentContract)
    : input.semanticIntentContractRef
      ? unresolvedRefIssue("semanticIntentContractRef")
      : { valid: false, issues: [] };
  let digitalTwin = input.digitalTwinChangeContract
    ? validateDigitalTwinChangeContract(input.digitalTwinChangeContract)
    : input.digitalTwinChangeContractRef
      ? unresolvedRefIssue("digitalTwinChangeContractRef")
      : { valid: false, issues: [] };

  if (approvalRequired && input.semanticIntentContract && input.digitalTwinChangeContract) {
    const promotionIssues = semanticConsistencyPromotionIssuesForContracts({
      ontologyAffecting: true,
      semanticIntentContract: input.semanticIntentContract,
      digitalTwinChangeContract: input.digitalTwinChangeContract,
      semanticConsistencyResultRef: input.semanticConsistencyResultRef,
      semanticConsistencyResult: input.semanticConsistencyResult,
    });
    if (promotionIssues.length > 0) {
      semanticIntent = contractValidationResult([
        ...semanticIntent.issues,
        ...promotionIssues,
      ]);
      digitalTwin = contractValidationResult([
        ...digitalTwin.issues,
        ...promotionIssues.map((issue) => ({
          ...issue,
          field: `semanticConsistencyPromotion.${issue.field}`,
        })),
      ]);
    }
  }

  if (!approvalRequired) {
    return {
      status: "not_required",
      allowsRouting: true,
      reason:
        "Task is not approval-gated ontology-affecting execution; ambient contract capture is still recommended.",
      contractPolicy: "ambient",
      riskClass: isOntologyAffectingIntent(input) ? "semantic" : "low",
      requiredContracts: [],
      recommendedContracts: [...CONTRACT_NAMES],
      questions: [],
      semanticIntent,
      digitalTwin,
    };
  }

  if (!refsSatisfyRequirement(input) && !(input.semanticIntentContract && input.digitalTwinChangeContract)) {
    return {
      status: "contract_required",
      allowsRouting: false,
      reason:
        "Ontology-affecting execution requires approved SemanticIntentContract and DigitalTwinChangeContract refs before dispatch.",
      contractPolicy: "approval-required",
      riskClass: "digital-twin",
      requiredContracts: [...CONTRACT_NAMES],
      recommendedContracts: [...CONTRACT_NAMES],
      questions,
      semanticIntent,
      digitalTwin,
    };
  }

  if (!semanticIntent.valid || !digitalTwin.valid) {
    return {
      status: "blocked_for_clarification",
      allowsRouting: false,
      reason:
        "Contract refs or inline contracts were supplied, but material clarification or Digital Twin risks remain unresolved.",
      contractPolicy: "approval-required",
      riskClass: "digital-twin",
      requiredContracts: [...CONTRACT_NAMES],
      recommendedContracts: [...CONTRACT_NAMES],
      questions,
      semanticIntent,
      digitalTwin,
    };
  }

  return {
    status: "pass",
    allowsRouting: true,
    reason: "Approved semantic and Digital Twin contract boundary present.",
    contractPolicy: "approval-required",
    riskClass: "digital-twin",
    requiredContracts: [...CONTRACT_NAMES],
    recommendedContracts: [...CONTRACT_NAMES],
    questions: [],
    semanticIntent,
    digitalTwin,
  };
}

function makeContractId(prefix: string, intent: string): string {
  const slug = intent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "intent";
  return `${prefix}:${slug}`;
}

export function draftSemanticIntentContract(input: LeadIntentGateInput): SemanticIntentContract {
  const approvalRequired = requiresContractApproval(input);
  const questions = approvalRequired ? createSemanticClarificationQuestions(input) : [];
  return {
    contractId: makeContractId("semantic-intent", input.intent),
    status: "draft",
    rawIntent: input.intent,
    confirmedIntent: "",
    nonGoals: [],
    approvedNouns: [],
    approvedVerbs: [],
    affectedSurfaces: input.scopePaths ?? [],
    permissionsAndProposal: "",
    acceptedRisks: [],
    downstreamAllowed: [],
    downstreamForbidden: approvalRequired
      ? [
          "Do not dispatch implementation until this contract is approved.",
          "Do not treat Lead inference as user-approved meaning.",
        ]
      : [
          "Do not treat this ambient draft as user-approved meaning.",
          "Do not expand implementation scope from this draft without approval.",
        ],
    clarificationQuestions: questions,
  };
}

export function draftDigitalTwinChangeContract(
  input: LeadIntentGateInput,
  semanticIntentContractRef: string,
): DigitalTwinChangeContract {
  const approvalRequired = requiresContractApproval(input);
  return {
    contractId: makeContractId("digital-twin-change", input.intent),
    status: "draft",
    semanticIntentContractRef,
    affectedSurfaces: input.scopePaths ?? [],
    changeBoundary: approvalRequired
      ? ""
      : "Ambient prompt capture only; no Digital Twin mutation boundary is approved.",
    branchProposalPolicy: approvalRequired
      ? ""
      : "No branch or proposal is approved by this ambient draft.",
    permissionBoundary: approvalRequired
      ? ""
      : "No permission boundary changes are approved by this ambient draft.",
    replayMigrationPlan: approvalRequired
      ? ""
      : "No replay, backfill, or migration work is approved by this ambient draft.",
    observabilityPlan: approvalRequired
      ? ""
      : "Retain as semantic lineage evidence for future routing; do not treat as execution proof.",
    toolSurfaceReadiness: approvalRequired
      ? ""
      : "No tool-surface readiness claim is made by this ambient draft.",
    evaluationPlan: approvalRequired
      ? ""
      : "No execution evaluation is required until this prompt becomes approval-gated work.",
    risks: approvalRequired
      ? [
          {
            riskId: "risk.branch-proposal",
            kind: "branch-proposal",
            status: "open",
            description: "Branch/proposal boundary is not approved.",
          },
          {
            riskId: "risk.replay-migration",
            kind: "replay-migration",
            status: "open",
            description: "Replay, backfill, and migration impact are not classified.",
          },
          {
            riskId: "risk.tool-surface",
            kind: "tool-surface",
            status: "open",
            description: "Tool support and degraded execution path are not classified.",
          },
          {
            riskId: "risk.evaluation",
            kind: "evaluation",
            status: "open",
            description: "Evaluator criteria are not tied to the approved meaning.",
          },
        ]
      : [
          {
            riskId: "risk.ambient-capture",
            kind: "evaluation",
            status: "not-applicable",
            description:
              "Ambient prompt capture records future semantic evidence without approving runtime change.",
          },
        ],
  };
}
