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
that call `lib/codex/codex-hook-adapter.ts`. Durable hook intent is read from
the canonical source root at `plugins/palantir-mini/hooks/hooks.json`.

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
