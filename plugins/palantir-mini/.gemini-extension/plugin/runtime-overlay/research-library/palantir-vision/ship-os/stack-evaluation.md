---
title: AIPCon 9 OSS Stack Evaluation
slug: stack-evaluation
fileClass: vision-ship-os
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# AIPCon 9 OSS Stack Evaluation

> **Purpose:** Research-only comparison between the open-source stack proposed in external Ship OS clone material and this repo's current ontology stack.
>
> **Status:** Reference only. This file is explicitly not a migration plan.
>
> **Use:** Prevent stack confusion during future schema or project planning.
> **Provenance:** Mixed — external OSS/clone material [External], local stack inspection [Local], and Palantir docs [Official] used as capability baselines rather than migration instructions.
> **Schema anchors:** `PB-01..03`, `ORCH-01..06`, `MCP-PS-01..02`

## [§SOSE-01] Core Rule

Research compares **capabilities**, not logos.

If two stacks satisfy the same semantic role at the current scale, research should record the equivalence and block premature replacement work.

## [§SOSE-02] Comparison Table

| External Proposal Layer | Proposed Tooling | Current Local Equivalent | Research Assessment |
|---|---|---|---|
| Ontology storage / graph model | TypeDB, Neo4j, RDF/OWL | `research -> schemas -> project ontology -> Convex runtime` | Our semantic authority lives upstream of the runtime store. No research evidence requires replacing Convex with a graph database for current scope. |
| Durable execution | Temporal | Convex workflows, mutations, cron-driven orchestration | Capability overlap is sufficient for solo-developer and current project scale. This is not a research blocker. |
| Event streaming / realtime | MQTT, SSE | Convex realtime subscriptions, hooks, HTTP ingestion | Current stack already supports runtime propagation and observation for the existing projects. |
| Automation orchestrator | n8n, Windmill | hooks, Convex actions, cron jobs, project automations | Current stack is less general-purpose but matches present operational needs. |
| Agent runtime | LangGraph | project-specific ontology/action flows, local runners, tool-driven orchestration | Semantic structure matters more than framework branding here. |
| LLM serving | vLLM | provider-dependent runtime adapters, subprocess invocation, model normalization | Runtime abstraction is the research concern; serving substrate is secondary at this layer. |
| Observability | Langfuse | hook events, workflow traces, build events, audit results | Current projects already encode typed traces; the gap is consistency, not missing observability software. |
| Deployment substrate | Platform One / custom infra | current local + Convex deployment model | Out of scope for ontology research unless edge/disconnected deployment becomes a real project requirement. |

## [§SOSE-03] What This Means For Research

The open-source stack document is useful for:

- understanding which capabilities an ontology operating system needs
- spotting missing categories in our research language
- checking whether a missing project feature is actually a missing semantic layer

It is **not** useful for:

- deciding schema ownership
- bypassing research and moving directly into infra replacement
- treating stack swaps as ontology improvements

## [§SOSE-04] Where The Current Stack Is Good Enough

At current scope, the local stack already supports:

- governed write paths
- reactive subscriptions
- audit and lineage capture
- cron and event-driven automation
- project-specific digital twins

That means the research conclusion is conservative:

> prefer authority-chain clarity over infrastructure churn

## [§SOSE-05] Where Specialized Infrastructure Might Later Matter

A future stack discussion would only be warranted if research uncovers concrete requirements such as:

- disconnected edge synchronization
- extremely high-frequency telemetry beyond current runtime assumptions
- complex multi-team workflow isolation beyond current project patterns
- graph-native reasoning requirements that cannot be expressed through the current ontology pipeline

Those are future architecture questions, not current research findings.

## [§SOSE-06] Research Guardrail

Until a separate architecture session proves otherwise:

1. `research/` defines semantic needs
2. `schemas/` defines typed rules
3. project scope adapts to those rules
4. stack replacement is last, not first

## [§SOSE-07] Sources Inside This Library

- `platform/aipcon.md`
- `architecture/ontology-model.md`
- `architecture/orchestration-map.md`
- `action/README.md`
