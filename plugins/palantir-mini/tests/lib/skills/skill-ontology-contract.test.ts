import { describe, expect, test } from "bun:test";
import {
  parseSkillOntologyContractResult,
} from "../../../lib/skills/skill-ontology-parser";
import {
  normalizeSkillOntologyContract,
  type SkillOntologyContract,
  type SkillIntentMatcher,
  type SkillOntologyCategory,
} from "../../../lib/skills/skill-ontology-contract";
import {
  routeSkillOntology,
} from "../../../lib/skills/skill-ontology-router";
import {
  buildLLMControlFacingState,
  type SemanticConversationState,
} from "../../../lib/chatbot-studio/semantic-conversation-state";
import type { OntologyActivation } from "../../../lib/context-engineering/ontology-activation";

const GOOD_SKILL = `---
name: palantir-math-expert
ontologySkill:
  version: "palantir-mini/skill-ontology/v1"
  category: "problem-authoring"
  userFacingPurpose: "Help the user turn a math teaching request into approved lesson meaning."
  leadFacingPurpose: "Reads problem artifacts and proposes ontology-safe problem authoring boundaries."
  requiresPromptDtc: true
  mayMutateProjectFiles: false
  intentExamples:
    - "problem 15 lecture trace를 수업에서 설명할 수 있게 정리해줘"
  intentNouns:
    - LectureProblem
    - MathLectureTrace
  intentVerbs:
    - derive
    - validate
  intentNegativeExamples:
    - "seq-data.json을 컴파일해줘"
  readSurfaces:
    - problems/*/solution.md
  writeSurfaces:
    - problems/*/solution.md
  knownIssueRefs:
    - problem15-lecture-trace-pilot
  outputOntology:
    - LectureProblem
    - SolutionStep
    - MathLectureTrace
---

## Inputs
- raw math problem
- teacher intent

## Outputs
- solution.md-level semantic interpretation

## Must not do
- generate Sequencer frame ordering directly

## Validation
- bun test tests/lib/skills/skill-ontology-contract.test.ts
`;

function conversationState(): SemanticConversationState {
  const stateId = "semantic-conversation:test";
  return {
    stateId,
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: { runtime: "codex" },
    userFacing: {
      preferredLanguage: "ko",
      userExpertise: "non_programmer",
      plainRequestSummary: "Problem 15 lecture trace review handoff",
      confirmedNonGoals: [],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: ["LectureProblem", "MathLectureTrace"],
      activatedActionRefs: ["derive"],
      activatedSurfaceRefs: [],
      activatedLaneRefs: [],
      forbiddenSurfaceRefs: ["Presenter runtime rewrite"],
    },
    skillFacing: {
      candidateSkillRefs: [{ skillId: "palantir-math-expert" }],
      selectedSkillRefs: [],
      skillRoutingReason: "candidate from user-approved meaning",
    },
    llmControlFacing: buildLLMControlFacingState(stateId),
    contractFacing: { dtcReady: false },
    projectFacing: {
      projectRoot: "/tmp/palantir-math",
      projectScopeLaneIds: [],
      requiredValidationPacks: [],
    },
    lifecycle: "semantic-approved",
  };
}

function ontologyActivation(): OntologyActivation {
  return {
    semanticIntentContractRef: "semantic:test",
    approvedNouns: ["LectureProblem", "MathLectureTrace"],
    approvedVerbs: ["derive", "validate"],
    affectedSurfaces: ["src/lib/learningTrace"],
    forbiddenSurfaces: ["Presenter runtime rewrite"],
    ontologyRefs: ["LectureProblem", "MathLectureTrace"],
    actionRefs: ["derive"],
    evaluationDirection: "directional-only",
    toolBoundaryDirection: "directional-only",
  };
}

function minimalContract(input: {
  skillId: string;
  category: SkillOntologyCategory;
  inputArtifacts: readonly string[];
  optionalInputs?: readonly string[];
  outputArtifacts: readonly string[];
  verbs: readonly string[];
  nouns: readonly string[];
  negativeExamples?: readonly string[];
}): SkillOntologyContract {
  const mutationSurface = input.skillId === "sequencer-math"
    ? "problems/*/seq-data.json"
    : "problems/*/solution.md";
  const matcher: SkillIntentMatcher = {
    matcherId: `${input.skillId}:default`,
    naturalLanguageExamples: [],
    nouns: input.nouns,
    verbs: input.verbs,
    projectScopeLanes: [],
    prerequisites: input.inputArtifacts,
    optionalExistingArtifacts: input.optionalInputs ?? [],
    createsArtifacts: input.outputArtifacts,
    consumesArtifacts: input.inputArtifacts,
    requiredArtifacts: input.inputArtifacts,
    negativeExamples: input.negativeExamples ?? [],
  };
  return {
    skillId: input.skillId,
    skillPath: `/tmp/${input.skillId}/SKILL.md`,
    displayName: input.skillId,
    category: input.category,
    userFacingPurpose: `${input.skillId} purpose`,
    leadFacingPurpose: `${input.skillId} lead boundary`,
    inputOntology: {
      objectRefs: input.nouns,
      requiredArtifacts: input.inputArtifacts,
      artifactLifecycle: {
        prerequisites: input.inputArtifacts,
        optionalInputs: input.optionalInputs ?? [],
        creates: input.outputArtifacts,
        mutates: [mutationSurface],
      },
      allowedRawInputs: [],
    },
    outputOntology: {
      objectRefs: input.nouns,
      artifactRefs: input.outputArtifacts,
      validationPacks: [`${input.skillId}:validation`],
    },
    actionBoundary: {
      mayMutateProjectFiles: true,
      mutationSurfaces: [mutationSurface],
      requiresDtcApproval: true,
      requiresTeacherApproval: true,
    },
    nonGoals: ["Do not cross skill boundary."],
    failureModes: ["Clarify weak ontology matches."],
    intentMatchers: [matcher],
  };
}

