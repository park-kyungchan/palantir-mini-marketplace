# Codex Hook Adapter — Design + Sync Workflow

> Per canonical plan v2 §4 row 6.2 (sprint-129 PR 6.2; PHASE 6 PR 2/7).

> Runtime-boundary migration note (2026-05-24): this document describes the compatibility shim path. Target ownership for Codex hook adapter protocol logic is `~/.codex/**`; durable workflow semantics and hook intent remain in the canonical source root at `plugins/palantir-mini` and the neutral boundary at `/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json`.

## Overview

The Codex runtime integrates palantir-mini hooks via a **thin shim** at:

```
~/.codex/hooks/palantir-mini-claude-hook-adapter.ts
```

This shim MUST remain a delegation-only file. Codex protocol translation belongs
to `~/.codex/lib/palantir-mini/**`; durable hook intent is read from the canonical
source root at `plugins/palantir-mini/hooks/hooks.json`. Legacy plugin-
side Codex adapter logic is compatibility debt, not the target runtime authority.

## Adapter Architecture

```
Codex runtime
  → ~/.codex/hooks/palantir-mini-claude-hook-adapter.ts  (thin shim — THIS file)
      → ~/.codex/lib/palantir-mini/native-hook-adapter.ts  (Codex-native protocol owner)
          → plugins/palantir-mini/hooks/hooks.json  (canonical hook intent registry)
```

The adapter performs a **live-read** of `hooks.json` at runtime — it does not
hardcode hook matchers or commands. Changes inside already-registered hook events
are visible to Codex through the canonical source read path. Adding or removing
event names still requires regenerating the shim/hooks config and restarting Codex
so the runtime re-reads its session hook surface.

The live-read claim is covered by `tests/lib/codex/claude-hook-adapter.test.ts`:
the smoke test rewrites a temporary `hooks.json` between adapter calls and expects
the second call to execute the updated hook command. This is adapter evidence only,
not evidence that Claude-only lifecycle hooks fire natively in Codex.

## Source Authority

`plugins/palantir-mini/` is the canonical source of truth for
palantir-mini workflow semantics, hook intent, MCP handler source, skills,
agents, tests, and runtime manifests. Per `SSOT-AUTHORITY.md`:

- **Forbidden**: Creating a parallel semantic source fork in `~/.codex/plugins/palantir-mini/`
  or any other runtime directory.
- **Required**: All runtimes consume durable workflow semantics from `plugins/palantir-mini` through their native adapter/bridge.

The shim at `~/.codex/hooks/palantir-mini-claude-hook-adapter.ts` is **not** a fork —
it is a generated runtime registration artifact. Codex protocol logic lives in
the Codex runtime owner path; hook intent remains in the canonical source root.

## Sync Script

`scripts/sync-codex-adapter.ts` regenerates the shim from the SSoT `hooks.json`.
The generated timestamp is derived from `hooks/hooks.json` mtime, so recurring
sync jobs are idempotent when the registry has not changed.

Codex fleet sync also runs this generator from:

```bash
bun run ~/.codex/scripts/sync-claude-palantir-mini.ts
```

That script is safe to run after source-root plugin updates; it refreshes the
Codex marketplace/plugin mirrors, skill mirrors, hooks config, installed cache,
and this generated adapter from the active palantir-mini source path. If the
script still names `~/.claude/plugins/palantir-mini`, treat that as runtime-
sync migration debt rather than semantic authority.

### Usage

```bash
# From the plugin root
cd plugins/palantir-mini

# Dry-run: preview generated content (no write)
bun scripts/sync-codex-adapter.ts --dry-run

# Live sync to default target (~/.codex/hooks/palantir-mini-claude-hook-adapter.ts)
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

Run the adapter smoke coverage when changing live-read behavior:

```bash
bun test tests/lib/codex/claude-hook-adapter.test.ts
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

### When to Run

Run `bun scripts/sync-codex-adapter.ts` directly, or run the fleet sync wrapper
above, after:

1. Adding or removing a hook event in `hooks.json`.
2. Upgrading the plugin (MINOR/MAJOR version bump).
3. Changing the event allowlist in `lib/runtime/capability-matrix.ts`.

The script exits `0` on success and `1` on validation failure (missing `hooks.json`,
bad JSON structure, or write error). If the generated file is already current, it
prints `Up to date` and leaves the target untouched.

## Forbidden-Fork Policy

Per `.ssot-authority.json`:

```
"forbiddenForks": [
  "Do NOT create plugin source forks in ~/.codex/plugins/palantir-mini/ or other runtime dirs.",
  "All runtimes share durable workflow semantics from plugins/palantir-mini/.",
  "Per-runtime adapters (managed-settings.d / runtime-overlay / config.toml) are mirrors not authorities."
]
```

If you see durable workflow semantics duplicated between the Codex adapter and the
canonical source root, that is a defect. File it as a drift violation and
regenerate the shim.

## Cross-References

- `.ssot-authority.json` — machine-readable SSoT marker (PR 6.1).
- `SSOT-AUTHORITY.md` — human-readable SSoT policy companion (PR 6.1).
- `~/.codex/lib/palantir-mini/native-hook-adapter.ts` — Codex-native protocol adapter owner.
- `lib/runtime/capability-matrix.ts` — Codex vs Claude event capability map.
- `plugins/palantir-mini/hooks/hooks.json` — the live SSoT hook intent registry.
- `~/.codex/config.toml` — Codex runtime configuration; hooks registered via `hooks.json`.
- `~/.claude/rules/CONTEXT.md §13.5` — cross-runtime coexistence policy.
- `~/.claude/rules/CONTEXT.md §15 Glossary` — harness taxonomy.
