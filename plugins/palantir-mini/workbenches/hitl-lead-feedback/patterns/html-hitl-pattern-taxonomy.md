# HTML HITL Pattern Taxonomy

Use this table only after `BROWSE.md` confirms the user explicitly requested an
HTML or interactive artifact.

## Selection Rule

Every artifact follows this order:

1. Plain summary.
2. Decision surface.
3. Evidence.
4. Export prompt.

The selected pattern must be recorded in artifact metadata with source refs.

## Patterns

| Pattern ID | Task condition | User feedback need | Recommended surface | Required controls | Anti-patterns | Source refs |
|---|---|---|---|---|---|---|
| `task-framing-canvas` | Intent is broad, ambiguous, or missing constraints | Confirm goal, non-goal, constraints, and success criteria | Form-like canvas with chips and empty fields | Goal field, non-goal field, constraint chips, success criteria list, approve/revise/cancel | Starting with raw SIC/DTC JSON; asking many open questions | `nng-usability-heuristics`, `duetui`, `microsoft-magentic-ui` |
| `side-by-side-option-board` | Multiple routes, designs, implementations, or policies are plausible | Compare options and choose direction | Board with aligned option columns | Option cards, tradeoff rows, risk tags, recommendation marker, export selected option | Sequential long Markdown; hiding the recommended option rationale | `html-effectiveness-companion-examples`, `copilotkit-generative-ui-spectrum`, `nng-usability-heuristics` |
| `plan-progress-stream` | Work is long-running, multi-step, delegated, or blocked | See current step, next approval point, and blockers | Plan panel plus status stream | Step list, done/current/blocked states, next approval, hold button, copy handoff prompt | Raw log stream as primary UI; color-only status | `anthropic-claude-opus-4-7`, `openai-gpt-5-5-latest-model`, `html-effectiveness-companion-examples` |
| `autonomy-control-panel` | Agent autonomy level is undecided | Choose how much the agent may do before asking | Control panel with bounded modes | Ask-before-action toggle, bounded autonomy mode, full hold, allowed surfaces, stop conditions | Treating silence as approval; model-specific autonomy hacks | `microsoft-magentic-ui`, `openai-gpt-5-5-latest-model`, `duetui` |
| `confirmation-gate-rollback-receipt` | Mutation, PR, merge, permission, schema, or DTC risk exists | Approve or reject a state-changing action | Confirmation gate with receipt | Before/after summary, explicit approval, rollback path, affected surfaces, next legal action | Button with no rollback; approval hidden inside prose | `wcag-2-2`, `govuk-styles`, `nng-usability-heuristics` |
| `evidence-map` | Research or source quality drives the decision | Accept, reject, or add sources and claims | Claim-source-confidence-gap map | Claim rows, source refs, confidence, gaps, include/exclude controls, source refresh note | Search snippets as evidence; unsupported claims in decorative cards | `microsoft-magentic-ui`, `apple-designer-feedback`, `wcag-2-2` |
| `direct-manipulation-sandbox` | User must tune priority, prompt, route, ontology candidates, or UI settings | Manipulate the proposal and export the result | Sandbox with direct controls | Drag/order, toggle, slider, inline edit, reset, copy prompt | One-shot generated UI with no export; hidden state mutation | `apple-designer-feedback`, `duetui`, `html-effectiveness-companion-examples` |
| `generated-dashboard-report` | Status, QA, audit, or findings must be scanned quickly | Filter, group, and inspect outcomes | Dashboard/report view | Metrics, timeline, grouped findings, filters, severity labels, export summary | Wall of logs; vanity charts with no decision | `vercel-generative-ui`, `material-color-accessibility`, `govuk-styles` |
| `handoff-packet` | Another agent, runtime, or session must continue | Carry state, decisions, blockers, and next prompt forward | Handoff packet | Current state, accepted decisions, unresolved blockers, runtime gaps, next prompt | Context dump without decisions; missing ownership | `openai-gpt-5-5-latest-model`, `anthropic-claude-opus-4-7`, `nng-usability-heuristics` |

## Visual Guidelines

- Layout: prioritize scanability, aligned comparisons, and stable dimensions.
- Color: use color only as a secondary cue; pair status color with text, icon,
  or shape.
- Typography: keep dashboard and control labels compact; reserve large type for
  true title areas only.
- Contrast: satisfy WCAG contrast expectations for text and controls.
- Focus: all controls must be keyboard reachable with visible focus states.
- Motion: use motion only when it clarifies state; provide non-motion status.
- Density: non-developer users see plain language first, then evidence, then
  raw refs.
- Status cannot be represented by color alone.

## Selection Examples

| Prompt class | Pattern |
|---|---|
| "I am not sure what I want; help frame it." | `task-framing-canvas` |
| "Compare these three approaches." | `side-by-side-option-board` |
| "Work through this long plan and show progress." | `plan-progress-stream` |
| "How much can the agent do on its own?" | `autonomy-control-panel` |
| "Approve this merge/schema/permission change." | `confirmation-gate-rollback-receipt` |
| "Show which sources support each claim." | `evidence-map` |
| "Let me reorder priorities and export the prompt." | `direct-manipulation-sandbox` |
| "Summarize QA/audit status." | `generated-dashboard-report` |
| "Prepare the next session/subagent handoff." | `handoff-packet` |
