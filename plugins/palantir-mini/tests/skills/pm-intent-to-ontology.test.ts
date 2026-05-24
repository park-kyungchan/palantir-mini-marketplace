// palantir-mini v4.15.0 — pm-intent-to-ontology skill tests (sprint-062 Phase 2 W1-α)
//
// Test plan:
//   S1: happy path — all 4 active MCP steps called → combined result returned
//   S2: partial failure — one step fails → errors recorded, other results present
//   S3: skipped steps always present in result (W6 C13 deferral)
//   S4: missing mcpClient — skill returns with empty results (no crash)
//   S5: empty intent + empty scopePaths → gracefully handled
//   S6: totalElapsedMs is a non-negative number
//   S7: memoryLayers always procedural + semantic

import { test, expect, describe } from "bun:test";
import {
  runIntentToOntology,
  type IntentToOntologyArgs,
  type OntologySnapshot,
  type LineageSnapshot,
  type DecisionSnapshot,
  type PropagationAudit,
} from "../../skills/pm-intent-to-ontology/pm-intent-to-ontology";

// ─── Mock MCP client ──────────────────────────────────────────────────────────

const MOCK_ONTOLOGY: OntologySnapshot = {
  entityTypes:   ["PalantirEvent", "AgentDecision"],
  relationTypes: ["EMITS", "REFINES"],
  version:       "v1.50.0",
};

const MOCK_LINEAGE: LineageSnapshot = {
  events:     [{ type: "edit_committed", when: new Date().toISOString() }],
  totalCount: 1,
};

const MOCK_DECISIONS: DecisionSnapshot = {
  events:      [{ type: "agent_decision_logged", valueGrade: "T3" }],
  gradeFilter: "T3+",
};

const MOCK_PROPAGATION: PropagationAudit = {
  healthy: true,
  steps:   [{ layer: "research", ok: true }, { layer: "runtime", ok: true }],
};

function makeHappyClient() {
  return {
    getOntology:             (_params: { project: string }) => Promise.resolve(MOCK_ONTOLOGY),
    pmWorkflowLineageQuery:  (_params: unknown) => Promise.resolve(MOCK_LINEAGE),
    pmEventQueryByGrade:     (_params: { project: string; gradeFilter: string }) => Promise.resolve(MOCK_DECISIONS),
    propagationAuditForward: (_params: { project: string }) => Promise.resolve(MOCK_PROPAGATION),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pm-intent-to-ontology happy path", () => {
  test("S1: all 4 active steps called → combined result returned", async () => {
    const args: IntentToOntologyArgs = {
      intent:     "implement lead-ontology-discovery-completeness hook",
      scopePaths: ["hooks/lead-ontology-discovery-completeness.ts"],
      project:    "/tmp/test-project",
    };

    const result = await runIntentToOntology(args, makeHappyClient());

    // All 4 active data fields populated
    expect(result.ontology).toBeDefined();
    expect(result.ontology?.entityTypes).toContain("PalantirEvent");

    expect(result.lineage).toBeDefined();
    expect(result.lineage?.totalCount).toBe(1);

    expect(result.decisions).toBeDefined();
    expect(result.decisions?.gradeFilter).toBe("T3+");

    expect(result.propagation).toBeDefined();
    expect(result.propagation?.healthy).toBe(true);

    // Intent + scope preserved
    expect(result.intent).toBe("implement lead-ontology-discovery-completeness hook");
    expect(result.scopePaths).toEqual(["hooks/lead-ontology-discovery-completeness.ts"]);
    expect(result.project).toBe("/tmp/test-project");

    // No errors
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test("S6: totalElapsedMs is non-negative number", async () => {
    const result = await runIntentToOntology(
      { intent: "test", scopePaths: [], project: "/tmp" },
      makeHappyClient(),
    );
    expect(typeof result.totalElapsedMs).toBe("number");
    expect(result.totalElapsedMs).toBeGreaterThanOrEqual(0);
  });

  test("S7: memoryLayers always procedural + semantic", async () => {
    const result = await runIntentToOntology(
      { intent: "test", scopePaths: [], project: "/tmp" },
      makeHappyClient(),
    );
    expect(result.memoryLayers).toContain("procedural");
    expect(result.memoryLayers).toContain("semantic");
    expect(result.memoryLayers).toHaveLength(2);
  });
});

// sprint-063 W2.C: §S3 + §S3b describe block REMOVED — semantic_change_plan permanently
// removed; "skipped steps" concept obsolete. impact_query is now active step 2 in the
// 6-step protocol. uncertaintyAdvisory removed from IntentToOntologyResult shape.

describe("pm-intent-to-ontology failure modes", () => {
  test("S2: one step fails → error recorded, other results still present", async () => {
    const partialClient = {
      getOntology:             (_p: { project: string }) => Promise.reject(new Error("get_ontology unavailable")),
      pmWorkflowLineageQuery:  (_p: unknown) => Promise.resolve(MOCK_LINEAGE),
      pmEventQueryByGrade:     (_p: { project: string; gradeFilter: string }) => Promise.resolve(MOCK_DECISIONS),
      propagationAuditForward: (_p: { project: string }) => Promise.resolve(MOCK_PROPAGATION),
    };

    const result = await runIntentToOntology(
      { intent: "test partial failure", scopePaths: [], project: "/tmp" },
      partialClient,
    );

    expect(result.ontology).toBeUndefined();
    expect(result.errors["get_ontology"]).toContain("get_ontology unavailable");

    // Other steps still ran
    expect(result.lineage).toBeDefined();
    expect(result.decisions).toBeDefined();
    expect(result.propagation).toBeDefined();
  });

  test("S4: no mcpClient → empty results, no crash", async () => {
    const result = await runIntentToOntology({
      intent:     "test no client",
      scopePaths: ["hooks/foo.ts"],
      project:    "/tmp",
    });

    // Should complete without throwing
    expect(result.intent).toBe("test no client");
    expect(Object.keys(result.errors)).toHaveLength(0);
    // sprint-063 W2.C: skippedSteps removed; impact_query is now active step 2.
    // All 4 data fields return empty objects (no mcpClient → fallback {} shape)
    expect(result.ontology).toBeDefined();
    expect(result.lineage).toBeDefined();
    expect(result.decisions).toBeDefined();
    expect(result.propagation).toBeDefined();
  });
});

describe("pm-intent-to-ontology edge cases", () => {
  test("S5: empty intent + empty scopePaths → gracefully handled", async () => {
    const result = await runIntentToOntology(
      { intent: "", scopePaths: [], project: "/tmp" },
      makeHappyClient(),
    );
    expect(result.intent).toBe("");
    expect(result.scopePaths).toEqual([]);
    expect(result.totalElapsedMs).toBeGreaterThanOrEqual(0);
  });

  test("S5b: undefined args fields → safe defaults", async () => {
    // TypeScript won't allow passing undefined directly, but test the runtime guard
    const args = { intent: undefined as unknown as string, scopePaths: undefined as unknown as string[] };
    const result = await runIntentToOntology(args, makeHappyClient());
    expect(typeof result.intent).toBe("string");
    expect(Array.isArray(result.scopePaths)).toBe(true);
  });
});
