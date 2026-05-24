// palantir-mini v6.0.0 — bridge/handlers/_deprecation-map.ts
// Canonical removal record for MCP tools removed in v6.0.0 (PR-14a).
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
    replacement:      "pm_health_audit mode='schema-pin'",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "verify_codegen_headers",
    replacement:      "pm_health_audit mode='codegen-headers'",
    removedAtVersion: "6.0.0",
  },
  // ── Former category: Harness Engineering ────────────────────────────────────
  {
    removed:          "grade_planner_output",
    replacement:      "grade_outcome_with_rubric",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "grade_classification_accuracy",
    replacement:      "grade_outcome_with_rubric",
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
    replacement:      "pm_health_audit mode='value-grade'",
    removedAtVersion: "6.0.0",
  },
  // ── Former category: Hook Validation ────────────────────────────────────────
  {
    removed:          "validate_hook_citations",
    replacement:      "pm_health_audit mode='hook-citations'",
    removedAtVersion: "6.0.0",
  },
  {
    removed:          "validate_hook_event_allowlist",
    replacement:      "pm_health_audit mode='hook-event-allowlist'",
    removedAtVersion: "6.0.0",
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
