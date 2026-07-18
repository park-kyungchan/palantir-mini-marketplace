// Semantic Intent Contract (SIC) aggregate (ledger row P410). Implements
// A1-003 against `contracts/semantic-intent.contract.json` (P330, thin
// fingerprint-bearing envelope — unchanged by P410, see this report's S2
// "Key design decision" section).
//
// A1-003 ("A SemanticIntentContract records user-approved meaning with
// traceable FDE and prompt provenance; raw prompt capture or runtime
// metadata cannot approve it"):
//   - `SicBody` (the object `proposeSic` fingerprints, never itself part of
//     the wire `SicRecord`) carries `fdeProvenance` (session + turn ids —
//     traceable FDE provenance) and `promptProvenanceRef` (a typed pointer
//     to the originating prompt/decision record, never raw prompt text).
//   - `approveSic` requires a `UserDecisionEvidence` object
//     (`src/semantic-core/user-decision-evidence.ts`) that is independently
//     verified — `isIndependentEvidence` rejects evidence whose
//     `verifiedBy.identity` equals the proposing actor, so approval can
//     never be self-derived, and a bare boolean/tool-success value or a
//     free-text string is rejected by `isUserDecisionEvidence` before
//     independence is even checked.

import { fingerprintBody, isFingerprintShaped } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { isIndependentEvidence, isUserDecisionEvidence, type UserDecisionEvidence } from "../semantic-core/user-decision-evidence";
import type { ReasonCode } from "../semantic-core/reason-codes";
import { transitionSession, type FdeSession } from "./fde-session";
import { type AggregateResult, denied, ok, type Actor } from "./types";

export type SicStatus = "draft" | "approved" | "superseded";

/**
 * The approved body a SIC's `bodyFingerprint` binds to (ADR-004: "a
 * content hash of the exact approved SIC ... body"). Never itself
 * schema-validated by a `contracts/*.contract.json` file at this wave —
 * only its fingerprint travels in the durable `SicRecord`.
 */
export interface SicBody {
  readonly sicId: string;
  readonly fdeSessionId: string;
  readonly approvedMeaning: string;
  readonly fdeProvenance: {
    readonly sessionId: string;
    readonly turnIds: readonly string[];
  };
  readonly promptProvenanceRef: string;
  readonly acceptedHypotheses: readonly string[];
  readonly rejectedHypotheses: readonly string[];
}

export interface SicRecord {
  readonly schemaVersion: string;
  readonly sicId: string;
  readonly fdeSessionId: string;
  readonly status: SicStatus;
  readonly bodyFingerprint: string;
  readonly proposedAt: string;
  readonly approvedAt?: string;
  readonly byWhom: Actor;
  readonly reasonCode?: ReasonCode;
}

const SCHEMA_VERSION = "1.0.0";

/**
 * Proposes a SIC from an FDE session at `FDE_OPEN`. Fails closed
 * (A1-005) when the body's own `fdeSessionId` does not match the session
 * being proposed against, or when the session is not at the one legal
 * state this transition may start from.
 */
export function proposeSic(
  session: FdeSession,
  body: SicBody,
  proposedAt: string,
  byWhom: Actor,
): AggregateResult<{ session: FdeSession; sic: SicRecord }> {
  if (body.fdeSessionId !== session.sessionId) {
    return denied("RC-SCHEMA-VALIDATION-FAILED", `SIC body fdeSessionId "${body.fdeSessionId}" does not match session "${session.sessionId}"`);
  }

  const transitioned = transitionSession(session, "SIC_PROPOSED");
  if (!transitioned.ok) return transitioned;

  const bodyFingerprint = fingerprintBody(body as unknown as CanonicalizableValue);
  const sic: SicRecord = {
    schemaVersion: SCHEMA_VERSION,
    sicId: body.sicId,
    fdeSessionId: session.sessionId,
    status: "draft",
    bodyFingerprint,
    proposedAt,
    byWhom,
  };
  return ok({ session: transitioned.value, sic });
}

/**
 * Approves a proposed SIC. Fails closed (A1-003, A1-005) on: session not
 * at `SIC_PROPOSED`; malformed/absent evidence; evidence derived from the
 * proposing actor (not independent); or a presented fingerprint that does
 * not match the SIC's own recorded `bodyFingerprint` (a forged or stale
 * reference — "merely referenced by free text" can never satisfy this
 * check, since only an exact 64-hex-char match is accepted).
 */
export function approveSic(
  session: FdeSession,
  sic: SicRecord,
  presentedFingerprint: string,
  evidence: UserDecisionEvidence,
  approvedAt: string,
): AggregateResult<{ session: FdeSession; sic: SicRecord }> {
  const transitioned = transitionSession(session, "SIC_APPROVED");
  if (!transitioned.ok) return transitioned;

  if (!isUserDecisionEvidence(evidence)) {
    return denied("RC-STATE-EVIDENCE-MISSING", "SIC approval requires independently verified user-decision evidence; none or malformed evidence was provided");
  }
  if (!isIndependentEvidence(evidence, sic.byWhom.identity)) {
    return denied("RC-STATE-EVIDENCE-MISSING", `SIC approval evidence was verified by "${evidence.verifiedBy.identity}", the same identity that proposed the SIC — not independently verified`);
  }
  if (!isFingerprintShaped(presentedFingerprint) || presentedFingerprint !== sic.bodyFingerprint) {
    return denied("RC-STATE-STALE-FINGERPRINT", `presented fingerprint does not match sic "${sic.sicId}"'s recorded bodyFingerprint`);
  }

  const approvedSic: SicRecord = { ...sic, status: "approved", approvedAt };
  return ok({ session: transitioned.value, sic: approvedSic });
}
