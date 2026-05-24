// palantir-mini — tests/lib/delegation-recipe/dispatch-mode.test.ts
// Covers pickDispatchModeFromConfidence thresholds, boundaries, and downgrade rule.
// Sprint-098 PR 3.6: graphConfidence threshold routing per canonical plan v2 §4 row 3.6.

import { test, expect, describe } from "bun:test";
import {
  pickDispatchModeFromConfidence,
  buildRecipe,
} from "../../../lib/delegation-recipe/recipe-builder";
import type { OntologyContextQueryResult } from "../../../bridge/handlers/ontology-context-query";

// ─── pickDispatchModeFromConfidence unit tests ────────────────────────────────

describe("pickDispatchModeFromConfidence — thresholds", () => {
  test("high confidence, no missing edges → lead-direct", () => {
    expect(pickDispatchModeFromConfidence(0.9, 0)).toBe("lead-direct");
  });

  test("medium confidence, few missing edges → targeted-verification", () => {
    expect(pickDispatchModeFromConfidence(0.55, 2)).toBe("targeted-verification");
  });

  test("low confidence, many missing edges → bounded-explorer", () => {
    expect(pickDispatchModeFromConfidence(0.25, 12)).toBe("bounded-explorer");
  });

  test("high confidence but missingEdges>5 → downgrade to targeted-verification", () => {
    expect(pickDispatchModeFromConfidence(0.75, 8)).toBe("targeted-verification");
  });

  test("medium confidence and missingEdges>5 → downgrade to bounded-explorer", () => {
    expect(pickDispatchModeFromConfidence(0.5, 6)).toBe("bounded-explorer");
  });

  test("low confidence and missingEdges>5 stays bounded-explorer (no further downgrade)", () => {
    expect(pickDispatchModeFromConfidence(0.3, 10)).toBe("bounded-explorer");
  });
});

describe("pickDispatchModeFromConfidence — boundary values", () => {
  test("gc=0.7 is inclusive lower bound for lead-direct (no missing edges)", () => {
    expect(pickDispatchModeFromConfidence(0.7, 0)).toBe("lead-direct");
  });

  test("gc=0.4 is inclusive lower bound for targeted-verification", () => {
    expect(pickDispatchModeFromConfidence(0.4, 0)).toBe("targeted-verification");
  });

  test("gc just below 0.7 → targeted-verification", () => {
    expect(pickDispatchModeFromConfidence(0.699, 0)).toBe("targeted-verification");
  });

  test("gc just below 0.4 → bounded-explorer", () => {
    expect(pickDispatchModeFromConfidence(0.399, 0)).toBe("bounded-explorer");
  });

  test("gc=1.0 → lead-direct", () => {
    expect(pickDispatchModeFromConfidence(1.0, 0)).toBe("lead-direct");
  });

  test("gc=0.0 → bounded-explorer", () => {
    expect(pickDispatchModeFromConfidence(0.0, 0)).toBe("bounded-explorer");
  });

  test("gc=0.7 with exactly 5 missing edges stays lead-direct (threshold is >5)", () => {
    expect(pickDispatchModeFromConfidence(0.7, 5)).toBe("lead-direct");
  });

  test("gc=0.7 with 6 missing edges → downgrade to targeted-verification", () => {
    expect(pickDispatchModeFromConfidence(0.7, 6)).toBe("targeted-verification");
  });

  test("missingEdgesCount undefined treated as 0", () => {
    expect(pickDispatchModeFromConfidence(0.8)).toBe("lead-direct");
    expect(pickDispatchModeFromConfidence(0.5)).toBe("targeted-verification");
    expect(pickDispatchModeFromConfidence(0.2)).toBe("bounded-explorer");
  });
});

// ─── buildRecipe integration: dispatchMode field on recipe ──────────────────

/**
 * Minimal OntologyContextQueryResult stub sufficient for buildRecipe PR 3.6 path.
 * Does not cover all fields — only what buildRecipe actually reads.
 */
