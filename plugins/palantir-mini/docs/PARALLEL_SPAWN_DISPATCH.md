# Parallel-Spawn Dispatch Pattern

> **ALWAYS pass `isolation: "worktree"` to Agent calls in this dispatch pattern.**
> The session that codified this rule (sprint-135 2026-05-13) observed live corruption from shared-worktree races among 4 concurrent subagents: each subagent's `git checkout -b NEW_BRANCH` switches the SHARED working tree, so the second subagent's branch carries the first subagent's uncommitted edits → silently committed to the wrong branch.
>
> Rule reference: `~/.claude/rules/12-lead-protocol-v2.md §Parallel-spawn dispatch (v3.19.0)`.

## Overview

When Lead has ≥2 dependency-independent PRs, it may spawn them concurrently via `Agent(..., run_in_background: true)` to compress wall-clock time. This document explains the eligibility check, slot pre-reservation, CHANGELOG conflict resolution, and plan-mode DAG authoring requirements.

## Eligibility check

Before spawning in parallel, ALL of these must hold:

1. **Disjoint primary writable surfaces** — no file overlap between PRs (excluding CHANGELOG / package.json / manifests, coordinated via slot pre-reservation).
2. **No ordering dependency** — PR-A's output not consumed by PR-B in the same batch.
3. **LOW or MEDIUM risk** — HIGH-risk PRs must stay sequential (rule 12 v3.16.0 split-spawn).
4. **Worktree isolation REQUIRED** — `isolation: "worktree"` must be passable in Agent args.

## Version-slot pre-reservation

Before spawning, Lead assigns a distinct semver slot to each parallel PR:

```
Pre-assigned plugin version: 6.43.0. Use ONLY this version; do NOT compute next-available.
```

Each subagent manually sets:
- `package.json` → `"version": "6.43.0"`
- `.claude-plugin/plugin.json` → `"version": "6.43.0"`
- `.claude-plugin/marketplace.json` → all 3 occurrences of `"version": "6.43.0"`
- `CHANGELOG.md` → new `## v6.43.0 — YYYY-MM-DD` entry at top

## CHANGELOG conflict resolution recipe

When `gh pr merge` returns a conflict:

```bash
git fetch origin main
git merge origin/main --no-edit
# Resolve CHANGELOG.md manually: keep BOTH entries, newest-on-top
# Example: 6.46 entry above 6.45 above 6.44 above 6.43 above 6.42
git add CHANGELOG.md
git push
gh pr merge --merge --delete-branch
```

Order: newest version number at the top. Stop after 1 retry; if conflict persists, flag Lead.

## Worktree isolation briefing clause

Every parallel-spawn briefing MUST include this exact clause:

```
You are running with worktree isolation (isolation: "worktree"). Your `git checkout -b BRANCH_NAME` happens in YOUR own copy of the repo. Do NOT assume the main repo cwd matches your worktree state. Never touch files outside your assigned scope paths.
```

## Sample briefing snippet

```
## Sprint-135-PR-4.5 — Implement XYZ

Pre-assigned plugin version: 6.43.0. Use ONLY this version; do NOT compute next-available.

You are running with worktree isolation (isolation: "worktree"). Your git checkout -b creates a branch in YOUR own copy of the repo. Do not assume the main repo cwd matches your worktree state.

On CHANGELOG conflict: git fetch origin main && git merge origin/main --no-edit, then keep BOTH version entries with newest-on-top in CHANGELOG.md, git push, retry merge once.

Scope: <scope_path>
Branch: sprint-135-pr-4-5-xyz-2026-05-13
```

## Parallel dispatch limits

- **Soft cap**: 4 concurrent background Agent spawns.
- **Hard cap**: 8 concurrent (process / context budget concern).

## Plan-mode authoring template

When you author a multi-PR plan under `<project>/.palantir-mini/plan/` (canonical plugin-layer root; legacy `~/.claude/plans/` remains read-compatible), include a `## Task DAG` section with this table for every cluster of tasks:

| id | runsAfter | parallelEligibleWith | ownerAgent | preReservedVersionSlot | worktreeIsolationRequired | riskTier |
|----|-----------|----------------------|------------|------------------------|---------------------------|----------|
| pr-4.5 | [pr-4.1a] | [pr-4.6, pr-6.7] | palantir-mini:plugin-maintainer | 6.43.0 | true | low |
| pr-4.6 | [pr-4.1a] | [pr-4.5, pr-6.7] | palantir-mini:hook-builder | 6.44.0 | true | low |
| pr-6.7 | [pr-4.1a] | [pr-4.5, pr-4.6] | palantir-mini:protocol-designer | 6.45.0 | true | low |
| pr-4.1a | [] | [] | palantir-mini:protocol-designer | 6.42.0 | false | medium |

**Reading**: pr-4.5, pr-4.6, pr-6.7 all wait for pr-4.1a to merge, then run in parallel; each pre-reserves a plugin version slot and runs with worktree isolation. pr-4.1a is sequential (no parallel peers).

### Field reference

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Unique task/PR identifier referenced in `runsAfter` |
| `runsAfter` | yes | IDs that must merge BEFORE this starts. Empty `[]` = no prerequisite. |
| `parallelEligibleWith` | yes | IDs that may run concurrently. Empty `[]` = strictly sequential. |
| `ownerAgent` | yes | Canonical palantir-mini agent that owns the task. Use plugin-owned agent names such as `palantir-mini:hook-builder`, `palantir-mini:plugin-maintainer`, or `palantir-mini:protocol-designer`. |
| `preReservedVersionSlot` | when version-bumping | Omit for docs/config-only PRs that don't bump plugin/schema version. |
| `worktreeIsolationRequired` | yes | `true` when in any `parallelEligibleWith` group; `false` for strictly sequential only. |
| `riskTier` | yes | `"high"` → cannot be in `parallelEligibleWith` group; stays sequential. |

The `plan-task-dag-validate` advisory hook emits `plan_missing_dag_annotation` when a plan file with a `## DAG` or `## Task DAG` heading is missing these required fields.

### Dispatch loop pseudo-code

Once a plan carries DAG annotations, Lead's execution loop becomes mechanical:

```
for batch in topologically-grouped-parallel-batches(planTasks):
  if batch.size == 1:
    sequential-spawn(batch[0], isolation=batch[0].worktreeIsolationRequired)
  else:
    parallel-spawn-with-worktree-isolation(
      batch,
      versionSlots = { task.id: task.preReservedVersionSlot for task in batch }
    )
```

## When to choose parallel vs sequential

| Scenario | Pattern |
|----------|---------|
| ≥3 independent PRs + each < 15-min impl | Parallel, pre-reserve slots |
| 2 independent PRs | Parallel if wall-clock matters; sequential otherwise |
| 1 PR | Sequential (Lead-direct or single sonnet spawn) |
| Any HIGH-risk PR | Sequential (rule 12 v3.16.0 split-spawn) |
| Worktree isolation unavailable | Sequential |

## Cross-references

- Rule 12 v3.19.0 §Parallel-spawn dispatch (canonical rule)
- Rule 12 v3.16.0 §Commit-PR delegation default (HIGH-risk single PR split-spawn)
- Rule 16 v4.1.0 §Roles (worktree isolation for generator-tier agents)
- Rule 20 §Mode ladder (orchestration mode selection)
- Rule 24 §Dispatch flowchart (Brain-of-Swarms canonical routing)
- Rule 25 §Default-On Policy (3-gate auto-merge after parallel-spawn merges)
