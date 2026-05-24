---
title: DevCon Series — Developer Conference Evolution (DC1–DC5)
slug: devcon
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "AIPCon 9 / DevCon 5 (Mar 2026) + official DevCon pages", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# DevCon Series — Developer Conference Evolution (DC1–DC5)

> **Provenance:** Mixed — DevCon pages, official docs/announcements and public Palantir materials [Official], plus synthesis of DevCon 5 launch themes [Official-derived].
> **Schema anchors:** `HAL-01..03`, `PS-01..04`, `ODP-01..04`, `ORCH-01..06`, `PB-01..03`
> **Markers:** `[§DC1-nn]`..`[§DC5-nn]`

---

## [§DC1-01] DevCon 1 (Nov 2024) — SDK Foundation

- 150 commercial + government tech leaders at the inaugural developer event.
- **Launches:** AIP for Developers, Ontology SDK 2.0, Platform APIs, Workflow Builder, Multi-Modal Data Plane (private).
- **Beta surfaces:** Agent Studio, Platform Branching, Compute Modules.
- Signal: Palantir started formalizing ontology-backed software development as a builder discipline, not just an internal tradecraft.

## [§DC2-01] DevCon 2 (Mid 2025) — Builder Community

- Builder spotlights, product launches, and hackathon momentum.
- Signal: DevCon evolved from launch event into a recurring builder feedback loop.

## [§DC3-01] DevCon 3 (Sep 2025) — AI FDE Concept

- **Product launches:** Autopilot, AI FDE (first unveil), AIP Deployment at Scale.
- [§DC3-02] Early AI FDE framing: repetitive platform clicks should become agent-executable builder work.

## [§DC4-01] DevCon 4 (Nov 2025) — MCP + External Agents

**4 major launch clusters:**

1. [§DC4-02] **AIP Agents + Ontology MCP** — external agents can consume ontology-grounded tools.
2. [§DC4-03] **Workflow Builder** — ontology-backed workflow authoring.
3. [§DC4-04] **Provider API Proxy** — external model access with provenance + security.
4. [§DC4-05] **PACK + Custom Widgets** — ontology-backed application tooling.

**Code in production:** Eaton (process orchestration), Lear+Trinity (AI FDE), First Solar (Knowledge Nodes + Ontology SDK).

## [§DC5-01] DevCon 5 (Mar 11, 2026) — Human-Agent Builder Stack

> [Official] DevCon 5 happened on **March 11, 2026** in Miami, one day before AIPCon 9 (**March 12, 2026**).

DevCon 5 was not just a feature dump. It made a stronger architectural claim:

- coding-agent leverage should be translated into enterprise operations,
- the ontology system is the shared mutable state that lets this compound,
- frontend applications, agents, scenarios, and automations are all part of one builder surface.

### [§DC5-02] Opening Remarks — Conditions for Human-Agent Leverage

Akshay Krishnaswamy's opening framed modern coding-agent leverage around three conditions:

1. **High-bandwidth context transmission atop shared mutable state**
2. **Clear validation criteria** through structured phases or post-hoc analysis
3. **Feedback-driven optimization** through prompt refinement and agent definitions

This matters because the talk explicitly asks how to transfer coding-agent leverage into operations. The answer is not "make more dashboards"; it is to build a system where humans and agents act against a common, evolving operational model.

### [§DC5-03] Decision Space Infrastructure

The opening remarks define what must exist to operationalize agent leverage safely:

- **Real-time decision space encoding** — fragmented enterprise data must be represented at maximum fidelity.
- **Reasoning layer** — logic and workflow/process definitions must be encoded, not implied.
- **Security + governance** — these constraints must govern humans and agents alike.
- **Sandboxed evolution** — agents must be able to propose, review, and merge changes in safe structures before production.
- **Consequence simulation** — the system must support complex and cascading decision simulation, not just code-commit thinking.

