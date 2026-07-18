// Digital Twin Change Contract (DTC) aggregate (ledger row P410). Implements
// A1-004/A1-005 against `contracts/digital-twin-change.contract.json`
// (P330, thin fingerprint-bearing envelope — unchanged by P410).
//
// A1-004 ("A DigitalTwinChangeContract is derived from approved SIC, FDE
// evidence, DATA/LOGIC/ACTION context, technology recommendation,
// validation plan, typed refs, and explicit approval provenance"):
// `DtcBody` carries every one of those named fields directly —
// `sicFingerprint` (derived-from-approved-SIC pointer), `fdeEvidenceRefs`,
// `dataContext`/`logicContext`/`actionContext` (A1-007's DATA/LOGIC/ACTION
// separation, made concrete here), `technologyRecommendation`,
// `validationPlan`, `typedRefs`, and `approvalProvenance`.
//
// A1-005 ("Ontology-affecting routing fails closed when approved SIC/DTC
// bodies or required provenance are absent, stale, inconsistent, or merely
// referenced by free text"): `proposeDtc` fails closed unless the session
// is exactly at `SIC_APPROVED` AND the body's `sicFingerprint` exactly
// equals the approved SIC's own `bodyFingerprint` (never a free-text
// reference — an exact 64-hex-char equality check, same discipline as
// `semantic-intent.ts`'s `approveSic`).
//
// The DTC's own 3-verdict terminal outcome (`dtc-filled | dtc-rejected |
// dtc-aborted`, P230 section 3.1) is captured entirely at the DTC-record
// level. Only `dtc-filled` advances the parent session's own status to
// `DTC_APPROVED` (execution-plan.md section 6.3's strictly linear chain has
// no back-edge); `dtc-rejected`/`dtc-aborted` leave the session at
// `DTC_PROPOSED` with no further legal transition in this construction
// lane — a deliberate consequence of the linear chain, not a gap: a
// rejected/aborted attempt is preserved with provenance on the terminal
// DTC record, and continuing construction requires a fresh FDE session,
// which is a Lead/return-to-Lead decision explicitly out of P410's scope
// (P420 owns staged-construction readiness/return-to-Lead conditions).
//
// No function in this file (or anywhere in this package) advances a
// session past `DTC_APPROVED`, issues a mutation-authority envelope, or
// commits anything — `CONSTRUCTION_STAGED`/`VALIDATED`/
// `MUTATION_AUTHORITY_ISSUED`/`COMMITTED` remain states the construction
// state machine recognizes structurally (so illegal-transition tests can
// cover the full chain) but that no aggregate function in P410 reaches.

import { fingerprintBody, isFingerprintShaped } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { isIndependentEvidence, isUserDecisionEvidence, type UserDecisionEvidence } from "../semantic-core/user-decision-evidence";
import { isRegisteredReasonCode, type ReasonCode } from "../semantic-core/reason-codes";
import { transitionSession, type FdeSession } from "./fde-session";
import type { SicRecord } from "./semantic-intent";
import { type AggregateResult, denied, ok, type Actor } from "./types";

export type DtcStatus = "draft" | "approved" | "superseded";
export type DtcVerdict = "dtc-filled" | "dtc-rejected" | "dtc-aborted";

/** The approved body a DTC's `bodyFingerprint` binds to. Never itself schema-validated by a contract file at this wave. */
export interface DtcBody {
  readonly dtcId: string;
  readonly sicFingerprint: string;
  readonly fdeEvidenceRefs: readonly string[];
  readonly dataContext: string;
  readonly logicContext: string;
  readonly actionContext: string;
  readonly technologyRecommendation: string;
  readonly validationPlan: string;
  readonly typedRefs: readonly string[];
  readonly approvalProvenance: {
    readonly sicApprovedBy: string;
    readonly sicApprovedAt: string;
  };
}

export interface DtcRecord {
  readonly schemaVersion: string;
  readonly dtcId: string;
  readonly sicFingerprint: string;
  readonly status: DtcStatus;
  readonly bodyFingerprint: string;
  readonly verdict?: DtcVerdict;
  readonly proposedAt: string;
  readonly finalizedAt?: string;
  readonly byWhom: Actor;
  readonly reasonCode?: ReasonCode;
}

