/**
 * Shared-core re-export of the schemas v1.55.0 OntologyContextApproval
 * primitive. Consumers should import from this surface, not directly from
 * `~/.claude/schemas/` (post-W5 authority chain rule).
 *
 * @since shared-core v1.13.0 (foamy-giggling-kettle PR-4; also catches up
 * PR-3's omitted v1.13.0 bump for UniversalOntologyEntry)
 */
export {
  ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION,
  isOntologyContextApprovalSchemaVersionV1,
  isOntologyContextApproval,
  type OntologyContextApproval,
  type OntologyContextApprovalKind,
} from "@palantirKC/claude-schemas/ontology/primitives/ontology-context-approval";
