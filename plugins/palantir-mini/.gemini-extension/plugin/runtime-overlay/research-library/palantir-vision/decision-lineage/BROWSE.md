---
title: "palantir-vision/decision-lineage/ — Query Router"
slug: decision-lineage-browse
fileClass: vision-decision-lineage
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---
# palantir-vision/decision-lineage/ — Query Router

> **Scope:** Decision Lineage and Workflow Lineage interpretation.
> **Authority boundary:** Evidence library only; runtime semantics still live in typed lineage schemas and append-only event rules.

## Open first by question

| Question | File |
|----------|------|
| What are the 5 Decision Lineage dimensions in our interpretation? | `../cross-cutting/decision-lineage.md` |
| How does Workflow Lineage differ from Decision Lineage? | `workflow-lineage.md` |
| Where do the typed local lineage contracts live? | `../../../schemas/ontology/lineage/decision-lineage.ts` |
| Where is the append-only event policy? | `../../../rules/10-events-jsonl.md` |

## Important note

There is **no local `decision-lineage.md` file in this directory**. The canonical broad discussion remains at `../cross-cutting/decision-lineage.md`.
