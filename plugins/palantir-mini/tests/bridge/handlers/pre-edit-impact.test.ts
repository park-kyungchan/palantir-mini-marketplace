// palantir-mini — pre_edit_impact W1 backward + evidenceKind tests
// Covers the W1.2 shape change: affects/tests/docs/backwardAffects are
// Array<{ file, evidenceKind: "ast" }> (not plain string[]).
//
// Authority chain: rules/03-forward-backward-propagation.md
//   -> schemas/ontology/primitives/impact-edge.ts
//   -> bridge/handlers/pre-edit-impact.ts (W1.2)

import { test, expect, describe, beforeEach } from "bun:test";
import {
  IMPACT_EDGE_REGISTRY,
  impactEdgeRid,
} from "#schemas/ontology/primitives/impact-edge";
import preEditImpact from "../../../bridge/handlers/pre-edit-impact";

// ── Registry isolation helper ─────────────────────────────────────────────────
// ImpactEdgeRegistry has no public clear() method. We reset the three private
// Maps by casting to any between tests so each test starts from a clean graph.
function clearRegistry(): void {
  const r = IMPACT_EDGE_REGISTRY as unknown as {
    byRid: Map<unknown, unknown>;
    forward: Map<unknown, unknown>;
    backward: Map<unknown, unknown>;
  };
  r.byRid.clear();
  r.forward.clear();
  r.backward.clear();
}

// ── Helper: register a simple A→B edge ───────────────────────────────────────
let edgeCounter = 0;
function registerEdge(fromRid: string, toRid: string): void {
  edgeCounter += 1;
  IMPACT_EDGE_REGISTRY.register({
    rid: impactEdgeRid(`edge:test-${edgeCounter}`),
    fromRid,
    toRid,
    edgeKind: "import",
    confidence: 1.0,
    registeredAt: new Date().toISOString(),
  });
}

