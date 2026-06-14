// palantir-mini test fixture — OE-2 (OP-2 / D3-1) genuinely-minted approved SIC.
//
// The register seam now RE-VERIFIES the persisted approved-SIC snapshot via
// `isApprovedSemanticIntentContract` (unforgeable minted approvalRef) instead of
// trusting a caller-supplied `status:"approved"` string. Tests that drive the
// direct `register` seam therefore must seed a GENUINELY minted snapshot — built by
// running the 9-axis turn engine to completion (every step source === "user") then
// `approveSemanticIntentContract` (the Q2 hard gate). This helper mints that snapshot
// and persists it onto the project's workflow state so register authorizes.

import {
  draftSemanticIntentContract,
  type SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { advanceNineAxisSicSequence } from "../../lib/semantic-intent/nine-axis-sic-fill-sequence";
import {
  approveSemanticIntentContract,
  type ApprovedSemanticIntentContract,
} from "../../lib/semantic-intent/approved-contract";

/** One realistic user answer per nine-axis turn (T0 intent + 9 SACRED axes). */
const NINE_AXIS_ANSWERS = [
  "build a grading dashboard",
  "Student, Assignment, Grade",
  "weighted average per rubric",
  "publish final grades to students",
  "teacher approves before publish",
  "rubric.md, gradebook.csv",
  "every student has a final grade",
  "do not expose other students' grades",
  "teacher runs it, admin authorizes",
  "prior term's rubric decision",
] as const;

/**
 * Mint a GENUINE approved SemanticIntentContract: run the 9-axis turn engine to
 * completion (each step user-sourced), then approve through the Q2 hard gate. The
 * result carries an unforgeable minted `approvalRef` — `isApprovedSemanticIntentContract`
 * returns true for it.
 */
export function mintApprovedSemanticIntentContract(
  contractId?: string,
): ApprovedSemanticIntentContract {
  let sic: SemanticIntentContract = draftSemanticIntentContract({
    intent: "mint approved SIC for register gate",
    ...(contractId !== undefined ? { contractId } : {}),
  });
  for (let turn = 0; turn < NINE_AXIS_ANSWERS.length; turn++) {
    sic = advanceNineAxisSicSequence(sic, turn, NINE_AXIS_ANSWERS[turn]) as SemanticIntentContract;
  }
  const result = approveSemanticIntentContract(sic, { approverIdentity: "test-harness" });
  if (!result.ok) {
    throw new Error(
      `mintApprovedSemanticIntentContract: approval refused (${result.reason}); fixture cannot mint a snapshot`,
    );
  }
  return result.contract;
}
