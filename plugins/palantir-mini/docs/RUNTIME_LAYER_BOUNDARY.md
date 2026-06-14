# Runtime Layer Boundary

palantir-mini is runtime-NEUTRAL: it holds ONE governed meaning (its ontology +
contracts), and each LLM runtime is a swappable adapter that consumes that one
meaning through a generated, permission-scoped, per-runtime binding — the
semantics are identical across adapters; an adapter changes only the binding /
packaging / runtime-API face, never the meaning. In this checkout Codex and
Claude are both active adapters: Codex installs from the marketplace into
`~/.codex/plugins/cache`, and Claude installs the same source via a
directory-source marketplace into `~/.claude/plugins/cache` (harness-upstream
CLAUDE.md Q2). Gemini packaging/install surface is contract-only (`runtime_gap`
/ not installed) and can be added later through its own marketplace path.

The machine-readable source for this boundary is
`contracts/layer-boundary.contract.json`, validated by
`schemas/layer-boundary.schema.json` and
`scripts/verify-layer-boundary.ts`.

## Source Of Truth

- Runtime-neutral local source checkout: `/home/palantirkc/palantir-mini-marketplace`
- Upstream source: `https://github.com/park-kyungchan/palantir-mini-marketplace`
- Plugin source root: `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini/`
- Active local install targets: Codex marketplace AND Claude directory-source marketplace (Gemini contract-only / not installed)
- Release path: branch -> PR -> merge to `main` -> marketplace refresh/install on each active adapter (Codex marketplace; Claude directory-source marketplace)

Any implementation plan for palantir-mini self-improvement must name the source
repo, branch, remote, plugin source root, and each active adapter install/cache
path (Codex `~/.codex/plugins/cache` and Claude `~/.claude/plugins/cache`) before
editing.

## LayerBoundaryV1 Roles

`LayerBoundaryV1` separates six roles:

| Role | Authority | Protected mutation authority |
|---|---|---|
| `llm-provider` | metadata-only | none |
| `runtime-adapter` | runtime-owned | none |
| `plugin-source` | source-of-truth | deterministic source authority |
| `project-state` | state evidence | append-only evidence, not approval |
| `runtime-cache` | installed payload | install refresh only |
| `marketplace-root` | repository root | deterministic release authority |

Protected mutation is denied by default unless deterministic evidence is
complete. Free text, advisory review cards, provider identity, runtime cache
presence, and prompt-front-door ref strings without approved bodies are
non-authorizing inputs.

## Native Runtime Consumer

| Runtime | Native install surface | Runtime-owned state | Cache/install payload rule |
|---|---|---|---|
| Codex | local dev: `codex plugin marketplace add /home/palantirkc/palantir-mini-marketplace`; post-merge: `codex plugin marketplace add park-kyungchan/palantir-mini-marketplace --ref main`; then `codex plugin add palantir-mini@palantir-mini-marketplace` | `~/.codex/config.toml`, Codex hooks, MCP exposure, memories, `/plugins`, `/hooks`, `/mcp`, restart/reload state | `~/.codex/plugins/cache/**` is an installed payload; do not edit as semantic authority |
| Claude | local dev: directory-source marketplace registered in `~/.claude/plugins/known_marketplaces.json` (`source: directory` -> `/home/palantirkc/palantir-mini-marketplace`) -> `palantir-mini@palantir-mini-marketplace` installed under `~/.claude/plugins/cache/palantir-mini-marketplace/palantir-mini/<version>/`; reload via `/plugin update` + `/reload-plugins` (monitors need a full restart) | `~/.claude` settings enable toggle, Claude hooks, MCP exposure, skills, `/plugins`, `/mcp`, `/hooks`, reload state | `~/.claude/plugins/cache/**` is an installed payload; do not edit as semantic authority |

