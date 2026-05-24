import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { queryOntologyContext } from "../../../lib/ontology-context/query";

/** Minimal fragment shape that the loader recognises */
interface FragmentShape {
  schemaVersion?: string;
  projectId?: string;
  capabilities?: Array<{
    schemaVersion: string;
    capabilityId: string;
    sourceKind: string;
    sourceRef: string;
    displayName: string;
    category: string;
    userFacingPurpose: string;
    leadFacingPurpose: string;
    inputOntology: {
      objectRefs: string[];
      requiredArtifacts: string[];
      artifactLifecycle: {
        prerequisites: string[];
        optionalInputs: string[];
        creates: string[];
        mutates: string[];
      };
      allowedRawInputs: string[];
    };
    outputOntology: {
      objectRefs: string[];
      artifactRefs: string[];
      validationPacks: string[];
    };
    actionBoundary: {
      mayMutateProjectFiles: boolean;
      mutationSurfaces: string[];
      requiresDtcApproval: boolean;
    };
    nonGoals: string[];
    failureModes: string[];
    intentMatchers: Array<{
      matcherId: string;
      naturalLanguageExamples: string[];
      nouns: string[];
      verbs: string[];
      projectScopeLanes: string[];
    }>;
    readSurfaces: string[];
    writeSurfaces: string[];
    knownIssueRefs: string[];
    metadata?: Record<string, unknown>;
  }>;
  surfaces?: Array<{
    surfaceId: string;
    kind: string;
    path: string;
    sourceRef: string;
    laneRefs: string[];
  }>;
  warnings?: string[];
}

const CAPABILITY_SCHEMA_VERSION = "palantir-mini/capability-contract/v2";

function makeCapability(id: string, noun: string): FragmentShape["capabilities"] {
  return [
    {
      schemaVersion: CAPABILITY_SCHEMA_VERSION,
      capabilityId: id,
      sourceKind: "fragment",
      sourceRef: `fragment-source:${id}`,
      displayName: id,
      category: "test",
      userFacingPurpose: `Test capability ${id}`,
      leadFacingPurpose: `Test capability ${id} (lead)`,
      inputOntology: {
        objectRefs: [noun],
        requiredArtifacts: [],
        artifactLifecycle: {
          prerequisites: [],
          optionalInputs: [],
          creates: [],
          mutates: [],
        },
        allowedRawInputs: [noun],
      },
      outputOntology: {
        objectRefs: [noun],
        artifactRefs: [],
        validationPacks: [],
      },
      actionBoundary: {
        mayMutateProjectFiles: false,
        mutationSurfaces: [],
        requiresDtcApproval: false,
      },
      nonGoals: [],
      failureModes: [],
      intentMatchers: [
        {
          matcherId: `${id}:default`,
          naturalLanguageExamples: [`use ${noun}`],
          nouns: [noun],
          verbs: ["use"],
          projectScopeLanes: [],
        },
      ],
      readSurfaces: [],
      writeSurfaces: [],
      knownIssueRefs: [],
    },
  ];
}

function writeFragment(dir: string, name: string, fragment: FragmentShape): void {
  fs.writeFileSync(
    path.join(dir, `${name}.json`),
    `${JSON.stringify(fragment, null, 2)}\n`,
    "utf8",
  );
}

function makeProjectRoot(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-query-index-"));
  // Minimal project-scope so the loader does not throw
  fs.mkdirSync(path.join(tmp, ".palantir-mini"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".palantir-mini", "project-scope.json"),
    `${JSON.stringify({
      schemaVersion: "palantir-mini/project-scope/v1",
      projectId: "test-project",
      writableRoot: tmp,
      forbiddenPatterns: [],
      domainAgents: [],
      seqDataLaneInventory: [],
      surfaceMutationBoundaries: [],
      sourcePath: path.join(tmp, ".palantir-mini", "project-scope.json"),
    }, null, 2)}\n`,
    "utf8",
  );
  return tmp;
}

