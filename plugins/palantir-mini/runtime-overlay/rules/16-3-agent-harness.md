---
ruleId: 16
slug: 3-agent-harness
scope: global
version: 4.1.0
invariant: "palantir-mini-sprint-harness species: SprintContract-bound, default-on (B2); rule 16 governs this one species — palantir-mini Brain dispatches across all 5 species."
supersededBy: null
supersedes: []
crossRefs: [10, 12]
hookCitations: [harness-base-mode-advisory, commit-edits-precondition, harness-analyzer-trigger, analyzer-output-injector, analyzer-marker-pickup]
bodyLocCeiling: 110
---

# Rule 16 — palantir-mini-sprint-harness (default-on substrate; 2-role default; optional 3-role)

**Scope**: governs the **palantir-mini-sprint-harness species** (one of 5 — see `rules/CONTEXT.md §15 Glossary`). palantir-mini itself is the Ontology-First Brain that dispatches across harness species; this rule defines the sprint species' enforcement substrate.

## §Default-On Policy

The harness is **the substrate**, not opt-in. Mode = **hard default-on (B2)** as of 2026-04-30 (user-authorized early escalation; original 4-week shakedown 2026-04-29 → 2026-05-27 truncated by explicit user directive). Strict mode (C) is opt-in only via `SprintContract.mode = "strict"`.

- **B0 (legacy, retired)**: pre-opt-in.
- **B1 (soft default-on, was active 2026-04-29 → 2026-04-30)**: SessionStart bootstrapped `.palantir-mini/harness/` advisory only; `commit_edits` MCP gate only. Superseded by B2.
- **Hard default-on (B2, current as of 2026-04-30)**: All `commit_edits` AND tracked-file `Write|Edit|MultiEdit` gated by `commit-edits-precondition` hook. Lead-direct mode internally wrapped in a 1-iter Quick Sprint (see §Quick Sprint). SessionStart `harness-base-mode-advisory` auto-bootstraps a default Quick Sprint when absent (plugin v3.12.0+). Read-only and ontology-readonly tools never gated.
- **Bypass**: `PALANTIR_MINI_HARNESS_BYPASS=1` env var disables the gate for emergency work. Audited via `harness_bypass_invoked` event. Auto-bootstrap can be disabled via `PALANTIR_MINI_AUTO_SPRINT_DISABLE=1` (audited).

### Read-only exemption list

These tools NEVER require an active sprint contract:

- **Rule + research lookup**: `pm_rule_query`, `pm_rule_audit`, `pm_recap`, `pm_retro_query`, `pm_learn_query`.
- **Lineage/replay (read-only)**: `replay_lineage`, `pm_workflow_lineage_query`, `pm_agent_lineage_export`.
- **Ontology read**: `get_ontology`, `ontology_schema_get`, `impact_query`.
- **Health/version**: `pm_preamble`, `check_cc_version`, `pm_plugin_self_check`.
- **Claude Code primitives**: `Read`, `Grep`, `Glob`.

## §Quick Sprint (1-iter wrapping)

`/palantir-mini:pm-quick-sprint "<brief>" <scope>` bootstraps a single-iteration SprintContract for Lead-direct work. Output: `<project>/.palantir-mini/harness/sprints/sprint-NNN-quick/contract.json` with `iterationLimit=1`, `timeoutMs=900000` (15 min), `mode="quick"` (per schemas v1.30.0+), inline 3-criterion rubric (code-correctness via shell + ontology-no-drift via `detect_doc_drift` + rule-conformance via `pm_rule_audit`). Lead acts as Evaluator inline; no separate Generator spawn.

Quick Sprint is the bridge between Lead-direct work and full harness pipelines — it satisfies `commit-edits-precondition` while preserving lightweight Lead authority.

## §Roles (v3.1.0 — Lead does NOT grade)

- **harness-planner** (opus) — 1-4 sentence brief → `<project>/.palantir-mini/harness/{spec.md, eval-rubric.md}`. Authors GradingRubric up-front (12-16 features). Does NOT implement.
- **harness-generator** (sonnet) — implements per spec under bound SprintContract. Reads Evaluator feedback via file IPC. At iteration N start, MUST read `<sprint>/iterations/iteration-N/lead-guidance.md` if present (auto-injected analyzer synthesis from prior iteration via W3.1b SubagentStop hook). **MUST author `self-assessment-NNN.md` at iteration end** (per-criterion claim + reasoning + §Known issues + §Untested edges). Self-assessment is transparency-only — NEVER influences verdict (Evaluator/grader retain exclusive scoring authority). MUST NOT assign weighted scores. MUST pass `dryRunRef` arg in `commit_edits` after running `compute_edits_dry_run` + `pm_grader_dispatch` (rule 16 v3.2.0 §Loop steps 3-5; commit-edits-precondition gate).
- **Lead** (opus[1m]) — orchestrates the loop: spawns Generator, reads `feedback-NNN.md`, decides next-state (pass/revise/abort). **Lead does NOT grade.** Self-grading bias is architectural (Prithvi 2026-03-24); structural separation eliminates it.
- **pm_grader_dispatch** (Sonnet 4.6 default; Opus 4.7 when `criterion.tier="critical"`) — fresh `claude -p` subprocess for `domain="model"` rubric criteria. Reads only `{rubricPath, artifactPaths, feedbackHistoryPaths, sprintContractRef, selfAssessmentPath?}`. Returns `{verdict, perCriterionScore, overallScore, evidence[]}`. Emits `grading_completed`. When `selfAssessmentPath` provided, evidence MUST cite divergence between Generator self-claim and grader verdict.
- **harness-evaluator** (opus, 3-role variant) — spawned only for cross-iteration coherence checks or adversarial isolation. 2-role default = Lead orchestrates + `pm_grader_dispatch` grades model-domain + in-process handlers grade code/rule/hybrid/human.
- **Worktree isolation (v4.1.0)** — harness-generator and all implementer-tier subagents (implementer / hook-builder / mc-implementer / pm-implementer / kosmos-implementer / home-implementer) spawn with `isolation: "worktree"` in agent frontmatter. This enforces the Lance Martin 2026-04-08 Brain/Hands/Session cattle-not-pets principle at the Hands layer: each subagent runs in an auto-created `.claude/worktrees/<name>/` git worktree, auto-cleaned on exit, enabling concurrent sprint sandboxes without main-tree pollution. Lead Agent spawn override allowed only with explicit reasoning in the spawn briefing.