// ── W1 backward + evidenceKind suite ─────────────────────────────────────────
describe("pre_edit_impact — W1 backward + evidenceKind", () => {
  beforeEach(() => {
    clearRegistry();
  });

  test("every returned edge carries evidenceKind='ast'", async () => {
    // Register: A.ts → B.ts (forward), B.tests.ts touches A.ts (test edge),
    // README.md documents A.ts (doc edge), D.ts → A.ts (backward)
    registerEdge("file:A.ts", "file:B.ts");
    registerEdge("file:A.ts", "file:tests/A.test.ts");
    registerEdge("file:A.ts", "file:docs/A.md");
    registerEdge("file:D.ts", "file:A.ts");

    const result = await preEditImpact({
      proposedFiles: ["A.ts"],
      project: "/tmp/test-evidencekind-project",
    });

    // Every entry in every array must carry evidenceKind === "ast"
    const allEntries = [
      ...result.affects,
      ...result.tests,
      ...result.docs,
      ...result.backwardAffects,
    ];
    // At minimum B.ts, A.test.ts, A.md, D.ts should appear
    expect(allEntries.length).toBeGreaterThan(0);
    for (const entry of allEntries) {
      expect(entry).toHaveProperty("file");
      expect(typeof entry.file).toBe("string");
      expect(entry.evidenceKind).toBe("ast");
    }
    // Spot-check each output bucket with explicit object shape
    expect(result.affects).toContainEqual({ file: "B.ts", evidenceKind: "ast" });
    expect(result.tests).toContainEqual({ file: "tests/A.test.ts", evidenceKind: "ast" });
    expect(result.docs).toContainEqual({ file: "docs/A.md", evidenceKind: "ast" });
    expect(result.backwardAffects).toContainEqual({ file: "D.ts", evidenceKind: "ast" });
  });

  test("returns backwardAffects alongside forward affects", async () => {
    // Graph: A.ts → B.ts → C.ts, D.ts → B.ts
    // Editing B.ts: forward → C.ts; backward → A.ts, D.ts
    registerEdge("file:A.ts", "file:B.ts");
    registerEdge("file:B.ts", "file:C.ts");
    registerEdge("file:D.ts", "file:B.ts");

    const result = await preEditImpact({
      proposedFiles: ["B.ts"],
      project: "/tmp/test-backward-project",
    });

    // Forward: C.ts
    const affectsFiles = result.affects.map((e) => e.file);
    expect(affectsFiles).toContain("C.ts");
    const cEntry = result.affects.find((e) => e.file === "C.ts");
    expect(cEntry?.evidenceKind).toBe("ast");

    // Backward: A.ts and D.ts
    const bwdFiles = result.backwardAffects.map((e) => e.file);
    expect(bwdFiles).toContain("A.ts");
    expect(bwdFiles).toContain("D.ts");
    const aEntry = result.backwardAffects.find((e) => e.file === "A.ts");
    const dEntry = result.backwardAffects.find((e) => e.file === "D.ts");
    expect(aEntry?.evidenceKind).toBe("ast");
    expect(dEntry?.evidenceKind).toBe("ast");
  });

  test("source is 'in-memory' when no SQLite db exists", async () => {
    // /tmp/test-noop-project has no .palantir-mini/impact-graph.db
    const result = await preEditImpact({
      proposedFiles: ["some-file.ts"],
      project: "/tmp/test-noop-project",
    });

    expect(result.source).toBe("in-memory");
  });

  test("transitiveRids unions forward + backward sets", async () => {
    // Same graph as test 2: A.ts → B.ts → C.ts, D.ts → B.ts
    // Editing B.ts: transitiveRids should include file:C.ts, file:A.ts, file:D.ts
    registerEdge("file:A.ts", "file:B.ts");
    registerEdge("file:B.ts", "file:C.ts");
    registerEdge("file:D.ts", "file:B.ts");

    const result = await preEditImpact({
      proposedFiles: ["B.ts"],
      project: "/tmp/test-transitive-project",
    });

    expect(result.transitiveRids).toContain("file:C.ts");
    expect(result.transitiveRids).toContain("file:A.ts");
    expect(result.transitiveRids).toContain("file:D.ts");
  });

  test("returns projectScope lane and validation metadata for palantir-math files", async () => {
    const result = await preEditImpact({
      proposedFiles: ["src/lib/jsxGraphRenderer.ts"],
      project: "/home/palantirkc/projects/palantir-math",
    });

    expect(result.projectScope.matches.map((match) => match.laneId)).toContain(
      "seq.rendering-scene",
    );
    const match = result.projectScope.matches.find(
      (candidate) => candidate.laneId === "seq.rendering-scene",
    );
    expect(match?.axisId).toBe("rendering-semantics");
    expect(match?.writerSurfaces).toContain("Sequencer");
    expect(result.projectScope.validationPacks).toContain("presenter-parity");
  });

  test("projectScope conformance flags missing validation packs", async () => {
    const result = await preEditImpact({
      proposedFiles: ["src/lib/jsxGraphRenderer.ts"],
      project: "/home/palantirkc/projects/palantir-math",
      semanticIntentContract: {
        contractId: "semantic-intent:pre-edit",
        status: "approved",
        rawIntent: "Update rendering scene.",
        confirmedIntent: "Update rendering scene.",
        nonGoals: [],
        approvedNouns: ["seq.rendering-scene"],
        approvedVerbs: ["validate"],
        affectedSurfaces: ["seq.rendering-scene"],
        permissionsAndProposal: "Separate PR.",
        acceptedRisks: [],
        downstreamAllowed: [],
        downstreamForbidden: [],
        clarificationQuestions: [],
        approvalRef: "user:approved:pre-edit",
      },
      digitalTwinChangeContract: {
        contractId: "digital-twin:pre-edit",
        status: "approved",
        semanticIntentContractRef: "semantic-intent:pre-edit",
        affectedSurfaces: ["seq.rendering-scene"],
        changeBoundary: "Rendering scene only.",
        branchProposalPolicy: "Separate PR.",
        permissionBoundary: "Sequencer only.",
        replayMigrationPlan: "No migration.",
        observabilityPlan: "Record lane metadata.",
        toolSurfaceReadiness: "No new tool.",
        evaluationPlan: "Run deterministic-core only.",
        risks: [],
        approvalRef: "user:approved:pre-edit",
      },
    });

    expect(result.projectScope.conformance?.evaluationPlanInvalid).toBe(true);
    expect(result.projectScope.conformance?.issues.map((issue) => issue.kind)).toContain(
      "missing-validation-pack",
    );
  });
});
