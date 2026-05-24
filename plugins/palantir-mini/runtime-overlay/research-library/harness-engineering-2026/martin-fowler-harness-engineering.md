---
source-url: https://martinfowler.com/articles/harness-engineering.html
source-author: Birgitta Böckeler (publication on martinfowler.com)
source-published: 2026-04-02
fetched-at: 2026-05-06T13:30:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/. Body content is summarized + paraphrased from the live article (full verbatim mirror not produced because WebFetch rendered a structured summary; refresh via archive/ rotation if a verbatim copy becomes required)."
topic: "Martin Fowler — Harness Engineering canonical software-engineering authority on harness as architectural pattern (feedforward/feedback × computational/inferential; ambient affordances; Ashby's Law applied to coding-agent control)"
---

# Harness Engineering for Coding Agent Users

> Published 2026-04-02 by Birgitta Böckeler, on martinfowler.com.
> Source: https://martinfowler.com/articles/harness-engineering.html
> Cited by `~/.claude/research/harness-engineering-2026/INDEX.md` as the canonical pattern-frame author for the "harness is the product" thesis. The New Stack 2026-04-18 article cross-references this essay as the moment Martin Fowler's site "canonized" the term.

> **Mirror provenance note**: WebFetch (2026-05-06) returned a clean structured summary of the live article. The summary preserves the article's section structure, key claims, and terminology. Where the body below paraphrases a passage, no language is fabricated — every claim is traceable to the WebFetch-extracted summary. If a verbatim mirror is later required, archive this file under `archive/` and re-fetch with a longer raw-HTML pipeline.

## Article overview

The article's thesis: AI-generated code requires confidence-building infrastructure around the model — not just better models. Böckeler frames this as **harness engineering**, defining the discipline of designing the controls, sensors, and ambient structure that govern coding agents. The motivating observation: "LLMs are non-deterministic, they don't know our context, and they don't really understand the code." External regulation closes that gap.

## Two-axis control framework

The article introduces a 2×2 framework that organizes harness controls along two orthogonal axes.

### Axis 1 — Feedforward vs Feedback

- **Guides (feedforward controls)** — anticipate agent behavior and steer it before it acts. They increase the probability of good initial output by constraining what the agent attempts. Examples: prompts, conventions, scaffolds, type signatures.
- **Sensors (feedback controls)** — observe after the agent acts and enable self-correction. Examples: tests, linters, reviewers, runtime traces.

The article notes the failure modes of using only one axis:
- Feedback-only → repetitive mistakes (no rule prevents the next attempt from making the same error).
- Feedforward-only → no verification that the rules actually worked.

A working harness needs both axes.

### Axis 2 — Computational vs Inferential

- **Computational** — deterministic, fast, CPU-based. Tests, linters, type checkers. Run in milliseconds-to-seconds with reliable results.
- **Inferential** — semantic analysis using AI code review. Slower, more expensive, non-deterministic, but enabling rich semantic guidance that computational tools cannot express.

Each axis-1 control (guide or sensor) can be implemented computationally or inferentially. The 2×2 yields four implementation styles.

## The steering loop

Humans iteratively improve the harness by addressing recurring issues — feedback signals from real failures become enhanced feedforward + feedback controls in the next round. The article notes that AI itself can help build these controls: writing structural tests, generating rules from observed patterns, or producing documentation that becomes future feedforward.

## Timing — keep quality left

Issues should be caught as early as possible in the development lifecycle.
- Fast checks (linters, basic reviews) → run before integration.
- Expensive sensors (mutation testing, detailed reviews) → run post-integration.
- Continuous drift detection → monitors the codebase outside change cycles.

## Three regulation categories

The article splits harness scope into three categories with different solubility profiles.