const SCHEMA_VERSION = "1.0.0";

/**
 * Proposes a DTC against an approved SIC. Fails closed (A1-005) unless the
 * session is at `SIC_APPROVED` and `body.sicFingerprint` exactly matches
 * the approved SIC's own `bodyFingerprint`.
 */
export function proposeDtc(
  session: FdeSession,
  sic: SicRecord,
  body: DtcBody,
  proposedAt: string,
  byWhom: Actor,
): AggregateResult<{ session: FdeSession; dtc: DtcRecord }> {
  const transitioned = transitionSession(session, "DTC_PROPOSED");
  if (!transitioned.ok) return transitioned;

  if (sic.status !== "approved") {
    return denied("RC-STATE-STALE-FINGERPRINT", `sic "${sic.sicId}" is not approved (status "${sic.status}") — a DTC may only be proposed against an approved SIC`);
  }
  if (!isFingerprintShaped(body.sicFingerprint) || body.sicFingerprint !== sic.bodyFingerprint) {
    return denied("RC-STATE-STALE-FINGERPRINT", `DTC body sicFingerprint does not match the approved SIC "${sic.sicId}"'s recorded bodyFingerprint`);
  }

  const bodyFingerprint = fingerprintBody(body as unknown as CanonicalizableValue);
  const dtc: DtcRecord = {
    schemaVersion: SCHEMA_VERSION,
    dtcId: body.dtcId,
    sicFingerprint: body.sicFingerprint,
    status: "draft",
    bodyFingerprint,
    proposedAt,
    byWhom,
  };
  return ok({ session: transitioned.value, dtc });
}

/**
 * Finalizes a proposed DTC with one of the 3 terminal verdicts. Fails
 * closed on: session not at `DTC_PROPOSED`; malformed/absent or
 * non-independent evidence; or (for `dtc-rejected`/`dtc-aborted`) a missing
 * or unregistered `reasonCode` (the contract's "required context on a
 * dtc-rejected or dtc-aborted verdict", never a free-text reason). Only
 * `dtc-filled` advances the session to `DTC_APPROVED`.
 */
export function finalizeDtc(
  session: FdeSession,
  dtc: DtcRecord,
  verdict: DtcVerdict,
  evidence: UserDecisionEvidence,
  finalizedAt: string,
  reasonCode?: ReasonCode,
): AggregateResult<{ session: FdeSession; dtc: DtcRecord }> {
  if (session.status !== "DTC_PROPOSED") {
    return denied("RC-STATE-SKIPPED-TRANSITION", `session "${session.sessionId}" is at "${session.status}", not "DTC_PROPOSED" — DTC finalization is not legal from here`);
  }
  if (!isUserDecisionEvidence(evidence)) {
    return denied("RC-STATE-EVIDENCE-MISSING", "DTC finalization requires independently verified user-decision evidence; none or malformed evidence was provided");
  }
  if (!isIndependentEvidence(evidence, dtc.byWhom.identity)) {
    return denied("RC-STATE-EVIDENCE-MISSING", `DTC finalization evidence was verified by "${evidence.verifiedBy.identity}", the same identity that proposed the DTC — not independently verified`);
  }

  if (verdict === "dtc-filled") {
    const transitioned = transitionSession(session, "DTC_APPROVED");
    if (!transitioned.ok) return transitioned;
    const approvedDtc: DtcRecord = {
      ...dtc,
      status: "approved",
      verdict,
      finalizedAt,
      ...(reasonCode !== undefined ? { reasonCode } : {}),
    };
    return ok({ session: transitioned.value, dtc: approvedDtc });
  }

  // dtc-rejected | dtc-aborted: terminal for this DTC, session does not advance.
  if (reasonCode === undefined || !isRegisteredReasonCode(reasonCode)) {
    return denied("RC-SCHEMA-VALIDATION-FAILED", `verdict "${verdict}" requires a registered reasonCode explaining the disposition`);
  }
  const supersededDtc: DtcRecord = { ...dtc, status: "superseded", verdict, finalizedAt, reasonCode };
  return ok({ session, dtc: supersededDtc });
}
