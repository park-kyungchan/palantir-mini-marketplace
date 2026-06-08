// palantir-mini — 8-turn SIC fill sequence helpers (PR 5.10).
//
// Implements the deterministic T0…T7 fill workflow for SemanticIntentContract.
// Each turn writes one SicFillStep; T7 finalizes (verdict: "filled").
//
// This module uses the runtime-local SemanticIntentContract from
// lib/lead-intent/contracts and treats v1.62.0 additive fields (fillSequence,
// verdict, seedRid, gradeRubricRid) via an extension type to avoid forcing a
// schema-primitive dependency on a snapshot that predates v1.62.0.
//
// Usage:
//   const next = advanceFillSequence(contract, 0);        // T0 — record raw intent
//   const next1 = advanceFillSequence(next, 1, "scopes"); // T1 — user answer
//   const done = isFillComplete(next7);                   // true after T7

import type { SemanticIntentContract } from "../lead-intent/contracts";

// ---------------------------------------------------------------------------
// Neutral SIC fill base types — canonical home is ./sic-fill-types (W3d-1).
// Imported for local use below AND re-exported so existing importers of
// fill-sequence.ts (grade-rubric, fill-policy, the gate) keep resolving.
// ---------------------------------------------------------------------------

import type {
  SicFillSource,
  SicFillStep,
  SicWithFillFields,
  SicTurnDescriptor,
} from "./sic-fill-types";

export type {
  SicFillSource,
  SicFillStep,
  SicWithFillFields,
  SicTurnDescriptor,
} from "./sic-fill-types";

/**
 * The canonical 8-turn fill sequence (T0…T7).
 * Immutable descriptor table; actual values come from user/agent at runtime.
 */
export const EIGHT_TURN_FILL_SEQUENCE: readonly SicTurnDescriptor[] = [
  {
    turnIndex: 0,
    step: 1,
    question: "Recording raw user prompt and extracting candidate seedRid.",
    targetField: "rawIntent",
  },
  {
    turnIndex: 1,
    step: 2,
    question: "What's the smallest scope you want changed? (affectedSurfaces)",
    targetField: "affectedSurfaces",
  },
  {
    turnIndex: 2,
    step: 3,
    question: "What nouns and verbs are approved for this work? (approvedNouns + approvedVerbs)",
    targetField: "approvedNouns",
  },
  {
    turnIndex: 3,
    step: 4,
    question: "What are the non-goals — things that must NOT change? (nonGoals)",
    targetField: "nonGoals",
  },
  {
    turnIndex: 4,
    step: 5,
    question: "What is allowed and what is forbidden downstream? (downstreamAllowed + downstreamForbidden)",
    targetField: "downstreamAllowed",
  },
  {
    turnIndex: 5,
    step: 6,
    question: "What is the source of truth for evidence? (supportingResearchRefs / seedRid)",
    targetField: "seedRid",
  },
  {
    turnIndex: 6,
    step: 7,
    question: "What verdict criteria apply? (gradeRubricRid if available)",
    targetField: "gradeRubricRid",
  },
  {
    turnIndex: 7,
    step: 8,
    question: "Finalizing fill sequence — transitioning verdict to 'filled'.",
    targetField: "verdict",
  },
] as const;

// ---------------------------------------------------------------------------
// isFillComplete
// ---------------------------------------------------------------------------

/**
 * Returns true when the contract has all required fields populated and
 * `fillSequence` contains all 8 steps (T0…T7 completed).
 *
 * Required fields for "complete":
 *   rawIntent, confirmedIntent, affectedSurfaces (non-empty), approvedNouns (non-empty),
 *   approvedVerbs (non-empty).
 */
export function isFillComplete(contract: SemanticIntentContract): boolean {
  const ext = contract as SicWithFillFields;
  if (!ext.fillSequence || ext.fillSequence.length < EIGHT_TURN_FILL_SEQUENCE.length) {
    return false;
  }
  return (
    typeof contract.rawIntent === "string" && contract.rawIntent.length > 0 &&
    typeof contract.confirmedIntent === "string" && contract.confirmedIntent.length > 0 &&
    Array.isArray(contract.affectedSurfaces) && contract.affectedSurfaces.length > 0 &&
    Array.isArray(contract.approvedNouns) && contract.approvedNouns.length > 0 &&
    Array.isArray(contract.approvedVerbs) && contract.approvedVerbs.length > 0
  );
}

