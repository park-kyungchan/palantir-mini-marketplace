---
name: pm-semantic-intent-gate
category: core-workflow
surfaceStatus: public-core
description: "Maintain the FDE-to-contract front door: FDE meaning discovery, SIC boundary, DTC..."
allowed-tools: mcp__palantir-mini__ontology_context_query mcp__palantir-mini__pm_ontology_engineering_workflow mcp__palantir-mini__pm_semantic_intent_gate mcp__palantir-mini__pm_intent_router mcp__palantir-mini__emit_event
effort: medium
disable-model-invocation: false
palantirSurface:
  schemaVersion: palantir-mini/aip-fde-local-surface/v1
  surfaceKind: skill
  surfaceId: skill:pm-semantic-intent-gate
  workflowFamily: semanticIntentAndRouting
  phaseRefs:
    - semantic-routing:prompt-contract
    - semantic-routing:router-dispatch
  aipSurfaceRefs:
    - instructions-descriptions
    - tools-function
    - tools-request-clarification
    - security-governance
  palantirSourceAuthorityRefs:
    - localResearchPath: ~/.claude/research/palantir-official/foundry/chatbot-studio/tools.md
      externalUrl: https://www.palantir.com/docs/foundry/chatbot-studio/tools/
      lastVerified: 2026-05-24
      sourceClass: palantir-chatbot-studio
  requiredContracts:
    semanticIntent: required
    digitalTwinChange: optional
    workContract: optional
    userDecisionRecord: optional
  mutationCapability: none
  deterministicStatus: enforced
  runtimeProjection:
    claude:
      support: native
      evidenceRefs:
        - skills/pm-semantic-intent-gate/SKILL.md
        - bridge/handlers/pm-semantic-intent-gate.ts
      fallbackObligations: []
      unsupportedSurfaceRefs: []
      smokeEvidenceRefs: []
    codex:
      support: adapter-native
      evidenceRefs:
        - bridge/handlers/pm-semantic-intent-gate.ts
      fallbackObligations:
        - State prompt-front-door envelope gaps when Codex cannot dereference current prompt refs.
      unsupportedSurfaceRefs:
        - codex:prompt-front-door-envelope-dereference
      smokeEvidenceRefs: []
  outputStateRefs:
    - fdeOntologyEngineeringSessionRef
    - semanticIntentContractRef
    - digitalTwinChangeContractRef
    - RouterBinding
  validationRefs:
    - tests/bridge/handlers/pm-semantic-intent-gate.test.ts
    - tests/bridge/handlers/pm-intent-router.test.ts
  unsupportedParityClaimsForbidden: true
---

# pm-semantic-intent-gate

Use this skill for Lead-visible user prompts that may become ontology memory,
and especially before implementation when a request can change ontology,
schema, agent routing, evaluation, replay, migration, permission, or Digital
Twin runtime behavior.

**Design grounding (before the 9-axis / SIC / DTC / build):** SCAN
`~/harness-upstream/ssot/README.md` → `ssot/palantir/BROWSE.md` → `INDEX.md` →
smallest slice and inject ONLY the needed slice — the WHY behind
9-axis/DTC/OSDK-binding/lineage (DESIGN-authority). Design grounds, source
governs; this is distinct from the raw research firehose
(`~/.claude/research/palantir-official/foundry/`) and from pm's source-authority
(`.ssot-authority.json`).

## FDE-First Meaning Boundary

`SemanticIntentContract` is not the first place where user meaning is
discovered. For ontology-affecting work, the Lead and user surface implicit
meaning turn-by-turn in `FDEOntologyEngineeringSession` first. The SIC records
the user-approved boundary that falls out of that FDE conversation: approved
nouns, verbs, affected surfaces, non-goals, source evidence, and completion
criteria.

`DigitalTwinChangeContract` is not built directly from the raw user request.
Author it only after the approved SIC is tied to the FDE session and a
ContextEngineeringPlan has DATA, LOGIC, ACTION, technology recommendation, and
validation-plan evidence. If those inputs are missing, emit or return an
unready draft/TurnCard; do not route mutation from raw prompt text.

## Workflow

1. For ontology-engineering or control-plane work, call or continue
   `mcp__palantir-mini__pm_ontology_engineering_workflow` so the FDE session
   captures turn-by-turn meaning and accepted/rejected hypotheses.
2. Call `mcp__palantir-mini__ontology_context_query` for the current project
   and relevant scope so DATA/LOGIC/ACTION evidence and runtime gaps are visible.
3. Call `mcp__palantir-mini__pm_semantic_intent_gate` with:
   - `project`
   - `rawIntent`
   - `promptId` / `promptHash` / `sessionId` / `runtime` from the
     prompt-front-door envelope when a `UserPromptSubmit` capture is available
   - `fdeOntologyEngineeringSessionRef` when available
   - likely `scopePaths`
   - `complexityHint`
   - existing contract refs or inline contracts if already approved
   - `draftMode: "always"` unless you are deliberately exercising a legacy
     required-only path
4. If `status` is `not_required`, proceed to `pm_intent_router`, but preserve
   the returned ambient draft contracts as semantic/lineage evidence.
5. If `status` is `contract_required` or `blocked_for_clarification`, stop
   implementation and close the material ambiguity first.
6. Render each plugin-owned `TurnCardDecisionSpec` from the returned
   `decisionSpec` fields as ordinary assistant text. Claude, Codex, and other
   runtimes use the same TurnCard content; runtime-native question widgets are
   presentation details, not workflow authority.
