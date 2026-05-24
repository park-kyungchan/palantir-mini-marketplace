/**
 * palantir-mini v4.10.0 — D2 K-LLM consensus axis (rule 26 §5-Axes 14-Criteria §D)
 * Sprint-056 W3.C2
 *
 * Pure stateless function: evaluateD2Consensus
 *
 * Determines whether a given envelope qualifies for T4 D2 (K-LLM consensus) promotion.
 * Criteria:
 *   - ≥ 2 distinct byWhom.identity values have emitted matching verdict-shaped
 *     envelopes (validation_phase_completed with same errorClass) on the same
 *     lineageRefs.actionRid within a 24h sliding window.
 *
 * Authority: ~/.claude/rules/26-valuable-data-standard.md §5-Axes §D2
 *            DC5-02 #2 K-LLM consensus definition
 */

import type { EventEnvelope } from "../event-log/types";

/** Subset of envelope fields needed for consensus evaluation. */
export interface EnvelopeForConsensus {
  type?: string;
  when?: string;
  byWhom?: { identity?: string };
  lineageRefs?: { actionRid?: string };
  payload?: Record<string, unknown>;
}

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Returns true when ≥ 2 distinct LLM identities (`byWhom.identity`) have
 * emitted matching verdict-shaped envelopes (validation_phase_completed with
 * same errorClass) on the same lineageRefs.actionRid within 24h of the
 * current envelope's `when` timestamp.
 *
 * Stateless / deterministic: same inputs always produce the same result.
 *
 * @param envelope   The candidate envelope being graded
 * @param recentEvents  Recent events array (last 24h of the project log, sliced by caller)
 */
export function evaluateD2Consensus(
  envelope: EnvelopeForConsensus,
  recentEvents: Array<EnvelopeForConsensus | EventEnvelope>,
): boolean {
  // Only verdict-shaped envelopes participate in consensus
  if (envelope.type !== "validation_phase_completed") return false;

  const actionRid = envelope.lineageRefs?.actionRid;
  if (!actionRid) return false;

  const errorClass = (envelope.payload as Record<string, unknown> | undefined)?.errorClass;
  if (!errorClass) return false;

  const envelopeWhen = envelope.when ? Date.parse(envelope.when) : Date.now();
  if (!Number.isFinite(envelopeWhen)) return false;

  // Collect distinct identities that emitted matching envelopes within 24h
  const matchingIdentities = new Set<string>();

  // Also count the current envelope's own identity as a candidate
  const selfIdentity = envelope.byWhom?.identity;
  if (selfIdentity) matchingIdentities.add(selfIdentity);

  for (const ev of recentEvents) {
    if (ev.type !== "validation_phase_completed") continue;

    const evActionRid = (ev as EnvelopeForConsensus).lineageRefs?.actionRid;
    if (evActionRid !== actionRid) continue;

    const evErrorClass = ((ev as EnvelopeForConsensus).payload as Record<string, unknown> | undefined)?.errorClass;
    if (evErrorClass !== errorClass) continue;

    const evWhen = ev.when ? Date.parse(ev.when) : NaN;
    if (!Number.isFinite(evWhen)) continue;

    // Must be within 24h window of the candidate envelope
    if (Math.abs(envelopeWhen - evWhen) > WINDOW_MS) continue;

    const identity = (ev as EnvelopeForConsensus).byWhom?.identity;
    if (identity) matchingIdentities.add(identity);
  }

  return matchingIdentities.size >= 2;
}
