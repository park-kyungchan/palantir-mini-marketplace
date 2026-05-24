---
name: pm-harness-plan
category: core-workflow
description: "Spawn the harness-planner agent to expand a 1-4 sentence brief into a full product spec + GradingRubric. Reads <project>/.palantir-mini/harness/brief.txt (or accepts inline..."
allowed-tools: Agent mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__pm_preamble
argument-hint: "[1-4 sentence product brief — or empty to read from brief.txt]"
effort: high
disable-model-invocation: false
---

# pm-harness-plan — Run the Planner agent

## When to use

- User has a 1-4 sentence product brief ready (either in chat or `brief.txt`).
- Planner output (spec.md) is missing or stale.
- User says "plan the harness", "generate the spec", "create rubric".
- `/palantir-mini:pm-harness-plan <brief>` invocation.

## Prerequisites

- `pm-harness-init` already run (harness/ directory exists).
- Schema v1.14.0+ primitives available.

## Process

1. Resolve brief:
   - If `$ARGUMENTS` is non-empty → use as brief.
   - Else read `<project>/.palantir-mini/harness/brief.txt`.
   - If both empty → halt and ask user for a brief.

2. Call `pm_preamble` to get project context snapshot.

3. Spawn `harness-planner` agent:
```
Agent({
  subagent_type: "harness-planner",
  description: "Plan 3-agent harness spec + rubric",
  prompt: `
Brief: """${brief}"""

Project root: ${project}
Harness workspace: ${project}/.palantir-mini/harness/

Your deliverables:
  1. ${project}/.palantir-mini/harness/spec.md (full product spec, 12-16 features)
  2. ${project}/.palantir-mini/harness/eval-rubric.md (GradingRubric with criteria JSON)

Follow your agent contract. Emit harness_agent_spawned event at exit.
  `
})
```

4. Upon agent completion, read JSON output from stdout.
5. Verify spec.md + eval-rubric.md exist and are non-empty.
6. **v2.18.0 W1 Meta-Rubric gate**: invoke `grade_planner_output` MCP with `{ specPath: spec.md, rubricPath: eval-rubric.md, projectPath }`. Inspect verdict:
   - `pass` → continue to step 7.
   - `warn` → continue but surface metaScores to the user + recommend Planner re-run if feature count < 12.
   - `block` → halt; alert Lead ("Planner output weak: featureCount=N, antiPatternCount=M"). Do NOT proceed to Generator. User must re-invoke with an expanded brief OR override via explicit Lead-arbitrated resume.
7. Emit `phase_completed` event (phase=harness-planning). The `planner_output_graded` event from step 6 is separately captured by the handler — no duplicate emit here.

## Output

```
# pm-harness-plan report — <project>

Planner agent exit: <status>
Features: <N>
Sprints: <N>
Rubric criteria: <N>  (weight sum = 1.0 ✓)

Spec:  <project>/.palantir-mini/harness/spec.md
Rubric: <project>/.palantir-mini/harness/eval-rubric.md

Next: review the spec, adjust if needed, then /palantir-mini:pm-harness-sprint 1
```

## Rule citations

- `~/.claude/rules/12-lead-protocol-v2.md §Team default + Lazy-spawn` — Lazy-spawn: Planner spawned on demand, shut down on completion.
- `~/.claude/rules/12-lead-protocol-v2.md §Briefing template` — Agent briefing must include speed target, claim order, no-idle.
- `~/.claude/rules/12-lead-protocol-v2.md` §Model policy — Planner model=opus (frontmatter SoT).
