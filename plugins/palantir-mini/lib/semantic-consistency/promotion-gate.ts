import type { SemanticConsistencyResolverOutput } from "./types";

export const SEMANTIC_CONSISTENCY_PROMOTION_GATE_VERSION =
  "palantir-mini/semantic-consistency-promotion-gate/v1" as const;

export type SemanticConsistencyPromotionSubject =
  | "semantic-intent-contract"
  | "digital-twin-change-contract"
  | "sic-dtc-pair"
  | "work-contract"
  | "handler";

export type SemanticConsistencyPromotionReasonCode =
  | "SEMANTIC_CONSISTENCY_NOT_REQUIRED"
  | "SEMANTIC_CONSISTENCY_READY"
  | "SEMANTIC_CONSISTENCY_RESULT_MISSING"
  | "SEMANTIC_CONSISTENCY_RESULT_NON_DETERMINISTIC"
  | "SEMANTIC_CONSISTENCY_LLM_PROMOTION_USED"
  | "SEMANTIC_CONSISTENCY_EMPTY_RESULT"
  | "SEMANTIC_CONSISTENCY_UNRESOLVED_BLOCKING_CONFLICT"
  | "SEMANTIC_CONSISTENCY_RESOLVER_RUN_REF_MISSING"
  | "SEMANTIC_CONSISTENCY_RESOLVER_RUN_REF_MISMATCH";

export interface SemanticConsistencyPromotionFinding {
  readonly code: SemanticConsistencyPromotionReasonCode;
  readonly field: string;
  readonly message: string;
  readonly blocking: boolean;
  readonly evidenceRefs: readonly string[];
}

export interface SemanticConsistencyPromotionGateInput {
  readonly subject: SemanticConsistencyPromotionSubject;
  readonly ontologyAffecting: boolean;
  readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  readonly attachedResolverRunRefs?: readonly string[];
  /**
   * Improvement #4 (ADDITIVE) — a PRE-VERIFIED structural 0-new-term re-bind signal
   * (the result of `isZeroNewTermRebind` in `lib/lead-intent/contracts.ts`, which
   * proves every touched rid is ALREADY registered and zero new rid is introduced).
   * A 0-new-term change has no terms to resolve, so semantic consistency is
   * vacuously satisfied: the three resolver-evidence blocking findings
   * (`SEMANTIC_CONSISTENCY_RESULT_MISSING`, `_EMPTY_RESULT`,
   * `_RESOLVER_RUN_REF_MISMATCH`) are skipped. It NEVER relaxes the
   * non-deterministic / LLM-promotion-used / unresolved-blocking-conflict findings.
   * This is a PRE-VERIFIED boolean only; the caller MUST gate it on the SAME
   * structural predicate. Default-absent/false ⇒ byte-identical legacy behavior.
   */
  readonly isZeroNewTermRebind?: boolean;
}

export interface SemanticConsistencyPromotionGateResult {
  readonly schemaVersion: typeof SEMANTIC_CONSISTENCY_PROMOTION_GATE_VERSION;
  readonly subject: SemanticConsistencyPromotionSubject;
  readonly required: boolean;
  readonly promotionAllowed: boolean;
  readonly deterministic: true;
  readonly llmPromotionUsed: false;
  readonly resolverRunRef?: string;
  readonly resultHash?: string;
  readonly reasonCodes: readonly SemanticConsistencyPromotionReasonCode[];
  readonly findings: readonly SemanticConsistencyPromotionFinding[];
  readonly evidenceRefs: readonly string[];
}

