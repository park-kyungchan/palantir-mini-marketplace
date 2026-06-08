// palantir-mini — lib/capability-registry/index.ts
// Unified CapabilityRegistry: single aggregation point for all CapabilityContract sources.
//
// Sources aggregated:
//   skills          ← <plugin-root>/skills/*/SKILL.md (via skill-ontology-parser)
//   mcpTools        ← bridge/mcp-server.ts TOOLS array (file-scan + regex extraction)
//   agents          ← <plugin-root>/agents/*.md frontmatter (via agent-to-capability-contract)
//   projectActions  ← <project>/.palantir-mini/ontology-index/*.json action entries
//   validationPacks ← project-scope.json validationPacks[] (CapabilityContracts shaped from packs)
//   knownIssues     ← <project>/.palantir-mini/issues/known-issues.json (via project-ontology-index helper)
//   ontologyIndexEntries ← project ontology-index fragments (non-bootstrap entries)
//
// Cache: getCached/setCached (5-min TTL + directory mtime invalidation) in ./cache.ts.
//
// Rule cross-refs:
//   rule 12 v3.13.0 §Lead routing canonical (registry feeds pm_intent_router)
//   rule 26 §semantic memory layer (CapabilityRegistry = semantic substrate)

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { CapabilityContract } from "../capability/capability-contract";
import {
  CAPABILITY_CONTRACT_SCHEMA_VERSION,
  normalizeCapabilityContract,
} from "../capability/capability-contract";
import { loadProjectOntologyIndex } from "../capability/project-ontology-index";
import { loadKnownIssues } from "../issues/issue-store";
import { loadProjectScope } from "../project-scope/loader";
import { resolvePalantirMiniRoot } from "../config/root";
import { getCached, isExpired, isInvalidatedByMtime, setCached } from "./cache";
import { resolveCapabilitySources } from "./capability-source";
import type { CachedRegistry } from "./cache";
import {
  listMcpToolCapabilitiesForDeclaredTools,
  summarizeMcpToolCapabilityCoverage,
} from "./mcp-tool-capability";
import type {
  McpToolCapability,
  McpToolCapabilityCoverage,
} from "./mcp-tool-capability";

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface CapabilityRegistry {
  readonly skills: readonly CapabilityContract[];
  readonly mcpTools: readonly CapabilityContract[];
  readonly mcpToolCapabilities: readonly McpToolCapability[];
  readonly agents: readonly CapabilityContract[];
  readonly projectActions: readonly CapabilityContract[];
  readonly validationPacks: readonly CapabilityContract[];
  readonly knownIssues: readonly CapabilityContract[];
  readonly ontologyIndexEntries: readonly CapabilityContract[];
}

export interface CapabilityRegistryStats {
  readonly skills: number;
  readonly mcpTools: number;
  readonly mcpToolCapabilities: number;
  readonly mcpToolCapabilityCoverage: McpToolCapabilityCoverage;
  readonly agents: number;
  readonly projectActions: number;
  readonly validationPacks: number;
  readonly knownIssues: number;
  readonly ontologyIndexEntries: number;
  readonly totalContracts: number;
  readonly contentDigest: string;
  readonly loadedAt: string;
  readonly fromCache: boolean;
}

export interface CapabilityRegistryLoadResult {
  readonly registry: CapabilityRegistry;
  readonly stats: CapabilityRegistryStats;
}

// ─── Plugin root resolution ───────────────────────────────────────────────────

function resolvePluginRoot(): string {
  return resolvePalantirMiniRoot();
}

// ─── Project actions + validation packs + known issues via ProjectOntologyIndex ─

/**
 * Loads project-sourced capabilities from the ProjectOntologyIndex.
 * Partitions the index capabilities by sourceKind for the 4 remaining registry
 * categories: projectActions (project-scope), validationPacks (validation-pack),
 * knownIssues (known-issue), ontologyIndexEntries (ontology-index).
 *
 * NOTE: The index's `skill` sourceKind entries are intentionally excluded here
 * because the skills category is already populated from the live skills/ filesystem
 * scan above. Merging would duplicate entries and skew stats.
 */
