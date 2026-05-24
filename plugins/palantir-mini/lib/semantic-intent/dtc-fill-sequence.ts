// palantir-mini — DTC-specific 7-turn fill sequence.
// Used ONLY when SemanticIntentGate input has fillPolicy === "dtc-turn-fill".
// When absent or != "dtc-turn-fill", this module is never consulted.
// HARD INVARIANT: behavior of EIGHT_TURN_FILL_SEQUENCE + FDE_FILL_SEQUENCE preserved byte-identically.

import {
  DTC_FILL_SEQUENCE,
  type DtcTurnDescriptor,
  type DtcFillSource,
  type DtcFillStep,
} from "./fill-sequence";
import type { DigitalTwinChangeContract } from "../lead-intent/contracts";
import type {
  OntologyEngineeringRef,
  MutationSurfaceRef,
  ValidationPackRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";

// ---------------------------------------------------------------------------
// DtcWithFillFields — additive type extension
// ---------------------------------------------------------------------------

/**
 * DigitalTwinChangeContract extended with DTC fill sequence fields.
 * Additive type only — base DigitalTwinChangeContract unchanged.
 * Callers may cast in either direction; absence of these fields preserves
 * pre-v6.74.0 byte-identical behavior.
 */
export type DtcWithFillFields = DigitalTwinChangeContract & {
  readonly dtcFillSequence?: readonly DtcFillStep[];
  /**
   * DTC fill / approval verdict.
   *   draft         — initial; no fill turns completed.
   *   dtc-filled    — all 7 fill turns completed; awaiting user approval.
   *   dtc-approved  — user-approved fill (status="approved" + approvalRef set).
   */
  readonly verdict?: "draft" | "dtc-filled" | "dtc-approved";
  /** Groups fill turns within a single DTC fill session (RID-like). */
  readonly dtcFillSequenceId?: string;
};

// ---------------------------------------------------------------------------
// DtcAdvanceResult — return shape
// ---------------------------------------------------------------------------

/**
 * Result of advancing one DTC fill turn.
 */
export interface DtcAdvanceResult {
  /** The turn index that was just applied (0-6). */
  readonly appliedTurn: number;
  /** The next turn index to apply, or null if T6 was just applied (fill complete). */
  readonly nextTurn: number | null;
  /** The updated DTC contract with fill step appended and fields updated. */
  readonly dtcDraft: DtcWithFillFields;
  /** Any validation errors raised by the descriptor's validationHook (advisory). */
  readonly validationErrors: string[];
}

// ---------------------------------------------------------------------------
// advanceDTCFillSequence
// ---------------------------------------------------------------------------

/**
 * Advance the DTC fill sequence by one turn (turnIndex 0-6).
 *
 * Mirrors the shape of `advanceFDEFillSequence` from fde-fill-sequence.ts
 * but operates on DigitalTwinChangeContract with 7 turns (T0..T6).
 *
 * @param contract      Current DigitalTwinChangeContract (immutable read).
 * @param turnIndex     The DTC turn to execute (0 = T0 … 6 = T6).
 * @param userInput     Free-text answer supplied by the human user.
 * @param agentAutoFill Partial contract fields auto-filled by the routing agent.
 * @returns DtcAdvanceResult with appliedTurn, nextTurn, dtcDraft, validationErrors.
 *          On T6 sets verdict = "dtc-filled".
 */
export function advanceDTCFillSequence(
  contract: DigitalTwinChangeContract,
  turnIndex: number,
  userInput?: string,
  agentAutoFill?: Partial<DigitalTwinChangeContract>,
): DtcAdvanceResult {
  if (turnIndex < 0 || turnIndex >= DTC_FILL_SEQUENCE.length) {
    throw new RangeError(
      `advanceDTCFillSequence: turnIndex must be 0-${DTC_FILL_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }

  const ext = contract as DtcWithFillFields;
  const descriptor: DtcTurnDescriptor = DTC_FILL_SEQUENCE[turnIndex]!;
  const source: DtcFillSource =
    userInput !== undefined ? "user" : agentAutoFill !== undefined ? "agent" : "system";

  const autoFillFields: Partial<DigitalTwinChangeContract> =
    agentAutoFill !== undefined && userInput === undefined ? agentAutoFill : {};

  // ----- T0 — changeBoundary (prose, replace) -----
  const t0Fields: Partial<DigitalTwinChangeContract> =
    turnIndex === 0 && userInput !== undefined
      ? { changeBoundary: userInput.trim() }
      : {};

  // ----- T1 — branchProposalPolicy "|" permissionBoundary -----
  const t1Fields: Partial<DigitalTwinChangeContract> =
    turnIndex === 1 && userInput !== undefined
      ? (() => {
          const [branch, perm] = userInput.split("|").map((s) => s.trim());
          return {
            branchProposalPolicy: branch || contract.branchProposalPolicy,
            permissionBoundary: perm || contract.permissionBoundary,
          };
        })()
      : {};

  // ----- T2 — typed refs (NON-OVERWRITING merge by RID) -----
  const t2TypedRefs: Partial<DigitalTwinChangeContract> =
    turnIndex === 2 ? mergeTypedRefs(contract, userInput, agentAutoFill) : {};

  // ----- T3 — replayMigrationPlan (prose, replace) -----
  const t3Fields: Partial<DigitalTwinChangeContract> =
    turnIndex === 3 && userInput !== undefined
      ? { replayMigrationPlan: userInput.trim() }
      : {};

  // ----- T4 — observabilityPlan "|" toolSurfaceReadiness -----
  const t4Fields: Partial<DigitalTwinChangeContract> =
    turnIndex === 4 && userInput !== undefined
      ? (() => {
          const [obs, tool] = userInput.split("|").map((s) => s.trim());
          return {
            observabilityPlan: obs || contract.observabilityPlan,
            toolSurfaceReadiness: tool || contract.toolSurfaceReadiness,
          };
        })()
      : {};

  // ----- T5 — evaluationPlan + requiredEvaluationRefs -----
  const t5Fields: Partial<DigitalTwinChangeContract> =
    turnIndex === 5 ? mergeEvaluationFields(contract, userInput, agentAutoFill) : {};

  // ----- T6 — finalize; set verdict = "dtc-filled" -----
  const t6Fields: Partial<DtcWithFillFields> =
    turnIndex === 6 ? { verdict: "dtc-filled" } : {};

  // ----- Step record assembly -----
  const capturedRefs: string[] = [];
  if (t2TypedRefs.touchedOntologyRefs) {
    capturedRefs.push(...t2TypedRefs.touchedOntologyRefs.map((r) => String((r as { rid?: string }).rid ?? JSON.stringify(r))));
  }
  if (t5Fields.requiredEvaluationRefs) {
    capturedRefs.push(...t5Fields.requiredEvaluationRefs.map((r) => String((r as { rid?: string }).rid ?? JSON.stringify(r))));
  }

  const step: DtcFillStep = {
    step: descriptor.step,
    question: descriptor.question,
    answer: userInput ?? (agentAutoFill ? JSON.stringify(agentAutoFill) : undefined),
    filledAt: new Date().toISOString(),
    source,
    ...(capturedRefs.length > 0 ? { capturedRefs } : {}),
  };

  const existingSteps = Array.isArray(ext.dtcFillSequence) ? [...ext.dtcFillSequence] : [];
  const newDtcFillSequence: readonly DtcFillStep[] = [...existingSteps, step];

  const dtcDraft: DtcWithFillFields = {
    ...contract,
    ...autoFillFields,
    ...t0Fields,
    ...t1Fields,
    ...t2TypedRefs,
    ...t3Fields,
    ...t4Fields,
    ...t5Fields,
    ...t6Fields,
    dtcFillSequence: newDtcFillSequence,
  } as DtcWithFillFields;

  const nextTurn = turnIndex < DTC_FILL_SEQUENCE.length - 1 ? turnIndex + 1 : null;

  return {
    appliedTurn: turnIndex,
    nextTurn,
    dtcDraft,
    validationErrors: [],
  };
}

// ---------------------------------------------------------------------------
// T2 helper: NON-OVERWRITING typed-ref merge
// ---------------------------------------------------------------------------

function mergeTypedRefs(
  contract: DigitalTwinChangeContract,
  userInput: string | undefined,
  agentAutoFill: Partial<DigitalTwinChangeContract> | undefined,
): Partial<DigitalTwinChangeContract> {
  const existingTouched = contract.touchedOntologyRefs ?? [];
  const existingMutation = contract.permittedMutationSurfaces ?? [];
  const agentTouched = agentAutoFill?.touchedOntologyRefs ?? [];
  const agentMutation = agentAutoFill?.permittedMutationSurfaces ?? [];
  const userTouched: OntologyEngineeringRef[] = userInput ? parseTypedRefCsv(userInput) : [];

  const merged = dedupeRefsByRid([...existingTouched, ...agentTouched, ...userTouched]);
  const mergedMutation = dedupeMutationSurfaces([...existingMutation, ...agentMutation]);

  return {
    ...(merged.length > 0 ? { touchedOntologyRefs: merged } : {}),
    ...(mergedMutation.length > 0
      ? { permittedMutationSurfaces: mergedMutation }
      : {}),
  };
}

function dedupeMutationSurfaces(refs: readonly MutationSurfaceRef[]): MutationSurfaceRef[] {
  const seen = new Set<string>();
  const out: MutationSurfaceRef[] = [];
  for (const r of refs) {
    const key = JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function dedupeRefsByRid<T extends { rid?: string }>(refs: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of refs) {
    const key = r.rid ?? JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function parseTypedRefCsv(input: string): OntologyEngineeringRef[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [kind, ...ridParts] = entry.split(":");
      const rid = ridParts.join(":");
      return { kind, rid } as unknown as OntologyEngineeringRef;
    });
}

// ---------------------------------------------------------------------------
// T5 helper: evaluation plan + refs merge
// ---------------------------------------------------------------------------

function mergeEvaluationFields(
  contract: DigitalTwinChangeContract,
  userInput: string | undefined,
  agentAutoFill: Partial<DigitalTwinChangeContract> | undefined,
): Partial<DigitalTwinChangeContract> {
  let evaluationPlan = contract.evaluationPlan;
  let requiredEvaluationRefs: ValidationPackRef[] = [...(contract.requiredEvaluationRefs ?? [])];

  if (userInput !== undefined) {
    const [prose, csvRefs] = userInput.split("||").map((s) => s?.trim() ?? "");
    if (prose) evaluationPlan = prose;
    if (csvRefs) {
      const parsed = parseTypedRefCsv(csvRefs) as unknown as ValidationPackRef[];
      requiredEvaluationRefs = dedupeRefsByRid([...requiredEvaluationRefs, ...parsed]);
    }
  }
  if (agentAutoFill?.requiredEvaluationRefs) {
    requiredEvaluationRefs = dedupeRefsByRid([
      ...requiredEvaluationRefs,
      ...agentAutoFill.requiredEvaluationRefs,
    ]);
  }
  if (agentAutoFill?.evaluationPlan) evaluationPlan = agentAutoFill.evaluationPlan;

  return {
    evaluationPlan,
    ...(requiredEvaluationRefs.length > 0 ? { requiredEvaluationRefs } : {}),
  };
}
