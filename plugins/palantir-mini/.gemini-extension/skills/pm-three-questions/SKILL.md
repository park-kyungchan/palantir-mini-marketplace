---
name: pm-three-questions
category: research
description: "Run AIP \"no-slop zone\" Three Questions audit (Q1 Trust / Q2 Scope / Q3 Refine) over a sprint or session — interpretation layer wrapping pm_value_grade_metrics + replay_lineage..."
allowed-tools: mcp__palantir-mini__pm_value_grade_metrics mcp__palantir-mini__replay_lineage mcp__palantir-mini__pm_outcome_pair_audit mcp__palantir-mini__pm_event_query_by_grade mcp__palantir-mini__emit_event Read Bash
effort: high
disable-model-invocation: false
---

# pm-three-questions — AIP no-slop Three Questions audit

## When to use

- After a sprint terminal (`sprint_completed` event) to validate the work meets AIP "no-slop zone" criteria.
- At session close as part of `/palantir-mini:pm-recap` follow-up to audit the session's substrate output.
- When `/palantir-mini:pm-three-questions` is invoked or any of these phrases appear: "three questions audit", "Q1/Q2/Q3 check", "AIP no-slop check", "is this sprint trustworthy", "trust scope refine".

## Three Questions framework

Anchored to AIP "no-slop zone" + DC5-02 3 conditions for human-agent leverage (research/palantir-vision/aipcon-devcon/devcon.md §DC5-02). Each Q produces a binary verdict + evidence list.

### Q1 — Trust

> Did the rubric verdict line up with independent verification?

**Pass criteria**:
- `grading_completed.payload.passedCriteria == grading_completed.payload.maxPossibleScore` (no failed criteria)
- Hard threshold met per `sprint_contract_bound.payload.hardThreshold.perCriterion`
- Generator self-assessment did NOT diverge from Evaluator independent verdict (when `selfAssessmentPath` present)

**Evidence sources**: `grading_completed` events for the sprint + `feedback-NNN.md` divergence checks.

### Q2 — Scope

> Did artifacts produced match the contract's `inputs[].featureId` scope?

**Pass criteria**:
- Every `edit_committed.payload.appliedEdits[]` traces back to a `sprint_contract_bound.contractId` via `lineageRefs.actionRid`
- `artifactPath` in `grading_completed.payload` lies under the scope path declared in `inputs[].description`
- No out-of-scope edits in the sprint window (between `sprint_contract_bound` and `sprint_completed` events)

**Evidence sources**: `edit_committed` events filtered by sprint contract action RID + scope path glob match.

### Q3 — Refine

> Did the sprint output produce typed refinement signals for BackPropagation?

**Pass criteria**:
- `sprint_completed.withWhat.refinementTarget` is present and non-null (rule 26 §C2)
- valueGrade ≥ T3 on the sprint terminal envelope (rule 26 §Grading)
- At least one `outcome_pair_closed` event in the sprint window (rule 26 §Axis B1)

**Evidence sources**: `sprint_completed` envelope inspection + `pm_outcome_pair_audit` for the sprint window.

## How to run

### Step 1 — Fetch substrate metrics for the target sprint or session

Inputs the user provides (or asks for):
- `<sprint-id>`: e.g. "palantirkc-sprint-029-quick" or "all-this-session"
- `<project>`: defaults to `/home/palantirkc`

Parallel MCP calls:

```
mcp__plugin_palantir-mini_palantir-mini__pm_value_grade_metrics({ project, windowDays: 1 })
mcp__plugin_palantir-mini_palantir-mini__replay_lineage({ project, atopWhich: "<commit-sha>", filter: { byContract: "<sprint-id>" } })
mcp__plugin_palantir-mini_palantir-mini__pm_outcome_pair_audit({ project, orphanThresholdMs: 1800000 })
mcp__plugin_palantir-mini_palantir-mini__pm_event_query_by_grade({ project, gradeFilter: "T3+", windowDays: 1 })
```

### Step 2 — Compute per-Q verdict

For each Q, evaluate the criteria above against the fetched events. Produce a verdict object:

```typescript
{
  q1Trust: { passed: boolean, evidence: string[], failureReason?: string },
  q2Scope: { passed: boolean, evidence: string[], failureReason?: string },
  q3Refine: { passed: boolean, evidence: string[], failureReason?: string },
  overall: "no-slop" | "warn" | "slop"  // 3/3=no-slop, 2/3=warn, ≤1/3=slop
}
```

### Step 3 — Cost-attribution

Aggregate `tool_invocation_completed` events in the sprint window:

