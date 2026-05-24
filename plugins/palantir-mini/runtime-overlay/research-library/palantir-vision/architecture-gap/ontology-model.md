---
title: Ontology Architecture — SSoT Reference
slug: ontology-model
fileClass: vision-architecture-gap
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Ontology Architecture — SSoT Reference

> **Purpose:** Permanent architecture reference for ontology schema work. Inject into any Claude Code session to maintain consistent direction. This document is the authoritative design context — read it completely before starting any domain work. It is written for Opus to read and internalize.
>
> **Status:** 3 SEMANTIC DOMAINS + SECURITY OVERLAY + SEMANTICS COMPLETE — current ontology directory truth: 51 DH, 136 HC, 9 CI, shared meta-suite of 6 Bun tests in 1 file. `semantics.ts` v1.11.0, sections §0–§37.
>
> **Provenance:** Mixed — official Palantir docs/blogs [Official], 3-domain + security-overlay analytical model [Inference], local runtime mappings [Adapter], and explicitly future-facing notes [Vision].
> **Schema anchors:** `SH-01..03`, `TRANSITION_ZONES`, `CI-01..09`, `WL-01..05`, `MCP-01..03`, `REF-01..05`, `LLMI-01..03`, `ORCH-01..06`, `PB-01..03`, `PMC-01..13`, `WLG-01..10`
>
> **Provenance key:** This document mixes official Palantir facts with our analytical framework. Tags used:
> - **[Official]** — verified from official Palantir documentation
> - **[Inference]** — our analytical interpretation derived from official sources
> - **[Adapter]** — CC-specific implementation mapping
> - **[Vision]** — future direction not yet implemented
>
> **Legacy path note:** Many inline path references below still mention `~/.claude/research/palantir/...` because this document predates the 2026-04-20 split. Read them as historical references into `_archive/2026-04-20-palantir-consolidation/` unless a newer route is explicitly named.

---

## [§ARCH-01] 0. THE ONTOLOGY IS NOT A DATABASE — IT IS A SEMANTIC MODEL OF REALITY

Before reading anything else, internalize this. A Palantir developer describes the Ontology:

> "Think of the Palantir Ontology as the context store of operations. This is more than just the data. If you think about the data representing the current state of the world, then the other thing you need is the logic on how to think about that state. The last thing you need is the actions or levers you have to affect the real world. So you need the data, logic, and actions modeled in the context of your operations."

> "The semantics HAVE to be more than just data, and they have to be modeled how the real world is actually working, not how some BI tool needs it."

> "Once you have this Ontology reflecting ground truth as accurately as possible, injecting LLMs brings reasoning capabilities to the process and using the Ontology as the grounding mechanism is one of the best ways to reduce hallucinations."

> "The Ontology acts as the backplane for AI and humans to work together... by building workflows that capture implicit and explicit feedback from expert users, we are able to find the core principles they are working from that might not be encoded into a system anywhere — this is the tribal knowledge of our institutions."

**[Official — AIPCon 9, March 12, 2026]** The D/L/A framing was validated on-stage at AIPCon 9 by Palantir Architect Chad Wahlquist during the demo walkthrough:

> "Our whole ethos at Palantir is how do I take the data, the logic, and then turn those into actions."
> "It's really about all the way from the data to the logic, when I think about it, and then to the action, right?"

**[Local Normalization]** The three semantic domains below formalize Palantir's official "three constituent elements of decision-making." Palantir's AIP page explicitly names **Data** ("Anchor AI context"), **Logic** ("Anchor AI reasoning"), and **Action** ("Anchor AI execution") as three layers. Official docs state: "Every decision comprises data, logic, and action." However, Palantir does NOT publish a formal typed partition model with ownership rules, boundary constraints, or `mustNotContain` arrays. Our `SemanticDomainId` typing, `TRANSITION_ZONES`, and `SEMANTIC_HEURISTICS` are local normalizations that ensure every LLM session classifies concepts identically — a valid formalization (OOSD-02) of an official concept. Note: Palantir also uses a 2-category taxonomy (semantic=objects/properties/links vs kinetic=actions/functions) in their ontology overview, which our 3-domain model refines by splitting kinetic into LOGIC + ACTION:

The three domains are not file organization categories. They are **semantic partitions of how the real world works:**

| Domain | Real-World Role | Semantic Question | Examples |
|--------|----------------|-------------------|----------|
| **DATA** | The current state of the world | "Does this describe **what exists** right now?" | Stocks, articles, users, sensors, invoices, specs, intelligence reports |
| **LOGIC** | How to think about that state | "Does this describe **how to reason** about what exists?" | Relationships, Bob's 20-year rules, forecast models, classifiers, search-around patterns |
| **ACTION** | Levers to affect the real world | "Does this **change reality** when executed?" | Create work order, transfer stock, fire kinetic, execute simulation |

**Critical implication:** When deciding where a concept belongs, do NOT ask "which TypeScript file should export this?" Ask the semantic question: "Is this about what EXISTS, how to REASON, or how to CHANGE reality?"

### [§ARCH-02] Semantic Compilation — The 4-Stage Pipeline

Semantic compilation is Palantir's core architectural principle. A specialized semantic layer translates ambiguous business definitions into precise, executable operations:

```
Business Language (natural, ambiguous)
  → Domain Modeling (objects, properties, links, actions)
    → Schema Compilation (indexed, queryable, executable)
      → Logic Binding (functions + AIP Logic bound to model)
        → Action Execution (transactions, automations, agent actions)
```

Three dimensions of correctness govern the pipeline: **abstract correctness** (the ontology accurately models the domain), **runtime correctness** (compiled operations execute faithfully at scale), and **commercial correctness** (the system delivers measurable business value).

### [§ARCH-03] K-LLM: Multi-LLM Consensus

