// Governance check (ledger row P440, A2-006).
//
// A2-006 ("Permissions and security checks are enforced separately from
// submission criteria, approval evidence, policy, governance, and runtime
// tool availability"): `runGovernanceCheck` collects
// `submissionCriteriaResult` and `permissionDecisionRef` from two
// INDEPENDENT, caller-injected deps functions into two SEPARATE session
// fields — it never merges them into one boolean, and it never itself
// RESOLVES `permissionDecisionRef` to allow/deny (that resolution is
// `src/governance/commit-gate.ts#resolveMutationAuthority`'s own check 8,
// run only later, inside the single commit gate, from `commit-routing.ts`).
// This mirrors `contracts/mutation-authority.contract.json`'s own envelope
// shape, which keeps `submissionCriteriaResult` and `permissionDecisionRef`
// as two distinct fields for the exact same reason (P220 section 8.4's
// "criteria-without-permission"/"permission-without-criteria" gap the
// mutation-authority envelope already closes).

import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { isStateWithinBindingScope } from "./binding-scope";
import { assertLegalTransition } from "./operation-state-machine";
import { type AggregateResult, denied, ok, type OperationSession, type SubmissionCriteriaResult } from "./types";

const RC_BINDING_SCOPE_INSUFFICIENT: ReasonCode = "RC-BINDING-SCOPE-INSUFFICIENT";

const CITED_CODES: readonly ReasonCode[] = [RC_BINDING_SCOPE_INSUFFICIENT, RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("governance-check.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface GovernanceCheckDeps {
  /** Evaluates submission criteria for `session.proposal`, independent of permission. */
  readonly evaluateSubmissionCriteria: (session: OperationSession) => SubmissionCriteriaResult;
  /** Names (never resolves) the permission/security decision reference to consult for this session. Resolution happens only inside the single commit gate. */
  readonly permissionDecisionRef: (session: OperationSession) => string;
}

/**
 * Requires `session.state === "DRY_RUN"` (a dry-run fingerprint must exist
 * before governance can check it) and a binding scope reaching
 * `GOVERNANCE_CHECK` (`bindingScope: "commit"` only).
 */
export function runGovernanceCheck(session: OperationSession, deps: GovernanceCheckDeps): AggregateResult<OperationSession> {
  if (session.dryRunFingerprint === undefined) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `runGovernanceCheck: session "${session.sessionId}" has no dryRunFingerprint attached`);
  }
  if (!isStateWithinBindingScope(session.binding.bindingScope, "GOVERNANCE_CHECK")) {
    return denied(
      RC_BINDING_SCOPE_INSUFFICIENT,
      `runGovernanceCheck: session "${session.sessionId}"'s binding scope "${session.binding.bindingScope}" does not authorize GOVERNANCE_CHECK`,
    );
  }
  const check = assertLegalTransition(session.state, "GOVERNANCE_CHECK");
  if (!check.ok) {
    return denied(check.reasonCode, `session "${session.sessionId}": ${check.detail}`);
  }

  const submissionCriteriaResult = deps.evaluateSubmissionCriteria(session);
  const permissionDecisionRef = deps.permissionDecisionRef(session);
  if (typeof permissionDecisionRef !== "string" || permissionDecisionRef.length === 0) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, "runGovernanceCheck: permissionDecisionRef must be a non-empty string reference");
  }

  return ok({ ...session, state: "GOVERNANCE_CHECK", submissionCriteriaResult, permissionDecisionRef });
}
