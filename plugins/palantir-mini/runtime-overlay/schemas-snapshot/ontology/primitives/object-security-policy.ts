/**
 * @stable — ObjectSecurityPolicy primitive (prim-security-04, v1.40.0)
 *
 * Granular row / column / cell / object-level access policy. Complements
 * the existing MarkingDeclaration (prim-security-03) which classifies
 * cells/columns by sensitivity; this primitive expresses the *predicate*
 * that gates access (e.g. "user.region === object.region", "purpose ∈
 * {'incident-response','platform-qa'}").
 *
 * D/L/A domain: SECURITY (governs visibility, not stored fact).
 *
 * Authority chain:
 *   research/palantir-foundry/security/* (per-row / per-column policies)
 *     + Markings (prim-security-03)
 *     ↓
 *   schemas/ontology/primitives/object-security-policy.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 26 v1.0.0 §Axis D (Shareable — provider-neutral +
 * edge-compatible policy declarations).
 *
 * @owner palantirkc-ontology
 * @purpose Row/column/cell/object-level access policy with predicate + marking + purpose
 */

import type { MarkingRid } from "./marking-declaration";
import type { ObjectTypeRid } from "./object-type";

export type ObjectSecurityPolicyRid = string & {
  readonly __brand: "ObjectSecurityPolicyRid";
};

export const objectSecurityPolicyRid = (s: string): ObjectSecurityPolicyRid =>
  s as ObjectSecurityPolicyRid;

/**
 * Policy granularity:
 *   row    — predicate evaluated per object instance (visibility per row).
 *   column — predicate evaluated per property; named columns hidden when
 *            predicate fails.
 *   cell   — predicate evaluated per (object, property) pair (most fine-
 *            grained; expensive but precise).
 *   object — predicate evaluated once per object type (coarsest).
 */
export type ObjectSecurityPolicyScope = "row" | "column" | "cell" | "object";

export interface ObjectSecurityPolicy {
  readonly policyId: ObjectSecurityPolicyRid;
  readonly scope: ObjectSecurityPolicyScope;
  readonly objectTypeRid: ObjectTypeRid;
  /**
   * Predicate expression as a string. Engine-specific (Foundry policy
   * language, OPA Rego, JEP, etc.) — kept as opaque string so this
   * primitive does not couple to a specific evaluator.
   */
  readonly predicate: string;
  /**
   * Markings the user/agent must hold to satisfy this policy in addition
   * to the predicate. Empty array = predicate-only.
   */
  readonly allowedMarkings: ReadonlyArray<MarkingRid>;
  /**
   * Optional purpose binding (Palantir Markings-with-purpose pattern).
   * Access requires the request to declare a matching purpose, e.g.
   * "incident-response" or "platform-qa".
   */
  readonly purposeRequirement?: string;
}

export function isObjectSecurityPolicyScope(s: string): s is ObjectSecurityPolicyScope {
  return s === "row" || s === "column" || s === "cell" || s === "object";
}

export function isObjectSecurityPolicy(x: unknown): x is ObjectSecurityPolicy {
  if (typeof x !== "object" || x === null) return false;
  const p = x as ObjectSecurityPolicy;
  return (
    typeof p.policyId === "string" &&
    p.policyId.length > 0 &&
    typeof p.scope === "string" &&
    isObjectSecurityPolicyScope(p.scope) &&
    typeof p.objectTypeRid === "string" &&
    p.objectTypeRid.length > 0 &&
    typeof p.predicate === "string" &&
    p.predicate.length > 0 &&
    Array.isArray(p.allowedMarkings) &&
    (p.purposeRequirement === undefined ||
      (typeof p.purposeRequirement === "string" && p.purposeRequirement.length > 0))
  );
}

export class ObjectSecurityPolicyRegistry {
  private readonly policies = new Map<ObjectSecurityPolicyRid, ObjectSecurityPolicy>();

  register(decl: ObjectSecurityPolicy): void {
    this.policies.set(decl.policyId, decl);
  }

  get(rid: ObjectSecurityPolicyRid): ObjectSecurityPolicy | undefined {
    return this.policies.get(rid);
  }

  byObjectType(rid: ObjectTypeRid): ObjectSecurityPolicy[] {
    return [...this.policies.values()].filter((p) => p.objectTypeRid === rid);
  }

  byScope(scope: ObjectSecurityPolicyScope): ObjectSecurityPolicy[] {
    return [...this.policies.values()].filter((p) => p.scope === scope);
  }

  list(): ObjectSecurityPolicy[] {
    return [...this.policies.values()];
  }
}

export const OBJECT_SECURITY_POLICY_REGISTRY = new ObjectSecurityPolicyRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "ObjectSecurityPolicy",
};
export { categoryFoundryEquivalent as objectSecurityPolicyFoundryEquivalent };
