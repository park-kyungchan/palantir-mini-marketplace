# Plugin Workflow Authority — SSoT Marker

The canonical palantir-mini source root on this machine is `~/palantir-mini-marketplace/plugins/palantir-mini/`. Its upstream provenance is the private GitHub marketplace payload `park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/`. The local source root owns workflow semantics, MCP handler source, hook intent, skills, agents, tests, and installable plugin manifests.

Runtime plugin caches are install targets. They must not become semantic forks. Runtime-neutral ownership is described by `~/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json`. Current local install support covers Codex and Claude (both active adapters; Gemini contract-only). Each adapter's runtime-native protocol adapters, hook registration, reload procedures, memory stores, trust state, and provider-specific capability facts belong under its own runtime home (`~/.codex/**` for Codex, `~/.claude/**` for Claude).

## Machine-Readable Marker

`.ssot-authority.json` (sibling file) is the machine-readable authority marker. During this relocation slice it may still contain compatibility-path fields; release validation must treat those fields as migration debt until the source-authority marker is updated in its own approved slice. It encodes:

- `authority`: the canonical runtime-neutral local source path.
- `upstreamAuthority`: the private GitHub marketplace remote provenance.
- `consumerRuntimes`: how each runtime consumes this source.
- `forbiddenForks`: explicit rules against creating per-runtime source forks.
- `lastVerifiedSha`: git SHA at the time of last authority verification.

## Consumer Runtime Map

| Runtime | Consumption method |
|---------|-------------------|
| `codex-cli` | Codex plugin marketplace reads `palantir-mini@palantir-mini-marketplace` from the private GitHub marketplace; Codex protocol ownership stays under `~/.codex/**`. |
| `claude-code` | Claude reads `palantir-mini@palantir-mini-marketplace` from the directory-source marketplace (`~/.claude/plugins/cache`); Claude protocol ownership stays under `~/.claude/**`. |

## Invariant

> Each active runtime (Codex, Claude) consumes palantir-mini workflow semantics from the marketplace payload; no runtime-home semantic source forks should be created. Runtime-native wrappers are authority for provider protocol details, but not for durable palantir-mini workflow semantics.

## What Is and Is Not an Authority

| Artifact | Authority? | Notes |
|----------|-----------|-------|
| `~/palantir-mini-marketplace/plugins/palantir-mini/` | YES — canonical local source root | Owns workflow semantics, MCP handler source, hook intent, source skills/agents, tests, and runtime manifests. |
| `park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/` | YES — upstream provenance | Remote source used after PR merge and runtime marketplace refresh; not a runtime-home cache. |
| `~/.palantir-mini/core/` | YES — runtime-neutral boundary | Owns runtime-neutral workflow/control-plane boundary contracts and sentinel policy; it is not the full plugin root. |
| `~/.codex/plugins/cache/**` | NO — runtime install payload | May load the plugin for Codex, but must not carry independent workflow semantics. |
| `plugins/palantir-mini/bridge/mcp-server.ts` | YES — bridge surface | The MCP server implementation that runtime wrappers should launch. |
| `~/.codex/` | YES — Codex-native runtime overlay | Owns Codex hooks, memory, config, reload docs, and protocol adapter entrypoints. Must NOT contain a fork of workflow semantics. |
| `managed-settings.d/*.json` (per project) | NO — RBAC fragment | Grants/denies MCP tool access per project; not source authority. |
| Runtime overlay (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) | NO — behavioral overlay | Describes how runtimes operate; not the plugin implementation. |

## Data-layer Authority

The plugin **source** SSoT (above) governs code, hooks, handlers, and manifests. The plugin **data substrate** (Convex) has its own authority split documented separately:

- **Cloud primary (T3+/T4 mirror)**: Convex Cloud Dev deployment `effervescent-meerkat-169` — authoritative for T3+ valuable events (rule 26), T4 promotion candidates, and eval suites/runs.
- **Local fallback**: self-hosted Convex at `anonymous:anonymous-palantir-mini@127.0.0.1:3210` — used for offline development, R2 STUB MODE, and pre-cutover testing.
- **Machine-readable**: `.ssot-authority.json` `dataLayer` field encodes this split.
- **Full decision record**: `docs/CONVEX_CLOUD_AUTHORITY.md` — includes R1/R2/R3 invariant status, switch instructions, and cross-refs.

Per canonical plan v2 §4 row 6.7 (sprint-134 PR 6.7; PHASE 6 FINAL PR).

**SecondBrain fold data substrate** (fs-based, separate from the Convex split
above):

- `<project>/second-brain/manifest.json`'s `foldedSessions` map is the SOLE
  fold-lifecycle authority (`"pending"` -> `"in-progress"` ->
  `"governed-complete"`), written under one two-writer manifest lock.
- `<project>/second-brain/manifest-archive.jsonl` is the append-only archive
  for compacted markers; retention always archives-then-removes, never a
  silent delete.
- `<project>/second-brain/graph.json` CONTENT is engine-side / consumer-project
  owned — NOT governed by this repo. This repo's contract expectation is
  limited to the manifest lifecycle markers and the schema-governed NDJSON
  fold interchange; it does not manage `graph.json`'s own lifecycle.
- `events.jsonl` remains the lineage spine: governed fold verdicts land there
  same as any other governed emit.
