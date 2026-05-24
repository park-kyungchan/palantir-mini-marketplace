---
title: LLM Grounding via Ontology
slug: llm-grounding
fileClass: vision-philosophy
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# LLM Grounding via Ontology

> **Philosophy:** How the ontology acts as a hallucination reduction mechanism for LLM sessions.
> **Key insight:** "Using the Ontology as the grounding mechanism is one of the best ways to reduce hallucinations."
> **Provenance:** Mixed — official Palantir grounding and hallucination-reduction material [Official] plus local K-LLM / runtime-neutral synthesis [Inference].
> **Schema anchors:** `LLMI-01..03`, `MCP-01..03`, `WL-01..05`, `PB-01..03`
> **Legacy path note:** Legacy inline references to `research/palantir/` in this document refer to the pre-2026-04-20 layout. Current routing begins at `~/.claude/research/BROWSE.md`.

## [§PHIL.LG-01] The Grounding Problem

Without ontological grounding, each LLM session:
- **Hallucinates structure** — invents field names, table shapes, and relationships
- **Resolves ambiguity differently** — "is a link DATA or LOGIC?" gets different answers
- **Drifts from prior decisions** — session N contradicts session N-1
- **Cannot verify its own output** — no typed contract to check against

With ontological grounding:
- **Structure is prescribed** — typed constants define every valid concept
- **Ambiguity has a protocol** — `semanticQuestion` is the tiebreaker
- **Decisions persist** — DecisionHeuristics survive across sessions
- **Output is verifiable** — the shared meta-suite and project-local tests enforce schema compliance

## [§PHIL.LG-02] Two Pillars of Grounding

### [§PHIL.LG-03] Semantic Integrity

Every definition is **internally complete** — no gaps for LLM sessions to fill differently.

| Without Integrity | With Integrity |
|-------------------|---------------|
| "Properties have types" | "Properties have one of 19 BasePropertyTypes: string, integer, long, float, double, boolean, date, timestamp, geopoint, geoshape, attachment, mediaReference, timeseries, cipher, struct, vector, marking, FK, BrandedType" |
| "Links connect entities" | "Links have 4 cardinalities (1:1, M:1, 1:M, M:N) and 3 backing mechanisms (FK, join table, object-backed)" |
| "Actions change data" | "Actions follow a 2-tier architecture: Tier 1 (7 declarative rule types) or Tier 2 (1 exclusive function-backed rule)" |

Integrity means the definition itself contains all information needed to use it correctly. No supplementary context required.

### [§PHIL.LG-04] Semantic Consistency

No two definitions **contradict** — no contradictions for LLM sessions to resolve differently.

| Without Consistency | With Consistency |
|--------------------|-----------------|
| "Derived properties are DATA" + "Derived properties compute from links (LOGIC)" | Transition zone: structural home is DATA, semantic domain is LOGIC. SH-02 resolves: "If I deleted all LOGIC, would this still describe reality?" → No → LOGIC |
| "Security is a domain" + "Security is an overlay" | Explicit: "Security is a governance overlay, not a semantic domain" — consistent across semantics.ts, CLAUDE.md rules, and all domain READMEs |

## [§PHIL.LG-05] K-LLM: Multi-Model Consensus via Ontology

**[Official — CTO Shyam Sankar]** K-LLM IS an official Palantir concept — CTO Shyam Sankar presented "K-LLMs, not LLMs" publicly (Palantir LinkedIn: "Never use 1 LLM when you can use K-LLMs"). The developer quote below elaborates the mechanism. Our CC application (sessions reading semantics.ts) is [Inference]:

> "What we call K-LLM, where we use multiple LLMs (from different providers as well) and if they arrive at the same outcome also backed by the Ontology, on a high-value item, the likelihood that two stochastic models came to the same conclusion and it being a hallucination is very low."

K-LLM is not single-model confidence — it is **consensus-driven confidence**. Multiple independent AI models reason against the same Ontology ground truth, and agreement among them dramatically reduces hallucination probability. Our schema system implements K-LLM by construction:

```
Session 1 ──┐
Session 2 ──┤── All read semantics.ts ──┤── All produce conforming output
Session 3 ──┤── All read domain schemas ──┤── All pass same test suite
Session N ──┘── All read DH/HC constants ──┘── Consensus by construction
```

