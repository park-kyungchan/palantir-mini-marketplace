# Claude Code Plugin System (v2.1.110+) — [Official]

> Scope: `.claude-plugin/marketplace.json` + `plugin.json` + `/plugin` command lifecycle.
> Provenance: `[Official]` from docs.claude.com and code.claude.com.
> Last verified: 2026-04-17.

## Marketplace

A marketplace is a directory (or git repo) containing `.claude-plugin/marketplace.json`:
```json
{
  "name": "my-marketplace",
  "owner": { "name": "owner-id" },
  "plugins": [
    { "name": "plugin-a", "source": "./", "version": "0.1.0" }
  ]
}
```

Add via `/plugin marketplace add <path-or-url>`.

## Plugin Manifest

Each plugin has `.claude-plugin/plugin.json`:
```json
{
  "name": "plugin-name",
  "version": "1.3.0",
  "description": "...",
  "mcpServers": { "my-mcp": { "command": "bun", "args": ["..."] } },
  "hooks": "${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json",
  "agents": "${CLAUDE_PLUGIN_ROOT}/agents",
  "skills": "${CLAUDE_PLUGIN_ROOT}/skills"
}
```

## Install / Uninstall Lifecycle

- `/plugin install <name>@<marketplace>` — reads manifest, registers MCP servers globally, sources hooks + agents + skills.
- `/plugin uninstall <name>` — removes registration; does NOT delete per-project state.
- `/plugin update <name>` — may rebuild `${CLAUDE_PLUGIN_ROOT}`; per-project state in project dirs is unaffected.

## Path Expansion

- `${CLAUDE_PLUGIN_ROOT}` — path to the plugin's own directory. Bundled code lives here.
- `${CLAUDE_PLUGIN_DATA}` — plugin's persistent data (survives updates).
- Per-project state should live in `<project>/.palantir-mini/` (or equivalent), NOT in `${CLAUDE_PLUGIN_ROOT}`.

## Our Application (palantir-mini)

- Marketplace: `~/.claude/plugins/palantir-mini/.claude-plugin/marketplace.json` (single-plugin)
- Manifest: `~/.claude/plugins/palantir-mini/.claude-plugin/plugin.json`
- v0.2.0 introduced `mcpServers` block → `mcp__palantir-mini__*` tools available in every session after install.
- Current v1.3.0 adds 12 governance MCP tools (detect_doc_drift, check_cc_version, validate_hook_event_allowlist, refresh_research_doc, scan_dead_code, audit_events_5d_conformance, verify_schema_pin, verify_codegen_headers, validate_managed_settings_fragments, pre_edit_impact, impact_query, scan_file_size_violations) + 6 new hooks + 2 monitors.

## Cross-References
- `mcp-server-registration.md` — MCP server lifecycle specifics
- `hook-events-v2.md` — hook events the plugin taps
- `../palantir/marketplace/` — Foundry Marketplace parallel
- Rules: `~/.claude/rules/07-plugins-and-mcp.md`
