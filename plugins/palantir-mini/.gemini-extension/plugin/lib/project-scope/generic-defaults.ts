import type { ProjectScopeDefinition } from "./types";

/**
 * Generic project scope fallback.
 *
 * This is the domain-agnostic default used by the loader when no project-local
 * .palantir-mini/project-scope.json is present. It intentionally carries no
 * education-specific ontology axes, lanes, or surface boundaries.
 *
 * Education-domain projects (mathcrew, palantir-math) must declare their own
 * explicit .palantir-mini/project-scope.json; they MUST NOT rely on this fallback.
 */
export const genericProjectScope: ProjectScopeDefinition = {
  projectId: "generic-template",
  sourcePath: "lib/project-scope/generic-defaults.ts",
  writableRoot: ".",
  forbiddenPatterns: ["src/generated/**", "node_modules/**"],
  domainAgents: ["implementer", "project-implementer"],
  pathMarkers: [],
  projectOntologyAxes: [],
  surfaceMutationBoundaries: [],
  seqDataLaneInventory: [],
  projectOntologyScopeRedesign: {
    id: "generic-template.project-ontology-scope",
    status: "declared",
    purpose:
      "Provide a minimal project-scope ontology map for a generic project before runtime edits.",
    nonGoals: [
      "Do not assume education-specific semantics (curriculum, lesson, sequencer).",
      "Do not edit generated files; regenerate them.",
    ],
    validationLadder: [
      "bunx tsc --noEmit",
      "bun test",
    ],
  },
};
