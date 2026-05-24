/**
 * lib/ontology-graph/indexers/skills.ts — Fourth concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.7 sprint-084).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/plugins/<plugin-id>/skills/<skill-id>/SKILL.md (plugin-scope sources walked)
 *   ~/.claude/skills/<skill-id>/SKILL.md                     (user-scope sources walked)
 *   <projectRoot>/.claude/skills/<skill-id>/SKILL.md          (project-local sources walked)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.8+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem SKILL.md files across plugin / user /
 * project scopes and emits a flat { nodes, edges } fragment. No event emission,
 * no store mutation, no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-084/spec.md §2
 * inheriting sprint-083/spec.md §2 + sprint-081/spec.md §2.2). Local payload interface
 * SkillPayload mirrors the PR 2.1 SkillDeclaration field shape but does NOT import
 * from @palantirKC/ontology-shared-core (snapshot at runtime-overlay/ predates PR 2.1+2.2;
 * importing fails with TS2307). When snapshot is refreshed, local interfaces become
 * drop-in compatible.
 *
 * Walk targets:
 *   - {projectRoot}/.claude/plugins/STAR/skills/STAR/SKILL.md (plugin-scope)
 *   - {projectRoot}/.claude/skills/STAR/SKILL.md             (project-local + user-scope when projectRoot=$HOME)
 *
 * Excluded:
 *   - GLOB:.codex-plugin (auto-regen mirror per rule 25 v1.1.0)
 *   - GLOB:node_modules, GLOB:.git, GLOB:worktrees, GLOB:runtime-overlay, GLOB:.archived,
 *     GLOB:cache, GLOB:marketplaces
 *
 * Node kinds emitted:
 *   - "Skill"  (one per SKILL.md)
 *
 * Edge kinds emitted:
 *   - "describes"  (structural: Skill → self-referential; the frontmatter description
 *                   describes the skill — cross-node describes targets like ToolRid
 *                   deferred to orchestration layer)
 *   - "routesTo"   (routing: Skill → self-referential; the allowed-tools field routes to
 *                   MCP handlers — cross-node routesTo against PR 2.6 McpHandlerRid
 *                   deferred to orchestration layer)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.5.0 (sprint-084 PR 2.7)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a Skill node.
 * Mirrors PR 2.1 SkillDeclaration field shapes.
 */
interface SkillPayload {
  readonly projectRoot: string;
  /** Absolute path to the SKILL.md file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** Parsed from frontmatter `name` field (empty string when missing/unparseable). */
  readonly skillName: string;
  /** Parsed from frontmatter `description` field. */
  readonly skillDescription?: string;
  /** Parsed from frontmatter `category` field. */
  readonly skillCategory?: string;
  /** Raw `allowed-tools` field (space-separated MCP tool list). */
  readonly allowedTools?: string;
  /** Discovery scope (plugin / user / project). */
  readonly scope: "plugin" | "user" | "project";
}

/** Edge payload carrying a confidence score. */
interface SkillEdgePayload {
  /** confidence: 1.0 for "describes" (frontmatter literally declares it), 0.85 for "routesTo" (allowed-tools parse is deterministic; cross-handler resolution deferred). */
  readonly confidence: number;
}

// ─── Brand helpers (local; mirrors browse-index.ts + agents-rules.ts + plugin-manifest.ts pattern) ──

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from an absolute SKILL.md path.
 * sha256(absolutePath + "#Skill") — consistent across runs.
 */
function ridFromPath(absolutePath: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${absolutePath}#Skill`)
    .digest("hex");
  return nodeRid(`skill:${hash}`);
}

/**
 * Deterministic EdgeRid from fromRid + toRid + kind.
 */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`skill-edge:${hash}`);
}

// ─── Glob helpers (mirrors agents-rules.ts + plugin-manifest.ts) ──────────────

/**
 * Returns true if any exclude glob pattern matches the given absolute path.
 */
function matchesAnyGlob(absolutePath: string, globs: ReadonlyArray<string>): boolean {
  for (const glob of globs) {
    if (globMatches(glob, absolutePath)) return true;
  }
  return false;
}

/**
 * Lightweight glob → regex conversion.
 * Supports `*` (any segment char, not `/`) and `**` (any chars including `/`).
 */
