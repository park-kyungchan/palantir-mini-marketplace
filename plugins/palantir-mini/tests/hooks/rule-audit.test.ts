// palantir-mini v2.24.0 — rule-audit consolidated hook tests (Phase 2a T1)
//
// Verifies all 3 modes (bottleneck | drift | citation) via the exported
// runMode() helper. Default-export argv parsing tested separately.

import { describe, expect, test } from "bun:test";
import ruleAudit, { runMode, parseModeFromArgv } from "../../hooks/rule-audit";

describe("rule-audit hook — argv parsing", () => {
  test("parses --mode=bottleneck", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=bottleneck"])).toBe("bottleneck");
  });

  test("parses --mode=drift", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=drift"])).toBe("drift");
  });

  test("parses --mode=citation", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=citation"])).toBe("citation");
  });

  test("returns null when no mode flag", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts"])).toBeNull();
  });

  test("rejects unknown mode value", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=garbage"])).toBeNull();
  });
});

describe("rule-audit hook — bottleneck mode", () => {
  test("returns continue decision (advisory)", async () => {
    const result = await runMode("bottleneck", { cwd: "/home/palantirkc" });
    expect(result.decision).toBe("continue");
    expect(typeof result.message).toBe("string");
    expect(result.message).toContain("mode=bottleneck");
  });

  test("message indicates OK or advisory or skipped", async () => {
    const result = await runMode("bottleneck", { cwd: "/home/palantirkc" });
    expect(
      result.message.includes("rules scanned") ||
        result.message.includes("advisory") ||
        result.message.includes("skipped"),
    ).toBe(true);
  });

  test("reason populated when ceilings exceeded", async () => {
    const result = await runMode("bottleneck", { cwd: "/home/palantirkc" });
    if (result.message.includes("advisory")) {
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("ceiling violation");
    }
  });
});

describe("rule-audit hook — drift mode", () => {
  test("returns continue decision (SessionStart advisory)", async () => {
    const result = await runMode("drift", { cwd: "/home/palantirkc" });
    expect(result.decision).toBe("continue");
  });

  test("message indicates OK or advisory or skipped", async () => {
    const result = await runMode("drift", { cwd: "/home/palantirkc" });
    expect(
      result.message.includes("OK") ||
        result.message.includes("advisory") ||
        result.message.includes("skipped"),
    ).toBe(true);
  });

  test("reason populated when drift detected", async () => {
    const result = await runMode("drift", { cwd: "/home/palantirkc" });
    if (result.message.includes("advisory")) {
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("drift");
    }
  });
});

describe("rule-audit hook — citation mode", () => {
  test("skips when no file_path in payload", async () => {
    const result = await runMode("citation", { cwd: "/home/palantirkc" });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("non-hook file");
  });

  test("skips when file_path is non-hook", async () => {
    const result = await runMode("citation", {
      cwd: "/home/palantirkc",
      tool_input: { file_path: "/tmp/some/random.ts" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("non-hook file");
  });

  test("skips when edited file is missing (matches hook regex but file gone)", async () => {
    const result = await runMode("citation", {
      cwd: "/home/palantirkc",
      tool_input: { file_path: "/tmp/nonexistent/hooks/missing.ts" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("edited file missing");
  });
});

describe("rule-audit hook — default export (argv-driven)", () => {
  test("returns error message when no --mode argv flag", async () => {
    // argv currently has no --mode= token (run via bun:test runner).
    const result = await ruleAudit({ cwd: "/home/palantirkc" });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("missing --mode=");
  });

  test("handles null payload gracefully", async () => {
    const result = await ruleAudit(null);
    expect(typeof result.message).toBe("string");
    expect(result.message).toBeTruthy();
  });
});
