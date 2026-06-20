// palantir-mini — MCP tool handler: pm_semantic_intent_gate.
//
// Runtime-side entrypoint for the Lead Intent -> Digital Twin contract gate.
// FDEOntologyEngineeringSession owns first-pass meaning discovery; this handler
// records the user-approved boundary as SIC and derives DTC only from approved
// SIC + FDE/context-engineering evidence. Durable schema promotion remains in
// later waves.
/**
 * @palantirSurface
 * schemaVersion: palantir-mini/aip-fde-local-surface/v1
 * surfaceKind: mcp-tool
 * surfaceId: mcp:pm_semantic_intent_gate
 * workflowFamily: semanticIntentAndRouting
 * phaseRefs:
 *   - semantic-routing:prompt-contract
 *   - semantic-routing:dtc-readiness
 * aipSurfaceRefs:
 *   - tools-function
 *   - tools-request-clarification
 *   - application-state-variables
 *   - security-governance
 * palantirSourceAuthorityRefs:
 *   - localResearchPath: ~/.claude/research/palantir-official/foundry/chatbot-studio/tools.md
 *     externalUrl: https://www.palantir.com/docs/foundry/chatbot-studio/tools/
 *     lastVerified: 2026-05-24
 *     sourceClass: palantir-chatbot-studio
 * requiredContracts:
 *   semanticIntent: optional
 *   digitalTwinChange: optional
 *   workContract: optional
 *   userDecisionRecord: optional
 * mutationCapability: proposal-only
 * deterministicStatus: enforced
 * runtimeProjection:
 *   claude:
 *     support: native
 *     evidenceRefs:
 *       - bridge/handlers/pm-semantic-intent-gate.ts
 *     fallbackObligations: []
 *     unsupportedSurfaceRefs: []
 *     smokeEvidenceRefs: []
 *   codex:
 *     support: adapter-native
 *     evidenceRefs:
 *       - bridge/handlers/pm-semantic-intent-gate.ts
 *       - docs/RUNTIME_LAYER_BOUNDARY.md
 *     fallbackObligations:
 *       - State prompt-front-door envelope dereference gaps instead of inventing approved refs.
 *     unsupportedSurfaceRefs:
 *       - codex:prompt-front-door-envelope-dereference
 *     smokeEvidenceRefs: []
 * outputStateRefs:
 *   - workflowContract
 *   - semanticIntentContractRef
 *   - digitalTwinChangeContractRef
 * validationRefs:
 *   - tests/bridge/handlers/pm-semantic-intent-gate.test.ts
 *   - tests/evals/prompt-to-dtc-regression.test.ts
 * unsupportedParityClaimsForbidden: true
 */

