/**
 * tests/lib/ontology-graph/indexers/skills.test.ts
 * Tests for indexSkillFrontmatter (skills.ts — PR 2.7 sprint-084).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexSkillFrontmatter } from "../../../../lib/ontology-graph/indexers/skills";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `skill-frontmatter-test-${prefix}-${Date.now()}`);
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
//   projectRoot/.claude/plugins/test-plugin/skills/test-skill-a/SKILL.md
//     (with frontmatter: name=test-skill-a, description="First test skill",
//      allowed-tools="mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology")
//   projectRoot/.claude/plugins/test-plugin/skills/test-skill-b/SKILL.md
//     (with frontmatter: name=test-skill-b, description="Second test skill")
//
// Assert:
//   ≥2 Skill nodes
//   ≥1 edge of kind "describes"
//   ≥1 edge of kind "routesTo"

describe("indexSkillFrontmatter", () => {
  test(
    "walks a fixture tree with SKILL.md files and emits typed Skill nodes + at least one edge of each kind",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // test-skill-a with allowed-tools (triggers routesTo edge)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "skills",
          "test-skill-a",
          "SKILL.md",
        ),
        [
          "---",
          "name: test-skill-a",
          "description: First test skill",
          "category: testing",
          "allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology",
          "---",
          "",
          "# test-skill-a body",
          "",
          "Some body content.",
        ].join("\n"),
      );

      // test-skill-b without allowed-tools (only describes edge)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "skills",
          "test-skill-b",
          "SKILL.md",
        ),
        [
          "---",
          "name: test-skill-b",
          "description: Second test skill",
          "---",
          "",
          "# test-skill-b body",
        ].join("\n"),
      );

      const result = await indexSkillFrontmatter(projectRoot, { nowIso: NOW_ISO });

      // Node assertions: ≥2 Skill nodes
      const skillNodes = result.nodes.filter((n) => n.kind === "Skill");
      expect(skillNodes.length).toBeGreaterThanOrEqual(2);

      // Payload assertions on test-skill-a node
      const skillANode = skillNodes.find((n) => {
        const v = n.value as { skillName: string };
        return v.skillName === "test-skill-a";
      });
      expect(skillANode).toBeDefined();
      const skillAValue = skillANode?.value as {
        lastIndexed: string;
        projectRoot: string;
        skillName: string;
        skillDescription: string;
        skillCategory: string;
        allowedTools: string;
        scope: string;
      };
      expect(skillAValue.lastIndexed).toBe(NOW_ISO);
      expect(skillAValue.projectRoot).toBe(projectRoot);
      expect(skillAValue.skillName).toBe("test-skill-a");
      expect(skillAValue.skillDescription).toBe("First test skill");
      expect(skillAValue.skillCategory).toBe("testing");
      expect(skillAValue.allowedTools).toBe(
        "mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology",
      );
      expect(skillAValue.scope).toBe("plugin");

      // Payload assertion on test-skill-b node (no allowedTools)
      const skillBNode = skillNodes.find((n) => {
        const v = n.value as { skillName: string };
        return v.skillName === "test-skill-b";
      });
      expect(skillBNode).toBeDefined();
      const skillBValue = skillBNode?.value as {
        skillName: string;
        skillDescription: string;
        allowedTools: string | undefined;
      };
      expect(skillBValue.skillName).toBe("test-skill-b");
      expect(skillBValue.skillDescription).toBe("Second test skill");
      expect(skillBValue.allowedTools).toBeUndefined();

      // Edge assertions
      const describesEdges = result.edges.filter((e) => e.kind === "describes");
      const routesToEdges = result.edges.filter((e) => e.kind === "routesTo");

      expect(describesEdges.length).toBeGreaterThanOrEqual(1);
      expect(routesToEdges.length).toBeGreaterThanOrEqual(1);

      // Total non-zero
      expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no SKILL.md files.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no SKILL.md files", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result:
      | Awaited<ReturnType<typeof indexSkillFrontmatter>>
      | undefined;
    let threw = false;

    try {
      result = await indexSkillFrontmatter(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: excludeGlobs skips a skill directory ──────────────────────────
  //
  // Reuse the fixture pattern from test 1 — both test-skill-a + test-skill-b.
  // Call with excludeGlobs: ["**/test-skill-a/**"].
  // Assert: only 1 Skill node (test-skill-b); none for test-skill-a.

  test(
    "respects excludeGlobs to skip a skill directory",
    async () => {
      const tmpDir = await makeTmpDir("exclude");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // test-skill-a (should be excluded)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "skills",
          "test-skill-a",
          "SKILL.md",
        ),
        [
          "---",
          "name: test-skill-a",
          "description: First test skill",
          "---",
        ].join("\n"),
      );

      // test-skill-b (should remain)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "test-plugin",
          "skills",
          "test-skill-b",
          "SKILL.md",
        ),
        [
          "---",
          "name: test-skill-b",
          "description: Second test skill",
          "---",
        ].join("\n"),
      );

      const result = await indexSkillFrontmatter(projectRoot, {
        nowIso: NOW_ISO,
        excludeGlobs: ["**/test-skill-a/**"],
      });

      const skillNodes = result.nodes.filter((n) => n.kind === "Skill");

      // Filter to only test-plugin skills (defensive: ignore any from real $HOME if test running on user machine)
      const testPluginSkills = skillNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });

      // Only test-skill-b should remain (test-skill-a excluded)
      const skillANodes = testPluginSkills.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("test-skill-a");
      });
      const skillBNodes = testPluginSkills.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("test-skill-b");
      });

      expect(skillANodes.length).toBe(0);
      expect(skillBNodes.length).toBe(1);
    },
  );
});
