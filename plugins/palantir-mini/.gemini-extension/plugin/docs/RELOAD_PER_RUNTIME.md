# RELOAD_PER_RUNTIME.md — Per-Runtime Reload Requirements

> When a new MCP tool / skill / agent / manifest / hook / handler / lib / schema is added to or modified in the palantir-mini plugin, different runtimes have different reload requirements. This cheatsheet covers what to run, when, and what caveats apply.
>
> Per canonical plan v2 §4 row 6.4 (sprint-131 PR 6.4; Phase 6 PR 4/7).
> Last audited: 2026-05-25.
> Runtime-boundary migration note: reload procedures are native runtime facts. Target ownership is `~/.codex/docs/**` for Codex and `~/.claude/runtime-boundaries/**` for Claude; this file remains compatibility documentation in `plugins/palantir-mini` until migration debt is closed.

---

## What triggers a reload requirement

A reload is needed whenever the **runtime's in-memory plugin surface** diverges from the on-disk source. The following change categories trigger a reload:

| Change category | Reload needed? | Notes |
|----------------|----------------|-------|
| **MCP tool added/modified** (bridge/handlers/\*.ts, mcp-server.ts) | **Yes** | Runtime must re-read the tool manifest from the MCP server |
| **Skill added/modified** (skills/\*.md, skills/\*.ts) | **Yes** | Skill registry is loaded at session start |
| **Agent definition added/modified** (agents/\*.md) | **Yes** | Agent frontmatter is parsed at spawn; stale cache may load the old definition |
| **Plugin manifest changed** (.claude-plugin/plugin.json, .claude-plugin/marketplace.json) | **Yes** | Manifest is the authoritative tool-registration surface |
| **Hook added/modified** (hooks/\*.ts, hooks/hooks.json, hooks/claude-hooks.json, hooks/codex-hooks.json) | **Yes** | Hooks are registered from the runtime-specific hook registry at session start; in-flight sessions retain the prior hook set |
| **Handler added/modified** (bridge/handlers/\*.ts) | **Yes** | Handlers are loaded by the MCP server process at startup |
| **Library modified** (lib/\*.ts) | **Yes, if called from hooks or handlers** | Pure lib changes that are only called from tests do not require a live-session reload, but any lib referenced by a running MCP server or hook does |
| **Schema modified** (~/.claude/schemas/\*\*, package.json) | **Yes, if consuming runtime caches type metadata** | Schema changes take effect for new sessions automatically; active sessions retain the prior schema snapshot |
| **Session state modified** (.palantir-mini/session/\*, events.jsonl) | **No** | Session state is read on each tool invocation; no reload required |
| **CHANGELOG / README / docs** | **No** | Documentation files have no runtime effect |
| **Test files** (tests/\*\*) | **No** | Tests run in isolation; they do not affect running runtimes |

---

## Claude Code CLI

### Command

```
/reload-plugins
```

Or start a fresh session (e.g. close the terminal tab + reopen, or `/clear` followed by a new session).

### When needed

Run `/reload-plugins` after any change in the "Yes" rows above while an active Claude Code CLI session is in progress. The command re-registers all plugins, reloads the MCP server manifest, and refreshes the skill and agent registries.

### When it is safe to skip

- Read-only documentation edits (CHANGELOG, README, docs/).
- Changes to `.palantir-mini/session/**` (session state is read lazily per-invocation).
- Changes only to test files under `tests/**`.
- Changes to `~/.claude/plans/**` or `~/.claude/research/**`.

### Caveats

- `/reload-plugins` does **not** restart the MCP server process itself. If `bridge/mcp-server.ts` or any handler is changed, the MCP server subprocess must be restarted. The safest method is to start a fresh session: the CLI spawns a new MCP server process at session start.
- Hook changes (hooks/\*.ts) take effect on the **next** PreToolUse/PostToolUse/SubagentStart etc. invocation after reload. The currently executing hook cycle (if any) is not interrupted.
- If `hooks/claude-hooks.json` is modified (Claude hook registration table), a fresh session is required; `/reload-plugins` alone may not pick up the updated hook allowlist depending on the Claude Code CLI version. Shared `hooks/hooks.json` changes also require fleet sync for Codex.
- Plugin version must match in both `package.json` and `.claude-plugin/plugin.json`. A mismatch after reload will surface a startup warning.

