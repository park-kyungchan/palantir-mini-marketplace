---
title: AIPCon 9 Ship OS / World View Patterns
slug: patterns
fileClass: vision-ship-os
provenanceMarkers: [Vision, Synthesis, Inference]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# AIPCon 9 Ship OS / World View Patterns

> **Purpose:** Canonical upstream research source for reusable Ship OS and World View patterns before any schema or project changes are proposed.
>
> **Status:** Research-only. This file authorizes downstream candidate analysis but does not itself justify schema or project edits.
>
> **Downstream candidates:** `~/.claude/schemas/ontology/semantics.ts`, `~/.claude/schemas/ontology/action/schema.ts`, project `ontology/*.ts`
> **Provenance:** Mixed — Ship OS / World View facts inherited from official AIPCon 9 research already stored in this library [Official], with reusable local pattern extraction [Inference].
> **Schema anchors:** `ORCH-01..06`, `WL-01..05`, `REF-01..05`, `PB-01..03`
>
> **Provenance key:**
> - **[Official]** verified from existing AIPCon 9 / Palantir research already stored in this library
> - **[Inference]** generalized pattern extracted from those official facts
> - **[Adapter]** mapping to this repo's ontology stack

## [§SOS-01] Why This File Exists

Ship OS should not enter the codebase as:

- naval-domain nouns copied into meta schemas
- stack-brand imitation
- project-specific implementation guesses promoted before upstream research is stable

It should enter as reusable ontology patterns. This file isolates those patterns so later schema work can ask a narrower question:

> "Which Ship OS ideas are cross-domain semantic rules, and which are only demo-specific implementation details?"

## [§SOS-02] Extraction Boundary

Only promote a Ship OS pattern beyond research if it satisfies all of these:

1. It is cross-domain, not maritime-specific.
2. It can be expressed as semantics, heuristic, hard constraint, or project-scope rule.
3. It improves the authority chain instead of bypassing it.
4. It is already visible in at least one existing project or clearly needed by more than one project.

Do **not** promote:

- `Ship`, `Sensor`, `Threat`, `WeaponSystem`, `Mission` as meta concepts
- OSS stack choices such as PostgreSQL, Neo4j, MQTT, Temporal as if they were ontology semantics
- UI-specific layout decisions from demos

## [§SOS-03] Pattern 1. Governed Multi-Path Decision Package

**[Official]** Ship OS's ECN workflow was presented as:

1. ingest change notice
2. parse and cross-reference dependencies in parallel
3. generate 3 paths forward
4. quantify schedule, cost, and risk
5. present to human approver
6. execute selected path
7. revise production plan and preserve audit trail

**[Inference]** The reusable pattern is not "ECN." The reusable pattern is:

- one operational trigger
- dependency-aware reasoning
- multiple explicit courses of action
- quantified trade-offs
- governed approval
- atomic execution
- write-back into operational memory

**[Adapter]** In this repo, this pattern maps to:

- `SCN-*` scenario handling
- `reviewLevel` / approval workflow
- outcome tracking and write-back
- audit and lineage surfaces

This pattern is already partially encoded in `DH-ACTION-15` and the existing scenario framework. Ship OS mainly strengthens the evidence base; it does not by itself require a new domain model.

## [§SOS-04] Pattern 2. Action Log as Queryable Ontology Object

**[Official]** Existing ACTION research already establishes that submitted actions generate log objects with captured execution context, including:

- action RID
- action type RID + version
- timestamp
- user
- primary keys
- summary
- parameter values

**[Official]** Ship OS adds the operational consequence: these action records are not passive logs. They support later governance, monitoring, and decision review.

**[Inference]** The key pattern is:

- raw runtime trace is not enough
- governed actions should also become searchable domain records
- audit has to answer operational questions, not just debugging questions

**[Adapter]** This is the strongest research basis for a future schema candidate around `actionLogEnabled`, but research should stop short of changing the schema in the same session.

## [§SOS-05] Pattern 3. Intelligent Communications Triage

**[Official]** Ship OS demonstrated an inbound supplier communication flow where the system:

