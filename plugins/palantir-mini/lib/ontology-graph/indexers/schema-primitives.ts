/**
 * lib/ontology-graph/indexers/schema-primitives.ts — Sixth concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.9 sprint-086).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/*.ts (sources walked)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.10+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem schemas/ontology/primitives/*.ts files
 * (recursive readdir) and emits a flat { nodes, edges } fragment. No event
 * emission, no store mutation, no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-086/spec.md §2
 * inheriting sprint-085/spec.md §2 + sprint-081/spec.md §2.2). Local payload interface
 * SchemaPrimitivePayload mirrors the PR 2.1 wrapper-primitive field shape but does NOT
 * import from @palantirKC/ontology-shared-core (snapshot at runtime-overlay/ predates
 * PR 2.1+2.2; importing fails with TS2307). When snapshot is refreshed, local
 * interfaces become drop-in compatible.
 *
 * Walk targets:
 *   - {projectRoot}/.claude/schemas/ontology/primitives/STAR.ts (recursive; one file per primitive)
 *
 * Excluded:
 *   - GLOB:.codex-plugin (auto-regen mirror per rule 25 v1.1.0)
 *   - GLOB:node_modules, GLOB:.git, GLOB:worktrees, GLOB:runtime-overlay, GLOB:.archived,
 *     GLOB:cache, GLOB:marketplaces, GLOB:dist
 *   - GLOB:index.ts (barrel re-export file — skipped by default per spec §3.3)
 *
 * Node kinds emitted:
 *   - "SchemaPrimitive"  (one per .ts file with ≥1 branded RID type alias; payload.ridBrandName
 *                         carries the stripped name e.g. "AgentDefinition")
 *
 * Edge kinds emitted:
 *   - "describes"  (structural: SchemaPrimitive → self-referential; the @stable header
 *                   describes the primitive — cross-node describes targets like
 *                   document-RID deferred to orchestration layer)
 *   - "refines"    (structural: SchemaPrimitive → self-referential; the primitive
 *                   refines the higher-layer authority chain — cross-primitive
 *                   refines via `import type` parse deferred to orchestration layer)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.7.0 (sprint-086 PR 2.9)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a SchemaPrimitive node.
 * Mirrors PR 2.1 SchemaPrimitiveDeclaration field shapes.
 */
interface SchemaPrimitivePayload {
  readonly projectRoot: string;
  /** Absolute path to the .ts primitive file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** First `export type <X>Rid` capture, stripped of "Rid" suffix (e.g. "AgentDefinition"). */
  readonly ridBrandName: string;
  /** First `export interface <X>Declaration` capture (e.g. "AgentDefinitionDeclaration"). Optional. */
  readonly declarationName?: string;
  /** First `D/L/A domain: <DOMAIN>` capture (e.g. "OPS", "DATA", "LOGIC", "ACTION"). Optional. */
  readonly dlaDomain?: string;
}

/** Edge payload carrying a confidence score. */
interface SchemaPrimitiveEdgePayload {
  /** confidence: 0.95 for "describes" (file IS the primitive definition), 0.9 for "refines" (primitive IS a schemas-layer refinement by file-path convention; cross-primitive resolution deferred). */
  readonly confidence: number;
}

// ─── Brand helpers (local; mirrors browse-index.ts + agents-rules.ts + plugin-manifest.ts + skills.ts + handlers.ts pattern) ──

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from an absolute primitive path + ridBrandName.
 * sha256(absolutePath + "#" + ridBrandName + "#SchemaPrimitive") — consistent across runs.
 */
function ridFromPathAndBrand(absolutePath: string, ridBrandName: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${absolutePath}#${ridBrandName}#SchemaPrimitive`)
    .digest("hex");
  return nodeRid(`schema-primitive:${hash}`);
}

/**
 * Deterministic EdgeRid from fromRid + toRid + kind.
 */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`schema-primitive-edge:${hash}`);
}

// ─── Glob helpers (mirrors agents-rules.ts + plugin-manifest.ts + skills.ts + handlers.ts) ──

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

// ─── Primitive parser policy (spec §3.5; simple regex; no ts-morph dependency) ──

interface ParsedPrimitive {
  readonly ridBrandName: string;
  readonly declarationName?: string;
  readonly dlaDomain?: string;
}

/**
 * Parses TypeScript primitive declarations from a schema file's content.
 * Permissive — returns null when no branded RID type alias found.
 *
 * Strategy:
 *   1. Pattern A — branded RID type alias: /^export\s+type\s+(NAME)Rid\s*=\s*string\s*&/m
 *      REQUIRED — file skipped if absent.
 *   2. Pattern B — Declaration interface: /^export\s+interface\s+(NAMEDeclaration)\s*\{/m
 *      OPTIONAL — undefined when absent.
 *   3. Pattern C — D/L/A domain header line: /D\/L\/A domain:\s*([A-Za-z][A-Za-z0-9_-]*)/m
 *      OPTIONAL — undefined when absent.
 */
