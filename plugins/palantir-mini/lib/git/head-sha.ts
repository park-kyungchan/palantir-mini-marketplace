// palantir-mini — shared per-project git HEAD resolver (lineage atopWhich anchor).
//
// THE single resolver for the events.jsonl 5-dim `atopWhich` anchor, which the
// design authority (ssot/palantir/ontology/approval-and-lineage.md) requires to
// be a COMMIT SHA — the substrate state a decision was made atop.
//
// History: this replaced a hand-rolled .git/HEAD parser that fell through to the
// SYMBOLIC ref ("refs/heads/<branch>") whenever HEAD was symbolic AND the loose
// ref file (.git/refs/heads/<branch>) was absent — i.e. the NORMAL packed-refs
// state after `git gc` / `git pack-refs` / a fresh clone, where the ref lives
// only in .git/packed-refs. That fallthrough corrupted the lineage anchor with a
// ref name instead of a SHA. `git rev-parse HEAD` consults packed-refs natively,
// so it always yields a 40-hex SHA when the repo has a commit.
//
// NOT cached: governed actions (e.g. drift_rebind) create commits that move HEAD
// WITHIN one MCP server process; a process-lifetime cache would stamp a STALE
// anchor on the very rebind commit. `git rev-parse` is cheap relative to the
// governed action, so we resolve fresh on every call.

import { execSync } from "child_process";

/**
 * Resolve the current git HEAD commit SHA for `project`.
 *
 * @param project absolute path to the project root (the git working tree)
 * @returns a 40-hex commit SHA when `project` is a git repo with a commit,
 *          or the sentinel `"no-git"` on any failure (not a repo, no commit,
 *          git unavailable). NEVER returns a symbolic ref.
 */
export function gitHeadSha(project: string): string {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "no-git";
  }
}
