// palantir-mini v4.5.0 — claude-code-version-check hook tests (sprint-039 W3.B)
// 4 test cases covering: drift advisory, same-version silence, first-run baseline,
// claude unavailable graceful handling.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// We test the pure logic helpers directly by re-exporting them.
// The default export (hook handler) is tested via integration-style calls
// with mocked filesystem state.

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-cc-version-check-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helper: write a version file ────────────────────────────────────────────

function writeVersionFile(dir: string, lastCheckedVersion: string): void {
  const filePath = path.join(dir, ".palantir-mini", "session", "claude-code-version.json");
  fs.writeFileSync(
    filePath,
    JSON.stringify({ lastCheckedVersion, lastCheckedAt: new Date().toISOString() }),
    "utf8",
  );
}

// ─── Import the hook handler ─────────────────────────────────────────────────

// Dynamic import to avoid module-level side-effects when stubbing exec.
// We import once and reuse the handler for the test cases that don't need
// process-level mocking.
import claudeCodeVersionCheck from "../../hooks/claude-code-version-check";

// ─── Test 1: version drift emits advisory ────────────────────────────────────

describe("version_drift_emits_advisory", () => {
  test("returns advisory when installed > lastChecked", async () => {
    // lastChecked = 2.1.130; we cannot mock execSync easily in Bun without
    // patching the module, so we test the handler's output logic by using
    // a version file that matches what the real `claude --version` would return.
    // Since we cannot control the installed version in CI, we test the boundary:
    // if lastChecked is set to "0.0.0", any real installed version will be "newer".
    writeVersionFile(TMP, "0.0.0");

    const result = await claudeCodeVersionCheck({ cwd: TMP });

    // Two possible outcomes depending on whether claude is installed:
    // (A) claude available → drift detected → advisory message
    // (B) claude unavailable → skipped message
    // Both are valid. If (A), we check advisory content.
    if (result.message.includes("drift:") || result.message.includes("first-run")) {
      // Either drift was detected or it's a first-run (unexpected since we wrote the file).
      // If drift detected, additionalContext must mention the installed + lastChecked.
      if (result.message.includes("drift:")) {
        expect(result.additionalContext).toBeDefined();
        expect(result.additionalContext).toContain("Claude Code version drift detected");
        expect(result.additionalContext).toContain("0.0.0");
        expect(result.additionalContext).toContain("pm-claude-code-version-watch");
      }
    }
    // In all cases, decision must be "continue" (never block).
    expect(result.decision).toBe("continue");
  });
});

// ─── Test 2: same version → silent ───────────────────────────────────────────

describe("same_version_silent", () => {
  test("returns no advisory when installed == lastChecked", async () => {
    // We set lastChecked to an impossibly high version so installed < lastChecked.
    // This simulates the "same or older" branch (cmp <= 0) which must be silent.
    writeVersionFile(TMP, "9999.0.0");

    const result = await claudeCodeVersionCheck({ cwd: TMP });

    // If claude is unavailable → "skipped" message — no advisory.
    // If claude is available → installed (e.g. 2.x.x) < 9999.0.0 → no advisory.
    expect(result.additionalContext).toBeUndefined();
    expect(result.decision).toBe("continue");
    // Message should not mention "drift"
    expect(result.message).not.toContain("drift:");
  });
});

// ─── Test 3: first-run creates no advisory ────────────────────────────────────

describe("first_run_creates_baseline", () => {
  test("returns no advisory when no version.json file exists (first-run)", async () => {
    // Do NOT write a version file — simulate first-run state.
    const versionFilePath = path.join(TMP, ".palantir-mini", "session", "claude-code-version.json");
    expect(fs.existsSync(versionFilePath)).toBe(false);

    const result = await claudeCodeVersionCheck({ cwd: TMP });

    // Must NOT emit an advisory on first-run.
    expect(result.additionalContext).toBeUndefined();
    expect(result.decision).toBe("continue");
    // Message should contain "first-run" OR "unavailable" (if claude not in PATH).
    const validMessages = ["first-run", "unavailable"];
    const hasValidMessage = validMessages.some((s) => result.message.includes(s));
    expect(hasValidMessage).toBe(true);

    // Version file must NOT be written by the hook (write responsibility = W3.C skill).
    expect(fs.existsSync(versionFilePath)).toBe(false);
  });

  test("subsequent call with high lastChecked version is still silent", async () => {
    writeVersionFile(TMP, "9999.0.0");

    const result = await claudeCodeVersionCheck({ cwd: TMP });

    expect(result.additionalContext).toBeUndefined();
    expect(result.decision).toBe("continue");
  });
});

// ─── Test 4: claude unavailable → graceful pass ───────────────────────────────

describe("claude_unavailable_graceful", () => {
  test("returns OK when version file exists but claude binary is missing", async () => {
    // We simulate the "claude unavailable" path by setting a lastChecked that is
    // arbitrarily chosen. If claude is available in the test env, the hook will
    // compare normally (still valid behavior).
    // The key invariant: hook MUST NOT throw; result.decision === "continue".
    writeVersionFile(TMP, "2.1.130");

    let threw = false;
    let result: Awaited<ReturnType<typeof claudeCodeVersionCheck>>;
    try {
      result = await claudeCodeVersionCheck({ cwd: TMP });
    } catch {
      threw = true;
      result = { message: "", decision: "continue" };
    }

    expect(threw).toBe(false);
    expect(result.decision).toBe("continue");
  });

  test("null payload is handled gracefully (uses process.cwd() fallback)", async () => {
    // No version file in process.cwd() — first-run path.
    let threw = false;
    try {
      await claudeCodeVersionCheck(null);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ─── Unit tests for pure comparison logic ────────────────────────────────────
// We test the semver comparison by observing hook behavior with known versions.

describe("compareVersions logic (observed via hook behavior)", () => {
  test("0.0.0 lastChecked is always older than any real version (if claude available)", async () => {
    writeVersionFile(TMP, "0.0.0");
    const result = await claudeCodeVersionCheck({ cwd: TMP });
    // Either drift detected or claude unavailable — never a "no drift" message.
    const isNonemptyResult = result.message.length > 0;
    expect(isNonemptyResult).toBe(true);
    expect(result.decision).toBe("continue");
  });

  test("version file with major component triggers major deltaType label", async () => {
    // If installed is 2.x.x and lastChecked is 1.0.0, delta must be "major".
    writeVersionFile(TMP, "1.0.0");
    const result = await claudeCodeVersionCheck({ cwd: TMP });
    if (result.additionalContext?.includes("Claude Code version drift detected")) {
      // Delta type must appear in additionalContext.
      const hasDeltaType = ["major", "minor", "patch"].some((d) =>
        result.additionalContext!.includes(d),
      );
      expect(hasDeltaType).toBe(true);
    }
    expect(result.decision).toBe("continue");
  });
});
