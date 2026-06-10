/**
 * @stable — TurnCardDecisionSpec primitive (SIC/DTC consolidation, v1.83.0)
 *
 * Runtime-neutral decision contract surfaced inside a clarification turn.
 * A Codex/Claude adapter renders this as ordinary assistant text and records
 * the user's answer as a UserDecisionRecord — the spec itself carries no
 * runtime-specific rendering assumptions.
 *
 * Promoted from the plugin runtime type
 * lib/lead-intent/contracts.ts (TurnCardDecisionSpec + TurnCardDecisionChoice)
 * to schema-level authority so the canonical SemanticClarificationQuestion can
 * reference it without an uphill import from lib/. As of the consolidation,
 * lib/lead-intent/contracts.ts re-exports these shapes from this primitive
 * rather than re-declaring them.
 *
 * @owner palantirkc-ontology
 * @since v1.83.0
 */

/** One selectable option within a TurnCardDecisionSpec. */
export interface TurnCardDecisionChoice {
  readonly choiceId: string;
  readonly label: string;
  readonly consequence: string;
  readonly recommended?: boolean;
  readonly stateEffectPreview?: string;
  readonly contractPatchPreview?: Record<string, unknown>;
}

/** A user-facing decision contract for one clarification turn. */
export interface TurnCardDecisionSpec {
  readonly decisionId: string;
  readonly phase: string;
  readonly plainKoreanTitle: string;
  readonly plainKoreanSummary: string;
  readonly whyItMatters: string;
  readonly recommendedChoiceId: string;
  readonly choices: readonly TurnCardDecisionChoice[];
  readonly evidenceRefs: readonly string[];
  readonly blocking: boolean;
  readonly freeTextAllowed: boolean;
  readonly stateEffectPreview?: string;
  readonly contractPatchPreview?: Record<string, unknown>;
}