---

## Codex CLI

### Command

Run the fleet sync wrapper, then restart the Codex CLI process. There is no
Codex equivalent of Claude Code's `/reload-plugins`.

```bash
bun run ~/.codex/scripts/sync-claude-palantir-mini.ts

# Exit the current Codex CLI session, then relaunch.
codex
```

Codex diagnostic slash commands such as `/debug-config`, `/plugins`, `/mcp`,
`/hooks`, and `/skills` can inspect the active surface, but they do not hot-reload
an already-running session.

### When needed

The palantir-mini plugin is registered in `~/.codex/config.toml` under
`[plugins."palantir-mini@palantir-mini-marketplace"]`. The target local marketplace
source is `plugins/palantir-mini`. Any remaining source path under
`/home/palantirkc/.claude/plugins/palantir-mini` is migration debt, not semantic
authority. The plugin `.codex-plugin/plugin.json` references `.mcp.json`, which
launches `bridge/mcp-server.ts` from the active plugin root using plugin-root-
relative paths. Any change in the "Yes" rows above requires a Codex CLI restart
to refresh the in-memory MCP, skill, hook, or plugin surface.

The Codex plugin manifest points at `hooks/codex-hooks.json`, a regex-safe
entrypoint registry that delegates into `lib/codex/claude-hook-adapter.ts`.
The adapter live-reads shared `hooks/hooks.json` (SSoT) when invoked, so Codex
does not parse Claude-oriented file glob matchers or `async: true` fields directly.
Claude-only task/team lifecycle hooks live in `hooks/claude-hooks.json` and are
not part of the Codex live-read source. The legacy `~/.codex/hooks.json` shim remains a runtime-owned fallback surface where
present. The fleet sync wrapper invokes `scripts/sync-codex-adapter.ts`
automatically. Direct invocation is also supported from the plugin root:

```bash
cd plugins/palantir-mini
bun scripts/sync-codex-adapter.ts
```

See `docs/CODEX_HOOK_ADAPTER.md` for the full sync workflow and forbidden-fork policy.
The adapter live-read proves the registered event's command list is fresh. It
does not prove payload parity for Claude-specific semantics, and it does not
avoid the required Codex restart when `.codex-plugin/plugin.json`,
`hooks/codex-hooks.json`, or the generated fallback shim changes.

### When it is safe to skip

Same categories as Claude Code CLI: documentation edits, session-state changes,
test-only changes, and `~/.codex/config.toml` changes that do not affect the
plugin, MCP, skill, or hook stanzas.

### Caveats

- The Codex CLI does **not** hot-reload MCP servers or plugins. The entire CLI process must be restarted to pick up plugin changes.
- The standard Codex bridge is plugin-provided via local marketplace and `.codex-plugin/.mcp.json`; avoid adding a parallel direct `[mcp_servers]` entry unless the plugin bridge is unavailable and the runtime gap is recorded.
- `hooks/codex-hooks.json` registers supported Codex hook events through the adapter. The adapter live-reads shared hook intent only; Claude-only `TaskCreated`, `TaskCompleted`, and `TeammateIdle` mounts live in `hooks/claude-hooks.json`. `SubagentStart`/`SubagentStop` are adapter-wired, and subagent and compact lifecycle parity remains payload-sensitive. See `docs/NATIVE_RUNTIME_GAPS.md`.
- If the generated adapter changes, Codex may require `/hooks` trust approval or a fresh process depending on the active CLI version.
- Unlike Claude Code CLI, Codex CLI does not support inline `/reload` commands during a session. Plan accordingly when testing hook changes across both runtimes.

---

## Gemini CLI

### Command

Use the Gemini-native extension package in the plugin source root:

```bash
gemini extensions validate plugins/palantir-mini/.gemini-extension
gemini extensions link plugins/palantir-mini/.gemini-extension

# Exit the current Gemini CLI session, then relaunch.
gemini
```

