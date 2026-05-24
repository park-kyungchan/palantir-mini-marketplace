# Research Library — Query Router

> Portable plugin snapshot: this file was vendored from
> `~/.claude/research/BROWSE.md` into
> `runtime-overlay/research-library/research-root/BROWSE.md`.
> When this snapshot says `~/.claude/research/<topic>`, plugin-only runtimes
> should resolve the equivalent path as
> `runtime-overlay/research-library/<topic>`. The external path remains the
> refresh/provenance source, not a required runtime dependency.

> ⚠ **AI-agent READ-ONLY SSoT** — do not write. Only `BROWSE.md` / `INDEX.md` may be updated for navigation/policy corrections. Internal palantir-mini synthesis (retrospective / blueprint / gap-analysis / decision-record / cost-log / canary-run) writes to `~/.claude/plans/`, never here. See `INDEX.md §Legacy Mixed-Content` for pre-2026-04-25 internal-synthesis docs preserved in `claude-code/` for PR-history integrity.

Query-first router for `~/.claude/research/`. This library is **AI-agent read-only SSoT for upstream evidence routing**. Use it to find the smallest trustworthy read set, not to invent a second project runtime contract.

## Minimal Context Injection

Before deep-reading research for Palantir/AIP/Foundry, invoke palantir-mini's
`research_context_select` when available. It returns the smallest ordered
read-set across research + schemas for the task, plus `currentnessNotes` and
`latestSignalCadence` for DevCon/AIPCon/latest-signal handling. If the current
runtime has not loaded that MCP tool yet, use the direct handler fallback or
manually follow the same rule:

```bash
bun -e 'import select from "/home/palantirkc/.claude/plugins/palantir-mini/bridge/handlers/research-context-select.ts"; console.log(JSON.stringify(await select({ query: process.argv.slice(1).join(" "), topic: "palantir-aip-foundry", includeSchemas: true, includeLatestWatch: true }), null, 2));' -- "<task query>"
```

1. read this `BROWSE.md` and `INDEX.md`;
2. open only the relevant subdir `BROWSE.md`;
3. open at most the exact official fact file(s), synthesis file(s), and schema
   primitive file(s) needed for the question;
4. stop adding context once the decision can be made.

Do not inject whole research or schema directories. Current Palantir public-doc
facts come from `palantir-official/`; `palantir-developers/` is the curated
builder-entry router; `palantir-foundry/` is legacy compatibility for older
citations; `palantir-vision/` is synthesis only until promoted downstream.

## Role split

- `BROWSE.md` — this file. Question router and minimal-read recipe surface.
- `INDEX.md` — structural reference for provenance, directory roles, and maintenance boundaries.
- Project-local ontology, contracts, tests, and runtime docs outrank this library for project behavior.

## Read order

1. Project-local `BROWSE.md`
2. Project-local `INDEX.md`
3. Project-local ontology docs and contracts
4. `~/.claude/research/BROWSE.md`
5. The smallest relevant research subdirectory
6. The smallest relevant source document set

## Primary routes

