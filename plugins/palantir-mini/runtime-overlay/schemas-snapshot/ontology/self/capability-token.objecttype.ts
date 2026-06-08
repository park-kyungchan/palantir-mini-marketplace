/**
 * palantir-mini SELF-ONTOLOGY — CapabilityToken as a registered ObjectType + its 3
 * instances (Wave 3, harness redesign self-model build). Mirrors the `skill.objecttype.ts`
 * idiom: ONE `CapabilityToken` ObjectType (the type) + the 3 L2-gated capability grants
 * seeded as instances.
 *
 * pm's L2 RBAC capability-token surface modeled AS ontology: the `lib/rbac/l2-check.ts`
 * pre-flight gate grants exactly the 3 L2-gated actions (`L2_GATED_ACTIONS`: ship-merge,
 * schema-write, ontology-register). Each gated action is one CapabilityToken-grant
 * identity. This file declares the type and seeds the 3 grants — the snapshot OWNS the
 * seed (it is the authority), so it does NOT import the rbac tree uphill. The paired
 * registration test cross-checks these 3 tokenIds against the LIVE `L2_GATED_ACTIONS`
 * tuple so the self-model fails loud if pm's L2 grant surface drifts.
 *
 * Count provenance (LIVE-verified): `lib/rbac/l2-check.ts` declares `L2_GATED_ACTIONS`
 * with EXACTLY 3 members. Each instance carries identity (`tokenId` = the gated-action
 * grant id, the PK) plus stored facts: `scope` (the capability name covered by the
 * token), `rbacLevel` (all 3 are "L2"; L3 is the orthogonal marking-sensitivity gate in
 * l3-check.ts, not a capability-grant token), and `grantedAction` (the action the token
 * authorizes). The token wire format (holder/expiresAt/signature) lives in the
 * `capability-token.ts` primitive, not duplicated in this identity-only seed.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-3 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology CapabilityToken ObjectType. */
export const CAPABILITY_TOKEN_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/capability-token",
);

/**
 * CapabilityToken modeled as a Palantir ObjectType. `tokenId` is the stable primary key
 * (the L2-gated grant id); `scope`, `rbacLevel`, and `grantedAction` are stored facts
 * carried on each registered INSTANCE below. The PascalCase apiName mirrors the generated
 * symbol.
 */
export const CAPABILITY_TOKEN_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: CAPABILITY_TOKEN_OBJECT_TYPE_RID,
  apiName: "CapabilityToken",
  name: "CapabilityToken",
  description:
    "palantir-mini L2 RBAC capability-token surface modeled as an ObjectType: one " +
    "instance per L2-gated action grant (lib/rbac/l2-check.ts L2_GATED_ACTIONS: " +
    "ship-merge, schema-write, ontology-register). tokenId identity plus scope, rbacLevel " +
    "(L2), and grantedAction; the token wire format lives in the capability-token.ts " +
    "primitive, not here.",
  primaryKeyProperty: "tokenId",
  titleProperty: "grantedAction",
  properties: [
    { name: "tokenId", type: "string" },
    { name: "scope", type: "string" },
    { name: "rbacLevel", type: '"L2" | "L3"' },
    { name: "grantedAction", type: "string" },
  ],
};

/**
 * A registered CapabilityToken instance — stable grant identity (the L2-gated action) plus
 * the three stored facts read off the RBAC gate semantics.
 */
export interface CapabilityTokenInstance {
  readonly tokenId: string;
  readonly scope: string;
  readonly rbacLevel: "L2" | "L3";
  readonly grantedAction: string;
}

/**
 * The 3 CapabilityToken instances — pm's LIVE L2-gated capability grants, in
 * `L2_GATED_ACTIONS` tuple order. Snapshot-owned seed (no rbac-tree import); the
 * registration test cross-checks this set against the live tuple and fails on any drift.
 * Each grant authorizes one L2-gated mutation that the l2-check pre-flight allows only
 * with a scope-covering, unexpired, signed token.
 */
export const CAPABILITY_TOKEN_INSTANCES: readonly CapabilityTokenInstance[] = [
  { tokenId: "ship-merge", scope: "ship-merge", rbacLevel: "L2", grantedAction: "ship-merge" },
  { tokenId: "schema-write", scope: "schema-write", rbacLevel: "L2", grantedAction: "schema-write" },
  { tokenId: "ontology-register", scope: "ontology-register", rbacLevel: "L2", grantedAction: "ontology-register" },
];

// Register the CapabilityToken ObjectType (the type). The 3 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(CAPABILITY_TOKEN_OBJECT_TYPE);
