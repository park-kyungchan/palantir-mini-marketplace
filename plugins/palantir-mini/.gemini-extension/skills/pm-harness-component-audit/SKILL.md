---
name: pm-harness-component-audit
category: merge-candidate
description: "Run a component stress-test audit per Rajasekaran §1 (W5 substrate, plugin v3.11.0)."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__pm_harness_component_audit mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__replay_lineage mcp__plugin_palantir-mini_palantir-mini__pm_preamble
argument-hint: "<componentId>   (e.g. sprint-construct | per-sprint-evaluator | context-reset | planner | harness-analyzer | file-ipc-feedback | sprint-contract-negotiation)"
effort: medium
disable-model-invocation: false
---

# pm-harness-component-audit — W5 stress test for harness components

## When to use

- User suspects a harness component (sprint construct, per-sprint evaluator, context reset) may be stale post-Opus 4.5/4.6/4.7.
- Quarterly (90d) self-audit to catch drift from model improvements.
- After a canary run that exercised BOTH the full component AND its simpleVariant on the same rubric — report the verdict here.

## Seed components (7)

Priority ordered per `cheeky-wandering-yeti.md §W5`:

1. **sprint-construct** — assumption: Generator cannot sustain multi-feature coherence without sprint decomposition. simpleVariant: single multi-feature run + end-only evaluator. 🔴 Rajasekaran's blog already "removed entirely" in Opus 4.6.
2. **per-sprint-evaluator** — assumption: per-iteration live QA prevents divergence. simpleVariant: single end-of-run evaluator. 🔴 Blog "moved to a single pass at the end".
3. **context-reset** — assumption: long sessions cause Generator context anxiety. simpleVariant: continuous session + SDK compaction. 🟢 Blog removed entirely in 4.6.
4. **planner** — assumption: 1-4 sentence briefs under-scope without expansion. simpleVariant: Generator reads brief directly. 🟢 Blog KEPT (removal produced under-scoped output).
5. **harness-analyzer** — assumption: Lead can't re-spec alone. simpleVariant: Lead manually re-specs. 🟢 Established W3.0 substrate (plugin v3.9.0+); always-on per rule 16 v3.3.0 §Loop step 6 (revise).
6. **file-ipc-feedback** — assumption: direct messaging damages audit trail. simpleVariant: append-only event-log IPC only. 🟢 Rule 16 hard-locked; Wave 6+ territory.
7. **sprint-contract-negotiation** — assumption: Generator drifts without bound contract. simpleVariant: planner-only spec. 🟢 S1 dependency.

## Process

1. Call `pm_preamble` for project context.
2. **Read-only enumeration**: invoke `pm_harness_component_audit { componentId }`. Returns seed declaration + verdict `never-audited` when no prior audit.
3. **Reporting a verdict**: after running an external A/B canary (typically within palantir-math sprint-NNN that runs both the full component AND the simpleVariant on a fixed rubric), invoke `pm_harness_component_audit` with `{ componentId, verdict, scoreDelta, rationale, canaryRubricRid, canaryArtifacts, projectPath }`. Handler emits `harness_component_audit_emitted` event.
4. Aggregate via `replay_lineage({ filter: { eventTypes: ["harness_component_audit_emitted"] } })` to surface all recorded verdicts. Summarize `remove-candidate` entries — these become deprecation targets for the next MAJOR bump.

## Output

```
# pm-harness-component-audit report — <componentId>

## Seed declaration
- assumptionEncoded: "..."
- simpleVariant: { description, enabledBy }
- canaryRubricRid: rubric.frontend.4-criteria-craft (default)

## Last audit
- verdict: <load-bearing | remove-candidate | needs-rework | never-audited>
- scoreDelta: ±0.XX
- lastAuditedAt: <ISO8601 | null>
- rationale: "..."

## Recommendation
- "KEEP (load-bearing; simpleVariant underperforms by X%)"
- OR "REMOVE-CANDIDATE (simpleVariant within Y% — deprecate at next MAJOR)"
- OR "NEEDS-REWORK (canary inconclusive; re-audit next quarter)"
```

## Notes

- Canary runs are NOT executed by this skill — they require a full sprint-level harness invocation (future palantir-math sprint-003+). This skill records verdicts + enumerates seeds; it does not invoke Planner/Generator/Evaluator.
- Audit decisions preserved in events.jsonl are the authoritative Decision Lineage input for any component removal at a future MAJOR bump (rule 10 append-only substrate).
