/**
 * @stable — SourceFile primitive (prim-data-17, v1.0.0)
 *
 * Graph-node identity for a single source file in the project. Node-only —
 * `imports` edges (pointing from this node to other SourceFile / McpHandler
 * nodes) are declared in PR 2.2. The PR 2.10 AST indexer reads the filesystem
 * and populates instances; the primary key is the combination of projectRoot +
 * relativePath.
 *
 * `language` uses common MIME-type-adjacent short names: "typescript",
 * "javascript", "json", "markdown", "shell", etc.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/source-file.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (filesystem metadata node — no logic, no action)
 * @owner palantirkc-ontology
 * @purpose SourceFile graph-node identity (Phase 2 ImpactGraph node-type)
 */

export type SourceFileRid = string & { readonly __brand: "SourceFileRid" };
export const sourceFileRid = (s: string): SourceFileRid => s as SourceFileRid;

export interface SourceFileDeclaration {
  readonly fileId: SourceFileRid;
  /** Absolute path to the project root that owns this file. */
  readonly projectRoot: string;
  /** Path relative to projectRoot (e.g. "src/lib/foo.ts"). */
  readonly relativePath: string;
  /** Source language short name (e.g. "typescript", "json", "markdown"). */
  readonly language: string;
  /** Byte size at lastModified time. */
  readonly byteSize: number;
  /** ISO 8601 timestamp of last modification (from filesystem mtime). */
  readonly lastModified: string;
}

export function isSourceFileDeclaration(x: unknown): x is SourceFileDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as SourceFileDeclaration;
  return (
    typeof d.fileId === "string" &&
    d.fileId.length > 0 &&
    typeof d.projectRoot === "string" &&
    typeof d.relativePath === "string" &&
    typeof d.language === "string" &&
    typeof d.byteSize === "number" &&
    typeof d.lastModified === "string"
  );
}
