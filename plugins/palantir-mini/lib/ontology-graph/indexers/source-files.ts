/**
 * lib/ontology-graph/indexers/source-files.ts — Seventh concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.10 sprint-087; HEAVIEST PR of Sprint X2;
 * AST-based; first ontology-graph indexer to use a real TS Compiler API walk).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/plugins/palantir-mini/lib/impact-graph/ast-walker.ts (canonical AST walk pattern)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.14+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem .ts/.tsx files under opts.targetGlob and
 * emits a flat { nodes, edges } fragment. No event emission, no store mutation,
 * no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-087/spec.md §2
 * inheriting sprint-081/spec.md §2.2). Local payload interfaces SourceFilePayload +
 * ImportsEdgePayload mirror the PR 2.1 wrapper-primitive field shape but do NOT
 * import from @palantirKC/ontology-shared-core (snapshot at runtime-overlay/
 * predates PR 2.1+2.2; importing fails with TS2307). When snapshot is refreshed,
 * local interfaces become drop-in compatible.
 *
 * AST policy (spec §3.1):
 *   - Bare-bones `ts.createSourceFile` parse (no `ts.Program` / TypeChecker);
 *     deliberately lighter-weight than lib/impact-graph/ast-walker.ts to keep the
 *     opts.maxFiles=200 perf cap actually enforceable file-by-file.
 *   - Single top-level statement walk via `ts.forEachChild` over `SourceFile.statements`.
 *   - Predicate: `ts.isImportDeclaration(node)` — TS Compiler API unifies default,
 *     named, namespace, side-effect, and `import type` forms under this single node
 *     type; the `importClause` sub-tree differentiates them (not used here).
 *   - `import()` expression form (dynamic imports) intentionally NOT counted —
 *     mirrors impact-graph walker's static-AST policy.
 *
 * Walk targets:
 *   - {projectRoot}/<opts.targetGlob || "lib/**\/*.ts"> (recursive readdir + extension filter)
 *
 * Excluded:
 *   - GLOB:.codex-plugin (auto-regen mirror per rule 25 v1.1.0)
 *   - GLOB:node_modules, GLOB:.git, GLOB:worktrees, GLOB:runtime-overlay, GLOB:.archived,
 *     GLOB:cache, GLOB:marketplaces, GLOB:dist
 *   - GLOB:*.d.ts (declaration files — indexed surface is source code, not types)
 *   - GLOB:*.test.ts, GLOB:*.spec.ts (test scaffolding — separate future Test-node indexer)
 *
 * Node kinds emitted:
 *   - "SourceFile"  (one per .ts/.tsx file with successful AST parse;
 *                    payload.fileExtension = ".ts" | ".tsx";
 *                    payload.importCount = AST-counted ImportDeclaration nodes)
 *
 * Edge kinds emitted:
 *   - "imports"  (structural-edge cluster; one per ImportDeclaration AST node;
 *                 confidence 1.0 for resolved relative imports, 0.5 for package /
 *                 unresolved specifiers; payload.importSpecifier carries raw string)
 *
 * Perf cap (spec §3.3): opts.maxFiles defaults to 200. Files beyond the cap are
 * silently skipped (alphabetically sorted slice). Test fixtures stay small (3-5).
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.8.0 (sprint-087 PR 2.10; Sprint X2 closeout 5/5)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import * as ts from "typescript";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a SourceFile node.
 * Mirrors PR 2.1 SourceFileDeclaration field shapes.
 */
interface SourceFilePayload {
  readonly projectRoot: string;
  /** Absolute path to the .ts/.tsx file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  readonly fileExtension: ".ts" | ".tsx";
  /** Count of `ts.ImportDeclaration` nodes found at top level. */
  readonly importCount: number;
}

/** Edge payload carrying confidence + raw specifier. */
interface ImportsEdgePayload {
  /** Raw import specifier string (e.g. "./types", "@palantirkc/ontology-shared-core"). */
  readonly importSpecifier: string;
  /**
   * confidence:
   *   1.0 = relative path resolved to an in-tree file (existsSync check)
   *   0.5 = package-name OR unresolved relative path
   */
  readonly confidence: 1.0 | 0.5;
  /** When confidence=1.0, absolute path to the resolved import target. */
  readonly resolvedPath?: string;
}

// ─── Brand helpers (local; mirrors PR 2.4-2.9 indexer pattern) ────────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from absolute file path.
 * sha256(absolutePath + "#SourceFile") — consistent across runs.
 */
