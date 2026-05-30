import {
  SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
  type CanonicalTerm,
  type SemanticConflict,
  type SemanticConsistencyResolverInput,
  type SemanticConsistencyResolverOutput,
  type SourceSystemTerm,
  type TermAlias,
  type TermMapping,
} from "./types";
import { normalizeTermValue, shortStableHash, stableHash } from "./normalize";

export function resolveSemanticConsistency(
  input: SemanticConsistencyResolverInput,
): SemanticConsistencyResolverOutput {
  const sourceTerms = [...input.sourceTerms].sort((a, b) =>
    a.sourceTermId.localeCompare(b.sourceTermId)
  );
  const registry = input.registry;
  const inputHash = stableHash({
    sourceTerms,
    nonApplicableReason: input.nonApplicableReason ?? "",
    nonApplicableEvidenceRefs: [...(input.nonApplicableEvidenceRefs ?? [])].sort(),
  }, "semantic-input");
  const registryHash = stableHash(registry, "semantic-registry");

  const nonApplicableReason = input.nonApplicableReason;
  if (nonApplicableReason) {
    return buildOutput({
      inputHash,
      registryHash,
      mappings: sourceTerms.map((term) => mapping({
        sourceTerm: term,
        mappingKind: "non_applicable",
        deterministicRuleId: "semantic-consistency/non-applicable/v1",
        confidenceSource: "non-applicable",
        evidenceRefs: [
          ...term.evidenceRefs,
          ...(input.nonApplicableEvidenceRefs ?? []),
          nonApplicableReason,
        ],
      })),
      conflicts: [],
    });
  }

  const mappings: TermMapping[] = [];
  const conflicts: SemanticConflict[] = [];
  for (const sourceTerm of sourceTerms) {
    const rejected = approvedExistingMapping(sourceTerm, registry.mappings, "rejected");
    if (rejected) {
      mappings.push(mapping({
        sourceTerm,
        mappingKind: "rejected",
        deterministicRuleId: "semantic-consistency/rejected/v1",
        confidenceSource: "rejected",
        evidenceRefs: [...sourceTerm.evidenceRefs, ...rejected.evidenceRefs],
      }));
      continue;
    }

    const override = approvedExistingMapping(sourceTerm, registry.mappings, "source_scoped_override");
    if (override?.canonicalTermId) {
      mappings.push(mapping({
        sourceTerm,
        canonicalTermId: override.canonicalTermId,
        mappingKind: "source_scoped_override",
        deterministicRuleId: "semantic-consistency/source-scoped-override/v1",
        confidenceSource: "deterministic-source-scope",
        approvalRef: override.approvalRef,
        evidenceRefs: [...sourceTerm.evidenceRefs, ...override.evidenceRefs],
      }));
      continue;
    }

    const candidates = uniqueCanonicalIds([
      ...canonicalMatches(sourceTerm, registry.canonicalTerms),
      ...aliasMatches(sourceTerm, registry.aliases),
    ]);
    if (candidates.length > 1) {
      const conflict = conflictFor(sourceTerm, candidates);
      conflicts.push(conflict);
      mappings.push(mapping({
        sourceTerm,
        mappingKind: "ambiguous_conflict",
        deterministicRuleId: "semantic-consistency/ambiguous-conflict/v1",
        confidenceSource: "deterministic-exact",
        alternatives: candidates,
        evidenceRefs: [...sourceTerm.evidenceRefs, conflict.conflictId],
      }));
      continue;
    }
    if (candidates.length === 1) {
      const exact = canonicalMatches(sourceTerm, registry.canonicalTerms).includes(candidates[0]!);
      mappings.push(mapping({
        sourceTerm,
        canonicalTermId: candidates[0],
        mappingKind: exact ? "canonical_match" : "alias_match",
        deterministicRuleId: exact
          ? "semantic-consistency/canonical-match/v1"
          : "semantic-consistency/alias-match/v1",
        confidenceSource: exact ? "deterministic-exact" : "deterministic-alias",
        evidenceRefs: sourceTerm.evidenceRefs,
      }));
      continue;
    }

    mappings.push(mapping({
      sourceTerm,
      mappingKind: "new_candidate",
      deterministicRuleId: "semantic-consistency/new-candidate/v1",
      confidenceSource: "deterministic-new-candidate",
      evidenceRefs: sourceTerm.evidenceRefs,
    }));
  }

  return buildOutput({ inputHash, registryHash, mappings, conflicts });
}

function canonicalMatches(
  sourceTerm: SourceSystemTerm,
  terms: readonly CanonicalTerm[],
): CanonicalTerm["canonicalTermId"][] {
  return terms
    .filter((term) => term.status === "approved")
    .filter((term) => normalizeTermValue(term.displayName).normalized === sourceTerm.normalized.normalized)
    .map((term) => term.canonicalTermId);
}

