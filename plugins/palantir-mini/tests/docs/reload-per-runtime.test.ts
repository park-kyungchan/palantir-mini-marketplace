/**
 * Tests for docs/RELOAD_PER_RUNTIME.md
 * Per canonical plan v2 §4 row 6.4 (sprint-131 PR 6.4).
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const DOC_PATH = join(PLUGIN_ROOT, "docs/RELOAD_PER_RUNTIME.md");

describe("RELOAD_PER_RUNTIME.md", () => {
  let content: string;

  it("should exist and be readable", () => {
    content = readFileSync(DOC_PATH, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should document Codex as the active runtime section", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("## Codex CLI");
    expect(content).not.toContain("## Claude Code CLI");
    expect(content).not.toContain("## Gemini");
  });

  it("should contain a common pitfalls section with at least 1 entry", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("## Common pitfalls");
    // At least one numbered pitfall entry
    const pitfallEntries = content.match(/^\d+\. \*\*/gm) ?? [];
    expect(pitfallEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("should document Claude reload commands now that Claude is an active adapter", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("/reload-plugins");
  });

  it("should reference hooks.json as SSoT for Codex CLI", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("hooks/hooks.json");
    expect(content).toContain("sync-codex-adapter.ts");
  });

  it("should require fleet sync plus Codex restart for Codex hook/plugin reloads", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("restart the Codex CLI process");
    expect(content).toContain("no in-session hot-reload");
  });

  it("should document Codex cache and restart caveats", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("~/.codex/plugins/cache/**");
    expect(content).toContain("Codex must be restarted");
  });

  it("should document exactly the active Codex+Claude runtime family", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("Current local install scope: Codex AND Claude");
    expect(content).not.toContain("gemini extensions validate");
    expect(content).not.toContain("claude plugin");
  });

  it("should include a 'What triggers a reload requirement' section with a table", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("What triggers a reload requirement");
    // Table headers
    expect(content).toContain("Change category");
    expect(content).toContain("Reload needed?");
  });

  it("should state that session state changes do not require reload", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain(".palantir-mini/session");
    expect(content).toContain("No reload required");
  });

  it("should carry a Last audited date", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("Last audited:");
  });

  it("should reference RUNTIME_LAYER_BOUNDARY.md for install separation", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("RUNTIME_LAYER_BOUNDARY.md");
  });
});
