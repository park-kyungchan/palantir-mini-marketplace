# palantir-mini

> Cross-project Ontology-First control-plane plugin for Claude Code and Codex native runtimes.
> Current release: **v6.79.0** — FDE turn quality, structured DTC surfaces, and image-teacher-qa retirement. The control plane now documents the PR-B through PR-J closeout surface: Lead orchestration, ContextEngineeringPlanV3 advisory lanes, MCP capability metadata, DTC surface pre-mutation checks, WorkContract router bindings, agent output contracts, harness ratchet release gates, Codex runtime-gap docs, and BackPropagation ratchet proposals.
> Release inventory is checked by `pm_plugin_self_check mode=release`; do not copy volatile MCP/hook/skill/agent counts into this header.

## What this is

palantir-mini is the **Ontology-First Brain for multi-harness agent swarms** — a control plane that grounds any harness species (Claude Code CLI, Claude Agent SDK, palantir-mini-sprint-harness, Managed Agents, task-specific harnesses) in:
- Append-only `events.jsonl` lineage (rule 10)
- `~/.claude/schemas/` ontology (rule 08)
- 5-dimensional Decision Lineage (when / atopWhich / throughWhich / byWhom / withWhat)

palantir-mini is **not itself a harness species** — it dispatches to and audits any species via MCP. It turns the portable research/schema snapshots under this source root, optional development refresh inputs from `~/.claude/research/` and `~/.claude/schemas/`, and project-local `.palantir-mini/` state into an executable local control plane.

**Surface**: public MCP tools, hook commands, plugin skill docs, agents, manifests, and release evidence are discovered from the plugin source and checked by `pm_plugin_self_check`.
**Lexicon authority**: `~/.claude/rules/CONTEXT.md §15 Glossary`.

## Plugin Source Authority (SSoT)

The canonical source root is the private GitHub marketplace payload `park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/`. Runtime plugin caches are install payloads, not semantic SSoT. Runtime-neutral ownership boundaries remain described by `/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json`; runtime-native protocol adapters, hook registration, reload procedures, memory stores, trust state, and provider-specific capability facts belong in the owning runtime homes. Machine-readable authority marker: `.ssot-authority.json`. Human-readable companion: `SSOT-AUTHORITY.md`.

## Convex Cloud Deployment

The Convex backend is authorized for Cloud cutover (user directive 2026-05-13). User-provisioned Dev deployment: `effervescent-meerkat-169`. Real deploy key lives in gitignored `convex/.env.cloud` (NEVER committed). Template: `convex/.env.cloud.example`. See `docs/CONVEX_CLOUD_CUTOVER.md` for the full decision record, R1/R2/R3 invariant preservation details, and switch instructions. Per canonical plan v2 §4 row 4.1a (sprint-100 PR 4.1a; PHASE 4 ENTRY).

## Convex Cloud vs Local Authority Split

`docs/CONVEX_CLOUD_AUTHORITY.md` formalizes the data-layer authority split between Cloud (T3+/T4 mirror) and local self-hosted (fallback). `.ssot-authority.json` `dataLayer` field is the machine-readable encoding. R1 (local default) / R2 (STUB MODE) / R3 (no Agent/RAG) invariants preserved. Per canonical plan v2 §4 row 6.7 (sprint-134 PR 6.7; CANONICAL PLAN v2 COMPLETE).

## Codex Runtime Adapter

Codex loads palantir-mini hook entrypoints from `.codex-plugin/plugin.json` →
`hooks/codex-hooks.json`. That file is intentionally small: it uses only
Codex-supported events, regex-safe matchers, and adapter commands. The adapter
then reads `hooks/hooks.json` as the canonical workflow-intent registry. Runtime
fallback wiring may also exist under `~/.codex/hooks.json`, but it must remain a
thin consumer of the plugin payload.

## Native Runtime Gaps

`docs/NATIVE_RUNTIME_GAPS.md` catalogs the hook/event parity between the Claude Code CLI runtime and the Codex CLI runtime for all palantir-mini surfaces (SessionStart/Stop, PreToolUse/PostToolUse, SubagentStart/Stop, TaskCreated/TaskCompleted/TaskUpdated, TeammateIdle, UserPromptSubmit, PreCompact/PostCompact, Notification, Agent). Each surface is marked **bridged** | **partial** | **gap** | **not-applicable**, with a workaround priority map for future bridge work. Use this as the smoke-test target registry for cross-runtime parity. Per canonical plan v2 §4 row 6.3 (sprint-130 PR 6.3; PHASE 6 PR 3/7).

