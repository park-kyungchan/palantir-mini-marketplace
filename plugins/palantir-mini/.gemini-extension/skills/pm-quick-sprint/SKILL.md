---
name: pm-quick-sprint
category: core-workflow
description: "Bootstrap a 1-iteration SprintContract for Lead-direct work, satisfying harness default-on commit-gate (rule 16 v3.3.0)."
allowed-tools: Read Write Edit Bash mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__negotiate_sprint_contract mcp__plugin_palantir-mini_palantir-mini__pm_preamble
effort: medium
disable-model-invocation: false
---

# pm-quick-sprint — 1-iter SprintContract wrapper for Lead-direct

## When to use

- About to call `commit_edits` in a project where harness default-on (rule 16 v3.3.0) would block without a bound SprintContract.
- Doing Lead-direct work that doesn't warrant a full Planner→Generator→Evaluator pipeline (small fix, refactor, single-file edit).
- User says "quick sprint", "wrap this in a sprint", "1-iter sprint", "lightweight harness", or invokes `/palantir-mini:pm-quick-sprint`.

## NOT for

- Multi-feature work spanning >15K context — use `/palantir-mini:pm-harness-plan` + full `/palantir-mini:pm-harness-sprint` instead.
- Cross-project work touching multiple repos — Lead-only orchestration applies (rule 12 §Session lifecycle).

## Prerequisites

- `pm-init` and `pm-harness-init` already run (`<project>/.palantir-mini/harness/` exists).
- Schemas v1.30.0+ (SprintContract.mode field).
- palantir-mini plugin v3.8.0+ (commit-edits-precondition + harness-base-mode-advisory hooks).

## Inputs

- `<brief>` — 1-2 sentence description of what the Lead is about to do (e.g. "fix typo in CLAUDE.md", "refactor pm-codegen output to handle empty input").
- `<scope>` — path or path glob the work targets (e.g. `~/.claude/CLAUDE.md`, `src/runtime/**`).

## Directory created

```
<project>/.palantir-mini/harness/sprints/sprint-NNN-quick/
├── contract.json                # bound SprintContract (mode="quick")
├── contract-negotiation.md      # Lead-only negotiation log (single round)
└── iterations/
    └── iteration-001/
        ├── generator-state.md   # Lead-as-Generator state (after work)
        ├── feedback-001.md      # Lead-as-Evaluator verdict (after work)
        └── (no evidence/ for quick — inline rubric)
```

## How to run

### Step 1 — Discover next sprint number + derive project slug

```bash
SPRINTS_DIR="<project>/.palantir-mini/harness/sprints"
NEXT_N=$(ls -1 "$SPRINTS_DIR" 2>/dev/null | grep -E '^sprint-[0-9]+' | sed 's/sprint-\([0-9]\+\).*/\1/' | sort -n | tail -1)
NEXT_N=$((${NEXT_N:-0} + 1))
SPRINT_DIR="$SPRINTS_DIR/sprint-$(printf '%03d' $NEXT_N)-quick"
mkdir -p "$SPRINT_DIR/iterations/iteration-001"

# v3.13.0+ crystalline-resilient-narwhal — derive project slug for
# cross-project contractId disambiguation. The DIR name stays as
# `sprint-NNN-quick` (path-layer namespacing already isolates per-project),
# but the LOGICAL contractId field carries the slug prefix.
PROJ_SLUG=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const root = '<project>';
  let name = '';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (typeof pkg.name === 'string' && pkg.name.length > 0) {
      name = pkg.name.replace(/^@[^/]+\\//, '');
    }
  } catch {}
  if (!name) name = path.basename(path.resolve(root));
  name = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+\$/g, '').slice(0, 32);
  console.log(name || 'unknown');
")
SLUG_CONTRACT_ID="${PROJ_SLUG}-sprint-$(printf '%03d' $NEXT_N)-quick"
```

### Step 2 — Negotiate + bind SprintContract via MCP

