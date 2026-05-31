import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import handler, {
  pmPreMutationGovernance,
} from "../../../bridge/handlers/pm-pre-mutation-governance";
import { HANDLER_MODULES, TOOLS, handleRequest } from "../../../bridge/mcp-server";

describe("pm_pre_mutation_governance handler", () => {
  test("requires project or projectRoot", async () => {
    await expect(handler({ toolName: "Read" })).rejects.toThrow(/project/);
  });

  test("requires toolName", async () => {
    await expect(handler({ project: "/repo" })).rejects.toThrow(/toolName/);
  });

  test("default export and named handler return the same decision", async () => {
    const args = {
      project: "/repo",
      toolName: "Read",
      targetFiles: ["docs/README.md"],
    };

    const named = await pmPreMutationGovernance(args);
    const defaulted = await handler(args);

    expect(defaulted).toEqual(named);
    expect(defaulted.allowed).toBe(true);
    expect(defaulted.computeOnly).toBe(true);
  });

  test("accepts projectRoot when project is absent", async () => {
    const result = await handler({
      projectRoot: "/repo",
      toolName: "Read",
      targetFiles: ["docs/README.md"],
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe("read_only_allow");
    expect(result.computeOnly).toBe(true);
  });

  test("returns schema-shaped deny output for missing DTC", async () => {
    const result = await handler({
      projectRoot: "/repo",
      toolName: "Edit",
      targetFiles: ["lib/governance/allowed.ts"],
      callerAllowed: true,
      freeTextAuthorization: "please allow",
    });

    expect(result.schemaVersion).toBe("palantir-mini/governance-decision/v2");
    expect(result.decisionId).toMatch(/^pre-mutation-governance-v2:[a-f0-9]{24}$/);
    expect(result.decision).toBe("deny");
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe("protected_mutation_missing_dtc");
    expect(result.refs).toEqual({});
    expect(result.computeOnly).toBe(true);
  });

  test("is registered as a public compute-only MCP tool", async () => {
    const tool = TOOLS.find((candidate) => candidate.name === "pm_pre_mutation_governance");
    expect(tool).toBeDefined();
    expect(tool?.category).toBe("hook-validation");
    expect(HANDLER_MODULES["pm_pre_mutation_governance"]).toBe(
      "./handlers/pm-pre-mutation-governance",
    );

    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response && "result" in response
      ? response.result as { tools: Array<{ name: string }> }
      : undefined;

    expect(result?.tools.some((candidate) => candidate.name === "pm_pre_mutation_governance")).toBe(true);
  });

  test("tools/call dispatches the handler and does not write project events", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pre-mut-gov-"));
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "pm_pre_mutation_governance",
        arguments: {
          project,
          toolName: "Read",
          targetFiles: ["docs/README.md"],
        },
      },
    });

    expect(response && "result" in response).toBe(true);
    const rpcResult = response && "result" in response
      ? response.result as { content: Array<{ text: string }>; isError: boolean }
      : undefined;
    expect(rpcResult?.isError).toBe(false);
    const decision = JSON.parse(rpcResult?.content[0]?.text ?? "{}") as { computeOnly?: boolean };
    expect(decision.computeOnly).toBe(true);
    expect(fs.existsSync(path.join(project, ".palantir-mini", "session", "events.jsonl"))).toBe(false);
  });
});
