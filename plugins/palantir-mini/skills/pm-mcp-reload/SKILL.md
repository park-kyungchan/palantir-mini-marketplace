---
name: pm-mcp-reload
category: maintenance
surfaceStatus: public-core
description: "Guide the user through MCP server module reload after a bridge handler edit —..."
allowed-tools: mcp__palantir-mini__emit_event Read Bash
effort: medium
disable-model-invocation: true
---

# pm-mcp-reload — MCP server module reload guidance

## When to use

- After editing any file under `plugins/palantir-mini/bridge/handlers/` and the change isn't reflected in MCP tool calls.
- After installing a fresh plugin version that adds new bridge handlers.
- When `/palantir-mini:pm-mcp-reload` is invoked or these phrases appear: "MCP reload", "handler module reload", "why isn't my handler change picked up".

## NOT for

- Reloading skills (`/reload-plugins` alone suffices for skill SKILL.md changes).
- Reloading hook source (hooks fire fresh per event; no module cache).
- Reloading MCP TOOLS registry (registry is read at startup; same as handler — restart required).

## What's actually happening

The palantir-mini MCP server (`plugins/palantir-mini/bridge/mcp-server.ts`) lazy-imports handler modules and caches them in `moduleMap`. Once a handler is loaded, subsequent `tools/call` invocations reuse the cached module. **Edited handler source on disk does NOT propagate** until either:

1. The MCP server subprocess is restarted (Claude Code session restart), OR
2. A future plugin version (post v4.5.0) adopts dynamic re-import + cache invalidation.

`/reload-plugins` reloads the plugin manifest + skills + agents but does NOT restart the MCP server subprocess (architectural limitation of current Claude Code versions).

## How to use this skill

### Option A — Quick: full session restart (most reliable)

```bash
# 1. Save your work (commit any in-progress edits)
# 2. Exit Claude Code (Ctrl+D or `/exit`)
# 3. Restart Claude Code
claude

# Verify the new handler is registered:
# /mcp (lists current MCP tools)
```

### Option B — Plugin reload + verify (sometimes sufficient)

```bash
# In Claude Code:
/reload-plugins

# Then verify with a small test invoke:
mcp__plugin_palantir-mini_palantir-mini__pm_preamble({skillName: "pm-mcp-reload"})
```

If the new handler still isn't visible after Option B, fall back to Option A.

### Option C — File-based smoke test (no restart)

For new handlers, you can directly invoke the source file via Bash to confirm the code is correct (this bypasses MCP server entirely):

```bash
PALANTIR_MINI_PROJECT=$HOME bun run plugins/palantir-mini/scripts/run.ts <handler-name> <args>
```

This works for handlers that follow the run.ts dispatch pattern (most do). Useful for smoke-testing without session restart.

## Substrate effect

Emit a `phase_completed` envelope so the BackProp circuit records that a reload was needed:

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "mcp-reload-advised", taskId: "<changed-handler-name>", validations: ["restart-method-chosen"] },
  withWhat: {
    reasoning: "MCP server module cache requires <Option A|B|C> reload after bridge handler edit",
    memoryLayers: ["procedural"]
  }
})
```

## Roadmap (deferred)

A proper dynamic-reload mechanism (without session restart) is the original plan §3.W4.B intent. Implementation requires changes to `bridge/mcp-server.ts` (replace static moduleMap caching with lazy import + cache invalidation on `reload-plugins` signal). Deferred to a future plugin version where the runtime stabilizes the InstructionsLoaded matcher for `compact|reload` on plugin-scope events.

## Authority + cross-refs

- Plugin: `plugins/palantir-mini/bridge/mcp-server.ts` (TOOLS registry + moduleMap). `~/.claude/plugins/palantir-mini` is only the Claude compatibility/install target.
- Hook v2 conventions: hooks use InstructionsLoaded matchers.
- Plan §3.W4.B — `~/.claude/plans/mossy-mapping-eich.md` (skill-only deviation; full handler reload deferred).
