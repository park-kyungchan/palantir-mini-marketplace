---
name: pm-trace
category: substrate-query
description: "Render a single OntologyWorkflowTrace's lifecycle from its persisted snapshot + events.jsonl events filtered by traceId."
allowed-tools: mcp__palantir-mini__replay_lineage mcp__palantir-mini__pm_workflow_lineage_query
effort: low
disable-model-invocation: false
---

# pm-trace — Single workflow-trace lifecycle renderer

## When to use

- User says `trace <id>`, `show trace lifecycle`, or invokes `/palantir-mini:pm-trace <traceId>`.
- After `pm-recap` surfaces an open trace and user wants lifecycle details.
- Debugging a stuck or leaked trace (e.g. `lastEvent=transitioned` older than 1 hour).

## What this does

1. Reads `<project>/.palantir-mini/session/workflow-traces/<traceId>.json` for the persisted snapshot (mode, lastEvent, outcome, updatedAt).
2. Calls `replay_lineage` with `traceId` filter to fetch ordered event chain (workflow_trace_opened → workflow_trace_transitioned → workflow_trace_closed).
3. Renders compact markdown table: timestamp / event-kind / mode / refs-summary / outcome.

## How to run

The user passes `<traceId>` as the skill argument. The model:

1. Resolves the project root (cwd or recent session).
2. Reads the snapshot file at `.palantir-mini/session/workflow-traces/<safe-traceId>.json`.
3. Calls `mcp__palantir-mini__replay_lineage({ project, traceId: "<id>" })`.
4. Renders one row per event in the lifecycle table.

```
mcp__palantir-mini__replay_lineage({
  project: "<path>",
  traceId: "<traceId>"
})
```

## Example output

```
# Workflow Trace: ontology-workflow-trace:context-only-...

Snapshot: mode=semantic-gate lastEvent=transitioned updatedAt=2026-05-13T10:02Z

| When | Event | From → To | Refs added | Outcome |
|------|-------|-----------|-----------|---------|
| 2026-05-13T10:00 | workflow_trace_opened | — → context-only | UOE: entry-x | — |
| 2026-05-13T10:02 | workflow_trace_transitioned | context-only → semantic-gate | SIC: sic-y | — |
```

For a closed trace:

| When | Event | From → To | Refs added | Outcome |
|------|-------|-----------|-----------|---------|
| 2026-05-13T10:00 | workflow_trace_opened | — → context-only | UOE: entry-x | — |
| 2026-05-13T10:02 | workflow_trace_transitioned | context-only → router | SIC: sic-y | — |
| 2026-05-13T10:05 | workflow_trace_closed | — implementation | — | passed |

## Rule citations

- `rule 01 §ForwardProp` — trace lifecycle follows the authority chain (context-only → semantic-gate → router → pre-mutation → implementation → closed).
- `rule 10 §5-dim` — every lifecycle event in events.jsonl carries the full 5-dim envelope with `payload.traceId`.
- `rule 26 §Substrate routing` — T3+ events from this trace feed the BackPropagation circuit.

## Memory layer declaration

`episodic` (single-trace replay is fundamentally an episodic-recall surface) + `semantic` (OntologyWorkflowTrace is a first-class semantic primitive post-PR-10).
