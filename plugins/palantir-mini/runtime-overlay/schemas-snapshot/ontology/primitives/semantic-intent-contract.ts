/**
 * @stable — SemanticIntentContract primitive (prim-learn-25, v1.62.0)
 *
 * User-approved meaning contract for Prompt-to-DTC routing. Legacy string
 * fields remain for conversation compatibility; typed refs are additive.
 *
 * v1.62.0 — additive fields: seedRid (links to proto-seed), fillSequence
 * (8-turn fill steps), verdict (fill progress), gradeRubricRid (links to
 * canonical rubric). Enables PR 5.10 (8-turn fill) + PR 5.13 (SIC grader).
 * Per canonical plan v2 §4 row 5.9.
 *
 * @owner palantirkc-ontology
 * @purpose User-approved semantic routing boundary for ontology-affecting work
 */

import type { ApprovalRef } from "./approval-ref";
import type {
  ActionTypeRef,
  FunctionRef,
  LinkTypeRef,
  ObjectTypeRef,
  ProjectLaneRef,
  ProjectSurfaceRef,
} from "./ontology-engineering-ref";
import type { OntologyContextSeedRid } from "./ontology-context-seed";
import type { GradingRubricRid } from "./grading-rubric";

export const SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION =
  "prompt-dtc/semantic-intent-contract/v2";

export type SemanticIntentContractStatus = "draft" | "approved" | "superseded";

/**
 * Source of a single fill step in the 8-turn SIC fill sequence (PR 5.10).
 *   user   — field value supplied or confirmed by the human user.
 *   agent  — field value inferred by the routing agent (pm_intent_router / pm_lead_brief).
 *   system — field value set automatically by a hook or gate.
 */
export type SicFillSource = "user" | "agent" | "system";

/**
 * One step in the SIC fill sequence.
 * Each step corresponds to one clarification question answered or one
 * structural field populated during the 8-turn fill workflow (PR 5.10).
 */
export interface SicFillStep {
  /** 1-based ordinal within the fill sequence. */
  readonly step: number;
  /** The clarification question or field label prompted to the user/agent. */
  readonly question?: string;
  /** The accepted answer or inferred value. */
  readonly answer?: string;
  /** ISO8601 timestamp when this step was completed. */
  readonly filledAt: string;
  /** Who or what provided the answer for this step. */
  readonly source: SicFillSource;
}
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

export interface SemanticClarificationQuestion {
  readonly questionId: string;
  readonly ambiguityType?: SemanticClarificationAmbiguityType;
  readonly materiality: ClarificationMateriality;
  readonly prompt: string;
  readonly recommendedAnswer: string;
  readonly whyItMatters: string;
  readonly plainLanguageExplanation?: string;
  readonly palantirArchitectureMapping?: {
    readonly operationalMeaning: string;
    readonly platformTerm: PalantirArchitectureTerm;
  };
  readonly whatWillNotHappen?: readonly string[];
  readonly requiresUserApproval: boolean;
  readonly answer?: {
    readonly value: string;
    readonly acceptedRecommendation: boolean;
    readonly capturedAt: string;
    readonly userApprovalRef: string;
  };
  readonly status: SemanticClarificationStatus;
}

/**
 * The 9 semantic-intent axes (palantir-mini understand-phase heart).
 * DATA/LOGIC/ACTION/GOVERNANCE derive from the Palantir Ontology decision model;
 * CONTEXT/SUCCESS-EVAL/CONSTRAINTS-NONGOALS/ACTORS/MEMORY-PRIOR surface implicit intent.
 */
export type SicAxisKey =
  | "data"
  | "logic"
  | "action"
  | "governance"
  | "context"
  | "successEval"
  | "constraintsNonGoals"
  | "actors"
  | "memoryPrior";

export type SicAxisStatus = "open" | "filled" | "not-applicable";

/** One surfaced axis of user intent. */
export interface SicAxis {
  /** Plain-language answer (non-developer friendly). */
  readonly summary: string;
  /** Evidence / typed refs captured for this axis. */
  readonly refs: readonly string[];
  readonly status: SicAxisStatus;
}

/** The full 9-axis SemanticIntentContract surface (understand-phase output). */
export interface SemanticIntentAxes {
  readonly data: SicAxis;
  readonly logic: SicAxis;
  readonly action: SicAxis;
  readonly governance: SicAxis;
  readonly context: SicAxis;
  readonly successEval: SicAxis;
  readonly constraintsNonGoals: SicAxis;
  readonly actors: SicAxis;
  readonly memoryPrior: SicAxis;
}

