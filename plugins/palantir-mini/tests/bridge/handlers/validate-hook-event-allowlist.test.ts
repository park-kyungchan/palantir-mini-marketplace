// palantir-mini v3.7.0 — validate_hook_event_allowlist handler tests (C.C.3)
// Coverage: validation, valid events pass, invalid event detection,
// KNOWN_INVALID_EVENTS (TaskUpdate) flagged, line numbering.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import validateHookEventAllowlist from "../../../bridge/handlers/validate-hook-event-allowlist";

const tmpDirs: string[] = [];

/**
 * Creates the layout the handler expects:
 *   <root>/.claude-plugin/plugin.json (manifest)
 *   <root>/hooks/hooks.json (hook definitions)
 */
function makeTmpPluginRoot(hooks: Record<string, unknown>): { root: string; manifest: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validate-events-"));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(root, "hooks"), { recursive: true });
  const manifest = path.join(root, ".claude-plugin", "plugin.json");
  fs.writeFileSync(manifest, JSON.stringify({ name: "test-plugin", version: "0.0.0" }));
  fs.writeFileSync(path.join(root, "hooks", "hooks.json"), JSON.stringify({ hooks }, null, 2));
  return { root, manifest };
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("validateHookEventAllowlist", () => {
  test("validation — missing pluginManifestPath throws", async () => {
    await expect(validateHookEventAllowlist({})).rejects.toThrow(/pluginManifestPath.*required/);
  });

  test("validation — non-string pluginManifestPath throws", async () => {
    await expect(validateHookEventAllowlist({ pluginManifestPath: 42 })).rejects.toThrow(
      /pluginManifestPath.*required/,
    );
  });

  test("missing hooks.json returns empty result (no throw)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validate-events-no-hooks-"));
    tmpDirs.push(root);
    fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
    const manifest = path.join(root, ".claude-plugin", "plugin.json");
    fs.writeFileSync(manifest, JSON.stringify({ name: "x" }));
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.invalidEvents).toEqual([]);
    expect(result.deprecatedEvents).toEqual([]);
  });

  test("all valid events pass without invalid flags", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [],
      PostToolUse: [],
      SessionStart: [],
      Stop: [],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.invalidEvents).toEqual([]);
  });

  test("valid policy refs pass without policy issues", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [
        {
          matcher: "Edit|Write|MultiEdit",
          policyRef: "hook-step:pretool-plugin-ownership",
          hooks: [],
        },
      ],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.policyRefIssues).toEqual([]);
  });

  test("missing policy refs are reported", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [
        {
          matcher: "Edit|Write|MultiEdit",
          hooks: [],
        },
      ],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.policyRefIssues).toContainEqual(
      expect.objectContaining({
        kind: "missing-policy-ref",
        event: "PreToolUse",
      }),
    );
  });

  test("unknown policy refs are reported", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [
        {
          matcher: "Edit|Write|MultiEdit",
          policyRef: "hook-step:not-registered",
          hooks: [],
        },
      ],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.policyRefIssues).toContainEqual(
      expect.objectContaining({
        kind: "unknown-policy-ref",
        policyRef: "hook-step:not-registered",
      }),
    );
  });

  test("event/policy mismatches are reported", async () => {
    const { manifest } = makeTmpPluginRoot({
      PostToolUse: [
        {
          matcher: "Edit|Write|MultiEdit",
          policyRef: "hook-step:pretool-plugin-ownership",
          hooks: [],
        },
      ],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.policyRefIssues).toContainEqual(
      expect.objectContaining({
        kind: "event-mismatch",
        event: "PostToolUse",
        policyRef: "hook-step:pretool-plugin-ownership",
      }),
    );
  });

  test("unsupported runtime parity claims are reported", async () => {
    const { manifest } = makeTmpPluginRoot({
      TaskCreated: [
        {
          policyRef: "hook-step:taskcreated-granularity",
          parityClaim: { runtime: "codex", support: "native" },
          hooks: [],
        },
      ],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.policyRefIssues).toContainEqual(
      expect.objectContaining({
        kind: "unsupported-parity-claim",
        event: "TaskCreated",
        runtime: "codex",
        support: "native",
      }),
    );
  });

  test("invalid event name flagged with line number", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [],
      MadeUpEvent: [],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    const flagged = result.invalidEvents.find((e) => e.event === "MadeUpEvent");
    expect(flagged).toBeDefined();
    expect(flagged?.line).toBeGreaterThanOrEqual(1);
  });

  test("KNOWN_INVALID_EVENTS (TaskUpdate) flagged distinctly", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [],
      TaskUpdate: [],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    const taskUpdate = result.invalidEvents.find((e) => e.event === "TaskUpdate");
    expect(taskUpdate).toBeDefined();
  });

  test("multiple invalid events all reported", async () => {
    const { manifest } = makeTmpPluginRoot({
      PreToolUse: [],
      MadeUpA: [],
      MadeUpB: [],
    });
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    const names = result.invalidEvents.map((e) => e.event).sort();
    expect(names).toContain("MadeUpA");
    expect(names).toContain("MadeUpB");
  });

  test("malformed hooks.json treated as empty (no throw)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validate-events-malformed-"));
    tmpDirs.push(root);
    fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
    fs.mkdirSync(path.join(root, "hooks"), { recursive: true });
    const manifest = path.join(root, ".claude-plugin", "plugin.json");
    fs.writeFileSync(manifest, JSON.stringify({ name: "x" }));
    fs.writeFileSync(path.join(root, "hooks", "hooks.json"), "{not-json}");
    const result = await validateHookEventAllowlist({ pluginManifestPath: manifest });
    expect(result.invalidEvents).toEqual([]);
  });
});
