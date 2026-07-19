# Compatibility Matrix — Intentionally-Absent Legacy Surfaces

Source: `outputs/p210-legacy-surface-census.md` (harness-upstream workspace
`_workspace/2026-07-17-palantir-ontology-successor/`), the P210 legacy
surface census of `plugins/palantir-mini` at its pinned census SHA. That
report classified 235 censused items into 7 dispositions: `port` (185),
`merge` (2), `externalize` (8), `deprecate` (3), `remove` (2, covering 9
files), `retain-legacy-only` (28), `UNKNOWN` (7).

This manifest lists every **non-`port`** item — the legacy surfaces that
intentionally do **not** appear as ported content anywhere under
`plugins/palantir-ontology/`, family by family, with P210's disposition and
rationale (condensed; full rationale and per-item caller evidence is in the
cited P210 section). `port`-dispositioned items are not absent — they are
simply not yet built (nothing is ported at scaffold time; Wave 4-6
construct them). Count check: 6 + 15 + 4 + 10 + 4 + 9 + 2 = **50**, matching
P210's 235 - 185 = 50 non-port total.

## Family: MCP tools (P210 section 3) — 6 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `bridge/handlers/pm-intent-router.ts` (`pm_intent_router`) | externalize | Dispatch/routing to skills+workflow is Lead-orchestration/adapter concern; semantic core may not import an adapter (one-way rule, ADR-002). |
| `bridge/handlers/research-context-select.ts` (`research_context_select`) | externalize | Smallest-read-set heuristic tuned to a specific runtime's injection-budget conventions; adapter concern, not an Ontology construct. |
| `bridge/handlers/research-library-refresh.ts` (`research_library_refresh`) | externalize | Research-library corpus refresh is a Harness-Engineering concern, not the consumer-facing Ontology semantic core. |
| `bridge/handlers/pm-plugin-self-check.ts` (`pm_plugin_self_check`) | retain-legacy-only | Aggregates checks over the legacy plugin's own substrate; the successor needs its own self-check built against its own layout — pattern merges, file does not port verbatim. |
| `bridge/handlers/pm-rule-query.ts` (`pm_rule_query`) | retain-legacy-only | Looks up `~/.claude/rules/**`, a Claude-runtime-specific corpus path. |
| `bridge/handlers/pm-rule-audit.ts` (`pm_rule_audit`) | retain-legacy-only | Same `~/.claude/rules/**` binding as `pm_rule_query`. |

## Family: MCP handler support modules (P210 section 4) — 15 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `bridge/handlers/_project-event.ts` | deprecate | Zero production callers found; dead helper. |
| `bridge/handlers/pm-recap.ts` | externalize | Tied to a specific runtime's native `/recap` packaging convention. |
| `bridge/handlers/research_library_diff.ts` | externalize | Research-library corpus diff; Harness-Engineering concern. |
| `bridge/handlers/session_resume.ts` | externalize | Session-resume semantics bind to the host runtime's session lifecycle. |
| `bridge/handlers/_deprecation-map.ts` | retain-legacy-only | Tracks the legacy plugin's own MCP tool-name deprecations. |
| `bridge/handlers/complete-playwright-scenario.ts` | retain-legacy-only | Playwright browser-scenario completion is a Claude-tooling-bound QA feature. |
| `bridge/handlers/pm-handler-usage-audit.ts` | retain-legacy-only | Audits usage of the legacy plugin's own handler files. |
| `bridge/handlers/pm-semantic-workbench-state.ts` | retain-legacy-only | State for `workbenches/`, the legacy plugin's own HITL scratch area. |
| `bridge/handlers/pm-surface-contract-audit.ts` | retain-legacy-only | Audits the legacy plugin's own declared surface contracts. |
| `bridge/handlers/pm_harness_strictness_audit.ts` | retain-legacy-only | Harness-Engineering self-audit of the legacy plugin's own strictness posture. |
| `bridge/handlers/rule-counts.ts` | retain-legacy-only | Counts `~/.claude/rules/**`, a Claude-runtime-specific corpus path. |
| `bridge/handlers/run-playwright-scenario.ts` | retain-legacy-only | Same Playwright/Claude-tooling binding as `complete-playwright-scenario.ts`. |
| `bridge/handlers/validate-hook-citations.ts` | retain-legacy-only | Validates the legacy plugin's own `hooks/hooks.json`-specific citation shape. |
| `bridge/handlers/validate-hook-event-allowlist.ts` | retain-legacy-only | Validates the legacy `hooks.json` event-name allowlist shape. |
| `bridge/handlers/validate-managed-settings-fragments.ts` | retain-legacy-only | Validates `managed-settings.d/*.json`, a Claude-Code-specific RBAC fragment format. |

