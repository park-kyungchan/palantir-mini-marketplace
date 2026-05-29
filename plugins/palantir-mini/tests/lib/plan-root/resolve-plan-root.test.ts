import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import {
  isCanonicalPlanPath,
  isLegacyClaudePlanPath,
  isPlanArtifactPath,
  resolveCanonicalPlanRoot,
  resolveLegacyClaudePlanRoot,
  resolvePlanArtifactPath,
} from "../../../lib/plan-root/resolve-plan-root";

describe("plan-root resolver", () => {
  test("defaults Codex durable plans to project .palantir-mini/plan", () => {
    const projectRoot = "/workspace/example";
    expect(resolveCanonicalPlanRoot({ projectRoot })).toBe(
      path.join(projectRoot, ".palantir-mini", "plan"),
    );
    expect(resolvePlanArtifactPath("handoff.md", { projectRoot })).toBe(
      path.join(projectRoot, ".palantir-mini", "plan", "handoff.md"),
    );
  });

  test("keeps legacy Claude plans as read-compatible artifact paths", () => {
    const home = "/home/tester";
    expect(resolveLegacyClaudePlanRoot({ home })).toBe(path.join(home, ".claude", "plans"));
    expect(
      isLegacyClaudePlanPath(path.join(home, ".claude", "plans", "legacy.md"), { home }),
    ).toBe(true);
  });

  test("classifies canonical and legacy plan paths without prefix bleed", () => {
    const projectRoot = "/workspace/example";
    const home = "/home/tester";
    const options = { projectRoot, home };
    expect(isCanonicalPlanPath(path.join(projectRoot, ".palantir-mini", "plan", "a.md"), options))
      .toBe(true);
    expect(isPlanArtifactPath(path.join(projectRoot, ".palantir-mini", "plan", "a.md"), options))
      .toBe(true);
    expect(isPlanArtifactPath(path.join(home, ".claude", "plans", "a.md"), options)).toBe(true);
    expect(isPlanArtifactPath(path.join(projectRoot, ".palantir-mini", "planish", "a.md"), options))
      .toBe(false);
  });

  test("supports PALANTIR_MINI_PLAN_DIR override", () => {
    const projectRoot = "/workspace/example";
    expect(
      resolveCanonicalPlanRoot({
        projectRoot,
        env: { PALANTIR_MINI_PLAN_DIR: "durable/plans" },
      }),
    ).toBe(path.join(projectRoot, "durable", "plans"));
  });
});
