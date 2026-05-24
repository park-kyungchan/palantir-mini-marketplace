/**
 * @stable — Commit primitive (prim-data-19, v1.0.0)
 *
 * Typed mirror of a single `git log` row. The PR 2.13 indexer reads
 * `git log --format=json` (or equivalent) and populates instances. The
 * canonical primary key is `commitSha` (full 40-char hex). Enables the
 * ImpactGraph to answer "which commits touched source file X?" and "which
 * PR merged commit C?" via PR 2.2 edges.
 *
 * Field names match `git log` format placeholders:
 *   commitSha (%H), authorEmail (%ae), committedAt (%cI), parentShas (%P),
 *   branchName (from refs/heads/ parse), messageFirstLine (%s).
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/commit.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (immutable git-object metadata node)
 * @owner palantirkc-ontology
 * @purpose Commit graph-node identity (Phase 2 ImpactGraph node-type)
 */

export type CommitRid = string & { readonly __brand: "CommitRid" };
export const commitRid = (s: string): CommitRid => s as CommitRid;

export interface CommitDeclaration {
  /** Full 40-char SHA-1 hex digest — the canonical primary key. */
  readonly commitSha: CommitRid;
  /** Absolute path to the git repository root (`git rev-parse --show-toplevel`). */
  readonly repoRoot: string;
  /** Branch name at time of indexing (may be empty for detached HEAD). */
  readonly branchName: string;
  /** Commit author email (`%ae` format placeholder). */
  readonly authorEmail: string;
  /** ISO 8601 committer timestamp (`%cI` format placeholder). */
  readonly committedAt: string;
  /** Space-separated parent SHA list (`%P`); empty for root commit. */
  readonly parentShas: ReadonlyArray<string>;
  /** First line of the commit message (`%s` format placeholder). */
  readonly messageFirstLine: string;
}

export function isCommitDeclaration(x: unknown): x is CommitDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as CommitDeclaration;
  return (
    typeof d.commitSha === "string" &&
    d.commitSha.length > 0 &&
    typeof d.repoRoot === "string" &&
    typeof d.branchName === "string" &&
    typeof d.authorEmail === "string" &&
    typeof d.committedAt === "string" &&
    Array.isArray(d.parentShas) &&
    typeof d.messageFirstLine === "string"
  );
}
