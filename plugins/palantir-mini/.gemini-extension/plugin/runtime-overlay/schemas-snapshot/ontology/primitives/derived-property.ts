/**
 * @stable — DerivedPropertyDeclaration primitive (prim-data-26, v1.46.0)
 *
 * Foundry-equivalent derived property: computed at read-time from an
 * AIPLogicFunction or registered stable-name function rather than stored as
 * a fact. Promoted from the long-standing forward reference in
 * `object-type.ts:5-6` ("DerivedProperty lives in ../functions/...").
 *
 * Semantic distinction (intentional dual surface — both coexist):
 *   - `ontology/functions/derived-property.ts` = LOGIC closure primitive
 *     (provides an inline `compute` function reference for in-process
 *     compute; closure-bound, prim-logic-04).
 *   - `ontology/primitives/derived-property.ts` (this file) = DATA
 *     declarative compute-binding (points to AIPLogicFunctionRid OR a
 *     stable function name registered in source-executor.ts; typed for
 *     Workflow Lineage graph nodes; cache strategy + dependsOn for
 *     change-propagation).
 *
 * Authority chain:
 *   research/palantir-foundry/ontology/ (Property vs DerivedProperty separation)
 *     ↓
 *   schemas/ontology/primitives/derived-property.ts (this file)
 *     ↓
 *   ~/ontology/shared-core/index.ts re-export
 *     ↓
 *   per-project ontology/ + palantir-mini codegen
 *
 * Cross-refs:
 *   - object-type.ts §5-6 (forward reference now resolved to this primitive)
 *   - source-executor.ts (computeFunctionRid resolution at read-time)
 *   - aip-logic-function.ts (AIPLogicFunctionRid binding target)
 *
 * D/L/A domain: DATA (typed compute-binding declaration; SH-01: deleting
 * this binding still leaves objects describing reality, but the derived
 * value vanishes — the BINDING is the stored fact).
 *
 * @owner palantirkc-ontology
 * @purpose Foundry-equivalent derived property primitive (prim-data-26)
 */

export type DerivedPropertyRid = string & { readonly __brand: "DerivedPropertyRid" };

export const derivedPropertyRid = (s: string): DerivedPropertyRid => s as DerivedPropertyRid;

/**
 * Cache strategy discriminator. `ttl` carries an explicit `ttlSeconds`
 * payload; the three other variants are bare tags.
 */
export type CacheStrategyKind = "no-cache" | "request-scoped" | "session-scoped" | "ttl";

export interface CacheStrategySimple {
  readonly kind: "no-cache" | "request-scoped" | "session-scoped";
}

export interface CacheStrategyTtl {
  readonly kind: "ttl";
  /** TTL in seconds; positive integer. */
  readonly ttlSeconds: number;
}

export type CacheStrategyConfig = CacheStrategySimple | CacheStrategyTtl;

export interface DerivedPropertyDeclaration {
  readonly rid: DerivedPropertyRid;
  /** ObjectTypeRid string (foreign key into ObjectTypeRegistry). */
  readonly objectTypeRid: string;
  /** Property name within objectType (e.g. "fullName"). */
  readonly name: string;
  readonly displayName: string;
  /** Foundry property type literal (e.g. "string", "double", "boolean"). */
  readonly returnType: string;
  /**
   * Compute binding — points to an AIPLogicFunctionRid OR a stable-name
   * SourceExecutorFunction registered at deploy time. Resolution at
   * read-time uses runtime executor registry per source-executor.ts.
   */
  readonly computeFunctionRid: string;
  readonly cacheStrategy: CacheStrategyConfig;
  readonly description?: string;
  /**
   * Dependency declaration for change-propagation. List of Property names
   * within the same ObjectType whose updates should invalidate this
   * derived property's cached value.
   */
  readonly dependsOnProperties?: readonly string[];
}

/**
 * Type guard / runtime validator. Returns true iff every required field is
 * present with the correct shape. Does NOT verify cross-references
 * (objectTypeRid existence, computeFunctionRid resolution) — those are
 * referential integrity checks that belong in project-validator.
 */
export const validateDerivedProperty = (
  v: unknown,
): v is DerivedPropertyDeclaration => {
  if (!v || typeof v !== "object") return false;
  const d = v as Partial<DerivedPropertyDeclaration>;
  if (typeof d.rid !== "string") return false;
  if (typeof d.objectTypeRid !== "string") return false;
  if (typeof d.name !== "string") return false;
  if (typeof d.displayName !== "string") return false;
  if (typeof d.returnType !== "string") return false;
  if (typeof d.computeFunctionRid !== "string") return false;
  if (!d.cacheStrategy || typeof d.cacheStrategy !== "object") return false;
  const cs = d.cacheStrategy as CacheStrategyConfig;
  if (cs.kind === "ttl") {
    if (typeof (cs as CacheStrategyTtl).ttlSeconds !== "number") return false;
    if ((cs as CacheStrategyTtl).ttlSeconds <= 0) return false;
  } else if (
    cs.kind !== "no-cache" &&
    cs.kind !== "request-scoped" &&
    cs.kind !== "session-scoped"
  ) {
    return false;
  }
  if (d.dependsOnProperties !== undefined) {
    if (!Array.isArray(d.dependsOnProperties)) return false;
    for (const p of d.dependsOnProperties) {
      if (typeof p !== "string") return false;
    }
  }
  return true;
};

export class DerivedPropertyRegistryV2 {
  private readonly props = new Map<DerivedPropertyRid, DerivedPropertyDeclaration>();

  register(decl: DerivedPropertyDeclaration): void {
    this.props.set(decl.rid, decl);
  }

  get(rid: DerivedPropertyRid): DerivedPropertyDeclaration | undefined {
    return this.props.get(rid);
  }

  /** Returns all derived properties bound to the given ObjectType. */
  listForObjectType(objectTypeRid: string): DerivedPropertyDeclaration[] {
    return [...this.props.values()].filter((d) => d.objectTypeRid === objectTypeRid);
  }

  list(): DerivedPropertyDeclaration[] {
    return [...this.props.values()];
  }
}

export const DERIVED_PROPERTY_REGISTRY_V2 = new DerivedPropertyRegistryV2();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "DerivedProperty",
};
export { categoryFoundryEquivalent as derivedPropertyFoundryEquivalent };
