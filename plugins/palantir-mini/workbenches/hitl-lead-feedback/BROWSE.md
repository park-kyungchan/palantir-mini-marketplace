# HITL Lead Feedback Workbench Router

Read this file only when the user explicitly asks for an HTML or interactive
Human-in-the-Loop artifact, or when maintaining this workbench.

## Request Gate

Default behavior is no HTML.

Create HTML only when the current user request explicitly asks for one of these
surfaces:

- HTML artifact
- interactive artifact
- browser-playable review
- visual workbench
- direct manipulation UI
- dashboard/report HTML
- generated page for review

If HTML would be useful but was not requested, offer a review card or text
response instead. Do not create the file preemptively.

## Minimal Read Order

1. `SOURCE_POLICY.md`
2. `sources/required-sources.json`
3. `INDEX.md`
4. `patterns/html-hitl-pattern-taxonomy.md`
5. `templates/html-artifact-recipes.md`
6. The smallest matching template under `templates/`

Historical example files under `examples/` and existing `report-*.html` files
are examples only. They are not source evidence and do not approve a new HTML
artifact.

## Source Hard Stop

Before creating HTML, check `sources/required-sources.json`.

Proceed only when every source used by the selected recipe is either:

- `complete`, with raw text or HTML, rendered DOM snapshot, screenshot, image
  inventory, claim map, and hash/provenance refs; or
- explicitly out of scope for that recipe.

If any required source for the selected recipe is `blocked`, return a blocked
report instead of HTML. Do not substitute mirrors, search snippets, cached
summaries, or model memory.

## Output Order

Every HTML HITL artifact must present:

1. Plain summary.
2. Decision surface.
3. Evidence.
4. Export prompt.

Raw JSON, logs, or long Markdown may appear only behind secondary details.

## Metadata Requirement

Every generated HTML artifact must include machine-readable metadata naming:

- `selectedPattern`
- `requestGate.explicitHtmlRequested`
- `sourceRefs`
- `recipeRef`
- `runtimeGaps`

Use the metadata shape in `templates/html-artifact-recipes.md`.

## Runtime Gap

Claude and Codex consume this SSoT as readers. Do not encode model-specific
prompt hacks here. If a runtime lacks native user-input or browser capture
support, state the gap in the artifact or blocked report.
