---
name: pm-research-diff
category: research
surfaceStatus: public-core
description: "Show what changed between the current local research library and its upstream..."
allowed-tools: mcp__palantir-mini__research_library_diff mcp__palantir-mini__emit_event
effort: low
disable-model-invocation: false
---

# pm-research-diff — Show drift between local library and upstream sources

## When to use

- User asks "what changed in the library", "is the research stale", or invokes `/palantir-mini:research-diff`.
- Before deciding whether to run `pm-research-refresh` — diff first, then decide.
- After an upstream release to assess impact before committing to a full refresh.

## What this does

Invokes `mcp__palantir-mini__research_library_diff` which:
1. Reads the declared source URL(s) for each library entry.
2. Fetches current upstream content (read-only; does NOT write locally).
3. Produces a structured diff: sections added, removed, or modified.
4. Reports `fetchedAt` age and byte delta per entry.
5. Emits a `research_diff_completed` event with entry count and drift summary.

## How to run

```
mcp__palantir-mini__research_library_diff({
  entries: ["<entry-key>"]         // omit to diff all tracked entries
})
```

Example — diff a specific subtree:

```
mcp__palantir-mini__research_library_diff({
  entries: ["palantir-foundry/action-type-sdk"]
})
```

## Output format

```
# research-diff — <entry-key>
fetchedAt: 2026-04-10T08:00Z  (10 days ago)
upstream bytes: 12,400  local bytes: 11,800  delta: +600

## Added sections (N)
- §3.2 New parameter: actionTypeRid

## Removed sections (M)
- §1.4 Deprecated: legacyMode flag

## Modified sections (K)
- §2.1 Example updated (diff: +3/-1 lines)
```

## Success criteria

- Output is read-only — no local file was modified.
- All tracked entries are reported (or filtered set if `entries` specified).
- `research_diff_completed` event in `events.jsonl` with drift entry count.

## Rule citations

- `~/.claude/rules/02-research-retrieval.md` — exact retrieval over broad scanning; diff helps choose the minimal refresh set.
- `~/.claude/rules/10-events-jsonl.md` — diff emits append-only events; does not mutate the log or library files.
- `~/.claude/rules/05-skill-invocation-order.md` — plugin-scope wins over user-scope.
