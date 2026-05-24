---
title: AI FDE — AI Forward Deployed Engineer
slug: ai-fde
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "AIPCon 9 / DevCon 5 (Mar 2026)", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# AI FDE — AI Forward Deployed Engineer

> **Provenance:** Mixed — official AI FDE docs and March 2026 announcements [Official], plus synthesis of public DevCon 5 launch themes [Official-derived].
> **Schema anchors:** `HAL-01..03`, `PS-01..04`, `ORCH-01..06`, `PB-01..03`
> **Markers:** `[§FDE-nn]`

---

## [§FDE-01] Overview

AI FDE is Palantir's conversational builder agent for Foundry. It turns natural-language intent into platform operations across ontology editing, logic creation, data work, governance, and application scaffolding.

DevCon 5 clarifies that AI FDE is not just "chat for Foundry":

- it explores the current ontology and documents,
- drafts logic,
- authors evals,
- diagnoses failures,
- refines prompts/logic in a loop,
- and can materialize application and automation surfaces around the result.

## [§FDE-02] GA Framing and Requirements

**GA timing:** DevCon 5 / AIPCon 9 era, March 2026.

Official baseline requirements:

- AIP enabled
- Foundry Branching recommended for ontology edits
- model support across Anthropic, OpenAI, Google Gemini, xAI

Architectural implication:
- AI FDE assumes the platform already contains meaningful ontology context and secure builder surfaces. Its power comes from operating inside that context, not from free-form prompt cleverness alone.

## [§FDE-03] 7 Modes

| Mode | Description | Ontology Relevance |
|------|-------------|-------------------|
| [§FDE-M01] Data Integration | Build/modify data pipelines | DATA |
| [§FDE-M02] Ontology Editing | Create/update objects, links, actions | DATA + LOGIC + ACTION |
| [§FDE-M03] Functions Editing | Author logic/functions in supported runtimes | LOGIC |
| [§FDE-M04] Exploration | Read-only investigation of platform state | Cross-domain |
| [§FDE-M05] Governance | Audit permissions, markings, data protection | SECURITY |
| [§FDE-M06] OSDK React | Build frontend applications on ontology data | Frontend application surface |
| [§FDE-M07] Platform Q&A | Platform guidance and reference | Reference |

Modes narrow tools and documentation to the current task, which is a context-management mechanism, not just a UX affordance.

## [§FDE-04] Documented Skills Surface

The current official docs do **not** present a closed "10 skills" contract. They document:

**Agent-management skills (5 named capabilities):**

1. change mode
2. request clarification
3. generate plan
4. load documentation
5. manage context / manage skills

**Representative domain skills (examples, not an exhaustive list):**

1. filesystem
2. notepad
3. solution design
4. execute actions

The important point is not the exact count. It is that AI FDE can combine self-management skills with Foundry action skills into multi-step builder loops rather than stopping at one-shot generation.

## [§FDE-05] DevCon 5 Builder Loop — Eval-Driven Development

The launch demo shows a concrete AI FDE engineering loop:

1. **Explore the ontology + documents**
2. **Draft a first logic function**
3. **Generate an eval suite from representative ontology cases**
4. **Run evals**
5. **Inspect failures and execution details**
6. **Synthesize the failure mode**
7. **Refine prompt/logic**
8. **Re-run until acceptable**

This is the clearest product-level expression of Palantir's feedback-driven optimization principle from the DevCon 5 opening.

### [§FDE-06] First Draft Quality

AI FDE's first draft advantage in the demo comes from doing work a human developer would otherwise do manually:

- query ontology objects,
- inspect patterns in historical data,
- read operational documentation,
- enrich the prompt with domain-specific detail,
- bind the result to actual ontology surfaces.

The first draft is better not because the model is magical, but because the agent executes the surrounding retrieval and scaffolding work more patiently and consistently than a human usually will.

### [§FDE-07] Evals as the Gate, Not Eyeballing

The DevCon 5 demo explicitly rejects eyeballing as the default production path for critical workflows.

AI FDE:

- generates representative test cases,
- chooses evaluation criteria,
- runs the suite,
- detects failure clusters,
- iterates automatically.

This is important for our local schema system because it validates a design where frontend/operator feedback should become eval artifacts, not stay as disconnected UI comments.

## [§FDE-08] Feedback Compounding Loop

The launch demo shows a second loop after production exposure:

1. operator rejects a proposal,
2. rejection becomes ontology-linked feedback,
3. AI FDE reads the feedback,
4. writes a new eval case,
5. refines the logic,
6. reruns the suite,
7. compounds the system.

The demo then layers a **feedback-quality gate agent** on top:

- if the user submits weak feedback ("this is bad"),
- another agent asks clarifying questions,
- better feedback becomes better eval input for the main agent.

This is a concrete example of agents building agents building agents, but the core pattern is simpler:
- bad production outcomes should be translated into structured refinement inputs.

## [§FDE-09] Expanded Builder Surfaces

DevCon 5 extends AI FDE beyond logic authoring:

- **create/edit Workshop applications**
- **create Automates**
- **automatic mode switching**
- **smart context management**
- **solution design / draft implementation plans**
- **explicit documentation loading** and scoped tool access per mode

This matters because AI FDE is being positioned as a builder for the whole workflow, not just a single function.

## [§FDE-10] Context Management as a Capability

The product repeatedly emphasizes context control:

- mode-limited tooling,
- smart context management,
- task decomposition,
- scoped solution design,
- iterative refinement.

This aligns with the Army Software Factory lesson from DevCon 5:
- separation of concerns and curated context are necessary for reliable agent performance.

## [§FDE-11] Parallel to Our Local System

| AI FDE Surface | Local Analog |
|----------------|-------------|
| Ontology editing | `schemas/ontology/` + project `ontology/*.ts` |
| Eval-driven refinement | schema tests + semantic audit + local eval artifacts |
| Solution design | prompt/task scaffolds + architecture docs |
| App + automate creation | frontend ontology + runtime/app scaffolding |
| Context management | authority chain + task API + schema contracts |

The strongest DevCon 5 lesson for local implementation is this:
- **minimal HITL requires typed shared state plus explicit validators**,
- not just stronger prompts or more autonomous agents.

## [§FDE-12] Boundary

AI FDE is still a platform-native managed capability.

What is official:

- modes,
- skills,
- branching-aware builder behavior,
- app/automate creation surfaces,
- eval-driven builder loop.

What remains local in our system:

- exact schema contracts for backend/frontend ontology exports,
- project-specific task-context injection,
- cross-axis validation between backend ontology and frontend interaction/rendering contracts.

---

## Sources

- https://www.palantir.com/docs/foundry/ai-fde/overview/
- https://www.palantir.com/docs/foundry/ai-fde/navigation/
- https://www.palantir.com/docs/foundry/ai-fde/modes-and-skills/
- https://www.palantir.com/docs/foundry/ai-fde/best-practices/
- https://www.palantir.com/docs/foundry/announcements/2026-03/