function parsePrimitive(content: string): ParsedPrimitive | null {
  // Pattern A: required
  const ridMatch = content.match(
    /^export\s+type\s+([A-Za-z_$][A-Za-z0-9_$]*)Rid\s*=\s*string\s*&/m,
  );
  if (!ridMatch) return null;
  const ridBrandName = ridMatch[1];
  if (typeof ridBrandName !== "string" || ridBrandName.length === 0) return null;

  // Pattern B: optional
  const declMatch = content.match(
    /^export\s+interface\s+([A-Za-z_$][A-Za-z0-9_$]*Declaration)\s*\{/m,
  );
  const declarationName =
    declMatch && typeof declMatch[1] === "string" && declMatch[1].length > 0
      ? declMatch[1]
      : undefined;

  // Pattern C: optional
  const dlaMatch = content.match(/D\/L\/A domain:\s*([A-Za-z][A-Za-z0-9_-]*)/m);
  const dlaDomain =
    dlaMatch && typeof dlaMatch[1] === "string" && dlaMatch[1].length > 0
      ? dlaMatch[1]
      : undefined;

  return { ridBrandName, declarationName, dlaDomain };
}

// ─── File collection helper (recursive readdir) ───────────────────────────────

/**
 * Recursively collects all .ts file paths under baseDir, honoring excludeGlobs.
 * Returns empty array when the base directory does not exist.
 */
async function collectPrimitiveTsFiles(
  baseDir: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (matchesAnyGlob(dir, excludeGlobs)) return;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const candidate = path.join(dir, entry.name);
      if (matchesAnyGlob(candidate, excludeGlobs)) continue;

      if (entry.isDirectory()) {
        await walk(candidate);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".ts")) continue;

      results.push(candidate);
    }
  }

  await walk(baseDir);
  return results;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk schemas/ontology/primitives/*.ts files recursively and produce
 * a flat { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-primitive edges (e.g. SchemaPrimitive → sibling SchemaPrimitive via
 * `import type` lines) are emitted as self-referential edges; the orchestration
 * layer reconciles endpoints across indexers.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.includeGlobs — additional include globs (currently unused; walk targets are fixed).
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexSchemaPrimitives(
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
    "**/dist/**",
    "**/index.ts",
  ];

  // ── Discovery: project-scope base (spec §3.1) ─────────────────────────────
  const primitivesBaseDir = path.join(
    projectRoot,
    ".claude",
    "schemas",
    "ontology",
    "primitives",
  );

  const primitiveFiles = await collectPrimitiveTsFiles(primitivesBaseDir, excludeGlobs);

  // ── Emit SchemaPrimitive nodes + edges ────────────────────────────────────
  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  for (const absPath of primitiveFiles) {
    // Skip files matching excludeGlobs (defensive — already filtered in collect)
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;

    // Stat
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absPath);
    } catch {
      continue;
    }

    // Read content + parse (permissive)
    let parsed: ParsedPrimitive | null = null;
    try {
      const raw = await fs.promises.readFile(absPath, "utf-8");
      parsed = parsePrimitive(raw);
    } catch {
      // Unreadable — skip
      continue;
    }

    // No branded RID type alias → skip silently (spec §3.2)
    if (!parsed) continue;

    // Emit SchemaPrimitive node (one per .ts file)
    const primitiveRid = ridFromPathAndBrand(absPath, parsed.ridBrandName);
    const primitivePayload: SchemaPrimitivePayload = {
      projectRoot,
      filePath: absPath,
      lastIndexed: nowIso,
      byteSize: stat.size,
      ridBrandName: parsed.ridBrandName,
      declarationName: parsed.declarationName,
      dlaDomain: parsed.dlaDomain,
    };
    const primitiveNode: NodeRecord<SchemaPrimitivePayload> = {
      rid: primitiveRid,
      kind: "SchemaPrimitive",
      value: primitivePayload,
    };
    nodes.push(primitiveNode);

    // §4.1 "describes" edge: SchemaPrimitive → self (the file describes the primitive)
    const describesEdge: EdgeRecord<SchemaPrimitiveEdgePayload> = {
      rid: edgeRidFromEndpoints(primitiveRid, primitiveRid, "describes"),
      kind: "describes",
      fromRid: primitiveRid,
      toRid: primitiveRid,
      value: { confidence: 0.95 },
    };
    edges.push(describesEdge);

    // §4.2 "refines" edge: SchemaPrimitive → self (primitive refines schemas-layer authority chain; cross-primitive resolution deferred to orchestration)
    const refinesEdge: EdgeRecord<SchemaPrimitiveEdgePayload> = {
      rid: edgeRidFromEndpoints(primitiveRid, primitiveRid, "refines"),
      kind: "refines",
      fromRid: primitiveRid,
      toRid: primitiveRid,
      value: { confidence: 0.9 },
    };
    edges.push(refinesEdge);
  }

  return { nodes, edges };
}
