// Project-ontology path-CLASS segments. A path containing any of these names a
// PROJECT'S ontology source — a structural ontology surface regardless of which
// project owns it. Path-class is unforgeable by the adapter (unlike name
// allowlists / baked per-project layout regexes). Extracted from
// hooks/ontology-engineering-workflow-enforcement-gate.ts so the enforcement gate
// and pre-edit-ontology share ONE definition (bd-006 de-hardcode).
export const PROJECT_ONTOLOGY_PATH_CLASS_SEGMENTS = [
  "/ontology/",
  "/object-type/",
  "/object-types/",
  "/link-type/",
  "/link-types/",
  "/interface-type/",
  "/interface-types/",
  "/action-type/",
  "/action-types/",
  "/shared-property/",
  "/shared-properties/",
] as const;

/**
 * True if a single path's segments name a project-ontology class surface.
 * Pure string check (no filesystem). Normalizes separators + lowercases so a
 * Windows-style or mixed-case path still matches; brackets with a leading "/"
 * so a bare leading segment ("ontology/foo.ts") matches too.
 */
export function pathIsProjectOntologyClass(candidate: string | undefined): boolean {
  if (!candidate) return false;
  const normalized = candidate.replace(/\\/g, "/").toLowerCase();
  const bracketed = `/${normalized.replace(/^\/+/, "")}`;
  return PROJECT_ONTOLOGY_PATH_CLASS_SEGMENTS.some((seg) => bracketed.includes(seg));
}
