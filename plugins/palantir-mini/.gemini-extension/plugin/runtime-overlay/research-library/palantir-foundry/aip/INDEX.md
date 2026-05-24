# palantir-foundry/aip/ — Structure Index

Structural reference for the official AIP doc subset.

## Role contract

- Verbatim official AIP docs only.
- Use this directory when exact product mechanics matter.
- Start at `../../palantir-developers/build-with-aip.md` first if you need the smallest official read path.

## Coverage snapshot

| Family | Coverage |
|--------|----------|
| AIP core | overview, getting started, models, provider APIs, security, observability, ethics, BYOM |
| AIP Chatbot Studio | overview, core concepts, getting started, application state, retrieval context, citations, tools, APIs, marketplace, chatbots as functions |
| AI FDE | overview, navigation, modes and skills, security and governance, best practices |
| AIP Evals | overview, suite creation, experiments, results datasets, dashboards, ontology edits |
| AIP Analyst | overview, core concepts, analysis configuration, Workshop widget |
| AIP Assist | overview, best practices, custom content, integrations, suggested actions |

## Naming note

Local filenames retain the legacy `agent-studio-*` slug family, but the current official product name is **AIP Chatbot Studio**.

## Preferred read order

- Broad AIP architecture:
  `aip-overview.md` -> `../architecture/architecture-center-aip-architecture.md`
- Chatbot builder:
  `agent-studio-overview.md` -> `agent-studio-core-concepts.md` -> `agent-studio-foundry-apis.md`
- Eval-driven iteration:
  `ai-fde-overview.md` -> `aip-evals-overview.md`

## Maintenance

- Preserve file names as fetched.
- Update prose and routing notes when product naming changes.
