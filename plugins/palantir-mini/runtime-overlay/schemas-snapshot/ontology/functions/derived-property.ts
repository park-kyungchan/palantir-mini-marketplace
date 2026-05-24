/**
 * palantir-mini — DerivedProperty primitive (prim-logic-04)
 *
 * Property computed from other properties. Not stored. Lazy-evaluated
 * getter from codegen. If you delete the computation, raw data remains but
 * the derived value vanishes — SH-01 confirms LOGIC, not DATA.
 */

import type { ObjectTypeRid } from "../primitives/object-type";

export interface DerivedPropertyDeclaration<T = unknown> {
  readonly name: string;
  readonly description?: string;
  /** ObjectType that hosts this derived property */
  readonly onObjectType: ObjectTypeRid;
  /** Return type (TS type literal) */
  readonly returnType: string;
  /** Pure compute function — reads the host object and returns the derived value */
  readonly compute: (host: Record<string, unknown>) => T | Promise<T>;
}

export class DerivedPropertyRegistry {
  private readonly props = new Map<string, DerivedPropertyDeclaration<any>>();
  register<T>(decl: DerivedPropertyDeclaration<T>): void {
    this.props.set(`${decl.onObjectType}#${decl.name}`, decl);
  }
  get<T = unknown>(onObjectType: ObjectTypeRid, name: string): DerivedPropertyDeclaration<T> | undefined {
    return this.props.get(`${onObjectType}#${name}`) as DerivedPropertyDeclaration<T> | undefined;
  }
  listFor(onObjectType: ObjectTypeRid): DerivedPropertyDeclaration<any>[] {
    return [...this.props.values()].filter((d) => d.onObjectType === onObjectType);
  }
}

export const DERIVED_PROPERTY_REGISTRY = new DerivedPropertyRegistry();