## Parallel-Spawn Dispatch

When shipping ≥2 dependency-independent PRs concurrently, Lead MUST:

1. Reserve a distinct version slot per PR (hardcoded in each briefing).
2. Use `isolation: "worktree"` on every parallel Agent spawn (HARD REQUIREMENT).
3. Include CHANGELOG merge protocol in each briefing (keep BOTH entries, newest-on-top).

Full protocol: `docs/PARALLEL_SPAWN_DISPATCH.md`
Rule: rule 12 v3.19.0 §Parallel-spawn dispatch
Advisory hook: `hooks/parallel-spawn-version-advisory.ts`


## Per-Runtime Reload Requirements

`docs/RELOAD_PER_RUNTIME.md` is the compatibility cheatsheet for what reload action is needed — and when — after adding or modifying a tool / skill / agent / manifest / hook / handler / lib / schema in the palantir-mini plugin. Covers: what change categories trigger a reload, how to reload in Claude Code CLI (`/reload-plugins` or fresh session), how to reload in Codex CLI (CLI restart + adapter sync), and explicit native-gap caveats. Runtime-specific install and trust state still belong to the owning runtime.

## Prompt-to-DTC Front Door

Canonical prompt/DTC proof is:

1. `prompt-front-door-capture` runs first on `UserPromptSubmit` and writes the
   prompt envelope/current pointer under
   `<project>/.palantir-mini/session/prompt-front-door/`.
2. The runtime calls `pm_semantic_intent_gate` with `promptId`, `promptHash`,
   `sessionId`, and `runtime` from that envelope.
3. `pm_intent_router` consumes approved prompt-local `SemanticIntentContract`
   and `DigitalTwinChangeContract` refs, preserving prompt hash continuity.
4. Prompt-DTC PreToolUse enforcement is controlled by
   `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off|advisory|selective-blocking|scoped-blocking|blocking`.
   The fleet default is managed by policy; promoting any runtime to full
   blocking remains intentionally deferred until sustained Claude and Codex
   smoke evidence supports it.

v5.1.0 adds a human-collaborative authoring layer on top of this proof path:
non-programmer users review plain-language cards, answer at most five
clarifying questions, and approve meaning/change-boundary summaries. Codex or
Claude then maps that approval into internal `SemanticIntentContract` and
`DigitalTwinChangeContract` fields, including typed refs and structured
`approvalRef` provenance. Approval authorizes routing/gating only; it does not
execute mutation.

## DTC (DigitalTwinChangeContract) Governance

