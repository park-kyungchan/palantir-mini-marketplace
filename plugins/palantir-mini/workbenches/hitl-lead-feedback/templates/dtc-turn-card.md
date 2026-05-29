---
templateId: dtc-turn-card
stage: dtc-fill-turn
schemaVersion: palantir-mini/dtc-turn-card/v1
appliesTo: DTC_FILL_SEQUENCE turn cards (T0-T6)
provenance: Sprint-WIP-DTC (2026-05-15)
---

# DTC Fill Turn {{turnNumber}} of 7 — {{targetField}}

## stage
dtc-fill-turn

## leadInference
{{leadInferenceProse}}

## evidenceRefs
{{evidenceRefsBulleted}}

## sourceMaterialGuard
`rawIntent` is trace identity only. DTC recommendations must cite the approved SIC ref, FDE session ref, ContextEngineeringPlan review cards, technologyRecommendation, and validationPlan. If any of these are missing, mark the DTC unready instead of filling from the raw prompt.

비개발자 설명: prompt를 바로 실행하지 않습니다. FDE 대화에서 의미를 확인하고, SIC는 그 승인 경계를 기록합니다. DTC는 승인된 SIC, FDE session, ContextEngineeringPlan(DATA/LOGIC/ACTION), 기술 추천, 검증 계획에서만 만듭니다.

## ontologyDtcBuildGuard
For ontology-affecting DTC cards, use `fillPolicy: "ontology-dtc-build"` and show all readiness labels before requesting approval:
- T0 ObjectType readiness
- T1 LinkType readiness
- T2 ActionType readiness
- T3 Function readiness
- T4 Chatbot/Application State readiness
- T5 Replay/Eval/Validation readiness
- T6 ready-for-DTC verdict

DATA, LOGIC, ACTION, GOVERNANCE, and TECHNOLOGY are SIC/context-engineering lanes, not DTC primitive readiness labels. If ObjectType, LinkType, ActionType, Function, Chatbot/Application State, or Replay/Eval/Validation evidence is missing, the card must stay unready.

## userChoices
- approve-recommendation: {{recommendedAnswer}}
- revise: User provides revised answer; agent re-drafts contract field
- auto-fill: Agent runs {{autoFillStrategy}} via MCP impact_query
- hold: Pause DTC fill; return to SIC review

## stateEffect
On approve: DTC.{{targetField}} = "{{recommendedAnswer}}"; advance to T{{turnNumber + 1}}
On revise: DTC stays in T{{turnNumber}}; user-provided answer captured
On auto-fill: Agent invokes {{autoFillStrategy}}; result requires user re-confirmation
On hold: DTC fill sequence paused; envelope stays at digital_twin_drafted

## nextAllowedActions
{{nextAllowedActionsList}}

## runtimeGaps
{{runtimeGapsList}}

## copyPrompt
```
pm_semantic_intent_gate({
  project: "{{projectPath}}",
  rawIntent: "{{rawIntent}}",
  fillPolicy: "ontology-dtc-build",
  turn: {{turnNumber}},
  turnUserInput: "<user answer here>",
  promptId: "{{promptId}}",
  ...
})
```
