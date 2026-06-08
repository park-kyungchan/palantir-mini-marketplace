/**
 * palantir-mini SELF-ONTOLOGY — Executor as a registered ActionType instance
 * (M-SELF deliverable #2, harness redesign W3e-3a). Takes the self/ ObjectType +
 * ActionType register count from 1 → 2 (this is the first ActionType instance:
 * `ACTION_TYPE_REGISTRY.register`-grep over self/ goes 0 → 1).
 *
 * THE LATENCY THIS UN-LATENTS: the ActionType primitive *type* has shipped at
 * `../primitives/action-type.ts` for many versions, but pm had never modeled its
 * OWN Hands layer as a typed Action. This file models the neutral Executor — the
 * sandbox that runs an argv-safe exec sequence (shell via Session.run + ontology-
 * source edits) and commits any resulting OntologyEdit[] ATOMICALLY through
 * commitEdits, NEVER writing the ontology directly. It is a Tier-2 Function-Backed
 * Action: it wraps an EditFunction (which computes Edits[] without committing) and
 * commits with submission-criteria pre-flight + worktree discard on rejection.
 *
 * Ontology-first (rule 01): this ActionType is the typed MEANING of the executor;
 * the runtime impl (`lib/sandbox/executor.ts`, W3e-3b) is downstream and may land
 * AFTER this declaration. `editFunctionName` forward-names the EditFunction the
 * runtime will register via `registerEditFunction` — a string contract, NO lib
 * import uphill (the snapshot stays the authority, not the runtime).
 *
 * Authority chain (rule 01): research/palantir → primitives/action-type.ts (the
 *   type) → THIS file (the registered instance) → W3.5 dogfood
 *   (propagation_audit_forward over the self-model with pm AS subject).
 *
 * @owner palantirkc-ontology
 * @purpose Second registered self-Ontology instance (M-SELF, harness redesign W3e-3a)
 */

import {
  type Tier2FunctionBackedAction,
  ACTION_TYPE_REGISTRY,
  actionTypeRid,
} from "../primitives/action-type";

/** Stable RID for the self-Ontology Executor ActionType. */
export const EXECUTOR_ACTION_TYPE_RID = actionTypeRid(
  "pm.self.ontology/action-type/executor",
);

/**
 * The v1 exec-step vocabulary the neutral Executor runs (DTC-gate-strict scope):
 *   "shell" — argv-safe shell via the sandbox `Session.run` (NO pipes/redirects in v1)
 *   "edit"  — ontology-source edits, returned as OntologyEdit[] (NO general file edits)
 *
 * LOCAL guard (no lib import — the self-model owns this vocabulary). Mirrors the
 * AXIS_KEYS idiom of the W3d exemplar: `as const satisfies` rejects a non-canonical
 * entry, and the `[Canonical] extends [member]` check rejects a MISSING one — so the
 * step set can't drift from `CanonicalExecStepKind` in either direction. The
 * `stepKind` parameter type below is DERIVED from EXEC_STEP_KINDS, so the declared
 * surface can't drift from the vocabulary either.
 */
type CanonicalExecStepKind = "shell" | "edit";
const EXEC_STEP_KINDS = ["shell", "edit"] as const satisfies readonly CanonicalExecStepKind[];
type ExecStepKind = (typeof EXEC_STEP_KINDS)[number];
type _ExecStepKindsComplete = [CanonicalExecStepKind] extends [ExecStepKind] ? true : never;
const _execStepKindsComplete: _ExecStepKindsComplete = true;
void _execStepKindsComplete;

/** Derived `stepKind` parameter type literal — single-sourced from EXEC_STEP_KINDS. */
const STEP_KIND_TYPE = EXEC_STEP_KINDS.map((kind) => `"${kind}"`).join(" | ");

/**
 * Executor modeled as a Tier-2 Function-Backed ActionType.
 *
 * `editFunctionName` names the registered EditFunction the executor wraps — the pure
 * compute step that turns a proposed exec sequence into OntologyEdit[]. The action
 * then commits those edits through `commitEdits` with submission-criteria pre-flight;
 * a failed criterion ⇒ REJECTED ⇒ worktree diff DISCARDED (cattle, not pets).
 * `approvalPolicy: "policy-approval"` = DTC-gate-strict; `branchPolicy: "branch-required"`
 * = worktree isolation; `sideEffects: []` = argv-safe shell + ontology edits only.
 */
export const EXECUTOR_ACTION_TYPE: Tier2FunctionBackedAction = {
  rid: EXECUTOR_ACTION_TYPE_RID,
  tier: "tier-2",
  apiName: "Executor",
  name: "Executor",
  description:
    "palantir-mini neutral Executor (Hands layer): runs a sandboxed exec sequence " +
    `(${EXEC_STEP_KINDS.join(" + ")} — argv-safe shell via Session.run + ontology-source ` +
    "edits) and commits any resulting OntologyEdit[] ATOMICALLY through commitEdits — " +
    "never writing the ontology directly. Tier-2 (function-backed): wraps an " +
    "EditFunction; failed submission criteria ⇒ REJECTED ⇒ worktree discarded.",
  editFunctionName: "pm.sandbox.executor.applyEditSteps",
  parameters: [
    {
      name: "stepKind",
      type: STEP_KIND_TYPE,
      required: true,
      description: `Which Hands operation a step performs (${EXEC_STEP_KINDS.join(" | ")}).`,
    },
    {
      name: "command",
      type: "string",
      required: false,
      description:
        'argv-safe shell command for a "shell" step (Session.run; no pipes/redirects in v1).',
    },
    {
      name: "proposedEdits",
      type: "OntologyEdit[]",
      required: false,
      description: 'OntologyEdit[] an "edit" step proposes; persisted ONLY via commitEdits.',
    },
    {
      name: "runtimeAdapter",
      type: '"codex" | "claude"',
      required: true,
      description: "Hands adapter backing exec dispatch (gemini deferred to W4+).",
    },
  ],
  submissionCriteriaNames: [],
  approvalPolicy: "policy-approval",
  branchPolicy: "branch-required",
  validateOnlySupported: true,
  sideEffects: [],
};

// The un-latenting act #2: register pm's Hands-layer Executor as a typed ActionType.
// Turns `ACTION_TYPE_REGISTRY.register`-grep for self/ from 0 → 1.
ACTION_TYPE_REGISTRY.register(EXECUTOR_ACTION_TYPE);
