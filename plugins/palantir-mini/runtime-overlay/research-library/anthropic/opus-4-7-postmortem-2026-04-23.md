---
source-url: https://www.anthropic.com/engineering/april-23-postmortem
source-author: Anthropic team
source-published: 2026-04-23
fetched-at: 2026-05-06T12:35:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/."
topic: "April 23 2026 postmortem — cache management bug dropped reasoning history every turn; infrastructure failure mode evidence"
---

# An update on recent Claude Code quality reports

> Published Apr 23, 2026 by Anthropic team.
> Source: https://www.anthropic.com/engineering/april-23-postmortem
> Cited by Wave 2 sprint-046 Angle A as canonical 1차 자료 on Opus 4.7-era infrastructure failure modes (cache bug + reasoning-effort default + verbosity instruction).

Anthropic identified and resolved three separate issues affecting Claude Code quality over the past month. The API remained unaffected throughout.

## The Three Issues

**Reasoning Effort Default Change (March 4 - April 7)**
On March 4, the team modified Claude Code's default reasoning setting from "high" to "medium" to address user complaints about extremely slow response times. However, users subsequently reported that Claude felt less intelligent. Anthropic reversed this decision on April 7, "prefer[ring] to default to higher intelligence and opt into lower effort for simple tasks."

**Caching Bug (March 26 - April 10)**
A prompt-caching optimization intended to reduce latency for resumed sessions contained a critical flaw. Instead of clearing thinking history once after idle periods exceeding one hour, the bug "keep[s] happening every turn for the rest of the session instead of just once." This caused Claude to appear forgetful and repetitive, and contributed to faster-than-expected usage limit depletion.

**Verbosity Reduction Instruction (April 16 - April 20)**
Anthropic added a system prompt directing Claude to restrict intermediate text to 25 words and final responses to 100 words. Testing with "a broader set of evaluations" revealed "a 3% drop for both Opus 4.6 and 4.7," prompting immediate reversion.

## Going Forward

The organization plans expanded internal testing, broader evaluation suites for system prompt changes, improved code review tools, and gradual rollouts for intelligence-affecting modifications. All subscribers received usage limit resets on April 23.

---

## Local indexing notes

- Cited by Wave 2 research wave (sprint-046 Angle A) for Opus 4.7 infrastructure failure-mode evidence.
- Companion to `opus-4-7-introducing-2026-04-16.md` (release announcement) and `opus-4-7-whats-new-platform.md` (breaking changes).
- The cache bug evidence (Mar 26 – Apr 10) is significant for harness designers: agentic loops on Claude Code during this window would have observed degraded long-context retention without infrastructure-level visibility.