function loadProjectIndexCapabilities(projectRoot: string): {
  projectActions: CapabilityContract[];
  validationPacks: CapabilityContract[];
  knownIssues: CapabilityContract[];
  ontologyIndexEntries: CapabilityContract[];
} {
  const empty = {
    projectActions: [] as CapabilityContract[],
    validationPacks: [] as CapabilityContract[],
    knownIssues: [] as CapabilityContract[],
    ontologyIndexEntries: [] as CapabilityContract[],
  };

  try {
    const index = loadProjectOntologyIndex(projectRoot);
    const projectActions: CapabilityContract[] = [];
    const validationPacks: CapabilityContract[] = [];
    const knownIssues: CapabilityContract[] = [];
    const ontologyIndexEntries: CapabilityContract[] = [];

    for (const cap of index.capabilities) {
      switch (cap.sourceKind) {
        case "project-scope":
          projectActions.push(cap);
          break;
        case "validation-pack":
          validationPacks.push(cap);
          break;
        case "known-issue":
          knownIssues.push(cap);
          break;
        case "ontology-index":
          ontologyIndexEntries.push(cap);
          break;
        // "skill" and "mcp-tool" and "agent" are handled separately — skip
        default:
          break;
      }
    }

    // Also synthesize ValidationPack CapabilityContracts from the index's validationPacks list
    // when they aren't already represented as "validation-pack" sourceKind capabilities.
    const existingPackIds = new Set(validationPacks.map((c) => c.capabilityId));
    for (const pack of index.validationPacks) {
      const capId = `validation-pack:${pack.validationPackId}`;
      if (!existingPackIds.has(capId)) {
        validationPacks.push(normalizeCapabilityContract({
          schemaVersion: CAPABILITY_CONTRACT_SCHEMA_VERSION,
          capabilityId: capId,
          sourceKind: "validation-pack",
          sourceRef: pack.sourceRef,
          displayName: pack.validationPackId,
          category: "validation-pack",
          userFacingPurpose: `Validation pack: ${pack.validationPackId}`,
          leadFacingPurpose: `Validation pack '${pack.validationPackId}' required=${pack.required}.`,
          inputOntology: {
            objectRefs: [],
            requiredArtifacts: [],
            artifactLifecycle: {
              prerequisites: [],
              optionalInputs: [],
              creates: [],
              mutates: [],
            },
            allowedRawInputs: [],
          },
          outputOntology: {
            objectRefs: [],
            artifactRefs: [],
            validationPacks: [pack.validationPackId],
          },
          actionBoundary: {
            mayMutateProjectFiles: false,
            mutationSurfaces: [],
            requiresDtcApproval: false,
          },
          nonGoals: ["Does not implement the validation logic; declares the pack identity only."],
          failureModes: ["Pack unavailable or unregistered."],
          intentMatchers: [],
          readSurfaces: [pack.sourceRef],
          writeSurfaces: [],
          knownIssueRefs: [],
          metadata: { required: pack.required },
        }));
      }
    }

    return { projectActions, validationPacks, knownIssues, ontologyIndexEntries };
  } catch {
    // Project may not have a palantir-mini directory — degrade silently to empty
    return empty;
  }
}

// ─── Content digest ───────────────────────────────────────────────────────────

/**
 * Compute a 16-hex sha256 content digest from registry shape signals.
 * Does NOT deep-hash every contract (too expensive); instead hashes the
 * category counts + watched directory mtimes (same signal used for cache
 * invalidation in cache.ts).
 */
function computeContentDigest(
  registry: Omit<CapabilityRegistry, never>,
  watchedMtimes: ReadonlyArray<{ path: string; mtime: number }>,
): string {
  const signal = JSON.stringify({
    skills: registry.skills.length,
    mcpTools: registry.mcpTools.length,
    mcpToolCapabilities: registry.mcpToolCapabilities.length,
    agents: registry.agents.length,
    projectActions: registry.projectActions.length,
    validationPacks: registry.validationPacks.length,
    knownIssues: registry.knownIssues.length,
    ontologyIndexEntries: registry.ontologyIndexEntries.length,
    mcpToolCapabilityCoverage: summarizeMcpToolCapabilityCoverage(
      registry.mcpTools.map(mcpToolNameFromContract),
    ),
    watchedMtimes,
  });
  return crypto.createHash("sha256").update(signal).digest("hex").slice(0, 16);
}

function mcpToolNameFromContract(tool: CapabilityContract): string {
  return tool.capabilityId.replace(/^(mcp-tool|mcp):/, "");
}

// ─── Watched paths (for cache invalidation) ───────────────────────────────────

