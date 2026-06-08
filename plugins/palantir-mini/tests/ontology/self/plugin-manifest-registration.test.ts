// Test: Wave-2 self-Ontology PluginManifest ObjectType — pm's plugin/marketplace
// registration SSoT registered AS an ObjectType + 1 manifest instance. Proves the
// self-model gains the PluginManifest noun and that the seed (mcpServers +
// registeredAgents + registeredSkills) stays true to the LIVE plugin.json + agents/ +
// skills/ directories (drift guard). `version` is volatile and intentionally NOT pinned
// in the seed (CLAUDE.md section 6), so it is not asserted here.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the instance module executes it → self-registration side effect.
import {
  PLUGIN_MANIFEST_OBJECT_TYPE,
  PLUGIN_MANIFEST_OBJECT_TYPE_RID,
  PLUGIN_MANIFEST_INSTANCES,
} from "#schemas/ontology/self/plugin-manifest.objecttype";

const EXPECTED_MANIFEST_COUNT = 1;
const PLUGIN_ROOT = path.join(import.meta.dir, "../../..");

test("self PluginManifest ObjectType is registered with manifestId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(PLUGIN_MANIFEST_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(PLUGIN_MANIFEST_OBJECT_TYPE);
  expect(got!.apiName).toBe("PluginManifest");
  expect(got!.primaryKeyProperty).toBe("manifestId");
});

test(`PluginManifest seed has ${EXPECTED_MANIFEST_COUNT} unique manifest instance`, () => {
  expect(PLUGIN_MANIFEST_INSTANCES.length).toBe(EXPECTED_MANIFEST_COUNT);
  const ids = PLUGIN_MANIFEST_INSTANCES.map((i: { manifestId: string }) => i.manifestId);
  expect(new Set(ids).size).toBe(EXPECTED_MANIFEST_COUNT); // no duplicates
});

test("PluginManifest seed identity + mcpServers match the LIVE plugin.json (drift guard)", () => {
  // The snapshot OWNS the seed (no manifest import); this guard reads the live
  // .claude-plugin/plugin.json and asserts the self-model's manifestId equals the plugin
  // name and the mcpServers count equals the number of registered MCP server entries.
  // `version` is volatile and intentionally NOT pinned in the seed (CLAUDE.md section 6),
  // so it is not asserted — read the live value from plugin.json when needed.
  const manifestPath = path.join(PLUGIN_ROOT, ".claude-plugin/plugin.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    name: string;
    mcpServers?: Record<string, unknown>;
  };
  const inst = PLUGIN_MANIFEST_INSTANCES[0]!;
  expect(inst.manifestId).toBe(manifest.name);
  expect(inst.mcpServers).toBe(Object.keys(manifest.mcpServers ?? {}).length);
});

test("PluginManifest seed registeredAgents + registeredSkills match the LIVE dirs (drift guard)", () => {
  // registeredAgents = count of agents/*.md the manifest governs; registeredSkills =
  // count of skills/<slug> directories excluding the _shared fragment dir. Re-derive from
  // the live directories so adding/removing an agent or skill fails loud.
  const agentsDir = path.join(PLUGIN_ROOT, "agents");
  const liveAgents = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((d: fs.Dirent) => d.isFile() && d.name.endsWith(".md")).length;

  const skillsDir = path.join(PLUGIN_ROOT, "skills");
  const liveSkills = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d: fs.Dirent) => d.isDirectory() && d.name !== "_shared").length;

  const inst = PLUGIN_MANIFEST_INSTANCES[0]!;
  expect(inst.registeredAgents).toBe(liveAgents);
  expect(inst.registeredSkills).toBe(liveSkills);
});
