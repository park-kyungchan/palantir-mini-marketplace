# palantir-developers/ — Query Router

> **Scope:** Official Palantir builder-entry layer rooted at `https://www.palantir.com/docs/foundry/developers`.
> **Authority:** Official routing layer. Summaries are curated from official docs and API references; exact product wording still lives in `../palantir-foundry/`.

## Open first by question

| Question | Open first |
|----------|------------|
| I need the current official builder read order for Palantir docs | `developers-overview.md` |
| I need to build with AIP and choose the right official deep-dive pages | `build-with-aip.md` |
| I need the custom app / OSDK / Developer Console path | `application-building-path.md` |
| I need Defense OSDK or MAVEN-adjacent design surfaces | `defense-osdk.md` |
| I need to map AI FDE, AIP Evals, AIP Chatbot/Agent Studio, or Palantir MCP into local agent workflows | `build-with-aip.md` |
| I need the official builder entrypoint for Lead intent-to-Digital-Twin or semantic ambiguity closure work | `build-with-aip.md` -> `../palantir-foundry/BROWSE.md` -> `../palantir-vision/architecture-gap/BROWSE.md` |
| I need raw official detail after this summary | `../palantir-foundry/BROWSE.md` |

## Minimal read recipes

- General orientation:
  `developers-overview.md` -> one linked deep page only if the question remains unresolved.
- AIP builder question:
  `build-with-aip.md` -> one of `../palantir-foundry/aip/BROWSE.md` or `../palantir-foundry/architecture/BROWSE.md`.
- Custom app question:
  `application-building-path.md` -> one of `../palantir-foundry/dev-toolchain/BROWSE.md` or AIP Chatbot API docs.
- Defense / MAVEN design question:
  `defense-osdk.md` -> `~/docs/research-synthesis/2026-04-23-maven-defense-osdk-design-reading.md` (migrated 2026-05-01) if interpretation is needed.
- AI agent trend question:
  `build-with-aip.md` -> `../palantir-vision/aipcon-devcon/BROWSE.md` for local synthesis -> `../palantir-foundry/aip/BROWSE.md` for product mechanics.
- Lead intent-to-Digital-Twin question:
  `build-with-aip.md` -> `../palantir-foundry/aip/BROWSE.md` + `../palantir-foundry/dev-toolchain/BROWSE.md` + `../palantir-foundry/ontology/BROWSE.md` -> `../palantir-vision/architecture-gap/BROWSE.md` -> `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md`.

## Stop when

- You can name the official entrypoint, the next 1-2 documents to read, and the boundary of what is still not covered.
- Do not keep descending if the answer is already clear from this layer.

## Escalate to

- `../palantir-foundry/` for verbatim official docs.
- `../palantir-vision/` for our synthesis, architectural interpretation, or local mapping.

## Do not use for

- Project runtime behavior.
- Internal policy or local implementation authority.
- Historical pre-restructure path recovery. No active archive route exists in this checkout; recover from git history or old PR context.

## Local palantir-mini boundary note (corrected 2026-05-09)

This directory is only the official Palantir builder-entry router. Local `palantir-mini` plugin internals are not official Palantir developer docs and should not be maintained here as product facts.

For local control-plane substrate, use:

- `~/.claude/plugins/palantir-mini/CHANGELOG.md`
- `~/.claude/plugins/palantir-mini/.claude-plugin/plugin.json`
- `~/.claude/plugins/palantir-mini/bridge/mcp-server.ts`
- `~/.claude/plans/` for internal gap analyses and rollout plans.
