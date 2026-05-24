// palantir-mini — recipe-builder router-consult tests (foamy-giggling-kettle PR-2 T9)
// Tests that router-suggested agents win over static domain-map defaults.

import { describe, expect, it } from "bun:test";
import { buildRecipe } from "../../../lib/delegation-recipe/recipe-builder";
import type { CapabilityRouterResult, CapabilityRouterDecision } from "../../../lib/capability/capability-router";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function routerDecision(capabilityId: string, score: number): CapabilityRouterDecision {
  return {
    capabilityId,
    decision: "selected",
    score,
    matchedReasons: ["test match"],
    rejectedReasons: [],
    requiresDtc: false,
    requiredValidationPacks: [],
  };
}

function routerResult(suggestedAgents: CapabilityRouterDecision[]): CapabilityRouterResult {
  return {
    selectedCapabilities: [],
    rejectedCapabilities: [],
    needsClarificationCapabilities: [],
    decisions: suggestedAgents,
    plainLanguageRoutingSummary: "test",
    requiredDtc: false,
    suggestedAgents,
    suggestedActionTypeRid: undefined,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("recipe-builder router consult", () => {
  it("router suggestion wins over static map default", () => {
    // "agent-definition" domain would static-map to "implementer"
    // Router suggests "protocol-designer" as top agent — should win.
    const result = buildRecipe({
      intent: "update plugin agent definitions",
      scopePaths: ["plugins/palantir-mini/agents/"],
      complexityHint: "single-file",
      routerResult: routerResult([
        routerDecision("agent:protocol-designer", 85),
        routerDecision("agent:implementer", 40),
      ]),
    });

    expect(result.decision).toBe("delegate-to-protocol-designer");
    expect(result.recipe?.agent).toBe("protocol-designer");
    expect(result.rationale).toContain("Router suggested");
  });

  it("static map fallback when suggestedAgents is empty", () => {
    // Same "agent-definition" domain, but router returned no suggestions.
    // Should fall back to static map which maps agent-definition → "implementer".
    const result = buildRecipe({
      intent: "update plugin agent definitions",
      scopePaths: ["plugins/palantir-mini/agents/"],
      complexityHint: "single-file",
      routerResult: routerResult([]),
    });

    expect(result.decision).toBe("delegate-to-implementer");
    expect(result.recipe?.agent).toBe("implementer");
    // Rationale should mention the domain not router suggestion
    expect(result.rationale).toContain("agent-definition");
  });
});