7. Record each user reply as a `UserDecisionRecord` tied to the TurnCard
   `decisionId`, selected choice, optional free text, evidence refs, and any
   resulting contract patch preview.
8. Do not mark a contract `approved` without a concrete `approvalRef` from the
   user or an approved proposal record.
9. Do not advance SIC approval, DTC approval, or router dispatch while any
   WorkflowContract blocking decision remains open. Treat `WorkflowContract` as
   the plugin workflow binding represented by the `WorkContract` router
   contract.
10. Pass approved `semanticIntentContractRef` and `digitalTwinChangeContractRef`
   into `mcp__palantir-mini__pm_intent_router` before dispatch.

## 8-Turn Fill Sequence (PR 5.10)

For complex or ambiguous prompts, use the progressive fill workflow to enrich a
SemanticIntentContract through 8 deterministic boundary-recording turns
(T0…T7). These turns are not a replacement for FDE meaning discovery; they
record the approved output of that discovery into a contract boundary.

Call the gate with `turn: <0-7>` plus an optional `turnUserInput` string. Each
invocation appends one `SicFillStep` to `fillSequence`. The result includes a
`fillResult` object with:

- `appliedTurn` — turn just applied.
- `question` — the question posed at this turn.
- `contract` — enriched SIC after this step.
- `fillComplete` — true when all 8 steps + required fields are populated.
- `fillIncomplete` — advisory message when T7 completes but fields are missing.
- `nextQuestion` — the question for the next turn (absent after T7).

Turn mapping:
- **T0** — record prompt identity / FDE seed evidence; any auto-extraction is draft-only.
- **T1** — smallest scope to change → affectedSurfaces.
- **T2** — approved nouns and verbs (CSV) → approvedNouns + approvedVerbs.
- **T3** — non-goals (CSV) → nonGoals.
- **T4** — downstream allowed|forbidden (pipe-separated CSV) → downstreamAllowed + downstreamForbidden.
- **T5** — source of truth for evidence → seedRid.
- **T6** — verdict criteria → gradeRubricRid.
- **T7** — finalize; sets verdict="filled" + emits semantic_intent_contract_finalized event.

Callers that do not supply `turn` get the existing single-shot SIC draft
creation behavior unchanged. Treat that result as draft lineage evidence, not
approved meaning.

## DTC Turn Fill Sequence

For DigitalTwinChangeContract authoring, call the same MCP with
`fillPolicy: "dtc-turn-fill"` and `turn: <0-6>`. This is session-first:
load read context with `ontology_context_query`, preserve prompt identity fields,
require an approved SIC, preserve the FDE session ref, and fill one DTC turn at
a time from ContextEngineeringPlan evidence. A DTC produced by this path is
still a contract artifact, not mutation authority, until the user approval
reference is captured and routing receives the approved SIC/DTC refs.

`dtc-turn-fill` is a generic DTC boundary-authoring path. It does not prove
ontology primitive readiness for ontology-affecting work. When a DTC can affect
ontology, schema, routing, action, evaluation, ApplicationState, or other
Digital Twin runtime behavior, use `fillPolicy: "ontology-dtc-build"` and
complete all T0..T6 turns before approval or routing:

- **T0** — ObjectType readiness.
- **T1** — LinkType readiness.
- **T2** — ActionType readiness.
- **T3** — Function readiness.
- **T4** — Chatbot/Application State readiness.
- **T5** — Replay/Eval/Validation readiness.
- **T6** — `ready-for-DTC` verdict.

DATA, LOGIC, ACTION, and GOVERNANCE are valid phase labels only while authoring
or enriching SIC through `fillPolicy: "context-engineering-to-sic"`. Do not
treat those SIC/context-engineering lanes as DTC primitive readiness. For
ontology-affecting DTC, missing approved SIC/DTC refs, `mutationAuthorized=false`,
router domain mismatch, open blocking TurnCards, or missing ObjectType/LinkType/
ActionType/Function/ApplicationState/Eval readiness are hard blockers.

## Hook Integration

- `prompt-front-door-capture` is the canonical sync `UserPromptSubmit` capture.
  It writes the prompt envelope/current pointer and asks the runtime to call
  this gate with prompt identity fields.
- Legacy prompt heuristics such as `complex-task-detector`,
  `user-prompt-overlay-advisory`, and `user-prompt-ontology-intent-extract`
  are downstream governance/advisory only. They do not prove user intent or DTC
  approval.

## Guardrails

- Do not revive the removed legacy semantic planning handler.
- Do not use realtime monitors for this gate.
- Treat read-only triage as routable when the gate returns `not_required`, but
  do not drop the ambient SemanticIntentContract and DigitalTwinChangeContract
  drafts.
- Treat a Lead inference as a draft only; user meaning is not approved until the
  approval reference is captured.
- Keep TurnCard decision axes project-neutral: operational nouns, operational
  verbs, decision logic, security, application surface, branch/proposal policy,
  evaluation, and lineage.
- For large UI migrations, keep a separate progressive QA loop after the
  contract is approved: TypeScript checks, runtime smoke, Playwright MCP
  functional QA, visual QA, mobile/desktop viewport QA, and exploratory pass.

## Output Shape

When handing off to another agent, include:

```text
SemanticIntentContract ref:
DigitalTwinChangeContract ref:
Approved nouns:
Approved verbs:
Affected surfaces:
Downstream allowed:
Downstream forbidden:
Open risks:
QA loop required:
```
