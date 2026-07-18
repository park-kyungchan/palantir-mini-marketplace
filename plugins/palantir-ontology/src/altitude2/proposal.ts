// Proposal (ledger row P440, A2-005): the first of the three distinct
// mutation steps ("Dry-run, proposal, and commit paths are distinct").
//
// `proposeOperation` requires `session.state === "READ_OR_QUERY"` (the
// operation chain's own adjacency rule — a session must have opened its
// read lane before it can propose) AND
// `isStateWithinBindingScope(session.binding.bindingScope, "PROPOSAL")`
// (the binding's own ceiling — a `bindingScope: "read"` session is denied
// here with `RC-BINDING-SCOPE-INSUFFICIENT`, the concrete mechanism behind
// "Read-only paths stop before proposal", execution-plan.md section 6.3).
// The proposal itself is typed and scoped (`Proposal`'s `targetIdentities`/
// `allowedAction`/`writeScope`), never a free-text change description
// standing in for a structured mutation intent.

import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { isStateWithinBindingScope } from "./binding-scope";
import { assertLegalTransition } from "./operation-state-machine";
import { isNamedIdentifier, type AggregateResult, denied, ok, type OperationSession, type Proposal } from "./types";

const RC_BINDING_SCOPE_INSUFFICIENT: ReasonCode = "RC-BINDING-SCOPE-INSUFFICIENT";

const CITED_CODES: readonly ReasonCode[] = [RC_BINDING_SCOPE_INSUFFICIENT, RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("proposal.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

function isWellFormedProposal(proposal: Proposal): boolean {
  return (
    Array.isArray(proposal.targetIdentities) &&
    proposal.targetIdentities.length > 0 &&
    proposal.targetIdentities.every(isNamedIdentifier) &&
    typeof proposal.allowedAction === "string" &&
    proposal.allowedAction.length > 0 &&
    Array.isArray(proposal.writeScope) &&
    proposal.writeScope.length > 0 &&
    typeof proposal.description === "string" &&
    proposal.description.length > 0
  );
}

/**
 * A2-005: proposes a typed, scoped mutation. Denies (never silently
 * accepts) a malformed proposal, a session not yet at `READ_OR_QUERY`, or a
 * binding whose scope does not reach `PROPOSAL`.
 */
export function proposeOperation(session: OperationSession, proposal: Proposal): AggregateResult<OperationSession> {
  if (!isWellFormedProposal(proposal)) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, "proposeOperation: proposal is malformed (empty/non-named targetIdentities, allowedAction, or writeScope)");
  }
  if (!isStateWithinBindingScope(session.binding.bindingScope, "PROPOSAL")) {
    return denied(
      RC_BINDING_SCOPE_INSUFFICIENT,
      `proposeOperation: session "${session.sessionId}"'s binding scope "${session.binding.bindingScope}" does not authorize PROPOSAL (read-only paths stop before proposal)`,
    );
  }
  const check = assertLegalTransition(session.state, "PROPOSAL");
  if (!check.ok) {
    return denied(check.reasonCode, `session "${session.sessionId}": ${check.detail}`);
  }
  return ok({ ...session, state: "PROPOSAL", proposal });
}
