# HTML Artifact Recipes

Use this file only after `BROWSE.md` confirms explicit HTML request.

## Request Gate

```yaml
HITLHtmlRequestGate:
  explicitHtmlRequested: true
  htmlRequestSignal: "<quote or paraphrase of the user's HTML request>"
  defaultNoHtmlBehavior: "lead-feedback-review-card"
  blockedReason: null
```

If `explicitHtmlRequested` is false, stop and use
`templates/lead-feedback-review-card.md`.

If required source evidence is blocked, stop and return the blocked report
recipe below.

## Required Sections

Every HTML artifact must include these sections in this order:

1. Plain summary
2. Decision surface
3. Evidence
4. Export prompt

Raw JSON, long logs, or long Markdown can appear only in collapsed secondary
details after the plain summary and decision surface.

## Metadata Block

Every artifact must embed metadata like this:

```html
<script type="application/json" id="hitl-html-metadata">
{
  "schemaVersion": "hitl-html-artifact/v1",
  "selectedPattern": "evidence-map",
  "requestGate": {
    "explicitHtmlRequested": true,
    "htmlRequestSignal": "user asked for HTML"
  },
  "recipeRef": "templates/html-artifact-recipes.md#evidence-map",
  "sourceRefs": [
    "sources/required-sources.json#openai-gpt-5-5-latest-model"
  ],
  "runtimeGaps": [],
  "exportFormat": "copy-prompt"
}
</script>
```

The metadata must cite the selected pattern and source refs. Do not cite a blocked source as passing evidence.

## Blocked Report Recipe

Use this when HTML was requested but evidence is incomplete.

```text
Stage:
Requested artifact:
Selected pattern candidate:
Blocked source IDs:
Missing evidence classes:
Direct capture attempts:
What the user can provide:
Next allowed action:
Copy prompt:
```

Blocked reports are text or review-card artifacts, not placeholder HTML files.

## Pattern Recipes

### Task Framing Canvas

Use for ambiguous intent.

Required controls:

- goal field
- non-goal field
- constraint chips
- success criteria list
- approve/revise/cancel choices
- copy prompt

Required source refs:

- `patterns/html-hitl-pattern-taxonomy.md#patterns`
- at least one complete source supporting task framing or direct manipulation

### Side-by-Side Option Board

Use when multiple alternatives are viable.

Required controls:

- aligned option columns
- tradeoff rows
- risk labels with text
- recommendation marker
- select/export control

### Plan Surface + Progress Stream

Use for long-running or multi-step work.

Required controls:

- planned/current/done/blocked states
- next approval point
- hold control
- export current plan prompt

### Autonomy Control Panel

Use when agent autonomy is the user decision.

Required controls:

- ask-before-action mode
- bounded autonomy mode
- full hold mode
- permitted surfaces
- stop conditions

### Confirmation Gate + Rollback Receipt

Use before mutation, PR, merge, permission, schema, or DTC changes.

Required controls:

- before/after summary
- explicit approval control
- rollback path
- affected surfaces
- next legal action

### Evidence Map

Use for research-heavy tasks.

Required controls:

- claim-source-confidence-gap table
- include/exclude source controls
- add-source prompt
- blocked-source explanation
- export approved source set

### Direct Manipulation Sandbox

Use when the user must tune a route, prompt, ontology candidate, priority, or
UI state.

Required controls:

- direct manipulation control
- reset
- inline edit or toggle
- copy prompt
- visible unsaved-change state

### Generated Dashboard/Report

Use for QA, audit, status, or findings.

Required controls:

- metrics
- timeline or grouped findings
- filters
- severity labels with text
- export summary

### Handoff Packet

Use for subagent, next session, or runtime transfer.

Required controls:

- current state
- decisions already made
- unresolved blockers
- runtime gaps
- next prompt

## Accessibility Gate

- Keyboard navigation must reach every interactive control.
- Visible focus states are required.
- Status cannot be represented by color alone.
- Target sizes must be usable on mobile and desktop.
- Text must fit within its container at common viewport widths.
