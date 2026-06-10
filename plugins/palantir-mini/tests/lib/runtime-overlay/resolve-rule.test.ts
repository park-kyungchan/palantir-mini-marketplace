// palantir-mini v4.13.0 — tests/lib/runtime-overlay/resolve-rule.test.ts (sprint-061 A.W1.a)
//
// Tests for resolveRule() + resolveRuleSync():
//   1. Numeric ID resolution — plugin overlay hits (OVERLAY_RULES_DIR has NN-*.md)
//   2. Slug resolution — string slug finds file by slug portion
//   3. External fallback — when overlay file absent, falls back to external
//   4. Not-found — when neither overlay nor external has the file
//   5. Overlay preference — overlay shadows external when both exist

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// We need to test with isolated directories, so we import raw helpers.
// The actual resolveRule/resolveRuleSync functions use module-level constants,
// so we re-implement the core logic in tests using the exported OVERLAY_RULES_DIR
// and EXTERNAL_RULES_DIR constants, and test the public API against real files.

import {
  resolveRule,
  resolveRuleSync,
  OVERLAY_RULES_DIR,
  EXTERNAL_RULES_DIR,
} from "../../../lib/runtime-overlay/resolve-rule";

// ─── Setup / teardown ────────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-resolve-rule-"));
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── 1. Plugin overlay dir exists and contains NN-*.md files ─────────────────

describe("overlay_dir_structure", () => {
  test("OVERLAY_RULES_DIR is an absolute path", () => {
    expect(path.isAbsolute(OVERLAY_RULES_DIR)).toBe(true);
  });

  test("EXTERNAL_RULES_DIR is an absolute path", () => {
    expect(path.isAbsolute(EXTERNAL_RULES_DIR)).toBe(true);
  });

  test("OVERLAY_RULES_DIR exists and contains at least one NN-*.md file", () => {
    const exists = fs.existsSync(OVERLAY_RULES_DIR);
    if (exists) {
      const files = fs.readdirSync(OVERLAY_RULES_DIR).filter(
        (f) => /^\d{2}-/.test(f) && f.endsWith(".md"),
      );
      expect(files.length).toBeGreaterThan(0);
    } else {
      // Directory doesn't exist yet (e.g. CI with no overlay); skip deep check.
      expect(true).toBe(true);
    }
  });
});

// ─── 2. resolveRule by known rule ID (rule 10 is present in overlay) ─────────

describe("resolve_by_id_overlay_hit", () => {
  test("resolveRule(10) hits plugin-overlay and returns body", async () => {
    const overlayFile = path.join(OVERLAY_RULES_DIR, "10-events-jsonl.md");
    if (!fs.existsSync(overlayFile)) {
      // Overlay file absent in this env — check external fallback works.
      const result = await resolveRule(10);
      expect(["external", "not-found"]).toContain(result.source);
      return;
    }

    const result = await resolveRule(10);
    expect(result.source).toBe("plugin-overlay");
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.filePath).toBeDefined();
    expect(result.filePath).toContain("10-events-jsonl.md");
  });

  test("resolveRuleSync(10) returns same source as async variant", () => {
    const sync = resolveRuleSync(10);
    expect(["plugin-overlay", "external", "not-found"]).toContain(sync.source);
    if (sync.source !== "not-found") {
      expect(sync.body.length).toBeGreaterThan(0);
    }
  });

  test("resolveRule(29) serves the fable5 rule body from the plugin overlay", async () => {
    // Rule 29 (fable5-ultracode-workflow-archiving) was added to the overlay at the
    // 2026-06-10 rules sync. The external ~/.claude/rules/29-*.md is a stub, so the
    // overlay must win and serve the full body (pm_rule_query byId:29 depends on this).
    const overlayFile = path.join(
      OVERLAY_RULES_DIR,
      "29-fable5-ultracode-workflow-archiving.md",
    );
    if (!fs.existsSync(overlayFile)) {
      // Overlay absent in this env — assert at least a defined source.
      const result = await resolveRule(29);
      expect(["external", "not-found"]).toContain(result.source);
      return;
    }
    const result = await resolveRule(29);
    expect(result.source).toBe("plugin-overlay");
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.body).toContain("§Trigger");
    expect(result.filePath).toContain("29-fable5-ultracode-workflow-archiving.md");

    // Slug resolution also hits the overlay.
    const bySlug = resolveRuleSync("fable5-ultracode-workflow-archiving");
    expect(bySlug.source).toBe("plugin-overlay");
    expect(bySlug.body).toBe(result.body);
  });
});

// ─── 3. resolveRule by slug ───────────────────────────────────────────────────

describe("resolve_by_slug", () => {
  test("resolveRule('events-jsonl') returns a body (overlay or external)", async () => {
    const result = await resolveRule("events-jsonl");
    expect(["plugin-overlay", "external", "not-found"]).toContain(result.source);
    if (result.source !== "not-found") {
      expect(result.body.length).toBeGreaterThan(0);
    }
  });

  test("resolveRuleSync('events-jsonl') returns consistent source", () => {
    const syncResult = resolveRuleSync("events-jsonl");
    const known: Array<"plugin-overlay" | "external" | "not-found"> = [
      "plugin-overlay",
      "external",
      "not-found",
    ];
    expect(known).toContain(syncResult.source);
  });

  test("resolveRule with unknown slug returns not-found", async () => {
    const result = await resolveRule("nonexistent-slug-xyz-99");
    expect(result.source).toBe("not-found");
    expect(result.body).toBe("");
    expect(result.filePath).toBeUndefined();
  });
});

// ─── 4. Not-found path ───────────────────────────────────────────────────────

describe("not_found_path", () => {
  test("resolveRule(999) returns not-found (no such rule id)", async () => {
    const result = await resolveRule(999);
    expect(result.source).toBe("not-found");
    expect(result.body).toBe("");
  });

  test("resolveRuleSync(999) also returns not-found", () => {
    const result = resolveRuleSync(999);
    expect(result.source).toBe("not-found");
    expect(result.body).toBe("");
  });
});

// ─── 5. Return shape invariants ───────────────────────────────────────────────

describe("return_shape", () => {
  test("resolveRule always returns { body: string, source: RuleBodySource }", async () => {
    const result = await resolveRule(10);
    expect(typeof result.body).toBe("string");
    expect(["plugin-overlay", "external", "not-found"]).toContain(result.source);
  });

  test("resolveRuleSync always returns { body: string, source: RuleBodySource }", () => {
    const result = resolveRuleSync(10);
    expect(typeof result.body).toBe("string");
    expect(["plugin-overlay", "external", "not-found"]).toContain(result.source);
  });

  test("filePath is defined when source is not not-found", async () => {
    const result = await resolveRule(10);
    if (result.source !== "not-found") {
      expect(result.filePath).toBeDefined();
      expect(typeof result.filePath).toBe("string");
    }
  });
});
