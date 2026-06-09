/**
 * @stable — ValueType primitive (prim-data-06, v1.0)
 *
 * Reusable scalar constraint type (Palantir ValueType analog). Wraps a base
 * TypeScript primitive with semantic constraints (e.g., Currency must be
 * ISO-4217; ISODate must match YYYY-MM-DD). Enables shared semantic validation
 * across ObjectType properties without duplicating constraint logic.
 *
 * Authority chain:
 *   research/palantir/data/ → schemas/ontology/primitives/value-type.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → codegen
 *
 * D/L/A domain: DATA (scalar constraint; the constraint is a stored fact about
 * the data model, not a derivation or mutation)
  * @owner palantirkc-ontology
 * @purpose @stable — ValueType primitive (prim-data-06, v1.0)
 */

export type ValueTypeRid = string & { readonly __brand: "ValueTypeRid" };

export const valueTypeRid = (s: string): ValueTypeRid => s as ValueTypeRid;

export type BaseScalarType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date";

export interface ValueTypeConstraint {
  readonly kind: "enum" | "regex" | "range" | "length";
  /** Constraint payload — interpretation depends on kind */
  readonly value: unknown;
}

export interface ValueTypeDeclaration {
  readonly rid: ValueTypeRid;
  readonly name: string;
  readonly description?: string;
  readonly baseType: BaseScalarType;
  readonly constraints: ReadonlyArray<ValueTypeConstraint>;
}

export class ValueTypeRegistry {
  private readonly types = new Map<ValueTypeRid, ValueTypeDeclaration>();

  register(decl: ValueTypeDeclaration): void {
    this.types.set(decl.rid, decl);
  }

  get(rid: ValueTypeRid): ValueTypeDeclaration | undefined {
    return this.types.get(rid);
  }

  keys(): IterableIterator<ValueTypeRid> {
    return this.types.keys();
  }

  list(): ValueTypeDeclaration[] {
    return [...this.types.values()];
  }
}

export const VALUE_TYPE_REGISTRY = new ValueTypeRegistry();
