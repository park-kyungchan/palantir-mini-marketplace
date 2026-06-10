// palantir-mini — bridge/handlers/_deprecation-map.ts
// Canonical removal record for MCP tools removed across plugin majors
// (v6.0.0 PR-14a + v7.0.0 PR-E2 surface trim).
//
// This file is NOT a public MCP tool — it is consumed by:
//   - bridge/handlers/pm-handler-usage-audit.ts (pm_health_audit handler-usage mode)
//   - bridge/handlers/pm-plugin-self-check.ts   (pm_plugin_self_check release mode)
//
// Each entry documents:
//   - removed:     exact tool name (matches the TOOLS entry that was removed)
//   - replacement: recommended alternative (advisory; callers may differ)
//   - removedAtVersion: plugin semver where the tool was removed
//
// Authority: rule 08 §CHANGELOG + version bump discipline (MAJOR for breaking MCP removal).
// Plan: ~/.claude/plans/foamy-giggling-kettle.md lines 905-947 (PR-14 Deliverable B).

export interface DeprecationEntry {
  removed:           string;
  replacement:       string;
  removedAtVersion:  string;
}

export const DEPRECATION_MAP: DeprecationEntry[] = [
  // ── Former category: Ontology Engineering (propagation audit tools) ──────────
  {
    removed:          "propagation_audit_forward",
    replacement:      "pm_health_audit mode='ontology-runtime'",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "propagation_audit_backward",
    replacement:      "pm_health_audit mode='ontology-runtime'",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "propagation_chain_health",
    replacement:      "pm_health_audit mode='ontology-runtime'",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "detect_doc_drift",
    replacement:      "pm_health_audit mode='doc-drift'",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "verify_schema_pin",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "verify_codegen_headers",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "6.0.0",
  },
  // ── Former category: Harness Engineering ────────────────────────────────────
  {
    removed:          "grade_planner_output",
    replacement:      "pm_plugin_self_check (harness grading removed in Wave 2E rationalization)",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "grade_classification_accuracy",
    replacement:      "pm_plugin_self_check (harness grading removed in Wave 2E rationalization)",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "apply_refinement_target",
    replacement:      "apply_edit_function",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "run_playwright_scenario",
    replacement:      "run external Playwright + pm_substrate_query",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "complete_playwright_scenario",
    replacement:      "run external Playwright + pm_substrate_query",
    removedAtVersion: "6.0.0",
  },
  // ── Former category: Validation + Health ────────────────────────────────────
  {
    removed:          "pm_value_grade_metrics",
    replacement:      "pm_health_audit mode='events-5d'",
    removedAtVersion: "6.0.0",
  },
  // ── Former category: Hook Validation ────────────────────────────────────────
  {
    removed:          "validate_hook_citations",
    replacement:      "pm_rule_audit",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "validate_hook_event_allowlist",
    replacement:      "pm_health_audit mode='handler-usage'",
    removedAtVersion: "6.0.0",
  },
  // ── PR-E2 surface trim (7.0.0) — 4 zero-consumer audits removed (S6 + Q7) ────
  // The surface-contract / source-authority / decision-parity audits and the
  // managed-settings fragment audit are subsumed by pm_plugin_self_check, which
  // builds the surface-contract + managed-settings results inline.
  {
    removed:          "pm_surface_contract_audit",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "7.0.0",
  },
  {
    removed:          "pm_aip_source_authority_validate",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "7.0.0",
  },
  {
    removed:          "pm_runtime_decision_parity",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "7.0.0",
  },
  {
    removed:          "validate_managed_settings_fragments",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "7.0.0",
  },
  // ── PR-E2 surface trim (7.0.0) — 3 tools folded into survivors (S7) ──────────
  {
    removed:          "grade_semantic_intent_contract",
    replacement:      "pm_ontology_engineering_workflow action='approve_sic'",
    removedAtVersion: "7.0.0",
  },
  {
    removed:          "pm_workflow_response_validate",
    replacement:      "pm_plugin_self_check",
    removedAtVersion: "7.0.0",
  },
  {
    removed:          "pm_lead_brief",
    replacement:      "pm_substrate_query mode='session-opener'",
    removedAtVersion: "7.0.0",
  },
];

/**
 * Look up an entry for a removed tool name.
 * Returns undefined when the tool was not removed (i.e., it is still active).
 */
export function lookupRemoval(toolName: string): DeprecationEntry | undefined {
  return DEPRECATION_MAP.find((e) => e.removed === toolName);
}

/**
 * Format a human-readable "tool removed" advisory message for a caller
 * that is trying to invoke a removed tool.
 */
export function formatRemovalAdvisory(toolName: string): string | null {
  const entry = lookupRemoval(toolName);
  if (!entry) return null;
  return (
    `[palantir-mini v${entry.removedAtVersion}] Tool '${entry.removed}' was removed. ` +
    `Use '${entry.replacement}' instead.`
  );
}