describe("SkillOntologyContract", () => {
  test("parses explicit ontologySkill frontmatter and known sections", () => {
    const result = parseSkillOntologyContractResult(
      GOOD_SKILL,
      "/tmp/palantir-math/.claude/skills/palantir-math-expert/SKILL.md",
    );

    expect(result.source.hasOntologySkillFrontmatter).toBe(true);
    expect(result.source.explicitMutationBoundary).toBe(true);
    expect(result.contract.skillId).toBe("palantir-math-expert");
    expect(result.contract.category).toBe("problem-authoring");
    expect(result.contract.outputOntology.objectRefs).toContain("MathLectureTrace");
    expect(result.contract.inputOntology.requiredArtifacts).toEqual([
      "raw math problem",
      "teacher intent",
    ]);
    expect(result.contract.inputOntology.artifactLifecycle.prerequisites).toEqual([
      "raw math problem",
      "teacher intent",
    ]);
    expect(result.contract.inputOntology.artifactLifecycle.creates).toContain(
      "solution.md-level semantic interpretation",
    );
    expect(result.contract.intentMatchers[0]?.naturalLanguageExamples[0]).toContain(
      "problem 15 lecture trace",
    );
    expect(result.contract.readSurfaces).toEqual(["problems/*/solution.md"]);
    expect(result.contract.knownIssueRefs).toEqual(["problem15-lecture-trace-pilot"]);
    expect(result.contract.nonGoals).toContain("generate Sequencer frame ordering directly");
    expect(result.issues.filter((issue) => issue.severity === "fail")).toEqual([]);
  });

  test("normalizes legacy requiredArtifacts into artifact lifecycle prerequisites", () => {
    const legacy = {
      ...minimalContract({
        skillId: "legacy-skill",
        category: "problem-authoring",
        inputArtifacts: ["solution.md"],
        outputArtifacts: ["seq-data.json"],
        nouns: ["SolutionStep"],
        verbs: ["compile"],
      }),
    } as unknown as SkillOntologyContract;
    delete (legacy.inputOntology as { artifactLifecycle?: unknown }).artifactLifecycle;

    const normalized = normalizeSkillOntologyContract(legacy);

    expect(normalized.inputOntology.requiredArtifacts).toEqual(["solution.md"]);
    expect(normalized.inputOntology.artifactLifecycle).toEqual({
      prerequisites: ["solution.md"],
      optionalInputs: [],
      creates: ["seq-data.json"],
      mutates: ["problems/*/solution.md"],
    });
  });

  test("keeps missing ontology frontmatter as a contract issue", () => {
    const result = parseSkillOntologyContractResult(
      "## User-facing purpose\nExplain a problem.\n",
      "/tmp/project/.claude/skills/legacy/SKILL.md",
    );

    expect(result.contract.skillId).toBe("legacy");
    expect(result.source.hasOntologySkillFrontmatter).toBe(false);
    expect(result.issues.map((issue) => issue.issueId)).toContain(
      "skill-ontology.missing-frontmatter",
    );
    expect(result.issues.map((issue) => issue.issueId)).toContain(
      "skill-ontology.missing-mutation-policy",
    );
  });

  test("routes skills by approved ontology refs and explicit candidate skill refs", () => {
    const contract = parseSkillOntologyContractResult(
      GOOD_SKILL,
      "/tmp/palantir-math/.claude/skills/palantir-math-expert/SKILL.md",
    ).contract;

    const result = routeSkillOntology({
      projectRoot: "/tmp/palantir-math",
      semanticConversationState: conversationState(),
      ontologyActivation: ontologyActivation(),
      availableSkills: [contract],
    });

    expect(result.selectedSkills.map((skill) => skill.skillId)).toEqual([
      "palantir-math-expert",
    ]);
    expect(result.decisions[0]?.matchedReasons).toContain("candidate skill ref matched");
    expect(result.requiredDtc).toBe(true);
    expect(result.rejectedSkills).toEqual([]);
  });

  test("keeps weak or negative intent matches out of selected routing", () => {
    const contract = parseSkillOntologyContractResult(
      GOOD_SKILL,
      "/tmp/palantir-math/.claude/skills/palantir-math-expert/SKILL.md",
    ).contract;
    const state = conversationState();
    const activation = {
      ...ontologyActivation(),
      approvedNouns: ["SeqData"],
      approvedVerbs: ["compile"],
      ontologyRefs: ["SeqData"],
      actionRefs: ["compile"],
    };

    const result = routeSkillOntology({
      projectRoot: "/tmp/palantir-math",
      semanticConversationState: {
        ...state,
        userFacing: {
          ...state.userFacing,
          plainRequestSummary: "seq-data.json을 컴파일해줘",
        },
        skillFacing: {
          candidateSkillRefs: [],
          selectedSkillRefs: [],
          skillRoutingReason: "raw request only",
        },
      },
      ontologyActivation: activation,
      availableSkills: [contract],
    });

    expect(result.selectedSkills).toEqual([]);
    expect(result.decisions[0]?.decision).toBe("rejected");
    expect(result.rejectedSkills[0]?.reason).toContain("negative example matched");
  });

  test("separates first-time authoring outputs from compile prerequisites", () => {
    const expert = minimalContract({
      skillId: "palantir-math-expert",
      category: "problem-authoring",
      inputArtifacts: ["raw math problem", "teacher intent"],
      optionalInputs: ["existing solution.md for revision"],
      outputArtifacts: ["solution.md"],
      nouns: ["Problem", "SolutionStep"],
      verbs: ["author", "정리"],
      negativeExamples: ["seq-data.json을 컴파일해줘"],
    });
    const sequencer = minimalContract({
      skillId: "sequencer-math",
      category: "sequencer-compile",
      inputArtifacts: ["solution.md"],
      optionalInputs: ["trials.md when present"],
      outputArtifacts: ["seq-data.json"],
      nouns: ["SeqData", "SeqStep"],
      verbs: ["compile", "컴파일"],
      negativeExamples: ["solution.md 의미만 작성해줘"],
    });
    const state = conversationState();

    const authoring = routeSkillOntology({
      projectRoot: "/tmp/palantir-math",
      semanticConversationState: {
        ...state,
        userFacing: {
          ...state.userFacing,
          plainRequestSummary: "이 문제를 수업에서 설명할 수 있게 정리해줘",
        },
        ontologyFacing: {
          ...state.ontologyFacing,
          activatedObjectRefs: ["Problem", "SolutionStep"],
          activatedActionRefs: ["author", "정리"],
          activatedSurfaceRefs: [],
        },
        skillFacing: {
          candidateSkillRefs: [],
          selectedSkillRefs: [],
          skillRoutingReason: "lifecycle authoring check",
        },
      },
      ontologyActivation: {
        ...ontologyActivation(),
        approvedNouns: ["Problem", "SolutionStep"],
        approvedVerbs: ["author", "정리"],
        affectedSurfaces: [],
        ontologyRefs: ["Problem", "SolutionStep"],
        actionRefs: ["author", "정리"],
      },
      availableSkills: [expert, sequencer],
    });

    expect(authoring.selectedSkills.map((skill) => skill.skillId)).toEqual([
      "palantir-math-expert",
    ]);

    const compile = routeSkillOntology({
      projectRoot: "/tmp/palantir-math",
      semanticConversationState: {
        ...state,
        userFacing: {
          ...state.userFacing,
          plainRequestSummary: "approved solution.md를 seq-data.json으로 컴파일해줘",
        },
        ontologyFacing: {
          ...state.ontologyFacing,
          activatedObjectRefs: ["SeqData", "SeqStep"],
          activatedActionRefs: ["compile", "컴파일"],
          activatedSurfaceRefs: ["solution.md"],
        },
        skillFacing: {
          candidateSkillRefs: [],
          selectedSkillRefs: [],
          skillRoutingReason: "lifecycle compile check",
        },
      },
      ontologyActivation: {
        ...ontologyActivation(),
        approvedNouns: ["SeqData", "SeqStep"],
        approvedVerbs: ["compile", "컴파일"],
        affectedSurfaces: ["solution.md"],
        ontologyRefs: ["SeqData", "SeqStep"],
        actionRefs: ["compile", "컴파일"],
      },
      availableSkills: [expert, sequencer],
    });

    expect(compile.selectedSkills.map((skill) => skill.skillId)).toEqual([
      "sequencer-math",
    ]);
    expect(compile.decisions[0]?.matchedReasons).toContain(
      "input artifact lifecycle matcher matched",
    );
  });
});
