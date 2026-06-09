/**
 * Self-Ontology register edit-functions (O-2 operative closure).
 *
 * Wires the four `pm.actions.ontology.applyRegister*` edit-functions the
 * self-model forward-names via `editFunctionName` (runtime-overlay/.../self/
 * action-types.ts:69,121,166,211). Until now those were unresolved string
 * pointers (O-ground-1 §4) — `applyEditFunction` threw "edit function not
 * registered" for all four.
 *
 * Each `apply` is PURE → computes ONE register `OntologyEdit` (no fs, no commit;
 * persistence is commitEdits' job only — same 2-stage seam the Executor uses,
 * lib/sandbox/edit-functions.ts). The `OntologyEdit` union has only
 * object|link|interface, so ObjectType/ActionType/Function are carried as
 * `kind:"object"` rows tagged `properties.primitiveKind`; LinkType is a native
 * `kind:"link"` edit. The fold (lib/event-log/read/fold-snapshot.ts) bins each
 * committed register-edit by that tag, closing the register→commit→materialize→
 * read loop.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Self-Ontology register-primitive edit-functions (O-2)
 */

import type { OntologyEdit } from "../event-log/types";
import { registerEditFunction } from "./tier2-function";

/**
 * The four edit-function NAME consts MUST EQUAL the `editFunctionName` strings
 * declared in the self-model snapshot (self/action-types.ts) so the typed
 * pointer and the runtime registry reconcile. Asserted in the O-2 round-trip test.
 */
export const APPLY_REGISTER_OBJECT_TYPE_NAME = "pm.actions.ontology.applyRegisterObjectType";
export const APPLY_REGISTER_LINK_TYPE_NAME = "pm.actions.ontology.applyRegisterLinkType";
export const APPLY_REGISTER_ACTION_TYPE_NAME = "pm.actions.ontology.applyRegisterActionType";
export const APPLY_REGISTER_FUNCTION_NAME = "pm.actions.ontology.applyRegisterFunction";

// ─── Param interfaces (typed; rid is the registered primitive identity) ──────

export interface ApplyRegisterObjectTypeParams {
  readonly rid: string;
  /** Optional declaration carried into the edit's properties. */
  readonly declaration?: Record<string, unknown>;
}

export interface ApplyRegisterLinkTypeParams {
  readonly rid: string;
  readonly srcRid: string;
  readonly dstRid: string;
  readonly linkName: string;
}

export interface ApplyRegisterActionTypeParams {
  readonly rid: string;
  readonly declaration?: Record<string, unknown>;
}

export interface ApplyRegisterFunctionParams {
  readonly rid: string;
  readonly declaration?: Record<string, unknown>;
}

function requireRid(rid: unknown, verb: string): string {
  if (typeof rid !== "string" || rid.length === 0) {
    throw new Error(`${verb}: \`rid\` (string) is required`);
  }
  return rid;
}

// ─── Pure apply(params) => OntologyEdit[] (ONE register edit each) ───────────

/** ObjectType → `kind:"object"` tagged `primitiveKind:"ObjectType"`. */
export function applyRegisterObjectType(params: ApplyRegisterObjectTypeParams): OntologyEdit[] {
  const rid = requireRid(params?.rid, "applyRegisterObjectType");
  return [{ kind: "object", rid, properties: { primitiveKind: "ObjectType", ...(params.declaration ?? {}) } }];
}

/** LinkType → native `kind:"link"` edit (the link graph). */
export function applyRegisterLinkType(params: ApplyRegisterLinkTypeParams): OntologyEdit[] {
  const rid = requireRid(params?.rid, "applyRegisterLinkType");
  if (typeof params?.srcRid !== "string" || typeof params?.dstRid !== "string" || typeof params?.linkName !== "string") {
    throw new Error("applyRegisterLinkType: `srcRid`, `dstRid`, `linkName` (strings) are required");
  }
  return [{ kind: "link", rid, srcRid: params.srcRid, dstRid: params.dstRid, linkName: params.linkName }];
}

/** ActionType → `kind:"object"` tagged `primitiveKind:"ActionType"` (no link-kind fit). */
export function applyRegisterActionType(params: ApplyRegisterActionTypeParams): OntologyEdit[] {
  const rid = requireRid(params?.rid, "applyRegisterActionType");
  return [{ kind: "object", rid, properties: { primitiveKind: "ActionType", ...(params.declaration ?? {}) } }];
}

/** Function → `kind:"object"` tagged `primitiveKind:"Function"`. */
export function applyRegisterFunction(params: ApplyRegisterFunctionParams): OntologyEdit[] {
  const rid = requireRid(params?.rid, "applyRegisterFunction");
  return [{ kind: "object", rid, properties: { primitiveKind: "Function", ...(params.declaration ?? {}) } }];
}

// ─── Side-effect: register under the self-model's forward-named editFunctionName ──

registerEditFunction<ApplyRegisterObjectTypeParams>({
  name: APPLY_REGISTER_OBJECT_TYPE_NAME,
  description: "Self verb: compute the register OntologyEdit for a new ObjectType (pure; commit via commitEdits).",
  apply: applyRegisterObjectType,
});

registerEditFunction<ApplyRegisterLinkTypeParams>({
  name: APPLY_REGISTER_LINK_TYPE_NAME,
  description: "Self verb: compute the register OntologyEdit (kind:link) for a new LinkType (pure; commit via commitEdits).",
  apply: applyRegisterLinkType,
});

registerEditFunction<ApplyRegisterActionTypeParams>({
  name: APPLY_REGISTER_ACTION_TYPE_NAME,
  description: "Self verb: compute the register OntologyEdit for a new ActionType (pure; commit via commitEdits).",
  apply: applyRegisterActionType,
});

registerEditFunction<ApplyRegisterFunctionParams>({
  name: APPLY_REGISTER_FUNCTION_NAME,
  description: "Self verb: compute the register OntologyEdit for a new Function (pure; commit via commitEdits).",
  apply: applyRegisterFunction,
});
