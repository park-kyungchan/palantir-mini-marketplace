import { describe, expect, test } from "bun:test";
import impactQuery from "../../../bridge/handlers/impact-query";

describe("impact_query projectScope metadata", () => {
  test("returns projectScope lane metadata for file RIDs", async () => {
    const result = await impactQuery({
      rid: "file:src/lib/jsxGraphRenderer.ts",
      projectRoot: "/home/palantirkc/projects/palantir-math",
      depth: 2,
    });

    expect(result.projectScope?.matches.map((match) => match.laneId)).toContain(
      "seq.rendering-scene",
    );
    expect(result.projectScope?.validationPacks).toContain("ontology-runtime-drift");
  });
});
