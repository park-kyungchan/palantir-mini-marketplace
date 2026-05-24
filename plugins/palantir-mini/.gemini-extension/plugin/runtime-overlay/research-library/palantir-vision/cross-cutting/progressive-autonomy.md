---
title: "Progressive Autonomy — reviewLevel, approvalWorkflow, AIP Automate"
slug: progressive-autonomy
fileClass: vision-cross-cutting
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://www.investing.com/news/transcripts/palantir-at-aipcon-9-ai-transformations-across-industries-93CH-4557860", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology-c73f7b0a1a72", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---
# Progressive Autonomy — reviewLevel, approvalWorkflow, AIP Automate

> **Layer:** CROSS (spans ACTION + SECURITY + LEARN)
> **SSoT for:** PA-01..05 levels, reviewLevel property, approvalWorkflow, AIP Automate staged review mechanics, graduation criteria
> **Provenance:** Mixed — PA-01..05 5-level numbering is [Inference from AIPCon deployment demos + developer statement], NOT official Palantir terminology. Official Palantir mechanism is binary: staged review vs auto-apply. AIP Automate mechanics from platform docs [Official]. reviewLevel/approvalWorkflow as ontology properties [Inference/Adapter].

## [§PA-01] Overview

Progressive Autonomy is our analytical framework [Inference] for describing how Palantir customers incrementally increase AI automation as trust builds through measured outcomes. The PA-01..05 five-level graduation system does not appear in official Palantir documentation — it is synthesized from AIPCon deployment demos (GE Aerospace, Centrus Energy, Nebraska Medicine) and a developer practitioner's statement. Official Palantir offers binary AIP Automate: staged review (human-reviewed proposals, 24h window) OR auto-apply. It governs the transition from human-directed to AI-autonomous operations, using staged review mechanics and outcome tracking to ensure safety at each level.

## [§PA-02] The 5 Autonomy Levels

> **[Inference — synthesized from AIPCon deployment demos + developer practitioner framing]** These 5 levels are a local analytical ladder, not an official Palantir taxonomy.

| Level | Name | Description | Decision Flow | Example |
|-------|------|-------------|---------------|---------|
| PA-01 | **Monitor** | System observes and reports | Human decides, system displays | Dashboard shows anomalies |
| PA-02 | **Recommend** | System suggests actions to humans | System proposes, human decides and executes | "Consider rebalancing sector X" |
| PA-03 | **Approve-then-act** | System prepares actions, human approves | System proposes + prepares, human approves, system executes | AIP Automate staged review; ShipOS 3-COA trade-offs |
| PA-04 | **Act-then-inform** | System executes, human is notified | System decides + executes, human monitors | Automated maintenance scheduling |
| PA-05 | **Full autonomy** | System operates independently | System decides + executes within boundaries | Algorithmic trading within risk limits |

## [§PA-03] AIP Automate — Official Binary Mechanism

> **[Official — palantir.com/docs/foundry/logic/aip-logic-integration-automate]**

AIP Automate provides the official binary mechanism that our local PA ladder maps onto most directly at PA-03 and PA-04:

### [§PA-04] Staged Review (PA-03)

1. Automation condition triggers (one of 6 condition types)
2. AIP Logic evaluates and generates proposed edits
3. Proposals appear in **Proposals tab** with **24-hour visibility window**
4. Reviewer inspects proposed edits + **Agent decision log** (LLM reasoning)
5. **Accept** → Action executes automatically; proposal moves to "Applied" column
6. **Reject** → Proposal expires, no edits applied

### [§PA-05] Auto-Apply (PA-04)

When staged review demonstrates consistent accuracy, workflows can graduate to auto-apply:
- Edits applied automatically without human review
- Human notified post-execution
- Requires measured trust from staged review phase

### [§PA-06] Graduation Criteria

> **[Official — AIPCon demonstrations + platform docs]**

| Criterion | What It Measures | Threshold |
|-----------|-----------------|-----------|
| **Accuracy rate** | % of proposals accepted without modification | Domain-specific |
| **Risk profile** | Does automation touch sensitive/high-value objects? | Low risk for auto-apply |
| **Volume** | High-volume, low-risk → best auto-apply candidates | Cost-benefit of review overhead |
| **Reversibility** | Can edits be easily undone? | Reversible actions graduate faster |

## [§PA-07] reviewLevel and approvalWorkflow Properties

> **[Provenance: Inference/Adapter]** These are properties we define on ACTION concepts in our ontology system. Palantir's platform implements this through AIP Automate configuration, not through explicit ontology properties.

### [§PA-08] reviewLevel

Specifies the PA level at which an action operates:

```typescript
reviewLevel: "PA-01" | "PA-02" | "PA-03" | "PA-04" | "PA-05"
```

- Declared in `ontology/action.ts` on each mutation/automation definition
- Controls how the CC adapter handles the action (dashboard display vs approval workflow vs direct execution)
- **Not a Palantir official property** — our adapter concept for capturing PA level in the ontology

### [§PA-09] approvalWorkflow

Specifies the approval mechanism for PA-03+ actions:

- Links to a specific approval flow (staged review queue, multi-person approval, etc.)
- In our CC adapter: implemented via `pendingDecisions` table + `permission-gate.ts` hook
- **Not a Palantir official property** — our adapter concept for modeling AIP Automate's staging behavior

## [§PA-10] Governance Enables Autonomy

> **[Official — AIPCon 9 demonstrations]**

The governance layer is NOT a brake on AI — it is the mechanism that ENABLES higher autonomy levels. Every action is governed by 5 dimensions (`ACTION_GOVERNANCE` in semantics.ts):

1. **Who can invoke it** (RBAC — SECURITY)
2. **Under what conditions** (submission criteria — ACTION)
3. **With what review level** (progressive autonomy — PA-01..PA-05)
4. **What it changes** (typed edits — Mutation, Webhook, Automation)
5. **What trace it leaves** (decision lineage — see decision-lineage.md)

Without auditable, staged, reversible actions, organizations cannot trust AI enough to let it act. Governance makes autonomy possible.

> "For us in the nuclear field, you have to audit everything. The NRC isn't very comfortable with agentic autonomous control. Having every action traceable is critical." — Centrus Energy (Patrick Brown), AIPCon 9

## [§PA-11] AIPCon Deployment Evidence

| Deployment | PA Level Demonstrated | Evidence |
|-----------|----------------------|---------|
| Nebraska Medicine | PA-01 → PA-02 graduation | Started with human review, gradually automated low-risk decisions |
| Centrus Energy | PA-01/PA-02 with full audit | Nuclear compliance demands traceability before any automation |
| ShipOS (US Navy) | PA-03 | 3-COA trade-offs with quantified impact, human selects |
| GE Aerospace | PA-02 → PA-04 progression | 2024 foundation → 2025 rigorous application → 26% more engines |
| US CDAO | PA-03 | COA generation with human selection |

## [§PA-12] Cross-References

- See `cross-cutting/decision-lineage.md` for the audit trail that enables trust-building
- See `philosophy/digital-twin.md` for governance-enables-autonomy thesis
- See `action/automation.md` for AIP Automate condition types and effect types
- See `action/README.md` for the 3-tier progressive autonomy overview

## [§PA-13] Sources

- https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate (AIP Automate staged review)
- https://www.investing.com/news/transcripts/palantir-at-aipcon-9-ai-transformations-across-industries-93CH-4557860 (AIPCon 9 demonstrations)
- https://blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology-c73f7b0a1a72 (governance enables autonomy)
