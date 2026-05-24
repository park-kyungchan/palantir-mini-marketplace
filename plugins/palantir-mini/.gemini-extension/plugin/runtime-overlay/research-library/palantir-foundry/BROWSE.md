# palantir-foundry/ — Query Router

> **Scope:** Official Palantir Foundry docs (~212 pages) fetched 2026-04-20 from palantir.com/docs via scrapling. Verbatim reference layer.
> **Provenance:** `[Official]` — every file carries `source:` frontmatter pointing at palantir.com URL.
> **Authority:** Fact layer. For official builder entrypoints, start at `../palantir-developers/BROWSE.md`. For interpretation/synthesis, see `../palantir-vision/BROWSE.md`.

## Route by Question Domain

| Question | Open First |
|----------|------------|
| What is the Foundry architecture, MMDP, Rubix, or platform overview? | `architecture/BROWSE.md` |
| How does an ObjectType / LinkType / ActionType / Function / ObjectView work? | `ontology/BROWSE.md` |
| What is AIP, AIP Chatbot/Agent Studio, AI FDE, AIP Evals, AIP Logic, AIP Observability, or the model catalog? | `aip/BROWSE.md` |
| How do OSDK / Code Repositories / Developer Console / Palantir MCP / code-examples work? | `dev-toolchain/BROWSE.md` |
| How do security markings / Apollo deployment / Apollo Agents / compute modules / announcements work? | `security-deployments/BROWSE.md` |
| What official fact layer is needed for Lead intent-to-Digital-Twin contract design? | `architecture/BROWSE.md` -> `aip/BROWSE.md` -> `dev-toolchain/BROWSE.md` -> `ontology/BROWSE.md` |

## Read order priority

Best one to start at for a new question:

1. **Architecture** — if you want the 30k-foot view of how Foundry composes (MMDP + Rubix + Ontology + AIP).
2. **Ontology** — if you want semantic primitives (how data + logic + actions are modeled).
3. **AIP** — if you want agent/LLM capabilities (AIP Chatbot Studio, AI FDE, AIP Evals, Logic — the direct palantir-mini alignment surface).
4. **Dev toolchain** — if you want OSDK + code repos + local dev workflow.
5. **Security-deployments** — if you want RBAC, markings, Apollo, platform announcements.

## Lead Intent to Digital Twin fact-layer route (2026-05-09)

Use this route before applying local synthesis or changing palantir-mini:

1. `architecture/architecture-center-aip-architecture.md` for AIP architecture and agent governance.
2. `architecture/ontology-overview.md` for Ontology as the digital representation of operational nouns, logic, action, and security.
3. `aip/ai-fde-overview-and-modes-skills-2026-03-12.md` for AI FDE mode/skill and closed-loop operation.
4. `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` for simulation/evaluation of ontology edits.
5. `aip/workflow-lineage-and-aip-observability-2026-03-03.md` for lineage and observability.
6. `dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md` for Palantir MCP vs Ontology MCP boundaries.
7. `ontology/global-branching-overview-2026-05-05.md` for branch/proposal review and approval policy.

Then route to `../palantir-vision/architecture-gap/BROWSE.md` and the plan `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md` for local interpretation and implementation authority.

## Q1+Q2 2026 mirror batch (2026-05-06 W1.A SSoT-1)

7 mirrors added under existing subdirs. Total foundry pages now ~219 (was 212). Companion to `palantir-vision/aipcon-devcon/blog-fde-deep-dive-diogo-silva-santos-2026-04-08.md` (1 file under vision/).

| File | Subdir | Topic |
|------|--------|-------|
| `aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` | aip | 4 memory categories origin (rule 26 §Axis E anchor) |
| `aip/ai-fde-overview-and-modes-skills-2026-03-12.md` | aip | 8 modes × agent-skills/domain-skills |
| `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` | aip | 19 evaluators + OntologyEditSimulation |
| `aip/workflow-lineage-and-aip-observability-2026-03-03.md` | aip | source-executor + 7-day log aggregation |
| `dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md` | dev-toolchain | builder vs consumer MCP + Application Scopes |
| `ontology/global-branching-overview-2026-05-05.md` | ontology | cross-app branching + approval policies (2026-05-05 announcement; GA week of 2026-05-18) |
| `security-deployments/announcements-2026-03-04-05-aipcon9-bundle.md` | security-deployments | Mar/Apr/May 2026 bundle (22 entries, AIP-only) |

## Manifest substrate (2026-05-06 W1.C SSoT-9)

- This dir's `MANIFEST.json` declares sources at `refreshClass=hot` (7d) — Foundry feature pages ship behind weekly releases.
- Audit via `/palantir-mini:pm-research-staleness-audit` (wraps `mcp__palantir-mini__research_library_refresh dryRun=true`).
- SessionStart hook `research-staleness-check` auto-flags entries past 7 days. Foundry sources are the most-flagged class — keep `lastFetchedAt` current.

## File Format (all subdirs)

Each `<slug>.md` file has:

```
---
source: https://www.palantir.com/docs/foundry/<section>/<page>/
fetched: 2026-04-20
section: <section-name>
doc_title: <H1 from page>
---

<verbatim markdown extracted from palantir.com/docs>
```

**Slug convention**: URL path after `/docs/foundry/` (or `/docs/apollo/` for Apollo pages), with `/` → `-`, trailing slash stripped.

## Cross-refs to interpretation layer

Interpretation + synthesis lives in `~/.claude/research/palantir-vision/`:
- Ontology philosophy + digital twin + K-LLM grounding: `palantir-vision/philosophy/`
- AIPCon 9 / DevCon 5 transcripts + notes: `palantir-vision/aipcon-devcon/`
- TypeScript as first-class (OSDK rationale): `palantir-vision/typescript/`
- Decision Lineage 5-dim + Workflow Lineage: `palantir-vision/decision-lineage/`
- Consolidated synthesis docs (2026-04-20 batch, migrated 2026-05-01): `~/docs/research-synthesis/`

## Retrieval Rules

- Prefer exact slug match over directory scanning.
- Do not edit file contents — these are verbatim. Refresh via future palantir-mini research-library refresh workflow.
- When citing in code/ontology, use absolute path + anchor if the doc has one (e.g. `#core-concepts`).
- When fact here disagrees with an interpretation in `palantir-vision/`, fact wins — update interpretation + log the drift.

## Refresh cadence

- **Quarterly manual refresh** recommended for overview/architecture pages (stability: ~6-12 months).
- **On-demand refresh** for AIP / dev-toolchain / Apollo pages (product moves quickly — AIP Chatbot Studio, AI FDE, AIP Evals, Palantir MCP, model surfaces, Apollo Agents, and builder workflows change frequently).
- **Never refresh** announcement pages (they are timestamped — new announcements get new files, old ones are historical evidence).

## Restructure provenance

This directory was created 2026-04-20 via scrapling + 5 Sonnet docs-researcher agents in parallel. URL partitioning:
- `architecture/` — 22 URLs (Agent 1 + Lead finish)
- `ontology/` — 45 URLs (Agent 2)
- `aip/` — 55 URLs (Agent 3)
- `dev-toolchain/` — 40 URLs (Agent 4)
- `security-deployments/` — 50 URLs (Agent 5)

Source: `/tmp/palantir-docs-urls/a[1-5]-urls.txt`. Parsed from `palantir.com/docs/sitemap.xml` (547KB, 4952 English docs URLs) — full enumeration at `/tmp/palantir-docs-urls/all-en-urls.txt`.
