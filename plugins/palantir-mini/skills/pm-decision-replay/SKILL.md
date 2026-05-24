---
name: pm-decision-replay
category: maintenance
description: "BackProp circuit replay — folds T3+ events only (T2+ optional via flag) for noise-free decision lineage replay. Composes pm_event_query_by_grade(gradeFilter=\"T3+\") +..."
allowed-tools: mcp__palantir-mini__pm_event_query_by_grade mcp__palantir-mini__replay_lineage
effort: low
disable-model-invocation: false
---

# pm-decision-replay — BackPropagation circuit replay

## When to use

- Reviewing what decisions DROVE refinements over the last sprint / month / quarter.
- Auditing whether the BackProp circuit (T3+ inputs) is producing learning_captured + retro_emitted + failure_mode_synthesized at expected cadence.
- Investigating a regression: which T3+ events preceded the failure?
- Distinguishes from `/palantir-mini:pm-replay` — that one shows ALL events with optional 5-dim filter; this one defaults to T3+ noise-free.

## What this does

Composes 2 MCP handlers:

1. `pm_event_query_by_grade({ project, gradeFilter: "T3+", sinceWhen?, eventTypeFilter?, limit })` — narrows the events.jsonl read window to circuit inputs.
2. `replay_lineage({ project, filter: { ... } })` — deterministic 5-dim reconstruction of the filtered set.

Default filter: T3+ ONLY (T3 + T4). Flag `--include-noise` extends to T2+ (T2 + T3 + T4); flag `--include-all` extends to all grades (equivalent to `pm-replay`).

## Usage

### A. Default — T3+ only (BackProp circuit)

```
/palantir-mini:pm-decision-replay
```

Internal calls:
```json
// Step 1
{ "project": "<...>", "gradeFilter": "T3+", "limit": 1000 }
// Step 2 (with results from step 1's events.eventId list)
{ "project": "<...>", "filter": { "eventIds": [...] } }
```

### B. Include T2 candidates

```
/palantir-mini:pm-decision-replay --include-noise
```

`gradeFilter` becomes `"T2+"`.

### C. Include all (equivalent to pm-replay)

```
/palantir-mini:pm-decision-replay --include-all
```

`gradeFilter` becomes `"all"`. (Only use this when the noise-aware default would miss something; otherwise prefer `pm-replay`.)

### D. Time-bounded

```
/palantir-mini:pm-decision-replay since 2026-04-29
```

`sinceWhen` set to the ISO date.

## Output format

```
# Decision Replay (T3+ circuit) — <timestamp>

Window: <sinceWhen ?? "all">
Filter: <gradeFilter>
Matched: <N> events of <totalScanned> scanned
Distribution: T0=<c0>, T1=<c1>, T2=<c2>, T3=<c3>, T4=<c4>

## Decisions (chronological)

### <when> — <event-type> (grade=<T3|T4>, agent=<agentName>)
- atopWhich: <git-sha>
- through: <toolName> in <cwd>
- byWhom: <identity>/<agentName>
- with: reasoning="<excerpt>" hypothesis="<excerpt>"
- lineageRefs: actionRid=<...> dryRunRef=<...> outcomePairId=<...>
- refinementTarget: kind=<...> filePath=<...> confidence=<...>

[next event ...]

## Decision lineage graph

[5-dim reconstruction tree from replay_lineage]

## Summary

- Top event types in circuit: <type>: <count>, ...
- Refinement targets touched: <kind>: <count>, ...
```

## Authority + cross-refs

- Rule 26 v1.0.0 §Grading T3 ("BackPropagation circuit input") + §Substrate routing.
- Rule 10 v2.1.0 — 5-dim envelope authority.
- Plan: `~/.claude/plans/quiet-fluttering-garden.md` Phase 5.2.
- Handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-event-query-by-grade.ts` + `replay-lineage.ts`.
- Related: `/palantir-mini:pm-replay` (full 5-dim filter, no grade filter), `/palantir-mini:pm-recap` (narrative fold), `/palantir-mini:pm-value-audit` (substrate health).

## Memory layer declaration

`episodic` (specific past decisions) + `semantic` (typed refinement targets).
