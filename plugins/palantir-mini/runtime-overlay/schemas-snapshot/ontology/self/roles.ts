/**
 * palantir-mini SELF-ONTOLOGY — Role instances (principal->permission grants).
 *
 * pm's OWN RBAC surface (rule 07 §Agent file-ownership + the agent read-only-vs-
 * mutating capability split) modeled AS Role primitive instances — the
 * principal->permission grant the prior RBAC surface (marking / object-security /
 * property-security / capability-token) lacked. Mirrors the `learning.objecttype.ts`
 * idiom: stable RID consts + the instance interface + an INSTANCES seed + the
 * registration side-effect (importing this module self-registers into ROLE_REGISTRY).
 *
 * Two role families seeded here:
 *
 *  1. AGENT FILE-OWNERSHIP (rule 07 table) — principal->writable-path grants. The
 *     real agent principals (kind:"agent") are hook-builder / plugin-maintainer /
 *     protocol-designer; their `id` references a live agents/<id>.md declaration.
 *     The table's `task-owner` and `shared` rows are NOT agent identities (no
 *     agents/task-owner.md or agents/shared.md exists) — they are grant-LABELS:
 *     "the agent assigned this skill per task" and "any agent coordinating on lib/**".
 *     They are modeled with kind:"capability-token" (a bearer-grant label, not a
 *     fixed actor), so the test's "agent principals reference real agents" invariant
 *     stays honest.
 *
 *  2. CAPABILITY SPLIT (rule 07 §Agent read-only-vs-mutating) — the two capability
 *     classes pm's subagent surface divides into. Read-only agents (researcher /
 *     verifier) get read+execute only; mutating agents get the write/register verbs
 *     too. These are class grants, so their principal is kind:"capability-token" (the
 *     capability class label) and their grantedResourceRids enumerate the member agent RIDs.
 *
 * @owner palantirkc-ontology
 * @purpose Self-Ontology Role instances (agent file-ownership + capability split as RBAC grants)
 */

import {
  type RoleDeclaration,
  ROLE_REGISTRY,
  roleRid,
} from "../primitives/role";

// ---------------------------------------------------------------------------
// Family 1 — Agent file-ownership roles (rule 07 §Agent file-ownership table).
// ---------------------------------------------------------------------------

/** Stable RID for the hook-builder ownership Role. */
export const HOOK_BUILDER_ROLE_RID = roleRid(
  "pm.self.ontology/role/hook-builder",
);

/**
 * hook-builder ownership Role — binds the `hook-builder` agent principal to the
 * writable paths it owns in rule 07's file-ownership table, with read/write/
 * register/execute verbs. The principal->permission grant: "agent hook-builder
 * may read+write+register+execute over hooks/**, monitors/**, scripts/**,
 * bridge/handlers/**, and tests/{hooks,monitors,bridge}/**".
 */
export const HOOK_BUILDER_ROLE: RoleDeclaration = {
  rid: HOOK_BUILDER_ROLE_RID,
  name: "hook-builder-ownership",
  description:
    "rule 07 §Agent file-ownership: hook-builder owns hooks/** + monitors/** + " +
    "scripts/** + bridge/handlers/** + tests/{hooks,monitors,bridge}/**. Modeled as a " +
    "Role — the principal->permission binding, distinct from any CapabilityToken " +
    "minted from it.",
  principal: { kind: "agent", id: "hook-builder" },
  grantedResourceRids: [
    "pm.plugin/path/hooks/**",
    "pm.plugin/path/hooks.json",
    "pm.plugin/path/monitors/**",
    "pm.plugin/path/scripts/**",
    "pm.plugin/path/bridge/handlers/**",
    "pm.plugin/path/tests/hooks/**",
    "pm.plugin/path/tests/monitors/**",
    "pm.plugin/path/tests/bridge/**",
  ],
  permissions: ["read", "write", "register", "execute"],
};

/** Stable RID for the plugin-maintainer ownership Role. */
export const PLUGIN_MAINTAINER_ROLE_RID = roleRid(
  "pm.self.ontology/role/plugin-maintainer",
);

/**
 * plugin-maintainer ownership Role — binds the `plugin-maintainer` agent principal
 * to the plugin-manifest + packaging surface it owns (rule 07: the sole authority
 * for version bumps). Grant: "agent plugin-maintainer may read+write+register over
 * the manifest, package.json, README/CHANGELOG, and managed-settings.d/**".
 */
