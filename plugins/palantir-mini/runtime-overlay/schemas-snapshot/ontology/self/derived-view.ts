/**
 * palantir-mini SELF-ONTOLOGY — DATA / LOGIC / ACTION / GOVERNANCE derived view.
 *
 * ⚠️ GENERATED, NOT AUTHORED. Every entry in the returned view is PROJECTED from the
 * registered self-Ontology instances (the registries are the SSoT). This module holds
 * NO hand-authored list of object/link/action/role names — it reads whatever the
 * registries contain at call time and folds it onto the 4 control-surface axes. If a
 * new primitive instance is registered (or one is removed), this view changes with zero
 * edits here. The accompanying test (`tests/ontology/self/derived-view.test.ts`) asserts
 * each axis count equals the corresponding registry size, proving projection (not a
 * hand-list).
 *
 * The lens (ssot/palantir control-surface-family-map):
 *   - DATA       = ObjectTypes + Properties + LinkTypes  (the noun / structure surface)
 *   - LOGIC      = Functions                              (the bound-logic surface)
 *   - ACTION     = ActionTypes                            (the governed-mutation surface)
 *   - GOVERNANCE = Roles + security layers + the DTC/SIC governance ObjectTypes
 *
 * Source registries (populated by side-effect of importing `./index`):
 *   OBJECT_TYPE_REGISTRY · LINK_TYPE_REGISTRY · ACTION_TYPE_REGISTRY · ROLE_REGISTRY
 *   FUNCTION_INSTANCES (the seed array for the `Function` ObjectType's identities)
 *
 * @owner palantirkc-ontology
 * @purpose Generated 4-axis projection over the registered self-Ontology (M-SELF read view).
 */

// Importing the barrel FIRST runs every self-* instance module as a side-effect, which
// self-registers each primitive into its registry. Without this the registries are empty.
import "./index";

import { OBJECT_TYPE_REGISTRY } from "../primitives/object-type";
import type { ObjectTypeDeclaration } from "../primitives/object-type";
import { LINK_TYPE_REGISTRY } from "../primitives/link-type";
import type { LinkTypeDeclaration } from "../primitives/link-type";
import { ACTION_TYPE_REGISTRY } from "../primitives/action-type";
import type { ActionTypeDeclaration } from "../primitives/action-type";
import { ROLE_REGISTRY } from "../primitives/role";
import type { RoleDeclaration } from "../primitives/role";
import { FUNCTION_INSTANCES } from "./functions";
import type { FunctionInstance } from "./functions";
import { SECURITY_LAYERS } from "../security/schema";

/** A single projected entry on one of the four axes (name + provenance kind). */
export interface DerivedViewEntry {
  /** Stable identity projected from the source instance (apiName/name/functionName). */
  readonly name: string;
  /** Which primitive family this entry was projected from. */
  readonly kind:
    | "ObjectType"
    | "Property"
    | "LinkType"
    | "Function"
    | "ActionType"
    | "Role"
    | "SecurityLayer";
}

/** A summarized axis: the derived entries plus a headline count for quick assertion. */
export interface DerivedViewAxis {
  /** Total entries projected onto this axis. */
  readonly count: number;
  /** The projected entries (order follows registry list() order). */
  readonly entries: readonly DerivedViewEntry[];
}

/** The full 4-axis projection over the registered self-Ontology. */
export interface DerivedView {
  /** Marker — this view is GENERATED from registries, never hand-authored. */
  readonly generated: true;
  /** Human-readable provenance of the projection. */
  readonly source: string;
  readonly data: DerivedViewAxis;
  readonly logic: DerivedViewAxis;
  readonly action: DerivedViewAxis;
  readonly governance: DerivedViewAxis;
}

/**
 * Names of the ObjectTypes that ARE the governance surface (DTC/SIC + capability
 * primitives). These are NOT a hand-authored data list — they are a *predicate* applied
 * to whatever the OBJECT_TYPE_REGISTRY actually contains, so the governance projection
 * still derives from the registry (an empty registry yields zero governance ObjectTypes).
 */
const GOVERNANCE_OBJECT_TYPE_API_NAMES: ReadonlySet<string> = new Set([
  "SemanticIntentContract",
  "DigitalTwinChangeContract",
  "CapabilityContract",
  "CapabilityToken",
]);

