import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Walk upward from `start` looking for a `.palantir-mini/` directory.
 * Returns the project root containing it, or null if not found.
 *
 * Runtime-neutral: `.palantir-mini/` is the cross-runtime per-project session
 * marker (rule 27 — both Claude and Codex append events there), so project-root
 * detection belongs in the neutral `lib/project/` layer, not in a sprint hook.
 * Extracted from the (removed) `hooks/harness-base-mode-advisory.ts` during the
 * W3 sprint-GAN REPLACE wave; logic is unchanged.
 */
export function findProjectRoot(start: string): string | null {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (fs.existsSync(path.join(cur, ".palantir-mini"))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return null;
}

/**
 * A directory that must NOT be treated as a project root even if it carries a
 * stray `.palantir-mini/` marker: the user's HOME itself and the system temp
 * dirs. A file sitting DIRECTLY in one of these is not "in a project" — only a
 * deeper subdir with its own marker is. Bounds the structural membership check
 * (FIX 2) so a $HOME/.palantir-mini marker does not make EVERY .ts under HOME
 * (incl. pm's own source) falsely guarded.
 */
export function isExcludedProjectRoot(dir: string): boolean {
  const resolved = path.resolve(dir);
  const excluded = [os.homedir(), os.tmpdir(), "/tmp", "/var/tmp"].map((d) => path.resolve(d));
  return excluded.includes(resolved);
}
