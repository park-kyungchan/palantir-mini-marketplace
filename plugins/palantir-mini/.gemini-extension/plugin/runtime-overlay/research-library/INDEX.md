# Research Library — Structure Index

Structural reference for `~/.claude/research/`.

`BROWSE.md` is the query router. `INDEX.md` explains scope, provenance, and the role of each top-level research directory.

## Portable Plugin Snapshot

The runtime overlay now includes the external research router and current
Palantir official docs as a plugin-carried snapshot:

| Path | Source | Runtime role |
|------|--------|--------------|
| `research-root/BROWSE.md` | `~/.claude/research/BROWSE.md` | Portable copy of the global research query router |
| `research-root/INDEX.md` | `~/.claude/research/INDEX.md` | Portable copy of the global research structure index |
| `palantir-official/` | `~/.claude/research/palantir-official/` | Portable official Palantir docs snapshot for plugin-only use |

Path mapping: references to `~/.claude/research/<topic>` inside vendored docs
resolve to `runtime-overlay/research-library/<topic>` when the plugin is used
without the external research directory.

## Role Contract

- This library stores upstream evidence, capability notes, and tradeoff research.
- It is not a substitute for project-local ontology, contracts, tests, or runtime docs.
- Durable project policy should move downstream into shared docs, ontology, validation automation, or code.
- **AI-agent read-only** — agents across providers (Codex/Gemini/Claude) read this library during synthesis/planning. Do not mutate mid-session.

## Authority Flow

```text
official builder entrypoint (palantir-developers/)
  ↓
official verbatim docs / API references (palantir-foundry/)
  ↓
internal synthesis + AIPCon/DevCon talks (palantir-vision/)
  ↓
~/.claude/schemas/ontology/
  ↓
~/ontology/ shared-core
  ↓
project ontology / contracts / tests
  ↓
runtime
```

## Top-level map

| Path | Role | File count | Provenance |
|------|------|------------|------------|
| `palantir-developers/` | Official builder-entry layer rooted at the developers landing page; optimized read order for AIP, app building, and Defense OSDK | 4 content MD + routing | [Official Palantir] curated routing |
| `research-root/` | Portable copy of the external research root `BROWSE.md` / `INDEX.md` routers | 2 routing MD | [Vendored Research Router] |
| `palantir-official/` | Current official Palantir docs snapshot vendored for plugin-only portability | ~3,500 official pages + routing | [Official Palantir] vendored snapshot |
| `claude-code/` | Claude Code capability evidence: hooks, rules, memory, agents, managed agents, plugin and MCP behavior | 9 content MD + routing | mixed [Official Anthropic] + bounded [Internal Synthesis] |
| `anthropic/` | Anthropic engineering blog mirror — 3 harness-trio + 3 Opus 4.7 specifics (release/postmortem/platform-changes) | 6 content MD + INDEX + MANIFEST | [Official Anthropic] verbatim |
| `openai/` (NEW 2026-05-08) | OpenAI primary sources — GPT-5.5 release/API + Agents SDK April 2026 evolution + Manifest sandbox docs + harness-engineering blog | 5 content MD + INDEX + MANIFEST | [Official OpenAI] verbatim where allowed; summary-mirror where WAF-limited |
| `harness-engineering-2026/` (NEW 2026-05-08) | Industry harness-engineering canonical — Martin Fowler/Böckeler pattern article + The New Stack 4-vendor pricing split + Endor Labs empirical harness>model evidence | 3 content MD + INDEX + MANIFEST | [Mixed authoritative industry] |
| `palantir-foundry/` | Official Palantir Foundry docs (scraped 2026-04-20) — architecture, ontology, AIP, dev-toolchain, security-deployments | ~212 official pages + routing docs | [Official Palantir] verbatim |
| `palantir-vision/` | Our synthesis + AIPCon 9 / DevCon 5 + philosophy + TypeScript/OSDK analysis + Decision/Workflow Lineage interpretation | ~50 source/synthesis MD + routing docs | [Internal Synthesis] + [Official talks] |
| `interaction/` | Platform gesture, pointer, and accessibility evidence | (check dir) | [Mixed] |
| `skills/` | Reusable internal audit/reference notes | (check dir) | [Internal] |

## Claude Code Legacy Purge (2026-04-29)

The `claude-code/` directory previously held 11 internal palantir-mini synthesis files that conflicted with the current evidence-library policy. Those legacy-internal files were removed on 2026-04-29 per user directive; history is recoverable from git, not from active research routing.

