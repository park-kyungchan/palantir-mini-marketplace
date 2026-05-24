/**
 * @stable — ProjectBrowseDoc primitive (prim-data-15, v1.0.0)
 *
 * Typed pointer to a project's BROWSE.md file. Enables the PR 2.4 indexer to
 * register BROWSE.md as a graph node with provenance metadata (lastIndexed,
 * byteSize) so the ImpactGraph can surface "which BROWSE.md did this agent
 * consult?" via edges to UserPrompt / ContextCapsule nodes.
 *
 * The PR 2.4 indexer reads `<projectRoot>/BROWSE.md` (or project-local paths)
 * and populates instances of this node. This primitive declares the shape only.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/project-browse-doc.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (filesystem metadata node — no logic, no action)
 * @owner palantirkc-ontology
 * @purpose ProjectBrowseDoc graph-node identity (Phase 2 ImpactGraph node-type)
 */

export type ProjectBrowseDocRid = string & { readonly __brand: "ProjectBrowseDocRid" };
export const projectBrowseDocRid = (s: string): ProjectBrowseDocRid =>
  s as ProjectBrowseDocRid;

export interface ProjectBrowseDocDeclaration {
  readonly rid: ProjectBrowseDocRid;
  /** Absolute path to the project root containing this BROWSE.md. */
  readonly projectRoot: string;
  /** Absolute path to the BROWSE.md file. */
  readonly filePath: string;
  /** ISO 8601 timestamp when the indexer last read and indexed this file. */
  readonly lastIndexed: string;
  /** Byte size of the BROWSE.md file at lastIndexed time. */
  readonly byteSize: number;
}

export function isProjectBrowseDocDeclaration(x: unknown): x is ProjectBrowseDocDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as ProjectBrowseDocDeclaration;
  return (
    typeof d.rid === "string" &&
    d.rid.length > 0 &&
    typeof d.projectRoot === "string" &&
    typeof d.filePath === "string" &&
    typeof d.lastIndexed === "string" &&
    typeof d.byteSize === "number"
  );
}
