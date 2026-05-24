# research/skills/ — Query Router

> Scope: Internal research on skill authoring, audit, and migration (meta-level, not upstream evidence).

## Common Questions

| Question | File |
|----------|------|
| What's the skill authority hierarchy? | `authority-audit.md` |
| What gotchas hit skill upgrades? | `gotchas-upgrade.md` |
| How is the `palantir` skill structured? | `palantir-skill.md` |

## Cross-References
- `~/.claude/skills/` — user-scope skills
- `~/.claude/plugins/palantir-mini/skills/` — plugin-scope skills
- Rules: use `~/.claude/rules/CORE.md` for active invariants and `~/.claude/rules/07-plugins-and-mcp.md` / `~/.claude/rules/12-lead-protocol.md` for current plugin-scope and routing policy. Historical rule 05 references are legacy only; active global routing marks rule 05 as a permanent gap.
- Plan: `~/.claude/plans/fluttering-brewing-donut.md` §9.3 (skill hardening)

## Invariants
- This subdir is **meta-level** (how to write/audit skills), not tool documentation.
- When a gotcha recurs, promote it to a rule in `~/.claude/rules/`.
