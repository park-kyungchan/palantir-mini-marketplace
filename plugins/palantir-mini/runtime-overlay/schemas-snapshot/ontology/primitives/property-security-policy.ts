/**
 * @stable — PropertySecurityPolicy primitive (prim-security-05, v1.40.0)
 *
 * Property-level RBAC. Sister of ObjectSecurityPolicy (prim-security-04):
 * that primitive gates *which objects* a caller may read; this primitive
 * gates *which properties of an already-visible object* are returned.
 *
 * Per-property visibility modes:
 *   always      — visible whenever the parent object is.
 *   by-marking  — visible only if the caller holds at least one of
 *                 markingRids.
 *   by-purpose  — visible only if the caller declared a matching purpose.
 *   hidden      — never serialized to this caller (e.g. derived audit
 *                 fields exposed only to ops admins).
 *
 * D/L/A domain: SECURITY (visibility-only; pairs with marking + purpose).
 *
 * Authority chain:
 *   research/palantir-foundry/security/* (per-property visibility)
 *     + MarkingDeclaration (prim-security-03)
 *     + ObjectSecurityPolicy (prim-security-04)
 *     ↓
 *   schemas/ontology/primitives/property-security-policy.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 26 v1.0.0 §Axis D (Shareable — provider-neutral
 * security declarations + edge-compatible).
 *
 * @owner palantirkc-ontology
 * @purpose Property-level visibility policy (always/by-marking/by-purpose/hidden)
 */

import type { MarkingRid } from "./marking-declaration";

/**
 * Property handle. We use a branded string rather than importing from
 * `property-type.ts` because that module exposes `PropertyTypeName` (a
 * scalar literal union) rather than a branded RID. The brand keeps this
 * primitive's surface stable even if a richer property-type RID is
 * promoted in a later version.
 */
export type PropertyTypeRidLike = string & {
  readonly __brand: "PropertyTypeRidLike";
};

export const propertyTypeRidLike = (s: string): PropertyTypeRidLike =>
  s as PropertyTypeRidLike;

export type PropertySecurityPolicyRid = string & {
  readonly __brand: "PropertySecurityPolicyRid";
};

export const propertySecurityPolicyRid = (s: string): PropertySecurityPolicyRid =>
  s as PropertySecurityPolicyRid;

export type PropertySecurityVisibility =
  | "always"
  | "by-marking"
  | "by-purpose"
  | "hidden";

export interface PropertySecurityPolicy {
  readonly policyId: PropertySecurityPolicyRid;
  readonly propertyTypeRid: PropertyTypeRidLike;
  readonly visibility: PropertySecurityVisibility;
  /**
   * Required when visibility = "by-marking". One or more markings the caller
   * must hold (semantics: ANY-of, not ALL-of). Ignored otherwise.
   */
  readonly markingRids?: ReadonlyArray<MarkingRid>;
  /**
   * Required when visibility = "by-purpose". One or more purposes the
   * caller's request must declare. Ignored otherwise.
   */
  readonly purposes?: ReadonlyArray<string>;
}

export function isPropertySecurityVisibility(s: string): s is PropertySecurityVisibility {
  return s === "always" || s === "by-marking" || s === "by-purpose" || s === "hidden";
}

export function isPropertySecurityPolicy(x: unknown): x is PropertySecurityPolicy {
  if (typeof x !== "object" || x === null) return false;
  const p = x as PropertySecurityPolicy;
  if (typeof p.policyId !== "string" || p.policyId.length === 0) return false;
  if (typeof p.propertyTypeRid !== "string" || p.propertyTypeRid.length === 0) return false;
  if (typeof p.visibility !== "string" || !isPropertySecurityVisibility(p.visibility)) return false;
  if (p.markingRids !== undefined && !Array.isArray(p.markingRids)) return false;
  if (p.purposes !== undefined && !Array.isArray(p.purposes)) return false;
  // structural cross-checks
  if (p.visibility === "by-marking" && (!p.markingRids || p.markingRids.length === 0)) {
    return false;
  }
  if (p.visibility === "by-purpose" && (!p.purposes || p.purposes.length === 0)) {
    return false;
  }
  return true;
}

export class PropertySecurityPolicyRegistry {
  private readonly policies = new Map<PropertySecurityPolicyRid, PropertySecurityPolicy>();

  register(decl: PropertySecurityPolicy): void {
    this.policies.set(decl.policyId, decl);
  }

  get(rid: PropertySecurityPolicyRid): PropertySecurityPolicy | undefined {
    return this.policies.get(rid);
  }

  byProperty(rid: PropertyTypeRidLike): PropertySecurityPolicy[] {
    return [...this.policies.values()].filter((p) => p.propertyTypeRid === rid);
  }

  byVisibility(v: PropertySecurityVisibility): PropertySecurityPolicy[] {
    return [...this.policies.values()].filter((p) => p.visibility === v);
  }

  list(): PropertySecurityPolicy[] {
    return [...this.policies.values()];
  }
}

export const PROPERTY_SECURITY_POLICY_REGISTRY = new PropertySecurityPolicyRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "PropertySecurityPolicy",
};
export { categoryFoundryEquivalent as propertySecurityPolicyFoundryEquivalent };
