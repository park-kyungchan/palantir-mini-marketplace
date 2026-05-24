/**
 * Shared-core re-export of the schemas v1.53.0 ProjectOntologyIndex
 * generic primitive. Consumers should import from this surface, not
 * directly from `~/.claude/schemas/` (post-W5 authority chain rule).
 *
 * @since shared-core v1.x (foamy-giggling-kettle PR-1)
 */
export {
  PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
  isProjectOntologyIndexSchemaVersionV1,
  type ProjectOntologyIndex,
  type ProjectOntologyIndexFragment,
  type ProjectOntologySurface,
  type ValidationPackContract,
} from "@palantirKC/claude-schemas/ontology/primitives/project-ontology-index";
