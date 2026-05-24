---
source: https://www.palantir.com/docs/foundry/architecture-center/platforms/
fetched: 2026-04-20
section: architecture-overviews
doc_title: Integrated platforms: AIP, Foundry, and Apollo
---

## Integrated platforms: AIP, Foundry, and Apollo

The standard Palantir architecture consists of three integrated platforms: AIP, Foundry, and Apollo.

- **Apollo** — the continuous delivery platform that manages the underlying infrastructure that hosts both Foundry and AIP services. Apollo enables the orchestration of thousands of zero-downtime upgrades across hundreds of services and assets every day.
- **Foundry** — the foundational data operations platform, which provides the core capabilities for data management, logic authoring, Ontology development, analytics, and workflow development.
- **AIP** — the generative AI platform, which provides secure connectivity to large language models through the "k-LLM" paradigm, a development toolchain for building agents and automations, an array of AI-enabled end user applications, a comprehensive Evals framework for governing AI workflows in production, and more.

### AIP, Foundry, and Apollo: An Enterprise Operating System

The integrated AIP + Foundry + Apollo architecture is designed to function as an Enterprise Operating System.

Nine capability sets:
- **Ontology Language**, **Ontology Engine**, **Ontology Toolchain** — collectively constitute the Ontology system
- **Data Services**, **Logic Services**, **Workflow Services** — power the Ontology system
- **Analytics & Applications**, **Automations**, **Product Delivery** toolchain — what users wield to achieve goals

Each of these nine capability sets holistically leverage six mesh-wide components: **Storage**, **Compute**, **Networking**, **Security**, **Governance**, and the **Workspace**. All of these components are powered by Apollo.

Use cases: AI-enabled care operations at major hospital systems, integrated network planning for major airlines, electric operations and wildfire response for America's largest utilities, full spectrum military operations across the United States and allied nations.

### Unified security architecture

A unified security architecture spans all three platforms in three main spheres:

- **Infrastructure security** — every component in the Palantir service mesh operates with zero trust (access-gated based on identity, device health, and verification) with an expectation of hostile attacks and autonomous enforcement (Apollo-mandated encryption, firewalls, runtime configurations).
- **Platform security** — strict enforcement of access scopes for both humans and agents, granular role-based, marking-based, and purpose-based access controls which connect with automated lineage and auditing.
- **Enterprise security** — encryption, audit logging, authorization, and authentication configurations deeply integrated with an organization's existing identity providers, information security tools, and architectural patterns.

### Extensibility and interoperability

The standard AIP + Foundry + Apollo architecture is designed to be extended and deeply integrated with other services and applications.

Palantir's Compute Modules framework allows developers to securely bring their own containers (such as containerized LLMs, optimizers, data processing runtimes, or end-to-end applications) into the Apollo-managed mesh.

Examples of extended architectures:
- Palantir Gotham — defense offerings completely integrated with the standard architecture, including multimodal applications and tools powered by the Foundry-managed Ontology.
- Airbus Skywise — entire aviation ecosystem built through custom offerings extending the standard architecture.
- Fujitsu — set of specialized agentic applications using Foundry and AIP's developer toolchains.
- Andretti Racing — "RaceOS" connecting real-time car performance into AI-powered applications.
- "Palantir for Hospitals" — applications on top of the Palantir architecture.
- "Palantir Warp Speed" — operating system for manufacturing.
- "Palantir Defense" — specialized for demanding, high-stakes use cases.

### Pursuing alpha

The goal of the standard architecture is to deliver non-standard results: extreme differentiation through maintainable customization.

A successful Palantir deployment is one where the enterprise is pursuing "alpha" — generating outsized returns by building around their differentiation, infusing their particularities into their ontology, and adapting in real-time to complex operational conditions to pursue their strategic objectives.

### Forward Deployed Engineering

The dynamism of AIP, Foundry, and Apollo collectively reflects a product development paradigm known as Forward Deployed Engineering, which can be thought of as the human equivalent of backpropagation. Palantir engineers are deeply embedded in critical environments around the world, from war zones to factory floors, walking many miles alongside customers, and tirelessly working to build and ship new features.
