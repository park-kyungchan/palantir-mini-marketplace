---
title: Ontology Philosophy
slug: readme
fileClass: vision-philosophy
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Ontology Philosophy

> **Layer:** Meta (above domains)
> **Purpose:** Explains WHY the ontology exists and the cognitive frameworks that govern its design.
> **Audience:** Any LLM session or developer that needs to understand the foundational reasoning before working with domain schemas.
> **Provenance:** Mixed — official Palantir blog/docs quotes and product framing [Official], plus local synthesis into a philosophy layer above domain schemas [Inference].
> **Schema anchors:** `WL-01..05`, `REF-01..05`, `LES-01..05`, `PB-01..03`, `ORCH-01..06`

## [§PHIL.R-01] The Ontology as Decision-Centric Operating System

The Palantir Ontology is not a database schema, an API definition, or a BI tool configuration. It is the **context store of operations** — converging toward becoming the **operating system of the enterprise**. As Chief Architect Akshay Krishnaswamy states:

> "The Ontology is designed to represent the DECISIONS in an enterprise, not simply the data. The prime directive of every organization is to execute the best possible decisions, often in real-time, while contending with internal and external conditions that are constantly in flux."

The Ontology captures three layers:

1. **The current state of the world** (DATA) — what exists right now
2. **How to think about that state** (LOGIC) — reasoning, connections, derivations
3. **Levers to affect the real world** (ACTION) — mutations that change reality

This tripartite structure mirrors how human organizations actually operate. A hospital does not just store patient records (DATA). It encodes clinical decision pathways (LOGIC) and treatment protocols (ACTION). The ontology makes all three layers explicit, typed, and machine-readable.

**[Official — AIPCon 9, March 12, 2026]** The D/L/A framing was articulated on-stage by Palantir Architect Chad Wahlquist:

> "Our whole ethos at Palantir is how do I take the data, the logic, and then turn those into actions."

> "The semantics HAVE to be more than just data, and they have to be modeled how the real world is actually working, not how some BI tool needs it."

### [§PHIL.R-02] Decision Lineage

Every decision made through the Ontology is automatically captured as an artifact with full context:
- **WHEN** the decision was made
- **ATOP WHICH** version of enterprise data
- **THROUGH WHICH** application
- **BY WHOM** (human or AI agent)
- **WITH WHAT** reasoning

Decision lineage is the LEARN mechanism of the digital twin feedback loop made concrete — every decision feeds back into the Ontology, enriching future decisions. This transforms tribal knowledge encoding from a one-time capture into a continuous refinement process.

### [§PHIL.R-03] K-LLM: Multi-Model Consensus

> **[Official — CTO Shyam Sankar, AIP product update]** "K-LLM" IS an official Palantir concept — CTO Shyam Sankar presented "K-LLMs, not LLMs" publicly, and Palantir Technologies posted about it on LinkedIn ("Never use 1 LLM when you can use K-LLMs"). The specific developer quote below is from a practitioner statement. Our CC application (multiple sessions reading semantics.ts) is [Inference].

K-LLM uses multiple LLMs (from different providers) reasoning against the same Ontology. When independent models arrive at the same conclusion backed by Ontology data, the probability of hallucination is very low — consensus through grounded agreement rather than single-model confidence. Our schema system implements K-LLM by construction: every Claude Code session reads the same `semantics.ts` typed constants, producing consensus output verified by the same test suite.

### [§PHIL.R-04] Three Hallucination Reduction Patterns

The Ontology provides three official patterns for grounding LLMs (see [llm-grounding.md](llm-grounding.md) for full treatment):

1. **OAG (Ontology-Augmented Generation)** — LLMs query the Ontology for trusted data instead of hallucinating answers
2. **Logic Tool Handoff** — LLMs delegate computation to deterministic LOGIC functions instead of approximating
3. **Human-in-the-Loop Action Review** — AI-proposed actions pass through structured review gates before execution

### [§PHIL.R-05] Progressive Autonomy

> **[Inference from AIPCon deployment demos + developer statement]** The PA-01..PA-05 five-level system is our analytical framework. Official Palantir mechanism is binary: staged review vs auto-apply.

The Ontology enables a 5-level progression from human-directed to AI-autonomous operations:

| Level | Mode | Example |
|-------|------|---------|
| 1 | Monitor | Dashboard shows anomalies |
| 2 | Recommend | "Consider rebalancing sector X" |
| 3 | Approve-then-act | AIP Automate staged review |
| 4 | Act-then-inform | Automated maintenance scheduling |
| 5 | Full autonomy | Algorithmic trading within risk limits |

## [§PHIL.R-06] The 4-Stage Semantic Compilation Pipeline

Semantic compilation transforms ambiguous business language into precise, executable operations:

```
Stage 1: Business Language (natural, ambiguous)
    ↓  Domain experts describe their world in natural language
Stage 2: Domain Modeling (objects, properties, links, actions)
    ↓  Ontology engineers formalize concepts into typed definitions
Stage 3: Schema Compilation (indexed, queryable, executable)
    ↓  Schemas compile definitions into platform-specific artifacts
Stage 4: Logic Binding + Action Execution
    ↓  Functions bind to the model; actions execute against reality
```

Each stage reduces ambiguity. By Stage 4, every concept has a single, verifiable meaning. This is how the ontology serves as a **hallucination reduction mechanism** for LLMs — see [llm-grounding.md](llm-grounding.md).

Three dimensions of correctness govern the pipeline:
- **Abstract correctness** — the ontology accurately models the domain
- **Runtime correctness** — compiled operations execute faithfully at scale
- **Commercial correctness** — the system delivers measurable business value

