/**
 * Semantic Audit — Types
 *
 * Split from legacy semantic-audit.ts v1.13.1 (D3, 2026-04-19).
 * Coverage/priority enums, SectionAudit, UpgradeSpec, SemanticAuditReport.
 *
 * Consumers MUST import from the parent barrel: `from "../semantic-audit"`.
 */

// =========================================================================
// Audit Result Types
// =========================================================================

export type CoverageLevel = "implemented" | "partial" | "missing";
export type UpgradePriority = "high" | "medium" | "low";

/**
 * Evidence classification for audit transparency (WI-05 remediation 2026-03-17).
 * - "typed": Coverage determined from typed ontology fields (e.g., toolExposure, reviewLevel)
 * - "inferential": Coverage inferred from name heuristics (e.g., entity name contains "feedback")
 * - "structural": Coverage determined from structural presence (e.g., count > 0)
 */
export type EvidenceKind = "typed" | "inferential" | "structural";

export interface SectionAudit {
  readonly section: string;
  readonly semanticsRef: string;
  readonly coverage: CoverageLevel;
  readonly evidence: string;
  readonly whyItMatters: string;
  readonly upgradeAction?: string;
  readonly priority?: UpgradePriority;
  /**
   * How the coverage was determined. "typed" = from typed ontology fields,
   * "inferential" = from name-based heuristics, "structural" = from presence/counts.
   * Defaults to "structural" if not set (backward compatible).
   */
  readonly evidenceKind?: EvidenceKind;
}

/** Machine-readable upgrade specification — consumable by upgrade-apply.ts */
export interface UpgradeSpec {
  readonly sectionId: string;
  readonly priority: UpgradePriority;
  readonly domain: "data" | "logic" | "action" | "security" | "frontend";
  readonly operation:
    | "addEntity"
    | "addProperty"
    | "addLink"
    | "addMutation"
    | "addQuery"
    | "modifyFunction"
    | "addWebhook"
    | "addFrontendView"
    | "addFrontendAgentSurface"
    | "addScenarioFlow";
  readonly target: string;
  readonly details: Record<string, unknown>;
  readonly reason: string;
}

export interface SemanticAuditReport {
  readonly twinMaturityStage: number;
  readonly twinMaturityName: string;
  readonly twinMaturityEvidence: string;
  readonly sections: readonly SectionAudit[];
  readonly coveragePercent: number;
  readonly upgradeRecommendations: readonly SectionAudit[];
  readonly upgradeSpecs: readonly UpgradeSpec[];
}
