// Gap B — MCP runtime entrypoint e2e coverage for the palantir-ontology
// bridge (bridge/mcp-server.ts). Mirrors the shape of
// plugins/palantir-mini/tests/bridge/mcp-server-schema.test.ts, scaled down
// to this plugin's much smaller, read-only 8-tool surface.

import { describe, expect, test } from "bun:test";
import { CLAUDE_BINDING } from "../../src/adapters/claude";
import { CAPABILITY_AREAS, CAPABILITY_REGISTRY, RUNTIME_IDS } from "../../src/adapters/shared";
import { HANDLER_MODULES, TOOLS, handleRequest } from "../../bridge/mcp-server";

describe("palantir-ontology MCP bridge — tool registry", () => {
  test("TOOLS is sourced verbatim from the generated CLAUDE_BINDING.tools, never hand-authored", () => {
    expect(TOOLS).toBe(CLAUDE_BINDING.tools);
    expect(TOOLS.length).toBe(8);
  });

  test("every tool is a read-only queryCapability_<area> lookup — no write/mutating tool", () => {
    expect(TOOLS.map((tool) => tool.name).sort()).toEqual(
      CAPABILITY_AREAS.map((area) => `queryCapability_${area}`).sort(),
    );
    for (const tool of TOOLS) {
      expect(tool.name.startsWith("overwrite_")).toBe(false);
      expect(tool.name.startsWith("delete_")).toBe(false);
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.inputSchema.required).toEqual(["runtime"]);
    }
  });

  test("HANDLER_MODULES registers exactly the TOOLS names and nothing else", () => {
    expect(Object.keys(HANDLER_MODULES).sort()).toEqual(TOOLS.map((tool) => tool.name).sort());
  });
});

describe("palantir-ontology MCP bridge — JSON-RPC dispatch", () => {
  test("initialize returns protocol info", async () => {
    const res = await handleRequest({ jsonrpc: "2.0", id: 1, method: "initialize" });
    expect(res && "result" in res).toBe(true);
    const result = (res as { result: { protocolVersion: string; serverInfo: { name: string } } }).result;
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo.name).toBe("palantir-ontology");
  });

  test("notifications/initialized is a notification — no response", async () => {
    const res = await handleRequest({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res).toBe(null);
  });

  test("tools/list returns exactly the 8 generated tools", async () => {
    const res = await handleRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(res && "result" in res).toBe(true);
    const result = (res as { result: { tools: Array<{ name: string }> } }).result;
    expect(result.tools.length).toBe(8);
    expect(result.tools.map((tool) => tool.name).sort()).toEqual(TOOLS.map((tool) => tool.name).sort());
  });

  for (const runtime of RUNTIME_IDS) {
    test(`tools/call queryCapability_mcpRegistration returns the ${runtime} runtime's capability fact`, async () => {
      const res = await handleRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "queryCapability_mcpRegistration", arguments: { runtime } },
      });
      expect(res && "result" in res).toBe(true);
      const result = (res as { result: { content: Array<{ type: string; text: string }>; isError: boolean } }).result;
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content[0]!.text) as { runtime: string; area: string; fact: unknown };
      expect(payload.runtime).toBe(runtime);
      expect(payload.area).toBe("mcpRegistration");
      expect(payload.fact).toEqual(CAPABILITY_REGISTRY.profiles[runtime].capabilities.mcpRegistration);
    });
  }

  test("tools/call rejects an invalid runtime with a JSON-RPC error, never a silent default", async () => {
    const res = await handleRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "queryCapability_hooks", arguments: { runtime: "not-a-real-runtime" } },
    });
    expect(res).not.toBe(null);
    expect(res && "error" in res).toBe(true);
    if (res && "error" in res) expect(res.error.code).toBe(-32602);
  });

  test("tools/call rejects a missing runtime with a JSON-RPC error", async () => {
    const res = await handleRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "queryCapability_hooks", arguments: {} },
    });
    expect(res).not.toBe(null);
    expect(res && "error" in res).toBe(true);
  });

  test("tools/call rejects an unknown tool name", async () => {
    const res = await handleRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "delete_everything", arguments: {} },
    });
    expect(res).not.toBe(null);
    expect(res && "error" in res).toBe(true);
  });

  test("unknown JSON-RPC method returns method-not-found", async () => {
    const res = await handleRequest({ jsonrpc: "2.0", id: 7, method: "not/a/method" });
    expect(res).not.toBe(null);
    expect(res && "error" in res).toBe(true);
    if (res && "error" in res) expect(res.error.code).toBe(-32601);
  });
});
