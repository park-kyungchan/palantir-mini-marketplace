// palantir-mini — FDE-specific 9-step fill sequence (Slice 5, sprint-138).
//
// Implements the FDE ontology-build fill workflow for SemanticIntentContract.
// Used ONLY when SemanticIntentGate input has fillPolicy === "fde-ontology-build".
// When fillPolicy is absent (default), this module is never consulted and all
// behavior is byte-identical to v6.70.0 (EIGHT_TURN_FILL_SEQUENCE path).
//
// INVARIANT: EIGHT_TURN_FILL_SEQUENCE + advanceFillSequence in fill-sequence.ts
// are NEVER imported here, preventing circular mutation risk.

import type {
  SicTurnDescriptor,
  SicFillSource,
  SicFillStep,
  SicWithFillFields,
} from "./fill-sequence";
import type { SemanticIntentContract } from "../lead-intent/contracts";

// ---------------------------------------------------------------------------
// FDE_FILL_SEQUENCE — 9-step ontology-build sequence
// ---------------------------------------------------------------------------

/**
 * The canonical 9-step FDE ontology-build fill sequence (T0…T8).
 * Used when fillPolicy === "fde-ontology-build".
 * Steps cover mission → objects → links → actions → functions →
 * chatbot studio → governance/eval → finalization.
 */
export const FDE_FILL_SEQUENCE: readonly SicTurnDescriptor[] = [
  {
    turnIndex: 0,
    step: 1,
    question:
      "What real operational decision are we improving? (rawIntent + use case)",
    targetField: "rawIntent",
  },
  {
    turnIndex: 1,
    step: 2,
    question:
      "Who makes that decision, and what evidence do they need? (missionDecision)",
    targetField: "affectedSurfaces",
  },
  {
    turnIndex: 2,
    step: 3,
    question:
      "Which real-world entities or events must exist as ontology objects? (objectTypes)",
    targetField: "approvedNouns",
  },
  {
    turnIndex: 3,
    step: 4,
    question:
      "Which traversable business relationships are link types (vs hidden SQL joins)? (linkTypes)",
    targetField: "approvedNouns",
  },
  {
    turnIndex: 4,
    step: 5,
    question:
      "Which actions record the decision or perform writeback? Which submission criteria? (actionWriteback)",
    targetField: "approvedVerbs",
  },
  {
    turnIndex: 5,
    step: 6,
    question:
      "Which reusable business logic lives in functions (vs unreviewed helpers)? (functions)",
    targetField: "approvedVerbs",
  },
  {
    turnIndex: 6,
    step: 7,
    question:
      "Which AIP Chatbot Studio scope and tools are scoped enough? (chatbotStudio)",
    targetField: "affectedSurfaces",
  },
  {
    turnIndex: 7,
    step: 8,
    question:
      "Which branch/proposal/review/eval/audit evidence is required before production? (governance + eval)",
    targetField: "gradeRubricRid",
  },
  {
    turnIndex: 8,
    step: 9,
    question:
      "Finalize FDE readiness — verdict and ready-for-semantic-approval decision.",
    targetField: "verdict",
  },
] as const;

// ---------------------------------------------------------------------------
// advanceFDEFillSequence — mirrors advanceFillSequence for FDE_FILL_SEQUENCE
// ---------------------------------------------------------------------------

/**
 * Advance the FDE fill sequence by one turn (turnIndex 0-8).
 *
 * Mirrors the shape of `advanceFillSequence` from fill-sequence.ts but
 * consults FDE_FILL_SEQUENCE (9 steps) instead of EIGHT_TURN_FILL_SEQUENCE.
 *
 * @param contract     Current SemanticIntentContract (immutable read).
 * @param turnIndex    The FDE turn to execute (0 = T0 … 8 = T8).
 * @param userInput    Free-text answer supplied by the human user.
 * @param agentAutoFill  Partial contract fields auto-filled by the routing agent.
 * @returns New contract object with the FDE fill step appended and fields updated.
 *          On T8 sets verdict = "filled".
 */
export function advanceFDEFillSequence(
  contract: SemanticIntentContract,
  turnIndex: number,
  userInput?: string,
  agentAutoFill?: Partial<SemanticIntentContract>,
): SicWithFillFields {
  if (turnIndex < 0 || turnIndex >= FDE_FILL_SEQUENCE.length) {
    throw new RangeError(
      `advanceFDEFillSequence: turnIndex must be 0-${FDE_FILL_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }

  const ext = contract as SicWithFillFields;
  const descriptor = FDE_FILL_SEQUENCE[turnIndex]!;
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

  // T1 — decision-maker / mission; user answer goes into affectedSurfaces
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

  // T2 — ontology object types; user answer goes into approvedNouns
  const t2Fields: Partial<SemanticIntentContract> =
    turnIndex === 2 && userInput !== undefined
      ? {
          approvedNouns: [
            ...contract.approvedNouns,
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !contract.approvedNouns.includes(s)),
          ],
        }
      : {};

  // T3 — link types; user answer goes into approvedNouns (relationship nouns)
  const t3Fields: Partial<SemanticIntentContract> =
    turnIndex === 3 && userInput !== undefined
      ? {
          approvedNouns: [
            ...(t2Fields.approvedNouns ?? contract.approvedNouns),
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !(t2Fields.approvedNouns ?? contract.approvedNouns).includes(s)),
          ],
        }
      : {};

  // T4 — action writeback; user answer goes into approvedVerbs
  const t4Fields: Partial<SemanticIntentContract> =
    turnIndex === 4 && userInput !== undefined
      ? {
          approvedVerbs: [
            ...contract.approvedVerbs,
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !contract.approvedVerbs.includes(s)),
          ],
        }
      : {};

  // T5 — functions; user answer goes into approvedVerbs (reusable logic)
  const t5Fields: Partial<SemanticIntentContract> =
    turnIndex === 5 && userInput !== undefined
      ? {
          approvedVerbs: [
            ...(t4Fields.approvedVerbs ?? contract.approvedVerbs),
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !(t4Fields.approvedVerbs ?? contract.approvedVerbs).includes(s)),
          ],
        }
      : {};

  // T6 — chatbot studio scope; user answer goes into affectedSurfaces
  const t6Fields: Partial<SemanticIntentContract> =
    turnIndex === 6 && userInput !== undefined
      ? {
          affectedSurfaces: [
            ...(t1Fields.affectedSurfaces ?? contract.affectedSurfaces),
            ...userInput
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0 && !(t1Fields.affectedSurfaces ?? contract.affectedSurfaces).includes(s)),
          ],
        }
      : {};

  // T7 — governance + eval; user answer used as gradeRubricRid
  const t7Fields: Partial<SicWithFillFields> =
    turnIndex === 7 && userInput !== undefined
      ? { gradeRubricRid: userInput.trim() }
      : {};

  // T8 — finalize; set verdict = "filled"
  const t8Fields: Partial<SicWithFillFields> =
    turnIndex === 8 ? { verdict: "filled" } : {};

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
    ...t8Fields,
    fillSequence: newFillSequence,
  } as SicWithFillFields;
}
