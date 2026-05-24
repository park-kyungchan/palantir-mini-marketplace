# Ontology Engineering HITL Stage Map

Use this map to decide when to create a Human-in-the-Loop artifact and what the
artifact should ask the user to review.

If the artifact is HTML, first pass the request gate in `../BROWSE.md`, then
select a pattern from `html-hitl-pattern-taxonomy.md`.

| Stage | HITL trigger | Artifact focus | User choice | Next allowed action |
|---|---|---|---|---|
| Prompt front door | User intent is broad, ambiguous, or ontology-affecting | Plain-language meaning summary | Approve, revise, cancel | Fill or approve SemanticIntentContract |
| Research framing | Evidence source or authority level is unclear | Source map and claim grouping | Accept sources, add sources, narrow scope | Continue synthesis |
| Ontology modeling | New nouns, actions, fields, routes, views, scenarios, or agents are proposed | Candidate ontology table | Accept, rename, split, merge, reject | Draft typed model or proposal |
| DTC boundary | Mutation could affect runtime, schema, permissions, branch, replay, or eval | Change boundary and risk card | Approve, revise, hold | Route with approved DTC |
| Router/delegation | Multiple execution paths or agents are plausible | Delegation/lead-direct comparison | Delegate, lead-direct, split, hold | Spawn subagents or implement |
| Implementation review | User needs to inspect plan/diff before execution or merge | HTML diff/explainer/playground | Approve patch, request changes, stop | Validate or revise |
| Evaluation | Pass/fail criteria are uncertain | Evaluation rubric artifact | Approve criteria, add cases, narrow | Run validation |
| Lineage closeout | Outcome affects future routing or memory | Decision lineage and lessons | Record, revise, do not learn | BackProp/audit/recap |

## Generic Artifact Rule

Create a review artifact when at least one is true:

- The user must approve meaning before mutation.
- Lead has inferred a boundary that could be wrong.
- The evidence chain is not obvious.
- The user would benefit from seeing options side by side.
- A copyable next prompt would reduce ambiguity.

Create HTML only when the user explicitly requested HTML or an interactive
artifact. Otherwise use the Markdown review card template.

## Anti-Patterns

- Asking for raw JSON approval before plain-language review.
- Treating Lead inference as approved user meaning.
- Hiding runtime gaps.
- Generating HTML because the Lead thinks it would be useful, without an
  explicit user request.
- Using raw JSON, long Markdown, or a log stream as the primary UI.
- Indicating status by color alone.
- Creating a reusable runtime API before the artifact pattern is proven.
- Copying full source articles into the workbench.
