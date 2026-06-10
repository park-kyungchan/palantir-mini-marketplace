/**
 * tests/lib/ontology-graph/indexers/self-instance-edges.test.ts
 * Tests for indexSelfInstanceEdges (self-instance-edges.ts — PR-I S2).
 *
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking, NEVER
 * the live substrate. The plugin wiring sources (agents/ hooks/ .mcp.json
 * managed-settings.d/ runtime-overlay/rules/ bridge/) are written into a tmpdir
 * passed as opts.pluginRoot, so the indexer reads the fixture, not the live plugin.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { indexSelfInstanceEdges } from "../../../../lib/ontology-graph/indexers/self-instance-edges";
import {
  createOntologyGraphStore,
  type OntologyGraphStore,
} from "../../../../lib/ontology-graph/store";
import type { NodeRecord, EdgeRecord } from "../../../../lib/ontology-graph/types";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `self-instance-edges-test-${prefix}-${Date.now()}`);
  await fs.promises.mkdir(base, { recursive: true });
  return base;
}

async function writeFile(absPath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, content, "utf-8");
}

async function rmDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

const NOW_ISO = "2026-05-13T00:00:00Z";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((d) => rmDir(d)));
});

// ─── File-hash rid recomputation (mirror agents-rules.ts / plugin-manifest.ts) ─
//
// These MUST match the home-module algorithms exactly. The indexer imports the
// real (exported) helpers; the test replicates them independently so a drift in
// either side is caught.

function agentFileHashRid(absPath: string): string {
  return `agents-rules:${createHash("sha256").update(absPath).digest("hex")}`;
}

function hookFileHashRid(absPath: string, discriminator: string): string {
  return `plugin-manifest:${createHash("sha256").update(`${absPath}#${discriminator}`).digest("hex")}`;
}

// ─── Fixture authoring ────────────────────────────────────────────────────────

/**
 * Author a minimal plugin-root fixture exercising every edge kind:
 *   - agents/implementer.md (frontmatter name + body skills/verify ref → usesTool)
 *   - runtime-overlay/rules/10-events-jsonl.md (hookCitations → Hook gates Rule)
 *   - hooks/hooks.json (a command step → Hook ALIAS edge)
 *   - managed-settings.d/50-pm.json (allow mcp__pm__emit_event → fragment gates tool)
 *   - bridge/mcp-server.ts (HANDLER_MODULES binds emit_event → emit-event → imports)
 */
