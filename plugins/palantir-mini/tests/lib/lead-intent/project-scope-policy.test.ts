import { describe, expect, test } from "bun:test";
import {
  evaluateProjectScopeConformance,
  projectScopePolicyForFiles,
  projectScopePolicyForLaneIds,
} from "../../../lib/lead-intent/project-scope-policy";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const PALANTIR_MATH_ROOT = "/home/palantirkc/projects/palantir-math";

function semanticContract(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:project-scope",
    status: "approved",
    rawIntent: "Update rendering scene lane.",
    confirmedIntent: "Update rendering-scene lane only.",
    nonGoals: ["Do not change publish behavior."],
    approvedNouns: ["seq.rendering-scene"],
    approvedVerbs: ["validate"],
    affectedSurfaces: ["seq.rendering-scene"],
    permissionsAndProposal: "Separate PR.",
    acceptedRisks: [],
    downstreamAllowed: ["Touch seq.rendering-scene with validation packs."],
    downstreamForbidden: [],
    clarificationQuestions: [],
    approvalRef: "user:approved:project-scope",
    ...overrides,
  };
}

function digitalTwinContract(
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin:project-scope",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:project-scope",
    affectedSurfaces: ["seq.rendering-scene"],
    changeBoundary: "Rendering scene lane only.",
    branchProposalPolicy: "Separate PR.",
    permissionBoundary: "Sequencer renderer-neutral scene semantics only.",
    replayMigrationPlan: "No migration.",
    observabilityPlan: "Record projectScope lane metadata.",
    toolSurfaceReadiness: "No new tool.",
    evaluationPlan:
      "Run deterministic-core, capability-routing, presenter-parity, ontology-runtime-drift.",
    risks: [],
    approvalRef: "user:approved:project-scope",
    ...overrides,
  };
}

describe("project-scope-policy", () => {
  test("matches files to lane, axis, writer surfaces, and validation packs", () => {
    const policy = projectScopePolicyForFiles(["src/lib/jsxGraphRenderer.ts"], PALANTIR_MATH_ROOT);

    expect(policy.matches.map((match) => match.laneId)).toContain("seq.rendering-scene");
    const match = policy.matches.find((candidate) => candidate.laneId === "seq.rendering-scene");
    expect(match?.axisId).toBe("rendering-semantics");
    expect(match?.writerSurfaces).toContain("Sequencer");
    expect(match?.durableBoundary).toContain("renderer-neutral");
    expect(policy.validationPacks).toContain("presenter-parity");
    expect(policy.validationLadder).toContain("bun run ontology:drift:runtime");
  });

  test("derives validation ladder from typed lane refs", () => {
    const policy = projectScopePolicyForLaneIds(["seq.effect-authoring"], PALANTIR_MATH_ROOT);

    expect(policy.matches[0]?.axisId).toBe("effect-semantics");
    expect(policy.validationPacks).toContain("capability-routing");
    expect(policy.validationLadder.length).toBeGreaterThan(0);
  });

  test("conformance fails when contract omits lane authorization", () => {
    const result = evaluateProjectScopeConformance({
      proposedFiles: ["src/lib/jsxGraphRenderer.ts"],
      projectRoot: PALANTIR_MATH_ROOT,
      semanticIntentContract: semanticContract({
        confirmedIntent: "Update effect authoring only.",
        approvedNouns: ["seq.effect-authoring"],
        affectedSurfaces: ["seq.effect-authoring"],
        downstreamAllowed: ["Touch seq.effect-authoring with validation packs."],
      }),
      digitalTwinChangeContract: digitalTwinContract({
        affectedSurfaces: ["seq.effect-authoring"],
        changeBoundary: "Effect authoring only.",
        permissionBoundary: "Design effect controls only.",
        evaluationPlan: "Run deterministic-core.",
      }),
    });

    expect(result.conformant).toBe(false);
    expect(result.issues.map((issue) => issue.kind)).toContain("unauthorized-project-lane");
    expect(result.evaluationPlanInvalid).toBe(true);
  });

  test("conformance passes when lane and validation packs are authorized", () => {
    const result = evaluateProjectScopeConformance({
      proposedFiles: ["src/lib/jsxGraphRenderer.ts"],
      projectRoot: PALANTIR_MATH_ROOT,
      semanticIntentContract: semanticContract(),
      digitalTwinChangeContract: digitalTwinContract(),
    });

    expect(result.conformant).toBe(true);
    expect(result.evaluationPlanInvalid).toBe(false);
    expect(result.issues).toEqual([]);
  });
});
