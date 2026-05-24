/**
 * @stable — ObjectView primitive (prim-data-22, v1.37.0)
 *
 * Foundry Object Views make an ObjectType operational: which properties are
 * visible, editable, sortable, and action-enabled in a specific application
 * surface. This is the bridge between ontology-as-model and ontology-as-workflow.
 *
 * D/L/A domain: DATA + ACTION boundary. The view is declarative DATA, but it
 * determines which ACTIONS are exposed to humans or agents.
 *
 * @owner palantirkc-ontology
 * @purpose Foundry-style Object View declaration for OSDK/app/agent surfaces
 */

import type { ActionTypeRid } from "./action-type";
import type { MarkingRid } from "./marking-declaration";
import type { ObjectTypeRid } from "./object-type";

export type ObjectViewRid = string & { readonly __brand: "ObjectViewRid" };

export const objectViewRid = (s: string): ObjectViewRid => s as ObjectViewRid;

export type ObjectViewSurface =
  | "table"
  | "detail"
  | "kanban"
  | "map"
  | "chart"
  | "workflow"
  | "agent-tool";

export interface ObjectViewPropertyBinding {
  readonly propertyName: string;
  readonly label?: string;
  readonly visible: boolean;
  readonly editable?: boolean;
  readonly requiredForCreate?: boolean;
  readonly markingRids?: readonly MarkingRid[];
  readonly formatter?: string;
}

export interface ObjectViewActionBinding {
  readonly actionRid: ActionTypeRid;
  readonly placement: "row" | "bulk" | "detail" | "agent-tool";
  readonly requiresSelection?: boolean;
  readonly approval: "none" | "user-confirmation" | "policy-approval";
}

export interface ObjectViewDeclaration {
  readonly viewId: ObjectViewRid;
  readonly objectTypeRid: ObjectTypeRid;
  /** Stable API slug used by OSDK/application routing. */
  readonly apiName: string;
  readonly displayName: string;
  readonly surface: ObjectViewSurface;
  /** Property that carries the human-readable identity of an object row/card. */
  readonly primaryTitleProperty: string;
  readonly propertyBindings: readonly ObjectViewPropertyBinding[];
  readonly actionBindings?: readonly ObjectViewActionBinding[];
  readonly filterExpression?: string;
  readonly sort?: readonly { readonly propertyName: string; readonly direction: "asc" | "desc" }[];
  readonly defaultPageSize?: number;
  /** App or Workshop variables that shape this view without changing the ObjectType. */
  readonly environmentVariables?: readonly string[];
  readonly security?: {
    readonly markingRids?: readonly MarkingRid[];
    readonly delegatedUserPermissions?: boolean;
    readonly purpose?: string;
  };
}

export class ObjectViewRegistry {
  private readonly views = new Map<ObjectViewRid, ObjectViewDeclaration>();

  register(decl: ObjectViewDeclaration): void {
    this.views.set(decl.viewId, decl);
  }

  get(rid: ObjectViewRid): ObjectViewDeclaration | undefined {
    return this.views.get(rid);
  }

  byObjectType(objectTypeRid: ObjectTypeRid): ObjectViewDeclaration[] {
    return [...this.views.values()].filter((v) => v.objectTypeRid === objectTypeRid);
  }

  list(): ObjectViewDeclaration[] {
    return [...this.views.values()];
  }
}

export const OBJECT_VIEW_REGISTRY = new ObjectViewRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "ObjectView",
};
export { categoryFoundryEquivalent as objectViewFoundryEquivalent };
