/**
 * @stable — Struct primitive (prim-data-05, v1.0)
 *
 * Reusable named record type (Palantir Struct analog). A Struct differs from
 * ObjectType in that it has no RID identity of its own — it is embedded as a
 * field type inside ObjectType properties or other Structs.
 *
 * Authority chain:
 *   research/palantir/data/ → schemas/ontology/primitives/struct.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → codegen
 *
 * D/L/A domain: DATA (stored-fact record type; no derived logic, no mutations)
  * @owner palantirkc-ontology
 * @purpose @stable — Struct primitive (prim-data-05, v1.0)
 */

export type StructRid = string & { readonly __brand: "StructRid" };

export const structRid = (s: string): StructRid => s as StructRid;

export interface StructFieldDeclaration {
  readonly name: string;
  /** TypeScript type literal or ValueTypeRid reference */
  readonly type: string;
  readonly optional?: boolean;
  readonly description?: string;
}

export interface StructDeclaration {
  readonly rid: StructRid;
  readonly name: string;
  readonly description?: string;
  readonly fields: ReadonlyArray<StructFieldDeclaration>;
  /** Structs may embed other Structs by RID reference */
  readonly embeds?: ReadonlyArray<StructRid>;
}

export class StructRegistry {
  private readonly structs = new Map<StructRid, StructDeclaration>();

  register(decl: StructDeclaration): void {
    this.structs.set(decl.rid, decl);
  }

  get(rid: StructRid): StructDeclaration | undefined {
    return this.structs.get(rid);
  }

  keys(): IterableIterator<StructRid> {
    return this.structs.keys();
  }

  list(): StructDeclaration[] {
    return [...this.structs.values()];
  }
}

export const STRUCT_REGISTRY = new StructRegistry();
