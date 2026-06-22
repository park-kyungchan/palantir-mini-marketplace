---
name: pm-replay
category: maintenance
surfaceStatus: public-core
description: "Deterministic BackwardProp replay of events.jsonl filtered by 5-dim Decision Lineage..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__pm_substrate_query
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

Invokes `pm_substrate_query` (mode `lineage`) with a Decision Lineage 5-dim filter:

- `when` — ISO8601 time window
- `atopWhich` — CommitSha substring (git context)
- `throughWhich` — session / tool / cwd
- `byWhom` — identity / agentName / teamName
- `withWhat` — reasoning / hypothesis substring (not yet implemented in v0)

## How to run

### Default (T2+ filter, noise excluded)

```
mcp__palantir-mini__pm_substrate_query({
  mode: "by-grade",
  project: "<path>",
  gradeFilter: "T2+",
  eventTypeFilter: ["edit_committed", "submission_criteria_failed"],
  sinceWhen: "2026-04-10T00:00:00Z"
})
```

Then narrow via `pm_substrate_query` (mode `lineage`) with the matching event ids:

```
mcp__palantir-mini__pm_substrate_query({
  mode: "lineage",
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

Skip the `pm_substrate_query` mode `by-grade` pre-filter; call `pm_substrate_query` mode `lineage` directly. Use sparingly — most useful when investigating a non-conformant emit OR running governance audits where T0 noise itself is the subject.

## Output

A linearized timeline + a lineage graph with impacted objects per event.
See `bridge/handlers/replay-lineage.ts` for the exact shape.

## Success criteria

- All returned events match the filter (deterministic).
- `derivedState` reflects the fold of only the matched events.
- `lineageGraph` has one entry per event with impactedObjects resolved.

## BackProp circuit mode (`--circuit`) — absorbed from pm-decision-replay

For reviewing what decisions DROVE refinements (T3+ circuit inputs only), invoke with `--circuit`:

```
/palantir-mini:pm-replay --circuit
/palantir-mini:pm-replay --circuit since 2026-04-29
```

This defaults `gradeFilter` to `"T3+"` (T3 + T4 only — the BackPropagation circuit), composing the same 2 handlers:

1. `pm_substrate_query({ mode: "by-grade", project, gradeFilter: "T3+", sinceWhen?, eventTypeFilter?, limit })` — narrows the read window to circuit inputs.
2. `pm_substrate_query({ mode: "lineage", project, filter: { eventIds: [...] } })` — deterministic 5-dim reconstruction of the filtered set.

Grade-filter escalation:

- `--circuit` (default) → `gradeFilter: "T3+"`.
- `--circuit --include-noise` → `gradeFilter: "T2+"` (extends to T2 candidates).
- `--circuit --include-all` → `gradeFilter: "all"` (equivalent to the default `pm-replay` behavior above).

Use `--circuit` when:

- Auditing whether the BackProp circuit produces `learning_captured` + `retro_emitted` + `failure_mode_synthesized` at expected cadence.
- Investigating a regression — which T3+ events preceded the failure?

### Circuit output format

```
# Decision Replay (T3+ circuit) — <timestamp>
Window: <sinceWhen ?? "all">   Filter: <gradeFilter>
Matched: <N> events of <totalScanned> scanned
Distribution: T0=<c0>, T1=<c1>, T2=<c2>, T3=<c3>, T4=<c4>

## Decisions (chronological)
### <when> — <event-type> (grade=<T3|T4>, agent=<agentName>)
- atopWhich: <git-sha>  through: <toolName> in <cwd>  byWhom: <identity>/<agentName>
- with: reasoning="<excerpt>" hypothesis="<excerpt>"
- lineageRefs: actionRid=<...> dryRunRef=<...> outcomePairId=<...>
- refinementTarget: kind=<...> filePath=<...> confidence=<...>

## Summary
- Top event types in circuit: <type>: <count>, ...
- Refinement targets touched: <kind>: <count>, ...
```

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — events.jsonl is the BackwardProp substrate; replay operates over it without mutation.
- `~/.claude/rules/01-ontology-first-core.md §BackwardProp Audit` — Workflow Lineage records what executed; pm-replay reconstructs it deterministically.
- `~/.claude/rules/26-valuable-data-standard.md §Grading` — T2+ filter default; T0/T1 excluded as noise unless `--include-noise` is set; `--circuit` defaults to T3+ (BackProp circuit inputs).

## Memory layer declaration

`episodic` (specific past sessions / sprints) + `semantic` (typed event-graph reconstruction).
