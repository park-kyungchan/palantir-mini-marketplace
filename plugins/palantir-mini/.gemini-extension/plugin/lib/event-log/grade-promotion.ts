/**
 * palantir-mini — Value-grade promotion functions (rule 26 §Substrate routing)
 * @owner palantirkc-plugin-events
 * @purpose Pure promotion functions: T1→T2, T2→T3, T3→T4 (append-only; never mutate source)
 *
 * Per canonical plan v2 §4 row 4.2 + rule 10 §append-only + rule 26 §T0-T4 routing.
 *
 * Authority chain:
 *   research/palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md
 *     ↓
 *   schemas/ontology/primitives/value-grade.ts (T0-T4 tiers)
 *     ↓
 *   lib/event-log/grade-promotion.ts (this file)
 *     ↓
 *   scripts/replay-promote-grades.ts (offline batch job)
 *
 * INVARIANT: source events are NEVER mutated. Each promotion function returns
 * a NEW EventEnvelope with updated `valueGrade` + `payload.promotedFrom` audit
 * trail. The original event is preserved unchanged in events.jsonl.
 */

import type { EventEnvelope } from "./types";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";

// ─── Evidence contracts ─────────────────────────────────────────────────────

/**
 * Evidence required to promote a T1 event to T2.
 * Per rule 26 §Grading: T2 = T1 + B axis ≥1 (outcome-paired).
 */
export interface T1ToT2Evidence {
  /**
   * EventId of the `outcome_pair_audited` or `validation_phase_completed` event
   * that closes the outcome pair for the source event.
   */
  outcomePairEventId: string;
  /**
   * Optional OutcomePairingRid (lineageRefs.outcomePairId) linking the source
   * to its paired result.
   */
  outcomePairId?: string;
  /** Human-readable note explaining why the promotion is warranted. */
  rationale?: string;
}

/**
 * Evidence required to promote a T2 event to T3.
 * Per rule 26 §Grading: T3 = T2 + C axis ≥1 (refinement-target cited).
 */
export interface T2ToT3Evidence {
  /**
   * Typed refinement target that this event feeds. Required on T3+ per rule
   * 26 §Axis C2 (refinement target typed).
   */
  refinementTarget: {
    kind: string;
    filePathOrRid: string;
    description: string;
    confidenceLevel: string;
  };
  /** Memory layer(s) this event refines. Required at T2+ per rule 26 §Axis E. */
  memoryLayers?: readonly string[];
  /** Human-readable rationale for the refinement. */
  rationale?: string;
}

/**
 * Evidence required to promote a T3 event to T4.
 * Per rule 26 §D2 dual-mode:
 *   - D2-canonical: ≥2 distinct byWhom.identity attestations.
 *   - D2-fallback: single-vendor-attested with kLlmConsensus marker.
 */
export interface T3ToT4Evidence {
  /**
   * D2-canonical: list of distinct attestation identities (must be ≥2 for
   * canonical path). Use the `byWhom.identity` values from each attesting
   * `validation_phase_completed` event.
   */
  attestingIdentities?: readonly string[];
  /**
   * D2-fallback: set to "single-vendor-attested" when only one identity is
   * available. Produces T4-eligible-with-caveat per rule 26 §D2.
   */
  kLlmConsensus?: "dual-vendor-canonical" | "single-vendor-attested";
  /** Confidence tier (lower for D2-fallback). */
  confidenceTier?: "high" | "lower";
  /** EventIds of the validation_phase_completed events providing attestation. */
  attestationEventIds?: readonly string[];
  /** Human-readable rationale. */
  rationale?: string;
}

// ─── Promotion result type ──────────────────────────────────────────────────

export interface PromotionResult {
  /** The new promoted envelope to be appended to events.jsonl. */
  promotedEnvelope: Omit<EventEnvelope, "sequence">;
  /** The grade before promotion (for callers that need to record the delta). */
  previousGrade: ValueGrade;
  /** The grade after promotion. */
  newGrade: ValueGrade;
}

