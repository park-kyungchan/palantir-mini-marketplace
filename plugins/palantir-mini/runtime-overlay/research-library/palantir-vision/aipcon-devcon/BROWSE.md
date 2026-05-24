# palantir-vision/aipcon-devcon/ — Query Router

> **Scope:** Conference and platform-launch evidence interpreted from AIPCon 9, DevCon 5, announcements, AI FDE, AIP Evals, model catalog, and workflow lineage notes.
> **Priority:** First-class input for AI Agent and `palantir-mini` roadmap work. Conference synthesis must still be cross-checked against official docs before becoming schema, rule, or runtime policy.

## Currentness guard

As of the 2026-05-05 upstream check, DevCon 5 and AIPCon 9 remain the latest
confirmed local conference anchors, but they are not the latest overall product
signals. April 2026 Foundry announcements and the 2026-04-29 Palantir agents
blog are newer. Treat DevCon 6 / AIPCon 10 as future watch targets until an
official Palantir source is found and recorded here.

## Open first by question

| Question | File |
|----------|------|
| What was covered at AIPCon 9? | `aipcon.md` |
| What was covered at DevCon 5? | `devcon.md` |
| What do recent official platform announcements change? | `announcements.md` |
| How is AI FDE framed? | `ai-fde.md` |
| How is AIP Evals framed? | `aip-evals.md` |
| What models and provider posture show up in the public material? | `model-catalog.md` |
| How is workflow lineage described in these talks? | `workflow-lineage.md` |
| What should feed `palantir-mini` harness/eval/lineage work first? | `devcon.md` -> `ai-fde.md` -> `aip-evals.md` -> `workflow-lineage.md` |
| What should feed defense/Maven/decision-advantage interpretation first? | `aipcon.md` -> `~/docs/research-synthesis/2026-04-23-maven-defense-osdk-design-reading.md` |
| §A1 — What does Palantir's "Connecting Agents to Decisions" blog (2026-04-29, blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40) say about decision lineage as the substrate refining 4-layer agentic memory (working/episodic/semantic/procedural)? | `aipcon-devcon/blog-connecting-agents-2026-04-29.md` (verbatim mirror — 4 anchored quotes Q1-Q4) + `~/.claude/plans/nifty-mixing-diffie.md` §Anchors (framework derivation). A1 is the canonical anchor for rule 26 v1.0.0 (Valuable Data Operating Standard). |
| §A2 — What changed in Foundry April 2026 announcements that impacts harness/agent design (Claude Opus 4.7 GA, AIP Evals fully integrated into AI FDE, AIP Agent Studio → AIP Chatbot Studio rebrand, Models in Pipeline Builder, USDA $300M deal Apr 22)? | `announcements.md` §ANN-APR2026 (Apr 14-30 deltas refreshed 2026-05-03 PR3) |
| §A3 — What is rule 26 + valuable-data substrate (T0-T4 grading, 5 axes, agentic memory) and where do I read it? | `~/.claude/rules/26-valuable-data-standard.md` (T2 active rule) + `~/.claude/schemas/ontology/primitives/value-grade.ts` (+ 4 sibling primitives) + `~/.claude/plans/nifty-mixing-diffie.md` (full plan) |

## Retrieval rules

- Conference materials are valuable for architecture direction, but they are not substitutes for exact product docs.
- If a launch claim sounds operationally specific, cross-check `../../palantir-foundry/` or `../../palantir-developers/`.
- Promote durable implications through the authority chain: official evidence -> synthesis marker -> schema/rule/plugin plan -> implementation.
- Keep local claims marker-cited (`[§DC5-*]`, `[§FDE-*]`, `[§EVAL-*]`, `[§APC9-*]`) so future agents can deep dive only the relevant slice.

## 2026-05-06 W1.A SSoT-1 mirror refresh batch (1 dated file)

| Date anchor | File | Topic |
|-------------|------|-------|
| 2026-04-08 | `blog-fde-deep-dive-diogo-silva-santos-2026-04-08.md` | External analyst deep-dive (Medium / Activated Thinker) on Palantir's Forward Deployed Engineering model — Delta (engineer) + Echo (deployment strategist) team formation; productive tension as design feature. Cross-ref to AI FDE product (`../../palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md`) — AI FDE is the AI-named successor concept. Provenance: `[Synthesis]` from external `[Vision]`. |