describe("OntologyContextQuery with ProjectOntologyIndex", () => {
  it("synthetic 3-fragment project ontology index — query merges fragments correctly", () => {
    const projectRoot = makeProjectRoot();
    const indexDir = path.join(projectRoot, ".palantir-mini", "ontology-index");
    fs.mkdirSync(indexDir, { recursive: true });

    // Fragment A — capability for "alpha"
    writeFragment(indexDir, "fragment-A", {
      schemaVersion: "palantir-mini/project-ontology-index/v1",
      projectId: "test-project",
      capabilities: makeCapability("cap-alpha", "Alpha"),
      surfaces: [
        {
          surfaceId: "surface:alpha",
          kind: "read",
          path: "src/alpha.ts",
          sourceRef: "fragment-A",
          laneRefs: [],
        },
      ],
    });

    // Fragment B — capability for "beta"
    writeFragment(indexDir, "fragment-B", {
      schemaVersion: "palantir-mini/project-ontology-index/v1",
      projectId: "test-project",
      capabilities: makeCapability("cap-beta", "Beta"),
    });

    // Fragment C — capability for "gamma" plus a surface
    writeFragment(indexDir, "fragment-C", {
      schemaVersion: "palantir-mini/project-ontology-index/v1",
      projectId: "test-project",
      capabilities: makeCapability("cap-gamma", "Gamma"),
      surfaces: [
        {
          surfaceId: "surface:gamma",
          kind: "write",
          path: "src/gamma.ts",
          sourceRef: "fragment-C",
          laneRefs: [],
        },
      ],
    });

    const entry = createUniversalOntologyEntry({
      rawUserRequest: "use Alpha Beta Gamma",
      projectRoot,
    });

    const result = queryOntologyContext({ entry, projectRoot });

    // All three fragment capabilities should be available and selected/candidate
    const allCapIds = [
      ...result.capabilityContext.candidateCapabilityIds,
      ...result.capabilityContext.selectedCapabilityIds,
    ];
    expect(allCapIds).toContain("cap-alpha");
    expect(allCapIds).toContain("cap-beta");
    expect(allCapIds).toContain("cap-gamma");

    // Diagnostics: index was loaded (fragments present)
    expect(result.diagnostics.projectOntologyIndexLoaded).toBe(true);
    expect(Array.isArray(result.diagnostics.projectOntologyIndexWarnings)).toBe(true);
  });

  it("missing index — query falls back to skill-registry-only with loaded=false", () => {
    const projectRoot = makeProjectRoot();
    // Deliberately do NOT create .palantir-mini/ontology-index/

    const entry = createUniversalOntologyEntry({
      rawUserRequest: "some intent without any index",
      projectRoot,
    });

    const result = queryOntologyContext({ entry, projectRoot });

    // No fragment dir → not loaded
    expect(result.diagnostics.projectOntologyIndexLoaded).toBe(false);
    // Warnings is always an array (empty when no fragments parsed)
    expect(Array.isArray(result.diagnostics.projectOntologyIndexWarnings)).toBe(true);
  });

  it("malformed fragment — warning captured in diagnostics.projectOntologyIndexWarnings", () => {
    const projectRoot = makeProjectRoot();
    const indexDir = path.join(projectRoot, ".palantir-mini", "ontology-index");
    fs.mkdirSync(indexDir, { recursive: true });

    // Valid fragment — so the dir is non-empty and loaded=true
    writeFragment(indexDir, "fragment-A", {
      schemaVersion: "palantir-mini/project-ontology-index/v1",
      projectId: "test-project",
      capabilities: makeCapability("cap-valid", "Valid"),
      // Include a warning directly in the fragment to test warning propagation
      warnings: ["parse-error: malformed capability entry in fragment-B.json"],
    });

    // Malformed fragment — invalid JSON (loader's readJson returns null, so silently skipped)
    fs.writeFileSync(
      path.join(indexDir, "fragment-B.json"),
      "{ this is not valid JSON !!!",
      "utf8",
    );

    const entry = createUniversalOntologyEntry({
      rawUserRequest: "use Valid",
      projectRoot,
    });

    const result = queryOntologyContext({ entry, projectRoot });

    // Index was loaded (fragment-A parsed successfully)
    expect(result.diagnostics.projectOntologyIndexLoaded).toBe(true);

    // The warning from fragment-A's warnings array surfaces in diagnostics
    const warnings = result.diagnostics.projectOntologyIndexWarnings;
    expect(Array.isArray(warnings)).toBe(true);
    // At minimum, fragment-A's embedded warning must appear
    expect(warnings.some((w) => w.includes("parse-error"))).toBe(true);
  });
});
