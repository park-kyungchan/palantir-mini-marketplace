import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { queryOntologyContext } from "../../../lib/ontology-context/query";
import type { KnownIssue } from "../../../lib/issues/known-issue";
import type { SkillOntologyContract } from "../../../lib/skills/skill-ontology-contract";

const PALANTIR_MATH_EXPERT: SkillOntologyContract = {
  skillId: "palantir-math-expert",
  skillPath: ".claude/skills/palantir-math-expert/SKILL.md",
  displayName: "palantir-math-expert",
  category: "problem-authoring",
  userFacingPurpose: "Turn a teacher's math problem request into approved lesson meaning.",
  leadFacingPurpose: "Author solution.md-level problem semantics only.",
  inputOntology: {
    objectRefs: ["LectureProblem", "MathLectureTrace"],
    requiredArtifacts: ["raw math problem", "teacher intent"],
    artifactLifecycle: {
      prerequisites: ["raw math problem", "teacher intent"],
      optionalInputs: ["existing solution.md for revision"],
      creates: ["solution.md"],
      mutates: ["problems/*/solution.md"],
    },
    allowedRawInputs: ["math problem statement"],
  },
  outputOntology: {
    objectRefs: ["LectureProblem", "SolutionStep", "MathLectureTrace"],
    artifactRefs: ["solution.md", "learningTrace"],
    validationPacks: ["learningTraceProblem15"],
  },
  actionBoundary: {
    mayMutateProjectFiles: true,
    mutationSurfaces: ["problems/*/solution.md"],
    requiresDtcApproval: true,
    requiresTeacherApproval: true,
  },
  nonGoals: ["Do not rewrite Sequencer runtime."],
  failureModes: ["Clarify ambiguous teacher intent before authoring."],
  intentMatchers: [
    {
      matcherId: "palantir-math-expert:lecture-trace",
      naturalLanguageExamples: ["이 문제를 수업에서 설명할 수 있게 정리해줘"],
      nouns: ["problem", "lecture trace", "수업"],
      verbs: ["정리", "explain"],
      projectScopeLanes: [],
      prerequisites: ["raw math problem", "teacher intent"],
      optionalExistingArtifacts: ["solution.md for revision"],
      createsArtifacts: ["solution.md"],
      consumesArtifacts: ["raw math problem", "teacher intent"],
      requiredArtifacts: ["problem"],
      negativeExamples: ["seq-data.json을 컴파일해줘"],
    },
  ],
  readSurfaces: ["problems/*/solution.md"],
  writeSurfaces: ["problems/*/solution.md"],
  knownIssueRefs: ["problem15-lecture-trace-pilot"],
};

const ISSUE: KnownIssue = {
  issueId: "problem15-lecture-trace-pilot",
  projectId: "palantir-math",
  title: "Problem 15 lecture trace remains pilot-scoped",
  source: "manual-pilot",
  firstObservedAt: "2026-05-12T00:00:00.000Z",
  lastObservedAt: "2026-05-12T00:00:00.000Z",
  observedCount: 1,
  mitigationStatus: "unmitigated",
  triggerPatterns: ["problem 15", "lecture trace"],
  affectedCapabilityRefs: ["palantir-math-expert"],
  affectedSurfaceRefs: ["problems/*/solution.md"],
  validationPackRefs: ["problem15SemanticConversationPilot"],
  severity: "medium",
  status: "watching",
  recommendedAction: "Keep problem 15 as pilot evidence; do not promote it to global default.",
  sourceRefs: ["pr:#385"],
};

describe("OntologyContextQuery", () => {
  test("retrieves skills, impact, known issues, and validation context from a universal entry", () => {
    const entry = createUniversalOntologyEntry({
      rawUserRequest: "problem 15 lecture trace를 수업에서 설명할 수 있게 정리해줘.",
      projectRoot: "/tmp/palantir-math",
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    const result = queryOntologyContext({
      entry,
      projectRoot: "/tmp/palantir-math",
      availableSkills: [PALANTIR_MATH_EXPERT],
      knownIssues: [ISSUE],
    });

    expect(result.entryId).toBe(entry.entryId);
    expect(result.contextSeed.approvalState).toBe("unapproved-context-seed");
    expect(result.contextSeed.sourceEntryId).toBe(entry.entryId);
    expect(result.skillContext.selectedSkillIds).toEqual(["palantir-math-expert"]);
    expect(result.capabilityContext.selectedCapabilityIds).toContain("palantir-math-expert");
    expect(result.capabilityContext.requiredDtc).toBe(true);
    expect(result.impactContext.directSurfaceRefs).toContain("problems/*/solution.md");
    expect(result.issueContext.knownIssueIds).toEqual(["problem15-lecture-trace-pilot"]);
    expect(result.validationContext.requiredValidationPacks).toContain("learningTraceProblem15");
    expect(result.validationContext.requiredValidationPacks).toContain(
      "problem15SemanticConversationPilot",
    );
    expect(result.retrievedPrompt).toContain("Selected skills: palantir-math-expert");
    expect(result.retrievedPrompt).toContain("Selected capabilities:");
    expect(result.retrievedPrompt).toContain("Context approval: unapproved-context-seed");
  });

  test("loads project-local skill registry and known issue store deterministically", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-context-"));
    fs.mkdirSync(path.join(projectRoot, ".palantir-mini", "skill-ontology"), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, ".palantir-mini", "issues"), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, ".palantir-mini", "skill-ontology", "skill-registry.json"),
      `${JSON.stringify({
        schemaVersion: "palantir-mini/project-skill-ontology-registry/v1",
        projectId: "palantir-math",
        contracts: [PALANTIR_MATH_EXPERT],
      }, null, 2)}\n`,
      "utf8",
    );
    fs.writeFileSync(
      path.join(projectRoot, ".palantir-mini", "issues", "known-issues.json"),
      `${JSON.stringify({
        schemaVersion: "palantir-mini/known-issues/v1",
        projectId: "palantir-math",
        issues: [ISSUE],
      }, null, 2)}\n`,
      "utf8",
    );
    const entry = createUniversalOntologyEntry({
      rawUserRequest: "problem 15 lecture trace를 수업에서 설명할 수 있게 정리해줘.",
      projectRoot,
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    const result = queryOntologyContext({ entry, projectRoot });

    expect(result.skillContext.selectedSkillIds).toEqual(["palantir-math-expert"]);
    expect(result.capabilityContext.selectedCapabilityIds).toContain("palantir-math-expert");
    expect(result.issueContext.knownIssueIds).toEqual(["problem15-lecture-trace-pilot"]);
  });
});
