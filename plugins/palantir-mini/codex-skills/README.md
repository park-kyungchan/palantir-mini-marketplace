# Codex Default Skill Surface

Codex loads plugin skill descriptions into the per-turn instruction surface.
The canonical palantir-mini skill library remains in `skills/`, but Codex
exports only a small default set through `.codex-plugin/plugin.json` to keep
per-turn context stable.

Each `codex-skills/<name>/SKILL.md` file is a thin pointer to the canonical
`skills/<name>/SKILL.md` file. Do not add business logic or workflow truth here.
If a workflow changes, update the canonical skill first and keep the Codex
wrapper as a short discovery entrypoint.

Selection rule:

- Keep front-door, ontology, audit, release, replay, reload, and compact-safe
  continuity entrypoints.
- Do not mirror every canonical skill into Codex defaults.
- Use MCP tools and canonical skill files for the full palantir-mini surface.
