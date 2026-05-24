/**
 * lib/ontology-graph/indexers/handlers.ts — Fifth concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.8 sprint-085).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/plugins/<plugin-id>/bridge/handlers/*.ts (sources walked)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.9+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem bridge/handlers/*.ts files across
 * installed plugins and emits a flat { nodes, edges } fragment. No event
 * emission, no store mutation, no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-085/spec.md §2
 * inheriting sprint-084/spec.md §2 + sprint-081/spec.md §2.2). Local payload interface
 * McpHandlerPayload mirrors the PR 2.1 McpHandlerDeclaration field shape but does NOT import
 * from @palantirKC/ontology-shared-core (snapshot at runtime-overlay/ predates PR 2.1+2.2;
 * importing fails with TS2307). When snapshot is refreshed, local interfaces become
 * drop-in compatible.
 *
 * Walk targets:
 *   - {projectRoot}/.claude/plugins/STAR/bridge/handlers/STAR.ts (plugin-scope; one file per handler)
 *
 * Excluded:
 *   - GLOB:.codex-plugin (auto-regen mirror per rule 25 v1.1.0)
 *   - GLOB:node_modules, GLOB:.git, GLOB:worktrees, GLOB:runtime-overlay, GLOB:.archived,
 *     GLOB:cache, GLOB:marketplaces, GLOB:dist
 *
 * Node kinds emitted:
 *   - "McpHandler"  (one per exported function/const/default in each handler .ts file)
 *
 * Edge kinds emitted:
 *   - "describes"  (structural: McpHandler → self-referential; the file describes
 *                   the handler — cross-node describes targets like ToolRid
 *                   deferred to orchestration layer)
 *   - "implements" (structural: McpHandler → self-referential; the export implements
 *                   an MCP tool surface — cross-node implements against PR 2.6
 *                   RuntimeEntrypointRid deferred to orchestration layer)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.6.0 (sprint-085 PR 2.8)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a McpHandler node.
 * Mirrors PR 2.1 McpHandlerDeclaration field shapes.
 */
interface McpHandlerPayload {
  readonly projectRoot: string;
  /** Absolute path to the .ts handler file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** Parsed exported function/const/default symbol name. */
  readonly exportedFnName: string;
  /** Discriminator for the parsed export pattern. */
  readonly exportKind: "function" | "const" | "default";
  /** Plugin-id derived from path (e.g. "palantir-mini"). */
  readonly mcpServerName: string;
}

/** Edge payload carrying a confidence score. */
interface McpHandlerEdgePayload {
  /** confidence: 0.95 for "describes" (file IS the handler implementation), 0.9 for "implements" (export IS an MCP handler by path convention; runtime tool-name resolution deferred). */
  readonly confidence: number;
}

// ─── Brand helpers (local; mirrors browse-index.ts + agents-rules.ts + plugin-manifest.ts + skills.ts pattern) ──

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from an absolute handler path + exported fn name.
 * sha256(absolutePath + "#" + exportedFnName + "#McpHandler") — consistent across runs.
 */
function ridFromPathAndExport(absolutePath: string, exportedFnName: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${absolutePath}#${exportedFnName}#McpHandler`)
    .digest("hex");
  return nodeRid(`mcp-handler:${hash}`);
}

/**
 * Deterministic EdgeRid from fromRid + toRid + kind.
 */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`mcp-handler-edge:${hash}`);
}

// ─── Glob helpers (mirrors agents-rules.ts + plugin-manifest.ts + skills.ts) ──

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

// ─── TS export parser (spec §3.5; simple regex; no ts-morph dependency) ──────

interface ParsedExport {
  readonly name: string;
  readonly kind: "function" | "const" | "default";
}

/**
 * Parses TypeScript export declarations from a handler file's content.
 * Permissive — returns empty array when no exports found or content unparseable.
 *
 * Strategy:
 *   1. Pattern A — exported function: /^export\s+(?:async\s+)?function\s+(NAME)/gm
 *   2. Pattern B — exported const: /^export\s+const\s+(NAME)\s*=/gm
 *   3. Pattern C — default export function (named or anonymous):
 *        /^export\s+default\s+(?:async\s+)?function\s+(NAME)?/gm
 *   4. De-duplicate by (name, kind) pair per file.
 */
function parseExports(content: string): ReadonlyArray<ParsedExport> {
  const collected = new Map<string, ParsedExport>();

  // Pattern A: export function / export async function
  const fnRegex = /^export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = fnRegex.exec(content)) !== null) {
    const name = m[1];
    if (typeof name === "string" && name.length > 0) {
      const key = `function:${name}`;
      if (!collected.has(key)) {
        collected.set(key, { name, kind: "function" });
      }
    }
  }

  // Pattern B: export const NAME =
  const constRegex = /^export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm;
  while ((m = constRegex.exec(content)) !== null) {
    const name = m[1];
    if (typeof name === "string" && name.length > 0) {
      const key = `const:${name}`;
      if (!collected.has(key)) {
        collected.set(key, { name, kind: "const" });
      }
    }
  }

  // Pattern C: export default function NAME / export default async function NAME / anonymous
  const defaultRegex = /^export\s+default\s+(?:async\s+)?function\s*([A-Za-z_$][A-Za-z0-9_$]*)?/gm;
  while ((m = defaultRegex.exec(content)) !== null) {
    const name = m[1];
    const symbol = typeof name === "string" && name.length > 0 ? name : "default";
    // De-duplicate: if Pattern A already captured a named default export, skip.
    // Otherwise add as "default" kind.
    const key = `default:${symbol}`;
    const fnKey = `function:${symbol}`;
    if (!collected.has(key) && !collected.has(fnKey)) {
      collected.set(key, { name: symbol, kind: "default" });
    }
  }

  return Array.from(collected.values());
}

