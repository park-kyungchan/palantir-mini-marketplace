# Codex Hook Adapter — Design + Sync Workflow

> Per canonical plan v2 §4 row 6.2 (sprint-129 PR 6.2; PHASE 6 PR 2/7).

> Runtime-boundary migration note (2026-05-25): this document describes the Codex plugin hook entrypoint path plus the legacy fallback shim. Durable workflow semantics and hook intent remain in the canonical source root at `plugins/palantir-mini` and the neutral boundary at `/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json`.

## Overview

The Codex runtime integrates palantir-mini hooks through the plugin manifest:

```
.codex-plugin/plugin.json
  -> hooks/codex-hooks.json
  -> lib/codex/codex-hook-adapter.ts
```

`hooks/codex-hooks.json` MUST remain a delegation-only entrypoint registry. It
uses only Codex-supported lifecycle events, regex-safe matchers, and commands
that call `lib/codex/codex-hook-adapter.ts`. `SessionStart` and
`UserPromptSubmit` are mounted for Codex prompt-front-door continuity.
`PreToolUse` remains intentionally unmounted until prompt opt-out capture and
read-only/review-artifact classification are reliable. Durable hook intent is
read from the canonical source root at `plugins/palantir-mini/hooks/hooks.json`;
the Codex mounted event list is a separate runtime surface declared by
`hooks/codex-hooks.json` and `runtime-adapters/codex/contract.json`.

## Adapter Architecture

```
Codex runtime
  → .codex-plugin/plugin.json
      → hooks/codex-hooks.json  (regex-safe Codex entrypoints)
          → lib/codex/codex-hook-adapter.ts  (Codex adapter)
              → hooks/hooks.json  (shared hook intent registry)
```

The adapter performs a **live-read** of shared `hooks/hooks.json` at runtime —
it does not hardcode source hook matchers or commands. Changes inside already-
registered hook events are visible to Codex through the canonical source read
path. Adding or removing Codex entrypoint events still requires updating
`hooks/codex-hooks.json` and restarting Codex so the runtime re-reads its
session hook surface.

As of the Codex hook registry repair on 2026-06-05, `SessionStart` and
`UserPromptSubmit` are present in `hooks/codex-hooks.json`. Direct adapter tests
may still pass event names with temporary hook registries, but checked-in Codex
runtime mounting is governed by `hooks/codex-hooks.json` plus reinstall/reload
smoke evidence. `PreToolUse` remains absent from that registry.

Ontology context projections preserve this distinction. `activeHooks` remains a
compatibility alias for shared hook intent. Newer callers should prefer
`sharedHookIntentEvents` for `hooks/hooks.json` policy intent and
`codexMountedHookEvents` for Codex-mounted lifecycle events.

Codex `PermissionRequest` is a runtime wire event, not a separate palantir-mini
policy family. When the adapter receives `PermissionRequest`, it looks up and
executes the shared `PreToolUse` hook group from `hooks/hooks.json`, and the
hook script payload uses `hook_event_name: "PreToolUse"`. The adapter still
returns Codex `PermissionRequest` response shape to the runtime, so a denied
shared policy becomes a `PermissionRequest` deny decision. `--match
PermissionRequest` reports this bridge explicitly with
`policyEventName: "PreToolUse"`.

The live-read claim is covered by `tests/lib/codex/codex-hook-adapter.test.ts`:
the smoke test rewrites a temporary `hooks.json` between adapter calls and
expects the second call to execute the updated hook command. This is Codex
adapter evidence only.

## Activation Policy

Codex plugin availability is not the same as palantir-mini workflow authority.
When Codex has already loaded a palantir-mini plugin hook, the adapter applies
`lib/codex/palantir-mini-activation-policy.ts` before running shared hook
intent. The policy is opt-in for palantir-mini semantics and returns a silent
empty response for explicit user opt-out prompts, `/home/palantirkc/meta-harness`
work, repo-local `AGENTS.md` instructions that explicitly make palantir-mini
opt-in only, and ordinary non-palantir turns. Silent bypass means no shared hook
run, no prompt-front-door write, no additional context injection, and no
palantir-mini event emission from that adapter path.

Silent bypass is intentionally not documented as a Codex no-call guarantee. If
Codex has loaded the hook entrypoint and the lifecycle event matches, the
adapter process has already started. A true no-call state must be created in
Codex-owned configuration before hook discovery/loading, for example by
disabling hooks, disabling plugin hooks, or disabling the plugin in a dedicated
profile/session. Codex official docs describe plugin-bundled hooks as lifecycle
hooks loaded from an enabled plugin, with manifest `hooks` overriding the
default `hooks/hooks.json` path. The Codex config reference documents
user-level config, trusted project-scoped `.codex/config.toml`, profiles, and
the `[features].hooks` lifecycle-hook switch. Use those Codex-owned surfaces for
runtime no-call policy; keep palantir-mini source policy scoped to deterministic
silent behavior after the adapter starts.

