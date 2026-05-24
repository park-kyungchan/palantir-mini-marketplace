import { describe, expect, test } from "bun:test";
import {
  resolveOntologyRefs,
} from "../../../lib/lead-intent/ontology-ref-resolver";
import {
  projectRoutingFromContracts,
} from "../../../lib/lead-intent/contracts";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";

const PALANTIR_MATH_ROOT = "/home/palantirkc/projects/palantir-math";

function semanticContract(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    contractId: "semantic-intent:typed-ref-test",
    status: "approved",
    rawIntent: "Route approved ontology work from typed refs.",
    confirmedIntent: "Resolve project lanes and MCP tools from approved contract terms.",
    nonGoals: ["Do not change Prompt-DTC gate mode."],
    approvedNouns: ["SemanticIntentContract", "seq.rendering-scene"],
    approvedVerbs: ["pm_intent_router", "commit_edits"],
    affectedSurfaces: ["src/lib/jsxGraphRenderer.ts"],
    permissionsAndProposal: "Separate PR for resolver only.",
    acceptedRisks: [],
    downstreamAllowed: ["Attach typed refs to routing projection."],
    downstreamForbidden: ["Do not silently infer unresolved terms."],
    clarificationQuestions: [],
    approvalRef: "user:approved:typed-ref-test",
    ...overrides,
  };
}

function digitalTwinContract(
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin:typed-ref-test",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:typed-ref-test",
    affectedSurfaces: ["seq.effect-authoring"],
    changeBoundary: "Typed resolver only; no mutating gate rollout.",
    branchProposalPolicy: "Separate PR from projectScope ingestion and scoped blocking.",
    permissionBoundary: "lead-intent resolver and router projection only.",
    replayMigrationPlan: "No replay or migration work.",
    observabilityPlan: "Unit and router regression tests.",
    toolSurfaceReadiness: "No new MCP tool.",
    evaluationPlan: "Resolver unit tests and router projection regression.",
    risks: [],
    approvalRef: "user:approved:typed-ref-test",
    ...overrides,
  };
}

describe("ontology-ref-resolver", () => {
  test("resolves exact projectScope lane and surface metadata", () => {
    const result = resolveOntologyRefs({
      semanticIntentContract: semanticContract(),
      digitalTwinChangeContract: digitalTwinContract(),
      projectRoot: PALANTIR_MATH_ROOT,
    });

    expect(result.approvedLaneRefs.map((ref) => ref.laneId)).toContain("seq.rendering-scene");
    expect(result.approvedLaneRefs.map((ref) => ref.laneId)).toContain("seq.effect-authoring");
    const renderingLane = result.approvedLaneRefs.find(
      (ref) => ref.laneId === "seq.rendering-scene",
    );
    expect(renderingLane?.axisId).toBe("rendering-semantics");
    expect(renderingLane?.writerSurfaces).toContain("Sequencer");
    expect(result.approvedSurfaceRefs.map((ref) => ref.surfaceId)).toContain("Sequencer");
    expect(result.requiredEvaluationRefs.map((ref) => ref.displayName)).toContain(
      "presenter-parity",
    );
  });

  test("resolves MCP tool refs exactly", () => {
    const result = resolveOntologyRefs({
      semanticIntentContract: semanticContract({
        approvedNouns: [],
        approvedVerbs: ["pm_semantic_intent_gate", "commit_edits"],
        affectedSurfaces: [],
      }),
      digitalTwinChangeContract: digitalTwinContract({ affectedSurfaces: [] }),
    });

    expect(result.approvedMcpToolRefs.map((ref) => ref.toolName)).toEqual([
      "pm_semantic_intent_gate",
      "commit_edits",
    ]);
    expect(result.permittedMutationSurfaces).toContainEqual({
      surfaceRef: expect.objectContaining({ kind: "MCPTool", toolName: "commit_edits" }),
      mutationKind: "commit",
    });
  });

  test("reports unresolved terms instead of inferring", () => {
    const result = resolveOntologyRefs({
      semanticIntentContract: semanticContract({
        approvedNouns: ["UnknownOperationalThing"],
        approvedVerbs: ["magically-transform"],
        affectedSurfaces: [],
      }),
      digitalTwinChangeContract: digitalTwinContract({ affectedSurfaces: [] }),
    });

    expect(result.unresolvedTerms).toEqual([
      expect.objectContaining({
        term: "UnknownOperationalThing",
        source: "approvedNouns",
      }),
      expect.objectContaining({
        term: "magically-transform",
        source: "approvedVerbs",
      }),
    ]);
  });

  test("router projection includes typed refs without changing gate behavior", () => {
    const projection = projectRoutingFromContracts({
      intent: "Implement typed ref resolver",
      scopePaths: ["src/lib/jsxGraphRenderer.ts"],
      complexityHint: "cross-cutting",
      projectRoot: PALANTIR_MATH_ROOT,
      semanticIntentContract: semanticContract(),
      digitalTwinChangeContract: digitalTwinContract(),
    });

    expect(projection.basis).toBe("approved-inline-contracts");
    expect(projection.hasContractFields).toBe(true);
    expect(projection.typedRefResolution?.approvedLaneRefs.map((ref) => ref.laneId)).toContain(
      "seq.rendering-scene",
    );
    expect(projection.typedRefResolution?.approvedMcpToolRefs.map((ref) => ref.toolName)).toContain(
      "pm_intent_router",
    );
    expect(projection.projectScopePolicy?.validationPacks).toContain("presenter-parity");
    expect(projection.intent).toContain("Typed lane refs: seq.rendering-scene");
    expect(projection.intent).toContain("Typed MCP tool refs: pm_intent_router");
    expect(projection.intent).toContain("ProjectScope validation packs:");
  });
});
