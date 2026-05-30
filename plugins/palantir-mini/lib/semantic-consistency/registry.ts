import {
  SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
  type CanonicalOntologyKind,
  type CanonicalTerm,
  type SemanticConsistencyRegistrySnapshot,
  type SourceSystemKind,
  type SourceSystemRef,
  type SourceSystemTerm,
  type TermAlias,
  type TermMapping,
} from "./types";
import { normalizeTermValue, shortStableHash, stableHash } from "./normalize";

export function sourceSystemRef(input: {
  readonly sourceSystemId: string;
  readonly kind: SourceSystemKind;
  readonly displayName: string;
  readonly authorityRank?: number;
  readonly ownerRef?: string;
}): SourceSystemRef {
  return {
    sourceSystemId: input.sourceSystemId,
    kind: input.kind,
    displayName: input.displayName,
    authorityRank: input.authorityRank ?? 0,
    ...(input.ownerRef ? { ownerRef: input.ownerRef } : {}),
  };
}

export function canonicalTerm(input: {
  readonly displayName: string;
  readonly definition: string;
  readonly ontologyKind: CanonicalOntologyKind;
  readonly ontologyRef?: string;
  readonly ownerRef?: string;
  readonly status?: CanonicalTerm["status"];
  readonly approvalRef?: string;
  readonly sourceRefs?: readonly string[];
}): CanonicalTerm {
  const stableConceptHash = stableHash({
    displayName: normalizeTermValue(input.displayName).normalized,
    ontologyKind: input.ontologyKind,
    ontologyRef: input.ontologyRef ?? "",
    definition: input.definition,
  }, "concept-hash");
  return {
    schemaVersion: SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
    canonicalTermId: `term:${shortStableHash(stableConceptHash)}`,
    displayName: input.displayName,
    definition: input.definition,
    ontologyKind: input.ontologyKind,
    ...(input.ontologyRef ? { ontologyRef: input.ontologyRef } : {}),
    stableConceptHash,
    ...(input.ownerRef ? { ownerRef: input.ownerRef } : {}),
    status: input.status ?? "approved",
    ...(input.approvalRef ? { approvalRef: input.approvalRef } : {}),
    sourceRefs: [...(input.sourceRefs ?? [])].sort(),
  };
}

export function sourceSystemTerm(input: {
  readonly sourceSystemRef: SourceSystemRef;
  readonly rawTerm: string;
  readonly fieldPath?: string;
  readonly objectPath?: string;
  readonly evidenceRefs?: readonly string[];
}): SourceSystemTerm {
  const normalized = normalizeTermValue(input.rawTerm, {
    sourceSystemId: input.sourceSystemRef.sourceSystemId,
    fieldPath: input.fieldPath,
    objectPath: input.objectPath,
  });
  return {
    schemaVersion: SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
    sourceTermId: `source-term:${shortStableHash({
      sourceSystemId: input.sourceSystemRef.sourceSystemId,
      fieldPath: input.fieldPath ?? "",
      objectPath: input.objectPath ?? "",
      normalized: normalized.normalized,
    })}`,
    sourceSystemRef: input.sourceSystemRef,
    ...(input.fieldPath ? { fieldPath: input.fieldPath } : {}),
    ...(input.objectPath ? { objectPath: input.objectPath } : {}),
    rawTerm: input.rawTerm,
    normalized,
    evidenceRefs: [...(input.evidenceRefs ?? [])].sort(),
  };
}

export function termAlias(input: {
  readonly canonicalTermId: CanonicalTerm["canonicalTermId"];
  readonly alias: string;
  readonly sourceSystemIds?: readonly string[];
  readonly status?: TermAlias["status"];
  readonly approvalRef?: string;
}): TermAlias {
  const normalized = normalizeTermValue(input.alias);
  return {
    aliasId: `alias:${shortStableHash({ canonicalTermId: input.canonicalTermId, normalized })}`,
    canonicalTermId: input.canonicalTermId,
    normalized,
    sourceSystemIds: [...(input.sourceSystemIds ?? [])].sort(),
    status: input.status ?? "approved",
    ...(input.approvalRef ? { approvalRef: input.approvalRef } : {}),
  };
}

export function registrySnapshot(input: {
  readonly sourceSystems?: readonly SourceSystemRef[];
  readonly canonicalTerms?: readonly CanonicalTerm[];
  readonly aliases?: readonly TermAlias[];
  readonly mappings?: readonly TermMapping[];
}): SemanticConsistencyRegistrySnapshot {
  const canonicalTerms = [...(input.canonicalTerms ?? [])].sort((a, b) =>
    a.canonicalTermId.localeCompare(b.canonicalTermId)
  );
  const aliases = [...(input.aliases ?? [])].sort((a, b) => a.aliasId.localeCompare(b.aliasId));
  const mappings = [...(input.mappings ?? [])].sort((a, b) =>
    a.mappingId.localeCompare(b.mappingId)
  );
  const sourceSystems = [...(input.sourceSystems ?? [])].sort((a, b) =>
    a.sourceSystemId.localeCompare(b.sourceSystemId)
  );
  return {
    schemaVersion: SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
    registryId: `semantic-registry:${shortStableHash({ sourceSystems, canonicalTerms, aliases, mappings })}`,
    sourceSystems,
    canonicalTerms,
    aliases,
    mappings,
  };
}
