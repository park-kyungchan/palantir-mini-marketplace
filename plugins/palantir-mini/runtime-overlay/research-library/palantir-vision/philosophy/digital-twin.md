---
title: Digital Twin — SENSE-DECIDE-ACT-LEARN
slug: digital-twin
fileClass: vision-philosophy
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Digital Twin — SENSE-DECIDE-ACT-LEARN

> **Philosophy:** The ontology as a digital twin implementing a continuous feedback loop.
> **Key insight:** The 3-domain partition (DATA-LOGIC-ACTION) maps directly to SENSE-DECIDE-ACT, with LEARN as the feedback mechanism that closes the loop.
> **Provenance:** Mixed — Digital twin platform page [Official]; SENSE→DECIDE→ACT→LEARN mapping [Inference]; AIPCon deployment examples [Official]; progressive autonomy [Inference]; LEARN mechanisms [Official/Inference]

## [§PHIL.DT-01] The Digital Twin Concept

A digital twin is a dynamic, continuously-updated model of a real-world system. Unlike a static schema, a digital twin:

- **Reflects current reality** — data changes as the world changes
- **Enables reasoning** — logic computes over current state to inform decisions
- **Executes actions** — decisions translate into real-world changes
- **Learns from outcomes** — action results feed back as new data

The Palantir Ontology is a digital twin of the organization's operations. Our `ontology/*.ts` definitions are the blueprint; `convex/` is the runtime twin.

