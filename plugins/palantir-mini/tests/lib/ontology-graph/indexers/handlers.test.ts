/**
 * tests/lib/ontology-graph/indexers/handlers.test.ts
 * Tests for indexHandlerExports (handlers.ts — PR 2.8 sprint-085).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexHandlerExports } from "../../../../lib/ontology-graph/indexers/handlers";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `handler-exports-test-${prefix}-${Date.now()}`);
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
//   projectRoot/.claude/plugins/test-plugin/bridge/handlers/handler-a.ts
//     (with `export default async function handlerA(args: unknown) { return {}; }`
//      + `export function helperA() { return 1; }`)
//   projectRoot/.claude/plugins/test-plugin/bridge/handlers/handler-b.ts
//     (with `export const handlerB = async (args: unknown) => ({});`)
//
// Assert:
//   ≥2 McpHandler nodes (handlerA + helperA + handlerB = 3 nodes)
//   ≥1 edge of kind "describes"
//   ≥1 edge of kind "implements"

describe("indexHandlerExports", () => {
  test(
    "walks a fixture tree with bridge/handlers/*.ts files and emits typed McpHandler nodes + at least one edge of each kind",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // handler-a.ts: export default function + export function
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "bridge",
          "handlers",
          "handler-a.ts",
        ),
        [
          "// Test handler A",
          "export default async function handlerA(args: unknown): Promise<{}> {",
          "  return {};",
          "}",
          "",
          "export function helperA(): number {",
          "  return 1;",
          "}",
        ].join("\n"),
      );

      // handler-b.ts: export const
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "bridge",
          "handlers",
          "handler-b.ts",
        ),
        [
          "// Test handler B",
          "export const handlerB = async (args: unknown): Promise<{}> => ({});",
        ].join("\n"),
      );

      const result = await indexHandlerExports(projectRoot, { nowIso: NOW_ISO });

      // Node assertions: ≥2 McpHandler nodes (handlerA + helperA + handlerB = 3)
      const handlerNodes = result.nodes.filter((n) => n.kind === "McpHandler");
      expect(handlerNodes.length).toBeGreaterThanOrEqual(2);

      // Filter to test-plugin only (defensive: ignore real $HOME plugins if running on user machine)
      const testPluginNodes = handlerNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });
      expect(testPluginNodes.length).toBeGreaterThanOrEqual(2);

      // Payload assertions on handlerA node
      const handlerANode = testPluginNodes.find((n) => {
        const v = n.value as { exportedFnName: string };
        return v.exportedFnName === "handlerA";
      });
      expect(handlerANode).toBeDefined();
      const handlerAValue = handlerANode?.value as {
        lastIndexed: string;
        projectRoot: string;
        exportedFnName: string;
        exportKind: string;
        mcpServerName: string;
      };
      expect(handlerAValue.lastIndexed).toBe(NOW_ISO);
      expect(handlerAValue.projectRoot).toBe(projectRoot);
      expect(handlerAValue.exportedFnName).toBe("handlerA");
      expect(handlerAValue.exportKind).toBe("default");
      expect(handlerAValue.mcpServerName).toBe("test-plugin");

      // Payload assertion on helperA node (export function)
      const helperANode = testPluginNodes.find((n) => {
        const v = n.value as { exportedFnName: string };
        return v.exportedFnName === "helperA";
      });
      expect(helperANode).toBeDefined();
      const helperAValue = helperANode?.value as { exportKind: string };
      expect(helperAValue.exportKind).toBe("function");

      // Payload assertion on handlerB node (export const)
      const handlerBNode = testPluginNodes.find((n) => {
        const v = n.value as { exportedFnName: string };
        return v.exportedFnName === "handlerB";
      });
      expect(handlerBNode).toBeDefined();
      const handlerBValue = handlerBNode?.value as { exportKind: string };
      expect(handlerBValue.exportKind).toBe("const");

      // Edge assertions
      const describesEdges = result.edges.filter((e) => e.kind === "describes");
      const implementsEdges = result.edges.filter((e) => e.kind === "implements");

      expect(describesEdges.length).toBeGreaterThanOrEqual(1);
      expect(implementsEdges.length).toBeGreaterThanOrEqual(1);

      // Total non-zero
      expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no bridge/handlers files.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no bridge/handlers files", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result:
      | Awaited<ReturnType<typeof indexHandlerExports>>
      | undefined;
    let threw = false;

    try {
      result = await indexHandlerExports(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: excludeGlobs skips a handler file ─────────────────────────────
  //
  // Reuse the fixture pattern from test 1 — both handler-a.ts + handler-b.ts.
  // Call with excludeGlobs: ["**/handler-a.ts"].
  // Assert: no node for handler-a.ts; node(s) for handler-b.ts remain.

  test(
    "respects excludeGlobs to skip a handler file",
    async () => {
      const tmpDir = await makeTmpDir("exclude");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // handler-a.ts (should be excluded)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "bridge",
          "handlers",
          "handler-a.ts",
        ),
        [
          "export default async function handlerA(args: unknown): Promise<{}> {",
          "  return {};",
          "}",
        ].join("\n"),
      );

      // handler-b.ts (should remain)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "bridge",
          "handlers",
          "handler-b.ts",
        ),
        [
          "export const handlerB = async (args: unknown): Promise<{}> => ({});",
        ].join("\n"),
      );

      const result = await indexHandlerExports(projectRoot, {
        nowIso: NOW_ISO,
        excludeGlobs: ["**/handler-a.ts"],
      });

      const handlerNodes = result.nodes.filter((n) => n.kind === "McpHandler");

      // Filter to only test-plugin handlers (defensive: ignore any from real $HOME if test running on user machine)
      const testPluginHandlers = handlerNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });

      // Only handler-b.ts should remain (handler-a.ts excluded)
      const handlerANodes = testPluginHandlers.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("handler-a.ts");
      });
      const handlerBNodes = testPluginHandlers.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("handler-b.ts");
      });

      expect(handlerANodes.length).toBe(0);
      expect(handlerBNodes.length).toBeGreaterThanOrEqual(1);
    },
  );
});
