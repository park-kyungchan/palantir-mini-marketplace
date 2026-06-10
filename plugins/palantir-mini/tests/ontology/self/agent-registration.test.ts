// Test: Wave-1 self-Ontology Agent ObjectType — pm's governed subagent surface
// registered AS an ObjectType + 9 agent instances. Proves the self-model gains the
// Agent noun and that the seed (identity + tier + mutationCapability) stays true to the
// LIVE agents/ directory declarations (drift guard).

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the barrel executes the instance module → self-registration side effect.
import {
  AGENT_OBJECT_TYPE,
  AGENT_OBJECT_TYPE_RID,
  AGENT_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_AGENT_COUNT = 9;

test("self Agent ObjectType is registered with agentId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(AGENT_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(AGENT_OBJECT_TYPE);
  expect(got!.apiName).toBe("Agent");
  expect(got!.primaryKeyProperty).toBe("agentId");
});

test(`Agent seed has ${EXPECTED_AGENT_COUNT} unique agent instances`, () => {
  expect(AGENT_INSTANCES.length).toBe(EXPECTED_AGENT_COUNT);
  const ids = AGENT_INSTANCES.map((i) => i.agentId);
  expect(new Set(ids).size).toBe(EXPECTED_AGENT_COUNT); // no duplicates
});

test("Agent seed identity set matches the LIVE agents/ directory (drift guard)", () => {
  // The snapshot OWNS the seed (no agents-tree import); this guard reads the live
  // agents/ directory and asserts the self-model's 9 agentIds equal pm's actual agent
  // surface, so adding or removing an agent fails loud until agent.objecttype.ts is
  // updated.
  const agentsDir = path.join(import.meta.dir, "../../../agents");
  const liveIds = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => d.name.replace(/\.md$/, ""));
  const liveSet = new Set(liveIds);
  const seedSet = new Set(AGENT_INSTANCES.map((i) => i.agentId));
  expect(liveSet.size).toBe(EXPECTED_AGENT_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("Agent seed tier + mutationCapability match each LIVE declaration (fact drift guard)", () => {
  // Beyond identity, each instance carries two stored facts read off the .md: tier
  // (the `model:` field) and mutationCapability (read-only when disallowedTools forbid
  // Write/Edit/NotebookEdit, else mutating). Re-derive from the live files and assert
  // the seed facts match, so a model bump or a read-only/mutating change fails loud.
  const agentsDir = path.join(import.meta.dir, "../../../agents");
  for (const inst of AGENT_INSTANCES) {
    const src = fs.readFileSync(path.join(agentsDir, `${inst.agentId}.md`), "utf8");
    const tier = src.match(/^model:\s*(\S+)/m)?.[1];
    expect(tier).toBe(inst.tier);
    const disallow = src.match(/^disallowedTools:[\s\S]*?(?=^\S)/m)?.[0] ?? "";
    const readOnly = /\b(Write|Edit|NotebookEdit)\b/.test(disallow);
    const liveCapability = readOnly ? "read-only" : "mutating";
    expect(liveCapability).toBe(inst.mutationCapability);
  }
});