function aliasMatches(
  sourceTerm: SourceSystemTerm,
  aliases: readonly TermAlias[],
): CanonicalTerm["canonicalTermId"][] {
  return aliases
    .filter((alias) => alias.status === "approved")
    .filter((alias) => alias.normalized.normalized === sourceTerm.normalized.normalized)
    .filter((alias) =>
      alias.sourceSystemIds.length === 0 ||
      alias.sourceSystemIds.includes(sourceTerm.sourceSystemRef.sourceSystemId)
    )
    .map((alias) => alias.canonicalTermId);
}

function approvedExistingMapping(
  sourceTerm: SourceSystemTerm,
  mappings: readonly TermMapping[],
  mappingKind: TermMapping["mappingKind"],
): TermMapping | undefined {
  return mappings.find((mapping) =>
    mapping.sourceTermId === sourceTerm.sourceTermId &&
    mapping.mappingKind === mappingKind &&
    (mappingKind === "rejected" || Boolean(mapping.approvalRef))
  );
}

function mapping(input: {
  readonly sourceTerm: SourceSystemTerm;
  readonly canonicalTermId?: CanonicalTerm["canonicalTermId"];
  readonly mappingKind: TermMapping["mappingKind"];
  readonly deterministicRuleId: string;
  readonly confidenceSource: TermMapping["confidenceSource"];
  readonly alternatives?: readonly CanonicalTerm["canonicalTermId"][];
  readonly approvalRef?: string;
  readonly evidenceRefs?: readonly string[];
}): TermMapping {
  const alternatives = uniqueCanonicalIds(input.alternatives ?? []);
  return {
    mappingId: `mapping:${shortStableHash({
      sourceTermId: input.sourceTerm.sourceTermId,
      canonicalTermId: input.canonicalTermId ?? "",
      mappingKind: input.mappingKind,
      alternatives,
      deterministicRuleId: input.deterministicRuleId,
    })}`,
    sourceTermId: input.sourceTerm.sourceTermId,
    ...(input.canonicalTermId ? { canonicalTermId: input.canonicalTermId } : {}),
    mappingKind: input.mappingKind,
    deterministicRuleId: input.deterministicRuleId,
    confidenceSource: input.confidenceSource,
    alternatives,
    ...(input.approvalRef ? { approvalRef: input.approvalRef } : {}),
    evidenceRefs: [...(input.evidenceRefs ?? [])].sort(),
  };
}

function conflictFor(
  sourceTerm: SourceSystemTerm,
  candidates: readonly CanonicalTerm["canonicalTermId"][],
): SemanticConflict {
  const candidateCanonicalTermIds = uniqueCanonicalIds(candidates);
  return {
    conflictId: `semantic-conflict:${shortStableHash({
      sourceTermId: sourceTerm.sourceTermId,
      candidates: candidateCanonicalTermIds,
    })}`,
    sourceTermIds: [sourceTerm.sourceTermId],
    candidateCanonicalTermIds,
    conflictKind: "overloaded_term",
    blocking: true,
    resolutionStatus: "open",
    requiredDecisionQuestion:
      `Resolve '${sourceTerm.rawTerm}' from ${sourceTerm.sourceSystemRef.displayName} before ontology-affecting routing.`,
    evidenceRefs: sourceTerm.evidenceRefs,
  };
}

function buildOutput(input: {
  readonly inputHash: string;
  readonly registryHash: string;
  readonly mappings: readonly TermMapping[];
  readonly conflicts: readonly SemanticConflict[];
}): SemanticConsistencyResolverOutput {
  const mappings = [...input.mappings].sort((a, b) => a.mappingId.localeCompare(b.mappingId));
  const conflicts = [...input.conflicts].sort((a, b) => a.conflictId.localeCompare(b.conflictId));
  const canonicalTermRefs = uniqueCanonicalIds(
    mappings.map((mapping) => mapping.canonicalTermId).filter((ref): ref is CanonicalTerm["canonicalTermId"] =>
      typeof ref === "string"
    ),
  );
  const unresolvedBlockingConflictRefs = conflicts
    .filter((conflict) => conflict.blocking && conflict.resolutionStatus === "open")
    .map((conflict) => conflict.conflictId)
    .sort();
  const resultBody = {
    schemaVersion: SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
    inputHash: input.inputHash,
    registryHash: input.registryHash,
    mappings,
    conflicts,
    canonicalTermRefs,
    unresolvedBlockingConflictRefs,
    deterministic: true,
    llmPromotionUsed: false,
  };
  const resultHash = stableHash(resultBody, "semantic-result");
  return {
    schemaVersion: SEMANTIC_CONSISTENCY_SCHEMA_VERSION,
    resolverRunId: `semantic-resolver-run:${shortStableHash(resultHash)}`,
    inputHash: input.inputHash,
    registryHash: input.registryHash,
    resultHash,
    mappings,
    conflicts,
    canonicalTermRefs,
    unresolvedBlockingConflictRefs,
    deterministic: true,
    llmPromotionUsed: false,
  };
}

function uniqueCanonicalIds(
  values: readonly CanonicalTerm["canonicalTermId"][],
): CanonicalTerm["canonicalTermId"][] {
  return [...new Set(values.filter(Boolean))].sort() as CanonicalTerm["canonicalTermId"][];
}