The Ontology as LLM grounding mechanism is not limited to single-model inference. **K-LLM** (local shorthand for K models reasoning in parallel, not an official Palantir product term) uses the Ontology as structured context so that multiple LLM agents reach consensus against the same ground truth — consensus-driven confidence, not just single-model conformance. As a Palantir practitioner describes: "if [multiple LLMs from different providers] arrive at the same outcome also backed by the Ontology, the likelihood that two stochastic models came to the same conclusion and it being a hallucination is very low." Our `schemas/` system does this: the schema IS the ontology, grounding every LLM session in typed, verifiable definitions. Without it, each session hallucinates structure independently. With it, every session generates code conforming to the same ground truth.

### [§ARCH-04] Ontology-Oriented Software Development (OOSD)

OOSD is the paradigm where developers write code using business concepts (Airplanes, Flight Schedules, Airports) instead of technical primitives (rows, columns, joins). Four principles:

1. **Code in Business Language:** Business concepts become first-class API objects
2. **Abstraction of Implementation:** Internal details hidden behind the Ontology
3. **Marginal Cost → Zero:** The OSDK drives the marginal cost of bespoke enterprise software toward zero
4. **Defragmented Enterprise:** Isolated components integrate into a holistic system

### [§ARCH-05] Digital Twin — SENSE → DECIDE → ACT → LEARN

The Ontology functions as a digital twin implementing a continuous feedback loop:

```
SENSE (Ingest) ──→ DECIDE (Logic) ──→ ACT (Action)
  ↑                                        │
  │              LEARN (Feedback)           │
  └────────────────────────────────────────┘
```

- **Sense:** Multi-modal semantic data integration from ERPs, CRMs, sensors, databases
- **Decide:** AI/ML modeling, simulation, human judgment via LOGIC layer
- **Act:** Operational changes through ACTION layer, webhooks, external system sync
- **Learn:** Decision outcomes captured as new data for model improvement

### [§ARCH-06] Decision-Centric Architecture

The Ontology is not converging toward a better database — it is converging toward the **operating system of the enterprise**. As Chief Architect Akshay Krishnaswamy states: "The Ontology is designed to represent the DECISIONS in an enterprise, not simply the data." Traditional architectures model what is known; the Ontology models what must be decided. Schema describes **decision structure**, objects model **real-world entities**, actions execute **decisions**.

### [§ARCH-07] Three Hallucination Reduction Patterns

Palantir engineering identifies three official patterns for grounding LLMs via the Ontology:

1. **OAG (Ontology-Augmented Generation)** — LLMs query the Ontology for trusted data instead of hallucinating answers (Pattern 1: DATA as trusted query source)
2. **Logic Tool Handoff** — LLMs delegate computation to deterministic LOGIC functions instead of approximating (Pattern 2: Functions with `toolExposure`)
3. **Human-in-the-Loop Action Review** — AI-proposed actions pass through structured review gates before execution (Pattern 3: ACTION with `reviewLevel`)

### [§ARCH-08] Decision Lineage

Every decision made through the Ontology is automatically captured as an artifact: WHEN it was made, ATOP WHICH version of enterprise data, THROUGH WHICH application, BY WHOM (human or AI), WITH WHAT reasoning. This is the LEARN mechanism made concrete — a complete audit trail that feeds back into the Ontology to enrich future decisions.

### [§ARCH-09] Progressive Autonomy

The Ontology enables staged transition from human-directed to AI-autonomous operations (5 levels: Monitor → Recommend → Approve-then-act → Act-then-inform → Full autonomy). AIP Automate implements this through staged review mechanics.

### [§ARCH-10] Ontology-Augmented Generation (OAG)

AI agents operating within the digital twin are grounded in ontology data, so they reason about structured business context rather than hallucinating in a vacuum. Our Decision Heuristics (e.g., "struct vs entity?", ">5 timeseries → sensor pattern") ARE this tribal knowledge — expert patterns encoded into the schema so every LLM session can access them, not just the session where the expert was present.

### [§ARCH-11] Philosophy Deep Dives

The concepts above (context store, semantic compilation, K-LLM, OOSD, digital twin, OAG) are foundational to the ontology. For deeper treatment, see the `philosophy/` directory:

| File | Content |
|------|---------|
| [philosophy/README.md](philosophy/README.md) | Ontology as context store, 4-stage pipeline, OOSD paradigm |
| [philosophy/tribal-knowledge.md](philosophy/tribal-knowledge.md) | Expert knowledge discovery → encoding → lifecycle as DecisionHeuristic constants |
| [philosophy/llm-grounding.md](philosophy/llm-grounding.md) | Ontology as hallucination reduction: semantic integrity/consistency, K-LLM, OAG, session independence |
| [philosophy/digital-twin.md](philosophy/digital-twin.md) | SENSE-DECIDE-ACT-LEARN loop: DATA=SENSE, LOGIC=DECIDE, ACTION=ACT, feedback mechanism |
| [philosophy/ontology-ultimate-vision.md](philosophy/ontology-ultimate-vision.md) | Deep dive: decision-centric OS, K-LLM consensus, 3 hallucination patterns, progressive autonomy, self-healing enterprise |

### [§ARCH-12] Concrete Examples of Semantic Classification

**Commercial context:**
- ERP inventory levels → **DATA** (current state of stock)
- "If stock drops below reorder point, flag it" → **LOGIC** (reasoning rule)
- "Create purchase order to replenish" → **ACTION** (lever that changes reality)
- The relationship "Warehouse stores Product" → **LOGIC** (reasoning path)
- The Product entity itself → **DATA** (what exists)

