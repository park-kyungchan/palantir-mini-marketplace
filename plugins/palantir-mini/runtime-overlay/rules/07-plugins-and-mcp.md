---
ruleId: 7
slug: plugins-and-mcp
scope: global
version: 1.4.0
invariant: "Plugin manifest (plugin.json) is authoritative for MCP server registration; per-project managed-settings.d/*.json is RBAC fragment; no duplicate MCP registration; multi-plugin collision resolution per rule 19."
supersededBy: null
crossRefs: [08, 19, 21]
hookCitations: [agent-ownership-validate]
---

# Rule 07 — Plugins and MCP Servers

- Prefer plugin-based distribution for cross-project tooling. Per-project `.mcp.json` is a fallback for project-only cases.
- Plugin manifest `.claude-plugin/plugin.json` is authoritative for MCP server registration — declare `mcpServers` there, not in per-project configs.
- `managed-settings.d/*.json` fragments in each project grant or deny MCP tool access per project (RBAC fragment).
- Do NOT register the same MCP server twice (once via plugin, once per-project) — duplicates confuse tool routing.
- Plugin code reads `${CLAUDE_PLUGIN_ROOT}` for bundled paths; per-session state lives in project directories, not in `${CLAUDE_PLUGIN_ROOT}` (may be wiped on plugin update).

## Agent file-ownership (palantir-mini plugin)

Ownership is authoritative within the private marketplace source `park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/`. Runtime plugin caches are installed payloads only. Agents MUST NOT edit outside their writable set; cross-boundary tasks are split by Lead.

| Owner | Writable paths |
|-------|----------------|
| **hook-builder** | `hooks/** + hooks.json`, `monitors/**`, `scripts/**`, `bridge/handlers/**`, `tests/{hooks,monitors,bridge}/**` |
| **plugin-maintainer** | `.claude-plugin/{plugin,marketplace}.json`, `package.json`, `README.md`, `CHANGELOG.md`, `managed-settings.d/**` |
| **protocol-designer** | `agents/**` (plugin-scope) |
| **task-owner** | `skills/**` (assigned per task) |
| **shared** | `lib/**` (refactor needs cross-agent coordination) |

## §Runtime enforcement (v1.3.0)

- `agent-ownership-validate` PreToolUse hook blocks Edit/Write/MultiEdit when the caller agent is outside its declared writable set in the ownership table above.
- Bypass: `PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1` (audited via `agent_ownership_bypass_invoked` event).
- Lead-direct is exempt: Lead is dispatcher, not subject to the ownership table.
- Cross-ref: rule 21 (project-agent-authority) governs name-collision resolution — a distinct concern.

## §Multi-plugin precedence

- When multiple plugins register overlapping MCP server or skill names, resolution follows rule 19 (multi-plugin-precedence).
- Summary: plugin-scope > user-scope > repo-scope; exact-name collision at same scope fails loud.

**Version bumps are plugin-maintainer's sole responsibility.** Hook fix warranting a patch bump → hook-builder surfaces as follow-up task → Lead dispatches plugin-maintainer. PR #103 (2026-04-21) precedent: hook-builder editing plugin.json produced a phantom v1.2.0 that existed only in plugin cache.