/** Project an ObjectType declaration onto a DATA entry. */
function objectTypeToEntry(decl: ObjectTypeDeclaration): DerivedViewEntry {
  return { name: decl.apiName ?? decl.name, kind: "ObjectType" };
}

/** Build an axis from already-projected entries. */
function axisOf(entries: readonly DerivedViewEntry[]): DerivedViewAxis {
  return { count: entries.length, entries };
}

/**
 * Generate the DATA/LOGIC/ACTION/GOVERNANCE derived view FROM the registered
 * self-Ontology instances. Pure projection: it reads the registries (+ the Function
 * seed array + the security-layer enum) and folds them onto the four axes. No persisted
 * state, no hand-authored entity lists — re-running after a new registration reflects
 * the change automatically.
 */
export function generateDerivedView(): DerivedView {
  const objectTypes: readonly ObjectTypeDeclaration[] = OBJECT_TYPE_REGISTRY.list();
  const linkTypes: readonly LinkTypeDeclaration[] = LINK_TYPE_REGISTRY.list();
  const actionTypes: readonly ActionTypeDeclaration[] = ACTION_TYPE_REGISTRY.list();
  const roles: readonly RoleDeclaration[] = ROLE_REGISTRY.list();
  const functions: readonly FunctionInstance[] = FUNCTION_INSTANCES;

  // ── DATA = ObjectTypes + Properties + LinkTypes ──────────────────────────────
  const objectTypeEntries: readonly DerivedViewEntry[] = objectTypes.map(objectTypeToEntry);
  const propertyEntries: readonly DerivedViewEntry[] = objectTypes.flatMap(
    (decl: ObjectTypeDeclaration): readonly DerivedViewEntry[] =>
      decl.properties.map(
        (prop: ObjectTypeDeclaration["properties"][number]): DerivedViewEntry => ({
          name: `${decl.apiName ?? decl.name}.${prop.name}`,
          kind: "Property",
        }),
      ),
  );
  const linkTypeEntries: readonly DerivedViewEntry[] = linkTypes.map(
    (decl: LinkTypeDeclaration): DerivedViewEntry => ({ name: decl.name, kind: "LinkType" }),
  );
  const dataEntries: readonly DerivedViewEntry[] = [
    ...objectTypeEntries,
    ...propertyEntries,
    ...linkTypeEntries,
  ];

  // ── LOGIC = Functions ────────────────────────────────────────────────────────
  const logicEntries: readonly DerivedViewEntry[] = functions.map(
    (fn: FunctionInstance): DerivedViewEntry => ({ name: fn.functionName, kind: "Function" }),
  );

  // ── ACTION = ActionTypes ─────────────────────────────────────────────────────
  const actionEntries: readonly DerivedViewEntry[] = actionTypes.map(
    (decl: ActionTypeDeclaration): DerivedViewEntry => ({
      name: decl.apiName ?? decl.name,
      kind: "ActionType",
    }),
  );

  // ── GOVERNANCE = Roles + security layers + DTC/SIC governance ObjectTypes ─────
  const roleEntries: readonly DerivedViewEntry[] = roles.map(
    (decl: RoleDeclaration): DerivedViewEntry => ({ name: decl.name, kind: "Role" }),
  );
  const securityEntries: readonly DerivedViewEntry[] = SECURITY_LAYERS.map(
    (layer: string): DerivedViewEntry => ({ name: layer, kind: "SecurityLayer" }),
  );
  const governanceObjectTypeEntries: readonly DerivedViewEntry[] = objectTypes
    .filter((decl: ObjectTypeDeclaration): boolean =>
      GOVERNANCE_OBJECT_TYPE_API_NAMES.has(decl.apiName ?? decl.name),
    )
    .map(objectTypeToEntry);
  const governanceEntries: readonly DerivedViewEntry[] = [
    ...roleEntries,
    ...securityEntries,
    ...governanceObjectTypeEntries,
  ];

  return {
    generated: true,
    source:
      "Projected from OBJECT_TYPE_REGISTRY + LINK_TYPE_REGISTRY + ACTION_TYPE_REGISTRY + " +
      "ROLE_REGISTRY + FUNCTION_INSTANCES + SECURITY_LAYERS via generateDerivedView().",
    data: axisOf(dataEntries),
    logic: axisOf(logicEntries),
    action: axisOf(actionEntries),
    governance: axisOf(governanceEntries),
  };
}