// ─── Pure promotion functions ───────────────────────────────────────────────

/**
 * Promotes a T1 event to T2 by attaching outcome-pair evidence.
 *
 * Returns null when:
 *   - source.valueGrade is not "T1"
 *   - evidence.outcomePairEventId is empty
 *
 * The returned envelope has:
 *   - `valueGrade = "T2"`
 *   - `byWhom.agent = "grade-promotion-job"`
 *   - `withWhat.refinementTarget.kind = "other"` carrying grade-promotion metadata
 *   - `payload.promotedFrom = "T1"` audit trail
 *   - `lineageRefs.outcomePairId` populated when evidence carries it
 */
export function promoteT1ToT2(
  source: EventEnvelope,
  evidence: T1ToT2Evidence,
): PromotionResult | null {
  if (source.valueGrade !== "T1") return null;
  if (!evidence.outcomePairEventId || evidence.outcomePairEventId.trim().length === 0) return null;

  const promoted = buildPromotedEnvelope(source, "T2", {
    promotedFrom: "T1",
    promotionKind: "T1_to_T2_outcome_paired",
    outcomePairEventId: evidence.outcomePairEventId,
    ...(evidence.outcomePairId ? { outcomePairId: evidence.outcomePairId } : {}),
    ...(evidence.rationale ? { rationale: evidence.rationale } : {}),
  });

  // Attach outcomePairId to lineageRefs when provided
  if (evidence.outcomePairId) {
    const existing = promoted.lineageRefs ?? {};
    (promoted as Record<string, unknown>).lineageRefs = {
      ...existing,
      outcomePairId: evidence.outcomePairId,
    };
  }

  return { promotedEnvelope: promoted, previousGrade: "T1", newGrade: "T2" };
}

/**
 * Promotes a T2 event to T3 by attaching a typed refinement target.
 *
 * Returns null when:
 *   - source.valueGrade is not "T2"
 *   - evidence.refinementTarget fields are empty/invalid
 *
 * The returned envelope has:
 *   - `valueGrade = "T3"`
 *   - `withWhat.refinementTarget` populated with the evidence target
 *   - `withWhat.memoryLayers` updated if evidence provides them
 *   - `payload.promotedFrom = "T2"` audit trail
 */
export function promoteT2ToT3(
  source: EventEnvelope,
  evidence: T2ToT3Evidence,
): PromotionResult | null {
  if (source.valueGrade !== "T2") return null;
  if (
    !evidence.refinementTarget.kind ||
    !evidence.refinementTarget.filePathOrRid ||
    !evidence.refinementTarget.description
  ) {
    return null;
  }

  const promoted = buildPromotedEnvelope(source, "T3", {
    promotedFrom: "T2",
    promotionKind: "T2_to_T3_refinement_targeted",
    refinementTarget: evidence.refinementTarget,
    ...(evidence.rationale ? { rationale: evidence.rationale } : {}),
  });

  // Inject refinementTarget into withWhat
  const existingWithWhat = promoted.withWhat ?? {};
  (promoted as Record<string, unknown>).withWhat = {
    ...existingWithWhat,
    refinementTarget: evidence.refinementTarget,
    ...(evidence.memoryLayers && evidence.memoryLayers.length > 0
      ? { memoryLayers: evidence.memoryLayers }
      : {}),
  };

  return { promotedEnvelope: promoted, previousGrade: "T2", newGrade: "T3" };
}

/**
 * Promotes a T3 event to T4 via D2-canonical (≥2 identities) or D2-fallback
 * (single-vendor-attested).
 *
 * Returns null when:
 *   - source.valueGrade is not "T3"
 *   - neither D2-canonical (attestingIdentities ≥2) nor D2-fallback
 *     (kLlmConsensus = "single-vendor-attested") conditions are met
 *
 * The returned envelope has:
 *   - `valueGrade = "T4"`
 *   - `withWhat.kLlmConsensus` and `withWhat.confidenceTier` per rule 26 §D2
 *   - `payload.promotedFrom = "T3"` audit trail
 *   - `payload.d2Path` = "canonical" | "fallback"
 */
