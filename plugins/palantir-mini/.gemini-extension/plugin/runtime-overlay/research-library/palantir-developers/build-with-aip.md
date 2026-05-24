---
source: official-builder-routing
fetched: 2026-04-23
section: palantir-developers
doc_title: Build with AIP — official builder path and naming notes
citations:
  - https://www.palantir.com/docs/foundry/developers
  - https://www.palantir.com/docs/foundry/aip/overview/
  - https://www.palantir.com/docs/foundry/architecture-center/aip-architecture/
  - https://www.palantir.com/docs/foundry/chatbot-studio/overview/
  - https://www.palantir.com/docs/foundry/announcements/
---

# Build with AIP — official builder path and naming notes

## Canonical official read order

For an AIP build question, the lowest-cost official route is:

1. developers landing page
2. `aip/overview`
3. `architecture-center/aip-architecture`
4. product-specific deep page:
   - AIP Chatbot Studio
   - AI FDE
   - AIP Evals
   - AIP Logic

## What each page answers

- `aip/overview`
  answers what AIP is, where it sits relative to Foundry and Apollo, and what builder surfaces exist.
- `architecture-center/aip-architecture`
  answers how AIP composes with the Ontology, models, tools, governance, and lifecycle.
- `chatbot-studio/overview`
  answers how interactive assistants are built and deployed.
- `ai-fde/overview`
  answers how Palantir frames conversational builder agents for platform work.
- `aip-evals/overview`
  answers how evaluation and iteration are governed.

## Naming drift that agents must handle

As of **April 21, 2026**, Palantir's announcements page states:

- **AIP Agent Studio is now AIP Chatbot Studio**
- **AIP Agents are now AIP Chatbots**

Practical consequence:

- current canonical product name: **AIP Chatbot Studio**
- legacy doc slugs and APIs still often contain `agent-studio` or `aip-agents`
- internal router files should preserve legacy slugs where they are literal filenames, but prose should prefer the current product name

## Smallest official deep-dive sets

### "What is the AIP stack?"

1. `aip/overview`
2. `architecture-center/aip-architecture`

### "How do I build and ship an interactive agent/chatbot?"

1. `chatbot-studio/overview`
2. `chatbot-studio/foundry-apis`
3. `../application-building-path.md` if custom app integration is involved

### "How does Palantir make agent iteration safe?"

1. `ai-fde/overview`
2. `aip-evals/overview`
3. `architecture-center/aip-architecture`

## Escalate to verbatim docs

- `../palantir-foundry/aip/BROWSE.md`
- `../palantir-foundry/architecture/BROWSE.md`
