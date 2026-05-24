# palantir-developers/ — Structure Index

Structural reference for the official builder-entry layer under `~/.claude/research/palantir-developers/`.

## Role contract

- This directory is the **official builder-entry SSoT** for AI agents that need the smallest reliable path into Palantir documentation.
- It is not a verbatim mirror of Palantir docs. It is a curated routing layer built from official Palantir sources.
- Exact product mechanics still belong to `../palantir-foundry/`.
- Interpretation and local meaning-making still belong to `../palantir-vision/`.

## Directory map

| Path | Role | Provenance |
|------|------|------------|
| `developers-overview.md` | Canonical read order from the developers landing page | [Official] |
| `build-with-aip.md` | AIP builder path, naming drift, and deep-dive routing | [Official] |
| `application-building-path.md` | OSDK, Developer Console, Platform APIs, app-delivery route | [Official] |
| `defense-osdk.md` | Defense OSDK builder path and MAVEN-adjacent design surface | [Official] |

## Provenance

- Root entrypoint: `https://www.palantir.com/docs/foundry/developers`
- Supporting docs and API references:
  - `https://www.palantir.com/docs/foundry/aip/overview/`
  - `https://www.palantir.com/docs/foundry/architecture-center/aip-architecture/`
  - `https://www.palantir.com/docs/foundry/chatbot-studio/overview/`
  - `https://www.palantir.com/docs/foundry/chatbot-studio/foundry-apis/`
  - `https://www.palantir.com/docs/foundry/announcements/`
  - `https://www.palantir.com/docs/defense-osdk/api`
  - `https://www.palantir.com/docs/defense-osdk/api/common/overview/about`
  - `https://www.palantir.com/docs/defense-osdk/api/targetingFires/overview/about/`

## Maintenance rules

- Keep this directory thin. It should reduce deep-dive cost, not become a second full research library.
- When official product names change, update routing notes here first, then reconcile deeper router files.
- When a route summary points into `../palantir-foundry/`, keep the link exact and current.
