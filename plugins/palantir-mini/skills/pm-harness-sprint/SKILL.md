---
name: pm-harness-sprint
category: core-workflow
surfaceStatus: public-core
description: "Execute a sprint in the harness (rule 16). Default 2-role — spawns Generator; Lead..."
allowed-tools: Agent mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__negotiate_sprint_contract mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric
argument-hint: "<sprint-number>   (1-based; must match spec.md sprint plan)"
effort: high
disable-model-invocation: false
---

# pm-harness-sprint — Execute a harness sprint

## When to use

- Spec.md + eval-rubric.md exist (pm-harness-plan completed).
- User wants to execute sprint N (next unfinished sprint).
- User says "run sprint 1", "execute the next sprint", or invokes `/palantir-mini:pm-harness-sprint <N>`.

## Prerequisites

- pm-harness-plan completed (spec.md + eval-rubric.md present).
- Dev environment ready (Generator will start its own dev server per tech stack).
- Browser MCP available (Playwright MCP or claude-in-chrome MCP) — only for sprints whose rubric grades a running application. Code/doc-only sprints do not require browser MCP.

## v2.20.0 W4 — iterationResetPolicy (declaration-only)

Read `contract.iterationResetPolicy` field (schemas v1.25.0). Values:
- `"disabled"` (default, or absent) — current behavior: continuous Generator session across iterations; Claude Agent SDK automatic compaction handles context growth. **Use this for Opus 4.5+ Generators** per Rajasekaran blog evidence.
- `"manual"` — Lead decides per-iteration whether to re-spawn Generator; handoff manifest passed explicitly.
- `"auto"` — automatic Generator re-spawn at each iteration boundary; seeds new session with `contract.resetHandoffManifest.includeFiles[]`.

TODO (runtime impl deferred): when policy ≠ `"disabled"` AND an iteration boundary is crossed, emit `context_reset_handoff_emitted` event + shut down current Generator + spawn fresh one with handoff manifest. Gate on W5 Component Audit evidence before turning on.
- **B-28 workaround (harness-h4 canary)**: Playwright MCP's security layer blocks `file://` URLs. When a brief or rubric specifies a `file:///…` target, the Evaluator MUST spawn a throwaway static server BEFORE running the scenario — e.g. `bunx serve -p 8765 <artifactDir>` or `python3 -m http.server 8765 --directory <artifactDir>` — then navigate to `http://localhost:8765/<relative-path>`. Tear the server down at loop close. Auto-wrapping inside `run_playwright_scenario` is deferred to B-28b (a later MINOR).

## Variant choice (first step)

