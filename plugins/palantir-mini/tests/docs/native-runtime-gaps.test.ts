/**
 * Tests for docs/NATIVE_RUNTIME_GAPS.md
 * Per canonical plan v2 §4 row 6.3 (sprint-130 PR 6.3).
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const DOC_PATH = join(PLUGIN_ROOT, "docs/NATIVE_RUNTIME_GAPS.md");
const HOOKS_PATH = join(PLUGIN_ROOT, "hooks/hooks.json");

type HookGroup = {
  hooks?: Array<{ command?: string }>;
};

type HooksRegistry = {
  hooks?: Record<string, HookGroup[]>;
};

function readHooksRegistry(): Required<HooksRegistry>["hooks"] {
  const registry = JSON.parse(readFileSync(HOOKS_PATH, "utf-8")) as HooksRegistry;
  return registry.hooks ?? {};
}

function countHookCommands(hooks: Record<string, HookGroup[]>): number {
  return Object.values(hooks).reduce(
    (total, groups) =>
      total + groups.reduce((groupTotal, group) => groupTotal + (group.hooks?.length ?? 0), 0),
    0,
  );
}

describe("NATIVE_RUNTIME_GAPS.md", () => {
  let content: string;

  it("should exist and be readable", () => {
    content = readFileSync(DOC_PATH, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should contain required column headers", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("Surface");
    expect(content).toContain("Claude event");
    expect(content).toContain("Codex bridge status");
    expect(content).toContain("Notes");
  });

  it("should list at least 6 surfaces in the parity table", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    const surfaceRows = content.match(/^\| [A-Za-z][^|]+\| `[^`]+` \|/gm) ?? [];
    expect(surfaceRows.length).toBeGreaterThanOrEqual(10);
  });

  it("should include all bridge status values", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("partial");
    expect(content).toContain("schema-only");
    expect(content).toContain("native gap");
  });

  it("should include the mandatory audit surfaces", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    const requiredSurfaces = [
      "SessionStart",
      "SessionStop",
      "PreToolUse",
      "PostToolUse",
      "SubagentStart",
      "SubagentStop",
      "TaskCreated",
      "TaskCompleted",
      "TeammateIdle",
      "UserPromptSubmit",
      "PreCompact",
    ];
    for (const surface of requiredSurfaces) {
      expect(content).toContain(surface);
    }
  });

  it("should document the generated Codex adapter surface", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("~/.codex/hooks.json");
    expect(content).toContain("palantir-mini-claude-hook-adapter.ts");
    expect(content).toContain("lib/codex/claude-hook-adapter.ts");
  });

  it("should document current native gap surfaces", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    for (const surface of ["TaskCreated", "TaskCompleted", "TeammateIdle", "SubagentStart", "SubagentStop"]) {
      expect(content).toContain(surface);
    }
  });

  it("should keep hook registry counts and event names aligned with hooks.json", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    const hooks = readHooksRegistry();
    const eventNames = Object.keys(hooks).sort();
    const hookCommandCount = countHookCommands(hooks);

    expect(content).toContain(`reports ${hookCommandCount} hook commands`);
    expect(content).toContain(`currently contains ${eventNames.length} event groups`);

    for (const eventName of eventNames) {
      expect(content).toContain(`\`${eventName}\``);
    }
  });

  it("should keep compact lifecycle hooks schema-only until smoke-proven", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toMatch(/\| Pre-compact \| `PreCompact` \| schema-only \|/);
    expect(content).toMatch(/\| Post-compact \| `PostCompact` \| schema-only \|/);
  });

  it("should keep task, teammate, and subagent lifecycle events as Codex native gaps", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    const nativeGapRows = [
      ["Task created", "TaskCreated"],
      ["Task completed", "TaskCompleted"],
      ["Teammate idle", "TeammateIdle"],
      ["Subagent start", "SubagentStart"],
      ["Subagent stop", "SubagentStop"],
    ] as const;

    for (const [surface, eventName] of nativeGapRows) {
      expect(content).toMatch(new RegExp(`\\| ${surface} \\| \`${eventName}\` \\| native gap \\|`));
    }
  });

  it("should include rule 27 cross-runtime reference", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("rule 27");
  });

  it("should carry a Last audited date", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("Last audited:");
  });

  it("should document Codex manual subagent output-contract fallback", () => {
    content = content ?? readFileSync(DOC_PATH, "utf-8");
    expect(content).toContain("output contract");
    expect(content).toContain("SubagentStop");
    expect(content).toContain("manual fallback");
  });
});
