---
name: pm-substrate-audit-cron-register
category: delete-candidate
surfaceStatus: deprecated-candidate
description: "One-time wrapper that registers a durable weekly substrate audit cron via CronCreate."
costClass: free
effort: small
---

# pm-substrate-audit-cron-register — §G periodic substrate audit registration

## When to use

- One-time bootstrap of weekly substrate health monitoring (sprint-055 W1.D §G GAP closure).
- After 7-day auto-expiry of the prior cron — re-register.
- User says "register weekly substrate audit", "set up cron audit", `/palantir-mini:pm-substrate-audit-cron-register`.

## NOT for

- Manual one-off audit — call `pm_outcome_pair_audit` / `pm_value_grade_metrics` / `pm_plugin_self_check` directly.
- Status/list of registered audits — use `/palantir-mini:pm-substrate-audit-cron-status`.

## Prerequisites

- Plugin v4.9.0+ (handler registration includes `outcome_pair_close`).
- CronCreate / CronList / CronDelete schemas available (load via ToolSearch).
- Legacy template evidence at `~/.claude/plans/2026-05-08-weekly-substrate-audit-template.md`.
- New weekly audit outputs write to `<project>/.palantir-mini/plan/`.

## How to run

### Step 1 — Load Cron schemas

```
ToolSearch({ query: "select:CronCreate,CronList,CronDelete", max_results: 3 })
```

### Step 2 — Read prompt template

Read the legacy template at `~/.claude/plans/2026-05-08-weekly-substrate-audit-template.md` as provenance, then update the prompt so the generated weekly audit document writes to `<project>/.palantir-mini/plan/YYYY-MM-DD-weekly-substrate-audit.md`.

### Step 3 — Check existing registration via CronList

If a prior registration exists (CronList returns a job whose prompt contains "weekly-substrate-audit"), surface its ID + last-fire timestamp + skip re-register UNLESS user passed `--force`.

### Step 4 — Register new cron

```
CronCreate({
  cron:      "7 9 * * 1",                            // Mondays 09:07 local (off-:00 per CronCreate guidance)
  prompt:    <verbatim body from Step 2>,
  recurring: true,
  durable:   true                                     // persists across Claude restart via .claude/scheduled_tasks.json
})
```

### Step 5 — Emit registration event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type:    "phase_completed",
  payload: {
    phaseTag:    "weekly-substrate-audit-registered",
    cronJobId:   <id from Step 4>,
    schedule:    "Mondays 09:07 local",
    durable:     true,
    expiresInDays: 7,
    skill:       "pm-substrate-audit-cron-register"
  }
})
```

### Step 6 — Surface registration confirmation

```
✓ Weekly substrate audit cron registered (job id <ID>).
  Schedule: Mondays 09:07 local
  Durable: true (.claude/scheduled_tasks.json)
  Auto-expires: 7 days (re-run /palantir-mini:pm-substrate-audit-cron-register to renew)
  Status: /palantir-mini:pm-substrate-audit-cron-status
```

## Authority + cross-refs

- Plan §0.3 R-1 — `~/.claude/plans/2026-05-08-sprint-055-cold-start.md`.
- Cron prompt template provenance — `~/.claude/plans/2026-05-08-weekly-substrate-audit-template.md`.
- CronCreate primitive — Claude Code v2.1.85+ scheduling DSL (features.md:345).
- Rule 26 §Substrate routing — `~/.claude/rules/26-valuable-data-standard.md`.
