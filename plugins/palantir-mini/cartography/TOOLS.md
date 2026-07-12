<!-- GENERATED FILE — do not edit. Regenerate: bun run gen:cartography (source: bridge/mcp-server.ts, lib/capability-registry/mcp-tool-capability.ts) -->


# TOOLS — generated MCP tool surface map

All 24 MCP tools declared in `bridge/mcp-server.ts` TOOLS[], with per-profile visibility from `lib/capability-registry/mcp-tool-capability.ts` and the owning handler module from `HANDLER_MODULES`. See `CARTOGRAPHY.md` routing table ("Add/modify an MCP handler") and `cartography/DATAFLOW.md` ("Write paths") for context.

| Tool | studio-core | dev-full | protected-actions | internal-telemetry | altitude-2 | Handler module | Description |
|---|---|---|---|---|---|---|---|
| apply_edit_function |  | ✓ | ✓ |  |  | `./handlers/apply-edit-function` | Execute a Tier-2 edit function and return OntologyEdit[] WITHOUT committing. Mirrors Palantir authoring helpe… |
| commit_edits |  | ✓ | ✓ |  |  | `./handlers/commit-edits` | Atomic commit of a set of OntologyEdit[] wrapped by an ActionTypeRid. Pre-flight submission criteria gate (9… |
| emit_event |  | ✓ |  | ✓ |  | `./handlers/emit-event` | Atomically append an EventEnvelope to the project's events.jsonl. Uses fs.mkdir mutex lock (proven 0-lost / 2… |
| events_log_rotate |  | ✓ |  | ✓ |  | `./handlers/events-log-rotate` | Rotate a project's events.jsonl when it crosses size or line-count thresholds. Archives the breached log with… |
| get_ontology |  | ✓ |  |  | ✓ | `./handlers/get-ontology` | Read the derived ontology snapshot for a project at an optional sequence cut-point. Returns folded state from… |
| grade_outcome_with_rubric |  | ✓ |  |  |  | `./handlers/grade-outcome-with-rubric` | W3e-1 — runtime-neutral rubric outcome grader. Scores an artifact against a GradingRubric (AIP Evals taxonomy… |
| impact_query |  | ✓ |  |  | ✓ | `./handlers/impact-query` | Context Engineering core: ForwardProp/BackwardProp impact graph query for a RID. Returns single-hop + transit… |
| ontology_context_query | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/ontology-context-query` | Phase 3 read-path orchestrator (sprint-093 PR 3.1). Unifies impact + capability + lineage projections into a… |
| ontology_schema_get | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/ontology-schema-get` | Retrieve the canonical schema snapshot for a primitive RID. Looks up palantir-mini runtime-overlay/schemas-sn… |
| pm_authorize_delivery | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/pm-authorize-delivery` | pm authorization-flexibility slice 3 (G-DSN-E) — mint a SESSION-STANDING delivery-authorization grant from a… |
| pm_grader_dispatch |  | ✓ |  |  |  | `./handlers/pm-grader-dispatch` | W3e-1 — runtime-neutral model-grader dispatch. Dispatches ONE model-domain criterion to a FRESH grader subpro… |
| pm_health_audit |  | ✓ |  |  |  | `./handlers/pm-health-audit` | Sprint-063 W4.A — mode-dispatched health audit merger for handler usage, harness base, harness components, ha… |
| pm_intent_router | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/pm-intent-router` | Sprint-063 W3.A — full intent-router. Subsumes delegate_or_direct + dispatch_route_decide + dispatch_to_runti… |
| pm_ontology_engineering_workflow | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/pm-ontology-engineering-workflow` | Public Ontology Engineering workflow state machine. Owns start -> turn -> draft_sic -> status around the inte… |
| pm_plugin_self_check |  | ✓ |  |  | ✓ | `./handlers/pm-plugin-self-check` | Aggregate substrate health check: schema pin + codegen headers + rule audit + plugin-declared agents/skills o… |
| pm_pre_mutation_governance | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/pm-pre-mutation-governance` | Compute-only pre-mutation governance gate for protected mutation authorization. Returns a deterministic Gover… |
| pm_rule_audit |  | ✓ |  |  |  | `./handlers/pm-rule-audit` | Comprehensive health check. Detects T1/T2 bottleneck violations + stale crossRefs + stale hook citations + fi… |
| pm_rule_query |  | ✓ |  |  | ✓ | `./handlers/pm-rule-query` | Consolidated rule lookup. Preflight: provide exactly one discriminator from { byId, bySlug, byQuery }, or omi… |
| pm_semantic_intent_gate | ✓ | ✓ | ✓ | ✓ | ✓ | `./handlers/pm-semantic-intent-gate` | Lead Intent -> Digital Twin contract gate. FDE sessions surface user meaning turn-by-turn; this gate records… |
| pm_substrate_query |  | ✓ |  |  | ✓ | `./handlers/pm-substrate-query` | Sprint-063 W4.B — consolidated substrate query for lineage, workflow, by-grade, retro, learn, agent-export, p… |
| pre_edit_impact |  | ✓ |  |  |  | `./handlers/pre-edit-impact` | PreToolUse substrate: resolve proposed files → impact classification. Returns affects[], tests[], docs[], ris… |
| research_context_select |  | ✓ |  |  |  | `./handlers/research-context-select` | Return the smallest ordered research/schema read set for a Palantir-heavy task. Prefers ~/.claude/research/pa… |
| research_library_refresh |  | ✓ | ✓ |  |  | `./handlers/research-library-refresh` | Dry-run or refresh manifest-backed research libraries. Supports current docs[] manifests, legacy entries[] ma… |
| structured_output |  | ✓ |  |  |  | `./handlers/structured-output` | Structural anti-stall (rule 05 / O-1): validate a model-produced candidate against a small bounded JSON Schem… |

_Tool count: 24._
