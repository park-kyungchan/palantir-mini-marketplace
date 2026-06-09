/**
 * palantir-mini — InterfaceType primitive (prim-logic-02)
 *
 * Shared behavioral contract across 2+ ObjectTypes. Transition-zone
 * reclassification: InterfaceType is LOGIC, not DATA, because it enables
 * polymorphic reasoning rather than entity identity (SH-01).
 *
 * Pattern: declare an interface with expected properties; ObjectTypes that
 * implement it inherit the contract. This is the TypeScript way — no
 * runtime reflection needed.
  * @owner palantirkc-ontology
 * @purpose InterfaceType primitive (prim-logic-02)
 */

export type InterfaceTypeRid = string & { readonly __brand: "InterfaceTypeRid" };

export const interfaceTypeRid = (s: string): InterfaceTypeRid => s as InterfaceTypeRid;

export interface InterfaceTypeDeclaration {
  readonly rid: InterfaceTypeRid;
  readonly name: string;
  readonly description?: string;
  /** Required properties every implementer must expose */
  readonly requiredProperties: ReadonlyArray<{
    readonly name: string;
    readonly type: string;
  }>;
  /** Optional default property hints */
  readonly optionalProperties?: ReadonlyArray<{
    readonly name: string;
    readonly type: string;
  }>;
}

export class InterfaceTypeRegistry {
  private readonly ifaces = new Map<InterfaceTypeRid, InterfaceTypeDeclaration>();
  register(decl: InterfaceTypeDeclaration): void { this.ifaces.set(decl.rid, decl); }
  get(rid: InterfaceTypeRid): InterfaceTypeDeclaration | undefined { return this.ifaces.get(rid); }
  list(): InterfaceTypeDeclaration[] { return [...this.ifaces.values()]; }
}

export const INTERFACE_TYPE_REGISTRY = new InterfaceTypeRegistry();
