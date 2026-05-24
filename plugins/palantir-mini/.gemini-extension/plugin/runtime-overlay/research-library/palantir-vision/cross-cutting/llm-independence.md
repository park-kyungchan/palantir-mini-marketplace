---
title: "LLM Independence — Provider-Neutral Runtime Contract"
slug: llm-independence
fileClass: vision-cross-cutting
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "https://www.palantir.com/docs/foundry/announcements/2026-03/", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://www.palantir.com/docs/foundry/palantir-mcp/overview/", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://www.palantir.com/docs/foundry/ontology-mcp/overview/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---
# LLM Independence — Provider-Neutral Runtime Contract

> Layer: Cross-cutting SSoT
> Date: 2026-03-17
> Purpose: distinguish Palantir-style multi-model consensus from local runtime vendor neutrality, and define what must remain independent of any one LLM provider or interface family.
> **Provenance:** Mixed — official Palantir grounding/MCP/tooling surfaces [Official] plus local provider-neutral runtime contract formalization [Inference].
> **Schema anchors:** `LLMI-01..03`, `MCP-01..03`, `MCP-PS-01..02`, `PB-01..03`
> **Legacy path note:** Later references to `research/palantir/...` in this historical note refer to the pre-2026-04-20 layout. Start current retrieval at `~/.claude/research/BROWSE.md`.

## [§LLMI-01] Why This File Exists

The codebase already supports multiple model providers and interface families in practice.
However, K-LLM and LLM-independence are not the same concept:

- **K-LLM**: multiple models reasoning against the same ontology ground truth
- **LLM-independence**: the system architecture does not semantically depend on one vendor's prompt style, API, or runtime identity format

This file exists to prevent a subtle failure mode:

- research says "multi-model consensus"
- runtime says "Claude and Codex both exist"
- but no explicit SSoT states what must remain provider-neutral

Without that distinction, a codebase can accidentally drift into vendor-shaped ontology semantics while still claiming to be "multi-model".

## [§LLMI-02] Verified Public Direction

### [§LLMI-03] 1. Palantir publicly supports multiple frontier model providers

Verified from March 2026 announcements and docs:

- OpenAI models
- Anthropic models
- Google Gemini models
- xAI models

This matters because the Palantir public product surface is clearly not single-vendor.

### [§LLMI-04] 2. K-LLM is about grounded consensus, not vendor preference

Palantir's ontology-grounding philosophy supports the idea that multiple models can reason against the same ontology and arrive at the same answer with higher confidence.

The ontology is the semantic anchor.
The model is not the semantic source of truth.

### [§LLMI-05] 3. Tooling surfaces are also split between builder and runtime

As of March 12, 2026:

- `Palantir MCP` is builder-facing
- `Ontology MCP` is runtime/consumption-facing

This reinforces an important architectural rule:

- model/provider adapters are integration surfaces
- they are not the semantic core

## [§LLMI-06] Local Interpretation

Our local system needs two distinct invariants:

### [§LLMI-07] A. Multi-Model Consensus Invariant

Different models can operate over the same ontology and still converge because:

- decision heuristics are typed
- hard constraints are typed
- descriptions are complete
- evaluation criteria are explicit

This is the **K-LLM** side.

### [§LLMI-08] B. Provider-Neutral Runtime Invariant

The runtime must avoid collapsing all model identity into one free-form string.

Instead it should separate:

- actor type
- interface family
- normalized model identity
- provider

This is the **LLM-independence** side.

## [§LLMI-09] What Must Remain Provider-Neutral

The following must not depend on Claude-specific or Codex-specific behavior:

1. Ontology semantics
2. Decision heuristics
3. Hard constraints
4. Evaluation pass/fail rules
5. Autonomy graduation thresholds
6. Workflow lineage meaning
7. Outcome correctness criteria

The following may vary by provider, but only as runtime metadata:

1. model name
2. model provider
3. interface family
4. token usage
5. raw reasoning trace format

