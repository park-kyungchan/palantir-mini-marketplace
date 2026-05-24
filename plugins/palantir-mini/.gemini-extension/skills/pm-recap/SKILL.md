---
name: pm-recap
category: maintenance
description: "Produce a /recap-compatible summary (Claude Code v2.1.114+ Native Runtime, plugin v4.1.0+) from the project's events.jsonl — cold-start state surfacing. Reads the last N events..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__replay_lineage mcp__palantir-mini__pm_event_query_by_grade mcp__palantir-mini__pm_memory_layer_audit
effort: low
disable-model-invocation: false
---

# pm-recap — Cold-start state surfacing via event log

## When to use

- Session start / resume — what happened last time?
- User says "recap", "catch me up", "status", or invokes `/recap`.
- After a PreCompact hook fires and context has been compacted.

## What this does

1. Reads the last K events from `<project>/.palantir-mini/session/events.jsonl`.
2. Folds them via `foldToSnapshot()` into an `EventSnapshot`.
3. Groups events by type and produces a compact markdown brief.
4. Includes the 5 most recent `edit_committed` events with Decision Lineage.
5. **valueGrade weighting (v4.1.0+, rule 26)** — narrative emphasis follows T3 > T2 > T1; T0 events excluded from default fold (use `--include-noise` to override). Section "Memory layer summary" surfaces `pm_memory_layer_audit` snapshot.

## How to run

```
mcp__palantir-mini__replay_lineage({
  project: "<path>",
  filter: { limit: 20 }
})
```

Then format:

```
# Recap — <project>

## Snapshot
- total events: N
- lastSequence: M
- edit_committed: K
- drift_detected: J

## Recent activity (last 5 commits)
- [seq=X] 2026-04-15T10:22Z — <actionTypeRid> by <agent>
  - applied: N edits
  - criteria passed: [...]

## Drift signals (if any)
- [seq=Y] <driftType> on <affectedObjectType>
```

## §Active Workflow Traces (PR-10)

pm-recap scans `<project>/.palantir-mini/session/workflow-traces/*.json` and reports:

- **open count**: snapshots where `lastEvent` is `"opened"` or `"transitioned"` (trace still in flight)
- **closed-this-session count**: snapshots where `lastEvent` is `"closed"` and `updatedAt` falls within the current session window (approx. last 2 hours)

Data source: `workflow-traces/*.json` files written by `lib/ontology-workflow/emit.ts`.
Use `/palantir-mini:pm-trace <traceId>` for per-trace lifecycle rendering.

Example recap section:
```
## Active Workflow Traces
- open: 1 (ontology-workflow-trace:context-only-... mode=semantic-gate)
- closed this session: 3
```

## Success criteria

- Snapshot numbers match `bunx tsc` / raw file counts.
- Last 5 `edit_committed` events are the actual last 5, not randomly sampled.
- Output fits in a single Claude message (no truncation).

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — events.jsonl is append-only; pm-recap folds events into a snapshot but never rewrites the log.
- `~/.claude/rules/02-research-retrieval.md §Memory` — pm-recap output is a cold-start surface; it does not replace MEMORY.md, which is the cross-conversation memory index.
- `~/.claude/rules/26-valuable-data-standard.md §Grading` — fold weighting (T3 > T2 > T1; T0 excluded). Use `pm_event_query_by_grade(gradeFilter="T2+")` to pre-filter the read window.

## Memory layer declaration

`working` (current-task scratchpad) + `episodic` (recap is fundamentally an episodic-memory surface).
