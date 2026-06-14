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
 * v1.84.0 — additive SicAxisStatus member `draft` (session-derived, NOT user-
 * confirmed). Lets the session-derivation path name a proposed-but-unconfirmed
 * axis without overstating confirmation as `filled` (OE-5 / D1-2). Additive +
 * backward-compatible: no existing producer emits `draft`.
 *
 * v1.85.0 — additive optional `SicAxis.facet` (+ the `SicAxisFacet` discriminated
 * union and its five sub-interfaces). The DP-deepening substrate (DP-0): gives an
 * enriched axis a typed home for the structured proposal behind the prose
 * `summary` (data-graph / logic-block / action-writeback / access-boundary), one
 * variant per axis DP enriches. Additive + backward-compatible: no existing
 * producer emits `facet`, `isSemanticIntentContract` does not validate axis
 * internals — zero behavior change. DP-1..DP-4 fill their own variant interiors.
 *
 * v1.89.0 — additive optional `SicAccessBoundary.propertyAccessBoundaries` (+ the
 * `SicPropertyAccessBoundary` sub-interface). The OE-4 govern-fold CAPSTONE: a
 * property-level access-security boundary (`propertyName` + `readableBy`) folded
 * onto the GOVERNANCE access boundary — the SIC-layer projection of the descriptive
 * column-level `CLSPolicy`/`PropertySecurityPolicy` (`ontology/types/types-security.ts`).
 * Lets the DTC/register layer REQUIRE a property access-boundary for a sensitive
 * property (fail-closed, not advisory). Additive + backward-compatible: optional,
 * absent on every legacy producer; `isSemanticIntentContract` does not validate it.
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
import type { TurnCardDecisionSpec } from "./turn-card-decision-spec";

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
  /**
   * Runtime-neutral decision contract for this clarification turn (additive).
   * When present, a Codex/Claude adapter renders it as ordinary assistant text
   * and records the user's answer as a UserDecisionRecord. Optional — pre-
   * consolidation clarifications carry only `prompt` + `recommendedAnswer`.
   */
  readonly decisionSpec?: TurnCardDecisionSpec;
  /**
   * The value applied if the user accepts the recommendation as-is (additive).
   * Optional — absent for clarifications that require an explicit answer.
   */
  readonly defaultIfUserAcceptsRecommendation?: string;
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

/**
 * The confirmation ladder for one of the nine semantic-intent axes:
 *   "open"            — no signal at all; nothing proposed.
 *   "draft"           — a session-derived PROPOSAL exists (summary + refs
 *                       populated) but is NOT user-confirmed. Carries signal for
 *                       review; does NOT count toward readiness; does NOT count
 *                       as confirmation. Minted only by the session-derivation
 *                       path (createSemanticIntentContractDraftFromFDEOntologySession).
 *   "filled"          — a per-axis USER turn confirmed it. Minted ONLY by the
 *                       9-axis turn engine (advanceNineAxisSicSequence).
 *   "not-applicable"  — the USER explicitly waived it via a turn. Minted ONLY by
 *                       the turn engine / runner.
 */
export type SicAxisStatus = "open" | "draft" | "filled" | "not-applicable";

// --- v1.85.0 (DP-0) typed-facet substrate -----------------------------------
// One typed facet shape per axis the DP-deepening increment enriches. Each is
// the machine-typed projection of the same proposal the prose `summary` answers,
// so the DTC synthesis can bind to structure instead of re-parsing `summary`.
// DP-0 lands the union skeleton (the `SicAxis.facet` field + the four variant
// tags + these five interface declarations); DP-1..DP-4 fill / extend their own
// variant interiors. Additive; absent on every legacy producer and fixture.

/**
 * DATA axis (DP-1): one Palantir noun-graph object — a semantic ObjectType with
 * its folded properties and the evidence refs that proposed it.
 */
export interface SicDataObject {
  readonly name: string;
  readonly properties: readonly { readonly name: string; readonly dataType?: string }[];
  readonly refs: readonly string[];
}

/**
 * DATA axis (DP-1): one Palantir noun-graph link between two `SicDataObject`s.
 * `endpointsResolved` is true only when BOTH endpoints appear in the facet's
 * `objects` (an unresolved endpoint is confirmation debt, not a silent link).
 */
export interface SicDataLink {
  readonly name: string;
  /** plainName of an SicDataObject. */
  readonly sourceObject: string;
  /** plainName of an SicDataObject. */
  readonly targetObject: string;
  readonly businessMeaning: string;
  /** Both endpoints present in `objects`. */
  readonly endpointsResolved: boolean;
}

/**
 * LOGIC axis (DP-2): one AIP-Logic function. `evaluatorKind` distinguishes a
 * pure evaluator (persists nothing) from one that writes back ONLY through an
 * ActionType. `invokingActorScope` records whose GOVERNANCE scope the function's
 * tool calls inherit — the model cannot widen it.
 */
