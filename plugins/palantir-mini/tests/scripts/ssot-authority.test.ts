/**
 * ssot-authority.test.ts
 *
 * Validates the plugin source authority marker:
 * 1. .ssot-authority.json has required fields.
 * 2. README.md contains a reference to SSOT-AUTHORITY.md.
 *
 * sprint-128 PR 6.1 — canonical plan v2 §4 row 6.1; PHASE 6 ENTRY.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "../..");

describe("ssot-authority", () => {
  describe(".ssot-authority.json structure", () => {
    const markerPath = join(PLUGIN_ROOT, ".ssot-authority.json");
    let marker: Record<string, unknown>;

    it("file exists and parses as JSON", () => {
      const raw = readFileSync(markerPath, "utf8");
      marker = JSON.parse(raw);
      expect(marker).toBeTruthy();
    });

    it("kind field is 'palantir-mini-workflow-authority'", () => {
      const raw = readFileSync(markerPath, "utf8");
      const m = JSON.parse(raw);
      expect(m.kind).toBe("palantir-mini-workflow-authority");
    });

    it("version field is present and non-empty", () => {
      const raw = readFileSync(markerPath, "utf8");
      const m = JSON.parse(raw);
      expect(typeof m.version).toBe("string");
      expect((m.version as string).length).toBeGreaterThan(0);
    });

    it("consumerRuntimes is an array with Codex as the active runtime", () => {
      const raw = readFileSync(markerPath, "utf8");
      const m = JSON.parse(raw);
      expect(Array.isArray(m.consumerRuntimes)).toBe(true);
      expect((m.consumerRuntimes as Array<Record<string, unknown>>).map((entry) => entry.runtime)).toEqual([
        "codex-cli",
      ]);
    });

    it("each consumerRuntime has 'runtime' and 'consumesVia' fields", () => {
      const raw = readFileSync(markerPath, "utf8");
      const m = JSON.parse(raw);
      for (const entry of m.consumerRuntimes as Array<Record<string, unknown>>) {
        expect(typeof entry.runtime).toBe("string");
        expect(typeof entry.consumesVia).toBe("string");
      }
    });

    it("forbiddenForks is an array with at least 1 entry", () => {
      const raw = readFileSync(markerPath, "utf8");
      const m = JSON.parse(raw);
      expect(Array.isArray(m.forbiddenForks)).toBe(true);
      expect((m.forbiddenForks as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it("authority field points to plugin directory", () => {
      const raw = readFileSync(markerPath, "utf8");
      const m = JSON.parse(raw);
      expect(typeof m.authority).toBe("string");
      expect(m.authority as string).toContain("palantir-mini");
    });
  });

  describe("README.md cross-reference", () => {
    const readmePath = join(PLUGIN_ROOT, "README.md");

    it("README.md references SSOT-AUTHORITY.md", () => {
      const readme = readFileSync(readmePath, "utf8");
      expect(readme).toContain("SSOT-AUTHORITY.md");
    });

    it("README.md references .ssot-authority.json", () => {
      const readme = readFileSync(readmePath, "utf8");
      expect(readme).toContain(".ssot-authority.json");
    });
  });
});
