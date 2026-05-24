import { describe, expect, test } from "bun:test";
import researchContextSelect from "../../../bridge/handlers/research-context-select";

describe("research_context_select", () => {
  test("defaults Palantir-heavy reads to external-preferred authority with proof fields", async () => {
    const result = await researchContextSelect({
      query: "Palantir AIP Context Engineering Ontology",
      includeSchemas: true,
    });

    expect(result.authorityMode).toBe("external-preferred");
    expect(typeof result.ssotSatisfied).toBe("boolean");
    expect(["ready", "fallback", "blocked"]).toContain(result.sourceReadiness);
    expect(result.researchReadProof.authorityMode).toBe(result.authorityMode);
    expect(result.researchReadProof.anchorPaths.length).toBeGreaterThan(0);
    expect(result.currentnessNotes).toContain(`ssotSatisfied=${String(result.ssotSatisfied)}`);
  });

  test("external-required missing topic surfaces blocked authority gap", async () => {
    const result = await researchContextSelect({
      query: "Palantir AIP official docs",
      topic: "missing-topic-for-research-context-select-test",
      authorityMode: "external-required",
    });

    expect(result.authorityMode).toBe("external-required");
    expect(result.ssotSatisfied).toBe(false);
    expect(result.sourceReadiness).toBe("blocked");
    expect(result.runtimeGap).toContain("External palantir-official SSoT was not selected");
    expect(result.currentnessGap).toContain("does not prove live official-doc freshness");
  });
});