import { emit } from "../../scripts/log";
import * as path from "node:path";
import * as fs from "node:fs";
import { boundedReturn } from "../../lib/bounded-return";
import {
  resolveOverflowRoot,
  makeOverflowFileSink,
} from "../../lib/bounded-return/overflow-file-sink";
import {
  transitionOntologyWorkflowTrace,
  type OntologyWorkflowTrace,
} from "../../lib/ontology-workflow-trace/emit";
import {
  assessContractGate,
  assessOntologyDtcBuildReadinessGate,
  draftDigitalTwinChangeContract,
  draftSemanticIntentContract,
  hasApprovalRef,
  isOntologyAffectingIntent,
  isReadOnlyIntent,
  requiresContractApproval,
  validateDigitalTwinChangeContract,
  validateSemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import type {
  ContractGateResult,
  ContractValidationResult,
  DigitalTwinChangeContract,
  DigitalTwinRiskRecord,
  OntologyDtcBuildReadinessGate,
  SemanticClarificationQuestion,
  SemanticIntentContract,
  TurnCardDecisionSpec,
} from "../../lib/lead-intent/contracts";
import {
  verifyDtcBuildApprovalAgainstEnvelope,
  type VerifyDtcBuildApprovalResult,
} from "../../lib/lead-intent/dtc-build-approval";
import { deriveRegisteredOntologyRids } from "../../lib/lead-intent/registered-ontology-rids";
import type { BuildRecipeInput } from "../../lib/delegation-recipe/recipe-builder";
import {
  PromptFrontDoorStore,
  isPromptRuntime,
  transitionPromptEnvelope,
  validatePromptContinuity,
  withPromptState,
} from "../../lib/prompt-front-door";
import type {
  PromptContractRefs,
  PromptEnvelope,
  PromptRuntime,
} from "../../lib/prompt-front-door";
import {
  attachContractRefsToCapsule,
  attachSemanticConversationStateToCapsule,
} from "../../lib/context/context-capsule";
import {
  buildSemanticConversationState,
  type SemanticConversationState,
} from "../../lib/chatbot-studio/semantic-conversation-state";
import { pinApplicationStateForReasoningLoop } from "../../lib/chatbot-studio/application-state";
import {
  buildLayer0IntentBridge,
  type Layer0IntentBridge,
} from "../../lib/context-engineering/intent-bridge";
import {
  gradeLayer0Readiness,
  validateClarificationGuardRails,
  type ClarificationGuardResult,
  type Layer0ReadinessGrade,
} from "../../lib/context-engineering/clarification-guards";
import {
  deriveOntologyActivation,
  type OntologyActivation,
} from "../../lib/context-engineering/ontology-activation";
import {
  readCurrentUniversalOntologyEntry,
} from "../../lib/ontology-entry/entry-store";
import { transitionUniversalOntologyEntry } from "../../lib/ontology-entry/lifecycle";
import {
  EIGHT_TURN_FILL_SEQUENCE,
  advanceFillSequence,
  isFillComplete,
  type SicWithFillFields,
} from "../../lib/semantic-intent/fill-sequence";
import { isApprovedSemanticIntentContract } from "../../lib/semantic-intent/approved-contract";
import type { FillPolicy } from "../../lib/semantic-intent/fill-policy";
import { FDE_FILL_SEQUENCE, advanceFDEFillSequence } from "../../lib/semantic-intent/fde-fill-sequence";
import {
  NINE_AXIS_SIC_SEQUENCE,
  advanceNineAxisSicSequence,
  nineAxisSicReadinessIssues,
} from "../../lib/semantic-intent/nine-axis-sic-fill-sequence";
import type {
  SicAxis,
  SemanticIntentAxes,
} from "#schemas/ontology/primitives/semantic-intent-contract";
import {
  nineAxisTurnCard,
  type NineAxisProposedDraft,
} from "../../lib/semantic-intent/nine-axis-understand-session";
import {
  CONTEXT_ENGINEERING_TO_SIC_SEQUENCE,
  advanceContextEngineeringToSicSequence,
  isContextEngineeringToSicReady,
} from "../../lib/semantic-intent/context-engineering-sic-fill-sequence";
import { DTC_FILL_SEQUENCE } from "../../lib/semantic-intent/fill-sequence";
import { advanceDTCFillSequence, type DtcWithFillFields } from "../../lib/semantic-intent/dtc-fill-sequence";
import {
  ONTOLOGY_DTC_BUILD_SEQUENCE,
  advanceOntologyDTCBuildSequence,
  type SicTypedRefDefaults,
} from "../../lib/semantic-intent/ontology-dtc-build-sequence";
import { readCurrentFDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/session-store";
// P4 (Slice B) — consuming-layer mutation lane. The single global `mutationAuthorized`
// boolean answers ONLY the 9-axis promotion question; the SSoT defines seven named modes
// (read-only … armed-side-effect). `deriveMutationAuthorizationByMode` fans that single
// gate into the per-mode predicate so a declared `consumer-data-write`/`proposal-only`
// effort is not forced through the promotion gate. Surfacing the per-mode verdict is
// PURELY ADDITIVE: the legacy `mutationAuthorized` boolean stays bound to the promotion
// lane and is never widened (see DEFAULT_MUTATION_MODE = "builder-structure-write").
import {
  DEFAULT_MUTATION_MODE,
  deriveMutationAuthorizationByMode,
  type MutationMode,
  type MutationAuthorization,
  type MutationModeState,
} from "../../lib/ontology-engineering-workflow";
import { buildContextEngineeringPlanV2 } from "../../lib/context-engineering/context-plan-builder";
import { draftDtcFromContextPlanV2 } from "../../lib/context-engineering/dtc-from-context-plan";
import {
  assertDtcApprovalCardTextBeforeDisplay,
} from "../../lib/ontology-engineering-response-template";
import { assessSemanticConsistencyPromotionGate } from "../../lib/semantic-consistency/promotion-gate";
import { resolveSemanticConsistency } from "../../lib/semantic-consistency/resolver";
import type {
  SemanticConsistencyResolverInput,
  SemanticConsistencyResolverOutput,
} from "../../lib/semantic-consistency/types";

export interface SemanticIntentGateInput {
  /** Absolute project path. Required for event routing. */
  project: string;
  /** User-authored or Lead-captured intent before implementation. */
  rawIntent: string;
  /** Scope paths expected to be touched by downstream work. */
  scopePaths?: string[];
  /** Complexity hint used by the same gate as pm_intent_router. */
  complexityHint?: BuildRecipeInput["complexityHint"];
  /** Approved SemanticIntentContract RID/ref. */
  semanticIntentContractRef?: string;
  /** Approved DigitalTwinChangeContract RID/ref. */
  digitalTwinChangeContractRef?: string;
  /** Optional inline semantic contract for pre-persistence validation. */
  semanticIntentContract?: SemanticIntentContract;
  /** Optional inline Digital Twin contract for pre-persistence validation. */
  digitalTwinChangeContract?: DigitalTwinChangeContract;
  /** Prompt-front-door identity captured by UserPromptSubmit. */
  promptId?: string;
  /** Expected prompt hash for continuity validation. */
  promptHash?: string;
  /** Runtime session that owns the prompt envelope. */
  sessionId?: string;
  /** Runtime that captured the prompt envelope. */
  runtime?: PromptRuntime;
  /** FDE Ontology Engineering session provenance required for workflow-control-plane changes. */
  fdeOntologyEngineeringSessionRef?: string;
  /**
   * Improvement #3 (ADDITIVE) — verifiable user-approval envelope pointer that can
   * authorize DTC-build router dispatch in lieu of a dereferenced WorkContract +
   * RouterBinding. These are model-CLAIMED pointers; the handler re-verifies them
   * fail-closed against the hook-captured PromptEnvelope via
   * `verifyDtcBuildApprovalAgainstEnvelope` before passing the resulting boolean to
   * the gate. Absence ⇒ byte-identical legacy behavior. promptId/promptHash default
   * to the continuity `promptId`/`promptHash` above when omitted; sessionId/runtime
   * reuse `sessionId`/`runtime`.
   */
  userApprovalPromptId?: string;
  userApprovalPromptHash?: string;
  userApprovalQuote?: string;
  /** Legacy alias for draftMode="required-only" callers that still need pass-through drafts. */
  includeDrafts?: boolean;
  /** Draft emission policy. Default: "always" for prompt-level semantic memory. */
  draftMode?: "always" | "required-only" | "never";
  /** User-facing contract authoring mode. Machine mode preserves the existing JSON-first result. */
  interactionMode?: "machine" | "human_collaborative";
  /** Plain-language depth for user-facing review cards. */
  userExpertise?: "non_programmer" | "technical" | "developer";
  /** User-facing review-card language. Defaults to Korean for this fleet. */
  preferredLanguage?: "ko" | "en";
  /**
   * 8-turn fill sequence turn index (0-7, inclusive).
   * When provided, the handler runs advanceFillSequence on the supplied
   * semanticIntentContract (or drafts a new one) and returns the enriched contract.
   * When absent, the handler preserves the existing single-shot SIC creation behavior.
   */
  turn?: number;
  /**
   * Free-text user answer for the current fill turn.
   * Only meaningful when `turn` is provided. Records source = "user".
   */
  turnUserInput?: string;
  /**
   * OE-14 / D1-5 — mark the CURRENT nine-axis turn's axis `not-applicable` via the
   * MCP gate (previously N/A was unreachable through this turn API — only
   * `advanceNineAxisSicSequence`'s filled/open states were). When true on the
   * nine-axis-sic branch, the axis is stamped `status:"not-applicable"` as the USER's
   * explicit waiver (source = "user", mirroring `answerCard`'s N/A path), so a waived
   * axis is Q2-confirmable and `isNineAxisSicComplete` can reach true. Ignored on the
   * intent turn (T0) and on the legacy / context-engineering / fde / dtc branches.
   */
  turnNotApplicable?: boolean;
  /**
   * OPTIONAL — fill sequence policy. Absence (default) preserves legacy
   * T0-T7 EIGHT_TURN_FILL_SEQUENCE behavior byte-identically. When set to
   * "fde-ontology-build", the handler routes the turn to FDE_FILL_SEQUENCE
   * (9-step) and populates fdeFillResult on the result instead of fillResult.
   */
  readonly fillPolicy?: FillPolicy;
  /**
   * Optional deterministic semantic consistency resolver input. When provided,
   * the handler resolves source-system terms before projecting Chatbot/Application
   * State and returns the resolver run evidence without using an LLM.
   */
  readonly semanticConsistencyResolverInput?: SemanticConsistencyResolverInput;
  /**
   * OPTIONAL — Lead-proposed plain-language draft answer for the CURRENT nine-axis
   * turn. Only meaningful on the nine-axis-sic branch when `turn` is supplied. When
   * present, fillResult.turnCard renders a recommended "confirm this proposal" choice
   * FIRST so the user confirms/corrects rather than facing a blank box. The draft is a
   * proposal — recording it as the answer still requires an explicit user confirmation
   * turn (source = "user"); it never auto-fills the axis.
   */
  readonly proposedAxisDraft?: NineAxisProposedDraft;
  /**
   * P3 — response shaping. 'turn' (default): fillResult + active card + blocked count inline,
   * heavy readiness bodies + full semanticConversationState relocated to overflow.fullPath.
   * 'readiness': full diagnostics inline (ontologyDtcBuildReadinessGate + semanticConversationState).
   * Gate SEMANTICS are identical across views — only payload shape differs. The
   * `render-readiness-diagnostics` next-action remains the SIGNAL that the full block is
   * worth fetching; the handler does NOT auto-flip the view (re-call with 'readiness' or
   * read overflow.fullPath).
   */
  readonly responseView?: "turn" | "readiness";
}

/**
 * P4 (Slice B) — INTERNAL mutation-mode declaration read off the gate input WITHOUT
 * widening the public `SemanticIntentGateInput` surface (the MCP `additionalProperties:
 * false` schema + its parity test own that surface; this slice is the single writer of THIS
 * file only). The handler already accepts `rawArgs` untyped, so when a caller passes these
 * keys they survive at runtime; `buildWorkflowContractProjection` recovers them through a
 * localized cast to this interface. Absence ⇒ `builder-structure-write` (default), under
 * which the projection stays byte-identical to pre-change.
 */
interface SemanticIntentGateMutationModeInput {
  /** Declared SSoT mutation mode; absent ⇒ DEFAULT_MUTATION_MODE (builder-structure-write). */
  readonly mutationMode?: MutationMode;
  /** consumer-data-write proof: approved action type (write-set + lineage). */
  readonly consumerActionTypeRef?: string;
  /** consumer-data-write proof: validation verdict for the emitted consumer write. */
  readonly consumerWriteValidated?: boolean;
}

export interface SemanticIntentFillResult {
  /** The turn that was just applied (0-7). */
  appliedTurn: number;
  /** The question that was posed at this turn. */
  question: string;
  /** The contract after this fill step (includes v1.62.0 additive fields). */
  contract: SicWithFillFields;
  /** Whether the fill sequence is now complete (all 8 steps + required fields populated). */
  fillComplete: boolean;
  /** When the fill sequence is complete but fields are missing, lists the advisory. */
  fillIncomplete?: string;
  /** The question for the NEXT turn (undefined when T7 just completed). */
  nextQuestion?: string;
  /**
   * OPTIONAL — the full non-dev turn card for the CURRENT turn (nine-axis-sic branch
   * only). Carries the bilingual question, per-axis "why it matters" + worked example,
   * and the choice set (confirm-proposal / enter / N/A). Any runtime adapter renders
   * the same card. The bare `question`/`nextQuestion` strings above are preserved
   * unchanged for legacy consumers — turnCard is purely additive.
   */
  turnCard?: TurnCardDecisionSpec;
  /**
   * OPTIONAL — the turn card for the NEXT turn, mirroring `nextQuestion`. Undefined
   * when the current turn is the last (T9). Built WITHOUT the proposed draft (the
   * draft applies only to the current turn the user is answering).
   */
  nextTurnCard?: TurnCardDecisionSpec;
}

/**
 * Fill result for the FDE 9-step ontology-build sequence (Slice 5 additive).
 * Present only when fillPolicy === "fde-ontology-build" AND turn is supplied.
 * Mutually exclusive with SemanticIntentFillResult — caller checks both.
 */
export interface FDESemanticIntentFillResult {
  /** The FDE turn that was just applied (0-8). */
  readonly appliedTurn: number;
  /** The FDE question posed at this turn. */
  readonly question: string;
  /** The contract after this FDE fill step. */
  readonly contract: SicWithFillFields;
  /** Whether the FDE fill sequence is now complete (all 9 steps). */
  readonly fillComplete: boolean;
  /** When the FDE fill sequence is complete but fields are missing, lists the advisory. */
  readonly fillIncomplete?: string;
  /** The question for the NEXT FDE turn (undefined when T8 just completed). */
  readonly nextQuestion?: string;
  /** Hard marker: this result came from the FDE 9-step sequence (not the 8-turn). */
  readonly policy: "fde-ontology-build";
}

/**
 * Fill result for deterministic DTC fill sequences.
 * Present only when fillPolicy is "dtc-turn-fill" or "ontology-dtc-build" AND turn is supplied.
 * Mutually exclusive with fillResult / fdeFillResult — caller checks all three.
 * Backward compat: absent fillPolicy or SIC-only fillPolicy → this field never populated.
 */
export interface DtcSemanticIntentFillResult {
  /** The DTC turn that was just applied (0-6). */
  readonly appliedTurn: number;
  /** The DTC question posed at this turn. */
  readonly question: string;
  /** The DTC contract after this fill step (additive DtcWithFillFields extension). */
  readonly contract: DtcWithFillFields;
  /** Whether the DTC fill sequence is now complete (all 7 steps, T6 applied). */
  readonly fillComplete: boolean;
  /** When DTC fill incomplete at T6 but missing fields. */
  readonly fillIncomplete?: string;
  /** The question for the NEXT DTC turn (undefined when T6 just completed). */
  readonly nextQuestion?: string;
  /** Hard marker: this result came from the DTC 7-turn sequence. */
  readonly policy: "dtc-turn-fill" | "ontology-dtc-build";
}

/**
 * P4 — a by-id pointer that replaces a full {@link TurnCardDecisionSpec} body at an emit site.
 * Resolve `decisionRef` against the `decisions{}` map — inline in `readiness` view, or inside the
 * `overflow.fullPath` file in `turn` view. Note: a ref is NOT guaranteed to resolve from the inline
 * `turnCardDecisionQueue` alone — that queue only holds open, approval-requiring decisions, so on an
 * approved-turn view (empty queue) with non-empty `materialAmbiguities` the body lives only in the
 * `decisions{}` map (readiness view / overflow file).
 */
export interface DecisionRef {
  readonly decisionRef: string;
}

/** P4 — the emitted `gate` with `questions[].decisionSpec` projected to a by-id ref. */
export type GateProjection = Omit<ContractGateResult, "questions"> & {
  questions: Array<
    Omit<SemanticClarificationQuestion, "decisionSpec"> & {
      decisionSpec: TurnCardDecisionSpec | DecisionRef;
    }
  >;
};

/** P4 — the emitted `layer0.bridge` with `materialAmbiguities[].decisionSpec` projected to a by-id ref. */
export type Layer0IntentBridgeProjection = Omit<Layer0IntentBridge, "materialAmbiguities"> & {
  materialAmbiguities: ReadonlyArray<
    Omit<SemanticClarificationQuestion, "decisionSpec"> & {
      decisionSpec: TurnCardDecisionSpec | DecisionRef;
    }
  >;
};

/**
 * QFS — a clarificationQuestions array whose per-question `decisionSpec` MAY be projected to a
 * by-id ref (or kept as the full body on the fail-open path). Mirrors the P4 union so the inline
 * fail-open case still type-checks. Used by the SIC fill contract + draft SIC emit projections.
 */
export type ClarificationQuestionsRefProjection = Array<
  Omit<SemanticClarificationQuestion, "decisionSpec"> & {
    decisionSpec: TurnCardDecisionSpec | DecisionRef;
  }
>;

/** QFS — a SIC whose `clarificationQuestions[].decisionSpec` may be ref-projected at emit. */
export type SicContractDecisionRefProjection = Omit<SicWithFillFields, "clarificationQuestions"> & {
  clarificationQuestions: ClarificationQuestionsRefProjection;
};

/** QFS — the emitted `fillResult` with `contract.clarificationQuestions[].decisionSpec` ref-projected. */
export type SemanticIntentFillResultProjection = Omit<SemanticIntentFillResult, "contract"> & {
  contract: SicContractDecisionRefProjection;
};

/** QFS — the emitted `fdeFillResult` with `contract.clarificationQuestions[].decisionSpec` ref-projected. */
export type FDESemanticIntentFillResultProjection = Omit<FDESemanticIntentFillResult, "contract"> & {
  contract: SicContractDecisionRefProjection;
};

/** QFS — the emitted `draftContracts` with `semanticIntent.clarificationQuestions[].decisionSpec` ref-projected. */
export type DraftContractsProjection = {
  semanticIntent: Omit<SemanticIntentContract, "clarificationQuestions"> & {
    clarificationQuestions: ClarificationQuestionsRefProjection;
  };
  digitalTwin: DigitalTwinChangeContract;
};

/**
 * QFS — the INTERNAL draftContracts shape (FULL bodies). The handler-local `draftContracts`
 * and the persistence consumers read this UNPROJECTED form (full `SemanticIntentContract`);
 * the emit boundary builds a {@link DraftContractsProjection} shallow copy from it. Kept
 * separate so widening the EMITTED type never widens the persisted/consumed type.
 */
type DraftContractsInternal = {
  semanticIntent: SemanticIntentContract;
  digitalTwin: DigitalTwinChangeContract;
};

export interface SemanticIntentGateResult {
  status: ContractGateResult["status"];
  allowsRouting: boolean;
  /** P4 — `questions[].decisionSpec` projected to a by-id ref (dereference via `decisions` / queue). */
  gate: GateProjection;
  /** Ontology-DTC dispatch readiness diagnostics. Semantic gate never treats context/tools as authority. */
  ontologyDtcBuildReadinessGate?: OntologyDtcBuildReadinessGate;
  turnCardDecisionQueue: SemanticIntentTurnCardDecision[];
  workflowContract?: SemanticIntentWorkflowContractProjection;
  /** QFS — semanticIntent.clarificationQuestions[].decisionSpec projected to a by-id ref (dereference via `decisions` / queue). */
  draftContracts?: DraftContractsProjection;
  promptEnvelope?: PromptEnvelope;
  contractRefs?: PromptContractRefs;
  promptContinuity?: ContractValidationResult;
  promptEnvelopeLookup: PromptEnvelopeLookup;
  userReviewCard?: SemanticIntentUserReviewCard;
  semanticConversationState?: SemanticConversationState;
  layer0?: {
    /** P4 — `materialAmbiguities[].decisionSpec` projected to a by-id ref. */
    bridge: Layer0IntentBridgeProjection;
    clarificationGuards: ClarificationGuardResult;
    readiness: Layer0ReadinessGrade;
    ontologyActivation?: OntologyActivation;
  };
  /** Present when `turn` was supplied. QFS — contract.clarificationQuestions[].decisionSpec projected to a by-id ref. */
  fillResult?: SemanticIntentFillResultProjection;
  /**
   * Present when fillPolicy === "fde-ontology-build" AND turn supplied.
   * Mutually exclusive with fillResult — caller checks both.
   * QFS — contract.clarificationQuestions[].decisionSpec projected to a by-id ref.
   */
  fdeFillResult?: FDESemanticIntentFillResultProjection;
  /**
   * Present when fillPolicy is "dtc-turn-fill" or "ontology-dtc-build" AND turn supplied.
   * Mutually exclusive with fillResult + fdeFillResult — caller checks all three.
   * Backward compat: absent fillPolicy or SIC-only fillPolicy → undefined.
   */
  dtcFillResult?: DtcSemanticIntentFillResult;
  /** Deterministic resolver output for source-system term consistency, when requested. */
  semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  /**
   * P1 — present (turn view) when heavy invariant bodies were relocated off-inline.
   * Caller re-reads `fullPath` for the full
   * { ontologyDtcBuildReadinessGate, semanticConversationState, decisions, materialAmbiguities }.
   * `digest` = sha256[:16] of the sunk JSON; `contains` lists the relocated keys. Absent in
   * 'readiness' view (bodies inline). FAIL-SAFE: on a sink throw the bodies stay inline and
   * this field is omitted (never errors, never drops).
   */
  overflow?: { fullPath: string; bytes: number; digest: string; contains: string[]; note: string };
  /**
   * P4 — canonical decision-body map keyed by `decisionId`. Present inline ONLY in 'readiness'
   * view (turn view: it rides in the overflow file). Every id-ref elsewhere
   * (workflowContract.turnCards/activeTurnCard, gate.questions[].decisionSpec,
   * layer0.bridge.materialAmbiguities[].decisionSpec) dereferences against this map (or the
   * inline `turnCardDecisionQueue[].decisionSpec`, the single inline body home).
   */
  decisions?: Record<string, TurnCardDecisionSpec>;
}

export type PromptEnvelopeLookupSelectedBy =
  | "input-project"
  | "env-project"
  | "cwd"
  | "home-fallback";

export interface PromptEnvelopeLookup {
  suppliedProject: string;
  selectedPromptFrontDoorRoot: string;
  selectedBy: PromptEnvelopeLookupSelectedBy;
  candidateRootsChecked: string[];
}

export interface SemanticIntentTurnCardDecision {
  questionId: string;
  materiality: SemanticClarificationQuestion["materiality"];
  ambiguityType: SemanticClarificationQuestion["ambiguityType"];
  decisionSpec: TurnCardDecisionSpec;
  whyItMatters: string;
  defaultIfUserAcceptsRecommendation: string;
  whatWillNotHappen: string[];
}

export interface SemanticIntentWorkflowContractProjection {
  workflowContractRef: string;
  runtime: PromptRuntime;
  currentPhase: "semantic-intent" | "digital-twin-change" | "ready-to-route";
  /**
   * P4 — `decisionId` ref of the active (first open blocking) decision; dereference against
   * `result.decisions` (readiness view / overflow file) or `turnCardDecisionQueue[].decisionSpec`
   * (inline body home). Previously the full `TurnCardDecisionSpec` body.
   */
  activeTurnCard?: string;
  /** P4 — `decisionId` refs of open decisions (previously full bodies). Dereference per `activeTurnCard`. */
  turnCards: string[];
  openDecisionIds: string[];
  closedDecisionIds: string[];
  allowedNextActions: string[];
  mutationAuthorized: boolean;
  blockingReason?: string;
  /**
   * P4 (Slice B) — the SSoT mutation mode this projection was evaluated under.
   * `builder-structure-write` (the default) reproduces the legacy promotion gate; any
   * other value selected the lighter lane. ADDITIVE: present only as context; the legacy
   * `mutationAuthorized` boolean above is unchanged and remains the promotion verdict.
   */
  mutationMode?: MutationMode;
  /**
   * P4 (Slice B) — the per-mode authorization verdict from
   * `deriveMutationAuthorizationByMode` (mode / authorized / requires / rationale).
   * ADDITIVE and NEVER widens `mutationAuthorized`: for `builder-structure-write` its
   * `authorized` reflects the promotion gate; for the lighter lanes it answers the lane's
   * OWN predicate so a consuming-layer write is not over-gated.
   */
  mutationAuthorization?: MutationAuthorization;
  ontologyDtcBuildReadiness?: {
    status: OntologyDtcBuildReadinessGate["status"];
    readyForRouter: boolean;
    blockedChecks: string[];
    issueCount: number;
  };
}

type ContractApprovalOption = "approve" | "revise" | "cancel";

export interface UserFacingClarificationChoice {
  label: string;
  consequencePlain: string;
  internalContractPatch?: Record<string, unknown>;
}

export interface UserFacingClarificationCard {
  questionId: string;
  userLevel: NonNullable<SemanticIntentGateInput["userExpertise"]>;
  plainQuestion: string;
  recommendedAnswer: string;
  whyItMatters: string;
  choices: UserFacingClarificationChoice[];
  freeTextAllowed: boolean;
}

export interface UserReviewCardSection {
  title: string;
  plainSummary: string;
  recommendedDirection: string;
  willChange: string[];
  willNotChange: string[];
  risksPlain: string[];
  questions: UserFacingClarificationCard[];
  approvalOptions: ContractApprovalOption[];
}

export interface SemanticIntentUserReviewCard extends UserReviewCardSection {
  semanticIntentCard: UserReviewCardSection;
  digitalTwinBoundaryCard: UserReviewCardSection;
}

/** Best-effort lookup of the most recently opened (non-closed) workflow trace for a project. */
function findLatestOpenTrace(projectRoot: string): OntologyWorkflowTrace | undefined {
  const tracesDir = path.join(projectRoot, ".palantir-mini", "session", "workflow-traces");
  if (!fs.existsSync(tracesDir)) return undefined;
  try {
    const files = fs.readdirSync(tracesDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"));
    let latest: OntologyWorkflowTrace | undefined;
    let latestTime = "";
    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(tracesDir, file), "utf8")) as Record<string, unknown>;
        if (raw.lastEvent === "closed") continue;
        const updatedAt = String(raw.updatedAt ?? raw.createdAt ?? "");
        if (!latest || updatedAt > latestTime) {
          latest = raw as unknown as OntologyWorkflowTrace;
          latestTime = updatedAt;
        }
      } catch { /* skip corrupt file */ }
    }
    return latest;
  } catch {
    return undefined;
  }
}

function buildTurnCardDecisionQueue(
  questions: SemanticClarificationQuestion[],
): SemanticIntentTurnCardDecision[] {
  const materialityRank: Record<SemanticClarificationQuestion["materiality"], number> = {
    blocking: 0,
    important: 1,
    "non-blocking": 2,
  };
  return questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.status === "open" && question.requiresUserApproval)
    .sort(
      (a, b) =>
        materialityRank[a.question.materiality] -
          materialityRank[b.question.materiality] ||
        a.index - b.index,
    )
    .map(({ question }) => ({
      questionId: question.questionId,
      materiality: question.materiality,
      ambiguityType: question.ambiguityType,
      decisionSpec: question.decisionSpec,
      whyItMatters: question.whyItMatters,
      defaultIfUserAcceptsRecommendation: question.defaultIfUserAcceptsRecommendation,
      whatWillNotHappen: question.whatWillNotHappen,
    }));
}

