# palantir-vision/architecture-gap/ — Query Router

> **Scope:** Our adapter-gap analysis and architecture interpretation relative to Palantir's upstream model.

## Open first by question

| Question | File |
|----------|------|
| Where does our implementation diverge intentionally from upstream Palantir architecture? | `adapter-gap-analysis.md` |
| How do we interpret the ontology model structurally? | `ontology-model.md` |
| How do pipeline stages and orchestration connect? | `orchestration-map.md` |
| How should Lead close user intent ambiguity before Ontology Engineering and Harness execution? | `semantic-intent-gate-for-ontology-engineering.md` |
| How should Claude final-review and implement the full Lead intent-to-Digital-Twin proposal? | `semantic-intent-gate-for-ontology-engineering.md` -> `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md` |

## Retrieval rules

- Use this directory only after you already understand the upstream fact layer.
- These are local interpretation docs, not upstream facts.
- For final implementation authority, read the matching plan in `~/.claude/plans/`; this directory routes interpretation but does not replace the proposal.
