// palantir-mini v3.7.0 — validate_managed_settings_fragments handler tests (C.C.4)
// Coverage: validation, missing settings dir, fragment shape, drift detection,
// unknown keys, malformed JSON.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import validateManagedSettingsFragments, {
  pluginMcpToolPatterns,
} from "../../../bridge/handlers/validate-managed-settings-fragments";

const tmpDirs: string[] = [];

function makeTmpProject(fragments: Record<string, unknown>): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validate-fragments-"));
  tmpDirs.push(project);
  const settingsDir = path.join(project, ".claude", "managed-settings.d");
  fs.mkdirSync(settingsDir, { recursive: true });
  for (const [name, body] of Object.entries(fragments)) {
    fs.writeFileSync(path.join(settingsDir, name), JSON.stringify(body, null, 2));
  }
  return project;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("pluginMcpToolPatterns", () => {
  test("returns sorted array of mcp__palantir-mini__* patterns", () => {
    const patterns = pluginMcpToolPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every((p) => p.startsWith("mcp__palantir-mini__"))).toBe(true);
    const sorted = [...patterns].sort((a, b) => a.localeCompare(b));
    expect(patterns).toEqual(sorted);
  });

  test("includes public event-log retention surface", () => {
    expect(pluginMcpToolPatterns()).toContain("mcp__palantir-mini__events_log_rotate");
  });
});

describe("validateManagedSettingsFragments", () => {
  test("validation — missing project throws", async () => {
    await expect(validateManagedSettingsFragments({})).rejects.toThrow(/project.*required/);
  });

  test("missing settings dir returns empty result", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validate-fragments-empty-"));
    tmpDirs.push(project);
    const result = await validateManagedSettingsFragments({ project });
    expect(result.fragments).toEqual([]);
    expect(result.drift).toEqual([]);
    expect(result.unknownKeys).toEqual([]);
  });

  test("fragment with all expected tools shows no drift", async () => {
    const expected = pluginMcpToolPatterns().slice(0, 5);
    const project = makeTmpProject({
      "50-palantir-mini.json": {
        permissions: { allow: expected, deny: [] },
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: expected,
    });
    expect(result.fragments).toHaveLength(1);
    expect(result.drift).toEqual([]);
    expect(result.fragments[0]?.fragmentId).toBe("50-palantir-mini");
    expect(result.fragments[0]?.permissionRules.length).toBe(expected.length);
  });

  test("normalizes Codex MCP aliases before comparing managed settings drift", async () => {
    const project = makeTmpProject({
      "50-palantir-mini.json": {
        permissions: {
          allow: [
            "mcp__palantir_mini__emit_event",
            "mcp__palantir_mini__.commit_edits",
          ],
          deny: [],
        },
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: [
        "mcp__palantir-mini__emit_event",
        "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      ],
    });
    expect(result.drift).toEqual([]);
  });

  test("non-MCP allow permissions do not count as unexpected tool drift", async () => {
    const expected = ["mcp__palantir-mini__emit_event"];
    const project = makeTmpProject({
      "50-palantir-mini.json": {
        permissions: {
          allow: [
            "Read(~/.claude/**)",
            "Bash(bun test *)",
            "mcp__palantir-mini__emit_event",
          ],
          deny: [],
        },
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: expected,
    });
    expect(result.drift).toEqual([]);
    expect(result.fragments[0]?.permissionRules).toHaveLength(3);
  });

  test("fragment missing expected tools reports drift", async () => {
    const expected = ["mcp__palantir-mini__a", "mcp__palantir-mini__b", "mcp__palantir-mini__c"];
    const project = makeTmpProject({
      "50-palantir-mini.json": {
        permissions: { allow: ["mcp__palantir-mini__a"], deny: [] },
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: expected,
    });
    expect(result.drift).toHaveLength(1);
    expect(result.drift[0]?.missing.sort()).toEqual([
      "mcp__palantir-mini__b",
      "mcp__palantir-mini__c",
    ]);
  });

  test("unexpected MCP allow permissions still report drift", async () => {
    const project = makeTmpProject({
      "50-palantir-mini.json": {
        permissions: {
          allow: ["mcp__palantir-mini__emit_event", "mcp__palantir-mini__legacy_tool"],
          deny: [],
        },
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: ["mcp__palantir-mini__emit_event"],
    });
    expect(result.drift).toHaveLength(1);
    expect(result.drift[0]?.extra).toEqual(["mcp__palantir-mini__legacy_tool"]);
  });

  test("unknown top-level keys are flagged", async () => {
    const project = makeTmpProject({
      "50-palantir-mini.json": {
        permissions: { allow: [], deny: [] },
        weirdKey: "value",
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: [],
    });
    expect(result.unknownKeys).toContain("50-palantir-mini.json:weirdKey");
  });

  test("malformed JSON fragment surfaced in unknownKeys", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-validate-fragments-malformed-"));
    tmpDirs.push(project);
    const settingsDir = path.join(project, ".claude", "managed-settings.d");
    fs.mkdirSync(settingsDir, { recursive: true });
    fs.writeFileSync(path.join(settingsDir, "broken.json"), "{not-json}");
    const result = await validateManagedSettingsFragments({ project, expectedTools: [] });
    expect(result.unknownKeys.some((k) => k.includes("broken.json"))).toBe(true);
  });

  test("allow + deny merged into permissionRules with kind", async () => {
    const project = makeTmpProject({
      "10-deny.json": {
        permissions: {
          allow: ["mcp__palantir-mini__x"],
          deny: ["mcp__palantir-mini__y"],
        },
      },
    });
    const result = await validateManagedSettingsFragments({
      project,
      expectedTools: ["mcp__palantir-mini__x"],
    });
    const fragment = result.fragments[0];
    expect(fragment?.permissionRules.find((r) => r.pattern === "mcp__palantir-mini__y")?.kind).toBe(
      "deny",
    );
    expect(fragment?.permissionRules.find((r) => r.pattern === "mcp__palantir-mini__x")?.kind).toBe(
      "allow",
    );
  });

  test("ignores non-.json files in settings dir", async () => {
    const project = makeTmpProject({
      "valid.json": { permissions: { allow: [], deny: [] } },
    });
    const settingsDir = path.join(project, ".claude", "managed-settings.d");
    fs.writeFileSync(path.join(settingsDir, "README.md"), "# notes");
    const result = await validateManagedSettingsFragments({ project, expectedTools: [] });
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0]?.fragmentId).toBe("valid");
  });
});
