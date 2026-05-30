// palantir-mini v1.3 — manifest-validate tests
// A8.3: verifies hook event allowlist validation on manifest edits.

import { test, expect, describe } from "bun:test";
import manifestValidate from "../../hooks/manifest-validate";

describe("manifestValidate", () => {
  test("returns continue for valid plugin.json path (all events valid)", async () => {
    const pluginJson = "/home/palantirkc/.claude/plugins/palantir-mini/.codex-plugin/plugin.json";
    const result = await manifestValidate({
      tool_input: { file_path: pluginJson },
      cwd: "/tmp",
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("manifest-validate");
  });

  test("derives plugin.json path from hooks.json and returns continue", async () => {
    const hooksJson = "/home/palantirkc/.claude/plugins/palantir-mini/hooks/hooks.json";
    const result = await manifestValidate({
      tool_input: { file_path: hooksJson },
      cwd: "/tmp",
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("manifest-validate");
  });

  test("handles null payload gracefully", async () => {
    const result = await manifestValidate(null);
    expect(result.message).toBeTruthy();
  });
});
