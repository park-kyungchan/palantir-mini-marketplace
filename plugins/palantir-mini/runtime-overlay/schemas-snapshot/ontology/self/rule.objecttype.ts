/**
 * palantir-mini SELF-ONTOLOGY — Rule as a registered ObjectType + its 8 instances
 * (Wave 2, harness redesign self-model build). Mirrors the `skill.objecttype.ts` /
 * `agent.objecttype.ts` idiom: ONE `Rule` ObjectType (the type) + pm's live global
 * behavioral-overlay rules seeded as instances.
 *
 * pm's governance behavioral overlay modeled AS ontology: each
 * `~/.claude/rules/NN-<slug>.md` numbered file is one Rule identity. This file declares
 * the type and seeds the 8 ACTIVE global rules — the snapshot OWNS the seed (it is the
 * authority), so it does NOT import the rules tree uphill. The paired registration test
 * cross-checks these 8 ruleIds against the LIVE `~/.claude/rules/` directory so the
 * self-model fails loud if pm's rule surface drifts (a rule added/removed without
 * updating this seed).
 *
 * Count provenance (LIVE-verified): `~/.claude/rules/` holds EXACTLY 8 numbered
 * `NN-<slug>.md` files (the Wave-3 rationalized active set: 01/02/07/08/10/25/26/27).
 * CORE/CONTEXT/BROWSE are materialized-view routers, not Rule instances (excluded by
 * the numbered-prefix filter). Each instance carries identity (`ruleId` = the numeric
 * prefix, the PK) plus the `slug` and `scope` read off the filename + frontmatter; the
 * 3 permanent-gap deletions (`supersededBy`) and richer per-rule body live in each .md.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Rule ObjectType. */
export const RULE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/rule",
);

/**
 * Rule modeled as a Palantir ObjectType. `ruleId` is the stable primary key (the numeric
 * `NN-` filename prefix); `slug` and `scope` are stored facts carried on each registered
 * INSTANCE below, read off the filename + frontmatter. The PascalCase apiName mirrors the
 * generated symbol.
 */
export const RULE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: RULE_OBJECT_TYPE_RID,
  apiName: "Rule",
  name: "Rule",
  description:
    "palantir-mini behavioral-overlay governance surface modeled as an ObjectType: " +
    "one instance per ~/.claude/rules/NN-<slug>.md active rule. ruleId identity plus " +
    "slug and scope (global/plugin/project); CORE/CONTEXT/BROWSE routers are " +
    "materialized views, not instances. Richer per-rule body lives in each .md, not here.",
  primaryKeyProperty: "ruleId",
  titleProperty: "slug",
  properties: [
    { name: "ruleId", type: "number" },
    { name: "slug", type: "string" },
    { name: "scope", type: "string" },
  ],
};

/**
 * A registered Rule instance — stable rule identity (the numeric NN- prefix) plus the two
 * stored facts read off the file (slug from the filename, scope from frontmatter).
 */
export interface RuleInstance {
  readonly ruleId: number;
  readonly slug: string;
  readonly scope: string;
}

/**
 * The 8 Rule instances — pm's LIVE active global behavioral-overlay rules, in numeric
 * order. Snapshot-owned seed (no rules-tree import); the registration test cross-checks
 * this set against the live `~/.claude/rules/` directory and fails on any drift.
 */
export const RULE_INSTANCES: readonly RuleInstance[] = [
  { ruleId: 1, slug: "ontology-first-core", scope: "global" },
  { ruleId: 2, slug: "research-retrieval", scope: "global" },
  { ruleId: 7, slug: "plugins-and-mcp", scope: "global" },
  { ruleId: 8, slug: "schema-versioning", scope: "global" },
  { ruleId: 10, slug: "events-jsonl", scope: "global" },
  { ruleId: 25, slug: "auto-merge-cleanup-default", scope: "global" },
  { ruleId: 26, slug: "valuable-data-standard", scope: "global" },
  { ruleId: 27, slug: "cross-runtime-substrate", scope: "global" },
];

// Register the Rule ObjectType (the type). The 8 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(RULE_OBJECT_TYPE);
