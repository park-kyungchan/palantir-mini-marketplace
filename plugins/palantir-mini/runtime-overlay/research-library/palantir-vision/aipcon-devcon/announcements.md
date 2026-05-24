---
title: Foundry Platform Announcements (Jan–Apr 2026)
slug: announcements
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "palantir.com/docs/foundry/announcements/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Foundry Platform Announcements (Jan–Apr 2026)

> **Provenance:** [Official] — palantir.com/docs/foundry/announcements/ (verified 2026-04-03)
> **Schema anchors:** `WL-01..05`, `MCP-01..03`, `MCP-PS-01..02`
> **Markers:** `[§ANN-nn]`

---

## [§ANN-APR] April 2026

### [§ANN-00] Models in Pipeline Builder: No-Code Model Inference (4/2)

- Spark batch pipelines can now run trained-model inference directly in Pipeline Builder
- Branch-aware auto-upgrades resolve the latest published model version from the active branch, then configured fallback branches
- Sidecar resource configuration separates model CPU/memory/GPU sizing from the pipeline's base compute profile
- **Ontology / AIP relevance:** strengthens the no-code builder surface around model-backed decision workflows, but is still distinct from ontology-native action/query surfaces

---

## [§ANN-MAR] March 2026

### [§ANN-01] AI FDE — Generally Available (3/12)

- Natural language Foundry operation — the AI developer experience
- **7 modes**: Data Integration, Ontology Editing, Functions Editing, Exploration, Governance, OSDK React, Platform Q&A
- **Documented skills surface:** official docs enumerate 5 agent-management skills (`change mode`, `request clarification`, `generate plan`, `load documentation`, `manage context/manage skills`) plus representative domain skills such as `filesystem`, `notepad`, `solution design`, and `execute actions`
- Skills system, context management, sandbox testing via Branching
- Model support: Anthropic, OpenAI, Google Gemini, xAI
- Validates OOSD-01 (Code in Business Language) at platform level
- →[§FDE-01] for detailed reference

### [§ANN-02] Pilot — AI App Builder (3/5)

- Prompt → full-stack ontology-backed React OSDK app
- **3-agent pipeline**: Ontology builder → Designer → App builder
- Live preview, seed data, guided deployment
- **Status:** Historical beta surface. `/docs/foundry/pilot/overview/` returned **404** on 2026-03-17. Treat current builder surface as **AI FDE + Agent Studio + Pro-Code CLI**

### [§ANN-03] Pro-Code CLI for Monorepos (3/12, DevCon 5)

- Developers + AI agents create monorepos: data pipelines, Ontology primitives, application artifacts
- "Human-agent teaming requires a human-agent developer experience"
- →[§DC5-02] for detailed reference

### [§ANN-04] LLM Additions (Mar 2026)

| Date | Model | Provider | Key Feature | Marker |
|------|-------|----------|------------|--------|
| 3/12 | GPT-5.4 | OpenAI | Frontier model, computer use, 200K context | [§MOD-03] |
| 3/3 | GPT-5.3 Codex | OpenAI | Best coding model, 400K context | [§MOD-02] |
| 3/12 | Gemini 3.1 Flash-Lite | Google | Adjustable thinking levels | [§MOD-04] |

### [§ANN-05] AIP Document Intelligence: Chunking + Embedding (3/17) — NEW

- Chunking + embedding for extracted text across all enrollments
- Optimized for Markdown: handles bullet points and tables
- Vector embeddings generated per chunk for RAG workflows
- Access via text extraction workflow or Python transforms
- **Ontology relevance**: Improves data ingestion pipeline quality for document-heavy ontologies

### [§ANN-06] Pipeline Builder: Enforce Incremental Execution (3/17) — NEW

- `Require incremental execution` setting in Build settings
- Jobs fail if they cannot run incrementally (prevents accidental snapshots)
- Previously only available in PySpark/lightweight incremental transforms via `require_incremental=True`
- Now bridged to low-code Pipeline Builder

