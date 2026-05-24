// palantir-mini v4.14.0 — tests/hooks/session-start-overlay-injector.test.ts
// sprint-061 A.W2.b: original 5 test suites
// sprint-062 W0-α: +emit-count assertions (mutex hygiene — 1 emit per code path, not 3)
//
// Emit count matrix:
//   bypass path   → emit count = 1  (audited bypass)
//   nominal path  → emit count = 1  (capsule inject OR drift advisory, merged into 1)
//   capsule fail  → emit count = 1  (capsule build failure still emits 1 audit row)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import sessionStartOverlayInjector from "../../hooks/session-start-overlay-injector";

let TMP: string;
let savedEventsFile: string | undefined;
let savedEager: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-overlay-injector-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  // Clear bypass env for each test.
  delete process.env["PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE"];
  savedEager = process.env["PALANTIR_MINI_OVERLAY_INJECTOR_EAGER"];
  process.env["PALANTIR_MINI_OVERLAY_INJECTOR_EAGER"] = "1";
  // Redirect events to temp file for emit-count assertions (sprint-062 W0-α)
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, "events.jsonl");
});

afterEach(() => {
  delete process.env["PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE"];
  if (savedEager !== undefined) {
    process.env["PALANTIR_MINI_OVERLAY_INJECTOR_EAGER"] = savedEager;
  } else {
    delete process.env["PALANTIR_MINI_OVERLAY_INJECTOR_EAGER"];
  }
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

/** Count non-empty event rows written to the redirected events.jsonl. */
function countEventsWritten(): number {
  const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
  if (!fs.existsSync(eventsPath)) return 0;
  return fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(l => l.trim().length > 0).length;
}

// ─── 1. Nominal: always returns decision=continue ────────────────────────────

describe("nominal_behaviour", () => {
  test("decision is always 'continue' (advisory hook)", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });
    expect(result.decision).toBe("continue");
  });

  test("message always contains hook name", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });
    expect(result.message).toContain("session-start-overlay-injector");
  });

  test("does not throw with well-formed payload", async () => {
    let threw = false;
    try {
      await sessionStartOverlayInjector({ cwd: TMP, session_id: "sess-test-1" });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ─── 2. Capsule structure ─────────────────────────────────────────────────────

describe("capsule_structure", () => {
  test("additionalContext contains rules overlay capsule heading (when overlay present)", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });

    expect(result.decision).toBe("continue");

    if (result.additionalContext !== undefined) {
      // Must include the canonical heading.
      expect(result.additionalContext).toContain("palantir-mini rules overlay capsule");
    }
    // Either capsule was built (additionalContext set) or not (graceful miss).
    // The hook never throws either way.
    expect(typeof result.message).toBe("string");
  });

  test("additionalContext includes CORE.md section when overlay exists", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });
    if (result.additionalContext !== undefined) {
      // Should contain CORE.md or a fallback note.
      const hasCore =
        result.additionalContext.includes("CORE.md") ||
        result.additionalContext.includes("not found");
      expect(hasCore).toBe(true);
    }
  });

  test("additionalContext includes pm_rule_query hint", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });
    if (result.additionalContext !== undefined) {
      expect(result.additionalContext).toContain("pm_rule_query");
    }
  });
});

// ─── 3. Bypass env ───────────────────────────────────────────────────────────

describe("bypass_env", () => {
  test("PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE=1 skips capsule injection", async () => {
    process.env["PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE"] = "1";

    const result = await sessionStartOverlayInjector({ cwd: TMP });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("disabled");
    // No additionalContext when bypassed.
    expect(result.additionalContext).toBeUndefined();
  });

  test("bypass does not throw", async () => {
    process.env["PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE"] = "1";
    let threw = false;
    try {
      await sessionStartOverlayInjector({ cwd: TMP });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  // sprint-062 W0-α: emit count assertion — bypass path emits exactly 1 event (audited bypass)
  test("bypass path emits exactly 1 event (mutex hygiene: was fire-and-forget, now await)", async () => {
    process.env["PALANTIR_MINI_OVERLAY_INJECTOR_DISABLE"] = "1";

    await sessionStartOverlayInjector({ cwd: TMP, session_id: "sess-bypass-count" });

    expect(countEventsWritten()).toBe(1);
  });
});

// ─── 4. Null/undefined payload ───────────────────────────────────────────────

describe("payload_variants", () => {
  test("null payload is handled gracefully", async () => {
    let threw = false;
    try {
      await sessionStartOverlayInjector(null);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("undefined payload is handled gracefully", async () => {
    let threw = false;
    try {
      await sessionStartOverlayInjector(undefined);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("empty object payload is handled gracefully", async () => {
    let threw = false;
    let result: Awaited<ReturnType<typeof sessionStartOverlayInjector>>;
    try {
      result = await sessionStartOverlayInjector({});
    } catch {
      threw = true;
      result = { message: "", decision: "continue" };
    }
    expect(threw).toBe(false);
    expect(result.decision).toBe("continue");
  });
});

// ─── 5. Message format ───────────────────────────────────────────────────────

describe("message_format", () => {
  test("message is always a non-empty string", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });

  test("message reports either 'injected', 'failed', or 'disabled'", async () => {
    const result = await sessionStartOverlayInjector({ cwd: TMP });
    const hasValidSuffix =
      result.message.includes("injected") ||
      result.message.includes("failed") ||
      result.message.includes("disabled");
    expect(hasValidSuffix).toBe(true);
  });
});

// ─── 6. Emit count (sprint-062 W0-α mutex hygiene) ───────────────────────────

describe("emit_count_mutex_hygiene", () => {
  // sprint-062 W0-α: nominal path emits exactly 1 event (was 3 fire-and-forget, now 1 await)
  test("nominal path emits exactly 1 event regardless of drift state", async () => {
    // Run without bypass — may or may not detect drift, but always emits exactly 1 event
    await sessionStartOverlayInjector({ cwd: TMP, session_id: "sess-count-nominal" });

    expect(countEventsWritten()).toBe(1);
  });

  test("emit count is stable across multiple calls in same process (idempotent per call)", async () => {
    // Two separate calls each emit exactly 1 event: total 2 after 2 calls
    await sessionStartOverlayInjector({ cwd: TMP, session_id: "sess-count-a" });
    await sessionStartOverlayInjector({ cwd: TMP, session_id: "sess-count-b" });

    expect(countEventsWritten()).toBe(2);
  });
});
