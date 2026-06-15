/**
 * sic-backed-readiness — the GENUINE, UNFORGEABLE digital-twin readiness grade.
 *
 * BACKGROUND (the dead gate it repairs): the FDE readiness evaluator
 * (`evaluateFDEReadinessProfile`) can NEVER return `readyForDigitalTwin === true`
 * because every FDE_READINESS_PROFILE has `allowsDtcDraft: false` (and the
 * evaluator ANDs that into the grade). An ingest-built session has
 * `readinessProfile === undefined` and therefore falls to that always-false
 * evaluator; the former `passedReadinessProfile()` that stamped a passing grade
 * was deleted for fabricating, and nothing replaced it — so no session could
 * reach `register` via a sanctioned path.
 *
 * THE FIX (anti-fabrication-honoring): grade digital-twin readiness from GENUINE,
 * UNFORGEABLE evidence instead of the dead flag — the RE-VERIFIED minted approved
 * SemanticIntentContract snapshot (persisted on the workflow state by `approve_sic`),
 * which itself passed the Q2 per-axis user-confirmation HARD GATE (source==='user',
 * non-empty fillSequence) inside `approveSemanticIntentContract`. A caller cannot
 * forge an approved SIC: `isApprovedSemanticIntentContract` requires status==='approved'
 * AND a minted `approvalRef`, neither of which a model adapter can synthesize. The
 * empty-ontology guard (`objectCandidates > 0`) forbids registering nothing.
 *
 * This grade is an ADDITIONAL, independent signal — it never replaces elevate's
 * authorized-intent gate (SIC+DTC approved + readyForDigitalTwin intent) nor the
 * register seam's contract-approval re-verify; it is OR'd alongside the existing
 * `readinessProfile.readyForDigitalTwin === true` check.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Genuine, unforgeable digital-twin readiness grade (minted approved SIC + candidates)
 */

import { isApprovedSemanticIntentContract } from "../semantic-intent/approved-contract";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import type { FDEOntologyEngineeringSession } from "../fde-ontology-engineering/types";

/**
 * Whether digital-twin readiness is GENUINELY backed for this session: the
 * persisted approved-SIC snapshot re-verifies as a minted approved contract AND
 * the session carries at least one ingested object candidate (no empty-ontology
 * register).
 *
 * PURE. The `approvedSicSnapshot` MUST be sourced from the persisted workflow
 * store by the caller (handler), NEVER from a caller-supplied MCP input param —
 * otherwise a caller could forge the readiness this function grades.
 */
export function sicBackedDigitalTwinReady(
  approvedSicSnapshot: SemanticIntentContract | undefined,
  session: FDEOntologyEngineeringSession,
): boolean {
  return (
    isApprovedSemanticIntentContract(approvedSicSnapshot) &&
    (session.objectCandidates?.length ?? 0) > 0
  );
}