Active `claude-code/` files are limited to Claude Code capability evidence or explicitly mixed Claude-runtime evidence. See `claude-code/BROWSE.md` for the smallest read set and `claude-code/INDEX.md` for the current file map. New retrospectives, blueprints, gap analyses, decision records, cost logs, canary reports, review prompts, and direction docs go to `~/.claude/plans/`.

## Provenance Markers (used in palantir-vision/ files)

- `[Official]` — directly from Palantir docs, blog, talks, or engineering posts. Line-cited with URL.
- `[Inference]` — reasoning derived from [Official] sources. Line-cited.
- `[Adapter]` — how we map an [Official] concept to palantirkc primitives. Cite both upstream + local file.
- `[Vision]` — aspirational / forward-looking. Do not treat as fact.
- `[Synthesis]` — multi-source merge.

## Maintenance Rules

- Keep `BROWSE.md` thin and task-routed.
- Keep `INDEX.md` focused on structure, provenance, and directory roles.
- For context injection, prefer the palantir-mini `research_context_select`
  MCP. It should return routers first, then only the exact official fact,
  synthesis, and schema primitive files implied by the query.
- When directories or marker families change, update this file so retrieval stays maintainable.
- Keep `palantir-developers/` thin; it should reduce search cost, not duplicate verbatim docs.
- `palantir-foundry/` refresh cadence: quarterly for stable areas; on-demand for AIP, AI FDE, AIP Evals, model catalog, Palantir MCP, Apollo, and builder workflows.
- Current refresh state: `research_library_refresh` accepts both canonical `libraryRoot` and compatibility `source` selectors, and supports legacy `entries[]` manifests. Live refresh is still blocked for current `palantir-foundry/` entries because the manifest records provenance `source` URLs but no write-safe direct `url` fields; dry-run must surface `staleUnfetchableDocs` rather than implying a healthy library. Non-Foundry research dirs still need manifests before refresh can cover them.
- `~/docs/research-synthesis/` (migrated 2026-05-01 from `palantir-vision/synthesis/`) grows additively — date-stamped topical filenames; older synthesis docs are never deleted, only superseded. NOT under research/ SSoT.

## Restructure 2026-04-20

Previous structure `palantir/{action,architecture,cross-cutting,data,decision-lineage,entry,logic,osdk,philosophy,platform,security,ship-os,typescript,validation}` was consolidated:

- **Official content** (factual reference on primitives) → removed from active routing because it duplicates official docs now under `palantir-foundry/`. Recover from git history or old PR context if historical comparison is needed.
- **Synthesis / interpretation / philosophy / talks** → moved into `palantir-vision/{philosophy,aipcon-devcon,typescript,decision-lineage,cross-cutting,ship-os,architecture-gap,audits,synthesis}`.
- **Official docs** (212 URLs from palantir.com/docs) → newly fetched to `palantir-foundry/{architecture,ontology,aip,dev-toolchain,security-deployments}/`.

Rationale:

- `palantir-developers/` is the current **ENTRY layer** for official builder questions.
- `palantir-foundry/` is the **FACT layer** for verbatim official docs.
- `palantir-vision/` is the **INTERPRETATION layer** for our analysis and transcripts.

Splitting entry, fact, and interpretation avoids mixing navigation advice, exact product facts, and local architectural conclusions.

## 2026-05-06 batch additions (W1.A SSoT-1 + W1.C SSoT-9)

Two SSoT-track sprints landed concurrently on 2026-05-06:

- **W1.A SSoT-1 — Palantir 1차 자료 mirror** (8 files):
  - 7 under `palantir-foundry/` (4 in `aip/`, 1 each in `dev-toolchain/`, `ontology/`, `security-deployments/`); 1 under `palantir-vision/aipcon-devcon/`.
  - Companion to the Anthropic trio in `anthropic/` (mirrored 2026-05-06 in PR #280).
  - 5 subdirectory `BROWSE.md` updated; top router `BROWSE.md` updated 2026-05-06.
- **W1.C SSoT-9 — ResearchSourceManifest primitive + automation**:
  - `MANIFEST.json` files added to 4 subdirs (`palantir-foundry/`, `anthropic/`, `palantir-vision/aipcon-devcon/`, `claude-code/`).
  - Schema primitive: `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0).
  - Automation: SessionStart hook + `pm-research-staleness-audit` skill + wraps `research_library_refresh` MCP (dryRun=true).
- Net new file count: foundry ~219 (was 212); claude-code, anthropic, aipcon-devcon unchanged in body but gain a MANIFEST.json each.

Provenance: `~/.claude/plans/mossy-mapping-eich.md §3.W1.A + §3.W1.C`. Full per-file frontmatter (source-url, source-author, source-published, fetched-at, license-note, topic) on each mirror.

## Canonical 1차 자료 sources (W2.D 2026-05-07)

Wave 2 of `~/.claude/plans/vast-giggling-mccarthy.md` introduced a typed inventory of the 10 canonical 1차 자료 mirrors that anchor every cold-start orchestration, research-staleness audit, and rule/plan citation flow. The registry is intentionally narrow: only mirrors verbatim cited by rule 12 (Lead Protocol), rule 16 (sprint-harness species), rule 26 (valuable-data standard), and `CONTEXT.md §15 Glossary` are promoted to canonical-source status.

Three source classes (per `CanonicalSourceClass` taxonomy in the W2.C primitive):

| Source class | File count | Default cadence | Authority anchor |
|--------------|------------|-----------------|------------------|
| `palantir-foundry-canonical` | 5 | `cold` (90 days) | Palantir AIP / Foundry / DevCon / AIPCon engineer-authored content (rule 26 §Anchors footer) |
| `claude-code-native-runtime-canonical` | 3 | `cold` (90 days) | Anthropic engineer harness-design posts (Lance Martin / Justin Young / Prithvi Rajasekaran; CONTEXT.md §15) |
| `claude-code-reference` | 2 | `warm` (30 days) | Claude Code product surface docs (features + agent system design) |

Per-entry inventory + topic tags + local mirror paths are documented inline in the W2.C primitive comment block (lines 322–356). See top-level `BROWSE.md` §"Palantir-foundry-canonical" + §"ClaudeCodeNativeRuntime-canonical" for the question→file fast-route tables.

Companion artifacts (per Wave 2 of `~/.claude/plans/vast-giggling-mccarthy.md`):

- **W2.A** — `/palantir-mini:pm-cold-start-orchestrate` skill: queries the registry singleton + injects routing context at session start.
- **W2.B** — SessionStart hook `cold-start-browse-index-loader`: auto-fires the skill on session start (advisory; bypassable via env var).
- **W2.C** — `~/.claude/schemas/ontology/primitives/canonical-source-registry.ts` (schemas v1.41.0+): typed `CanonicalSourceRegistryDeclaration` + `CanonicalSourceEntry` + class-default cadence lookup + in-memory `CanonicalSourceRegistry` helper.
- **W2.D** — this section + the two new `BROWSE.md` routing tables (the navigational layer surfacing W2.C typed knowledge).

Sibling primitive: `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0; per-subdir MANIFEST.json) — `CanonicalSourceRegistry` is registry-level (cross-subdir promoted-mirror inventory) while `ResearchSourceManifest` is per-subdir (full source list). Both primitives co-exist under the same authority chain.

## 2026-05-08 batch additions (sprint-046 Wave 2 research wave — Opus 4.7 + GPT-5.5 era)

User directive 2026-05-08 (Korean): palantir-mini Infra 전반을 Claude Harness 기반으로 작동 + Opus 4.7 + GPT-5.5-xhigh 출시 이후 최신 연구 정렬 + Lead(Opus 4.7) Harness Engineering 직접 담당. 5-angle parallel research wave (Angles A-E) → 3 mirror dispatches (M1/M2/M3) → 11 new mirror files.

| Wave artifact | Path | File count | Provenance |
|---|---|---|---|
| **M1 — Anthropic Opus 4.7 specifics** | `anthropic/opus-4-7-{introducing-2026-04-16, postmortem-2026-04-23, whats-new-platform}.md` | 3 new (existing dir 3→6) | [Official Anthropic] verbatim |
| **M2 — OpenAI new dir** | `openai/{gpt-5-5-introducing, agents-sdk-next-evolution, sandbox-agents-developer-docs, gpt-5-5-model-developer-page, harness-engineering-blog}.md` | 5 new (NEW dir; +MANIFEST + INDEX) | [Official OpenAI] (verbatim openai.com via scrapling stealthy; clean WebFetch on developers.openai.com) |
| **M3 — Industry harness engineering canonical** | `harness-engineering-2026/{martin-fowler-harness-engineering, the-new-stack-4-vendor-harness-pricing-split, endor-labs-cursor-not-codex-gpt-5-5}.md` | 3 new (NEW dir; +MANIFEST + INDEX) | [Authoritative industry] mixed verbatim/summary |

Each mirror carries the standard 6-field frontmatter (source-url / source-author / source-published / fetched-at / license-note / topic) per 2026-05-06 convention. New dir MANIFEST.json files declare refresh class `warm` (30d) — same cadence as existing `anthropic/`.

