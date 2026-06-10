---
name: pm-value-audit
category: maintenance
surfaceStatus: public-core
description: "Substrate health dashboard (rule 26 valuable-data) + AIP no-slop Three Questions audit (Q1 Trust / Q2 Scope / Q3 Refine)."
allowed-tools: mcp__palantir-mini__pm_value_grade_metrics mcp__palantir-mini__replay_lineage mcp__palantir-mini__pm_outcome_pair_audit mcp__palantir-mini__pm_event_query_by_grade mcp__palantir-mini__emit_event Read Bash
effort: high
disable-model-invocation: false
---

# pm-value-audit — substrate health dashboard

## When to use

- User asks for "substrate health", "value-grade audit", "T0 reject rate", "BackProp readiness".
- After a 1-time `events_log_rotate` execution — verify clean baseline.
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

---

## Three Questions audit (`--three-questions`) — absorbed from pm-three-questions

Run the AIP "no-slop zone" Three Questions audit (Q1 Trust / Q2 Scope / Q3 Refine) over a sprint or session. Invoke with `--three-questions <sprint-id>` (or `--three-questions all-this-session`).

Anchored to AIP "no-slop zone" + DC5-02 3 conditions for human-agent leverage (`research/palantir-vision/aipcon-devcon/devcon.md §DC5-02`). Each Q produces a binary verdict + evidence list.

### Q1 — Trust

> Did the rubric verdict line up with independent verification?

**Pass criteria**:
- `grading_completed.payload.passedCriteria == grading_completed.payload.maxPossibleScore` (no failed criteria).
- Hard threshold met per `sprint_contract_bound.payload.hardThreshold.perCriterion`.
- Generator self-assessment did NOT diverge from the Evaluator verdict (when `selfAssessmentPath` present).

**Evidence sources**: `grading_completed` events for the sprint + `feedback-NNN.md` divergence checks.

### Q2 — Scope

> Did artifacts produced match the contract's `inputs[].featureId` scope?

**Pass criteria**:
- Every `edit_committed.payload.appliedEdits[]` traces back to a `sprint_contract_bound.contractId` via `lineageRefs.actionRid`.
- `artifactPath` in `grading_completed.payload` lies under the scope path declared in `inputs[].description`.
- No out-of-scope edits in the sprint window (between `sprint_contract_bound` and `sprint_completed`).

**Evidence sources**: `edit_committed` events filtered by sprint contract action RID + scope path glob match.

### Q3 — Refine

> Did the sprint output produce typed refinement signals for BackPropagation?

**Pass criteria**:
- `sprint_completed.withWhat.refinementTarget` present and non-null (rule 26 §C2).
- valueGrade ≥ T3 on the sprint terminal envelope (rule 26 §Grading).
- At least one `outcome_pair_closed` event in the sprint window (rule 26 §Axis B1).

**Evidence sources**: `sprint_completed` envelope inspection + `pm_outcome_pair_audit` for the sprint window.

### How to run

Parallel MCP calls (project defaults to the active project root):

```
mcp__palantir-mini__pm_value_grade_metrics({ project, windowDays: 1 })
mcp__palantir-mini__replay_lineage({ project, atopWhich: "<commit-sha>", filter: { byContract: "<sprint-id>" } })
mcp__palantir-mini__pm_outcome_pair_audit({ project, orphanThresholdMs: 1800000 })
mcp__palantir-mini__pm_event_query_by_grade({ project, gradeFilter: "T3+", windowDays: 1 })
```

Compute a per-Q verdict object, then `overall`: `3/3 = no-slop`, `2/3 = warn`, `≤1/3 = slop`.

### Three-Questions output

```markdown
# Three Questions audit — <sprint-id>

| Q | Verdict | Evidence |
|---|---------|----------|
| Q1 Trust  | ✓/✗ | <count> events; <one-line summary> |
| Q2 Scope  | ✓/✗ | <count> in-scope edits; <count> out-of-scope |
| Q3 Refine | ✓/✗ | T<N> grade; refinementTarget=<kind>; pairs closed=<n> |

**Overall**: no-slop / warn / slop
```

Recommendations on failure: Q1 → re-grade (rubric/threshold drift); Q2 → audit out-of-scope edits + tighten contract scope; Q3 → require refinementTarget on next sprint contract + emit hypothesis on the terminal envelope.

### Emit completion event

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "three-questions-audit", taskId: "<sprint-id>", validations: ["Q1-Trust", "Q2-Scope", "Q3-Refine"] },
  withWhat: { reasoning: "AIP no-slop Three Questions audit; verdict=<no-slop|warn|slop>", memoryLayers: ["semantic", "procedural", "episodic"] }
})
```

---

## Authority + cross-refs

- Rule 26 v1.0.0 §Grading + §Substrate routing — `~/.claude/rules/26-valuable-data-standard.md`.
- AIP "no-slop zone" framing — `~/.claude/research/palantir-vision/aipcon-devcon/devcon.md` §DC5-02 (3 conditions for human-agent leverage).
- AIP Evals taxonomy — `~/.claude/research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`.
- Plan: `~/.claude/plans/quiet-fluttering-garden.md` Phase 5.1; Three-Questions plan §3.W2.C — `~/.claude/plans/mossy-mapping-eich.md`.
- Anchor: Palantir "Connecting Agents to Decisions" (2026-04-29) — decision lineage as the BackProp substrate.
- Handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-value-grade-metrics.ts`.
- Related: `/palantir-mini:pm-memory-map` (4-layer balance), `/palantir-mini:pm-replay --circuit` (T3+ replay).

## Memory layer declaration

`procedural` (audit script) + `semantic` (typed substrate health DH) + `episodic` (Three-Questions per-sprint recall).
