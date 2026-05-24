/**
 * @stable — PullRequest primitive (prim-data-20, v1.0.0)
 *
 * Typed mirror of a `gh pr view --json` row. The PR 2.13 indexer calls the
 * GitHub CLI and populates instances. Field names match `gh pr view --json`
 * output keys: `number → prNumber`, `headRefName → branchName`, etc.
 *
 * `repoSlug` is `"<owner>/<repo>"` (e.g. "park-kyungchan/palantirkc").
 * `mergeable` is the GitHub-native value: "MERGEABLE" | "CONFLICTING" |
 * "UNKNOWN" — matches rule 25 §Default-On Policy auto-merge gate.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/pull-request.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (GitHub PR metadata node — immutable after merge)
 * @owner palantirkc-ontology
 * @purpose PullRequest graph-node identity (Phase 2 ImpactGraph node-type)
 */

/** GitHub-native mergeability enum (matches `gh pr view --json mergeable`). */
export type PRMergeability = "MERGEABLE" | "CONFLICTING" | "UNKNOWN";

export type PullRequestRid = string & { readonly __brand: "PullRequestRid" };
export const pullRequestRid = (s: string): PullRequestRid => s as PullRequestRid;

export interface PullRequestDeclaration {
  readonly prNumber: PullRequestRid;
  /** `"<owner>/<repo>"` slug (e.g. "park-kyungchan/palantirkc"). */
  readonly repoSlug: string;
  /** Head branch name (`gh pr view --json headRefName`). */
  readonly branchName: string;
  /** Whether the PR is a draft (`gh pr view --json isDraft`). */
  readonly isDraft: boolean;
  /** GitHub mergeability status (`gh pr view --json mergeable`). */
  readonly mergeable: PRMergeability;
  /** ISO 8601 merge timestamp; absent for open/unmerged PRs. */
  readonly mergedAt?: string;
  /** Full SHA of the merge commit; absent for open/unmerged PRs. */
  readonly mergedSha?: string;
  /** PR title (`gh pr view --json title`). */
  readonly title: string;
}

export function isPullRequestDeclaration(x: unknown): x is PullRequestDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as PullRequestDeclaration;
  return (
    typeof d.prNumber === "string" &&
    d.prNumber.length > 0 &&
    typeof d.repoSlug === "string" &&
    typeof d.branchName === "string" &&
    typeof d.isDraft === "boolean" &&
    typeof d.mergeable === "string" &&
    typeof d.title === "string"
  );
}
