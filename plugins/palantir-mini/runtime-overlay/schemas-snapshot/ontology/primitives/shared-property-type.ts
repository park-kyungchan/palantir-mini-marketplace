/**
 * @stable — SharedPropertyType primitive (prim-data-07, v1.0)
 *
 * Promoted from the inline interface in ontology/types.ts. A SharedPropertyType
 * defines a reusable set of properties (e.g., AuditFields: createdAt, updatedAt,
 * createdBy) that multiple ObjectTypes can declare without duplication.
 *
 * Authority chain:
 *   research/palantir/data/ → schemas/ontology/primitives/shared-property-type.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → codegen
 *
 * D/L/A domain: DATA (cross-object property reuse pattern; stored fact about
 * the data model shape, not a derivation or mutation)
  * @owner palantirkc-ontology
 * @purpose @stable — SharedPropertyType primitive (prim-data-07, v1.0)
 */

export type SharedPropertyTypeRid = string & { readonly __brand: "SharedPropertyTypeRid" };

export const sharedPropertyTypeRid = (s: string): SharedPropertyTypeRid => s as SharedPropertyTypeRid;

export interface SharedPropertyFieldDeclaration {
  readonly name: string;
  readonly type: string;
  readonly optional?: boolean;
  readonly description?: string;
}

export interface SharedPropertyTypeDeclaration {
  readonly rid: SharedPropertyTypeRid;
  readonly name: string;
  readonly description?: string;
  readonly properties: ReadonlyArray<SharedPropertyFieldDeclaration>;
  /** ObjectType RIDs that reference this shared property group */
  readonly usedBy?: ReadonlyArray<string>;
}

export class SharedPropertyTypeRegistry {
  private readonly items = new Map<SharedPropertyTypeRid, SharedPropertyTypeDeclaration>();

  register(decl: SharedPropertyTypeDeclaration): void {
    this.items.set(decl.rid, decl);
  }

  get(rid: SharedPropertyTypeRid): SharedPropertyTypeDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<SharedPropertyTypeRid> {
    return this.items.keys();
  }

  list(): SharedPropertyTypeDeclaration[] {
    return [...this.items.values()];
  }
}

export const SHARED_PROPERTY_TYPE_REGISTRY = new SharedPropertyTypeRegistry();
