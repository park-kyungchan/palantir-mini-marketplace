import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  loadProjectOntologyIndex,
  PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
} from "../../../lib/capability/project-ontology-index";
import type { CapabilityContract, SkillOntologyContract } from "../../../lib/capability/capability-contract";
import type { KnownIssue } from "../../../lib/issues/known-issue";
import type { ProjectScopeDefinition } from "../../../lib/project-scope/loader";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function minimalProjectScope(projectId: string): ProjectScopeDefinition {
  return {
    projectId,
    sourcePath: ".palantir-mini/project-scope.json",
    writableRoot: ".",
    forbiddenPatterns: ["src/generated/**"],
    domainAgents: ["project-implementer"],
    pathMarkers: [`projects/${projectId}/`, `${projectId}/`],
    projectOntologyAxes: [],
    surfaceMutationBoundaries: [
      {
        surface: ".palantir-mini/**",
        owns: ["ontology runtime config"],
        mustNotOwn: ["application runtime"],
        durableWriteBoundary: "config only",
      },
    ],
    seqDataLaneInventory: [
      {
        id: "ontology-runtime.smoke",
        axis: "ontology-runtime",
        fields: ["ontology-index"],
        writerSurfaces: [".palantir-mini/ontology-index/project.json"],
        readerSurfaces: [".palantir-mini/semantic-manifest.json"],
        durableBoundary: "Smoke config only.",
        currentAuthority: [".palantir-mini/project-scope.json"],
        descenders: ["tests/ontology-context-smoke.test.ts"],
        validationPacks: [`${projectId}:scope-pack`],
        changeContractId: "semantic-intent:test",
      },
    ],
    projectOntologyScopeRedesign: {
      id: `${projectId}:runtime`,
      status: "smoke",
      purpose: "Test scope",
      validationLadder: ["bun test tests/ontology-context-smoke.test.ts"],
    },
  };
}

function smokeCapability(projectId: string): CapabilityContract {
  return {
    schemaVersion: "palantir-mini/capability-contract/v1",
    capabilityId: `${projectId}:ontology-runtime-smoke`,
    sourceKind: "ontology-index",
    sourceRef: ".palantir-mini/ontology-index/project.json",
    displayName: `${projectId} ontology runtime smoke`,
    category: "generic",
    userFacingPurpose: "Validate project ontology runtime context loading.",
    leadFacingPurpose: "Read-only smoke capability.",
    inputOntology: {
      objectRefs: [projectId],
      requiredArtifacts: [".palantir-mini/ontology-index/project.json"],
      artifactLifecycle: {
        prerequisites: [".palantir-mini/ontology-index/project.json"],
        optionalInputs: [],
        creates: [],
        mutates: [],
      },
      allowedRawInputs: ["ontology context smoke"],
    },
    outputOntology: {
      objectRefs: [projectId, "OntologyContextSeed"],
      artifactRefs: [],
      validationPacks: [`${projectId}:index-pack`],
    },
    actionBoundary: {
      mayMutateProjectFiles: false,
      mutationSurfaces: [],
      requiresDtcApproval: false,
    },
    nonGoals: ["No runtime mutation."],
    failureModes: ["Missing index."],
    intentMatchers: [
      {
        matcherId: `${projectId}:smoke`,
        naturalLanguageExamples: ["ontology context smoke"],
        nouns: [projectId, "OntologyContextSeed"],
        verbs: ["validate", "smoke"],
        projectScopeLanes: ["ontology-runtime.smoke"],
      },
    ],
    readSurfaces: [".palantir-mini/ontology-index/project.json"],
    writeSurfaces: [],
    knownIssueRefs: [],
  };
}

