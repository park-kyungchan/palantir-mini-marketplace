/**
 * palantir-mini SELF-ONTOLOGY — Agent as a registered ObjectType + its 10 instances
 * (Wave 1, harness redesign self-model build). Mirrors the `mcp-tool.objecttype.ts`
 * idiom: ONE `Agent` ObjectType (the type) + the live agent declarations seeded as
 * instances.
 *
 * pm's governed subagent surface modeled AS ontology: each `agents/<name>.md` is one
 * Agent identity. This file declares the type and seeds the 10 agents — the snapshot
 * OWNS the seed (it is the authority), so it does NOT import the agents tree uphill. The
 * paired registration test cross-checks these 10 names against the LIVE `agents/`
 * directory so the self-model fails loud if pm's agent surface drifts (an agent
 * added/removed without updating this seed).
 *
 * Count provenance (LIVE-verified): `agents/` holds EXACTLY 10 `*.md` declarations.
 * Each instance carries identity (`agentId` = the `name:` frontmatter, the PK) plus two
 * stored facts read off the declaration: `tier` (the `model:` field — opus/sonnet/haiku/
 * inherit) and `mutationCapability` ("read-only" when the agent's `disallowedTools`
 * forbid Write/Edit/NotebookEdit, else "mutating"). Richer per-agent metadata
 * (workflowFamily, tool bindings, outputContractExempt) lives in each `.md`, not
 * duplicated in the seed.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-1 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Agent ObjectType. */
export const AGENT_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/agent",
);

/**
 * Agent modeled as a Palantir ObjectType. `agentId` is the stable primary key (the
 * `name:` frontmatter); `tier` and `mutationCapability` are stored facts carried on
 * each registered INSTANCE below. The PascalCase apiName mirrors the generated symbol.
 */
export const AGENT_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: AGENT_OBJECT_TYPE_RID,
  apiName: "Agent",
  name: "Agent",
  description:
    "palantir-mini subagent surface modeled as an ObjectType: one instance per " +
    "agents/<name>.md declaration (the governed subagent runtime). agentId identity " +
    "plus tier (the model field) and mutationCapability (read-only vs mutating, derived " +
    "from disallowedTools); richer declaration metadata lives in each .md, not here.",
  primaryKeyProperty: "agentId",
  titleProperty: "agentId",
  properties: [
    { name: "agentId", type: "string" },
    { name: "tier", type: '"opus" | "sonnet" | "haiku" | "inherit"' },
    { name: "mutationCapability", type: '"read-only" | "mutating"' },
  ],
};

/**
 * A registered Agent instance — stable agent identity (the agents/<name>.md name)
 * plus the two stored facts read off the declaration.
 */
export interface AgentInstance {
  readonly agentId: string;
  readonly tier: "opus" | "sonnet" | "haiku" | "inherit";
  readonly mutationCapability: "read-only" | "mutating";
}

/**
 * The 10 Agent instances — pm's LIVE subagent surface, in `agents/` filename order.
 * Snapshot-owned seed (no agents-tree import); the registration test cross-checks this
 * set against the live `agents/` directory and fails on any drift.
 *
 * `second-brain-fold` is the model-driven session-end memory-fold dispatcher (P1-2 locus
 * shift): `model: inherit` (tier "inherit") and mutating (it runs the fold engine + emits
 * governed lineage events; no `disallowedTools` forbid Write/Edit/NotebookEdit).
 */
export const AGENT_INSTANCES: readonly AgentInstance[] = [
  { agentId: "docs-researcher", tier: "opus", mutationCapability: "mutating" },
  { agentId: "hook-builder", tier: "sonnet", mutationCapability: "mutating" },
  { agentId: "implementer", tier: "sonnet", mutationCapability: "mutating" },
  { agentId: "ontology-steward", tier: "opus", mutationCapability: "mutating" },
  { agentId: "plugin-maintainer", tier: "sonnet", mutationCapability: "mutating" },
  { agentId: "project-implementer", tier: "sonnet", mutationCapability: "mutating" },
  { agentId: "protocol-designer", tier: "sonnet", mutationCapability: "mutating" },
  { agentId: "researcher", tier: "opus", mutationCapability: "read-only" },
  { agentId: "second-brain-fold", tier: "inherit", mutationCapability: "mutating" },
  { agentId: "verifier", tier: "opus", mutationCapability: "read-only" },
];

// Register the Agent ObjectType (the type). The 10 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(AGENT_OBJECT_TYPE);
