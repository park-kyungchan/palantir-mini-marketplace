// Test: Wave 1 self-Ontology deliverable — pm's lifecycle-hook surface registered AS a
// typed Hook ObjectType + 64 hook instances (44 wired + 20 orphan). Proves the Hook
// ObjectType is registered and that the seed stays true to the LIVE hooks/ filesystem
// and the wired set in hooks/hooks.json (drift guard: a hook added/removed, or a
// wired<->orphan flip, fails loud until hook.objecttype.ts is updated).

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the barrel executes the instance module → self-registration side effect.
import {
  HOOK_OBJECT_TYPE,
  HOOK_OBJECT_TYPE_RID,
  HOOK_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_HOOK_COUNT = 49;
const EXPECTED_WIRED_COUNT = 48;
const EXPECTED_ORPHAN_COUNT = 1;

// HOOK-3 coalesce: the four emit_event PostToolUse consumers are no longer listed
// individually in hooks.json — they fire as in-process members of the
// `emit-event-postdispatch` aggregator (the single wired hooks.json entry). They remain
// genuinely wired (orphanInRegistry:false). The hooks.json wiring drift guard parses
// commands literally, so it must add these aggregator members to the computed wired set.
const AGGREGATOR_MEMBERS: Record<string, readonly string[]> = {
  "emit-event-postdispatch": [
    "outcome-pair-tracker",
    "memory-layer-validator",
    "t3-circuit-feeder",
    "t4-canonical-emit-watch",
  ],
};

test("self Hook ObjectType is registered with hookId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(HOOK_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(HOOK_OBJECT_TYPE);
  expect(got!.apiName).toBe("Hook");
  expect(got!.primaryKeyProperty).toBe("hookId");
});

test(`Hook seed has ${EXPECTED_HOOK_COUNT} unique hook instances`, () => {
  expect(HOOK_INSTANCES.length).toBe(EXPECTED_HOOK_COUNT);
  const ids = HOOK_INSTANCES.map((h) => h.hookId);
  expect(new Set(ids).size).toBe(EXPECTED_HOOK_COUNT); // no duplicates
});

test(`Hook seed wired/orphan split is ${EXPECTED_WIRED_COUNT}/${EXPECTED_ORPHAN_COUNT}`, () => {
  const orphan = HOOK_INSTANCES.filter((h) => h.orphanInRegistry).length;
  const wired = HOOK_INSTANCES.filter((h) => !h.orphanInRegistry).length;
  expect(wired).toBe(EXPECTED_WIRED_COUNT);
  expect(orphan).toBe(EXPECTED_ORPHAN_COUNT);
});

test("Hook seed matches the LIVE hooks/ filesystem (drift guard)", () => {
  // The snapshot OWNS the seed (no hooks-layer import); this guard reads the live hooks/
  // dir and asserts the self-model's 64 hookIds equal pm's actual hook files, so adding
  // or removing a hook file fails loud until hook.objecttype.ts is updated.
  const hooksDir = path.join(import.meta.dir, "../../../hooks");
  const liveFiles = fs
    .readdirSync(hooksDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.slice(0, -3));
  const liveSet = new Set(liveFiles);
  const seedSet = new Set(HOOK_INSTANCES.map((h) => h.hookId));
  expect(liveSet.size).toBe(EXPECTED_HOOK_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("Hook seed orphanInRegistry matches the LIVE hooks/hooks.json wiring (drift guard)", () => {
  // Parse the live hooks.json (the wiring SoT is JSON, so JSON.parse is the faithful
  // read — not raw-text regex, which the JSON quote-escaping would defeat) and resolve
  // each wired hookId from its command: either a direct hooks/<id>.ts command or the
  // scripts/run.ts <id> dispatcher form. A seed entry's orphanInRegistry must equal
  // "(id is NOT in the live wired set)", so wiring/un-wiring a hook without updating the
  // seed fails loud.
  const hooksJsonPath = path.join(import.meta.dir, "../../../hooks/hooks.json");
  const parsed = JSON.parse(fs.readFileSync(hooksJsonPath, "utf8")) as {
    hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
  };
  const events = parsed.hooks ?? (parsed as Record<string, unknown>);
  const wired = new Set<string>();
  for (const arr of Object.values(events)) {
    if (!Array.isArray(arr)) continue;
    for (const matcher of arr as Array<{ hooks?: Array<{ command?: string }> }>) {
      for (const h of matcher.hooks ?? []) {
        const cmd = h.command ?? "";
        const direct = cmd.match(/\/hooks\/([a-z0-9-]+)\.ts/);
        if (direct) {
          wired.add(direct[1]!);
          continue;
        }
        const disp = cmd.match(/\/scripts\/run\.ts"?\s+([a-z0-9-]+)/);
        if (disp) wired.add(disp[1]!);
      }
    }
  }

  // Expand in-process aggregators: a wired aggregator (e.g. emit-event-postdispatch)
  // transitively wires its member consumers, which do NOT appear literally in hooks.json.
  for (const [aggregator, members] of Object.entries(AGGREGATOR_MEMBERS)) {
    if (wired.has(aggregator)) {
      for (const m of members) wired.add(m);
    }
  }

  expect(wired.size).toBe(EXPECTED_WIRED_COUNT);

  const seedWired = new Set(
    HOOK_INSTANCES.filter((h) => !h.orphanInRegistry).map((h) => h.hookId),
  );
  expect([...seedWired].sort()).toEqual([...wired].sort());

  // Every seed orphan must genuinely be absent from the live wired set.
  for (const h of HOOK_INSTANCES) {
    expect(h.orphanInRegistry).toBe(!wired.has(h.hookId));
  }
});
