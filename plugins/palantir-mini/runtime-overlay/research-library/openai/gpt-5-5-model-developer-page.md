---
source-url: https://developers.openai.com/api/docs/models/gpt-5.5
source-author: OpenAI Developer Documentation
source-published: "2026-04-23 (live model docs; fetched 2026-05-06)"
fetched-at: 2026-05-06T13:42:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/."
topic: "GPT-5.5 API surface — 1.05M context window + 128K max output + reasoning token support + $5/$30 input/output pricing + cached input $0.50 + standard tools (code interpreter, computer use, MCP)"
---

# GPT-5.5 Model Documentation

> OpenAI Developer Documentation, fetched 2026-05-06.
> Source: https://developers.openai.com/api/docs/models/gpt-5.5
> Cited by: Wave 2 sprint-046 research wave (Angle B — concrete API surface for capability-vs-cost decisions; reasoning effort enum; pricing for cost-of-Brain calculations).

## Overview

GPT-5.5 represents "a new class of intelligence for coding and professional work." This frontier model is designed for the most complex professional tasks and incorporates advanced reasoning capabilities.

## Key Specifications

**Context and Output:**

- 1,050,000 token context window
- 128,000 maximum output tokens
- December 1, 2025 knowledge cutoff
- Reasoning token support available

**Capabilities:**

- Reasoning level: Highest
- Speed: Fast
- Input modalities: Text and images
- Output: Text only

## Pricing

The model uses token-based pricing:

| Metric | Cost |
|---|---|
| Input (per 1M tokens) | $5.00 |
| Cached input (per 1M tokens) | $0.50 |
| Output (per 1M tokens) | $30.00 |

> **Important notes**: Prompts exceeding 272K input tokens incur 2x input and 1.5x output charges for the full session across standard, batch, and flex APIs. Regional data residency endpoints carry a 10% cost uplift.

## Supported Features

- Streaming
- Function calling
- Structured outputs
- Web search, file search, image generation, code interpreter, and computer use tools
- Skill integration and MCP support
- Tool search functionality

## Rate Limits

Access varies by tier, ranging from Tier 1 (500 RPM, 500K TPM) to Tier 5 (15K RPM, 40M TPM).

---

## Local indexing notes

- Cited by Wave 2 sprint-046 research wave (Angle B — concrete API surface for cost-of-Brain calculations).
- **Pricing comparison anchor**: $5 input / $30 output / $0.50 cached input. Use for cross-vendor cost diff vs Claude Opus 4.7 + Gemini 3.1 Pro in any palantir-mini Brain dispatch routing decision.
- **Long-context surcharge** (>272K tokens → 2x input / 1.5x output) is a load-bearing constraint for any agent that depends on the full 1.05M window — the effective price ceiling above the 272K threshold is $10 input / $45 output per 1M tokens.
- **Knowledge cutoff** Dec 1, 2025 — relevant for any retrieval-vs-generative decision about post-cutoff facts (e.g. anything cited in `~/.claude/research/` after that date is post-knowledge-cutoff for GPT-5.5).
- **Tool surface** matches Anthropic's analog: web search / file search / image generation / code interpreter / computer use / MCP / skills. MCP support means OpenAI agents can read palantir-mini's MCP handlers same as Claude agents — cross-runtime substrate sharing is feasible.
- **Reasoning effort enum** (the announcement post implies values; this page confirms "highest" as the supported max — labeled "xhigh" in `gpt-5-5-introducing-2026-04-23.md` evals).
- Companion: `gpt-5-5-introducing-2026-04-23.md` (announcement + benchmarks) + `agents-sdk-next-evolution-2026-04-15.md` (harness layer).