Sprint 97 v6.78.0 introduces 4-stage DTC governance as the canonical control path for all ontology-affecting work: (1) **SIC authoring** — `pm_semantic_intent_gate` drives an 8-turn fill sequence producing an approved `SemanticIntentContract`; (2) **DTC fill** — `/palantir-mini:pm-dtc-fill` skill drives a 7-turn T0-T6 fill sequence producing an approved `DigitalTwinChangeContract` with typed tool-surface refs, ontology-context seed, and project-scope conformance evaluation; (3) **DTC grading** — `dtc-rubric/v1` 12-criterion rubric (code/model/simulator/rule domains; criteria #2/#6/#10 tier=critical Opus xhigh dispatch) produces a grade verdict ≥0.7 required for promotion; (4) **Router + enforcement** — `pm_intent_router` consumes approved SIC+DTC refs as the `"approved-inline-contracts"` routing basis; without approved refs, ontology-affecting prompts receive `{decision: "contract_required", basis: "ontology-affecting-raw-intent-fail-closed"}`. A 7-day shakedown window (2026-05-15 → 2026-05-22) is active for selective-blocking gate enforcement.

### Skill

- `/palantir-mini:pm-dtc-fill` — drives the 7-turn DTC fill workbench (T0: intent confirm → T6: finalize). Emits `dtc_fill_turn_advanced` per turn; finalizes with `digital_twin_contract_finalized`.

### Workbench template

- `workbenches/hitl-lead-feedback/templates/dtc-turn-card.md` — canonical HITL review card for each DTC fill turn. Plain-language bilingual (KO+EN) status messages. `mutationAuthorizedFromPanel` is always `false` (approval authorizes routing, not execution).

### Plan reference

- `~/.claude/plans/inherited-yawning-popcorn.md` — Sprint 97 canonical plan. §13 self-test acceptance criteria. §13.4 shakedown audit protocol. §4.1 task DAG (18 tasks W1-W5D).

### Bypass envvars (all audited)

- `PALANTIR_MINI_DTC_EVAL_REFS_BYPASS=1` — skip typed-ref validation gate in bridge-sig-gate / validator. Emits `dtc_eval_refs_bypass_invoked`.
- `PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1` — skip router fail-closed path; router uses legacy routing basis. Emits `router_fail_closed_bypass_invoked`.
- `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off|advisory|selective-blocking|blocking` — controls enforcement level of `prompt-dtc-enforcement-gate` hook. Default during shakedown: `selective-blocking`. Set `off` to fully disable.

## FDE Ontology Engineering Session

`lib/fde-ontology-engineering/` provides the durable state substrate for FDE-style ontology engineering before a `SemanticIntentContract` or `DigitalTwinChangeContract` is finalized. A session starts from `UniversalOntologyEntry`, records the current phase, user-facing summary, accepted/rejected latent hypotheses, candidate object/link/action/function/chatbot context models, unresolved questions, source refs, and bounded recent turn summaries.

Session snapshots are written under `<project>/.palantir-mini/session/fde-ontology-engineering/`. Turn records live beside the session under `turns/` and store `userMessageHash`, not raw prompt text, so 500+ turn conversations can be summarized and retrieved without replaying every raw user message into context. This layer is substrate only: it does not register a public MCP tool, hook, schema snapshot, or mutation authority.

---

### Per-turn Overlay Stability

Root and project `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `.claude/rules/*`
are stable runtime overlays, not release-note mirrors. Update them only when
read order, edit ownership, hook bridge/reload behavior, MCP/skill visibility,
or cross-runtime gaps change. Normal palantir-mini implementation and release
facts belong in this README, `CHANGELOG.md`, manifests, `hooks/hooks.json`, and
`managed-settings.d/`.

Before expanding per-turn overlays for palantir-mini drift, use the existing
control plane first: `pm-rule-audit`, `validate_managed_settings_fragments`,
`detect_doc_drift`, `validate_hook_event_allowlist`, and `pm_plugin_self_check`.
If one of those validators reports false drift because it is legacy, repair the
validator rather than copying workaround text across every overlay.

Legacy hooks such as `complex-task-detector`,
`user-prompt-overlay-advisory`, `user-prompt-ontology-intent-extract`,
`lead-model-availability-check`, `pre-delegation-check`,
`lead-direct-edit-watch`, and `lead-git-operation-watch` remain useful
downstream governance/advisory hooks. They are not prompt-front-door proof and
must not be treated as DTC approval.

## Release-checked surface

`pm_plugin_self_check mode=release` owns drift-sensitive inventory assertions. Use
that handler, not this README, for exact live counts.

- Public MCP registration and handler inventory are checked in `public-mcp` and
  release self-check modes.
- Hook registry command counts, event groups, and timeout policy are checked from
  `hooks/hooks.json`; docs that publish hook counts are test-locked.
- Plugin agents, skill docs, managed settings, eval-suite artifacts,
  adversarial verifier evidence, outcome replay evidence, and broad-test ratchet
  evidence are release axes.
- `docs/NATIVE_RUNTIME_GAPS.md` and `docs/RELOAD_PER_RUNTIME.md` own
  runtime-specific hook parity and reload caveats.

> **v3.0.0 cutover note**: `~/.claude/{agents,skills}/` user-scope directories DELETED. Plugin agents now ACTIVE at scope precedence 5 (no longer LOWEST since user-scope no longer exists per https://code.claude.com/docs/en/sub-agents). External callers using `Agent(subagent_type: "<name>")` or slash-skill invocation patterns now resolve to plugin scope automatically. Recovery: `git checkout HEAD~1 -- ~/.claude/agents ~/.claude/skills` from the v3.0.0 commit's parent restores user-scope.

### Public MCP tool families

Use the MCP registry and `pm_plugin_self_check` for exact inventory. The current
public families are:

- **Ontology + state**: `emit_event`, `get_ontology`, `ontology_schema_get`,
  `impact_query`, `pre_edit_impact`, `ontology_context_query`,
  `pm_substrate_query`
- **Edit proposal + commit gate**: `apply_edit_function`,
  `compute_edits_dry_run`, `commit_edits`
- **Sprint + grading**: `negotiate_sprint_contract`,
  `grade_semantic_intent_contract`, `grade_outcome_with_rubric`,
  `pm_grader_dispatch`
- **Lead routing + Prompt-to-DTC**: `pm_semantic_intent_gate`,
  `pm_intent_router`, `pm_lead_brief`
- **Validation + research routing**: `pm_plugin_self_check`,
  `pm_health_audit`, `pm_rule_query`, `pm_rule_audit`,
  `validate_managed_settings_fragments`, `research_context_select`,
  `research_library_refresh`

## Current layout

```text
palantir-mini/
├── .claude-plugin/              # plugin + marketplace manifests
├── .codex-plugin/               # Codex plugin manifest
├── .mcp.json                    # Codex bundled MCP config, plugin-root-relative
├── bridge/
│   ├── mcp-server.ts            # public MCP registry; exact inventory is self-check-owned
│   └── handlers/                # thin MCP wrappers
├── hooks/                       # lifecycle hook registry; exact counts come from hooks self-checks
├── lib/
│   ├── event-log/               # append/read primitives for events.jsonl
│   ├── semantic-graph/          # Wave 1-3 semantic planning/drift surface
│   ├── validation/              # validation pipeline
│   └── ...                      # shared runtime helpers
├── skills/*/SKILL.md            # plugin skill docs; exact inventory is self-check-owned
├── agents/                      # harness-planner / generator / evaluator
├── managed-settings.d/          # RBAC fragment template
├── tests/                       # plugin tests
└── CHANGELOG.md / README.md     # release + operator docs
```

## State locality

Mutable runtime state belongs in the project, not in the plugin root.

```text
<project>/.palantir-mini/
├── session/events.jsonl
├── session/snapshots/
├── harness/
├── scenarios/
└── semantic-manifest.json
```

The plugin root should hold code, manifests, templates, and tests only.

## Reading order

Open these in order when you need the current palantir-mini picture:

1. `plugins/palantir-mini/README.md`
2. `plugins/palantir-mini/SSOT-AUTHORITY.md`
3. `plugins/palantir-mini/CHANGELOG.md`
4. `plugins/palantir-mini/docs/NATIVE_RUNTIME_GAPS.md`
5. `~/.claude/schemas/ontology/2026-04-23-palantir-mini-next-direction.md`
6. `~/docs/palantir-mini-v3-control-plane-blueprint.md`

If you are changing runtime behavior, then read:

1. `bridge/mcp-server.ts`
2. `hooks/hooks.json`
3. the owning `skills/pm-*/SKILL.md`
4. the relevant handler or lib module

## Verify

```bash
cd plugins/palantir-mini
bunx tsc --noEmit
bun test

node -e 'import("./bridge/mcp-server.ts").then(({TOOLS}) => console.log(TOOLS.length))'
node -e 'const fs=require("fs");const hooks=JSON.parse(fs.readFileSync("./hooks/hooks.json","utf8"));console.log(Object.values(hooks.hooks).flatMap(v=>v.flatMap(x=>x.hooks||[])).length)'
```

For home-scope RBAC drift:

```bash
jq '.permissions.allow[]' ~/.claude/managed-settings.d/50-palantir-mini.json | rg 'mcp__palantir-mini__'
```

## Canonical companion docs

- `~/.claude/schemas/ontology/2026-04-23-palantir-mini-next-direction.md`
  - immediate post-research direction for fixing semantic planner honesty first
- `~/docs/palantir-mini-v3-control-plane-blueprint.md`
  - longer v3 engine split and PR slicing contract
- `plugins/palantir-mini/CHANGELOG.md`
  - release chronology through the current plugin surface
- `~/.claude/research/claude-code/palantir-mini-blueprint.md`
  - original v0 architecture evidence
