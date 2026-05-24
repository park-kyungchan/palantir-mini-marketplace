---
ruleId: 21
slug: project-agent-authority
scope: global
version: 1.0.0
invariant: "When a project-scope agent name collides with a plugin-scope agent name, plugin-scope wins; project agent enters a deprecation window and must be renamed or removed within 1 sprint."
supersededBy: null
supersedes: []
crossRefs: [7, 19, 23]
hookCitations: []
bodyLocCeiling: 30
---

# Rule 21 — Project-Agent Authority

Plugin-scope agents (rule 07) are the canonical cross-project authority. Project-local agent definitions serve project-specific extensions. When they collide, ambiguity breaks Lead dispatch and subagent routing.

## §Collision resolution

- Plugin-scope agent name always wins over project-scope agent name.
- On collision detected at `SessionStart`: emit `project_agent_collision_detected` event; surface advisory with path of both agents.
- Project agent enters **deprecation window**: Lead has 1 sprint to rename/remove the project-local definition before the hook escalates to blocking.

## §Deprecation window mechanics

- Project agent with `deprecated: true` frontmatter + `supersededBy: <plugin-agent-name>` yields to plugin-scope cleanly.
- After window expires (1 sprint), `SubagentStart` hook blocks spawning the colliding project agent.

## §When project extensions are legitimate

- Different `name` (no collision) → project agent is fully valid.
- Wrapper pattern (project agent calls plugin agent via MCP) → valid; use distinct name.
- Project-scope rule 23 frontmatter required on all project agents.