/**
 * P4 — build the canonical `decisions{}` map keyed by `decisionId`. Collects every distinct
 * full {@link TurnCardDecisionSpec} TARGETED BY A `{decisionRef}` so the by-id refs scattered
 * across the result (workflowContract.turnCards, gate.questions[].decisionSpec, layer0
 * materialAmbiguities) all dereference here. `decisionId === questionId` (a deterministic slug).
 * The nine-axis per-turn cards (fillResult.turnCard/nextTurnCard, `nine-axis-sic:T...` keys) are
 * intentionally EXCLUDED: no `{decisionRef}` site points at a nine-axis id, and those cards
 * already ride inline via `fillResult`. This map is the full-body home that rides in the overflow
 * file (turn view) and inline (readiness view); the inline `turnCardDecisionQueue[].decisionSpec`
 * keeps a body reachable without reading the file.
 */
function buildDecisionsMap(
  questions: readonly SemanticClarificationQuestion[],
  extraSpecs: readonly TurnCardDecisionSpec[],
): Record<string, TurnCardDecisionSpec> {
  const map: Record<string, TurnCardDecisionSpec> = {};
  for (const q of questions) map[q.decisionSpec.decisionId] = q.decisionSpec;
  for (const c of extraSpecs) map[c.decisionId] = c;
  return map;
}

function buildWorkflowContractProjection(
  input: SemanticIntentGateInput,
  gate: ContractGateResult,
  questions: readonly SemanticIntentTurnCardDecision[],
  contractRefs?: PromptContractRefs,
  ontologyDtcBuildReadinessGate?: OntologyDtcBuildReadinessGate,
): SemanticIntentWorkflowContractProjection {
  const runtime = input.runtime ?? "unknown";
  // P4 — keep the FULL specs in-scope to compute `openDecisionIds` from `.blocking` BEFORE
  // projecting to id-refs (blocking must stay reachable; value byte-identical to pre-change).
  const turnCardsFull = questions.map((question) => question.decisionSpec);
  const openDecisionIds = turnCardsFull
    .filter((card) => card.blocking)
    .map((card) => card.decisionId);
  // P4 — emit decisionId refs instead of full bodies (dereference via `result.decisions`
  // / `turnCardDecisionQueue[].decisionSpec`).
  const turnCards = turnCardsFull.map((card) => card.decisionId);
  const mutationAuthorized =
    gate.allowsRouting &&
    gate.semanticIntent.valid &&
    gate.digitalTwin.valid &&
    (ontologyDtcBuildReadinessGate?.readyForRouter ?? true) &&
    openDecisionIds.length === 0;
  // P4 (Slice B) — fan the SECOND `mutationAuthorized` producer out across the seven SSoT
  // modes. The legacy boolean above is UNTOUCHED and stays the promotion verdict; the
  // per-mode verdict below is PURELY ADDITIVE. When no mode is declared the effective mode
  // is `builder-structure-write`, under which `deriveMutationAuthorizationByMode` delegates
  // to the promotion gate — so `mutationMode === DEFAULT_MUTATION_MODE` and the
  // `allowedNextActions`/`currentPhase`/`blockingReason` below stay byte-identical. The
  // proof bag uses only refs/inputs already in scope; missing lane proofs ⇒ that lane is
  // conservatively gated false with its `requires` naming what is missing (no invention).
  const modeInput = input as unknown as SemanticIntentGateMutationModeInput;
  const effectiveMutationMode: MutationMode = modeInput.mutationMode ?? DEFAULT_MUTATION_MODE;
  const mutationModeState: MutationModeState = {
    ...(contractRefs?.semanticIntentContractRef
      ? { semanticIntentContractRef: contractRefs.semanticIntentContractRef }
      : {}),
    ...(contractRefs?.digitalTwinChangeContractRef
      ? { digitalTwinChangeContractRef: contractRefs.digitalTwinChangeContractRef }
      : {}),
    ...(modeInput.consumerActionTypeRef
      ? { consumerActionTypeRef: modeInput.consumerActionTypeRef }
      : {}),
    ...(modeInput.consumerWriteValidated !== undefined
      ? { consumerWriteValidated: modeInput.consumerWriteValidated }
      : {}),
  };
  const mutationAuthorization: MutationAuthorization = deriveMutationAuthorizationByMode(
    effectiveMutationMode,
    mutationModeState,
  );
  // Lighter-lane next-action: ONLY when a NON-default mode's own predicate is satisfied
  // while the promotion gate is not — so a `consumer-data-write`/`proposal-only` effort is
  // not forced through the promotion gate. For the default mode this is always false ⇒ the
  // array below is byte-identical to pre-change.
  const lighterLaneAuthorized =
    effectiveMutationMode !== DEFAULT_MUTATION_MODE &&
    mutationAuthorization.authorized &&
    !mutationAuthorized;
  // P6 (Slice B) — when this projection is built over a gate that bounced for missing
  // FDE-provenance, name the EXACT next call (`pm_ontology_engineering_workflow start`) so
  // the front door is one self-describing hop instead of a second, unpersisted error. The
  // predicate reuses the same two pure functions that drive `applyFDEProvenanceFailure`, so
  // it fires on exactly that bounce and nowhere else; the prepend is ADDITIVE.
  const fdeProvenanceBounce =
    gate.status === "contract_required" &&
    !gate.allowsRouting &&
    requiresFDEWorkflowProvenance(input) &&
    !hasFDEWorkflowProvenance(input);
  const baseNextActions = mutationAuthorized
    ? ["route-with-approved-contracts"]
    : lighterLaneAuthorized
      ? [`route-with-mutation-mode:${effectiveMutationMode}`, "do-not-route-via-promotion-gate"]
      : ontologyDtcBuildReadinessGate && !ontologyDtcBuildReadinessGate.readyForRouter
      ? [
          "render-readiness-diagnostics",
          "attach-work-contract-and-router-binding",
          "do-not-route",
        ]
      : ["render-turn-card-as-text", "record-user-decision", "do-not-route"];
  const allowedNextActions = fdeProvenanceBounce
    ? ["pm_ontology_engineering_workflow start", ...baseNextActions]
    : baseNextActions;
  const currentPhase =
    mutationAuthorized
      ? "ready-to-route"
      : questions.some((question) => question.questionId.startsWith("digital-twin."))
        ? "digital-twin-change"
        : "semantic-intent";
  return {
    workflowContractRef:
      contractRefs?.digitalTwinChangeContractRef ??
      contractRefs?.semanticIntentContractRef ??
      `workflow-contract:${input.promptId ?? input.promptHash ?? "unbound"}`,
    runtime,
    currentPhase,
    ...(turnCards[0] ? { activeTurnCard: turnCards[0] } : {}),
    turnCards,
    openDecisionIds,
    closedDecisionIds: [],
    allowedNextActions,
    mutationAuthorized,
    mutationMode: effectiveMutationMode,
    mutationAuthorization,
    ...(!mutationAuthorized
      ? {
          blockingReason:
            ontologyDtcBuildReadinessGate && !ontologyDtcBuildReadinessGate.readyForRouter
              ? "OntologyDtcBuildReadinessGate is not ready; approved SIC/DTC alone do not authorize router dispatch."
              : "Blocking workflow decisions or approved SIC/DTC refs are still missing.",
        }
      : {}),
    ...(ontologyDtcBuildReadinessGate
      ? {
          ontologyDtcBuildReadiness: {
            status: ontologyDtcBuildReadinessGate.status,
            readyForRouter: ontologyDtcBuildReadinessGate.readyForRouter,
            blockedChecks: ontologyDtcReadinessBlockedChecks(ontologyDtcBuildReadinessGate),
            issueCount: ontologyDtcBuildReadinessGate.issues.length,
          },
        }
      : {}),
  };
}

function shouldAssessOntologyDtcBuildReadiness(
  input: SemanticIntentGateInput,
  gate: ContractGateResult,
): boolean {
  if (isReadOnlyIntent(input.rawIntent)) return false;
  if (
    !gate.allowsRouting &&
    !input.semanticIntentContract &&
    !input.digitalTwinChangeContract &&
    !input.semanticIntentContractRef &&
    !input.digitalTwinChangeContractRef
  ) {
    return false;
  }
  return isOntologyAffectingIntent({
    intent: input.rawIntent,
    scopePaths: Array.isArray(input.scopePaths) ? input.scopePaths : [],
    complexityHint: input.complexityHint,
  });
}

/**
 * Improvement #3 (ADDITIVE) — re-verify a caller-supplied user-approval envelope
 * pointer against the hook-captured PromptEnvelope, FAIL-CLOSED. Returns `undefined`
 * when the caller supplied NO approval inputs (so the gate behaves byte-identically
 * to legacy and no audit event is emitted). Returns a verdict object when at least
 * one approval input is present — `{ authorized: false }` on any verification
 * failure (default not-authorized). promptId/promptHash fall back to the continuity
 * `promptId`/`promptHash`; sessionId/runtime reuse the gate's `sessionId`/`runtime`.
 */
async function assessDtcBuildApprovalForGate(
  input: SemanticIntentGateInput,
): Promise<VerifyDtcBuildApprovalResult | undefined> {
  const suppliedQuote = input.userApprovalQuote?.trim();
  const suppliedPromptId = input.userApprovalPromptId?.trim();
  const suppliedPromptHash = input.userApprovalPromptHash?.trim();
  if (!suppliedQuote && !suppliedPromptId && !suppliedPromptHash) {
    return undefined;
  }
  const promptId = suppliedPromptId ?? input.promptId?.trim() ?? "";
  const promptHash = suppliedPromptHash ?? input.promptHash?.trim() ?? "";
  const runtime = isPromptRuntime(input.runtime) ? input.runtime : undefined;
  return verifyDtcBuildApprovalAgainstEnvelope({
    projectRoot: input.project,
    promptId,
    promptHash,
    userQuote: suppliedQuote ?? "",
    sessionId: input.sessionId,
    runtime,
  });
}

/**
 * Improvement #3 (ADDITIVE) — emit a 5-dim audit event on both grant and deny of a
 * DTC-build user-approval envelope (rule 10). Best-effort: a failed emit never
 * blocks the gate result. The grant originates from the user turn (byWhom.identity
 * = "user"); the deny is attributed to the host runtime.
 */
async function emitDtcBuildApprovalAuditEvent(
  input: SemanticIntentGateInput,
  verdict: VerifyDtcBuildApprovalResult,
): Promise<void> {
  const granted = verdict.authorized === true;
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: granted,
        errorClass: granted ? "dtc_build_approval_granted" : "dtc_build_approval_denied",
        reason: verdict.reason,
        approvalSurface: "digital-twin-change",
        approvalRef: granted ? verdict.approvalRef.promptHash : null,
        promptId: input.userApprovalPromptId ?? input.promptId ?? null,
        projectRoot: input.project,
        runtime: input.runtime ?? "unknown",
      } as Record<string, unknown>,
      toolName: "pm_semantic_intent_gate",
      cwd: input.project,
      ...(granted ? { identity: "user" as const } : {}),
      reasoning:
        `pm_semantic_intent_gate: DTC-build approval ${granted ? "granted" : "denied"} — ${verdict.reason}`,
      hypothesis:
        "A user-approval envelope re-verified fail-closed against the hook-captured PromptEnvelope " +
        "is the binding a WorkContract+RouterBinding pair mechanically reconstructs; accepting it as " +
        "an alternative satisfier for ONLY those derived checks preserves governance while removing " +
        "the redundant process artifacts.",
      memoryLayers: granted ? ["working", "episodic"] : ["working"],
      ...(granted
        ? {}
        : {
            refinementTarget: {
              kind: "rule-conformance-policy" as const,
              filePathOrRid: "bridge/handlers/pm-semantic-intent-gate.ts",
              description:
                "DTC-build user-approval envelope failed fail-closed re-verification against the captured PromptEnvelope.",
              confidenceLevel: "high" as const,
            },
          }),
    });
  } catch {
    // Non-fatal — the gate result is returned regardless of emit failure.
  }
}

function assessSemanticGateOntologyDtcBuildReadiness(input: {
  gateInput: SemanticIntentGateInput;
  gate: ContractGateResult;
  semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  /**
   * Improvement #3 (ADDITIVE) — PRE-VERIFIED boolean computed by the handler from
   * `verifyDtcBuildApprovalAgainstEnvelope` (fs-bound, fail-closed). Default false.
   */
  userApprovalAuthorizesDispatch?: boolean;
  /**
   * Improvement #4 (ADDITIVE) — the LIVE registered-ontology rid set, pre-derived by
   * the async caller via `deriveRegisteredOntologyRids` (fail-closed; absent ⇒
   * byte-identical legacy). The gate proves a 0-new-term re-bind structurally from
   * this set; this sync function only forwards it.
   */
  registeredOntologyRids?: readonly string[];
}): OntologyDtcBuildReadinessGate | undefined {
  if (!shouldAssessOntologyDtcBuildReadiness(input.gateInput, input.gate)) {
    return undefined;
  }
  return assessOntologyDtcBuildReadinessGate({
    intent: input.gateInput.rawIntent,
    scopePaths: Array.isArray(input.gateInput.scopePaths) ? input.gateInput.scopePaths : [],
    complexityHint: input.gateInput.complexityHint,
    projectRoot: input.gateInput.project,
    semanticIntentContractRef:
      input.gateInput.semanticIntentContract?.contractId ??
      input.gateInput.semanticIntentContractRef,
    digitalTwinChangeContractRef:
      input.gateInput.digitalTwinChangeContract?.contractId ??
      input.gateInput.digitalTwinChangeContractRef,
    semanticIntentContract: input.gateInput.semanticIntentContract,
    digitalTwinChangeContract: input.gateInput.digitalTwinChangeContract,
    semanticConsistencyResult: input.semanticConsistencyResult,
    semanticConsistencyResultRef: input.semanticConsistencyResult?.resolverRunId,
    userApprovalAuthorizesDispatch: input.userApprovalAuthorizesDispatch === true,
    ...(input.registeredOntologyRids
      ? { registeredOntologyRids: input.registeredOntologyRids }
      : {}),
  });
}

function ontologyDtcReadinessBlockedChecks(
  gate: OntologyDtcBuildReadinessGate | undefined,
): string[] {
  if (!gate) return [];
  return Object.entries(gate.checks)
    .filter(([, result]) => !result.valid)
    .map(([check]) => check);
}

function ontologyDtcReadinessPayload(
  gate: OntologyDtcBuildReadinessGate | undefined,
): Record<string, unknown> {
  if (!gate) return {};
  return {
    ontologyDtcBuildReadinessGateStatus: gate.status,
    ontologyDtcReadyForRouter: gate.readyForRouter,
    ontologyDtcReadinessBlockedChecks: ontologyDtcReadinessBlockedChecks(gate),
    ontologyDtcReadinessIssueCount: gate.issues.length,
  };
}

function shouldIncludeDrafts(
  input: SemanticIntentGateInput,
  gate: ContractGateResult,
): boolean {
  if (input.draftMode === "never") return false;
  if (input.draftMode === "required-only") {
    return input.includeDrafts === true || !gate.allowsRouting;
  }
  return true;
}

function shouldReturnDrafts(input: SemanticIntentGateInput): boolean {
  return input.interactionMode !== "human_collaborative" || input.includeDrafts === true;
}