| Question | Open first |
|----------|------------|
| What does Claude Code itself support? | `claude-code/BROWSE.md` |
| What is the current official Palantir docs fact layer for Foundry/Apollo/Gotham/Defense OSDK/API reference? | `palantir-official/BROWSE.md` |
| What is the official Palantir builder entrypoint for this topic? | `palantir-developers/BROWSE.md` |
| What older curated Foundry mirror is needed for legacy citations or pre-2026-05-13 comparisons? | `palantir-foundry/BROWSE.md` |
| What is our synthesis / interpretation / AIPCon-DevCon / MAVEN design reading? | `palantir-vision/BROWSE.md` |
| What do AIPCon 9 and DevCon 5 imply for AI Agents, AI FDE, eval loops, Maven, Apollo, Foundry, and palantir-mini? | `palantir-vision/aipcon-devcon/BROWSE.md` |
| How should Lead ask clarifying questions until semantic ambiguity is closed before Ontology Engineering and Harness execution? | `palantir-vision/architecture-gap/semantic-intent-gate-for-ontology-engineering.md` |
| What did the 2026-05-09 Scrapling deep dive find about Palantir Community Ontology Engineering failures, AskUserQuestion ambiguity closure, and Lead intent-to-Digital-Twin gaps? | `INDEX.md` §2026-05-09 Lead Intent to Digital Twin deep-dive update -> `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md` |
| What is the Palantir "Connecting Agents to Decisions" blog (2026-04-29) saying about decision lineage refining 4-layer agentic memory? | `palantir-vision/aipcon-devcon/BROWSE.md` (row §A1) → `~/.claude/plans/nifty-mixing-diffie.md` (verbatim quote + framework derivation) |
| What is the 2024-01 Palantir Ontology precursor blog (Akshay Krishnaswamy) — Data + Logic + Action triad + decision lineage? | `palantir-vision/aipcon-devcon/connecting-ai-to-decisions-2024-01.md` (verbatim mirror, 2026-05-06) |
| What is rule 26 (Valuable Data Operating Standard) and the v1.35.0 valuable-data primitives? | `~/.claude/rules/26-valuable-data-standard.md` (rule body) + `~/.claude/schemas/ontology/primitives/{value-grade,agentic-memory-layer,lineage-refs,outcome-pairing,refinement-target}.ts` (5 primitives) + `~/.claude/plans/nifty-mixing-diffie.md` (full plan w/ Phase 2-3-5-6-7 deferred) |
| What is the canonical Anthropic 1차 자료 trio on harness species + Brain/Hands/Session decomposition? | `anthropic/BROWSE` is `INDEX.md` — see §Anthropic engineering posts below |
| What platform, gesture, or interaction evidence matters? | `interaction/BROWSE.md` |
| What reusable internal skills or audits exist? | `skills/BROWSE.md` |
| What was retired from the pre-2026-04-20 research layout? | `INDEX.md` §Restructure 2026-04-20; recover content from git history if needed |

## Anthropic engineering posts (mirrored 2026-05-06)

Verbatim mirrors of the 3 Anthropic engineering posts cited as 1차 자료 by `~/.claude/CLAUDE.md §Vocabulary` and `~/.claude/rules/CONTEXT.md §15 Glossary`. Use these for offline reads, hook excerpts, and `pm_research_citation_validate` resolution. See `anthropic/INDEX.md` for reading order + per-file scope.

| Question | Open first |
|----------|------------|
| What does Justin Young 2025-11-26 say about long-running agents + initializer/coding agent split + Claude Agent SDK harness species? | `anthropic/effective-harnesses-2025-11-26.md` |
| What does Lance Martin 2026-04-08 say about Brain/Hands/Session decoupling, meta-harness pattern, cattle-not-pets, p50/p95 TTFT improvements? | `anthropic/scaling-managed-agents-2026-04-08.md` |
| What does Prithvi Rajasekaran 2026-03-24 say about 3-agent (planner/generator/evaluator) GAN-inspired architecture, sprint contract, file-based IPC, self-grading bias? | `anthropic/harness-design-2026-03-24.md` |

## 2026-05-09 Lead Intent to Digital Twin deep-dive route

Use this route when judging or implementing the `pm_lead_brief -> SemanticIntentContract -> DigitalTwinChangeContract -> pm_intent_router` proposal. BROWSE/INDEX files should route the read; they are not the detailed synthesis.

Minimal read set:

1. `palantir-official/BROWSE.md` -> exact current official docs pages for AIP architecture, Ontology, AI FDE, AIP Evals, Palantir/Ontology MCP, and Global Branching.
2. `palantir-developers/BROWSE.md` -> `palantir-developers/build-with-aip.md` for the official builder entrypoint.
3. `palantir-foundry/BROWSE.md` only when an older synthesis route still cites the legacy curated mirror.
4. `palantir-vision/architecture-gap/BROWSE.md` -> `semantic-intent-gate-for-ontology-engineering.md` for local interpretation.
5. `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md` for the Claude-facing proposal, community failure catalog, AskUserQuestion loop requirements, and final-review permission for major palantir-mini rewrites.

