import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const CODEX_PLUGIN_MANIFEST = join(PLUGIN_ROOT, ".codex-plugin", "plugin.json");
const CODEX_HOOKS_PATH = join(PLUGIN_ROOT, "hooks", "codex-hooks.json");
const SHARED_HOOKS_PATH = join(PLUGIN_ROOT, "hooks", "hooks.json");
const CODEX_RUNTIME_EVIDENCE_PATH = join(PLUGIN_ROOT, "contracts", "runtime-evidence", "codex.json");
const TSCONFIG_PATH = join(PLUGIN_ROOT, "tsconfig.json");
const CLAUDE_ONLY_EVENTS = ["TaskCreated", "TaskCompleted", "TeammateIdle"] as const;
const UNMOUNTED_CODEX_EVENTS = ["PreToolUse", "SessionStart", "UserPromptSubmit"] as const;

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
    const doc = readJson<HooksDocument & { description?: string }>(CODEX_HOOKS_PATH);
    const events = Object.keys(doc.hooks ?? {}).sort();

    expect(doc.description).toContain("entrypoints");
    expect(doc.description).toContain("delegate");
    expect(doc.description).toContain("live-reads hooks/hooks.json");
    expect(doc.description).toContain("PreToolUse is intentionally not registered");
    expect(doc.description).toContain("SessionStart and UserPromptSubmit are intentionally not registered");

    expect(events).toEqual([
      "PermissionRequest",
      "PostCompact",
      "PostToolUse",
      "PreCompact",
      "Stop",
      "SubagentStart",
      "SubagentStop",
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
      expect(hook.command).toContain("lib/codex/codex-hook-adapter.ts");
    }
  });

  test("TypeScript accepts plugin hook shims that import .ts adapter files", () => {
    const tsconfig = readJson<{
      compilerOptions?: {
        allowImportingTsExtensions?: boolean;
        noEmit?: boolean;
      };
    }>(TSCONFIG_PATH);

    expect(tsconfig.compilerOptions?.noEmit).toBe(true);
    expect(tsconfig.compilerOptions?.allowImportingTsExtensions).toBe(true);
  });
});

describe("runtime-specific hook registries", () => {
  test("Codex runtime evidence records intentionally unmounted lifecycle events", () => {
    const doc = readJson<HooksDocument>(CODEX_HOOKS_PATH);
    const evidence = readJson<{
      unsupportedSurfaceRefs?: string[];
    }>(CODEX_RUNTIME_EVIDENCE_PATH);

    for (const eventName of UNMOUNTED_CODEX_EVENTS) {
      expect(doc.hooks?.[eventName]).toBeUndefined();
    }

    expect(evidence.unsupportedSurfaceRefs).toEqual(
      expect.arrayContaining([
        "codex:hook-event:PreToolUse:unmounted-until-opt-out-and-read-only-classification",
        "codex:hook-event:SessionStart:unmounted",
        "codex:hook-event:UserPromptSubmit:unmounted",
      ]),
    );
  });

  test("shared hook registry excludes inactive Claude task and teammate lifecycle events", () => {
    const shared = readJson<HooksDocument>(SHARED_HOOKS_PATH);

    for (const eventName of CLAUDE_ONLY_EVENTS) {
      expect(shared.hooks?.[eventName]).toBeUndefined();
    }
  });
});
