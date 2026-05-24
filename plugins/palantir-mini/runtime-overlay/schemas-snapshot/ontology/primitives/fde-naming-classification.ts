/**
 * palantir-mini schema primitive — FDE Naming Classification.
 *
 * Encodes the brief §8 3-way naming classification (preferred-user-facing /
 * legacy-user-facing / compatibility-identifier) and the baseline term table
 * with 11 entries (the audit Codex prepared 2026-05-14). Consumed by
 * lib/fde-build/naming-classifier.ts (slice 2.B) to drive the read-only
 * naming-audit skill (slice 2.B's pm-fde-naming-audit).
 *
 * HARD INVARIANTS:
 *   1. NamingAuditReport.readOnly is the literal `true` type — the audit
 *      observes; it does not mutate source files.
 *   2. NamingAuditReport.compatibilityIdentifiersPreserved is the literal
 *      `true` type — compatibility identifiers are never renamed.
 *   3. NAMING_TERM_BASELINE_TABLE entries with classification ===
 *      "compatibility-identifier" MUST carry a non-empty compatibilityReason.
 *      Tests assert this.
 *
 * Source references:
 *   /home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §8
 *   /home/palantirkc/.claude/plans/splendid-mapping-lemur.md Slice 2
 *   /home/palantirkc/.claude/plugins/palantir-mini/runtime-overlay/schemas-snapshot/ontology/primitives/aip-agent.ts (compat surface)
 */

// =============================================================================
// Schema version constant
// =============================================================================

export const FDE_NAMING_CLASSIFICATION_SCHEMA_VERSION =
  "palantir-mini/fde-naming-classification/v1" as const;

// =============================================================================
// Enums (string unions)
// =============================================================================

/** 3-way naming classification per brief §8. */
export type NamingTerm =
  | "preferred-user-facing"
  | "legacy-user-facing"
  | "compatibility-identifier";

export type NamingTermSeverity = "info" | "advisory" | "warning";

// =============================================================================
// Per-finding shape
// =============================================================================

/** Single finding emitted by the naming classifier per scanned location. */
export interface NamingAuditFinding {
  readonly findingId: string;
  /** Term that was matched (e.g. "AIP Chatbot Studio"). */
  readonly term: string;
  readonly classification: NamingTerm;
  /** Severity of the finding for prose ergonomics (compatibility-identifier
   *  always "info"; legacy-user-facing typically "advisory"). */
  readonly severity: NamingTermSeverity;
  /** Absolute or repo-relative file path where the term was found. */
  readonly location: string;
  /** 1-based line number. */
  readonly line?: number;
  /** Excerpt of the matching line (≤ 200 chars). */
  readonly excerpt?: string;
  /** Required when classification === "compatibility-identifier". Free-text
   *  explanation citing the API/schema/persisted path that justifies preserving
   *  this name (e.g. "Persisted in AIPAgentDeclaration.legacyNames[]"). */
  readonly compatibilityReason?: string;
  /** Recommended action for legacy-user-facing terms. */
  readonly recommendedAction?:
    | "rename-in-prose"
    | "flag-with-compatibility-note"
    | "no-action";
}

// =============================================================================
// Aggregate report
// =============================================================================

/** Aggregate report from one naming-audit run. */
export interface NamingAuditReport {
  readonly schemaVersion: typeof FDE_NAMING_CLASSIFICATION_SCHEMA_VERSION;
  readonly reportRid: string;
  readonly project: string;
  readonly generatedAt: string;
  /** READ-ONLY INVARIANT: this audit is observation-only; never mutates source. */
  readonly readOnly: true;
  /** Scanned glob list (allow-list). */
  readonly scannedGlobs: readonly string[];
  /** Denied glob list (e.g. generated/**). */
  readonly deniedGlobs: readonly string[];
  /** Per-term aggregate counts (matches brief §8 baseline). */
  readonly termCounts: readonly {
    term: string;
    count: number;
    classification: NamingTerm;
  }[];
  /** Individual findings (capped at maxFindings for memory bounds). */
  readonly findings: readonly NamingAuditFinding[];
  readonly maxFindings: number;
  readonly totalFindings: number;
  /** Plain-language executive summary. */
  readonly executiveSummary: string;
  /** Compatibility-identifier preservation guarantee. */
  readonly compatibilityIdentifiersPreserved: true;
}

