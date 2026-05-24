---
title: Tribal Knowledge Encoding
slug: tribal-knowledge
fileClass: vision-philosophy
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Tribal Knowledge Encoding

> **Philosophy:** How to discover, formalize, and maintain expert knowledge as typed DecisionHeuristic constants.
> **Key insight:** "The Ontology allows us to find the core principles experts work from that might not be encoded into a system anywhere — this is the tribal knowledge of our institutions."
> **Provenance:** Mixed — official Palantir articulation of institutional/tribal knowledge capture [Official] plus local DecisionHeuristic formalization model [Inference].
> **Schema anchors:** `REF-01..05`, `LES-01..05`, `WL-01..05`

## [§PHIL.TK-01] What Is Tribal Knowledge?

Tribal knowledge is the implicit decision-making expertise that experienced operators carry but rarely document. Examples:

- **Supply chain:** "If lead time exceeds 14 days AND the supplier is in zone B, always split the order across two suppliers" — known by the procurement lead, not written anywhere
- **Healthcare:** "When a patient's troponin levels are borderline, always order a repeat in 6 hours instead of relying on a single reading" — known by senior cardiologists
- **Finance:** "Never process a wire transfer over $50K on Friday afternoon — settlement won't complete until Monday, increasing counterparty risk" — known by treasury operations
- **Military:** "If three independent sensor sources disagree on target classification, escalate to human review regardless of individual confidence scores" — known by intelligence analysts

Without encoding, this knowledge is:
- **Session-dependent** — only available when the expert is present
- **Fragile** — lost when experts leave the organization
- **Inconsistent** — different experts may encode conflicting heuristics
- **Invisible** — new team members make avoidable mistakes

## [§PHIL.TK-02] The Discovery → Encoding → Lifecycle Pipeline

### [§PHIL.TK-03] Stage 1: Discovery

How to identify tribal knowledge worth encoding:

| Signal | Example | Action |
|--------|---------|--------|
| "We always..." | "We always check the backup before deploying" | Candidate for DecisionHeuristic |
| "The trick is..." | "The trick is to use timestamp, not date, for audit trails" | Candidate for HardConstraint |
| "Don't ever..." | "Don't ever delete a marking without checking downstream" | Candidate for HardConstraint |
| "It depends on..." | "It depends on whether you need filtering" | Candidate for DecisionHeuristic |
| Repeated mistakes | Same error pattern across multiple sessions | Candidate for either |
| Onboarding friction | New team members consistently confused by X | Candidate for documentation |

Discovery sources:
1. **Expert interviews** — structured Q&A with domain experts
2. **Incident post-mortems** — patterns from past failures
3. **Code review feedback** — recurring reviewer comments
4. **Support tickets** — common misunderstandings
5. **Session logs** — LLM sessions that required correction

### [§PHIL.TK-04] Stage 2: Encoding

Transform discovered knowledge into typed constants:

```typescript
// DecisionHeuristic — for conditional expert judgment
{
  id: "DH-DATA-05",
  question: "When should a property be TimeSeries vs regular timestamp?",
  options: [
    {
      condition: ">5 temporal measurements per entity",
      choice: "TimeSeries property",
      reasoning: "TimeSeries optimizes for high-frequency temporal data..."
    },
    {
      condition: "≤5 temporal values (e.g., createdAt, updatedAt)",
      choice: "Regular timestamp properties",
      reasoning: "Individual timestamp properties are simpler..."
    }
  ],
  source: "_archive/2026-04-20-palantir-consolidation/data/timeseries.md"
}

// HardConstraint — for non-negotiable rules
{
  id: "HC-DATA-03",
  domain: "data",
  rule: "Primary key must be immutable after creation",
  severity: "error",
  source: "_archive/2026-04-20-palantir-consolidation/data/entities.md",
  rationale: "PK immutability is platform-enforced..."
}
```

### [§PHIL.TK-05] Stage 3: Lifecycle

Encoded knowledge requires ongoing maintenance:

| Event | Action |
|-------|--------|
| Expert provides updated guidance | Update the DecisionHeuristic option/reasoning |
| Platform constraint changes | Update the HardConstraint rule/source |
| New option discovered | Add option to existing DecisionHeuristic |
| Heuristic proven wrong | Remove or revise with incident citation |
| Cross-domain conflict | Escalate to semantics.ts for resolution |

## [§PHIL.TK-06] Multi-Sector Examples

### [§PHIL.TK-07] Healthcare: Clinical Decision Support

| Tribal Knowledge | Encoded As | ID |
|-----------------|------------|-----|
| "Struct for vitals bundle, entity for patient" | DH-DATA-01 (struct vs entity) | DATA domain |
| "Always index by patientId for RLS" | HC-SEC-RLS-INDEX | SECURITY domain |
| "Lab results need marking levels" | DH-SEC-04 (marking strategy) | SECURITY domain |

### [§PHIL.TK-08] Logistics: Route Optimization

| Tribal Knowledge | Encoded As | ID |
|-----------------|------------|-----|
| "GeoPoint for warehouses, GeoShape for delivery zones" | DH-DATA-04 (geospatial choice) | DATA domain |
| "Route calculations are LOGIC, not DATA" | SH-02 (semantic heuristic) | Semantics |
| "Delivery confirmation is ACTION (changes reality)" | SH-03 (semantic heuristic) | Semantics |

### [§PHIL.TK-09] Finance: Risk Management

