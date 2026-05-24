# research/openai/ — OpenAI engineering blog + developer docs mirror

> Read-only mirror of OpenAI primary sources cited as 1차 자료 by sprint-046 Wave 2 research wave (Angles B + C). AI agents may read; mutating evidence bodies is forbidden per Artifact Layer Policy. Routing updates to BROWSE.md only.

## Directory role

This directory was created 2026-05-06 to satisfy sprint-046 Wave 2 directive (Korean): palantir-mini Infra 전반을 Claude Harness 기반으로 작동 + Opus 4.7 + GPT-5.5-xhigh 출시 이후 최신 연구 mirror. Companion to `~/.claude/research/anthropic/` (Anthropic 3-file 1차 자료 trio: Justin Young 2025-11-26 / Prithvi 2026-03-24 / Lance Martin 2026-04-08).

## Files (5)

| File | Author | Date | Topic | Cited by |
|------|--------|------|-------|----------|
| [`gpt-5-5-introducing-2026-04-23.md`](./gpt-5-5-introducing-2026-04-23.md) | OpenAI | 2026-04-23 | Official GPT-5.5 launch — xhigh reasoning effort, 1.05M context, frontier benchmarks (Terminal-Bench 2.0 82.7%, Expert-SWE 73.1%, OSWorld-Verified 78.7%, ARC-AGI-2 85.0%); cross-vendor benchmarks vs Claude Opus 4.7 + Gemini 3.1 Pro | sprint-046 Wave 2 Angle B |
| [`gpt-5-5-model-developer-page.md`](./gpt-5-5-model-developer-page.md) | OpenAI Developer Documentation | 2026-04-23 (live docs) | GPT-5.5 API surface — $5/$30 pricing, $0.50 cached input, 128K max output, 1.05M context, knowledge cutoff 2025-12-01, 272K token surcharge boundary | sprint-046 Wave 2 Angle B |
| [`agents-sdk-next-evolution-2026-04-15.md`](./agents-sdk-next-evolution-2026-04-15.md) | OpenAI | 2026-04-15 | Agents SDK April 2026 launch — model-native harness + native sandbox execution + Manifest abstraction + 7 sandbox providers (Blaxel/Cloudflare/Daytona/E2B/Modal/Runloop/Vercel) + harness/compute decoupling for security/durability/scale | sprint-046 Wave 2 Angle C |
| [`sandbox-agents-developer-docs.md`](./sandbox-agents-developer-docs.md) | OpenAI Developer Documentation | 2026-04-15 (live docs) | Concrete Manifest schema (LocalDir/GitRepo/storage mounts) + RunState/Session/Snapshot 3-surface state model + 9 sandbox providers (adds Unix-local + Docker) + capability system (Shell/Filesystem/Skills/Memory/Compaction) + sandbox memory primitive | sprint-046 Wave 2 Angle C |
| [`harness-engineering-blog.md`](./harness-engineering-blog.md) | Ryan Lopopolo (OpenAI Technical Staff) | 2026-02-11 | OpenAI's own harness engineering field report — 5-month experiment building 1M LOC product with 0 manually-written lines; AGENTS.md-as-table-of-contents; agent legibility goal; layered architecture enforced via custom linters; entropy garbage-collection cleanup process; 3.5 PRs/engineer/day throughput | sprint-046 Wave 2 vendor positioning |

## Reading order

1. `gpt-5-5-introducing-2026-04-23.md` — start here for capability surface + cross-vendor benchmark comparison.
2. `gpt-5-5-model-developer-page.md` — API surface (xhigh effort enum, pricing, cached-input rates, long-context surcharge).
3. `agents-sdk-next-evolution-2026-04-15.md` — harness/sandbox decoupling architecture + Manifest abstraction announcement.
4. `sandbox-agents-developer-docs.md` — concrete Manifest schema + 3-surface state model (RunState/Session/Snapshot) + capability system.
5. `harness-engineering-blog.md` — OpenAI's own harness positioning (engineer-written field report; complementary to corporate-voice announcements).

## Provenance + license

- Each file carries source-url + source-author + source-published + fetched-at frontmatter.
- License-aware: bodies mirrored verbatim from OpenAI public docs/blog. Read-only per `~/.claude/CLAUDE.md §Artifact Layer Policy`.
- All five URLs returned 200 status when fetched 2026-05-06T13:42Z (3 via scrapling stealthy_fetch after openai.com WAF returned 403 to plain WebFetch; 2 via WebFetch direct from developers.openai.com).
- **Date correction noted**: `harness-engineering-blog.md` was published 2026-02-11 (not 2026-04 as initially estimated in task spec). MANIFEST + frontmatter use the actual publication date.

## Cross-refs

- `~/.claude/research/anthropic/` — companion Anthropic 1차 자료 trio. **Architectural convergence**: OpenAI's harness/compute split + Manifest = Anthropic's Brain/Hands/Session model + Lance Martin meta-harness pattern. Both vendors converged on the same 3-layer decomposition within ~1 week of each other (2026-04-08 Anthropic Lance Martin / 2026-04-15 OpenAI Agents SDK).
- `~/.claude/research/harness-engineering-2026/` — industry harness engineering canonical (M3 sibling, parallel-created in same Wave 2 batch).
- Routing entry: `~/.claude/research/BROWSE.md` (Lead updates with cross-vendor router post-mirror).
- Manifest-driven staleness audit: see this directory's `MANIFEST.json` (refresh class=warm, 30d) and `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0).

## Cross-vendor mapping (OpenAI ↔ Anthropic)

| Concept | OpenAI surface | Anthropic surface |
|---------|---------------|-------------------|
| Control plane | "Harness" (owns agent loop, model calls, tool routing, RunState) | "Brain" (model + harness species; rule 16 v4.0.0 §0 5 species) |
| Execution plane | "Compute" / sandbox (Manifest-described workspace, snapshot-rehydratable) | "Hands" (sandbox executor; *cattle, not pets*) |
| State substrate | RunState (harness-side) + Session state (provider-side) + Snapshot (workspace) | "Session" (events.jsonl append-only log; rule 10) |
| Workspace contract | Manifest abstraction (entries: LocalDir, GitRepo, storage mounts, environment) | (no direct analog; palantir-mini provides via `~/.claude/schemas/ontology/primitives/research-source-manifest.ts`) |
| Vendor-neutrality | 9 sandbox providers + bring-your-own | meta-harness pattern (Managed Agents wraps any harness species) |
| Memory primitive | Sandbox `Memory` capability (rollouts + summary md + skill materials) | 4-layer agentic memory (working / episodic / semantic / procedural; rule 26 §Axis E) |

## Maintenance

- Mirror files immutable. To refresh, archive existing under `archive/` (with fetch date suffix) before re-fetching.
- This dir does NOT belong to internal palantir-mini synthesis — that goes in `~/.claude/plans/`.
- If OpenAI relocates a post, update `source-url` in the frontmatter and add an `original-url` field; do not delete history.
- 30-day refresh cadence (refreshClass=warm) — re-validate sources circa 2026-06-05.
