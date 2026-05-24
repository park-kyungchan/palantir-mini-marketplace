/**
 * @stable — Skill primitive (prim-ops-27, v1.0.0)
 *
 * Alias-wrapper for SkillDefinitionRid under the canonical Phase 2 node name.
 * SkillDefinition already mirrors SKILL.md frontmatter exactly. This wrapper
 * provides a friendlier `Skill` / `SkillRid` alias for ImpactGraph nodes
 * without duplicating any type definitions.
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 2 — SkillDefinition
 * structurally covers the node concept; no extend required.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/skill-definition.ts (wrapped)
 *     -> ~/.claude/schemas/ontology/primitives/skill.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: OPS (alias — no new logic; delegates to skill-definition.ts)
 * @owner palantirkc-ontology
 * @purpose Skill canonical alias for SkillDefinitionRid (Phase 2 ImpactGraph node)
 */

export type {
  SkillDefinitionRid,
  SkillDefinitionDeclaration,
  SkillScope,
  SkillModel,
} from "./skill-definition";

export { skillDefinitionRid } from "./skill-definition";

/** Canonical alias — SkillRid IS SkillDefinitionRid. */
export type SkillRid = import("./skill-definition").SkillDefinitionRid;
