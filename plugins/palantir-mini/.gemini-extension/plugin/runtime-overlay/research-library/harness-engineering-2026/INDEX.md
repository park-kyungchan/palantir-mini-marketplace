# research/harness-engineering-2026/ — Industry canonical harness engineering mirror

> Read-only mirror of industry canonical sources on the "harness is the product" thesis (2026 paradigm). Cited by sprint-046 Wave 2 research wave (Angle D — multi-vendor convergence). Companion to `research/anthropic/` + `research/openai/`.

## Directory role

Created 2026-05-06 to capture cross-vendor / industry-authoritative evidence on harness engineering as architectural pattern (post-Opus 4.7 + GPT-5.5 era). The 3 files are:

- **Martin Fowler canonical authority article** on harness engineering as pattern (2×2 control framework: feedforward/feedback × computational/inferential; ambient affordances; Ashby's Law applied to coding-agent regulation).
- **The New Stack 4-vendor convergence framing** (Anthropic + OpenAI + Google + Microsoft consensus that harness is the product; 16-day timing convergence Mar-30/Apr-8/Apr-15; pricing-model divergence — $0.08/hr bundled vs open-source vs priced primitives vs model+tool metering).
- **Endor Labs empirical benchmark** proving harness > model on same vendor (Cursor + GPT-5.5 87.2% vs Codex + GPT-5.5 61.5% functional correctness; 25.7pp delta on identical model).

The directory deliberately sits **vendor-neutral** above `research/anthropic/` and `research/openai/` — it captures industry consensus and cross-vendor evidence rather than first-party vendor narratives.

## Files (3)

| File | Author | Date | Topic |
|------|--------|------|-------|
| [`martin-fowler-harness-engineering.md`](./martin-fowler-harness-engineering.md) | Birgitta Böckeler (martinfowler.com) | 2026-04-02 | Harness Engineering for Coding Agent Users — 2×2 control framework (guides/sensors × computational/inferential), ambient affordances, Ashby's Law, behaviour-harness gap, harnessability, harness templates |
| [`the-new-stack-4-vendor-harness-pricing-split-2026-04.md`](./the-new-stack-4-vendor-harness-pricing-split-2026-04.md) | Janakiram MSV (The New Stack) | 2026-04-18 | "Anthropic, OpenAI, Google, and Microsoft agree that the harness is the product. They disagree on the price." — 4-vendor consensus on category; 16-day timing convergence (Mar-30 Sycamore $65M / Apr-8 Anthropic Managed Agents $0.08/session-hour / Apr-15 OpenAI open-source Agents SDK harness); pricing-model divergence as deliberate strategic split |
| [`endor-labs-cursor-not-codex-gpt-5-5.md`](./endor-labs-cursor-not-codex-gpt-5-5.md) | Henrik Plate (Endor Labs) | 2026-04-27 | Agent Security League benchmark — Cursor + GPT-5.5 87.2% vs Codex + GPT-5.5 61.5% functional correctness on identical model; 25.7pp same-model harness delta; Cursor + GPT-5.5 23.5% security correctness #1; failure-category taxonomy (file reconstruction / crypto / NoneType / framework wiring) |

## Reading order

1. **`martin-fowler-harness-engineering.md`** — theoretical anchor. Establishes the pattern frame (2×2 controls), defines the discipline, names the open problems (notably the behaviour-harness gap).
2. **`the-new-stack-4-vendor-harness-pricing-split-2026-04.md`** — industry-positioning context. Explains why all four frontier labs decided in April 2026 to ship a harness product; documents the pricing-model divergence; cross-refs Martin Fowler as the canonization moment.
3. **`endor-labs-cursor-not-codex-gpt-5-5.md`** — empirical proof. Measures the Martin Fowler / New Stack thesis on real workloads, showing 25.7pp same-model harness delta. This is the data that justifies the strategic moves in #2 and the theoretical framework in #1.

## Provenance + license

- Each file carries a `source-url` + `source-author` + `source-published` + `fetched-at` frontmatter line (rule 26 D2 K-LLM-friendly format).
- License-aware: bodies are mirrored from the public source URLs. License notes in each file repeat the read-only-mirror constraint per `~/.claude/CLAUDE.md §Artifact Layer Policy`.
- All three URLs were live and returned 200 status when fetched 2026-05-06T13:30Z.
- The Martin Fowler URL serves Birgitta Böckeler's article on the martinfowler.com domain; this is the canonical Martin Fowler-domain harness-engineering pattern article (the article that The New Stack 2026-04-18 cites as the moment the term was "canonized" on Martin Fowler's site).

## Cross-refs

- `~/.claude/research/anthropic/` — Anthropic-side primary sources: Justin Young (Effective harnesses 2025-11-26), Lance Martin (Scaling Managed Agents 2026-04-08), Prithvi Rajasekaran (Harness design 2026-03-24). The 4-vendor article in this dir directly references Anthropic's April-8 Managed Agents launch.
- `~/.claude/research/openai/` — OpenAI-side primary sources (M2 companion mirror, sprint-046 Wave 2). The 4-vendor article in this dir references OpenAI's February 2026 harness-engineering blog post and the April-15 Agents SDK update.
- This dir = **vendor-neutral / industry layer above both**. When a reader needs cross-vendor evidence or the industry-consensus framing, route here first; for vendor-specific deep-reads, route to anthropic/ or openai/.
- Routing: `~/.claude/research/BROWSE.md` (Lead updates after all 3 M* mirrors land).

## Sprint-046 Wave 2 5-angle research wave (provenance)

This directory was authored as artifact M3 of the sprint-046 Wave 2 research wave (2026-05-06). The wave identified 5 angles on the W2 thesis "harness is the product"; Angle D — multi-vendor convergence — required mirroring the cross-vendor / industry-authoritative sources that argue and prove the thesis at industry scale. The 3 files are M3's deliverable for Angle D evidence. M1 and M2 (companion artifacts) mirror Anthropic-side and OpenAI-side primary sources respectively.

## Maintenance

- Mirrors are immutable evidence bodies. To refresh a mirror, archive the existing file under `archive/` (with fetch date suffix) before fetching a new copy.
- If the source publication relocates a post, update `source-url` in the frontmatter and add an `original-url` field; do not delete history.
- This directory does NOT belong to internal palantir-mini synthesis — that goes in `~/.claude/plans/`.
- Refresh schedule: warm class, 30-day expectedRefreshDays per `MANIFEST.json`.
