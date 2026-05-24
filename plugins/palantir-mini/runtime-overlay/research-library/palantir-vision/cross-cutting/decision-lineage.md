---
title: "Decision Lineage & Workflow Lineage"
slug: decision-lineage
fileClass: vision-cross-cutting
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "https://blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology-c73f7b0a1a72", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://www.palantir.com/docs/foundry/announcements/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---
# Decision Lineage & Workflow Lineage

> **Layer:** CROSS (spans all domains — specifically the LEARN feedback mechanism)
> **SSoT for:** Decision Lineage 5 dimensions, Workflow Lineage product features, LEARN-03 relationship
> **Provenance:** Mixed — Decision Lineage concept from Chief Architect blog post [Official]; 5D schema from same [Official]; Workflow Lineage product features from announcements [Official]; our implementation mapping [Adapter]
> **Schema anchors:** `WL-01..05`, `REF-01..05`, `WLG-01..10`, `WLG-C-01..04`, `LWR-01..24`, `LWE-01..24`

## [§DL-01] Overview

**"Decision Lineage" is NOT an official Palantir product name.** It is a conceptual phrase coined by Chief Architect Akshay Krishnaswamy in a January 2024 blog post to describe the full-context capture of every decision made through the Ontology. The actual platform product implementing this concept is **Workflow Lineage** (GA November 2025, formerly "Workflow Builder"). The term "decision lineage" does not appear in official Foundry documentation or announcements — only in the blog post.

Decision Lineage as a concept is the mechanism by which the LEARN feedback loop closes — transforming the Ontology from a static model into a continuously-improving decision engine.

> **[Official]** "The Ontology is designed to represent the DECISIONS in an enterprise, not simply the data." — Chief Architect Akshay Krishnaswamy, Jan 2024

**Workflow Lineage** is the product feature (GA November 2025) that implements decision lineage at the platform level — tracing, logging, and run history views across ontology resources, executable resources, applications, and language models.

## [§DL-02] The 5 Dimensions of Decision Lineage

> **[Official — blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology]**

Every decision made through the Ontology is captured as an artifact with:

| Dimension | Question | What It Records |
|-----------|----------|----------------|
| **WHEN** | When was the decision made? | Timestamp of decision execution |
| **ATOP WHICH** | What data version informed the decision? | Ontology state / data snapshot at decision time |
| **THROUGH WHICH** | What application was used? | Workshop, Object Explorer, OSDK app, AIP agent |
| **BY WHOM** | Who (or what) made the decision? | Human user, AI agent, automated system |
| **WITH WHAT** | What reasoning was applied? | Logic functions invoked, LLM reasoning, heuristics applied |

These 5 dimensions transform individual decisions into institutional memory — each decision feeds back into the Ontology, enriching future decisions.

## [§DL-03] Workflow Lineage (Product Feature)

> **[Official — palantir.com/docs/foundry/announcements/]**

### [§DL-04] Timeline

| Date | Feature | Significance |
|------|---------|-------------|
| Nov 2025 | **Workflow Lineage GA** | Tracing, logging, run history for functions/actions/automations/LMs |
| Feb 2026 | **Cross-Ontology visualization** | Resources across multiple ontologies in one graph |
| Feb 2026 | **Log Search** | Search across all service logs from any executable resource (7-day window, wildcard) |
| Feb 2026 | **Presentation Mode** | Presentation-ready graph views |
| Mar 2026 | **Expanded access** | Cmd+I/Ctrl+I from 14+ applications; automation trigger linking; color legends (14+ options) |

### [§DL-05] Official Graph Model

| Node Type | Details Surface |
|-----------|-----------------|
| **Object Types** | Properties, usage provenance counts, links, backing datasource, data preview |
| **Object Links** | Usage by objects, functions, actions, Workshop applications |
| **Actions** | API name, RID, inputs, edits, submission criteria, code, action log |
| **Functions** | Inputs, outputs, dependencies, repository, code view |
| **AIP Logic Functions** | Dependencies, automations, creation metadata |
| **Language Models** | Description, creator metadata, context windows |
| **Workshop Applications** | Creation metadata, dependencies, view count |
| **Automations** | Property usages, condition dependencies, trigger connections |
| **Interfaces** | Cross-ontology resources with warning styling |
| **Text Nodes** | User-authored Markdown annotations |

### [§DL-06] Official Graph Controls

- **Hidden by default:** Object→Action edges, Object→Object edges, automation trigger edges
- **Color legend groups:** General, Permissions, Usage, Organization
- **Refactoring tools:** property provenance, function-backed action upgrade, bulk Workshop publish/delete, bulk submission-criteria update, bulk ontology role grant
- **AIP usage observability:** successful requests, attempted requests, rate-limited requests, model request count, token usage

### [§DL-07] Relationship: Decision Lineage (Concept) vs Workflow Lineage (Product)

| Aspect | Decision Lineage | Workflow Lineage |
|--------|-----------------|-----------------|
| **Nature** | Conceptual framework (5D model) | Product feature (GA platform tool) |
| **Scope** | Any decision, any system | Executable Foundry resources |
| **Origin** | Chief Architect blog (Jan 2024) | Platform announcements (Nov 2025) |
| **Implementation** | Partially implemented via Workflow Lineage | Platform-native tracing + logging |

Decision Lineage is the architectural vision; Workflow Lineage is the (evolving) implementation. Not all 5 dimensions are fully captured by Workflow Lineage today — notably, the "ATOP WHICH" data version dimension requires explicit snapshot tracking beyond what current WL provides.

## [§DL-08] Connection to LEARN Mechanisms

Decision Lineage is the data substrate for all 3 LEARN mechanisms:

| LEARN Mechanism | How Decision Lineage Enables It |
|----------------|--------------------------------|
| **LEARN-01: Write-Back** | Action outcomes recorded as new DATA entities with full decision context |
| **LEARN-02: Eval Feedback** | User feedback on AI outputs linked to the decision that produced them |
| **LEARN-03: Outcome Tracking** | Decision outcomes measured against predictions; contradictions trigger DH refinement |

## [§DL-09] Our Implementation Mapping

> **[Provenance: Adapter]**

| Decision Lineage Dimension | CC Adapter Implementation |
|---------------------------|--------------------------|
| WHEN | `hookEvents.timestamp` |
| ATOP WHICH | `hookEvents.atopCommit` (git SHA) |
| THROUGH WHICH | `hookEvents.sessionId` + `hookEvents.toolName` |
| BY WHOM | `hookEvents.byIdentity` (currently "claude-code") |
| WITH WHAT | `hookEvents.withReasoning` (Sequential Thinking MCP output) |

Implementation status: 4.5/5D — the "ATOP WHICH" dimension uses git commit SHA as a proxy for data version, which is approximate (code version ≠ data version).

## [§DL-10] Cross-References

- See `philosophy/README.md` for Decision Lineage as part of the cognitive framework
- See `philosophy/digital-twin.md` for LEARN mechanisms that consume Decision Lineage data
- See `philosophy/ontology-ultimate-vision.md` for the self-healing enterprise vision powered by Decision Lineage
- See `platform/devcon.md + platform/aipcon.md` for Workflow Lineage product announcements and timeline

## [§DL-11] Sources

- https://blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology-c73f7b0a1a72 (5D definition, Jan 2024)
- https://www.palantir.com/docs/foundry/announcements/2025-11 (Workflow Lineage GA)
- https://www.palantir.com/docs/foundry/announcements/2026-02 (Cross-Ontology, Log Search, Presentation Mode)
- https://www.palantir.com/docs/foundry/announcements/2026-03 (Expanded access, automation trigger linking)
