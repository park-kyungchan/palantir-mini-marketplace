# Best Practice Prompts

These prompts are reusable across palantir-mini Ontology Engineering work. They
ask the agent to create a Human-in-the-Loop artifact before the next semantic
step.

HTML variants are allowed only when the user explicitly requested HTML or an
interactive artifact. Without that request, create the review card version.

## Semantic Intent Review

```text
Create a HITL review artifact for this user request. Use HTML only if the user
explicitly requested HTML or an interactive artifact.

Stage: SemanticIntentContract review.
Show:
- what Lead inferred,
- approved nouns and verbs,
- affected surfaces,
- non-goals,
- unresolved questions,
- approve / revise / cancel choices,
- the exact next prompt to paste back after user review.

Do not expose raw contract JSON as the primary UI. Put user-facing language
first and raw refs second.
```

## Research Framing Review

```text
Create a source-review artifact for this ontology engineering task.

Stage: research framing.
Group evidence by claim, label each source as official, local authority,
runtime evidence, practitioner guidance, or unsupported. Show what would
change if a source is removed. Include a copyable response that says which
claims the user approves or rejects.

If HTML was requested, first verify `sources/required-sources.json`. If any
required source is blocked, return a blocked report instead of HTML.
```

## Ontology Candidate Review

```text
Create an ontology candidate playground.

Stage: ontology modeling.
Show proposed objects, actions, properties, routes/views/agents/scenarios, and
their evidence. Let the user mark each candidate as accept, rename, split,
merge, reject, or needs evidence. Export the final review as a prompt.
```

## DTC Boundary Review

```text
Create a Digital Twin boundary review artifact.

Stage: DTC boundary.
Show changeBoundary, permissionBoundary, branchProposalPolicy,
replayMigrationPlan, observabilityPlan, toolSurfaceReadiness, evaluationPlan,
risks, approvalRef placeholder, runtime gaps, and next allowed actions. Ask the
user to approve, revise, or hold before mutation.
```

## Delegation Review

```text
Create a routing review artifact.

Stage: router/delegation.
Compare lead-direct, bounded subagent, multi-agent split, and hold. For each,
show ownership, expected context cost, verification plan, rollback boundary,
and what the parent session will retain. Export the chosen route as a prompt.
```

## Implementation Review

```text
Create an implementation review HTML artifact.

Stage: implementation review.
Render the intended changes, critical files, risk boundaries, test plan,
rollback path, and unresolved decisions. Include a copyable prompt with the
user's requested changes.

Before creating HTML, include the selected pattern and source refs from
`patterns/html-hitl-pattern-taxonomy.md` in metadata. If evidence is blocked,
return a blocked report.
```

## Eval And Lineage Closeout

```text
Create an evaluation and lineage closeout artifact.

Stage: eval/lineage/backprop.
Show what passed, what failed, what should be recorded for future routing, what
should not be learned, and the exact BackPropagation/recap note to preserve.
```
