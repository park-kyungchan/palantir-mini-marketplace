---
ruleId: 1
slug: ontology-first-core
scope: global
version: 2.1.0
tier: T2
invariant: "Meaning → ontology → contracts → runtime; forward/backward propagation is load-bearing; never patch runtime first when the issue is semantic."
supersededBy: null
crossRefs: [2, 8, 10, 22]
hookCitations: []
---

# Rule 01 — Ontology-First Core

## Core invariants

- Start from meaning, then ontology, then contracts, then runtime.
- Treat semantic drift as a defect, not normal cleanup.
- Prefer project-local `BROWSE.md` / `INDEX.md` and ontology docs over memory or chat assumptions.
- Do NOT patch runtime first when the issue is semantic.
- Keep automation and audits downstream of ontology, not as parallel truth sources.

## Propagation

- **Forward**: `research → schemas/ontology → project ontology → contracts → runtime`
- **Backward**: `runtime evidence → lineage / evaluation / refinement → ontology or validation updates`. Workflow Lineage records what executed; BackPropagation records what outcomes should refine future behavior.
- **LEARN**: projects declaring LEARN prefer typed refs + explicit evidence paths over name heuristics / memory-only rules.
- **Frontend scope**: user + agent + rendering + verification surfaces declare bindings before local UI conventions. Verification artifacts are semantic infrastructure, not optional extras.
- When propagation semantics change, update schema docs + validators + audits + affected tests in the same turn.

## §ForwardProp Audit

- `propagation_audit_forward` MCP handler (W6): validates research → schemas → shared-core → project-ontology → contracts → runtime chain is intact.
- Run before any cross-layer schema promotion or ontology refactor.

## §BackwardProp Audit

- `propagation_audit_backward` MCP handler (W6): validates runtime evidence → lineage → ontology refinement path; surfaces drift between observed outcomes and current ontology.
- Cross-ref rule 10 v2.1.0 for `propagationDepth` field on events.