**Our SaveTicker project:**
- `Stock { name, ticker, currentPrice }` → **DATA** (the stock exists with these attributes)
- `User ↔ Stock` watchlist relationship → **LOGIC** (how a user relates to stocks)
- `priceDirection` derived from price changes → **LOGIC** (interpretation, not raw state)
- `addToWatchlist` mutation → **ACTION** (changes the user's watchlist)
- `dailyPriceRefresh` automation → **ACTION** (scheduled lever that updates reality)

**Battlefield context (from the Palantir developer):**
- Sensor fusion data, intelligence reports → **DATA** (current state of the battlefield)
- Link analysis connecting assets, classifier model identifying targets → **LOGIC** (how to interpret)
- Kinetic strike, simulation, operational plan → **ACTION** (levers that change the battlefield)

---

## [§ARCH-13] 1. THE THREE DOMAINS

### [§ARCH-14] DATA — "What EXISTS"

DATA defines entities, their properties, their types, and their structural shape. It is standalone and foundational — LOGIC, ACTION, and SECURITY all read from DATA's output, but DATA has no upstream dependencies. DATA answers: "What do we know?"

**10 topics:** ObjectTypes, Properties (19 base types), ValueTypes (6 branded), StructTypes, SharedPropertyTypes, GeoPoint/GeoShape, TimeSeries, Attachments, Vectors, Cipher.

DATA does not define how entities relate (LOGIC), how state changes (ACTION), or who can access what (SECURITY). DATA designs entities **with consideration** of LOGIC — knowing they will be connected — but does not define the connections themselves.

### [§ARCH-15] LOGIC — "How to REASON"

LOGIC is the intelligence layer — the **Impact Propagation Graph** that defines how changes flow:

> "When A changes, B, C, D are affected — LOGIC defines this propagation."

Impact propagation is **explicit, not automatic**. Palantir does NOT cascade changes through links automatically. Edit Functions explicitly traverse links and apply edits. This is deliberate, auditable, testable propagation — not database triggers or automatic cascading:

```
Incident.status → "Closed"
  ├─ Hop 1: Incident.alerts.all() → each Alert.status = "Resolved"
  ├─ Hop 2: Incident.region.get() → Region.hasActiveIncidents recomputed
  └─ Hop 3: Region.dashboards.all() → each Dashboard.lastRefreshed = now()
```

LOGIC contains **two complementary concerns:**
1. **Impact Propagation Graph** (primary) — links, interfaces, derived properties, queries — defining how changes flow through connections
2. **Pure Computation** (supporting) — validation functions, format functions, aggregation formulas operating along those paths

**Knowledge Graph 3 Layers:**
1. **Instance Layer** (data) → Convex database (runtime data)
2. **Vocabulary Layer** (terms) → `ontology/*.ts` (shared definitions)
3. **Schema Layer** (constraints) → `~/.claude/schemas/` (validation + contracts)

### [§ARCH-16] ACTION — "How to CHANGE Reality"

ACTION is execution-only. It does not compute, derive, or describe. It commits and triggers. Progressive autonomy enables gradual transition from human-reviewed to AI-autonomous action execution (5 levels: Monitor → Recommend → Approve-then-act → Act-then-inform → Full autonomy):

| LOGIC (Describe) | ACTION (Execute) |
|-----------------|------------------|
| Edit Functions return `Edits[]` without committing | Function-backed Actions wrap Edit Functions and COMMIT |
| `$returnEdits` executes AND returns applied edits (post-commit audit) | `applyAction` applies edits permanently |
| `$validateOnly` checks constraints without mutating | Submission criteria gate execution, then proceed |
| Derived Properties define cascade formulas | Mutations execute the cascade |
| Queries traverse the graph read-only | Webhooks push changes to external systems |

**Two-tier architecture:**
- **Tier 1 — Simple Rules** (declarative, 11 types): 6 direct (Create, Modify, Create-or-Modify, Delete, Create Link, Delete Link) + 5 interface variants. Compile into single edits per object; rule order matters.
- **Tier 2 — Function-backed** (code, exclusive): When present, no other rules allowed. Function takes full responsibility for all edits.

**Critical constraint:** Search APIs see OLD state during function execution (eventual consistency).

**Submission criteria:** ALL must pass before action can execute. Independent from edit permissions. If criteria fail, side effects are NOT triggered.

### [§ARCH-17] Transition Zone — DATA Structure, LOGIC Semantics

Four concept types live in `data/` directory structurally but belong to LOGIC semantically (confirmed via `semanticQuestion`):

| Concept | Structural Home | Semantic Domain | Reasoning |
|---------|----------------|-----------------|-----------|
| LinkType | `data/links.md` | **LOGIC** | Links enable reasoning/traversal — edges of the Impact Propagation Graph |
| Interface | `data/interfaces.md` | **LOGIC** | Connection contracts for polymorphic reasoning |
| Query/ObjectSet | `data/queries.md` | **LOGIC** | Graph traversal for scoping impact |
| DerivedProperty | `data/derived-properties.md` | **LOGIC** | Interpretation of raw data via computation |

### [§ARCH-18] semanticQuestion as Tiebreaker

When domain placement is disputed, `semanticQuestion` is the **final arbiter**. Apply each domain's question to the concept; whichever question the concept answers affirmatively determines placement:

- "Does this describe **what EXISTS**?" → DATA
- "Does this describe **how to REASON**?" → LOGIC
- "Does this **CHANGE REALITY**?" → ACTION

### [§ARCH-19] Decision-Centric Systems

Every enterprise decision decomposes into the domains:

| Layer | Question | Examples |
|-------|----------|----------|
| **DATA** | What do we know? | ObjectTypes, Properties, ValueTypes, Structs, SharedProperties, Geo/TimeSeries/Vector/Attachment/Cipher |
| **LOGIC** | What does it mean? | LinkTypes†, Interfaces†, Queries†, DerivedProperties†, Functions |
| **ACTION** | What should we do? | Mutations, Webhooks, Automations |
| **SECURITY** | Who is allowed? | Roles, Markings, Object-level Policies |

> **†Transition zones:** Links, Interfaces, Queries, and DerivedProperties are structurally co-located with DATA in Palantir's docs (under "Object and link types") but semantically classified as LOGIC in our framework — they enable reasoning/traversal, not entity definition. See §1 Transition Zone below. **[Provenance: Inference]** Palantir does not make this DATA/LOGIC distinction; it groups all structural concepts together.

The paradigm shift: schema describes **decision structure** (not just data structure), objects model **real-world entities** (not just rows), actions execute **decisions** (not just stored procedures).

---

## [§ARCH-20] 2. DESIGN PRINCIPLES

### [§ARCH-21] Schema = Contract + Instruction + Verification

Each schema `.ts` file is self-sufficient. An LLM reading only the schema (no conversation history) must know:

| Role | What It Contains |
|------|-----------------|
| **Semantic Definition** | What this domain MEANS in real-world terms, with multi-sector examples |
| **Contract** | Type definitions, enums, structural rules |
| **Instruction** | Decision heuristics, mapping tables, naming conventions |
| **Verification** | Hard constraints, consistency invariants, completeness rules |

The SKILL.md layer was eliminated. The schema IS the instruction. The schema IS the grounding mechanism.

### [§ARCH-22] Authority Chain

```
.claude/research/palantir/   ← SSoT (canonical upstream)
      ↓ derives
.claude/schemas/ontology/    ← domain schemas (typed constants + shared meta-suite)
      ↓ validates
project code (ontology/*.ts) ← output
```

**Permanent rule:** `research > schema > project code`. When research and implementation conflict, research wins. When research is silent, document the gap with rationale.

### [§ARCH-23] Decision Heuristics = Encoded Tribal Knowledge

Expert judgment patterns formalized as typed constants:
- 51 heuristics across 4 domains (12 DATA + 14 LOGIC + 16 ACTION + 9 SECURITY)
- 136 hard constraints across 4 domains + semantics (35 DATA + 33 LOGIC + 32 ACTION + 22 SECURITY + 14 SEM)
- Each encodes expert patterns: "struct vs entity?", ">5 timeseries → sensor entity", "validation function or submission criterion?"
- These are exactly the "core principles expert users work from that might not be encoded into a system anywhere" that the Palantir developer describes
- As typed `DecisionHeuristic` constants, they survive across sessions — every LLM session reads the same encoded expertise

### [§ARCH-24] Decision Lineage = Complete Audit Trail

Every decision made through the Ontology captures: WHEN/DATA VERSION/APP/WHO/WHY. This is not optional metadata — it is the mechanism by which the LEARN feedback loop closes. Decision lineage transforms the Ontology from a static model into a continuously-improving decision engine where every outcome enriches future decisions.

### [§ARCH-25] LLM Tool Exposure

LOGIC domain Functions can be marked as callable tools for AI orchestration via `toolExposure`. This enables Pattern 2 (Logic Tool Handoff): LLMs delegate computation to deterministic functions instead of approximating. Not all functions should be exposed — only those solving computation tasks LLMs cannot do (distance, forecasting, optimization, validation).

### [§ARCH-26] Research Traceability

Every type, constant, and rule traces to a specific research file + section. This is non-negotiable: if a schema element cannot cite its research source, it is either undocumented tribal knowledge (formalize it) or an assumption (verify it).

### [§ARCH-27] Bilingual Descriptions

All user-facing definitions carry `en` + `ko` descriptions via the `BilingualDesc` type. This is a permanent requirement, not a localization convenience — it ensures that both language perspectives validate the semantic accuracy of definitions.

### [§ARCH-28] Historical Context

The schema system was originally built bottom-up from implementation experience. Schemas grew organically, with research consulted ad-hoc rather than governing. The redesign (completed 2026-03-12) inverted this: research became SSoT, schemas were rebuilt top-down from research, and all SKILL.md tribal knowledge was absorbed into typed constants. This context explains why the authority chain is so strictly enforced.

---

## [§ARCH-29] 3. COMPLETED SCHEMA ARCHITECTURE

### [§ARCH-30] Provenance Chain

```
.claude/research/palantir/         ← research SSoT (60 files, ~14,500L, 12 subdirs)
      ↓
.claude/schemas/ontology/          ← domain schemas (typed constants + shared meta-suite)
      ↓
project code (ontology/*.ts)       ← validated output
```

### [§ARCH-31] File Tree (Actual Completed State)

```
schemas/ontology/
├── semantics.ts          ← domain definitions (288 tests, 1,552 assertions)
├── semantics.test.ts
├── types.ts              ← shared type interfaces
├── helpers.ts            ← validation utilities (34 tests, 65 assertions)
├── helpers.test.ts
├── validate-rules.ts     ← cross-domain validation + adapter alignment
├── project-validator.ts  ← structural compliance PV-01..08
├── semantic-audit.ts     ← Twin Maturity + 32-section audit SA-01..32
├── upgrade-apply.ts      ← 3-layer upgrade patch generation
├── validate-file.ts      ← CLI wrapper
├── data/
│   ├── schema.ts         ← DATA domain (12 heuristics, 35 HC)
│   └── (historical per-domain tests removed; use shared meta-suite + project-local tests)
├── logic/
│   ├── schema.ts         ← LOGIC domain (14 heuristics, 33 HC)
│   └── (historical per-domain tests removed; use shared meta-suite + project-local tests)
├── action/
│   ├── schema.ts         ← ACTION domain (16 heuristics, 32 HC)
│   └── (historical per-domain tests removed; use shared meta-suite + project-local tests)
└── security/
    ├── schema.ts         ← SECURITY domain (9 heuristics, 22 HC)
    └── (historical per-domain tests removed; use shared meta-suite + project-local tests)
```

**Validation entrypoint:** `cd ~/.claude/schemas/ontology && bun test`

### [§ARCH-32] Internal 8-Section Pattern

Each domain `schema.ts` follows this section order:

1. **Semantic Identity** — What this domain means (references `semantics.ts`)
2. **Type Definitions** — `export type/interface` for domain-specific structures
3. **Enumeration Constants** — Valid values (e.g., `BASE_PROPERTY_TYPES`)
4. **Decision Heuristics** — Tribal knowledge as typed `DecisionHeuristic` constants
5. **Mapping Tables** — Type-to-type translations (e.g., ontology → Convex)
6. **Structural Rules** — Naming conventions, file output specs
7. **Validation Thresholds** — Testable numeric constraints (e.g., `SHARED_PROPERTY_THRESHOLD = { minEntities: 3, minProperties: 3 }`)
8. **Hard Constraints** — Rules that cannot be violated (all `severity: "error"`)

### [§ARCH-33] Type Hierarchy

- **20 ConceptTypes** total: 12 DATA + 5 LOGIC + 3 ACTION
  - DATA: ObjectType, Property, ValueType, StructType, SharedPropertyType, GeoPointProperty, GeoShapeProperty, GeoTemporalProperty, TimeSeriesProperty, AttachmentProperty, VectorProperty, CipherProperty
  - LOGIC: LinkType, Interface, Query, DerivedProperty, Function
  - ACTION: Mutation, Webhook, Automation
- **19 BasePropertyTypes:** string, integer, long, float, double, boolean, date, timestamp, geopoint, geoshape, attachment, mediaReference, timeseries, cipher, struct, vector, marking, FK, BrandedType
- **3 SemanticHeuristics** (SH-01 through SH-03): domain-placement decision trees
- **4 TransitionZones:** LinkType, Interface, Query, DerivedProperty
- **9 ConsistencyInvariants** (CI-01 through CI-09): cross-domain integrity rules

### [§ARCH-34] Consistency Invariants (9 Rules)

| ID | Name | Rule |
|----|------|------|
| CI-01 | Partition Completeness | Union of all owns = ALL_CONCEPT_TYPES |
| CI-02 | No Owns Overlap | No concept type owned by two domains |
| CI-03 | Acyclic Reads | DATA reads nothing; LOGIC reads DATA; ACTION reads DATA+LOGIC |
| CI-04 | mustNotContain = Complement | Each domain's mustNotContain = ALL minus owns |
| CI-05 | Semantic Question Uniqueness | No concept satisfies two domains' questions |
| CI-06 | Reads Only What Others Own | Every reads item exists in another domain's owns |
| CI-07 | HC Domain Alignment | Each HC's domain field matches its container |
| CI-08 | Classification Consistency | Same concept never classified into different domains |
| CI-09 | Digital Twin Stage Bijection | Each domain maps to exactly one Digital Twin stage |

---

## [§ARCH-35] 4. PALANTIR-TO-STACK MAPPING

### [§ARCH-36] OSDK 2.0 Patterns Adopted

Six architectural patterns from OSDK 2.0 that our stack adopts:

1. **Directly invocable client:** Palantir `client(TypeDef)` → Ours `useQuery(api.module.fn, args)` in Convex
2. **Object Sets as lazy collections:** Defer execution until terminal operations (fetchPage, asyncIter, aggregate)
3. **$link namespace for traversal:** `object.$link.linkName.fetchPage()` → Generated hooks for indexed relationship queries
4. **Interface polymorphism via $as:** `object.$as(InterfaceDef)` → Interface adaptation in `convex/model/` with same shape-contract principle
5. **Validate-then-execute actions:** `$validateOnly: true` / `$returnEdits: true` (mutually exclusive) → Mutation validation before state changes
6. **Subscription model:** `subscribe({ onChange, onOutOfDate })` → Convex reactive `useQuery()` with real-time updates

### [§ARCH-37] Domain Mapping Tables

**DATA Domain:**

| Palantir Concept | Our Equivalent | Location |
|-----------------|----------------|----------|
| ObjectTypeDefinition | Entity type definition | `ontology/schema.ts` |
| Properties (2,000 max) | Typed fields on entities | `ontology/schema.ts` |
| Value Types | 6 branded types | `ontology/schema.ts` |
| Structs | Nested object types | `ontology/schema.ts` |
| Object Storage V2 | Convex database | `convex/schema.ts` |

**LOGIC Domain:**

| Palantir Concept | Our Equivalent | Location |
|-----------------|----------------|----------|
| Link Types (4 cardinalities) | Document relationships | `ontology/data.ts` |
| SearchAround (max 3 hops) | Index-based traversal queries | `convex/` queries |
| Interfaces | Shape contracts | `ontology/data.ts` |
| Derived Properties | Computed values | `ontology/data.ts` |
| Functions / Edit Functions | Pure computation / impact description | `ontology/logic.ts` |

**ACTION Domain:**

| Palantir Concept | Our Equivalent | Location |
|-----------------|----------------|----------|
| Action Types (Simple/Function-backed) | Mutation definitions | `ontology/action.ts` |
| Submission Criteria | Mutation validation logic | `ontology/action.ts` |
| Webhooks (pre/post-commit) | Convex action functions | `convex/` actions |
| Automations (6 trigger types) | Crons + scheduled functions | `convex/crons.ts` |
| `$validateOnly` / `$returnEdits` | Validation (no-commit) / post-commit audit patterns | Mutation wrappers |

**SECURITY Domain:**

| Palantir Concept | Our Equivalent | Location |
|-----------------|----------------|----------|
| Ontology Roles (RBAC) | Role-based access | `ontology/security.ts` |
| Markings (classification) | Marking-based access | `ontology/security.ts` |
| Object-level Security | Row/column enforcement | Convex query filtering |

**Edge Deployment (NVIDIA Partnership):**

| Palantir Concept | Our Equivalent | Location |
|-----------------|----------------|----------|
| Ontology at Edge | Disconnected Convex subset (planned) | Future: edge runtime |
| NVIDIA Nemotron inference | Local model inference | Future: edge compute |
| Edge-to-central sync | Reconciliation on reconnect | Future: sync protocol |

### [§ARCH-38] Branded Types

| OSDK Branded Type | Our Mapping |
|------------------|-------------|
| `DateISOString` | `string & { __dateBrand }` |
| `Double` | `number & { __doubleBrand }` |
| `Float` | `number & { __floatBrand }` |
| `Integer` | `number & { __integerBrand }` |
| `Long` | `string & { __longBrand }` (string — JS cannot safely represent 64-bit int) |
| `TimestampISOString` | `string & { __timestampBrand }` |

BasePropertyType maps 19 types (includes FK, BrandedType, mediaReference); OntologyPropertyType extends to 24 PascalCase types with 5 adapter-only additions: `number`, `enum`, `optional`, `array`, `GeoTemporal`.

### [§ARCH-39] Canonical Constraints (Consolidated)

| Constraint | Value | Source |
|-----------|-------|--------|
| Max properties per ObjectType | 2,000 (OSv2) | Object Storage V2 docs |
| Max objects editable per Action | 10,000 | OSv2 docs |
| SearchAround max hops | 3 per chain | Object Sets API |
| SearchAround max results | 10,000,000 objects (OSv2) | OSv2 docs |
| Aggregation max buckets | 10,000 | Object Sets API |
| ObjectSet `.all()` max | 100,000 objects | Object Sets API |
| KNN max K | 100 | OSv2 docs |
| KNN max dimensions | 2,048 | OSv2 docs |
| Branded types | 6 | OSDK type system |
| OSv1 deprecation | June 30, 2026 | Palantir announcements |
| Function rule exclusivity | 1 per action | Action Rules docs |
| Automation condition types | 7 (1 time-based + 6 object set) | Automate docs |
| Webhook types | 2 (pre-commit, post-commit) | Side Effects docs |

### [§ARCH-40] The Engine: Read / Write / Compute

The Ontology Engine is a multimodal system grouped into three subsystems:

| Path | Subsystem | Role |
|------|-----------|------|
| **Read** | Object Set Service (OSS) | Search, filter, aggregate, subscribe to objects |
| **Write** | Object Data Funnel | Orchestrate data writes, indexing, edit persistence |
| **Compute** | Functions + AIP Logic | Server-side computation, derived values, validation |

Object Storage V2 (current standard) separates indexing from querying, supports tens of billions of objects per type, and allows up to 10,000 objects editable per single Action. Object Storage V1 (Phonograph) is deprecated after June 30, 2026.

### [§ARCH-41] Type Generation Patterns

**Osdk.Instance\<T\> → Convex Doc:**
Palantir wraps every loaded object in `Osdk.Instance<T>` providing `$link`, `$as`, `$clone`, `$rid`, `$primaryKey`. Our Convex equivalent is `Doc<"tableName">` which provides `_id`, `_creationTime`, and all defined fields.

**Object Sets → Convex Queries:**

| OSDK Operation | Convex Equivalent |
|---------------|-------------------|
| `client(Type).fetchPage({ $pageSize: 30 })` | `usePaginatedQuery(api.type.list, {}, { initialNumItems: 30 })` |
| `client(Type).where({ status: { $eq: "active" } })` | `useQuery(api.type.list, { status: "active" })` |
| `client(Type).aggregate({ $select: { $count: "unordered" } })` | Custom aggregation query in `convex/` |
| `object.$link.linkName.fetchPage()` | Indexed query on foreign key field |
| `for await (const obj of client(Type).asyncIter())` | Convex reactive subscription via `useQuery()` |

**Action Options → Convex Mutation Patterns:**

| OSDK Pattern | Convex Pattern |
|-------------|----------------|
| `applyAction(params)` | `useMutation(api.type.create)(params)` |
| `applyAction(params, { $validateOnly: true })` | Validation function returning errors before mutation |
| `applyAction(params, { $returnEdits: true })` | Execute action AND return applied edits (post-commit audit) |
| `batchApplyAction([...])` | Loop within single Convex mutation for atomicity |

---

## [§ARCH-42] 5. QUALITY RULES

### [§ARCH-43] DecisionHeuristic Required Fields

Every `DecisionHeuristic` constant must include:
- `id` — unique identifier (format: `DH-{DOMAIN}-{NN}`)
- `question` — the decision to be made, phrased as a question
- `options[]` — each with `condition`, `choice`, `reasoning`
- `source` — research file + section citation
- `realWorldExample` — concrete scenario (400+ characters for adapters)

### [§ARCH-44] HardConstraint Required Fields

Every `HardConstraint` constant must include:
- `id` — unique identifier (format: `HC-{DOMAIN}-{NN}`)
- `domain` — owning domain (must match container)
- `rule` — the constraint statement
- `severity` — always `"error"` (hard constraints are non-negotiable)
- `source` — research file citation
- `rationale` — why this constraint exists

### [§ARCH-45] Environment

- `ONTOLOGY_ROOT` env var for project-agnostic test loading
- Validation entrypoint: `cd ~/.claude/schemas/ontology && bun test`
- Bun ESM quirk: use `var` not `let` for module caches in `helpers.ts` (TDZ issue)

### [§ARCH-46] Bilingual & Multi-Sector Requirements

- All user-facing definitions must have `BilingualDesc` (`en` + `ko`)
- Semantic definitions must include multi-sector commercial examples (healthcare, logistics, finance, education, manufacturing, military, energy)
- Each domain carries 7 sector examples in `semantics.ts`

---

## [§ARCH-47] 6. FILE REFERENCE MAP

### [§ARCH-48] Research SSoT (60 Files, 12 Subdirectories)

> **Note:** Table below lists domain-specific files. For the complete file list, see `INDEX.md` directory structure. Additional subdirs: `architecture/` (3), `platform/` (7), `cross-cutting/` (4), `ship-os/` (3), `_audits/` (2).

| Path | Domain | Content |
|------|--------|---------|
| `.claude/research/INDEX.md` | ALL | Navigation index, SSoT provenance |
| `.claude/research/palantir/data/README.md` | DATA | Overview, boundaries, 10 topics |
| `.claude/research/palantir/data/entities.md` | DATA | ObjectTypes, PK, title, editing |
| `.claude/research/palantir/data/properties.md` | DATA | Base types (19), 2000 limit |
| `.claude/research/palantir/data/value-types.md` | DATA | Branded types, wire format |
| `.claude/research/palantir/data/structs.md` | DATA | Nested composites, NON_FILTERABLE |
| `.claude/research/palantir/data/shared-properties.md` | DATA | Reusable bundles |
| `.claude/research/palantir/data/geospatial.md` | DATA | GeoPoint, GeoShape |
| `.claude/research/palantir/data/timeseries.md` | DATA | Series stores, aggregation |
| `.claude/research/palantir/data/attachments.md` | DATA | Files, media references |
| `.claude/research/palantir/data/vectors.md` | DATA | Embeddings, KNN |
| `.claude/research/palantir/data/cipher.md` | DATA | Encryption at rest |
| `.claude/research/palantir/data/links.md` | LOGIC | Link Types, cardinalities (transition zone) |
| `.claude/research/palantir/data/interfaces.md` | LOGIC | Polymorphism, constraints (transition zone) |
| `.claude/research/palantir/data/queries.md` | LOGIC | Object Sets, filtering (transition zone) |
| `.claude/research/palantir/data/derived-properties.md` | LOGIC | Computed properties (transition zone) |
| `.claude/research/palantir/logic/README.md` | LOGIC | Impact Propagation Graph thesis |
| `.claude/research/palantir/logic/functions.md` | LOGIC | @Function, edits, cascading |
| `.claude/research/palantir/logic/testing.md` | LOGIC | Unit test patterns |
| `.claude/research/palantir/logic/object-sets.md` | LOGIC | ObjectSet computation |
| `.claude/research/palantir/action/README.md` | ACTION | Execution-only principle |
| `.claude/research/palantir/action/mutations.md` | ACTION | Action Types, rules |
| `.claude/research/palantir/action/webhooks.md` | ACTION | Writeback, side-effect |
| `.claude/research/palantir/action/automation.md` | ACTION | Triggers, effects |
| `.claude/research/palantir/action/data-flow.md` | ACTION | OSv2 pipeline |
| `.claude/research/palantir/validation/README.md` | CROSS | 6-phase validation |
| `.claude/research/palantir/validation/testing.md` | CROSS | Validation suite |
| `.claude/research/palantir/validation/codegen.md` | CROSS | Code generation |
| `.claude/research/palantir/validation/cross-domain-contracts.md` | CROSS | Contract triangle enforcement patterns |
| `.claude/research/palantir/philosophy/README.md` | META | Ontology as context store, 4-stage pipeline, OOSD |
| `.claude/research/palantir/philosophy/tribal-knowledge.md` | META | Expert knowledge encoding → DecisionHeuristic constants |
| `.claude/research/palantir/philosophy/llm-grounding.md` | META | Ontology as hallucination reduction, K-LLM, OAG |
| `.claude/research/palantir/philosophy/digital-twin.md` | META | SENSE-DECIDE-ACT-LEARN loop mapped to DATA-LOGIC-ACTION |
| `.claude/research/palantir/philosophy/ontology-ultimate-vision.md` | META | Deep dive analysis: AIPCon 6-9 synthesis, decision-centric OS, K-LLM, progressive autonomy |
| `.claude/research/palantir/security/README.md` | SECURITY | 4-layer security model, AI context |
| `.claude/research/palantir/security/permissions.md` | SECURITY | RBAC, ontology roles, group resolution |
| `.claude/research/palantir/security/markings.md` | SECURITY | Classification, mandatory markings, propagation |
| `.claude/research/palantir/security/object-security.md` | SECURITY | RLS, CLS, cell-level policies, object/property security policies |
| `.claude/research/palantir/entry/README.md` | ENTRY | Requirements → decomposition → domain seeding |
| `.claude/research/palantir/entry/requirements.md` | ENTRY | Business language capture |
| `.claude/research/palantir/entry/decompose.md` | ENTRY | D/L/A/S classification |
| `.claude/research/palantir/platform/devcon.md + platform/aipcon.md` | PLATFORM | DevCon 1-5, AIPCon 9, Jan-Mar 2026 announcements |

### [§ARCH-49] Completed Schema Artifacts

| Path | Content | Stats |
|------|---------|-------|
| `schemas/ontology/semantics.ts` | Domain definitions, heuristics, transition zones, invariants, DevCon 5 / embedded ontology / structural governance constants | Typed constants |
| `schemas/ontology/types.ts` | BasePropertyType (19), BilingualDesc, OntologyDomain SSoT | Shared types |
| `schemas/ontology/helpers.ts` | Validation utilities | Shared helper module |
| `schemas/ontology/validate-rules.ts` | Cross-domain validation, adapter alignment (CG-*) | Shared validator module |
| `schemas/ontology/project-validator.ts` | Structural compliance PV-01..08 | Shared validator module |
| `schemas/ontology/semantic-audit.ts` | Twin Maturity + 32-section audit SA-01..32 | Shared audit module |
| `schemas/ontology/upgrade-apply.ts` | 3-layer upgrade patch generation | Runtime utility |
| `schemas/ontology/data/schema.ts` | DATA: 12 DH, 35 HC | Domain constants |
| `schemas/ontology/logic/schema.ts` | LOGIC: 14 DH, 33 HC | Domain constants |
| `schemas/ontology/action/schema.ts` | ACTION: 16 DH, 32 HC | Domain constants |
| `schemas/ontology/security/schema.ts` | SECURITY: 9 DH, 22 HC | Domain constants |

---

## [§ARCH-50] 7. EXTENSION PROTOCOL

### [§ARCH-51] Adding a New Domain

1. Define domain semantics in `semantics.ts` (DomainSemantics interface)
2. Add ConceptTypes to `ConceptType` union, update `ALL_CONCEPT_TYPES` and `CONCEPT_OWNER`
3. Update all existing domains' `mustNotContain` arrays
4. Write `{domain}/schema.ts` following the 8-section pattern
5. Extend `project-test.test.ts` or add project-local ontology tests — verify hard constraints and heuristic completeness against the shared meta-suite
6. Create Convex + Frontend adapter schemas
7. Run full pipeline: `bun test` must pass all CI invariants

### [§ARCH-52] Adding a New ConceptType

1. Add to `ConceptType` union in `semantics.ts`
2. Add to owning domain's `owns` array
3. Add to all OTHER domains' `mustNotContain` arrays
4. Update `ALL_CONCEPT_TYPES` and `CONCEPT_OWNER`
5. Run CI tests — CI-01 (partition completeness) and CI-04 (complement) must pass

### [§ARCH-53] Adding a New DecisionHeuristic

Checklist:
- [ ] `id` follows `DH-{DOMAIN}-{NN}` format
- [ ] `question` is phrased as a real decision
- [ ] Every `option` has `condition`, `choice`, AND `reasoning`
- [ ] `source` cites specific research file + section
- [ ] `realWorldExample` is concrete and domain-appropriate

### [§ARCH-54] Adding a New HardConstraint

Checklist:
- [ ] `id` follows `HC-{DOMAIN}-{NN}` format
- [ ] `domain` matches the containing schema's domain
- [ ] `severity` is `"error"` (hard constraints are always errors)
- [ ] `source` cites specific research file
- [ ] `rationale` explains WHY this constraint exists
- [ ] Test added to verify the constraint is enforced

### [§ARCH-55] Session Start Protocol

When starting a session involving ontology work:

1. **Read this document completely** — especially §0 (semantic model) and §1 (three domains)
2. **Read `semantics.ts`** — the foundational contract all schemas derive from
3. **Read the relevant domain schema** — `data/schema.ts`, `logic/schema.ts`, or `action/schema.ts`
4. **Apply `semanticQuestion`** — when classifying any concept, use the semantic test as tiebreaker
5. **Authority chain applies:** `research > schema > project code` — always

---

## [§ARCH-56] 8. SOURCES

Consolidated from vision.md and adaptation.md (both archived 2026-03-13).

**Ontology Platform:**
- https://www.palantir.com/docs/foundry/ontology/overview
- https://www.palantir.com/docs/foundry/ontology/core-concepts
- https://www.palantir.com/docs/foundry/architecture-center/ontology-system
- https://www.palantir.com/platforms/ontology/
- https://www.palantir.com/platforms/foundry/digital-twin/

**OSDK & SDK:**
- https://www.palantir.com/docs/foundry/ontology-sdk/overview
- https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration
- https://www.palantir.com/docs/foundry/ontology-sdk/unsupported-types
- https://www.palantir.com/docs/foundry/ontology-sdk/typescript-subscriptions
- https://www.palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages
- https://github.com/palantir/osdk-ts

**Functions & Logic:**
- https://www.palantir.com/docs/foundry/functions/api-object-sets
- https://www.palantir.com/docs/foundry/functions/api-objects-links
- https://www.palantir.com/docs/foundry/functions/types-reference
- https://www.palantir.com/docs/foundry/interfaces/interface-overview
- https://www.palantir.com/docs/foundry/logic/overview
- https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate
- https://www.palantir.com/docs/foundry/aip/aip-features
- https://www.palantir.com/docs/foundry/code-repositories/ontology-imports

## [§ARCH-57] New Ontology Application Patterns (AIPCon 9, March 2026)

### [§ARCH-58] "Granular Technical Ontology" — Ontology Applied to Code Itself
> Source: Ted Mabrey, Global Head of Commercial, AIPCon 9

A software provider undergoing replatforming (millions of lines of code, 5-year project) built an ontology not of BUSINESS concepts but of CODE ITSELF:
- Every code file becomes an ontology object
- Every potential database column tracked
- Interdependencies modeled in the ontology graph
- Long-running agents suggest and build new products based on the technical ontology
- Result: 5-year replatforming → <1 year

This is OOSD applied to software engineering itself — the tool used to build ontology-backed systems is itself ontology-backed. It represents a recursive application of the ontology paradigm.

### [§ARCH-59] "Flattened Ontology" — Multi-Modal Event Unification
> Source: Freedom Mortgage, AIPCon 9

Every customer interaction type (call, document, mobile event) is unified into a single flat ontology structure:
> "Each call, each document, each phone call or mobile or whatever situation... is a huge event that is now well and uniformly operating inside of the Ontology."

This pattern flattens heterogeneous input types into a single ontology-backed event model, enabling cross-modal analysis and workflow automation.

**Analysis & Commentary:**
- https://blog.palantir.com/ontology-oriented-software-development-68d7353fdb12
- https://blog.palantir.com/building-with-palantir-aip-the-ontology-software-development-kit-823fe5ac7aae
- https://www.oreateai.com/blog/beyond-the-hype-palantirs-dynamic-ontology-and-the-real-future-of-ai-in-software/48df45ef4571872d262dc081cb0e6d26
- https://theaiarchitects.substack.com/p/palantirs-digital-twin-building-the
- https://www.financialcontent.com/article/finterra-2026-3-5-palantir-pltr-2026-the-rise-of-the-logic-layer-and-the-agentic-ai-revolution
- https://blog.pebblous.ai/project/CURK/ontology/enterprise-ontology-paradigm/en/
- https://blog.pebblous.ai/project/CURK/ontology/palantir-vs-classic-ontology/en/
