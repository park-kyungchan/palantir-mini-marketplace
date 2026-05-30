export const SEMANTIC_CONSISTENCY_SCHEMA_VERSION =
  "palantir-mini/semantic-consistency/v1" as const;

export const SEMANTIC_NORMALIZATION_VERSION = "semantic-normalize/v1" as const;

export type SourceSystemKind =
  | "crm"
  | "erp"
  | "billing"
  | "support"
  | "logistics"
  | "education"
  | "repo"
  | "unknown";

export interface SourceSystemRef {
  readonly sourceSystemId: string;
  readonly kind: SourceSystemKind;
  readonly displayName: string;
  readonly authorityRank: number;
  readonly ownerRef?: string;
}

export interface NormalizedTermValue {
  readonly original: string;
  readonly normalized: string;
  readonly slug: string;
  readonly locale: "ko" | "en" | "mixed" | "unknown";
  readonly normalizationVersion: typeof SEMANTIC_NORMALIZATION_VERSION;
  readonly hash: string;
}

export type CanonicalOntologyKind =
  | "ObjectType"
  | "LinkType"
  | "ActionType"
  | "Function"
  | "Property"
  | "ApplicationState"
  | "Unknown";

export interface CanonicalTerm {
  readonly schemaVersion: typeof SEMANTIC_CONSISTENCY_SCHEMA_VERSION;
  readonly canonicalTermId: `term:${string}`;
  readonly displayName: string;
  readonly definition: string;
  readonly ontologyKind: CanonicalOntologyKind;
  readonly ontologyRef?: string;
  readonly stableConceptHash: string;
  readonly ownerRef?: string;
  readonly status: "draft" | "approved" | "deprecated" | "rejected";
  readonly approvalRef?: string;
  readonly sourceRefs: readonly string[];
}

export interface SourceSystemTerm {
  readonly schemaVersion: typeof SEMANTIC_CONSISTENCY_SCHEMA_VERSION;
  readonly sourceTermId: `source-term:${string}`;
  readonly sourceSystemRef: SourceSystemRef;
  readonly fieldPath?: string;
  readonly objectPath?: string;
  readonly rawTerm: string;
  readonly normalized: NormalizedTermValue;
  readonly evidenceRefs: readonly string[];
}

export interface TermAlias {
  readonly aliasId: `alias:${string}`;
  readonly canonicalTermId: CanonicalTerm["canonicalTermId"];
  readonly normalized: NormalizedTermValue;
  readonly sourceSystemIds: readonly string[];
  readonly status: "approved" | "candidate" | "rejected";
  readonly approvalRef?: string;
}

export type TermMappingKind =
  | "canonical_match"
  | "alias_match"
  | "source_scoped_override"
  | "new_candidate"
  | "ambiguous_conflict"
  | "rejected"
  | "non_applicable";

export type TermMappingConfidenceSource =
  | "deterministic-exact"
  | "deterministic-alias"
  | "deterministic-source-scope"
  | "deterministic-new-candidate"
  | "human-approved"
  | "non-applicable"
  | "rejected";

export interface TermMapping {
  readonly mappingId: `mapping:${string}`;
  readonly sourceTermId: SourceSystemTerm["sourceTermId"];
  readonly canonicalTermId?: CanonicalTerm["canonicalTermId"];
  readonly mappingKind: TermMappingKind;
  readonly deterministicRuleId: string;
  readonly confidenceSource: TermMappingConfidenceSource;
  readonly alternatives: readonly CanonicalTerm["canonicalTermId"][];
  readonly approvalRef?: string;
  readonly evidenceRefs: readonly string[];
}

export interface SemanticConflict {
  readonly conflictId: `semantic-conflict:${string}`;
  readonly sourceTermIds: readonly SourceSystemTerm["sourceTermId"][];
  readonly candidateCanonicalTermIds: readonly CanonicalTerm["canonicalTermId"][];
  readonly conflictKind: "overloaded_term" | "synonym_collision" | "authority_conflict" | "missing_definition";
  readonly blocking: boolean;
  readonly resolutionStatus: "open" | "approved_mapping" | "rejected" | "accepted_non_applicable";
  readonly requiredDecisionQuestion: string;
  readonly evidenceRefs: readonly string[];
}

export interface SemanticConsistencyRegistrySnapshot {
  readonly schemaVersion: typeof SEMANTIC_CONSISTENCY_SCHEMA_VERSION;
  readonly registryId: `semantic-registry:${string}`;
  readonly sourceSystems: readonly SourceSystemRef[];
  readonly canonicalTerms: readonly CanonicalTerm[];
  readonly aliases: readonly TermAlias[];
  readonly mappings: readonly TermMapping[];
}

export interface SemanticConsistencyResolverInput {
  readonly schemaVersion?: typeof SEMANTIC_CONSISTENCY_SCHEMA_VERSION;
  readonly sourceTerms: readonly SourceSystemTerm[];
  readonly registry: SemanticConsistencyRegistrySnapshot;
  readonly nonApplicableReason?: string;
  readonly nonApplicableEvidenceRefs?: readonly string[];
}

export interface SemanticConsistencyResolverOutput {
  readonly schemaVersion: typeof SEMANTIC_CONSISTENCY_SCHEMA_VERSION;
  readonly resolverRunId: `semantic-resolver-run:${string}`;
  readonly inputHash: string;
  readonly registryHash: string;
  readonly resultHash: string;
  readonly mappings: readonly TermMapping[];
  readonly conflicts: readonly SemanticConflict[];
  readonly canonicalTermRefs: readonly CanonicalTerm["canonicalTermId"][];
  readonly unresolvedBlockingConflictRefs: readonly SemanticConflict["conflictId"][];
  readonly deterministic: true;
  readonly llmPromotionUsed: false;
}
