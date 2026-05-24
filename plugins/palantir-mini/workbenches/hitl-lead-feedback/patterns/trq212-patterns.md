# trq212 Pattern Synthesis

These patterns are derived from direct X source cards in `../sources/`.
They are practitioner patterns, not official runtime facts.

## 1. HTML Review Artifact

Use HTML when Markdown is too low-bandwidth for user feedback.

Best fit:

- Dense plans.
- Multi-option comparisons.
- Diffs and annotations.
- Diagrams and workflows.
- Copyable prompts or structured exports.

Ontology Engineering application:

- Let the user inspect Lead's semantic inference visually.
- Show ontology objects, actions, surfaces, risks, and next actions together.
- Offer approval/revision choices without exposing raw contracts first.

## 2. Playground Feedback Loop

Use an interactive artifact when the user must tune the answer.

Best fit:

- Ordering and triage.
- Selecting fields or surfaces.
- Adjusting evaluation priorities.
- Reviewing a set of proposed ontology nouns/actions.
- Exporting the final choice as a prompt.

Ontology Engineering application:

- Build a one-off local artifact for the current stage.
- Capture the user's edits as text the Lead can paste into the next turn.
- Treat the artifact as review support, not as runtime state authority.

## 3. Cache-Stable Interaction

Keep the interaction surface stable.

Best fit:

- Long-running sessions.
- Plan mode.
- Multi-turn approval.
- Compaction or handoff.

Ontology Engineering application:

- Do not add a new runtime API for each review phase.
- Use `pm_semantic_intent_gate`, review cards, workbench state, and static
  artifacts.
- Preserve prompt/front-door identity and runtime gaps.

## 4. Tool-Shaped Elicitation

Human feedback works better when the agent sees a clear action shape.

Best fit:

- Asking one to three high-value questions.
- Offering approve/revise/cancel choices.
- Blocking until the user answers.
- Using progressive disclosure for deeper evidence.

Ontology Engineering application:

- Ask "Is this meaning correct?" before "May I mutate?"
- Keep alternatives explicit.
- Preserve why the question matters.

## 5. Session Branching

Every user turn is a branching point.

Best fit:

- Continue.
- Rewind.
- Clear and start fresh.
- Compact.
- Delegate to subagents.

Ontology Engineering application:

- Include a "next session move" in the artifact.
- If context is polluted, recommend a fresh session or verification subagent.
- If the boundary is not approved, hold before mutation.

