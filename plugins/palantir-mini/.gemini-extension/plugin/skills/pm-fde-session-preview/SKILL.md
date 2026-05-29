---
name: pm-fde-session-preview
category: core-workflow
description: "Show a read-only FDE Ontology Build Session preview — mission/object/link/action/func..."
allowed-tools: mcp__palantir-mini__ontology_context_query mcp__palantir-mini__emit_event Read
effort: medium
disable-model-invocation: false
---

# pm-fde-session-preview — FDE Ontology Build Session (read-only)

## Purpose

비개발자 사용자에게 현재 FDE Ontology Build Session의 read-only preview를 보여줍니다.
다음 질문들에 답합니다:
- Mission이 명확한가?
- Object / link type이 정의됐나?
- Action writeback이 준비됐나?
- Chatbot Studio 설정이 있는가?
- Eval/observability suite가 연결됐나?
- Semantic approval 준비가 됐나?

## When to use

- 사용자가 "FDE readiness", "ontology build status", "build gap", "preview session" 등을 요청할 때.
- `/palantir-mini:pm-fde-session-preview` 가 명시적으로 호출될 때.
- Lead가 현재 프로젝트의 ontology build 상태를 빠르게 파악해야 할 때.

## NOT for

- Mutation 작업 (commit/apply/approve). 이 skill은 read-only preview만 제공합니다.
- SemanticIntentContract 생성. 그것은 `pm_semantic_intent_gate` MCP를 통해서만 가능합니다.
- DigitalTwinChangeContract 생성. 그것은 SIC + sprint + governance pipeline이 필요합니다.

## Invocation pattern

### Step 1 — Fetch ontology context

```
mcp__palantir-mini__ontology_context_query({
  project: "<project-root>",
  scopePaths: ["<relevant ontology, contract, skill, or runtime paths>"],
  requestedAxes: ["aip-3-context-engineering", "aip-4-ontology"],
  includeDTCContext: true
})
```

이 결과가 `OntologyContextQueryResult`입니다.

### Step 2 — Compose the session (in-memory, pure)

```typescript
import { composeFDEOntologyBuildSession } from "lib/fde-build";

const session = composeFDEOntologyBuildSession({
  project: "<project-root>",
  ontologyContext: <from Step 1>,
  semanticIntentContract: <optional; from prior SIC approval>,
  digitalTwinChangeContract: <optional; from prior DTC approval>,
  semanticConversationState: <optional; from chatbot-studio/semantic-conversation-state.ts>,
});
```

### Step 3 — Present to the user in plain language

다음 형식으로 요약합니다:

```
# FDE Ontology Build Session Preview

**Status**: <session.plainLanguageStatus>
**Readiness**: <session.readiness>
**Read-only**: <session.readOnly> (mutation not authorized)

## Completed Levels
<session.completedLevels.join(", ") or "None yet">

## Top Gaps (<session.topGaps.length>)
<for each gap: "- [<severity>] <level>: <description>\n  → <recommendedAction>">

## Next Question
<session.nextQuestion or "All levels clear — ready for semantic approval.">

## Summary by Level
- Mission: <session.missionDecision?.useCaseName ?? "not defined">
- Objects: <session.objectTypes.length> types reviewed
- Links: <session.linkTypes.length> link types reviewed
- Actions: <session.actionWriteback.length> actions reviewed
- Functions: <session.functions.length> functions reviewed
- Chatbots: <session.chatbotStudio.length> chatbots reviewed
- AI/FDE Boundary: <"reviewed" if session.aiFdeMcpBoundary else "not yet reviewed">
- Branch/Release: <"reviewed" if session.branchRelease else "not yet reviewed">
- Eval/Observability: <session.evalObservability?.evalSuiteName ?? "not yet reviewed">
```

### Step 4 — Emit lineage event

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "fde-session-preview-shown",
    taskId: session.sessionRid,
    readiness: session.readiness,
    topGapCount: session.topGaps.length
  },
  withWhat: {
    reasoning: "FDE Ontology Build Session previewed for project <project>. Readiness: <readiness>. Top gap count: <N>. This is a read-only projection — no mutation authorized.",
    memoryLayers: ["episodic"]
  }
})
```

## Mutation invariants (critical)

**`mutationAuthorized: false` is a LITERAL TYPE on FDEOntologyBuildSession.**

This skill MUST NOT:
- Call `mcp__palantir-mini__commit_edits` based on this session.
- Call `mcp__palantir-mini__apply_edit_function` based on this session.
- Generate any `commitToken`, `applyToken`, `approvalToken`, or `authorizeMutation` value.
- Proceed past read-only presentation without the user explicitly requesting mutation.

Mutation authority lives in:
1. `SemanticIntentContract` (created via `pm_semantic_intent_gate`)
2. `DigitalTwinChangeContract` (authored through session-first DTC fill or an
   approved DTC ref)
3. Sprint + governance pipeline

The read-only ladder (`not-ready → ... → ready-for-semantic-approval`) describes **readiness**, not permission. Even at `ready-for-semantic-approval`, mutation still requires a bound SIC + DTC.

## NOT in MCP TOOLS

This skill is skill-only. It is NOT registered in `bridge/mcp-server.ts` TOOLS array.
Direct invocation is via `/palantir-mini:pm-fde-session-preview`.

## Authority + cross-refs

- Schema primitive: `runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session.ts`
- Composer: `lib/fde-build/session-composer.ts`
- Level builders: `lib/fde-build/level-builders.ts`
- Readiness evaluator: `lib/fde-build/readiness-evaluator.ts`
- Plan: `~/.claude/plans/splendid-mapping-lemur.md` (sprint-138 Slice 1)
- Gap analysis brief: `~/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md`
