# Codex Skill Export Surface

Codex loads plugin skill descriptions from the directory named by
`.codex-plugin/plugin.json#skills`. For palantir-mini this is `./codex-skills/`.
The canonical palantir-mini skill library remains in `skills/`, but Codex must
not default-inject that canonical tree.

Each `codex-skills/<name>/SKILL.md` file is a thin pointer to the canonical
`skills/<name>/SKILL.md` file. Do not add business logic or workflow truth here.
If a workflow changes, update the canonical skill first and keep the Codex
wrapper as a short discovery entrypoint.

Exported default/explicit set:

- `pm-semantic-intent-gate`
- `pm-orchestrate`
- `pm-ontology-engineering-lead`
- `pm-verify`
- `pm-recap`
- `pm-mcp-reload`
- `pm-review`
- `pm-ship`

Selection rule:

- Keep front-door, ontology, validation, reload, compact-safe continuity, and
  explicit release entrypoints.
- Do not mirror every canonical skill into Codex defaults.
- Keep diagnostics, replay, retention, dirty-state triage, and DTC fill helpers
  in the canonical `skills/` tree unless a future PR provides a smaller dev-only
  export surface.
- Treat `agents/*.md` as role recipes, not native Codex agents, unless a future
  runtime adapter explicitly exports and smoke-tests an agent surface.
