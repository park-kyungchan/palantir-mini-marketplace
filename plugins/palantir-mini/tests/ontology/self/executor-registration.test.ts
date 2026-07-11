// Tests: M-SELF deliverables #2 + #3 (harness redesign W3e-3a) — pm's Hands-layer
// Executor registered AS a typed Tier-2 ActionType, and pm's MCP surface registered
// AS an McpTool ObjectType + 24 tool instances (pm authorization-flexibility slice 3
// added pm_authorize_delivery: 23 → 24). Proves the self-Ontology gains its
// first ActionType (ACTION_TYPE_REGISTRY.register-grep over self/ goes 0 → 1) and that
// the McpTool seed stays true to the LIVE bridge surface (drift guard).

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ACTION_TYPE_REGISTRY } from "#schemas/ontology/primitives/action-type";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import { TOOLS } from "../../../bridge/mcp-server";
import {
  compareToolSurface,
  type FingerprintableTool,
} from "../../../lib/self-ontology-fingerprint";
// Importing the barrel executes the instance modules → self-registration side effect.
import {
  EXECUTOR_ACTION_TYPE,
  EXECUTOR_ACTION_TYPE_RID,
  MCP_TOOL_OBJECT_TYPE,
  MCP_TOOL_OBJECT_TYPE_RID,
  MCP_TOOL_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_MCP_TOOL_COUNT = 24;

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

test("McpTool surface matches the LIVE bridge TOOLS structurally (HO-2 fingerprint drift guard)", () => {
  // GENERALIZES the prior name-only guard to a STRUCTURAL fingerprint. We import the
  // LIVE `TOOLS` (resolved object, so frozen-const enums like PROMPT_RUNTIMES resolve —
  // a text scrape would miss them), recompute each tool's {name, inputSchema} fingerprint,
  // and diff against the checked-in golden baseline. `added`/`removed` strictly SUBSUME
  // the old 23-name SET check, so the count guarantee is preserved; `structural-drift`
  // additionally catches an input-contract change a name check would miss (param
  // add/remove/rename/retype, enum membership, required<->optional, additionalProperties).
  //
  // OUTPUT shape is intentionally OUT of scope: the fingerprint hashes only
  // {name, inputSchema}. The pm 7.13.0 `runtimeIdentity` output-add is NOT in any
  // inputSchema, so it MUST stay a non-drift "match" — including output would model the
  // tool above its registered IDENTITY altitude and is WRONG (DESIGN §6). Do NOT add
  // outputSchema to the fingerprint.
  const goldenPath = path.join(import.meta.dir, "mcp-tool-fingerprint.golden.json");
  const golden = JSON.parse(fs.readFileSync(goldenPath, "utf8")) as Record<string, string>;
  const liveTools = TOOLS as readonly FingerprintableTool[];

  // Count guarantee preserved (the seed + golden + live all agree on 23).
  expect(liveTools.length).toBe(EXPECTED_MCP_TOOL_COUNT);
  expect(Object.keys(golden).length).toBe(EXPECTED_MCP_TOOL_COUNT);
  expect(MCP_TOOL_INSTANCES.length).toBe(EXPECTED_MCP_TOOL_COUNT);

  const cmp = compareToolSurface(liveTools, golden);
  const offenders = cmp.perTool.filter((t) => t.status !== "match");
  expect(
    cmp.drift,
    `McpTool surface drift vs golden baseline: ${JSON.stringify(offenders)}. ` +
      `If this change to bridge/mcp-server.ts TOOLS is intentional, regenerate the baseline ` +
      `per tests/ontology/self/mcp-tool-fingerprint.README.md and review the diff in PR.`,
  ).toBe(false);
});
