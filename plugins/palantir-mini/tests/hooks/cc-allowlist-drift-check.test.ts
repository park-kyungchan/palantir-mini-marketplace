// palantir-mini v1.7.1 — cc-allowlist-drift-check tests
// Phase retrospective (plan §5.3, 2026-04-21).

import { test, expect, describe } from "bun:test";
import ccAllowlistDriftCheck, {
  checkDrift,
  detectInstalledVersion,
} from "../../hooks/cc-allowlist-drift-check";

describe("checkDrift (pure)", () => {
  test("returns null when installed version is null", () => {
    expect(checkDrift(null, "2.1.114")).toBeNull();
  });

  test("returns null when installed equals pin", () => {
    expect(checkDrift("2.1.114", "2.1.114")).toBeNull();
  });

  test("returns null when installed is below pin", () => {
    expect(checkDrift("2.1.113", "2.1.114")).toBeNull();
  });

  test("returns drift description when installed is patch-ahead of pin", () => {
    const drift = checkDrift("2.1.116", "2.1.114");
    expect(drift).not.toBeNull();
    expect(drift).toContain("2.1.116");
    expect(drift).toContain("2.1.114");
    expect(drift).toContain("validate-hook-event-allowlist.ts");
  });

  test("returns drift description when installed is minor-ahead of pin", () => {
    const drift = checkDrift("2.2.0", "2.1.114");
    expect(drift).not.toBeNull();
    expect(drift).toContain("2.2.0");
  });

  test("returns drift description when installed is major-ahead of pin", () => {
    const drift = checkDrift("3.0.0", "2.1.114");
    expect(drift).not.toBeNull();
    expect(drift).toContain("3.0.0");
  });
});

describe("detectInstalledVersion (integration)", () => {
  test("returns a semver string or null (never throws)", () => {
    const v = detectInstalledVersion();
    if (v === null) {
      // `claude` not on PATH in this test env — acceptable
      expect(v).toBeNull();
    } else {
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("ccAllowlistDriftCheck (default export)", () => {
  test("returns a DriftResult shape with .message", async () => {
    const result = await ccAllowlistDriftCheck({});
    expect(result).toHaveProperty("message");
    expect(typeof result.message).toBe("string");
    expect(result.message).toContain("palantir-mini");
  });

  test("payload is ignored (drift check is payload-agnostic)", async () => {
    const r1 = await ccAllowlistDriftCheck(null);
    const r2 = await ccAllowlistDriftCheck({ session_id: "abc", cwd: "/tmp" });
    const r3 = await ccAllowlistDriftCheck({ garbage: true });
    expect(r1.message).toBe(r2.message);
    expect(r2.message).toBe(r3.message);
  });

  test("non-blocking — never throws on bad payload", async () => {
    const r1 = await ccAllowlistDriftCheck(undefined);
    const r2 = await ccAllowlistDriftCheck(42);
    const r3 = await ccAllowlistDriftCheck("string");
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r3).toBeDefined();
  });
});