function ridFromFilePath(absolutePath: string): NodeRid {
  const hash = createHash("sha256").update(`${absolutePath}#SourceFile`).digest("hex");
  return nodeRid(`source-file:${hash}`);
}

/**
 * Deterministic EdgeRid from fromRid + toRid + specifier + index.
 * Index disambiguates multiple imports from the same file resolving to the same target.
 */
function edgeRidFromImport(
  from: NodeRid,
  to: NodeRid,
  specifier: string,
  index: number,
): EdgeRid {
  const hash = createHash("sha256")
    .update(`${from}:imports:${to}:${specifier}:${index}`)
    .digest("hex");
  return edgeRid(`source-file-edge:${hash}`);
}

// ─── Glob helpers (mirrors PR 2.4-2.9 indexer pattern) ────────────────────────

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

// ─── targetGlob → base directory resolution (spec §3.3) ───────────────────────

/**
 * Resolves opts.targetGlob to an absolute base directory under projectRoot.
 * Strips a trailing `/**\/*.ts` or `/**\/*.tsx` suffix; falls back to the
 * literal subdirectory + recursive descent. The recursive walk discovers all
 * .ts/.tsx files under the resolved base; extension filtering happens in the
 * file collector.
 */
function resolveBaseFromTargetGlob(projectRoot: string, targetGlob: string): string {
  // Strip common trailing glob patterns
  let stripped = targetGlob;
  const trailingPatterns = [
    "/**/*.ts",
    "/**/*.tsx",
    "/**/*",
    "/**",
    "/*",
  ];
  for (const tp of trailingPatterns) {
    if (stripped.endsWith(tp)) {
      stripped = stripped.slice(0, -tp.length);
      break;
    }
  }
  // Empty prefix → projectRoot itself
  if (stripped === "" || stripped === ".") {
    return projectRoot;
  }
  // Absolute prefix passes through
  if (path.isAbsolute(stripped)) {
    return stripped;
  }
  // Otherwise relative to projectRoot
  return path.join(projectRoot, stripped);
}

// ─── Module specifier resolution (spec §3.6; mirrors ast-walker path-utils) ──

/**
 * Resolves a module specifier from an import declaration to an absolute path.
 * Returns null when the specifier is a package name or cannot be resolved.
 * Tries .ts/.tsx and /index.ts/.tsx variants.
 */
function resolveModuleSpecifier(specifier: string, sourceFilePath: string): string | null {
  // Package name or aliased path → unresolved
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }
  const base = path.dirname(sourceFilePath);
  const candidates = [
    specifier,
    specifier + ".ts",
    specifier + ".tsx",
    specifier + "/index.ts",
    specifier + "/index.tsx",
  ];
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(base, candidate);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return resolved;
      }
    } catch {
      // ignore stat errors; try next candidate
    }
  }
  return null;
}

// ─── File collection helper (recursive readdir; ts/tsx only) ──────────────────

/**
 * Recursively collects all .ts/.tsx file paths under baseDir, honoring excludeGlobs.
 * Returns empty array when the base directory does not exist.
 */
async function collectSourceFiles(
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
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
      // Filter declaration + test scaffolding
      if (entry.name.endsWith(".d.ts")) continue;
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts")) continue;

      results.push(candidate);
    }
  }

  await walk(baseDir);
  return results;
}

// ─── AST import extraction (spec §3.1 step 7) ─────────────────────────────────

interface ExtractedImport {
  readonly specifier: string;
}

/**
 * Walks top-level statements of a parsed SourceFile and collects every
 * `ts.ImportDeclaration`. Returns the raw module specifier strings.
 *
 * Catches: default imports, named imports, namespace imports, side-effect
 * imports, and `import type` forms — TS Compiler API unifies them under
 * the single `ts.isImportDeclaration` predicate.
 *
 * Intentionally excludes:
 *   - `import()` expression form (dynamic imports inside function bodies)
 *   - `import x = require(...)` (CommonJS-style; rare in modern TS modules)
 *   - re-export `export { x } from "..."` declarations (separate "export" edge kind)
 */
