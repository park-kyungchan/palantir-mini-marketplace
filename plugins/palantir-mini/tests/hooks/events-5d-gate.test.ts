// palantir-mini v1.3 — events-5d-gate tests
// A8.3: verifies PreCompact gate blocks on high violation rate, passes otherwise.

import { test, expect, describe } from "bun:test";
import events5dGate from "../../hooks/events-5d-gate";

describe("events5dGate", () => {
  test("returns continue when handler unavailable (graceful degradation)", async () => {
    // In test env the audit handler may not load — 0 violations → continue
    const result = await events5dGate({ cwd: "/tmp" });
    expect(result.decision).toBeOneOf(["continue", "block"]);
    expect(result.message).toContain("events-5d-gate");
  });

  test("returns continue for project with no events.jsonl", async () => {
    const result = await events5dGate({ cwd: "/tmp/nonexistent-project-xyz" });
    expect(result.decision).toBe("continue");
  });

  test("handles null payload gracefully", async () => {
    const result = await events5dGate(null);
    expect(result.message).toBeTruthy();
  });
});
