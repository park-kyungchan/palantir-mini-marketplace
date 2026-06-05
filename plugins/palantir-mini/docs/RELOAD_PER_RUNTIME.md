# RELOAD_PER_RUNTIME.md — Codex Reload Requirements

> Current local install scope: Codex only. Claude and Gemini install/package
> surfaces are intentionally absent from this checkout and can be installed later
> through their own marketplace paths.
>
> Last audited: 2026-05-30.

## Source vs Runtime Legend

- Runtime-neutral local source checkout: `/home/palantirkc/palantir-mini-marketplace`, plugin root `plugins/palantir-mini/`.
- Upstream source of truth: `https://github.com/park-kyungchan/palantir-mini-marketplace`.
- Codex marketplace registration should point at `/home/palantirkc/palantir-mini-marketplace` for local development.
- Installed payloads such as `~/.codex/plugins/cache/**` are runtime consumers and must not be edited as semantic authority.
- Claude/Gemini runtime install paths are not active in this checkout.

## PR5 Runtime Adapter Contract Scope

PR5 per-runtime source contracts live at
`runtime-adapters/codex/contract.json`,
`runtime-adapters/claude/contract.json`, and
`runtime-adapters/gemini/contract.json`. Those paths are source contracts, not
runtime reload commands or proof of native support.

Codex is the only active package/install target. Source-complete is not
active-runtime-complete: Codex observes runtime-surface changes only after
marketplace refresh or reinstall, process restart, and targeted smoke evidence.
Claude and Gemini remain contract-only `runtime_gap` / unsupported surfaces until
native package/install surfaces and smoke evidence exist. Do not add Claude or
Gemini reload command sections without that evidence.

## What triggers a reload requirement

A reload is needed whenever Codex's in-memory plugin surface diverges from the
Git-backed on-disk source.

| Change category | Reload needed? | Notes |
|----------------|----------------|-------|
| MCP tool added/modified (`bridge/handlers/*.ts`, `bridge/mcp-server.ts`) | Yes | Codex must restart the MCP server process |
| Skill added/modified (`codex-skills/*.md`, `skills/*.md`) | Yes | Skill registry is loaded at session start |
| Agent definition added/modified (`agents/*.md`) | Yes | Agent frontmatter is parsed at spawn |
| Codex plugin manifest changed (`.codex-plugin/plugin.json`, `.mcp.json`) | Yes | Manifest is the Codex tool-registration surface |
| Hook added/modified (`hooks/*.ts`, `hooks/hooks.json`, `hooks/codex-hooks.json`) | Yes | Hooks are registered at session start |
| Library modified (`lib/*.ts`) | Yes, if called from hooks or handlers | Pure test-only helpers do not affect a running session |
| Session state modified (`.palantir-mini/session/*`, `events.jsonl`) | No | No reload required; session state is read lazily |
| CHANGELOG / README / docs | No | Documentation files have no runtime effect |
| Test files (`tests/**`) | No | Tests run in isolation |

## Codex CLI

Codex has no in-session hot-reload for plugins, MCP servers, hooks, or skills.
After runtime-surface changes, restart the Codex CLI process.

```bash
# Local development source registration
codex plugin marketplace add /home/palantirkc/palantir-mini-marketplace

# Install or reinstall the plugin payload
codex plugin add palantir-mini@palantir-mini-marketplace

# Exit the current Codex CLI session, then relaunch.
codex
```

Diagnostic slash commands such as `/debug-config`, `/plugins`, `/mcp`, `/hooks`,
and `/skills` can inspect the active surface, but they do not hot-reload an
already-running session.

When Codex hook configuration changes, `hooks/hooks.json` remains the shared
hook-intent SSoT, while `hooks/codex-hooks.json` and
`runtime-adapters/codex/contract.json` control which Codex lifecycle events are
mounted at all. Ontology context projections expose these as separate surfaces:
`sharedHookIntentEvents` is policy intent, and `codexMountedHookEvents` is Codex
runtime mounting evidence. The current Codex surface does not mount
`PreToolUse`, `SessionStart`, or `UserPromptSubmit`; changing that requires a source
PR, plugin reinstall, trust-state refresh, and process restart. `bun
scripts/sync-codex-adapter.ts` regenerates the Codex fallback adapter/shim for
local development. The active Codex session still needs plugin reinstall plus
process restart to observe runtime-surface changes.

`lib/codex/palantir-mini-activation-policy.ts` is source-owned adapter policy,
not a Codex hook discovery switch. It can make an already-started palantir-mini
adapter path return silently without shared hook execution, prompt-front-door
writes, additional context, or palantir-mini event emission. It cannot prevent
Codex from calling a loaded hook entrypoint. For true no-call sessions, use
Codex-owned config/profile/plugin controls before startup, then verify the
active surface with `/debug-config`, `/plugins`, and `/hooks` after restarting.
This is especially important when the user's opt-out instruction exists only in
the original prompt: prompt-less mounted events cannot reconstruct that
instruction after `UserPromptSubmit` remains unmounted.

## Safe To Skip

- Read-only documentation edits.
- Changes to `.palantir-mini/session/**`.
- Changes only to test files under `tests/**`.
- `~/.codex/config.toml` edits that only change marketplace registration and do not affect installed plugin, MCP, skill, or hook stanzas.

## Common pitfalls

1. **Editing installed cache payloads** — never edit `~/.codex/plugins/cache/**` as semantic source. Edit `/home/palantirkc/palantir-mini-marketplace` and reinstall.
2. **Expecting hot reload** — Codex must be restarted after plugin, MCP, hook, or skill changes.
3. **Confusing silent bypass with no-call** — a silent adapter response reduces side effects after the hook starts; disabling hook/plugin loading in Codex config is the no-call mechanism.
4. **Recreating runtime-owned source checkouts** — do not use `~/.codex/.tmp/marketplaces/palantir-mini-marketplace` as the working source. The working source is `/home/palantirkc/palantir-mini-marketplace`.

## Cross-References

- `docs/CODEX_HOOK_ADAPTER.md` — Codex hook adapter architecture.
- `docs/RUNTIME_LAYER_BOUNDARY.md` — source/install/cache separation.
- `.codex-plugin/plugin.json` — Codex plugin manifest.