export function assessSemanticConsistencyPromotionGate(
  input: SemanticConsistencyPromotionGateInput,
): SemanticConsistencyPromotionGateResult {
  if (!input.ontologyAffecting) {
    return result(input, {
      required: false,
      reasonCodes: ["SEMANTIC_CONSISTENCY_NOT_REQUIRED"],
      findings: [],
    });
  }

  // Improvement #4 (ADDITIVE) — a PRE-VERIFIED structural 0-new-term re-bind. Such a
  // change touches only already-registered rids and introduces NO new term, so there
  // is nothing for the resolver to resolve: semantic consistency is vacuously
  // satisfied and the three resolver-evidence blocking findings named below are
  // skipped. The relaxation is gated on the SAME structural predicate the readiness
  // gate uses, so it is UNREACHABLE for any change adding a rid. Default false ⇒
  // byte-identical legacy behavior.
  const isRebind = input.isZeroNewTermRebind === true;

  const findings: SemanticConsistencyPromotionFinding[] = [];
  const resolverOutput = input.semanticConsistencyResult;
  if (!resolverOutput) {
    // SEMANTIC_CONSISTENCY_RESULT_MISSING is skipped for a verified rebind: a
    // 0-new-term change has no terms to resolve, so an absent resolver run is
    // vacuously acceptable and the gate is ready.
    if (isRebind) {
      return result(input, {
        required: true,
        findings: [],
        reasonCodes: ["SEMANTIC_CONSISTENCY_READY"],
      });
    }
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_RESULT_MISSING",
      "semanticConsistencyResult",
      "ontology-affecting promotion requires deterministic SemanticConsistencyResolver output",
    ));
    return result(input, { required: true, findings });
  }

  if (resolverOutput.deterministic !== true) {
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_RESULT_NON_DETERMINISTIC",
      "semanticConsistencyResult.deterministic",
      "SemanticConsistencyResolver output must be deterministic before promotion",
      [resolverOutput.resolverRunId],
    ));
  }

  if (resolverOutput.llmPromotionUsed !== false) {
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_LLM_PROMOTION_USED",
      "semanticConsistencyResult.llmPromotionUsed",
      "LLM-written semantic promotion output cannot authorize ontology-affecting contracts",
      [resolverOutput.resolverRunId],
    ));
  }

  if (
    !isRebind &&
    resolverOutput.mappings.length === 0 &&
    resolverOutput.conflicts.length === 0
  ) {
    // Skipped for a verified rebind: a 0-new-term change legitimately resolves to an
    // empty mapping/conflict set (no new term to map).
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_EMPTY_RESULT",
      "semanticConsistencyResult.mappings",
      "SemanticConsistencyResolver output must include mapping or conflict evidence before promotion",
      [resolverOutput.resolverRunId],
    ));
  }

  if (resolverOutput.unresolvedBlockingConflictRefs.length > 0) {
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_UNRESOLVED_BLOCKING_CONFLICT",
      "semanticConsistencyResult.unresolvedBlockingConflictRefs",
      "unresolved blocking semantic conflicts must be resolved before ontology-affecting promotion",
      [resolverOutput.resolverRunId, ...resolverOutput.unresolvedBlockingConflictRefs],
    ));
  }

  const attachedRefs = uniqueNonEmpty(input.attachedResolverRunRefs ?? []);
  if (attachedRefs.length === 0) {
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_RESOLVER_RUN_REF_MISSING",
      "attachedResolverRunRefs",
      "approved contracts must attach the deterministic resolver run ref before promotion",
      [resolverOutput.resolverRunId],
    ));
  } else if (!isRebind && !attachedRefs.includes(resolverOutput.resolverRunId)) {
    // SEMANTIC_CONSISTENCY_RESOLVER_RUN_REF_MISMATCH is skipped for a verified
    // rebind: when a resolver run IS attached but does not match, a 0-new-term change
    // has no term whose evidence the run needed to produce.
    findings.push(finding(
      "SEMANTIC_CONSISTENCY_RESOLVER_RUN_REF_MISMATCH",
      "attachedResolverRunRefs",
      "attached semantic consistency refs must include the resolver run that produced the evidence",
      [resolverOutput.resolverRunId, ...attachedRefs],
    ));
  }

  return result(input, {
    required: true,
    resolverRunRef: resolverOutput.resolverRunId,
    resultHash: resolverOutput.resultHash,
    findings,
    reasonCodes: findings.length === 0 ? ["SEMANTIC_CONSISTENCY_READY"] : undefined,
  });
}

function result(
  input: SemanticConsistencyPromotionGateInput,
  details: {
    readonly required: boolean;
    readonly resolverRunRef?: string;
    readonly resultHash?: string;
    readonly findings: readonly SemanticConsistencyPromotionFinding[];
    readonly reasonCodes?: readonly SemanticConsistencyPromotionReasonCode[];
  },
): SemanticConsistencyPromotionGateResult {
  const reasonCodes = details.reasonCodes ?? details.findings.map((issue) => issue.code);
  const evidenceRefs = uniqueNonEmpty([
    details.resolverRunRef,
    details.resultHash,
    ...details.findings.flatMap((issue) => issue.evidenceRefs),
  ]);
  return {
    schemaVersion: SEMANTIC_CONSISTENCY_PROMOTION_GATE_VERSION,
    subject: input.subject,
    required: details.required,
    promotionAllowed: !details.findings.some((issue) => issue.blocking),
    deterministic: true,
    llmPromotionUsed: false,
    ...(details.resolverRunRef ? { resolverRunRef: details.resolverRunRef } : {}),
    ...(details.resultHash ? { resultHash: details.resultHash } : {}),
    reasonCodes,
    findings: details.findings,
    evidenceRefs,
  };
}

function finding(
  code: SemanticConsistencyPromotionReasonCode,
  field: string,
  message: string,
  evidenceRefs: readonly string[] = [],
): SemanticConsistencyPromotionFinding {
  return {
    code,
    field,
    message,
    blocking: true,
    evidenceRefs: uniqueNonEmpty(evidenceRefs),
  };
}

function uniqueNonEmpty(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])].sort();
}