// ─── File collection helper ───────────────────────────────────────────────────

/**
 * Collects all bridge/handlers/*.ts paths under {baseDir}/<plugin-id>/bridge/handlers/.
 * Returns empty array when the base directory does not exist.
 *
 * Pattern: baseDir/<plugin-id>/bridge/handlers/<handler>.ts
 */
async function collectHandlerTsFiles(
  baseDir: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  let pluginEntries: fs.Dirent[];
  try {
    pluginEntries = await fs.promises.readdir(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];

  for (const pluginEntry of pluginEntries) {
    if (!pluginEntry.isDirectory()) continue;
    const pluginDir = path.join(baseDir, pluginEntry.name);
    if (matchesAnyGlob(pluginDir, excludeGlobs)) continue;

    const handlersDir = path.join(pluginDir, "bridge", "handlers");
    if (matchesAnyGlob(handlersDir, excludeGlobs)) continue;

    let handlerEntries: fs.Dirent[];
    try {
      handlerEntries = await fs.promises.readdir(handlersDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const handlerEntry of handlerEntries) {
      if (!handlerEntry.isFile()) continue;
      if (!handlerEntry.name.endsWith(".ts")) continue;
      const candidate = path.join(handlersDir, handlerEntry.name);
      if (matchesAnyGlob(candidate, excludeGlobs)) continue;
      results.push(candidate);
    }
  }

  return results;
}

/**
 * Derives the plugin-id (mcpServerName) from a handler absolute path.
 * Pattern: .../.claude/plugins/<plugin-id>/bridge/handlers/<handler>.ts → <plugin-id>
 */
function deriveMcpServerName(absolutePath: string): string {
  const parts = absolutePath.split(path.sep);
  const pluginsIdx = parts.lastIndexOf("plugins");
  if (pluginsIdx >= 0 && pluginsIdx + 1 < parts.length) {
    const pluginId = parts[pluginsIdx + 1];
    if (typeof pluginId === "string" && pluginId.length > 0) return pluginId;
  }
  return "unknown";
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk bridge/handlers/*.ts files across installed plugins and produce
 * a flat { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer edges (e.g. McpHandler → RuntimeEntrypoint from PR 2.6) are
 * emitted as self-referential edges; the orchestration layer reconciles
 * endpoints across indexers.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.includeGlobs — additional include globs (currently unused; walk targets are fixed).
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexHandlerExports(
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
  ];

  // ── Discovery: plugin-scope base (spec §3.1) ────────────────────────────────

  const pluginsBaseDir = path.join(projectRoot, ".claude", "plugins");

  const handlerFiles = await collectHandlerTsFiles(pluginsBaseDir, excludeGlobs);

  // ── Emit McpHandler nodes + edges ────────────────────────────────────────────

  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  for (const absPath of handlerFiles) {
    // Skip files matching excludeGlobs (defensive — already filtered in collect)
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;

    // Stat
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absPath);
    } catch {
      continue;
    }

    // Read content + parse exports (permissive)
    let parsedExports: ReadonlyArray<ParsedExport> = [];
    try {
      const raw = await fs.promises.readFile(absPath, "utf-8");
      parsedExports = parseExports(raw);
    } catch {
      // Unreadable — skip
      continue;
    }

    // Files with zero exports → skip silently (spec §3.2)
    if (parsedExports.length === 0) continue;

    const mcpServerName = deriveMcpServerName(absPath);

    for (const exp of parsedExports) {
      // Emit McpHandler node (one per exported symbol)
      const handlerRid = ridFromPathAndExport(absPath, exp.name);
      const handlerPayload: McpHandlerPayload = {
        projectRoot,
        filePath: absPath,
        lastIndexed: nowIso,
        byteSize: stat.size,
        exportedFnName: exp.name,
        exportKind: exp.kind,
        mcpServerName,
      };
      const handlerNode: NodeRecord<McpHandlerPayload> = {
        rid: handlerRid,
        kind: "McpHandler",
        value: handlerPayload,
      };
      nodes.push(handlerNode);

      // §4.1 "describes" edge: McpHandler → self (the file describes the handler)
      const describesEdge: EdgeRecord<McpHandlerEdgePayload> = {
        rid: edgeRidFromEndpoints(handlerRid, handlerRid, "describes"),
        kind: "describes",
        fromRid: handlerRid,
        toRid: handlerRid,
        value: { confidence: 0.95 },
      };
      edges.push(describesEdge);

      // §4.2 "implements" edge: McpHandler → self (export implements MCP tool surface; cross-handler resolution deferred to orchestration)
      const implementsEdge: EdgeRecord<McpHandlerEdgePayload> = {
        rid: edgeRidFromEndpoints(handlerRid, handlerRid, "implements"),
        kind: "implements",
        fromRid: handlerRid,
        toRid: handlerRid,
        value: { confidence: 0.9 },
      };
      edges.push(implementsEdge);
    }
  }

  return { nodes, edges };
}
