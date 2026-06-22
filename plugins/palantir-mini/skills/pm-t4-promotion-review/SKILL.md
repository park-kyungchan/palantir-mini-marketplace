---
name: pm-t4-promotion-review
category: research
surfaceStatus: public-core
description: "Audit T4-graded events (rule 26 §Substrate routing top tier — T3 + D2 K-LLM..."
allowed-tools: mcp__palantir-mini__pm_substrate_query mcp__palantir-mini__emit_event Read Bash
effort: high
disable-model-invocation: false
---

# pm-t4-promotion-review — T4-grade events promotion audit

## When to use

- Periodic (monthly default) review of which substrate events earned T4 grade and merit promotion to canonical surfaces (shared-core re-export, rule citation, default-on hook).
- When `/palantir-mini:pm-t4-promotion-review` is invoked or these phrases appear: "T4 promotion", "promotion candidates", "what should be canonized", "shared-core promotion review".

## NOT for

- Re-grading existing events (rule 10 append-only invariant; events are forward-only).
- Promoting T3 events without manual K-LLM consensus check (T3 → T4 requires explicit `payload.kLlmConsensus` annotation).

## Three Q anchor

This skill complements `/palantir-mini:pm-value-audit --three-questions` (W2.C) — Q3 Refine surfaces "did the sprint refine substrate?" while this skill answers "is the refinement durable enough to canonize?". T4 = T3 + D2 (K-LLM consensus per rule 26 §D2).

## How to run

### Step 1 — Query T4 events

```
mcp__palantir-mini__pm_substrate_query({
  mode: "by-grade",
  project: "/home/palantirkc",
  gradeFilter: "T4",
  windowDays: 30
})
```

If 0 T4 events found: report "no promotion candidates this window — T3 → T4 transition requires explicit `payload.kLlmConsensus` field set by ≥2 independent K-LLM grader runs (rule 26 §D2)."

### Step 2 — Group by refinementTarget.kind

For each T4 event, extract `withWhat.refinementTarget.{kind, filePathOrRid, description, confidenceLevel}`. Group:
- `primitive-field-add` → schemas v<next>.0 promotion candidate
- `primitive-field-extend-enum` → schemas additive enum extension
- `event-type-add` → palantir-mini event variant addition
- `grading-criterion-threshold` → harness rubric tuning
- `failure-category-add` → FailureCategory enum extension
- `rule-conformance-policy` → rule update or hook citation refresh
- `other` → ad-hoc; manual triage

### Step 3 — Replay lineage for top-3 candidates

```
mcp__palantir-mini__pm_substrate_query({
  mode: "lineage",
  project: "/home/palantirkc",
  filter: { byRefinementTarget: <kind>, valueGrade: "T4" }
})
```

For each candidate, show the upstream chain: which sprint produced it, which artifacts it cites, which K-LLMs converged.

### Step 4 — Surface promotion verdicts

For each candidate, recommend one of:
- `promote-to-shared-core` — re-export under `~/ontology/shared-core/index.ts` (next MINOR bump).
- `promote-to-rule` — author/amend a rule under `~/.claude/rules/`.
- `promote-to-default-on` — flip a hook from advisory to blocking, or add to plugin manifest auto-arm.
- `hold-monitor` — promising but needs ≥1 more cycle to confirm durability.
- `reject` — T4 grade was speculative; evidence doesn't support canonization.

Lead reviews + may invoke downstream skills (e.g., `/pm-aip-agent-author` for primitive promotion, `protocol-designer` agent for rule authoring).

### Step 5 — Emit promotion-review event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "t4-promotion-reviewed", taskId: "review-<unix-ms>", validations: ["t4-events-queried", "candidates-grouped", "verdicts-emitted"] },
  withWhat: {
    reasoning: "T4 promotion review: <N> candidates; <promoted>/<held>/<rejected>",
    memoryLayers: ["semantic", "procedural", "episodic"],
    refinementTarget: { kind: "rule-conformance-policy", filePathOrRid: "rule 26 §Substrate routing T4", description: "Promotion automation review run", confidenceLevel: "medium" }
  }
})
```

## Output

```
# T4 promotion review — <window>

T4 events found: <N>
By refinementTarget kind:
- primitive-field-add: <count>
- ... (per-kind summary)

## Top 3 candidates

1. <T4 event RID> — <kind> — <filePathOrRid> — <description>
   Verdict: promote-to-X | hold | reject
2. ...

## Recommendations

Take action on <count> candidates this cycle. Defer <count>. Reject <count>.
```

## Authority + cross-refs

- Rule 26 §D2 (K-LLM consensus) + §Substrate routing (T4 promotion gate).
- Schemas: `value-grade.ts` (v1.35.0; T0-T4 enum).
- Companion: `/palantir-mini:pm-value-audit --three-questions` (Q3 Refine + substrate health).
- Plan §3.W4.C — `~/.claude/plans/mossy-mapping-eich.md`.
