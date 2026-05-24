// palantir-mini v1.3 — doc-edit-drift tests
// A8.3: verifies drift detection on doc navigation file edits.

import { test, expect, describe } from "bun:test";
import docEditDrift from "../../hooks/doc-edit-drift";

describe("docEditDrift", () => {
  test("returns continue when no broken xrefs found", async () => {
    const result = await docEditDrift({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/MEMORY.md" },
      cwd: "/tmp",
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("drift_detected");
  });

  test("handles missing file_path gracefully", async () => {
    const result = await docEditDrift({ cwd: "/tmp" });
    expect(result.decision).toBeOneOf(["continue", "block"]);
  });

  test("handles null payload gracefully", async () => {
    const result = await docEditDrift(null);
    expect(result.message).toBeTruthy();
  });
});