export const PLUGIN_MAINTAINER_ROLE: RoleDeclaration = {
  rid: PLUGIN_MAINTAINER_ROLE_RID,
  name: "plugin-maintainer-ownership",
  description:
    "rule 07 §Agent file-ownership: plugin-maintainer owns " +
    ".claude-plugin/{plugin,marketplace}.json + package.json + README.md + " +
    "CHANGELOG.md + managed-settings.d/**. Sole owner of version bumps.",
  principal: { kind: "agent", id: "plugin-maintainer" },
  grantedResourceRids: [
    "pm.plugin/path/.claude-plugin/plugin.json",
    "pm.plugin/path/.claude-plugin/marketplace.json",
    "pm.plugin/path/package.json",
    "pm.plugin/path/README.md",
    "pm.plugin/path/CHANGELOG.md",
    "pm.plugin/path/managed-settings.d/**",
  ],
  permissions: ["read", "write", "register"],
};

/** Stable RID for the protocol-designer ownership Role. */
export const PROTOCOL_DESIGNER_ROLE_RID = roleRid(
  "pm.self.ontology/role/protocol-designer",
);

/**
 * protocol-designer ownership Role — binds the `protocol-designer` agent principal
 * to the plugin-scope agents/** tree it owns (the canonical agent-authoring agent).
 * Grant: "agent protocol-designer may read+write+register over agents/**".
 */
export const PROTOCOL_DESIGNER_ROLE: RoleDeclaration = {
  rid: PROTOCOL_DESIGNER_ROLE_RID,
  name: "protocol-designer-ownership",
  description:
    "rule 07 §Agent file-ownership: protocol-designer owns agents/** (plugin-scope). " +
    "The canonical rule/agent-authoring agent.",
  principal: { kind: "agent", id: "protocol-designer" },
  grantedResourceRids: ["pm.plugin/path/agents/**"],
  permissions: ["read", "write", "register"],
};

/** Stable RID for the task-owner (per-task skills/**) ownership Role. */
export const TASK_OWNER_ROLE_RID = roleRid(
  "pm.self.ontology/role/task-owner",
);

/**
 * task-owner ownership Role — rule 07 assigns skills/** to a `task-owner` PER TASK.
 * `task-owner` is not a fixed agent identity (no agents/task-owner.md), so the
 * principal is a capability-token grant-label: "whichever agent is assigned this
 * skill task may read+write+register over skills/**". A real agent is bound at
 * dispatch time by minting a token FROM this Role.
 */
export const TASK_OWNER_ROLE: RoleDeclaration = {
  rid: TASK_OWNER_ROLE_RID,
  name: "task-owner-ownership",
  description:
    "rule 07 §Agent file-ownership: skills/** is owned by a task-owner assigned per " +
    "task. Not a fixed agent — a capability-token grant-label bound to a real agent " +
    "at dispatch. Grants read+write+register over skills/**.",
  principal: { kind: "capability-token", id: "task-owner" },
  grantedResourceRids: ["pm.plugin/path/skills/**"],
  permissions: ["read", "write", "register"],
};

/** Stable RID for the shared (lib/**, cross-agent coordination) ownership Role. */
export const SHARED_LIB_ROLE_RID = roleRid(
  "pm.self.ontology/role/shared-lib",
);

/**
 * shared-lib ownership Role — rule 07 marks lib/** as `shared` (a refactor needs
 * cross-agent coordination). `shared` is not an agent identity; the principal is a
 * capability-token grant-label meaning "any agent, only under cross-agent
 * coordination". Grants read+write but NOT register/admin (no unilateral authority).
 */
export const SHARED_LIB_ROLE: RoleDeclaration = {
  rid: SHARED_LIB_ROLE_RID,
  name: "shared-lib-ownership",
  description:
    "rule 07 §Agent file-ownership: lib/** is shared — a refactor needs cross-agent " +
    "coordination. Not a fixed agent — a capability-token grant-label. Grants " +
    "read+write under coordination; no unilateral register/admin.",
  principal: { kind: "capability-token", id: "shared" },
  grantedResourceRids: ["pm.plugin/path/lib/**"],
  permissions: ["read", "write"],
};

// ---------------------------------------------------------------------------
// Family 2 — Capability-split roles (rule 07 §Agent read-only-vs-mutating).
// The two capability classes pm's subagent surface divides into. Principal is a
// capability-token class label; grantedResourceRids enumerate the member agent RIDs.
// ---------------------------------------------------------------------------

/** Agent RID helper — references a live Agent ObjectType instance by agentId. */
const agentRid = (id: string): string => `pm.self.ontology/object-type/agent/${id}`;

