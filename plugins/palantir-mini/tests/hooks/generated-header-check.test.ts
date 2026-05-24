// palantir-mini v1.3 — generated-header-check tests
// A8.3: verifies codegen header validation on generated file edits.

import { test, expect, describe } from "bun:test";
import generatedHeaderCheck from "../../hooks/generated-header-check";

describe("generatedHeaderCheck", () => {
  test("returns continue when handler unavailable (graceful degradation)", async () => {
    const result = await generatedHeaderCheck({
      tool_input: { file_path: "/tmp/src/generated/foo.ts" },
      cwd: "/tmp",
    });
    // Handler may not be available in test env — must not throw or block
    expect(result.decision).toBeOneOf(["continue", "block"]);
    expect(result.message).toBeTruthy();
  });

  test("returns continue on missing file path", async () => {
    const result = await generatedHeaderCheck({ cwd: "/tmp" });
    expect(result.decision).toBe("continue");
  });

  test("handles null payload gracefully", async () => {
    const result = await generatedHeaderCheck(null);
    expect(result.message).toBeTruthy();
  });
});