Gemini runtime install/package paths are intentionally absent from the
current local checkout. Do not keep source-looking Git working copies under
runtime homes such as `~/.claude/plugins/marketplaces/palantir-mini-marketplace`
or `~/.codex/.tmp/marketplaces/palantir-mini-marketplace`. Treat the runtime
home prefix as installation locality, not semantic ownership.

### Directory-source marketplace = copied to a versioned cache

A `source: directory` marketplace is **copied** into a versioned cache, not executed
in place. The runtime stages distinct per-version copies under
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`, and the RUNNING plugin
executes that **cache copy** — in-place execution applies only to `--plugin-dir` /
`@skills-dir` dev plugins. To answer "what version runs NOW?" in one read, consult the
running-version oracle, which is authoritative even with pm OFF:
`~/.claude/plugins/installed_plugins.json` -> the `palantir-mini@palantir-mini-marketplace`
entry (`installPath` / `version` / `gitCommitSha`); in-band (pm ON, v7.13.0+),
`pm_plugin_self_check` returns `runtimeIdentity.version` from the running copy's own
`package.json`. The **source** (`.claude-plugin/plugin.json` version + `git rev-parse HEAD`)
may be **ahead** of the cached copy after an un-synced edit, so reading source
**over-reports** the running version — trust the oracle for what executes, and compare
to source only to **detect drift**. If installed `gitCommitSha` != source HEAD, the edit
is not live: re-sync (`/plugin marketplace update` + `/plugin update` with a bumped
version) then `/reload-plugins`; only monitors need a full restart. harness-upstream
installs pm into Claude via exactly this directory marketplace (CLAUDE.md Q2), so
Claude install/package surfaces are ACTIVE — consistent with the Claude row in the
Native Runtime Consumer table above. Claude is the swappable adapter's generated
binding/packaging face over the one governed pm meaning; the semantics it consumes
are identical to Codex's.

## PR5 Runtime Adapter Contracts

PR5 separates runtime-neutral core contracts from per-runtime adapter contracts.
The per-runtime source contract slots are
`runtime-adapters/claude/contract.json`,
`runtime-adapters/codex/contract.json`, and
`runtime-adapters/gemini/contract.json`, with shared shape in
`core/contracts/runtime-adapter-contract.ts`. Treat those paths as plugin-source
contracts only. They describe how a native runtime may consume the
runtime-neutral core; they do not authorize protected mutation and do not make
an unsupported runtime active.

| Adapter contract slot | Current support claim | Required evidence before active-runtime claim |
|---|---|---|
| `runtime-adapters/codex/contract.json` | Codex is an active package/install target (adapter-native) in this checkout. | Source-complete branch, Codex reinstall/reload/restart, and Codex smoke evidence such as `contracts/runtime-evidence/codex.json` plus targeted tests. |
| `runtime-adapters/claude/contract.json` | Active adapter (directory-source marketplace install; `~/.claude/plugins/cache`). Provider-native hook/tool/approval/subagent APIs differ from Codex; the governed pm meaning consumed is identical. | Native Claude package/install surface plus smoke evidence checked into source authority. |
| `runtime-adapters/gemini/contract.json` | Contract-only `runtime_gap` / unsupported surface. | Native Gemini package/install surface plus smoke evidence checked into source authority. |

Provider identity remains metadata. A per-runtime adapter contract can document
protocol shape, reload requirements, and unsupported gaps, but it cannot approve
SemanticIntentContracts, DigitalTwinChangeContracts, WorkContracts, release
gates, or ontology mutations.

## Availability vs Activation

Codex may have the palantir-mini plugin installed and enabled while a given turn
is still outside palantir-mini scope. Runtime availability, plugin identity, and
hook visibility are metadata. palantir-mini semantic authority activates only
from explicit palantir-mini scope, palantir-mini source work, protected work in a
tracked palantir-mini project, or a palantir-mini MCP tool invocation. Explicit
user opt-out, meta-harness work, repo-local `AGENTS.md` opt-in-only policy, and
ordinary non-palantir turns must not be promoted into palantir-mini workflow
authority by the adapter.

The source adapter can silently bypass side effects after Codex starts a loaded
hook command. A true no-call state belongs to Codex-owned configuration before
startup, such as a profile or plugin-hook/plugin disable setting, and must be
verified in the active runtime surface after restart.
When a mounted Codex event does not carry the original user prompt, the adapter
can only use prompt-only opt-out text as durable evidence if a prior
`UserPromptSubmit` capture has persisted prompt-front-door state for that
session. Use Codex no-call config or repo-local opt-in-only policy when no such
state exists.

## Required Mental Model

```text
LLM/provider metadata
  -> runtime adapter contract (Codex + Claude active; Gemini unsupported gap)
  -> installed palantir-mini payload
  -> deterministic palantir-mini contracts, handlers, validation, lineage
