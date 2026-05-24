---
title: "Tool Exposure & Ontology-Grounded Agents"
slug: tool-exposure
fileClass: vision-cross-cutting
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "https://www.palantir.com/docs/foundry/agent-studio/overview", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration", fetched: 2026-05-01, verbatimAvailableAt: null }
  - { source: "https://www.palantir.com/docs/foundry/palantir-mcp/overview", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---
# Tool Exposure & Ontology-Grounded Agents

> **Layer:** CROSS (spans LOGIC + ACTION + SECURITY)
> **SSoT for:** toolExposure concept, 3-tool-category auto-surfacing, agent grounding architecture, Agent Studio, Ontology MCP action guidance, Palantir MCP builder taxonomy
> **Provenance:** Mixed — Agent Studio / Ontology MCP / Palantir MCP docs [Official]; ontology auto-surfacing of tools from AIPCon/blog [Official]; toolExposure as explicit property [Inference]
> **Schema anchors:** `MCP-01..03`, `MCP-PS-01..02`, `PMC-01..13`, `WL-01..05`, `PB-01..03`

## [§TE-01] Overview

Palantir agents are **ontology-grounded** — their tools, context, and actions are all derived from the Ontology. The Ontology automatically surfaces three categories of tools aligned with the three semantic domains, and Agent Studio provides the configuration layer for which tools agents can access.

## [§TE-02] Ontology Auto-Surfacing: 3 Tool Categories

> **[Official — palantir.com/platforms/ontology, Agent Studio docs, "Reducing Hallucinations with the Ontology" blog]**

The Ontology automatically exposes tools to AI agents in three categories:

| Category | Domain Alignment | Tool Type | HRP Pattern |
|----------|-----------------|-----------|-------------|
| **Data queries** | DATA (SENSE) | Read-only tools querying entity properties | HRP-01: OAG (Ontology-Augmented Generation) |
| **Logic functions** | LOGIC (DECIDE) | Computation tools for deterministic operations | HRP-02: Logic Tool Handoff |
| **Actions** | ACTION (ACT) | Execution tools proposing state changes | HRP-03: Human-in-the-Loop Review |

Each tool carries:
- **Type-safe parameters** (from function signatures / action parameters)
- **Permission requirements** (from RBAC / ontology roles)
- **Submission criteria** (from action definitions — for execution tools)
- **Audit logging** (via Workflow Lineage — every tool call traced)

## [§TE-03] Agent Studio

> **[Official — palantir.com/docs/foundry/agent-studio/overview]**

Agent Studio is the platform for configuring, deploying, and monitoring ontology-grounded AI agents.

### [§TE-04] 7 Official Tool Types in Agent Studio (6 active + 1 legacy)

> **[Official — palantir.com/docs/foundry/agent-studio/tools/]** Verified 2026-03-17.

| # | Tool Type | Domain Alignment | What It Does |
|---|-----------|-----------------|-------------|
| 1 | **Action** | ACTION | Execute ontology edits (auto-run or with user confirmation) |
| 2 | **Object query** | DATA | Query object types with filtering, aggregation, inspection, link traversal |
| 3 | **Function** | LOGIC | Call any Foundry function including published AIP Logic functions (latest or pinned version) |
| 4 | **Update application variable** | — | Update application state variables configured in Application state tab |
| 5 | **Command** | — | Trigger operations in other Palantir applications using commands |
| 6 | **Request clarification** | — | Pause execution and ask user for clarification |
| 7 | **(Legacy) Ontology semantic search** | DATA | Uses vector property for retrieval. Replaced by "Ontology context" retrieval context. Does NOT include citations, input/output variables, or return object sets. |

**Tool calling modes:**
- **Prompted tool calling** (default): instructions in prompt, single tool at a time, all models, all tool types
- **Native tool calling**: built-in model capabilities, parallel tool calls, subset of models, only: actions, object query, function, update application variable

**Agent Tier Framework (4 tiers — builder complexity, NOT runtime autonomy):**
- Tier 1: Ad-hoc analysis (AIP Threads — document analysis, drag-and-drop)
- Tier 2: Task-specific agent (Agent Studio — ontology/document/function context, deploy via Threads or OSDK)
- Tier 3: Agentic application (Workshop AIP Agent widget or OSDK apps — application state variables)
- Tier 4: Automated agent (agent published as Function → pulled into AIP Automate for autonomous task handling)

**Agents as Functions:** Agents can be published as Functions, enabling: AIP Evals evaluation, Automate automation, Code Repository use.

### [§TE-05] Agent Runtime Memory Model (4 types)

> **[Official — blog.palantir.com "Securing Agents in Production (Agentic Runtime #1)", Jan 2026]**

AIP agents operate with 4 memory types, **ALL served by the Ontology**:

| Memory Type | Purpose | Ontology Role |
|-------------|---------|---------------|
| **Working** | Current conversation/task context | Agent context window |
| **Episodic** | Past interactions and experiences | Persisted session data |
| **Semantic** | Domain knowledge and facts | Object types, properties, links |
| **Procedural** | Learned skills and procedures | Functions, actions, automations |

**Agent permissions** = function of (owner, service user/OSDK scope, delegating user)

**Security dimensions:** (1) secure access to reasoning core, (2) insulated orchestration via Rubix (ephemeral nodes max 48h), (3) granular policy enforcement across all 4 memory types, (4) governed tool access, (5) real-time observability.

Key design: Tool selection is per-agent in the Agent Studio UI — there is **no function-level `toolExposure` annotation**. Control is at the agent configuration level, not the ontology definition level.

### [§TE-06] Ontology MCP (External Agent Consumption)

> **[Official — palantir.com/docs/foundry/ontology-mcp/overview/]**

Ontology MCP exposes ontology resources as MCP tools for external AI agents (Claude Code, LangChain, CrewAI):
- Object types → `search-<object-type>` MCP tools
- Action types → action MCP tools (with "Agent tool description" configured in Ontology Manager)
- Query functions → query MCP tools
- Access governed by **application scopes** in Developer Console

Official configuration details matter here:
- Action types expose an **Agent tool description** field in Ontology Manager so builders can tell agents when and how to use an action tool
- Palantir's own Ontology MCP docs show **Claude skills** composing search + action tools into repeatable higher-level workflows
- This means official external-agent guidance exists at the action/tool-composition layer even though function-level `toolExposure` remains our local normalization

### [§TE-07] Palantir MCP (Builder Taxonomy: 13 Categories, 65 Tools)

> **[Official — palantir.com/docs/foundry/palantir-mcp/overview + available-tools]**

Palantir MCP is the builder-facing MCP surface. Unlike Ontology MCP's dynamic per-app tool generation, it exposes a fixed taxonomy of **13 categories / 65 enumerated tools**:

| Category | Count | R/W Split | Representative Tools |
|----------|------:|-----------|----------------------|
| Compass | 6 | 5R / 1W | `create_foundry_project`, `search_foundry_projects` |
| Dataset | 8 | 6R / 2W | `run_sql_query_on_foundry_dataset`, `create_and_write_to_foundry_dataset` |
| Data Lineage | 1 | 1R / 0W | `get_resource_graph` |
| Ontology | 12 | 6R / 6W | `create_or_update_foundry_{object,link,action}_type` |
| Object Set | 2 | 2R / 0W | `query_ontology_objects`, `aggregate_ontology_objects` |
| OSDK | 2 | 2R / 0W | `get_ontology_sdk_context`, `get_ontology_sdk_examples` |
| Platform SDK | 2 | 2R / 0W | `list_platform_sdk_apis`, `get_platform_sdk_api_reference` |
| Code Repository | 6 | 3R / 3W | `create_python_transforms_code_repository`, `create_code_repository_pull_request` |
| Foundry Branching | 6 | 2R / 4W | `create_foundry_branch`, `create_foundry_proposal` |
| Developer Console | 5 | 2R / 3W | `convert_to_osdk_react`, `generate_new_ontology_sdk_version` |
| Compute Module | 5 | 2R / 3W | `manage_compute_modules`, `execute_compute_modules_function` |
| Data Connection | 3 | 0R / 3W | `create_foundry_rest_api_data_source` |
| Documentation | 7 | 7R / 0W | `search_foundry_documentation` |

**Key boundary:** Palantir MCP modifies ontology and application **structure** through builder-reviewed flows. Ontology MCP exposes ontology **data** and action/query/function surfaces for runtime consumers. They must not be modeled as the same abstraction.

## [§TE-08] toolExposure Property

> **[Provenance: Inference]** Palantir's Agent Studio handles tool visibility through its own configuration UI, and Ontology MCP provides action-level guidance via Agent tool descriptions. There is still no official function-level `toolExposure` field in ontology definitions. The concept of marking individual functions as LLM-callable is therefore our analytical normalization of the "Logic Tool Handoff" pattern.

In our schema system, `toolExposure` marks LOGIC functions as available for LLM orchestration:

```typescript
toolExposure: boolean  // true = function available to AI agents as a tool
```

**Criteria for exposure** (from HRP-02):
- Function solves computation tasks LLMs cannot do reliably (Haversine distance, VaR calculation, route optimization)
- Function returns structured, unambiguous results
- Function is pure or has well-defined side-effect boundaries

**Functions that should NOT be exposed:**
- Internal helper functions with no business meaning
- Functions with complex side effects that agents shouldn't trigger
- Functions that require human context to interpret results

## [§TE-09] Agent Composition Patterns

> **[Official — AIPCon 9 demonstrations]**

| Pattern | Example | Tools Chained |
|---------|---------|---------------|
| **Document processing** | Freedom Mortgage: mortgage docs → ontology → operations | DATA query + LOGIC classification + ACTION routing |
| **Real-time planning** | World View: update constraint → downstream effects | DATA query + LOGIC constraint propagation |
| **Continuous monitoring** | Ted Mabrey (Palantir): long-running advocates per component — tier one auto supplier | DATA monitoring + LOGIC anomaly detection + ACTION proposal |
| **Supply chain triage** | ShipOS: engineering change → cascade analysis → 3 COAs | DATA query + LOGIC impact analysis + ACTION scenarios |

## [§TE-10] Security Constraints on Tool Exposure

> **[Official — Agent Studio + RBAC]**

- **RBAC governs tool access**: Agents operate within a permission scope — they can only invoke functions/actions their configured role permits
- **Submission criteria apply**: Even agent-proposed actions must pass submission criteria before execution
- **Marking enforcement**: Agents cannot access marking-classified data without appropriate clearance
- **Progressive autonomy**: Agent actions are gated by PA level (see progressive-autonomy.md)

## [§TE-11] Cross-References

- See `philosophy/llm-grounding.md` for the 3 Hallucination Reduction Patterns (HRP-01..03) that motivate tool exposure
- See `logic/README.md` for the LOGIC domain's LLM Tool Exposure section
- See `cross-cutting/progressive-autonomy.md` for how agent actions are gated by autonomy level
- See `cross-cutting/decision-lineage.md` for how agent tool calls are traced

## [§TE-12] Sources

- https://www.palantir.com/docs/foundry/agent-studio/overview (Agent Studio)
- https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration (Ontology MCP action guidance + Claude skills)
- https://www.palantir.com/docs/foundry/palantir-mcp/overview (Palantir MCP)
- https://www.palantir.com/docs/foundry/palantir-mcp/available-tools (Palantir MCP tool taxonomy)
- https://www.palantir.com/platforms/ontology/ (ontology as grounding mechanism)
- https://blog.palantir.com/reducing-hallucinations-with-the-ontology-in-palantir-aip-288552477383 (3 HRP patterns)
- https://theaiarchitects.substack.com/p/palantirs-digital-twin-building-the (agent grounding in digital twin)
