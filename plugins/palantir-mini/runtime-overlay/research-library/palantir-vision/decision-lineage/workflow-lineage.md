---
title: "Workflow Lineage — [Official]"
slug: workflow-lineage
fileClass: vision-decision-lineage
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "https://www.palantir.com/docs/foundry/workflow-lineage/overview", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---
# Workflow Lineage — [Official]

> Scope: **Workflow Lineage** (what executed through which surface) as distinct from **Decision Lineage** (what outcomes should refine behavior).
> Source: Palantir Foundry docs — workflow-lineage/overview.
> Provenance: `[Official]`

## Distinction from Decision Lineage

| Aspect | Workflow Lineage | Decision Lineage |
|--------|------------------|------------------|
| Layer | Surface / execution trace | Decision / reasoning trace |
| Question | What executed, through which surface, with what trace? | What outcomes flowed backward into accuracy, drift, refinement, graduation? |
| Palantir product | Workflow Lineage | Decision Lineage |
| In palantir-mini | `emit_event` + `replay_lineage` (tracking) | BackPropagation rule 10 + `pm-verify` refinement phase |
| Refinement loop | Passive trace | Active feedback signal |

## Our Binding

Both layers share the same 5-dim event envelope (`when`, `atopWhich`, `throughWhich`, `byWhom`, `withWhat`). They are distinguished by `type` field:
- Workflow Lineage events: `session_started`, `tool_invoked`, `phase_completed`, etc.
- Decision Lineage events: `edit_proposed`, `edit_committed`, `drift_detected`, `post_mortem`, etc.

See `~/.claude/schemas/ontology/lineage/event-types.ts` for the full EVENT_TYPE_REGISTRY (10 variants).

## Cross-References
- Companion: `decision-lineage.md` (in this subdir)
- Types: `~/.claude/schemas/ontology/lineage/decision-lineage.ts`
- Rule: `~/.claude/rules/10-events-jsonl.md`
