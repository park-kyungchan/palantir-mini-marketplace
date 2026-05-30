# Plugin Workflow Authority — SSoT Marker

The canonical palantir-mini source root on this machine is `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini/`. Its upstream provenance is the private GitHub marketplace payload `park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/`. The local source root owns workflow semantics, MCP handler source, hook intent, skills, agents, tests, and installable plugin manifests.

Runtime plugin caches are install targets. They must not become semantic forks. Runtime-neutral ownership is described by `/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json`. Current local install support is Codex-only; runtime-native protocol adapters, hook registration, reload procedures, memory stores, trust state, and provider-specific capability facts belong under `~/.codex/**`.

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

## Invariant

> Codex consumes palantir-mini workflow semantics from the private marketplace payload; no runtime-home semantic source forks should be created. Runtime-native wrappers are authority for provider protocol details, but not for durable palantir-mini workflow semantics.

## What Is and Is Not an Authority

| Artifact | Authority? | Notes |
|----------|-----------|-------|
| `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini/` | YES — canonical local source root | Owns workflow semantics, MCP handler source, hook intent, source skills/agents, tests, and runtime manifests. |
| `park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/` | YES — upstream provenance | Remote source used after PR merge and runtime marketplace refresh; not a runtime-home cache. |
| `/home/palantirkc/.palantir-mini/core/` | YES — runtime-neutral boundary | Owns runtime-neutral workflow/control-plane boundary contracts and sentinel policy; it is not the full plugin root. |
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

## Cross-References

- `CONTEXT.md §13.5` — Cross-runtime coexistence map (Codex/Gemini).
- `rule 07` (plugins-and-mcp) — Plugin manifest authority + MCP server registration.
- `rule 27` (cross-runtime-substrate) — Cross-runtime `events.jsonl` append protocol.
- `~/.claude/rules/CORE.md` — Active rule invariants.

## Version History

- v1.5.0 (2026-05-25): Relocated canonical source authority to the private GitHub marketplace and demoted runtime caches to install payloads.
- v1.6.1 (2026-05-30): Removed active Claude/Gemini install/package surfaces from this checkout; kept Codex marketplace installation as the only current local install path.
- v1.6.0 (2026-05-30): Relocated the local implementation checkout to `/home/palantirkc/palantir-mini-marketplace` and demoted runtime-home marketplace checkouts to removable consumers.
- v1.4.0 (2026-05-24): Relocated canonical source authority to `plugins/palantir-mini`; demoted `~/.claude/plugins/palantir-mini` to Claude-native install/compatibility target.
- v1.1.0 (2026-05-21): Clarified Codex local-marketplace MCP consumption and generated hook adapter path after v6.78.0 bridge/runtime verification.
- v1.2.0 (2026-05-22): Added runtime-neutral core boundary and marked runtime-native protocol ownership as `~/.codex/**` / `~/.claude/**` overlay responsibility.
- v1.3.0 (2026-05-23): Added portable research snapshot authority for `research-root/` and `palantir-official/`.
- v1.0.0 (2026-05-13, sprint-128 PR 6.1): Initial SSoT authority marker. PHASE 6 ENTRY. Per canonical plan v2 §4 row 6.1.