function skillContract(): SkillOntologyContract {
  return {
    skillId: "palantir-math-expert",
    skillPath: ".claude/skills/palantir-math-expert/SKILL.md",
    displayName: "palantir-math-expert",
    category: "problem-authoring",
    userFacingPurpose: "Author teacher-approved math problem semantics.",
    leadFacingPurpose: "Convert raw math intent into solution.md semantics.",
    inputOntology: {
      objectRefs: ["LectureProblem"],
      requiredArtifacts: ["raw math problem"],
      artifactLifecycle: {
        prerequisites: ["raw math problem"],
        optionalInputs: [],
        creates: ["solution.md"],
        mutates: ["problems/*/solution.md"],
      },
      allowedRawInputs: ["math problem statement"],
    },
    outputOntology: {
      objectRefs: ["LectureProblem", "SolutionStep"],
      artifactRefs: ["solution.md"],
      validationPacks: ["problem15SemanticConversationPilot"],
    },
    actionBoundary: {
      mayMutateProjectFiles: true,
      mutationSurfaces: ["problems/*/solution.md"],
      requiresDtcApproval: true,
      requiresTeacherApproval: true,
    },
    nonGoals: ["Do not compile seq-data.json."],
    failureModes: ["Ambiguous teacher intent."],
    intentMatchers: [
      {
        matcherId: "palantir-math-expert:raw-problem",
        naturalLanguageExamples: ["problem 15 lecture trace"],
        nouns: ["problem", "lecture trace"],
        verbs: ["explain", "author"],
        projectScopeLanes: [],
      },
    ],
    readSurfaces: ["problems/*/solution.md"],
    writeSurfaces: ["problems/*/solution.md"],
    knownIssueRefs: ["problem15-lecture-trace-pilot"],
  };
}

function knownIssue(): KnownIssue {
  return {
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
    recommendedAction: "Keep this as pilot evidence.",
    sourceRefs: ["pr:#385"],
  };
}

describe("ProjectOntologyIndex", () => {
  test("deterministically merges ontology fragments, skill registry, project scope, and known issues", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-project-index-"));
    try {
      writeJson(path.join(projectRoot, "package.json"), { name: "@palantirKC/palantir-math" });
      writeJson(path.join(projectRoot, ".palantir-mini", "project-scope.json"), minimalProjectScope("palantir-math"));
      writeJson(path.join(projectRoot, ".palantir-mini", "ontology-index", "project.json"), {
        schemaVersion: PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
        projectId: "palantir-math",
        capabilities: [smokeCapability("palantir-math")],
        surfaces: [
          {
            surfaceId: "palantir-math:ontology-config",
            kind: "authority",
            path: ".palantir-mini/**",
            sourceRef: ".palantir-mini/ontology-index/project.json",
            laneRefs: ["ontology-runtime.smoke"],
          },
        ],
        validationPacks: [
          {
            validationPackId: "palantir-math:index-pack",
            command: "bun test tests/ontology-context-smoke.test.ts",
            sourceRef: ".palantir-mini/ontology-index/project.json",
            required: true,
          },
        ],
        warnings: ["index warning"],
      });
      writeJson(path.join(projectRoot, ".palantir-mini", "skill-ontology", "skill-registry.json"), {
        schemaVersion: "palantir-mini/project-skill-ontology-registry/v1",
        projectId: "palantir-math",
        contracts: [skillContract()],
      });
      writeJson(path.join(projectRoot, ".palantir-mini", "issues", "known-issues.json"), {
        schemaVersion: "palantir-mini/known-issues/v1",
        projectId: "palantir-math",
        issues: [knownIssue()],
      });

      const index = loadProjectOntologyIndex(projectRoot, "2026-05-12T00:00:00.000Z");

      expect(index.projectId).toBe("palantir-math");
      expect(index.capabilities.map((capability) => capability.capabilityId)).toEqual([
        "known-issue:problem15-lecture-trace-pilot",
        "palantir-math-expert",
        "palantir-math:ontology-runtime-smoke",
      ]);
      expect(index.surfaces.map((surface) => surface.surfaceId)).toContain("boundary:.palantir-mini/**");
      expect(index.validationPacks.map((pack) => pack.validationPackId)).toEqual([
        "palantir-math:index-pack",
        "palantir-math:scope-pack",
        "problem15SemanticConversationPilot",
      ]);
      expect(index.knownIssues.map((issue) => issue.issueId)).toEqual([
        "problem15-lecture-trace-pilot",
      ]);
      expect(index.warnings).toEqual(["index warning"]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
