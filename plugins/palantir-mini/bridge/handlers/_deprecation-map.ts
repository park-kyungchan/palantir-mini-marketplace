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
  // ── Skill→tool binding hygiene (7.26.0) — consolidated query/audit tools whose
  //    skill adapter-face refs were dangling. The backing handlers survive as the
  //    consolidated tool modes; only the skill allowed-tools refs were remediated.
  //    (P1-10/P1-11; see check-skill-tool-declarations.ts.)
  {
    removed:          "replay_lineage",
    replacement:      "pm_substrate_query mode='lineage'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_learn_query",
    replacement:      "pm_substrate_query mode='learn'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_event_query_by_grade",
    replacement:      "pm_substrate_query mode='by-grade'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_workflow_lineage_query",
    replacement:      "pm_substrate_query mode='workflow'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_retro_query",
    replacement:      "pm_substrate_query mode='retro'",
    removedAtVersion: "7.26.0",
  },
  // P3-4 completeness — the remaining consolidated handlers folded into the
  // pm_substrate_query / pm_health_audit survivors (sprint-063 W4.A/W4.B, see
  // CHANGELOG "Removed (42)" table) whose migration records were not yet present.
  // pm_agent_lineage_export is the 6th lineage handler (5 siblings above);
  // the four audit-side handlers below complete the 9-audit W4.A cohort that
  // pm_memory_layer_audit / pm_outcome_pair_audit already partly covered.
  {
    removed:          "pm_agent_lineage_export",
    replacement:      "pm_substrate_query mode='agent-export'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_memory_layer_audit",
    replacement:      "pm_health_audit mode='memory-layer'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_outcome_pair_audit",
    replacement:      "pm_health_audit mode='outcome-pair'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_handler_usage_audit",
    replacement:      "pm_health_audit mode='handler-usage'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_research_citation_validate",
    replacement:      "pm_health_audit mode='research-citation'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "audit_events_5d_conformance",
    replacement:      "pm_health_audit mode='events-5d'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_harness_strictness_audit",
    replacement:      "pm_health_audit mode='strictness'",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pm_preamble",
    replacement:      "pm_substrate_query mode='session-opener'",
    removedAtVersion: "7.26.0",
  },
  // ── Skill→tool binding hygiene (7.26.0) — never-existed refs removed from skills
  //    (no handler, no live equivalent; governance enforced elsewhere).
  {
    removed:          "capability_token_check",
    replacement:      "pm_pre_mutation_governance (+ PreToolUse governance hooks)",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "get_team_health",
    replacement:      "(removed; no replacement — informational only)",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "gate_on_drift",
    replacement:      "(removed; run bun run ontology:drift directly)",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "pre_sprint_diff",
    replacement:      "pm_substrate_query mode='workflow' / external base...head diff",
    removedAtVersion: "7.26.0",
  },
  // ── Skill→tool binding hygiene (7.26.0) — routed to a PARAM of a live tool
  //    (advisory discoverability; the tool itself was never registered).
  {
    removed:          "compute_edits_dry_run",
    replacement:      "commit_edits validateOnly:true",
    removedAtVersion: "7.26.0",
  },
  {
    removed:          "research_library_diff",
    replacement:      "research_library_refresh dryRun:true",
    removedAtVersion: "7.26.0",
  },
  // ── P2-5 handler-inventory classification (task #15) — dead support tree with
  //    no standalone handler file and zero live importers. The
  //    research_library_prune/ sibling dir (archive/collect/types) implements an
  //    archive-and-prune surface that was never registered as a public tool and
  //    is unreachable from any hook/skill/handler. Recorded here as the canonical
  //    removal record; see UNREGISTERED_HANDLER_CLASSIFICATION below.
  {
    removed:          "research_library_prune",
    replacement:      "research_library_refresh (refresh subsumes staleness sweep)",
    removedAtVersion: "7.26.0",
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

// ─────────────────────────────────────────────────────────────────────────────
// P2-5 (task #15) — Unregistered-handler enumeration + classification.
//
// pm-plugin-self-check's mcp-tools-registration check (check-mcp-registration.ts)
// computes `unregisteredTopLevelHandlers` (handler files/dirs in bridge/handlers/
// with no public TOOLS / HANDLER_MODULES mapping) and tolerates a gap of <= 10
// without enumerating or classifying them (see
// pm-plugin-self-check/types.ts §mcpToolsRegistrationResult "gap <= 10").
//
// This table closes that gap: every unregistered top-level handler entry is
// enumerated and classified `internal` vs `dead`. No handler is deleted — this
// is a classification + record only.
//
//   - "internal": the entry backs a LIVE surface — imported by a registered
//     handler, a hook, a skill, a live tool param, or registered in the self-
//     ontology kinetic surface (runtime-overlay/.../self/functions.ts) for an
//     active capability. Not a public MCP tool by design.
//   - "dead": the entry is a remnant of a REMOVED public tool (its tool name is
//     in DEPRECATION_MAP above) or an orphaned support tree with zero live
//     importers. Retained on disk for lineage / self-ontology completeness;
//     governed by the deletion-readiness gate (check-deletion-readiness.ts),
//     never deleted ad hoc.
//
// `entry` is the handler-inventory name as check-mcp-registration.ts sees it
// (file basename without .ts, or sub-directory name). `kind` distinguishes a
// loose handler file from a sibling-module directory.
// ─────────────────────────────────────────────────────────────────────────────

export interface UnregisteredHandlerClassification {
  /** Handler-inventory entry name (file basename w/o .ts, or sub-dir name). */
  entry:          string;
  kind:           "file" | "dir";
  classification: "internal" | "dead";
  /** Why this classification holds (live consumer for internal; removed-tool / orphan for dead). */
  note:           string;
}

export const UNREGISTERED_HANDLER_CLASSIFICATION: UnregisteredHandlerClassification[] = [
  // ── internal: live, non-public surfaces ────────────────────────────────────
  {
    entry: "fde-ontology-turn", kind: "file", classification: "internal",
    note: "Altitude-1 9-axis FDE turn engine; dispatched by pm_ontology_engineering_workflow (registered).",
  },
  {
    entry: "pm-recap", kind: "file", classification: "internal",
    note: "session-recap view (aip-logic); live-imported by lib/runtime-overlay/memory-reflect.ts + session-start hook.",
  },
  {
    entry: "session_resume", kind: "file", classification: "internal",
    note: "SessionResume mirror (aip-logic); imported by hooks/session-start.ts + pm-lead-brief.",
  },
  {
    entry: "semantic-drift-audit", kind: "file", classification: "internal",
    note: "4-layer drift audit (edit-function in self-ontology functions.ts); verify-recover capability.",
  },
  {
    entry: "validate-substrate-firing", kind: "file", classification: "internal",
    note: "PR-time substrate-firing validator (edit-function in self-ontology functions.ts).",
  },
  {
    entry: "pm-substrate-query-post-merge", kind: "file", classification: "internal",
    note: "post-merge substrate sub-handler; lazy-imported by pm-substrate-query (registered).",
  },
  {
    entry: "rule-counts", kind: "file", classification: "internal",
    note: "ruleRegistryCounts helper; imported by pm-rule-audit + pm-rule-query/actions/list.",
  },
  {
    entry: "pm-semantic-consistency-gate", kind: "file", classification: "internal",
    note: "managed-decision surface (registry status keep); tracked by check-deletion-readiness MANAGED_DECISION_OWNER_PATHS.",
  },
  {
    entry: "pm-semantic-workbench-state", kind: "file", classification: "internal",
    note: "managed-decision surface (registry status keep); tracked by check-deletion-readiness MANAGED_DECISION_OWNER_PATHS.",
  },
  {
    entry: "internal", kind: "dir", classification: "internal",
    note: "support dir (ontology-context-approval-create); consumed by lib/ontology-context/approval.ts.",
  },
  {
    entry: "research_library_refresh", kind: "dir", classification: "internal",
    note: "sibling-module dir (iterate-docs/staleness/types) backing the LIVE research_library_refresh tool (research-library-refresh.ts).",
  },
  {
    entry: "pm-plugin-self-check", kind: "dir", classification: "internal",
    note: "sibling-module dir backing the registered pm_plugin_self_check tool.",
  },

  // ── dead: removed-tool remnants (tool name in DEPRECATION_MAP) ──────────────
  { entry: "audit-events-5d-conformance",        kind: "file", classification: "dead", note: "removed tool audit_events_5d_conformance (7.26.0)." },
  { entry: "complete-playwright-scenario",       kind: "file", classification: "dead", note: "removed tool complete_playwright_scenario (6.0.0)." },
  { entry: "complete-playwright-scenario",       kind: "dir",  classification: "dead", note: "support dir for removed complete_playwright_scenario (6.0.0)." },
  { entry: "detect-doc-drift",                   kind: "file", classification: "dead", note: "removed tool detect_doc_drift (6.0.0)." },
  { entry: "detect-doc-drift",                   kind: "dir",  classification: "dead", note: "support dir for removed detect_doc_drift (6.0.0)." },
  { entry: "grade-semantic-intent-contract",     kind: "file", classification: "dead", note: "removed tool grade_semantic_intent_contract (7.0.0)." },
  { entry: "pm_harness_strictness_audit",        kind: "file", classification: "dead", note: "removed tool pm_harness_strictness_audit (7.26.0)." },
  { entry: "pm-agent-lineage-export",            kind: "file", classification: "dead", note: "removed tool pm_agent_lineage_export (7.26.0)." },
  { entry: "pm-aip-source-authority-validate",   kind: "file", classification: "dead", note: "removed tool pm_aip_source_authority_validate (7.0.0)." },
  { entry: "pm-event-query-by-grade",            kind: "file", classification: "dead", note: "removed tool pm_event_query_by_grade (7.26.0)." },
  { entry: "pm-handler-usage-audit",             kind: "file", classification: "dead", note: "removed tool pm_handler_usage_audit (7.26.0)." },
  { entry: "pm-lead-brief",                      kind: "file", classification: "dead", note: "removed tool pm_lead_brief (7.0.0)." },
  { entry: "pm-learn-query",                     kind: "file", classification: "dead", note: "removed tool pm_learn_query (7.26.0)." },
  { entry: "pm-memory-layer-audit",              kind: "file", classification: "dead", note: "removed tool pm_memory_layer_audit (7.26.0)." },
  { entry: "pm-outcome-pair-audit",              kind: "file", classification: "dead", note: "removed tool pm_outcome_pair_audit (7.26.0)." },
  { entry: "pm-preamble",                        kind: "dir",  classification: "dead", note: "support dir for removed pm_preamble (7.26.0); no standalone handler file." },
  { entry: "pm-research-citation-validate",      kind: "file", classification: "dead", note: "removed tool pm_research_citation_validate (7.26.0)." },
  { entry: "pm-retro-query",                     kind: "file", classification: "dead", note: "removed tool pm_retro_query (7.26.0)." },
  { entry: "pm-runtime-decision-parity",         kind: "file", classification: "dead", note: "removed tool pm_runtime_decision_parity (7.0.0)." },
  { entry: "pm-surface-contract-audit",          kind: "file", classification: "dead", note: "removed tool pm_surface_contract_audit (7.0.0)." },
  { entry: "pm-value-grade-metrics",             kind: "file", classification: "dead", note: "removed tool pm_value_grade_metrics (6.0.0)." },
  { entry: "pm-workflow-lineage-query",          kind: "file", classification: "dead", note: "removed tool pm_workflow_lineage_query (7.26.0)." },
  { entry: "pm-workflow-response-validate",      kind: "file", classification: "dead", note: "removed tool pm_workflow_response_validate (7.0.0)." },
  { entry: "propagation-audit-backward",         kind: "file", classification: "dead", note: "removed tool propagation_audit_backward (6.0.0)." },
  { entry: "propagation-audit-forward",          kind: "file", classification: "dead", note: "removed tool propagation_audit_forward (6.0.0)." },
  { entry: "propagation-chain-health",           kind: "file", classification: "dead", note: "removed tool propagation_chain_health (6.0.0)." },
  { entry: "replay-lineage",                     kind: "file", classification: "dead", note: "removed tool replay_lineage (7.26.0)." },
  { entry: "research_library_diff",              kind: "file", classification: "dead", note: "removed tool research_library_diff (7.26.0)." },
  { entry: "research_library_diff",              kind: "dir",  classification: "dead", note: "support dir for removed research_library_diff (7.26.0)." },
  { entry: "research_library_prune",             kind: "dir",  classification: "dead", note: "orphaned support tree; removed tool research_library_prune (7.26.0); no standalone handler, zero live importers." },
  { entry: "run-playwright-scenario",            kind: "file", classification: "dead", note: "removed tool run_playwright_scenario (6.0.0)." },
  { entry: "get-team-health",                    kind: "dir",  classification: "dead", note: "support dir for removed get_team_health (7.26.0); no standalone handler file." },
  { entry: "validate-hook-citations",            kind: "file", classification: "dead", note: "removed tool validate_hook_citations (6.0.0)." },
  { entry: "validate-hook-event-allowlist",      kind: "file", classification: "dead", note: "removed tool validate_hook_event_allowlist (6.0.0)." },
  { entry: "validate-managed-settings-fragments", kind: "file", classification: "dead", note: "removed tool validate_managed_settings_fragments (7.0.0)." },
  { entry: "verify-codegen-headers",             kind: "file", classification: "dead", note: "removed tool verify_codegen_headers (6.0.0)." },
  { entry: "verify-schema-pin",                  kind: "file", classification: "dead", note: "removed tool verify_schema_pin (6.0.0)." },
];

/** Classify an unregistered handler-inventory entry; undefined when the entry is registered or unknown. */
export function classifyUnregisteredHandler(
  entry: string,
): UnregisteredHandlerClassification | undefined {
  return UNREGISTERED_HANDLER_CLASSIFICATION.find((row) => row.entry === entry);
}