Design consequence:
- Integration, orchestration, and validation must be agent-composable.
- Validation criteria must be rooted in real-world operational outcomes, not shallow post-hoc checks.
- The ontology is presented as the grounding mechanism for this entire decision space.

### [§DC5-04] Advanced Ontology — Product Journey

Landon Carter's ontology deep dive describes a 3-stage product journey:

1. **Golden tables** — get integrations and source data right.
2. **Operational decision-making** — encode kinetics via actions, logic, functions, and models.
3. **AI-first** — layer LLMs and automation atop already-captured kinetics.

Historical claim:
- Gotham/Foundry/AIP ontology capabilities are described as battle-tested, especially for extracting structure from unstructured operational data.
- The ontology is positioned as accumulated product depth, not something an AI lab can "magic into existence" overnight.

### [§DC5-05] Advanced Ontology — Four Design Principles

The session makes four ontology design principles explicit:

1. **Domain-Driven Design**
2. **Don't Repeat Yourself** (rule of three)
3. **Open for extension, closed for modification**
4. **Producer Extends, Consumer Super (PECS)**

The key conclusion is direct: these are software design principles because the ontology is effectively software for the organization.

### [§DC5-06] Advanced Ontology — Primitives That Matter

The ontology deep dive ties the design principles to specific primitives:

- **Interfaces** — polymorphic workflows, multiple inheritance, connection contracts, future-proof composition.
- **Structs** — semantically grouped compound data with metadata kept near the value.
- **Reducers** — collapse multi-value property histories into a canonical focus value while preserving history.
- **Struct main fields** — expose the most semantically relevant portion of a struct in UI/workflow surfaces.
- **Derived properties** — preserve normalized storage while encoding semantic business logic close to the ontology.
- **Object-backed link types** — keep relationship metadata when the relationship itself is semantically meaningful.

These are not isolated features. The session's point is that sophisticated ontology behavior emerges from layering primitives coherently rather than copying dataset shapes into the ontology unchanged.

### [§DC5-07] Agentic Acceleration at Army Software Factory

The Army Software Factory presentation provides a concrete legacy-modernization pipeline:

1. **Decompose** codebase into core components and ontology objects.
2. **Warn/Triage** obvious blockers and soft risks.
3. **Recon** each file into human-readable operational analysis.
4. **Decode** into pseudocode / execution stages.
5. **Encode** into target-language transforms with orchestrated sub-agents.
6. **Compile + validate** before the human-expert last mile.

Important builder lessons from the talk:

- The ontology is used as a **knowledge warehouse** for prior work and learned mappings.
- **Separation of concerns** matters: agents should have scoped responsibilities and curated context.
- **Pseudocode acts as a universal intermediate representation**, enabling language-agnostic translation pipelines.
- **Adversarial review** and explicit human checkpoints remain necessary for critical systems.
- The goal is not zero human involvement; it is to automate the first 90% so experts spend time on the hardest 10%.

### [§DC5-08] AI FDE — From Prototype to Compounding System

The AI FDE launch demo shows a layered builder loop:

1. Explore ontology data + documents
2. Draft logic
3. Generate eval suites
4. Run evals and inspect failures
5. Synthesize failure mode
6. Refine logic/prompt
7. Re-run until acceptable
8. Materialize user-facing agent workflow

Then the loop compounds further:

- operator rejection becomes ontology-linked feedback,
- AI FDE turns feedback into new eval cases and refined logic,
- another agent can improve the quality of future feedback itself.

This is the clearest DevCon 5 statement of **eval-driven development for ontology-grounded agents**.

### [§DC5-09] Developer Experience — Pro-Code CLI + Embedded Ontology

The Developer Experience launch reframes Foundry development around a pro-code local workflow:

- **Super repo** scaffolds ontology, functions, and app in one project.
- **Embedded Ontology** runs on the laptop without needing a live Foundry connection for core local iteration.
- **Hot-reload loops** propagate ontology changes through generated SDKs into the app quickly.
- **Local-first feedback** tightens the build-test-iterate loop for both developers and agents.
- **Open tooling posture** is emphasized: Nx/open-source orchestration, custom templates, no mandatory lock-in.

Official follow-through now exists in docs:
- Foundry publishes a dedicated **embedded ontology** guide for offline-capable client apps, including explicit `syncObjects`, Wasm CSP requirements, and optional diff-based peering.
- This turns "embedded ontology" from a conference claim into a concrete local-first runtime surface.

Most important implication:
- ontology definitions, backend logic, and frontend app structure are treated as one continuously propagating code surface.

### [§DC5-10] Ontology Foundations — Scenarios, Security, Transactions

The ontology foundations launch demonstrates a full human-agent operational loop:

- **Scenarios** are persisted ontology sandboxes for what-if planning.
- **Voice agents** reason over ontology constraints and propose operational options.
- **Object Security Policies** enforce row/property/cell-level visibility inside ontology-native workflows.
- **Workflow Lineage** exposes the backend tools and flows being used.
- **Transactions** guarantee all-or-nothing multi-step action behavior across reused functions.

Security is shown as multi-layered, especially for outbound/inbound agent workflows:

- network control,
- export controls / information security approval,
- model security / geo restrictions,
- identity verification and policy enforcement at runtime.

Official platform nuance after launch:
- **Object Views Branching** exists as a structural change surface, but January 2026 announcements explicitly said approvals were not yet supported for object-view changes on branches and listed full approvals integration on the roadmap.
- This clarifies a boundary: runtime scenario review and structural branch/proposal review are related governance patterns, but not the same surface.

Design consequence:
- agentic UI is not separate from ontology foundations; it is enabled by them.

---

## [§DC-EVO-01] Evolution Arcs

| Arc | DC1 (Nov 24) | DC3 (Sep 25) | DC4 (Nov 25) | DC5 (Mar 26) |
|-----|-------------|-------------|-------------|-------------|
| SDK / Builder | Ontology SDK 2.0 | — | Ontology MCP | Pro-Code CLI + Embedded Ontology |
| AI FDE | — | Concept unveiled | Customer demos | Eval-driven builder loop + app/automate creation |
| Agent Runtime | Agent Studio beta | — | External agents via MCP | Voice agents + scenario planners + automatic mode switching |
| Ontology Foundations | Core ontology tooling | — | — | Scenarios + OSP + transactions + security for agentic workflows |

## [§DC-SIG-01] Significance for Our System

- [§DC-SIG-02] DevCon 5 strengthens the claim that the ontology is the **shared mutable state** for human-agent builder systems.
- [§DC-SIG-03] Backend ontology alone is insufficient. Builder scope now clearly includes **applications, agent surfaces, scenarios, and automations**.
- [§DC-SIG-04] Minimal-HITL architecture depends on explicit validation and feedback loops, not just stronger prompts.
- [§DC-SIG-05] The Army pipeline validates a reusable modernization pattern: decompose → analyze → pseudocode → encode → validate.
- [§DC-SIG-06] The Developer Experience launch validates local-first ontology iteration and end-to-end propagation from ontology change to frontend breakage detection.
- [§DC-SIG-07] The Ontology Foundations launch validates sandbox-first human-agent teaming: scenarios, transactions, and policy enforcement are first-class, not optional add-ons.

---

## Sources

- https://www.palantir.com/devcon/
- https://www.palantir.com/devcon3/
- https://www.palantir.com/devcon4/
- https://x.com/PalantirTech/status/2031766327929524557
- https://x.com/PalantirTech/status/2031071480868430185
- https://www.palantir.com/docs/foundry/announcements/2026-03/
- https://www.palantir.com/docs/foundry/announcements/2026-01
- https://www.palantir.com/docs/foundry/developer-console/create-embedded-ontology-application/