function requiresFDEWorkflowProvenance(input: SemanticIntentGateInput): boolean {
  const text = `${input.rawIntent} ${(input.scopePaths ?? []).join(" ")}`.toLowerCase();
  return [
    "ontology engineering",
    "fde",
    "runtime-native question ui",
    "workflowcontract",
    "turncarddecisionspec",
    "userdecisionrecord",
    "pm_ontology_engineering_workflow",
  ].some((marker) => text.includes(marker));
}

function hasFDEWorkflowProvenance(input: SemanticIntentGateInput): boolean {
  if (input.fdeOntologyEngineeringSessionRef?.trim()) return true;
  return readCurrentFDEOntologyEngineeringSession(input.project) !== null;
}

function applyFDEProvenanceFailure(
  gate: ContractGateResult,
  input: SemanticIntentGateInput,
): ContractGateResult {
  if (!gate.allowsRouting) return gate;
  if (!requiresFDEWorkflowProvenance(input)) return gate;
  if (hasFDEWorkflowProvenance(input)) return gate;
  return {
    ...gate,
    status: "contract_required",
    allowsRouting: false,
    reason:
      "FDEOntologyEngineeringSession provenance is required before this Ontology Engineering workflow can author SIC/DTC or route execution.",
    requiredContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    recommendedContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
  };
}

function draftUnreadyDigitalTwinForGate(
  input: SemanticIntentGateInput,
  semanticIntent: SemanticIntentContract,
  reason:
    | "semantic-contract-not-approved"
    | "fde-session-missing"
    | "context-plan-error",
  detail?: string,
): DigitalTwinChangeContract {
  const draft = draftDigitalTwinChangeContract(
    {
      intent: "awaiting approved SIC, FDE session, and context plan",
      scopePaths: input.scopePaths,
      complexityHint: input.complexityHint,
    },
    semanticIntent.contractId,
  );

  const riskByReason: Record<typeof reason, DigitalTwinRiskRecord> = {
    "semantic-contract-not-approved": {
      riskId: "risk.approved-sic-required-for-dtc-draft",
      kind: "evaluation",
      status: "open",
      description:
        "DigitalTwinChangeContract derivation is withheld because the SemanticIntentContract is not approved.",
      mitigation:
        "Surface meaning in FDEOntologyEngineeringSession, then capture an approved SIC boundary before DTC authoring.",
    },
    "fde-session-missing": {
      riskId: "risk.fde-session-required-for-dtc-draft",
      kind: "observability",
      status: "open",
      description:
        "DigitalTwinChangeContract derivation is withheld because no current FDEOntologyEngineeringSession was available.",
      mitigation:
        "Load or continue the FDE session and derive DTC from approved SIC plus the ContextEngineeringPlan.",
    },
    "context-plan-error": {
      riskId: "risk.context-engineering-dtc-draft-failed",
      kind: "evaluation",
      status: "open",
      description:
        "ContextEngineeringPlan-based DTC derivation failed; raw-prompt DTC fallback is forbidden." +
        (detail ? ` Detail: ${detail}` : ""),
      mitigation:
        "Resolve the ContextEngineeringPlan, technology recommendation, and validation plan before DTC approval.",
    },
  };

  return {
    ...draft,
    contractId: "digital-twin-change:awaiting-approved-sic-fde-context-plan",
    changeBoundary: "",
    branchProposalPolicy: "",
    permissionBoundary: "",
    replayMigrationPlan: "",
    observabilityPlan:
      "DTC draft is intentionally unready until it is derived from approved SIC, FDE session, ContextEngineeringPlan, technology recommendation, and validation plan evidence.",
    toolSurfaceReadiness: "",
    evaluationPlan: "",
    risks: [riskByReason[reason]],
  };
}