/** The 2 read-only agents (rule 07: disallowedTools forbid Write/Edit/NotebookEdit). */
export const READ_ONLY_AGENT_IDS: readonly string[] = [
  "researcher",
  "verifier",
];

/** The 8 mutating agents (the rest of the 10-agent surface). */
export const MUTATING_AGENT_IDS: readonly string[] = [
  "docs-researcher",
  "hook-builder",
  "implementer",
  "ontology-steward",
  "plugin-maintainer",
  "project-implementer",
  "protocol-designer",
  // P1-2 model-driven memory-fold dispatcher: runs the fold engine + emits governed
  // lineage events (it WRITES); no disallowedTools forbid Write/Edit/NotebookEdit ->
  // mutating capability class (not read-only). Distinct from its outputContractExempt
  // metadata, which marks it a "special" agent in the PR-G output-contract lens.
  "second-brain-fold",
];

/** Stable RID for the read-only capability-class Role. */
export const READ_ONLY_CAPABILITY_ROLE_RID = roleRid(
  "pm.self.ontology/role/capability-read-only",
);

/**
 * read-only capability-class Role — the grant the 2 read-only agents share: they may
 * read+execute over their member agent surfaces but NOT write/register (their
 * disallowedTools forbid Write/Edit/NotebookEdit). Principal is the capability-class
 * label; grantedResourceRids enumerate the member agent RIDs.
 */
export const READ_ONLY_CAPABILITY_ROLE: RoleDeclaration = {
  rid: READ_ONLY_CAPABILITY_ROLE_RID,
  name: "capability-read-only",
  description:
    "rule 07 §Agent read-only-vs-mutating: the 2 read-only agents (researcher, " +
    "verifier) may read+execute but not write/register — disallowedTools forbid " +
    "Write/Edit/NotebookEdit. Capability-class grant over the member agent surfaces.",
  principal: { kind: "capability-token", id: "capability-read-only" },
  grantedResourceRids: READ_ONLY_AGENT_IDS.map(agentRid),
  permissions: ["read", "execute"],
};

/** Stable RID for the mutating capability-class Role. */
export const MUTATING_CAPABILITY_ROLE_RID = roleRid(
  "pm.self.ontology/role/capability-mutating",
);

/**
 * mutating capability-class Role — the grant the 8 mutating agents share: read +
 * write + register + execute over their member agent surfaces. Principal is the
 * capability-class label; grantedResourceRids enumerate the member agent RIDs.
 */
export const MUTATING_CAPABILITY_ROLE: RoleDeclaration = {
  rid: MUTATING_CAPABILITY_ROLE_RID,
  name: "capability-mutating",
  description:
    "rule 07 §Agent read-only-vs-mutating: the 8 mutating agents may " +
    "read+write+register+execute — their tool sets permit Write/Edit/NotebookEdit. " +
    "Capability-class grant over the member agent surfaces.",
  principal: { kind: "capability-token", id: "capability-mutating" },
  grantedResourceRids: MUTATING_AGENT_IDS.map(agentRid),
  permissions: ["read", "write", "register", "execute"],
};

// ---------------------------------------------------------------------------
// Instance seed + registration.
// ---------------------------------------------------------------------------

/** A registered Role instance — the principal->permission grant facts. */
export interface RoleInstance {
  readonly rid: string;
  readonly name: string;
  readonly principalKind: string;
  readonly principalId: string;
  readonly grantedResourceRids: readonly string[];
  readonly permissions: readonly string[];
}

/** All Role declarations seeded into the self-model (ownership + capability split). */
export const ROLE_DECLARATIONS: readonly RoleDeclaration[] = [
  HOOK_BUILDER_ROLE,
  PLUGIN_MAINTAINER_ROLE,
  PROTOCOL_DESIGNER_ROLE,
  TASK_OWNER_ROLE,
  SHARED_LIB_ROLE,
  READ_ONLY_CAPABILITY_ROLE,
  MUTATING_CAPABILITY_ROLE,
];

/** Role instances seeded into the self-model (one per declaration above). */
export const ROLE_INSTANCES: readonly RoleInstance[] = ROLE_DECLARATIONS.map(
  (decl: RoleDeclaration): RoleInstance => ({
    rid: decl.rid,
    name: decl.name,
    principalKind: decl.principal.kind,
    principalId: decl.principal.id,
    grantedResourceRids: decl.grantedResourceRids,
    permissions: decl.permissions,
  }),
);

// Register every Role (the principal->permission grants). Importing this module
// self-registers each instance into ROLE_REGISTRY (the side-effect the barrel relies on).
for (const decl of ROLE_DECLARATIONS) {
  ROLE_REGISTRY.register(decl);
}
