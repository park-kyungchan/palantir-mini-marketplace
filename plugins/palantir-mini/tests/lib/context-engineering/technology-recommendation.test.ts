import { describe, expect, test } from "bun:test";
import { buildConvexOnlyTechnologyRecommendation } from "../../../lib/context-engineering/context-plan-builder";

describe("Convex-only TechnologyRecommendation", () => {
  test("allows Convex only as a mirror backend and forbids authority replacement", () => {
    const recommendation = buildConvexOnlyTechnologyRecommendation("context-plan:test");

    expect(recommendation.backend).toBe("convex");
    expect(recommendation.policy).toBe("convex-only-backend");
    expect(recommendation.mirrorOnly).toBe(true);
    expect(recommendation.mirrorSurfaces).toEqual([
      "session-state",
      "decisions",
      "evals",
      "workflow-traces",
      "feedback",
      "lightweight-state",
    ]);
    expect(recommendation.mustNeverReplaceAuthority.join("\n")).toContain(
      "ontology/schema authority",
    );
    expect(recommendation.unapprovedWritebackPolicy).toBe("forbidden");
  });
});