Community evidence from `community.palantir.com` is intentionally routed through the plan above. Do not create community-post mirrors under this research library unless a later task explicitly promotes them into SSoT.

## Palantir-foundry-canonical (W2.D 2026-05-07)

Fast-route table for the 5 Palantir 1차 자료 mirrors promoted to canonical-source status in the W2.C `CanonicalSourceRegistry` primitive (schemas v1.41.0+). Cold-Start automation (W2.A skill `pm-cold-start-orchestrate` + W2.B SessionStart hook `cold-start-browse-index-loader`) auto-fires these into Lead context at session start. Default cadence: `cold` (90 days) per source class.

| Question | Open first |
|----------|------------|
| Palantir AIP Agentic Runtime 4-memory categories (working / episodic / semantic / procedural) origin? | `palantir-foundry/aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` |
| AI FDE 8 modes × agent-skills/domain-skills + closed-loop builder pattern? | `palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md` |
| AIP Evals 19-evaluator taxonomy + OntologyEditSimulation pattern? | `palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` |
| 2024-01 Akshay Krishnaswamy "Connecting AI to Decisions" — Data + Logic + Action precursor + decision-lineage origin? | `palantir-vision/aipcon-devcon/connecting-ai-to-decisions-2024-01.md` |
| 2026-04-29 "Connecting Agents to Decisions" — BackPropagation circuit + 4-memory verbatim quote (rule 26 anchor)? | `palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md` |

Companion typed primitive: `~/.claude/schemas/ontology/primitives/canonical-source-registry.ts` (schemas v1.41.0+).

## ClaudeCodeNativeRuntime-canonical (W2.D 2026-05-07)

Fast-route table for the 5 Claude Code native-runtime 1차 자료 mirrors promoted to canonical-source status in the W2.C `CanonicalSourceRegistry` primitive (schemas v1.41.0+). Splits into `claude-code-native-runtime-canonical` class (3 files; cadence cold 90d) for Anthropic engineer harness-design content + `claude-code-reference` class (2 files; cadence warm 30d) for Claude Code product reference docs.

| Question | Open first |
|----------|------------|
| Justin Young initializer/coding agent split + Claude Agent SDK harness species (long-running agents)? | `anthropic/effective-harnesses-2025-11-26.md` |
| Lance Martin Brain/Hands/Session decoupling + meta-harness pattern + cattle-not-pets? | `anthropic/scaling-managed-agents-2026-04-08.md` |
| Prithvi Rajasekaran 3-agent GAN-inspired architecture + sprint contract + self-grading bias structural fix? | `anthropic/harness-design-2026-03-24.md` |
| Claude Code feature reference (v2.1.114+ surface — hooks, plugins, skills, agents, MCP)? | `claude-code/features.md` |
| Claude Code agent system design (subagent dispatch, frontmatter, model policy)? | `claude-code/agent-system-design.md` |

Companion typed primitive: `~/.claude/schemas/ontology/primitives/canonical-source-registry.ts` (schemas v1.41.0+).

## Palantir Q1+Q2 2026 mirror batch (2026-05-06 W1.A SSoT-1)

8 mirrors of Palantir AIP/Foundry/Securing-Agents 1차 자료 (verbatim where license permits, summary-with-quotes elsewhere). Companion to the Anthropic trio above. fetched-at: 2026-05-06.

| Question | Open first |
|----------|------------|
| Securing agents agentic runtime + 4 memory categories origin (rule 26 §Axis E)? | `palantir-foundry/aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` |
| AI FDE 8 modes × agent-skills/domain-skills + closed-loop builder pattern? | `palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md` |
| AIP Evals 19-evaluator overview + OntologyEditSimulation pattern? | `palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` |
| Palantir MCP / Ontology MCP — builder vs consumer split + Application Scopes? | `palantir-foundry/dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md` |
| Global Branching cross-app + approval policies + lifecycle (2026-05-05 announcement; GA week of 2026-05-18)? | `palantir-foundry/ontology/global-branching-overview-2026-05-05.md` |
| Workflow Lineage + AIP Observability source-executor + 7-day log aggregation? | `palantir-foundry/aip/workflow-lineage-and-aip-observability-2026-03-03.md` |
| Mar-May 2026 Foundry announcements bundle (22 entries, AIP-only)? | `palantir-foundry/security-deployments/announcements-2026-03-04-05-aipcon9-bundle.md` |
| Diogo Silva Santos AI FDE deep-dive analysis (Delta+Echo team formation)? | `palantir-vision/aipcon-devcon/blog-fde-deep-dive-diogo-silva-santos-2026-04-08.md` |

