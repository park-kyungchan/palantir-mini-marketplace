// Binding-scope gate (ledger row P440, contracts/ontology-binding.contract
// .json's `bindingScope` field, execution-plan.md section 6.3).
//
// `contracts/ontology-binding.contract.json`'s own `bindingScope`
// description fixes the exact per-value ceiling: "read" authorizes up to
// READ_OR_QUERY, "proposal" up to and including PROPOSAL, "commit" up to
// and including COMMIT (LINEAGE_APPENDED is the automatic append-only
// follow-on to a successful COMMIT, never a separately-scoped step). This
// module is the ONE place that ceiling is enforced — every altitude2
// function that could advance a session past its binding's authorized step
// (`proposal.ts`, `dry-run.ts`, `governance-check.ts`, `commit-routing.ts`)
// calls `isStateWithinBindingScope` rather than re-deriving the ceiling
// itself, so "read-only paths stop before proposal" (mission bullet) is one
// structural fact, not four independently-maintained ones.

import { OPERATION_STATES, type OperationState } from "./operation-state-machine";
import type { BindingScope } from "./types";

const STATE_INDEX: ReadonlyMap<OperationState, number> = new Map(OPERATION_STATES.map((s, i) => [s, i]));

const MAX_STATE_FOR_SCOPE: Readonly<Record<BindingScope, OperationState>> = {
  read: "READ_OR_QUERY",
  proposal: "PROPOSAL",
  commit: "LINEAGE_APPENDED",
};

/** Is `state` at or before the maximum operation-chain step `bindingScope` authorizes? */
export function isStateWithinBindingScope(bindingScope: BindingScope, state: OperationState): boolean {
  const ceiling = STATE_INDEX.get(MAX_STATE_FOR_SCOPE[bindingScope])!;
  const actual = STATE_INDEX.get(state)!;
  return actual <= ceiling;
}
