import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const HOOKS_JSON = join(PLUGIN_ROOT, "hooks", "hooks.json");
const REQUIRED_INPUT_SCHEMA = "schemas/hooks/pretooluse.input.schema.json";
const REQUIRED_OUTPUT_SCHEMA = "schemas/hooks/governance-hook.output.schema.json";
const SURFACE_STATUS_VALUES = [
  "public-core",
  "protected-default-off",
  "dev-only",
  "docs-only",
  "internal",
  "deprecated-candidate",
  "archived",
] as const;
const SURFACE_STATUS_VALUE_SET = new Set<string>(SURFACE_STATUS_VALUES);

interface HookConfig {
  readonly type?: string;
  readonly command?: string;
  readonly failureMode?: string;
  readonly permissionDecision?: string;
  readonly inputSchemaRef?: string;
  readonly outputSchemaRef?: string;
}

interface HookGroup {
  readonly policyRef?: string;
  readonly surfaceStatus?: string;
  readonly hooks?: readonly HookConfig[];
}

interface HooksDocument {
  readonly hooks?: Record<string, readonly HookGroup[]>;
}

function loadHooks(): HooksDocument {
  return JSON.parse(readFileSync(HOOKS_JSON, "utf8")) as HooksDocument;
}

describe("hook IO contracts", () => {
  test("shared hook policy groups declare valid surface status metadata", () => {
    const hooks = loadHooks();
    const groups = Object.entries(hooks.hooks ?? {}).flatMap(([eventName, eventGroups]) =>
      eventGroups.map((group, index) => ({ eventName, group, index })),
    );

    expect(groups.length).toBeGreaterThan(0);
    for (const { eventName, group, index } of groups) {
      const label = `${eventName}[${index}]`;
      expect(group.policyRef, label).toMatch(/^hook-step:/);
      expect(SURFACE_STATUS_VALUE_SET.has(group.surfaceStatus ?? ""), label).toBe(true);
    }
  });

  test("mutation-required PreToolUse hooks declare input and output schema refs", () => {
    const hooks = loadHooks();
    const mutationRequiredHooks = Object.entries(hooks.hooks ?? {}).flatMap(([eventName, groups]) =>
      groups.flatMap((group) =>
        (group.hooks ?? [])
          .filter((hook) =>
            eventName === "PreToolUse" &&
            hook.type === "command" &&
            hook.failureMode === "fail-closed" &&
            hook.permissionDecision === "defer"
          )
          .map((hook) => ({ group, hook })),
      ),
    );

    expect(mutationRequiredHooks.length).toBeGreaterThan(0);
    for (const { hook } of mutationRequiredHooks) {
      expect(hook.inputSchemaRef).toBe(REQUIRED_INPUT_SCHEMA);
      expect(hook.outputSchemaRef).toBe(REQUIRED_OUTPUT_SCHEMA);
    }
  });

  test("hook contract verifier passes the checked-in hook registry", () => {
    const result = spawnSync("bun", ["run", "scripts/verify-hook-contracts.ts"], {
      cwd: PLUGIN_ROOT,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("mutation-required hooks are schema-backed");
    expect(result.stderr).toBe("");
  });
});
