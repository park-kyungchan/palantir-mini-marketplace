---
name: pm-events-rotate
category: delete-candidate
description: "Rotate a project's events.jsonl when it crosses size or line-count thresholds. Renames the breached log to <sessionDir>/archive/events-rotated-<ISO>.jsonl (atomic) and lets the..."
allowed-tools: mcp__palantir-mini__events_log_rotate
effort: medium
disable-model-invocation: false
---

# pm-events-rotate — events.jsonl rotation

## When to use

- `events.jsonl` exceeds 10 MB or 10K lines (default thresholds).
- Long-running session needs to bound disk usage without violating rule 10.
- Pre-rotate before a heavy ingest so concurrent writers don't trip the threshold mid-write.
- User explicitly says "rotate events" / "archive log" / "split events".

## What this does

1. Stats `<project>/.palantir-mini/session/events.jsonl`.
2. If under both thresholds → no-op, returns `{ rotated: false }`.
3. Else acquires the same `events.jsonl.lock` that `appendEventAtomic` uses (concurrent writers wait).
4. Renames `events.jsonl` → `<sessionDir>/archive/events-rotated-<ISO>.jsonl` (atomic POSIX rename).
5. Releases lock. Next `emit()` creates a fresh `events.jsonl` lazily.
6. Emits an `event_log_rotated` event (5-dim) into the fresh log as the first row — bridges BackwardProp continuity across the rotation boundary.

## How to run

```
mcp__palantir-mini__events_log_rotate({
  project: "<absolute-path-to-project-root>",
  // optional threshold overrides:
  // thresholdBytes: 5_000_000,    // 5 MB
  // thresholdLines: 5_000,        // 5K lines
})
```

Result shape:
```typescript
{
  rotated:        boolean;
  archivedPath?:  string;   // present only when rotated=true
  sizeBytes:      number;
  lineCount:      number;
  thresholdBytes: number;
  thresholdLines: number;
}
```

## Reader transparency

`lib/event-log/read.ts:readEvents` auto-discovers `<sessionDir>/archive/events-rotated-*.jsonl` files and merges them with the live log, sorted by `sequence` ASC. Consumers stay unchanged:

- `mcp__palantir-mini__replay_lineage` — full lineage including archive
- `mcp__palantir-mini__pm_retro_query` — session windows span archive boundaries
- `/palantir-mini:pm-recap` — fold across archive + live

## Recovery

If rotation produces an unexpected state:
- Live `events.jsonl` missing? — next `emit()` creates it. No data loss; archive holds the breach.
- Archive file looks corrupted? — readers skip malformed lines; regen via `mcp__palantir-mini__audit_events_5d_conformance` for the archive path.
- Lock leftover? — `events.jsonl.lock` is just an empty dir; `rmdir` it to recover. The lock pattern is fail-safe.

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — append-only invariant; rotation = atomic rename, NOT rewrite/truncate. `readEvents` archive merge is documented under §Canonical scope (v3.2.0 W9).
- `~/.claude/rules/07-plugins-and-mcp.md` — handler ownership (hook-builder scope per file-ownership table).

## Background

Pre-v3.2.0 the plugin had no rotation mechanism, despite rule 10 forbidding truncate/rewrite/re-emit. Long sessions accumulated unbounded events.jsonl growth. v3.2.0 G3 closes this gap with a rule-10-compatible path: atomic rename to archive/ + transparent reader merge. See v3.1.0 handoff §7.2 G3 + the v3.2.0 plan `~/.claude/plans/humble-hatching-blanket.md`.
