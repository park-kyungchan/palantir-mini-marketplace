---
source: official-builder-routing
fetched: 2026-04-23
section: palantir-developers
doc_title: Palantir developers landing page — canonical builder read order
citations:
  - https://www.palantir.com/docs/foundry/developers
  - https://www.palantir.com/docs/foundry/architecture-center/platforms
  - https://www.palantir.com/docs/foundry/architecture-center/ontology-system
---

# Palantir developers landing page — canonical builder read order

The current official entrypoint for builder-facing documentation is:

- `https://www.palantir.com/docs/foundry/developers`

As of **April 23, 2026**, that page organizes official learning around:

1. capabilities and products,
2. developer use cases,
3. featured examples,
4. SDKs and platform APIs,
5. announcements and release notes.

## Recommended read order for AI agents

### 1. Start with the developers landing page when the question is broad

Use the landing page when the prompt sounds like:

- "How do I build X on Palantir?"
- "Which official docs should I read first?"
- "What is the smallest deep-dive path for AIP / OSDK / Defense?"

The landing page gives the shortest official routing surface for:

- AIP
- ontology building
- developer toolchain
- application development
- OSDK / platform APIs
- product delivery
- security and governance

### 2. Drop into architecture only when you need platform shape

If the question is architectural rather than procedural, read:

1. `architecture-center/platforms`
2. `architecture-center/ontology-system`

This establishes the current official frame:

- AIP, Foundry, and Apollo form the integrated platform set.
- The Ontology is the shared operational representation for data, logic, action, and security.

### 3. Drop into product surfaces only when the task becomes concrete

- AIP builder question: read `build-with-aip.md`
- custom app / SDK question: read `application-building-path.md`
- defense / mission application question: read `defense-osdk.md`

## Minimal deep-dive budgets

- Broad builder orientation:
  landing page only.
- Product architecture:
  landing page + 1 architecture page.
- Concrete build task:
  landing page + 1 summary in this directory + 1 deep product page.

## Important boundary

The developers page is the best current **entrypoint**, but not always the best final source for exact mechanics. Once the builder path is clear, descend into:

- `../palantir-foundry/` for verbatim official product docs
- `../palantir-vision/` for our interpretation or local design reading