| Tribal Knowledge | Encoded As | ID |
|-----------------|------------|-----|
| "Position snapshots need TimeSeries" | DH-DATA-05 (timeseries threshold) | DATA domain |
| "Risk scores are derived (LOGIC), not stored (DATA)" | Transition zone rules | Semantics |
| "Trade execution must be atomic ACTION" | HC-ACTION-01 (atomicity) | ACTION domain |

## [§PHIL.TK-10] Our System's Tribal Knowledge

Our 51 DecisionHeuristics across 4 domains encode the tribal knowledge of ontology design:

| Domain | Count | Key Patterns |
|--------|-------|-------------|
| DATA (DH-DATA-01..12) | 12 | struct vs entity, geospatial choice, timeseries threshold, property cardinality, value type selection, shared property design |
| LOGIC (DH-LOGIC-01..14) | 14 | link cardinality, interface design, derived property scope, function boundaries, LLM tool exposure, scenario tradeoff |
| ACTION (DH-ACTION-01..16) | 16 | mutation atomicity, webhook timing, automation triggers, submission criteria, progressive autonomy, LEARN refinement, graduation policy |
| SECURITY (DH-SEC-01..09) | 9 | marking strategy, RLS/CLS policy design, role granularity, permission matrix, classification |

Plus 136 HardConstraints (HC-DATA-01..35, HC-LOGIC-01..33, HC-ACTION-01..32, HC-SEC-01..22, + 14 SEM) and 9 Consistency Invariants (CI-01..09) encoding non-negotiable platform rules discovered through implementation experience.

## [§PHIL.TK-11] The 5-Stage Progression: Tribal Knowledge → Autonomous Reasoning

The journey from implicit expertise to AI-autonomous decision-making follows five stages:

```
Stage 1: Tribal Knowledge (implicit, in experts' heads)
    ↓ Discovery (interviews, observation, incident analysis)
Stage 2: DecisionHeuristic (explicit, typed constants)
    ↓ Encoding (DH-DATA-01..12, DH-LOGIC-01..14, DH-ACTION-01..16, DH-SEC-01..09)
Stage 3: LLM-Accessible Tools (grounding mechanism)
    ↓ Operationalization (OAG, Logic Tools, Action Review)
Stage 4: Institutional Memory (decision lineage)
    ↓ Continuous Learning (LEARN feedback loop)
Stage 5: Autonomous Reasoning (self-improving decisions)
    ↓ Progressive Autonomy (staged review → full autonomy)
```

Our system is at **Stage 2-3**. The gap to Stage 4-5 requires decision lineage capture, feedback loops, and autonomous tool chaining.

### [§PHIL.TK-12] Stage 4 Gap: Three LEARN Mechanisms

Stage 4 (Institutional Memory) requires three feedback mechanisms (`LEARN_MECHANISMS` in semantics.ts):

1. **LEARN-01: Write-Back** — ACTION outcomes written back as new DATA entities, closing the SENSE→ACT loop. The twin is not a mirror — it is a control panel.
2. **LEARN-02: Evaluation Feedback** — End-users flag AI outputs (correct/incorrect), feedback captured as DATA in the ontology, leveraged via structured eval pipelines (AIP Evals) to improve AI quality. GE Aerospace demonstrated this: 2024 foundation → 2025 rigorous application → 26% more engines output.
3. **LEARN-03: Decision Outcome Tracking** — Decision results measured against predictions via Decision Lineage, outcomes that contradict DHs trigger refinement.

For LEARN-02, the key 2026 clarification is that Palantir's official evaluation surface is broader than simple human feedback:
- deterministic evaluators
- heuristic evaluators
- rubric graders / LLM-as-judge
- custom evaluation functions
- ontology edit simulators

This is the missing bridge from "feedback exists" to "the system can self-improve with explicit rubrics."

### [§PHIL.TK-13] Decision Lineage as the LEARN Mechanism

DecisionHeuristics are NOT static artifacts. Decision lineage — the automatic capture of every decision's context (WHEN/DATA VERSION/APP/WHO/WHY) — creates a feedback loop:

1. Expert encodes tribal knowledge as DH constants (Stage 2)
2. LLM sessions use DHs to make decisions (Stage 3)
3. Decision outcomes are captured as new data (Stage 4 — Decision Lineage via LEARN-03)
4. Outcomes that contradict existing DHs trigger refinement (LEARN-02 feedback loop)
5. Refined DHs improve future decisions (Stage 5 — continuous improvement)

This means DecisionHeuristics are living artifacts that evolve through decision outcomes, not static rules frozen at encoding time. The encoding lifecycle table (Stage 3 above) is the beginning — the three LEARN mechanisms extend it into a continuous improvement cycle.

> "Every action taken here compounds. The system learns and improves, enables faster, more accurate decisions tomorrow." — Centrus Energy (Patrick Brown), AIPCon 9

## [§PHIL.TK-14] Connection to LLM Grounding

DecisionHeuristics are the mechanism by which tribal knowledge becomes LLM-accessible. K-LLM (multi-model consensus) amplifies this: when multiple independent LLMs read the same DH constants and arrive at the same conclusion backed by Ontology data, the probability of hallucination is very low. See [llm-grounding.md](llm-grounding.md) for how these typed constants reduce hallucination by grounding every LLM session in the same encoded expertise.

## [§PHIL.TK-15] Sources

- https://www.palantir.com/platforms/ontology/ — "tribal knowledge of our institutions"
- https://blog.palantir.com/ontology-oriented-software-development-68d7353fdb12 — OOSD paradigm
- https://theaiarchitects.substack.com/p/palantirs-digital-twin-building-the — feedback loops
