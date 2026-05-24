---
name: pm-value-audit
category: delete-candidate
description: "Substrate health dashboard for rule 26 valuable-data. Calls pm_value_grade_metrics MCP and renders T0-T4 distribution + 7-day trend + alarm thresholds (T0 reject rate > 5%, T2+..."
allowed-tools: mcp__palantir-mini__pm_value_grade_metrics
effort: high
disable-model-invocation: false
---

# pm-value-audit — substrate health dashboard

## When to use

- User asks for "substrate health", "value-grade audit", "T0 reject rate", "BackProp readiness".
- After Phase 7 1-time pm-events-rotate execution — verify clean baseline.
- Periodic monitoring (suggest weekly): does T2+ ratio approach 25% target? Are circuit inputs (T3+) accumulating?
- Post-incident: when emit failures spike, run this to identify which event types skew the substrate.

## What this does

Wraps `pm_value_grade_metrics` MCP handler (rule 26 §Grading dashboard). Returns:

| Field | Meaning |
|-------|---------|
| `gradeDistribution` | counts per T0..T4 |
| `t0RejectRate` | T0 / total — should stay near zero post-PreToolUse hook |
| `t2PlusRatio` | (T2+T3+T4) / total — target ≥ 0.25 |
| `t3CircuitInputs` | T3 + T4 count — BackProp pulse |
| `trend` | per-day buckets for last `windowDays` (default 7) |
| `recommendation` | human-readable next-action string |

## Usage

### A. Default 7-day window

```
/palantir-mini:pm-value-audit
```

Internal call:
```json
{ "project": "<absolute path to project root>", "windowDays": 7 }
```

### B. Wider window (30-day trend)

```
/palantir-mini:pm-value-audit 30
```

Internal call:
```json
{ "project": "<...>", "windowDays": 30 }
```

## Output format

```
# Substrate Health Audit — <timestamp>

Total events scanned: <N> (window: <windowStart> → <windowEnd>)

## Distribution
- T0 (rejected at emit): <c0> (<rate0>%)
- T1 (ops trace):        <c1> (<rate1>%)
- T2 (candidate):        <c2> (<rate2>%)
- T3 (circuit input):    <c3> (<rate3>%)
- T4 (promotion):        <c4> (<rate4>%)
- ungraded (legacy):     <c?> (<rate?>%)

## Health metrics
- T0 reject rate: <X>% (alarm > 5%)
- T2+ ratio:      <Y>% (target ≥ 25%)
- T3+ circuit:    <N> events

## Trend (<windowDays> days)
day                T0   T1   T2   T3   T4   total
2026-04-27         X    X    X    X    X    X
2026-04-28         …
...

## Recommendation
<recommendation string from handler>
```

## Alarm thresholds

- **T0 rate > 5%** — substrate noise high. Investigate emit sources missing 5-dim. Check `value-grade-assigner` PreToolUse hook is enabled.
- **T2+ ratio < 15%** — most events lack outcome pairing OR memory layer mapping. Run `/palantir-mini:pm-memory-map`.
- **T2+ ratio 15-25%** — improving but below target. Continue tagging emits.
- **T3+ count = 0** — BackProp circuit has zero input. Refinement substrate not active. Check that `failure_mode_synthesized` events are being emitted by harness-analyzer.

## Authority + cross-refs

- Rule 26 v1.0.0 §Grading + §Substrate routing — `~/.claude/rules/26-valuable-data-standard.md`.
- Plan: `~/.claude/plans/quiet-fluttering-garden.md` Phase 5.1.
- Anchor: Palantir "Connecting Agents to Decisions" (2026-04-29) — decision lineage as the BackProp substrate.
- Handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-value-grade-metrics.ts`.
- Related: `/palantir-mini:pm-memory-map` (4-layer balance), `/palantir-mini:pm-decision-replay` (T3+ replay).

## Memory layer declaration

`procedural` (audit script) + `semantic` (typed substrate health DH).