## Family: Hooks (P210 section 5) — 4 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `hooks/agent-ownership-validate.ts` | retain-legacy-only | Validates the legacy plugin's own declared agent file-ownership map. |
| `hooks/manifest-validate.ts` | retain-legacy-only | Validates the legacy plugin's own manifest/`hooks.json` shape. |
| `hooks/rule-audit.ts` (+ 3 sub-modules) | retain-legacy-only | Audits `~/.claude/rules/**`, a Claude-runtime-specific corpus. |
| `hooks/prompt-fde-readiness-advisory.ts` | UNKNOWN | Working code, passing tests, and a CHANGELOG entry describing it as registered, but zero matches in either `hooks.json` or `codex-hooks.json` at the census SHA — P210 could not determine intentional deregistration vs. regression vs. in-flight change from static evidence alone. Carried forward as `UNKNOWN`, not silently ported or silently dropped. |

## Family: Skills (P210 section 6) — 10 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `skills/pm-cold-start-orchestrate/` | merge | Deep-injects a Claude-specific "canonical research BROWSE+INDEX" ritual; merges into the successor's own context-injection convention rather than porting verbatim. |
| `skills/pm-ship/` | merge | Generic Git/CI logic merges with adapter-specific packaging notes (mentions a specific runtime by name). |
| `skills/pm-recap/` | externalize | Bound to a specific runtime's native `/recap` packaging (matches `pm-recap.ts` above). |
| `skills/pm-research/` | externalize | Research-library diff/refresh/audit lifecycle; Harness-Engineering concern. |
| `skills/pm-guard/` | retain-legacy-only | "Directory-scoped edits" ties to a specific runtime's own permission/scope model. |
| `skills/pm-hitl-feedback-workbench/` | retain-legacy-only | Drives `workbenches/`, the legacy plugin's own HITL scratch area. |
| `skills/pm-lsp-audit/` | retain-legacy-only | LSP-powered audit; the LSP tool integration is a specific-runtime capability. |
| `skills/pm-mcp-reload/` | retain-legacy-only | Guides "MCP server module reload"; inherently adapter/runtime-specific. |
| `skills/pm-rule-audit/` | retain-legacy-only | Audits `~/.claude/rules/**` (Claude-specific corpus); matches `hooks/rule-audit.ts`. |
| `skills/pm-self-test/` | retain-legacy-only | "End-to-end smoke test of the plugin-only substrate"; explicitly self-referential to legacy layout. |

## Family: Agents (P210 section 7) — 4 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `agents/hook-builder.md` | retain-legacy-only | "Writes or modifies TypeScript under plugins/palantir-mini"; hard-coded to the legacy plugin's own source tree. |
| `agents/plugin-maintainer.md` | retain-legacy-only | "Owns version sync across plugins/palantir-mini/.codex-plugin/..."; hard-coded to legacy packaging. |
| `agents/protocol-designer.md` | retain-legacy-only | "Writes `~/.claude/rules/*` markdown"; hard-coded to the Claude-runtime rule corpus. |
| `agents/.archived/2026-05-03-nifty-mixing-diffie/doc-writer.md` | remove | Already plugin-archived (superseded) at census time; not part of the live surface, nothing ports it forward. |

## Family: Schemas + Contracts (P210 section 8) — 9 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `schemas/project-gate-policy.schema.json` | deprecate | No in-repo caller found at census time. |
| `contracts/project-gate-policy.contract.json` | deprecate | No in-repo caller found at census time. |
| `schemas/pm-pre-mutation-governance.input.schema.json` | UNKNOWN | Names the `port`-classified `pm_pre_mutation_governance` tool but zero literal-path reference found; may be validated inline against a TS type instead. Not resolvable from in-repo evidence alone. |
| `schemas/chatbot-studio-local-core.schema.json` | UNKNOWN | Zero literal-path reference found despite a companion description doc existing. |
| `schemas/governance-decision.output.schema.json` | UNKNOWN | Zero literal-path reference found. |
| `schemas/semantic-conversation-state.schema.json` | UNKNOWN | Zero literal-path reference found. |
| `schemas/hooks/governance-hook.output.schema.json` | UNKNOWN | Same ambiguity class as the 4 above. |
| `schemas/hooks/pretooluse.input.schema.json` | UNKNOWN | Same ambiguity class. |
| `runtime-overlay/schemas-snapshot/ontology/self/{hook,mcp-handler,mcp-tool,runtime-adapter,skill,agent,monitor,plugin-manifest,managed-settings-fragment}.objecttype.ts` (9 files) | remove | Models runtime/control-plane concepts as Palantir `ObjectType`s — the exact pattern execution-plan.md's Definition of Done forbids in the successor. Content re-emerges as `ControlPlaneNodeKind` catalog entries (`src/control-plane/`, from `P450`); the registration data is re-typed, not lost, and not an Ontology `ObjectType` in the successor. |

