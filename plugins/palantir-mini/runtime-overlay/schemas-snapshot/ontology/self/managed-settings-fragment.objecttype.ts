/**
 * palantir-mini SELF-ONTOLOGY — ManagedSettingsFragment as a registered ObjectType + its
 * 1 instance (Wave 2/3, harness redesign self-model build). Mirrors the
 * `skill.objecttype.ts` idiom: ONE `ManagedSettingsFragment` ObjectType (the type) + the
 * live per-project RBAC settings fragment(s) seeded as instances.
 *
 * pm's per-project RBAC surface modeled AS ontology: each `managed-settings.d/<n>.json`
 * fragment is a permission-policy grant/deny set Claude Code loads into the effective
 * policy (the closest pm has to a Role-grant instance — rule 07 RBAC fragment). This file
 * declares the type and seeds the fragment(s) — the snapshot OWNS the seed (it is the
 * authority), so it does NOT import the fragment json uphill. The paired registration
 * test cross-checks these fragment ids + grant/deny counts against the LIVE
 * `managed-settings.d/` directory so the self-model fails loud if pm's RBAC fragment
 * surface drifts (a fragment added/removed, or a grant/deny entry added without updating
 * this seed).
 *
 * Count provenance (LIVE-verified): `managed-settings.d/` holds exactly ONE fragment
 * (`50-palantir-mini.json`). Each instance carries the fragmentId identity (the fragment
 * filename without extension, the PK) plus two stored facts read off the fragment json:
 * `grantedTools` (count of `permissions.allow` entries) and `deniedTools` (count of
 * `permissions.deny` entries). Richer fragment metadata (ask-gate rules, env, surface
 * status) lives in the json, not duplicated in the seed.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology ManagedSettingsFragment ObjectType. */
export const MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/managed-settings-fragment",
);

/**
 * ManagedSettingsFragment modeled as a Palantir ObjectType. `fragmentId` is the stable
 * primary key (the fragment filename without extension); `grantedTools` and `deniedTools`
 * are stored facts carried on each registered INSTANCE below. The PascalCase apiName
 * mirrors the generated symbol.
 */
export const MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID,
  apiName: "ManagedSettingsFragment",
  name: "ManagedSettingsFragment",
  description:
    "palantir-mini per-project RBAC settings fragment modeled as an ObjectType: one " +
    "instance per managed-settings.d/<n>.json (the permission allow/deny grant set). " +
    "fragmentId identity plus grantedTools (allow count) and deniedTools (deny count); " +
    "richer fragment metadata (ask-gate rules, env, surface status) lives in the json, " +
    "not duplicated in this seed.",
  primaryKeyProperty: "fragmentId",
  titleProperty: "fragmentId",
  properties: [
    { name: "fragmentId", type: "string" },
    { name: "grantedTools", type: "number" },
    { name: "deniedTools", type: "number" },
  ],
};

/**
 * A registered ManagedSettingsFragment instance — stable fragment identity (the json
 * filename without extension) plus the two stored facts read off the fragment json.
 */
export interface ManagedSettingsFragmentInstance {
  readonly fragmentId: string;
  readonly grantedTools: number;
  readonly deniedTools: number;
}

/**
 * The 1 ManagedSettingsFragment instance — pm's LIVE per-project RBAC fragment.
 * Snapshot-owned seed (no fragment json import); the registration test cross-checks the
 * fragment id against the live managed-settings.d/ directory and the grant/deny counts
 * against the fragment json, failing on any drift.
 */
export const MANAGED_SETTINGS_FRAGMENT_INSTANCES: readonly ManagedSettingsFragmentInstance[] = [
  { fragmentId: "50-palantir-mini", grantedTools: 63, deniedTools: 2 },
];

// Register the ManagedSettingsFragment ObjectType (the type). The 1 instance above is
// data the self-model exposes + the registration test counts; instances are not
// type-registered.
OBJECT_TYPE_REGISTRY.register(MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE);