- **2-role default** (rule 16): Lead spawns `harness-generator`. Lead itself acts as Evaluator (reads diff, grades, writes feedback).
- **3-role optional**: Lead additionally spawns `harness-evaluator` when adversarial isolation is required (e.g. the artifact under evaluation is UX/UI where Lead's context may bias the judgment). Record the choice in sprint dir as `variant.txt`.

## Process (2-role default)

### Phase 1: Contract Negotiation

1. Create sprint directory: `<project>/.palantir-mini/harness/sprints/sprint-<NNN>/`.
2. Lead drafts a proposed `SprintContract` (scope, iteration limit 5-15, grading rubric ref, hard-threshold policy) and writes `contract-negotiation.md`.
3. Spawn `harness-generator` — Generator reviews the contract, posts `APPROVED` or a counter-proposal to the same file via `negotiate_sprint_contract` MCP.
4. Loop (max 3 rounds):
   - Generator and Lead alternate via `negotiate_sprint_contract` MCP until both post `APPROVED`.
5. On agreement: MCP emits `sprint_contract_bound`, writes frozen `contract.json`.
6. If no agreement after 3 rounds → Lead arbitrates per `disagreementResolution` policy declared in the contract (`abort-on-disagreement` / `priority-criterion` / `lead-arbitrated`).

### Phase 2: Feedback Loop (Lead-driven inline state machine)

Lead owns the state machine directly — no orchestrator agent. Loop state lives in the sprint directory; each iteration is a sub-directory with its own artifacts.

Per iteration (1..contract.iterationLimit):

1. **generating**
   - Lead (or the persistent Generator from Phase 1) writes `iterations/iteration-<N>/generator-state.md` describing what was built, which files changed, how to run it, and any caveats.
   - Generator commits to the sprint branch if the artifact is code.
2. **evaluating**
   - 2-role default: Lead reads diff + `generator-state.md`, runs any grading probes (for code rubrics: shell validationExpression; for model rubrics: the active runtime's model-grader adapter, or `needs_human_review` when no adapter exists), invokes `grade_outcome_with_rubric` MCP with the evidence bundle. For UX rubrics: run Playwright scenarios directly via browser MCP, attach screenshots/console/network to evidence dir.
   - 3-role variant: spawn `harness-evaluator` with the bound contract + rubric + generator-state; Evaluator writes `feedback-NNN.md`.
3. **feedback**
   - Lead reads `feedback-NNN.md` (self-authored in 2-role, spawned-Evaluator in 3-role) and checks:
     - `overallScore >= hardThreshold.overall` AND no per-criterion `hardThresholdBreach` → state = `passed`, exit loop.
     - `iteration >= contract.iterationLimit` → state = `failed`, exit loop.
     - `user-aborted` signal → state = `aborted`, exit loop.
     - else → continue to step 3.5.
3.5. **analysis** (v2.10.0 — Session 3 Slice 3 closure of AI FDE §FDE-05 step 6)
   - Condition: previous step decided to continue (verdict=fail AND iteration<iterationLimit).
   - Invoke `/palantir-mini:pm-harness-analyze <sprintNumber> <iteration>`. This spawns the `harness-analyzer` agent which writes `iterations/iteration-<N>/analysis-<N>.md` with: failure category (1 of 7) + root-cause hypothesis + suggested patch (spec-patch | rubric-patch | generator-hint) + recommended next-iteration scope + confidence.
   - Lead reads the analyzer recommendation:
     - `continue` → apply `generator-hint` (if present) to next iteration's generator-state.md prefix; return to step 1.
     - `patch-spec` → apply analyzer's spec-patch to spec.md, then return to step 1.
     - `patch-rubric` → apply analyzer's rubric-patch to eval-rubric.md, then return to step 1.
     - `abort` (or analyzer confidence=low) → state = `aborted`, exit loop with reason "analyzer-recommended-abort". Skip step 4's normal close path; surface analysis-NNN.md to user.
   - This automation replaces the prior pattern of Lead manually re-specing between iterations, closing the AI FDE eval-driven loop step 6 (synthesize failure mode → refine prompt) without per-iteration human intervention.
3.6. **cross-session pickup** (v3.11.0 W3.1d — CT-3 lifecycle closure)
   - If Lead's session ended mid-loop (e.g. `/clear` after step 3 verdict but before step 3.5 spawn), the W3.0 trigger hook left a marker at `/tmp/palantir-mini-hooks/<sessionId>/analyzer-request-<sprint>-<iter>-<rubricId>.json`.
   - Next session's `analyzer-marker-pickup` SessionStart hook scans the dir + emits `phase_completed phaseTag="harness-analyzer-pickup-pending"` advisory event with the markers in `additionalContext`.
   - Lead reads that context at session-start + invokes `/palantir-mini:pm-harness-analyze <N> <iter>` for each surfaced marker, picking up where the prior session left off.
   - `analyzer-output-injector` SubagentStop hook deletes consumed markers automatically.
4. On loop close: Lead writes `loop-summary.md` with terminal state, best iteration, per-criterion scores, termination reason. Lead emits `feedback_loop_closed` (or the v2 equivalent) event. Artifacts + sprint dir remain append-only.

File-based IPC between Lead (Evaluator) and Generator uses `feedback-<NNN>.md` files per rule 16; no direct SendMessage between Generator and Evaluator.

### Phase 3: Handoff

1. Read `loop-summary.md`.
2. If state=passed: commit iteration + tag as sprint-NNN-complete; suggest next sprint.
3. If state=failed: write issues to project MEMORY or retrospective; surface for user review.
4. If state=aborted: preserve state, emit reason event.

## Output

```
# pm-harness-sprint <N> report — <project>

Variant: 2-role | 3-role
Contract negotiation: <N rounds>
Loop state: passed|failed|aborted
Iterations: <N>
Best iteration: <N>
Final weighted score: <float> / 10
Per-criterion scores: [...]
Termination: <reason>

Artifacts:
  .palantir-mini/harness/sprints/sprint-<NNN>/
    variant.txt
    contract.json
    iterations/iteration-NNN/
    loop-summary.md

Next:
  /palantir-mini:pm-harness-sprint <N+1>   (if passed)
  /palantir-mini:pm-harness-status          (check state)
  /palantir-mini:pm-harness-abort <loop>    (if stuck)
```

## Rule citations

- `~/.claude/rules/16-3-agent-harness.md` — 2-role default (Planner + Generator + Lead-as-Evaluator); optional 3-role when adversarial isolation needed.
- `~/.claude/rules/12-lead-protocol-v2.md §Team default + Lazy-spawn` — Lazy-spawn: 1 teammate (Generator) active by default; Evaluator spawned only in 3-role variant; re-spawn between iterations if Generator is sonnet implementer.
- `~/.claude/rules/12-lead-protocol-v2.md §Task granularity` — each iteration is a task with DELETE/ADD/KEEP/VERIFY sections in the generator-state.
- `~/.claude/rules/12-lead-protocol-v2.md §Session lifecycle` — Sprint abort on 4h teammate cap.
