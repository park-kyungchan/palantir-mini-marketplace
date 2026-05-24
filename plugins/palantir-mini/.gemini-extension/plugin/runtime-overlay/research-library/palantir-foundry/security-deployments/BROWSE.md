# palantir-foundry/security-deployments/ — Query Router

> **Scope:** Official Apollo Core + Foundry Administration docs fetched 2026-04-20. 50 official pages plus routing docs.
> **Provenance:** `[Official]` verbatim.

## Open first by question

| Question | File |
|----------|------|
| What is Apollo overall? | `apollo-core-introduction.md`, `apollo-core-overview.md` |
| How does Apollo deploy software? | `apollo-core-how-apollo-works.md`, `apollo-core-release-channels.md` |
| What are Apollo environments, entities, products, and modules? | `apollo-core-environments.md`, `apollo-core-entities.md`, `apollo-core-products-releases-versions.md`, `apollo-core-modules.md` |
| How do Apollo auth and authorization work? | `apollo-core-authentication.md`, `apollo-core-authorization.md` |
| How do I publish or connect environments? | `apollo-core-ci-publish-setup.md`, `apollo-core-connect-spoke.md` |
| What does Foundry Administration cover? | `foundry-administration.md` |
| How do domains, ingress/egress, logging, or scoped sessions work? | exact `foundry-administration-configure-*.md` file |

## Minimal deep-dive sets

### Apollo mental model

1. `apollo-core-overview.md`
2. `apollo-core-how-apollo-works.md`
3. `apollo-core-products-releases-versions.md`

### Apollo security and change control

1. `apollo-core-authentication.md`
2. `apollo-core-authorization.md`
3. `apollo-core-release-channels.md`

### Foundry Administration

1. `foundry-administration.md`
2. one exact `configure-*` page for the administrative surface in question

## Explicit boundary

This directory is **not** the full platform security corpus. For other security questions, also check:

- `../architecture/security-overview.md`
- `../aip/aip-aip-security.md`

Do not treat Apollo + administration as the entire security model.

## 2026-05-06 W1.A SSoT-1 mirror refresh batch (1 dated file)

| Date anchor | File | Topic |
|-------------|------|-------|
| 2026-03 / 04 / 05 | `announcements-2026-03-04-05-aipcon9-bundle.md` | Combined Foundry announcements bundle (AIP-only entries) — March/April/May 2026. Covers AI FDE GA (2026-03-12), Ontology MCP × Copilot Studio (2026-03-26), AIP Evals × AI FDE integration (2026-04-14), Claude Opus 4.7 GA (2026-04-21), AIP Agent → AIP Chatbot rebrand (2026-04-22), Global Branching GA (2026-05-05 / eff. 2026-05-18), GPT-5.5 (2026-05-05). Cross-ref: rule 12 v3.3.0 §Model policy. |
