---
name: pm-dirty-classify
category: maintenance
description: "Manual triage of working-tree dirt via 4-axis classifier (auto-regen /..."
costClass: free
effort: small
---

# pm-dirty-classify — 4-axis dirt triage skill

## When to use

- Hook `session-start-dirty-classify` surfaced advisory and user wants to inspect.
- Pre-PR-create check (companion to `pre-pr-dirty-gate` hook).
- Manual cleanup before sprint boundaries.
- User says "classify dirty", "what's dirty", "/palantir-mini:pm-dirty-classify".

## NOT for

- Bulk auto-stage of arbitrary files — use `git add` directly.
- File deletion — use `git rm` or `--apply-all` mode with explicit confirmation.

## Modes

| Flag | Behavior | Risk |
|------|----------|------|
| `--dry-run` (default) | Print 4-axis table only | none |
| `--auto-stage` | `git add` auto-regen + runtime-substrate (D-status only) | low — user-WIP/ephemeral preserved |
| `--apply-all` | Auto-stage + .gitignore-extend ephemeral | medium — needs explicit confirmation |

## How to run

### Step 1 — Read git status

```
porcelain = `git status --porcelain` from cwd
```

### Step 2 — Classify via lib

```
result = classifyDirty(porcelain)  // from lib/dirty-classify
```

### Step 3 — Render summary table

```
| Status | Path | Axis | Action | Reason |
|--------|------|------|--------|--------|
| M      | path/to/file.ts | user-WIP | preserve | no pattern match |
| ??     | .claude/scheduled_tasks.lock | runtime-substrate | leave | CronCreate session lock |
...
```

Group by axis with counts.

### Step 4 — If `--auto-stage` flag passed

For each entry where `action == "stage"`:
- Run `git add -- "<path>"`
- Track staged count

For each entry where `axis == "runtime-substrate"` AND `status == "D"`:
- Run `git add -- "<path>"` (stage the deletion)

Print before/after counts.

### Step 5 — If `--apply-all` flag passed

After step 4, also:
- For each `axis == "ephemeral"` entry: print `.gitignore` line suggestion (do NOT auto-edit gitignore).
- For each `axis == "user-WIP"` entry: print as preserved (never staged).
- Require user to confirm before running any `git add` — surface a confirmation prompt.

## Output template

```
# Dirty-classify report

Cwd: <cwd>
Total dirty: <N>

## Axis breakdown
- auto-regen:        <count> (action: stage)
- runtime-substrate: <count> (action: leave or stage-delete)
- user-WIP:          <count> (action: preserve)
- ephemeral:         <count> (action: gitignore)

## Entries
<table>

## Recommendations
- <one-line per recommendation, e.g. "Add .gitignore pattern: .claude/projects/-home-palantirkc-projects-hyperframes/*.jsonl">
```

## Authority + cross-refs

- Rule 25 v1.1.0+ §Wave-split policy + §Auto-regen file ownership.
- Lib: `~/.claude/plugins/palantir-mini/lib/dirty-classify/index.ts`
- Sibling hooks: `session-start-dirty-classify`, `pre-pr-dirty-gate`, `session-end-cleanup`.
