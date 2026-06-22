// Test: Wave-1 self-Ontology Skill ObjectType — pm's governed skill surface registered
// AS an ObjectType + 45 skill instances. Proves the self-model gains the Skill noun and
// that the seed stays true to the LIVE skills/ directory surface (drift guard).

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the barrel executes the instance module → self-registration side effect.
import {
  SKILL_OBJECT_TYPE,
  SKILL_OBJECT_TYPE_RID,
  SKILL_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_SKILL_COUNT = 45;

test("self Skill ObjectType is registered with slug identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(SKILL_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(SKILL_OBJECT_TYPE);
  expect(got!.apiName).toBe("Skill");
  expect(got!.primaryKeyProperty).toBe("slug");
});

test(`Skill seed has ${EXPECTED_SKILL_COUNT} unique skill instances`, () => {
  expect(SKILL_INSTANCES.length).toBe(EXPECTED_SKILL_COUNT);
  const slugs = SKILL_INSTANCES.map((i) => i.slug);
  expect(new Set(slugs).size).toBe(EXPECTED_SKILL_COUNT); // no duplicates
});

test("Skill seed matches the LIVE skills/ directory surface (drift guard)", () => {
  // The snapshot OWNS the seed (no skills-tree import); this guard reads the live
  // skills/ directory and asserts the self-model's 45 slugs equal pm's actual skill
  // surface, so adding or removing a skill dir fails loud until skill.objecttype.ts is
  // updated. `_shared` is a shared-fragment dir, not a skill — excluded.
  const skillsDir = path.join(import.meta.dir, "../../../skills");
  const liveSlugs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_shared")
    .map((d) => d.name);
  const liveSet = new Set(liveSlugs);
  const seedSet = new Set(SKILL_INSTANCES.map((i) => i.slug));
  expect(liveSet.size).toBe(EXPECTED_SKILL_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});
