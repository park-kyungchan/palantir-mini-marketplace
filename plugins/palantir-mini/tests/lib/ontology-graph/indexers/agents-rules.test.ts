/**
 * tests/lib/ontology-graph/indexers/agents-rules.test.ts
 * Tests for indexAgentsAndRules (agents-rules.ts — PR 2.5 sprint-082).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexAgentsAndRules } from "../../../../lib/ontology-graph/indexers/agents-rules";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `agents-rules-test-${prefix}-${Date.now()}`);
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
//   projectRoot/AGENTS.md                                          (universal AgentDefinition)
//   projectRoot/BROWSE.md                                          (co-located → triggers "describes" edge)
//   projectRoot/.claude/rules/12-lead-protocol.md                  (Rule; contains "gates" phrase → "gates" edge)
//   projectRoot/.claude/plugins/palantir-mini/agents/lead-orchestrator.md  (AgentDefinition; Lead target)
//   projectRoot/.claude/plugins/palantir-mini/agents/implementer.md        (AgentDefinition; contains "requires approval from Lead")
//
// Assert:
//   ≥3 AgentDefinition nodes (AGENTS.md + lead + implementer)
//   ≥1 Rule node (12-lead-protocol.md)
//   ≥1 edge of kind "describes"
//   ≥1 edge of kind "gates"
//   ≥1 edge of kind "requiresApprovalFrom"

describe("indexAgentsAndRules", () => {
  test(
    "walks a fixture tree with AGENTS.md + rule files + agent files and emits typed nodes + at least one edge of each kind",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // Universal AGENTS.md at project root (co-located with BROWSE.md → "describes" edge)
      await writeFile(
        path.join(projectRoot, "AGENTS.md"),
        [
          "# AGENTS.md — universal agent file",
          "",
          "This file describes the agent surface for this project.",
        ].join("\n"),
      );

      // BROWSE.md co-located with AGENTS.md in projectRoot → triggers "describes" edge
      await writeFile(
        path.join(projectRoot, "BROWSE.md"),
        "# BROWSE.md — project router",
      );

      // Rule .md containing "gates" governance phrase → triggers "gates" edge
      await writeFile(
        path.join(projectRoot, ".claude", "rules", "12-lead-protocol.md"),
        [
          "---",
          "ruleId: 12",
          "slug: lead-protocol",
          "scope: global",
          "version: 3.18.0",
          "---",
          "",
          "# Rule 12 — Lead Protocol",
          "",
          "This rule gates Edit operations and blocks unauthorized writes.",
          "PreToolUse hook enforces the harness contract.",
          "PostToolUse hook emits lineage events.",
        ].join("\n"),
      );

      // Lead orchestrator agent (target of "requiresApprovalFrom" edges)
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "palantir-mini",
          "agents",
          "lead-orchestrator.md",
        ),
        [
          "---",
          "name: lead-orchestrator",
          "description: Lead orchestrator for the palantir-mini swarm.",
          "model: claude-opus-4-7",
          "---",
          "",
          "# Lead Orchestrator",
          "",
          "Orchestrates all sprint work.",
        ].join("\n"),
      );

      // Implementer agent with "requires approval from Lead" phrase → triggers "requiresApprovalFrom" edge
      await writeFile(
        path.join(
          projectRoot,
          ".claude",
          "plugins",
          "palantir-mini",
          "agents",
          "implementer.md",
        ),
        [
          "---",
          "name: implementer",
          "description: requires approval from Lead before shipping.",
          "model: claude-sonnet-4-6",
          "---",
          "",
          "# Implementer",
          "",
          "Implements tasks under Lead authority.",
        ].join("\n"),
      );

      const result = await indexAgentsAndRules(projectRoot, { nowIso: NOW_ISO });

      // Node assertions
      const agentNodes = result.nodes.filter((n) => n.kind === "AgentDefinition");
      const ruleNodes = result.nodes.filter((n) => n.kind === "Rule");

      // ≥3 AgentDefinition nodes: AGENTS.md + lead-orchestrator + implementer
      expect(agentNodes.length).toBeGreaterThanOrEqual(3);
      // ≥1 Rule node: 12-lead-protocol.md
      expect(ruleNodes.length).toBeGreaterThanOrEqual(1);

      // Payload assertions on universal AGENTS.md node
      const agentsMdNode = agentNodes.find((n) => {
        const v = n.value as { filePath: string };
        return v.filePath === path.join(projectRoot, "AGENTS.md");
      });
      expect(agentsMdNode).toBeDefined();
      const agentsMdValue = agentsMdNode?.value as {
        lastIndexed: string;
        projectRoot: string;
        scope: string;
      };
      expect(agentsMdValue.lastIndexed).toBe(NOW_ISO);
      expect(agentsMdValue.projectRoot).toBe(projectRoot);
      expect(agentsMdValue.scope).toBe("universal");

      // Payload assertion on rule node (ruleNumber extracted)
      const ruleNode = ruleNodes.find((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes("12-lead-protocol.md");
      });
      expect(ruleNode).toBeDefined();
      const ruleValue = ruleNode?.value as { ruleNumber: number | undefined };
      expect(ruleValue.ruleNumber).toBe(12);

      // Edge assertions
      const describesEdges = result.edges.filter((e) => e.kind === "describes");
      const gatesEdges = result.edges.filter((e) => e.kind === "gates");
      const approvalEdges = result.edges.filter((e) => e.kind === "requiresApprovalFrom");

      expect(describesEdges.length).toBeGreaterThanOrEqual(1);
      expect(gatesEdges.length).toBeGreaterThanOrEqual(1);
      expect(approvalEdges.length).toBeGreaterThanOrEqual(1);

      // Phantom repoint: the Lead approval target is the canonical Claude
      // runtime-adapter self-ontology node, not a phantom lead-orchestrator.md path.
      const LEAD_ADAPTER_RID = "pm.self.ontology/object-type/runtime-adapter/claude";
      for (const e of approvalEdges) {
        expect(String(e.toRid)).toBe(LEAD_ADAPTER_RID);
      }
      // A node carrying that RID must be emitted into the graph fragment.
      const leadAdapterNode = result.nodes.find((n) => String(n.rid) === LEAD_ADAPTER_RID);
      expect(leadAdapterNode).toBeDefined();

      // Total non-zero
      expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no AGENTS.md, no rules, no agent files.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no AGENTS.md or rule files or agent files", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result: Awaited<ReturnType<typeof indexAgentsAndRules>> | undefined;
    let threw = false;

    try {
      result = await indexAgentsAndRules(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: excludeGlobs skips the plugin agents directory ───────────────
  //
  // Reuse the fixture from test 1.
  // Call with excludeGlobs: ["**/plugins/**"].
  // Assert: nodes from .claude/plugins/palantir-mini/agents/*.md are absent.
  // AGENTS.md (root) + rule file remain.

  test("respects excludeGlobs to skip the plugin agents directory", async () => {
    const tmpDir = await makeTmpDir("exclude");
    tmpDirs.push(tmpDir);

    const projectRoot = path.join(tmpDir, "projectRoot");

    // Recreate the same fixture as test 1
    await writeFile(
      path.join(projectRoot, "AGENTS.md"),
      "# AGENTS.md — universal agent file",
    );
    await writeFile(
      path.join(projectRoot, "BROWSE.md"),
      "# BROWSE.md",
    );
    await writeFile(
      path.join(projectRoot, ".claude", "rules", "12-lead-protocol.md"),
      [
        "# Rule 12",
        "This rule gates Edit operations.",
      ].join("\n"),
    );
    await writeFile(
      path.join(
        projectRoot,
        ".claude",
        "plugins",
        "palantir-mini",
        "agents",
        "lead-orchestrator.md",
      ),
      [
        "---",
        "name: lead-orchestrator",
        "description: Lead orchestrator.",
        "---",
      ].join("\n"),
    );
    await writeFile(
      path.join(
        projectRoot,
        ".claude",
        "plugins",
        "palantir-mini",
        "agents",
        "implementer.md",
      ),
      [
        "---",
        "name: implementer",
        "description: requires approval from Lead.",
        "---",
      ].join("\n"),
    );

    // Exclude all paths under plugins/
    const result = await indexAgentsAndRules(projectRoot, {
      nowIso: NOW_ISO,
      excludeGlobs: ["**/plugins/**"],
    });

    // All node file paths
    const nodeFilePaths = result.nodes.map((n) => {
      const v = n.value as { filePath: string };
      return v.filePath;
    });

    // Plugin agent files must NOT be in results
    const leadPath = path.join(
      projectRoot,
      ".claude",
      "plugins",
      "palantir-mini",
      "agents",
      "lead-orchestrator.md",
    );
    const implementerPath = path.join(
      projectRoot,
      ".claude",
      "plugins",
      "palantir-mini",
      "agents",
      "implementer.md",
    );
    expect(nodeFilePaths).not.toContain(leadPath);
    expect(nodeFilePaths).not.toContain(implementerPath);

    // Root AGENTS.md should still be present
    const rootAgentsPath = path.join(projectRoot, "AGENTS.md");
    expect(nodeFilePaths).toContain(rootAgentsPath);

    // Rule file should still be present
    const rulePath = path.join(projectRoot, ".claude", "rules", "12-lead-protocol.md");
    expect(nodeFilePaths).toContain(rulePath);
  });
});