Without the schema:
- Session 1 classifies `DerivedProperty` as DATA
- Session 2 classifies `DerivedProperty` as LOGIC
- Session 3 invents a new domain for it
- **Result:** Structural inconsistency across sessions

With the schema:
- All sessions read `TRANSITION_ZONES` in semantics.ts
- All sessions see DerivedProperty → semantic domain: LOGIC
- All sessions apply SH-02 as tiebreaker
- **Result:** Consensus by typed constant, not by LLM judgment

## [§PHIL.LG-06] Three Official Hallucination Reduction Patterns

Palantir engineering identifies three distinct patterns for grounding LLMs via the Ontology (from "Reducing Hallucinations with the Ontology", Jul 2024):

### [§PHIL.LG-07] Pattern 1: Querying the Ontology for Trusted Data (OAG)

LLMs hallucinate when asked about organization-specific data they were never trained on. The Ontology provides a tool the LLM invokes to query actual enterprise data:

```
User: "Where are Titan Industries' US distribution centers?"

Without Ontology → LLM hallucinates plausible but wrong cities
With Ontology    → LLM invokes Query Tool → returns actual cities from DB
```

**System implication:** DATA entity properties serve as the trusted query source. `DerivedProperty` and `Function` concepts must be designable as LLM tools.

### [§PHIL.LG-08] Pattern 2: Handing Off to Trusted Logic Tools

LLMs hallucinate when asked to perform computation (distance, simulation, forecasting):

```
User: "Which distribution center is closest to this stranded truck?"

Without Logic Tool → LLM approximates distance (wrong)
With Logic Tool    → LLM invokes Haversine Function → correct answer
```

**System implication:** LOGIC domain Functions need a `toolExposure` property marking them as available to LLM orchestration. Only functions solving computation tasks LLMs cannot do (distance, forecasting, optimization) should be exposed.

### [§PHIL.LG-09] Pattern 3: Reviewing AI-Generated Actions (Human-in-the-Loop)

Even with grounding, hallucinations can still occur. The ACTION domain provides structured review gates:

- AI proposes an action (e.g., reallocate inventory)
- Human reviews the proposal in context (sees impact chain)
- Human approves/rejects/modifies
- Action executes with full audit trail

**System implication:** ACTION needs `reviewLevel` and `approvalWorkflow` properties — explicit human-in-the-loop gates for AI-proposed actions.

### [§PHIL.LG-10] Edge Semantics (NVIDIA Partnership)

The Ontology is moving to the edge — embedded in NVIDIA hardware for real-time inference at the point of operations (factories, vehicles, sensors). Edge semantics means a subset of the full Ontology runs independently in disconnected environments:

- DATA ingestion at the edge (sensor fusion)
- LOGIC computation at the edge (local inference via Nemotron models)
- ACTION execution at the edge (immediate response)
- Central Ontology syncs when connectivity allows

Our system must account for edge semantics — a disconnected Ontology subset that operates autonomously and reconciles with the central truth when reconnected.

## [§PHIL.LG-11] Ontology-Grounded Agents

Palantir agents are NOT free-form LLMs. They are **ontology-grounded** — their tools, context, and actions are all derived from the ontology:

```
Ontology (DATA + LOGIC + ACTION)
    ↓ surfaces as
Tools (queries, functions, actions — auto-surfaced from ontology)
    ↓ grounded by
Context (object properties, relationships, history — not raw databases)
    ↓ governed by
Guardrails (submission criteria, RBAC, markings — ACTION_GOVERNANCE)
    ↓ audited by
Lineage (every tool call traced — DECISION_LINEAGE)
```

The ontology automatically exposes three tool categories aligned with the three domains:
- **Data queries** as read-only tools (SENSE) — HRP-01/OAG pattern
- **Logic functions** as computation tools (DECIDE) — HRP-02/Logic Tool Handoff
- **Actions** as execution tools (ACT) — HRP-03/Human-in-the-Loop review

Each tool carries type-safe parameters (from function signatures), permission requirements (from RBAC), submission criteria (from action definitions), and audit logging (from Workflow Lineage).

> "Because these agents are grounded in the ontology and data of the twin, they are not hallucinating in a vacuum. They are reasoning over the actual, governed, real-world representation of the business." — The AI Architect, Substack

