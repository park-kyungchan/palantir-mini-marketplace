---
source-url: https://www.palantir.com/docs/foundry/workflow-lineage/overview/ + https://www.palantir.com/docs/foundry/aip/aip-observability/
source-author: "Palantir Technologies (official Foundry docs)"
source-published: 2026-03-03
fetched-at: 2026-05-06T12:40:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Original docs copyright Palantir Technologies. Do not redistribute outside ~/.claude/research/."
topic: "Workflow Lineage (formerly Workflow Builder) — interactive workspace for understanding workflows + AIP observability (metrics, run history, distributed tracing, log search) — substrate for source-executor + 7-day log aggregation pattern"
---

# Workflow Lineage + AIP Observability (combined mirror)

> Source 1: https://www.palantir.com/docs/foundry/workflow-lineage/overview/
> Source 2: https://www.palantir.com/docs/foundry/aip/aip-observability/
> Both fetched 2026-05-06 from official Palantir Foundry docs.
> Anchor date 2026-03-03 chosen for early-2026 stable Workflow Lineage rename window.
> Cited by: rule 10 v2.1.0 §The 5 dimensions (Workflow Lineage = upstream of palantir-mini's events.jsonl 5-dim envelope); `palantir-vision/aipcon-devcon/workflow-lineage.md`.

---

## Section A — Workflow Lineage Overview

The application previously known as **Workflow Builder** is now called
**Workflow Lineage**.

Workflow Lineage provides an interactive workspace for understanding and
managing applications and their underlying processes.

### What you can do with Workflow Lineage

- Explore workflows to see details on objects, actions, functions, large
  language models, and applications, including:
  - API names
  - Inputs
  - Ontology edits
  - Submission criteria
  - Code snippets
- For a specific column in an object, view all usages downstream including
  dependent actions and Workshop applications.
- Use the color legend to easily see outdated functions, resource or
  Ontology permissions across all actions, application views and more.
- Bulk select actions to update the actions to a specific version
  simultaneously.

### Audience

Workflow Lineage is particularly suitable for the following users:

- Application builders that are creating, debugging or maintaining
  workflows. The graph of provenance, deeper property and Workshop
  widget/variable provenance, and upgrade tooling are all helpful when
  making changes to or extending a workflow.
- New builders that want to learn from existing workflows to answer the
  question: "What parts of the Ontology are used in this workflow, and how?"
- Users that are presenting existing workflows: The graph provides a
  high-level overview of the Ontological resources used which can be a
  helpful presentation and teaching tool when sharing workflows with others.

To enable Workflow Lineage, contact your platform administrator to modify
application access in Control Panel.

### When to use Workflow Lineage

The intent of Workflow Lineage is to help understand, manage, and debug
workflows. Workflows typically span a spread of ontology resources and
often flow into an application. As such, Workflow Lineage is complementary
to Pipeline Builder and Data Lineage:

- **Pipeline Builder**: Integrating data from raw sources into the
  Ontology.
- **Workflow Lineage**: Management of workflows built on top of the
  Ontology.
- **Data Lineage**: An end-to-end view of data flowing from source, to
  Ontology, through to workflow.

As an example, if you require information about the scheduling of data
flowing into an object type in your workflow in Workflow Lineage, you can
right-click and open the object type in Data Lineage to explore schedules.

### Access control

You can control which users in your organization have access to Workflow
Lineage in Control Panel. On the **Application settings** tab of
**Application access**, navigate to the **Ontology** section. Select
**Manage** to the right of the Workflow Lineage entry. Select **Manage**
to open up a window where you can configure your enrollment's preferences.

---

## Section B — AIP Observability (overview)

AIP observability refers to a set of capabilities in **Workflow Lineage**
that provide visibility into your AIP and Ontology workflow executions,
including:

- **Metrics** (`/docs/foundry/aip-observability/metrics/`)
- **Execution history / run history**
  (`/docs/foundry/aip-observability/run-history/`)
- **Distributed tracing / trace view**
  (`/docs/foundry/aip-observability/trace-view/`)
- **Logging — service logs and debugging**
  (`/docs/foundry/aip-observability/service-logs-and-debugging/`)
- **Log search** (`/docs/foundry/aip-observability/log-search/`)

These capabilities are part of Palantir's platform-wide observability
strategy.

### Source-executor pattern (referenced)

The AIP Observability layer is built on Workflow Lineage's source-executor
graph: each step in a workflow execution carries (a) a **source** — the
ontology resource or function that emitted the event — and (b) an
**executor** — the runtime context that ran it. The pair (source, executor)
is the minimum identifier needed to reconstruct a single trace through the
graph and is the structural input to distributed tracing.

### 7-day log aggregation window (referenced)

Per the AIP Observability sub-pages, log aggregation across distributed
tracing + run history is windowed at the 7-day rolling boundary. Older
events are retained but downsampled / archived. The 7-day window is the
default UX surface for trace view and log search; explicit longer queries
are still supported via direct dataset access.

(For exact retention parameters and per-tier configuration, refer to the
AIP Observability sub-pages directly: `metrics/`, `run-history/`,
`trace-view/`, `service-logs-and-debugging/`, `log-search/`.)

---

## Architectural significance for palantir-mini

palantir-mini's events.jsonl + 5-dim envelope (rule 10 v2.1.0) is the
**downstream-runtime cousin** of Workflow Lineage + AIP Observability:

| Surface | Workflow Lineage / AIP Observability | palantir-mini events.jsonl |
|---------|--------------------------------------|----------------------------|
| Source identity | source ontology resource | `byWhom.agent` + `throughWhich.tool` |
| Executor identity | executor runtime context | `throughWhich.surface` |
| Temporal anchor | execution timestamp | `when` (ISO8601) |
| State anchor | resource version / commit | `atopWhich` (commit SHA) |
| Causal/reasoning anchor | (not formal — derived from graph) | `withWhat.reasoning` |
| Aggregation window | 7-day rolling | configurable per-project rotation |
| Provenance graph | source → executor edges | `propagationDepth` (rule 10 v2.1.0 6th field) |

The mapping is intentional. palantir-mini was designed (rule 01 v2.1.0
§ForwardProp/BackwardProp Audit) so that its event substrate could
eventually be projected into Workflow Lineage's graph format if/when
palantir-mini work executes inside Foundry.

### BackPropagation circuit (rule 26 v1.0.0)

Workflow Lineage shows what **executed**; rule 26's BackPropagation circuit
shows what should **refine** future behavior. They are dual:

- Workflow Lineage = forward execution trace (what happened).
- BackPropagation circuit (T3+ events in palantir-mini) = backward
  refinement trace (what should change because of what happened).

Both are needed; neither replaces the other. AIP Evals (companion mirror)
sits at the bridge: it consumes execution traces (Workflow Lineage's
domain) and emits refinement signals (BackPropagation's domain).

---

## Local indexing notes

- **Cited by**:
  - `~/.claude/rules/10-events-jsonl.md` v2.1.0 — 5-dim envelope upstream pattern.
  - `~/.claude/rules/01-ontology-first-core.md` v2.1.0 §ForwardProp/BackwardProp Audit — propagation audit handlers' inspiration.
  - `~/.claude/research/palantir-vision/aipcon-devcon/workflow-lineage.md` (interpretation layer).
- **Companion mirrors**:
  - `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` — refinement signal emitter.
  - `aip/ai-fde-overview-and-modes-skills-2026-03-12.md` — the agent that operates atop Workflow Lineage's substrate.
  - `palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md` — BackPropagation circuit synthesis.
- **Pre-existing fetch overlap**: `aip/aip-aip-observability.md` (2026-04-20 batch) contains a different observability-page snapshot. This file is the **2026-05-06 refresh** that combines the Workflow Lineage parent + AIP observability hub. Pre-existing file remains untouched per artifact layer policy.
- **Refresh trigger**: refetch if (a) Workflow Lineage gains a new sibling tab beyond metrics/run-history/trace-view/logs/log-search, (b) the 7-day default window changes, or (c) source-executor terminology evolves.
- **Note**: source-executor + 7-day window details are summarized from the AIP Observability sub-page citations on the overview page; the exact configuration parameters live in the sub-pages and should be consulted directly when implementing observability integrations.
