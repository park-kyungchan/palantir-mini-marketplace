// palantir-mini — tests/lib/capability-registry/loader.test.ts
// Tests for loadCapabilityRegistry in lib/capability-registry/index.ts
//
// Strategy:
//   - Use real plugin root (CLAUDE_PLUGIN_ROOT or default) — bun module cache
//     means CLAUDE_PLUGIN_ROOT env changes don't affect re-imported modules.
//   - Use a synthetic temp project for project-sourced categories (skills, agents
//     come from the real plugin root; project-actions/knownIssues from tmp).
//   - The real plugin root has many skills (≥1) and agents (≥1), so we assert
//     on lower bounds rather than exact counts.

import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { invalidate } from "../../../lib/capability-registry/cache";
import {
  loadCapabilityRegistry,
} from "../../../lib/capability-registry/index";
import { MCP_TOOL_CAPABILITIES } from "../../../lib/capability-registry/mcp-tool-capability";

const REAL_PLUGIN_ROOT =
  process.env["PALANTIR_MINI_ROOT"] ??
  process.env["PALANTIR_MINI_PLUGIN_ROOT"] ??
  process.env["PLUGIN_ROOT"] ??
  process.env["CLAUDE_PLUGIN_ROOT"] ??
  "/home/palantirkc/palantir-mini";

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let tmpProjectRoot: string;

beforeEach(() => {
  tmpProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-registry-loader-"));
  invalidate(tmpProjectRoot);
});

afterEach(() => {
  invalidate(tmpProjectRoot);
  try { fs.rmSync(tmpProjectRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("loadCapabilityRegistry", () => {
  test("registry has the 8 expected category keys", () => {
    const { registry } = loadCapabilityRegistry(tmpProjectRoot);

    const keys = Object.keys(registry).sort();
    expect(keys).toContain("skills");
    expect(keys).toContain("mcpTools");
    expect(keys).toContain("mcpToolCapabilities");
    expect(keys).toContain("agents");
    expect(keys).toContain("projectActions");
    expect(keys).toContain("validationPacks");
    expect(keys).toContain("knownIssues");
    expect(keys).toContain("ontologyIndexEntries");
    expect(keys.length).toBe(8);
  });

  test("real plugin root → registry has ≥1 skill, ≥1 agent, ≥1 mcpTool", () => {
    // Validate real plugin root has skills, agents, and mcp-server.ts
    const skillsDir = path.join(REAL_PLUGIN_ROOT, "skills");
    const agentsDir = path.join(REAL_PLUGIN_ROOT, "agents");
    const mcpServerPath = path.join(REAL_PLUGIN_ROOT, "bridge", "mcp-server.ts");

    const hasSkills = fs.existsSync(skillsDir);
    const hasAgents = fs.existsSync(agentsDir);
    const hasMcpServer = fs.existsSync(mcpServerPath);

    // Sanity-check: the real plugin root has all three sources
    expect(hasSkills).toBe(true);
    expect(hasAgents).toBe(true);
    expect(hasMcpServer).toBe(true);

    const { registry, stats } = loadCapabilityRegistry(tmpProjectRoot);

    // Skills: at least 1 from real plugin root
    expect(registry.skills.length).toBeGreaterThanOrEqual(1);
    // Agents: at least 1 from real plugin root
    expect(registry.agents.length).toBeGreaterThanOrEqual(1);
    // MCP tools: at least 1 from real bridge/mcp-server.ts
    expect(registry.mcpTools.length).toBeGreaterThanOrEqual(1);
    expect(registry.mcpToolCapabilities.length).toBe(registry.mcpTools.length);

    // Stats reflect real counts
    expect(stats.skills).toBe(registry.skills.length);
    expect(stats.agents).toBe(registry.agents.length);
    expect(stats.mcpTools).toBe(registry.mcpTools.length);
    expect(stats.mcpToolCapabilities).toBe(registry.mcpToolCapabilities.length);
    expect(stats.totalContracts).toBe(
      stats.skills + stats.mcpTools + stats.agents +
      stats.projectActions + stats.validationPacks +
      stats.knownIssues + stats.ontologyIndexEntries,
    );
    expect(stats.fromCache).toBe(false);

    // All skills should have sourceKind="skill"
    for (const s of registry.skills) {
      expect(s.sourceKind).toBe("skill");
    }
    // All agents should have sourceKind="agent"
    for (const a of registry.agents) {
      expect(a.sourceKind).toBe("agent");
    }
    // All mcpTools should have sourceKind="mcp-tool"
    for (const t of registry.mcpTools) {
      expect(t.sourceKind).toBe("mcp-tool");
    }
    for (const capability of registry.mcpToolCapabilities) {
      expect(capability.schemaVersion).toBe("palantir-mini/mcp-tool-capability/v1");
      expect(capability.rid).toBe(`mcp://palantir-mini/${capability.toolName}`);
    }
  });

  test("all declared MCP tools have capability metadata with fallback visibility", () => {
    const { registry, stats } = loadCapabilityRegistry(tmpProjectRoot);
    const coverage = stats.mcpToolCapabilityCoverage;

    expect(coverage.declaredToolCount).toBe(registry.mcpTools.length);
    expect(coverage.capabilityCount).toBe(MCP_TOOL_CAPABILITIES.length);
    expect(coverage.missingToolNames).toEqual([]);
    expect(coverage.extraCapabilityToolNames).toEqual([]);
    expect(coverage.coveredToolNames.length).toBe(registry.mcpTools.length);
    expect(coverage.fallbackClassifiedToolNames).toContain("get_ontology");
    expect(coverage.fallbackClassifiedToolNames).toContain("research_library_refresh");
  });

  test("empty project (no palantir-mini dir) → projectActions/knownIssues = 0, skills/agents from real plugin root ≥1", () => {
    // tmpProjectRoot has no .palantir-mini/ — project-indexed categories should be 0
    const { registry, stats } = loadCapabilityRegistry(tmpProjectRoot);

    expect(stats.projectActions).toBe(0);
    expect(stats.knownIssues).toBe(0);
    expect(stats.ontologyIndexEntries).toBe(0);

    // Plugin-root categories still populated from real plugin root
    expect(stats.skills).toBeGreaterThanOrEqual(1);
    expect(stats.agents).toBeGreaterThanOrEqual(1);
    expect(stats.mcpTools).toBeGreaterThanOrEqual(1);
    expect(stats.fromCache).toBe(false);
  });

  test("cache hit on second call within TTL → fromCache=true + contentDigest stable", () => {
    // First call — cold
    const first = loadCapabilityRegistry(tmpProjectRoot);
    expect(first.stats.fromCache).toBe(false);
    expect(first.stats.contentDigest.length).toBeGreaterThan(0);

    // Second call — should hit cache (TTL is 5 min, well within test runtime)
    const second = loadCapabilityRegistry(tmpProjectRoot);
    expect(second.stats.fromCache).toBe(true);

    // Registry contents should be identical
    expect(second.stats.skills).toBe(first.stats.skills);
    expect(second.stats.mcpTools).toBe(first.stats.mcpTools);
    expect(second.stats.mcpToolCapabilities).toBe(first.stats.mcpToolCapabilities);
    expect(second.stats.contentDigest).toBe(first.stats.contentDigest);
    expect(second.stats.totalContracts).toBe(first.stats.totalContracts);
  });
});
