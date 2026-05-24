/**
 * tests/lib/ontology-graph/indexers/plugin-manifest.test.ts
 * Tests for indexPluginManifestAndHooks (plugin-manifest.ts — PR 2.6 sprint-083).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexPluginManifestAndHooks } from "../../../../lib/ontology-graph/indexers/plugin-manifest";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `plugin-manifest-test-${prefix}-${Date.now()}`);
  await fs.promises.mkdir(base, { recursive: true });
  return base;
}

/** Writes a file at an absolute path, creating parent dirs as needed. */
async function writeFile(absPath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, content, "utf-8");
}

/** Deletes a temp directory after the test. */
async function rmDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

const NOW_ISO = "2026-05-13T00:00:00Z";

// ─── Fixture cleanup registry ─────────────────────────────────────────────────

const tmpDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tmpDirs.map((d) => rmDir(d)));
});

// ─── Test 1: Headline fixture-tree walk ───────────────────────────────────────
//
// Create:
//   projectRoot/.claude/plugins/test-plugin/.claude-plugin/plugin.json
//     (containing mcpServers: { "test-server": { type: "stdio", command: "node" } })
//   projectRoot/.claude/plugins/test-plugin/hooks/hooks.json
//     (containing { "PreToolUse": [{ matcher: "Edit", hooks: [{ type: "command", command: "echo test" }] }] })
//
// Assert:
//   ≥1 RuntimeEntrypoint node
//   ≥1 McpHandler node
//   ≥1 Hook node
//   ≥1 edge of kind "describes"
//   ≥1 edge of kind "gates"

