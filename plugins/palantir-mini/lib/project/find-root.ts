import * as fs from "fs";
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