```
mcp__plugin_palantir-mini_palantir-mini__negotiate_sprint_contract({
  project: "<absolute>",
  projectSlug: "<PROJ_SLUG>",
  contractDraft: {
    contractId: "<PROJ_SLUG>-sprint-<NNN>-quick",
    sprintNumber: <NNN>,
    projectSlug: "<PROJ_SLUG>",
    status: "drafting",
    mode: "quick",
    inputs: [
      { featureId: "F-quick-001", title: "<brief>", description: "<expanded brief>" }
    ],
    successCriteriaRids: ["crit-quick-code", "crit-quick-ontology", "crit-quick-rule"],
    iterationLimit: 1,
    hardThreshold: {
      perCriterion: { "crit-quick-code": 1, "crit-quick-ontology": 1, "crit-quick-rule": 1 },
      overall: 1,
      scale: "pass-fail"
    },
    timeoutMs: 900000,
    budgetTokens: 15000,
    negotiationFile: "<sprintDir>/contract-negotiation.md",
    disagreementResolution: "lead-arbitrated"
  },
  rubricInline: [
    {
      criterionId: "crit-quick-code",
      title: "Code correctness",
      rubricDomain: "code",
      weightInRubric: 0.4,
      validationExpression: "<shell command from scope, e.g. bunx tsc --noEmit OR bun test OR explicit grep>",
      passFailLogic: { threshold: 1, scale: "pass-fail" },
      appliesToDomain: "any"
    },
    {
      criterionId: "crit-quick-ontology",
      title: "Ontology no-drift",
      rubricDomain: "rule",
      weightInRubric: 0.3,
      validationExpression: "bun run \"${CLAUDE_PLUGIN_ROOT}/scripts/run.ts\" detect-doc-drift",
      passFailLogic: { threshold: 1, scale: "pass-fail" },
      appliesToDomain: "ontology"
    },
    {
      criterionId: "crit-quick-rule",
      title: "Rule-conformance",
      rubricDomain: "rule",
      weightInRubric: 0.3,
      validationExpression: "bun run \"${CLAUDE_PLUGIN_ROOT}/scripts/run.ts\" pm-rule-audit",
      passFailLogic: { threshold: 1, scale: "pass-fail" },
      appliesToDomain: "any"
    }
  ]
})
```

The handler binds the contract atomically: writes `contract.json` with `status: "bound"` + emits `sprint_contract_bound` event.

### Step 3 — Lead-as-Generator does the work

Lead performs the actual edits per `<brief>` + `<scope>`. Writes summary to `iterations/iteration-001/generator-state.md`.

**v4.1.0+ — `generator-state.md` MUST include a `## Memory layer declaration` section** (rule 26 §Axis E + rule 12 v3.3.0 §Briefing template). State which of 4 layers (working / episodic / semantic / procedural) the iteration's work refines, with one-line rationale per layer:

```markdown
## Memory layer declaration

- `working`    — current-task scratchpad: <what>
- `episodic`   — sprint-NNN instance recorded under iterations/iteration-NNN/
- `semantic`   — typed knowledge change: <which DH/HC/rubric/spec>
- `procedural` — how-to artifact change: <which skill/hook/agent/script>
```

Omit layers that don't apply.

### Step 4 — Lead-as-Evaluator inline grading

Lead runs each criterion's `validationExpression` shell command. Emits `grading_completed` event with per-criterion pass/fail. Writes verdict to `iterations/iteration-001/feedback-001.md`.

If all 3 criteria pass → verdict=passed → `commit_edits` allowed.
If any criterion fails → verdict=failed → revert edits OR re-run pm-quick-sprint with refined scope.

### Step 5 — Emit completion event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "quick-sprint",
    sprintId: "sprint-<NNN>-quick",
    verdict: "passed" | "failed",
    iterations: 1
  },
  ...
})
```

## Output

```
# pm-quick-sprint report — sprint-<NNN>-quick

Brief: <brief>
Scope: <scope>
Mode: quick (rule 16 v3.3.0 §Quick Sprint)

Bound contract: <project>/.palantir-mini/harness/sprints/sprint-<NNN>-quick/contract.json
Iterations: 1/1
Verdict: passed | failed

Per-criterion:
  - crit-quick-code: pass | fail
  - crit-quick-ontology: pass | fail
  - crit-quick-rule: pass | fail

Next: commit_edits is now permitted (if verdict=passed).
```

## Authority + cross-refs

- Rule 16 v3.0.0 §Quick Sprint — `~/.claude/rules/16-3-agent-harness.md`.
- Harness-base-mode blueprint §4-P0 step 3 — `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md`.
- Plan §3.C W1.1b — `~/.claude/plans/glistening-hugging-reddy.md`.
- SprintContract.mode field — `~/.claude/schemas/ontology/primitives/sprint-contract.ts` (v1.30.0+).
- `commit-edits-precondition` hook — `~/.claude/plugins/palantir-mini/hooks/commit-edits-precondition.ts` (W1.2).
