/**
 * palantir-mini SELF-ONTOLOGY — EditFunction as a registered ObjectType
 * (Wave 2 ObjectType build, harness redesign self-model). Mirrors the
 * `mcp-tool.objecttype.ts` / `agent.objecttype.ts` idiom: ONE `EditFunction`
 * ObjectType (the type) modeling pm's Tier-2 compute-to-OntologyEdit[] spec.
 *
 * pm's Tier-2 edit functions modeled AS ontology: each Tier-2 function
 * (`lib/actions/tier2-function.ts` + `lib/sandbox/edit-functions.ts`) computes an
 * OntologyEdit[] WITHOUT committing (noCommit), and is wrapped by an ActionType that
 * commits atomically through the 9-class submission gate. This file declares the type so
 * the self-model gains the EditFunction noun.
 *
 * Count provenance (catalog §2): count 0 — a real surface whose instances are
 * RUNTIME-SEEDED from the live Tier-2 function registry, not hard-coded in the snapshot.
 * The deliverable here is the TYPE registration; instances stay empty until a runtime
 * source seeds them. The paired test is a registration-resolves check (no filesystem
 * drift guard, since there is no static seed to cross-check).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology EditFunction ObjectType. */
export const EDIT_FUNCTION_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/edit-function",
);

/**
 * EditFunction modeled as a Palantir ObjectType. `editFunctionName` is the stable
 * primary key (the registered Tier-2 function name); the remaining properties record
 * whether it computes edits, that it does NOT commit (noCommit), and which ActionType
 * wraps it. Instances are runtime-seeded from the Tier-2 registry, so the registered
 * INSTANCES set below is empty (count-0 runtime-seeded).
 */
export const EDIT_FUNCTION_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: EDIT_FUNCTION_OBJECT_TYPE_RID,
  apiName: "EditFunction",
  name: "EditFunction",
  description:
    "palantir-mini Tier-2 compute-to-OntologyEdit[] spec modeled as an ObjectType: one " +
    "instance per registered Tier-2 function (lib/actions/tier2-function + " +
    "lib/sandbox/edit-functions) that computes edits WITHOUT committing. " +
    "editFunctionName identity plus computesEdits, noCommit, and wrappedByActionType. " +
    "Instances are runtime-seeded from the Tier-2 registry, not carried in the snapshot " +
    "seed.",
  primaryKeyProperty: "editFunctionName",
  titleProperty: "editFunctionName",
  properties: [
    { name: "editFunctionName", type: "string" },
    { name: "computesEdits", type: "boolean", optional: true },
    { name: "noCommit", type: "boolean", optional: true },
    { name: "wrappedByActionType", type: "string", optional: true },
  ],
};

/**
 * A registered EditFunction instance — stable function identity plus the
 * computes-edits / no-commit facts and the wrapping ActionType.
 */
export interface EditFunctionInstance {
  readonly editFunctionName: string;
  readonly computesEdits?: boolean;
  readonly noCommit?: boolean;
  readonly wrappedByActionType?: string;
}

/**
 * EditFunction instances — EMPTY (count-0 runtime-seeded). Instances are generated from
 * the live Tier-2 function registry, not hard-coded here; the TYPE registration is the
 * deliverable.
 */
export const EDIT_FUNCTION_INSTANCES: readonly EditFunctionInstance[] = [];

// Register the EditFunction ObjectType (the type). Instances are runtime-seeded from the
// Tier-2 registry; the registration above is the Wave-2 deliverable.
OBJECT_TYPE_REGISTRY.register(EDIT_FUNCTION_OBJECT_TYPE);
