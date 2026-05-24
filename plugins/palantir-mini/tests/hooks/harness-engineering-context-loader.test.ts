// palantir-mini v4.7.0 — harness-engineering-context-loader hook tests (sprint-053 W2A)
// 3 test cases: nominal load, null payload graceful, payload with session_id.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";

import harnessEngineeringContextLoader from "../../hooks/harness-engineering-context-loader";

let savedEager: string | undefined;

beforeEach(() => {
  savedEager = process.env["PALANTIR_MINI_HARNESS_CONTEXT_EAGER"];
  process.env["PALANTIR_MINI_HARNESS_CONTEXT_EAGER"] = "1";
});

afterEach(() => {
  if (savedEager === undefined) {
    delete process.env["PALANTIR_MINI_HARNESS_CONTEXT_EAGER"];
  } else {
    process.env["PALANTIR_MINI_HARNESS_CONTEXT_EAGER"] = savedEager;
  }
});

// Hard-coded paths the hook reads (mirrors ROUTER_FILES in the hook).
const FILE_LABELS = [
  "anthropic/scaling-managed-agents-2026-04-08.md",
  "anthropic/harness-design-2026-03-24.md",
  "harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md",
  "anthropic/opus-4-7-postmortem-2026-04-23.md",
];

const FILE_PATHS = [
  "/home/palantirkc/.claude/research/anthropic/scaling-managed-agents-2026-04-08.md",
  "/home/palantirkc/.claude/research/anthropic/harness-design-2026-03-24.md",
  "/home/palantirkc/.claude/research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md",
  "/home/palantirkc/.claude/research/anthropic/opus-4-7-postmortem-2026-04-23.md",
];

// ─── Test 1: nominal load — verifies section headings + decision ──────────────

describe("nominal_load_4_files", () => {
  test("returns continue + additionalContext with Harness Engineering heading and 4 labels", async () => {
    const result = await harnessEngineeringContextLoader({ cwd: process.cwd() });

    // Always advisory — decision is "continue".
    expect(result.decision).toBe("continue");

    // message always non-empty.
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.message).toContain("harness-engineering-context-loader");

    // When files exist (best-effort check), verify heading + labels.
    const anyFileExists = FILE_PATHS.some((p) => fs.existsSync(p));

    if (anyFileExists) {
      expect(result.additionalContext).toBeDefined();
      expect(result.additionalContext).toContain("Harness Engineering");

      for (const label of FILE_LABELS) {
        expect(result.additionalContext).toContain(label);
      }
    }
  });
});

// ─── Test 2: null payload — graceful no-throw ─────────────────────────────────

describe("null_payload_graceful", () => {
  test("null payload does not throw and returns non-empty message", async () => {
    let threw = false;
    let result: Awaited<ReturnType<typeof harnessEngineeringContextLoader>>;

    try {
      result = await harnessEngineeringContextLoader(null);
    } catch {
      threw = true;
      result = { message: "", decision: "continue" };
    }

    expect(threw).toBe(false);
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.decision).toBe("continue");
  });
});

// ─── Test 3: payload with session_id — no throw ───────────────────────────────

describe("payload_with_session_id", () => {
  test("payload with cwd + session_id is accepted without throwing", async () => {
    let threw = false;

    try {
      await harnessEngineeringContextLoader({
        cwd:        process.cwd(),
        session_id: "test-123",
      });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
  });
});
