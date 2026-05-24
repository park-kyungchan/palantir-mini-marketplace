# HITL Lead Feedback Workbench Index

This directory is the agent-readable SSoT for palantir-mini HTML HITL review
artifacts.

## Authority

| File | Role | When to read |
|---|---|---|
| `BROWSE.md` | Minimal router and HTML request gate | First, only for explicit HTML requests |
| `SOURCE_POLICY.md` | Direct-source evidence rules | Before trusting any source |
| `sources/required-sources.json` | Required source manifest and blocked status | Before recipe selection |
| `sources/claim-map-2026-05-21.md` | Initial direct-probe claim map | Evidence review and refresh planning |
| `patterns/html-hitl-pattern-taxonomy.md` | Pattern selection table | Before choosing UI structure |
| `patterns/ontology-engineering-stage-map.md` | Ontology stage mapping | Before asking for user approval |
| `patterns/trq212-patterns.md` | Historical practitioner synthesis | Secondary pattern context only |
| `templates/html-artifact-recipes.md` | Request gate, metadata, and recipe contract | Before producing HTML |
| `templates/lead-feedback-review-card.md` | Default non-HTML artifact | When HTML was not explicit |
| `templates/hitl-artifact-brief.md` | Prompt for a requested HTML artifact | When HTML was explicit |

## Source Capture Status

The current source manifest is intentionally conservative. A direct text probe
was performed on 2026-05-21 for official/model/UI sources, and current X access
returned an X error page for all five trq212 URLs. Because the plan requires
raw capture plus rendered DOM snapshot, screenshot, image inventory, claim map,
and provenance, any source missing one of those evidence classes remains
`blocked` for HTML generation.

| Source group | Status | Notes |
|---|---|---|
| trq212 X posts | `blocked` | Current direct refresh returned X error page; historical cards remain reference-only |
| Claude HTML blog | `blocked` | Direct text probe succeeded; full rendered evidence pack not committed |
| HTML companion examples | `blocked` | Index and 20 links observed; per-example capture pack not committed |
| Anthropic Opus 4.7 announcement | `blocked` | Direct text probe succeeded; full rendered evidence pack not committed |
| OpenAI GPT-5.5 docs | `blocked` | Official OpenAI docs MCP and direct text probe succeeded; full rendered evidence pack not committed |
| UI/HCI research sources | `blocked` | Direct text probes mostly succeeded; full rendered evidence packs not committed |
| UX/accessibility guidance | `blocked` | Direct text probes mostly succeeded; full rendered evidence packs not committed |

## Pattern Taxonomy

| Pattern | Use when | Required controls | Do not use when |
|---|---|---|---|
| Task framing canvas | Intent is broad or ambiguous | Goal, non-goal, constraints, success criteria fields | User already supplied a precise DTC |
| Side-by-side option board | User must choose among alternatives | Option cards, tradeoff/risk rows, recommendation marker | There is only one viable path |
| Plan surface + progress stream | Work is multi-step or long-running | Plan, status, blocked states, approval points | A one-turn answer is enough |
| Autonomy control panel | Delegation/autonomy level is unclear | Mode selector, ask-before-action toggles, boundaries | Mutation boundary is already approved |
| Confirmation gate + rollback receipt | Mutation, merge, schema, or permission risk exists | Before/after, approval, rollback path | No state-changing action is proposed |
| Evidence map | Research or claims drive the decision | Claim-source-confidence-gap matrix | Evidence is irrelevant to the choice |
| Direct manipulation sandbox | User must tune order, priority, prompt, route, or ontology candidates | Drag/toggle/slider/edit plus export prompt | User only needs to read |
| Generated dashboard/report | Scanability matters for QA, audit, or status | Metrics, timeline, grouped findings, filters | User must make a narrow approval |
| Handoff packet | Another agent/runtime/session continues | Current state, decisions, blockers, next prompt | Same session can finish safely |

## Global UI Rules

- Non-developer users should not see raw JSON, logs, or long Markdown first.
- Status must use text, icon, or shape in addition to color.
- Color is a secondary cue only.
- Pattern choice must cite `patterns/html-hitl-pattern-taxonomy.md` and the
  specific source refs used.
- Every artifact must expose an export prompt carrying the user's feedback into
  the next turn.
