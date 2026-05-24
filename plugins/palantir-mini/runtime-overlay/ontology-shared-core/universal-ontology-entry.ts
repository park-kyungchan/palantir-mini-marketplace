/**
 * Shared-core re-export of the schemas v1.54.0 UniversalOntologyEntry
 * type shape primitive. Consumers should import from this surface, not
 * directly from `~/.claude/schemas/` (post-W5 authority chain rule).
 *
 * @since shared-core v1.13.0 (foamy-giggling-kettle PR-3)
 */
export {
  UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION,
  isUniversalOntologyEntrySchemaVersionV1,
  isUniversalOntologyEntry,
  type UniversalOntologyEntry,
  type UniversalOntologyEntryStatus,
  type UniversalRequestKind,
} from "@palantirKC/claude-schemas/ontology/primitives/universal-ontology-entry";