function makeOntologyContext(opts: {
  graphConfidence: number;
  missingEdges?: Array<{ fromRid: string; toRid: string; edgeKind: string }>;
  perRidImpact?: Array<{
    rid: string;
    forwardCount: number;
    backwardCount: number;
    graphConfidence: number;
    recommendedAgentUse: "lead-direct" | "targeted-verification" | "bounded-explorer" | "none";
  }>;
}): OntologyContextQueryResult {
  return {
    graphConfidence: opts.graphConfidence,
    missingEdges: opts.missingEdges ?? [],
    recommendedAgentUse: opts.graphConfidence >= 0.7 ? "lead-direct" : "targeted-verification",
    requiredContracts: [],
    nonGoals: [],
    applicationState: {
      harness: { contractBound: false, sprintId: null, mode: null, phase: null },
      promptFrontDoor: { promptId: null, promptHash: null, state: null, contractRefs: null },
      ontologyEntry: { entryId: null, status: null, delegationRecipeRef: null },
      workflowTrace: { traceId: null, mode: null, lastEvent: null },
    },
    retrievalContext: {
      pluginSourceFiles: {
        scopedFiles: [],
        totalTrackedFiles: 0,
        indexedAt: null,
      },
      researchDocuments: [],
      schemaVersion: null,
    },
    impactContext: opts.perRidImpact
      ? {
          axisRids: opts.perRidImpact.map((r) => r.rid),
          perRidImpact: opts.perRidImpact,
        }
      : undefined,
  } as unknown as OntologyContextQueryResult;
}

describe("buildRecipe — dispatchMode field (PR 3.6 integration)", () => {
  test("high confidence ontologyContext → recipe.dispatchMode=lead-direct", () => {
    const ctx = makeOntologyContext({ graphConfidence: 0.9, missingEdges: [] });
    const result = buildRecipe({
      intent: "Add new hook for emit tracking",
      scopePaths: [".claude/plugins/palantir-mini/hooks/edit-tracker.ts"],
      complexityHint: "single-file",
      ontologyContext: ctx,
    });
    expect(result.recipe).toBeDefined();
    expect(result.recipe!.dispatchMode).toBe("lead-direct");
    expect(result.recipe!.verificationScope).toBeUndefined();
    expect(result.recipe!.boundedExplorers).toBeUndefined();
  });

  test("medium confidence ontologyContext → recipe.dispatchMode=targeted-verification + verificationScope", () => {
    const ctx = makeOntologyContext({
      graphConfidence: 0.55,
      missingEdges: [],
      perRidImpact: [
        { rid: "file:hooks/a.ts", forwardCount: 1, backwardCount: 0, graphConfidence: 0.55, recommendedAgentUse: "targeted-verification" },
        { rid: "file:hooks/b.ts", forwardCount: 2, backwardCount: 1, graphConfidence: 0.6, recommendedAgentUse: "targeted-verification" },
      ],
    });
    const result = buildRecipe({
      intent: "Update hook handler",
      scopePaths: [".claude/plugins/palantir-mini/hooks/handler.ts"],
      complexityHint: "single-file",
      ontologyContext: ctx,
    });
    expect(result.recipe!.dispatchMode).toBe("targeted-verification");
    expect(result.recipe!.verificationScope).toBeDefined();
    // Both RIDs have gc < 0.7, so both should appear in verificationScope
    expect(result.recipe!.verificationScope).toContain("file:hooks/a.ts");
    expect(result.recipe!.verificationScope).toContain("file:hooks/b.ts");
    expect(result.recipe!.boundedExplorers).toBeUndefined();
    expect(result.recipe!.delegationExecutionPlan?.leadRole).toBe("orchestrator");
    expect(result.recipe!.delegationExecutionPlan?.parallelReadOnlyAgents.length).toBe(1);
    expect(result.recipe!.delegationExecutionPlan?.parallelReadOnlyAgents[0]?.writeScope).toEqual([]);
    expect(result.recipe!.delegationExecutionPlan?.sequentialWorkers[0]?.dependsOn).toEqual([
      "parallel-readonly-verifier-001",
    ]);
  });

  test("low confidence ontologyContext → recipe.dispatchMode=bounded-explorer + boundedExplorers", () => {
    const missingEdges = Array.from({ length: 8 }, (_, i) => ({
      fromRid: `rule:${i}`,
      toRid: `file:hook-${i}.ts`,
      edgeKind: "references",
    }));
    const ctx = makeOntologyContext({ graphConfidence: 0.2, missingEdges });
    const result = buildRecipe({
      intent: "Cross-cutting refactor across hooks",
      scopePaths: [".claude/plugins/palantir-mini/hooks/"],
      complexityHint: "multi-file",
      ontologyContext: ctx,
    });
    expect(result.recipe!.dispatchMode).toBe("bounded-explorer");
    expect(result.recipe!.boundedExplorers).toBeDefined();
    expect(result.recipe!.boundedExplorers!.length).toBeGreaterThan(0);
    expect(result.recipe!.boundedExplorers!.length).toBeLessThanOrEqual(3);
    expect(result.recipe!.verificationScope).toBeUndefined();
    expect(result.recipe!.delegationExecutionPlan?.parallelReadOnlyAgents.length).toBe(
      result.recipe!.boundedExplorers!.length,
    );
    expect(
      result.recipe!.delegationExecutionPlan?.parallelReadOnlyAgents.every(
        (agentTask) => agentTask.writeScope.length === 0,
      ),
    ).toBe(true);
  });

  test("high confidence with missingEdges>5 → recipe.dispatchMode=targeted-verification (downgrade)", () => {
    const missingEdges = Array.from({ length: 8 }, (_, i) => ({
      fromRid: `file:a-${i}.ts`,
      toRid: `file:b-${i}.ts`,
      edgeKind: "imports",
    }));
    const ctx = makeOntologyContext({ graphConfidence: 0.8, missingEdges });
    const result = buildRecipe({
      intent: "Schema refactor",
      scopePaths: [".claude/plugins/palantir-mini/lib/"],
      complexityHint: "multi-file",
      ontologyContext: ctx,
    });
    expect(result.recipe!.dispatchMode).toBe("targeted-verification");
  });

  test("no ontologyContext → dispatchMode absent from recipe", () => {
    const result = buildRecipe({
      intent: "Edit rule 10 to add propagation depth field",
      scopePaths: [".claude/rules/10-events-jsonl.md"],
      complexityHint: "single-file",
    });
    expect(result.recipe!.dispatchMode).toBeUndefined();
    expect(result.recipe!.verificationScope).toBeUndefined();
    expect(result.recipe!.boundedExplorers).toBeUndefined();
    expect(result.recipe!.delegationExecutionPlan).toBeUndefined();
  });

  test("trivial + ≤3 files returns lead-direct early, no dispatchMode", () => {
    const ctx = makeOntologyContext({ graphConfidence: 0.3 });
    const result = buildRecipe({
      intent: "Trivial single-word typo fix",
      scopePaths: ["docs/README.md"],
      complexityHint: "trivial",
      ontologyContext: ctx,
    });
    // trivial shortcircuits before recipe is built
    expect(result.decision).toBe("lead-direct");
    expect(result.recipe).toBeUndefined();
  });
});