## Opus 4.7 + GPT-5.5 era harness research (sprint-046 Wave 2 — 2026-05-08)

11 new mirrors landed via 3 docs-researcher dispatches (M1 Anthropic Opus 4.7 / M2 OpenAI new dir / M3 Harness Engineering 2026). User directive: palantir-mini Infra 전반을 Claude Harness 기반으로 작동 + post-Opus 4.7 + post-GPT-5.5-xhigh 연구 정렬. Lead(Opus 4.7) Harness Engineering 책임. Companion 5-angle synthesis: `~/.claude/plans/2026-05-08-claude-harness-audit.md` + `~/.claude/plans/mellow-plotting-oasis.md` (5 angle outputs at `/tmp/researcher-angle-{a..e}-output.md`).

### Anthropic side — Opus 4.7 specifics (3 new files in `anthropic/`)

| Question | Open first |
|----------|------------|
| Opus 4.7 release primitives + agentic coding gains? | `anthropic/opus-4-7-introducing-2026-04-16.md` |
| April 23 cache-management bug postmortem (infrastructure failure mode)? | `anthropic/opus-4-7-postmortem-2026-04-23.md` |
| Opus 4.7 API breaking changes (sampling params + budget_tokens removed; thinking off-by-default; 1.0-1.35× tokenizer inflation; task_budgets beta)? | `anthropic/opus-4-7-whats-new-platform.md` |

### OpenAI side — GPT-5.5 + Agents SDK + sandbox (5 files in NEW `openai/` dir)

| Question | Open first |
|----------|------------|
| GPT-5.5 release + xhigh effort + native computer use + 10.24M-pixel screenshot retention? | `openai/gpt-5-5-introducing-2026-04-23.md` |
| OpenAI Agents SDK April 2026 launch (native sandbox + Manifest abstraction + 7 sandbox providers + multi-model)? | `openai/agents-sdk-next-evolution-2026-04-15.md` |
| Manifest schema (LocalDir / GitRepo / S3Mount / etc.) + RunState/Session/snapshot 3-surface state model? | `openai/sandbox-agents-developer-docs.md` |
| GPT-5.5 API surface (reasoning.effort enum + image_detail + pricing + 1.05M context)? | `openai/gpt-5-5-model-developer-page.md` |
| OpenAI's own "harness engineering" framing (Ryan Lopopolo 2026-02-11)? | `openai/harness-engineering-blog.md` |

### Industry / cross-vendor canonical (3 files in NEW `harness-engineering-2026/` dir)

| Question | Open first |
|----------|------------|
| Martin Fowler / Birgitta Böckeler — canonical "harness engineering" pattern frame (2026-04-02)? | `harness-engineering-2026/martin-fowler-harness-engineering.md` |
| The New Stack — Anthropic + OpenAI + Google + Microsoft 4-vendor "harness is the product" consensus + pricing positioning split (2026-04-18)? | `harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md` |
| Endor Labs — empirical harness > model evidence (Cursor + GPT-5.5 87.2% vs Codex + GPT-5.5 61.5% functional correctness; 25.7pp delta on identical model)? | `harness-engineering-2026/endor-labs-cursor-not-codex-gpt-5-5.md` |

## Manifest-driven staleness audit (2026-05-06 W1.C SSoT-9)

