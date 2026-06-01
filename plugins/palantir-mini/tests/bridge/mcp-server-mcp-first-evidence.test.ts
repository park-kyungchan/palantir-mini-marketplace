import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emitMcpFirstEvidenceForToolCall, handleRequest } from "../../bridge/mcp-server";
import preEditImpactMcpFirst from "../../hooks/pre-edit-impact-mcp-first";
import { MCP_TOOL_SURFACE_PROFILE_ENV } from "../../lib/capability-registry/mcp-tool-capability";
import { readEvents } from "../../lib/event-log/read";

let tmpRoot: string;
const savedEnv: Record<string, string | undefined> = {};

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function setupProject(): void {
  fs.mkdirSync(path.join(tmpRoot, ".palantir-mini", "session"), { recursive: true });
  fs.mkdirSync(path.join(tmpRoot, "src"), { recursive: true });
}

function saveEnv(name: string): void {
  savedEnv[name] = process.env[name];
}

function restoreEnv(name: string): void {
  if (savedEnv[name] === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = savedEnv[name];
  }
}

function largeEditPayload(filePath: string): unknown {
  return {
    cwd: tmpRoot,
    session_id: "test-session",
    tool_name: "Edit",
    tool_input: {
      file_path: filePath,
      old_string: "x".repeat(500),
    },
  };
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-mcp-server-evidence-"));
  for (const name of [
    "PALANTIR_MINI_EVENTS_FILE",
    "PALANTIR_MINI_EVENTS_FILE_FORCE",
    "PALANTIR_MINI_HOST_RUNTIME",
    "PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY",
    "PALANTIR_MINI_MCP_FIRST_BYPASS",
    MCP_TOOL_SURFACE_PROFILE_ENV,
  ]) {
    saveEnv(name);
  }
  delete process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY;
  delete process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  delete process.env[MCP_TOOL_SURFACE_PROFILE_ENV];
  process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(tmpRoot);
  process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";
  process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";
  setupProject();
});

afterEach(() => {
  for (const name of Object.keys(savedEnv)) restoreEnv(name);
  for (const name of Object.keys(savedEnv)) delete savedEnv[name];
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("MCP server MCP-first evidence", () => {
  test("default studio-core profile rejects hidden pre_edit_impact calls without evidence", async () => {
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "pre_edit_impact",
        arguments: { project: tmpRoot, proposedFiles: ["src/dispatch.ts"] },
      },
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32602,
        message: "tools/call: tool `pre_edit_impact` is not visible in MCP profile `studio-core`",
        data: {
          profile: "studio-core",
          defaultProfile: "studio-core",
          profileEnvVar: MCP_TOOL_SURFACE_PROFILE_ENV,
          toolName: "pre_edit_impact",
        },
      },
    });
    expect(fs.existsSync(eventsPathFor(tmpRoot))).toBe(false);
  });

  test("visible-profile pre_edit_impact tools/call dispatch emits detector evidence before responding", async () => {
    process.env[MCP_TOOL_SURFACE_PROFILE_ENV] = "dev-full";

    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "pre_edit_impact",
        arguments: { project: tmpRoot, proposedFiles: ["src/dispatch.ts"] },
      },
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 2,
      result: { isError: false },
    });

    const events = readEvents(eventsPathFor(tmpRoot));
    const evidence = events.find((event) => event.throughWhich.toolName === "pre_edit_impact");
    expect(evidence?.payload).toMatchObject({
      phase: "design",
      passed: true,
      errorClass: "lead_mcp_first_compliance_passed",
      source: "mcp-server-tools-call",
      proposedFiles: ["src/dispatch.ts"],
    });
  });

  test("pre_edit_impact tools/call evidence lands in the target project and satisfies detector", async () => {
    const targetFile = path.join(tmpRoot, "src", "adapter.ts");

    await emitMcpFirstEvidenceForToolCall(
      "pre_edit_impact",
      { project: tmpRoot, proposedFiles: ["src/adapter.ts"] },
      12,
    );

    const events = readEvents(eventsPathFor(tmpRoot));
    const evidence = events.find((event) => event.throughWhich.toolName === "pre_edit_impact");
    expect(evidence?.payload).toMatchObject({
      phase: "design",
      passed: true,
      errorClass: "lead_mcp_first_compliance_passed",
      source: "mcp-server-tools-call",
      proposedFiles: ["src/adapter.ts"],
    });
    expect(evidence?.byWhom.identity).toBe("codex");

    const result = await preEditImpactMcpFirst(largeEditPayload(targetFile));
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("impact_query tools/call evidence records rid/projectRoot and satisfies detector", async () => {
    const targetFile = path.join(tmpRoot, "src", "impact.ts");

    await emitMcpFirstEvidenceForToolCall(
      "impact_query",
      { projectRoot: tmpRoot, rid: "file:src/impact.ts", depth: 3 },
      8,
    );

    const events = readEvents(eventsPathFor(tmpRoot));
    const evidence = events.find((event) => event.throughWhich.toolName === "impact_query");
    expect(evidence?.payload).toMatchObject({
      phase: "design",
      passed: true,
      errorClass: "lead_mcp_first_compliance_passed",
      source: "mcp-server-tools-call",
      rid: "file:src/impact.ts",
      projectRoot: tmpRoot,
    });

    const result = await preEditImpactMcpFirst(largeEditPayload(targetFile));
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("non-impact tools/call does not emit detector evidence", async () => {
    await emitMcpFirstEvidenceForToolCall("pm_semantic_intent_gate", { project: tmpRoot }, 5);
    expect(fs.existsSync(eventsPathFor(tmpRoot))).toBe(false);
  });
});
