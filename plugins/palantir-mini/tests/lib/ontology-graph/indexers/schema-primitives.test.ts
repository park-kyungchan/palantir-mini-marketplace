/**
 * tests/lib/ontology-graph/indexers/schema-primitives.test.ts
 * Tests for indexSchemaPrimitives (schema-primitives.ts — PR 2.9 sprint-086).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexSchemaPrimitives } from "../../../../lib/ontology-graph/indexers/schema-primitives";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `schema-primitives-test-${prefix}-${Date.now()}`);
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
// Create 3 .ts fixtures under {tmpDir}/projectRoot/.claude/schemas/ontology/primitives/:
//   agent-definition.ts (has Rid + Declaration + D/L/A=OPS)
//   action-type.ts      (has Rid + D/L/A=ACTION, NO Declaration)
//   helper-no-rid.ts    (no Rid type — should be skipped)
//
// Assert:
//   ≥2 SchemaPrimitive nodes (3 - helper-no-rid skipped = 2)
//   payload.ridBrandName matches "AgentDefinition" / "ActionType"
//   payload.declarationName === "AgentDefinitionDeclaration" for agent-definition,
//                             undefined for action-type
//   payload.dlaDomain === "OPS" and "ACTION" respectively
//   ≥1 edge of kind "describes"
//   ≥1 edge of kind "refines"

describe("indexSchemaPrimitives", () => {
  test(
    "walks a fixture tree with schemas/ontology/primitives/*.ts files and emits typed SchemaPrimitive nodes + at least one edge of each kind",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");
      const primitivesDir = path.join(
        projectRoot,
        ".claude",
        "schemas",
        "ontology",
        "primitives",
      );

      // agent-definition.ts: full set (Rid + Declaration + D/L/A=OPS)
      await writeFile(
        path.join(primitivesDir, "agent-definition.ts"),
        [
          "/**",
          " * @stable — AgentDefinition primitive",
          " * D/L/A domain: OPS (substrate health input)",
          " */",
          "",
          "export type AgentDefinitionRid = string & { readonly __brand: \"AgentDefinitionRid\" };",
          "",
          "export interface AgentDefinitionDeclaration {",
          "  readonly agentId: AgentDefinitionRid;",
          "  readonly slug: string;",
          "}",
        ].join("\n"),
      );

      // action-type.ts: Rid + D/L/A=ACTION but NO Declaration interface
      await writeFile(
        path.join(primitivesDir, "action-type.ts"),
        [
          "/**",
          " * @stable — ActionType primitive",
          " * D/L/A domain: ACTION",
          " */",
          "",
          "export type ActionTypeRid = string & { readonly __brand: \"ActionTypeRid\" };",
          "",
          "// Note: no Declaration interface here — only Tier1/Tier2 variant interfaces below",
          "export interface Tier1Action {",
          "  readonly rid: ActionTypeRid;",
          "  readonly tier: \"tier-1\";",
          "}",
        ].join("\n"),
      );

      // helper-no-rid.ts: no Rid type — should be skipped
      await writeFile(
        path.join(primitivesDir, "helper-no-rid.ts"),
        [
          "// Pure helper — no Rid type alias",
          "export function helperFn(s: string): string {",
          "  return s.toUpperCase();",
          "}",
        ].join("\n"),
      );

      const result = await indexSchemaPrimitives(projectRoot, { nowIso: NOW_ISO });

      // Node assertions: ≥2 SchemaPrimitive nodes (agent-definition + action-type;
      // helper-no-rid skipped because no Rid type alias)
      const primitiveNodes = result.nodes.filter((n) => n.kind === "SchemaPrimitive");

      // Filter to test-fixture only (defensive: ignore real $HOME primitives)
      const testFixtureNodes = primitiveNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });
      expect(testFixtureNodes.length).toBe(2);

      // Payload assertions on agent-definition node
      const agentDefNode = testFixtureNodes.find((n) => {
        const v = n.value as { ridBrandName: string };
        return v.ridBrandName === "AgentDefinition";
      });
      expect(agentDefNode).toBeDefined();
      const agentDefValue = agentDefNode?.value as {
        lastIndexed: string;
        projectRoot: string;
        ridBrandName: string;
        declarationName?: string;
        dlaDomain?: string;
      };
      expect(agentDefValue.lastIndexed).toBe(NOW_ISO);
      expect(agentDefValue.projectRoot).toBe(projectRoot);
      expect(agentDefValue.ridBrandName).toBe("AgentDefinition");
      expect(agentDefValue.declarationName).toBe("AgentDefinitionDeclaration");
      expect(agentDefValue.dlaDomain).toBe("OPS");

      // Payload assertions on action-type node (no Declaration interface)
      const actionTypeNode = testFixtureNodes.find((n) => {
        const v = n.value as { ridBrandName: string };
        return v.ridBrandName === "ActionType";
      });
      expect(actionTypeNode).toBeDefined();
      const actionTypeValue = actionTypeNode?.value as {
        ridBrandName: string;
        declarationName?: string;
        dlaDomain?: string;
      };
      expect(actionTypeValue.ridBrandName).toBe("ActionType");
      // declarationName should be undefined since only Tier1Action / Tier2Action exist
      // (no exact "ActionTypeDeclaration" interface)
      expect(actionTypeValue.declarationName).toBeUndefined();
      expect(actionTypeValue.dlaDomain).toBe("ACTION");

      // helper-no-rid should NOT have a node
      const helperNode = testFixtureNodes.find((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("helper-no-rid.ts");
      });
      expect(helperNode).toBeUndefined();

      // Edge assertions
      const describesEdges = result.edges.filter((e) => e.kind === "describes");
      const refinesEdges = result.edges.filter((e) => e.kind === "refines");

      expect(describesEdges.length).toBeGreaterThanOrEqual(1);
      expect(refinesEdges.length).toBeGreaterThanOrEqual(1);

      // Total non-zero
      expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no schemas/ontology/primitives files.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no schemas/ontology/primitives files", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result:
      | Awaited<ReturnType<typeof indexSchemaPrimitives>>
      | undefined;
    let threw = false;

    try {
      result = await indexSchemaPrimitives(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: excludeGlobs skips a primitive file ───────────────────────────
  //
  // Reuse the fixture pattern from test 1 — both agent-definition.ts + action-type.ts.
  // Call with excludeGlobs: ["**/agent-definition.ts"].
  // Assert: no node for agent-definition.ts; node for action-type.ts remains.

  test(
    "respects excludeGlobs to skip a primitive file",
    async () => {
      const tmpDir = await makeTmpDir("exclude");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");
      const primitivesDir = path.join(
        projectRoot,
        ".claude",
        "schemas",
        "ontology",
        "primitives",
      );

      // agent-definition.ts (should be excluded)
      await writeFile(
        path.join(primitivesDir, "agent-definition.ts"),
        [
          "/** D/L/A domain: OPS */",
          "export type AgentDefinitionRid = string & { readonly __brand: \"AgentDefinitionRid\" };",
        ].join("\n"),
      );

      // action-type.ts (should remain)
      await writeFile(
        path.join(primitivesDir, "action-type.ts"),
        [
          "/** D/L/A domain: ACTION */",
          "export type ActionTypeRid = string & { readonly __brand: \"ActionTypeRid\" };",
        ].join("\n"),
      );

      const result = await indexSchemaPrimitives(projectRoot, {
        nowIso: NOW_ISO,
        excludeGlobs: ["**/agent-definition.ts"],
      });

      const primitiveNodes = result.nodes.filter((n) => n.kind === "SchemaPrimitive");

      // Filter to test-fixture only
      const testFixtureNodes = primitiveNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });

      // Only action-type.ts should remain (agent-definition.ts excluded)
      const agentDefNodes = testFixtureNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("agent-definition.ts");
      });
      const actionTypeNodes = testFixtureNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("action-type.ts");
      });

      expect(agentDefNodes.length).toBe(0);
      expect(actionTypeNodes.length).toBeGreaterThanOrEqual(1);
    },
  );
});
