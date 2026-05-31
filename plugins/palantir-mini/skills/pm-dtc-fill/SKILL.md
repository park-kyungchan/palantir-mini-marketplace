---
name: pm-dtc-fill
category: core-workflow
surfaceStatus: public-core
description: "Turn-by-turn DTC (DigitalTwinChangeContract) fill conversation. Use after SIC..."
allowed-tools: Read
effort: low
disable-model-invocation: false
---

# pm-dtc-fill — DTC Turn-by-Turn Fill Conversation

## When to use
- After SemanticIntentContract is approved (envelope state = `semantic_intent_approved`)
- After the approved SIC is tied to an FDEOntologyEngineeringSession and
  ContextEngineeringPlan evidence for DATA/LOGIC/ACTION, technology
  recommendation, and validation plan is available
- Before any ontology-affecting mutation (per rule 16 §B2 default-on hard gate)
- When the Lead or DTC author wants to confirm change boundary turn-by-turn rather than as bulk JSON

## How it works
Each call to `pm_semantic_intent_gate` with `fillPolicy="dtc-turn-fill"` + `turn=N` advances ONE of 7 DTC turns. The source material is not the raw prompt: it is the approved SIC plus FDE session and ContextEngineeringPlan evidence. The MCP public schema must expose this fill policy because the handler already implements it. Turn descriptors are in `lib/semantic-intent/fill-sequence.ts:DTC_FILL_SEQUENCE`.

Turn map:
- T0 — `changeBoundary` (surfaces + non-touched scope)
- T1 — `branchProposalPolicy` + `permissionBoundary` (governance siblings)
- T2 — typed refs (`touchedOntologyRefs` + `permittedMutationSurfaces`)
- T3 — `replayMigrationPlan`
- T4 — `observabilityPlan` + `toolSurfaceReadiness`
- T5 — `evaluationPlan` + `requiredEvaluationRefs`
- T6 — finalize (verdict transitions to `dtc-filled`; triggers grading)

`dtc-turn-fill` is generic DTC boundary fill. For ontology-affecting DTC, do
not use this generic sequence as approval readiness. Use
`fillPolicy="ontology-dtc-build"` and complete the plugin-owned T0..T6 build
sequence:

- T0 — ObjectType
- T1 — LinkType
- T2 — ActionType
- T3 — Function
- T4 — Chatbot/Application State
- T5 — Replay/Eval/Validation
- T6 — ready-for-DTC

DATA, LOGIC, ACTION, and GOVERNANCE belong to SIC/context-engineering-to-sic
readiness. They are not substitutes for DTC ObjectType/LinkType/ActionType/
Function/ApplicationState/Eval readiness.

## Outputs
- Per turn: SemanticWorkbenchState.reviewCards[0] = current DTC turn card; SemanticWorkbenchState.dtcPanel = DtcPanelProjection
- On T6: `gradeDigitalTwinChangeContract` dispatches `dtc-rubric/v1`; on pass + user approval, envelope advances to `digital_twin_approved`

## Decision handling

Render each plugin-owned DTC TurnCard as ordinary assistant text in Claude,
Codex, and other runtimes. The authoritative decision data is
`TurnCardDecisionSpec`, not a runtime-native question widget. Record every user
reply as a `UserDecisionRecord` tied to the TurnCard `decisionId`, selected
choice, optional free text, evidence refs, and contract patch preview.

Do not advance SIC approval, DTC approval, or router dispatch while any
WorkflowContract blocking decision remains open. Treat `WorkflowContract` as the
plugin workflow binding represented by the `WorkContract` router contract.

## Session-first invariant

Start with `ontology_context_query` for read context, then use this skill only
after the SIC is approved and the FDE/context-plan evidence is available. The
produced DTC remains a contract artifact; it does not authorize mutation until
the approval reference and sprint/governance checks are present.
For ontology-affecting DTC, missing approved refs, `mutationAuthorized=false`,
router domain mismatch, open blocking TurnCards, and missing primitive readiness
remain hard blockers even when generic DTC fields look complete.

## Cross-references
- Workbench template: `workbenches/hitl-lead-feedback/templates/dtc-turn-card.md`
- Panel builder: `lib/chatbot-studio/dtc-panel-builder.ts`
- Rubric: `lib/lead-intent/dtc-grading-rubric.ts` (`dtc-rubric/v1`)
- Skill is docs-only; no MCP handler. Caller (`pm_semantic_intent_gate`) does the work.