## §Loop (v3.2.0 full sequence)

`negotiate → propose → dry-run → grade → (pass) commit | (fail) revise → analyzer-synthesize`.

1. **negotiate** — Planner completes spec + rubric. `negotiate_sprint_contract` MCP binds SprintContract. Emits `sprint_contract_bound` event.
2. **propose** — Generator produces edits via `apply_edit_function` (returns Edits[] without commit per Two-Tier Action). Emits `edit_proposed` event.
3. **dry-run** — Generator calls `compute_edits_dry_run` with proposed edits. Handler emits `validation_phase_completed errorClass="dry_run_computed"` carrying a deterministic `dryRunRef` (sha256 of inputs).
4. **grade** — `pm_grader_dispatch` (model-domain) or in-process graders (code/rule/hybrid/human/simulator) score against rubric. With `dryRunRef`, dispatch emits `validation_phase_completed errorClass="dry_run_graded"` with verdict. Validation-errors guard: when prior dry-run failed validation, dispatch skips subprocess + emits `errorClass="dry_run_skipped_validation_errors"` with synthetic fail.
5. **(pass) commit** — `commit-edits-precondition` hook verifies bound contract + paired `dry_run_graded(verdict=pass)` for same `dryRunRef` (Quick Sprint mode bypasses dry-run check; grace period exempts contracts bound before W3.1c rolled out). Generator calls `commit_edits`. Emits `edit_committed` event.
6. **(fail) revise** — `harness-analyzer-trigger` PostToolUse hook fires when `grade_outcome_with_rubric` returns fail-verdict ∧ iteration ≥ 1. Hook writes idempotent request marker to `/tmp/claude-hooks/<sessionId>/analyzer-request-<sprint>-<iter>-<rubricId>.json` + emits `phase_completed phaseTag="harness-analyzer-fire-pending"`. Lead picks up next turn, spawns `harness-analyzer` subagent (hooks cannot directly spawn). Analyzer writes `analysis-NNN.md`. `analyzer-output-injector` SubagentStop hook copies analysis to `<sprint>/iterations/iteration-(N+1)/lead-guidance.md` for next-iteration Generator briefing AND deletes consumed markers (W3.1d lifecycle closure). Cross-session safety: `analyzer-marker-pickup` SessionStart hook (W3.1d, plugin v3.11.0+) re-surfaces stranded markers from prior sessions as `additionalContext` so Lead spawns the analyzer even after `/clear` or context compaction mid-loop.

Hard threshold policy: score ≥ threshold = passed; iteration limit = failed; `/pm-harness-abort` = aborted.

Audit envelopes: `dry_run_computed`, `dry_run_graded`, `dry_run_skipped_validation_errors`, `simulator_evaluation_completed` (W4 v1.31.0+), `harness_bypass_invoked`, `harness_gate_passed` — all piggyback on `validation_phase_completed` envelope (no schema bump per audit envelope).

## §SprintContract

`negotiate_sprint_contract` MCP binds: theme, timeboxMs, gradingRubric, disagreementResolution, terminationHardThreshold, **mode** (full | quick | lite | strict | null; per schemas v1.30.0+). `sprint_contract_bound` event on negotiation. Violations fail loud.

## §GradingRubric

Array of `GradingCriterion { criterionId, rubricDomain: "code"|"rule"|"model"|"human"|"hybrid"|"simulator", weight, validationExpression|scoringPrompt, threshold }`. `grade_outcome_with_rubric` MCP dispatches per domain. `simulator` domain (schemas v1.31.0+, plugin v3.9.1 W4) applies edits to a transient ontology graph copy + runs `impact_query` for affected RIDs + returns impact-radius normalized score (lower radius = better). `pm_grader_dispatch` is the canonical model-domain grader (separate-context fresh `claude -p` subprocess; eliminates self-grading bias).

## §File-based IPC

Generator ↔ Evaluator communicate ONLY via `<project>/.palantir-mini/harness/sprints/<sprintId>/feedback-NNN.md` (and `analysis-NNN.md` written by harness-analyzer). Direct SendMessage between them is forbidden (breaks audit trail). Lead reads feedback, emits events, decides next state.

## §Ad-hoc grading + Playwright

`/palantir-mini:pm-harness-grade <artifact>` grades without a full loop. `run_playwright_scenario` MCP executes PlaywrightScenario primitive; emits `playwright_scenario_executed` event with screenshots + console + network trace IDs.
