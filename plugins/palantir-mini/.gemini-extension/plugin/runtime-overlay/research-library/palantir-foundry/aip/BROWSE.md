# palantir-foundry/aip/ — Query Router

> **Scope:** Official AIP stack docs fetched 2026-04-20. This directory currently contains 55 official pages plus routing docs.
> **Provenance:** `[Official]` verbatim.

## Open first by question

| Question | File |
|----------|------|
| What is AIP overall? | `aip-overview.md` |
| How is AIP architected across models, tools, governance, and lifecycle? | `../architecture/architecture-center-aip-architecture.md` |
| How do I build an interactive assistant/chatbot? | `agent-studio-overview.md` |
| How do I embed a chatbot in an app or call it over APIs? | `agent-studio-foundry-apis.md`, `agent-studio-agents-as-functions.md` |
| How does AI FDE work? | `ai-fde-overview.md` |
| How do I evaluate and iterate AI workflows? | `aip-evals-overview.md`, `aip-evals-getting-started.md` |
| How do I build logic rather than a chatbot? | `aip.md`, then AIP Logic pages in this directory |
| What models and providers are supported? | `aip-supported-llms.md`, `aip-llm-provider-compatible-apis.md`, `aip-bring-your-own-model.md` |
| How do observability, ethics, and security work? | `aip-aip-observability.md`, `aip-ethics-governance.md`, `aip-aip-security.md` |
| What end-user AIP applications exist besides chatbots? | `aip-analyst-overview.md`, `assist.md` |
| What AIP docs matter for Lead intent-to-Digital-Twin ambiguity closure and evaluation? | `ai-fde-overview-and-modes-skills-2026-03-12.md`, `aip-evals-overview-and-ontology-edits-2026-04-14.md`, `workflow-lineage-and-aip-observability-2026-03-03.md` |

## Minimal deep-dive sets

### "What is the AIP stack?"

1. `aip-overview.md`
2. `../architecture/architecture-center-aip-architecture.md`

### "How do I build a production chatbot?"

1. `agent-studio-overview.md`
2. `agent-studio-core-concepts.md`
3. `agent-studio-foundry-apis.md`

### "How do I build and iterate with evals?"

1. `ai-fde-overview.md`
2. `aip-evals-overview.md`
3. `aip-evals-getting-started.md`

### "How should an agent close semantic ambiguity before ontology-affecting work?"

1. `ai-fde-overview-and-modes-skills-2026-03-12.md`
2. `aip-evals-overview-and-ontology-edits-2026-04-14.md`
3. `workflow-lineage-and-aip-observability-2026-03-03.md`
4. `../../palantir-vision/architecture-gap/semantic-intent-gate-for-ontology-engineering.md`
5. `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md`

## Coverage map

- AIP core:
  overview, getting started, prompt engineering, supported LLMs, provider-compatible APIs, observability, security, ethics, BYOM.
- AIP Chatbot Studio:
  files currently use legacy `agent-studio-*` slugs because the fetch predates the April 2026 rename.
- AI FDE:
  overview, navigation, modes and skills, security and governance, best practices.
- AIP Evals:
  overview, suite authoring, experiments, run results, metrics dashboard, ontology edits.
- AIP Analyst:
  overview, core concepts, configuration, Workshop widget.
- AIP Assist:
  overview, best practices, custom content, agent deployment, integrations, suggested actions.

## 2026-05-06 W1.A SSoT-1 mirror refresh batch (4 dated files)

| Date anchor | File | Topic |
|-------------|------|-------|
| 2026-01-22 | `blog-securing-agents-agentic-runtime-1-2026-01-22.md` | Palantir Blog (Medium) — 4 memory categories (working / episodic / semantic / procedural). Anchor for rule 26 v1.0.0 §Axis E (Memory-mapped). |
| 2026-03-03 | `workflow-lineage-and-aip-observability-2026-03-03.md` | Workflow Lineage (formerly Workflow Builder) + AIP Observability hub — source-executor pattern + 7-day log aggregation. Anchor for rule 10 v2.1.0 §5-dim envelope. |
| 2026-03-12 | `ai-fde-overview-and-modes-skills-2026-03-12.md` | AI FDE overview + 8 modes × agent-skills/domain-skills × closed-loop operation. AI FDE GA date. Anchor for rule 26 §Axis B + §Axis C. |
| 2026-04-14 | `aip-evals-overview-and-ontology-edits-2026-04-14.md` | AIP Evals overview + Ontology edit simulation + 19 built-in evaluators. AI FDE integration date. Anchor for rule 26 §Axis B + rule 16 v4.0.0 §GradingRubric `simulator` domain. |

## Naming note

Official product naming changed in April 2026:

- **AIP Agent Studio** -> **AIP Chatbot Studio**
- **AIP Agents** -> **AIP Chatbots**

Keep these rules:

- prefer **AIP Chatbot Studio** in prose
- keep `agent-studio-*` filenames unchanged because they are literal local file names
- assume some official pages and APIs still use legacy naming for backward compatibility

## Cross-refs

- Official builder-entry summaries: `../../palantir-developers/build-with-aip.md`
- Internal synthesis: `../../palantir-vision/aipcon-devcon/ai-fde.md`, `../../palantir-vision/aipcon-devcon/aip-evals.md`
- Local control-plane substrate cross-reference (sprint-055, 2026-05-08): the `outcome_pair_close` MCP handler at `~/.claude/plugins/palantir-mini/bridge/handlers/outcome-pair-close.ts` operationalizes the BackPropagation circuit anchored by `../../palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md` (rule 26 §Anchors). It atomically appends a `validation_phase_completed{errorClass:"outcome_pair_closed"}` event AND mutates the outcome-pair marker, closing the verifiable outcome-pair lifecycle per rule 26 §Axis B1. Other sprint-055 surface (4 skills + 3 hooks + rule 25 v1.1.0) is palantir-mini-internal substrate without an AIP cross-reference; see `../../palantir-developers/BROWSE.md` §Sprint-055 surface additions for the full local index.

## Do not assume

- That `agent-studio-*` filenames mean the current product name is still Agent Studio.
- That this directory alone answers every app-building question; custom app delivery often also needs `../dev-toolchain/BROWSE.md`.
