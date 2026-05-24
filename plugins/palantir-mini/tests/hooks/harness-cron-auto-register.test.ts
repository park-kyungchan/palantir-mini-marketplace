// palantir-mini v4.14.0 — harness-cron-auto-register hook tests
// sprint-056 W2.A: original 5 test cases
// sprint-062 W0-α: +emit-count assertions (mutex hygiene — 1 emit per code path, not 3)
//
// Test matrix:
//   1. bypass env    → emit count = 1, message = BYPASS
//   2. CronList absent → emit count = 0 (graceful; not auditable), message = SKIPPED
//   3. already registered → emit count = 0 (skip; not auditable), message = SKIPPED
//   4. fresh register (success) → emit count = 1, message = OK
//   5. CronCreate fail → emit count = 1 (failure is auditable), message = FAILED

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import harnessCronAutoRegister from "../../hooks/harness-cron-auto-register";

const WEEKLY_MARKER = "weekly substrate health audit";

let savedBypass: string | undefined;
let savedEventsFile: string | undefined;
let TMP: string;

beforeEach(() => {
  savedBypass = process.env.PALANTIR_MINI_AUTO_CRON_DISABLE;
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_AUTO_CRON_DISABLE;
  // Redirect events to a temp file so we can count emissions without touching real events.jsonl
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-cron-auto-register-"));
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, "events.jsonl");
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_AUTO_CRON_DISABLE = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_AUTO_CRON_DISABLE;
  }
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  // Clean up any injected CC global
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).claude;
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

/** Count non-empty lines written to the redirected events.jsonl. */
function countEventsWritten(): number {
  const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
  if (!fs.existsSync(eventsPath)) return 0;
  return fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(l => l.trim().length > 0).length;
}

// ─── Test 1: bypass env ───────────────────────────────────────────────────────

describe("bypass_env", () => {
  test("PALANTIR_MINI_AUTO_CRON_DISABLE=1 returns BYPASS message without calling CronList", async () => {
    process.env.PALANTIR_MINI_AUTO_CRON_DISABLE = "1";

    let cronListCalled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => { cronListCalled = true; return []; },
      CronCreate: async () => {},
    };

    const result = await harnessCronAutoRegister({ cwd: TMP, session_id: "test-bypass" });

    expect(result.message).toContain("BYPASS");
    expect(cronListCalled).toBe(false);
  });

  // sprint-062 W0-α: emit count assertion — bypass path emits exactly 1 event (audited bypass)
  test("bypass path emits exactly 1 event (mutex hygiene: was 1, now still 1)", async () => {
    process.env.PALANTIR_MINI_AUTO_CRON_DISABLE = "1";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = { CronList: async () => [], CronCreate: async () => {} };

    await harnessCronAutoRegister({ cwd: TMP, session_id: "test-bypass-count" });

    expect(countEventsWritten()).toBe(1);
  });
});

// ─── Test 2: CronList API absent — graceful advisory ─────────────────────────

describe("cronlist_api_absent", () => {
  test("when globalThis.claude has no CronList, returns SKIPPED with graceful message", async () => {
    // No claude global at all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).claude;

    const result = await harnessCronAutoRegister({ cwd: TMP, session_id: "test-absent" });

    expect(result.message).toContain("SKIPPED");
    expect(result.message).toContain("CronList API unavailable");
    // Should not throw
  });

  // sprint-062 W0-α: emit count assertion — CronList absent is NOT auditable; emit count = 0
  test("CronList absent path emits 0 events (not an auditable event)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).claude;

    await harnessCronAutoRegister({ cwd: TMP, session_id: "test-absent-count" });

    expect(countEventsWritten()).toBe(0);
  });
});

// ─── Test 3: already registered — skip ───────────────────────────────────────

describe("already_registered_skip", () => {
  test("when existing cron prompt contains WEEKLY_MARKER, skips CronCreate", async () => {
    let cronCreateCalled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => [
        { prompt: `Run ${WEEKLY_MARKER} for /home/palantirkc`, cron: "7 9 * * 1" },
      ],
      CronCreate: async () => { cronCreateCalled = true; },
    };

    const result = await harnessCronAutoRegister({ cwd: TMP, session_id: "test-skip" });

    expect(result.message).toContain("SKIPPED");
    expect(result.message).toContain("already registered");
    expect(cronCreateCalled).toBe(false);
  });

  // sprint-062 W0-α: emit count assertion — already-registered skip emits 0 events (not auditable)
  test("already-registered path emits 0 events (no lock acquisition on skip)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => [
        { prompt: `Run ${WEEKLY_MARKER} for /home/palantirkc`, cron: "7 9 * * 1" },
      ],
      CronCreate: async () => {},
    };

    await harnessCronAutoRegister({ cwd: TMP, session_id: "test-skip-count" });

    expect(countEventsWritten()).toBe(0);
  });
});

// ─── Test 4: fresh register — success ────────────────────────────────────────

describe("fresh_register_success", () => {
  test("when no existing cron matches, calls CronCreate and returns OK", async () => {
    let cronCreateArgs: unknown = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => [
        { prompt: "Some other cron task", cron: "0 12 * * *" },
      ],
      CronCreate: async (args: unknown) => { cronCreateArgs = args; },
    };

    const result = await harnessCronAutoRegister({ cwd: TMP, session_id: "test-register" });

    expect(result.message).toContain("OK");
    expect(result.message).toContain("registered");
    expect(cronCreateArgs).not.toBeNull();
    const args = cronCreateArgs as { cron: string; prompt: string; recurring: boolean };
    expect(args.cron).toBe("7 9 * * 1");
    expect(args.recurring).toBe(true);
    expect(args.prompt).toContain(WEEKLY_MARKER);
  });

  // sprint-062 W0-α: emit count assertion — success path emits exactly 1 event (was 1, still 1)
  test("success path emits exactly 1 event (mutex hygiene: was 1 emit, still 1 after refactor)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => [],
      CronCreate: async () => {},
    };

    await harnessCronAutoRegister({ cwd: TMP, session_id: "test-register-count" });

    expect(countEventsWritten()).toBe(1);
  });
});

// ─── Test 5: CronCreate fails — graceful advisory ────────────────────────────

describe("croncreate_fail_graceful", () => {
  test("when CronCreate throws, returns FAILED message without throwing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => [],
      CronCreate: async () => { throw new Error("quota exceeded"); },
    };

    let threw = false;
    let result: Awaited<ReturnType<typeof harnessCronAutoRegister>>;

    try {
      result = await harnessCronAutoRegister({ cwd: TMP, session_id: "test-fail" });
    } catch {
      threw = true;
      result = { message: "" };
    }

    expect(threw).toBe(false);
    expect(result.message).toContain("FAILED");
    expect(result.message).toContain("CronCreate");
  });

  // sprint-062 W0-α: emit count assertion — failure path emits exactly 1 event (failure IS auditable)
  test("CronCreate failure path emits exactly 1 event (failure is auditable)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).claude = {
      CronList: async () => [],
      CronCreate: async () => { throw new Error("quota exceeded"); },
    };

    await harnessCronAutoRegister({ cwd: TMP, session_id: "test-fail-count" });

    expect(countEventsWritten()).toBe(1);
  });
});
