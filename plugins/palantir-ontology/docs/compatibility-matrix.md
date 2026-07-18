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