describe("indexPluginManifestAndHooks", () => {
  test(
    "walks a fixture tree with plugin.json + hooks.json and emits typed nodes + at least one edge of each kind",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // .claude-plugin/plugin.json with one mcpServers entry
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          ".claude-plugin",
          "plugin.json",
        ),
        JSON.stringify({
          name: "test-plugin",
          version: "1.0.0",
          description: "A test plugin.",
          mcpServers: {
            "test-server": {
              type: "stdio",
              command: "node",
            },
          },
        }),
      );

      // hooks/hooks.json with one PreToolUse hook
      await writeFile(
        path.join(projectRoot, ".claude", "plugins", "test-plugin", "hooks", "hooks.json"),
        JSON.stringify({
          PreToolUse: [
            {
              matcher: "Edit",
              hooks: [
                {
                  type: "command",
                  command: "echo test",
                },
              ],
            },
          ],
        }),
      );

      const result = await indexPluginManifestAndHooks(projectRoot, { nowIso: NOW_ISO });

      // Node assertions
      const entrypointNodes = result.nodes.filter((n) => n.kind === "RuntimeEntrypoint");
      const handlerNodes = result.nodes.filter((n) => n.kind === "McpHandler");
      const hookNodes = result.nodes.filter((n) => n.kind === "Hook");

      expect(entrypointNodes.length).toBeGreaterThanOrEqual(1);
      expect(handlerNodes.length).toBeGreaterThanOrEqual(1);
      expect(hookNodes.length).toBeGreaterThanOrEqual(1);

      // Payload assertions on RuntimeEntrypoint node
      const entrypointNode = entrypointNodes.find((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("test-plugin");
      });
      expect(entrypointNode).toBeDefined();
      const entrypointValue = entrypointNode?.value as {
        lastIndexed: string;
        projectRoot: string;
        pluginName: string;
        pluginVersion: string;
      };
      expect(entrypointValue.lastIndexed).toBe(NOW_ISO);
      expect(entrypointValue.projectRoot).toBe(projectRoot);
      expect(entrypointValue.pluginName).toBe("test-plugin");
      expect(entrypointValue.pluginVersion).toBe("1.0.0");

      // Payload assertion on McpHandler node
      const handlerNode = handlerNodes.find((n) => {
        const v = n.value as { handlerName: string };
        return v.handlerName === "test-server";
      });
      expect(handlerNode).toBeDefined();
      const handlerValue = handlerNode?.value as { transportType: string };
      expect(handlerValue.transportType).toBe("stdio");

      // Payload assertion on Hook node
      const hookNode = hookNodes.find((n) => {
        const v = n.value as { hookEvent: string };
        return v.hookEvent === "PreToolUse";
      });
      expect(hookNode).toBeDefined();
      const hookValue = hookNode?.value as {
        hookEvent: string;
        matcher: string;
        commandFragment: string;
        lastIndexed: string;
      };
      expect(hookValue.hookEvent).toBe("PreToolUse");
      expect(hookValue.matcher).toBe("Edit");
      expect(hookValue.commandFragment).toBe("echo test");
      expect(hookValue.lastIndexed).toBe(NOW_ISO);

      // Edge assertions
      const describesEdges = result.edges.filter((e) => e.kind === "describes");
      const gatesEdges = result.edges.filter((e) => e.kind === "gates");

      expect(describesEdges.length).toBeGreaterThanOrEqual(1);
      expect(gatesEdges.length).toBeGreaterThanOrEqual(1);

      // Total non-zero
      expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no plugin.json or hooks.json.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no plugin.json or hooks.json", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result:
      | Awaited<ReturnType<typeof indexPluginManifestAndHooks>>
      | undefined;
    let threw = false;

    try {
      result = await indexPluginManifestAndHooks(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: excludeGlobs skips plugin directory + .codex-plugin auto-regen mirror ──
  //
  // Reuse the fixture from test 1 AND also write .codex-plugin/plugin.json.
  // Call with excludeGlobs: ["**/.codex-plugin/**", "**/test-plugin/**"].
  // Assert: no nodes for test-plugin manifests (both .claude-plugin and .codex-plugin skipped).

  test(
    "respects excludeGlobs to skip a plugin directory + .codex-plugin auto-regen mirror",
    async () => {
      const tmpDir = await makeTmpDir("exclude");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // .claude-plugin/plugin.json (should be excluded via **/test-plugin/**)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          ".claude-plugin",
          "plugin.json",
        ),
        JSON.stringify({
          name: "test-plugin",
          version: "1.0.0",
          mcpServers: {
            "test-server": { type: "stdio", command: "node" },
          },
        }),
      );

      // .codex-plugin/plugin.json (auto-regen mirror; should be excluded via **/.codex-plugin/**)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          ".codex-plugin",
          "plugin.json",
        ),
        JSON.stringify({
          name: "test-plugin-codex-mirror",
          version: "1.0.0",
        }),
      );

      // hooks.json (should also be excluded via **/test-plugin/**)
      await writeFile(
        path.join(projectRoot, ".claude", "plugins", "test-plugin", "hooks", "hooks.json"),
        JSON.stringify({
          PreToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "echo test" }] }],
        }),
      );

      // Exclude both .codex-plugin and the test-plugin directory entirely
      const result = await indexPluginManifestAndHooks(projectRoot, {
        nowIso: NOW_ISO,
        excludeGlobs: ["**/.codex-plugin/**", "**/test-plugin/**"],
      });

      // All node file paths
      const nodeFilePaths = result.nodes.map((n) => {
        const v = n.value as { filePath: string };
        return v.filePath;
      });

      // test-plugin manifests must NOT be in results
      const testPluginClaudePluginPath = path.join(
        projectRoot,
        ".claude",
        "plugins",
        "test-plugin",
        ".claude-plugin",
        "plugin.json",
      );
      const testPluginCodexPluginPath = path.join(
        projectRoot,
        ".claude",
        "plugins",
        "test-plugin",
        ".codex-plugin",
        "plugin.json",
      );

      expect(nodeFilePaths).not.toContain(testPluginClaudePluginPath);
      expect(nodeFilePaths).not.toContain(testPluginCodexPluginPath);

      // No RuntimeEntrypoint nodes for test-plugin
      const entrypointNodes = result.nodes.filter((n) => n.kind === "RuntimeEntrypoint");
      const testPluginEntrypoints = entrypointNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("test-plugin");
      });
      expect(testPluginEntrypoints.length).toBe(0);

      // No Hook nodes for test-plugin
      const hookNodes = result.nodes.filter((n) => n.kind === "Hook");
      const testPluginHooks = hookNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("test-plugin");
      });
      expect(testPluginHooks.length).toBe(0);
    },
  );
});
