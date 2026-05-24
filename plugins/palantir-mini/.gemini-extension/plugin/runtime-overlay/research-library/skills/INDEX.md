# research/skills/ — Structural Reference

## Purpose
Internal research on skill authoring patterns, audit methodology, and upgrade gotchas. **Not** a catalog of available skills (that lives in `settings.json` `enabledPlugins` + `~/.claude/skills/`).

## Authority Boundary
Meta-level. Advises `~/.claude/skills/` authoring; does not grant ownership.

## File Tree
```
skills/
├── BROWSE.md
├── INDEX.md
├── authority-audit.md   — audit methodology for skill ownership chain
├── gotchas-upgrade.md   — common pitfalls during skill version upgrades
└── palantir-skill.md    — case study: palantir skill structure
```

## Cross-References
- `~/.claude/skills/` — user-scope implementations
- `~/.claude/plugins/*/skills/` — plugin-scope implementations
- `../claude-code/agent-design-opinion.md` — related agent authoring guidance

## Notes
Created 2026-04-17 (previously had no BROWSE/INDEX). Thin subdir; 3 files.
