---
source: https://www.palantir.com/docs/foundry/architecture-center/overview/
fetched: 2026-04-20
section: architecture-overviews
doc_title: Architecture center — Overview
---

Note: This page has identical content to `architecture-center.md` (the index URL `/architecture-center/` redirects here). See `architecture-center.md` for full content.

## Summary

Palantir operates with a common architecture across 50+ verticals, consisting of three platforms:
- **Foundry** — core Data Operations platform
- **AIP** — Generative AI platform
- **Apollo** — continuous delivery platform (underpins both)

The heart of the architecture is the **Ontology system**, which integrates enterprise data, logic, action, and security policies into a unified representation.

Below the Ontology layer are three service families:
- **Data Services** — connectivity, transformation, virtualization, storage, health monitoring, management
- **Logic Services** — business rules authoring, ML model training, external model orchestration, LLM/GenAI integration, Model Ops and Agent Ops
- **Workflow Services** — interactive compute, event-driven and scheduled automations, pro-code and low-code authoring tools

Above the Ontology layer are: analytics, agents & automations, product delivery.

Architecture Center topics:
- Ontology system
- Multimodal Data Plane (MMDP)
- Reference architecture for AI-driven agentic workflows
- Infrastructure and security paradigms (Rubix)