function draftDigitalTwinForGate(
  input: SemanticIntentGateInput,
  semanticIntent: SemanticIntentContract,
): DigitalTwinChangeContract {
  if (isApprovedSemanticIntentContract(semanticIntent)) {
    try {
      const fdeSession = readCurrentFDEOntologyEngineeringSession(input.project);
      if (fdeSession) {
        const projectIndex = {
          projectRoot: input.project,
          runtimeSurfaceRefs: input.scopePaths ?? [],
          sourceRefs: fdeSession.sourceRefs,
        };
        const contextEngineeringPlan = buildContextEngineeringPlanV2({
          semanticIntentContract: semanticIntent,
          fdeSession,
          projectIndex,
        });
        return draftDtcFromContextPlanV2({
          semanticIntentContract: semanticIntent,
          fdeSession,
          contextEngineeringPlan,
          projectIndex,
        }).digitalTwinChangeContract;
      }
      return draftUnreadyDigitalTwinForGate(input, semanticIntent, "fde-session-missing");
    } catch (err) {
      return draftUnreadyDigitalTwinForGate(
        input,
        semanticIntent,
        "context-plan-error",
        describeUnknownError(err),
      );
    }
  }
  return draftUnreadyDigitalTwinForGate(input, semanticIntent, "semantic-contract-not-approved");
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function scopeSummary(input: SemanticIntentGateInput, language: "ko" | "en"): string[] {
  const paths = Array.isArray(input.scopePaths) ? input.scopePaths.filter(Boolean) : [];
  if (paths.length > 0) return paths.slice(0, 5);
  return language === "ko"
    ? ["승인된 의미와 변경 경계에 맞는 파일/도구 표면"]
    : ["Files and tool surfaces authorized by the approved meaning and boundary"];
}

function translateQuestion(
  question: SemanticIntentTurnCardDecision,
  input: SemanticIntentGateInput,
): UserFacingClarificationCard {
  const language = input.preferredLanguage ?? "ko";
  const userLevel = input.userExpertise ?? "non_programmer";
  const isDigitalTwin = question.questionId.startsWith("digital-twin.");
  const plainQuestion =
    language === "ko"
      ? isDigitalTwin
        ? "실제 변경 범위와 위험을 이 경계로 제한해도 됩니까?"
        : "제가 이해한 목표와 하지 말아야 할 범위가 맞습니까?"
      : isDigitalTwin
        ? "Can we limit the actual change boundary and risks to this scope?"
        : "Is this the right goal and non-goal boundary?";
  const recommendedChoice = question.decisionSpec.choices.find(
    (choice) => choice.choiceId === question.decisionSpec.recommendedChoiceId,
  );
  const recommendedAnswer =
    language === "ko"
      ? isDigitalTwin
        ? "네. prompt를 바로 실행하지 않고, FDE 대화에서 확인한 의미와 승인된 SIC를 기준으로 ContextEngineeringPlan(DATA/LOGIC/ACTION), 기술 추천, 검증 계획을 확인한 뒤 DTC 경계 안에서만 라우팅합니다."
        : "네. FDE 대화에서 확인한 의미를 SIC 경계로 기록하고, 승인되지 않은 해석으로 구현하지 않습니다."
      : recommendedChoice?.consequence ?? question.defaultIfUserAcceptsRecommendation;
  const whyItMatters =
    language === "ko"
      ? isDigitalTwin
        ? "DTC는 raw prompt가 아니라 승인된 SIC와 FDE/ContextEngineeringPlan/검증 계획에서만 만들어져야 합니다."
        : "이 확인이 있어야 agent가 사용자의 뜻을 추측해서 ontology나 runtime을 바꾸지 않습니다."
      : question.whyItMatters;

  return {
    questionId: question.questionId,
    userLevel,
    plainQuestion,
    recommendedAnswer,
    whyItMatters,
    choices:
      language === "ko"
        ? [
            {
              label: "추천 경계 확인",
              consequencePlain: isDigitalTwin
                ? "승인된 SIC+FDE+ContextEngineeringPlan+기술 추천+검증 계획 안에서만 후속 라우팅과 검증을 진행합니다."
                : "FDE에서 확인한 의미를 SemanticIntentContract의 승인 경계로 삼습니다.",
              internalContractPatch: { status: "user_review_recommended" },
            },
            {
              label: "일부 수정",
              consequencePlain: "agent가 구현을 시작하지 않고 수정된 답변으로 contract 초안을 다시 만듭니다.",
            },
            {
              label: "보류",
              consequencePlain: "승인된 contract가 없으므로 ontology-affecting 실행을 진행하지 않습니다.",
            },
          ]
        : [
            {
              label: "Confirm recommendation",
              consequencePlain: isDigitalTwin
                ? "Follow-up routing and verification stay inside the approved change boundary."
                : "The approved meaning becomes the SemanticIntentContract baseline.",
              internalContractPatch: { status: "user_review_recommended" },
            },
            {
              label: "Revise",
              consequencePlain: "The agent waits and drafts the contract again from the revised answer.",
            },
            {
              label: "Hold",
              consequencePlain: "No ontology-affecting execution proceeds without an approved contract.",
            },
          ],
    freeTextAllowed: true,
  };
}

function buildUserReviewCard(
  input: SemanticIntentGateInput,
  turnCardDecisionQueue: SemanticIntentTurnCardDecision[],
): SemanticIntentUserReviewCard | undefined {
  if (input.interactionMode !== "human_collaborative") return undefined;

  const language = input.preferredLanguage ?? "ko";
  const scope = scopeSummary(input, language);
  const semanticQuestions = turnCardDecisionQueue
    .filter((question) => question.questionId.startsWith("semantic-intent."))
    .slice(0, 3)
    .map((question) => translateQuestion(question, input));
  const digitalTwinQuestions = turnCardDecisionQueue
    .filter((question) => question.questionId.startsWith("digital-twin."))
    .slice(0, 2)
    .map((question) => translateQuestion(question, input));
  const questions = [...semanticQuestions, ...digitalTwinQuestions].slice(0, 5);
  const approvalOptions: ContractApprovalOption[] = ["approve", "revise", "cancel"];

  if (language === "en") {
    const semanticIntentCard: UserReviewCardSection = {
      title: "Work Meaning Review",
      plainSummary: `I understand the request as: ${input.rawIntent}`,
      recommendedDirection:
        "Record the FDE-confirmed meaning as the SIC approval boundary first, then route work only from the approved contract.",
      willChange: scope,
      willNotChange: [
        "No mutation runs from private agent interpretation alone.",
        "No raw prompt retention is enabled by this review card.",
        "No gate mode is promoted to blocking by this review step.",
      ],
      risksPlain: [
        "If the meaning is wrong, the implementation can touch the wrong ontology or runtime surface.",
      ],
      questions: semanticQuestions,
      approvalOptions,
    };
    const digitalTwinBoundaryCard: UserReviewCardSection = {
      title: "Change Boundary Review",
      plainSummary:
        "This card does not execute the raw prompt. The DTC is derived only from the approved SIC, FDE session, ContextEngineeringPlan DATA/LOGIC/ACTION, technology recommendation, and validation plan.",
      recommendedDirection:
        "Let the router choose execution candidates only after the approved DTC exists, and keep actual changes behind work-contract and validation gates.",
      willChange: scope,
      willNotChange: [
        "No generated registry is hand-edited.",
        "No branch, permission, replay, or evaluation risk is implicit.",
      ],
      risksPlain: [
        "A vague boundary can let the agent pass tests while changing the wrong product behavior.",
      ],
      questions: digitalTwinQuestions,
      approvalOptions,
    };
    return {
      title: "Contract Authoring Review",
      plainSummary: semanticIntentCard.plainSummary,
      recommendedDirection: semanticIntentCard.recommendedDirection,
      willChange: semanticIntentCard.willChange,
      willNotChange: [...semanticIntentCard.willNotChange, ...digitalTwinBoundaryCard.willNotChange],
      risksPlain: [...semanticIntentCard.risksPlain, ...digitalTwinBoundaryCard.risksPlain],
      questions,
      approvalOptions,
      semanticIntentCard,
      digitalTwinBoundaryCard,
    };
  }

  const semanticIntentCard: UserReviewCardSection = {
    title: "제가 이해한 작업 의미",
    plainSummary: `제가 이해한 요청은 다음입니다: ${input.rawIntent}`,
    recommendedDirection:
      "먼저 FDE 대화에서 확인한 의미를 SIC 승인 경계로 기록하고, 그 contract 기준으로만 후속 작업을 라우팅합니다.",
    willChange: scope,
    willNotChange: [
      "agent의 추측만으로 ontology나 runtime을 변경하지 않습니다.",
      "이 검토 카드만으로 원문 prompt 저장을 켜지 않습니다.",
      "이 단계에서 Prompt-DTC 기본 모드를 blocking으로 올리지 않습니다.",
    ],
    risksPlain: [
      "의미가 틀리면 구현이 맞아 보여도 잘못된 ontology나 runtime 표면을 바꿀 수 있습니다.",
    ],
    questions: semanticQuestions,
    approvalOptions,
  };
  const digitalTwinBoundaryCard: UserReviewCardSection = {
    title: "실제 변경 범위 확인",
    plainSummary:
      "이 카드는 prompt를 바로 실행하지 않습니다. DTC는 승인된 SIC, FDE session, ContextEngineeringPlan(DATA/LOGIC/ACTION), 기술 추천, 검증 계획에서만 만듭니다.",
    recommendedDirection:
      "승인된 DTC가 있을 때만 라우터가 실행 후보를 고르고, 실제 변경은 work contract와 검증 gate 뒤에 둡니다.",
    willChange: scope,
    willNotChange: [
      "generated registry를 직접 손으로 고치지 않습니다.",
      "branch, permission, replay, evaluation 위험을 암묵적으로 넘기지 않습니다.",
    ],
    risksPlain: [
      "경계가 모호하면 테스트를 통과해도 잘못된 제품 동작이나 권한 범위를 바꿀 수 있습니다.",
    ],
    questions: digitalTwinQuestions,
    approvalOptions,
  };

  return {
    title: "Contract 작성 검토 카드",
    plainSummary: semanticIntentCard.plainSummary,
    recommendedDirection: semanticIntentCard.recommendedDirection,
    willChange: semanticIntentCard.willChange,
    willNotChange: [...semanticIntentCard.willNotChange, ...digitalTwinBoundaryCard.willNotChange],
    risksPlain: [...semanticIntentCard.risksPlain, ...digitalTwinBoundaryCard.risksPlain],
    questions,
    approvalOptions,
    semanticIntentCard,
    digitalTwinBoundaryCard,
  };
}

function userReviewCardText(card: SemanticIntentUserReviewCard): string {
  const sectionText = (section: UserReviewCardSection): string =>
    [
      section.title,
      section.plainSummary,
      section.recommendedDirection,
      ...section.willChange,
      ...section.willNotChange,
      ...section.risksPlain,
      ...section.questions.flatMap((question) => [
        question.plainQuestion,
        question.recommendedAnswer,
        question.whyItMatters,
        ...question.choices.flatMap((choice) => [
          choice.label,
          choice.consequencePlain,
        ]),
      ]),
    ].join("\n");

  return [
    card.title,
    card.plainSummary,
    card.recommendedDirection,
    ...card.willChange,
    ...card.willNotChange,
    ...card.risksPlain,
    ...card.questions.flatMap((question) => [
      question.plainQuestion,
      question.recommendedAnswer,
      question.whyItMatters,
      ...question.choices.flatMap((choice) => [
        choice.label,
        choice.consequencePlain,
      ]),
    ]),
    sectionText(card.semanticIntentCard),
    sectionText(card.digitalTwinBoundaryCard),
    ...card.approvalOptions,
  ].join("\n");
}

function assertUserReviewCardBeforeDisplay(
  card: SemanticIntentUserReviewCard | undefined,
): SemanticIntentUserReviewCard | undefined {
  if (card === undefined) return undefined;
  assertDtcApprovalCardTextBeforeDisplay({
    surface: "pm_semantic_intent_gate.userReviewCard",
    text: userReviewCardText(card),
  });
  return card;
}

function continuityFailure(field: string, message: string): ContractValidationResult {
  return { valid: false, issues: [{ field, message }] };
}

async function loadPromptEnvelope(
  input: SemanticIntentGateInput,
): Promise<{
  store: PromptFrontDoorStore;
  envelope?: PromptEnvelope;
  continuity?: ContractValidationResult;
  lookup: PromptEnvelopeLookup;
}> {
  const runtime = isPromptRuntime(input.runtime) ? input.runtime : undefined;
  const sessionId = input.sessionId;
  let promptId = input.promptId;
  const candidates = promptFrontDoorCandidateStores(input.project);
  let selected =
    candidates[0] ??
    {
      store: new PromptFrontDoorStore({ projectRoot: input.project }),
      projectRoot: input.project,
      selectedBy: "input-project" as const,
    };
  let store = selected.store;
  const lookup = (): PromptEnvelopeLookup => ({
    suppliedProject: input.project,
    selectedPromptFrontDoorRoot: selected.projectRoot,
    selectedBy: selected.selectedBy,
    candidateRootsChecked: candidates.map((candidate) => candidate.projectRoot),
  });

  if (!promptId && runtime && sessionId) {
    for (const candidate of candidates) {
      const current = await candidate.store.readCurrentPointer(runtime, sessionId);
      if (current?.promptId) {
        selected = candidate;
        store = candidate.store;
        promptId = current.promptId;
        break;
      }
    }
  }
  if (!promptId && !sessionId && !input.promptHash && !runtime) {
    return { store, lookup: lookup() };
  }
  if (!promptId || !sessionId) {
    return {
      store,
      lookup: lookup(),
      continuity: continuityFailure(
        "promptId",
        "promptId and sessionId are required to resolve prompt-front-door persistence",
      ),
    };
  }

  let envelope: PromptEnvelope | null = null;
  for (const candidate of candidates) {
    const candidateEnvelope = await candidate.store.readEnvelope(sessionId, promptId);
    if (candidateEnvelope) {
      selected = candidate;
      store = candidate.store;
      envelope = candidateEnvelope;
      break;
    }
  }
  if (!envelope) {
    return {
      store,
      lookup: lookup(),
      continuity: continuityFailure(
        "promptId",
        "prompt-front-door envelope was not found for the supplied promptId/sessionId",
      ),
    };
  }

  return {
    store,
    envelope,
    lookup: lookup(),
    continuity: validatePromptContinuity({
      envelope,
      expectedPromptHash: input.promptHash,
      currentPromptId: input.promptId,
      runtime,
      sessionId,
    }),
  };
}

function promptFrontDoorCandidateStores(projectRoot: string): Array<{
  store: PromptFrontDoorStore;
  projectRoot: string;
  selectedBy: PromptEnvelopeLookupSelectedBy;
}> {
  const home = process.env.HOME;
  const candidates: Array<{ projectRoot?: string; selectedBy: PromptEnvelopeLookupSelectedBy }> = [
    { projectRoot, selectedBy: "input-project" },
    { projectRoot: process.env.PALANTIR_MINI_PROJECT, selectedBy: "env-project" },
    { projectRoot: process.cwd(), selectedBy: "cwd" },
    {
      projectRoot: projectRoot.startsWith(`${home ?? ""}${path.sep}.claude${path.sep}`) ? home : undefined,
      selectedBy: "home-fallback",
    },
    { projectRoot: home, selectedBy: "home-fallback" },
  ];
  const seen = new Set<string>();
  return candidates
    .filter((candidate): candidate is { projectRoot: string; selectedBy: PromptEnvelopeLookupSelectedBy } =>
      Boolean(candidate.projectRoot && path.isAbsolute(candidate.projectRoot))
    )
    .map((candidate) => ({ ...candidate, projectRoot: path.resolve(candidate.projectRoot) }))
    .filter((candidate) => {
      if (seen.has(candidate.projectRoot)) return false;
      seen.add(candidate.projectRoot);
      return true;
    })
    .map((candidate) => ({
      ...candidate,
      store: new PromptFrontDoorStore({ projectRoot: candidate.projectRoot }),
    }));
}

function mergeRefs(envelope: PromptEnvelope, refs: PromptContractRefs): PromptEnvelope {
  return withPromptState(envelope, envelope.state, {
    ...envelope.contractRefs,
    ...refs,
  });
}

function advanceToSemanticDraft(
  envelope: PromptEnvelope,
  refs: PromptContractRefs,
  options: {
    readonly interactionMode?: SemanticIntentGateInput["interactionMode"];
    readonly hasOpenQuestions?: boolean;
  } = {},
): PromptEnvelope {
  if (envelope.state === "captured") {
    if (options.interactionMode === "human_collaborative") {
      return transitionPromptEnvelope(
        envelope,
        options.hasOpenQuestions ? "semantic_intent_questions_open" : "semantic_intent_user_review",
        refs,
      );
    }
    return transitionPromptEnvelope(envelope, "semantic_intent_drafted", refs);
  }
  return mergeRefs(envelope, refs);
}

function advanceToSemanticUserReview(
  envelope: PromptEnvelope,
  refs: PromptContractRefs,
): PromptEnvelope {
  if (
    envelope.state === "semantic_intent_drafted" ||
    envelope.state === "semantic_intent_questions_open"
  ) {
    return transitionPromptEnvelope(envelope, "semantic_intent_user_review", refs);
  }
  return mergeRefs(envelope, refs);
}

function advanceToDigitalTwinUserReview(
  envelope: PromptEnvelope,
  refs: PromptContractRefs,
): PromptEnvelope {
  let next = envelope;
  if (next.state === "semantic_intent_approved") {
    next = transitionPromptEnvelope(next, "digital_twin_drafted", refs);
  }
  if (next.state === "digital_twin_drafted" || next.state === "digital_twin_questions_open") {
    next = transitionPromptEnvelope(next, "digital_twin_user_review", refs);
  }
  return next;
}

function advanceToApprovedState(
  envelope: PromptEnvelope,
  refs: PromptContractRefs,
  semanticContract?: SemanticIntentContract,
  digitalTwinContract?: DigitalTwinChangeContract,
  options: {
    readonly ontologyAffecting: boolean;
    readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  } = { ontologyAffecting: false },
): PromptEnvelope {
  const semanticValid = semanticContract
    ? validateSemanticIntentContract(semanticContract).valid &&
      semanticConsistencyPromotionAllowed({
        subject: "semantic-intent-contract",
        ontologyAffecting: options.ontologyAffecting,
        semanticConsistencyResult: options.semanticConsistencyResult,
        attachedResolverRunRefs: semanticContract.semanticConsistencyResultRef
          ? [semanticContract.semanticConsistencyResultRef]
          : [],
      })
    : false;
  const digitalTwinValid = digitalTwinContract
    ? validateDigitalTwinChangeContract(digitalTwinContract).valid &&
      semanticConsistencyPromotionAllowed({
        subject: "digital-twin-change-contract",
        ontologyAffecting: options.ontologyAffecting,
        semanticConsistencyResult: options.semanticConsistencyResult,
        attachedResolverRunRefs: digitalTwinContract.semanticConsistencyRefs,
      })
    : false;
  let next = advanceToSemanticDraft(envelope, refs);

  if (semanticContract && semanticValid && hasApprovalRef(semanticContract.approvalRef)) {
    if (
      next.state === "semantic_intent_drafted" ||
      next.state === "semantic_intent_questions_open"
    ) {
      next = advanceToSemanticUserReview(next, refs);
    }
    if (next.state === "semantic_intent_user_review") {
      next = transitionPromptEnvelope(next, "semantic_intent_approved", {
        ...refs,
        approvalRef: semanticContract.approvalRef,
        semanticIntentApprovalRef: semanticContract.approvalRef,
      });
    } else {
      next = mergeRefs(next, {
        ...refs,
        approvalRef: semanticContract.approvalRef,
        semanticIntentApprovalRef: semanticContract.approvalRef,
      });
    }
  }

  if (
    digitalTwinContract &&
    semanticValid &&
    digitalTwinValid &&
    hasApprovalRef(digitalTwinContract.approvalRef)
  ) {
    if (next.state === "semantic_intent_approved") {
      next = advanceToDigitalTwinUserReview(next, refs);
    }
    if (next.state === "digital_twin_user_review") {
      next = transitionPromptEnvelope(next, "digital_twin_approved", {
        ...refs,
        approvalRef: digitalTwinContract.approvalRef,
        digitalTwinApprovalRef: digitalTwinContract.approvalRef,
      });
    } else {
      next = mergeRefs(next, {
        ...refs,
        approvalRef: digitalTwinContract.approvalRef,
        digitalTwinApprovalRef: digitalTwinContract.approvalRef,
      });
    }
  }

  return next;
}

function semanticConsistencyPromotionAllowed(input: {
  readonly subject: "semantic-intent-contract" | "digital-twin-change-contract";
  readonly ontologyAffecting: boolean;
  readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  readonly attachedResolverRunRefs?: readonly string[];
}): boolean {
  return assessSemanticConsistencyPromotionGate(input).promotionAllowed;
}

async function persistPromptContracts(
  input: SemanticIntentGateInput,
  prompt: {
    store: PromptFrontDoorStore;
    envelope?: PromptEnvelope;
    continuity?: ContractValidationResult;
  },
  draftContracts: DraftContractsInternal | undefined,
  semanticConsistencyResult?: SemanticConsistencyResolverOutput,
): Promise<{ envelope?: PromptEnvelope; contractRefs?: PromptContractRefs }> {
  if (input.draftMode === "never" || !prompt.envelope || prompt.continuity?.valid === false) {
    return { envelope: prompt.envelope };
  }

  const semanticIntent = input.semanticIntentContract ?? draftContracts?.semanticIntent;
  const digitalTwin = input.digitalTwinChangeContract ?? draftContracts?.digitalTwin;
  const refs: {
    semanticIntentContractRef?: string;
    digitalTwinChangeContractRef?: string;
    approvalRef?: PromptContractRefs["approvalRef"];
    semanticIntentApprovalRef?: PromptContractRefs["semanticIntentApprovalRef"];
    digitalTwinApprovalRef?: PromptContractRefs["digitalTwinApprovalRef"];
  } = {
    semanticIntentContractRef: input.semanticIntentContractRef,
    digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
  };

  if (hasPersistableContractId(semanticIntent)) {
    const semanticRecord = await prompt.store.writeContractRecord(
      prompt.envelope,
      "semantic-intent",
      semanticIntent,
    );
    refs.semanticIntentContractRef = semanticRecord.ref;
  }
  if (hasPersistableContractId(digitalTwin)) {
    const digitalTwinRecord = await prompt.store.writeContractRecord(
      prompt.envelope,
      "digital-twin-change",
      digitalTwin,
    );
    refs.digitalTwinChangeContractRef = digitalTwinRecord.ref;
  }

  if (!refs.semanticIntentContractRef && !refs.digitalTwinChangeContractRef) {
    return { envelope: prompt.envelope };
  }

  const next =
    input.semanticIntentContract || input.digitalTwinChangeContract
      ? advanceToApprovedState(
          prompt.envelope,
          refs,
          input.semanticIntentContract,
          input.digitalTwinChangeContract,
          {
            ontologyAffecting: requiresContractApproval({
              intent: input.rawIntent,
              scopePaths: input.scopePaths,
              complexityHint: input.complexityHint,
            }),
            semanticConsistencyResult,
          },
        )
      : advanceToSemanticDraft(prompt.envelope, refs, {
          interactionMode: input.interactionMode,
          hasOpenQuestions: Boolean(
            draftContracts?.semanticIntent.clarificationQuestions.some(
              (question) => question.status === "open" && question.requiresUserApproval,
            ),
          ),
        });

  await prompt.store.saveEnvelope(next);
  return { envelope: next, contractRefs: next.contractRefs };
}

function hasPersistableContractId(
  contract: SemanticIntentContract | DigitalTwinChangeContract | undefined,
): contract is SemanticIntentContract | DigitalTwinChangeContract {
  return typeof contract?.contractId === "string" && contract.contractId.trim().length > 0;
}

/**
 * Pre-seed the ontology-dtc-build turn-by-turn sequence from an APPROVED SIC's
 * structured typed refs (G10: close the re-type-CSV gap). Returns undefined unless
 * the SIC is approved AND carries at least one typed ref — so the per-turn raw-CSV
 * path stays byte-identical when no approved SIC is in play. The user confirm remains
 * load-bearing: these are PROPOSED defaults the user confirms (sends nothing) or
 * corrects (types refs).
 *
 * 승인된 SIC의 typed ref를 ontology-dtc-build 턴 기본 제안으로 미리 채운다(미승인/빈 SIC → undefined).
 */
function sicTypedRefsFromApprovedSic(
  sic: SemanticIntentContract | undefined,
): SicTypedRefDefaults | undefined {
  if (!sic || !isApprovedSemanticIntentContract(sic)) return undefined;
  const objectTypeRefs = sic.approvedObjectTypeRefs ?? [];
  const linkTypeRefs = sic.approvedLinkTypeRefs ?? [];
  const actionTypeRefs = sic.approvedActionTypeRefs ?? [];
  const functionRefs = sic.approvedFunctionRefs ?? [];
  if (
    objectTypeRefs.length === 0 &&
    linkTypeRefs.length === 0 &&
    actionTypeRefs.length === 0 &&
    functionRefs.length === 0
  ) {
    return undefined;
  }
  return { objectTypeRefs, linkTypeRefs, actionTypeRefs, functionRefs };
}

function safeTransitionPromptEnvelope(
  envelope: PromptEnvelope,
  state: Parameters<typeof transitionPromptEnvelope>[1],
  refs: PromptContractRefs,
): PromptEnvelope {
  try {
    return transitionPromptEnvelope(envelope, state, refs);
  } catch {
    return mergeRefs(envelope, refs);
  }
}

function advanceAfterSemanticFill(
  envelope: PromptEnvelope,
  refs: PromptContractRefs,
): PromptEnvelope {
  if (envelope.state === "captured") {
    return safeTransitionPromptEnvelope(envelope, "semantic_intent_drafted", refs);
  }
  return mergeRefs(envelope, refs);
}

function advanceAfterDtcFill(
  envelope: PromptEnvelope,
  refs: PromptContractRefs,
  fillComplete: boolean,
): PromptEnvelope {
  let next = envelope;
  if (next.state === "semantic_intent_approved") {
    next = safeTransitionPromptEnvelope(next, "digital_twin_drafted", refs);
  }
  if (
    fillComplete &&
    (next.state === "digital_twin_drafted" || next.state === "digital_twin_questions_open")
  ) {
    return safeTransitionPromptEnvelope(next, "digital_twin_user_review", refs);
  }
  return mergeRefs(next, refs);
}

async function persistAdvancedFillResults(
  input: SemanticIntentGateInput,
  prompt: {
    store: PromptFrontDoorStore;
    envelope?: PromptEnvelope;
    continuity?: ContractValidationResult;
  },
  current: {
    envelope?: PromptEnvelope;
    contractRefs?: PromptContractRefs;
  },
  fills: {
    fillResult?: SemanticIntentFillResult;
    fdeFillResult?: FDESemanticIntentFillResult;
    dtcFillResult?: DtcSemanticIntentFillResult;
  },
): Promise<{ envelope?: PromptEnvelope; contractRefs?: PromptContractRefs }> {
  if (!prompt.envelope || prompt.continuity?.valid === false) {
    return current;
  }
  const semanticContract = fills.fdeFillResult?.contract ?? fills.fillResult?.contract;
  const dtcContract = fills.dtcFillResult?.contract;
  if (!semanticContract && !dtcContract) return current;

  let envelope = current.envelope ?? prompt.envelope;
  let refs: PromptContractRefs = {
    ...envelope.contractRefs,
    ...current.contractRefs,
  };

  if (semanticContract) {
    const record = await prompt.store.writeContractRecord(
      envelope,
      "semantic-intent",
      semanticContract,
    );
    refs = {
      ...refs,
      semanticIntentContractRef: record.ref,
    };
    envelope = advanceAfterSemanticFill(envelope, refs);
  }

  if (dtcContract) {
    const record = await prompt.store.writeContractRecord(
      envelope,
      "digital-twin-change",
      dtcContract,
    );
    refs = {
      ...refs,
      digitalTwinChangeContractRef: record.ref,
    };
    envelope = advanceAfterDtcFill(envelope, refs, fills.dtcFillResult?.fillComplete === true);
  }

  await prompt.store.saveEnvelope(envelope);
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        passed: true,
        errorClass: "prompt_contract_fill_persisted",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        runtime: envelope.runtime,
        projectRoot: envelope.projectRoot,
        promptEnvelopeState: envelope.state,
        semanticFillPersisted: Boolean(semanticContract),
        dtcFillPersisted: Boolean(dtcContract),
        semanticIntentContractRef: refs.semanticIntentContractRef,
        digitalTwinChangeContractRef: refs.digitalTwinChangeContractRef,
      } as Record<string, unknown>,
      toolName: "pm_semantic_intent_gate",
      cwd: input.project,
      reasoning:
        "pm_semantic_intent_gate persisted advanced SIC/DTC fill result into prompt-front-door contract records.",
      memoryLayers: ["semantic", "procedural"],
    });
  } catch {
    // Non-fatal — persistence already succeeded.
  }

  return { envelope, contractRefs: refs };
}

