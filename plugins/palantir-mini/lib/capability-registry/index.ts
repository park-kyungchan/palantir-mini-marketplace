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
import { agentDefinitionToCapabilityContract } from "../capability/agent-to-capability-contract";
import type { CapabilityContract } from "../capability/capability-contract";
import {
  CAPABILITY_CONTRACT_SCHEMA_VERSION,
  mcpToolSpecToCapabilityContract,
  normalizeCapabilityContract,
  skillContractToCapabilityContract,
} from "../capability/capability-contract";
import { loadProjectOntologyIndex } from "../capability/project-ontology-index";
import { loadKnownIssues } from "../issues/issue-store";
import { loadProjectScope } from "../project-scope/loader";
import { parseSkillOntologyContract } from "../skills/skill-ontology-parser";
import { resolvePalantirMiniRoot } from "../config/root";
import type { AgentDefinitionDeclaration } from "#schemas/ontology/primitives/agent-definition";
import { getCached, isExpired, isInvalidatedByMtime, setCached } from "./cache";
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

// ─── Skills loader (scans <plugin-root>/skills/*/SKILL.md) ───────────────────

function loadSkillContracts(): CapabilityContract[] {
  const pluginRoot = resolvePluginRoot();
  const skillsDir = path.join(pluginRoot, "skills");
  const contracts: CapabilityContract[] = [];

  if (!fs.existsSync(skillsDir)) return contracts;

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return contracts;
  }

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith("_")) continue;
    const skillMdPath = path.join(skillsDir, ent.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;
    try {
      const markdown = fs.readFileSync(skillMdPath, "utf8");
      const skillContract = parseSkillOntologyContract(markdown, skillMdPath);
      contracts.push(skillContractToCapabilityContract(skillContract));
    } catch {
      // Skip malformed SKILL.md; do not surface noise
    }
  }

  return contracts;
}

// ─── MCP tools loader (regex-scan bridge/mcp-server.ts TOOLS array) ──────────

interface RawToolEntry {
  name: string;
  description: string;
  category?: string;
  audience?: string;
  lifecycle?: string;
  ownerModule?: string;
}

/**
 * Extract tool entries from mcp-server.ts TOOLS array via regex.
 * Approach: scan for { name: "...", description: "..." } blocks in the TOOLS
 * array literal. This avoids dynamic import (which would trigger MCP server
 * startup side-effects) while reliably extracting the declaration surface.
 *
 * Gap: does not capture multiline description string concatenations — those are
 * reassembled from the lines between { and the next } (best-effort).
 * Future PR may export a static TOOLS_MANIFEST.json via pm-codegen for zero-regex path.
 */
function loadMcpToolEntries(): RawToolEntry[] {
  const pluginRoot = resolvePluginRoot();
  const serverPath = path.join(pluginRoot, "bridge", "mcp-server.ts");
  if (!fs.existsSync(serverPath)) return [];

  let src: string;
  try {
    src = fs.readFileSync(serverPath, "utf8");
  } catch {
    return [];
  }

  const tools: RawToolEntry[] = [];

  // Find the TOOLS array: from `const TOOLS: ToolSpec[] = [` to the balanced closing `]`
  const toolsStart = src.indexOf("const TOOLS: ToolSpec[] = [");
  if (toolsStart === -1) return [];

  // The literal `const TOOLS: ToolSpec[] = [` contains a `[` in `ToolSpec[]` before the
  // actual array `[`. We want the `[` AFTER the `= ` part.
  const equalsPos = src.indexOf("= [", toolsStart);
  if (equalsPos === -1) return [];
  const openBracket = equalsPos + 2; // skip `= ` → land on `[`
  if (src[openBracket] !== "[") return [];

  // Walk character-by-character to find the matching `]`
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let toolsEnd = -1;

  for (let i = openBracket; i < src.length; i++) {
    const ch = src[i]!;
    if (inString) {
      if (ch === "\\" ) { i++; continue; } // skip escape
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "[" || ch === "{") { depth++; continue; }
    if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) { toolsEnd = i; break; }
    }
  }

  const toolsBlock = toolsEnd !== -1 ? src.slice(openBracket, toolsEnd + 1) : src.slice(openBracket);

  // Extract individual tool objects — locate each `{ name: "...", description: ...` block
  // Match `name:` followed by a string literal
  const nameRe = /name:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = nameRe.exec(toolsBlock)) !== null) {
    const toolName = match[1] ?? "";
    if (!toolName) continue;

    // Find description lines near this name occurrence
    const namePos = match.index;
    // Scan forward for `description:` within the next 2000 chars
    const lookAhead = toolsBlock.slice(namePos, namePos + 2000);

    // description may be a single-line string or multi-line string concatenation
    const descSingleRe = /description:\s*["']([^"']+)["']/;
    const descConcatRe = /description:\s*((?:"[^"]*"\s*\+?\s*)+)/;

    let description = "";
    const singleM = descSingleRe.exec(lookAhead);
    if (singleM) {
      description = singleM[1] ?? "";
    } else {
      const concatM = descConcatRe.exec(lookAhead);
      if (concatM) {
        // Remove quotes and + operators
        description = (concatM[1] ?? "")
          .replace(/"\s*\+\s*"/g, " ")
          .replace(/^"+|"+$/g, "")
          .trim();
      }
    }

    // Extract optional category, audience, lifecycle, ownerModule
    const categoryM = /category:\s*["']([^"']+)["']/.exec(lookAhead);
    const audienceM = /audience:\s*["']([^"']+)["']/.exec(lookAhead);
    const lifecycleM = /lifecycle:\s*["']([^"']+)["']/.exec(lookAhead);
    const ownerM = /ownerModule:\s*["']([^"']+)["']/.exec(lookAhead);

    tools.push({
      name: toolName,
      description: description || `MCP tool: ${toolName}`,
      category: categoryM?.[1],
      audience: audienceM?.[1],
      lifecycle: lifecycleM?.[1],
      ownerModule: ownerM?.[1],
    });
  }

  return tools;
}

