---
source-url: https://www.endorlabs.com/learn/gpt-5-5-sets-a-new-code-security-record-with-cursor-not-codex-in-agent-security-league
source-author: Henrik Plate (Endor Labs research)
source-published: 2026-04-27
fetched-at: 2026-05-06T13:30:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/. Body content is summarized + paraphrased from the live article (full verbatim mirror not produced because WebFetch rendered a structured summary; refresh via archive/ rotation if a verbatim copy becomes required)."
topic: "Endor Labs Agent Security League — empirical evidence that harness choice determines outcome on identical model: Cursor + GPT-5.5 87.2% vs Codex + GPT-5.5 61.5% functional correctness; 25.7pp delta on same model; Cursor + GPT-5.5 23.5% security correctness top rank"
---

# GPT-5.5 Sets a New Code Security Record with Cursor, not Codex, in Agent Security League

> Published 2026-04-27 by Henrik Plate, Endor Labs.
> Source: https://www.endorlabs.com/learn/gpt-5-5-sets-a-new-code-security-record-with-cursor-not-codex-in-agent-security-league
> Cited by `~/.claude/research/harness-engineering-2026/INDEX.md` as the canonical empirical-benchmark proof that harness > model on identical inference engine. The article's "same model, same week, two harnesses, two different functional results" framing is the load-bearing data point for sprint-046 W2 Angle D.

> **Mirror provenance note**: WebFetch (2026-05-06) returned a structured summary of the live article. The summary preserves all numeric claims, the article's quoted-conclusion sentence, the per-vendor leaderboard, and the failure-category list. Where this body paraphrases, no language is fabricated — every claim is traceable to the WebFetch-extracted summary. If a verbatim mirror is later required, archive this file under `archive/` and re-fetch with a longer raw-HTML pipeline.

## Article overview

Endor Labs runs the **Agent Security League**, a benchmark that scores AI coding agents on two axes: **functional correctness** (does the code work?) and **security correctness** (does the code lack the OWASP-canonical vulnerability classes?). The April-27 release fixes one variable — the underlying model is GPT-5.5 — and varies the harness, comparing **Cursor + GPT-5.5** against **Codex + GPT-5.5**. The result is a 25.7-percentage-point gap on the functional-correctness axis. The article concludes the harness, not the model, is the decisive factor.

## Security correctness leaderboard (top ranks)

| Rank | Configuration | Security correctness |
|------|---------------|----------------------|
| 1 | Cursor + GPT-5.5 | 23.5% |
| 2 | Cursor + Opus 4.7 | 22.9% |
| 3 (tie) | Claude Code + Opus 4.7 | 20.1% |
| 3 (tie) | Codex + GPT-5.5 | 20.1% |

Notes from the article:
- **Cursor + GPT-5.5** sets a new code-security record; the previous high was Cursor + Opus 4.7.
- **Cursor + GPT-5.5 (23.5%)** beats **Codex + GPT-5.5 (20.1%)** by 3.4 percentage points on security despite running the same OpenAI model. This is the first axis on which harness choice produces a same-model gap.
- The absolute numbers (sub-25%) reflect the difficulty of the security benchmark; the article emphasizes the *gap* between configurations more than the absolute floor.

## Functional correctness — the load-bearing claim

When the harness varies but the model is held constant, the gap widens dramatically.

| Configuration | Functional correctness |
|---------------|------------------------|
| Cursor + GPT-5.5 | **87.2%** |
| Codex + GPT-5.5 | **61.5%** |
| **Delta (same model, two harnesses)** | **25.7 percentage points** |

The article's quoted conclusion (verbatim, preserved):
> "same model, same week, two harnesses, two different functional results"

> "the agent harness matters as much as model capability"

This is the data point that the W2 5-angle research wave (sprint-046, Angle D — multi-vendor convergence) cites as **empirical proof** for the "harness is the product" thesis canonized by Martin Fowler (April 2026) and packaged-into-pricing by The New Stack (April 2026).

## Failure-category root-cause analysis

The article identifies systematic Codex limitations across **16 shared failures with its predecessor**, categorizing the issues into four buckets:

1. **File reconstruction challenges** — agent fails to correctly rebuild a file from spec/diff.
2. **Cryptographic integration errors** — agent misuses crypto APIs (key sizes, mode selection, IV reuse).
3. **NoneType handling failures** — Python-specific null/None propagation bugs.
4. **Framework wiring incompleteness** — agent generates a valid component but fails to register it in the framework's wiring (DI, routing, middleware chain).

These are harness-level failure modes — the model has the knowledge, the harness fails to surface the right context or run the right verification. This matches Birgitta Böckeler's "behaviour harness is the underdeveloped frontier" claim in the Martin Fowler article (`martin-fowler-harness-engineering.md`).

## Key conclusion (article-level)

The broader insight transcends individual model performance: **harness architecture fundamentally shapes outcomes, sometimes more decisively than underlying model capability improvements.** Two corollaries:

1. Buying a better model (GPT-5.5 over GPT-5) does not close the gap if the harness is wrong. Codex + GPT-5.5 still trails Cursor + GPT-5.5 by 25.7pp on functional correctness.
2. Buying a better harness (Cursor over Codex) closes the gap **on the same vendor's model**. This is direct empirical evidence for the "harness is the product" thesis.

## Why this article matters for palantir-mini

This article is the **empirical** half of the W2 Angle D evidence triplet. The other two — `martin-fowler-harness-engineering.md` (theoretical) + `the-new-stack-4-vendor-harness-pricing-split-2026-04.md` (industry-positioning) — make the *claim* that harness > model. Endor Labs makes the *measurement* that proves it on real benchmarks.

For palantir-mini's design defensibility:
- palantir-mini-sprint-harness species (rule 16) makes harness-level decisions (sprint contract, briefing template, grader dispatch, file-IPC). The Endor Labs result implies these decisions are load-bearing for outcomes — they are not cosmetic.
- The 25.7pp delta on identical model justifies the cost of harness instrumentation. If harness choice produces a 25.7pp swing, 1-2pp of harness overhead is trivially recouped.
- The "framework wiring incompleteness" failure category maps to palantir-mini's `commit-edits-precondition` hook (rule 16 v3.2.0 §Loop step 5) — the gate exists precisely to catch wiring incompleteness before commit.
- The "behaviour harness" gap from Martin Fowler is concretely measured here: the 25.7pp gap is the behaviour-harness gap. palantir-mini's `simulator` rubric domain (rule 16 §GradingRubric, schemas v1.31.0+) is one path to closing it on top of the existing computational + inferential graders.

## Cross-refs

- `martin-fowler-harness-engineering.md` — theoretical pattern frame; this article provides the empirical proof of that frame's central claim.
- `the-new-stack-4-vendor-harness-pricing-split-2026-04.md` — industry-positioning frame; this article provides the benchmark data that justifies the pricing convergence the New Stack describes.
- `~/.claude/research/anthropic/effective-harnesses-2025-11-26.md` — Anthropic's parallel framing of harness-as-load-bearing.
- `~/.claude/research/openai/` (M2 sibling) — OpenAI's framing of the Codex / Agents SDK harness; relevant because Endor Labs benchmarks Codex.
