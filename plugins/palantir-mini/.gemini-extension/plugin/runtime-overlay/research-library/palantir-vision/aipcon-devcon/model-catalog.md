---
title: AIP Model Catalog — LLM Availability in Foundry
slug: model-catalog
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "palantir.com/docs/foundry/announcements/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# AIP Model Catalog — LLM Availability in Foundry

> **Provenance:** [Official] — palantir.com/docs/foundry/announcements/ (verified 2026-04-03)
> **Schema anchors:** `LLMI-01..03`, `MCP-PS-01..02`
> **Markers:** `[§MOD-nn]`

---

## [§MOD-01] Model Catalog Overview

AIP Model Catalog provides ML model training and deployment within Foundry. GA since February 2026. Supports multiple LLM providers with native tool APIs.

Key boundary: Model deprecation is documented at `/docs/foundry/model-catalog/model-deprecation/`

---

## [§MOD-02] Available Models (as of Mar 2026)

### OpenAI

| Model | Added | Context | Key Features | Marker |
|-------|-------|---------|-------------|--------|
| GPT-5.4 | 2026-03-12 | 200K | Frontier, computer use, tool calling | [§MOD-03] |
| GPT-5.3 Codex | 2026-03-03 | 400K | Best coding, adjustable reasoning effort | [§MOD-02A] |
| GPT-5.2 Codex | 2026-02-03 | — | Coding model | [§MOD-08] |

### Anthropic

| Model | Added | Context | Key Features | Marker |
|-------|-------|---------|-------------|--------|
| Claude Opus 4.6 | 2026-02-12 | 1M | Most capable, from Anthropic/Bedrock/Vertex | [§MOD-07] |
| Claude Sonnet 4.6 | 2026-02-24 | 200K | Extended thinking, function calling | [§MOD-05] |

### Google

| Model | Added | Context | Key Features | Marker |
|-------|-------|---------|-------------|--------|
| Gemini 3.1 Pro | 2026-02-24 | 1M | Most advanced Gemini | [§MOD-06] |
| Gemini 3.1 Flash-Lite | 2026-03-12 | — | Fastest, adjustable thinking levels | [§MOD-04] |
| Gemini 3 series | 2026-01-15 | — | VertexAI commercial | [§MOD-09] |

---

## [§MOD-03] Multi-Model Architecture Significance

Per AIPCon 9 Anthropic-Pentagon context (→[§APC9-07]):
- DOD designated Anthropic a supply chain risk (March 5, 2026)
- Maven Smart System uses Claude across 6 military branches
- LLM independence (→[§LLMI-01]) is now a strategic imperative

AI FDE supports Anthropic, OpenAI, Google Gemini, and xAI natively — demonstrating the multi-model approach at the platform level. This validates our LLMI-01..03 constraints requiring model-agnostic design.

---

## [§MOD-04] Bring Your Own Model

AIP supports registering custom LLMs via:
1. Function interfaces (chat completion interface quickstart)
2. Model Catalog registration
3. Use via standard AIP tooling

This means the model catalog is extensible — not limited to the listed providers.

---

## Sources

- https://www.palantir.com/docs/foundry/aip/supported-llms/
- https://www.palantir.com/docs/foundry/model-catalog/overview/
- https://www.palantir.com/docs/foundry/announcements/2026-03/
- https://www.palantir.com/docs/foundry/announcements/2026-02/
- https://www.palantir.com/docs/foundry/announcements/2026-01/
