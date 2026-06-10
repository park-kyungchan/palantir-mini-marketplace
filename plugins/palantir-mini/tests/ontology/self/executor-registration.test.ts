// Tests: M-SELF deliverables #2 + #3 (harness redesign W3e-3a) — pm's Hands-layer
// Executor registered AS a typed Tier-2 ActionType, and pm's MCP surface registered
// AS an McpTool ObjectType + 23 tool instances. Proves the self-Ontology gains its
// first ActionType (ACTION_TYPE_REGISTRY.register-grep over self/ goes 0 → 1) and that
// the McpTool seed stays true to the LIVE bridge surface (drift guard).

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ACTION_TYPE_REGISTRY } from "#schemas/ontology/primitives/action-type";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the barrel executes the instance modules → self-registration side effect.
import {
  EXECUTOR_ACTION_TYPE,
  EXECUTOR_ACTION_TYPE_RID,
  MCP_TOOL_OBJECT_TYPE,
  MCP_TOOL_OBJECT_TYPE_RID,
  MCP_TOOL_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_MCP_TOOL_COUNT = 23;

test("self Executor is registered in ACTION_TYPE_REGISTRY (register-grep > 0)", () => {
  const got = ACTION_TYPE_REGISTRY.get(EXECUTOR_ACTION_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(EXECUTOR_ACTION_TYPE);
  expect(got!.apiName).toBe("Executor");
});

test("Executor is a Tier-2 function-backed action wrapping an EditFunction", () => {
  expect(EXECUTOR_ACTION_TYPE.tier).toBe("tier-2");
  // tier-2 carries editFunctionName (the wrapped pure compute step); narrow to access it.
  expect(EXECUTOR_ACTION_TYPE.tier === "tier-2" && EXECUTOR_ACTION_TYPE.editFunctionName)
    .toBe("pm.sandbox.executor.applyEditSteps");
  // DTC-gate-strict + worktree-isolated + no opaque side effects (argv-safe shell + edits).
  expect(EXECUTOR_ACTION_TYPE.approvalPolicy).toBe("policy-approval");
  expect(EXECUTOR_ACTION_TYPE.branchPolicy).toBe("branch-required");
  expect(EXECUTOR_ACTION_TYPE.sideEffects).toEqual([]);
  expect(EXECUTOR_ACTION_TYPE.validateOnlySupported).toBe(true);
  // The stepKind parameter is derived from the v1 EXEC_STEP_KINDS vocabulary.
  const stepKind = EXECUTOR_ACTION_TYPE.parameters?.find((p) => p.name === "stepKind");
  expect(stepKind?.type).toBe('"shell" | "edit"');
  expect(stepKind?.required).toBe(true);
});

test("self McpTool ObjectType is registered with toolName identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(MCP_TOOL_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(MCP_TOOL_OBJECT_TYPE);
  expect(got!.apiName).toBe("McpTool");
  expect(got!.primaryKeyProperty).toBe("toolName");
});

test(`McpTool seed has ${EXPECTED_MCP_TOOL_COUNT} unique tool instances`, () => {
  expect(MCP_TOOL_INSTANCES.length).toBe(EXPECTED_MCP_TOOL_COUNT);
  const names = MCP_TOOL_INSTANCES.map((i) => i.toolName);
  expect(new Set(names).size).toBe(EXPECTED_MCP_TOOL_COUNT); // no duplicates
});

test("McpTool seed matches the LIVE bridge/mcp-server.ts TOOLS surface (drift guard)", () => {
  // The snapshot OWNS the seed (no lib import uphill); this guard reads the bridge as
  // TEXT and asserts the self-model's 23 names equal pm's actual MCP surface, so adding
  // or removing a bridge tool fails loud until mcp-tool.objecttype.ts is updated.
  const bridgePath = path.join(import.meta.dir, "../../../bridge/mcp-server.ts");
  const src = fs.readFileSync(bridgePath, "utf8");
  // Top-level TOOLS entries declare `name: "..."` at 4-space indent (grounding-verified
  // method; parameter/schema names are nested deeper). Matches exactly the tool set.
  const liveNames = [...src.matchAll(/^ {4}name: "([^"]+)"/gm)].map((m) => m[1]!);
  const liveSet = new Set(liveNames);
  const seedSet = new Set(MCP_TOOL_INSTANCES.map((i) => i.toolName));
  expect(liveSet.size).toBe(EXPECTED_MCP_TOOL_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});
