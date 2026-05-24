/**
 * lib/ontology-graph/indexers/browse-index.ts — First concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.4 sprint-081).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/research/BROWSE.md + ~/.claude/rules/BROWSE.md (sources walked)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.5+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem BROWSE.md + INDEX.md files and emits
 * a flat { nodes, edges } fragment. No event emission, no store mutation,
 * no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-081/spec.md §2.2).
 * Local payload interfaces (ProjectBrowseDocPayload / ProjectIndexDocPayload) mirror the
 * PR 2.1 ProjectBrowseDocDeclaration / ProjectIndexDocDeclaration field shapes but do NOT
 * import from @palantirKC/ontology-shared-core (snapshot at runtime-overlay/ predates
 * PR 2.1+2.2; importing fails with TS2307). When snapshot is refreshed, replace the local
 * interfaces with imports from #shared-core/ontology/primitives/.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.2.0 (sprint-081 PR 2.4)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a ProjectBrowseDoc node.
 * Mirrors PR 2.1 ProjectBrowseDocDeclaration field shapes.
 */
interface ProjectBrowseDocPayload {
  readonly projectRoot: string;
  /** Absolute path to the BROWSE.md file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
}

/**
 * Payload for a ProjectIndexDoc node.
 * Mirrors PR 2.1 ProjectIndexDocDeclaration field shapes.
 * Also used for CORE.md (rule-system structural reference, special-cased per spec §3.1).
 */
interface ProjectIndexDocPayload {
  readonly projectRoot: string;
  /** Absolute path to the INDEX.md / CORE.md file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
}

/** Edge payload for "describes" (structural co-location) or "routesTo" (table-row routing). */
interface BrowseEdgePayload {
  /** confidence: 1.0 for "describes" (structural co-location), 0.85 for "routesTo" (regex match) */
  readonly confidence: number;
}

// ─── Brand helpers (local; mirrors store.test.ts pattern) ─────────────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from an absolute file path.
 * sha256(absolutePath) — consistent across runs (same input → same output).
 */
function ridFromPath(absolutePath: string): NodeRid {
  const hash = createHash("sha256").update(absolutePath).digest("hex");
  return nodeRid(`browse-doc:${hash}`);
}

/**
 * Deterministic EdgeRid from fromRid + toRid + kind.
 */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`browse-edge:${hash}`);
}

// ─── Glob helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if any exclude glob pattern matches the given absolute path.
 * Uses minimatch-style `*` + `**` semantics implemented via a lightweight
 * regex conversion — avoids adding fast-glob / minimatch dependency.
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
  // Convert glob pattern to regex
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape special regex chars (not * or ?)
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__\//g, "(?:.+/)?")
    .replace(/__DOUBLE_STAR__/g, ".*");
  const regex = new RegExp(`(^|/)${regexStr}(/|$)`, "i");
  return regex.test(target);
}

// ─── BROWSE.md line-regex for routesTo edges ──────────────────────────────────

/**
 * Parses up to 200 lines of BROWSE.md content and extracts routing table entries.
 * Looks for markdown table rows: `| ... | <target> |`
 * where the second column contains a `.md` filename or backtick-wrapped path.
 *
 * Returns an array of raw target strings (relative or backtick-wrapped paths).
 */
