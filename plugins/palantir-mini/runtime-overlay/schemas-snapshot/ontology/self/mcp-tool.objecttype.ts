/**
 * palantir-mini SELF-ONTOLOGY — McpTool as a registered ObjectType + its 30 instances
 * (M-SELF deliverable #3, harness redesign W3e-3a; +1 = O-1 structured_output).
 * Together with the Executor ActionType this takes the self/ ObjectType+ActionType
 * register count from 1 → 3.
 *
 * pm's MCP surface modeled AS ontology: the bridge exposes a fixed set of MCP tools
 * (the runtime's callable surface). This file declares ONE `McpTool` ObjectType (the
 * type) and seeds the 30 tool identities as instances — the snapshot OWNS the seed
 * (it is the authority), so it does NOT import `bridge/mcp-server.ts` uphill. The
 * paired registration test cross-checks these 30 names against the LIVE bridge TOOLS
 * array so the self-model fails loud if pm's surface drifts (a tool added/removed in
 * the bridge without updating this seed).
 *
 * Count provenance (W3e-3a grounding, LIVE-verified): bridge has EXACTLY 30 tools —
 * 27 prior + W3e-1's `grade_outcome_with_rubric` + `pm_grader_dispatch` + O-1's
 * `structured_output`. (The bridge's
 * in-file section-header comments — "14 / 8 / 5" — are STALE; the SSoT is the TOOLS
 * array length / HANDLER_MODULES map.) Richer per-tool metadata (category / audience /
 * lifecycle / classifier projection) is the RUNTIME projection at
 * `lib/capability-registry/mcp-tool-capability.ts`; it is intentionally NOT duplicated
 * here — this self-model carries the stable tool IDENTITY only.
 *
 * @owner palantirkc-ontology
 * @purpose Third registered self-Ontology instance (M-SELF, harness redesign W3e-3a)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology McpTool ObjectType. */
export const MCP_TOOL_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/mcp-tool",
);

/**
 * McpTool modeled as a Palantir ObjectType. `toolName` is the stable primary key
 * (the bridge tool name); the optional descriptor properties mirror the bridge
 * ToolSpec fields, but the registered INSTANCES below carry identity only — the
 * descriptor values live in the runtime capability projection, not the self-model.
 */
export const MCP_TOOL_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: MCP_TOOL_OBJECT_TYPE_RID,
  apiName: "McpTool",
  name: "McpTool",
  description:
    "palantir-mini MCP tool surface modeled as an ObjectType: one instance per " +
    "bridge tool name (the runtime's callable surface). Identity-only here; per-tool " +
    "descriptor metadata is the runtime projection in lib/capability-registry/" +
    "mcp-tool-capability.ts.",
  primaryKeyProperty: "toolName",
  titleProperty: "toolName",
  properties: [
    { name: "toolName", type: "string" },
    { name: "category", type: "string", optional: true },
    { name: "audience", type: "string", optional: true },
    { name: "lifecycle", type: "string", optional: true },
    { name: "ownerModule", type: "string", optional: true },
  ],
};

/** A registered McpTool instance — stable tool identity (the bridge tool name). */
export interface McpToolInstance {
  readonly toolName: string;
}

/**
 * The 30 McpTool instances — pm's LIVE bridge tool surface, in TOOLS-array order.
 * Snapshot-owned seed (no bridge import); the registration test cross-checks this set
 * against the live `bridge/mcp-server.ts` TOOLS array and fails on any drift.
 */
export const MCP_TOOL_INSTANCES: readonly McpToolInstance[] = [
  { toolName: "emit_event" },
  { toolName: "get_ontology" },
  { toolName: "ontology_schema_get" },
  { toolName: "impact_query" },
  { toolName: "pre_edit_impact" },
  { toolName: "pm_pre_mutation_governance" },
  { toolName: "apply_edit_function" },
  { toolName: "pm_ontology_engineering_workflow" },
  { toolName: "commit_edits" },
  { toolName: "grade_semantic_intent_contract" },
  { toolName: "grade_outcome_with_rubric" },
  { toolName: "pm_grader_dispatch" },
  { toolName: "pm_semantic_intent_gate" },
  { toolName: "pm_intent_router" },
  { toolName: "pm_lead_brief" },
  { toolName: "pm_health_audit" },
  { toolName: "pm_substrate_query" },
  { toolName: "research_context_select" },
  { toolName: "events_log_rotate" },
  { toolName: "research_library_refresh" },
  { toolName: "pm_plugin_self_check" },
  { toolName: "pm_workflow_response_validate" },
  { toolName: "pm_surface_contract_audit" },
  { toolName: "pm_aip_source_authority_validate" },
  { toolName: "pm_runtime_decision_parity" },
  { toolName: "pm_rule_query" },
  { toolName: "pm_rule_audit" },
  { toolName: "validate_managed_settings_fragments" },
  { toolName: "ontology_context_query" },
  { toolName: "structured_output" },
];

// Register the McpTool ObjectType (the type). The 30 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(MCP_TOOL_OBJECT_TYPE);
