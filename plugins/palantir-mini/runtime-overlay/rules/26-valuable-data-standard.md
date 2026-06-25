---
ruleId: 26
slug: valuable-data-standard
scope: global
version: 2.1.0
invariant: "Valuable data = an event that expresses a decision, pairs with an outcome, maps to >=1 agentic memory layer, and is provider-neutral; T0 (5-dim incomplete) rejected at emit; T1+ retained in events.jsonl."
supersededBy: null
supersedes: []
crossRefs: [10, 27]
hookCitations: [value-grade-assigner]
bodyLocCeiling: 60
---

# Rule 26 — Valuable Data Standard

## §Definition

Valuable data = an event that ① expresses a decision, ② pairs with an outcome, ③ maps to ≥1 agentic memory layer (working / episodic / semantic / procedural), ④ is provider-neutral.

## §Grading (T0–T4 — code is authoritative)

Every envelope is auto-graded by `autoGradeEnvelope()` (`bridge/handlers/emit-event.ts`) on **field presence**, in this exact branch order. The `value-grade-assigner` PreToolUse hook re-uses the same function (single-sourced grader); the handler grade is authoritative.

| Tier | Gate (cumulative; first failing gate sets the tier) | Routing |
|------|-----------------------------------------------------|---------|
| **T0** | Axis A1 5-dim incomplete (`when` / `atopWhich` / `throughWhich.{sessionId,toolName,cwd}` / `byWhom.identity`) | Rejected at emit; archived 7d then deleted |
| **T1** | A axis full **+ E** axis ≥1 (`withWhat.memoryLayers` ≥1) | events.jsonl (Workflow Lineage only) |
| **T2** | T1 **+ B** axis ≥1 (`lineageRefs` ref OR `withWhat.hypothesis`) | + outcome-pairing pending |
| **T3** | T2 **+ C** axis ≥1 (`withWhat.refinementTarget` OR `payload.failureCategory`) | + BackProp circuit input |
| **T4** | T3 **+ D2** (`payload.kLlmConsensus` = multi-vendor consensus) | shared-core promotion candidate |

`isCircuitGrade` (T3+), `isActiveGrade` (T1+): `schemas/ontology/primitives/value-grade.ts`.

## §D2 ceiling (single-vendor deployment)

T4's D2 gate is **multi-vendor (K-LLM) consensus**. `promoteT3ToT4` (`lib/event-log/grade-promotion.ts`) supports D2-canonical (≥2 distinct `byWhom.identity`) and a D2-fallback (`kLlmConsensus="single-vendor-attested"`). On the current **permanent single-vendor (Claude-only)** deployment the canonical path is **structurally unreachable**; `promoteT3ToT4` stays gated-but-correct — leave it intact for the multi-runtime substrate (rule 27), do not delete.

## §R5 reject-at-emit

`validation_phase_completed.passed=false` envelopes MUST carry typed `withWhat.refinementTarget`. Advisory by default; hard-reject under `PALANTIR_MINI_VALUE_GRADE_ENFORCE=1`. Bypass: `PALANTIR_MINI_VALUE_GRADE_BYPASS=1` (audited). `withWhat.reasoning` (the WHY) required at emit for every T1+ envelope (advisory; block under `PALANTIR_MINI_REASONING_ENFORCE=1`).

## §Axis A — reasoning is first-class

`withWhat.reasoning` is a first-class decision-lineage field on every valuable (T1+) event, not an optional pointer.

## §Substrate routing

T0 → reject (archive 7d → delete); T1 → events.jsonl; T2 → + outcomes pair pending; T3 → + decisions/ (BackProp); T4 → + shared-core/promotions/ candidate. See `SUBSTRATE_ROUTING_MAP` in `hooks/value-grade-assigner.ts`.

## §5-Axes 14-Criteria (reference — diagnostic only)

The hook scores all 14 criteria (A1–A3 · B1–B3 · C1–C3 · D1–D3 · E1–E4) into the `valueGrade_assignment_completed` meta-event for BackProp visibility. **These feed the instrumentation meta-event ONLY; they do NOT set the tier** — the tier is set by `autoGradeEnvelope`'s presence-based branch order above. Full per-criterion definitions: `AxesScored14` + `computeAxes14()` in `hooks/value-grade-assigner.ts`.

## §Version history

- v2.1.0 (2026-06-25): doc↔code reconciliation. Transcribed the LIVE T0–T4 + D2 + 14-criteria taxonomy from `autoGradeEnvelope`/`value-grade-assigner`. The v2.0.0 "dropped T0–T4 detailed scoring / multi-vendor consensus" claim was **never adopted in code** — the full taxonomy ships and grades every envelope. T4 = multi-vendor consensus ceiling, STRUCTURALLY UNREACHABLE for the current permanent single-vendor (Claude-only) deployment; `promoteT3ToT4` left gated-but-correct.
- v2.0.0 (2026-06-07): solo-dev lean **(doc-only; code never followed)** — body claimed multi-vendor consensus + heavy taxonomy were dropped. Superseded by 2.1.0 as drift.