The current checked-in Codex registry mounts `UserPromptSubmit`, so prompt-local
opt-out and prompt-front-door evidence can be captured after plugin
reinstall/reload. Later prompt-less mounted events still cannot reconstruct a
missing original prompt on their own. Durable opt-out across those paths
therefore requires stored prompt-front-door state, a Codex no-call
profile/config, repo-local opt-in-only `AGENTS.md` policy, or direct payload
evidence such as `payload.prompt`. palantir-mini source work and palantir-mini
MCP tool calls remain active unless one of those explicit opt-out inputs is
present.

User-visible workflow responses should mirror that boundary. In Codex, hook
intent is plugin-layer policy read from `hooks/hooks.json`; the Codex adapter
automates live-read for supported lifecycle events when the smoke evidence
applies. For unsupported lifecycle events or runtimes without adapter evidence,
responses must state the runtime gap and the manually preserved policy boundary
instead of claiming native parity.

## Source Authority

`plugins/palantir-mini/` is the canonical source of truth for
palantir-mini workflow semantics, hook intent, MCP handler source, skills,
agents, tests, and runtime manifests. Per `SSOT-AUTHORITY.md`:

- **Forbidden**: Creating a parallel semantic source fork in `~/.codex/plugins/palantir-mini/`
  or any other runtime directory.
- **Required**: Codex consumes durable workflow semantics from
  `plugins/palantir-mini` through the Codex-native adapter/bridge.

The Codex entrypoint registry at `hooks/codex-hooks.json` is **not** a fork. It
does not duplicate workflow policy. It only registers supported Codex events and
delegates to the adapter, while shared hook intent remains in `hooks/hooks.json`.

## Sync Script

`scripts/sync-codex-adapter.ts` regenerates the legacy fallback shim from the
shared SSoT `hooks.json`. The generated timestamp is derived from `hooks/hooks.json`
mtime, so recurring sync jobs are idempotent when the registry has not changed.
Runtime-local sync is a separate lane after the source change has merged and the
installed Codex plugin payload has been refreshed. Do not edit the fallback shim
or `~/.codex` as part of a source-lane PR; regenerate it from the installed
payload with this script.

### Usage

```bash
# From the plugin root
cd plugins/palantir-mini

# Dry-run: preview generated content (no write)
bun scripts/sync-codex-adapter.ts --dry-run

# Live sync to default legacy fallback target (~/.codex/hooks/palantir-mini-codex-hook-adapter.ts)
bun scripts/sync-codex-adapter.ts

# Override target path
bun scripts/sync-codex-adapter.ts --target /tmp/test-adapter.ts
```

### How to Verify

Run dry-run and inspect the header:

```bash
bun scripts/sync-codex-adapter.ts --dry-run | head -20
```

Expected output starts with:

```
#!/usr/bin/env bun
/**
 * palantir-mini Codex hook adapter — thin shim.
 *
 * AUTO-GENERATED from plugins/palantir-mini/hooks/hooks.json
 * — see scripts/sync-codex-adapter.ts; DO NOT EDIT BY HAND
 * Generated at: <ISO8601 timestamp>
 * Source authority: plugins/palantir-mini
 * ...
```

Run the adapter smoke coverage when changing live-read behavior:

```bash
bun test tests/lib/codex/codex-hook-adapter.test.ts
```

### When to Run

Run `bun scripts/sync-codex-adapter.ts` directly after:

1. Adding or removing a hook event in `hooks.json` that the fallback shim must expose.
2. Upgrading the plugin (MINOR/MAJOR version bump).
3. Changing the event allowlist in `lib/runtime/capability-matrix.ts`.
4. Changing `hooks/codex-hooks.json` or `.codex-plugin/plugin.json`.

The script exits `0` on success and `1` on validation failure (missing `hooks.json`,
bad JSON structure, or write error). If the generated file is already current, it
prints `Up to date` and leaves the target untouched.

## Forbidden-Fork Policy

Per `.ssot-authority.json`:

```
"forbiddenForks": [
  "Do NOT create workflow semantic forks in ~/.codex/plugins/palantir-mini/ or other runtime dirs.",
  "Runtime-native protocol adapters, settings, memory stores, and reload docs belong in the owning runtime home.",
  "Per-runtime adapters are protocol authorities for their native runtime, not palantir-mini workflow authorities."
]
```

If you see durable workflow semantics duplicated between `hooks/codex-hooks.json`,
the Codex adapter, and the canonical source root, that is a defect. File it as a
drift violation and keep the Codex registry as entrypoints only.

## Cross-References

- `.ssot-authority.json` — machine-readable SSoT marker (PR 6.1).
- `SSOT-AUTHORITY.md` — human-readable SSoT policy companion (PR 6.1).
- `plugins/palantir-mini/hooks/codex-hooks.json` — Codex regex-safe hook entrypoints.
- `plugins/palantir-mini/lib/codex/codex-hook-adapter.ts` — Codex adapter owner.
- `plugins/palantir-mini/hooks/hooks.json` — the live shared SSoT hook intent registry.
- `~/.codex/config.toml` — Codex runtime configuration; plugin install points at `.codex-plugin/plugin.json`.
