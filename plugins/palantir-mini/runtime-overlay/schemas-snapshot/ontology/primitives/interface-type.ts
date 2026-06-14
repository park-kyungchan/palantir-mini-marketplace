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
  /**
   * Parent interfaces this interface extends (OE-11 / ARCH-5). Foundry InterfaceTypes
   * support MULTIPLE inheritance: an implementer of this interface must also satisfy
   * every extended interface's required properties. Optional + additive — a flat
   * interface with no parents omits it.
   */
  readonly extends?: ReadonlyArray<InterfaceTypeRid>;
  /**
   * Abstract / non-instantiable marker (OE-11 / ARCH-5). When true, this interface is
   * a pure behavioral contract that no ObjectType may directly instantiate as its sole
   * type — it exists only to be extended/implemented. Optional + additive (defaults to
   * instantiable when absent).
   */
  readonly abstract?: boolean;
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
