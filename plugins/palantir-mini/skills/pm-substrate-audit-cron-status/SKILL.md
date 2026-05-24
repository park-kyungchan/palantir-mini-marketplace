---
name: pm-substrate-audit-cron-status
category: delete-candidate
description: "Read-only CronList wrapper filtered to weekly-substrate-audit registrations. Surfaces registered jobs + last-fire timestamps + days-until-expiry + recommendation (re-register..."
costClass: free
effort: small
---

# pm-substrate-audit-cron-status — §G periodic audit status readout

## When to use

- Mid-sprint health check on cron registrations.
- Verify §G PASS evidence (sprint-055 W1.D).
- Diagnose missing weekly audit doc → may indicate cron expired without re-registration.

## NOT for

- Registering a new cron — use `/palantir-mini:pm-substrate-audit-cron-register`.
- Cancelling — use `CronDelete` directly with the job ID.

## How to run

### Step 1 — Load Cron schemas

```
ToolSearch({ query: "select:CronList,CronDelete", max_results: 2 })
```

### Step 2 — List + filter

```
CronList({})
```

Filter results: keep entries whose `prompt` field contains the literal `"weekly-substrate-audit"`.

### Step 3 — Compute per-entry status

For each filtered entry:
- `cron_expression` (e.g. `"7 9 * * 1"`)
- `next_fire_at` (compute from cron expression + now)
- `last_fire_at` (from CronList output if available)
- `days_until_expiry` = 7 - (now - createdAt) in days
- `recommendation`:
  - `"healthy"` if days_until_expiry > 2
  - `"renew-soon"` if 0 < days_until_expiry ≤ 2
  - `"expired"` if days_until_expiry ≤ 0 (cron auto-deleted; re-register)

### Step 4 — Surface table

```
Weekly substrate audit cron registrations:

| Job ID | Cron | Next Fire | Last Fire | Expires In | Status |
|--------|------|-----------|-----------|------------|--------|
| <id1>  | 7 9 * * 1 | <ISO> | <ISO> | 5d | healthy |
| <id2>  | 7 9 * * 1 | -     | -     | -  | expired (re-register) |

Recommended action: <one-line>
```

If list is empty: `"No weekly substrate audit cron registered. Run /palantir-mini:pm-substrate-audit-cron-register to set up."`.

## Authority + cross-refs

- Companion skill: `pm-substrate-audit-cron-register` (sibling).
- Audit doc landing zone: `~/.claude/plans/YYYY-MM-DD-weekly-substrate-audit.md` (created by the cron-fired prompt).
- Rule 26 §Substrate routing — `~/.claude/rules/26-valuable-data-standard.md`.