function loadMcpToolContracts(tools: readonly RawToolEntry[]): CapabilityContract[] {
  return tools.map((tool) => mcpToolSpecToCapabilityContract(tool));
}

// ─── Agents loader (scans <plugin-root>/agents/*.md frontmatter) ──────────────

/**
 * Minimal frontmatter parser for agent .md files.
 * Extracts top-level YAML scalar fields: name, description, tools, model, maxTurns, etc.
 */
function parseAgentFrontmatter(markdown: string): Record<string, unknown> | null {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return null;

  const block = normalized.slice(4, end);
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let arrayBuf: string[] = [];

  const flushArray = (): void => {
    if (currentKey !== null && arrayBuf.length > 0) {
      result[currentKey] = arrayBuf;
      arrayBuf = [];
      currentKey = null;
    }
  };

  for (const line of block.split("\n")) {
    if (line.trim() === "") continue;

    const listItem = /^\s*-\s+(.+)$/.exec(line);
    if (currentKey !== null && listItem) {
      arrayBuf.push((listItem[1] ?? "").replace(/^["']|["']$/g, "").trim());
      continue;
    }

    flushArray();

    const kvMatch = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!kvMatch) continue;
    const key = kvMatch[1] ?? "";
    const rawValue = (kvMatch[2] ?? "").trim();

    if (rawValue === "") {
      currentKey = key;
      continue;
    }

    if (rawValue === "true") { result[key] = true; continue; }
    if (rawValue === "false") { result[key] = false; continue; }
    const num = Number(rawValue);
    if (!isNaN(num) && rawValue.length > 0) { result[key] = num; continue; }

    // Inline array [a, b, c] or ["a", "b"]
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inside = rawValue.slice(1, -1).trim();
      if (inside.length === 0) { result[key] = []; continue; }
      result[key] = inside.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      continue;
    }

    result[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  flushArray();
  return result;
}

function loadAgentContracts(): CapabilityContract[] {
  const pluginRoot = resolvePluginRoot();
  const agentsDir = path.join(pluginRoot, "agents");
  const contracts: CapabilityContract[] = [];

  if (!fs.existsSync(agentsDir)) return contracts;

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(agentsDir);
  } catch {
    return contracts;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const agentPath = path.join(agentsDir, entry);
    try {
      const markdown = fs.readFileSync(agentPath, "utf8");
      const fm = parseAgentFrontmatter(markdown);
      if (!fm) continue;

      const slug = entry.replace(/\.md$/, "");
      const name = typeof fm["name"] === "string" ? fm["name"] : slug;
      const description =
        typeof fm["description"] === "string"
          ? fm["description"]
          : `Agent: ${name}`;
      const tools = Array.isArray(fm["tools"]) ? fm["tools"].map(String) : [];
      const model = typeof fm["model"] === "string" ? fm["model"] : "sonnet";
      const maxTurns = typeof fm["maxTurns"] === "number" ? fm["maxTurns"] : 30;

      // Construct a minimal AgentDefinitionDeclaration
      const decl: AgentDefinitionDeclaration = {
        agentId: `agent:${slug}` as ReturnType<typeof import("#schemas/ontology/primitives/agent-definition").agentDefinitionRid>,
        slug,
        description,
        scope: "plugin",
        model: model as "haiku" | "sonnet" | "opus" | "inherit",
        maxTurns,
        tools,
        filePath: agentPath,
        memory: typeof fm["memory"] === "string" ? fm["memory"] as "user" | "project" | "local" | "none" : undefined,
        isolation: typeof fm["isolation"] === "string" ? fm["isolation"] as "worktree" | "none" : undefined,
      };

      // Attach extended fields that agentDefinitionToCapabilityContract reads via `as unknown`
      const extDecl = decl as unknown as Record<string, unknown>;
      if (typeof fm["requiresDtcForMutation"] === "boolean") {
        extDecl["requiresDtcForMutation"] = fm["requiresDtcForMutation"];
      }
      if (Array.isArray(fm["writable_paths"])) {
        extDecl["writable_paths"] = fm["writable_paths"];
      }
      if (Array.isArray(fm["read_paths"])) {
        extDecl["read_paths"] = fm["read_paths"];
      }
      if (typeof fm["deprecated"] === "boolean") {
        extDecl["deprecated"] = fm["deprecated"];
      }
      if (typeof fm["supersededBy"] === "string") {
        extDecl["supersededBy"] = fm["supersededBy"];
      }

      contracts.push(agentDefinitionToCapabilityContract(decl));
    } catch {
      // Skip malformed agent .md
    }
  }

  return contracts;
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
  const watched = [
    path.join(pluginRoot, "skills"),
    path.join(pluginRoot, "agents"),
    path.join(pluginRoot, "bridge", "mcp-server.ts"),
    path.join(pluginRoot, "lib", "capability-registry", "mcp-tool-capability.ts"),
  ];
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
  const skills = loadSkillContracts();
  const mcpToolEntries = loadMcpToolEntries();
  const mcpTools = loadMcpToolContracts(mcpToolEntries);
  const mcpToolCapabilities = listMcpToolCapabilitiesForDeclaredTools(
    mcpToolEntries.map((tool) => tool.name),
  );
  const agents = loadAgentContracts();
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
