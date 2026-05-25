import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const CODEX_PLUGIN_MANIFEST = join(PLUGIN_ROOT, ".codex-plugin", "plugin.json");
const CODEX_HOOKS_PATH = join(PLUGIN_ROOT, "hooks", "codex-hooks.json");

type HookConfig = {
  type?: string;
  command?: string;
  async?: boolean;
};

type HookGroup = {
  matcher?: string;
  hooks?: HookConfig[];
};

type HooksDocument = {
  hooks?: Record<string, HookGroup[]>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function commandHooks(doc: HooksDocument): HookConfig[] {
  return Object.values(doc.hooks ?? {}).flatMap((groups) =>
    groups.flatMap((group) => group.hooks ?? []),
  );
}

describe("Codex plugin hook entrypoints", () => {
  test("Codex manifest points at the Codex-specific hook registry", () => {
    const manifest = readJson<{ hooks?: string }>(CODEX_PLUGIN_MANIFEST);

    expect(manifest.hooks).toBe("./hooks/codex-hooks.json");
  });

  test("Codex hook registry uses only regex-safe matchers and adapter commands", () => {
    const doc = readJson<HooksDocument>(CODEX_HOOKS_PATH);
    const events = Object.keys(doc.hooks ?? {}).sort();

    expect(events).toEqual([
      "PermissionRequest",
      "PostCompact",
      "PostToolUse",
      "PreCompact",
      "PreToolUse",
      "SessionStart",
      "Stop",
      "SubagentStart",
      "SubagentStop",
      "UserPromptSubmit",
    ]);

    for (const groups of Object.values(doc.hooks ?? {})) {
      for (const group of groups) {
        const matcher = group.matcher;
        expect(matcher?.includes("**/")).not.toBe(true);
        if (matcher && matcher !== "*") {
          expect(() => new RegExp(matcher)).not.toThrow();
        }
      }
    }

    for (const hook of commandHooks(doc)) {
      expect(hook.type).toBe("command");
      expect(hook.async).toBeUndefined();
      expect(hook.command).toContain("lib/codex/claude-hook-adapter.ts");
    }
  });
});