## Family: Storage boundaries (P210 section 12) — 2 absent

| Legacy path | Disposition | Rationale (condensed) |
|---|---|---|
| `managed-settings.d/50-palantir-mini.json` | retain-legacy-only | Claude-Code-specific RBAC fragment format (`Read(...)`/`Write(...)`/`Bash(...)` glob-permission syntax); the successor needs an equivalent per-adapter fragment, not this literal file. |
| `hooks/codex-hooks.json` | retain-legacy-only | Adapter-specific registration file (Codex host), not semantic-core. |

## Families with zero non-`port` items

P210 sections 9 (Events, `events.jsonl` lifecycle), 10 (Profiles,
`McpToolSurfaceProfile` — all 5 classified `port-as-ControlPlaneNodeKind`),
and 11 (Generated surfaces, in-plugin) recorded no `merge` / `externalize` /
`deprecate` / `remove` / `retain-legacy-only` / `UNKNOWN` items — every
item in those three families is `port`, so there is nothing to list here for
them.

## Non-scope note

This manifest documents *why a legacy surface is absent*; it does not port,
paraphrase-into-code, or otherwise reproduce any legacy file's
implementation. Every row above cites P210's disposition and a condensed
version of P210's own stated rationale — no new classification judgment is
made here, and no legacy source file was opened while writing this document
beyond what P210 itself already read and cited.

## Public-Tool Compatibility v1 (M810)

Different axis from the section above. That section (P210 scaffold-absence
census) records *why a legacy surface was intentionally not ported*
(`port`/`merge`/`externalize`/`deprecate`/`remove`/`retain-legacy-only`/
`UNKNOWN`). This section answers a different question — *for someone who
calls a legacy public MCP tool today, what is its forward-compatibility
disposition against the successor* — using a five-way axis:
`retain`/`alias`/`deprecate`/`deny`/`omit`. It covers **all 24** legacy
public tools (port-dispositioned and non-port alike), not only the
non-port 50 above.

### Scope: what counts as a "public tool"

Ground truth, read at execution time from the legacy plugin's own
registration surface at worktree `claude/palantir-ontology-pm5` head
`5318b64`:

- `plugins/palantir-mini/.claude-plugin/plugin.json` registers exactly one
  MCP server (`palantir-mini`, `stdio` transport, env
  `PALANTIR_MINI_MCP_PROFILE=altitude-2`) — no separate literal tool list;
  the plugin manifest names the *server*, not individual tools.
- `plugins/palantir-mini/.codex-plugin/plugin.json` mirrors the same
  single-server registration for the Codex host.
