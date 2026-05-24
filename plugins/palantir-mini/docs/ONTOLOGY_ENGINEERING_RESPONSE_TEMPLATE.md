# palantir-mini Workflow Response Template

> Last audited: 2026-05-23.
> Authority: plugin-owned response contract for palantir-mini workflow turns.
> Compatibility path: this document keeps the historical Ontology Engineering
> filename because existing hooks and tests reference it.

This template is mandatory whenever a user prompt asks the assistant to work
under palantir-mini workflow control. It is not limited to Ontology Engineering.
It keeps the human-visible conversation aligned with plugin workflow state,
approved evidence, and runtime capability facts instead of private model
interpretation.

Ontology Engineering remains a stricter specialization. When a turn is
classified as Ontology Engineering, the FDE, SIC/DTC, TurnCardDecisionSpec,
UserDecisionRecord, and mutationAuthorized requirements below are mandatory.
For non-Ontology workflows, fields that do not apply must be shown as `N/A`
with a short reason instead of being omitted.

## Required Status Block

Every palantir-mini workflow reply must include:

- 현재 workflow phase
- 선택된 palantir-mini workflow 또는 workflow gap
- FDE session ref
- SIC/DTC 상태
- open TurnCardDecisionSpec 목록
- mutationAuthorized 여부
- 다음에 허용된 action
- native/runtime gap 여부
- SSoT 판단 근거

## Plain-Language Contract

The assistant must write for a non-developer unless the user asks for a
developer-only answer. The reply should separate:

- what this request means
- why this source is trusted
- what I am allowed to do now
- what needs user approval
- what gap or uncertainty remains
- confirmed facts
- plugin-derived recommendations
- assumptions
- runtime gaps
- what will not happen yet

Use short Korean explanations for the user-facing status and decision summary.
Use exact contract/tool/file names when those names are the authority.

## Runtime Gap Disclosure

Every reply must state the current hook/runtime truth plainly:

- Whether Claude hooks are native in the current runtime.
- Whether Codex is only manually mirroring Claude hook intent.
- Whether any hook claim is backed by native smoke evidence.
- Whether MCP, memory, skills, subagents, or managed settings are unavailable
  or only partially visible in the current runtime.

For Codex, the default disclosure is:

```text
Claude hooks are not proven native in Codex. I am manually mirroring the
palantir-mini hook intent unless a Codex-native smoke test proves that hook
surface for this turn.
```

Do not claim Claude/Codex hook, MCP, memory, skill, subagent, or managed-setting
parity without runtime-native evidence.

## SSoT Decision Basis

Every recommendation, judgment, decision card, or risk statement must explain
which source-of-truth evidence was used and what it was used for. The reply must
include an `SSoT 판단 근거` section with concise rows or bullets covering:

- `source/ref`: the concrete path, ref, MCP output, schema, hook, rule, or URL.
- `provenance/currentness`: whether it came from plugin snapshot, external
  research SSoT, live official docs, schema, hook policy, rule, or MCP output;
  include known freshness notes when available.
- `used-for judgment`: the exact recommendation, decision, or risk statement
  the source supported.
- `confidence/limit`: what the source proves, what it does not prove, and
  whether a runtime gap or live-refresh gap remains.

For Palantir-heavy turns, the SSoT basis should name the smallest relevant
evidence from:

- Palantir AIP Architecture / Context Engineering references.
- Palantir Ontology references.
- Palantir AIP Chatbot Studio references when the recommendation affects
  review surfaces, user-facing decision state, chatbot/application behavior, or
  application state.
- Palantir AI FDE references when the recommendation depends on FDE-style
  operational discovery, turn-by-turn intent surfacing, or human decision
  capture.
- palantir-mini plugin source, schema primitives, hook policy, rules, MCP
  outputs, and workflow state.
- generated mirrors are non-authority; caches and local loaders are consumer
  surfaces only.

If a source was selected from the plugin-vendored snapshot, say that it is a
plugin snapshot and do not imply live official-doc currentness. If live official
docs were checked, state that separately.

## Workflow Classification

The response must make the selected workflow visible:

- If a palantir-mini workflow is selected, name it.
- If no matching workflow is available, say `workflow/runtime gap`.
- If the task is read-only, say that mutation is not authorized and not needed.
- If the task needs mutation, name the contract, approval, hook, test, or
  validation gate that makes mutation allowed.
- If a router recommends delegation, say whether the current runtime can use
  the plugin-owned agent recipe natively or only approximate it through a
  runtime-native subagent.

Do not invent workflow semantics when the plugin tool, source, hook, or rule is
unavailable.

## User Decision Rendering

Do not use runtime-native question UI for workflow decisions. Render
WorkflowContract / TurnCardDecisionSpec as ordinary assistant text, then
interpret the user's plain-text answer as a UserDecisionRecord.

When asking for a decision, show:

- Decision title
- Why this decision matters
- SSoT decision basis
- Recommended option
- Alternatives
- Consequences
- What will not happen yet
- Required UserDecisionRecord format

Do not treat silence, vague agreement, or broad approval as approval for
unrelated mutation. Record only the approved decision.

## Minimal Korean Shape

```text
현재 workflow phase: <phase>
선택된 palantir-mini workflow 또는 workflow gap: <workflow name or gap>
FDE session ref: <fde-ref or N/A with reason>
SIC/DTC 상태: <state and refs, or N/A with reason>
open TurnCardDecisionSpec 목록: <none or ids>
mutationAuthorized 여부: <true/false and authority>
다음에 허용된 action: <next action>
native/runtime gap 여부: <Claude hook native status + Codex runtime gap + tool gaps>
SSoT 판단 근거:
- source/ref: <path, ref, MCP output, schema, hook, rule, or URL>
  provenance/currentness: <plugin snapshot, external SSoT, live official doc, schema, hook, rule, MCP output>
  used-for judgment: <which recommendation or risk this supported>
  confidence/limit: <what this proves and what remains unverified>

전후맥락 요약:
<1-3 plain Korean sentences for a non-developer>

확인된 사실:
<facts only>

plugin 기반 추천:
<recommendation and why>

가정:
<assumptions, or none>

runtime gap:
<gaps, or none>

이번 turn의 결정/추천:
<WorkflowContract or TurnCardDecisionSpec text, if a decision is open>

아직 하지 않는 일:
<mutation, routing, release, or scope expansion that is not authorized yet>
```

## Enforcement Surfaces

- `hooks/prompt-front-door-capture.ts` injects this template through
  UserPromptSubmit additional context when a prompt asks for palantir-mini
  mandatory workflow control or Ontology Engineering turns.
- `hooks/ontology-engineering-workflow-enforcement-gate.ts` injects this
  template through PreToolUse context when Ontology Engineering workflow tools
  or protected mutation surfaces are involved.
- `lib/ontology-engineering-response-template.ts` owns the required field list,
  generic workflow detection, backward-compatible Ontology Engineering aliases,
  and validation helper used by tests.

## Limits

Claude Code can enforce this through Claude-native hook context when the hook is
registered and firing. Codex must not pretend this is Claude-native hook parity:
Codex has to report whether it is using adapter-injected context, manual
mirroring, or smoke-proven native behavior for the current turn.

This template improves the assistant's visible behavior. It does not by itself
grant mutation authority, approve SIC/DTC, replace FDE provenance, or prove that
live Palantir official docs were checked.
