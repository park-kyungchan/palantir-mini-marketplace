import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { composeSubrepoReadOnlyApplicationState } from "../../../lib/ontology-context/subrepo-read-only-index";
import { composeOntologyRiskContext } from "../../../lib/ontology-context/risk-context";
import type { ApplicationStateProjection } from "../../../lib/ontology-context/application-state";

function appState(projectRoot: string): ApplicationStateProjection {
  const subrepoReadOnlyApplicationState = composeSubrepoReadOnlyApplicationState(projectRoot);
  return {
    status: "composed",
    project: projectRoot,
    repoState: { available: true, modifiedCount: 0, stagedCount: 0, untrackedCount: 0 },
    branch: { available: true, name: "main" },
    activeWorktree: { available: true, worktrees: [] },
    promptIdentity: { promptId: null, promptHash: null },
    scopePaths: [],
    userNonGoals: [],
    runtimeCapabilitySurface: { available: true, totalCapabilities: 0, perCategory: {} },
    visibleMcpTools: { available: true, count: 0, names: [] },
    activeRules: { available: true, count: 0, ruleIds: [] },
    activeHooks: {
      available: true,
      eventCount: 0,
      events: [],
      compatibilityNote: "activeHooks is a compatibility alias for sharedHookIntentEvents.",
    },
    sharedHookIntentEvents: { available: true, eventCount: 0, events: [] },
    codexMountedHookEvents: { available: true, eventCount: 0, events: [] },
    currentDirtyState: { available: true, dirtyFileCount: 0 },
    subrepoReadOnlyApplicationState,
    otherSessionWorkSignals: { available: true, signals: [] },
    composedAt: "2026-05-21T00:00:00.000Z",
  };
}

describe("subrepo read-only application state and risk context", () => {
  test("projects dirty and mismatch manifest state without repository mutation", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-subrepo-risk-"));
    try {
      const manifestPath = path.join(projectRoot, ".palantir-mini/subrepos/read-only-index.json");
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify({
        subrepos: [
          { path: "projects/mathcrew", dirty: true, head: "a", expectedHead: "b" },
          {
            path: "projects/generated",
            status: "dirty",
            dirtyEntryCount: 2,
            dirtyEntries: [
              { path: "src/generated/a.ts", status: "modified" },
              { path: "src/generated/b.ts", status: "untracked" },
            ],
            remoteBranch: "origin/main",
            remoteBranchMatchesLocal: false,
          },
        ],
      }));

      const state = composeSubrepoReadOnlyApplicationState(projectRoot);
      const risk = composeOntologyRiskContext({ applicationState: appState(projectRoot) });

      expect(state.available).toBe(true);
      expect(state.readOnly).toBe(true);
      expect(state.dirtyPaths[0]).toContain("projects/mathcrew");
      expect(state.mismatchPaths[0]).toContain("projects/mathcrew");
      expect(state.dirtyPaths.some((item) => item.includes("projects/generated"))).toBe(true);
      expect(state.mismatchPaths.some((item) => item.includes("projects/generated"))).toBe(true);
      expect(state.dirtyDetails.find((item) => item.path.includes("projects/generated"))?.dirtyEntryCount).toBe(2);
      expect(risk.risks.map((item) => item.riskId).join("\n")).toContain("subrepo.dirty");
      expect(risk.risks.map((item) => item.riskId).join("\n")).toContain("subrepo.mismatch");
      expect(risk.risks.map((item) => item.riskId).join("\n")).toContain("subrepo.dirty-entry");
      expect(risk.risks.map((item) => item.riskId).join("\n")).toContain("subrepo.remote-branch-mismatch");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