function applyPromptContinuityFailure(
  gate: ContractGateResult,
  continuity: ContractValidationResult,
): ContractGateResult {
  return {
    ...gate,
    status: "blocked_for_clarification",
    allowsRouting: false,
    reason:
      "Prompt-front-door continuity failed: " +
      continuity.issues.map((issue) => `${issue.field}: ${issue.message}`).join("; "),
    semanticIntent: {
      valid: false,
      issues: [...gate.semanticIntent.issues, ...continuity.issues],
    },
  };
}

function promptLineagePayload(input: SemanticIntentGateInput, data: {
  envelope?: PromptEnvelope;
  contractRefs?: PromptContractRefs;
}): Record<string, unknown> {
  const semanticIntentContractRef =
    data.contractRefs?.semanticIntentContractRef ?? input.semanticIntentContractRef;
  const digitalTwinChangeContractRef =
    data.contractRefs?.digitalTwinChangeContractRef ?? input.digitalTwinChangeContractRef;
  return {
    promptId: data.envelope?.promptId ?? input.promptId,
    promptHash: data.envelope?.promptHash ?? input.promptHash,
    runtime: data.envelope?.runtime ?? input.runtime ?? "unknown",
    projectRoot: data.envelope?.projectRoot ?? input.project,
    promptEnvelopeState: data.envelope?.state,
    semanticIntentContractRef,
    digitalTwinChangeContractRef,
    approvalRef: data.contractRefs?.approvalRef,
    semanticIntentApprovalRef: data.contractRefs?.semanticIntentApprovalRef,
    digitalTwinApprovalRef: data.contractRefs?.digitalTwinApprovalRef,
    contractRefs: {
      semanticIntentContractRef,
      digitalTwinChangeContractRef,
      approvalRef: data.contractRefs?.approvalRef,
      semanticIntentApprovalRef: data.contractRefs?.semanticIntentApprovalRef,
      digitalTwinApprovalRef: data.contractRefs?.digitalTwinApprovalRef,
    },
    memoryLayers: ["semantic", "procedural"],
  };
}