function readWatchedPaths(): ReadonlyArray<{ path: string; mtime: number }> {
  const pluginRoot = resolvePluginRoot();
  const ctx = { pluginRoot };
  // Union of every active source's watched paths (Claude: skills/, agents/,
  // bridge/mcp-server.ts) plus the registry-internal MCP tool classifier, which
  // no source owns. De-duplicated to a stable mtime snapshot for cache invalidation.
  const sourcePaths = resolveCapabilitySources().flatMap((source) =>
    source.watchedPaths(ctx),
  );
  const registryInternal = [
    path.join(pluginRoot, "lib", "capability-registry", "mcp-tool-capability.ts"),
  ];
  const watched = [...new Set([...sourcePaths, ...registryInternal])];
  return watched.map((p) => {
    try {
      return { path: p, mtime: fs.statSync(p).mtimeMs };
    } catch {
      return { path: p, mtime: 0 };
    }
  });
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

export function getRegistryStats(
  registry: CapabilityRegistry,
): Omit<CapabilityRegistryStats, "contentDigest" | "loadedAt" | "fromCache"> {
  const total =
    registry.skills.length +
    registry.mcpTools.length +
    registry.agents.length +
    registry.projectActions.length +
    registry.validationPacks.length +
    registry.knownIssues.length +
    registry.ontologyIndexEntries.length;
  return {
    skills: registry.skills.length,
    mcpTools: registry.mcpTools.length,
    mcpToolCapabilities: registry.mcpToolCapabilities.length,
    mcpToolCapabilityCoverage: summarizeMcpToolCapabilityCoverage(
      registry.mcpTools.map(mcpToolNameFromContract),
    ),
    agents: registry.agents.length,
    projectActions: registry.projectActions.length,
    validationPacks: registry.validationPacks.length,
    knownIssues: registry.knownIssues.length,
    ontologyIndexEntries: registry.ontologyIndexEntries.length,
    totalContracts: total,
  };
}

// ─── Main loader ──────────────────────────────────────────────────────────────

/**
 * Load (or return a cached) unified CapabilityRegistry for the given project root.
 *
 * Cache: 5-min TTL + directory/file mtime invalidation (see cache.ts).
 * On cache hit: returns fromCache=true with the cached stats.
 * On cache miss: builds all 7 categories, stores in cache, returns fresh stats.
 *
 * @param projectRoot - Absolute path to the project root (where .palantir-mini/ lives).
 */
export function loadCapabilityRegistry(
  projectRoot: string,
): CapabilityRegistryLoadResult {
  // ── Check cache first ────────────────────────────────────────────────────
  const cached: CachedRegistry | undefined = getCached(projectRoot);
  if (
    cached !== undefined &&
    !isExpired(cached) &&
    !isInvalidatedByMtime(cached, projectRoot)
  ) {
    return {
      registry: cached.registry,
      stats: { ...cached.stats, fromCache: true },
    };
  }

  // ── Build fresh registry ─────────────────────────────────────────────────
  // Capability discovery is adapter-driven (W3e-2 Step 3): aggregate every
  // active CapabilitySource for the host runtime. Each source yields a flat
  // CapabilityContract[] tagged by sourceKind; the registry partitions into
  // skills / mcpTools / agents. Today the host resolves to a single Claude
  // source; Codex/Gemini sources join here without touching this loop (W4+).
  const pluginRoot = resolvePluginRoot();
  const sourceCtx = { pluginRoot };
  const discovered = resolveCapabilitySources().flatMap((source) =>
    source.discover(sourceCtx),
  );
  const skills = discovered.filter((c) => c.sourceKind === "skill");
  const mcpTools = discovered.filter((c) => c.sourceKind === "mcp-tool");
  const agents = discovered.filter((c) => c.sourceKind === "agent");
  const mcpToolCapabilities = listMcpToolCapabilitiesForDeclaredTools(
    mcpTools.map(mcpToolNameFromContract),
  );
  const { projectActions, validationPacks, knownIssues, ontologyIndexEntries } =
    loadProjectIndexCapabilities(projectRoot);

  const registry: CapabilityRegistry = {
    skills,
    mcpTools,
    mcpToolCapabilities,
    agents,
    projectActions,
    validationPacks,
    knownIssues,
    ontologyIndexEntries,
  };

  const watchedPaths = readWatchedPaths();
  const contentDigest = computeContentDigest(registry, watchedPaths);
  const loadedAt = new Date().toISOString();

  const baseStats = getRegistryStats(registry);
  const stats: CapabilityRegistryStats = {
    ...baseStats,
    contentDigest,
    loadedAt,
    fromCache: false,
  };

  // ── Populate cache ───────────────────────────────────────────────────────
  const newCached: CachedRegistry = {
    registry,
    stats,
    cachedAt: Date.now(),
    contentDigest,
    watchedPaths,
  };
  setCached(projectRoot, newCached);

  return { registry, stats };
}