function globMatches(glob: string, target: string): boolean {
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape special regex chars (not * or ?)
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__\//g, "(?:.+/)?")
    .replace(/__DOUBLE_STAR__/g, ".*");
  const regex = new RegExp(`(^|/)${regexStr}(/|$)`, "i");
  return regex.test(target);
}

// ─── Frontmatter parser (spec §3.5; simple regex; no js-yaml dependency) ──────

interface ParsedFrontmatter {
  name?: string;
  description?: string;
  category?: string;
  "allowed-tools"?: string;
}

/**
 * Parses YAML frontmatter from the top of a markdown file.
 * Permissive — returns empty object when frontmatter missing or unparseable.
 *
 * Strategy:
 *   1. Read first 4 KB of content (sufficient for all SKILL.md frontmatter observed).
 *   2. Match `^---\n([\s\S]*?)\n---` at start of file.
 *   3. Split captured block by `\n`; for each line matching
 *      `^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$`, set parsed[$1] = $2.trim().
 *   4. Multi-line values capture first line only (spec §3.5).
 */
function parseFrontmatter(content: string): ParsedFrontmatter {
  const headBlock = content.slice(0, 4096);
  const match = headBlock.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const block = match[1];
  if (typeof block !== "string") return {};

  const parsed: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const lineMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (lineMatch) {
      const key = lineMatch[1];
      const value = lineMatch[2];
      if (typeof key === "string" && typeof value === "string") {
        parsed[key] = value.trim();
      }
    }
  }
  return parsed as ParsedFrontmatter;
}

// ─── File collection helper ───────────────────────────────────────────────────

/**
 * Collects all SKILL.md paths matching a two-level glob under a base directory.
 * Pattern: {baseDir}/STAR/STAR/SKILL.md (plugin-scope: plugins/<id>/skills/<skill-id>/SKILL.md → call with baseDir=plugins/<id>/skills/)
 *                  {baseDir}/STAR/SKILL.md (single-level: skills/<skill-id>/SKILL.md → call with baseDir=skills/)
 *
 * Pass `depth: 1` for single-level (e.g. ~/.claude/skills/) or `depth: 2` for
 * plugin-scope (e.g. plugins/<id>/skills/).
 *
 * Returns empty array when the base directory does not exist.
 */
