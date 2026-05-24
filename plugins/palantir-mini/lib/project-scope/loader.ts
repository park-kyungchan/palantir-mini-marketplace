import * as fs from "fs";
import * as path from "path";
import { genericProjectScope } from "./generic-defaults";
import { educationProjectScope } from "./education-defaults";
import type { ProjectScopeDefinition } from "./types";

function isProjectScopeDefinition(value: unknown): value is ProjectScopeDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Partial<ProjectScopeDefinition>;
  return (
    typeof obj.projectId === "string" &&
    typeof obj.sourcePath === "string" &&
    Array.isArray(obj.pathMarkers) &&
    Array.isArray(obj.projectOntologyAxes) &&
    Array.isArray(obj.surfaceMutationBoundaries) &&
    Array.isArray(obj.seqDataLaneInventory) &&
    typeof obj.projectOntologyScopeRedesign === "object" &&
    obj.projectOntologyScopeRedesign !== null
  );
}

function normalizeProjectScopeDefinition(
  scope: ProjectScopeDefinition | (Omit<ProjectScopeDefinition, "writableRoot" | "forbiddenPatterns" | "domainAgents"> & {
    readonly writableRoot?: string;
    readonly forbiddenPatterns?: readonly string[];
    readonly domainAgents?: readonly string[];
  }),
): ProjectScopeDefinition {
  return {
    ...scope,
    writableRoot: typeof scope.writableRoot === "string" && scope.writableRoot.length > 0
      ? scope.writableRoot
      : ".",
    forbiddenPatterns: Array.isArray(scope.forbiddenPatterns)
      ? scope.forbiddenPatterns
      : ["src/generated/**"],
    domainAgents: Array.isArray(scope.domainAgents)
      ? scope.domainAgents
      : ["implementer", "project-implementer"],
  };
}

export function loadProjectScope(projectRoot?: string): ProjectScopeDefinition {
  if (projectRoot) {
    const localScopePath = path.join(projectRoot, ".palantir-mini", "project-scope.json");
    if (fs.existsSync(localScopePath)) {
      const parsed = JSON.parse(fs.readFileSync(localScopePath, "utf8")) as unknown;
      if (isProjectScopeDefinition(parsed)) return normalizeProjectScopeDefinition(parsed);
    }
    if (isKnownEducationProjectRoot(projectRoot)) {
      return educationProjectScope;
    }
  }
  return genericProjectScope;
}

function isKnownEducationProjectRoot(projectRoot: string): boolean {
  const normalized = projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const basename = path.basename(normalized);
  return basename === "palantir-math" || basename === "mathcrew";
}

export function stripProjectScopePathMarker(
  filePath: string,
  scope: ProjectScopeDefinition,
): string {
  const slashPath = filePath.replace(/\\/g, "/").replace(/^file:/, "");
  for (const marker of scope.pathMarkers) {
    const markerIndex = slashPath.indexOf(marker);
    if (markerIndex >= 0) return slashPath.slice(markerIndex + marker.length);
  }
  return slashPath;
}

export type {
  ProjectOntologyAxis,
  ProjectScopeDefinition,
  ProjectScopeLane,
  ProjectScopeRedesign,
  SurfaceMutationBoundary,
} from "./types";
