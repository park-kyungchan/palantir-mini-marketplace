// palantir-mini — lib/capability-registry/mcp-tool-capability.ts
// Typed metadata for the public MCP tool surface.
//
// This file is intentionally static and side-effect free so hooks can import it
// without loading the full CapabilityRegistry filesystem scanner.

export const MCP_TOOL_CAPABILITY_SCHEMA_VERSION =
  "palantir-mini/mcp-tool-capability/v1" as const;

export type McpToolDomain =
  | "DATA"
  | "LOGIC"
  | "ACTION"
  | "SECURITY"
  | "GOVERNANCE"
  | "LEARN";

export type McpToolLifecycle =
  | "public"
  | "deprecated-candidate"
  | "deprecated"
  | "merged";

export type McpToolSurfaceStatus =
  | "public-core"
  | "dev-only"
  | "protected-default-off"
  | "internal-telemetry";

export type McpToolSurfaceProfile =
  | "studio-core"
  | "dev-full"
  | "protected-actions"
  | "internal-telemetry"
  | "altitude-2";

export interface McpToolSurfaceMetadata {
  readonly status: McpToolSurfaceStatus;
  readonly profiles: readonly McpToolSurfaceProfile[];
}

export type McpToolEffect =
  | "read"
  | "compute"
  | "route"
  | "validate"
  | "evaluate"
  | "append-event"
  | "propose-edit"
  | "commit-edit"
  | "refresh-research";

export type McpToolMutationKind =
  | "none"
  | "event-log-append"
  | "ontology-edit-proposal"
  | "ontology-edit-commit"
  | "contract-negotiation"
  | "research-library-refresh";

export type McpToolDataAction =
  | "none"
  | "read-project-state"
  | "read-schema-source"
  | "read-impact-graph"
  | "append-lineage-event"
  | "read-or-write-contract"
  | "refresh-local-research"
  | "validate-response-template";

export interface McpToolClassifierProjection {
  readonly legacyOperation: string;
  readonly classificationMode: "explicit-operation" | "legacy-fallback";
  readonly preservesRuntimeBlocking: true;
  readonly reason: string;
}

export interface McpToolCapability {
  readonly schemaVersion: typeof MCP_TOOL_CAPABILITY_SCHEMA_VERSION;
  readonly toolName: string;
  readonly rid: `mcp://palantir-mini/${string}`;
  readonly ownerModule: string;
  readonly lifecycle: McpToolLifecycle;
  readonly domain: McpToolDomain;
  readonly effects: readonly McpToolEffect[];
  readonly mutationKind: McpToolMutationKind;
  readonly requiresDtcApproval: boolean;
  readonly requiresSprintContract: boolean;
  readonly dataAction: McpToolDataAction;
  readonly releaseDeploy: boolean;
  readonly externalEgress: boolean;
  readonly classifierProjection: McpToolClassifierProjection;
  readonly surface?: McpToolSurfaceMetadata;
}

export type McpToolCapabilityRecord = McpToolCapability & {
  readonly surface: McpToolSurfaceMetadata;
};

export interface McpToolCapabilityCoverage {
  readonly declaredToolCount: number;
  readonly capabilityCount: number;
  readonly coveredToolNames: readonly string[];
  readonly missingToolNames: readonly string[];
  readonly fallbackClassifiedToolNames: readonly string[];
  readonly extraCapabilityToolNames: readonly string[];
}

const EXPLICIT_PROJECTION_REASON =
  "Legacy classifier already has an explicit operation; preserve existing runtime blocking flags.";

const FALLBACK_PROJECTION_REASON =
  "Legacy classifier intentionally keeps this tool on fallback operation=unknown to avoid runtime blocking drift.";

export const MCP_TOOL_SURFACE_PROFILE_ENV = "PALANTIR_MINI_MCP_PROFILE";

export const DEFAULT_MCP_TOOL_SURFACE_PROFILE =
  "studio-core" as const satisfies McpToolSurfaceProfile;

export const MCP_TOOL_SURFACE_PROFILES = [
  "studio-core",
  "dev-full",
  "protected-actions",
  "internal-telemetry",
  "altitude-2",
] as const satisfies readonly McpToolSurfaceProfile[];

