/**
 * Semantic Audit — Does the project reflect semantics.ts MEANINGS? (Barrel)
 *
 * Goes beyond structural validation (project-validator.ts) to assess whether
 * a project's ontology embodies the semantic concepts declared in the
 * Meta-Level SSoT (semantics.ts). Produces Twin Maturity assessment +
 * upgrade roadmap.
 *
 * Usage:
 *   import { runSemanticAudit } from "~/.claude/schemas/ontology/semantic-audit";
 *   import * as ontology from "./schema";
 *   runSemanticAudit(ontology);          // bun:test with recommendations
 *   const report = auditSemantics(ontology); // programmatic report
 *
 * Structure (split 2026-04-19, D3):
 *   semantic-audit/sa-types.ts  — CoverageLevel, UpgradePriority,
 *                                 EvidenceKind, SectionAudit, UpgradeSpec,
 *                                 SemanticAuditReport
 *   semantic-audit/sa-core.ts   — auditSemantics() monolith (32 SA sections
 *                                 + maturity computation + upgrade specs)
 *   semantic-audit/sa-runner.ts — runSemanticAudit() bun:test runner
 *
 * Consumers import from this barrel, e.g. `from "./semantic-audit"`.
 * Sub-file layout may evolve within the v1.x line; pin imports to this
 * barrel.
 *
 * Authority: semantics.ts (DIGITAL_TWIN_LOOP, LEARN_MECHANISMS, PA, HRP, TF,
 *            AG, REF, SCN, WL)
 */

export * from "./semantic-audit/sa-types";
export { auditSemantics } from "./semantic-audit/sa-core";
export { runSemanticAudit } from "./semantic-audit/sa-runner";
