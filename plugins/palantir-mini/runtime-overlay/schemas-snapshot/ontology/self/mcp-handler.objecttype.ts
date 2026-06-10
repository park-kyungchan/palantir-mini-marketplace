/**
 * palantir-mini SELF-ONTOLOGY — McpHandler as a registered ObjectType + its 63
 * instances (Wave 1 ObjectType build; +1 = O-1 structured-output). pm's bridge-handler layer modeled AS ontology:
 * the runtime exposes 29 callable MCP tools but is backed by far more handler modules
 * (mode-dispatchers fan out to hidden sub-modes), so the handler dir is the true LOGIC
 * surface — the biggest under-modeling trap a 1-tool-per-type pass misses.
 *
 * This file declares ONE `McpHandler` ObjectType (the type) and seeds the 63 handler
 * identities as instances (handlerName = the bridge/handlers/*.ts filename, minus the 2
 * private underscore helpers `_deprecation-map` + `_project-event`). The snapshot OWNS
 * the seed (it is the authority), so it does NOT import bridge/handlers uphill. The
 * paired registration test cross-checks these 63 names against the LIVE
 * bridge/handlers/ directory so the self-model fails loud if pm's handler surface drifts
 * (a handler added/removed in the bridge without updating this seed).
 *
 * Count provenance (Wave 1 grounding, LIVE-verified): bridge/handlers/ has EXACTLY 65
 * `.ts` files; excluding the 2 underscore helpers leaves 63 first-class handler nouns.
 * Identity-only here (handlerName + a couple of coarse structural flags); per-handler
 * dispatch metadata is the runtime concern, not duplicated into the self-model.
 *
 * @owner palantirkc-ontology
 * @purpose Wave 1 self-Ontology ObjectType (McpHandler, 63 handler instances)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology McpHandler ObjectType. */
export const MCP_HANDLER_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/mcp-handler",
);

/**
 * McpHandler modeled as a Palantir ObjectType. `handlerName` is the stable primary key
 * (the bridge/handlers/*.ts module name); `backsTool` records whether the handler is
 * the direct backing of an exposed MCP tool, and `isSubMode` whether it is a hidden
 * sub-mode reached only via a mode-dispatcher. The registered INSTANCES below carry
 * identity only — the dispatch metadata is the runtime projection, not the self-model.
 */
export const MCP_HANDLER_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: MCP_HANDLER_OBJECT_TYPE_RID,
  apiName: "McpHandler",
  name: "McpHandler",
  description:
    "palantir-mini bridge handler surface modeled as an ObjectType: one instance per " +
    "bridge/handlers/*.ts module (the runtime's backing LOGIC surface), excluding the " +
    "2 private underscore helpers. Identity-only here; per-handler dispatch metadata " +
    "is the runtime concern, not duplicated into this self-model.",
  primaryKeyProperty: "handlerName",
  titleProperty: "handlerName",
  properties: [
    { name: "handlerName", type: "string" },
    { name: "backsTool", type: "boolean", optional: true },
    { name: "isSubMode", type: "boolean", optional: true },
  ],
};

/** A registered McpHandler instance — stable handler identity (the module name). */
export interface McpHandlerInstance {
  readonly handlerName: string;
}

/**
 * The 63 McpHandler instances — pm's LIVE bridge/handlers/*.ts surface, in directory
 * (readdir) order, excluding the 2 private underscore helpers (_deprecation-map,
 * _project-event). Snapshot-owned seed (no bridge import); the registration test
 * cross-checks this set against the live bridge/handlers/ directory and fails on drift.
 */
export const MCP_HANDLER_INSTANCES: readonly McpHandlerInstance[] = [
  { handlerName: "apply-edit-function" },
  { handlerName: "audit-events-5d-conformance" },
  { handlerName: "commit-edits" },
  { handlerName: "complete-playwright-scenario" },
  { handlerName: "detect-doc-drift" },
  { handlerName: "emit-event" },
  { handlerName: "events-log-rotate" },
  { handlerName: "fde-ontology-turn" },
  { handlerName: "get-ontology" },
  { handlerName: "grade-outcome-with-rubric" },
  { handlerName: "grade-semantic-intent-contract" },
  { handlerName: "impact-query" },
  { handlerName: "ontology-context-query" },
  { handlerName: "ontology-schema-get" },
  { handlerName: "pm-agent-lineage-export" },
  { handlerName: "pm-aip-source-authority-validate" },
  { handlerName: "pm-event-query-by-grade" },
  { handlerName: "pm-grader-dispatch" },
  { handlerName: "pm-handler-usage-audit" },
  { handlerName: "pm-health-audit" },
  { handlerName: "pm-intent-router" },
  { handlerName: "pm-lead-brief" },
  { handlerName: "pm-learn-query" },
  { handlerName: "pm-memory-layer-audit" },
  { handlerName: "pm-ontology-engineering-workflow" },
  { handlerName: "pm-outcome-pair-audit" },
  { handlerName: "pm-plugin-self-check" },
  { handlerName: "pm-pre-mutation-governance" },
  { handlerName: "pm-recap" },
  { handlerName: "pm-research-citation-validate" },
  { handlerName: "pm-retro-query" },
  { handlerName: "pm-rule-audit" },
  { handlerName: "pm-rule-query" },
  { handlerName: "pm-runtime-decision-parity" },
  { handlerName: "pm-semantic-consistency-gate" },
  { handlerName: "pm-semantic-intent-gate" },
  { handlerName: "pm-semantic-workbench-state" },
  { handlerName: "pm-substrate-query-post-merge" },
  { handlerName: "pm-substrate-query" },
  { handlerName: "pm-surface-contract-audit" },
  { handlerName: "pm-value-grade-metrics" },
  { handlerName: "pm-workflow-lineage-query" },
  { handlerName: "pm-workflow-response-validate" },
  { handlerName: "pm_harness_strictness_audit" },
  { handlerName: "pre-edit-impact" },
  { handlerName: "propagation-audit-backward" },
  { handlerName: "propagation-audit-forward" },
  { handlerName: "propagation-chain-health" },
  { handlerName: "replay-lineage" },
  { handlerName: "research-context-select" },
  { handlerName: "research-library-refresh" },
  { handlerName: "research_library_diff" },
  { handlerName: "rule-counts" },
  { handlerName: "run-playwright-scenario" },
  { handlerName: "semantic-drift-audit" },
  { handlerName: "session_resume" },
  { handlerName: "structured-output" },
  { handlerName: "validate-hook-citations" },
  { handlerName: "validate-hook-event-allowlist" },
  { handlerName: "validate-managed-settings-fragments" },
  { handlerName: "validate-substrate-firing" },
  { handlerName: "verify-codegen-headers" },
  { handlerName: "verify-schema-pin" },
];

// Register the McpHandler ObjectType (the type). The 64 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(MCP_HANDLER_OBJECT_TYPE);
