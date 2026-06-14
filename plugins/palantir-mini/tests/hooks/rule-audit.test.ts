// palantir-mini — rule-audit consolidated hook tests
//
// Single live mode after the 2026-06-14 rules-lightening: bottleneck.
// (drift + citation modes retired — drift was registered in ZERO hook entries
// and stays live via pm_rule_audit detect-drift; citation was an accidental
// no-op covered by pm_rule_audit detect-stale-crossrefs.)

import { describe, expect, test } from "bun:test";
import ruleAudit, { runMode, parseModeFromArgv } from "../../hooks/rule-audit";

describe("rule-audit hook — argv parsing", () => {
  test("parses --mode=bottleneck", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=bottleneck"])).toBe("bottleneck");
  });

  test("rejects retired --mode=drift", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=drift"])).toBeNull();
  });

  test("rejects retired --mode=citation", () => {
    expect(parseModeFromArgv(["bun", "rule-audit.ts", "--mode=citation"])).toBeNull();
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
