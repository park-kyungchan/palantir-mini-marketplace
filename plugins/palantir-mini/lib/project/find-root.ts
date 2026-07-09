import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * True when `dir`'s absolute path contains `.palantir-mini` as a path segment
 * (i.e. `dir` sits inside — or is — a `.palantir-mini/` marker tree). Such a
 * directory can never be accepted as a project root: a stray marker minted
 * inside a project's OWN `.palantir-mini/session/**` output tree (e.g. by a
 * hook writing under `<root>/.palantir-mini/session/prompt-front-door/`) must
 * not latch findProjectRoot onto that nested dir instead of the real outer
 * root. Guards against the double-nested-events.jsonl bug (g10).
 */
function isInsideMarkerTree(dir: string): boolean {
  return dir.split(path.sep).includes(".palantir-mini");
}

/**
 * Walk upward from `start` looking for a `.palantir-mini/` directory.
 * Returns the project root containing it, or null if not found.
 *
 * Runtime-neutral: `.palantir-mini/` is the cross-runtime per-project session
 * marker (rule 27 — both Claude and Codex append events there), so project-root
 * detection belongs in the neutral `lib/project/` layer, not in a sprint hook.
 * Extracted from the (removed) `hooks/harness-base-mode-advisory.ts` during the
 * W3 sprint-GAN REPLACE wave; logic is unchanged.
 *
 * Deliberately does NOT bake in `isExcludedProjectRoot()` (HOME / tmp dirs):
 * several existing callers (e.g. hooks/ontology-drift-fold.ts,
 * hooks/second-brain-fold.ts) rely on getting the excluded dir itself back
 * from this walk so their OWN post-hoc `isExcludedProjectRoot(root)` check can
 * fire and short-circuit with a distinct "excluded project root" message.
 * Callers that need the walk itself to look past an excluded ancestor (e.g.
 * an ambient stray marker at `/tmp`) should filter the result themselves —
 * see `scripts/log.ts`'s `resolveEmitRoot()`.
 */
export function findProjectRoot(start: string): string | null {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (!isInsideMarkerTree(cur) && fs.existsSync(path.join(cur, ".palantir-mini"))) {
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
