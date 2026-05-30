---
name: pm-hitl-feedback-workbench
category: core-workflow
description: "Use the generic HITL Lead Feedback Workbench to create user-review artifacts for any..."
allowed-tools: Read
effort: low
disable-model-invocation: false
---

# pm-hitl-feedback-workbench

Use this skill when ontology engineering work needs user feedback before the
Lead proceeds.

This is a docs-only skill. It does not approve mutation, create contracts,
modify schemas, add MCP handlers, or tighten hooks.

## Read Order

1. `workbenches/hitl-lead-feedback/BROWSE.md`
2. `workbenches/hitl-lead-feedback/INDEX.md`
3. `workbenches/hitl-lead-feedback/SOURCE_POLICY.md`
4. `workbenches/hitl-lead-feedback/sources/required-sources.json`
5. `workbenches/hitl-lead-feedback/patterns/html-hitl-pattern-taxonomy.md`
6. `workbenches/hitl-lead-feedback/templates/html-artifact-recipes.md`
7. `workbenches/hitl-lead-feedback/templates/lead-feedback-review-card.md`
8. The smallest matching template under `workbenches/hitl-lead-feedback/templates/`

## Workflow

1. Identify the ontology engineering stage:
   - prompt front door
   - research framing
   - ontology modeling
   - DTC boundary
   - router/delegation
   - implementation review
   - evaluation
   - lineage closeout
2. Call or consult `pm_semantic_intent_gate` first when the prompt may affect
   ontology, schema, routing, evaluation, replay, permission, or runtime
   behavior.
3. Apply the HTML request gate:
   - if the user explicitly requested HTML, check source readiness and choose a
     pattern from the taxonomy;
   - if HTML was not explicit, use the review card or text response;
   - if source evidence is blocked, return a blocked report instead of HTML.
4. Create a review artifact before mutation when user confirmation is needed.
5. Use user-facing language first. Put raw refs and internal contract fields
   second.
6. Render the same plugin-owned TurnCard as ordinary assistant text in Claude,
   Codex, and other runtimes. The authoritative decision data is
   `TurnCardDecisionSpec`, not a runtime-native question widget.
7. Record each user reply as a `UserDecisionRecord` tied to the TurnCard
   `decisionId`, selected choice, optional free text, evidence refs, and
   contract patch preview.
8. Do not advance SIC approval, DTC approval, or router dispatch while any
   WorkflowContract blocking decision remains open. Treat `WorkflowContract` as
   the plugin workflow binding represented by the `WorkContract` router
   contract.
9. Offer clear choices:
   - approve
   - revise
   - cancel
   - hold before mutation
10. Export a copyable prompt that carries the user's feedback into the next turn.

## Artifact Contract

Every artifact should include:

```text
Stage:
Prompt ref:
Runtime:
Lead inference:
Evidence refs:
User choices:
State effect if approved:
Runtime gaps:
UserDecisionRecord refs:
WorkflowContract blocking decisions:
Next allowed actions:
Copy prompt:
```

## Guardrails

- Do not treat a generated artifact as approval by itself.
- Do not create HTML unless the user explicitly requested HTML or an
  interactive artifact.
- Do not cite blocked sources as passing HTML evidence.
- Do not claim Codex native parity unless verified.
- Do not use third-party mirrors for trq212 source evidence.
- Do not add or remove tools mid-session to represent review stages.
- Do not expose raw JSON as the primary user review surface.