## [§LLMI-10] Implementation Mapping

### [§LLMI-11] Research / Meta-Schema

- `semantics.ts`
  - `K_LLM`
  - `LLM_INDEPENDENCE`

### [§LLMI-12] Runtime

- `frontend-dashboard/convex/schema.ts`
  - session-level and hook-event-level normalized runtime identity fields
- `frontend-dashboard/convex/llmRuntimeHelpers.ts`
  - normalization helpers
- `frontend-dashboard/convex/mutations.ts`
  - ingestion path writes normalized fields
- `frontend-dashboard/convex/queries.ts`
  - runtime independence summary
- `frontend-dashboard/convex/mutations.ts`
  - workflow graph includes `agent`, `model`, `provider` resources

## [§LLMI-13] Current Remaining Gap

Runtime is now ahead of the research/schema stack in one respect:

- the runtime can already normalize provider/interface/model identity
- but not every research or schema document yet treats that as a first-class semantic invariant

The next correction is not "add more runtime support".
It is:

- make provider-neutrality part of the canonical authority chain
- ensure future schema and audit work cannot silently reintroduce vendor-specific semantics

## [§LLMI-14] Sources

- https://www.palantir.com/docs/foundry/announcements/2026-03/
- https://www.palantir.com/docs/foundry/announcements/2026-02/
- https://www.palantir.com/docs/foundry/announcements/2026-01/
- https://www.palantir.com/docs/foundry/palantir-mcp/overview/
- https://www.palantir.com/docs/foundry/ontology-mcp/overview/
- `research/palantir/platform/devcon.md + platform/aipcon.md`
- `research/palantir/architecture/ontology-model.md`
- `research/palantir/platform/aipcon.md`

---

## [§LLMI-15] Empirical Validation: Anthropic-Pentagon Supply Chain Crisis (March 2026)

> **[External context]** Sources: CNBC, Fortune, TechCrunch (March 2026). These are not official Palantir sources; they are used here only to explain why provider-neutral architecture became strategically urgent.

LLMI-01..03 moved from theoretical framework to **mission-critical urgency** when:

### [§LLMI-16] Timeline
- **Feb 27, 2026:** Pentagon threatens to blacklist Anthropic over AI military usage disputes
- **March 5, 2026:** DOD officially designates Anthropic a supply chain risk — **first American company ever publicly named** (designation traditionally reserved for foreign adversaries)
- **March 12, 2026 (AIPCon 9):** Alex Karp confirms: "The Department of War is planning to phase out Anthropic; currently, it's not phased out. Our products are integrated with Anthropic, and in the future, it will probably be integrated with other large language models."

### [§LLMI-17] Core Dispute
Anthropic refused two categorical restrictions: (1) autonomous lethal weapons powered by Claude, (2) large-scale domestic surveillance of American citizens. Pentagon terms "completely focused on non-American citizens in a war context."

### [§LLMI-18] Impact on LLMI Framework
- **LLMI-01 (Ontology Before Vendor):** Validated — business semantics must never reference "Claude" or "GPT" as architectural assumptions
- **LLMI-02 (Provider-Neutral Identity):** Urgently validated — Maven Smart System uses Claude across all 6 military branches + CENTCOM. If Anthropic is phased out, the runtime must continue functioning with alternative providers.
- **LLMI-03 (Evaluation Independence):** Validated — evaluation rubrics that assume Claude's specific behavior patterns become worthless when the provider changes
- **K-LLM vindicated:** Multi-model consensus means no single-provider dependency is acceptable for defense/enterprise operations

### [§LLMI-19] Implication for This Codebase
Our `llmRuntimeHelpers.ts` (normalizeModel, inferProvider, inferInterfaceFamily, buildNormalizedActorProfile) is no longer a nice-to-have abstraction — it is the architectural pattern that prevents a supply chain crisis from breaking the decision system. The Anthropic crisis proves that provider-neutral identity is **infrastructure**, not **preference**.