## [§PHIL.DT-02] The SENSE-DECIDE-ACT-LEARN Loop

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  SENSE (Ingest)                                     │
│  ┌──────────────────────────────┐                   │
│  │ Multi-modal semantic data    │                   │
│  │ integration from ERPs, CRMs, │                   │
│  │ sensors, databases, APIs     │                   │
│  └──────────┬───────────────────┘                   │
│             │                                       │
│             ▼                                       │
│  DECIDE (Reason)                                    │
│  ┌──────────────────────────────┐                   │
│  │ AI/ML modeling, simulation,  │                   │
│  │ human judgment, functions,   │                   │
│  │ derived properties, alerts   │                   │
│  └──────────┬───────────────────┘                   │
│             │                                       │
│             ▼                                       │
│  ACT (Execute)                                      │
│  ┌──────────────────────────────┐                   │
│  │ Mutations, webhooks,         │                   │
│  │ automations, external sync,  │                   │
│  │ operational changes          │                   │
│  └──────────┬───────────────────┘                   │
│             │                                       │
│             ▼                                       │
│  LEARN (Feedback)                                   │
│  ┌──────────────────────────────┐                   │
│  │ Decision outcomes captured   │                   │
│  │ as new data, model accuracy  │                   │
│  │ improved, heuristics refined │                   │
│  └──────────┬───────────────────┘                   │
│             │                                       │
│             └───────── feeds back to SENSE ─────────┘
└─────────────────────────────────────────────────────┘
```

## [§PHIL.DT-03] Mapping to Domain Architecture

| Loop Stage | Domain | Role | Examples |
|-----------|--------|------|----------|
| **SENSE** | DATA | Captures current state of reality | Entity definitions, property values, ingested records |
| **DECIDE** | LOGIC | Reasons about state to inform decisions | Functions, derived properties, link traversal, impact propagation |
| **ACT** | ACTION | Executes decisions that change reality | Mutations, webhooks, automations, scheduled actions |
| **LEARN** | DATA (feedback) | Captures outcomes as new state | Action logs, updated metrics, corrected predictions |

The loop is continuous. Every ACT produces LEARN data that becomes new SENSE input. The ontology maintains fidelity between the digital twin and physical reality through this feedback mechanism.

### [§PHIL.DT-04] SENSE = DATA Layer

DATA is the SENSE output — structured representations of what the world looks like right now:

- **Entities** ingest from ERPs, CRMs, sensors, databases
- **Properties** capture measured, observed, or reported values
- **Geospatial data** represents physical locations and regions
- **TimeSeries** captures temporal measurements
- **Attachments** store documents, images, and files

The key constraint: SENSE captures **what IS**, not what it means or what to do about it. A sensor reading of 42°C is DATA. The interpretation "that's too hot" is LOGIC. The action "shut down the reactor" is ACTION.

### [§PHIL.DT-05] DECIDE = LOGIC Layer

LOGIC is the DECIDE engine — it reasons about current state to produce recommendations:

- **Link traversal** finds related entities affected by a change
- **Derived properties** compute interpretations from raw data
- **Functions** encode expert decision logic
- **Impact propagation** traces cascading effects through the graph

LOGIC produces descriptions of what SHOULD happen without executing. Edit functions return `Edits[]` — a plan, not an execution. This separation enables:
- `$validateOnly: true` — check the plan before executing
- `$returnEdits: true` — execute the action AND return details of all applied edits (post-commit inspection)
- Unit testing via `verifyOntologyEditFunction()` — verify the plan produces correct edits

### [§PHIL.DT-06] ACT = ACTION Layer

ACTION is the execution layer — it commits the decisions that LOGIC described:

- **Mutations** apply edits to entities (create, modify, delete)
- **Webhooks** push changes to external systems (pre/post-commit)
- **Automations** trigger actions based on events or schedules
- **Submission criteria** gate execution with business rules

ACTION is kinetic — it changes reality. Once executed, the effects become new DATA (closing the loop).

### [§PHIL.DT-07] LEARN = Feedback Mechanism

LEARN is not a separate domain — it is the feedback path from ACTION back to DATA. It operates through three distinct mechanisms (`LEARN_MECHANISMS` in semantics.ts):

#### LEARN-01: Write-Back to Operational Systems

> "In advanced deployments, the twin is not a mirror. It is a control panel. Changes made in Foundry can push back into downstream systems, update ERP states, trigger work orders, or reconfigure supply plans." — The AI Architect, Substack

ACTION outcomes are written back as new DATA entities:
- Mutation results → new entity state in the database
- Webhook responses → external system state updates
- Action logs → captured as DATA for the next SENSE cycle

#### LEARN-02: Evaluation Feedback Loop

> "Users can set up a feedback loop where end-users flag AIP outputs, capturing their feedback in the Ontology, then leverage that feedback in the AI development cycle by integrating it dynamically into AIP Evals." — Palantir docs

End-users flag AI outputs (correct/incorrect), feedback is captured as DATA in the ontology — not lost in chat history. AIP Evals uses this feedback to measure and improve AI quality:
- AI produces output → user rates it → feedback captured as DATA
- Eval suites incorporate feedback → improve model/prompt quality → better outputs

Verified official AIP Evals surfaces clarify what "evaluation" means in practice:
- deterministic evaluators
- heuristic evaluators
- rubric grader / LLM-as-judge patterns
- custom evaluation functions
- ontology edits simulator
- run results written to datasets

This matters for our system: LEARN-02 should not stop at thumbs-up/down. A self-improving digital twin needs explicit rubric criteria and evaluator provenance so outcomes can be measured, trended, and backpropagated.

#### LEARN-03: Decision Outcome Tracking

> "Every action taken here compounds. The system learns and improves, enables faster, more accurate decisions tomorrow." — Centrus Energy, AIPCon 9

Every decision's outcome is measured against its prediction via Decision Lineage:
- Decision context recorded (WHEN/ATOP/THROUGH/BY/WITH)
- Outcome measured post-execution (was the decision right?)
- Outcomes that contradict existing DecisionHeuristics trigger refinement
- DHs evolve from static tribal knowledge into continuously-improved institutional memory

In our system, LEARN manifests as:
- Convex mutation results written back to the database (new DATA)
- Schema test failures triggering heuristic updates
- User feedback captured in memory files informing future sessions

## [§PHIL.DT-08] Multi-Sector Twin Examples

### [§PHIL.DT-09] Manufacturing: Production Line Twin

```
SENSE:  IoT sensors → temperature, pressure, vibration readings (DATA entities)
DECIDE: Anomaly detection function flags bearing wear pattern (LOGIC function)
ACT:    Create maintenance work order, notify technician (ACTION mutation + webhook)
LEARN:  Work order completion time + actual failure mode → improve anomaly model
```

### [§PHIL.DT-10] Healthcare: Patient Care Twin

```
SENSE:  Lab results, vital signs, imaging reports (DATA entities)
DECIDE: Clinical decision support flags drug interaction risk (LOGIC derived property)
ACT:    Alert prescribing physician, suggest alternative (ACTION automation)
LEARN:  Physician's decision (accept/override) → refine interaction model
```

### [§PHIL.DT-11] Finance: Portfolio Risk Twin

```
SENSE:  Market data feeds, position reports, counterparty info (DATA entities)
DECIDE: VaR calculation identifies concentrated sector exposure (LOGIC function)
ACT:    Generate rebalancing recommendation, execute approved trades (ACTION mutation)
LEARN:  Actual P&L vs predicted → calibrate risk model parameters
```

### [§PHIL.DT-12] Our SaveTicker Project

```
SENSE:  Stock prices, news articles ingested via API (DATA: Stock, NewsArticle entities)
DECIDE: Price direction derived from changes, relevance scoring (LOGIC: derived properties)
ACT:    Add to watchlist, refresh prices on schedule (ACTION: mutations, cron automation)
LEARN:  User watchlist engagement → inform which stocks to highlight
```

## [§PHIL.DT-13] AIPCon Demonstrations — The Digital Twin in Practice

Real-world deployments from AIPCon 6-9 demonstrate the SENSE-DECIDE-ACT-LEARN loop at scale:

### [§PHIL.DT-14] ShipOS (US Navy — AIPCon 9)
- Ontology models the entire naval shipbuilding supply chain (shipbuilders, shipyards, suppliers)
- Engineering change notice triggers **automatic cascade analysis** through the Ontology
- System presents 3 decision paths with quantified trade-offs (days, dollars, risk score)
- 200-hour BOM preparation compressed to 15 seconds — the decision takes 15 seconds, the preparation that used to take 200 hours is pre-computed by the ontology
- Email-based supplier communications automatically triaged by AI agents
- **"What used to land on somebody's desk as a problem now arrives as a decision with context, options, and trade-offs already mapped"**

### [§PHIL.DT-15] World View (Stratospheric Platforms — AIPCon 9)
- "Every mission, the ontology becomes a **living memory** of the operation"
- Past events, decisions, and outcomes enrich every future flight plan
- AI Flight Director compressed mission planning from 2 weeks to minutes
- **"The stratosphere ceases being a platform that collects data and starts becoming a platform that participates in decisions"**

### [§PHIL.DT-16] Andretti RaceOS (AIPCon 8)
- Ultra-high-frequency sensor fusion from race telemetry into Ontology entities
- Real-time LOGIC layer processes tire degradation, fuel strategy, weather impact
- Post-session intelligence generated in minutes (previously hours of manual analysis)
- The LEARN loop feeds race outcomes back to improve future strategy models

### [§PHIL.DT-17] Nebraska Medicine (AIPCon 8)
- Agentic Revenue Cycle Management: AI agents chain DATA queries + LOGIC tools + ACTION proposals
- Guideline Evaluation completed in 10 hours (previously weeks of manual review)
- Progressive autonomy applied: started with human review of every AI recommendation, gradually automated low-risk decisions

## [§PHIL.DT-18] Progressive Autonomy

> **[Inference from AIPCon deployment demos]** PA-01..PA-05 is our analytical framework. Official Palantir: binary staged review vs auto-apply.

The digital twin enables progressive autonomy — increasing automation as confidence grows:

| Level | Description | Example |
|-------|-------------|---------|
| 1. **Monitor** | Twin observes and reports | Dashboard shows anomalies |
| 2. **Recommend** | Twin suggests actions to humans | "Consider rebalancing sector X" |
| 3. **Approve-then-act** | Twin prepares actions, human approves | AIP Automate staged review |
| 4. **Act-then-inform** | Twin executes, human is notified | Automated maintenance scheduling |
| 5. **Full autonomy** | Twin operates independently | Algorithmic trading within risk limits |

Palantir's AIP Automate implements this progression through staged review mechanics — each automation starts at Level 2 and can be promoted as confidence builds. The concrete implementation: AIP Automate provides a review queue where AI-proposed actions are presented with full decision context (what data informed the decision, which logic was applied, what the predicted impact is), enabling reviewers to build calibrated trust before increasing autonomy.

### [§PHIL.DT-19] Graduation Pattern

Autonomy increases as trust is earned through measured accuracy:
1. Start at PA-01 (Monitor) — prove the system observes correctly
2. Graduate to PA-02 (Recommend) — prove recommendations are useful
3. Graduate to PA-03 (Approve-then-act) — prove staged edits are safe
4. Graduate to PA-04 (Act-then-inform) — prove autonomous actions are reliable
5. Graduate to PA-05 (Full autonomy) — prove risk boundaries are respected

Each graduation requires measured accuracy of previous level's outputs, user feedback data (AIP Evals / LEARN-02), and lineage showing decision quality over time.

### [§PHIL.DT-20] Governance Enables Autonomy

The governance layer is NOT a brake on AI — it is the mechanism that ENABLES higher autonomy levels. Every action is governed by 5 dimensions (`ACTION_GOVERNANCE` in semantics.ts):

1. **Who can invoke it** (RBAC — SECURITY_OVERLAY)
2. **Under what conditions** (submission criteria — HC-ACTION-05)
3. **With what review level** (progressive autonomy — PA-01..PA-05)
4. **What it changes** (typed edits — Mutation, Webhook, Automation)
5. **What trace it leaves** (decision lineage — WHEN/ATOP/THROUGH/BY/WITH)

Without auditable, staged, reversible actions, organizations cannot trust AI enough to let it act. Governance makes autonomy possible.

## [§PHIL.DT-21] The Self-Healing Enterprise Vision

The ultimate direction is the **self-healing enterprise** — an organization where the SENSE-DECIDE-ACT-LEARN loop operates autonomously:

1. **SENSE:** Multi-modal data integration from ALL sources (ERPs, sensors, emails, PDFs, images, video, IoT) flows into the Ontology in real-time
2. **DECIDE:** AI agents orchestrate multiple logic tools (LLMs + deterministic functions + optimization models + simulation) to evaluate decisions
3. **ACT:** Approved decisions automatically execute across all enterprise substrates (transactional systems, edge devices, SaaS applications)
4. **LEARN:** Every decision outcome is captured as new data via Decision Lineage, enriching future decisions

The self-healing enterprise detects anomalies (SENSE), diagnoses root causes (DECIDE), executes corrective actions (ACT), and improves its diagnostic models from the outcome (LEARN) — all within the Ontology's security and audit framework.

### [§PHIL.DT-22] Decision Lineage as the LEARN Mechanism

Decision lineage is not merely "capturing outcomes." It is the structured recording of:
- **Decision context** — which data, at which version, informed the decision
- **Decision logic** — which functions, heuristics, and AI models contributed
- **Decision outcome** — what actually happened after execution
- **Feedback signal** — did the outcome match predictions? If not, which DHs need refinement?

This closes the loop: DecisionHeuristics (Stage 2) improve through decision outcomes (Stage 4), enabling the system to learn from its own operational history.

### [§PHIL.DT-23] Agentic Workflows

AI agents within the Ontology can chain together DATA queries (OAG Pattern 1), LOGIC tools (Pattern 2), and ACTION proposals (Pattern 3) — executing multi-step workflows without human intervention for low-risk, high-confidence decisions. K-LLM consensus (multiple models agreeing on the same Ontology-grounded conclusion) provides additional confidence for autonomous workflows. Nebraska Medicine's agentic RCM and ShipOS's automated supply chain triage are concrete implementations of this pattern.

## [§PHIL.DT-24] Semantic Modeling for Twin Fidelity

The digital twin is more than a feedback loop diagram. It is a **semantic modeling paradigm** where typed definitions maintain correspondence between twin and reality. Without semantic modeling, the twin drifts from reality (`TWIN_FIDELITY_DIMENSIONS` in semantics.ts):

| Dimension | Without Semantics | With Semantics |
|-----------|------------------|----------------|
| **Entity Correspondence (TF-01)** | Ad-hoc fields, twin diverges per session | ObjectType with exhaustive typed properties — identical shape across sessions |
| **Relationship Faithfulness (TF-02)** | No cardinality, ambiguous traversal | LinkType with M:1/1:M/M:N — deterministic traversal |
| **Interpretation Consistency (TF-03)** | "Risk score" computed differently per session | DerivedProperty with explicit formula — deterministic computation |
| **Action Determinism (TF-04)** | Free-form mutations, inconsistent validation | Typed Mutation with submission criteria — deterministic execution |
| **Temporal Coherence (TF-05)** | Twin reflects yesterday's reality | LEARN loop continuously updates twin state |

### [§PHIL.DT-25] Twin Maturity Progression

A digital twin evolves through 5 maturity stages, each requiring the previous stage's semantic infrastructure (`TWIN_MATURITY_STAGES` in semantics.ts):

| Stage | Name | Semantic Requirement | Example |
|-------|------|---------------------|---------|
| 1 | **Snapshot** | DATA (ObjectTypes, Properties) | Static asset registry |
| 2 | **Mirror** | DATA + real-time ingestion | Live production dashboard |
| 3 | **Model** | DATA + LOGIC (Links, DerivedProperties, Functions) | Predictive maintenance |
| 4 | **Operator** | DATA + LOGIC + ACTION (Mutations, submission criteria) | AIP Automate staged review |
| 5 | **Living System** | Full LEARN loop (all 3 LEARN_MECHANISMS + DECISION_LINEAGE) | World View: ontology as living memory |

Stage 3 (Model) is the critical inflection point — where the twin transitions from "display" to "understanding." This is where LOGIC enters: LinkTypes enable impact propagation, DerivedProperties enable interpretation, Functions encode tribal knowledge as computation. Without Stage 3, you have a dashboard. With it, you have an operating system.

### [§PHIL.DT-26] Additional AIPCon Deployments

**GE Aerospace (AIPCon 8-9):**
- Foundation laid in 2024, rigorous application of operational processes in 2025 resulted in **26% more engines output** year-over-year
- The LEARN loop accumulates: each production cycle's outcomes improve the next cycle's planning models

**Centrus Energy — Nuclear (AIPCon 9):**
- "For us in the nuclear field, you have to audit everything. The NRC isn't very comfortable with agentic autonomous control. Having every action traceable is critical."
- Progressive autonomy applied cautiously: nuclear compliance demands PA-01/PA-02 with full audit trail before any automation

**Ted Mabrey (Palantir, Global Head of Commercial — AIPCon 9):**
- Long-running agents operate as advocates for every component in every product on every line — described for a tier one automotive supplier

## [§PHIL.DT-27] Connection to Other Philosophy Files

- [tribal-knowledge.md](tribal-knowledge.md) — LEARN stage captures and encodes expert knowledge into DecisionHeuristics; 5-stage progression from tribal knowledge to autonomous reasoning
- [llm-grounding.md](llm-grounding.md) — The digital twin's typed definitions ground LLM sessions in verified reality; three hallucination reduction patterns enable safe agentic workflows

## [§PHIL.DT-28] Sources

- https://www.palantir.com/platforms/foundry/digital-twin/ — Palantir digital twin platform
- https://theaiarchitects.substack.com/p/palantirs-digital-twin-building-the — digital twin architecture
- https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate — AIP Automate progressive autonomy
- https://www.palantir.com/docs/foundry/ontology/core-concepts — ontology as operational backbone
- https://www.palantir.com/docs/foundry/aip/aip-features/ — AIP Automate, Machinery, AIP Evals
- https://www.palantir.com/docs/foundry/announcements/2025-11 — Workflow Lineage announcement
- https://www.investing.com/news/transcripts/palantir-at-aipcon-9-ai-transformations-across-industries-93CH-4557860 — AIPCon 9 transcript (ShipOS, World View, Centrus Energy, GE)
