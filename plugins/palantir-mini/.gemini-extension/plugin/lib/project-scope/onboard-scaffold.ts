/**
 * onboard-scaffold.ts
 *
 * Procedural helper for the pm-project-onboard skill.
 * Writes the 4 minimum palantir-mini scaffold files for a new project.
 * Called by SKILL.md during onboarding; also exercised directly in tests.
 *
 * Files written (only if absent — never overwrites):
 *   1. <project>/.palantir-mini/project-scope.json
 *   2. <project>/.palantir-mini/ontology-index/00-bootstrap.json
 *   3. <project>/.palantir-mini/known-issues.json
 *   4. <project>/.palantir-mini/skill-ontology/skill-registry.json
 */

import * as fs from "fs";
import * as path from "path";

export interface OnboardScaffoldArgs {
  /** Absolute path to the project root directory. */
  readonly projectRoot: string;
  /**
   * Writable root for the project (relative; defaults to ".").
   * Stored in project-scope.json.
   */
  readonly writableRoot?: string;
  /**
   * Forbidden glob patterns for the project.
   * Stored in project-scope.json and ontology-index/00-bootstrap.json.
   */
  readonly forbiddenPatterns?: readonly string[];
}

export interface OnboardScaffoldResult {
  readonly filesWritten: readonly string[];
  readonly filesSkipped: readonly string[];
}

interface ProjectScopeJson {
  projectId: string;
  sourcePath: string;
  writableRoot: string;
  forbiddenPatterns: readonly string[];
  domainAgents: readonly string[];
  pathMarkers: readonly string[];
  projectOntologyAxes: readonly unknown[];
  surfaceMutationBoundaries: readonly unknown[];
  seqDataLaneInventory: readonly unknown[];
  projectOntologyScopeRedesign: {
    id: string;
    status: string;
    purpose: string;
    nonGoals: readonly string[];
    validationLadder: readonly string[];
  };
}

interface OntologyBootstrapJson {
  writableRoot: string;
  forbiddenPatterns: readonly string[];
  capabilities: ReadonlyArray<{ id: string; description: string; status: string }>;
}

/**
 * Write a JSON file only if it does not already exist.
 * Returns "written" or "skipped".
 */
function writeIfAbsent(filePath: string, content: unknown): "written" | "skipped" {
  if (fs.existsSync(filePath)) return "skipped";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n", "utf8");
  return "written";
}

/**
 * Derive a project ID from the project root directory name.
 * Falls back to "unknown-project" for unusual paths.
 */
function deriveProjectId(projectRoot: string): string {
  const name = path.basename(projectRoot.replace(/\/$/, ""));
  return name.length > 0 ? name : "unknown-project";
}

/**
 * Run the onboarding scaffold for a project.
 * Idempotent: re-running against the same project does not overwrite existing files.
 */
export async function runOnboardScaffold(
  args: OnboardScaffoldArgs,
): Promise<OnboardScaffoldResult> {
  const {
    projectRoot,
    writableRoot = ".",
    forbiddenPatterns = ["src/generated/**", "node_modules/**"],
  } = args;

  const projectId = deriveProjectId(projectRoot);
  const pmDir = path.join(projectRoot, ".palantir-mini");

  const filesWritten: string[] = [];
  const filesSkipped: string[] = [];

  function record(relPath: string, result: "written" | "skipped"): void {
    if (result === "written") filesWritten.push(relPath);
    else filesSkipped.push(relPath);
  }

  // ── 1. project-scope.json ────────────────────────────────────────────────────
  const scopePath = path.join(pmDir, "project-scope.json");
  const scopeContent: ProjectScopeJson = {
    projectId,
    sourcePath: ".palantir-mini/project-scope.json",
    writableRoot,
    forbiddenPatterns,
    domainAgents: ["implementer", "project-implementer"],
    pathMarkers: [],
    projectOntologyAxes: [],
    surfaceMutationBoundaries: [],
    seqDataLaneInventory: [],
    projectOntologyScopeRedesign: {
      id: `${projectId}.project-ontology-scope`,
      status: "declared",
      purpose: `Minimum project-scope ontology scaffold for ${projectId}.`,
      nonGoals: [
        "Do not edit generated files; regenerate them.",
        "Do not assume education-specific semantics unless explicitly added.",
      ],
      validationLadder: ["bunx tsc --noEmit", "bun test"],
    },
  };
  record(".palantir-mini/project-scope.json", writeIfAbsent(scopePath, scopeContent));

  // ── 2. ontology-index/00-bootstrap.json ─────────────────────────────────────
  const bootstrapPath = path.join(pmDir, "ontology-index", "00-bootstrap.json");
  const bootstrapContent: OntologyBootstrapJson = {
    writableRoot,
    forbiddenPatterns,
    capabilities: [
      {
        id: `${projectId}.placeholder-capability`,
        description: "Placeholder capability entry — replace with real project capabilities.",
        status: "placeholder",
      },
    ],
  };
  record(
    ".palantir-mini/ontology-index/00-bootstrap.json",
    writeIfAbsent(bootstrapPath, bootstrapContent),
  );

  // ── 3. known-issues.json ─────────────────────────────────────────────────────
  const knownIssuesPath = path.join(pmDir, "known-issues.json");
  record(".palantir-mini/known-issues.json", writeIfAbsent(knownIssuesPath, []));

  // ── 4. skill-ontology/skill-registry.json ───────────────────────────────────
  const skillRegistryPath = path.join(pmDir, "skill-ontology", "skill-registry.json");
  record(
    ".palantir-mini/skill-ontology/skill-registry.json",
    writeIfAbsent(skillRegistryPath, { contracts: [] }),
  );

  return {
    filesWritten,
    filesSkipped,
  };
}