```

Provider identity may affect available hooks, tool names, approval UX, reload
requirements, and subagent APIs. It must not affect the meaning of a
SemanticIntentContract, DigitalTwinChangeContract, WorkContract, resolver output,
release gate, or ontology primitive.

## Self-Improvement Checklist

Before editing palantir-mini itself, write down:

1. Runtime-neutral local source checkout, GitHub source remote, branch, and plugin root.
2. Codex marketplace registration and cache paths that must not be edited.
3. Inactive runtime surfaces that must stay absent in this checkout: Gemini extension packaging. (Claude plugin packaging is ACTIVE via the directory-source marketplace.)
4. Runtime gaps / adapter-face differences: which hooks, MCP tools, skills, subagents, or reload steps differ natively per adapter (Codex vs Claude), and which surfaces remain absent under Gemini.
5. Deterministic plugin-layer invariant: which behavior must remain identical regardless of LLM provider.

If a plan does not separate those items, stop and fix the plan before
implementation.

## Verification

Run the layer-boundary verifier before release:

```bash
bun run scripts/verify-layer-boundary.ts
```

The verifier emits JSON with `valid`, `issues`, `contractPath`, `schemaPath`, and
`checkedRoles`. Blocking reason codes are stable `LAYER_BOUNDARY_*` values and
deny protected mutation when contract, schema, provider, runtime cache, advisory
input, or deterministic evidence checks fail.

## Consumer-project Ontology vs pm runtime (separation)

pm is a RUNTIME layer, **perfectly separated** from each consumer project's Ontology. A consumer project (e.g. harness-upstream) builds and owns its OWN Ontology — its domain ObjectTypes, LOGIC Functions, ActionTypes, etc. pm **executes** that Ontology and is the **channel** through which the project operates Ontology-First, but pm's own machinery — the SIC/DTC contract engine, the BackwardProp replay engine, the ontology-construction-lint engine, the OE workflow — is **NOT part of any consumer project's Ontology**. Consumer Ontologies model their domain and **bind to pm as an external runtime**; they never absorb pm's internal primitives. (Mirror of harness-upstream ssot/ontology-first-program.md, section "Separation".)

## Continuous meta-level BackwardProp (memory fold — project declares, pm executes)

A consumer project's Ontology may declare a continuous, always-on BackwardProp loop that folds its multi-source memory substrate (the pm session lanes — events.jsonl, outcome-pairs, context-capsules, ontology-entry, prompt-front-door — plus the project's own typed memory files and retros) into its next-turn prior, its own self-MetaOptimization, and its next OntologyEngineering session. Per the separation boundary, the project **declares** this fold as its own LOGIC (for example a foldLineage Function and a MEMORY-PRIOR axis); pm is the **external runtime that executes** it — the replay engine, retro, and memory-map are pm machinery and are NOT part of the consumer Ontology. The project owns the meaning of the fold; pm owns the execution. (Mirror of harness-upstream ssot/ontology-first-program.md — section: Continuous meta-level BackwardProp.)