```typescript
{
  totalInvocations: number,
  totalDurationMs: number,
  byTool: Record<string, { invocations: number, durationMs: number }>,
  topThreeByDuration: Array<{ tool: string, durationMs: number }>,
  meanDurationMs: number,
}
```

Surface this as a "where did the wall-clock go?" table. Useful for sprint retro + cost-budget audits.

#### Per-agent breakdown

How the audit performs this aggregation:

1. Read `events.jsonl` since session start (or `sprintRef`-bounded if a contract ID is provided).
2. Filter to `type === "edit_committed"` events only.
3. Group by `byWhom.agentName`:
   - **Lead-direct**: `agentName === "claude-code"` OR (`agentName === "subagent-unnamed"` AND no `subagent_type` field in payload).
   - **Subagent**: any other `agentName`.
4. Compute the following fields:

| Field | Formula |
|-------|---------|
| `leadDirectEditCount` | count of Lead-direct `edit_committed` events |
| `subagentEditCount` | count of subagent `edit_committed` events |
| `leadDirectRatio` | `leadDirectEditCount / (leadDirectEditCount + subagentEditCount)`; range 0.0–1.0 |
| `costEstimate` | tokens × model price (see approximation table below) |
| `costSavingsIfDelegated` | `leadDirectEditCount × ($0.10 − $0.018) = leadDirectEditCount × $0.082` |

**Cost approximation table** (input/output blended estimate per edit invocation):

| Model | Approx tokens/edit | Input price/1M | Output price/1M | Cost/edit |
|-------|--------------------|---------------|----------------|-----------|
| opus  | ~5,000             | $15           | $75            | ~$0.10    |
| sonnet | ~2,000            | $3            | $15            | ~$0.018   |
| haiku  | ~500              | $0.80         | $4             | ~$0.0024  |

These are approximations for sprint-retro cost baselines, not billing figures.
Cross-ref: rule 12 v3.4.0 §Lead-direct edit threshold (delegation threshold guidance).

Extended output JSON shape (appended to existing Step 3 output):

```json
{
  "totalInvocations": 17,
  "totalDurationMs": 12345,
  "byTool": { },
  "topThreeByDuration": [ ],
  "meanDurationMs": 726,
  "perAgent": {
    "leadDirectEditCount": 17,
    "subagentEditCount": 0,
    "leadDirectRatio": 1.0,
    "costEstimate": "$1.70 (Lead-direct only)",
    "costSavingsIfDelegated": "$1.394 (saved if delegated to sonnet)"
  }
}
```

### Step 4 — Render markdown report

```markdown
# Three Questions audit — <sprint-id>

| Q | Verdict | Evidence |
|---|---------|----------|
| Q1 Trust  | ✓/✗ | <count> events; <one-line summary> |
| Q2 Scope  | ✓/✗ | <count> in-scope edits; <count> out-of-scope |
| Q3 Refine | ✓/✗ | T<N> grade; refinementTarget=<kind>; pairs closed=<n> |

**Overall**: no-slop / warn / slop

## Cost-attribution

| Tool | Invocations | Total ms | Mean ms |
|------|------------:|---------:|--------:|
| ... | ... | ... | ... |

Total wall-clock: <Nm>; Top-3 by duration: <tool1 / tool2 / tool3>.

## Recommendations

- Q1 fail → re-grade; possible rubric/threshold drift
- Q2 fail → audit out-of-scope edits + tighten contract scope
- Q3 fail → require refinementTarget on next sprint contract; emit hypothesis on terminal envelope
```

### Step 5 — Emit completion event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "three-questions-audit",
    taskId: "<sprint-id>",
    validations: ["Q1-Trust", "Q2-Scope", "Q3-Refine", "cost-attribution"]
  },
  withWhat: {
    reasoning: "AIP no-slop Three Questions audit; verdict=<no-slop|warn|slop>",
    memoryLayers: ["semantic", "procedural", "episodic"]
  }
})
```

## Output

Markdown report (≤80 LOC) + per-Q verdict + cost-attribution table. The user's takeaway should be a single line: "Sprint X is no-slop / warn / slop because ..."

## Authority + cross-refs

- AIP "no-slop zone" framing — `~/.claude/research/palantir-vision/aipcon-devcon/devcon.md` §DC5-02 (3 conditions for human-agent leverage).
- AIP Evals 5/19-evaluator taxonomy — `~/.claude/research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`.
- Rule 26 §C2 (refinementTarget) + §B1 (outcome-paired) + §Grading (T0-T4).
- Companion skills: `/palantir-mini:pm-value-audit` (substrate health), `/palantir-mini:pm-decision-replay` (5-dim filter + replay).
- Plan §3.W2.C — `~/.claude/plans/mossy-mapping-eich.md`.
