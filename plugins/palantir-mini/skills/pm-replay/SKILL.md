---
name: pm-replay
category: maintenance
description: "Deterministic BackwardProp replay of events.jsonl filtered by 5-dim Decision Lineage..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__replay_lineage mcp__palantir-mini__pm_event_query_by_grade
effort: low
disable-model-invocation: false
---

# pm-replay — Decision Lineage replay (BackwardProp)

## When to use

- Investigating why an ontology change happened.
- Tracing a drift back to its originating edit.
- Producing an audit trail for a governance review.
- Prefer this over pm-recap when the user wants HISTORY, not CURRENT STATE.

## What this does

Invokes `replay_lineage` MCP tool with a Decision Lineage 5-dim filter:

- `when` — ISO8601 time window
- `atopWhich` — CommitSha substring (git context)
- `throughWhich` — session / tool / cwd
- `byWhom` — identity / agentName / teamName
- `withWhat` — reasoning / hypothesis substring (not yet implemented in v0)

## How to run

### Default (T2+ filter, noise excluded)

```
mcp__palantir-mini__pm_event_query_by_grade({
  project: "<path>",
  gradeFilter: "T2+",
  eventTypeFilter: ["edit_committed", "submission_criteria_failed"],
  sinceWhen: "2026-04-10T00:00:00Z"
})
```

Then narrow via `replay_lineage` with the matching event ids:

```
mcp__palantir-mini__replay_lineage({
  project: "<path>",
  filter: {
    fromSequence: 1,
    eventTypes: ["edit_committed", "submission_criteria_failed"],
    byWhom: { identity: "<active-runtime-identity>" },
    whenFrom: "2026-04-10T00:00:00Z",
    whenTo:   "2026-04-15T23:59:59Z",
    limit: 50
  }
})
```

### `--include-noise` (full replay, T0+T1 included)

Skip the `pm_event_query_by_grade` pre-filter; call `replay_lineage` directly. Use sparingly — most useful when investigating a non-conformant emit OR running governance audits where T0 noise itself is the subject.

## Output

A linearized timeline + a lineage graph with impacted objects per event.
See `bridge/handlers/replay-lineage.ts` for the exact shape.

## Success criteria

- All returned events match the filter (deterministic).
- `derivedState` reflects the fold of only the matched events.
- `lineageGraph` has one entry per event with impactedObjects resolved.

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — events.jsonl is the BackwardProp substrate; replay operates over it without mutation.
- `~/.claude/rules/01-ontology-first-core.md §BackwardProp Audit` — Workflow Lineage records what executed; pm-replay reconstructs it deterministically.
- `~/.claude/rules/26-valuable-data-standard.md §Grading` — T2+ filter default; T0/T1 excluded as noise unless `--include-noise` is set.

## Memory layer declaration

`episodic` (specific past sessions / sprints) + `semantic` (typed event-graph reconstruction).
