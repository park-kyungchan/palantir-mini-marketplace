// palantir-mini v1.3 — session-drift-check tests
// A8.3: verifies the hook returns additionalContext summary and message.

import { test, expect, describe } from "bun:test";
import sessionDriftCheck from "../../hooks/session-drift-check";

describe("sessionDriftCheck", () => {
  test("returns message with failCount", async () => {
    const result = await sessionDriftCheck({ cwd: "/tmp", session_id: "test-sess" });
    expect(result.message).toContain("session_drift_check_completed");
  });

  test("returns additionalContext with check summaries", async () => {
    const result = await sessionDriftCheck({ cwd: "/tmp" });
    expect(result.additionalContext).toContain("session-drift-check:");
  });

  test("handles missing payload gracefully", async () => {
    const result = await sessionDriftCheck(null);
    expect(result.message).toBeTruthy();
  });
});