5-angle synthesis outputs (Lead-internal; not under research/ SSoT):
- `/tmp/researcher-angle-a-output.md` — Opus 4.7 architectural primitives + 4-component shift (Angle A)
- `/tmp/researcher-angle-b-output.md` — GPT-5.5 + xhigh + CUA harness + 5-level criterion.tier proposal (Angle B)
- `/tmp/researcher-angle-c-output.md` — OpenAI Manifest abstraction + HandsManifest gap analysis (Angle C)
- `/tmp/researcher-angle-d-output.md` — 4-vendor pricing split + Max X20 = 3rd arbitrage option (Angle D)
- `/tmp/researcher-angle-e-output.md` — Cross-runtime BrainProvider interface + Vercel "remove 80%" lesson (Angle E)

These synthesis outputs feed `~/.claude/plans/mellow-plotting-oasis.md` Wave 2+ pivot (Lead Harness Engineering decision).

Companion plans:
- `~/.claude/plans/2026-05-08-claude-harness-audit.md` — initial 10-dim audit (sprint-046 Wave 1 input).
- `~/.claude/plans/mellow-plotting-oasis.md` — 4-Wave plan (Wave 1 merged via PR #296 → ddbe676cd; Wave 2+ pending Lead pivot post-research).

## 2026-05-09 Ontology Engineering intent-gate synthesis

User directive 2026-05-09: structure the Ontology Engineering research needed to judge whether Lead using `palantir-mini` truly understands user intent before semantic artifact creation, and produce a Claude-facing improvement proposal.

Added interpretation file:

- `palantir-vision/architecture-gap/semantic-intent-gate-for-ontology-engineering.md` — maps official Palantir Ontology / AI FDE / MCP / AIP Evals / Global Branching facts to a local `SemanticIntentContract` gate before `pm-intent-to-ontology` and SprintContract binding.

Companion proposal:

- `~/.claude/plans/2026-05-09-semantic-intent-elicitation-gate-proposal.md` — Claude implementation proposal for `pm-semantic-intent-gate`, hook enforcement, SprintContract extension, event lineage, and tests.

Deep-dive correction note (2026-05-09, Scrapling MCP):

- Official Palantir docs and Palantir Community evidence were checked live for Ontology Engineering, AI FDE, Palantir MCP / Ontology MCP, Global Branching, and AIP Evals. The durable synthesis belongs in `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md`, not in verbatim research bodies.
- Corrected `palantir-foundry/BROWSE.md` and top-level `BROWSE.md`: the Global Branching entry is a 2026-05-05 announcement with GA week of 2026-05-18, not a same-day GA claim.
- Corrected `palantir-developers/BROWSE.md`: local `palantir-mini` Sprint-055 internals were removed from the official Palantir developer router and replaced with a boundary note pointing to plugin source and plans.

## 2026-05-09 Lead Intent to Digital Twin deep-dive update

User directive 2026-05-09: update the research routing so AI agents first read `BROWSE.md` / `INDEX.md`, then deep dive only the exact official docs, synthesis files, and plans required for the Lead intent-to-Digital-Twin proposal.

Updated routing intent:

- `BROWSE.md` now exposes a dedicated Lead Intent to Digital Twin deep-dive route.
- `palantir-developers/BROWSE.md` routes the official builder entrypoint before fact-layer descent.
- `palantir-foundry/BROWSE.md` and relevant subdir routers identify the exact AI FDE, AIP Evals, Workflow Lineage, Palantir MCP / OMCP, Global Branching, AIP Architecture, and Ontology overview files needed for this topic.
- `palantir-vision/architecture-gap/BROWSE.md` and `INDEX.md` route local interpretation to `semantic-intent-gate-for-ontology-engineering.md` and the Claude-facing proposal.

Durable proposal:

- `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md`

This proposal now records:

- `WorkflowContract turn-card decision` as the required loop for semantic ambiguity closure;
- Claude recommendations and plain-language explanations as mandatory parts of every clarification question;
- community failure-mode evidence from the 2026-05-09 Scrapling pass;
- final-review authority to make major or destructive palantir-mini plugin changes when legacy compatibility blocks the new semantic contract boundary.

Maintenance boundary:

- Keep detailed synthesis in the plan.
- Keep official product facts in `palantir-foundry/`.
- Keep routing and provenance updates in `BROWSE.md` / `INDEX.md`.
- Do not hand-edit verbatim official mirror bodies.