export interface SicLogicFunction {
  readonly name: string;
  readonly evaluatorKind: "pure-evaluator" | "routes-through-apply-action" | "unspecified";
  /** plainName of the actor/role whose permissions the tool calls inherit. */
  readonly invokingActorScope?: string;
  readonly refs: readonly string[];
}

/**
 * ACTION axis (DP-3): one write-back ActionType, carrying its writeback risk and
 * the per-action submission criteria (the "done/correct" gate for THIS action).
 */
export interface SicWritebackAction {
  readonly name: string;
  readonly writebackRisk: "none" | "low" | "medium" | "high";
  /** The "done/correct" gate for THIS action. */
  readonly submissionCriteria: readonly string[];
  readonly refs: readonly string[];
}

/**
 * GOVERNANCE axis (DP-4, govern-fold): the access-security boundary folded INTO
 * GOVERNANCE (Security is the GOVERNANCE access-control facet, NOT a 10th axis
 * and NOT a `DigitalTwinDecisionDomain` member). The literal `failClosed: true`
 * makes the type itself carry the fail-closed contract — an access boundary can
 * never be constructed default-open; a surface not in `accessibleSurfaces` is
 * denied, and an unresolved `toolScope` is confirmation debt, never a grant.
 */
export interface SicAccessBoundary {
  /** Marking-/purpose-/role policy summary the GOVERNANCE turn confirms. */
  readonly policyMarkings: readonly string[];
  /** Which surfaces the actor may touch — data/logic/action/tools/memory/logs. */
  readonly accessibleSurfaces: readonly ("data" | "logic" | "action" | "tools" | "memory" | "logs")[];
  /** Per-tool invoking-actor scope inherited from LOGIC (DP-2); resolved=false ⇒ confirmation debt, never a grant. */
  readonly toolScopes: readonly { readonly toolName: string; readonly actorScope: string; readonly resolved: boolean }[];
  /**
   * OE-4 govern-fold CAPSTONE: per-property column-level access-security
   * (the SIC-layer projection of the descriptive `CLSPolicy`/`PropertySecurityPolicy`).
   * The DTC/register layer REQUIRES an entry here for a sensitive property
   * (fail-closed, not advisory) — a GOVERNANCE access boundary missing the property
   * access-boundary for that property REFUSES the DTC/register. Optional + additive:
   * absent on every legacy producer; empty when the session carries no property
   * access-security signal (the ingest-widening tranche fills it from source).
   */
  readonly propertyAccessBoundaries?: readonly SicPropertyAccessBoundary[];
  /** Default-deny: surfaces NOT in accessibleSurfaces are denied. */
  readonly failClosed: true;
}

/**
 * OE-4 govern-fold (capstone): one property's column-level access-security boundary
 * folded onto the GOVERNANCE access boundary — who may READ a sensitive property.
 * Projects the descriptive `CLSPolicy.readableBy` (`ontology/types/types-security.ts`)
 * into the GOVERNANCE decision so Security lives, fail-closed, INSIDE GOVERNANCE
 * (NOT a 10th axis, NOT a `DigitalTwinDecisionDomain` member).
 */
export interface SicPropertyAccessBoundary {
  /** plainName of the property this column-level boundary guards (e.g. "score"). */
  readonly propertyName: string;
  /** The roles/principals permitted to READ the property; an empty list is fail-closed (no reader). */
  readonly readableBy: readonly string[];
}

/**
 * The typed projection of an enriched axis proposal — one variant per axis the
 * DP-deepening increment enriches (DATA / LOGIC / ACTION / GOVERNANCE). Other
 * axes carry no `facet`.
 */
export type SicAxisFacet =
  | { readonly kind: "data-graph"; readonly objects: readonly SicDataObject[]; readonly links: readonly SicDataLink[] }
  | { readonly kind: "logic-block"; readonly functions: readonly SicLogicFunction[] }
  | { readonly kind: "action-writeback"; readonly actions: readonly SicWritebackAction[] }
  | { readonly kind: "access-boundary"; readonly accessBoundary: SicAccessBoundary };

/** One surfaced axis of user intent. */
export interface SicAxis {
  /** Plain-language answer (non-developer friendly). */
  readonly summary: string;
  /** Evidence / typed refs captured for this axis. */
  readonly refs: readonly string[];
  readonly status: SicAxisStatus;
  /**
   * Optional typed facet carrying the structured proposal behind `summary`
   * (additive; absent on every legacy producer and fixture). `summary` stays the
   * user-facing prose answer; `facet` is the optional machine-typed projection of
   * the same proposal (one variant per enriched axis), which the DTC synthesis
   * can bind to instead of re-parsing `summary`. See `SicAxisFacet`.
   */
  readonly facet?: SicAxisFacet;
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
