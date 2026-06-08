// Test: Wave-2 self-Ontology ManagedSettingsFragment ObjectType — pm's per-project RBAC
// settings fragment registered AS an ObjectType + 1 instance. Proves the self-model gains
// the ManagedSettingsFragment noun and that the seed (fragmentId + grantedTools +
// deniedTools) stays true to the LIVE managed-settings.d/ directory + fragment json
// (drift guard) — a fragment or a grant/deny entry added/removed fails loud here.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the instance module executes it → self-registration side effect.
import {
  MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE,
  MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID,
  MANAGED_SETTINGS_FRAGMENT_INSTANCES,
} from "#schemas/ontology/self/managed-settings-fragment.objecttype";

const EXPECTED_FRAGMENT_COUNT = 1;
const PLUGIN_ROOT = path.join(import.meta.dir, "../../..");
const FRAGMENT_DIR = path.join(PLUGIN_ROOT, "managed-settings.d");

test("self ManagedSettingsFragment ObjectType is registered with fragmentId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(MANAGED_SETTINGS_FRAGMENT_OBJECT_TYPE);
  expect(got!.apiName).toBe("ManagedSettingsFragment");
  expect(got!.primaryKeyProperty).toBe("fragmentId");
});

test(`ManagedSettingsFragment seed has ${EXPECTED_FRAGMENT_COUNT} unique fragment instance`, () => {
  expect(MANAGED_SETTINGS_FRAGMENT_INSTANCES.length).toBe(EXPECTED_FRAGMENT_COUNT);
  const ids = MANAGED_SETTINGS_FRAGMENT_INSTANCES.map(
    (i: { fragmentId: string }) => i.fragmentId,
  );
  expect(new Set(ids).size).toBe(EXPECTED_FRAGMENT_COUNT); // no duplicates
});

test("ManagedSettingsFragment seed identity set matches the LIVE managed-settings.d/ dir (drift guard)", () => {
  // The snapshot OWNS the seed (no fragment json import as data); this guard reads the
  // live managed-settings.d/ directory and asserts the self-model's fragmentIds equal the
  // live *.json filenames (without extension), so adding or removing a fragment fails loud
  // until managed-settings-fragment.objecttype.ts is updated.
  const liveIds = fs
    .readdirSync(FRAGMENT_DIR, { withFileTypes: true })
    .filter((d: fs.Dirent) => d.isFile() && d.name.endsWith(".json"))
    .map((d: fs.Dirent) => d.name.replace(/\.json$/, ""));
  const liveSet = new Set(liveIds);
  const seedSet = new Set(
    MANAGED_SETTINGS_FRAGMENT_INSTANCES.map((i: { fragmentId: string }) => i.fragmentId),
  );
  expect(liveSet.size).toBe(EXPECTED_FRAGMENT_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("ManagedSettingsFragment seed grant/deny counts match each LIVE fragment json (fact drift guard)", () => {
  // Beyond identity, each instance carries grantedTools (permissions.allow count) and
  // deniedTools (permissions.deny count). Re-derive from the live fragment json and assert
  // the seed facts match, so a grant/deny entry added or removed fails loud.
  for (const inst of MANAGED_SETTINGS_FRAGMENT_INSTANCES) {
    const fragmentPath = path.join(FRAGMENT_DIR, `${inst.fragmentId}.json`);
    const json = JSON.parse(fs.readFileSync(fragmentPath, "utf8")) as {
      permissions?: { allow?: unknown[]; deny?: unknown[] };
    };
    const liveAllow = json.permissions?.allow?.length ?? 0;
    const liveDeny = json.permissions?.deny?.length ?? 0;
    expect(inst.grantedTools).toBe(liveAllow);
    expect(inst.deniedTools).toBe(liveDeny);
  }
});