### [§ANN-07] Branch Role-Based Security (3/17) — NEW

- Branch creators can assign `owner` role to other users/groups
- Two mechanisms: Branch roles (actions) + Organizations (visibility)
- Space administrators automatically hold owner-equivalent permissions
- Previously only branch creator could manage and merge

### [§ANN-08] Workshop Usage Metrics (3/5)

- Built-in Metrics tab: action submission counts + layout view tracking
- 7/30/90 day windows, aggregate only, not per-user
- LEARN-03 context: operational feedback signal

### [§ANN-09] Pipeline Builder LLM Data Generation (3/5)

- Generate notional data with LLMs in manually entered tables
- Reference other columns, preview 10 rows, lock/unlock columns

### [§ANN-10] Quiver Time Series Analysis (3/3)

- Dedicated workspace (separate from Quiver analysis)
- Rolling aggregates, formulas, filters, event overlays, multi-canvas sync
- Embeddable in Workshop via Time Series Analysis widget

### [§ANN-11] Expanded Workflow Lineage Access (3/3)

- Cmd+I / Ctrl+I from **14 applications**: Workshop, Ontology Manager, Function repos, Quiver, Machinery, Slate, Agent Studio, Automate, 3rd-party apps, Developer Console, Marketplace, Notepad, Pipeline Builder
- →[§WL-01] for detailed reference

---

## [§ANN-FEB] February 2026

| Date | Feature | Marker | Significance |
|------|---------|--------|-------------|
| 2/25 | **Workflow Lineage: Log Search** | [§WL-03] | Search across all service logs, 7-day window, wildcard |
| 2/26 | Compass permissions for Dev Console | — | Standard Compass operations |
| 2/24 | **Claude Sonnet 4.6** | [§MOD-05] | Extended thinking, 200K context |
| 2/24 | **Gemini 3.1 Pro** | [§MOD-06] | 1M token context |
| 2/12 | **Claude Opus 4.6** | [§MOD-07] | Most capable Claude, 1M context |
| 2/12 | **Model Studio GA** | — | ML model training and deployment |
| 2/10 | **Workflow Lineage: Presentation Mode** | [§WL-04] | Presentation-ready graph views |
| 2/3 | **AIP Document Intelligence GA** | — | PDF/image → structured Markdown |
| 2/3 | **Workflow Lineage: Cross-Ontology** | [§WL-05] | Multi-ontology visualization |
| 2/3 | GPT-5.2 Codex | [§MOD-08] | OpenAI coding model |
| 2/24 | **Sensitive Data Scanner: Cipher** | — | AES SIV, AES GCM SIV, SHA512, SHA256 |
| 2/19 | **Core Object Views GA** | — | Auto-created type-specific views |
| 2/17 | **Monitoring Views: Project Scopes** | — | Dynamic ontology monitoring |
| 2/5 | **Compute Modules GA** | — | Container-based functions, any language |

---

## [§ANN-JAN] January 2026

| Date | Feature | Marker | Significance |
|------|---------|--------|-------------|
| 1/13 | **Ontology MCP Beta** | [§MCP-01] | External agents access Ontology via MCP |
| 1/15 | Project-based Ontology Permissions | — | Compass project permissions |
| 1/15 | VertexAI on IL2 | — | Claude 4/4.5, Gemini 3 on IL2 |
| 1/15 | Foundry Connector | — | Foundry-to-Foundry communication |
| 1/8 | **Listeners (Inbound Webhooks)** | — | 22+ external systems |
| 1/22 | Reserved Capacity for LLMs | — | Dedicated TPM/RPM |
| 1/15 | Gemini 3 series | [§MOD-09] | VertexAI commercial |
| 1/29 | Object Views Branching | — | Safe view development |
| 1/29 | **WL: Run History Filtering** | [§WL-06] | Filter by status, timestamp, user |
| 1/15 | **Custom Space Roles** | — | Granular workflow selection |

### [§ANN-MCP] Two Distinct MCP Products

