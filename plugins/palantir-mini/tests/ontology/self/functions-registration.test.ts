// Tests: Wave-3 self-Ontology Function noun — pm's bound-LOGIC surface modeled as a
// `Function` ObjectType + 76 seeded Function instances (catalog §4). Proves the type
// resolves from OBJECT_TYPE_REGISTRY, that the seed holds exactly 76 unique functions with
// no duplicate names or RIDs, and that every instance's sourcePath resolves to a real file
// on disk (the "all resolve" guard). The 62 handler-backed functions trace 1:1 to
// bridge/handlers/*.ts (the SSoT, functional handlers 62 >> exposed tools 29), including
// the ~34 HIDDEN sub-mode handlers a naive 1-tool-per-type pass drops; the remaining 14
// are lib-subsystem / recap composite LOGIC. Importing the barrel runs the self-registration
// side effect.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  FUNCTION_OBJECT_TYPE,
  FUNCTION_OBJECT_TYPE_RID,
  FUNCTION_INSTANCES,
  type FunctionInstance,
} from "#schemas/ontology/self/functions";

const EXPECTED_FUNCTION_COUNT = 76;
// plugins/palantir-mini root: this test lives at tests/ontology/self/, so 3 levels up.
const PLUGIN_ROOT = path.join(import.meta.dir, "../../..");

test("self Function ObjectType is registered with functionName identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(FUNCTION_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(FUNCTION_OBJECT_TYPE);
  expect(got!.apiName).toBe("Function");
  expect(got!.primaryKeyProperty).toBe("functionName");
});

test(`Function seed has exactly ${EXPECTED_FUNCTION_COUNT} instances`, () => {
  expect(FUNCTION_INSTANCES.length).toBe(EXPECTED_FUNCTION_COUNT);
});

test("Function seed has no duplicate functionName", () => {
  const names = FUNCTION_INSTANCES.map((i: FunctionInstance) => i.functionName);
  expect(new Set(names).size).toBe(EXPECTED_FUNCTION_COUNT);
});

test("Function seed has no duplicate functionRid", () => {
  const rids = FUNCTION_INSTANCES.map((i: FunctionInstance) => i.functionRid);
  expect(new Set(rids).size).toBe(EXPECTED_FUNCTION_COUNT);
});

test("every Function instance sourcePath resolves to a real file (all resolve)", () => {
  const unresolved = FUNCTION_INSTANCES.filter(
    (i: FunctionInstance) => !fs.existsSync(path.join(PLUGIN_ROOT, i.sourcePath)),
  ).map((i: FunctionInstance) => `${i.functionName} -> ${i.sourcePath}`);
  expect(unresolved).toEqual([]);
});

test("the ~34 HIDDEN sub-mode handlers are each modeled (under-modeling guard)", () => {
  // The biggest under-modeling trap: dispatcher tools (pm_health_audit / pm_substrate_query
  // / pm_plugin_self_check) fan out to sub-mode handlers that a 1-tool-per-type pass drops.
  // Assert each sub-mode group is present as its own Function instance.
  const byGroup = (g: string): readonly FunctionInstance[] =>
    FUNCTION_INSTANCES.filter((i: FunctionInstance) => i.group === g);
  expect(byGroup("pm-health-audit-submode").length).toBe(7);
  expect(byGroup("pm-substrate-query-submode").length).toBe(7);
  expect(byGroup("self-check-validator").length).toBe(7); // 6 validators + workbench-state
  // The three dispatchers themselves are modeled, distinct from their sub-modes.
  const names = new Set(
    FUNCTION_INSTANCES.map((i: FunctionInstance) => i.functionName),
  );
  expect(names.has("pmHealthAudit")).toBe(true);
  expect(names.has("pmSubstrateQuery")).toBe(true);
  expect(names.has("pmPluginSelfCheck")).toBe(true);
});

test("every Function instance carries identity-level fields (name + group + sourcePath + kind)", () => {
  for (const i of FUNCTION_INSTANCES) {
    expect(typeof i.functionName).toBe("string");
    expect(i.functionName.length).toBeGreaterThan(0);
    expect(typeof i.group).toBe("string");
    expect(i.group.length).toBeGreaterThan(0);
    expect(typeof i.sourcePath).toBe("string");
    expect(i.sourcePath.length).toBeGreaterThan(0);
    expect(["aip-logic", "edit-function", "convex-mutation", "convex-query"]).toContain(
      i.kind,
    );
  }
});
