import { describe, expect, test } from "bun:test";
import { routeCapabilityOntology } from "../../../lib/capability/capability-router";
import type { CapabilityContract } from "../../../lib/capability/capability-contract";
import type { OntologyContextSeed } from "../../../lib/context-engineering/ontology-activation";
import {
  buildLLMControlFacingState,
  type SemanticConversationState,
} from "../../../lib/chatbot-studio/semantic-conversation-state";

function capability(input: {
  id: string;
  category: CapabilityContract["category"];
  nouns: readonly string[];
  verbs: readonly string[];
  examples: readonly string[];
  requiredArtifacts: readonly string[];
  creates: readonly string[];
  mutates: readonly string[];
  validationPacks: readonly string[];
  negativeExamples?: readonly string[];
}): CapabilityContract {
  return {
    schemaVersion: "palantir-mini/capability-contract/v1",
    capabilityId: input.id,
    sourceKind: "ontology-index",
    sourceRef: ".palantir-mini/ontology-index/project.json",
    displayName: input.id,
    category: input.category,
    userFacingPurpose: `${input.id} user purpose`,
    leadFacingPurpose: `${input.id} lead purpose`,
    inputOntology: {
      objectRefs: input.nouns,
      requiredArtifacts: input.requiredArtifacts,
      artifactLifecycle: {
        prerequisites: input.requiredArtifacts,
        optionalInputs: [],
        creates: input.creates,
        mutates: input.mutates,
      },
      allowedRawInputs: input.examples,
    },
    outputOntology: {
      objectRefs: input.nouns,
      artifactRefs: input.creates,
      validationPacks: input.validationPacks,
    },
    actionBoundary: {
      mayMutateProjectFiles: input.mutates.length > 0,
      mutationSurfaces: input.mutates,
      requiresDtcApproval: input.mutates.length > 0,
    },
    nonGoals: ["Stay within approved capability boundary."],
    failureModes: ["Weak ontology match requires clarification."],
    intentMatchers: [
      {
        matcherId: `${input.id}:primary`,
        naturalLanguageExamples: input.examples,
        nouns: input.nouns,
        verbs: input.verbs,
        projectScopeLanes: [],
        requiredArtifacts: input.requiredArtifacts,
        createsArtifacts: input.creates,
        consumesArtifacts: input.requiredArtifacts,
        negativeExamples: input.negativeExamples ?? [],
      },
    ],
    readSurfaces: input.requiredArtifacts,
    writeSurfaces: input.mutates,
    knownIssueRefs: [],
  };
}

const PALANTIR_MATH_EXPERT = capability({
  id: "palantir-math-expert",
  category: "problem-authoring",
  nouns: ["LectureProblem", "problem", "lecture trace"],
  verbs: ["author", "explain", "정리"],
  examples: ["problem 15 lecture trace를 수업에서 설명할 수 있게 정리"],
  requiredArtifacts: ["raw math problem", "teacher intent"],
  creates: ["solution.md"],
  mutates: ["problems/*/solution.md"],
  validationPacks: ["problem15SemanticConversationPilot"],
  negativeExamples: ["seq-data.json을 컴파일"],
});

const SEQUENCER_MATH = capability({
  id: "sequencer-math",
  category: "sequencer-compile",
  nouns: ["SeqData", "solution.md", "compiled lesson"],
  verbs: ["compile", "generate", "build"],
  examples: ["approved solution.md compile intent into seq-data.json"],
  requiredArtifacts: ["approved solution.md"],
  creates: ["seq-data.json"],
  mutates: ["ontology/data/sequencer.ts"],
  validationPacks: ["learningTraceProblem15"],
  negativeExamples: ["raw math problem statement only"],
});

function conversation(summary: string): SemanticConversationState {
  const stateId = "semantic-conversation:test";
  return {
    stateId,
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: {},
    userFacing: {
      preferredLanguage: "ko",
      userExpertise: "developer",
      plainRequestSummary: summary,
      confirmedNonGoals: [],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: [],
      activatedActionRefs: [],
      activatedSurfaceRefs: [],
      activatedLaneRefs: [],
      forbiddenSurfaceRefs: [],
    },
    skillFacing: {
      candidateSkillRefs: [],
      selectedSkillRefs: [],
      skillRoutingReason: "test",
    },
    capabilityFacing: {
      candidateCapabilityRefs: [],
      selectedCapabilityRefs: [],
      capabilityRoutingReason: "test",
    },
    llmControlFacing: buildLLMControlFacingState(stateId),
    contractFacing: {
      dtcReady: false,
    },
    projectFacing: {
      projectRoot: "/tmp/palantir-math",
      projectScopeLaneIds: [],
      requiredValidationPacks: [],
    },
    lifecycle: "captured",
  };
}

function context(seed: {
  nouns: readonly string[];
  verbs: readonly string[];
  surfaces: readonly string[];
}): OntologyContextSeed {
  return {
    approvalState: "unapproved-context-seed",
    sourceEntryId: "universal-ontology-entry:test",
    nouns: seed.nouns,
    verbs: seed.verbs,
    surfaceHints: seed.surfaces,
    capabilityHints: [],
    laneRefs: [],
    ontologyRefs: seed.nouns,
    actionRefs: seed.verbs,
    evaluationDirection: "directional-only",
    toolBoundaryDirection: "directional-only",
  };
}

describe("CapabilityRouter", () => {
  test("selects palantir-math-expert for raw problem authoring intent", () => {
    const result = routeCapabilityOntology({
      projectRoot: "/tmp/palantir-math",
      semanticConversationState: conversation("problem 15 lecture trace를 수업에서 설명할 수 있게 정리해줘"),
      ontologyContext: context({
        nouns: ["problem", "lecture trace"],
        verbs: ["explain", "정리"],
        surfaces: ["raw math problem", "solution.md"],
      }),
      availableCapabilities: [PALANTIR_MATH_EXPERT, SEQUENCER_MATH],
      maxSelected: 1,
    });

    expect(result.selectedCapabilities.map((item) => item.capabilityId)).toEqual([
      "palantir-math-expert",
    ]);
    expect(result.requiredDtc).toBe(true);
  });

  test("selects sequencer-math for approved solution.md compile intent", () => {
    const result = routeCapabilityOntology({
      projectRoot: "/tmp/palantir-math",
      semanticConversationState: conversation("approved solution.md compile intent into seq-data.json for Sequencer"),
      ontologyContext: context({
        nouns: ["SeqData", "solution.md"],
        verbs: ["compile", "generate"],
        surfaces: ["approved solution.md", "seq-data.json"],
      }),
      availableCapabilities: [PALANTIR_MATH_EXPERT, SEQUENCER_MATH],
      maxSelected: 1,
    });

    expect(result.selectedCapabilities.map((item) => item.capabilityId)).toEqual([
      "sequencer-math",
    ]);
    expect(result.requiredDtc).toBe(true);
  });
});