Agent composition patterns from AIPCon 9:
- **Document processing agents** grounded in domain ontology (Freedom Mortgage: mortgage document catalog traced through ontology to operations)
- **Real-time planning agents** with constraint propagation (World View: update one constraint, see downstream effects instantaneously)
- **Continuous monitoring agents** with remediation proposals (Ted Mabrey (Palantir): long-running agents operating as advocates for every component in every product on every line — tier one automotive supplier example)

## [§PHIL.LG-12] Ontology-Augmented Generation (OAG)

OAG extends RAG (Retrieval-Augmented Generation) by providing not just context documents but **typed semantic structure**:

| RAG | OAG |
|-----|-----|
| Retrieves relevant text passages | Retrieves typed definitions + heuristics |
| LLM interprets context freely | LLM is constrained by typed constants |
| Context may be ambiguous | Context is semantically complete |
| No verification mechanism | Test suite verifies output |
| Session-dependent interpretation | Session-independent typed constants |

Our DecisionHeuristics (e.g., "struct vs entity?", ">5 timeseries → sensor pattern") ARE the grounding mechanism — expert patterns encoded into typed constants so every LLM session can access them, not just the session where the expert was present.

## [§PHIL.LG-13] Session Independence

A well-grounded ontology system provides **session independence** — the property that any LLM session reading the same schema produces compatible output regardless of:
- Which model processes the request
- What conversation history preceded the request
- How the request is phrased

Session independence is achieved through:

1. **Typed constants** — `DecisionHeuristic`, `HardConstraint`, `DomainSemantics` are read, not inferred
2. **Exhaustive enumeration** — `ALL_CONCEPT_TYPES`, `BASE_PROPERTY_TYPES` leave no room for invention
3. **Consistency invariants** — CI-01 through CI-09 are machine-verifiable
4. **Shared meta-suite + project-local tests** — `project-test.test.ts` currently exposes 6 Bun meta-validation tests in the ontology directory, and downstream projects add their own ontology suites on top

## [§PHIL.LG-14] Our Grounding Architecture

> **[Provenance: Adapter]** The architecture below is our CC-specific implementation of the Palantir grounding principles described above. The domain partition (DATA/LOGIC/ACTION/SECURITY) and DH/HC constants are our analytical framework, not official Palantir artifacts.

```
research/palantir/          ← Human-readable SSoT (natural language)
    ↓ formalized into
schemas/ontology/           ← Machine-readable grounding (typed constants)
    ├── semantics.ts        ← Domain definitions, SH, TZ, CI (14 HC + 9 CI)
    ├── data/schema.ts      ← 12 DH + 35 HC (DATA grounding)
    ├── logic/schema.ts     ← 14 DH + 33 HC (LOGIC grounding)
    ├── action/schema.ts    ← 16 DH + 32 HC (ACTION grounding)
    └── security/schema.ts  ← 9 DH + 22 HC (SECURITY grounding)
    ↓ adapted via
rules/                      ← Adapter constraints (rules/01-06)
    ↓ verified by
project-test.test.ts        ← Shared conformance verification (current directory truth: 1 file, 6 tests)
```

Every layer adds specificity. By the time an LLM reads the full chain, it has complete, unambiguous, verifiable grounding for generating ontology-conformant code.

## [§PHIL.LG-15] Connection to Other Philosophy Files

- [tribal-knowledge.md](tribal-knowledge.md) — DecisionHeuristics encode the tribal knowledge that grounds LLM sessions; 5-stage progression from tribal knowledge to autonomous reasoning
- [digital-twin.md](digital-twin.md) — The digital twin's feedback loop continuously improves grounding accuracy; Decision Lineage captures decision context for institutional learning; Progressive Autonomy governs how much AI independence the system allows

## [§PHIL.LG-16] Sources

- https://www.palantir.com/platforms/ontology/ — "using the Ontology as the grounding mechanism"
- https://www.palantir.com/docs/foundry/aip/aip-features — AIP features and ontology integration
- https://www.palantir.com/docs/foundry/agent-studio/overview/ — Agent Studio: ontology-grounded tools
- https://blog.pebblous.ai/project/CURK/ontology/enterprise-ontology-paradigm/en/ — enterprise ontology paradigm
- https://www.financialcontent.com/article/finterra-2026-3-5-palantir-pltr-2026-the-rise-of-the-logic-layer-and-the-agentic-ai-revolution — logic layer and AI
- https://theaiarchitects.substack.com/p/palantirs-digital-twin-building-the — agent grounding in digital twin
