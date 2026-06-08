import { describe, expect, test } from "bun:test";
import {
  parseSkillOntologyContractResult,
} from "../../../lib/skills/skill-ontology-parser";
import { normalizeSkillOntologyContract } from "../../../lib/skills/skill-ontology-contract";
import type {
  SkillOntologyContract,
  SkillIntentMatcher,
} from "../../../lib/capability/capability-contract";

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

function minimalContract(input: {
  skillId: string;
  category: string;
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
});
