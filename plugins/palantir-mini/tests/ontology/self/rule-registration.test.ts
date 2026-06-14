// Test: Wave-2 self-Ontology Rule ObjectType — pm's global behavioral-overlay rules
// registered AS an ObjectType + 9 active-rule instances. Proves the self-model gains the
// Rule noun and that the seed (ruleId + slug + scope) stays true to the LIVE
// ~/.claude/rules/ numbered files (drift guard) — a rule added/removed without updating
// the seed fails loud here.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  RULE_OBJECT_TYPE,
  RULE_OBJECT_TYPE_RID,
  RULE_INSTANCES,
} from "#schemas/ontology/self/rule.objecttype";

const EXPECTED_RULE_COUNT = 9;

// Live rule-BODY directory — the global Claude-overlay rule bodies. The per-turn
// router files (CORE.md/BROWSE.md) stay in ~/.claude/rules/, but the numbered NN-*.md
// bodies were relocated OUT of the per-turn flat-glob inject set into the sibling
// rules-bodies/ home (2026-06-14 rules-lightening). This guard reads that body home so
// it still asserts the self-model's 9 ruleIds against pm's actual active-rule files.
const RULES_DIR = path.join(os.homedir(), ".claude", "rules-bodies", "2026-06-14");

test("self Rule ObjectType is registered with ruleId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(RULE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(RULE_OBJECT_TYPE);
  expect(got!.apiName).toBe("Rule");
  expect(got!.primaryKeyProperty).toBe("ruleId");
});

test(`Rule seed has ${EXPECTED_RULE_COUNT} unique rule instances`, () => {
  expect(RULE_INSTANCES.length).toBe(EXPECTED_RULE_COUNT);
  const ids = RULE_INSTANCES.map((i: { ruleId: number }) => i.ruleId);
  expect(new Set(ids).size).toBe(EXPECTED_RULE_COUNT); // no duplicates
});

test("Rule seed ruleId set matches the LIVE ~/.claude/rules/ numbered files (drift guard)", () => {
  // The snapshot OWNS the seed (no rules-tree import); this guard reads the live
  // ~/.claude/rules/ directory and asserts the self-model's 9 ruleIds equal pm's actual
  // active-rule set, so adding or removing a numbered rule file fails loud until
  // rule.objecttype.ts is updated. CORE/CONTEXT/BROWSE/AUTHORING routers carry no numeric
  // prefix and are excluded by the NN- filename filter.
  const liveIds = fs
    .readdirSync(RULES_DIR, { withFileTypes: true })
    .filter((d: fs.Dirent) => d.isFile() && /^\d+-.*\.md$/.test(d.name))
    .map((d: fs.Dirent) => Number(d.name.match(/^(\d+)-/)![1]));
  const liveSet = new Set(liveIds);
  const seedSet = new Set(RULE_INSTANCES.map((i: { ruleId: number }) => i.ruleId));
  expect(liveSet.size).toBe(EXPECTED_RULE_COUNT);
  expect([...seedSet].sort((a: number, b: number) => a - b)).toEqual(
    [...liveSet].sort((a: number, b: number) => a - b),
  );
});

test("Rule seed slug matches each LIVE filename + scope is global (fact drift guard)", () => {
  // Beyond identity, each instance carries the slug (the NN-<slug>.md suffix) and scope
  // (the frontmatter scope: field). Re-derive from the live files and assert the seed
  // facts match, so a rename or a scope change fails loud.
  for (const inst of RULE_INSTANCES) {
    const prefix = String(inst.ruleId).padStart(2, "0");
    const file = path.join(RULES_DIR, `${prefix}-${inst.slug}.md`);
    expect(fs.existsSync(file)).toBe(true);
    const src = fs.readFileSync(file, "utf8");
    const scope = src.match(/^scope:\s*(\S+)/m)?.[1];
    expect(scope).toBe(inst.scope);
  }
});
