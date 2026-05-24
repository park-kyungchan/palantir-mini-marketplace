/**
 * tmpl-regen-idempotent — enforces that every committed skills/<name>/SKILL.md
 * matches the output of the latest gen-skill-docs.ts run against its .tmpl.
 *
 * Run by CI-analog in the ship flow; failure here means a .tmpl change was
 * not followed by `bun run gen:skill-docs && git add skills/**\/SKILL.md`.
 */

import { describe, test, expect } from "bun:test";
import { spawnSync } from "child_process";
import * as path from "path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

describe("gen-skill-docs idempotent", () => {
  test("dry-run exits 0 (no stale SKILL.md files)", () => {
    const result = spawnSync(
      "bun",
      ["run", path.join(PLUGIN_ROOT, "scripts/gen-skill-docs.ts"), "--dry-run"],
      {
        cwd: PLUGIN_ROOT,
        encoding: "utf-8",
      },
    );

    const combined = `${result.stdout}\n${result.stderr}`;
    if (result.status !== 0) {
      console.error("gen-skill-docs --dry-run output:\n" + combined);
    }
    expect(result.status).toBe(0);

    const staleLines = combined.split("\n").filter((l) => l.startsWith("STALE "));
    expect(staleLines).toEqual([]);
  });
});
