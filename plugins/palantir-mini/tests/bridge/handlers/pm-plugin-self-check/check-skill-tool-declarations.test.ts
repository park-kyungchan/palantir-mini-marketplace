/**
 * palantir-mini — check-skill-tool-declarations tests (P1-11 skill→tool binding guard)
 *
 * Covers:
 *   1. Live-repo green gate: checkSkillToolDeclarations() → pass, danglingRefs === []
 *      (this is the P1-10 completion gate — passes ONLY after the 18 dangling refs
 *      are remediated).
 *   2. skillCount pin (45 current SKILL.md files).
 *   3. Pure classifier isolation: classifySkillTool returns null for a live tool,
 *      dangling-unknown for an unknown tool, dangling-removed (with replacement)
 *      for a dep-map tool.
 *   4. Integration: pmPluginSelfCheck({ mode: "skills" }) carries the result + axis.
 *   5. Release-mode wiring: pmPluginSelfCheck({ mode: "release" }) gates on it.
 */

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { pmPluginSelfCheck } from "../../../../bridge/handlers/pm-plugin-self-check";
import {
  checkSkillToolDeclarations,
  classifySkillTool,
} from "../../../../bridge/handlers/pm-plugin-self-check/check-skill-tool-declarations";

const eventsEnv = () => {
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "pm-stc-"));
  process.env.PALANTIR_MINI_PROJECT = dir;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(dir, "events.jsonl");
};

describe("check-skill-tool-declarations (P1-11)", () => {
  test("1. live repo: every skill allowed-tools ref resolves to a live TOOLS entry", () => {
    const r = checkSkillToolDeclarations();
    expect(r.status).toBe("pass");
    expect(r.danglingRefs).toEqual([]);
  });

  test("2. skillCount pins to the current SKILL.md count", () => {
    const r = checkSkillToolDeclarations();
    expect(r.skillCount).toBe(45);
  });

  test("3. classifySkillTool — pure classifier isolation", () => {
    const live = new Set(["pm_substrate_query", "commit_edits"]);
    // pm_value_grade_metrics is in DEPRECATION_MAP (removed 6.0.0).
    const removed = new Set(["pm_value_grade_metrics", "replay_lineage"]);

    // Live tool → null (resolves).
    expect(classifySkillTool("pm_substrate_query", live, removed)).toBeNull();

    // Unknown tool (not live, not removed) → dangling-unknown.
    expect(classifySkillTool("does_not_exist", live, removed)).toEqual({
      class: "dangling-unknown",
    });

    // Removed tool → dangling-removed with replacement from the dep-map.
    const removedFinding = classifySkillTool("pm_value_grade_metrics", live, removed);
    expect(removedFinding?.class).toBe("dangling-removed");
    expect(typeof removedFinding?.replacement).toBe("string");
    expect((removedFinding?.replacement ?? "").length).toBeGreaterThan(0);
  });

  test("4. skills mode carries the axis + a pass result", async () => {
    eventsEnv();
    const res = await pmPluginSelfCheck({ mode: "skills" });
    expect(res.skillToolDeclarationsResult.status).toBe("pass");
    expect(res.skillToolDeclarationsResult.danglingRefs).toEqual([]);
    expect(res.activeChecks).toContain("skill-tool-declarations");
  });

  test("5. release mode gates on the skill→tool binding axis", async () => {
    eventsEnv();
    const rel = await pmPluginSelfCheck({ mode: "release" });
    expect(rel.skillToolDeclarationsResult.status).toBe("pass");
    expect(rel.activeChecks).toContain("skill-tool-declarations");
  });
});
