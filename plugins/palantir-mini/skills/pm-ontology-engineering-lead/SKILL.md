---
name: pm-ontology-engineering-lead
category: core-workflow
description: "Docs-only Lead workflow for session-first ontology engineering."
allowed-tools: mcp__palantir-mini__ontology_context_query mcp__palantir-mini__pm_semantic_intent_gate mcp__palantir-mini__pm_intent_router mcp__palantir-mini__emit_event Read
effort: medium
disable-model-invocation: false
palantirSurface:
  schemaVersion: palantir-mini/aip-fde-local-surface/v1
  surfaceKind: skill
  surfaceId: skill:pm-ontology-engineering-lead
  workflowFamily: ontologyEngineering
  phaseRefs:
    - ontology-engineering:context-load
    - ontology-engineering:dtc-authoring
  aipSurfaceRefs:
    - retrieval-context
    - tools-function
    - tools-request-clarification
    - security-governance
  palantirSourceAuthorityRefs:
    - localResearchPath: ~/.claude/research/palantir-foundry/ontology/overview.md
      externalUrl: https://www.palantir.com/docs/foundry/ontology/overview/
      lastVerified: 2026-05-24
      sourceClass: palantir-ontology
  requiredContracts:
    semanticIntent: required
    digitalTwinChange: required
    workContract: optional
    userDecisionRecord: required
  mutationCapability: proposal-only
  deterministicStatus: advisory-only
  runtimeProjection:
    claude:
      support: native
      evidenceRefs:
        - skills/pm-ontology-engineering-lead/SKILL.md
        - bridge/handlers/pm-ontology-engineering-workflow.ts
      fallbackObligations: []
      unsupportedSurfaceRefs: []
      smokeEvidenceRefs: []
    codex:
      support: adapter-native
      evidenceRefs:
        - bridge/handlers/pm-ontology-engineering-workflow.ts
      fallbackObligations:
        - Render TurnCardDecisionSpec as ordinary text when native question UI is unavailable.
        - Keep implementation blocked until approved SIC/DTC refs or explicit runtime gap boundary exists.
      unsupportedSurfaceRefs:
        - codex:runtime-native-question-ui
      smokeEvidenceRefs: []
  outputStateRefs:
    - semanticIntentContractRef
    - digitalTwinChangeContractRef
    - fdeOntologyEngineeringSessionRef
  validationRefs:
    - tests/skills/pm-ontology-engineering-lead.test.ts
    - tests/lib/fde-ontology-engineering/session-core.test.ts
  unsupportedParityClaimsForbidden: true
---

# pm-ontology-engineering-lead

Session-first Lead workflow for ontology engineering. This skill is docs-only:
it does not register a public MCP tool and it does not authorize mutation.

## When to use

- The user asks to begin an ontology engineering implementation.
- The work touches FDE readiness, DTC authoring, schema, routing, audit,
  replay, evaluation, or release behavior.
- A Lead needs a stable handoff recipe for other agents without copying runtime
  semantics into local agent overlays.

## Session-first flow

1. Load read context with `ontology_context_query` before implementation:

```typescript
mcp__palantir-mini__ontology_context_query({
  project: "<project-root>",
  scopePaths: ["<narrow path or surface>"],
  requestedAxes: ["aip-3-context-engineering", "aip-4-ontology"],
  includeDTCContext: true,
});
```

2. Call `pm_semantic_intent_gate` with the prompt-front-door identity fields
   when available. Treat returned SIC/DTC drafts as evidence only until the user
   approval reference exists.
3. If DTC fields must be authored turn-by-turn, call
   `pm_semantic_intent_gate` with one `turn` at a time. Use
   `fillPolicy: "dtc-turn-fill"` only for generic non-ontology DTC boundary
   authoring. Use `fillPolicy: "ontology-dtc-build"` for ontology-affecting DTC
   and complete T0 ObjectType, T1 LinkType, T2 ActionType, T3 Function, T4
   Chatbot/Application State, T5 Replay/Eval/Validation, and T6 ready-for-DTC
   before approval or routing.
4. Render the plugin-owned TurnCard as ordinary assistant text in every
   runtime. Claude and Codex consume the same `TurnCardDecisionSpec`; the user's
   answer is recorded as a `UserDecisionRecord`, not as runtime-local workflow
   authority.
5. Do not advance SIC approval, DTC approval, or router dispatch while any
   WorkflowContract blocking decision remains open. Treat `WorkflowContract` as
   the plugin workflow binding represented by the `WorkContract` router
   contract.
6. Route only after approved `semanticIntentContractRef` and
   `digitalTwinChangeContractRef` are available.
7. Use project docs and `/home/palantirkc/docs/**` only as
   `reference_only` / `not_promoted` evidence unless a later approved contract
   explicitly promotes them.

## Handoff fields

```text
Project:
Prompt identity:
Ontology context summary:
SemanticIntentContract ref:
DigitalTwinChangeContract ref:
Evidence refs:
Reference-only docs:
Approved scope:
Non-goals:
Verification:
Runtime gaps:
UserDecisionRecord refs:
WorkflowContract blocking decisions:
```

## Hard boundaries

- Do not edit generated files directly.
- Do not promote reference evidence to authority by naming it in a skill doc.
- Do not dispatch implementation from inferred Lead meaning.
- Do not bypass `pm_semantic_intent_gate` for ontology-affecting raw intent.
- DATA/LOGIC/ACTION/GOVERNANCE are SIC/context-engineering lanes only; do not
  use them as DTC primitive readiness.
- Treat `mutationAuthorized=false`, router domain mismatch, missing approved
  refs, open blocking TurnCards, and missing ObjectType/LinkType/ActionType/
  Function/ApplicationState/Eval readiness as hard blockers.