// =============================================================================
// Baseline classification table — brief §8 encoded
// =============================================================================

/** Static classification table — brief §8 baseline encoded.
 *  Used by lib/fde-build/naming-classifier.ts. Each entry MUST cite
 *  compatibilityReason when classification === "compatibility-identifier".
 *  Exported as a const so consumers can extend (e.g. tests can verify
 *  baseline counts match brief). */
export interface NamingTermSpec {
  readonly term: string;
  readonly classification: NamingTerm;
  readonly compatibilityReason?: string;
  /** Brief §8 baseline count when the audit was prepared (2026-05-14). */
  readonly baselineCount: number;
  readonly severity: NamingTermSeverity;
  readonly recommendedAction?: NamingAuditFinding["recommendedAction"];
}

export const NAMING_TERM_BASELINE_TABLE: readonly NamingTermSpec[] = [
  // preferred user-facing (brief §8.1)
  {
    term: "AIP Chatbot Studio",
    classification: "preferred-user-facing",
    baselineCount: 20,
    severity: "info",
  },
  {
    term: "AIP Chatbot",
    classification: "preferred-user-facing",
    baselineCount: 39,
    severity: "info",
  },
  // legacy user-facing (brief §8.2 — flag in prose)
  {
    term: "AIP Agent Studio",
    classification: "legacy-user-facing",
    baselineCount: 93,
    severity: "advisory",
    recommendedAction: "rename-in-prose",
  },
  {
    term: "AIP Agent",
    classification: "legacy-user-facing",
    baselineCount: 288,
    severity: "advisory",
    recommendedAction: "flag-with-compatibility-note",
  },
  {
    term: "parameters",
    classification: "legacy-user-facing",
    baselineCount: 284,
    severity: "advisory",
    recommendedAction: "flag-with-compatibility-note",
  },
  {
    term: "validations",
    classification: "legacy-user-facing",
    baselineCount: 67,
    severity: "advisory",
    recommendedAction: "flag-with-compatibility-note",
  },
  // compatibility identifiers (brief §8.3 — preserve verbatim)
  {
    term: "agentRid",
    classification: "compatibility-identifier",
    baselineCount: 2,
    severity: "info",
    compatibilityReason:
      "Persisted API field used across AIP agent registry + skills + events.jsonl envelopes; renaming breaks event lineage.",
  },
  {
    term: "AIPAgentDeclaration",
    classification: "compatibility-identifier",
    baselineCount: 24,
    severity: "info",
    compatibilityReason:
      "Schema primitive (runtime-overlay/schemas-snapshot/ontology/primitives/aip-agent.ts); consumers import by this exact name.",
  },
  {
    term: "aipAgentRid",
    classification: "compatibility-identifier",
    baselineCount: 4,
    severity: "info",
    compatibilityReason:
      "Persisted RID field on AIPAgentDeclaration; cross-referenced from skills + handlers.",
  },
  {
    term: "AIP_AGENT_REGISTRY",
    classification: "compatibility-identifier",
    baselineCount: 1,
    severity: "info",
    compatibilityReason:
      "Runtime singleton (aip-agent.ts:101); consumers register via this exact identifier.",
  },
  {
    term: "legacyNames",
    classification: "compatibility-identifier",
    baselineCount: 2,
    severity: "info",
    compatibilityReason:
      "AIPAgentDeclaration.legacyNames field (aip-agent.ts:59); explicit deprecation-window mechanism — must never be renamed.",
  },
] as const;