export const MCP_TOOL_SURFACE_STATUSES = [
  "public-core",
  "dev-only",
  "protected-default-off",
  "internal-telemetry",
] as const satisfies readonly McpToolSurfaceStatus[];

export const STUDIO_CORE_MCP_TOOL_NAMES = [
  "ontology_context_query",
  "pm_semantic_intent_gate",
  "pm_ontology_engineering_workflow",
  "pm_intent_router",
  "pm_pre_mutation_governance",
  "ontology_schema_get",
] as const;

export const PROTECTED_ACTION_MCP_TOOL_NAMES = [
  "apply_edit_function",
  "commit_edits",
  "research_library_refresh",
] as const;

export const INTERNAL_TELEMETRY_MCP_TOOL_NAMES = [
  "emit_event",
  "events_log_rotate",
] as const;

// Altitude-2 read navigators — the additive read-only surface bound atop the
// already-built ontology. These tools stay dev-only (no new status string); the
// altitude-2 profile simply widens their `profiles[]` so studio-core + these 5
// are the only tools visible.
export const ALTITUDE_2_READ_MCP_TOOL_NAMES = [
  "get_ontology",
  "impact_query",
  "pm_substrate_query",
  "pm_plugin_self_check",
  "pm_rule_query",
] as const;

const STUDIO_CORE_MCP_TOOL_SET = new Set<string>(STUDIO_CORE_MCP_TOOL_NAMES);
const PROTECTED_ACTION_MCP_TOOL_SET = new Set<string>(PROTECTED_ACTION_MCP_TOOL_NAMES);
const INTERNAL_TELEMETRY_MCP_TOOL_SET = new Set<string>(INTERNAL_TELEMETRY_MCP_TOOL_NAMES);
const ALTITUDE_2_READ_MCP_TOOL_SET = new Set<string>(ALTITUDE_2_READ_MCP_TOOL_NAMES);
const MCP_TOOL_SURFACE_PROFILE_SET = new Set<string>(MCP_TOOL_SURFACE_PROFILES);

function surfaceMetadataForTool(toolName: string): McpToolSurfaceMetadata {
  if (STUDIO_CORE_MCP_TOOL_SET.has(toolName)) {
    return {
      status: "public-core",
      profiles: ["dev-full", "studio-core"],
    };
  }
  if (PROTECTED_ACTION_MCP_TOOL_SET.has(toolName)) {
    return {
      status: "protected-default-off",
      profiles: ["dev-full", "protected-actions"],
    };
  }
  if (INTERNAL_TELEMETRY_MCP_TOOL_SET.has(toolName)) {
    return {
      status: "internal-telemetry",
      profiles: ["dev-full", "internal-telemetry"],
    };
  }
  if (ALTITUDE_2_READ_MCP_TOOL_SET.has(toolName)) {
    return {
      status: "dev-only",
      profiles: ["dev-full", "altitude-2"],
    };
  }
  return {
    status: "dev-only",
    profiles: ["dev-full"],
  };
}

export function isMcpToolSurfaceProfile(
  value: string | undefined,
): value is McpToolSurfaceProfile {
  return value !== undefined && MCP_TOOL_SURFACE_PROFILE_SET.has(value);
}

export function resolveMcpToolSurfaceProfile(
  rawProfile: string | undefined,
): McpToolSurfaceProfile {
  // Unknown values fall back to the conservative Studio surface so a typo cannot
  // silently widen the local MCP tool exposure.
  return isMcpToolSurfaceProfile(rawProfile)
    ? rawProfile
    : DEFAULT_MCP_TOOL_SURFACE_PROFILE;
}

export function includedMcpToolSurfaceProfiles(
  profile: McpToolSurfaceProfile,
): readonly McpToolSurfaceProfile[] {
  if (
    profile === "protected-actions" ||
    profile === "internal-telemetry" ||
    profile === "altitude-2"
  ) {
    return ["studio-core", profile];
  }
  return [profile];
}

export function isMcpToolVisibleInProfile(
  capabilityRecord: Pick<McpToolCapability, "surface"> | undefined,
  profile: McpToolSurfaceProfile,
): boolean {
  const surface = capabilityRecord?.surface;
  if (surface === undefined) return false;
  const includedProfiles = includedMcpToolSurfaceProfiles(profile);
  return surface.profiles.some((candidate) =>
    includedProfiles.includes(candidate),
  );
}

