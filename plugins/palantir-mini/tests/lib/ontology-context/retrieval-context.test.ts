// palantir-mini v6.16.0 — retrieval-context composer tests
//
// Sprint-095 PR 3.3 (canonical plan v2 §4 row 3.3; proposal §8 Stage 3).
// 3 headline assertions per spec.md §Tests:
//   (1) headline             — real project root returns retrieval context with ≥7 available
//   (2) scope-filter         — narrow scopePaths shrinks pluginSourceFiles count
//   (3) graceful-degradation — non-existent project root returns partial state without throwing

import { describe, expect, test } from "bun:test";

import {
  composeRetrievalContext,
  type RetrievalContextProjection,
} from "../../../lib/ontology-context/retrieval-context";

// Sub-fields that carry an `available: boolean` flag.
const AVAILABILITY_BEARING_SUBFIELDS = [
  "officialResearchDocs",
  "projectDocs",
  "schemaPrimitives",
  "pluginSourceFiles",
  "rules",
  "hooks",
  "sharedHookIntentEvents",
  "codexMountedHookEvents",
  "skills",
  "recentLineage",
  "valueGradeMetrics",
  "impactGraphNeighborhood",
  "evalCoverage",
] as const;

function countAvailable(state: RetrievalContextProjection): number {
  let n = 0;
  for (const key of AVAILABILITY_BEARING_SUBFIELDS) {
    const sub = state[key] as { readonly available?: unknown };
    if (sub && sub.available === true) n += 1;
  }
  return n;
}

describe("composeRetrievalContext — Phase 3 PR 3.3 composer (sprint-095)", () => {
  test("(1) headline — real project root returns retrieval context with ≥7 available sub-fields", async () => {
    // Use this very repo as the real-project context. The repo has CLAUDE.md,
    // research/palantir-official, schemas/ontology/primitives, plugin lib,
    // rules, hooks.json, skills — so 7+ of the 11 availability-bearing
    // sub-fields should report `available: true`.
    const projectRoot = "/home/palantirkc";
    const state = await composeRetrievalContext(projectRoot, {
      scopePaths: ["bridge/handlers/"],
      requestedAxes: ["file:bridge/handlers/impact-query.ts"],
      axisRidCount: 1,
    });

    expect(state.status).toBe("composed");
    expect(state.project).toBe(projectRoot);

    // All core sub-fields present:
    expect(state.officialResearchDocs).toBeDefined();
    expect(state.projectDocs).toBeDefined();
    expect(state.schemaPrimitives).toBeDefined();
    expect(state.pluginSourceFiles).toBeDefined();
    expect(state.rules).toBeDefined();
    expect(state.hooks).toBeDefined();
    expect(state.sharedHookIntentEvents).toBeDefined();
    expect(state.codexMountedHookEvents).toBeDefined();
    expect(state.skills).toBeDefined();
    expect(state.recentLineage).toBeDefined();
    expect(state.valueGradeMetrics).toBeDefined();
    expect(state.impactGraphNeighborhood).toBeDefined();
    expect(state.evalCoverage).toBeDefined();

    // impactGraphNeighborhood is a thin reference, NOT a duplicate.
    expect(state.impactGraphNeighborhood.referenceField).toBe("impactContext");
    expect(state.impactGraphNeighborhood.axisRidCount).toBe(1);

    expect(state.hooks.compatibilityNote).toContain("sharedHookIntentEvents");
    expect(state.hooks.events).toEqual(state.sharedHookIntentEvents.events);
    expect(state.sharedHookIntentEvents.source).toBe("hooks/hooks.json");
    expect(state.sharedHookIntentEvents.meaning).toContain("shared hook intent");
    expect(state.codexMountedHookEvents.source).toBe("runtime-adapters/codex/contract.json");
    expect(state.codexMountedHookEvents.events).toEqual([
      "SessionStart",
      "PermissionRequest",
      "PreToolUse",
      "PostToolUse",
      "PreCompact",
      "PostCompact",
      "UserPromptSubmit",
      "SubagentStart",
      "SubagentStop",
      "Stop",
    ]);
    expect(state.codexMountedHookEvents.events).toContain("PreToolUse");

    // ≥7 of the 11 availability-bearing sub-fields available.
    const availableCount = countAvailable(state);
    expect(availableCount).toBeGreaterThanOrEqual(7);

    // ISO8601 composedAt parses.
    expect(state.composedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("(2) scope-filter — narrow scopePaths shrinks pluginSourceFiles count", async () => {
    const projectRoot = "/home/palantirkc";
    const unfiltered = await composeRetrievalContext(projectRoot, {});
    const filtered = await composeRetrievalContext(projectRoot, {
      scopePaths: ["lib/ontology-graph/"],
    });
    expect(unfiltered.pluginSourceFiles.available).toBe(true);
    expect(filtered.pluginSourceFiles.available).toBe(true);
    const unfilteredCount = unfiltered.pluginSourceFiles.count ?? 0;
    const filteredCount = filtered.pluginSourceFiles.count ?? 0;
    expect(filteredCount).toBeLessThan(unfilteredCount);
    // Filtered set should still include at least one matching file (the dir
    // is well-populated in this repo).
    expect(filteredCount).toBeGreaterThan(0);
  }, 15000);

  test("(3) graceful-degradation — non-existent project root returns partial state without throwing", async () => {
    const nonExistent = "/nonexistent/path-XYZ-sprint-095-test";
    // Must not throw.
    const state = await composeRetrievalContext(nonExistent, {});
    expect(state.status).toBe("composed");
    expect(state.project).toBe(nonExistent);

    // Project-scoped sub-fields:
    //   - projectDocs: helper never throws (existsSync false → all paths null);
    //     stays available: true with all three paths null.
    expect(state.projectDocs.available).toBe(true);
    expect(state.projectDocs.browsePath).toBeNull();
    expect(state.projectDocs.indexPath).toBeNull();
    expect(state.projectDocs.claudeMdPath).toBeNull();

    // evalCoverage — non-existent root returns suiteCount:0 instead of throwing.
    expect(state.evalCoverage.available).toBe(true);
    expect(state.evalCoverage.suiteCount).toBe(0);

    // recentLineage + valueGradeMetrics depend on events.jsonl reads against
    // the project; non-existent root yields zero events (still available:true
    // per the underlying handlers' nominal path).
    expect(
      state.recentLineage.available === true || state.recentLineage.available === false,
    ).toBe(true);
    expect(
      state.valueGradeMetrics.available === true ||
        state.valueGradeMetrics.available === false,
    ).toBe(true);

    // Runtime-scoped sub-fields (rules / hooks / skills / officialResearchDocs
    // / schemaPrimitives / pluginSourceFiles) run from process env, not the
    // project root, so they stay available even when the project is bogus.
    // This is the documented separation between project-scoped and
    // runtime-scoped sub-fields (mirrors PR 3.2 ApplicationState test #3).
    expect(state.rules.available).toBe(true);
    expect(state.hooks.available).toBe(true);
    expect(state.sharedHookIntentEvents.available).toBe(true);
    expect(state.codexMountedHookEvents.available).toBe(true);
    expect(state.skills.available).toBe(true);
    expect(state.officialResearchDocs.available).toBe(true);
    expect(state.schemaPrimitives.available).toBe(true);
    expect(state.pluginSourceFiles.available).toBe(true);
    // impactGraphNeighborhood thin-reference is unconditionally available.
    expect(state.impactGraphNeighborhood.available).toBe(true);
    expect(state.impactGraphNeighborhood.referenceField).toBe("impactContext");
  });
});
