---
title: Ship OS Research-First Application Proposal
slug: application-proposal
fileClass: vision-ship-os
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Ship OS Research-First Application Proposal

> **Purpose:** Canonical upstream proposal for applying Ship OS patterns to this codebase without collapsing the authority chain.
>
> **Status:** Research session artifact. This proposal is intentionally limited to `~/.claude/research/` outputs.
>
> **Supersedes:** downstream-first interpretation of `/home/palantirkc/ship-os-codebase-application-proposal.md` for the current session.
> **Provenance:** Mixed — upstream Ship OS / World View research already stored in this library [Official] plus authority-chain application guidance for this repo [Inference].
> **Schema anchors:** `ORCH-01..06`, `PB-01..03`, `REF-01..05`

## [§SOSP-01] Executive Position

Ship OS should enter this codebase through the upstream research layer first.

For this repo, the practical authority chain is:

```text
philosophy/
  -> research/
    -> schemas/ontology/
      -> project ontology/*.ts
        -> convex / hooks / src
```

The immediate goal is therefore **not** to change schemas or projects. The immediate goal is to make Ship OS patterns explicit enough in research that later schema work can proceed without ambiguity.

## [§SOSP-02] Why The Previous Framing Needed Correction

The earlier proposal got the cascade direction mostly right, but it still mixed three concerns in one step:

1. upstream evidence capture
2. meta-schema promotion
3. project-level application

That creates avoidable confusion. Once a proposal starts naming concrete `DH-ACTION-*` additions and project implications before the research corpus is stabilized, downstream layers begin to act like they are co-authoritative.

For this codebase, that is the wrong pressure direction.

## [§SOSP-03] Scope Of This Session

This session updates only `~/.claude/research/`.

Allowed work:

- create or revise canonical research documents
- sharpen upstream pattern boundaries
- define promotion criteria for later schema work
- register downstream candidates without implementing them

Out of scope in this session:

- editing `schemas/ontology/`
- editing project `ontology/*.ts`
- editing Convex, hooks, or UI code

## [§SOSP-04] Research Deliverables

This proposal establishes three upstream artifacts:

1. `ship-os/patterns.md`
2. `ship-os/stack-evaluation.md`
3. this proposal document

Together they provide:

- canonical pattern extraction
- stack confusion prevention
- a research-first sequence for future sessions

## [§SOSP-05] Promotion Criteria For Later Sessions

A Ship OS research finding may be promoted from `research/` into `schemas/` only if it is:

1. **Cross-domain:** not tied to naval entities or demo nouns
2. **Semantically expressible:** fits a heuristic, constraint, semantic constant, or validation rule
3. **Operationally testable:** can be validated by schema tests or project validation
4. **Non-duplicative:** fills a genuine evidence or rules gap instead of restating an existing constant
5. **Reusable:** relevant to more than one project or clearly part of the meta layer

If any one of these fails, the finding stays in `research/`.

## [§SOSP-06] Initial Candidate Register

| Candidate | Recommended Next Layer | Decision |
|---|---|---|
| Governed action log enablement rule | `schemas/ontology/action/schema.ts` | Promote in a later schema session |
| Canonical action submission envelope | `schemas/ontology/action/schema.ts` | Evaluate later; valid candidate but not yet mandatory |
| Intelligent comms triage workflow | project scope | Keep in research now; later assess per project |
| Unified operational picture | project scope | Keep in research now; later apply to dashboards and orchestration products |
| Living memory / write-back | research evidence only | Already covered by LEARN / REF; use as reinforcement |
| Maritime domain objects | none | Reject from meta promotion |
| OSS stack replacement | none | Reject from this authority layer |

## [§SOSP-07] Project-Scope Implications, Research Only

The research layer can already state the likely direction of the two target projects without editing them.

### [§SOSP-08] `frontend-dashboard/`

Research interpretation:

- not merely a hook-event monitor
- should be judged as the governance and lineage cockpit for governed decisions
- strongest alignment points are unified operational picture, auditability, workflow traces, and backpropagation visibility

### [§SOSP-09] `elisa-rebuild/`

Research interpretation:

- already behaves like a software-build operating system
- strongest alignment points are governed actions, write-back, scenario handling, workflow traces, and autonomy progression

These are scope interpretations only. They are not implementation orders for this session.

## [§SOSP-10] Sequencing After This Session

If the research additions are accepted, future work should happen in this order:

1. **Research sign-off session**
   - confirm the new upstream files are the accepted Ship OS authority source
2. **Schema promotion session**
   - evaluate which research findings become typed meta rules
3. **Project scope session**
   - reassess `frontend-dashboard/` and `elisa-rebuild/` against the updated meta layer
4. **Implementation session**
   - only then change runtime code

## [§SOSP-11] Non-Goals

This proposal explicitly avoids:

- building a naval Ship OS clone
- replacing the current stack because an external article used different tools
- treating existing projects as if they need to be rewritten before upstream research is clarified

## [§SOSP-12] Success Condition

This proposal succeeds if later sessions can answer all of these cleanly:

1. Which Ship OS ideas are now canonical research facts in this repo?
2. Which of those are eligible for meta-schema promotion?
3. Which are only project-scope concerns?
4. Which are explicitly rejected from promotion?

If those answers are clear, the authority chain stays intact.