export interface SemanticIntentContract {
  readonly schemaVersion: typeof SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION;
  readonly contractId: string;
  readonly status: SemanticIntentContractStatus;
  readonly rawIntent: string;
  readonly confirmedIntent: string;

  /** Backward-compatible conversation fields. */
  /** @deprecated superseded by approvedObjectTypeRefs; migration pending */
  readonly approvedNouns: readonly string[];
  /** @deprecated superseded by approvedActionTypeRefs; migration pending */
  readonly approvedVerbs: readonly string[];
  /** @deprecated superseded by approvedSurfaceRefs; migration pending */
  readonly affectedSurfaces: readonly string[];

  /** Additive typed ref graph fields. */
  readonly approvedObjectTypeRefs?: readonly ObjectTypeRef[];
  readonly approvedActionTypeRefs?: readonly ActionTypeRef[];
  readonly approvedFunctionRefs?: readonly FunctionRef[];
  readonly approvedLinkTypeRefs?: readonly LinkTypeRef[];
  readonly approvedSurfaceRefs?: readonly ProjectSurfaceRef[];
  readonly approvedLaneRefs?: readonly ProjectLaneRef[];

  /** @deprecated superseded by axes.constraintsNonGoals; migration pending */
  readonly nonGoals: readonly string[];
  readonly downstreamAllowed: readonly string[];
  readonly downstreamForbidden: readonly string[];
  readonly clarificationQuestions: readonly SemanticClarificationQuestion[];
  readonly approvalRef?: ApprovalRef;

  // --- v1.62.0 additive fields (canonical plan v2 §4 row 5.9) ---

  /**
   * Links this SIC to its proto-seed (OntologyContextSeedDeclaration.seedId).
   * Populated when the contract was produced from an ontology_context_query
   * result rather than a raw prompt.
   */
  readonly seedRid?: OntologyContextSeedRid;

  /**
   * 8-turn fill sequence steps.
   * Populated progressively during the fill workflow (PR 5.10).
   * Empty or absent = contract is in initial draft state (not yet filled).
   */
  readonly fillSequence?: readonly SicFillStep[];

  /**
   * Fill / approval verdict.
   *   draft    — initial; no fill steps completed.
   *   filled   — all clarification questions answered; awaiting approval.
   *   approved — user/lead approved; contract is authoritative.
   *   rejected — rejected during fill review or gate check.
   *
   * NOTE: "approved" here is distinct from `status === "approved"`.
   * `verdict` tracks the fill workflow outcome; `status` tracks the contract
   * lifecycle (draft / approved / superseded).
   *
   * @deprecated use fillVerdict
   */
  readonly verdict?: "draft" | "filled" | "approved" | "rejected";

  /**
   * Canonical replacement for the `verdict` field. Same fill / approval
   * verdict semantics; renamed to avoid the naming collision with `status`
   * (the contract lifecycle). Additive — readers may continue to consult
   * `verdict` until the migration completes.
   */
  readonly fillVerdict?: "draft" | "filled" | "approved" | "rejected";

  /**
   * RID of the GradingRubric used to evaluate this SIC during the fill
   * grader pass (PR 5.13). Links to the canonical rubric registered in
   * GRADING_RUBRIC_REGISTRY.
   */
  readonly gradeRubricRid?: GradingRubricRid;

  /**
   * 9-axis understand-phase surface (DATA/LOGIC/ACTION/GOVERNANCE + CONTEXT/
   * SUCCESS-EVAL/CONSTRAINTS-NONGOALS/ACTORS/MEMORY-PRIOR). Additive; absent =
   * pre-9-axis contract. Populated by the nine-axis-sic fill policy (harness redesign W2).
   */
  readonly axes?: SemanticIntentAxes;
}

export function isSemanticIntentContract(x: unknown): x is SemanticIntentContract {
  if (typeof x !== "object" || x === null) return false;
  const contract = x as SemanticIntentContract;
  return (
    contract.schemaVersion === SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION &&
    typeof contract.contractId === "string" &&
    contract.contractId.length > 0 &&
    (contract.status === "draft" ||
      contract.status === "approved" ||
      contract.status === "superseded") &&
    typeof contract.confirmedIntent === "string" &&
    Array.isArray(contract.approvedNouns) &&
    Array.isArray(contract.approvedVerbs) &&
    Array.isArray(contract.affectedSurfaces)
  );
}

// --- Foundry equivalence (Prompt-to-DTC semantic contract) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "User-approved semantic intent contract for palantir-mini routing; analogous to pre-action clarification/confirmation, not Foundry data",
};
export { categoryFoundryEquivalent as semanticIntentContractFoundryEquivalent };
