# Codex Skill Export Surface

Codex loads plugin skill descriptions from the directory named by
`.codex-plugin/plugin.json#skills`. For palantir-mini this is `./codex-skills/`.
The canonical palantir-mini skill library remains in `skills/`, but Codex must
not default-inject that canonical tree.

Each `codex-skills/<name>/SKILL.md` file is a thin pointer to the canonical
`skills/<name>/SKILL.md` file. Do not add business logic or workflow truth here.
If a workflow changes, update the canonical skill first and keep the Codex
wrapper as a short discovery entrypoint.

## Why this subset exists (intent)

The canonical `skills/` tree carries the **full** palantir-mini skill library
(45 skills, excluding `_shared`). Codex does **not** default-inject that whole
tree: every entry under `skills` in `.codex-plugin/plugin.json` becomes a
discoverable Codex default, so mirroring all 45 would flood the Codex skill
surface with maintenance, replay, retention, and triage helpers that a Codex
operator rarely needs as a front door. This directory is therefore a curated
**8-skill export subset** — the smallest set that covers the Codex operator's
primary loop (state the intent, build, validate, release) plus the two runtime
helpers Codex needs to recover and resume — while the remaining 37 canonical
skills stay reachable on demand through `skills/`.

## How the subset maps to the full skill set

Each exported wrapper self-classifies (via its own `category:` frontmatter) into
one of three Codex-export buckets. The mapping below is the authoritative
subset → full-set view:

| Codex export bucket | Exported wrappers | Canonical source |
|---------------------|-------------------|------------------|
| `codex-core` (front-door + ontology) | `pm-semantic-intent-gate`, `pm-orchestrate`, `pm-ontology-engineering-lead` | `../skills/pm-semantic-intent-gate/`, `../skills/pm-orchestrate/`, `../skills/pm-ontology-engineering-lead/` |
| `codex-release` (validation + ship) | `pm-verify`, `pm-review`, `pm-ship` | `../skills/pm-verify/`, `../skills/pm-review/`, `../skills/pm-ship/` |
| `codex-runtime` (recover + resume) | `pm-mcp-reload`, `pm-recap` | `../skills/pm-mcp-reload/`, `../skills/pm-recap/` |

Everything **not** in the table above is intentionally excluded from the Codex
default surface and lives only in the canonical `skills/` tree, including:

- diagnostics / self-test — e.g. `../skills/pm-self-test/`, `../skills/pm-investigate/`
- replay & lineage — e.g. `../skills/pm-replay/`, `../skills/pm-lineage/`
- retention / pruning — e.g. `../skills/pm-rule-memory-prune/`, `../skills/pm-value-audit/`
- dirty-state triage & DTC fill — e.g. `../skills/pm-dirty-classify/`, `../skills/pm-dtc-fill/`
- research — e.g. `../skills/pm-research/`

These are still fully usable in Codex by reading the canonical skill directly;
they are simply not promoted as discoverable defaults. A future PR may add a
smaller dev-only export surface for some of them (see the selection rule below).

Selection rule:

- Keep front-door, ontology, validation, reload, compact-safe continuity, and
  explicit release entrypoints.
- Do not mirror every canonical skill into Codex defaults.
- Keep diagnostics, replay, retention, dirty-state triage, and DTC fill helpers
  in the canonical `skills/` tree unless a future PR provides a smaller dev-only
  export surface.
- Treat `agents/*.md` as role recipes, not native Codex agents, unless a future
  runtime adapter explicitly exports and smoke-tests an agent surface.
