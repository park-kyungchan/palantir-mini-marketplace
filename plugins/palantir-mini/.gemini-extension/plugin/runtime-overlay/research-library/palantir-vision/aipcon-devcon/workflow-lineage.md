---
title: Workflow Lineage — Decision & Workflow Observability
slug: workflow-lineage
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "palantir.com/docs/foundry/workflow-lineage/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Workflow Lineage — Decision & Workflow Observability

> **Provenance:** [Official] — palantir.com/docs/foundry/workflow-lineage/ (verified 2026-04-03)
> **Schema anchors:** `WL-01..05`, `WLG-01..10`, `REF-01..05`, `LWR-01..24`, `LWE-01..24`
> **Markers:** `[§WL-nn]`

---

## [§WL-01] Overview

Workflow Lineage is the official product surface for workflow observability. It provides interactive graph visualization of the objects, actions, and functions backing a resource, plus a Workshop panel for cross-referencing.

**5 Documentation Pages:**
1. Overview
2. Getting started
3. Perform refactors and understand your workflows
4. AIP usage metrics and observability
5. Manage security / Keyboard shortcuts

---

## [§WL-02] Interface

Two main components:
1. **Graph panel** — interactive entity relationship graph (objects, functions, actions, datasets)
2. **Workshop panel** — interactive Workshop application views, highlighting nodes used by specific components

Selecting a graph node highlights corresponding Workshop components. Selecting a Workshop widget highlights the nodes that back it.

---

## [§WL-03] Timeline (GA → Current)

| Date | Feature | Marker |
|------|---------|--------|
| 2025-11 | **Workflow Lineage GA** | — |
| 2025-11 | Derived Properties Beta | — |
| 2025-11 | Ontology Transactions Beta | — |
| 2026-01-29 | Run History Filtering (status, timestamp, user, 7-day) | [§WL-06] |
| 2026-02-03 | **Cross-Ontology** — multi-ontology visualization | [§WL-05] |
| 2026-02-10 | **Presentation Mode** — documentation-ready frames | [§WL-04] |
| 2026-02-25 | **Log Search** — service logs across functions/actions/agents, 7-day, wildcard | [§WL-03A] |
| 2026-03-03 | **Expanded Access** — Cmd+I / Ctrl+I from 14 applications | [§WL-07] |

---

## [§WL-04] Accessible From (14 Applications)

Workshop, Objects in Ontology Manager, Function repositories, Quiver dashboards, Machinery, Slate, Agent Studio, Automate, Third-party applications, Developer Console (keyboard only), Marketplace (keyboard only, draft overview tab), Notepad (navigation only), Object types in Pipeline Builder (navigation only)

---

## [§WL-05] Key Capabilities

| Capability | Description | Marker |
|-----------|------------|--------|
| [§WL-K01] Graph visualization | Entity relationship graph with nodes + edges | — |
| [§WL-K02] Workshop integration | Split-screen with live Workshop app | — |
| [§WL-K03] Log search | Full-text search across service logs (7 day), wildcard | [§WL-03A] |
| [§WL-K04] Cross-ontology | Visualize resources across multiple ontologies | [§WL-05] |
| [§WL-K05] Presentation mode | Documentation-ready graph snapshots | [§WL-04] |
| [§WL-K06] Run history | Filter by status, timestamp, user, run time, version | [§WL-06] |
| [§WL-K07] Refactoring support | Understand workflow impact before changes | — |
| [§WL-K08] AIP usage metrics | Token consumption, agent observability | — |

---

## [§WL-06] Mapping to Our System

| Workflow Lineage Feature | CC Equivalent | Status |
|-------------------------|--------------|--------|
| Graph visualization | `hookEvents` + Lineage tab in dashboard | **Implemented** |
| Log search | Dashboard search over hookEvents | **Implemented** (basic) |
| Cross-ontology | N/A (single ontology per project) | Not applicable |
| Presentation mode | N/A | Not applicable |
| Run history filtering | Dashboard filtering by sessionId, timestamp | **Implemented** |
| AIP usage metrics | `outcomeAnalysis` cron | **Implemented** |
| 5D Decision Lineage | `hookEvents`: timestamp, atopCommit, sessionId+toolName, byIdentity, withReasoning | **4.5/5D** |

**Gap:** Missing platform-level log search aggregation (7-day window, wildcard across multiple execution types). Our dashboard searches are per-session, not cross-session aggregated.

---

## Sources

- https://www.palantir.com/docs/foundry/workflow-lineage/overview/
- https://www.palantir.com/docs/foundry/workflow-lineage/getting-started/
- https://www.palantir.com/docs/foundry/workflow-lineage/refactor-and-understand-workflows/
- https://www.palantir.com/docs/foundry/workflow-lineage/aip-usage-observability/