function extractImports(sourceFile: ts.SourceFile): ExtractedImport[] {
  const imports: ExtractedImport[] = [];
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      const moduleSpec = stmt.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpec)) {
        imports.push({ specifier: moduleSpec.text });
      }
    }
  }
  return imports;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk .ts/.tsx files in scope and produce a flat { nodes, edges } fragment
 * consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer endpoint reconciliation (e.g. wiring an `imports` edge to a
 * Hook NodeRid emitted by plugin-manifest.ts) is the orchestration layer's job.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.targetGlob — glob pattern relative to projectRoot (default "lib/**\/*.ts").
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.maxFiles — perf cap on # parsed files (default 200).
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexSourceFilesImports(
  projectRoot: string,
  opts?: {
    readonly targetGlob?: string;
    readonly excludeGlobs?: ReadonlyArray<string>;
    readonly maxFiles?: number;
    readonly nowIso?: string;
  },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const targetGlob = opts?.targetGlob ?? "lib/**/*.ts";
  const maxFiles = opts?.maxFiles ?? 200;
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
    "**/*.d.ts",
    "**/*.test.ts",
    "**/*.spec.ts",
  ];

  // ── Discovery: resolve targetGlob → base dir, walk recursively ────────────
  const baseDir = resolveBaseFromTargetGlob(projectRoot, targetGlob);
  const allFiles = await collectSourceFiles(baseDir, excludeGlobs);

  // ── Perf cap: sort alphabetically for determinism + slice ─────────────────
  allFiles.sort();
  const cappedFiles = allFiles.slice(0, maxFiles);

  // ── Pre-compute the per-file SourceFile NodeRids for cross-file imports ───
  const fileRidMap = new Map<string, NodeRid>();
  for (const fp of cappedFiles) {
    fileRidMap.set(fp, ridFromFilePath(fp));
  }

  // ── Emit SourceFile nodes + imports edges ────────────────────────────────
  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  for (const absPath of cappedFiles) {
    // Defensive — already filtered in collect
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;

    // Stat
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absPath);
    } catch {
      continue;
    }

    // Read content + AST parse
    let raw: string;
    try {
      raw = await fs.promises.readFile(absPath, "utf-8");
    } catch {
      continue;
    }

    const fileExtension: ".ts" | ".tsx" = absPath.endsWith(".tsx") ? ".tsx" : ".ts";
    const scriptKind = fileExtension === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

    let parsedSourceFile: ts.SourceFile;
    try {
      parsedSourceFile = ts.createSourceFile(
        absPath,
        raw,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ false,
        scriptKind,
      );
    } catch {
      // Parse failure — skip silently (permissive policy)
      continue;
    }

    const extracted = extractImports(parsedSourceFile);

    // Emit SourceFile node (one per parsed .ts/.tsx file)
    const sourceFileRid = fileRidMap.get(absPath) ?? ridFromFilePath(absPath);
    const sourceFilePayload: SourceFilePayload = {
      projectRoot,
      filePath: absPath,
      lastIndexed: nowIso,
      byteSize: stat.size,
      fileExtension,
      importCount: extracted.length,
    };
    const sourceFileNode: NodeRecord<SourceFilePayload> = {
      rid: sourceFileRid,
      kind: "SourceFile",
      value: sourceFilePayload,
    };
    nodes.push(sourceFileNode);

    // Emit one "imports" edge per ImportDeclaration
    extracted.forEach((imp, idx) => {
      const resolvedPath = resolveModuleSpecifier(imp.specifier, absPath);

      let toRid: NodeRid;
      let confidence: 1.0 | 0.5;
      let resolvedPathField: string | undefined;

      if (resolvedPath !== null) {
        // Relative path resolved — confidence 1.0
        // toRid points at the resolved file's own SourceFile NodeRid (computed deterministically)
        toRid = fileRidMap.get(resolvedPath) ?? ridFromFilePath(resolvedPath);
        confidence = 1.0;
        resolvedPathField = resolvedPath;
      } else {
        // Package / aliased path — confidence 0.5; synthetic package NodeRid
        toRid = nodeRid(`source-file-pkg:${imp.specifier}`);
        confidence = 0.5;
        resolvedPathField = undefined;
      }

      const importsEdge: EdgeRecord<ImportsEdgePayload> = {
        rid: edgeRidFromImport(sourceFileRid, toRid, imp.specifier, idx),
        kind: "imports",
        fromRid: sourceFileRid,
        toRid,
        value: {
          importSpecifier: imp.specifier,
          confidence,
          ...(resolvedPathField !== undefined ? { resolvedPath: resolvedPathField } : {}),
        },
      };
      edges.push(importsEdge);
    });
  }

  return { nodes, edges };
}
