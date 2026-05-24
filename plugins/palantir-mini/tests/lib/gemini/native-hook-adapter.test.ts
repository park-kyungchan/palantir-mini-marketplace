import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  GEMINI_EVENT_POLICY_MAP,
  runGeminiHookAdapter,
  runGeminiHookAdapterCli,
} from "../../../lib/gemini/native-hook-adapter";

describe("Gemini native hook adapter", () => {
  test("declares the Gemini-to-palantir-mini policy event map", async () => {
    expect(GEMINI_EVENT_POLICY_MAP.BeforeAgent).toBe("UserPromptSubmit");
    expect(GEMINI_EVENT_POLICY_MAP.BeforeTool).toBe("PreToolUse");
    expect(GEMINI_EVENT_POLICY_MAP.AfterTool).toBe("PostToolUse");
    const inspected = JSON.parse(await runGeminiHookAdapterCli(["bun", "adapter", "--inspect"]));
    expect(inspected.eventMap.BeforeAgent).toBe("UserPromptSubmit");
  });

  test("maps Gemini MCP tool names to canonical PreToolUse matchers", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "pm-gemini-adapter-"));
    const hooksPath = path.join(root, "hooks.json");
    writeFileSync(
      hooksPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
              hooks: [
                {
                  type: "command",
                  command: "printf '{\"decision\":\"block\",\"reason\":\"contract required\"}\\n'",
                  timeout: 1,
                },
              ],
            },
          ],
        },
      }),
    );

    const result = await runGeminiHookAdapter(
      "BeforeTool",
      {
        tool_name: "mcp_palantir-mini_commit_edits",
        tool_input: {},
        cwd: root,
      },
      { pluginRoot: root, hooksJsonPath: hooksPath, cwd: root },
    );

    expect(result.policyEventName).toBe("PreToolUse");
    expect(result.matchedHooks).toHaveLength(1);
    expect(result.response).toEqual({
      decision: "deny",
      reason: "contract required",
      systemMessage: "contract required",
    });
  });
});
