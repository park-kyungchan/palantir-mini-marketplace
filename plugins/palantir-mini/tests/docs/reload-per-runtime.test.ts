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

  it("should contain at least 3 runtime sections", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("## Claude Code CLI");
    expect(content).toContain("## Codex CLI");
    expect(content).toContain("## Gemini CLI");
  });

  it("should contain a common pitfalls section with at least 1 entry", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("## Common pitfalls");
    // At least one numbered pitfall entry
    const pitfallEntries = content.match(/^\d+\. \*\*/gm) ?? [];
    expect(pitfallEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("should document the /reload-plugins command for Claude Code CLI", () => {
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
    expect(content).toContain("bun run ~/.codex/scripts/sync-claude-palantir-mini.ts");
    expect(content).toContain("restart the Codex CLI process");
    expect(content).toContain("There is no\nCodex equivalent of Claude Code's `/reload-plugins`");
    expect(content).toContain("does **not** hot-reload MCP servers or plugins");
  });

  it("should preserve documented Codex native gaps and payload-sensitive adapter caveats", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    for (const eventName of ["TaskCreated", "TaskCompleted", "TeammateIdle", "SubagentStart", "SubagentStop"]) {
      expect(content).toContain(eventName);
    }
    expect(content).toContain("subagent and compact lifecycle parity remains payload-sensitive");
  });

  it("should document exactly the active Claude, Codex, and Gemini runtime families", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("gemini extensions validate plugins/palantir-mini/.gemini-extension");
    expect(content).toContain("Gemini hook timeouts are milliseconds");
    expect(content).not.toContain("Future runtimes");
    expect(content).not.toContain("Cursor");
    expect(content.match(/TBD/g)?.length ?? 0).toBe(0);
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

  it("should reference NATIVE_RUNTIME_GAPS.md for cross-runtime parity", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("NATIVE_RUNTIME_GAPS.md");
  });
});