export async function semanticIntentGate(
  input: SemanticIntentGateInput,
): Promise<SemanticIntentGateResult> {
  if (!input.project || typeof input.project !== "string") {
    throw new Error("pm_semantic_intent_gate: `project` is required");
  }
  if (!input.rawIntent || typeof input.rawIntent !== "string") {
    throw new Error("pm_semantic_intent_gate: `rawIntent` is required");
  }

  // P3 — response shaping. Default 'turn' (slim: heavy invariant bodies relocated to
  // overflow.fullPath); 'readiness' keeps the full diagnostics inline. Gate semantics
  // are identical across views.
  const effectiveResponseView: "turn" | "readiness" = input.responseView ?? "turn";

  const semanticConsistencyResult = input.semanticConsistencyResolverInput
    ? resolveSemanticConsistency(input.semanticConsistencyResolverInput)
    : undefined;
  // Improvement #4 (ADDITIVE) — derive the LIVE registered-ontology rid set ONCE for
  // this gate invocation from the genuine governed snapshot (fail-closed: undefined
  // when unavailable ⇒ legacy). Reused by both the contract gate (semantic-consistency
  // promotion relaxation) and the ontology-DTC build-readiness gate below. Never
  // sourced from a request field.
  const registeredOntologyRids = await deriveRegisteredOntologyRids(input.project);
  const gate = assessContractGate({
    intent: input.rawIntent,
    scopePaths: Array.isArray(input.scopePaths) ? input.scopePaths : [],
    complexityHint: input.complexityHint,
    semanticIntentContractRef: input.semanticIntentContractRef,
    digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
    semanticIntentContract: input.semanticIntentContract,
    digitalTwinChangeContract: input.digitalTwinChangeContract,
    semanticConsistencyResult,
    registeredOntologyRids,
  });
  // PR-13 reservation: pin application state at Layer0IntentBridge build start so that
  // downstream tool calls read loop-start values, not in-flight updates. Full integration
  // ships when a ReasoningLoopApplicationState is materialized in this scope; until then
  // the import is referenced here to confirm the substrate is wired.
  void pinApplicationStateForReasoningLoop;
  const layer0Bridge = buildLayer0IntentBridge({
    rawIntent: input.rawIntent,
    projectRoot: input.project,
    scopePaths: input.scopePaths,
    sessionId: input.sessionId,
    promptId: input.promptId,
    promptHash: input.promptHash,
  });
  const layer0ClarificationGuards = validateClarificationGuardRails(gate.questions);
  const layer0Readiness = gradeLayer0Readiness({
    bridge: layer0Bridge,
    semanticIntentApproved: gate.semanticIntent.valid,
    digitalTwinReady: gate.digitalTwin.valid,
  });
  const turnCardDecisionQueue = buildTurnCardDecisionQueue(gate.questions);
  const userReviewCard = assertUserReviewCardBeforeDisplay(
    buildUserReviewCard(input, turnCardDecisionQueue),
  );

  const shouldDraft = shouldIncludeDrafts(input, gate);
  let draftContracts: DraftContractsInternal | undefined;
  if (shouldDraft) {
    const semanticIntent = draftSemanticIntentContract({
      intent: input.rawIntent,
      scopePaths: input.scopePaths,
      complexityHint: input.complexityHint,
    });
    draftContracts = {
      semanticIntent,
      digitalTwin: draftDigitalTwinForGate(input, input.semanticIntentContract ?? semanticIntent),
    };
  }

  const prompt = await loadPromptEnvelope(input);
  const continuity = prompt.continuity;
  const continuityGate =
    continuity && !continuity.valid
      ? applyPromptContinuityFailure(gate, continuity)
      : gate;
  const effectiveGate = applyFDEProvenanceFailure(continuityGate, input);
  // P6 (Slice B) — persist the FDE-provenance bounce as its OWN 5-dim event. Previously
  // this prerequisite surfaced only as an in-transcript error and was never written to
  // events.jsonl (diagnosis P6 part B), so the ordering decision was unauditable. The
  // predicate mirrors the internal condition of applyFDEProvenanceFailure (the gate WAS
  // routing, the intent needs FDE provenance, and no session exists) so the event fires on
  // exactly that bounce. A DISTINCT errorClass ("fde_provenance_required") keeps it from
  // colliding with the generic contract_required completion event emitted below. Best-effort.
  const fdeProvenanceBounced =
    continuityGate.allowsRouting &&
    !effectiveGate.allowsRouting &&
    effectiveGate.status === "contract_required" &&
    requiresFDEWorkflowProvenance(input) &&
    !hasFDEWorkflowProvenance(input);
  if (fdeProvenanceBounced) {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: false,
          errorClass: "fde_provenance_required",
          status: effectiveGate.status,
          contractPolicy: effectiveGate.contractPolicy,
          requiredContracts: effectiveGate.requiredContracts,
          recommendedContracts: effectiveGate.recommendedContracts,
          reason: effectiveGate.reason,
          requiredNextAction: "pm_ontology_engineering_workflow start",
          fdeOntologyEngineeringSessionRef: input.fdeOntologyEngineeringSessionRef ?? null,
          projectRoot: input.project,
          runtime: input.runtime ?? "unknown",
        } as Record<string, unknown>,
        toolName: "pm_semantic_intent_gate",
        cwd: input.project,
        reasoning:
          `pm_semantic_intent_gate: FDE-provenance bounce — status=${effectiveGate.status} ` +
          `requiredNextAction=pm_ontology_engineering_workflow start intent="${input.rawIntent.slice(0, 80)}"`,
        hypothesis:
          "Naming the exact next call (pm_ontology_engineering_workflow start) and persisting " +
          "the provenance bounce as a 5-dim event makes the front-door ordering one self-describing, " +
          "auditable hop instead of a second unpersisted error.",
        memoryLayers: ["semantic", "procedural"],
        refinementTarget: {
          kind: "rule-conformance-policy",
          filePathOrRid: "bridge/handlers/pm-semantic-intent-gate.ts",
          description:
            "Ontology Engineering intent reached the semantic gate without FDEOntologyEngineeringSession provenance; the front door requires pm_ontology_engineering_workflow start first.",
          confidenceLevel: "high",
        },
      });
    } catch {
      // Non-fatal — the gate result is returned regardless of emit failure.
    }
  }
  // Improvement #3 (ADDITIVE) — when the caller supplies a verifiable user-approval
  // envelope pointer, re-verify it FAIL-CLOSED against the hook-captured
  // PromptEnvelope (the model cannot forge it). On success the verified envelope is
  // an ALTERNATIVE satisfier for ONLY the WorkContract/RouterBinding-derived gate
  // checks; it never relaxes DTC validity, governance evidence, or approval-ref
  // presence. Absence of all three inputs ⇒ `envelopeAuthorized` stays false and the
  // gate is byte-identical to legacy.
  const dtcBuildApproval = await assessDtcBuildApprovalForGate(input);
  const envelopeAuthorized = dtcBuildApproval?.authorized === true;
  if (dtcBuildApproval !== undefined) {
    await emitDtcBuildApprovalAuditEvent(input, dtcBuildApproval);
  }
  // Improvement #4 (ADDITIVE) — reuse the LIVE registered-ontology rid set derived
  // once above (fail-closed). The gate proves a 0-new-term re-bind structurally from
  // this set; never sourced from a request field.
  const ontologyDtcBuildReadinessGate = assessSemanticGateOntologyDtcBuildReadiness({
    gateInput: input,
    gate: effectiveGate,
    semanticConsistencyResult,
    userApprovalAuthorizesDispatch: envelopeAuthorized,
    registeredOntologyRids,
  });
  let persisted =
    continuity && !continuity.valid
      ? { envelope: prompt.envelope }
      : await persistPromptContracts(input, prompt, draftContracts, semanticConsistencyResult);
  let ontologyActivation: OntologyActivation | undefined;
  if (
    isApprovedSemanticIntentContract(input.semanticIntentContract) &&
    validateSemanticIntentContract(input.semanticIntentContract).valid &&
    semanticConsistencyPromotionAllowed({
      subject: "semantic-intent-contract",
      ontologyAffecting: requiresContractApproval({
        intent: input.rawIntent,
        scopePaths: input.scopePaths,
        complexityHint: input.complexityHint,
      }),
      semanticConsistencyResult,
      attachedResolverRunRefs: input.semanticIntentContract.semanticConsistencyResultRef
        ? [input.semanticIntentContract.semanticConsistencyResultRef]
        : [],
    })
  ) {
    try {
      ontologyActivation = deriveOntologyActivation(input.semanticIntentContract);
    } catch {
      // Non-fatal — readiness/gate validity remains the authority.
    }
  }
  const semanticConversationState = buildSemanticConversationState({
    gateInput: input,
    gate: effectiveGate,
    bridge: layer0Bridge,
    turnCardDecisionQueue,
    userReviewCard,
    ontologyActivation,
    candidateSkills: [],
    contractRefs: persisted.contractRefs,
    promptEnvelope: persisted.envelope,
    semanticIntentContract: input.semanticIntentContract ?? draftContracts?.semanticIntent,
    digitalTwinChangeContract: input.digitalTwinChangeContract ?? draftContracts?.digitalTwin,
    semanticConsistencyResult,
  });
  const lineagePayload = promptLineagePayload(input, persisted);

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        passed: effectiveGate.allowsRouting,
        errorClass: effectiveGate.allowsRouting
          ? "semantic_intent_gate_completed"
          : effectiveGate.status,
        status: effectiveGate.status,
        contractPolicy: effectiveGate.contractPolicy,
        requiredContracts: effectiveGate.requiredContracts,
        recommendedContracts: effectiveGate.recommendedContracts,
        questionCount: effectiveGate.questions.length,
        turnCardDecisionCount: turnCardDecisionQueue.length,
        workflowContractProjection: true,
        draftContractsIncluded: draftContracts !== undefined,
        draftMode: input.draftMode ?? "always",
        layer0BridgeId: layer0Bridge.bridgeId,
        layer0Readiness: layer0Readiness.verdict,
        layer0GuardViolationCount: layer0ClarificationGuards.violations.length,
        semanticConversationStateId: semanticConversationState.stateId,
        semanticConversationLifecycle: semanticConversationState.lifecycle,
        semanticConsistencyResolverRunId: semanticConsistencyResult?.resolverRunId,
        semanticConsistencyConflictCount: semanticConsistencyResult?.conflicts.length ?? 0,
        semanticConsistencyPromotionReady:
          semanticConsistencyResult
            ? semanticConsistencyResult.unresolvedBlockingConflictRefs.length === 0
            : undefined,
        ...ontologyDtcReadinessPayload(ontologyDtcBuildReadinessGate),
        ...lineagePayload,
      } as Record<string, unknown>,
      toolName: "pm_semantic_intent_gate",
      cwd: input.project,
      reasoning:
        `pm_semantic_intent_gate: status=${effectiveGate.status} ` +
        `allowsRouting=${effectiveGate.allowsRouting} intent="${input.rawIntent.slice(0, 80)}"`,
      hypothesis:
        "Lead can close material ambiguity before dispatch when the gate returns " +
        "draft contract payloads and blocking clarification questions.",
      memoryLayers: ["semantic", "procedural"],
      refinementTarget: effectiveGate.allowsRouting
        ? undefined
        : {
            kind: "rule-conformance-policy",
            filePathOrRid: "bridge/handlers/pm-semantic-intent-gate.ts",
            description:
              "Semantic intent gate stopped routing before approved SemanticIntentContract and DigitalTwinChangeContract continuity was established.",
            confidenceLevel: "high",
          },
    });
  } catch {
    // Non-fatal — result is returned regardless of emit failure.
  }

  try {
    await attachContractRefsToCapsule(input.promptId, persisted.contractRefs, input.project);
    await attachSemanticConversationStateToCapsule(
      input.promptId,
      semanticConversationState,
      input.project,
    );
  } catch {
    // Non-fatal — capsule persistence is lineage enrichment, not gate authority.
  }

  // Transition UniversalOntologyEntry to reflect gate result (best-effort).
  // "clarifying" when questions remain open; "semantic-approved" when the gate allows routing.
  try {
    const entry = readCurrentUniversalOntologyEntry(input.project);
    if (entry) {
      const nextStatus = effectiveGate.allowsRouting ? "semantic-approved" : "clarifying";
      await transitionUniversalOntologyEntry({
        entry,
        nextStatus,
        refs: {
          semanticIntentContractRef: persisted.contractRefs?.semanticIntentContractRef,
          digitalTwinChangeContractRef: persisted.contractRefs?.digitalTwinChangeContractRef,
        },
        projectRoot: input.project,
      });
    }
  } catch {
    // Best-effort — gate result is authoritative; entry lifecycle is lineage enrichment.
  }

  // PR-10: transition the latest open workflow trace to "semantic-gate" (best-effort).
  try {
    const openTrace = findLatestOpenTrace(input.project);
    if (openTrace) {
      await transitionOntologyWorkflowTrace({
        projectRoot: input.project,
        trace: openTrace,
        nextMode: "semantic-gate",
        refsPatch: {
          semanticIntentContractRef:
            persisted.contractRefs?.semanticIntentContractRef ??
            input.semanticIntentContractRef,
          digitalTwinChangeContractRef:
            persisted.contractRefs?.digitalTwinChangeContractRef ??
            input.digitalTwinChangeContractRef,
        },
        sessionId: input.sessionId,
        reasoning:
          `pm_semantic_intent_gate transitions trace to semantic-gate mode; ` +
          `gate status=${effectiveGate.status} allowsRouting=${effectiveGate.allowsRouting} — ` +
          `rule 01 §ForwardProp; PR-10 wire #4`,
      });
    }
  } catch {
    // best-effort — gate result is authoritative; trace transition is lineage enrichment
  }

  // ---------------------------------------------------------------------------
  // Fill sequence dispatch (PR 5.10 + Slice 5 additive)
  // When `turn` is provided, apply one fill step to the contract.
  // fillPolicy === "fde-ontology-build" → FDE 9-step → fdeFillResult.
  // fillPolicy === "context-engineering-to-sic" → DATA/LOGIC/ACTION/GOVERNANCE → fillResult.
  // fillPolicy === "dtc-turn-fill" | "ontology-dtc-build" → DTC branch → dtcFillResult.
  // fillPolicy absent (default) → legacy 8-turn → fillResult (byte-identical).
  // Backward compat: no `turn` → no fillResult, no fdeFillResult.
  // ---------------------------------------------------------------------------
  let fillResult: SemanticIntentFillResult | undefined;
  let fdeFillResult: FDESemanticIntentFillResult | undefined;
  let dtcFillResult: DtcSemanticIntentFillResult | undefined;
  if (typeof input.turn === "number") {
    // ---------------------------------------------------------------------------
    // ADDITIVE: DTC path — fires BEFORE SIC/FDE branch.
    // Only engaged when fillPolicy is "dtc-turn-fill" or "ontology-dtc-build".
    // Backward compat: SIC-only fillPolicy or absent fillPolicy → skipped entirely.
    // ---------------------------------------------------------------------------
    if (input.fillPolicy === "dtc-turn-fill" || input.fillPolicy === "ontology-dtc-build") {
      const dtcContract: DigitalTwinChangeContract | undefined =
        input.digitalTwinChangeContract ?? draftContracts?.digitalTwin;
      if (dtcContract) {
        try {
          const seq = input.fillPolicy === "ontology-dtc-build"
            ? ONTOLOGY_DTC_BUILD_SEQUENCE
            : DTC_FILL_SEQUENCE;
          const descriptor = seq[input.turn];
          if (!descriptor) {
            throw new RangeError(
              `${input.fillPolicy}: turn ${input.turn} out of bounds (max ${seq.length - 1})`,
            );
          }
          const advanceResult = input.fillPolicy === "ontology-dtc-build"
            ? advanceOntologyDTCBuildSequence(
                dtcContract,
                input.turn,
                input.turnUserInput,
                undefined,
                sicTypedRefsFromApprovedSic(
                  input.semanticIntentContract ?? draftContracts?.semanticIntent,
                ),
              )
            : advanceDTCFillSequence(
                dtcContract,
                input.turn,
                input.turnUserInput,
                undefined,
              );
          const advanced: DtcWithFillFields = advanceResult.dtcDraft;
          const isLastTurn = input.turn === seq.length - 1;
          const nextDescriptor = seq[input.turn + 1];

          // Emit dtc_fill_turn_advanced
          try {
            await emit({
              type: "validation_phase_completed",
              payload: {
                passed: true,
                errorClass: "dtc_fill_turn_advanced",
                fillPolicy: input.fillPolicy,
                turn: input.turn,
                targetField: descriptor.targetField,
                contractId: advanced.contractId,
                dtcFillSequenceLength: advanceResult.dtcDraft.dtcFillSequence?.length ?? 0,
                verdict: (advanced as DtcWithFillFields).verdict ?? "draft",
              } as Record<string, unknown>,
              toolName: "pm_semantic_intent_gate",
              cwd: input.project,
              reasoning:
                `pm_semantic_intent_gate dtc fill T${input.turn} advanced — targetField=${descriptor.targetField}`,
              memoryLayers: ["semantic", "procedural"],
            });
          } catch { /* non-fatal */ }

          // T6 finalization → digital_twin_contract_finalized + grading dispatch
          if (isLastTurn && (advanced as DtcWithFillFields).verdict === "dtc-filled") {
            try {
              await emit({
                type: "validation_phase_completed",
                payload: {
                  passed: true,
                  errorClass: "digital_twin_contract_finalized",
                  contractId: advanced.contractId,
                  verdict: (advanced as DtcWithFillFields).verdict,
                  dtcFillSequenceLength: advanceResult.dtcDraft.dtcFillSequence?.length ?? 0,
                  projectRoot: input.project,
                  promptId: input.promptId,
                } as Record<string, unknown>,
                toolName: "pm_semantic_intent_gate",
                cwd: input.project,
                reasoning:
                  `pm_semantic_intent_gate: DigitalTwinChangeContract finalized after 7-turn DTC fill`,
                memoryLayers: ["semantic", "procedural"],
              });
            } catch { /* non-fatal */ }

            // Workflow trace transition
            try {
              const trace = findLatestOpenTrace(input.project);
              if (trace) {
                await transitionOntologyWorkflowTrace({
                  projectRoot: input.project,
                  trace,
                  nextMode: "dtc-fill-finalized",
                  refsPatch: { digitalTwinChangeContractRef: advanced.contractId },
                  sessionId: input.sessionId,
                  reasoning: "DTC 7-turn fill complete; verdict=dtc-filled",
                });
              }
            } catch { /* non-fatal */ }

            // GRADING DISPATCH (gates digital_twin_approved transition)
            try {
              const { gradeDigitalTwinChangeContract } = await import(
                "../../lib/lead-intent/dtc-grading-rubric"
              );
              const gradeResult = await gradeDigitalTwinChangeContract(advanced, {
                projectPath: input.project,
                promptId: input.promptId,
                sessionId: input.sessionId,
                runtime: input.runtime,
              });
              if (gradeResult.verdict !== "pass") {
                // Hold at digital_twin_user_review; do NOT advance to approved.
                // Emit dtc_grading_completed with refinementTarget (rule 26 §R5).
                try {
                  await emit({
                    type: "validation_phase_completed",
                    payload: {
                    passed: false,
                    errorClass: "dtc_grading_completed",
                    verdict: gradeResult.verdict,
                    overall: gradeResult.overall,
                    rubricId: gradeResult.rubricId,
                    contractId: advanced.contractId,
                    projectRoot: input.project,
                    promptId: input.promptId,
                  } as Record<string, unknown>,
                  toolName: "pm_semantic_intent_gate",
                  cwd: input.project,
                  reasoning:
                    `DTC grading dispatch completed; verdict=${gradeResult.verdict} overall=${gradeResult.overall} — DTC held at user-review; not advanced to approved`,
                  memoryLayers: ["semantic"],
                  refinementTarget: {
                    kind: "other",
                    filePathOrRid: advanced.contractId,
                    description: `DTC grading verdict=${gradeResult.verdict}; revise before approval`,
                    confidenceLevel: "high",
                  },
                });
                } catch { /* non-fatal */ }
              }
              // else: grade passed; caller proceeds with approved state externally
            } catch (gradeErr) {
              // Non-fatal — emit dtc_grader_runtime_gap
              try {
                await emit({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  type: "dtc_grader_runtime_gap" as any,
                  payload: {
                    runtime: input.runtime ?? "unknown",
                    skippedCriteria: [],
                    rubricId: "dtc-rubric/v1",
                    projectPath: input.project,
                    promptId: input.promptId,
                    sessionId: input.sessionId,
                    errorMessage: gradeErr instanceof Error ? gradeErr.message : String(gradeErr),
                  } as Record<string, unknown>,
                  toolName: "pm_semantic_intent_gate",
                  cwd: input.project,
                  reasoning:
                    `DTC grader dispatch threw unexpectedly; grading skipped for contractId=${advanced.contractId}`,
                  memoryLayers: ["semantic"],
                });
              } catch { /* non-fatal */ }
            }
          }

          dtcFillResult = {
            appliedTurn: input.turn,
            question: descriptor.question,
            contract: advanced,
            fillComplete: isLastTurn,
            ...(nextDescriptor ? { nextQuestion: nextDescriptor.question } : {}),
            policy: input.fillPolicy,
          };
        } catch (err) {
          void err; // non-fatal; absence of dtcFillResult indicates error
        }
      }
    } else {
    // ---------------------------------------------------------------------------
    // SIC fill dispatch (FDE 9-step + legacy 8-turn)
    // ---------------------------------------------------------------------------
    const baseContract =
      input.semanticIntentContract ?? draftContracts?.semanticIntent;
    if (baseContract) {
      // W3d-2b DEFAULT FLIP: an absent fillPolicy now routes to the 9-axis
      // understand-heart (was the legacy 8-turn path). Legacy 8-turn stays reachable
      // via explicit "default-8-turn" (the final `else` below). DTC policies are
      // handled above (this block is the non-DTC `else`); `selectFillSequence` now
      // also defaults absent→nine-axis-sic (W3d-2b; PR-E E7) — the legacy 8-turn
      // sequence is explicit-only via "default-8-turn".
      const effectiveFillPolicy: FillPolicy = input.fillPolicy ?? "nine-axis-sic";
      // ADDITIVE: deterministic Context Engineering -> SIC path.
      if (effectiveFillPolicy === "context-engineering-to-sic") {
        try {
          const seq = CONTEXT_ENGINEERING_TO_SIC_SEQUENCE;
          const descriptor = seq[input.turn];
          if (!descriptor) {
            throw new RangeError(
              `context-engineering-to-sic: turn ${input.turn} out of bounds (max ${seq.length - 1})`,
            );
          }
          const advanced: SicWithFillFields = advanceContextEngineeringToSicSequence(
            baseContract,
            input.turn,
            input.turnUserInput,
            undefined,
          );
          const complete = isContextEngineeringToSicReady(advanced);
          const nextDescriptor = seq[input.turn + 1];
          let fillIncomplete: string | undefined;
          if (input.turn === seq.length - 1 && !complete) {
            fillIncomplete =
              "context_engineering_to_sic_incomplete: DATA/LOGIC/ACTION/GOVERNANCE readiness is incomplete after T5.";
            try {
              await emit({
                type: "validation_phase_completed",
                payload: {
                  passed: false,
                  errorClass: "context_engineering_to_sic_incomplete",
                  turn: input.turn,
                  fillSequenceLength: advanced.fillSequence?.length ?? 0,
                  contractId: advanced.contractId,
                  advisory: false,
                } as Record<string, unknown>,
                toolName: "pm_semantic_intent_gate",
                cwd: input.project,
                reasoning:
                  `pm_semantic_intent_gate context-engineering-to-sic T${input.turn} ended without readiness; ` +
                  `contractId=${advanced.contractId} — SIC approval must fail closed`,
                memoryLayers: ["semantic", "procedural"],
              });
            } catch {
              // Non-fatal emit.
            }
          }
          fillResult = {
            appliedTurn: input.turn,
            question: descriptor.question,
            contract: advanced,
            fillComplete: complete,
            ...(fillIncomplete ? { fillIncomplete } : {}),
            ...(nextDescriptor ? { nextQuestion: nextDescriptor.question } : {}),
          };
        } catch (err) {
          void err;
        }
      } else if (effectiveFillPolicy === "fde-ontology-build") {
      // ADDITIVE: FDE 9-step path
        try {
          const seq = FDE_FILL_SEQUENCE;
          const descriptor = seq[input.turn];
          if (!descriptor) {
            throw new RangeError(
              `fde fillPolicy: turn ${input.turn} out of bounds (max ${seq.length - 1})`,
            );
          }
          const advanced: SicWithFillFields = advanceFDEFillSequence(
            baseContract,
            input.turn,
            input.turnUserInput,
            undefined,
          );
          const isLastTurn = input.turn === seq.length - 1;
          const nextDescriptor = seq[input.turn + 1];
          fdeFillResult = {
            appliedTurn: input.turn,
            question: descriptor.question,
            contract: advanced,
            fillComplete: isLastTurn,
            ...(nextDescriptor ? { nextQuestion: nextDescriptor.question } : {}),
            policy: "fde-ontology-build",
          };
        } catch (err) {
          // FDE fill errors are non-fatal; result returned without fdeFillResult.
          void err;
        }
      } else if (effectiveFillPolicy === "nine-axis-sic") {
      // 9-axis understand-heart path (T0 intent + 9 axes = 10 turns). Reached by an
      // explicit "nine-axis-sic" fillPolicy OR — since W3d-2b — by an ABSENT fillPolicy
      // (the flipped default). Produces fillResult exactly like context-engineering-to-sic,
      // plus a fail-closed incomplete emit at T9 and (W3d-2b) a finalization emit on
      // completion so the lineage row survives the default flip.
        try {
          const seq = NINE_AXIS_SIC_SEQUENCE;
          const descriptor = seq[input.turn];
          if (!descriptor) {
            throw new RangeError(
              `nine-axis-sic: turn ${input.turn} out of bounds (max ${seq.length - 1})`,
            );
          }
          // OE-14 / D1-5 — N/A reachable through the MCP gate. When the caller marks
          // the current axis not-applicable, record a USER-sourced fill step (the
          // explicit waiver) via advanceNineAxisSicSequence("(N/A)") then overwrite the
          // target axis to status:"not-applicable" — byte-mirroring answerCard's N/A
          // path. Ignored on T0 (no targetAxis). A waived axis is Q2-confirmable
          // (user-sourced step) and counts toward isNineAxisSicComplete.
          const markNotApplicable =
            input.turnNotApplicable === true && descriptor.targetAxis !== undefined;
          let advanced: SicWithFillFields;
          if (markNotApplicable) {
            const waived = advanceNineAxisSicSequence(
              baseContract,
              input.turn,
              "(N/A)",
              undefined,
            ) as SicWithFillFields & { axes?: SemanticIntentAxes };
            const axes = waived.axes ?? ({} as SemanticIntentAxes);
            const naAxis: SicAxis = { summary: "(not applicable)", refs: [], status: "not-applicable" };
            advanced = {
              ...waived,
              axes: { ...axes, [descriptor.targetAxis!]: naAxis } as SemanticIntentAxes,
            } as SicWithFillFields;
          } else {
            advanced = advanceNineAxisSicSequence(
              baseContract,
              input.turn,
              input.turnUserInput,
              undefined,
            );
          }
          const issues = nineAxisSicReadinessIssues(advanced);
          const complete = issues.length === 0;
          const isLastTurn = input.turn === seq.length - 1;
          const nextDescriptor = seq[input.turn + 1];
          let fillIncomplete: string | undefined;
          if (isLastTurn && !complete) {
            fillIncomplete =
              "nine_axis_sic_incomplete: 9-axis readiness is incomplete after T9 (" +
              issues.map((i) => i.field).join(", ") +
              ").";
            try {
              await emit({
                type: "validation_phase_completed",
                payload: {
                  passed: false,
                  errorClass: "nine_axis_sic_incomplete",
                  turn: input.turn,
                  fillSequenceLength: advanced.fillSequence?.length ?? 0,
                  missing: issues.map((i) => i.field),
                  contractId: advanced.contractId,
                  advisory: false,
                } as Record<string, unknown>,
                toolName: "pm_semantic_intent_gate",
                cwd: input.project,
                reasoning:
                  `pm_semantic_intent_gate nine-axis-sic T${input.turn} ended without readiness; ` +
                  `contractId=${advanced.contractId} — SIC approval must fail closed`,
                memoryLayers: ["semantic", "procedural"],
              });
            } catch {
              // Non-fatal emit.
            }
          } else if (isLastTurn && complete) {
            // W3d-2b: finalization emit — mirrors the legacy 8-turn
            // `semantic_intent_contract_finalized` so the contract-finalized lineage
            // row still fires once nine-axis is the flipped default (else absent-policy
            // callers would silently stop emitting it — a rule-10 regression).
            try {
              await emit({
                type: "validation_phase_completed",
                payload: {
                  passed: true,
                  errorClass: "semantic_intent_contract_finalized",
                  contractId: advanced.contractId,
                  verdict: "filled",
                  fillSequenceLength: advanced.fillSequence?.length ?? 0,
                  fillComplete: true,
                  rawIntent: advanced.rawIntent,
                  fillPolicy: "nine-axis-sic",
                  projectRoot: input.project,
                  promptId: input.promptId,
                  sessionId: input.sessionId,
                } as Record<string, unknown>,
                toolName: "pm_semantic_intent_gate",
                cwd: input.project,
                reasoning:
                  `pm_semantic_intent_gate: SemanticIntentContract finalized after 9-axis fill; ` +
                  `contractId=${advanced.contractId} — all 9 axes + intent filled (T9 complete)`,
                hypothesis:
                  "A complete 9-axis fill yields a contract with intent + all axes filled, " +
                  "enabling downstream gate assessment under the W3d-2b default-nine-axis policy.",
                memoryLayers: ["semantic", "procedural"],
              });
            } catch {
              // Non-fatal emit.
            }
          }
          // Rich non-dev turn card (additive): the CURRENT turn's card carries the
          // per-axis "why" + worked example (pulled from the descriptor) and renders the
          // Lead-proposed draft as the recommended confirm-first choice when supplied.
          // The NEXT turn's card mirrors nextQuestion (no draft — the draft applies only
          // to the turn the user is answering now).
          const turnCard = nineAxisTurnCard(
            input.turn,
            input.proposedAxisDraft ? { proposedDraft: input.proposedAxisDraft } : undefined,
          );
          const nextTurnCard = nextDescriptor ? nineAxisTurnCard(input.turn + 1) : undefined;
          fillResult = {
            appliedTurn: input.turn,
            question: descriptor.question,
            contract: advanced,
            fillComplete: complete,
            ...(fillIncomplete ? { fillIncomplete } : {}),
            ...(nextDescriptor ? { nextQuestion: nextDescriptor.question } : {}),
            turnCard,
            ...(nextTurnCard ? { nextTurnCard } : {}),
          };
        } catch (err) {
          void err;
        }
      } else {
      // LEGACY 8-turn path (kept exactly as before):
      try {
        const descriptor = EIGHT_TURN_FILL_SEQUENCE[input.turn];
        const advanced: SicWithFillFields = advanceFillSequence(
          baseContract,
          input.turn,
          input.turnUserInput,
          undefined,
        );
        const complete = isFillComplete(advanced);
        const nextDescriptor = EIGHT_TURN_FILL_SEQUENCE[input.turn + 1];

        // Advisory: incomplete at T7 → emit sic_fill_incomplete
        let fillIncomplete: string | undefined;
        if (input.turn === 7 && !complete) {
          fillIncomplete =
            "sic_fill_incomplete: required fields missing after T7 (rawIntent, confirmedIntent, affectedSurfaces, approvedNouns, approvedVerbs).";
          try {
            await emit({
              type: "validation_phase_completed",
              payload: {
                passed: false,
                errorClass: "sic_fill_incomplete",
                turn: input.turn,
                fillSequenceLength: advanced.fillSequence?.length ?? 0,
                missing: [
                  !advanced.rawIntent && "rawIntent",
                  !advanced.confirmedIntent && "confirmedIntent",
                  !(advanced.affectedSurfaces?.length) && "affectedSurfaces",
                  !(advanced.approvedNouns?.length) && "approvedNouns",
                  !(advanced.approvedVerbs?.length) && "approvedVerbs",
                ].filter(Boolean),
                contractId: advanced.contractId,
                advisory: true,
              } as Record<string, unknown>,
              toolName: "pm_semantic_intent_gate",
              cwd: input.project,
              reasoning:
                `pm_semantic_intent_gate fill T7 completed but required fields missing; ` +
                `contractId=${advanced.contractId} — advisory only, not blocking`,
              memoryLayers: ["semantic"],
            });
          } catch {
            // Non-fatal advisory emit.
          }
        }

        // T7: emit semantic_intent_contract_finalized (via validation_phase_completed envelope)
        if (input.turn === 7 && advanced.verdict === "filled") {
          try {
            await emit({
              type: "validation_phase_completed",
              payload: {
                passed: complete,
                errorClass: "semantic_intent_contract_finalized",
                contractId: advanced.contractId,
                verdict: advanced.verdict,
                fillSequenceLength: advanced.fillSequence?.length ?? 0,
                fillComplete: complete,
                rawIntent: advanced.rawIntent,
                fillPolicy: "default-8-turn", // W3d-2b: symmetry with the nine-axis finalization row (retro can distinguish the two paths)
                projectRoot: input.project,
                promptId: input.promptId,
                sessionId: input.sessionId,
              } as Record<string, unknown>,
              toolName: "pm_semantic_intent_gate",
              cwd: input.project,
              reasoning:
                `pm_semantic_intent_gate: SemanticIntentContract finalized after 8-turn fill; ` +
                `contractId=${advanced.contractId} verdict=filled — ` +
                `status transitions draft→filled; PR 5.10 §T7 finalization`,
              hypothesis:
                "Completed fill sequence yields a contract with all required fields, " +
                "enabling downstream gate assessment and grader dispatch (PR 5.13).",
              memoryLayers: ["semantic", "procedural"],
            });
          } catch {
            // Non-fatal emit.
          }
        }

        fillResult = {
          appliedTurn: input.turn,
          question: descriptor?.question ?? "",
          contract: advanced,
          fillComplete: complete,
          ...(fillIncomplete ? { fillIncomplete } : {}),
          ...(nextDescriptor ? { nextQuestion: nextDescriptor.question } : {}),
        };
      } catch (err) {
        // Fill sequence errors are non-fatal; result is returned without fillResult.
        // Callers can inspect the absence of fillResult to detect the error.
        void err;
      }
      } // end else (legacy 8-turn path)
    }
    } // end else (SIC fill dispatch — entered when fillPolicy !== "dtc-turn-fill")
  }

  persisted = await persistAdvancedFillResults(input, prompt, persisted, {
    fillResult,
    fdeFillResult,
    dtcFillResult,
  });
  const workflowContract = buildWorkflowContractProjection(
    input,
    effectiveGate,
    turnCardDecisionQueue,
    persisted.contractRefs,
    ontologyDtcBuildReadinessGate,
  );

  // ── P4 — canonical decision-body map (keyed by decisionId). Collects ONLY the
  //    projection-target specs: the clarification-question specs PLUS the layer0
  //    materialAmbiguities specs (so the layer0 id-refs dereference inline in readiness
  //    view). The nine-axis per-turn cards (fillResult.turnCard/nextTurnCard) are NOT
  //    folded in — they are NEVER targeted by a {decisionRef} (no decisionRef site draws
  //    from a nine-axis-sic:T... id) and they already ride inline via fillResult.turnCard,
  //    so folding them here would only double their full nine-axis body inline in the
  //    readiness view (where the decisions map is inline alongside fillResult).
  const projectedDecisionSpecs: TurnCardDecisionSpec[] =
    layer0Bridge.materialAmbiguities.map((q) => q.decisionSpec);
  const decisions = buildDecisionsMap(effectiveGate.questions, projectedDecisionSpecs);

  // ── P4 — project the four full-embed sites to by-id refs on SHALLOW COPIES, never
  //    mutating the live producers (effectiveGate / layer0Bridge are passed to guards /
  //    persistence above). Site (b) turnCardDecisionQueue keeps its full body (single inline home).
  const gateProjected: GateProjection = {
    ...effectiveGate,
    questions: effectiveGate.questions.map((q) => ({
      ...q,
      decisionSpec: { decisionRef: q.decisionSpec.decisionId },
    })),
  };
  const bridgeProjected: Layer0IntentBridgeProjection = {
    ...layer0Bridge,
    materialAmbiguities: layer0Bridge.materialAmbiguities.map((q) => ({
      ...q,
      decisionSpec: { decisionRef: q.decisionSpec.decisionId },
    })),
  };

  // ── P1 — heavy invariant bodies. In 'turn' view they are relocated to an overflow file
  //    (deterministically, via maxBytes:0) and OMITTED from the inline result; in 'readiness'
  //    view they (and the decisions map) stay inline. FAIL-SAFE: a sink throw falls back to
  //    emitting the bodies inline (never errors, never drops) — mirrors the MCP seam.
  const heavyBundle = {
    ontologyDtcBuildReadinessGate,
    semanticConversationState,
    decisions,
    materialAmbiguitiesFull: layer0Bridge.materialAmbiguities,
  };
  let overflow: SemanticIntentGateResult["overflow"];
  let relocateHeavyBodies = false;
  if (effectiveResponseView === "turn") {
    try {
      const serialized = JSON.stringify(heavyBundle, null, 2);
      const sink = makeOverflowFileSink(
        "pm_semantic_intent_gate",
        resolveOverflowRoot({ project: input.project }),
      );
      const bounded = await boundedReturn(
        { summary: {}, full: heavyBundle, serialized, maxBytes: 0 },
        sink,
      );
      if (bounded.bounded === true) {
        overflow = {
          fullPath: bounded.fullPath,
          bytes: bounded.bytes,
          digest: bounded.digest,
          contains: [
            "ontologyDtcBuildReadinessGate",
            "semanticConversationState",
            "decisions",
            "materialAmbiguitiesFull",
          ],
          note:
            "readiness diagnostics relocated; re-call with responseView:'readiness' or read fullPath",
        };
        relocateHeavyBodies = true;
      }
    } catch {
      // FAIL-SAFE — the sink/write failed; keep the heavy bodies inline so the gate never
      // errors and never drops an invariant body.
      overflow = undefined;
      relocateHeavyBodies = false;
    }
  }

  // ── QFS — dedup the two remaining inline decisionSpec body homes (fillResult.contract +
  //    draftContracts.semanticIntent) to by-id refs. Emit-boundary SHALLOW COPIES ONLY: never
  //    mutate the live `fillResult` / `fdeFillResult` / `draftContracts` (read by persistence +
  //    baseContract ABOVE). Fail-OPEN: ref only when the id resolves in `decisions{}`; otherwise
  //    keep the full body inline (mirrors the P1 FAIL-SAFE — no dangling ref on a caller-supplied
  //    custom SIC or a status:"pass" empty-decisions edge). Computed ONCE, view-independently, so
  //    BOTH the 'turn' and 'readiness' emit carry the identical refized shape (criterion-2 holds).
  const refOrBody = (spec: TurnCardDecisionSpec): TurnCardDecisionSpec | DecisionRef =>
    decisions[spec.decisionId] ? { decisionRef: spec.decisionId } : spec;
  const refClarificationQuestions = (
    questions: readonly SemanticClarificationQuestion[] | undefined,
  ): ClarificationQuestionsRefProjection =>
    (questions ?? []).map((q) => ({ ...q, decisionSpec: refOrBody(q.decisionSpec) }));

  const fillResultProjected: SemanticIntentFillResultProjection | undefined = fillResult
    ? {
        ...fillResult,
        contract: {
          ...fillResult.contract,
          clarificationQuestions: refClarificationQuestions(
            fillResult.contract.clarificationQuestions,
          ),
        },
      }
    : undefined;
  const fdeFillResultProjected: FDESemanticIntentFillResultProjection | undefined = fdeFillResult
    ? {
        ...fdeFillResult,
        contract: {
          ...fdeFillResult.contract,
          clarificationQuestions: refClarificationQuestions(
            fdeFillResult.contract.clarificationQuestions,
          ),
        },
      }
    : undefined;
  const draftContractsProjected: DraftContractsProjection | undefined = draftContracts
    ? {
        ...draftContracts,
        semanticIntent: {
          ...draftContracts.semanticIntent,
          clarificationQuestions: refClarificationQuestions(
            draftContracts.semanticIntent.clarificationQuestions,
          ),
        },
      }
    : undefined;

  return {
    status: effectiveGate.status,
    allowsRouting: effectiveGate.allowsRouting,
    gate: gateProjected,
    ...(ontologyDtcBuildReadinessGate && !relocateHeavyBodies
      ? { ontologyDtcBuildReadinessGate }
      : {}),
    turnCardDecisionQueue,
    workflowContract,
    promptEnvelopeLookup: prompt.lookup,
    ...(draftContractsProjected && shouldReturnDrafts(input)
      ? { draftContracts: draftContractsProjected }
      : {}),
    ...(persisted.envelope ? { promptEnvelope: persisted.envelope } : {}),
    ...(persisted.contractRefs ? { contractRefs: persisted.contractRefs } : {}),
    ...(continuity ? { promptContinuity: continuity } : {}),
    ...(userReviewCard ? { userReviewCard } : {}),
    ...(relocateHeavyBodies ? {} : { semanticConversationState }),
    ...(relocateHeavyBodies ? {} : { decisions }),
    ...(overflow ? { overflow } : {}),
    layer0: {
      bridge: bridgeProjected,
      clarificationGuards: layer0ClarificationGuards,
      readiness: layer0Readiness,
      ...(ontologyActivation ? { ontologyActivation } : {}),
    },
    ...(fillResultProjected ? { fillResult: fillResultProjected } : {}),
    ...(fdeFillResultProjected ? { fdeFillResult: fdeFillResultProjected } : {}),
    ...(dtcFillResult ? { dtcFillResult } : {}),
    ...(semanticConsistencyResult ? { semanticConsistencyResult } : {}),
  };
}

export default async function pmSemanticIntentGateHandler(
  rawArgs: unknown,
): Promise<SemanticIntentGateResult> {
  return semanticIntentGate((rawArgs ?? {}) as SemanticIntentGateInput);
}