export function promoteT3ToT4(
  source: EventEnvelope,
  evidence: T3ToT4Evidence,
): PromotionResult | null {
  if (source.valueGrade !== "T3") return null;

  const canonicalIdentities = evidence.attestingIdentities ?? [];
  const uniqueIdentities = new Set(canonicalIdentities);
  const isCanonical = uniqueIdentities.size >= 2;
  const isFallback = evidence.kLlmConsensus === "single-vendor-attested";

  if (!isCanonical && !isFallback) return null;

  const d2Path = isCanonical ? "canonical" : "fallback";
  const kLlmConsensus = isCanonical ? "dual-vendor-canonical" : "single-vendor-attested";
  const confidenceTier = isCanonical ? "high" : (evidence.confidenceTier ?? "lower");

  const promoted = buildPromotedEnvelope(source, "T4", {
    promotedFrom: "T3",
    promotionKind: "T3_to_T4_d2_attested",
    d2Path,
    kLlmConsensus,
    confidenceTier,
    ...(evidence.attestationEventIds ? { attestationEventIds: evidence.attestationEventIds } : {}),
    ...(evidence.rationale ? { rationale: evidence.rationale } : {}),
    ...(isCanonical ? { attestingIdentities: Array.from(uniqueIdentities) } : {}),
  });

  // Inject kLlmConsensus + confidenceTier into withWhat
  const existingWithWhat = promoted.withWhat ?? {};
  (promoted as Record<string, unknown>).withWhat = {
    ...existingWithWhat,
    kLlmConsensus,
    confidenceTier,
  };

  return { promotedEnvelope: promoted, previousGrade: "T3", newGrade: "T4" };
}

// ─── Internal builder ───────────────────────────────────────────────────────

/**
 * Builds the promotion envelope skeleton shared by all three functions.
 * Sets:
 *   - type = same as source
 *   - byWhom.agent = "grade-promotion-job"
 *   - withWhat.refinementTarget = grade-promotion pointer
 *   - valueGrade = targetGrade
 *   - payload = { ...source.payload, promotedFrom: source.valueGrade, ...promotionMeta }
 *
 * All other fields (eventId, when, atopWhich, throughWhich, sequence-free)
 * are inherited from the source so the promoted event is traceable back to
 * its origin.
 */
function buildPromotedEnvelope(
  source: EventEnvelope,
  targetGrade: ValueGrade,
  promotionMeta: Record<string, unknown>,
): Omit<EventEnvelope, "sequence"> {
  const sourceGrade = source.valueGrade ?? "T0";

  return {
    ...source,
    // Promoted envelope carries same eventId + timestamp as source for
    // deduplication in downstream readers — callers should treat this as
    // a supplemental record pointing back to the source via lineageRefs.
    byWhom: {
      ...source.byWhom,
      agentName: "grade-promotion-job",
    },
    withWhat: {
      ...(source.withWhat ?? {}),
      reasoning: `Grade promoted ${sourceGrade}→${targetGrade} by grade-promotion-job (rule 26 §Substrate routing + canonical plan v2 §4 row 4.2)`,
      refinementTarget: {
        kind: "other",
        filePathOrRid: "lib/event-log/grade-promotion.ts",
        description: `Promoted event ${source.eventId} from ${sourceGrade} to ${targetGrade} via offline replay job`,
        confidenceLevel: "high",
      },
    },
    lineageRefs: {
      ...(source.lineageRefs ?? {}),
      actionRid: source.eventId as string,
    },
    valueGrade: targetGrade,
    payload: {
      ...(source.payload as Record<string, unknown>),
      ...promotionMeta,
    },
  } as Omit<EventEnvelope, "sequence">;
}