- `plugins/palantir-mini/bridge/mcp-server.ts`'s `TOOLS: ToolSpec[]` array
  (line 82) is the actual public-tool registration surface: **24 entries**,
  1:1 with `HANDLER_MODULES`, cross-checked against generated
  `cartography/TOOLS.md` — this matches P210 §3 exactly ("24 tools
  censused").
- `bridge/handlers/**` (66 `.ts` files total) = the 24 tool handlers (§3)
  plus 42 non-tool support modules (P210 §4, title: "non-tool
  `bridge/handlers/*.ts`"). P210 §4 states explicitly these 42 are "not
  directly reachable via `TOOLS[]`" — they back *modes* of the aggregator
  tools `pm_substrate_query`, `pm_health_audit`, `pm_plugin_self_check`
  (already counted among the 24), not independent public tool names. They
  are cited here only as traceability grounding for handler-file paths
  named in the caller-evidence column below; they are not themselves rows
  in this matrix, per P210 §4's own "non-tool" framing.

**Public-tool surface = 24, exhaustive, no unclassified surface remains.**
(consumer-domain-ownership: this census enumerates only the legacy
plugin's own registration surface and in-repo callers — no
`~/projects/**` consumer content, and math-KG-excluded — `curriculum-kg`
was never opened.)

### The five-way axis (M810's operational definitions)

No prior document in this campaign defines `retain`/`alias`/`deprecate`/
`deny`/`omit` precisely; the ledger row and this prompt name the terms but
not their test. M810 adopts these operational definitions, applied
identically to all 24 rows, each backed by a concrete evidence check
against `src/adapters/**` and `src/control-plane/registry.ts` (the Wave
6/PM-4 successor-side surfaces named in this task's mission) rather than
invented judgment:

| Term | Test applied |
|---|---|
| `retain` | The legacy tool's exact name/shape is intended to keep working, unchanged, as a **legacy-plugin-only** capability forever — no successor equivalent is planned at all (1:1 with P210's own `retain-legacy-only` disposition for that same tool). Checked against `src/adapters/**` + `src/control-plane/registry.ts`: absent, confirming no successor path exists or is intended. |
| `alias` | A concretely named successor surface exists **today**, traceable in `src/adapters/**` or `src/control-plane/registry.ts`, that supplies the same capability under a different name. |
| `deprecate` | The legacy tool has zero evidenced production callers anywhere in-repo (dead), so no successor equivalent is needed. |
| `deny` | The legacy tool's disposition is `externalize` (P210 §3): the capability is architecturally excluded from the successor's semantic core by the one-way dependency rule (`execution-plan.md` §6.1, DoD #2) — Lead-orchestration/adapter routing and Harness-Engineering-library concerns may never be imported by the semantic core. This is a standing structural refusal, not a temporal gap: building an equivalent successor **tool** for this capability would itself violate the boundary. |
| `omit` | The legacy tool's disposition is `port` (P210 §3): the capability is in-scope for the successor's target architecture, but as of `5318b64` **no successor public-tool surface implements it yet** — checked and confirmed absent from both `src/adapters/**` (only 8 `queryCapability_<area>` tools per runtime: `packagingManifest`, `mcpRegistration`, `hooks`, `skillsCommands`, `subagents`, `reloadInstall`, `schemaFlatLimits`, `configSurfaces` — none is a semantic-core operation) and `src/control-plane/registry.ts` (18 `ControlPlaneNodeKind` catalog entries — 7 `tool` script/checker entries, 3 generator `tool` entries, 4 `adapter` entries, 4 `generated-binding` entries — every one of them is the successor's *own* build/generation/adapter tooling, none is a re-exposure of an Ontology semantic-core capability such as `emit_event`/`commit_edits`/`get_ontology`). Underlying library modules with related concepts may already exist (e.g. `src/governance/commit-gate.ts`, `src/governance/mint-ledger.ts`, `src/lineage/event-reader.ts`, `src/altitude1/digital-twin-change.ts`) but are not wired as a callable public tool — that gap is a future-wave construction task, out of M810's docs-only write set. |

No `UNKNOWN` bucket exists in this axis and none is used — every one of
the 24 rows below carries exactly one of the five values
(UNKNOWN-is-not-PASS: this section leaves nothing unresolved to a sixth
bucket).

### Classification table (all 24 legacy public tools)

Caller-evidence column reproduces P210 §3's own "Skill callers" grep count
(skills/**/SKILL.md + codex-skills/**/SKILL.md `allowed-tools` references)
— cited, not re-derived. Replacement-evidence column states the specific
`src/adapters/**` / `src/control-plane/registry.ts` check result per the
axis test above.

| Legacy tool (`bridge/handlers/`) | P210 §3 disposition | Skill callers | M810 disposition | Replacement / no-replacement evidence |
|---|---|---|---|---|
| `emit_event` (`emit-event.ts`) | port | 29 | **omit** | No successor tool; closest library locus `src/governance/atomic-write.ts` + `src/lineage/*` (not tool-wired). |
| `get_ontology` (`get-ontology.ts`) | port | 8 | **omit** | No successor tool; closest locus `src/lineage/event-reader.ts` (not tool-wired). |
| `ontology_schema_get` (`ontology-schema-get.ts`) | port | 3 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `impact_query` (`impact-query.ts`) | port | 6 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `pre_edit_impact` (`pre-edit-impact.ts`) | port | 1 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `pm_pre_mutation_governance` (`pm-pre-mutation-governance.ts`) | port | 1 | **omit** | mutation-authority gate; closest locus `src/governance/commit-gate.ts` + `src/governance/mint-ledger.ts` (not tool-wired). |
| `apply_edit_function` (`apply-edit-function.ts`) | port | 5 | **omit** | No successor tool; closest locus `src/altitude1/staged-construction.ts` (not tool-wired). |
| `pm_ontology_engineering_workflow` (`pm-ontology-engineering-workflow.ts`) | port | 2 | **omit** | No successor tool; closest locus `src/altitude1/{fde-session,semantic-intent,digital-twin-change}.ts` (not tool-wired). |
| `commit_edits` (`commit-edits.ts`) | port | 6 | **omit** | mutation-authority gate; closest locus `src/governance/commit-gate.ts` (not tool-wired). |
| `grade_outcome_with_rubric` (`grade-outcome-with-rubric.ts`) | port | 1 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `pm_grader_dispatch` (`pm-grader-dispatch.ts`) | port | 1 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `pm_semantic_intent_gate` (`pm-semantic-intent-gate.ts`) | port | 8 | **omit** | No successor tool; closest locus `src/altitude1/semantic-intent.ts` (not tool-wired). |
| `pm_intent_router` (`pm-intent-router.ts`) | externalize | 4 | **deny** | Lead-orchestration/adapter dispatch; one-way dependency rule (§6.1) forbids the semantic core from ever exposing this as a public tool. |
| `pm_health_audit` (`pm-health-audit.ts`) | port | 11 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `pm_substrate_query` (`pm-substrate-query.ts`) | port | 18 | **omit** | Aggregates the 42 §4 support-handler modes; no successor tool yet in `src/adapters/**`/registry. |
| `research_context_select` (`research-context-select.ts`) | externalize | 2 | **deny** | Claude injection-budget heuristic; Harness-Engineering/adapter concern, forbidden from the semantic core by the same one-way rule. |
| `events_log_rotate` (`events-log-rotate.ts`) | port | 1 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `research_library_refresh` (`research-library-refresh.ts`) | externalize | 2 | **deny** | Harness-Engineering corpus-refresh concern, not consumer-facing Ontology core; same one-way-rule exclusion. |
| `pm_plugin_self_check` (`pm-plugin-self-check.ts`) | retain-legacy-only | 5 | **retain** | Aggregates checks over the legacy plugin's own substrate; permanently legacy-scoped. Absent from `src/adapters/**`/registry (confirmed) — the successor may build its *own*, differently-shaped self-check later (P210's own rationale), but that would be a new, not-yet-built tool, never this literal one. |
| `pm_rule_query` (`pm-rule-query.ts`) | retain-legacy-only | 1 | **retain** | Looks up `~/.claude/rules/**`, a Claude-runtime-specific corpus path; absent from `src/adapters/**`/registry (confirmed), permanently legacy/Claude-scoped. |
| `pm_rule_audit` (`pm-rule-audit.ts`) | retain-legacy-only | 2 | **retain** | Same `~/.claude/rules/**` binding as `pm_rule_query`; absent from `src/adapters/**`/registry (confirmed). |
| `ontology_context_query` (`ontology-context-query.ts`) | port | 7 | **omit** | No successor tool; no `src/adapters/**`/registry match. |
| `structured_output` (`structured-output.ts`) | port | 0 | **omit** | 0 skill-frontmatter references is not zero total callers (runtime-agnostic anti-stall validator, invoked ad hoc); still no successor tool in `src/adapters/**`/registry. |
| `pm_authorize_delivery` (`pm-authorize-delivery.ts`) | port | 0 | **omit** | mutation-authority grant minter; closest locus `src/governance/mint-ledger.ts` (not tool-wired); 0 skill-frontmatter references, same caveat as above. |

### Counts (must sum to 24, the full §3 tool surface)

`retain` = 3 (`pm_plugin_self_check`, `pm_rule_query`, `pm_rule_audit`) —
1:1 with P210 §3's 3 `retain-legacy-only` tools.
`alias` = 0 — no legacy tool name has a concretely named successor
equivalent under a different name in `src/adapters/**` or
`src/control-plane/registry.ts` as of `5318b64`.
`deprecate` = 0 — P210 §3 itself recorded `deprecate=0` for the 24-tool
family (no zero-total-caller tool found); this section does not manufacture
one.
`deny` = 3 (`pm_intent_router`, `research_context_select`,
`research_library_refresh`) — 1:1 with P210 §3's 3 `externalize` tools.
`omit` = 18 — 1:1 with P210 §3's 18 `port` tools.

**3 + 0 + 0 + 3 + 18 = 24.** Matches the full §3 census total exactly; no
legacy public tool is left unclassified.

### Non-scope note (M810)

This section classifies forward-compatibility disposition only; it does
not itself port, alias, deny, or omit anything — no code changed under
`src/**`, `contracts/**`, `src/control-plane/registry.ts`, or
`src/adapters/**` to produce this table, and the legacy
`plugins/palantir-mini/**` was read, never written (zero diff, verified
before and after — see `outputs/m810-compatibility.md`). Any future wave
that builds a public-tool surface for an `omit`-classified capability, or
revisits a `deny`/`retain` call with new evidence, appends a **new**
versioned block below this one (e.g. `## Public-Tool Compatibility v2`) —
this v1 block is never silently rewritten.
