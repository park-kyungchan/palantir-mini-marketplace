// Dry-run (ledger row P440, A2-005, execution-plan.md section 6.4's
// "dry-run fingerprint" envelope field).
//
// `performDryRun` computes the SAME canonical `sha256(canonicalize(body))`
// fingerprint `src/semantic-core/fingerprint.ts#fingerprintBody` already
// defines for SIC/DTC bodies (ADR-004), applied here to the session's
// `proposal` — the exact write-plan the eventual mutation-authority
// envelope's `dryRunFingerprint` field must match at commit time
// (`src/governance/commit-gate.ts`'s check 10,
// `deps.actualDryRunFingerprint()` vs. `envelope.dryRunFingerprint`). This
// is the concrete mechanism that makes "dry-run, proposal, and commit paths
// distinct" (A2-005) auditable: the fingerprint is computed once here, from
// the exact proposal body, and any later drift between what was proposed
// and what a caller tries to commit is caught by that gate check, not by
// this module re-deriving live state.

import { fingerprintBody } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { isStateWithinBindingScope } from "./binding-scope";
import { assertLegalTransition } from "./operation-state-machine";
import { type AggregateResult, denied, ok, type OperationSession } from "./types";

const RC_BINDING_SCOPE_INSUFFICIENT: ReasonCode = "RC-BINDING-SCOPE-INSUFFICIENT";

const CITED_CODES: readonly ReasonCode[] = [RC_BINDING_SCOPE_INSUFFICIENT, RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("dry-run.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

/**
 * Computes the dry-run fingerprint over `session.proposal` and advances the
 * session to `DRY_RUN`. Requires `session.state === "PROPOSAL"` (a session
 * must have a proposal attached before it can be dry-run) and a binding
 * scope that reaches `DRY_RUN` (`bindingScope: "commit"` only — `"proposal"`
 * stops at `PROPOSAL` itself, `binding-scope.ts`'s `MAX_STATE_FOR_SCOPE`).
 */
export function performDryRun(session: OperationSession): AggregateResult<OperationSession> {
  if (session.proposal === undefined) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `performDryRun: session "${session.sessionId}" has no proposal attached`);
  }
  if (!isStateWithinBindingScope(session.binding.bindingScope, "DRY_RUN")) {
    return denied(
      RC_BINDING_SCOPE_INSUFFICIENT,
      `performDryRun: session "${session.sessionId}"'s binding scope "${session.binding.bindingScope}" does not authorize DRY_RUN`,
    );
  }
  const check = assertLegalTransition(session.state, "DRY_RUN");
  if (!check.ok) {
    return denied(check.reasonCode, `session "${session.sessionId}": ${check.detail}`);
  }
  const dryRunFingerprint = fingerprintBody(session.proposal as unknown as CanonicalizableValue);
  return ok({ ...session, state: "DRY_RUN", dryRunFingerprint });
}