function capability(
  toolName: string,
  args: Omit<
    McpToolCapability,
    "schemaVersion" | "toolName" | "rid" | "ownerModule" | "lifecycle" | "surface"
  > & {
    readonly ownerModule?: string;
    readonly lifecycle?: McpToolLifecycle;
    readonly surface?: McpToolSurfaceMetadata;
  },
): McpToolCapabilityRecord {
  return {
    schemaVersion: MCP_TOOL_CAPABILITY_SCHEMA_VERSION,
    toolName,
    rid: `mcp://palantir-mini/${toolName}`,
    ownerModule: args.ownerModule ?? "bridge/mcp-server.ts#TOOLS",
    lifecycle: args.lifecycle ?? "public",
    domain: args.domain,
    effects: args.effects,
    mutationKind: args.mutationKind,
    requiresDtcApproval: args.requiresDtcApproval,
    requiresSprintContract: args.requiresSprintContract,
    dataAction: args.dataAction,
    releaseDeploy: args.releaseDeploy,
    externalEgress: args.externalEgress,
    classifierProjection: args.classifierProjection,
    surface: args.surface ?? surfaceMetadataForTool(toolName),
  };
}

function explicit(legacyOperation: string): McpToolClassifierProjection {
  return {
    legacyOperation,
    classificationMode: "explicit-operation",
    preservesRuntimeBlocking: true,
    reason: EXPLICIT_PROJECTION_REASON,
  };
}

function fallback(): McpToolClassifierProjection {
  return {
    legacyOperation: "unknown",
    classificationMode: "legacy-fallback",
    preservesRuntimeBlocking: true,
    reason: FALLBACK_PROJECTION_REASON,
  };
}