- Full sequence: `cartography/DATAFLOW.md` section "SecondBrain fold sequence
  (W3 — single manifest authority)".

## Research Snapshot Authority

The plugin carries a portable research snapshot for plugin-only operation:

- `runtime-overlay/research-library/research-root/BROWSE.md` and
  `runtime-overlay/research-library/research-root/INDEX.md` are vendored from
  `~/.claude/research/{BROWSE,INDEX}.md`.
- `runtime-overlay/research-library/palantir-official/` is vendored from
  `~/.claude/research/palantir-official/`.
- `lib/runtime-overlay/research-core-select.ts` resolves plugin snapshots by
  default. External `~/.claude/research/<topic>` is a development refresh or
  missing-snapshot fallback, not a required runtime dependency.

Authority split:

| Layer | Role |
|---|---|
| External `~/.claude/research/**` | Refresh/provenance source when available |
| Plugin `runtime-overlay/research-library/**` | Portable runtime source carried with the plugin |
| Official Palantir URLs | Upstream factual source; verify before currentness claims |

## Design Authority (external grounding)

This document and `.ssot-authority.json` are the **SOURCE/WORKFLOW-authority** for pm — they say what *is* pm (the canonical plugin code). They are distinct from the **DESIGN-authority** that explains *why* pm's Ontology machinery is shaped the way it is.

- The DESIGN-authority is `harness-upstream/ssot/palantir/` — the runtime-neutral rationale behind the 9-axis FDE session, SIC→DTC, OSDK runtime-binding, and lineage. SCAN it (README→BROWSE→INDEX→slice) and selectively inject before Ontology construction or Ontology-First operation.
- It is **NOT** the source/workflow authority (that is this doc → the canonical plugin path) and **NOT** the portable research-snapshot (the vendored `runtime-overlay/research-library/**` facts described above). It is also not a runtime dependency.
- Machine-readable cross-reference: the `designAuthority` field in the sibling `.ssot-authority.json` encodes this same path, role, scope, and router (`harness-upstream/ssot/README.md`).

## Cross-References

- `CONTEXT.md §13.5` — Cross-runtime coexistence map (Codex/Gemini).
- `rule 07` (plugins-and-mcp) — Plugin manifest authority + MCP server registration.
- `rule 27` (cross-runtime-substrate) — Cross-runtime `events.jsonl` append protocol.
- `~/.claude/rules/CORE.md` — Active rule invariants.

## Version History

- v1.9.0 (2026-07-02): Added a "SecondBrain fold data substrate" subsection under "Data-layer Authority" naming `<project>/second-brain/manifest.json` `foldedSessions` as the sole fold-lifecycle authority, `manifest-archive.jsonl` as the append-only compaction archive, and `graph.json` content as engine-side/consumer-project-owned (not governed by this repo); `events.jsonl` remains the lineage spine. Cross-references `cartography/DATAFLOW.md`'s SecondBrain fold sequence section.
- v1.8.0 (2026-06-15): Added a "Design Authority (external grounding)" section naming `harness-upstream/ssot/palantir/` as the runtime-neutral DESIGN-authority (the WHY behind 9-axis/SIC→DTC/OSDK-binding/lineage), explicitly distinct from this doc's SOURCE/WORKFLOW-authority and from the portable research-snapshot. Cross-references the new `designAuthority` field in the sibling `.ssot-authority.json` (which the sibling bumped to its own v1.7.0; doc and JSON versions are decoupled).
- v1.7.0 (2026-06-15): Runtime-agnostic correction — Claude is an ACTIVE adapter via the directory-source marketplace install (`~/.claude/plugins/cache`), not a removed/contract-only surface. pm is runtime-NEUTRAL: one governed meaning, consumed by each runtime through its own generated binding. Codex + Claude both active; Gemini stays contract-only / `runtime_gap`. Added a `claude-code` row to the Consumer Runtime Map and generalized the consume invariant + install-support statement to both active adapters. (Does not rewrite the v1.6.1 historical entry, which was true on 2026-05-30.)
- v1.5.0 (2026-05-25): Relocated canonical source authority to the private GitHub marketplace and demoted runtime caches to install payloads.
- v1.6.1 (2026-05-30): Removed active Claude/Gemini install/package surfaces from this checkout; kept Codex marketplace installation as the only current local install path.
- v1.6.0 (2026-05-30): Relocated the local implementation checkout to `~/palantir-mini-marketplace` and demoted runtime-home marketplace checkouts to removable consumers.
- v1.4.0 (2026-05-24): Relocated canonical source authority to `plugins/palantir-mini`; demoted `~/.claude/plugins/palantir-mini` to Claude-native install/compatibility target.
- v1.1.0 (2026-05-21): Clarified Codex local-marketplace MCP consumption and generated hook adapter path after v6.78.0 bridge/runtime verification.
- v1.2.0 (2026-05-22): Added runtime-neutral core boundary and marked runtime-native protocol ownership as `~/.codex/**` / `~/.claude/**` overlay responsibility.
- v1.3.0 (2026-05-23): Added portable research snapshot authority for `research-root/` and `palantir-official/`.
- v1.0.0 (2026-05-13, sprint-128 PR 6.1): Initial SSoT authority marker. PHASE 6 ENTRY. Per canonical plan v2 §4 row 6.1.