async function seedFixture(pluginRoot: string): Promise<void> {
  // Agent with a skill reference in its body.
  await writeFile(
    path.join(pluginRoot, "agents", "implementer.md"),
    [
      "---",
      "name: implementer",
      "description: Focused execution specialist.",
      "---",
      "",
      "# Implementer",
      "",
      "When the Lead assigns work, use skills/verify before reporting.",
    ].join("\n"),
  );

  // Rule frontmatter citing a hook → Hook gates Rule.
  await writeFile(
    path.join(pluginRoot, "runtime-overlay", "rules", "10-events-jsonl.md"),
    [
      "---",
      "ruleId: 10",
      "slug: events-jsonl",
      "scope: global",
      "version: 2.2.1",
      "hookCitations: [events-5d-gate, session-start]",
      "---",
      "",
      "# Rule 10 — events.jsonl",
    ].join("\n"),
  );

  // hooks.json with one PreToolUse command step (drives the Hook ALIAS edge).
  await writeFile(
    path.join(pluginRoot, "hooks", "hooks.json"),
    JSON.stringify({
      description: "fixture hook registry",
      hooks: {
        PreToolUse: [
          {
            matcher: "*",
            policyRef: "hook-step:pretool-edit-governance",
            hooks: [{ type: "command", command: "bun run ./hooks/edit-governance.ts" }],
          },
        ],
      },
    }),
  );

  // .mcp.json server surface.
  await writeFile(
    path.join(pluginRoot, ".mcp.json"),
    JSON.stringify({
      mcpServers: { "palantir-mini": { command: "bun", args: ["run", "./bridge/mcp-server.ts"] } },
    }),
  );

  // managed-settings.d fragment granting one MCP tool.
  await writeFile(
    path.join(pluginRoot, "managed-settings.d", "50-pm.json"),
    JSON.stringify({
      permissions: { allow: ["Read(./**)", "mcp__palantir-mini__emit_event"] },
    }),
  );

  // bridge/mcp-server.ts with a HANDLER_MODULES map binding emit_event → emit-event.
  await writeFile(
    path.join(pluginRoot, "bridge", "mcp-server.ts"),
    [
      "const HANDLER_MODULES: Record<string, string> = {",
      '  emit_event:                          "./handlers/emit-event",',
      '  get_ontology:                        "./handlers/get-ontology",',
      "};",
    ].join("\n"),
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("indexSelfInstanceEdges", () => {
  test(
    "projects pm's wiring onto the canonical namespace with Agent→Skill, Hook→Rule, and ALIAS edges",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);
      const pluginRoot = path.join(tmpDir, "pluginRoot");
      const projectRoot = path.join(tmpDir, "projectRoot");
      await seedFixture(pluginRoot);

      const result = await indexSelfInstanceEdges(projectRoot, { nowIso: NOW_ISO, pluginRoot });

      // ── Agent→Skill edge: both endpoints canonical pm.self.ontology/ ──────────
      const usesToolEdges = result.edges.filter((e) => e.kind === "usesTool");
      expect(usesToolEdges.length).toBeGreaterThanOrEqual(1);
      const agentSkillEdge = usesToolEdges[0]!;
      expect(String(agentSkillEdge.fromRid)).toBe("pm.self.ontology/object-type/agent/implementer");
      expect(String(agentSkillEdge.toRid)).toBe("pm.self.ontology/object-type/skill/verify");
      // Both endpoint nodes present in the fragment.
      const nodeRids = new Set(result.nodes.map((n) => n.rid as string));
      expect(nodeRids.has(agentSkillEdge.fromRid as string)).toBe(true);
      expect(nodeRids.has(agentSkillEdge.toRid as string)).toBe(true);

      // ── Hook→Rule edge: cited hook gates the rule ─────────────────────────────
      const gatesEdges = result.edges.filter((e) => e.kind === "gates");
      const hookRuleEdge = gatesEdges.find(
        (e) => (e.toRid as string) === "pm.self.ontology/object-type/rule/events-jsonl",
      );
      expect(hookRuleEdge).toBeDefined();
      expect(String(hookRuleEdge!.fromRid)).toBe("pm.self.ontology/object-type/hook/events-5d-gate");

      // ── ALIAS edge (agent): file-hash fromRid === recomputed; toRid canonical ─
      const agentAbsPath = path.join(pluginRoot, "agents", "implementer.md");
      const expectedAgentFileHash = agentFileHashRid(agentAbsPath);
      const describesEdges = result.edges.filter((e) => e.kind === "describes");
      const agentAlias = describesEdges.find(
        (e) => (e.fromRid as string) === expectedAgentFileHash,
      );
      expect(agentAlias).toBeDefined();
      expect(String(agentAlias!.toRid)).toBe("pm.self.ontology/object-type/agent/implementer");
      expect((agentAlias!.value as { confidence: number }).confidence).toBe(0.6);

      // ── ALIAS edge (hook): file-hash fromRid === recomputed; toRid canonical ──
      // Reconstruct the discriminator exactly as the indexer builds it.
      const hooksJsonPath = path.join(pluginRoot, "hooks", "hooks.json");
      const cmd = "bun run ./hooks/edit-governance.ts";
      const exactDiscriminator = `Hook:PreToolUse:*:${cmd.slice(0, 80)}`;
      const expectedHookFileHash = hookFileHashRid(hooksJsonPath, exactDiscriminator);
      const hookAlias = describesEdges.find(
        (e) => (e.fromRid as string) === expectedHookFileHash,
      );
      expect(hookAlias).toBeDefined();
      expect(String(hookAlias!.toRid)).toBe(
        "pm.self.ontology/object-type/hook/pretool-edit-governance",
      );

      // ── McpTool→McpHandler (imports) + ManagedSettingsFragment→McpTool (gates) ─
      const importsEdges = result.edges.filter((e) => e.kind === "imports");
      const toolHandlerEdge = importsEdges.find(
        (e) => (e.fromRid as string) === "pm.self.ontology/object-type/mcp-tool/emit_event",
      );
      expect(toolHandlerEdge).toBeDefined();
      expect(String(toolHandlerEdge!.toRid)).toBe(
        "pm.self.ontology/object-type/mcp-handler/emit-event",
      );

      const fragmentGatesTool = gatesEdges.find(
        (e) =>
          (e.fromRid as string) ===
            "pm.self.ontology/object-type/managed-settings-fragment/50-pm" &&
          (e.toRid as string) === "pm.self.ontology/object-type/mcp-tool/emit_event",
      );
      expect(fragmentGatesTool).toBeDefined();

      // Node payloads carry the deterministic lastIndexed timestamp.
      const agentNode = result.nodes.find(
        (n) => (n.rid as string) === "pm.self.ontology/object-type/agent/implementer",
      );
      expect(agentNode).toBeDefined();
      expect((agentNode!.value as { lastIndexed: string }).lastIndexed).toBe(NOW_ISO);
    },
  );

  test(
    "ALIAS describes edges SURVIVE the orchestrator's two-pass drain into the combined store",
    async () => {
      // Regression guard for the bridge blocker: the file-hash → canonical ALIAS
      // edges must keep BOTH endpoints in the combined node set so build-graph's
      // pass-2 (drop dangling) does NOT delete them. The sibling indexers walk a
      // path basis that does not exist in this repo, so self-instance-edges must
      // mint the ALIAS-source file-hash node itself. This test replicates the
      // orchestrator's EXACT pass-1 (all nodes) / pass-2 (edges, drop missing
      // endpoint) drain on the fragment alone — the strictest survival check.
      const tmpDir = await makeTmpDir("survival");
      tmpDirs.push(tmpDir);
      const pluginRoot = path.join(tmpDir, "pluginRoot");
      const projectRoot = path.join(tmpDir, "projectRoot");
      await seedFixture(pluginRoot);

      const fragment = await indexSelfInstanceEdges(projectRoot, {
        nowIso: NOW_ISO,
        pluginRoot,
      });

      // Mirror build-graph.ts: pass 1 drains ALL nodes, pass 2 drains edges and
      // silently drops any whose endpoint is missing from the combined node set.
      const store: OntologyGraphStore = createOntologyGraphStore();
      for (const node of fragment.nodes) store.addNode(node as NodeRecord<unknown>);
      let dropped = 0;
      for (const edge of fragment.edges) {
        if (
          store.getNode(edge.fromRid) === undefined ||
          store.getNode(edge.toRid) === undefined
        ) {
          dropped += 1;
          continue;
        }
        store.addEdge(edge as EdgeRecord<unknown>);
      }

      // No edge of ANY kind is dropped — every endpoint is self-emitted.
      expect(dropped).toBe(0);

      // The agent + hook ALIAS describes edges are present in the DRAINED store.
      const agentAbsPath = path.join(pluginRoot, "agents", "implementer.md");
      const expectedAgentFileHash = agentFileHashRid(agentAbsPath);
      const survivingAgentAlias = store
        .getEdgesTo("pm.self.ontology/object-type/agent/implementer" as NodeRecord<unknown>["rid"])
        .find((e) => e.kind === "describes" && (e.fromRid as string) === expectedAgentFileHash);
      expect(survivingAgentAlias).toBeDefined();
      // Its FROM endpoint (the file-hash anchor) is a real node in the store.
      expect(store.getNode(survivingAgentAlias!.fromRid)).toBeDefined();

      const hooksJsonPath = path.join(pluginRoot, "hooks", "hooks.json");
      const cmd = "bun run ./hooks/edit-governance.ts";
      const expectedHookFileHash = hookFileHashRid(
        hooksJsonPath,
        `Hook:PreToolUse:*:${cmd.slice(0, 80)}`,
      );
      const survivingHookAlias = store
        .getEdgesTo(
          "pm.self.ontology/object-type/hook/pretool-edit-governance" as NodeRecord<unknown>["rid"],
        )
        .find((e) => e.kind === "describes" && (e.fromRid as string) === expectedHookFileHash);
      expect(survivingHookAlias).toBeDefined();
      expect(store.getNode(survivingHookAlias!.fromRid)).toBeDefined();
    },
  );

  test("empty plugin tree → { nodes: [], edges: [] } with no throw", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);
    const emptyPluginRoot = path.join(tmpDir, "emptyPlugin");
    await fs.promises.mkdir(emptyPluginRoot, { recursive: true });

    let result: Awaited<ReturnType<typeof indexSelfInstanceEdges>> | undefined;
    let threw = false;
    try {
      result = await indexSelfInstanceEdges(path.join(tmpDir, "projectRoot"), {
        nowIso: NOW_ISO,
        pluginRoot: emptyPluginRoot,
      });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });
});
