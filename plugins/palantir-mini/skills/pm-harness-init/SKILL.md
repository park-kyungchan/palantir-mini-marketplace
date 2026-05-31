---
name: pm-harness-init
category: core-workflow
surfaceStatus: public-core
description: "Bootstrap the 3-agent harness workspace in a project."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__pm_preamble
effort: medium
disable-model-invocation: false
---

# pm-harness-init — Bootstrap harness workspace

## When to use

- Starting the 3-agent harness (Planner / Generator / Evaluator) on a project for the first time.
- User says "init harness", "setup harness", "start 3-agent", or invokes `/palantir-mini:pm-harness-init`.
- `<project>/.palantir-mini/session/` exists (pm-init already run) but `harness/` does not.

## Prerequisites

- `pm-init` already run (session directory exists).
- Schema v1.14.0+ available (HarnessAgent / SprintContract / FeedbackLoop / GradingCriterion / PlaywrightScenario primitives).

## Directory structure created

```
<project>/.palantir-mini/harness/
├── brief.txt                          # user's 1-4 sentence prompt (created empty if absent)
├── spec.md                            # Planner output (placeholder)
├── eval-rubric.md                     # GradingRubric (placeholder)
├── sprints/                           # per-sprint workspaces
│   └── (populated by pm-harness-sprint)
└── scenarios/
    └── playwright/                    # PlaywrightScenario instances
```

## How to run

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  project: "<absolute>",
  envelope: {
    type: "phase_completed",
    eventId: "evt-harness-init-<timestamp>",
    when: "<ISO8601>",
    atopWhich: "<git HEAD>",
    throughWhich: { sessionId: "harness-init", toolName: "pm-harness-init", cwd: "<path>" },
    byWhom: { identity: "<active-runtime-identity>", agentName: "Lead" },
    withWhat: { reasoning: "Bootstrapped harness workspace; Planner ready for spawn." },
    payload: { phase: "harness-init", createdDirs: [...], briefExists: true|false }
  }
})
```

Also write placeholder `spec.md` + `eval-rubric.md` with "# (awaiting Planner run)" content.

## Output

```
# pm-harness-init report — <project>

Created:
  .palantir-mini/harness/
    brief.txt           (empty — fill with your 1-4 sentence prompt)
    spec.md             (placeholder)
    eval-rubric.md      (placeholder)
    sprints/
    scenarios/playwright/

Next step: write your brief to brief.txt, then run /palantir-mini:pm-harness-plan
```

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — harness workspace coexists with session/, shares events.jsonl.
- `~/.claude/rules/12-lead-protocol-v2.md §Task granularity` — harness sprints inherit 1-primary-file ownership per generator task.
- `~/.claude/research/claude-code/features.md §26` — Managed Agents Session/Harness/Sandbox mirror.
