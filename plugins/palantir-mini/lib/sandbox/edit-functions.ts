/**
 * Executor EditFunction registration (Hands layer) — W3e-3b.
 *
 * Registers the pure compute function the `Executor` Tier-2 ActionType
 * forward-names via `editFunctionName` (W3e-3a self-model). The 2-stage edit
 * seam (verified LIVE 2026-06-08): registerEditFunction({name, apply}) →
 * applyEditFunction(name, params) → OntologyEdit[] → commitEdits({edits}).
 * `apply` is PURE — it MUST NOT commit; persistence is commitEdits' job only.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Executor pure EditFunction (applyEditSteps) registration (W3e-3b)
 */

import type { OntologyEdit } from "../event-log/types";
import { registerEditFunction } from "../actions/tier2-function";

/**
 * MUST equal `EXECUTOR_ACTION_TYPE.editFunctionName` in the self-model snapshot
 * (…/ontology/self/executor.actiontype.ts) so the typed MEANING and the runtime
 * reconcile. Equality is asserted in tests/sandbox/executor-write-path.test.ts.
 */
export const EXECUTOR_EDIT_FUNCTION_NAME = "pm.sandbox.executor.applyEditSteps";

export interface ApplyEditStepsParams {
  /** Pre-proposed ontology edits an "edit" exec-step carries. */
  readonly proposedEdits: readonly OntologyEdit[];
}

const VALID_EDIT_KINDS: ReadonlySet<string> = new Set(["object", "link", "interface"]);

function isOntologyEdit(value: unknown): value is OntologyEdit {
  if (!value || typeof value !== "object") return false;
  const e = value as { kind?: unknown; rid?: unknown };
  return typeof e.rid === "string" && typeof e.kind === "string" && VALID_EDIT_KINDS.has(e.kind);
}

/**
 * Pure compute: validate + collect the proposed OntologyEdit[]. NEVER commits —
 * the executor transports the returned edits into commitEdits, which is the sole
 * ontology persist path. Throws on a malformed edit (mechanical guarantee that
 * only well-formed OntologyEdits reach the commit stage).
 */
export function applyEditSteps(params: ApplyEditStepsParams): OntologyEdit[] {
  const proposed = params?.proposedEdits ?? [];
  const edits: OntologyEdit[] = [];
  for (const candidate of proposed) {
    if (!isOntologyEdit(candidate)) {
      throw new Error(
        "applyEditSteps: malformed OntologyEdit (need kind ∈ {object,link,interface} + string rid)",
      );
    }
    edits.push(candidate);
  }
  return edits;
}

// Side-effect: register under the ActionType's forward-named editFunctionName.
registerEditFunction<ApplyEditStepsParams>({
  name: EXECUTOR_EDIT_FUNCTION_NAME,
  description:
    "Executor edit step — pure compute that validates and returns the proposed " +
    "OntologyEdit[]; persistence is via commitEdits only (never writes the ontology).",
  apply: applyEditSteps,
});
