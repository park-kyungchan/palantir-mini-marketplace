---
title: Foundry / Ontology Orchestration Map
slug: orchestration-map
fileClass: vision-architecture-gap
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Foundry / Ontology Orchestration Map

> **Purpose:** Keep the entire codebase pointed at a Palantir-style end-state instead of drifting into isolated features.
> **Status:** Cross-cutting SSoT for builder surfaces, ontology grounding, runtime digital twin, governance, LEARN, and integration expansion.
> **Provenance:** Mixed — official Palantir docs/blog for product surfaces and philosophy; adapter mapping for this repo.
> **Legacy path note:** Inline references to `.claude/research/palantir/` below refer to the pre-2026-04-20 layout. Current entry routing begins at `~/.claude/research/BROWSE.md`.

## [§ORCH-01] Why This File Exists

The codebase should not evolve as:

- one dashboard feature here
- one schema constant there
- one LEARN table somewhere else

It should evolve as a single orchestration system that mirrors Palantir's direction:

1. builders shape the ontology
2. the ontology grounds runtime reasoning
3. actions change reality through governed workflows
4. every decision is traced
5. outcomes feed explicit evaluation surfaces
6. evaluation signals refine future decisions

That is the digital twin as a self-improving decision system.

## [§ORCH-02] The 6-Layer Orchestration Map

### [§ORCH-03] ORCH-01. Builder Surfaces

**Official Palantir surfaces**
- AI FDE
- Agent Studio
- Pro-Code CLI
- Palantir MCP

**Question**
- How do developers and AI builders create ontology-backed systems quickly and coherently?

**Local mapping**
- `.claude/research/palantir/`
- `.claude/schemas/ontology/`
- prompt/skill-driven ontology generation workflows

**Design consequence**
- Research and schema files must remain the SSoT for builder behavior.
- Builder-facing and runtime-facing MCP concepts must stay separated.

### [§ORCH-04] ORCH-02. Ontology Semantic Core

**Official Palantir surfaces**
- Ontology
- OSDK
- data / logic / action / security integration

**Question**
- What is the canonical semantic model of the operational world?

**Local mapping**
- `.claude/schemas/ontology/semantics.ts`
- `.claude/schemas/ontology/{data,logic,action,security}/schema.ts`
- `frontend-dashboard/ontology/`

**Design consequence**
- Every runtime table or UI construct must trace back to ontology semantics, not ad hoc dashboard needs.

### [§ORCH-05] ORCH-03. Runtime Digital Twin

**Official Palantir surfaces**
- Ontology queries
- functions
- actions
- automations
- object storage / Funnel / runtime surfaces

**Question**
- How does the digital twin actually SENSE, DECIDE, and ACT?

**Local mapping**
- `frontend-dashboard/convex/schema.ts`
- `frontend-dashboard/convex/{queries,mutations,outcomeActions,approvalWorkflow,refinement}.ts`
- hooks and runtime event ingestion

**Design consequence**
- Runtime must preserve the SENSE → DECIDE → ACT chain as explicit, inspectable layers.

### [§ORCH-06] ORCH-04. Governance and Lineage

**Official Palantir surfaces**
- Workflow Lineage
- project permissions
- staged review / AIP Automate
- markings / security

**Question**
- How is the system made trustworthy enough to allow autonomy?

**Local mapping**
- `hookEvents`
- decision lineage fields
- `pendingDecisions`
- `approvalWorkflow`
- Audit / Lineage UI

**Design consequence**
- Governance is not optional friction. It is the substrate that enables higher autonomy.

### [§ORCH-07] ORCH-05. LEARN and BackPropagation

**Official Palantir surfaces**
- AIP Evals
- evaluation feedback
- ontology edit simulator
- decision outcome tracking
- workflow lineage traces

**Question**
- How does the system improve rather than merely record?

**Local mapping**
- `feedbackEvents`
- `outcomeRecords`
- `dhAccuracyScores`
- `refinementSignals`
- `dhUpdateProposals`
- `automationGraduation`
- `evaluationRubrics`
- `rubricEvaluations`

**Design consequence**
- LEARN must mean explicit evaluators, explicit rubrics, and explicit refinement signals.
- Thumbs-up/down alone is not enough.

### [§ORCH-08] ORCH-06. Integration and Expansion

**Official Palantir surfaces**
- Ontology MCP
- Listeners
- Branching
- external agent integration
- edge / sovereign deployment direction

**Question**
- How does the system connect to external agents, external events, and future deployment surfaces?

**Local mapping**
- MCP readiness checks
- hook routes
- schema-audit emit
- ontology sync
- future listener-like ingestion patterns

**Design consequence**
- External protocol surfaces should be modeled as interfaces and expansion points, not confused with the platform-native core.

## [§ORCH-09] Codebase Mapping

| Layer | Core Files |
|------|------------|
| ORCH-01 Builder | `.claude/research/palantir/platform/devcon.md + platform/aipcon.md`, `.claude/research/palantir/platform/announcements.md`, `.claude/schemas/ontology/semantics.ts` |
| ORCH-02 Semantic Core | `.claude/schemas/ontology/`, `frontend-dashboard/ontology/` |
| ORCH-03 Runtime Twin | `frontend-dashboard/convex/` |
| ORCH-04 Governance / Lineage | `frontend-dashboard/convex/http.ts`, `frontend-dashboard/convex/approvalWorkflow.ts`, `frontend-dashboard/src/components/lineage/`, `frontend-dashboard/src/components/audit/` |
| ORCH-05 LEARN / REF | `frontend-dashboard/convex/refinement.ts`, `frontend-dashboard/convex/outcomeActions.ts`, `frontend-dashboard/src/components/audit/AuditPanel.tsx` |
| ORCH-06 Integration | `frontend-dashboard/hooks/`, `frontend-dashboard/convex/http.ts`, MCP readiness logic in schema constants and audits |

## [§ORCH-10] What “Good” Looks Like

A codebase aligned with Palantir's current direction should satisfy all of these:

1. Builder surfaces are explicit, not implicit.
2. The ontology is the semantic center, not the UI or DB schema.
3. Runtime actions are governed and traced.
4. LEARN has explicit evaluation artifacts, not only comments.
5. Autonomy promotion is based on measured evidence.
6. External integration surfaces are modeled without pretending platform internals are OSS.

## [§ORCH-11] Current Directional Rule

When making changes, prefer the question:

> "Does this strengthen one of the 6 orchestration layers without weakening the authority chain?"

If the answer is no, the change is probably not moving the codebase toward the intended Palantir-style end state.

## [§ORCH-12] Sources

- https://www.palantir.com/docs/foundry/ai-fde/overview/
- https://www.palantir.com/docs/foundry/pilot/overview/ — historical/stale; returned 404 on 2026-03-17 audit
- https://www.palantir.com/docs/foundry/palantir-mcp/overview/
- https://www.palantir.com/docs/foundry/ontology-mcp/overview/
- https://www.palantir.com/docs/foundry/aip-evals/create-suite/
- https://www.palantir.com/docs/foundry/aip-evals/evaluate-ontology-edits/
- https://www.palantir.com/docs/foundry/announcements/2026-03/
- https://www.palantir.com/docs/foundry/announcements/2026-02/
- https://www.palantir.com/docs/foundry/announcements/2026-01/
