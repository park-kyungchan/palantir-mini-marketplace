/**
 * palantir-mini SELF-ONTOLOGY — PluginManifest as a registered ObjectType + its 1 instance
 * (Wave 2, harness redesign self-model build). Mirrors the `skill.objecttype.ts` /
 * `agent.objecttype.ts` idiom: ONE `PluginManifest` ObjectType (the type) + the live
 * `.claude-plugin/plugin.json` registration SSoT seeded as a single instance.
 *
 * pm's plugin/marketplace registration surface modeled AS ontology: the
 * `.claude-plugin/plugin.json` manifest is the SSoT for what this plugin registers (its
 * MCP servers, and — via the agents/ and skills/ directories the manifest governs — its
 * subagent + skill surfaces). This file declares the type and seeds the single manifest
 * instance — the snapshot OWNS the seed (it is the authority), so it does NOT import the
 * manifest uphill. The paired registration test cross-checks these stored facts against
 * the LIVE plugin.json + agents/ + skills/ directories so the self-model fails loud if
 * pm's registration surface drifts (version bump, an MCP server added, an agent/skill
 * added/removed without updating this seed).
 *
 * Count provenance (LIVE-verified): exactly ONE plugin manifest
 * (`.claude-plugin/plugin.json`). Each instance carries the manifestId identity (the
 * plugin `name:` field, the PK) plus four stored facts read off the manifest + the
 * directories it governs: `version` (the manifest version), `mcpServers` (count of
 * registered MCP server entries), `registeredAgents` (count of agents/*.md the manifest
 * governs), and `registeredSkills` (count of skills/<slug> directories, excluding the
 * `_shared` fragment dir).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology PluginManifest ObjectType. */
export const PLUGIN_MANIFEST_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/plugin-manifest",
);

/**
 * PluginManifest modeled as a Palantir ObjectType. `manifestId` is the stable primary
 * key (the plugin `name:` field); `version`, `mcpServers`, `registeredAgents`, and
 * `registeredSkills` are stored facts carried on the registered INSTANCE below. The
 * PascalCase apiName mirrors the generated symbol.
 */
export const PLUGIN_MANIFEST_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  apiName: "PluginManifest",
  name: "PluginManifest",
  description:
    "palantir-mini plugin/marketplace registration SSoT modeled as an ObjectType: one " +
    "instance per .claude-plugin/plugin.json manifest. manifestId identity plus version, " +
    "mcpServers count, registeredAgents count (agents/*.md), and registeredSkills count " +
    "(skills/<slug> dirs); richer manifest metadata (keywords, mcpServers config) lives " +
    "in plugin.json, not duplicated in this seed.",
  primaryKeyProperty: "manifestId",
  titleProperty: "manifestId",
  properties: [
    { name: "manifestId", type: "string" },
    { name: "version", type: "string" },
    { name: "mcpServers", type: "number" },
    { name: "registeredAgents", type: "number" },
    { name: "registeredSkills", type: "number" },
  ],
};

/**
 * A registered PluginManifest instance — stable manifest identity (the plugin name)
 * plus the four stored facts read off the manifest + the directories it governs.
 */
export interface PluginManifestInstance {
  readonly manifestId: string;
  readonly version: string;
  readonly mcpServers: number;
  readonly registeredAgents: number;
  readonly registeredSkills: number;
}

/**
 * The 1 PluginManifest instance — pm's LIVE registration SSoT. Snapshot-owned seed (no
 * manifest import); the registration test cross-checks these stored facts against the
 * live plugin.json + agents/ + skills/ directories and fails on any drift. `version` is a
 * volatile fact: the drift guard re-reads it from plugin.json rather than asserting a
 * pinned literal, so a version bump does not break the test.
 */
export const PLUGIN_MANIFEST_INSTANCES: readonly PluginManifestInstance[] = [
  {
    manifestId: "palantir-mini",
    version: "6.110.0",
    mcpServers: 1,
    registeredAgents: 15,
    registeredSkills: 61,
  },
];

// Register the PluginManifest ObjectType (the type). The 1 instance above is data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(PLUGIN_MANIFEST_OBJECT_TYPE);
