// Tests: Wave 1 self-Ontology ObjectType — pm's bridge-handler layer registered AS an
// McpHandler ObjectType + 64 handler instances (pm authorization-flexibility slice 3
// added pm-authorize-delivery: 63 → 64). Proves the self-model resolves from the
// registry and that the handler seed stays true to the LIVE bridge/handlers/ directory
// (drift guard) — a handler added/removed in the bridge without updating the seed fails
// loud here.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the barrel executes the instance module → self-registration side effect.
import {
  MCP_HANDLER_OBJECT_TYPE,
  MCP_HANDLER_OBJECT_TYPE_RID,
  MCP_HANDLER_INSTANCES,
} from "#schemas/ontology/self";

const EXPECTED_MCP_HANDLER_COUNT = 64;

test("self McpHandler ObjectType is registered with handlerName identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(MCP_HANDLER_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(MCP_HANDLER_OBJECT_TYPE);
  expect(got!.apiName).toBe("McpHandler");
  expect(got!.primaryKeyProperty).toBe("handlerName");
});

test(`McpHandler seed has ${EXPECTED_MCP_HANDLER_COUNT} unique handler instances`, () => {
  expect(MCP_HANDLER_INSTANCES.length).toBe(EXPECTED_MCP_HANDLER_COUNT);
  const names = MCP_HANDLER_INSTANCES.map((i) => i.handlerName);
  expect(new Set(names).size).toBe(EXPECTED_MCP_HANDLER_COUNT); // no duplicates
});

test("McpHandler seed matches the LIVE bridge/handlers/ directory (drift guard)", () => {
  // The snapshot OWNS the seed (no lib import uphill); this guard reads the live
  // bridge/handlers/ directory and asserts the self-model's 64 names equal pm's actual
  // handler surface (every *.ts module minus the 2 private underscore helpers), so
  // adding or removing a handler fails loud until mcp-handler.objecttype.ts is updated.
  const handlersDir = path.join(import.meta.dir, "../../../bridge/handlers");
  const liveNames = fs
    .readdirSync(handlersDir)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_"))
    .map((f) => f.replace(/\.ts$/, ""));
  const liveSet = new Set(liveNames);
  const seedSet = new Set(MCP_HANDLER_INSTANCES.map((i) => i.handlerName));
  expect(liveSet.size).toBe(EXPECTED_MCP_HANDLER_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});
