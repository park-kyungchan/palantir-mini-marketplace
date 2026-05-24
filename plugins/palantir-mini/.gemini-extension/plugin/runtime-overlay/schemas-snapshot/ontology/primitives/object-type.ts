/**
 * palantir-mini — ObjectType primitive (prim-data-02)
 *
 * OSDK 2.0-compatible ObjectType declaration. Each ObjectType holds
 * stored-fact properties only (no derived). DerivedProperty is the sibling
 * `derived-property.ts` primitive (v1.46.0+; prim-data-26) — Foundry-
 * equivalent typed compute-binding. The closure-based LOGIC variant lives
 * at `../functions/derived-property.ts` (prim-logic-04) and remains for
 * in-process compute references.
 *
 * Authority chain:
 *   research/palantir/ -> schemas/ontology/primitives/object-type.ts (this file)
 *   -> palantir-mini/lib/codegen/descender-gen.ts
 *   -> <project>/src/generated/objects.d.ts
 *
 * Branded RID pattern (zero runtime cost):
 *   type ObjectTypeRid = string & { __brand: "ObjectTypeRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose ObjectType primitive (prim-data-02)
 */

export type ObjectTypeRid = string & { readonly __brand: "ObjectTypeRid" };

export const objectTypeRid = (s: string): ObjectTypeRid => s as ObjectTypeRid;

export interface ObjectTypeDeclaration {
  readonly rid: ObjectTypeRid;
  /** Stable API slug used by OSDK clients; may differ from display name. */
  readonly apiName?: string;
  /** Human-readable name (matches the generated interface) */
  readonly name: string;
  /** Optional description — propagated to generated code as comment */
  readonly description?: string;
  /** Property that uniquely identifies an object instance. */
  readonly primaryKeyProperty?: string;
  /** Property used as the human-readable object title in Object Views. */
  readonly titleProperty?: string;
  /** Stored property declarations */
  readonly properties: ReadonlyArray<{
    readonly name: string;
    readonly type: string;   // TS type literal or PropertyTypeName
    readonly optional?: boolean;
    readonly indexed?: boolean;
    readonly markingRids?: readonly string[];
  }>;
  /** Link declarations pointing to other ObjectTypes */
  readonly links?: ReadonlyArray<{
    readonly name: string;
    readonly to: ObjectTypeRid;
    readonly cardinality: "one" | "many";
  }>;
  /** InterfaceType RIDs this ObjectType implements */
  readonly implements?: ReadonlyArray<string>;
  /** Source/dataset/API backing this ObjectType; provenance, not direct fetch. */
  readonly backingSourceRef?: string;
  /** ObjectView RIDs that make this ObjectType operational in apps/agents. */
  readonly objectViewRids?: readonly string[];
  /** ActionType RIDs that are valid mutations for this ObjectType. */
  readonly actionTypeRids?: readonly string[];
  /** Whether this ObjectType can be edited on ontology branches/proposals. */
  readonly branchable?: boolean;
  /** Markings or policy tags applied at object-type level. */
  readonly markingRids?: readonly string[];
}

/** Registry helper — v0 minimal registry via plain Map */
export class ObjectTypeRegistry {
  private readonly types = new Map<ObjectTypeRid, ObjectTypeDeclaration>();

  register(decl: ObjectTypeDeclaration): void {
    this.types.set(decl.rid, decl);
  }

  get(rid: ObjectTypeRid): ObjectTypeDeclaration | undefined {
    return this.types.get(rid);
  }

  list(): ObjectTypeDeclaration[] {
    return [...this.types.values()];
  }
}

export const OBJECT_TYPE_REGISTRY = new ObjectTypeRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "ObjectType",
};
export { categoryFoundryEquivalent as objectTypeFoundryEquivalent };
