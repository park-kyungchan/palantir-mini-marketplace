// palantir-mini — tests/lib/delegation-recipe/dispatch-mode.test.ts
// Covers pickDispatchModeFromConfidence thresholds, boundaries, and downgrade rule,
// plus buildRecipe's flat dispatchMode/risk fields (W3b-2b neutral DispatchDecision).
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

// ─── buildRecipe integration: flat dispatchMode + risk on DispatchDecision ────

/**
 * Minimal OntologyContextQueryResult stub sufficient for buildRecipe's PR 3.6
 * path — buildRecipe only reads graphConfidence + missingEdges.
 */
function makeOntologyContext(opts: {
  graphConfidence: number;
  missingEdges?: Array<{ fromRid: string; toRid: string; edgeKind: string }>;
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
  } as unknown as OntologyContextQueryResult;
}

describe("buildRecipe — dispatchMode + risk (PR 3.6 integration)", () => {
  test("high confidence ontologyContext → dispatchMode=lead-direct, risk=low", () => {
    const ctx = makeOntologyContext({ graphConfidence: 0.9, missingEdges: [] });
    const result = buildRecipe({
      intent: "Add new hook for emit tracking",
      scopePaths: [".claude/plugins/palantir-mini/hooks/edit-tracker.ts"],
      complexityHint: "single-file",
      ontologyContext: ctx,
    });
    expect(result.decision).toBe("delegate");
    expect(result.dispatchMode).toBe("lead-direct");
    expect(result.risk).toBe("low");
  });

  test("medium confidence ontologyContext → dispatchMode=targeted-verification, risk=medium", () => {
    const ctx = makeOntologyContext({ graphConfidence: 0.55, missingEdges: [] });
    const result = buildRecipe({
      intent: "Update hook handler",
      scopePaths: [".claude/plugins/palantir-mini/hooks/handler.ts"],
      complexityHint: "single-file",
      ontologyContext: ctx,
    });
    expect(result.dispatchMode).toBe("targeted-verification");
    expect(result.risk).toBe("medium");
  });

  test("low confidence ontologyContext → dispatchMode=bounded-explorer, risk=high", () => {
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
    expect(result.dispatchMode).toBe("bounded-explorer");
    expect(result.risk).toBe("high");
  });

  test("high confidence with missingEdges>5 → dispatchMode downgraded to targeted-verification", () => {
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
    expect(result.dispatchMode).toBe("targeted-verification");
    expect(result.risk).toBe("medium");
  });

  test("no ontologyContext → dispatchMode defaults to lead-direct, risk=low", () => {
    const result = buildRecipe({
      intent: "Edit rule 10 to add propagation depth field",
      scopePaths: [".claude/rules/10-events-jsonl.md"],
      complexityHint: "single-file",
    });
    expect(result.decision).toBe("delegate");
    expect(result.dispatchMode).toBe("lead-direct");
    expect(result.risk).toBe("low");
  });

  test("trivial + ≤3 files → lead-direct at the safe floor (graph confidence is moot)", () => {
    // Low-confidence ctx supplied, but the trivial shortcut keeps dispatchMode/risk
    // at the floor because nothing is delegated.
    const ctx = makeOntologyContext({ graphConfidence: 0.3 });
    const result = buildRecipe({
      intent: "Trivial single-word typo fix",
      scopePaths: ["docs/README.md"],
      complexityHint: "trivial",
      ontologyContext: ctx,
    });
    expect(result.decision).toBe("lead-direct");
    expect(result.dispatchMode).toBe("lead-direct");
    expect(result.risk).toBe("low");
  });
});