- 4 MANIFEST.json declared per-subdir: `palantir-foundry/` (hot, 7d) + `anthropic/` (warm, 30d) + `palantir-vision/aipcon-devcon/` (cold, 90d) + `claude-code/` (warm, 30d).
- Schema primitive: `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0).
- Audit: `/palantir-mini:pm-research-staleness-audit` skill or `mcp__palantir-mini__research_library_refresh` (dryRun=true).
- SessionStart hook `research-staleness-check` auto-emits `skill_invocation_suggested` when entries past their `expectedRefreshDays` (rule 02 §Research retrieval + rule 26 §Axis A3).

## Authority distinction

- `palantir-official/` — **current official docs fact layer**. Generated from `palantir.com/docs/sitemap.xml` and page `__NEXT_DATA__.markdown`; covers Foundry, Apollo, Gotham, Defense OSDK, and API reference manifest rows.
- `palantir-developers/` — **official builder-entry layer**. Curated from `palantir.com/docs/foundry/developers`, linked official docs, API references, and Defense OSDK surfaces. Start here when the question is "where should an agent open first?"
- `palantir-foundry/` — **legacy compatibility fact layer**. Frozen curated mirror from 2026-04-20 plus later canonical additions; keep for old citations and comparison only.
- `palantir-vision/` — **our synthesis layer**. Internal interpretation, talk synthesis, architecture reading, and local mapping proposals.
- `claude-code/` — Claude Code capability evidence only.
- Conflict rule:
  - When `palantir-official/` and `palantir-foundry/` disagree on current docs facts, `palantir-official/` wins.
  - When `palantir-developers/` and `palantir-official/` disagree on an exact product fact, `palantir-official/` wins; developers remains the entrypoint/router.
  - When `palantir-vision/` extends or interprets an official fact, treat it as synthesis pending explicit downstream adoption.

## Retrieval rules

- Prefer exact retrieval over directory-wide scanning.
- Start with `palantir-official/` for exact official wording, product-surface mechanics, API reference rows, and currentness checks.
- Start with `palantir-developers/` for builder-entry questions, then descend into `palantir-official/` when a detail remains unresolved.
- Use `palantir-foundry/` only for legacy citation compatibility, historical comparison, or curated 2026-04/05 synthesis routes that have not yet been migrated.
- Treat AIPCon 9 + DevCon 5 as a first-class synthesis route for AI Agent direction. Cross-check operational claims against official Foundry/AIP/Apollo docs before promoting them into `palantir-mini`.
- Treat future conferences such as DevCon 6 or AIPCon 10 as watch targets, not
  assumed facts. As of the 2026-05-05 check, no official public DevCon 6 or
  AIPCon 10 route was found; verify upstream before adding them to SSoT.
- Use `~/docs/research-synthesis/` (migrated 2026-05-01 from `palantir-vision/synthesis/`) for long-form internal position docs. NOT under research/ AI-agent SSoT — read-only artifact layer for humans + agents.
- If evidence becomes durable project policy, promote it into `~/.claude/schemas/`, `~/ontology/` shared-core, project ontology, rules, or code.

## Palantir Latest-Signal Cadence

- Weekly or before Palantir-heavy work: check official Foundry
  announcements, Palantir blog/newsroom, and official `@PalantirTech` X.
- Event-triggered: search official sources for next AIPCon/DevCon numbers and
  record the checked date before treating a conference as current.
- Monthly: run `research_library_refresh({ source: "all", dryRun: true })`,
  inspect `manifestMissingCount` and `staleUnfetchableDocs`, then promote only
  verified deltas through research -> schemas -> shared-core -> projects.
- After any durable semantic update, emit a palantir-mini event with source
  URLs, local file paths, and why the update changes practical agent behavior.

## Invariants

- Keep research maintainable by documenting routing and provenance here, not in runtime-local memory.
- Do not let runtime-native overlays or agent memory compete with shared research provenance.
- `palantir-official/` and `palantir-foundry/` page bodies are generated or mirror evidence; do not hand-edit scraped page bodies.
- Do not add new active official-doc authority to `palantir-foundry/`; regenerate `palantir-official/` and run the overlap audit instead.
- `palantir-developers/` and `palantir-vision/` summary docs must carry explicit citation lists.
- `palantir-mini` integration work should cite the exact AIPCon/DevCon marker plus the official fact layer it depends on.
