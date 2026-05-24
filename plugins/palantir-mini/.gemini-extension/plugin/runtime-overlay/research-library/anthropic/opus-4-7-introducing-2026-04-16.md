---
source-url: https://www.anthropic.com/news/claude-opus-4-7
source-author: Anthropic team
source-published: 2026-04-16
fetched-at: 2026-05-06T12:35:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/."
topic: "Official release announcement for Claude Opus 4.7 — agentic coding + computer use + long-running task improvements (April 16, 2026)"
---

# Introducing Claude Opus 4.7

> Published Apr 16, 2026 by Anthropic team.
> Source: https://www.anthropic.com/news/claude-opus-4-7
> Cited by Wave 2 sprint-046 Angle A as canonical 1차 자료 on Opus 4.7 release scope (agentic coding + vision + memory deltas vs Opus 4.6).

Claude Opus 4.7 is now generally available as Anthropic's latest AI model, representing a notable advancement over its predecessor, Opus 4.6.

## Key Capabilities

The model demonstrates significant improvements in software engineering tasks, particularly handling complex, long-running work with greater consistency and precision. Users report confidence delegating challenging coding projects that previously required close oversight.

Vision capabilities have been substantially enhanced. Opus 4.7 now processes images up to 2,576 pixels on the long edge—over three times previous resolution—enabling uses like computer vision agents and detailed diagram analysis.

## Performance Highlights

According to early testers, the model shows marked gains across multiple domains:

- **Coding**: "Recall improved by over 10%, surfacing difficult-to-detect bugs" (CodeRabbit VP)
- **Finance**: Achieves state-of-the-art scores on finance agent evaluations with rigorous analysis capabilities
- **Multimodal work**: "98.5% on visual-acuity benchmark versus 54.5% for Opus 4.6" (XBOW CEO)

## Notable Features

- **Instruction following**: Substantially improved literal adherence to user directions
- **Effort levels**: New `xhigh` setting between `high` and `max` for fine-grained control
- **Memory**: Better utilization of file-system-based memory across sessions

## Pricing & Availability

Pricing remains unchanged at $5 per million input tokens and $25 per million output tokens. The model is accessible via Claude's API, Amazon Bedrock, Google Cloud's Vertex AI, and Microsoft Foundry.

## Safety Considerations

Opus 4.7 maintains a similar safety profile to Opus 4.6, with improvements in honesty and resistance to prompt injection attacks. A new Cyber Verification Program serves legitimate security research needs.

---

## Local indexing notes

- Cited by Wave 2 research wave (sprint-046 Angle A) for Opus 4.7 architectural implications.
- Companion to `effective-harnesses-2025-11-26.md` + `scaling-managed-agents-2026-04-08.md` + `harness-design-2026-03-24.md` (the 3 existing 1차 자료).
- Pairs with `opus-4-7-postmortem-2026-04-23.md` (April 23 incident) and `opus-4-7-whats-new-platform.md` (Messages API breaking changes).
