import * as fs from "node:fs";
import * as path from "node:path";
import { atomicWriteJsonSync } from "../fs-atomic";
import { PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION } from "./project-ontology-index";

export interface ProjectOntologyScaffoldInput {
  readonly projectRoot: string;
  readonly projectId?: string;
  readonly projectKind?: "education" | "media" | "generic";
  readonly validationCommand?: string;
}

export interface ProjectOntologyScaffoldResult {
  readonly projectRoot: string;
  readonly writtenPaths: readonly string[];
}

function projectIdFromRoot(projectRoot: string): string {
  return path.basename(projectRoot).replace(/[^A-Za-z0-9._-]+/g, "-");
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

export function scaffoldProjectOntologyRuntime(
  input: ProjectOntologyScaffoldInput,
): ProjectOntologyScaffoldResult {
  const projectId = input.projectId ?? projectIdFromRoot(input.projectRoot);
  const projectKind = input.projectKind ?? "generic";
  const validationCommand = input.validationCommand ?? "bun test tests/ontology-context-smoke.test.ts";
  const writtenPaths: string[] = [];

  const indexPath = path.join(input.projectRoot, ".palantir-mini", "ontology-index", "project.json");
  atomicWriteJsonSync(indexPath, {
    schemaVersion: PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
    projectId,
    warnings: [
      "Scaffolded ontology index: add project-owned capabilities before relying on automatic routing.",
    ],
    capabilities: [
      {
        schemaVersion: "palantir-mini/capability-contract/v1",
        capabilityId: `${projectId}:ontology-runtime-smoke`,
        sourceKind: "ontology-index",
        sourceRef: ".palantir-mini/ontology-index/project.json",
        displayName: `${projectId} ontology runtime smoke`,
        category: "generic",
        userFacingPurpose: `Validate ${projectId} palantir-mini ontology runtime context wiring.`,
        leadFacingPurpose: "Smoke-only onboarding capability. It can read config and tests but cannot authorize runtime mutation.",
        inputOntology: {
          objectRefs: [projectId, projectKind],
          requiredArtifacts: [".palantir-mini/ontology-index/project.json"],
          artifactLifecycle: {
            prerequisites: [".palantir-mini/ontology-index/project.json"],
            optionalInputs: [".palantir-mini/semantic-manifest.json"],
            creates: [],
            mutates: [],
          },
          allowedRawInputs: ["ontology context smoke", "palantir-mini onboarding"],
        },
        outputOntology: {
          objectRefs: [projectId, "OntologyContextSeed"],
          artifactRefs: [],
          validationPacks: [`${projectId}:ontology-context-smoke`],
        },
        actionBoundary: {
          mayMutateProjectFiles: false,
          mutationSurfaces: [],
          requiresDtcApproval: false,
        },
        nonGoals: ["Do not treat scaffolded smoke capability as runtime source authority."],
        failureModes: ["Missing project-scope.json falls back to plugin education defaults."],
        intentMatchers: [
          {
            matcherId: `${projectId}:ontology-runtime-smoke`,
            naturalLanguageExamples: ["ontology context smoke test"],
            nouns: [projectId, "OntologyContextSeed"],
            verbs: ["validate", "smoke"],
            projectScopeLanes: [],
          },
        ],
        readSurfaces: [
          ".palantir-mini/ontology-index/project.json",
          ".palantir-mini/semantic-manifest.json",
        ],
        writeSurfaces: [],
        knownIssueRefs: [],
      },
    ],
    surfaces: [
      {
        surfaceId: `${projectId}:palantir-mini-config`,
        kind: "authority",
        path: ".palantir-mini/**",
        sourceRef: ".palantir-mini/ontology-index/project.json",
        laneRefs: [],
      },
    ],
    validationPacks: [
      {
        validationPackId: `${projectId}:ontology-context-smoke`,
        command: validationCommand,
        sourceRef: ".palantir-mini/ontology-index/project.json",
        required: true,
      },
    ],
  });
  writtenPaths.push(indexPath);

  const scopePath = path.join(input.projectRoot, ".palantir-mini", "project-scope.json");
  if (!fs.existsSync(scopePath)) {
    atomicWriteJsonSync(scopePath, {
      projectId,
      sourcePath: ".palantir-mini/project-scope.json",
      writableRoot: ".",
      forbiddenPatterns: ["src/generated/**"],
      domainAgents: ["project-implementer"],
      pathMarkers: [`projects/${projectId}/`, `${projectId}/`],
      projectOntologyAxes: [
        {
          id: "ontology-runtime",
          owns: ["palantir-mini context onboarding", "smoke validation"],
          currentAuthority: [".palantir-mini/ontology-index/project.json"],
          descenders: ["tests/ontology-context-smoke.test.ts"],
          migrationTarget: "Keep context onboarding additive and config-scoped.",
          bottleneck: "Project lacks a full generic ProjectOntologyIndex.",
          laneRefs: ["ontology-runtime.smoke"],
        },
      ],
      surfaceMutationBoundaries: [
        {
          surface: ".palantir-mini/**",
          owns: ["palantir-mini config and session artifacts"],
          mustNotOwn: ["application runtime implementation"],
          durableWriteBoundary: "config and smoke evidence only",
        },
      ],
      seqDataLaneInventory: [
        {
          id: "ontology-runtime.smoke",
          axis: "ontology-runtime",
          fields: ["ontology-index", "known-issues", "validation-packs"],
          writerSurfaces: [".palantir-mini/ontology-index/project.json"],
          readerSurfaces: [".palantir-mini/semantic-manifest.json"],
          durableBoundary: "Smoke validates config/index loading only.",
          currentAuthority: [".palantir-mini/project-scope.json"],
          descenders: ["tests/ontology-context-smoke.test.ts"],
          validationPacks: [`${projectId}:ontology-context-smoke`],
          changeContractId: "semantic-intent:universal-ontology-infra-2026-05-12",
        },
      ],
      projectOntologyScopeRedesign: {
        id: `${projectId}:ontology-runtime-onboarding`,
        status: "smoke",
        purpose: "Provide the minimum ProjectOntologyIndex surface for generic context routing.",
        validationLadder: [validationCommand],
        nonGoals: ["No runtime src implementation changes."],
      },
    });
    writtenPaths.push(scopePath);
  }

  const readmePath = path.join(input.projectRoot, ".palantir-mini", "ontology-index", "README.md");
  writeText(readmePath, [
    "# palantir-mini Ontology Runtime",
    "",
    "This directory stores additive ProjectOntologyIndex fragments.",
    "UniversalOntologyEntry and OntologyContextSeed are retrieval, scoring, and warning inputs only.",
    "Mutation authority must still come from an approved SemanticIntentContract, DigitalTwinChangeContract, ProjectScopeDefinition, and SprintContract.",
    "",
  ].join("\n"));
  writtenPaths.push(readmePath);

  return { projectRoot: input.projectRoot, writtenPaths };
}
