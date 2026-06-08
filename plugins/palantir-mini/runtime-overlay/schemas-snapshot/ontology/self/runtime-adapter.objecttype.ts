/**
 * palantir-mini SELF-ONTOLOGY — RuntimeAdapter as a registered ObjectType + its 3
 * instances (Wave 2, harness redesign self-model build). Mirrors the
 * `agent.objecttype.ts` idiom: ONE `RuntimeAdapter` ObjectType (the type) + the live
 * Hands-layer exec-adapters (claude / codex / gemini) seeded as instances.
 *
 * pm's Hands-layer modeled AS ontology: in the Brain-of-Swarms split (pm = runtime-
 * neutral Brain; the runtime = Hands), each runtime adapter is how one vendor runtime
 * executes tools + observes lifecycle events under pm's neutral control plane. This file
 * declares the type and seeds the 3 adapters — the snapshot OWNS the seed (it is the
 * authority), so it does NOT import the lib adapter trees uphill. The paired registration
 * test cross-checks these 3 runtime ids against the LIVE `lib/runtime/capability-matrix`
 * RuntimeId union so the self-model fails loud if pm's adapter surface drifts (a runtime
 * added/removed without updating this seed).
 *
 * Count provenance (LIVE-verified): exactly 3 runtime adapters — `claude` and `codex`
 * have full `lib/<runtime>/` exec-adapter dirs; `gemini` is a declared runtime in the
 * `lib/runtime/capability-matrix.ts` RUNTIME_CAPABILITY_MATRIX (the canonical adapter
 * roster) and `lib/runtime/identity.ts` RuntimeIdentity union. Each instance carries the
 * runtime identity (`runtime` = the RuntimeId, the PK) plus two stored facts: `supportLevel`
 * ("full" when a dedicated lib/<runtime>/ exec-adapter exists, else "matrix-declared")
 * and `providerIdentity` (the normalized byWhom.identity value the adapter self-attributes,
 * rule 27). Richer per-adapter facts (native event sets, fallback obligations, tool
 * profile) live in lib/runtime/, not duplicated in the seed.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology RuntimeAdapter ObjectType. */
export const RUNTIME_ADAPTER_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/runtime-adapter",
);

/**
 * RuntimeAdapter modeled as a Palantir ObjectType. `runtime` is the stable primary key
 * (the RuntimeId); `supportLevel` and `providerIdentity` are stored facts carried on each
 * registered INSTANCE below. The PascalCase apiName mirrors the generated symbol.
 */
export const RUNTIME_ADAPTER_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: RUNTIME_ADAPTER_OBJECT_TYPE_RID,
  apiName: "RuntimeAdapter",
  name: "RuntimeAdapter",
  description:
    "palantir-mini Hands-layer runtime exec-adapter modeled as an ObjectType: one " +
    "instance per vendor runtime (claude/codex/gemini) under the neutral control plane. " +
    "runtime identity plus supportLevel (full lib adapter vs matrix-declared) and " +
    "providerIdentity (the byWhom.identity the adapter self-attributes); richer adapter " +
    "facts (native event sets, fallback obligations, tool profile) live in lib/runtime/, " +
    "not here.",
  primaryKeyProperty: "runtime",
  titleProperty: "runtime",
  properties: [
    { name: "runtime", type: "string" },
    { name: "supportLevel", type: '"full" | "matrix-declared"' },
    { name: "providerIdentity", type: "string" },
  ],
};

/**
 * A registered RuntimeAdapter instance — stable runtime identity (the RuntimeId) plus
 * the two stored facts read off the adapter roster.
 */
export interface RuntimeAdapterInstance {
  readonly runtime: string;
  readonly supportLevel: "full" | "matrix-declared";
  readonly providerIdentity: string;
}

/**
 * The 3 RuntimeAdapter instances — pm's LIVE Hands-layer adapter roster, in
 * RUNTIME_CAPABILITY_MATRIX key order. Snapshot-owned seed (no lib adapter import); the
 * registration test cross-checks this set against the live capability-matrix RuntimeId
 * roster and fails on any drift. `providerIdentity` is the normalized self-attribution
 * value (rule 27): claude → "claude-code", codex → "codex", gemini → "gemini".
 */
export const RUNTIME_ADAPTER_INSTANCES: readonly RuntimeAdapterInstance[] = [
  { runtime: "claude", supportLevel: "full", providerIdentity: "claude-code" },
  { runtime: "codex", supportLevel: "full", providerIdentity: "codex" },
  { runtime: "gemini", supportLevel: "matrix-declared", providerIdentity: "gemini" },
];

// Register the RuntimeAdapter ObjectType (the type). The 3 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(RUNTIME_ADAPTER_OBJECT_TYPE);
