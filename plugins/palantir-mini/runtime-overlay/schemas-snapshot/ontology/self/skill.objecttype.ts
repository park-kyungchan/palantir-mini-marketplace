/**
 * palantir-mini SELF-ONTOLOGY — Skill as a registered ObjectType + its 45 instances
 * (Wave 1, harness redesign self-model build). Mirrors the `mcp-tool.objecttype.ts`
 * idiom: ONE `Skill` ObjectType (the type) + the live skill slugs seeded as instances.
 *
 * pm's governed skill surface modeled AS ontology: each `skills/<slug>/SKILL.md`
 * directory (excluding `_shared`) is one Skill identity. This file declares the type
 * and seeds the 45 slugs — the snapshot OWNS the seed (it is the authority), so it does
 * NOT import the skills tree uphill. The paired registration test cross-checks these 45
 * slugs against the LIVE `skills/` directory so the self-model fails loud if pm's skill
 * surface drifts (a skill added/removed without updating this seed).
 *
 * Count provenance (LIVE-verified): `skills/` holds 46 directories; `_shared` is a
 * shared-fragment dir (not a skill), leaving EXACTLY 44 governed skills. Identity-only
 * here (slug primary key); richer per-skill descriptor metadata (name / surfaceStatus /
 * backingHandler) lives in each `SKILL.md` frontmatter, not duplicated in the seed.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-1 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Skill ObjectType. */
export const SKILL_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/skill",
);

/**
 * Skill modeled as a Palantir ObjectType. `slug` is the stable primary key (the
 * `skills/<slug>/` directory name); the optional descriptor properties mirror the
 * SKILL.md frontmatter, but the registered INSTANCES below carry identity only — the
 * descriptor values live in each skill's SKILL.md, not the self-model seed.
 */
export const SKILL_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: SKILL_OBJECT_TYPE_RID,
  apiName: "Skill",
  name: "Skill",
  description:
    "palantir-mini skill surface modeled as an ObjectType: one instance per " +
    "skills/<slug> directory (the governed AIP-mode/capability surface). Identity-only " +
    "here; per-skill descriptor metadata (name, surfaceStatus, backingHandler) is the " +
    "SKILL.md frontmatter, not duplicated in this seed.",
  primaryKeyProperty: "slug",
  titleProperty: "name",
  properties: [
    { name: "slug", type: "string" },
    { name: "name", type: "string", optional: true },
    { name: "surfaceStatus", type: "string", optional: true },
    { name: "backingHandler", type: "string", optional: true },
  ],
};

/** A registered Skill instance — stable skill identity (the skills/<slug> dir name). */
export interface SkillInstance {
  readonly slug: string;
}

/**
 * The 45 Skill instances — pm's LIVE skill surface, in `skills/` directory order.
 * Snapshot-owned seed (no skills-tree import); the registration test cross-checks this
 * set against the live `skills/` directory and fails on any drift.
 */
export const SKILL_INSTANCES: readonly SkillInstance[] = [
  { slug: "pm-ai-fde-route" },
  { slug: "pm-aip-agent-author" },
  { slug: "pm-blueprint" },
  { slug: "pm-codegen" },
  { slug: "pm-cold-start-orchestrate" },
  { slug: "pm-dirty-classify" },
  { slug: "pm-dtc-fill" },
  { slug: "pm-eval-suite" },
  { slug: "pm-fde-session-preview" },
  { slug: "pm-guard" },
  { slug: "pm-hitl-feedback-workbench" },
  { slug: "pm-impact-quick" },
  { slug: "pm-init" },
  { slug: "pm-intent-to-ontology" },
  { slug: "pm-investigate" },
  { slug: "pm-learn" },
  { slug: "pm-lineage" },
  { slug: "pm-lsp-audit" },
  { slug: "pm-mcp-reload" },
  { slug: "pm-memory-map" },
  { slug: "pm-ontology-branch-create" },
  { slug: "pm-ontology-drift-propose" },
  { slug: "pm-ontology-engineering-lead" },
  { slug: "pm-ontology-proposal-create" },
  { slug: "pm-ontology-proposal-review" },
  { slug: "pm-orchestrate" },
  { slug: "pm-pr-impact" },
  { slug: "pm-project-onboard" },
  { slug: "pm-recap" },
  { slug: "pm-replay" },
  { slug: "pm-research" },
  { slug: "pm-retro" },
  { slug: "pm-review" },
  { slug: "pm-rule-audit" },
  { slug: "pm-rule-memory-prune" },
  { slug: "pm-self-test" },
  { slug: "pm-semantic-intent-gate" },
  { slug: "pm-ship" },
  { slug: "pm-t4-promotion-review" },
  { slug: "pm-understand" },
  { slug: "pm-value-audit" },
  { slug: "pm-verify" },
  { slug: "pm-walk-analyze" },
  { slug: "pm-walk-build" },
];

// Register the Skill ObjectType (the type). The 45 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(SKILL_OBJECT_TYPE);