function extractRoutingTargets(content: string): ReadonlyArray<string> {
  const lines = content.split("\n").slice(0, 200);
  const targets: string[] = [];

  for (const line of lines) {
    // Match table rows with at least 2 pipe-delimited columns
    // e.g.:  | Question | open first → target.md |
    //        | ... | `anthropic/INDEX.md` |
    const tableRowMatch = line.match(/^\s*\|(.+)\|(.+)\|/);
    if (tableRowMatch === null) continue;

    const secondCol = tableRowMatch[2]?.trim() ?? "";

    // Extract backtick-wrapped paths: `foo/bar.md`
    const backtickMatch = secondCol.match(/`([^`]+\.md[^`]*)`/);
    if (backtickMatch?.[1] !== undefined) {
      targets.push(backtickMatch[1].trim());
      continue;
    }

    // Extract bare .md references (after → or at start of column)
    const bareMatch = secondCol.match(/(?:→\s*)?([^\s|→]+\.md)/);
    if (bareMatch?.[1] !== undefined) {
      targets.push(bareMatch[1].trim());
    }
  }

  return targets;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk project BROWSE.md + INDEX.md files and produce a flat { nodes, edges }
 * fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer edges (routesTo targets outside PR 2.4 scope) are emitted as
 * dangling edges; the orchestration layer reconciles endpoints across indexers.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.includeGlobs — additional include globs (defaults: BROWSE.md, INDEX.md, CORE.md).
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexBrowseAndIndexDocs(
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
  ];

  // ── Pass 1: Build known-path list (spec §3.1 root anchors) ──────────────────

  const candidatePaths: string[] = [
    path.join(projectRoot, ".claude", "research", "BROWSE.md"),
    path.join(projectRoot, ".claude", "research", "INDEX.md"),
    path.join(projectRoot, ".claude", "rules", "BROWSE.md"),
    path.join(projectRoot, ".claude", "rules", "CORE.md"),
    path.join(projectRoot, ".claude", "INDEX.md"),
    path.join(projectRoot, "BROWSE.md"),
    path.join(projectRoot, "INDEX.md"),
  ];

  // ── Pass 2: One-level glob under .claude/research/*/BROWSE.md + */INDEX.md ──

  const researchBase = path.join(projectRoot, ".claude", "research");
  try {
    const researchEntries = await fs.promises.readdir(researchBase, { withFileTypes: true });
    for (const entry of researchEntries) {
      if (!entry.isDirectory()) continue;
      candidatePaths.push(path.join(researchBase, entry.name, "BROWSE.md"));
      candidatePaths.push(path.join(researchBase, entry.name, "INDEX.md"));
    }
  } catch {
    // .claude/research/ does not exist — degenerate case (empty project root)
  }

  // ── Walk projectRoot recursively for any BROWSE.md / INDEX.md / CORE.md ─────
  // This ensures test fixture sub-directories are discovered.

  await collectBrowseFiles(projectRoot, excludeGlobs, candidatePaths);

  // ── Deduplicate candidate paths ───────────────────────────────────────────

  const deduped = [...new Set(candidatePaths)];

  // ── Stat + read each candidate; build node records ────────────────────────

  const nodes: NodeRecord<unknown>[] = [];
  const nodeByPath = new Map<string, NodeRecord<unknown>>();

  // Group by directory for describes-edge derivation
  const browseByDir = new Map<string, NodeRecord<unknown>>();
  const indexByDir = new Map<string, NodeRecord<unknown>>();

  for (const filePath of deduped) {
    // Skip files matching excludeGlobs
    if (matchesAnyGlob(filePath, excludeGlobs)) continue;

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      // File does not exist — skip silently (known-path list may over-enumerate)
      continue;
    }

    const fileName = path.basename(filePath);
    const dir = path.dirname(filePath);

    // Discriminate kind: CORE.md → ProjectIndexDoc, INDEX.md → ProjectIndexDoc,
    // BROWSE.md → ProjectBrowseDoc
    const isBrowse = fileName === "BROWSE.md";
    const isIndex = fileName === "INDEX.md" || fileName === "CORE.md";
    if (!isBrowse && !isIndex) continue;

    const rid = ridFromPath(filePath);

    if (isBrowse) {
      const payload: ProjectBrowseDocPayload = {
        projectRoot,
        filePath,
        lastIndexed: nowIso,
        byteSize: stat.size,
      };
      const node: NodeRecord<ProjectBrowseDocPayload> = {
        rid,
        kind: "ProjectBrowseDoc",
        value: payload,
      };
      nodes.push(node);
      nodeByPath.set(filePath, node);
      browseByDir.set(dir, node);
    } else {
      const payload: ProjectIndexDocPayload = {
        projectRoot,
        filePath,
        lastIndexed: nowIso,
        byteSize: stat.size,
      };
      const node: NodeRecord<ProjectIndexDocPayload> = {
        rid,
        kind: "ProjectIndexDoc",
        value: payload,
      };
      nodes.push(node);
      nodeByPath.set(filePath, node);
      indexByDir.set(dir, node);
    }
  }

  // ── Edge derivation ───────────────────────────────────────────────────────

  const edges: EdgeRecord<unknown>[] = [];

  // §4.1 "describes" edges: INDEX co-located with BROWSE in same dir
  for (const [dir, indexNode] of indexByDir.entries()) {
    const browseNode = browseByDir.get(dir);
    if (browseNode === undefined) continue;

    const payload: BrowseEdgePayload = { confidence: 1.0 };
    const edge: EdgeRecord<BrowseEdgePayload> = {
      rid: edgeRidFromEndpoints(indexNode.rid, browseNode.rid, "describes"),
      kind: "describes",
      fromRid: indexNode.rid,
      toRid: browseNode.rid,
      value: payload,
    };
    edges.push(edge);
  }

  // §4.2 "routesTo" edges: parse BROWSE.md content for table routing rows
  for (const [filePath, browseNode] of nodeByPath.entries()) {
    if (browseNode.kind !== "ProjectBrowseDoc") continue;

    let content: string;
    try {
      const buf = await fs.promises.readFile(filePath, "utf-8");
      content = buf;
    } catch {
      continue;
    }

    const targets = extractRoutingTargets(content);
    for (const rawTarget of targets) {
      // Resolve target path relative to the BROWSE.md's directory
      const browseDir = path.dirname(filePath);
      // Strip backtick wrappers if any leaked through
      const cleanTarget = rawTarget.replace(/^`|`$/g, "").trim();

      // Try resolving as relative path under browseDir
      const resolvedPath = path.isAbsolute(cleanTarget)
        ? cleanTarget
        : path.resolve(browseDir, cleanTarget);

      // Check if target exists on disk
      let targetExists = false;
      try {
        await fs.promises.lstat(resolvedPath);
        targetExists = true;
      } catch {
        targetExists = false;
      }

      if (!targetExists) continue;

      // Get or synthesize a target node RID
      const targetRid = ridFromPath(resolvedPath);

      const payload: BrowseEdgePayload = { confidence: 0.85 };
      const edge: EdgeRecord<BrowseEdgePayload> = {
        rid: edgeRidFromEndpoints(browseNode.rid, targetRid, "routesTo"),
        kind: "routesTo",
        fromRid: browseNode.rid,
        toRid: targetRid,
        value: payload,
      };
      edges.push(edge);
    }
  }

  return { nodes, edges };
}

// ─── Recursive file collector ─────────────────────────────────────────────────

/**
 * Recursively walks a directory and collects BROWSE.md, INDEX.md, CORE.md paths.
 * Appends discovered paths to the output array.
 * Skips directories matching excludeGlobs.
 */
async function collectBrowseFiles(
  dir: string,
  excludeGlobs: ReadonlyArray<string>,
  out: string[],
): Promise<void> {
  if (matchesAnyGlob(dir, excludeGlobs)) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (matchesAnyGlob(entryPath, excludeGlobs)) continue;

    if (entry.isDirectory()) {
      await collectBrowseFiles(entryPath, excludeGlobs, out);
    } else if (
      entry.name === "BROWSE.md" ||
      entry.name === "INDEX.md" ||
      entry.name === "CORE.md"
    ) {
      out.push(entryPath);
    }
  }
}
