---
ruleId: 19
slug: multi-plugin-precedence
scope: global
version: 1.0.0
invariant: "When multiple plugins register a same-name MCP server or skill, plugin-scope beats user-scope beats repo-scope; exact-name collisions fail loud rather than silently shadow."
supersededBy: null
supersedes: []
crossRefs: [7, 21]
hookCitations: []
bodyLocCeiling: 30
---

# Rule 19 — Multi-Plugin Precedence

Rule 07 names the single-plugin authority (plugin.json). This rule governs collision resolution when multiple plugins or scopes register overlapping names — a gap that emerges as the plugin ecosystem scales.

## §Resolution order

- **Scope precedence** (highest wins): plugin-scope > user-scope (`~/.claude/`) > repo-scope (`<project>/`).
- When two plugins at the same scope register the same MCP server name: fail loud (`startup_mcp_collision` error event). Do NOT silently shadow.
- When two plugins at the same scope register the same skill slug: fail loud. Deprecation window exception: older plugin MUST have `deprecated: true` in skill frontmatter to yield cleanly.

## §Same-name MCP duplicate policy

- Duplicate MCP server names at runtime → Claude startup blocks with actionable message listing both plugin sources.
- Operator resolution path: pin one plugin version that removes the conflict, or rename one server in its `plugin.json`.
- `pm_rule_audit` reports `duplicateMcpNames` in health output.

## §Skill collision policy

- Duplicate skill slug at same scope → plugin with lower semver loses. Log `skill_collision_resolved` event.
- Cross-scope duplicates → higher-scope wins silently (expected override pattern; see rule 02 §Skill resolution).