export const MCP_TOOL_CAPABILITIES: readonly McpToolCapabilityRecord[] = [
  capability("emit_event", {
    domain: "LEARN",
    effects: ["append-event"],
    mutationKind: "event-log-append",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "append-lineage-event",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("emit_event"),
  }),
  capability("get_ontology", {
    domain: "DATA",
    effects: ["read"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: fallback(),
  }),
  capability("ontology_schema_get", {
    domain: "DATA",
    effects: ["read"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-schema-source",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("ontology_schema_get"),
  }),
  capability("impact_query", {
    domain: "LOGIC",
    effects: ["read"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-impact-graph",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("impact_query"),
  }),
  capability("pre_edit_impact", {
    domain: "LOGIC",
    effects: ["read", "evaluate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-impact-graph",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pre_edit_impact"),
  }),
  capability("pm_pre_mutation_governance", {
    domain: "GOVERNANCE",
    effects: ["compute", "evaluate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_pre_mutation_governance"),
  }),
  capability("apply_edit_function", {
    domain: "ACTION",
    effects: ["propose-edit"],
    mutationKind: "ontology-edit-proposal",
    requiresDtcApproval: true,
    requiresSprintContract: true,
    dataAction: "read-or-write-contract",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("apply_edit_function"),
  }),
  capability("commit_edits", {
    domain: "ACTION",
    effects: ["commit-edit"],
    mutationKind: "ontology-edit-commit",
    requiresDtcApproval: true,
    requiresSprintContract: true,
    dataAction: "read-or-write-contract",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("commit_edits"),
  }),
  capability("structured_output", {
    domain: "LOGIC",
    effects: ["validate", "compute"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "none",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: fallback(),
  }),
  capability("grade_outcome_with_rubric", {
    domain: "GOVERNANCE",
    effects: ["evaluate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "none",
    releaseDeploy: false,
    // delegates the model path to pm_grader_dispatch (which carries the egress flag).
    externalEgress: false,
    classifierProjection: fallback(),
  }),
  capability("pm_grader_dispatch", {
    domain: "GOVERNANCE",
    effects: ["evaluate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "none",
    releaseDeploy: false,
    // spawns a fresh grader subprocess (claude -p / codex exec).
    externalEgress: true,
    classifierProjection: fallback(),
  }),
  capability("pm_semantic_intent_gate", {
    domain: "GOVERNANCE",
    effects: ["evaluate", "route"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-or-write-contract",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_semantic_intent_gate"),
  }),
  capability("pm_intent_router", {
    domain: "GOVERNANCE",
    effects: ["route"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-or-write-contract",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_intent_router"),
  }),
  capability("pm_ontology_engineering_workflow", {
    domain: "GOVERNANCE",
    effects: ["read", "route", "append-event"],
    mutationKind: "contract-negotiation",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-or-write-contract",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: fallback(),
  }),
  capability("pm_health_audit", {
    domain: "GOVERNANCE",
    effects: ["validate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_health_audit"),
  }),
  capability("pm_substrate_query", {
    domain: "DATA",
    effects: ["read"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_substrate_query"),
  }),
  capability("research_context_select", {
    domain: "DATA",
    effects: ["read"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: fallback(),
  }),
  capability("research_library_refresh", {
    domain: "LEARN",
    effects: ["refresh-research"],
    mutationKind: "research-library-refresh",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "refresh-local-research",
    releaseDeploy: false,
    externalEgress: true,
    classifierProjection: fallback(),
  }),
  capability("pm_plugin_self_check", {
    domain: "GOVERNANCE",
    effects: ["validate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: fallback(),
  }),
  capability("pm_rule_query", {
    domain: "GOVERNANCE",
    effects: ["read"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_rule"),
  }),
  capability("pm_rule_audit", {
    domain: "GOVERNANCE",
    effects: ["validate"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("pm_rule"),
  }),
  capability("events_log_rotate", {
    domain: "LEARN",
    effects: ["append-event"],
    mutationKind: "event-log-append",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "append-lineage-event",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("events_log_rotate"),
  }),
  capability("ontology_context_query", {
    domain: "DATA",
    effects: ["read", "route"],
    mutationKind: "none",
    requiresDtcApproval: false,
    requiresSprintContract: false,
    dataAction: "read-project-state",
    releaseDeploy: false,
    externalEgress: false,
    classifierProjection: explicit("ontology_context_query"),
  }),
];

const MCP_TOOL_CAPABILITY_BY_NAME = new Map(
  MCP_TOOL_CAPABILITIES.map((capabilityRecord) => [
    capabilityRecord.toolName,
    capabilityRecord,
  ]),
);

export function getMcpToolCapability(
  toolName: string | undefined,
): McpToolCapabilityRecord | undefined {
  if (!toolName) return undefined;
  return MCP_TOOL_CAPABILITY_BY_NAME.get(toolName);
}

export function listMcpToolCapabilitiesForDeclaredTools(
  declaredToolNames: readonly string[],
): readonly McpToolCapabilityRecord[] {
  return declaredToolNames
    .map((toolName) => getMcpToolCapability(toolName))
    .filter((capabilityRecord): capabilityRecord is McpToolCapabilityRecord =>
      capabilityRecord !== undefined,
    );
}

export function summarizeMcpToolCapabilityCoverage(
  declaredToolNames: readonly string[],
): McpToolCapabilityCoverage {
  const declaredUnique = [...new Set(declaredToolNames)].sort();
  const declaredSet = new Set(declaredUnique);
  const capabilityNames = MCP_TOOL_CAPABILITIES
    .map((capabilityRecord) => capabilityRecord.toolName)
    .sort();

  const coveredToolNames = declaredUnique.filter((toolName) =>
    MCP_TOOL_CAPABILITY_BY_NAME.has(toolName),
  );
  const missingToolNames = declaredUnique.filter((toolName) =>
    !MCP_TOOL_CAPABILITY_BY_NAME.has(toolName),
  );
  const fallbackClassifiedToolNames = coveredToolNames.filter((toolName) => {
    const capabilityRecord = MCP_TOOL_CAPABILITY_BY_NAME.get(toolName);
    return (
      capabilityRecord?.classifierProjection.classificationMode ===
      "legacy-fallback"
    );
  });
  const extraCapabilityToolNames = capabilityNames.filter(
    (toolName) => !declaredSet.has(toolName),
  );

  return {
    declaredToolCount: declaredUnique.length,
    capabilityCount: MCP_TOOL_CAPABILITIES.length,
    coveredToolNames,
    missingToolNames,
    fallbackClassifiedToolNames,
    extraCapabilityToolNames,
  };
}
