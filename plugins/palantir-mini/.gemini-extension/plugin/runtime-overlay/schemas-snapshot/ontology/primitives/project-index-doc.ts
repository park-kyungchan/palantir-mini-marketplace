/**
 * @stable — ProjectIndexDoc primitive (prim-data-16, v1.0.0)
 *
 * Typed pointer to a project's INDEX.md file. Mirrors the ProjectBrowseDoc
 * shape exactly but targets INDEX.md (which explains structure + provenance +
 * authority boundaries, as distinct from BROWSE.md which provides the query
 * router). Both are graph nodes in the Phase 2 ImpactGraph; they receive
 * separate typed edges because their semantic roles differ.
 *
 * The PR 2.4 indexer reads `<projectRoot>/INDEX.md` and populates instances.
 * This primitive declares the shape only.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/project-index-doc.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (filesystem metadata node — mirrors ProjectBrowseDoc shape)
 * @owner palantirkc-ontology
 * @purpose ProjectIndexDoc graph-node identity (Phase 2 ImpactGraph node-type)
 */

export type ProjectIndexDocRid = string & { readonly __brand: "ProjectIndexDocRid" };
export const projectIndexDocRid = (s: string): ProjectIndexDocRid =>
  s as ProjectIndexDocRid;

export interface ProjectIndexDocDeclaration {
  readonly rid: ProjectIndexDocRid;
  /** Absolute path to the project root containing this INDEX.md. */
  readonly projectRoot: string;
  /** Absolute path to the INDEX.md file. */
  readonly filePath: string;
  /** ISO 8601 timestamp when the indexer last read and indexed this file. */
  readonly lastIndexed: string;
  /** Byte size of the INDEX.md file at lastIndexed time. */
  readonly byteSize: number;
}

export function isProjectIndexDocDeclaration(x: unknown): x is ProjectIndexDocDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as ProjectIndexDocDeclaration;
  return (
    typeof d.rid === "string" &&
    d.rid.length > 0 &&
    typeof d.projectRoot === "string" &&
    typeof d.filePath === "string" &&
    typeof d.lastIndexed === "string" &&
    typeof d.byteSize === "number"
  );
}