async function collectSkillMdFiles(
  baseDir: string,
  depth: 1 | 2,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  let topLevelEntries: fs.Dirent[];
  try {
    topLevelEntries = await fs.promises.readdir(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];

  if (depth === 1) {
    // Single-level: baseDir/<skill-id>/SKILL.md
    for (const entry of topLevelEntries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(baseDir, entry.name);
      if (matchesAnyGlob(skillDir, excludeGlobs)) continue;

      const candidate = path.join(skillDir, "SKILL.md");
      if (matchesAnyGlob(candidate, excludeGlobs)) continue;

      try {
        await fs.promises.stat(candidate);
        results.push(candidate);
      } catch {
        // Not present — skip
      }
    }
    return results;
  }

  // depth === 2: baseDir/<plugin-id>/skills/<skill-id>/SKILL.md
  for (const pluginEntry of topLevelEntries) {
    if (!pluginEntry.isDirectory()) continue;
    const pluginDir = path.join(baseDir, pluginEntry.name);
    if (matchesAnyGlob(pluginDir, excludeGlobs)) continue;

    const skillsDir = path.join(pluginDir, "skills");
    if (matchesAnyGlob(skillsDir, excludeGlobs)) continue;

    let skillEntries: fs.Dirent[];
    try {
      skillEntries = await fs.promises.readdir(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const skillEntry of skillEntries) {
      if (!skillEntry.isDirectory()) continue;
      const skillDir = path.join(skillsDir, skillEntry.name);
      if (matchesAnyGlob(skillDir, excludeGlobs)) continue;

      const candidate = path.join(skillDir, "SKILL.md");
      if (matchesAnyGlob(candidate, excludeGlobs)) continue;

      try {
        await fs.promises.stat(candidate);
        results.push(candidate);
      } catch {
        // Not present — skip
      }
    }
  }

  return results;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk SKILL.md files across plugin / user / project scopes and produce
 * a flat { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer edges (e.g. Skill → McpHandler from PR 2.6) are emitted as
 * self-referential edges; the orchestration layer reconciles endpoints
 * across indexers.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.includeGlobs — additional include globs (currently unused; walk targets are fixed).
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexSkillFrontmatter(
  projectRoot: string,
  opts?: {
    readonly includeGlobs?: ReadonlyArray<string>;
    readonly excludeGlobs?: ReadonlyArray<string>;
    readonly nowIso?: string;
  },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const excludeGlobs = opts?.excludeGlobs ?? [
    "**/node_modules/**",
    "**/.git/**",
    "**/worktrees/**",
    "**/runtime-overlay/**",
    "**/.archived/**",
    "**/.codex-plugin/**",
    "**/cache/**",
    "**/marketplaces/**",
  ];

  // ── Discovery: three scope bases (spec §3.1) ────────────────────────────────

  const pluginsBaseDir = path.join(projectRoot, ".claude", "plugins");
  const projectLocalSkillsDir = path.join(projectRoot, ".claude", "skills");

  // Walk plugin-scope (depth 2: plugins/<id>/skills/<skill-id>/SKILL.md)
  // and project-local (depth 1: .claude/skills/<skill-id>/SKILL.md)
  // in parallel.
  const [pluginSkillFiles, projectSkillFiles] = await Promise.all([
    collectSkillMdFiles(pluginsBaseDir, 2, excludeGlobs),
    collectSkillMdFiles(projectLocalSkillsDir, 1, excludeGlobs),
  ]);

  // Build a Map<absolutePath, scope> to attach the discovery-scope label.
  const discoveredFiles = new Map<string, "plugin" | "user" | "project">();
  for (const p of pluginSkillFiles) discoveredFiles.set(p, "plugin");
  for (const p of projectSkillFiles) {
    if (!discoveredFiles.has(p)) {
      // Heuristic: when projectRoot is the user's $HOME, project-local IS user-scope.
      // We label "project" by default; the orchestration layer can re-classify.
      discoveredFiles.set(p, "project");
    }
  }

  // ── Emit Skill nodes + edges ─────────────────────────────────────────────────

  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  for (const [absPath, scope] of discoveredFiles.entries()) {
    // Skip files matching excludeGlobs (defensive — already filtered in collect)
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;

    // Stat
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absPath);
    } catch {
      continue;
    }

    // Read content + parse frontmatter (permissive)
    let parsed: ParsedFrontmatter = {};
    try {
      const raw = await fs.promises.readFile(absPath, "utf-8");
      parsed = parseFrontmatter(raw);
    } catch {
      // Unparseable — emit Skill node with empty skillName; skip edges
    }

    const skillName = typeof parsed.name === "string" ? parsed.name : "";
    const skillDescription =
      typeof parsed.description === "string" && parsed.description.length > 0
        ? parsed.description
        : undefined;
    const skillCategory =
      typeof parsed.category === "string" && parsed.category.length > 0
        ? parsed.category
        : undefined;
    const allowedTools =
      typeof parsed["allowed-tools"] === "string" && parsed["allowed-tools"].length > 0
        ? parsed["allowed-tools"]
        : undefined;

    // Emit Skill node (one per SKILL.md)
    const skillRid = ridFromPath(absPath);
    const skillPayload: SkillPayload = {
      projectRoot,
      filePath: absPath,
      lastIndexed: nowIso,
      byteSize: stat.size,
      skillName,
      skillDescription,
      skillCategory,
      allowedTools,
      scope,
    };
    const skillNode: NodeRecord<SkillPayload> = {
      rid: skillRid,
      kind: "Skill",
      value: skillPayload,
    };
    nodes.push(skillNode);

    // §4.1 "describes" edge: Skill → self (frontmatter description describes the skill)
    if (skillDescription !== undefined) {
      const describesEdge: EdgeRecord<SkillEdgePayload> = {
        rid: edgeRidFromEndpoints(skillRid, skillRid, "describes"),
        kind: "describes",
        fromRid: skillRid,
        toRid: skillRid,
        value: { confidence: 1.0 },
      };
      edges.push(describesEdge);
    }

    // §4.2 "routesTo" edge: Skill → self (allowed-tools routes to MCP handlers; cross-handler resolution deferred to orchestration)
    if (allowedTools !== undefined) {
      const routesEdge: EdgeRecord<SkillEdgePayload> = {
        rid: edgeRidFromEndpoints(skillRid, skillRid, "routesTo"),
        kind: "routesTo",
        fromRid: skillRid,
        toRid: skillRid,
        value: { confidence: 0.85 },
      };
      edges.push(routesEdge);
    }
  }

  return { nodes, edges };
}