1. **Maintainability harness** — regulates internal code quality. Computational sensors reliably catch structural issues (complexity, coverage gaps). Inferential approaches handle semantic problems less reliably.
2. **Architecture fitness harness** — defines and checks architectural characteristics through fitness functions, performance requirements, observability standards.
3. **Behaviour harness** — the most challenging category. Current approaches rely on functional specifications and AI-generated test suites, but trust remains limited. The article cites experimental success with approved-fixture patterns, while flagging functional correctness as the underdeveloped frontier.

## Harnessability

Not all codebases support equal harnessing.
- Strongly typed languages, clear module boundaries, frameworks → naturally afford better controls.
- Greenfield projects → can embed harnessability from the start.
- Legacy systems with technical debt → face steeper challenges.

The implication: harness quality depends on the substrate the harness operates on.

## Ambient affordances

The article introduces this term to describe **structural properties of the environment itself that make it legible, navigable, and tractable to agents**. Technology choices and architecture decisions determine future governability of the codebase by AI agents. This is not a property of the harness; it is a property of the code/repo that the harness sits atop.

## Harness templates

The article speculates that enterprises might develop bundle packages combining guides and sensors for common service topologies (business services, event processors, dashboards). Teams could eventually select tech stacks partly based on the available harness templates — a flip from "language → harness" to "harness → language."

## Ashby's Law

Ashby's Law of Requisite Variety states that a regulator must possess at least as much variety as the system it governs. Applied to harness engineering: committing to a defined set of topologies narrows the possibility space, making comprehensive harnesses more achievable by reducing system variety. The corollary: an unbounded codebase requires an unbounded harness, which is impractical, so harness engineering pushes architectural homogenization.

## The role of the human

Humans bring implicit harnesses through experience, aesthetic judgment, organizational awareness, and social accountability. A good harness should redirect human input toward decisions where it matters most — rather than attempting complete elimination of human oversight. The harness's purpose is to free human attention for the load-bearing decisions, not to replace humans.

## Open questions

The article identifies several unsolved problems:
- Maintaining harness coherence as it grows.
- Evaluating harness quality (something comparable to code coverage, but for harnesses).
- Handling contradictory feedback signals.
- Designing integrated tooling across delivery steps.
- The behaviour harness remains particularly underdeveloped for providing confidence in functional correctness.

## Real-world examples

The article references implementations from:
- **OpenAI** — layered architecture with custom linters.
- **Stripe** — pre-push hooks and blueprints.
- **Thoughtworks** teams tackling architecture drift.

These ground the abstract framework in shipping production examples.

## Why this article matters for palantir-mini

This article is cited by the W2 5-angle research wave (sprint-046) as the **canonical Martin Fowler-domain harness engineering pattern article** that named the discipline industry-wide. Its 2×2 control framework (guide/sensor × computational/inferential) maps directly to palantir-mini's existing primitives:
- **Guides** ↔ Sprint contract + agent briefing template (rule 12 v3.4.0 §Briefing template).
- **Sensors** ↔ pm-grader-dispatch + grade_outcome_with_rubric (rule 16 §Loop step 4).
- **Computational sensors** ↔ deterministic graders (code/rule/hybrid rubric domains).
- **Inferential sensors** ↔ model-domain graders + harness-evaluator agent.

The article's "behaviour harness" gap matches palantir-mini's `simulator` rubric domain (rule 16 §GradingRubric) — a transient ontology graph + impact_query as a structural proxy for behavioural correctness.

The "ambient affordances" concept aligns with palantir-mini's `~/.claude/schemas/` ontology layer + `~/.claude/research/` SSoT — these are properties of the repo that make agents tractable, separate from the harness itself.

## Cross-refs

- `the-new-stack-4-vendor-harness-pricing-split-2026-04.md` — cites this article as the moment Martin Fowler's site canonized the term in early April 2026.
- `endor-labs-cursor-not-codex-gpt-5-5.md` — empirical evidence for the article's implicit claim that harness > model on identical inference engine.
- `~/.claude/research/anthropic/effective-harnesses-2025-11-26.md` — Anthropic's parallel framing of the same pattern.
- `~/.claude/research/openai/` (M2 sibling) — OpenAI's parallel framing.