## [§PHIL.R-07] Ontology-Oriented Software Development (OOSD)

OOSD is the paradigm where developers write code using business concepts instead of technical primitives. Four principles:

1. **Code in Business Language:** Business concepts (Airplanes, Flight Schedules, Airports) become first-class API objects — not rows, columns, or joins
2. **Abstraction of Implementation:** Internal storage, indexing, and query optimization are hidden behind the Ontology's semantic layer
3. **Marginal Cost → Zero:** The OSDK drives the marginal cost of bespoke enterprise software toward zero by generating typed clients from ontology definitions. AIPCon 9 (March 2026) provided first empirical evidence: 4 production applications built in 24 hours (battery manufacturer), SAP migrations reduced from 2+ years to 2 weeks, 5-year replatforming compressed to <1 year via "granular technical ontology" — Ted Mabrey (Global Head of Commercial, 16 years at Palantir) described this as a "step change" in deployment velocity. See `platform/aipcon.md §2.9`.
4. **Defragmented Enterprise:** Isolated systems (ERP, CRM, sensors, BI tools) integrate into a holistic semantic model

OOSD's implication for our system: `ontology/*.ts` files ARE the business language. `schemas/` files ARE the compilation rules. `convex/` output IS the executable result.

## [§PHIL.R-08] The Developer's Core Statement

> "You need the data, logic, and actions modeled in the context of your operations. The semantics HAVE to be more than just data, and they have to be modeled how the real world is actually working, not how some BI tool needs it."

This statement is the philosophical anchor of the entire system. It motivates:
- **Operational Context Modeling** (`OPERATIONAL_CONTEXT_EXAMPLES` in semantics.ts) — 5 real-world deployments decomposed into DATA/LOGIC/ACTION/LEARN
- **Twin Fidelity Dimensions** (`TWIN_FIDELITY_DIMENSIONS`) — 5 ways semantic modeling prevents twin drift
- **Twin Maturity Stages** (`TWIN_MATURITY_STAGES`) — the progression from Snapshot to Living System, where Stage 3 (Model) is the critical inflection point where LOGIC enters

## [§PHIL.R-09] Philosophy Files

| File | Content | Key Concept |
|------|---------|-------------|
| [tribal-knowledge.md](tribal-knowledge.md) | How to discover and encode expert knowledge into DecisionHeuristic constants | Expert patterns → typed constants, 5-stage progression |
| [llm-grounding.md](llm-grounding.md) | Ontology as hallucination reduction mechanism for LLM sessions + ontology-grounded agents | Semantic integrity + consistency, agent tool surfacing |
| [digital-twin.md](digital-twin.md) | SENSE-DECIDE-ACT-LEARN feedback loop, 3 LEARN mechanisms, twin fidelity, governance-enables-autonomy | Continuous operational improvement, semantic modeling |
| [ontology-ultimate-vision.md](ontology-ultimate-vision.md) | Deep dive: Palantir's ultimate direction — AIPCon 6-9, NVIDIA partnership, enforcement mechanisms, operational context modeling | Decision-centric OS, K-LLM, COA/Scenarios, self-healing enterprise |

## [§PHIL.R-10] Relationship to Domains

```
philosophy/          ← WHY the ontology exists (meta-layer)
    ↓ motivates
data/ logic/ action/ security/ ← WHAT the ontology contains (domain layer)
    ↓ formalized into
schemas/ontology/    ← HOW the ontology is specified (typed constants)
    ↓ compiled at skill-time
convex/ + src/       ← WHERE the ontology is implemented (adapter output)
```

Philosophy never overrides domain definitions. It provides the cognitive framework that makes domain decisions consistent across sessions.

### [§PHIL.R-11] Typed Constants Derived from Philosophy

| Philosophy Concept | semantics.ts Constant | Test Group |
|---|---|---|
| Decision Lineage | `DECISION_LINEAGE` (5 dimensions) | DS-10 |
| 3 Hallucination Reduction Patterns | `HALLUCINATION_REDUCTION_PATTERNS` (HRP-01..03) | DS-10 |
| Tribal Knowledge 5-Stage | `TRIBAL_KNOWLEDGE_PROGRESSION` (stages 1..5) | DS-10 |
| 4-Stage Compilation Pipeline | `SEMANTIC_COMPILATION_PIPELINE` (stages 1..4) | DS-10 |
| K-LLM Multi-Model Consensus | `K_LLM` (mechanism, implementation, principle) | DS-10 |
| OOSD 4 Principles | `OOSD_PRINCIPLES` (OOSD-01..04) | DS-10 |
| Progressive Autonomy | `PROGRESSIVE_AUTONOMY_LEVELS` (PA-01..05) | DS-11 |
| Operational Context Modeling | `OPERATIONAL_CONTEXT_EXAMPLES` (OCE-01..05) | DS-13 |
| 3 LEARN Mechanisms | `LEARN_MECHANISMS` (LEARN-01..03) | DS-14 |
| Action Governance 5 Dimensions | `ACTION_GOVERNANCE` (AG-01..05) | DS-14 |
| Twin Fidelity | `TWIN_FIDELITY_DIMENSIONS` (TF-01..05) | DS-15 |
| Twin Maturity | `TWIN_MATURITY_STAGES` (stages 1..5) | DS-15 |

## [§PHIL.R-12] Sources

- https://blog.palantir.com/ontology-oriented-software-development-68d7353fdb12
- https://www.palantir.com/platforms/ontology/
- https://www.palantir.com/platforms/foundry/digital-twin/
- https://theaiarchitects.substack.com/p/palantirs-digital-twin-building-the
- https://blog.pebblous.ai/project/CURK/ontology/enterprise-ontology-paradigm/en/