`gemini extensions install` copies the extension into `~/.gemini/extensions`.
For local palantir-mini source development, prefer `gemini extensions link` so
the extension sees source changes without reinstalling. If publishing to the
Gemini extension gallery or a standalone GitHub install source, publish
`.gemini-extension/` as the extension root or package it so `skills/` and
`agents/` are present in the installed extension root.

### When needed

Run `gemini extensions validate` after any Gemini extension manifest, hook, or
policy change. Relink or update the extension and restart the Gemini CLI after
changes to MCP handlers, skills, agents, hooks, policies, or runtime adapter
code. Gemini extension management commands do not hot-reload an already-running
interactive session.

### Caveats

- The Gemini package is intentionally separate from the root `hooks/hooks.json`
  because Gemini hook timeouts are milliseconds while Claude/Codex hook timeout
  values are seconds.
- Gemini maps `BeforeAgent`, `BeforeTool`, `AfterTool`, `AfterAgent`,
  `PreCompress`, and `SessionEnd` through
  `lib/gemini/native-hook-adapter.ts`; this is adapter-native workflow
  enforcement, not Claude/Codex lifecycle parity.
- Root palantir-mini source remains the workflow authority. `~/.gemini/**` is a
  runtime-local install/cache surface only.

## Common pitfalls

1. **Editing `.palantir-mini/session/*` or `events.jsonl` and thinking a reload is needed** — these files are read on each tool invocation, not cached. No reload required.

2. **Editing shared `hooks.json` without running fleet sync** — `hooks/hooks.json` is the shared SSoT for Codex-readable hook intent. After editing it, run `bun run ~/.codex/scripts/sync-claude-palantir-mini.ts` or `bun scripts/sync-codex-adapter.ts` from `plugins/palantir-mini` before restarting Codex. Claude-only task/team lifecycle mounts belong in `hooks/claude-hooks.json`, not the shared registry.

   v6.79.0 note: shared `hooks/hooks.json` exposes 98 commands; Claude
   `hooks/claude-hooks.json` exposes 105 commands including Claude-only task/team lifecycle mounts.

3. **Using `/reload-plugins` after changing `bridge/mcp-server.ts`** — `/reload-plugins` re-registers the plugin manifest but does not restart the MCP server subprocess. For MCP server code changes, start a fresh Claude Code CLI session.

4. **Changing `package.json` version without updating `.claude-plugin/plugin.json`** — the two must stay in sync. A mismatch produces a confusing startup warning; `pm_plugin_self_check` surfaces this.

5. **Assuming Codex CLI picks up changes in-session** — Codex CLI has no hot-reload path. Every plugin, hook, or MCP server change requires a CLI restart.

6. **Testing hook changes in Claude Code CLI without verifying Codex parity** — supported Codex hook events are adapter-backed, but Claude-only task/team lifecycle surfaces remain in `hooks/claude-hooks.json`. Consult `docs/NATIVE_RUNTIME_GAPS.md` before declaring a hook "working cross-runtime."

7. **Adding a new skill `.md` file without a `/reload-plugins`** — Claude skill discovery reads the canonical `skills/` directory at session start. Codex default skill discovery reads the curated `codex-skills/` directory from `.codex-plugin/plugin.json`. Active Claude and Codex CLI sessions will not see newly added or moved skills until reload or fresh session.

8. **Forgetting that agent `.md` frontmatter is cached at spawn, not at session start** — if you modify an agent's frontmatter and immediately try to spawn it in the same session without `/reload-plugins`, the old definition may be used.

---

## Cross-references

- `docs/CODEX_HOOK_ADAPTER.md` — Codex hook adapter architecture + sync workflow.
- `docs/NATIVE_RUNTIME_GAPS.md` — parity table for hook/event surfaces across Claude CLI, Codex CLI, and Gemini CLI.
- `rules/CONTEXT.md §13.5` — cross-runtime coexistence overview (overlay maps, shared spine, anti-patterns).
- `rule 27` (cross-runtime-substrate) — events.jsonl atomic append across runtimes.
- `rule 07` (plugins-and-mcp) — plugin manifest authority + MCP server registration discipline.