- ingests the message in the sender's existing workflow
- resolves shorthand and operational context
- checks telemetry and inventory state
- identifies related issues
- stages work and response options
- routes some items to humans and some to agents

**[Inference]** The reusable pattern is:

- inbound communication is an operational event, not just text
- the event becomes ontology-grounded context
- triage is a governed workflow spanning DATA, LOGIC, and ACTION

**[Adapter]** This pattern is relevant to listener/webhook/automation boundaries and to project-level workflow scope, but it is not yet a clear new meta-schema constant. Current research should mark it as a project-scope pattern candidate, not a schema change.

## [§SOS-06] Pattern 4. Unified Operational Picture

**[Official]** Ship OS did not present isolated point features. It presented multiple operational workflows as one coordinated operating picture.

**[Inference]** The reusable pattern is:

- multiple workflows share one decision surface
- operational state, approvals, and effects must be inspectable together
- schedule, communications, and execution traces belong to one graph of operations

**[Adapter]** This is primarily a project-scope implication:

- `frontend-dashboard` should be evaluated as the governance and lineage cockpit
- `elisa-rebuild` should be evaluated as the software-build operating system

This pattern does not belong in meta schemas as a maritime abstraction.

## [§SOS-07] Pattern 5. Write-Back as Living Memory

**[Official]** World View described the ontology as a living memory enriched by past events, decisions, and outcomes.

**[Inference]** The reusable pattern is:

- execution outcomes must feed back into the ontology
- memory is not chat history; it is typed operational history
- future planning quality depends on explicit write-back and evaluation artifacts

**[Adapter]** This pattern is already aligned with:

- `LEARN-01..03`
- `REF-01..05`
- outcome tracking, evaluation, drift detection, and autonomy graduation

World View therefore strengthens existing research more than it creates a net-new schema obligation.

## [§SOS-08] Pattern 6. Meet The Operational Base Where It Is

**[Official]** Ship OS emphasized that suppliers do not need to change their workflow first.

**[Inference]** A strong operational ontology absorbs external workflow reality before trying to standardize it.

**[Adapter]** This favors:

- listener-like ingestion
- adapter boundaries
- evidence capture from real runtime behavior

It argues against forcing research conclusions directly into project runtime before the upstream model is clarified.

## [§SOS-09] Downstream Candidate Register

| Pattern | Candidate Layer | Current Recommendation |
|---|---|---|
| Action Log as queryable object | `schemas/ontology/action/schema.ts` | **Yes, later**. Strong basis for a future `DH-ACTION` addition after research sign-off. |
| Canonical action submission envelope | `schemas/ontology/action/schema.ts` | **Maybe later**. Research basis is valid, but it should be framed as governed write-path standardization, not Ship OS mimicry. |
| Intelligent comms triage | project scope | **Yes, project-level later**. Better as workflow-scope guidance than meta-schema rule for now. |
| Unified operational picture | project scope | **Yes, project-level later**. A scope and cockpit question, not a meta-schema concept. |
| Living memory / write-back | research reinforcement only | **Already covered** by LEARN / REF. Use as evidence, not duplicate schema surface. |
| Maritime entity model | meta schema | **No**. Domain-specific and out of scope for cross-project SSoT. |
| OSS stack substitution | schemas / projects | **No**. Capability comparison belongs in research only. |

## [§SOS-10] What This File Does Not Justify

This file does **not** justify:

- direct edits to `schemas/ontology/` in the same session
- immediate project ontology changes
- replacing the current runtime stack with stack elements named in external Ship OS clone material

The only justified next step after this file is a separate schema-promotion session that evaluates which of these patterns deserve typed authority.

## [§SOS-11] Primary Sources Inside This Library

- `platform/aipcon.md` — Ship OS and World View demo decomposition
- `platform/devcon.md + platform/aipcon.md` — concise AIPCon 9 deployment map
- `action/mutations.md` — action log semantics and captured fields
- `action/listeners.md` / `action/webhooks.md` / `action/automation.md` — integration boundary references
