// palantir-mini v4.10.0 — orphan-pair-watchdog hook tests (sprint-056 W3.D1)
// Tests the PreCompact advisory that fires when orphanRatio > 5%.

import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Env helpers ────────────────────────────────────────────────────────────

let savedBypass: string | undefined;
let TMP: string;
let stderrOutput: string;
let originalStderrWrite: typeof process.stderr.write;

beforeEach(() => {
  savedBypass = process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE;
  delete process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE;

  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-orphan-watchdog-"));
  // Create a .palantir-mini directory so findProjectRoot succeeds
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session", "outcome-pairs"), { recursive: true });

  stderrOutput = "";
  originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array, ..._args: unknown[]) => {
    if (typeof chunk === "string") stderrOutput += chunk;
    return true;
  }) as typeof process.stderr.write;
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helper: write outcome-pair JSON markers ─────────────────────────────

const now = Date.now();

function writeMarker(
  dir: string,
  id: string,
  overrides: Partial<{
    closedAt: string;
    createdAt: string;
    deltaMetrics: { latencyMs: number };
  }> = {},
): void {
  const base = {
    pairingId: id,
    createdAt: new Date(now - 60 * 1000).toISOString(), // 1 min ago
    ...overrides,
  };
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(base));
}

// ─── Case 1: orphanRatio < 5% → pass-through (no advisory) ─────────────────

describe("orphan-pair-watchdog — ratio below threshold", () => {
  test("returns OK when totalPairs is 0 (no markers)", async () => {
    // outcome-pairs dir is empty by default in beforeEach
    const orphanPairWatchdog = (await import(
      "../../hooks/orphan-pair-watchdog"
    )).default;

    const result = await orphanPairWatchdog({ cwd: TMP });
    expect(result.message).toContain("OK");
    expect(result.message).toContain("total=0");
    expect(stderrOutput).not.toContain("ORPHAN-PAIR WATCHDOG ADVISORY");
  });

  test("returns OK when orphanRatio is below 5% threshold", async () => {
    const dir = path.join(TMP, ".palantir-mini", "session", "outcome-pairs");
    // 20 closed pairs = 0% orphans → ratio 0%
    for (let i = 0; i < 20; i++) {
      writeMarker(dir, `pair-${i}`, {
        closedAt: new Date(now - 30 * 1000).toISOString(),
        deltaMetrics: { latencyMs: 1500 },
      });
    }

    const orphanPairWatchdog = (await import(
      "../../hooks/orphan-pair-watchdog"
    )).default;
    const result = await orphanPairWatchdog({ cwd: TMP });

    expect(result.message).toContain("OK");
    expect(stderrOutput).not.toContain("ADVISORY");
    expect(result.additionalContext).toBeUndefined();
  });
});

// ─── Case 2: orphanRatio > 5% → fires advisory ──────────────────────────────

describe("orphan-pair-watchdog — ratio above threshold", () => {
  test("fires advisory + stderr when orphanRatio > 5%", async () => {
    const dir = path.join(TMP, ".palantir-mini", "session", "outcome-pairs");
    // 90 closed + 10 orphaned (1 hour old, exceeds 30min default threshold) = 10% orphan
    for (let i = 0; i < 90; i++) {
      writeMarker(dir, `closed-${i}`, {
        closedAt: new Date(now - 5 * 1000).toISOString(),
      });
    }
    for (let i = 0; i < 10; i++) {
      // Older than 30 min orphan threshold but not closed → "orphaned"
      writeMarker(dir, `orphan-${i}`, {
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
      });
    }

    const orphanPairWatchdog = (await import(
      "../../hooks/orphan-pair-watchdog"
    )).default;
    const result = await orphanPairWatchdog({ cwd: TMP });

    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("orphanRatio=");
    // Advisory written to stderr
    expect(stderrOutput).toContain("ORPHAN-PAIR WATCHDOG ADVISORY");
    expect(stderrOutput).toContain("rule 26 §Axis B1");
    // additionalContext contains the advisory
    expect(result.additionalContext).toContain("orphanedPairs");
    expect(result.additionalContext).toContain("Resolution:");
    // No block — advisory only
    expect(result.decision).not.toBe("block");
  });

  test("advisory message contains correct pair counts", async () => {
    const dir = path.join(TMP, ".palantir-mini", "session", "outcome-pairs");
    // 4 closed + 6 orphaned = 60% orphan ratio (well above 5%)
    for (let i = 0; i < 4; i++) {
      writeMarker(dir, `closed-${i}`, {
        closedAt: new Date(now - 1000).toISOString(),
      });
    }
    for (let i = 0; i < 6; i++) {
      writeMarker(dir, `orphan-${i}`, {
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      });
    }

    const orphanPairWatchdog = (await import(
      "../../hooks/orphan-pair-watchdog"
    )).default;
    const result = await orphanPairWatchdog({ cwd: TMP });

    expect(result.message).toContain("6/10");
    expect(stderrOutput).toContain("totalPairs:    10");
    expect(stderrOutput).toContain("orphanedPairs: 6");
  });
});

// ─── Case 3: Bypass env set → pass-through + bypass event emitted ───────────

describe("orphan-pair-watchdog — bypass", () => {
  test("bypass env set → returns bypass message, no advisory", async () => {
    process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE = "1";

    const dir = path.join(TMP, ".palantir-mini", "session", "outcome-pairs");
    // Even with orphans present, bypass should short-circuit
    for (let i = 0; i < 10; i++) {
      writeMarker(dir, `orphan-${i}`, {
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      });
    }

    const orphanPairWatchdog = (await import(
      "../../hooks/orphan-pair-watchdog"
    )).default;
    const result = await orphanPairWatchdog({ cwd: TMP });

    expect(result.message).toContain("bypassed");
    expect(result.message).toContain("PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE");
    expect(stderrOutput).not.toContain("ADVISORY");
    expect(result.decision).not.toBe("block");
  });

  test("bypass env set → does NOT fire advisory even when orphanRatio is very high", async () => {
    process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE = "1";

    const dir = path.join(TMP, ".palantir-mini", "session", "outcome-pairs");
    for (let i = 0; i < 50; i++) {
      writeMarker(dir, `orphan-${i}`, {
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      });
    }

    const orphanPairWatchdog = (await import(
      "../../hooks/orphan-pair-watchdog"
    )).default;
    const result = await orphanPairWatchdog({ cwd: TMP });

    expect(result.message).toContain("bypassed");
    expect(result.additionalContext).toBeUndefined();
  });
});

// ─── Case 4: No project root found → graceful skip ──────────────────────────

describe("orphan-pair-watchdog — no project root", () => {
  test("skips gracefully when cwd has no .palantir-mini ancestor", async () => {
    // Use /tmp directly — no .palantir-mini there (unless env cwd overrides)
    const isolatedTmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-no-root-"));
    try {
      // DO NOT create .palantir-mini in isolatedTmp
      const orphanPairWatchdog = (await import(
        "../../hooks/orphan-pair-watchdog"
      )).default;
      const result = await orphanPairWatchdog({ cwd: isolatedTmp });

      // Should skip, not crash
      expect(result.message).toBeTruthy();
      // Message says skipped OR OK (depends on whether /tmp itself has a .palantir-mini)
      expect(result.decision).not.toBe("block");
    } finally {
      fs.rmSync(isolatedTmp, { recursive: true, force: true });
    }
  });
});