// ---------------------------------------------------------------------------
// advanceFillSequence
// ---------------------------------------------------------------------------

/**
 * Advance the SIC fill sequence by one turn (turnIndex 0-7).
 *
 * @param contract     Current SemanticIntentContract (immutable read).
 * @param turnIndex    The turn to execute (0 = T0 … 7 = T7).
 * @param userInput    Free-text answer supplied by the human user for this turn.
 *                     When provided, source = "user".
 * @param agentAutoFill  Partial contract fields auto-filled by the routing agent.
 *                     When provided (and userInput absent), source = "agent".
 *                     When neither provided, source = "system".
 * @returns New contract object with the fill step appended and fields updated.
 *          On T7 sets verdict = "filled" and logs finalization.
 */
export function advanceFillSequence(
  contract: SemanticIntentContract,
  turnIndex: number,
  userInput?: string,
  agentAutoFill?: Partial<SemanticIntentContract>,
): SicWithFillFields {
  if (turnIndex < 0 || turnIndex >= EIGHT_TURN_FILL_SEQUENCE.length) {
    throw new RangeError(
      `advanceFillSequence: turnIndex must be 0-${EIGHT_TURN_FILL_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }

  const ext = contract as SicWithFillFields;
  const descriptor = EIGHT_TURN_FILL_SEQUENCE[turnIndex]!;
  const source: SicFillSource =
    userInput !== undefined ? "user" : agentAutoFill !== undefined ? "agent" : "system";

  const step: SicFillStep = {
    step: descriptor.step,
    question: descriptor.question,
    answer: userInput ?? (agentAutoFill ? JSON.stringify(agentAutoFill) : undefined),
    filledAt: new Date().toISOString(),
    source,
  };

  const existingSteps = Array.isArray(ext.fillSequence) ? [...ext.fillSequence] : [];
  const newFillSequence: readonly SicFillStep[] = [...existingSteps, step];

  // Apply agent auto-fill fields (only the ones present in agentAutoFill).
  const autoFillFields: Partial<SemanticIntentContract> =
    agentAutoFill !== undefined && userInput === undefined ? agentAutoFill : {};

  // T1 — user answer goes into affectedSurfaces
  const t1Fields: Partial<SemanticIntentContract> =
    turnIndex === 1 && userInput !== undefined
      ? {
          affectedSurfaces: [
            ...contract.affectedSurfaces,
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !contract.affectedSurfaces.includes(s)),
          ],
        }
      : {};

  // T2 — user answer goes into approvedNouns + approvedVerbs (CSV)
  const t2Fields: Partial<SemanticIntentContract> =
    turnIndex === 2 && userInput !== undefined
      ? (() => {
          const parts = userInput
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          const verbs = parts.filter(
            (p) =>
              !contract.approvedVerbs.includes(p) &&
              Boolean(p.match(/^(add|remove|update|create|delete|read|write|emit|validate|resolve|compile)\b/i)),
          );
          const nouns = parts.filter(
            (p) =>
              !contract.approvedNouns.includes(p) &&
              !Boolean(p.match(/^(add|remove|update|create|delete|read|write|emit|validate|resolve|compile)\b/i)),
          );
          return {
            approvedNouns: [...contract.approvedNouns, ...nouns],
            approvedVerbs: [...contract.approvedVerbs, ...verbs],
          };
        })()
      : {};

  // T3 — user answer goes into nonGoals (CSV)
  const t3Fields: Partial<SemanticIntentContract> =
    turnIndex === 3 && userInput !== undefined
      ? {
          nonGoals: [
            ...contract.nonGoals,
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !contract.nonGoals.includes(s)),
          ],
        }
      : {};

  // T4 — user answer split by "|" into downstreamAllowed and downstreamForbidden
  const t4Fields: Partial<SemanticIntentContract> =
    turnIndex === 4 && userInput !== undefined
      ? (() => {
          const [allowedPart, forbiddenPart] = userInput.split("|");
          const allowed = (allowedPart ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !contract.downstreamAllowed.includes(s));
          const forbidden = (forbiddenPart ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !contract.downstreamForbidden.includes(s));
          return {
            downstreamAllowed: [...contract.downstreamAllowed, ...allowed],
            downstreamForbidden: [...contract.downstreamForbidden, ...forbidden],
          };
        })()
      : {};

  // T5 — user answer used as seedRid string (v1.62.0 additive field)
  const t5Fields: Partial<SicWithFillFields> =
    turnIndex === 5 && userInput !== undefined
      ? { seedRid: userInput.trim() }
      : {};

  // T6 — user answer used as gradeRubricRid string (v1.62.0 additive field)
  const t6Fields: Partial<SicWithFillFields> =
    turnIndex === 6 && userInput !== undefined
      ? { gradeRubricRid: userInput.trim() }
      : {};

  // T7 — finalize; set verdict = "filled" (v1.62.0 additive field)
  const t7Fields: Partial<SicWithFillFields> =
    turnIndex === 7 ? { verdict: "filled" } : {};

  return {
    ...contract,
    ...autoFillFields,
    ...t1Fields,
    ...t2Fields,
    ...t3Fields,
    ...t4Fields,
    ...t5Fields,
    ...t6Fields,
    ...t7Fields,
    fillSequence: newFillSequence,
  } as SicWithFillFields;
}

// ----------------------------------------------------------------------------
// v6.71.0 — FDE Slice 5 additive surface
// EIGHT_TURN_FILL_SEQUENCE + advanceFillSequence are UNCHANGED above.
// FillPolicy + selectFillSequence + FDE_FILL_SEQUENCE are exported here as a
// re-export for consumers who want the policy-aware surface.
// ----------------------------------------------------------------------------
export type { FillPolicy } from "./fill-policy";
export { FILL_POLICIES, selectFillSequence } from "./fill-policy";
export { FDE_FILL_SEQUENCE, advanceFDEFillSequence } from "./fde-fill-sequence";

// =============================================================================
// DTC Fill Sequence (T0-T6, 7 turns) — Sprint v6.74.0
// Used when SemanticIntentGate input has fillPolicy === "dtc-turn-fill".
// Backward-compat invariant: absent fillPolicy → this constant unused.
// =============================================================================

export type DtcFillSource = "user" | "agent" | "system";

export interface DtcFillStep {
  readonly step: number;
  readonly question?: string;
  readonly answer?: string;
  readonly filledAt: string;
  readonly source: DtcFillSource;
  /** RIDs of typed refs added during this turn (audit trail). */
  readonly capturedRefs?: readonly string[];
}

export interface DtcTurnDescriptor {
  readonly turnIndex: number;
  readonly step: number;
  /** Korean default text. */
  readonly question: string;
  /** English mirror — bilingual at descriptor level (per §5.12 policy). */
  readonly questionEn: string;
  /** Primary DTC prose field this turn populates. */
  readonly targetField:
    | "changeBoundary"
    | "branchProposalPolicy"
    | "permissionBoundary"
    | "replayMigrationPlan"
    | "observabilityPlan"
    | "toolSurfaceReadiness"
    | "evaluationPlan"
    | "typed-refs"
    | "verdict";
  /** Secondary fields touched. */
  readonly secondaryFields?: readonly string[];
  readonly expectedSource: "user" | "agent" | "hybrid";
  /** Function name in lib/semantic-intent/dtc-auto-fill.ts; "none" if not auto-fillable. */
  readonly autoFillStrategy: string;
  /** Validator function name in lib/lead-intent/contracts.ts to run after capture. */
  readonly validationHook: string;
}

export const DTC_FILL_SEQUENCE: readonly DtcTurnDescriptor[] = [
  {
    turnIndex: 0,
    step: 1,
    question:
      "이 변경이 건드릴 표면과 범위는 어디까지인가요? 손대지 않을 표면도 함께 알려주세요.",
    questionEn:
      "Which surfaces does this change touch (changeBoundary), and which adjacent surfaces will NOT change?",
    targetField: "changeBoundary",
    secondaryFields: ["affectedSurfaces", "structuredBoundary.changeBoundary"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillChangeBoundaryFromScopePaths",
    validationHook: "validateChangeBoundaryField",
  },
  {
    turnIndex: 1,
    step: 2,
    question:
      "어떤 ontology branch / proposal 위에서 작업하고, 어떤 권한 경계를 따르나요? (글로벌 브랜치 정책 + 권한 경계)",
    questionEn:
      "Which Global Branch + Ontology Proposal policy applies, and what permission boundary governs writes?",
    targetField: "branchProposalPolicy",
    secondaryFields: ["permissionBoundary", "requiredBranchPolicyRef", "requiredPermissionPolicyRef"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillBranchAndPermissionFromProjectPolicy",
    validationHook: "validateBranchAndPermissionFields",
  },
  {
    turnIndex: 2,
    step: 3,
    question:
      "어떤 ontology 리소스(ObjectType / LinkType / ActionType / Function)가 닿나요? 변경 가능한 표면도 알려주세요.",
    questionEn:
      "Which typed ontology refs (ObjectType / LinkType / ActionType / Function) are touched? Which mutation surfaces are permitted?",
    targetField: "typed-refs",
    secondaryFields: ["touchedOntologyRefs", "permittedMutationSurfaces"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillTypedRefsFromImpactQuery",
    validationHook: "validateTypedRefsForOntologyAffecting",
  },
  {
    turnIndex: 3,
    step: 4,
    question:
      "replay / backfill / migration이 필요한가요? 필요하다면 절차와 롤백 경로는 무엇인가요?",
    questionEn:
      "What replay/backfill/migration is required, and what's the rollback path?",
    targetField: "replayMigrationPlan",
    secondaryFields: ["risks[kind=replay-migration]"],
    expectedSource: "user",
    autoFillStrategy: "none",
    validationHook: "validateReplayMigrationPlanField",
  },
  {
    turnIndex: 4,
    step: 5,
    question:
      "observability와 tool-surface 준비 상태는 어떤가요? 어떤 이벤트/지표가 결정 lineage를 입증하나요?",
    questionEn:
      "What observability evidence proves the change works, and which tool surfaces are ready (vs degraded)?",
    targetField: "observabilityPlan",
    secondaryFields: ["toolSurfaceReadiness", "risks[kind=observability,tool-surface]"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillObservabilityFromEventCatalog",
    validationHook: "validateObservabilityAndToolSurfaceFields",
  },
  {
    turnIndex: 5,
    step: 6,
    question:
      "어떤 AIP Evaluation suite / validation pack이 이 변경을 검증하나요?",
    questionEn:
      "Which AIP evaluation suites + validation packs gate this change?",
    targetField: "evaluationPlan",
    secondaryFields: ["requiredEvaluationRefs", "risks[kind=evaluation]"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillEvaluationRefsFromProjectPolicy",
    validationHook: "validateEvaluationPlanAndRefs",
  },
  {
    turnIndex: 6,
    step: 7,
    question:
      "DTC fill 마무리 — verdict를 'dtc-filled'로 전환합니다. 남은 open risk가 있나요?",
    questionEn:
      "Finalize DTC fill — transition verdict to 'dtc-filled'. Any remaining open risks?",
    targetField: "verdict",
    secondaryFields: ["risks"],
    expectedSource: "agent",
    autoFillStrategy: "finalizeDtcVerdict",
    validationHook: "validateDigitalTwinChangeContract",
  },
] as const;

// Re-export DTC fill sequence helpers (dtc-fill-sequence.ts is the companion module).
export { advanceDTCFillSequence } from "./dtc-fill-sequence";
export type { DtcWithFillFields, DtcAdvanceResult } from "./dtc-fill-sequence";
