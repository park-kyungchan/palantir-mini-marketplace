# HITL Lead Feedback Workbench

This workbench helps palantir-mini produce Human-in-the-Loop artifacts for
Ontology Engineering work.

It is generic. The trq212 source pack is evidence for artifact and interaction
patterns, not a one-off workflow and not official Claude runtime authority.

HTML is request-gated. If the user did not explicitly ask for HTML or an
interactive artifact, use a review card or text response instead.

## When To Use

Use this workbench when the Lead needs user feedback before continuing any
ontology-affecting or boundary-sensitive step:

- Semantic meaning confirmation.
- Research or evidence framing.
- Ontology noun, action, property, route, view, agent, or scenario modeling.
- Digital Twin change-boundary review.
- Router, delegation, or implementation plan review.
- Evaluation, lineage, or BackPropagation closeout review.

## Core Thesis

Human-in-the-Loop should not be a raw markdown note or hidden Lead inference.
It should be a reviewable artifact that lets the user see, approve, revise, or
cancel the next semantic step.

The artifact should make five things explicit:

1. What Lead inferred.
2. What evidence supports the inference.
3. What the user can change now.
4. What state or contract will change after approval.
5. What the next legal action is.

## Palantir-Mini Integration

Use the existing projection path. Do not invent a new runtime API:

```text
pm_semantic_intent_gate
  -> userReviewCard + SemanticConversationState
  -> SemanticWorkbenchState-style projection
  -> static HTML / review-card artifact
  -> user answer
  -> next allowed action
```

For every runtime, render the plugin-owned WorkflowContract turn-card decision
semantics. Codex, Claude, and other runtimes must not swap in a runtime-native
question UI.

When no explicit HTML artifact is requested, present
the review card manually and record the gap.

## HTML HITL Request Gate

Before producing HTML, read `BROWSE.md`. The gate is:

- explicit HTML request present -> continue to source policy and recipe
- explicit HTML request absent -> use `templates/lead-feedback-review-card.md`
- required source evidence blocked -> return a blocked report, not HTML

HTML artifacts must stay inside the SSoT recipe:

```text
plain summary -> decision surface -> evidence -> export prompt
```

The artifact metadata must name the selected pattern, source refs, recipe ref,
request gate, and runtime gaps.

## Workbench Files

- `BROWSE.md` - minimal HTML request gate and read router.
- `INDEX.md` - source status, pattern taxonomy, and application map.
- `SOURCE_POLICY.md` - source rules for this evidence pack.
- `sources/required-sources.json` - required source manifest and blocked status.
- `sources/claim-map-2026-05-21.md` - initial direct-probe claim map.
- `sources/index.md` - source registry.
- `patterns/html-hitl-pattern-taxonomy.md` - task-specific HTML patterns.
- `patterns/ontology-engineering-stage-map.md` - stage-by-stage HITL map.
- `patterns/trq212-patterns.md` - direct-source pattern synthesis.
- `templates/html-artifact-recipes.md` - request gate, recipes, and metadata.
- `templates/best-practice-prompts.md` - reusable prompt templates.
- `templates/lead-feedback-review-card.md` - user-facing review-card template.
- `templates/hitl-artifact-brief.md` - artifact request template.
- `playground.html` - generic interactive artifact shell.
- `examples/dtc-conversation-gap-pilot.html` - pilot review artifact.

## Guardrails

- Do not use third-party mirrors or cached copies as evidence.
- Do not create HTML unless the user explicitly requested it.
- Do not use blocked sources as passing HTML metadata refs.
- Do not copy full X articles into this workbench.
- Do not edit schemas, handlers, hooks, generated files, or shared-core from
  this workbench alone.
- Do not treat this workbench as DTC approval. It helps obtain approval; it does
  not replace approval provenance.
- Keep runtime gaps explicit.

## Minimum Artifact Contract

Every HITL artifact should include:

- `stage`
- `leadInference`
- `evidenceRefs`
- `userChoices`
- `stateEffect`
- `nextAllowedActions`
- `runtimeGaps`
- `copyPrompt`

For HTML artifacts, this contract is extended by
`templates/html-artifact-recipes.md`.
