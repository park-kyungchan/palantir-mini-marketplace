# research/anthropic/ — Anthropic engineering blog mirror

> Read-only mirror of Anthropic engineering posts cited as 1차 자료 (canonical primary sources) by `~/.claude/CLAUDE.md §Vocabulary` and `~/.claude/rules/CONTEXT.md §15 Glossary` for the harness taxonomy. AI agents may read; mutating evidence bodies is forbidden per Artifact Layer Policy. Routing updates to `BROWSE.md` only.

## Directory role

This directory exists to satisfy the user's directive (2026-05-06) that the three Anthropic engineering posts on harness design must be locally referenced ("절대적으로 참조"). They were previously cited only by URL, which violates the offline-resilient SSoT principle. Mirroring places the verbatim source text under `~/.claude/research/anthropic/` for `pm_research_citation_validate` to resolve, for hooks to inline excerpts from, and for agents to deep-read without external fetch.

## Files (3)

| File | Author | Date | Topic | Cited by |
|------|--------|------|-------|----------|
| [`effective-harnesses-2025-11-26.md`](./effective-harnesses-2025-11-26.md) | Justin Young | 2025-11-26 | Initializer + coding agent two-fold solution; Claude Agent SDK harness species behavior across multiple context windows | rule 16 v4.0.0 §0 (Claude Agent SDK species), CONTEXT.md §15 Glossary |
| [`scaling-managed-agents-2026-04-08.md`](./scaling-managed-agents-2026-04-08.md) | Lance Martin (with Cemaj, Cohen) | 2026-04-08 | Brain (Claude+harness) / Hands (sandbox) / Session (event log) decoupling; meta-harness definition; cattle-not-pets principle | CONTEXT.md §15 Glossary, §17 Brain-of-Swarms layer model; CLAUDE.md §Vocabulary |
| [`harness-design-2026-03-24.md`](./harness-design-2026-03-24.md) | Prithvi Rajasekaran | 2026-03-24 | 3-agent (Planner / Generator / Evaluator) GAN-inspired architecture; sprint contract; file-based IPC; self-grading bias is architectural | rule 16 v3.1.0+ §Roles + §Loop + §SprintContract + §File-based IPC; CONTEXT.md §15 Glossary (5-species #3) |

## Reading order

1. **Justin Young (2025-11-26)** — start here. Establishes the basic problem (long-running agents across context windows) and the simplest pattern (initializer + coding).
2. **Prithvi Rajasekaran (2026-03-24)** — extends to the 3-agent (planner/generator/evaluator) architecture. Introduces the GAN-inspired separation that motivates "Lead does NOT grade" in palantir-mini (rule 16).
3. **Lance Martin (2026-04-08)** — generalizes to the Brain/Hands/Session decomposition and meta-harness pattern. Explains why harness species are interchangeable; introduces the abstractions (`execute`, `wake`, `getSession`, `emitEvent`) that palantir-mini's MCP surface mirrors at the application layer.

## Provenance + license

- Each file carries a `source-url` + `source-author` + `source-published` + `fetched-at` frontmatter line (rule 26 D2 K-LLM-friendly format).
- License-aware: bodies are mirrored verbatim from the public Anthropic engineering blog. License note in each file repeats the read-only-mirror constraint per `~/.claude/CLAUDE.md §Artifact Layer Policy`.
- All three URLs were live and returned 200 status when fetched 2026-05-06T11:42Z.

## Cross-refs

- Routing entry: `~/.claude/research/BROWSE.md` §Anthropic engineering posts (mirrored 2026-05-06).
- Local rule cross-refs: rule 16 (sprint-harness species), rule 12 (Lead Protocol), rule 26 (valuable data — agentic memory taxonomy).
- Companion Palantir blog mirror: `../palantir-vision/aipcon-devcon/connecting-ai-to-decisions-2024-01.md` (same fetch session 2026-05-06).
- Companion Palantir Q1+Q2 2026 mirror batch (W1.A SSoT-1, 2026-05-06): `../palantir-foundry/aip/{blog-securing-agents-agentic-runtime-1-2026-01-22,ai-fde-overview-and-modes-skills-2026-03-12,aip-evals-overview-and-ontology-edits-2026-04-14,workflow-lineage-and-aip-observability-2026-03-03}.md` + `../palantir-foundry/{dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26,ontology/global-branching-overview-2026-05-05,security-deployments/announcements-2026-03-04-05-aipcon9-bundle}.md` + `../palantir-vision/aipcon-devcon/blog-fde-deep-dive-diogo-silva-santos-2026-04-08.md` (8 files).
- Manifest-driven staleness audit (W1.C SSoT-9, 2026-05-06): see this directory's `MANIFEST.json` (refresh class=warm, 30d) and `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0).

## Maintenance

- These mirror files are immutable evidence bodies. To refresh a mirror, archive the existing file under `archive/` (with fetch date suffix) before fetching a new copy.
- If Anthropic relocates a post, update `source-url` in the frontmatter and add an `original-url` field; do not delete history.
- This directory does NOT belong to internal palantir-mini synthesis — that goes in `~/.claude/plans/`.