| Product | Purpose | Target | Capabilities |
|---------|---------|--------|-------------|
| **Ontology MCP** | Data consumption | Consumers | Read/write data, execute actions |
| **Palantir MCP** | Platform building | Builders | Modify types, build OSDK apps, search docs |

Palantir MCP recognizes repository type (OSDK, Python transforms, TS functions) and injects tailored context.
Source: https://www.palantir.com/docs/foundry/palantir-mcp/overview/

---

## [§ANN-BLOG] Official Blog Posts (Jan–Apr 2026)

| Date | Title | Marker | Ontology Relevance |
|------|-------|--------|-------------------|
| 4/29 | **Connecting Agents to Decisions** | [§BLOG-A1] | **CRITICAL** — decision lineage substrate refines 4-layer agentic memory (working / episodic / semantic / procedural). Anchor for rule 26 v1.0.0 (Valuable Data Operating Standard). Verbatim mirror at `blog-connecting-agents-2026-04-29.md`. |
| 3/5 | Maven Smart System NATO | [§APC9-07] | HIGH — 3 vendor integrations, multi-model architecture |
| 2/10 | PFCS Forward IL5/IL6 | [§BLOG-03] | HIGH — Rubix + Apollo + Ontology triad, CBAC |
| 1/29 | Octopus Model (Data Migration) | [§BLOG-02] | HIGH — 4-tier AI deployment, Ontology as bridge |
| 1/22 | Agentic Runtime #1 | [§BLOG-01] | HIGH — 5 security dimensions, 4 agent memory modalities, D/L/A tool mapping |

---

## [§ANN-APR2026] Apr 2026 Platform Deltas (Apr 14-30)

Apr 2026 official-source announcements relevant to AI Agents, AI FDE integration, and AIP Evals. Cross-checked against `palantir.com/docs/foundry/announcements/2026-04/`.

| Date | Event | Source | Relevance |
|------|-------|--------|-----------|
| 4/14 | AIP Evals integrated into AI FDE | `palantir.com/docs/foundry/announcements/2026-04/` | AI FDE §FDE-08 builder-loop closes feedback compounding via integrated evaluator dispatch |
| 4/15 | Claude Opus 4.7 GA in Foundry | `anthropic.com/news/`, `palantir.com/blog/` | New default Lead model; 1M-context variant available; provider-neutral envelope (`byWhom.model="claude-opus-4-7"`) |
| 4/22 | USDA $300M Foundry deal | `palantir.com/news/` | Defense + government scaling; reinforces AIPCon §APC9-07 multi-vendor pattern |
| 4/22 | Agent Studio → AIP Chatbot Studio rebrand | `palantir.com/docs/foundry/aip-chatbot-studio/` | Lexicon canonicalization; "Agent Studio" deprecated in product surface |
| 4/29 | "Connecting Agents to Decisions" blog | `blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40` | Anchor for rule 26 v1.0.0; verbatim mirror at `blog-connecting-agents-2026-04-29.md` |
| 4/29 | Trump-Anthropic EO | `whitehouse.gov`, `anthropic.com/news/` | Defense procurement context for Claude API Foundry channel |
| 4/30 | Models in Pipeline Builder | `palantir.com/docs/foundry/announcements/2026-04/` | Model registry integrates into transform pipeline; ontology `RubricDomain.simulator` (schemas v1.31.0) preempts |

---

## Sources

- https://www.palantir.com/docs/foundry/announcements/2026-03/
- https://www.palantir.com/docs/foundry/announcements/2026-02/
- https://www.palantir.com/docs/foundry/announcements/2026-01/
- https://www.palantir.com/docs/foundry/announcements/2026-04/
- https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40
- https://blog.palantir.com/securing-agents-in-production-agentic-runtime-1-5191a0715240
- https://blog.palantir.com/how-palantir-aip-accelerates-data-migration-4c6abdd1891c
- https://blog.palantir.com/introducing-pfcs-forward-d8755d34c429
- https://blog.palantir.com/maven-smart-system-innovating-for-the-alliance-5ebc31709eea
