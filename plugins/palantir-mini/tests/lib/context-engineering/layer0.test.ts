import { describe, expect, test } from "bun:test";
import { buildLayer0IntentBridge } from "../../../lib/context-engineering/intent-bridge";
import {
  gradeLayer0Readiness,
  validateClarificationGuardRails,
} from "../../../lib/context-engineering/clarification-guards";
import {
  deriveOntologyActivation,
  draftDigitalTwinFromOntologyActivation,
} from "../../../lib/context-engineering/ontology-activation";
import { createSemanticClarificationQuestions } from "../../../lib/lead-intent/contracts";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";

describe("Layer 0 AIP #3/#4 context engineering", () => {
  test("builds a #3/#4-first bridge and treats #5/#7 as directional axes", () => {
    const bridge = buildLayer0IntentBridge({
      rawIntent: "palantir-math problem 15에 LearningTrace를 추가해줘",
      projectRoot: "/home/palantirkc/projects/palantir-math",
      scopePaths: ["projects/palantir-math/src/lib/learningTrace.ts"],
    });

    expect(bridge.requiredAxes).toEqual([
      "aip-3-context-engineering",
      "aip-4-ontology",
    ]);
    expect(bridge.directionalAxes).toEqual([
      "aip-5-vector-compute-tool-services",
      "aip-7-agent-lifecycle",
    ]);
    expect(bridge.evidenceRefs.some((ref) => ref.axis === "aip-3-context-engineering")).toBe(true);
    expect(bridge.evidenceRefs.some((ref) => ref.axis === "aip-4-ontology")).toBe(true);
  });

  test("validates non-programmer clarification guard rails", () => {
    const questions = createSemanticClarificationQuestions({
      intent: "ontology contract를 바꿔줘",
      scopePaths: ["ontology/data.ts"],
    });

    const result = validateClarificationGuardRails(questions);
    expect(result.ok).toBe(true);
    expect(
      questions.every(
        (question) => question.decisionSpec.choices[0]?.label === "추천 경계 확인",
      ),
    ).toBe(true);
  });

  test("clarifications carry decisionSpec plus non-empty primitive prompt + recommendedAnswer", () => {
    const questions = createSemanticClarificationQuestions({
      intent: "ontology contract를 바꿔줘",
      scopePaths: ["ontology/data.ts"],
    });

    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      // Re-tightened lib clarification keeps decisionSpec mandatory (Slice 3).
      expect(question.decisionSpec).toBeDefined();
      expect(question.decisionSpec.choices.length).toBeGreaterThan(0);
      // …while INHERITING the primitive's now-required prompt + recommendedAnswer.
      expect(question.prompt.trim().length).toBeGreaterThan(0);
      expect(question.recommendedAnswer.trim().length).toBeGreaterThan(0);
    }
  });

  test("#3/#4 omissions fail while #5/#7 omissions warn only", () => {
    const bridge = buildLayer0IntentBridge({
      rawIntent: "ontology proposal을 만들어줘",
      projectRoot: "/tmp/project",
      scopePaths: ["ontology/data.ts"],
    });

    const grade = gradeLayer0Readiness({
      bridge: { ...bridge, directionalAxes: [] } as never,
      semanticIntentApproved: false,
      digitalTwinReady: false,
    });

    expect(grade.verdict).toBe("fail");
    expect(grade.blockingReasons.join("\n")).toContain("SemanticIntentContract is not approved");
    expect(grade.warnings.join("\n")).toContain("AIP #5");
    expect(grade.warnings.join("\n")).toContain("AIP #7");
  });

  test("approved SemanticIntentContract activates ontology refs and drafts DTC", () => {
    const contract: SemanticIntentContract = {
      schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
      contractId: "sic:test",
      status: "approved",
      rawIntent: "Add LearningTrace",
      confirmedIntent: "Add LearningTrace to problem 15 only",
      nonGoals: ["Do not rewrite Sequencer"],
      approvedNouns: ["LearningTrace", "problem 15"],
      approvedVerbs: ["add", "validate"],
      affectedSurfaces: ["src/lib/learningTrace.ts"],
      approvedObjectTypeRefs: ["objectType:LearningTrace" as never],
      approvedActionTypeRefs: ["actionType:addLearningTrace" as never],
      permissionsAndProposal: "branch-only",
      acceptedRisks: [],
      downstreamAllowed: ["src/lib/learningTrace.ts"],
      downstreamForbidden: ["src/sequencer/**"],
      clarificationQuestions: [],
      approvalRef: "user:approved:layer0",
    };

    const activation = deriveOntologyActivation(contract);
    expect(activation.ontologyRefs).toContain("objectType:LearningTrace");
    expect(activation.actionRefs).toContain("actionType:addLearningTrace");
    expect(activation.forbiddenSurfaces).toContain("src/sequencer/**");

    const dtc = draftDigitalTwinFromOntologyActivation(contract);
    expect(dtc.semanticIntentContractRef).toBe("sic:test");
    expect(dtc.toolSurfaceReadiness).toContain("AIP #5");
    expect(dtc.evaluationPlan).toContain("AIP #7");
  });

  test("unapproved SemanticIntentContract cannot activate #4 Ontology", () => {
    const contract = {
      schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
      contractId: "sic:draft",
      status: "draft",
      rawIntent: "x",
      confirmedIntent: "x",
      nonGoals: [],
      approvedNouns: ["x"],
      approvedVerbs: ["change"],
      affectedSurfaces: ["ontology/data.ts"],
      permissionsAndProposal: "branch-only",
      acceptedRisks: [],
      downstreamAllowed: [],
      downstreamForbidden: [],
      clarificationQuestions: [],
    } as SemanticIntentContract;

    expect(() => deriveOntologyActivation(contract)).toThrow(/requires an approved/);
  });
});