describe("boundedExplorers chunking invariants", () => {
  test("8 missingEdges → 2 explorer chunks (5 + 3)", () => {
    const missingEdges = Array.from({ length: 8 }, (_, i) => ({
      fromRid: `file:from-${i}.ts`,
      toRid: `file:to-${i}.ts`,
      edgeKind: "dep",
    }));
    const ctx = makeOntologyContext({ graphConfidence: 0.2, missingEdges });
    const result = buildRecipe({
      intent: "Low confidence multi-file refactor",
      scopePaths: [".claude/plugins/palantir-mini/lib/"],
      complexityHint: "multi-file",
      ontologyContext: ctx,
    });
    const explorers = result.recipe!.boundedExplorers!;
    expect(explorers.length).toBe(2);
    expect(explorers[0]!.focus).toBe("edges 1-5");
    expect(explorers[1]!.focus).toBe("edges 6-8");
  });

  test("15 missingEdges → capped at 3 explorers max", () => {
    const missingEdges = Array.from({ length: 15 }, (_, i) => ({
      fromRid: `file:x-${i}.ts`,
      toRid: `file:y-${i}.ts`,
      edgeKind: "dep",
    }));
    const ctx = makeOntologyContext({ graphConfidence: 0.2, missingEdges });
    const result = buildRecipe({
      intent: "Large low-confidence change",
      scopePaths: [".claude/plugins/palantir-mini/lib/"],
      complexityHint: "cross-cutting",
      ontologyContext: ctx,
    });
    const explorers = result.recipe!.boundedExplorers!;
    expect(explorers.length).toBeLessThanOrEqual(3);
  });

  test("0 missingEdges with low confidence → bounded-explorer with empty scope", () => {
    const ctx = makeOntologyContext({ graphConfidence: 0.1, missingEdges: [] });
    const result = buildRecipe({
      intent: "Unknown entity refactor",
      scopePaths: [".claude/plugins/palantir-mini/lib/unknown/"],
      complexityHint: "multi-file",
      ontologyContext: ctx,
    });
    expect(result.recipe!.dispatchMode).toBe("bounded-explorer");
    expect(result.recipe!.boundedExplorers).toBeDefined();
    expect(result.recipe!.boundedExplorers!.length).toBe(0);
  });
});
