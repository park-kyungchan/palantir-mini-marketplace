---
source: official-builder-routing
fetched: 2026-04-23
section: palantir-developers
doc_title: Application building path — OSDK, Developer Console, Platform APIs
citations:
  - https://www.palantir.com/docs/foundry/developers
  - https://www.palantir.com/docs/foundry/chatbot-studio/foundry-apis/
  - https://www.palantir.com/docs/foundry/architecture-center/ontology-system
---

# Application building path — OSDK, Developer Console, Platform APIs

## Official builder path

When the task is "build a custom application on top of Palantir", the developers page points agents toward:

1. OSDK React applications
2. Developer Console application tutorial
3. Platform APIs
4. Foundry DevOps

That is the canonical official path from ontology-backed backend to deployable custom app.

## What to read first

### General custom app question

1. developers landing page
2. OSDK / application-building entry
3. Platform APIs only if the app needs external or lower-level integration

### Chatbot-backed app question

If the app embeds an AIP Chatbot:

1. `chatbot-studio/foundry-apis`
2. OSDK / Developer Console docs

Important official constraint:

- the application must be configured with the ontology resources, project access, and API operations used by the chatbot
- if the chatbot uses additional project resources, those resources must also be granted to the app

## Design implication

Official Palantir app building is not "frontend first". The shape is:

1. ontology scope
2. builder surfaces in Developer Console
3. generated or selected SDK/API surface
4. deployable application

That matches the Ontology-system framing in architecture docs:

- language
- engine
- toolchain

The app is downstream of ontology and toolchain, not a separate truth source.

## When to escalate

- Need verbatim repo/tooling docs:
  `../palantir-foundry/dev-toolchain/BROWSE.md`
- Need AIP-specific embedding details:
  `../palantir-foundry/aip/BROWSE.md`
