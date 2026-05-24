# MCP Server Registration — Three Paths — [Official] / [Synthesis]

> Scope: How MCP servers get registered in Claude Code v2.1.110+.
> Provenance: `[Official]` for paths; `[Synthesis]` for comparison table.
> Last verified: 2026-04-17.

## Three Registration Paths

| Path | Scope | Config File | Lifetime | Use case |
|------|-------|-------------|----------|----------|
| **Plugin manifest** | Global (every session) | `plugin.json` `mcpServers` | Plugin install → uninstall | Shared, cross-project tooling (`palantir-mini`) |
| **User config** | Global (every session) | `~/.claude/settings.json` `mcpServers` | User edits | Personal experiments, user-specific tools |
| **Per-project** | Single project | `<project>/.mcp.json` | Project only | Project-specific integrations (DB, API clients) |

## Plugin Manifest Path (preferred for shared tooling)

Within `plugin.json`:
```json
{
  "mcpServers": {
    "palantir-mini": {
      "command": "bun",
      "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.ts"],
      "env": { "PALANTIR_MINI_ROOT": "${CLAUDE_PLUGIN_ROOT}" }
    }
  }
}
```

On `/plugin install`, the server is registered globally. On `/plugin uninstall`, it is unregistered. Tools surface as `mcp__<server-name>__<tool-name>` in every session.

## User Config Path

Within `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "context7": { "command": "bunx", "args": ["@upstash/context7-mcp"] }
  }
}
```

Effect: active in every session under this user. Use for tools that aren't suitable to plugin distribution.

## Per-Project Path

Within `<project>/.mcp.json`:
```json
{
  "mcpServers": { "project-specific": { "command": "...", "args": [] } }
}
```

Effect: active only when cwd is inside this project. Use sparingly.

## RBAC via managed-settings.d

Independent of registration path, `<project>/.claude/managed-settings.d/*.json` fragments allow/deny MCP tool access per project:
```json
{
  "permissions": {
    "allow": ["mcp__palantir-mini__emit_event"],
    "deny": ["mcp__palantir-mini__commit_edits"]
  }
}
```

## Recommendation

- Shared tools (palantir-mini) → plugin manifest path.
- Personal tools → user config path.
- Project-locked tools → per-project path.
- **Never register the same server twice** — confuses tool routing (rule 07).

## Cross-References
- `plugin-system.md` — plugin lifecycle
- `hook-events-v2.md` — hooks that interact with MCP
- Rules: `~/.claude/rules/07-plugins-and-mcp.md`
