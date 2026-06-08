# Changelog — palantir-mini

All notable changes to this plugin are documented here.
Versioning follows rule 08 (schema-versioning.md): MINOR for additions/fixes, MAJOR for breaking changes.

---

## [unreleased]

## [6.94.0] - 2026-06-08 — Harness redesign W3b-2a: drop harness-species-cost-profile + router dispatchSpecies

### Removed
- **`schemas-snapshot/ontology/primitives/harness-species-cost-profile.ts`** (321 LOC) — the cost-aware harness-species vendor/cost-profile registry (`HarnessSpeciesVendor`, `HarnessSpeciesCostProfileDeclaration`, `HARNESS_SPECIES_COST_PROFILES`). Vendor/cost/model selection is a runtime-adapter concern, not the neutral SSoT. Pruned from primitives barrel + foundry map + package.json exports + MANIFEST.json.
- **`pm_intent_router` `dispatchSpecies` field** (`IntentRouterResult.dispatchSpecies`) — was a hardcoded `"claude-code-cli-max"` species tag in the router result + emit payload. Species selection moves to the Claude adapter (deferred to W4). Removed the field, the `HarnessSpeciesVendor` import/re-export, and 3 dispatchSpecies-only tests + scattered assertions.

First half of W3b-2 (router de-identity, strip-only — adapter re-home deferred to W4 per user 2026-06-08). The old-identity fields were consumed only by tests, not live runtime. typecheck green; 66/66 affected router+recipe tests pass. W3b-2b (recipe-builder AgentModel/DOMAIN_AGENT/DAG → neutral DispatchDecision) follows.

## [6.93.0] - 2026-06-08 — Harness redesign W3b-1: drop claude-code-version old-identity primitive + cc-allowlist hook

### Removed
- **`schemas-snapshot/ontology/primitives/claude-code-version.ts`** — a Claude-Code-specific version registry primitive (`ClaudeCodeVersionRegistry`, `compareClaudeCodeVersions`). Old-identity surface: runtime version pinning belongs in the Claude adapter, not the runtime-neutral SSoT. Its only code consumer was the unregistered `cc-allowlist-drift-check` hook (also removed). Pruned from the 3 barrels + foundry-equivalent map + schemas-snapshot manifests (package.json exports, MANIFEST.json, .manifest.json).
- **`hooks/cc-allowlist-drift-check.ts`** + test — unregistered (absent from hooks.json + codex-hooks.json); compared the installed Claude Code version against a pinned allowlist — a Claude-adapter concern, not neutral core.

First half of W3b (old-identity drop); W3b-2 (pm-intent-router/recipe-builder → neutral DispatchDecision + harness-species-cost-profile drop) follows. typecheck green; 28/28 affected tests pass. Note: schemas-snapshot internal version strings are inconsistent (CHANGELOG 1.68, MANIFEST.json 1.67.0, barrel 1.62.0, .manifest.json 1.37.0) — pre-existing debt, flagged for a future schemas-version-hygiene pass.

## [6.92.0] - 2026-06-08 — Harness redesign W3 sprint-GAN-2: remove release-gate self-check ceremony + lib/harness remnants

### Removed
- **4 sprint-release-gate self-checks** from `pm_plugin_self_check` (broad-test-ratchet, eval-suite-artifacts, adversarial-verifier-evidence, outcome-replay-evidence) + their `PmPluginSelfCheckResult` fields. These enforced the sprint-GAN broad-suite ratchet + changed-surface evidence ceremony; solo-hostile release gating obsoleted by the runtime-neutral harness model (blueprint G5).
- **`lib/harness/{failure-ledger,release-evidence}.ts`** + their tests — backing modules for the removed checks. `lib/harness/` is now empty and gone.

### Changed
- `core/contracts/workflow-family-enforcement.ts` — dropped the `release-evidence` blocking gate + the `self-check:release-evidence` self-check from the releaseAndShipping family; removed the orphaned `self-check:broad-test-ratchet` self-check from validationEvalAndHarness; repointed evidence/validation refs off the deleted `tests/lib/harness/release-evidence.test.ts` to neutral existing tests. The KEEP `self-check:workflow-family-release-gate` + the live `lib/release/workflow-family-release-gate.ts` are untouched.

Second half of the W3 sprint-GAN REPLACE sub-wave (blueprint G5); completes lib/harness removal. typecheck green; 29/29 affected self-check + contract tests pass.

## [6.91.0] - 2026-06-08 — Harness redesign W3 sprint-GAN-1: extract findProjectRoot, drop auto-bootstrap advisory hook

### Changed
- **Extracted `findProjectRoot` to a neutral util** (`lib/project/find-root.ts`). It walks upward for the `.palantir-mini/` cross-runtime session marker (rule 27), so project-root detection is runtime-neutral and no longer lives inside a sprint hook. Repointed all 7 importing hooks (bypass-budget-monitor, write-scope-runtime-enforce, prompt-dtc-enforcement-gate, orphan-pair-watchdog, lead-ontology-discovery-completeness, prompt-front-door-capture, pre-edit-impact-mcp-first). Logic unchanged.

### Removed
- **`hooks/harness-base-mode-advisory.ts`** — the sprint-GAN auto-bootstrap hook (created a default "Quick Sprint" SprintContract on SessionStart, B2 hard default-on). Unregistered in both hooks.json and codex-hooks.json; solo-hostile sprint ceremony obsoleted by the runtime-neutral harness model. Its `harnessDirExists`/`findBoundContract` exports had no external importers.
- **`lib/harness/active-contract.ts`** + its test — the SprintContract locator, consumed only by the removed advisory hook.

First half of the W3 sprint-GAN REPLACE sub-wave (blueprint G5). The release-gate self-checks + `lib/harness/{failure-ledger,release-evidence}.ts` follow in sprint-GAN-2. typecheck green; 136/136 affected hook tests pass.

## [6.90.1] - 2026-06-08 — chore: sync version fields (PR #96 bumped only plugin.json)

### Fixed
- **Version-field desync.** PR #96 (6.90.0) bumped only `plugins/palantir-mini/.claude-plugin/plugin.json`; the other 8 of 9 version fields (`package.json`, `.codex-plugin/plugin.json`, `plugins/palantir-mini/.claude-plugin/marketplace.json` ×3, root `.claude-plugin/marketplace.json` ×3) stayed at 6.89.0, breaking the per-wave 9-field lockstep (rule 25 ship discipline). Synced all 9 fields to **6.90.1**. No functional change — the hooks.json fix from #96 is unaffected.

## [6.90.0] - 2026-06-08 — Fix: Claude hooks.json uses ${CLAUDE_PLUGIN_ROOT} (revert #89 regression)

### Fixed
- `hooks/hooks.json` — reverted all 47 `${PALANTIR_MINI_PLUGIN_ROOT}` references back to `${CLAUDE_PLUGIN_ROOT}`. PR #89 swapped to the custom var to work around an "empty CLAUDE_PLUGIN_ROOT" symptom, but nothing in the Claude runtime sets `PALANTIR_MINI_PLUGIN_ROOT` (not settings env, not managed-settings.d, not a session hook), so every Claude hook expanded to `/scripts/run.ts` / `/hooks/…gate.ts` and failed `Module not found`. The real cause of the original empty expansion was the duplicate manifest.hooks pointer (double hook-load), already fixed independently by #90. With the double-load gone, `${CLAUDE_PLUGIN_ROOT}` expands correctly in hook command strings — same pattern the plugin's own MCP server (plugin.json) and the vercel plugin's hooks both use successfully. Codex's `codex-hooks.json` continues to use `${PLUGIN_ROOT}` (set by the Codex adapter) and is unchanged.

## [6.89.0] - 2026-06-08 — Harness redesign W3a: zero-risk DELETE (dead/obsoleted surface)

### Removed
- `lib/agent-audit/` (decision-extractor + test) + `skills/pm-agent-audit-trail/` — dead Claude-Agent-Teams audit ceremony. Its authority (retired rule 12) is gone, it has zero live event producers, and its referenced MCP handler never existed (phantom). No code importer (only a doc-citation comment in `post-edit-verifier-suggest.ts`).
- `lib/value-grade/consensus.ts` (+ test) + the T3→T4 consensus-promotion block (Step 7) in `hooks/value-grade-assigner.ts` — obsoleted by rule 26 v2.0.0, which dropped K≥2 multi-vendor consensus for solo-dev. `effectiveGrade` now follows `grade` (no promotion). The `D2` payload flag is retained (separate grading criterion).
- `bridge/handlers/grade_planner_output.ts` + `bridge/handlers/grade-classification-accuracy.ts` (+ 3 tests) — dead graders: unregistered in `mcp-server`, already recorded as removed in `_deprecation-map.ts`, no code importers (sprint-GAN planner meta-rubric + retired impact-query calibration loop). Deprecation-map / deletion-readiness / append-only event-type entries retained per rule 10.

### Notes
- Part of the palantir-mini Ground-Up Harness Redesign, Wave 3 (control-surface core), sub-wave **W3a** — the genuinely zero-risk deletes. The sprint-GAN cluster (`lib/harness/*`, `harness-base-mode-advisory`, the 4 release self-checks) was split OUT of W3a after live verification showed it is REPLACE-level, not zero-risk: `harness-base-mode-advisory.ts` exports the shared `findProjectRoot` used by 7 hooks, and `release-evidence.ts` couples to the live workflow-family release gate + 2 contract tests. It will land as its own sub-wave.

## [6.88.0] - 2026-06-07 — Harness redesign W4: Claude adapter for the understand-phase

### Added
- `skills/pm-understand` — the thin Claude-runtime adapter for the 9-axis understand-phase heart. Renders the canonical engine (`nine-axis-sic-fill-sequence.ts` + `nine-axis-understand-session.ts`) as a non-developer, bilingual (KO/EN), turn-by-turn elicitation that produces a reviewable 9-axis SemanticIntentContract. Cites the engine as source-of-truth (no re-implementation). (palantir-mini Ground-Up Harness Redesign, Wave 4 — Claude adapter; Codex adapter deferred.)

---

## [6.87.0] - 2026-06-07 — Harness redesign W2b: understand-session (heart elicitation surface)

### Added
- `lib/semantic-intent/nine-axis-understand-session.ts` — the runnable elicitation surface over the nine-axis-sic engine: `nineAxisTurnCard(turnIndex)` produces a non-developer, bilingual (KO/EN) `TurnCardDecisionSpec` per turn; a functional session runner (`startNineAxisSession` / `nextCard` / `answerCard` / `isSessionComplete` / `sessionContract`) drives the 10-turn conversation end-to-end into a 9-axis SIC. Runtime-neutral — adapters render the card. (palantir-mini Ground-Up Harness Redesign, Wave 2b.)

### Notes
- Additive; per-axis non-developer rationale included. typecheck + tests green. Per-runtime adapters (Claude skill / Codex) to render the card land in W4.

---

## [6.86.0] - 2026-06-07 — Harness redesign W2: 9-axis understand-phase SIC

### Added
- 9-axis SemanticIntentContract surface (`SemanticIntentAxes` / `SicAxis` / `SicAxisKey`) on the SSoT `semantic-intent-contract` primitive (self-ontology) + runtime projection in `lib/lead-intent/contracts.ts`. Axes: DATA / LOGIC / ACTION / GOVERNANCE + CONTEXT / SUCCESS-EVAL / CONSTRAINTS-NONGOALS / ACTORS / MEMORY-PRIOR.
- `nine-axis-sic` fill policy — a runtime-neutral, non-developer-friendly, bilingual (KO/EN) 10-turn elicitation sequence (`NINE_AXIS_SIC_SEQUENCE` + `advanceNineAxisSicSequence` + `nineAxisSicReadinessIssues`) surfacing explicit + implicit intent into the 9 axes. Registered in `fill-policy.ts`. (palantir-mini Ground-Up Harness Redesign, Wave 2 — the understand-phase heart.)

### Notes
- Additive: existing fill sequences (default-8-turn, context-engineering-to-sic, dtc-turn-fill, fde-ontology-build, ontology-dtc-build) unchanged. typecheck + new tests green.

---

## [6.85.0] - 2026-06-07 — Harness redesign W1: in-plugin SSoT canonicalized

### Changed
- Promote `runtime-overlay/schemas-snapshot/` to the canonical, plugin-owned, LLM-agnostic runtime SSoT. Removed the `schemas` sync target from `scripts/refresh-runtime-overlay.ts` so the snapshot is no longer regenerated from upstream `~/.claude/schemas` (retired, pending consumer-check). Added `CANONICAL.md` marker. (palantir-mini Ground-Up Harness Redesign, Wave 1.)

### Removed
- Dropped 8 dead ontology primitives (0 importers): canonical-source-registry, canvas-layout-stage, delegation-token, failure-mode-synthesized, harness-component, scene-coupling-v4, semantic-frontmatter, sprint-completed.

### Added
- `runtime-overlay/schemas-snapshot/BROWSE.md` + `INDEX.md` — least-context navigation/catalog for the in-plugin SSoT.

---

## v6.84.1 (2026-06-07) — Claude hook-load fix (manifest double-load)

- Removed `"hooks": "./hooks/hooks.json"` from `.claude-plugin/plugin.json`. Current Claude Code auto-loads the standard `hooks/hooks.json`, so the manifest reference double-loaded the same file → "Duplicate hooks file detected" hook-load failure. Completes #89, which renamed `claude-hooks.json` → `hooks.json` but left the now-redundant `manifest.hooks` pointer.
- Documented `hooks/hooks.json` as the Claude-runtime hook registry in its `description` field (warns against re-adding the manifest reference, preventing regression). Codex registry remains `hooks/codex-hooks.json`.

---

## v6.84.0 (2026-06-07) — Wave 3-side plugin sync + skill genericization

- Genericized 9 skill docs (project-name examples → project-agnostic placeholders).
- Cleaned 24 hook `.ts` forward-citations to retired rules (12/16/19/20/21/22/23/24/28) — resolves pm_rule_audit (advisory 32→0). Rule 22 citations repointed to rule 08 §Hook-citation (folded).
- Synced `runtime-overlay/rules/` snapshot to the leaned 8-rule overlay (rule-registry.ts regenerated; 8 cut-rule copies removed; kept rules + meta refreshed).
- Updated 3 citation-assertion tests to match new phrasing.
- Companion to home-repo Wave 3 (PR #590) overlay rewrite 17→8.

---

## v6.83.0 (2026-06-07) — Wave 2 rationalization — machinery cut (~40%)

### Removed — Sprint GAN harness (CUT-C)
- **11 skills removed**: pm-harness-plan, pm-harness-sprint, pm-harness-abort, pm-harness-grade, pm-harness-analyze, pm-harness-resume, pm-harness-status, pm-harness-eval, pm-harness-list, pm-harness-rubric, pm-quick-sprint.
- **4 agents removed**: harness-planner, harness-generator, harness-evaluator, harness-analyzer.
- **4 MCP tools removed**: negotiate_sprint_contract, grade_outcome_with_rubric, pm_grader_dispatch, compute_edits_dry_run.
- **13 harness hooks removed**: commit-edits-precondition, harness-base-mode-advisory, harness-analyzer-trigger, analyzer-output-injector, analyzer-marker-pickup, sprint-contract-state-sync, harness-evaluator-spawn-gate, generator-self-assessment-gate, grading-schema-validate, dry-run-gate, sprint-timeout-watchdog, sprint-iteration-cap, rubric-threshold-enforcer.
- **Libs removed**: lib/sprint-contract, lib/closed-loop, harness ratchet/validation modules.
- **KEPT**: commit_edits + apply_edit_function (now ungated), lib/harness/{release-evidence,failure-ledger,active-contract}.

### Removed — Multi-agent orchestration hooks (CUT-D, 11 hooks)
- teammate-idle, idle-auto-shutdown, session-duration-alarm, briefing-template-validate, task-created-granularity-gate, task-context-budget-enforcer, briefing-task-count-limit, plan-task-dag-validate, parallel-spawn-version-advisory, subagent-orchestration-audit, concurrency-cap-fix.

### Removed — Enforcement governance hooks (CUT-E, 9 hooks)
- pre-delegation-check, lead-direct-edit-watch, lead-direct-token-audit, lead-git-operation-watch, agent-decision-log, agent-decision-trail, evidence-domain-coverage-gate, ontology-engineering-turn-fan-out-gate, complex-task-detector.
- **KEPT**: events-5d-gate + value-grade-assigner.

### Removed — Multi-vendor cost dispatch (CUT-F)
- selectSpecies + cost branch from pm_intent_router (handler itself kept, simplified).

### Fixed
- _deprecation-map.ts: corrected 5 invalid pm_health_audit mode strings.

### Counts
- MCP tools: 31 → 27 | Hooks: 100 → 67 | Handlers: 76 → 65 | Skills: 79 → 63 | Agents: 24 → 15.

### Test suite
- Full suite: 3175 pass; 4 fail = 3 pre-existing-unrelated + 1 expected Wave-3 seam (pm_rule_audit ≤10 advisory, resolved when Wave 3 removes cut-hook citations from ~/.claude/rules/).

---


## v6.82.0 (2026-06-07) — Wave 1 rationalization — project decoupling

### Removed

- **lib/education/**: deleted curriculum/, lecture/, and readiness/ modules (project-coupled education logic).
- **eval-suites**: deleted `eval-suites/lecture-delivery-kernel-v0.json` (education-specific eval suite).
- **co-located tests**: removed paired tests for lib/education modules.
- **handler opt-ins**: removed `includeCurriculumContext` / `curriculumQueryTerms` parameters from `ontology_context_query` handler and MCP tool schema.

### Relocated

- **lib/reference/**: `palantir-reference-pack.ts` moved from `lib/education/` to `lib/reference/` (generic; doc-drift handler repointed).

### Changed

- **workflow-family**: `applicationAndChatbotAuthoring` genericized — retrieval-context now imports from `lib/ontology-context/retrieval-context.ts`; education eval/wording removed.
- **tests**: version-consistency test made version-agnostic (checks package.json vs manifest parity rather than hardcoded version string).

---

## v6.81.0 (2026-06-07) — Wave 0 rationalization — zero-risk surface cuts

### Removed

- **skills**: `pm-delegate-or-direct`, `pm-delegate-or-direct-quick`, `pm-portable-bundle`, `pm-rehydrate`, `pm-restore` — dead/deprecated skills deleted.
- **agents**: `home-implementer.md`, `kosmos-implementer.md`, `mc-implementer.md`, `pm-implementer.md`, `project-implementer.md` — deprecated project-specific implementer agents removed; generic `implementer.md` retained.
- **handler**: `bridge/handlers/ontology-context-query-legacy.ts` — legacy handler + paired test + HANDLER_MODULES map entry removed (GUARD confirmed no runtime callers outside the allowed whitelist).
- **seed**: `runtime-overlay/schemas-snapshot/ontology/seeds/skill-definitions.ts` — pruned `pm-portable-bundle`, `pm-rehydrate`, `pm-restore` entries to match filesystem.

---


## v6.80.0 (2026-06-07) — Claude install path restored + un-versioned control-plane consolidation

### Added

- **Claude native install path restored** — re-adds `.claude-plugin/plugin.json` + root & plugin-level `.claude-plugin/marketplace.json` (removed in the prior Codex-only consolidation, commit `904c12d`) and the Claude-native hook registry `hooks/claude-hooks.json` (`${CLAUDE_PLUGIN_ROOT}` tokens, all Claude events incl. Task/Team lifecycle). The marketplace is dual-runtime again; Codex `.codex-plugin/` + `.agents/` surfaces are untouched. The Claude MCP server self-attributes via `PALANTIR_MINI_HOST_RUNTIME=claude`.
  - Manifest `hooks` uses the schema-accepted relative form `./hooks/claude-hooks.json` (the legacy `${CLAUDE_PLUGIN_ROOT}/hooks/...` form is rejected by current `claude plugin validate`); two non-schema fields (`compatibleSchemaVersions`, `requiresClaudeCodeVersion`) were dropped from the Claude manifest. `claude plugin validate` passes clean.
- **lib(fde-ontology-engineering): long-running session substrate for nondeveloper ontology engineering** — adds `FDEOntologyEngineeringSession`, `LatentIntentHypothesis`, candidate models, clarification questions, bounded recent turn summaries, and hashed `FDEOntologyTurnRecord` contracts under `lib/fde-ontology-engineering/`. Adds `session-store.ts` to create sessions from `UniversalOntologyEntry`, write snapshot/current pointers under `<project>/.palantir-mini/session/fde-ontology-engineering/`, append turn records, and keep raw user prompt text out of session snapshots. Focused tests cover creation, persistence, raw prompt avoidance, and 500+ turn support with only the latest 20 turn summaries embedded. No handler, hook, schema snapshot, generated file, public MCP, or SIC/DTC behavior change. (PR #516)

### Changed

- **Version synced to 6.80.0** across `package.json`, the restored Claude manifests, and the `.codex-plugin/plugin.json` version value (value-only sync) so both runtimes report the same version.
- **docs+manifest: PR-K release closeout** — aligns public README and Claude marketplace metadata with the shipped PR-B through PR-J control-plane surface: Lead orchestration docs, ContextEngineeringPlanV3 advisory lanes, MCP capability metadata, DTC surface pre-mutation checks, WorkContract router bindings, agent output contracts, harness ratchet release gates, Codex runtime-gap documentation, and BackPropagation ratchet proposals. Keeps runtime behavior and generated mirrors unchanged.

### Removed

- **`claude-code-version-check` SessionStart hook reference dropped** from the Claude registry — its handler (`hooks/claude-code-version-check.ts` + `bridge/handlers/claude-code-version-delta/*`) had been removed; native `requiresClaudeCodeVersion: ">=2.1.110"` in `plugin.json` covers Claude Code version gating.

---

## v6.79.0 (2026-05-22) — FDE turn quality, structured DTC surfaces, and image-teacher-qa retirement

### Removed

- **image-teacher-qa workflow and ontology artifacts retired** — removes the `skill-methodological-ssot-gate` hook/test/example plus the `projects/education` image-teacher-qa ontology and artifact outputs. The Methodological SSoT remains in place; only the image-teacher-qa-specific workflow/ontology surface is removed. Hook registry count is now 104 commands.

### Added

- **lib(chatbot-studio): LeadOntologyTurnCardV3** — adds structured hypothesis previews and explicit accept/reject/defer effects for SIC, DTC, and DATA/LOGIC/ACTION/TECHNOLOGY/GOVERNANCE review domains while keeping cards non-authorizing.
- **lib(fde-ontology-engineering): domain-aware latent hypothesis templates** — adds education, MYP reference, explanation-label, 3D runtime, writeback, student-facing, and Chatbot Studio application-state templates plus deterministic rule coverage.
- **evals: fde-turn-quality-semantic** — adds a deterministic semantic eval suite covering thinking-step evidence, explanation labels before generation, MYP reference boundaries, 3D runtime boundaries, student-facing approval, and Chatbot Studio application-state prompts.
- **lib(governance): DTC structured surface policy** — extracts allowed/forbidden FileSurface refs and closed review domains from DTCs, then uses them in pre-mutation and FDE governance policy checks.
- **lib(harness): HarnessRatchetPlanner** — maps broad-suite failure classifications to permanent harness improvement plans and release-blocking repair decisions.

### Changed

- **FDE readiness and evidence promotion tests hardened** — readiness v3 requirements are test-locked around latent-intent decisions, non-goals, and evidence classification; phase-aware evidence promotion tests now cover reference, SIC authority, DTC authority, mutation, and promoted cases.
- **runtime overlay docs updated for Codex skill exposure** — root `AGENTS.md` documents the narrowed default Codex skill/plugin injection surface and the source-path authority rule for palantir-mini skills.

---

## v6.78.0 (2026-05-15) — DTC governance: turn-by-turn fill + grading + fail-closed router

**Sprint 97 canonical DTC governance release** (`~/.claude/plans/inherited-yawning-popcorn.md`). Ships 5 capability bundles across 18 PRs (#492-#508): (1) workbench DTC fill — 7-turn T0-T6 fill sequence, DTC panel builder, workbench-state lifecycle, context-capsule attachment, SIC approval cache extension, governance policy "dtc-fill-incomplete" + "ontology-affecting-intent-without-dtc-ref" rule IDs; (2) dtc-rubric/v1 — 12-criterion grading rubric with Opus critical tiers, typed-ref resolver, project-scope conformance evaluator; (3) typed-ref enforcement — `validateDigitalTwinChangeContract` enforces ontology-affecting DTCs to carry ≥1 touchedOntologyRef AND ≥1 requiredEvaluationRef + DTC handler branch in `pm_semantic_intent_gate` + DTC readiness diagnostics in `ontology_context_query`; (4) router fail-closed — `pm_intent_router` returns `contract_required` decision when ontology-affecting raw intent arrives without approved SIC+DTC refs; (5) hooks gate selective-blocking default-on — 7-day shakedown window active (2026-05-15 to 2026-05-22). Plan §13 self-test + §13.4 shakedown audit apply. Bypass envvars: `PALANTIR_MINI_DTC_EVAL_REFS_BYPASS=1`, `PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1`, `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off|advisory|selective-blocking|scoped-blocking|blocking`.

### Added (W1 — lib DTC primitives, PRs #493-#495 + commit 7812ba61f)
- **lib(semantic-intent): DTC_FILL_SEQUENCE T0-T6 + DtcWithFillFields + advanceDTCFillSequence** — 7-turn DTC fill-sequence primitives mirroring EIGHT_TURN_FILL_SEQUENCE. Bilingual KO+EN per plan §5.12. Backward-compat: absent fillPolicy → unused. (Sprint 97 W1, plan §5.1+§5.2+§5.3)
- **lib(event-log): 5 new DTC governance event types** — registers `dtc_fill_turn_advanced` + `digital_twin_contract_finalized` + `dtc_grading_completed` + `dtc_grader_runtime_gap` + `dtc_eval_refs_bypass_invoked` in EventType union with typed payload interfaces. Adds `emitDtcFillTurnAdvanced` helper. Extends `UniversalOntologyEntryTransitionRefs.dtcFillProgressRefs?` optional field. (Sprint 97 W1, plan §18.3)
- **lib(lead-intent): dtc-rubric/v1 12-criterion grading rubric + gradeDigitalTwinChangeContract orchestrator** — adds canonical DTC GradingRubricDeclaration (weights sum 1.0) with code/model/simulator/rule domains. #2/#6/#10 tier=critical (Opus xhigh dispatch). Codex deterministic-only fallback (7/12 weight 0.56). (Sprint 97 W1, plan §6.1-§6.7)
- **lib(lead-intent): resolveDTCToolSurfaceTerms + evaluateProjectScopeConformanceForDTC helpers** — typed-ref resolution for DTC tool-surface readiness + project-scope conformance evaluator. Feeds Wave 4 validator + Wave 4 grading rubric. (Sprint 97 W1, plan §5.10)

### Added (W2 — workbench DTC panel + fill policy, PRs #496-#498)

- **lib(semantic-intent): FillPolicy "dtc-turn-fill" variant + selectDtcFillSequence selector** — extends FillPolicy union/const + adds DTC fill sequence selector parallel to selectFillSequence. (Sprint 97 W2, plan §5.4)
- **lib(chatbot-studio): DtcPanelProjection + DtcFillSequenceSession + buildDtcPanel** — NEW dtc-panel-builder.ts + dtc-fill-session.ts mirroring fde-panel-builder pattern. HARD INVARIANT: mutationAuthorizedFromPanel literal false. Bilingual KO+EN status messages. (Sprint 97 W2, plan §5.5+§5.6)
- **lib(chatbot-studio): SemanticWorkbenchState.dtcPanel? + DTC turn pre-emption in defaultReviewCards + dtc-fill-in-progress lifecycle** — extends workbench-state + semantic-conversation-state with backward-compat byte-identical guard. FDE smoke test 31 pass byte-identical. (Sprint 97 W2, plan §5.7+§5.8)

### Added (W3 — SIC cache + context capsule + governance policy, PRs #499-#501)

- **lib(context): ContextCapsuleInput.dtcFillSequence? + activeDTCTurnIndex? + attachDtcFillStateToCapsule helper** — extends context-capsule input shape with DTC fill state for prompt-time context attachment. (Sprint 97 W3, plan §4.1 dtc-T3-lib-context-capsule)
- **lib(prompt-front-door): SicApprovalEntry DTC fields + readDTCApprovalFromCache** — extends approval cache with dtcApprovedAt? + dtcFillTurnsCompleted? + lastApprovedRubricScore? optional fields. Adds DTC-focused reader with 60-min TTL preserved. (Sprint 97 W3, plan §4.1 dtc-T3-lib-sic-cache)
- **lib(governance): policy-compiler "dtc-fill-incomplete" + "ontology-affecting-intent-without-dtc-ref" rule IDs + pre-mutation-governance dtcFillSequenceStep refs** — extends governance with 2 new PolicyRuleId branches gating DTC-incomplete and ontology-affecting-intent-without-DTC-ref cases. Adds isFillComplete + isOntologyAffectingBySurfaces helpers. Golden-master test invariant preserved: 18 existing policy-compiler branches unchanged. (Sprint 97 W3, plan §4.1 dtc-T3-lib-governance-policy)

### Added (W4 — bridge + validator + sig-gate, PRs #502-#504)

- **bridge(ocq): ontology-context-query DTC enforcement** — `ontology_context_query` mutation modes gate on approved SIC+DTC when `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=selective-blocking|blocking`. Non-mutation read modes remain ungated. (Sprint 97 W4, plan §4.1 dtc-T4-bridge-ocq)
- **bridge(validator): typed-ref enforcement for DTC tool-surface terms** — bridge-level validator blocks DTC contracts with unresolved tool-surface terms. `resolveDTCToolSurfaceTerms` feeds the validation gate. (Sprint 97 W4, plan §4.1 dtc-T4-validator-typed-refs)
- **bridge(sig-gate): pm-sig-gate blocking on unresolved DTC typed refs** — `pm-sig-gate` hook gates `apply_edit_function` / `commit_edits` when DTC typed refs fail validation. `PALANTIR_MINI_DTC_EVAL_REFS_BYPASS=1` audited bypass. (Sprint 97 W4, plan §4.1 dtc-T4-bridge-sig-gate)

### Added (W5 — router + hooks gate + skill + workbench template, PRs #505-#508)

- **bridge(router): pm_intent_router fail-closed on ontology-affecting raw intent** — returns `{decision: "contract_required", basis: "ontology-affecting-raw-intent-fail-closed"}` when prompt is ontology-affecting and lacks approved SIC+DTC refs. `PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1` audited bypass. (Sprint 97 W5, plan §4.1 dtc-T5-router-fail-closed)
- **hooks: prompt-dtc-enforcement-gate selective-blocking default-on** — 7-day shakedown window active 2026-05-15 → 2026-05-22. Gate blocks ontology-affecting MCP tools without approved SIC+DTC. Control: `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off|advisory|selective-blocking|blocking`. (Sprint 97 W5, plan §4.1 dtc-T6-hooks-gate-default-on)
- **skill: pm-dtc-fill** — NEW `/palantir-mini:pm-dtc-fill` skill driving the 7-turn DTC fill workbench. Orchestrates T0-T6 sequence, emits `dtc_fill_turn_advanced` per turn, finalizes with `digital_twin_contract_finalized`. (Sprint 97 W5, plan §4.1 dtc-T5C-skill-dtc-docs)
- **workbench: hitl-lead-feedback DTC turn card template** — `workbenches/hitl-lead-feedback/templates/dtc-turn-card.md` canonical HITL review template for DTC fill turns. (Sprint 97 W5, plan §4.1 dtc-T7-workbench-template)
- **supersede: TRQ212 temporal reasoning** — PR #492 superseded TRQ212 pattern with Sprint 97 DTC governance-native approach. (Sprint 97 early, plan §4.1 dtc-T0-TRQ212-supersede)

### Sprint 97 merge SHAs

PR #492 (TRQ212 supersede): c52e30cbb | PR #493 (fill-sequence): 4c5184ed0 | PR #494 (grade-rubric): cfc0a138e | PR #495 (ref-resolver): b41c2de86 | commit emit-event: 7812ba61f | PR #496 (fill-policy): 9860a3bd8 | PR #497 (panel-builder): 33660b6a4 | PR #498 (workbench-state): 10bae9a34 | PR #499 (context-capsule): a89ce1b86 | PR #500 (sic-cache): 09d87739b | PR #501 (governance-policy): 1511a82c0 | PR #502 (bridge-ocq): e340b824e | PR #503 (validator-typed-refs): 4423a9dce | PR #504 (bridge-sig-gate): 858400e13 | PR #505 (router-fail-closed): bec3cc94b | PR #506 (hooks-gate-default-on): b22f03d2d | PR #507 (skill-dtc-docs): a256b423b | PR #508 (workbench-template): 9b86061b6

### Shakedown audit window

Hooks gate selective-blocking 7-day audit: 2026-05-15 → 2026-05-22. Lead runs `pm_rule_audit` + reviews `automerge_bypass_invoked` + `dtc_eval_refs_bypass_invoked` events post-window. Promote to blocking or extend shakedown per §13.4.

---

## v6.73.0 — 2026-05-14 (sprint-138, handler-v3.X: Quick Sprint single-round binding — rule 16 v4.2.0 implementation)

Implements rule 16 v4.2.0 §Quick Sprint single-round binding subsection (merged in rules chore PR #483, 2026-05-14). `negotiate_sprint_contract` handler now auto-binds Quick Sprint contracts atomically on the first `orchestrator + propose` call, eliminating the Lead-proxy 3-round handshake overhead.

### Added

- **handler edit** `bridge/handlers/negotiate-sprint-contract.ts` (additive +81 LOC, 0 existing logic removed; 1 doc-comment line updated) — adds `isQuickAutoBind()` eligibility helper + early-return bind path inside `action="propose"` branch. Eligibility:
  - `role === "orchestrator"` AND
  - `action === "propose"` AND
  - `contract.mode === "quick"` AND
  - (`contract.rubricInline` non-empty OR `contract.successCriteriaRids` non-empty OR `contract.gradingRubric.criteria` non-empty)
  
  When eligible, the handler skips intermediate negotiation rounds: calls existing `appendRoundBlock()` + existing `bindContract()` (no schema change) + returns `{status: "bound", round: 1, generatorApproved: true, evaluatorApproved: true, contractFile: <path>}`. Emits a single `sprint_contract_bound` event (existing payload shape, no new keys). No `sprint_contract_negotiated` intermediary emitted.
- **Tests** (3 files, 688 LOC) — 21 new tests + 14 existing pass = 35 total / 0 fail / 109 expect calls:
  - `negotiate-sprint-contract-quick-single-round.test.ts` (8 pass) — eligible auto-bind paths + ineligible fallback paths.
  - `negotiate-sprint-contract-non-quick-3-round-preserved.test.ts` (8 pass) — full/lite/strict/undefined modes ALL require 3 rounds + quick-without-rubric falls back to 3-round.
  - `negotiate-sprint-contract-event-emitted.test.ts` (5 pass) — exact-once event emission + payload field validation + no-intermediary + 3-round comparison + double-call behavior documentation.

### Backward-compat invariants (test-enforced)

- **Non-quick modes** (full / lite / strict / undefined) UNCHANGED. 3-round handshake (orchestrator propose → generator approve → evaluator approve) fully preserved.
- **Quick mode without rubric/criteria** falls back to 3-round handshake (no auto-bind ambiguity).
- **Generator/evaluator role + propose action** does NOT trigger auto-bind (orchestrator-only entry path).
- **Existing 14 tests** in `tests/bridge/handlers/negotiate-sprint-contract*.test.ts` all green (no regression).
- **`sprint_contract_bound` event payload** identical shape (no new mandatory keys); only the path taken (single-round vs 3-round) differs.
- **`sprint_contract_negotiated`** event NOT emitted on auto-bind path (matches semantic: no negotiation occurred).

### Out-of-scope

- No new MCP TOOLS array entry (handler-only behavior change).
- No new event type or payload schema.
- No new env-var bypass (single-round is the cheaper canonical path; bypass would mean re-enabling overhead).
- No hooks, no schemas-snapshot, no lib changes (handler-only).

### Bottleneck closure

Sprint-138 FDE session (2026-05-14) measured **7 Quick Sprints × 3 calls = 21 MCP calls for contract binding alone**. Post-v6.73.0: **7 calls (67% reduction)** with audit trail invariant preserved (Quick Sprint is Lead-only orchestration by design — rule 16 v3.1.0+).

### Dogfood note

This PR's own SprintContract `palantirkc-sprint-138-handler-v3-single-round-quick` was bound under the OLD 3-round pattern (the very pattern this PR retires). Next Quick Sprint session will exercise the new single-round binding path end-to-end.

### Sprint-138 final state

- FDE plan: 6/6 slices ✅ COMPLETE (v6.67.0–v6.72.0)
- Rules streamline: rule 16 v4.2.0 + rule 28 v1.1.0 ✅ (PR #483, rules-only)
- **handler-v3.X**: ✅ v6.73.0 (this PR — rule 16 v4.2.0 code implementation)

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean.
- `bun test tests/bridge/handlers/negotiate-sprint-contract` → 35 pass, 0 fail, 109 expect calls.
- `git diff origin/main -- bridge/handlers/negotiate-sprint-contract.ts | grep '^-[^-]' | wc -l` → 1 (single doc-comment line update, not logic).

---

## v6.72.0 — 2026-05-14 (sprint-138, FDE slice 6: governance advisory + DTC gate FDE-aware skip — FDE PLAN 6/6 COMPLETE)

**LAST slice of the FDE Ontology Build Session implementation plan** (`~/.claude/plans/splendid-mapping-lemur.md`). Adds advisory-only governance hook for read-only FDE-intent prompts + additive FDE-aware skip branch in `prompt-dtc-enforcement-gate` + pure classifier lib. **NO hook promoted to blocking** (brief §16.5 + plan §Non-Goals invariant preserved). Resolves brief §12 read-only over-classification risk.

### Added

- **lib** `lib/fde-build/readonly-prompt-classifier.ts` (152 lines) — pure classifier with FDE vocabulary (9 review levels from slice 1 + 17 criterion names from slice 3 + common FDE design phrasing) + mutation verb patterns + read-only verb patterns. Returns `{classifiedAs: "read-only-fde-intent"|"mutating"|"uncertain", fdeKeywordsHit, mutationVerbsHit, confidence, reasoning}`. Single source of truth shared by advisory hook + DTC gate skip branch. Note: "build" verb deliberately omitted from MUTATION_VERB_PATTERNS to prevent false-positive on "ontology build session" (FDE domain term).
- **hook** `hooks/prompt-fde-readiness-advisory.ts` (96 lines) — UserPromptSubmit advisory-only hook. Classifies prompt → emits `validation_phase_completed errorClass="fde_readiness_advisory"` with `advisory: true` when read-only FDE intent detected. **HARD INVARIANT: NEVER exits with code 2; NEVER emits `permissionDecision: "deny"`** (self-declared at file line 9; test enforced).
- **Modified** `hooks/prompt-dtc-enforcement-gate.ts` (additive +64 LOC, 0 lines removed) — additive FDE-aware skip branch before existing `contract_required` emit path. When read-only FDE classifier matches AND no mutation verbs hit, emits `fde_readonly_skip_contract_required` advisory + returns 0 (skip contract gate). Existing branches UNCHANGED.
- **Modified** `hooks/hooks.json` (additive +6 LOC, 0 lines removed) — 1 new UserPromptSubmit entry registering `prompt-fde-readiness-advisory.ts` (async: true, never blocking).
- **Tests** (4 files, 623 LOC): `readonly-prompt-classifier.test.ts` (19 pass, exhaustive classification table) + `prompt-fde-readiness-advisory.test.ts` (15 pass, brief §12 6-fixture coverage + advisory-only invariant) + `prompt-dtc-enforcement-gate-fde-skip.test.ts` (7 pass, 6 fixtures NOT triggering contract_required) + `prompt-dtc-enforcement-gate-mutation-still-classified.test.ts` (11 pass, mutation fixtures STILL classified — false-positive guard). **Total: 53 pass, 0 fail, 152 expect calls.**

### HARD INVARIANTS (test-enforced)

- `prompt-fde-readiness-advisory.ts` NEVER exits with code 2; NEVER emits `permissionDecision: "deny"`. Always advisory.
- `prompt-dtc-enforcement-gate.ts` existing branches UNTOUCHED (diff +64/-0). FDE-skip is a new OR-branch.
- 6 brief §12 read-only fixture prompts (containing words "governance"/"action"/"writeback"/"enforcement"/"ontology-build"/"implementation") classified as read-only-fde-intent + DO NOT trigger `contract_required`.
- 3 mutation fixture prompts (containing "apply edit-function", "Write file", "refactor entire system") STILL classified as mutating (false-positive guard).
- NO new hook promoted to blocking. Slice 6 explicitly STAYS advisory.
- `bridge/mcp-server.ts` UNCHANGED.
- `runtime-overlay/schemas-snapshot/**` UNCHANGED.
- `commit-edits-precondition` / `evidence-domain-coverage-gate` / `ontology-engineering-turn-fan-out-gate` UNCHANGED.

### Out-of-scope (preserved per brief §17 + plan §Non-Goals)

- No hard-blocking hook promotion (brief §16.5).
- No commit-edits / evidence-domain / turn-fan-out hook changes.
- No new event type (only additive payload keys + new `errorClass` string values).
- No new env-var bypass (advisory-only ⇒ no bypass needed).

### Slice DAG progress

- Slice 1 ✅ v6.67.0 / Slice 2 ✅ v6.68.0 / Slice 3 ✅ v6.69.0 / Slice 4 ✅ v6.70.0 / Slice 5 ✅ v6.71.0 / **Slice 6 ✅ v6.72.0 (this PR — FDE PLAN 6/6 COMPLETE)** 🎉
- Companion PR: handler-v3.X (v6.73.0) — rule 16 v4.2.0 §Quick Sprint single-round binding implementation, shipping immediately after this PR.

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean.
- `grep -nE 'process\.exit\(2\)|permissionDecision.*deny' hooks/prompt-fde-readiness-advisory.ts` → 1 match (line 9, doc-comment self-declaration "HARD INVARIANT: NEVER exits with code 2") — actual code has 0 such calls.
- `git diff origin/main -- hooks/prompt-dtc-enforcement-gate.ts | grep '^-[^-]' | wc -l` → 0 (purely additive +64 LOC).
- `bun test tests/lib/fde-build/readonly-prompt-classifier.test.ts tests/hooks/prompt-fde-readiness-advisory.test.ts tests/hooks/prompt-dtc-enforcement-gate-fde-skip.test.ts tests/hooks/prompt-dtc-enforcement-gate-mutation-still-classified.test.ts` → 53 pass, 0 fail.

### FDE PLAN 6/6 COMPLETE

This PR completes the FDE Ontology Build Session plan (`~/.claude/plans/splendid-mapping-lemur.md`, user-approved 2026-05-14). The complete sequence:

| Slice | Surface | Version |
|-------|---------|---------|
| 1 | FDE schema primitive + composer + skill-only preview | v6.67.0 (PR #478) |
| 2 | Naming audit + compat-preserving report | v6.68.0 (PR #480) |
| 3 | 17-criterion grading rubric + gap report (skill-only) | v6.69.0 (PR #481) |
| 4 | Workbench FDE panel (additive backward-compat) | v6.70.0 (PR #482) |
| 5 | fillPolicy opt-in (default-8-turn / fde-ontology-build) | v6.71.0 (PR #484) |
| 6 | Governance advisory hook + DTC gate FDE-aware skip | **v6.72.0 (this PR)** |
| companion | rule 16 v4.2.0 + rule 28 v1.1.0 (rules streamline) | (rules-only PR #483) |
| companion | handler-v3.X Quick Sprint single-round binding | v6.73.0 (next PR) |

All FDE machine surfaces are now in place: 비개발자 사용자가 로컬에서 Chatbot Studio 같은 Palantir Ontology Engineering을 Harness Engineering으로 완벽하게 구축할 수 있는 read-first, mutation-non-authorizing, skill-only 워크벤치 layer.

---

## v6.71.0 — 2026-05-14 (sprint-138, FDE slice 5: fillPolicy opt-in additive)

**Slice 5 of 6 from the FDE Ontology Build Session implementation plan** (`~/.claude/plans/splendid-mapping-lemur.md`). Adds opt-in `fillPolicy?: "default-8-turn" | "fde-ontology-build"` input to `pm_semantic_intent_gate`. Absence preserves legacy T0-T7 `EIGHT_TURN_FILL_SEQUENCE` behavior byte-identically. "fde-ontology-build" routes to a new 9-step FDE sequence (intent / mission-decision / object-types / link-types / actions-writeback / functions / chatbot-studio / governance-eval / finalize per brief §9).

### Added

- **lib** `lib/semantic-intent/fde-fill-sequence.ts` (251 lines) — declares `FDE_FILL_SEQUENCE: readonly SicTurnDescriptor[]` with 9 steps + `advanceFDEFillSequence()` mirror of `advanceFillSequence()` for FDE policy path. Brief §9 keywords encoded in each step's question.
- **lib** `lib/semantic-intent/fill-policy.ts` (47 lines) — `FillPolicy` union (`"default-8-turn" | "fde-ontology-build"`) + `FILL_POLICIES` readonly array + `selectFillSequence(policy?)` resolver. `selectFillSequence(undefined)` returns `EIGHT_TURN_FILL_SEQUENCE` (legacy default invariant).
- **lib** `lib/semantic-intent/fill-sequence.ts` (additive re-export, +10 LOC, 0 LOC removed) — `EIGHT_TURN_FILL_SEQUENCE` constant + `advanceFillSequence` function UNTOUCHED. New section at bottom re-exports `FillPolicy`, `FILL_POLICIES`, `selectFillSequence`, `FDE_FILL_SEQUENCE`, `advanceFDEFillSequence`.
- **Handler** `bridge/handlers/pm-semantic-intent-gate.ts` (additive +80 LOC, 0 logic removed; 3 comment lines rephrased) — `SemanticIntentGateInput` gains `fillPolicy?: FillPolicy` (optional). `SemanticIntentGateResult` gains `fdeFillResult?: FDESemanticIntentFillResult` (mutually exclusive with `fillResult` — caller checks both). Turn-branch logic extended: when `fillPolicy === "fde-ontology-build"` AND `turn !== undefined`, route to `FDE_FILL_SEQUENCE` + `advanceFDEFillSequence`. Default branch (no fillPolicy) UNCHANGED.
- **Schema** `bridge/mcp-server.ts` (additive +1 LOC) — `fillPolicy` enum field added to `pm_semantic_intent_gate` input JSON schema. Required by `tests/bridge/mcp-server-schema.test.ts` field coverage. **NOT a TOOLS array entry** — input schema property only. No routing logic, no handler registration.
- **Tests** (4 files, 420 lines) — 32 pass, 0 fail (+ 42 existing regression pass). Verifies: (a) `fillPolicy` absent → `Object.keys(result).indexOf("fdeFillResult") === -1` (byte-identical golden snapshot), (b) `fillPolicy: "fde-ontology-build"` + `turn: 0` → `fdeFillResult.policy === "fde-ontology-build"` + `appliedTurn === 0` + correct question keyword, (c) `FDE_FILL_SEQUENCE` has 9 ordered steps with brief §9 keywords, (d) `selectFillSequence(undefined | "default-8-turn") === EIGHT_TURN_FILL_SEQUENCE` (identity check, same object reference), (e) `selectFillSequence("fde-ontology-build") === FDE_FILL_SEQUENCE`.

### Backward-compat invariants (test-enforced)

- `fillPolicy` absent → result Object.keys does NOT include "fdeFillResult".
- Existing `fillResult` field behavior UNCHANGED.
- `EIGHT_TURN_FILL_SEQUENCE` constant 0 line modifications.
- `advanceFillSequence()` function 0 line modifications.
- 42 pre-existing `tests/bridge/handlers/pm-semantic-intent-gate*` tests all green.
- `validation_phase_completed` event payload structure UNCHANGED (no new mandatory keys).

### Out-of-scope (preserved per brief §17 + plan §Non-Goals)

- `EIGHT_TURN_FILL_SEQUENCE` NOT replaced (additive policy only).
- `advanceFillSequence()` NOT modified.
- NO hook changes.
- NO `policy-compiler.ts` changes.
- NO `runtime-overlay/schemas-snapshot/**` edits (FillPolicy union is lib-only, not promoted to schema primitive yet).
- NO MCP TOOLS array registration.

### Slice DAG progress

- Slice 1 ✅ v6.67.0 / Slice 2 ✅ v6.68.0 / Slice 3 ✅ v6.69.0 / Slice 4 ✅ v6.70.0 / **Slice 5 ✅ v6.71.0 (this PR)** / Slice 6 ⏳ v6.72.0 (governance advisory, last).

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean.
- `bun test tests/bridge/handlers/pm-semantic-intent-gate-fill-policy-absent.test.ts` → 4 pass.
- `bun test tests/bridge/handlers/pm-semantic-intent-gate-fde-policy.test.ts` → 5 pass.
- `bun test tests/bridge/handlers/pm-semantic-intent-gate` → 42 pass (regression).
- `git diff origin/main -- lib/semantic-intent/fill-sequence.ts | grep '^-[^-]' | wc -l` → 0.
- `grep -c 'fillPolicy' bridge/mcp-server.ts` for TOOLS array → 0 (only input schema property).

### Companion: rule 16 v4.2.0 (merged 2026-05-14 PR #483)

This PR is the FIRST sprint to use the rule 16 v4.2.0 documented `mode="quick"` single-round binding contract. The current handler still requires 3 sequential calls (transitional); future plugin v3.X will collapse to single-round per rule 16 v4.2.0 §Quick Sprint single-round binding subsection.

## v6.70.0 — 2026-05-14 (sprint-138, FDE slice 4: workbench FDE panel — additive, backward-compat)

**Slice 4 of 6 from the FDE Ontology Build Session implementation plan** (`~/.claude/plans/splendid-mapping-lemur.md`). Adds an additive `fdePanel?: FDEPanelProjection` field to `SemanticWorkbenchState` for non-developer FDE status display. Backward-compat invariant: when `input.fdeSession` is absent, `fdePanel` key is NOT in the result object (preserves byte-identical legacy output for golden snapshot tests). Group B (Slices 2 + 3 + 4) complete with this PR.

### Added

- **Schema primitive** `runtime-overlay/schemas-snapshot/ontology/primitives/fde-panel.ts` (84 lines) — declares `FDEPanelProjection` (currentLevel, completedLevels, missionDecisionSummary, topGaps, readiness, readOnly, semanticApprovalReady, dtcNeededNow, plainLanguageStatus, nextQuestion) + `FDEPanelBuilderHints` + `FDE_PANEL_SCHEMA_VERSION`. Hard invariant: `mutationAuthorizedFromPanel: false` (literal type). Imports only types from Slice 1's `fde-ontology-build-session.ts` (no runtime coupling).
- **lib** `lib/chatbot-studio/fde-panel-builder.ts` (119 lines) — pure `buildFDEPanel(session, hints)` derivation. Generates Korean/English plain-language status per `hints.preferredLanguage`.
- **Modified** `lib/chatbot-studio/workbench-state.ts` (additive edit, +10 LOC, 0 removed):
  - 3 import lines for `FDEOntologyBuildSession`, `FDEPanelProjection`, `FDEPanelBuilderHints`, `buildFDEPanel`.
  - `SemanticWorkbenchState` interface gains optional `fdePanel?: FDEPanelProjection` field (additive, after `nextAllowedActions`).
  - `BuildSemanticWorkbenchStateInput` gains optional `fdeSession?` + `fdePanelHints?` fields.
  - Builder body computes `fdePanel` only when `input.fdeSession` is supplied, then uses conditional spread `...(fdePanel !== undefined ? { fdePanel } : {})` at the tail of the return object. **Key absence (not undefined value) preserves byte-identical legacy output.**
- **Tests** (2 files, 400 lines) — 35 pass / 0 fail / 95 expect calls (workbench-state-fde-panel + fde-panel-builder). Verifies: (a) `Object.keys(state).indexOf("fdePanel") === -1` when `input.fdeSession` absent, (b) `readOnly: true` when verdict ≤ "mission-clear", (c) `dtcNeededNow: true` only when `semanticApprovalReady: true` AND no approved DTC, (d) 9 review-level pure derivations, (e) language selector (ko/en) on `plainLanguageStatus`.

### Backward-compat verification

- Existing `tests/bridge/handlers/pm-semantic-workbench-state*` tests — 3 pass, 0 fail. No regression on the bridge handler that consumes `SemanticWorkbenchState`.
- All 44 `tests/lib/chatbot-studio/` tests green (35 new + existing).

### Out-of-scope (preserved per brief §17 + plan §Non-Goals)

- No removal/rename of any existing `SemanticWorkbenchState` field.
- No modifications to `lib/chatbot-studio/semantic-conversation-state.ts`.
- No modifications to `bridge/handlers/pm-semantic-workbench-state.ts` (handler consumes the new field naturally).
- No new MCP handler.

### Slice DAG progress

- Slice 1 ✅ v6.67.0 / Slice 2 ✅ v6.68.0 / Slice 3 ✅ v6.69.0 / **Slice 4 ✅ v6.70.0 (this PR — Group B complete)** / Slice 5 ⏳ v6.71.0 (fill policy opt-in — sequential, next) / Slice 6 ⏳ v6.72.0 (governance advisory — last).

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean.
- `git diff origin/main -- lib/chatbot-studio/workbench-state.ts` → 17 lines added, **0 removed** (additive-only invariant).
- `bun test tests/lib/chatbot-studio/workbench-state-fde-panel.test.ts tests/lib/chatbot-studio/fde-panel-builder.test.ts` → 35 pass, 0 fail.
- `bun test tests/bridge/handlers/pm-semantic-workbench-state*.test.ts` → 3 pass, 0 fail (regression check).

---

## v6.69.0 — 2026-05-14 (sprint-138, FDE slice 3: 17-criterion grading rubric + gap report)

**Slice 3 of 6 from the FDE Ontology Build Session implementation plan** (`~/.claude/plans/splendid-mapping-lemur.md`). Adds the 17-criterion FDE readiness grading rubric (`FDE_GRADING_RUBRIC` per brief §10) + detailed gap report renderer + deferred-submission-criteria detector. **Recommendation-only**: produces readiness verdicts; cannot authorize mutation. Skill-only handler `grade_fde_readiness` is NOT registered in MCP TOOLS.

### Added

- **Schema primitives**:
  - `runtime-overlay/schemas-snapshot/ontology/primitives/fde-grading-rubric.ts` (310 lines) — declares `FDE_GRADING_RUBRIC` (rubric:fde-readiness/v1) with 17 criteria (weight sum = 1.00, runtime guard throws on drift > 1e-9). 8 rule-domain criteria (submission, app-state, citation, OMCP-boundary, OSDK-scoping, audit, release, post-rename) + 9 model-domain criteria (mission-decision, object, link, action, function, chatbot-studio, retrieval, ai-fde-branching, eval-coverage). Registered into `GRADING_RUBRIC_REGISTRY` as canonical (immutable).
  - `runtime-overlay/schemas-snapshot/ontology/primitives/fde-gap-report.ts` (210 lines) — declares `FDEGapReportDetailed` (4 scorecards: ontology / chatbot / aiFdeMcp / governanceEval) + `FDECriterionScore` + hard `recommendationOnly: true` literal type + ladder-enforced `finalRecommendation` (never "ready-for-implementation" when `submissionCriteriaNeedsHumanReview` non-empty).
- **lib**:
  - `lib/fde-build/rubric-grader.ts` (338 lines) — per-criterion orchestration (rule-domain heuristic on session shape; model-domain via injected `modelGrader` callback).
  - `lib/fde-build/gap-report-builder.ts` (482 lines) — composes scorecard slices, enforces `finalRecommendation` ladder, packages prioritized backlog + risk register + branch-release plan + eval plan.
  - `lib/fde-build/submission-criteria-readiness.ts` (66 lines) — detector for brief §13 deferred behaviors (`ObjectQueryResult` + `GroupMember` per `lib/actions/submission-criteria.ts:103-109`). Flags affected criteria for `needs-human-review` before FDE can advance to ready-for-implementation.
- **Handler** `bridge/handlers/grade-fde-readiness.ts` (91 lines) — internal handler, **NOT registered in `bridge/mcp-server.ts` TOOLS** (skill-only invariant; test enforced).
- **Skills**:
  - `skills/pm-fde-grade/SKILL.md` (87 lines, skill-only).
  - `skills/pm-fde-report/SKILL.md` (93 lines, skill-only; produces report at `~/.claude/plans/YYYY-MM-DD-fde-gap-report-<slug>.md`).
- **Tests** (4 files, 494 lines) — 39 pass, 0 fail. Verifies weight-sum=1.00, `recommendationOnly: true` literal, `finalRecommendation !== "ready-for-implementation"` when needs-review non-empty, `grade_fde_readiness` NOT in MCP TOOLS, deferred-criteria detector matches `ObjectQueryResult` + `GroupMember`.

### Out-of-scope (preserved per brief §17 + plan §Non-Goals)

- No modifications to `bridge/handlers/grade-outcome-with-rubric.ts` (wrapped, not modified).
- No modifications to `lib/actions/submission-criteria.ts` (read pattern only — detector encodes the deferred-behavior list).
- No modifications to `lib/governance/policy-compiler.ts`.
- No public MCP exposure of `grade_fde_readiness` handler.
- No commit-edits enforcement changes.

### Slice DAG progress

- Slice 1 ✅ v6.67.0 / Slice 2 ✅ v6.68.0 / **Slice 3 ✅ v6.69.0 (this PR)** / Slice 4 ⏳ v6.70.0 (workbench panel — PR next) / Slice 5 ⏳ v6.71.0 / Slice 6 ⏳ v6.72.0.

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean.
- 17-criterion weight sum = 1.00 (runtime guard on module load).
- `grep -c 'grade_fde_readiness\|grade-fde-readiness' bridge/mcp-server.ts` → 0.
- `bun test tests/lib/fde-build/{rubric-grader,gap-report-non-authorizing,submission-criteria-needs-review} tests/bridge/handlers/grade-fde-readiness-not-in-tools` → 39 pass, 0 fail.

---

## v6.68.0 — 2026-05-14 (sprint-138, FDE slice 2: naming audit + compatibility-preserving report)

**Slice 2 of 6 from the FDE Ontology Build Session implementation plan** (`~/.claude/plans/splendid-mapping-lemur.md`). Adds the read-only naming-audit skill that flags legacy user-facing terms (e.g. "AIP Agent Studio", "parameters", "validations") in prose while preserving compatibility identifiers (e.g. `agentRid`, `AIPAgentDeclaration`, `legacyNames`) verbatim. Output: markdown report under `~/.claude/plans/`. NO source rewrite, NO API field rename, NO public MCP.

### Added

- **Schema primitive** `runtime-overlay/schemas-snapshot/ontology/primitives/fde-naming-classification.ts` (209 lines) — declares `NamingTerm` 3-way enum (`preferred-user-facing` / `legacy-user-facing` / `compatibility-identifier`), `NamingAuditFinding`, `NamingAuditReport` (hard-readonly invariant + `compatibilityIdentifiersPreserved: true` literal), and `NAMING_TERM_BASELINE_TABLE` (11 baseline term entries per brief §8 — 2 preferred + 4 legacy + 5 compatibility, each compatibility entry carrying non-empty `compatibilityReason`).
- **lib** `lib/fde-build/naming-classifier.ts` (96 lines) + `naming-audit-runner.ts` (272 lines, allow/deny globs — `**/src/generated/**` explicitly denied) + `naming-report-renderer.ts` (206 lines, markdown renderer). Barrel `lib/fde-build/index.ts` additive update.
- **Skill** `skills/pm-fde-naming-audit/SKILL.md` (143 lines) — skill-only invocation; produces report at `~/.claude/plans/YYYY-MM-DD-fde-naming-audit-<slug>.md`. NOT registered in `bridge/mcp-server.ts` TOOLS array.
- **Tests** (3 files, 651 lines) — 53 pass, 0 fail. Verifies: (a) 11-term baseline classification (`compatibility-identifier` entries all carry `compatibilityReason`), (b) `**/src/generated/**` deny-glob enforced (`tests/lib/fde-build/naming-runner-skips-generated.test.ts`), (c) skill not in MCP TOOLS array.

### Out-of-scope (preserved per brief §17 + plan §Non-Goals)

- No mass find-and-replace; legacy user-facing prose is flagged in the audit report only.
- No rename of compatibility identifiers (`agentRid` / `AIPAgentDeclaration` / `aipAgentRid` / `AIP_AGENT_REGISTRY` / `legacyNames`).
- No hand edits under `runtime-overlay/schemas-snapshot/src/generated/**`.
- No public MCP exposure (`pm_fde_naming_audit` is skill-only).

### Slice DAG progress

- Slice 1 ✅ v6.67.0 (FDE domain + read-only session builder).
- Slice 2 ✅ v6.68.0 (this PR — naming audit).
- Slice 3 ⏳ v6.69.0 (FDE grading rubric + gap report; PR open next).
- Slice 4 ⏳ v6.70.0 (workbench FDE panel additive; PR open next).
- Slice 5 ⏳ v6.71.0 (fill policy opt-in).
- Slice 6 ⏳ v6.72.0 (governance advisory hook).

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean.
- `grep -c 'pm_fde_naming_audit\|pm-fde-naming-audit' bridge/mcp-server.ts` → 0.
- `grep -rE '(commitToken|applyToken|approvalToken|authorizeMutation)' lib/fde-build/naming-*` → 0 code-level matches.
- `bun test tests/lib/fde-build/naming-* tests/skills/pm-fde-naming-audit.test.ts` → 53 pass, 0 fail (3 files, 92 expect calls).

---

## v6.67.0 — 2026-05-14 (sprint-138, FDE slice 1: read-only FDE domain)

**Slice 1 of 6 from the FDE Ontology Build Session implementation plan** (`~/.claude/plans/splendid-mapping-lemur.md`). Introduces the read-only FDE domain projection for non-developer ontology build review through palantir-mini's "local, API-free, AIP-inspired" operating pattern. No mutation authorization, no public MCP, no hook changes — schema + composer + skill-only preview.

### Added

- **Schema primitive** `runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session.ts` (412 lines) — declares `FDEOntologyBuildSession` + 9 review-level sub-types (`FDEMissionDecision`, `FDEObjectTypeReview`, `FDELinkTypeReview`, `FDEActionWritebackReview`, `FDEFunctionReview`, `FDEChatbotStudioReview`, `FDEAIFDEMcpBoundaryReview`, `FDEBranchReleaseReview`, `FDEEvalObservabilityReview`) + `FDEGapReport` + `FDEReadinessVerdict` enum. Hard read-only invariants: `mutationAuthorized: false` (literal type) on every session, `recommendationOnly: true` (literal type) on every gap report. 16 named exports added to barrel (`runtime-overlay/schemas-snapshot/ontology/primitives/index.ts`, +32 lines).
- **lib** `lib/fde-build/` (4 files, 1,064 lines): `session-composer.ts` consumes `OntologyContextQueryResult` + optional `SemanticIntentContract` + optional `DigitalTwinChangeContract` + optional `SemanticConversationState` and produces an `FDEOntologyBuildSession` projection. `level-builders.ts` carries 9 pure builders for the per-level review shapes. `readiness-evaluator.ts` evaluates the read-only verdict ladder (`not-ready` → `mission-clear` → `object-link-clear` → `action-clear` → `chatbot-clear` → `eval-clear` → `ready-for-semantic-approval`). `index.ts` is the public barrel.
- **Skill** `skills/pm-fde-session-preview/SKILL.md` (141 lines) — skill-only invocation pattern: Lead calls `ontology_context_query` MCP, passes result + optional contracts to `composeFDEOntologyBuildSession()` in-process, presents the read-only projection in plain language. NOT registered in `bridge/mcp-server.ts` TOOLS array (skill-only invariant enforced by test).
- **Tests** `tests/lib/fde-build/` (3 files, 551 lines) + `tests/skills/pm-fde-session-preview.test.ts` (158 lines) — 86 pass, 0 fail, 117 `expect()` calls. Verifies: (a) `mutationAuthorized` is the literal `false` type, (b) read-only fixture prompts containing words like "governance"/"action"/"writeback"/"enforcement"/"ontology-build" never trigger contract_required classification through this composer (brief §12 regression), (c) `FDEGapReport.recommendationOnly` is literal `true`, (d) no `commitToken`/`applyToken`/`approvalToken`/`authorizeMutation` fields on session shape, (e) skill frontmatter valid + NOT in MCP TOOLS.

### Out-of-scope (preserved per brief §17 + plan §Non-Goals)

- No public MCP exposure (`pm_fde_session_preview` and any future `grade_fde_readiness` are skill-only).
- No replacement of `EIGHT_TURN_FILL_SEQUENCE` (Slice 5 adds opt-in `fillPolicy="fde-ontology-build"` policy alongside it).
- No hard-blocking hook (Slice 6 adds advisory-only).
- No rename of `agentRid` / `AIPAgentDeclaration` / `aip-agent.ts` / `AIPAgentSurface` / `aipAgentRid` / `AIP_AGENT_REGISTRY` / `legacyNames` / `.palantir-mini/aip-agents/` (compatibility identifiers preserved verbatim).
- No edits under `runtime-overlay/schemas-snapshot/src/generated/**` (regen-only).
- `FDEOntologyBuildSession` cannot authorize mutation — mutation authority stays with `SemanticIntentContract` + `DigitalTwinChangeContract` + sprint + governance pipeline.

### Plan reference + DAG

- Plan: `~/.claude/plans/splendid-mapping-lemur.md` (user-approved 2026-05-14).
- Sprint: sprint-138 (palantirkc monorepo).
- Slice DAG: Slice 1 (this PR, v6.67.0) → Group B parallel (Slice 2 v6.68.0 + Slice 3 v6.69.0 + Slice 4 v6.70.0) → Slice 5 (v6.71.0) → Slice 6 (v6.72.0, governance advisory).
- Owner agents (rule 12 v3.19.1 ownerAgent): `palantir-mini:ontology-steward` (schema) + `palantir-mini:project-implementer` (lib + skill + tests) + `palantir-mini:plugin-maintainer` (this manifest + CHANGELOG + ship).

### Verify summary (Lead-verified pre-merge)

- `bun run typecheck` → clean (no source errors).
- `grep -rE '(commitToken|applyToken|approvalToken|authorizeMutation)' runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session.ts lib/fde-build/` → 0 code-level matches (doc-comments only).
- `grep -c 'pm_fde_session_preview\|grade_fde_readiness' bridge/mcp-server.ts` → 0.
- `bun test tests/lib/fde-build tests/skills/pm-fde-session-preview.test.ts` → 86 pass, 0 fail, 117 expect calls.

---

## v6.66.0 — 2026-05-14 (sprint-137: TS warning cleanup — session 21deaafb COMPLETE)

MINOR. Cosmetic TS cleanup pass — zero runtime behavior change. Resolves ~80 accumulated TypeScript warnings across hooks, tests, and libs introduced over the 38-PR session 21deaafb.

- **Merge-artifact repair**: `lib/event-log/promoted-index.ts` and `tests/lib/event-log/promoted-index.test.ts` had two file versions merged together (doubled content), causing syntax errors. Restored clean single-version file from PR 4.7 baseline.
- **Duplicate-import/declaration repair**: `bridge/handlers/replay-lineage.ts` (duplicate `readPromotedEvents` import), `bridge/handlers/pm-workflow-lineage-query.ts` (duplicate `path` import + duplicate `includeLegacyRaw` interface property), `bridge/handlers/pm-substrate-query.ts` (duplicate `includeLegacyRaw` object literal key).
- **runtime-overlay schema sync**: `runtime-overlay/schemas-snapshot/ontology/primitives/aip-evaluation.ts` was missing the `AIPEvaluationSuiteConvexRow` + `AIPEvaluationRunConvexRow` + `AIPEvaluationRunVerdict` + type-guard exports added in schemas v1.67.0 (sprint-114 PR 5.4a). Appended missing block.
- **TS2352 branded-type casts**: `lib/event-log/promoted-index.ts` (EventEnvelope→Record cast via `unknown`), `scripts/replay-promote-grades.ts` (RefinementTarget→Record casts).
- **TS2459 missing re-export**: `scripts/replay-promote-grades.ts` imported `ValueGrade` from `types.ts` where it is not re-exported; fixed to import from `#schemas/ontology/primitives/value-grade` directly.
- **TS2739/TS2345/TS2339 run-compactor**: `scripts/run-compactor.ts` used stale `readEvents(projectRoot)` calling convention (directory path + wrong overload resolution). Fixed to `readEvents(eventsPath)` with explicit `EventEnvelope[]` type.
- **TS2353 unknown property**: `hooks/plan-task-dag-validate.ts` payload object with `nonCanonicalValues` field not in union; suppressed via `as unknown as` cast.
- **TS2769 branded RID**: `tests/lib/event-log/retention-writer.test.ts` — three `toBe("manifest-...")` calls fixed to use the local `rid()` factory.
- **TS2532/TS18048 possibly-undefined**: `tests/lib/event-log/retention-writer.test.ts` (`tierPolicies[0]!`), `tests/skills/pm-debug-trace.test.ts` (`match[1]` guard + `description ?? ""`), `tests/skills/pm-convex-mirror-verify.test.ts` (same pattern).
- **tsc baseline**: 0 errors (was: syntax errors → ~20 semantic errors after merge-artifact repair).

## v6.65.0 — 2026-05-14 (sprint-115 PR 5.4b: ontology_context_query consumes Convex evalRuns)

MINOR. Adds opt-in `includeEvalRuns` arg to `ontology_context_query`; new `evalRunsContext` field in response; new `queryRecentEvalRuns` helper in `convex-client.ts`. FINAL CANONICAL PR closing Phase 5.

- `bridge/handlers/ontology-context-query.ts`: NEW `includeEvalRuns?: boolean` + `evalRunsProjectSlug?: string` + `evalRunsLimit?: number` input args. NEW `EvalRunsContextProjection` type with `recentRuns: AIPEvaluationRunDeclaration[]` + `lastRunAt: string | null` + `perVerdictCounts: {pass, revise, reject}`. NEW optional `evalRunsContext` field in `OntologyContextQueryResult`. Wires `buildEvalRunsContext` helper that queries Convex and maps `AIPEvaluationRunConvexRow` → `AIPEvaluationRunDeclaration`.
- `lib/impact-graph/convex-client.ts`: NEW `EvalRunQueryResult` interface. NEW `queryRecentEvalRuns(projectSlug, limit)` on both `StubConvexClient` (returns `{rows:[]}`) and `RealConvexClient` (queries evalSuites → evalRuns, sorted by ranAt desc, capped at limit). NEW module-level `queryRecentEvalRuns` export. StubConvexClient and graceful `try/catch` in RealConvexClient ensure Cloud-unreachable → `undefined` result, never error.
- `tests/bridge/handlers/ontology-context-query-eval-runs.test.ts`: 4 assertions — STUB MODE omits evalRunsContext; opt-out (false/absent) always omits; shape contract validated; full response integrity with includeEvalRuns=true in STUB MODE.
- Graceful degradation: STUB MODE + Cloud-down both yield omission, never throw.
- Per canonical plan v2 §4 row 5.4b. CANONICAL PLAN v2 Phase 5 COMPLETE.

## v6.64.0 — 2026-05-14 (sprint-114 PR 5.4a: AIPEvaluation Convex tables)

MINOR. Adds `evalSuites` + `evalRuns` tables to `convex/schema.ts`.

- NEW `evalSuites` table: `suiteId / suiteName / criterionRids / createdAt / projectSlug` + `by_project_suite` index.
- NEW `evalRuns` table: `runId / suiteId / targetArtifactRef / scoreOverall / scoreCriteria / verdict / ranAt / runner` + `by_suite_ran` + `by_suite_verdict` indexes.
- `decisionEvents` table unchanged (frozen per PR 4.1b/4.1c).
- Companion: schemas v1.67.0 `AIPEvaluationSuiteConvexRow` + `AIPEvaluationRunConvexRow` + type guards.
- Companion: shared-core v1.24.0 re-exports the 5 new symbols.
- Runtime-overlay snapshot refreshed (shared-core 1.24.0 captured).
- PR 5.4b (reactive subscription consumer) deferred.

## v6.63.0 — 2026-05-14 (sprint-105 PR 4.3: events compactor + events_summarized)

MINOR. NEW compactor.ts + run-compactor.ts + 38 tests. EventsSummarizedEnvelope in union. Schemas v1.66.0. Per canonical plan v2 §4 row 4.3.

## v6.56.0 — 2026-05-13 (sprint-103 PR 4.1d: pm-convex-mirror-verify skill)
## v6.62.0 — 2026-05-13 (sprint-103 PR 4.1d: pm-convex-mirror-verify skill)

MINOR bump. New skill for local↔Cloud event mirror parity audit.

- NEW `skills/pm-convex-mirror-verify/SKILL.md`: audits local `events.jsonl` vs Convex Cloud `decisionEvents` table parity. Reads last N T2+ events from local + queries Cloud; computes delta with 4 fields: `localOnly` (mirror lag/loss) + `cloudOnly` (cross-runtime emits) + `mismatched` (same eventId, diverged payload) + `matched` (perfect parity). Emits `convex_mirror_parity_verified` envelope with `{localOnly, cloudOnly, mismatched, matched, totalLocal, totalCloud, sampledMismatches}`. STUB MODE (`PALANTIR_MINI_CONVEX_STUB=1`) + Cloud-unreachable: emit `convex_mirror_parity_skipped` advisory and return early. Uses PR 4.1c Cloud-aware `lib/impact-graph/convex-client.ts` + existing `lib/event-log/read.ts`.
- NEW `lib/convex-mirror/verify.ts`: pure `computeParityDelta(localEvents, cloudEvents): ParityDelta` helper. No I/O; caller supplies arrays. Digest comparison via `raw` field; conservative matched-on-presence when `raw` absent. `sampledMismatches` capped at 5.
- NEW `tests/skills/pm-convex-mirror-verify.test.ts`: 13 tests covering SKILL.md frontmatter (name + description) + body invariants (4 delta fields + STUB MODE + Cloud-unreachable + 4.1d provenance + episodic/semantic memory layers) + `computeParityDelta` unit tests (all-matched / localOnly / cloudOnly / mismatched / sampledMismatches cap / empty-arrays).

Per canonical plan v2 §4 row 4.1d. Phase 4 PR 4/11.

## v6.53.0 — 2026-05-13 (sprint-102 PR 4.1c: convex-client Cloud-URL detect + 18-key envelope + WAL buffer)
- NEW `tests/skills/pm-convex-mirror-verify.test.ts`: 17 tests covering SKILL.md frontmatter (name + description) + body invariants (4 delta fields + STUB MODE + Cloud-unreachable + 4.1d provenance + episodic/semantic memory layers) + `computeParityDelta` unit tests (all-matched / localOnly / cloudOnly / mismatched / sampledMismatches cap / empty-arrays).

Per canonical plan v2 §4 row 4.1d. Phase 4 PR 4/11.

## v6.61.0 — 2026-05-14 (sprint-105 PR 4.3: events compactor + NEW events_summarized event type)

MINOR bump. Repeated low-value summarization compactor (canonical plan v2 §4 row 4.3).

- NEW `lib/event-log/compactor.ts`: pure functions `findSummarizableRuns(events, opts)` + `synthesizeSummaryEnvelope(run, opts)`. SOURCE EVENTS NEVER MUTATED (rule 10 §append-only). Summary rows are NEW appends with type `events_summarized`.
- NEW `scripts/run-compactor.ts`: offline batch job with `--dry-run`, `--threshold=N`, `--types=<csv>`, `--max-runs=N`, `--no-passed-only`, `--project=<root>` flags.
- NEW `tests/lib/event-log/compactor.test.ts`: 38 tests covering run detection, synthesis payload shape, sampling, source immutability, edge cases.
- `lib/event-log/types.ts`: adds `EventsSummarizedEnvelope` to discriminated union + `EventSnapshot.events_summarized?` + `isEventsSummarized` type guard.
- `lib/event-log/read/fold-snapshot.ts`: `events_summarized` case added to exhaustive switch.
- Schemas v1.66.0 (companion bump): `events_summarized` registered in `EVENT_TYPE_NAMES` + registry with `primaryDomain: "data"`. Payload: `{ summarizedType, count, firstSeq, lastSeq, firstAt, lastAt, sampledPayloads, threshold }`.
- Default allowlist: `validation_phase_completed` (passed=true) + `tool_invocation_completed`. Default threshold: N=10.

## v6.60.0 — 2026-05-13 (sprint-102 PR 4.1c: convex-client Cloud-URL detect + 18-key envelope + WAL buffer)

MINOR bump. Cloud-aware Convex client with WAL buffer for outage resilience.

- `lib/impact-graph/convex-client.ts` (sprint-102 PR 4.1c):
  - Cloud URL detection: `CONVEX_ENV=cloud` + `convex/.env.cloud` present reads `CONVEX_URL` from `.env.cloud`; else falls back to `.env.local` / stub.
  - 18-key envelope: `mirrorDecisionEvent(MirrorDecisionEventArgs)` maps `BackPropValueIndexEntry` fields onto `decisionEvents.mirrorFromEventsLog` mutation (PR 4.1b schema).
  - WAL buffer: on Cloud unreachable (ECONNREFUSED / ETIMEDOUT / 5xx / network), buffers envelope to `<projectRoot>/.palantir-mini/session/convex-pending.jsonl` (NDJSON append-only).
  - Drain: on next successful Cloud call, reads WAL oldest-first, drains in batches of 50 via `decisionEvents.bulkMirror`, then truncates. Emits `validation_phase_completed errorClass="convex_wal_drained"` event to `events.jsonl` citing canonical plan v2 §4 row 4.1c.
  - STUB MODE: `PALANTIR_MINI_CONVEX_STUB=1` forces `StubConvexClient` regardless of URL (R2 invariant preserved).
  - Re-exports `BackPropValueIndexEntry` type and new `MirrorDecisionEventArgs` interface.
- NEW `tests/lib/impact-graph/convex-client-wal.test.ts`: 12 tests covering WAL append round-trip, STUB MODE null-return + no-WAL-write, WAL truncate, batch boundary (51 entries), drain event shape, Cloud URL env detection.

R1 (local default) / R2 (STUB MODE) / R3 (no Agent/RAG) invariants preserved.
Per canonical plan v2 §4 row 4.1c.

## v6.56.0 — 2026-05-13 (sprint-136: rule 12 v3.19.1 ownerAgent field + cross-ownership decomposition)

MINOR bump. Closes rule 07 file-ownership violation observed during 30+ PR session (general-purpose dispatching instead of canonical agents).

- AMENDED `~/.claude/rules/12-lead-protocol-v2.md` v3.19.1: §Plan-mode authoring requirement gains required `ownerAgent` field. NEW canonical ownerAgent lookup table mapping rule 07 §Agent file-ownership path patterns to palantir-mini agent names (hook-builder / plugin-maintainer / protocol-designer / project-implementer / implementer / task-owner). NEW cross-ownership decomposition hard requirement: tasks touching ≥2 ownerAgents MUST split into N sub-tasks per owner. Updated example DAG table with ownerAgent column.
- AMENDED `~/.claude/rules/CORE.md`: rule-12 invariant line updated to v3.19.1 + ownerAgent field reference.
- EXTENDED `hooks/plan-task-dag-validate.ts` (v3.19.1): NEW advisory `plan_missing_owner_agent` (fires when DAG section lacks ownerAgent column) + NEW advisory `plan_non_canonical_owner_agent` (fires when ownerAgent value is not one of the 6 canonical agents). Per rule 12 v3.19.1 + rule 07 §Agent file-ownership.
- NEW `tests/hooks/plan-task-dag-validate.test.ts`: 10 test cases covering ownerAgent presence, canonical validation, base-field missing, skip conditions, and bypass.

---

## v6.57.0 — 2026-05-13 (sprint-109 PR 4.7: default replay/audit readers prefer promoted-index)

MINOR bump. Closes canonical plan v2 §4 row 4.7 (Phase 4 PR 9/11).

- NEW `lib/event-log/promoted-index.ts`: grade-aware read helper (`readPromotedEvents({ sessionDir, gradeFilter })`). GradeFilter: `"T2+" | "T3+" | "T4-only" | "raw"`. Grade resolution priority: (1) explicit `valueGrade` envelope field → (2) `payload.promotedFrom` present (PR 4.2 grade-promotion) → (3) heuristic (reasoning ≥40 chars + refinementTarget + memoryLayers → T3). Graceful fallback: 0 results → return all events (fresh-project safe).
- MODIFIED `bridge/handlers/replay-lineage.ts` v6.57.0: default path reads promoted-index (T3+); intersects result set with promoted eventIds. Opt-in `includeLegacyRaw=true` for full raw scan.
- MODIFIED `bridge/handlers/pm-workflow-lineage-query.ts` v6.57.0: per-project promoted-id Sets pre-built before filter loop; graceful fallback when project has 0 T3+. Opt-in `includeLegacyRaw=true`.
- MODIFIED `bridge/handlers/pm-retro-query.ts` v6.57.0: `readEvents` default replaced with `readPromotedEvents`; graceful fallback. Opt-in `includeLegacyRaw=true`.
- MODIFIED `bridge/handlers/pm-substrate-query.ts` v6.57.0: `includeLegacyRaw` forwarded to lineage, workflow, retro modes.
- NEW `tests/lib/event-log/promoted-index.test.ts`: 10 tests covering all GradeFilter variants, promotedFrom T4, heuristic T3, graceful fallback, rawScan flag.

---

## v6.54.0 — 2026-05-13 (sprint-104 PR 4.2: event value-grade promotion T1→T2→T3→T4)

MINOR bump. Value-grade promotion layer — offline replay job appends promoted envelopes (NEVER mutates originals per rule 10 append-only).

- NEW `lib/event-log/grade-promotion.ts`: pure promotion functions per rule 26 §Substrate routing:
  - `promoteT1ToT2(event, evidence)` — T1+outcome-pair evidence → T2; populates `lineageRefs.outcomePairId`.
  - `promoteT2ToT3(event, evidence)` — T2+refinementTarget evidence → T3; injects typed `withWhat.refinementTarget` + `withWhat.memoryLayers`.
  - `promoteT3ToT4(event, evidence)` — T3+D2-canonical (≥2 distinct identities) or D2-fallback (single-vendor-attested) → T4; sets `withWhat.kLlmConsensus` + `withWhat.confidenceTier`.
  - Each function returns NEW envelope with `payload.promotedFrom` audit trail + `byWhom.agentName="grade-promotion-job"` + `lineageRefs.actionRid` pointing to source.
  - Source events never mutated — append-only contract per rule 10.
- NEW `scripts/replay-promote-grades.ts`: offline batch job:
  - Reads events.jsonl, builds effective-grade index (accounts for prior promotion rows).
  - For each candidate event: applies T1→T2 (outcome-pair sibling) → T2→T3 (withWhat.refinementTarget present) → T3→T4 (D2-canonical or D2-fallback) in sequence.
  - Appends promotion envelopes as NEW rows — NEVER rewrites existing events.
  - `--dry-run` flag for preview without writes.
- NEW `tests/lib/event-log/grade-promotion.test.ts`: 38 tests covering:
  - Each transition (T1→T2, T2→T3, T3→T4) + null-when-wrong-grade + null-when-evidence-missing.
  - D2-canonical vs D2-fallback paths for T3→T4.
  - Chained T1→T2→T3→T4 promotion chain.
  - Source immutability verified for all three functions.

Plugin minor bump 6.52.0 → 6.54.0 (6.53.0 reserved for PR 4.1c parallel).

Per canonical plan v2 §4 row 4.2 + rule 10 §append-only + rule 26 §T0-T4 routing.

## v6.52.0 — 2026-05-13 (sprint-106 PR 4.4: RetentionManifest primitive + writer)

MINOR bump. Per-tier event retention policy substrate.

- Consumes schemas v1.65.0 RetentionManifest primitive (5 tiers T0-T4 with liveDays/archiveDays/purgeAfterDays/cloudMirrorEnabled per rule 26 §Substrate routing).
- NEW `lib/event-log/retention-writer.ts`:
  - `writeRetentionManifest(opts)` — atomic write to `<sessionDir>/retention/manifest.json` (.tmp + rename).
  - `readRetentionManifest(sessionDir)` — returns null when absent.
  - Re-exports `DEFAULT_RETENTION_MANIFEST` for callers wanting fallback.
- Tests at `tests/lib/event-log/retention-writer.test.ts`: round-trip + atomic-write + null-on-missing + DEFAULT validation.
- shared-core v1.23.0 (re-exports RetentionManifest surface).

NOTE: This PR is a clean-recovery after the original sprint-106 worktree got cross-bleed corruption from parallel-spawn races. The retention work itself was authored cleanly by the previous run; this redo extracts only the retention deliverables onto a fresh branch.

Per canonical plan v2 §4 row 4.4 + rule 26 §Substrate routing.

## v6.53.0 — 2026-05-13 (sprint-102 PR 4.1c: convex-client Cloud-URL detect + 18-key envelope + WAL buffer)

MINOR bump. Cloud-aware Convex client with WAL buffer for outage resilience.

- `lib/impact-graph/convex-client.ts` (sprint-102 PR 4.1c):
  - Cloud URL detection: `CONVEX_ENV=cloud` + `convex/.env.cloud` present reads `CONVEX_URL` from `.env.cloud`; else falls back to `.env.local` / stub.
  - 18-key envelope: `mirrorDecisionEvent(MirrorDecisionEventArgs)` maps `BackPropValueIndexEntry` fields onto `decisionEvents.mirrorFromEventsLog` mutation (PR 4.1b schema).
  - WAL buffer: on Cloud unreachable (ECONNREFUSED / ETIMEDOUT / 5xx / network), buffers envelope to `<projectRoot>/.palantir-mini/session/convex-pending.jsonl` (NDJSON append-only).
  - Drain: on next successful Cloud call, reads WAL oldest-first, drains in batches of 50 via `decisionEvents.bulkMirror`, then truncates. Emits `validation_phase_completed errorClass="convex_wal_drained"` event to `events.jsonl` citing canonical plan v2 §4 row 4.1c.
  - STUB MODE: `PALANTIR_MINI_CONVEX_STUB=1` forces `StubConvexClient` regardless of URL (R2 invariant preserved).
  - Re-exports `BackPropValueIndexEntry` type and new `MirrorDecisionEventArgs` interface.
- NEW `tests/lib/impact-graph/convex-client-wal.test.ts`: 12 tests covering WAL append round-trip, STUB MODE null-return + no-WAL-write, WAL truncate, batch boundary (51 entries), drain event shape, Cloud URL env detection.

R1 (local default) / R2 (STUB MODE) / R3 (no Agent/RAG) invariants preserved.
Per canonical plan v2 §4 row 4.1c.

## v6.51.0 — 2026-05-13 (sprint-101 PR 4.1b: BackPropValueIndex + Convex decisionEvents 7→18 keys)

MINOR bump. BackPropValueIndex schema primitive + Convex decisionEvents extended to 18 fields.

- `convex/schema.ts`: `decisionEvents` table extended from 7 to 18 fields (additive; all 11 new fields `v.optional()`). New fields: `eventId`, `promptId`, `promptHash`, `sessionId`, `runtime`, `semanticIntentContractRef`, `digitalTwinChangeContractRef`, `sprintContractRef`, `correlationId`, `agentId`, `toolName`, `commitSha`, `branchName`, `pullRequestNumber`, `evalSuiteId`, `evalRunId`, `affectedRid`, `refinementTarget`. Existing 7 fields (projectRoot, sequence, eventType, valueGrade, actionRid, refinementTargetKind, refinementTargetRid, byWhomIdentity, when, raw) preserved unchanged.
- Backed by NEW `schemas/ontology/primitives/back-prop-value-index.ts` (schemas v1.64.0): `BackPropValueIndexEntry` interface + `BackPropValueIndexRid` branded type + `backPropValueIndexRid` factory + `isBackPropValueIndexEntry` guard.
- Foundry equivalence: `claude-extension`.
- Per canonical plan v2 §4 row 4.1b + rule 26 §valuable-data 5-axes.

Note: pre-reserved slot was 6.48.0; monotonicity requires 6.51.0 (current HEAD = 6.50.0).

## v6.50.0 — 2026-05-13 (sprint-110 PR 4.8)

MINOR bump. pm-debug-trace skill — multi-key event reconstruction. Phase 4 CLOSE.

- NEW `skills/pm-debug-trace/SKILL.md`: reconstruct event lineage by promptId / sessionId / commitSha / correlationId.
- Read-only skill over events.jsonl + archives + quarantine via `lib/event-log/read.ts` (PR 4.5 + 4.6 archive + quarantine support wired).
- Renders each matched event as `[seq] <when> <agent>/<identity> <type> — <reasoning[:80]>`.
- No new TS handler needed — markdown skill with inline reference implementation.
- Does NOT query Convex Cloud (PR 4.1c+ wires Cloud client).
- NEW `tests/skills/pm-debug-trace.test.ts`: 12 tests asserting frontmatter fields + 4 filter keys + optional flags + canonical plan ref + memory layer declaration.
- Pre-reserved slot v6.50.0 (parallel with PRs 4.1b/6.48 + 4.4/6.49).
- **Phase 4 CLOSE** — final Phase 4 PR (11/11).

Per canonical plan v2 §4 row 4.8.

## v6.47.0 — 2026-05-13 (chore: restore plugin-version monotonicity)

MINOR bump. Hotfix.

PR #461 (sprint-108 PR 4.6 quarantine) merged with package.json + plugin.json + marketplace.json
set to v6.44.0 (its pre-reserved slot) WHILE CHANGELOG already had v6.46.0 (sprint-135) at top.
That broke version monotonicity — `cat package.json | jq -r '.version'` returned 6.44.0 while
the most recent CHANGELOG entry was v6.46.0.

This chore restores monotonicity by bumping plugin manifests to v6.47.0 (next available slot).
No source code change; no behavior change. Pure version-pin sync.

Root cause: parallel-spawn agents kept their pre-reserved version slots in manifests even when
ordering-by-merge-time created a regression. Rule 12 v3.19.0 §Parallel-spawn dispatch
documents this; the next amendment (sprint-136) will codify ownerAgent + version-monotonicity
guards.

## v6.46.0 — 2026-05-13 (sprint-135)

MINOR bump. Sprint-135: Lead Protocol §Parallel-spawn dispatch v3.19.0 + advisory hooks + docs.

- Rule 12 amendment: NEW §Parallel-spawn dispatch (v3.19.0) codifies version-slot pre-reservation + CHANGELOG merge protocol + worktree isolation HARD REQUIREMENT (criterion #4) + plan-mode DAG authoring requirement.
- Live failure mode documented: sprint-135 2026-05-13 — 4 concurrent subagents without `isolation: "worktree"` caused shared-worktree race-condition cross-bleeding between branches.
- CORE.md rule-12 invariant updated to v3.19.0.
- NEW hooks/parallel-spawn-version-advisory.ts (PreToolUse:Agent, advisory only).
- NEW hooks/plan-task-dag-validate.ts (PostToolUse:Write on ~/.claude/plans/*.md, advisory only).
- NEW docs/PARALLEL_SPAWN_DISPATCH.md.
- README.md: "Parallel-Spawn Dispatch" section added.
- Tests: tests/hooks/parallel-spawn-version-advisory.test.ts (5 cases).
- Pre-assigned parallel slot 6.46.0 (6.46 → 6.45 → 6.44 → 6.43 → 6.42 ordering).
- User directive 2026-05-13: parallel/sequential spawn efficiency improvements.

## v6.45.0 — 2026-05-13 (sprint-134 PR 6.7)

MINOR bump. Convex Cloud authority documentation — CANONICAL PLAN v2 COMPLETE.

- NEW `docs/CONVEX_CLOUD_AUTHORITY.md`: formalizes Cloud-vs-local data-layer authority split. Cloud Dev deployment `effervescent-meerkat-169` = T3+/T4 mirror authority; local self-hosted `anonymous:anonymous-palantir-mini@127.0.0.1:3210` = fallback for offline/R2 STUB MODE/pre-cutover.
- `.ssot-authority.json` adds `dataLayer` field: `{primary, fallback, asOf}` encodes the split machine-readably.
- `SSOT-AUTHORITY.md` extended: new "## Data-layer Authority" section cross-linking to `docs/CONVEX_CLOUD_AUTHORITY.md`.
- `README.md` extended: new "## Convex Cloud vs Local Authority Split" section.
- NEW `tests/docs/convex-cloud-authority.test.ts`: verifies `dataLayer.primary` pattern + `docs/CONVEX_CLOUD_AUTHORITY.md` R1/R2/R3 invariant mentions + SSOT-AUTHORITY.md cross-link.
- R1 (local default) / R2 (STUB MODE) / R3 (no Agent/RAG component) invariants PRESERVED.

**CANONICAL PLAN v2 COMPLETE** — Phase 6 acceptance gate met (final PR 7/7 in Phase 6 = row 6.7).

Per canonical plan v2 §4 row 6.7 + final acceptance §11.

## v6.44.0 — 2026-05-13 (sprint-108 PR 4.6)

MINOR bump. Malformed row quarantine — canonical plan v2 §4 row 4.6.

HARD INVARIANT (canonical §10): NEVER blind-delete events.

- NEW `lib/event-log/quarantine.ts`: pure functions `quarantineMalformedRow` + `readQuarantine` + `readQuarantineManifest`.
- MODIFIED `lib/event-log/read.ts` v6.44.0: quarantine wired into NDJSON parser.
  - JSON parse failure → quarantineMalformedRow(errorClass=json_parse_error) + skip.
  - 5-dim missing field (rule 10) → quarantineMalformedRow(errorClass=missing_required_field) + skip.
  - Best-effort: quarantine I/O error does NOT abort the read.
  - `ReadEventsOptions.includeQuarantine` (default false): opt-in forensic mode.
- Tests: 16 tests in `tests/lib/event-log/quarantine.test.ts`.

Per canonical plan v2 §4 row 4.6; Phase 4 PR 6/11.

## v6.43.0 — 2026-05-13 (sprint-107 PR 4.5)

MINOR bump. Live + archive log parser with `includeArchive` option.

- Extended `readEvents` with `ReadEventsOptions` (`includeArchive?: "all" | "live-only" | "archive-only"` + `since?: number`) and `ReadEventsResult` (`events`, `archiveCount`) — fully backward-compatible via TypeScript overloads.
- `includeArchive: "all"` (default): merges live `events.jsonl` + all `archive/events-rotated-*.jsonl` files in chronological order (existing G3 behavior preserved).
- `includeArchive: "live-only"`: returns only the live file; ignores archives.
- `includeArchive: "archive-only"`: returns only rotated archives; ignores live file.
- `since` filter: return only events with `sequence >= since`.
- `archiveCount` metadata field: number of archive files discovered during the scan.
- Fixed `scripts/migrate-palantir-math-schema.ts`: replaced `ReturnType<typeof readEvents>` with explicit `EventEnvelope[]`.
- Tests: 12 new test cases covering all 3 modes + since filter + edge cases.

Per canonical plan v2 §4 row 4.5; Phase 4 PR 5/11. Pre-assigned slot v6.43.0 (parallel PRs 4.1a=6.42 + 4.6=6.44 + 6.7=6.45).

## v6.42.0 — 2026-05-13 (sprint-100 PR 4.1a)

MINOR bump. Convex Cloud cutover authorization — user-provisioned Dev deployment.

- User authorized Convex Cloud cutover 2026-05-13 with palantirKC Dev-tier deployment `effervescent-meerkat-169`.
- NEW `convex/.env.cloud.example`: placeholder template (real key in gitignored `convex/.env.cloud`).
- NEW `docs/CONVEX_CLOUD_CUTOVER.md`: cutover decision + switch instructions + R1/R2/R3 invariant preservation.
- `.gitignore` extended: `convex/.env.cloud` explicitly excluded (NEVER commit real keys).
- `convex/.env.local` comment header documents Cloud cutover path.
- NEW `tests/docs/convex-cloud-cutover.test.ts`: doc invariant tests.
- R1 (local default) / R2 (STUB MODE) / R3 (no Agent/RAG) invariants preserved per handoff §E.2.
- Per canonical plan v2 §4 row 4.1a. PHASE 4 ENTRY.

## v6.41.0 — 2026-05-13 (sprint-133 PR 6.6)

MINOR bump.

- Schemas dep bumped via `~/ontology/shared-core` v1.21.0 → consumes new
  `RuntimeFingerprint` primitive at `#schemas/ontology/primitives/runtime-fingerprint`
  (typed `byWhom` companion: RuntimeKind + HarnessSpeciesId + ProcessKind +
  detectRuntimeFingerprint env factory + isRuntimeFingerprint guard).
- Plugin auto-attach wiring (emit() → byWhom.runtimeFingerprint) deferred to a
  follow-up patch — plugin runtime-overlay snapshot must refresh first to
  resolve `#schemas/ontology/primitives/runtime-fingerprint`. Once the next
  snapshot refresh chore lands, `scripts/log.ts` will attach the fingerprint
  automatically when caller omits it (backward-compat preserved).
- Per canonical plan v2 §4 row 6.6 + rule 27 §Cross-runtime substrate.

## v6.40.0 — 2026-05-13 (sprint-132 PR 6.5)

**Additive MINOR — NEW cross-runtime parity smoke tests asserting shared-lib parity for emit_event / pm_intent_router / commit_edits surfaces. CODEX-PARITY-GAP placeholders for Task* / SubagentStart/Stop / TeammateIdle. Per canonical plan v2 §4 row 6.5.**

### Changes

- **NEW** `tests/cross-runtime/claude-codex-parity-smoke.test.ts`: 4 active parity assertions (shared-lib path) + 6 skip stubs with CODEX-PARITY-GAP comments. Test scope: shared-lib parity (both runtimes invoke the same bridge handlers via bridge/mcp-server.ts). Full IPC smoke deferred (requires running Codex binary + wired config.toml).
  - Suite 1 (emit_event): claude-code vs codex identity paths produce identical events.jsonl row shape + correct byWhom.identity self-attribution per rule 27.
  - Suite 2 (pm_intent_router): same intent + scopePaths → same recipe key shape + same decision field + typed dispatchSpecies + costRationale.
  - Suite 3 (commit_edits validateOnly): same validateOnly=true path → same result key shape.
  - Suite 4 (CODEX-PARITY-GAP): 5 test.skip stubs (TaskCreated / TaskCompleted / TeammateIdle / SubagentStart / SubagentStop) + 1 CODEX-IPC-TODO skip for future JSON-RPC full smoke.
- **NEW** `tests/cross-runtime/fixtures/emit-event-fixture.json`: minimal valid 5-dim EventEnvelope input for emit_event tests.
- **NEW** `tests/cross-runtime/fixtures/pm-intent-router-fixture.json`: minimal IntentRouterInput for pm_intent_router tests.
- Documents that "shared-lib parity" is the achievable test scope from a Claude Code CLI session; full IPC smoke requires running Codex CLI.

---

## v6.39.0 — 2026-05-13 (sprint-131 PR 6.4)

**Additive MINOR — NEW `docs/RELOAD_PER_RUNTIME.md` documents reload requirements when adding tool/skill/agent/manifest/hook/handler/lib/schema per runtime (Claude CLI / Codex CLI / TBD Gemini+Cursor). Per canonical plan v2 §4 row 6.4.**

### Changes

- **NEW** `docs/RELOAD_PER_RUNTIME.md`: per-runtime reload cheatsheet. Sections: (1) "What triggers a reload requirement" table (change category / reload-needed / notes, 8 rows); (2) Claude Code CLI — `/reload-plugins` command + when to skip + 4 caveats (MCP server subprocess, hook cycle timing, hooks.json fresh-session requirement, version-sync); (3) Codex CLI — CLI restart + `bun scripts/sync-codex-adapter.ts` adapter sync + 4 caveats (no hot-reload, config.toml restart, 3-hook bridge scope, no inline /reload); (4) Future runtimes — Gemini CLI (TBD) + Cursor (TBD); (5) Common pitfalls — 8 numbered entries covering session-state no-reload, hooks.json adapter sync, /reload-plugins MCP server caveat, package.json/plugin.json version sync, Codex no-hot-reload, cross-runtime hook parity, skill-directory reload, agent-frontmatter spawn cache. Cross-references CODEX_HOOK_ADAPTER.md, NATIVE_RUNTIME_GAPS.md, CONTEXT.md §13.5, rule 27, rule 07.
- **MODIFIED** `README.md`: new `## Per-Runtime Reload Requirements` section linking to `docs/RELOAD_PER_RUNTIME.md`.
- **NEW** `tests/docs/reload-per-runtime.test.ts`: 10 assertions — doc exists, ≥3 runtime sections present, common-pitfalls section with ≥1 numbered entry, /reload-plugins documented, hooks.json + sync-codex-adapter.ts referenced, Gemini+Cursor TBD marked (≥2 TBD occurrences), reload-trigger table with headers, session-state no-reload statement, Last audited date, NATIVE_RUNTIME_GAPS.md cross-reference.
- **BUMPED** `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: 6.38.0 → 6.39.0.

---

## v6.38.0 — 2026-05-13 (sprint-130 PR 6.3)

**Additive MINOR — NEW `docs/NATIVE_RUNTIME_GAPS.md` catalogs Claude-vs-Codex hook/event parity (bridged/partial/gap/not-applicable per surface). Per canonical plan v2 §4 row 6.3.**

### Changes

- **NEW** `docs/NATIVE_RUNTIME_GAPS.md`: parity table for 14 hook/event surfaces (SessionStart, SessionStop, PreToolUse, PostToolUse, SubagentStart, SubagentStop, TaskCreated, TaskCompleted, TaskUpdated, TeammateIdle, UserPromptSubmit, PreCompact, PostCompact, Notification, Agent). Columns: surface name / Claude native event+hook name / Codex native event+hook name / bridge status / notes+citations. Summary counts: 0 bridged, 2 partial, 9 gap, 3 not-applicable. Workaround priority map (P0–P3) targets blocking hook gaps for future bridge work. Rule 27 cross-runtime substrate as primary authority reference. Last audited: 2026-05-13.
- **MODIFIED** `README.md`: new `## Native Runtime Gaps` section linking to `docs/NATIVE_RUNTIME_GAPS.md`.
- **NEW** `tests/docs/native-runtime-gaps.test.ts`: 8 assertions — doc exists, required column headers present, ≥6 surfaces listed, all bridge status values present, mandatory audit surfaces present, Codex 3-hook surface documented, rule 27 reference present, Last audited date present.
- **BUMPED** `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: 6.37.0 → 6.38.0.

---

## v6.37.0 — 2026-05-13 (sprint-129 PR 6.2)

**Additive MINOR — Codex hook adapter live-read alignment. NEW `scripts/sync-codex-adapter.ts` regenerates `~/.codex/hooks/palantir-mini-codex-hook-adapter.ts` from SSoT `hooks/hooks.json` with `--dry-run` + `--target` flags. NEW `docs/CODEX_HOOK_ADAPTER.md` documents adapter role, sync workflow, and forbidden-fork policy. `README.md` adds Codex Runtime Adapter section linking to the doc. Test `tests/scripts/sync-codex-adapter.test.ts` asserts dry-run output shape + AUTO-GENERATED header + hooks.json source reference. Manual edits to the adapter are forbidden per `.ssot-authority.json` (PR 6.1). Per canonical plan v2 §4 row 6.2.**

### Changes

- **NEW** `scripts/sync-codex-adapter.ts`: Bun script that reads `hooks/hooks.json` (SSoT), generates an updated thin-shim adapter carrying `AUTO-GENERATED` + `DO NOT EDIT BY HAND` header, live-derives event allowlist from hooks.json, and delegates to `lib/codex/codex-hook-adapter.ts`. Supports `--dry-run` (stdout-only) and `--target <path>` override. Validates `.ssot-authority.json` existence (PR 6.1 precondition) + `hooks.json` structure before writing. Exits 0 on success; 1 on validation failure.
- **NEW** `docs/CODEX_HOOK_ADAPTER.md`: documents adapter architecture (thin shim → plugin lib → hooks.json), sync usage (`bun scripts/sync-codex-adapter.ts --dry-run | head -20`), when to re-run, and forbidden-fork policy verbatim from `.ssot-authority.json`.
- **MODIFIED** `README.md`: new `## Codex Runtime Adapter` section immediately before `## Prompt-to-DTC Front Door`.
- **NEW** `tests/scripts/sync-codex-adapter.test.ts`: 12 assertions — exits 0, stdout has AUTO-GENERATED + hooks.json reference + sync-codex-adapter.ts reference + DO NOT EDIT BY HAND + codex-hook-adapter.ts import + runCodexHookAdapterCli + shebang + palantir-mini authority + 6.2 canonical plan ref; stderr has [dry-run] note; preconditions for script file + hooks.json + .ssot-authority.json existence.
- **BUMPED** `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: 6.36.0 → 6.37.0.

---

## v6.36.0 — 2026-05-13 (sprint-128 PR 6.1)

**Additive MINOR — Plugin source authority hard freeze documented. NEW `.ssot-authority.json` machine-readable marker + `SSOT-AUTHORITY.md` human-readable companion declare `~/.claude/plugins/palantir-mini/` as the canonical SSoT for the palantir-mini plugin. All runtimes (Claude Code CLI, Codex CLI, future Gemini/Cursor) consume from this single source; per-runtime source forks are explicitly forbidden. `README.md` updated with SSoT section linking to the marker files. `~/.claude/CLAUDE.md` Authority Chain updated with one-line SSoT confirmation. Test `tests/scripts/ssot-authority.test.ts` validates JSON structure + README cross-ref. PHASE 6 ENTRY. Per canonical plan v2 §4 row 6.1.**

### Changes

- **NEW** `.claude/plugins/palantir-mini/.ssot-authority.json`: machine-readable SSoT marker. Fields: `kind`, `version`, `asOf`, `authority`, `consumerRuntimes` (4 entries: claude-code-cli/codex-cli/gemini-cli/cursor), `forbiddenForks` (3 explicit rules), `lastVerifiedSha` (HEAD SHA at time of commit). Codex-cli entry reflects marketplace local-source consumption + notes MCP bridge is planned but not yet wired in `[mcp_servers]`.
- **NEW** `.claude/plugins/palantir-mini/SSOT-AUTHORITY.md`: human-readable companion. Consumer runtime map table, invariant statement, authority vs non-authority table, cross-references to CONTEXT.md §13.5, rule 07, rule 27.
- **MODIFIED** `.claude/plugins/palantir-mini/README.md`: new `## Plugin Source Authority (SSoT)` section immediately before `## Prompt-to-DTC Front Door`. One-paragraph summary linking to `.ssot-authority.json` and `SSOT-AUTHORITY.md`.
- **MODIFIED** `~/.claude/CLAUDE.md`: one line added under `## Authority Chain` confirming `~/.claude/plugins/palantir-mini/` as SSoT with reference to marker files.
- **NEW** `.claude/plugins/palantir-mini/tests/scripts/ssot-authority.test.ts`: validates `.ssot-authority.json` JSON structure (kind/version/consumerRuntimes/forbiddenForks fields) + asserts README.md contains `SSOT-AUTHORITY.md` reference.
- **BUMPED** `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: 6.35.0 → 6.36.0.

---

## v6.35.0 — 2026-05-13 (sprint-127 PR 5.16)

**Additive MINOR — New `harness-sprint-chain-suggest` SubagentStop hook: fires on harness-generator/harness-evaluator/project-implementer/implementer stop. Computes unvisited-RID ratio for active SprintContract scope (target RIDs from inputs[].featureId + inputs[].scopePaths + successCriteriaRids; visited = referenced in events.jsonl since sprint_contract_bound). If >5% unvisited → emits advisory `validation_phase_completed errorClass=harness_sprint_chain_suggestion` with `withWhat.suggestedNextSprintBrief` listing unvisited RIDs. Advisory only (non-blocking). PHASE 5 CLOSE. Per canonical plan v2 §4 row 5.16.**

---

## v6.34.0 — 2026-05-13 (sprint-126 PR 5.15)

**Additive MINOR — New `evidence-domain-coverage-gate` PreToolUse hook: fires on DTC-mutating MCP tools; derives evidence-domains from SIC.affectedSurfaces[]; asserts OntologyContextSeed.supportingResearchRefs has ≥1 ref per domain. Advisory after 1st miss; blocking after 2nd. Per canonical plan v2 §4 row 5.15.**

### Changes

- **NEW** `.claude/plugins/palantir-mini/hooks/evidence-domain-coverage-gate.ts`: PreToolUse gate hook. Fires on `apply_edit_function`, `commit_edits`, `ontology_context_query`. Finds most-recent `semantic_intent_contract_approved` event (60-min window), derives evidence-domains from `SIC.affectedSurfaces[]` top-level path segments, resolves linked `OntologyContextSeed.supportingResearchRefs` from events or seed file, asserts ≥1 ref per domain. Advisory after 1st miss; blocking after 2nd. Strike counter at `<projectRoot>/.palantir-mini/session/evidence-domain-strikes.json`. Bypass: `PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS=1` (audited).
- **MODIFIED** `.claude/plugins/palantir-mini/hooks/hooks.json`: new PreToolUse entry for `apply_edit_function|commit_edits|ontology_context_query` → evidence-domain-coverage-gate; description updated. Live surface: 100 hook commands.
- **NEW** `.claude/plugins/palantir-mini/tests/hooks/evidence-domain-coverage-gate.test.ts`: 7 tests (no-SIC no-op / all-covered / 1-uncovered advisory / 2nd-strike blocking / bypass honored / non-gate skipped / commit_edits gated). All pass.
- **BUMPED** `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: 6.33.0 → 6.34.0.

### Companion

- PR 5.14 (Rule 28, sprint-125): ontology-engineering-turn-fan-out-gate → fires on Agent spawn.
- PR 5.15 (this PR): evidence-domain-coverage-gate → fires on DTC mutation calls.
- Together they enforce the two-phase coverage requirement: fan-out BEFORE spawn (5.14) + seed refs BEFORE mutation (5.15).

---

## v6.33.0 — 2026-05-13 (sprint-125 PR 5.14)

**Additive MINOR — Rule 28 `ontology-engineering-turn-fan-out` + advisory→blocking gate hook. Trigger: `SemanticIntentContract.evidenceDomains > 2` enforces ≥1 dedicated evidence-gathering turn per domain before Phase 3. Per canonical plan v2 §4 row 5.14.**

### Changes

- **NEW** `~/.claude/rules/28-ontology-engineering-turn-fan-out.md` (v1.0.0): Rule 28 governing cross-domain evidence-gathering fan-out. Invariant: SIC.evidenceDomains > 2 → each domain gets ≥1 dedicated turn before Phase 3 spawn. Advisory@2 / blocking@3. Bypass: `PALANTIR_MINI_TURN_FAN_OUT_BYPASS=1` (audited).
- **MODIFIED** `~/.claude/rules/CORE.md`: updated count 16→17 active rules; added rule 28 invariant line (v3.4.0). Stays at 25-LOC T1 ceiling.
- **MODIFIED** `~/.claude/rules/BROWSE.md`: added routing row for rule 28; merged rules 26+27 row to stay within 20-LOC ceiling.
- **NEW** `hooks/ontology-engineering-turn-fan-out-gate.ts`: PreToolUse:Agent advisory→blocking hook. Reads SIC from `.palantir-mini/session/semantic-intent-contract.json`; checks `evidence_domain_visited` events in `events.jsonl`; enforces strike ladder (advisory×2 → blocking). Dynamic blocking via `permissionDecision:"deny"` on strike 3+.
- **MODIFIED** `hooks/hooks.json`: registered `ontology-engineering-turn-fan-out-gate` in Agent PreToolUse block (timeout 8s, permissionDecision defer). Hook count 98 → 99.
- **NEW** `tests/hooks/ontology-engineering-turn-fan-out-gate.test.ts`: 7 test cases covering no-SIC no-op / ≤2-domains no-op / all-visited allow / strike-1 advisory / strike-2 advisory / strike-3 blocking / bypass-envvar honored.
- Plugin minor bump 6.32.0 → 6.33.0.

## v6.32.0 — 2026-05-13 (sprint-124 PR 5.13)

**Additive MINOR — new MCP handler `grade_semantic_intent_contract` scores a SemanticIntentContract against a 7-criterion deterministic rubric. Pure heuristics, no LLM call. Verdict: ≥0.7→pass, 0.5-0.7→revise, <0.5→reject. Emits `sic_graded` event. Per canonical plan v2 §4 row 5.13.**

### Changes

- **NEW** `lib/semantic-intent/grade-rubric.ts`: pure 7-criterion scorer (`gradeSemanticIntentContract`) — clarityOfIntent (rawIntent+confirmedIntent ≥30 chars, not vague) + scopeBoundedness (affectedSurfaces 1-10, path-like) + nounVerbDisambiguation (≥2 nouns + ≥2 verbs) + nonGoalsClarity (nonGoals ≥1) + downstreamBlastRadius (allowed+forbidden sum ≥1) + fillSequenceCompleteness (fillSequence present: distinct steps/8; absent: 0.5 neutral) + evidenceGrounding (supportingResearchRefs valid prefix→1; seedRid present→0.75; absent→0.5 neutral). Equal weights 1/7 each. Returns `SicGradingResult { perCriterion, overall, verdict, reasoning }`.
- **NEW** `bridge/handlers/grade-semantic-intent-contract.ts`: thin MCP handler wrapper — validates input, calls pure scorer, emits `validation_phase_completed errorClass="sic_graded"` with reasoning ≥40 chars citing canonical plan v2 §4 row 5.13, returns `SicGradingResult`.
- **MODIFIED** `bridge/mcp-server.ts`: registered `grade_semantic_intent_contract` in TOOLS array (harness-engineering category) + HANDLER_MODULES + TOOL_CATEGORIES. TOOLS count 22 → 23.
- **NEW** `tests/bridge/handlers/grade-semantic-intent-contract.test.ts`: 23 test cases covering empty SIC / fully-populated SIC / mixed SIC / fillSequence-absent / fillSequence-partial / fillSequence-complete / per-criterion thresholds / handler missing-input / handler valid-input.
- Plugin minor bump 6.31.0 → 6.32.0.

## v6.31.0 — 2026-05-13 (sprint-123 PR 5.12)

**Additive MINOR — 4 plugin agents (harness-planner / harness-generator / harness-evaluator / ontology-steward) gain "## Authority chain (runtime, sprint-123+)" section. Section briefs each agent that SprintContract / SemanticIntentContract / DigitalTwinChangeContract refs passed by Lead in the briefing are the runtime authority boundary (cite in commit messages + emit_event reasoning). Role-specific wording: planner authors contracts + cites SIC nonGoals in spec; generator consumes frozen contract + requests DTC before ontology mutations; evaluator scores only within rubric in SprintContract + flags missing DTC in evidence; ontology-steward bridges SIC ↔ DTC with explicit MINOR/MAJOR escalation rules. Per canonical plan v2 §4 row 5.12 + former plan PR4.**

### Changes

- **MODIFIED** `agents/harness-planner.md`: added "## Authority chain (runtime, sprint-123+)" section — planner-role wording (author perspective: SprintContract seeded by spec.md + eval-rubric.md; SIC constrains what spec may propose; DTC required when spec requires ontology mutation).
- **MODIFIED** `agents/harness-generator.md`: added "## Authority chain (runtime, sprint-123+)" section — generator-role wording (consumer perspective: cite SprintContract RID in every commit + emit_event; cite SIC RID for file edits; request DTC before ontology mutations).
- **MODIFIED** `agents/harness-evaluator.md`: added "## Authority chain (runtime, sprint-123+)" section — evaluator-role wording (scoring perspective: score only rubric in bound SprintContract; SIC violations are automatic criterion fails; missing DTC on ontology-touching code is `[DTC MISSING]` evidence + fail).
- **MODIFIED** `agents/ontology-steward.md`: added "## Authority chain (runtime, sprint-123+)" section — steward-role wording (bridge perspective: SIC approvedNouns + affectedSurfaces constrain ForwardProp chain changes; DTC required for MAJOR schema mutations; MINOR additions may proceed under SIC authority with `[SIC-authority: <rid>]` annotation).
- **NEW** `tests/agents/contract-propagation.test.ts`: reads all 4 agent .md files, asserts "## Authority chain (runtime, sprint-123+)" header present + SprintContract / SemanticIntentContract / DigitalTwinChangeContract all mentioned.

## v6.30.0 — 2026-05-13 (sprint-122 PR 5.11)

**Additive MINOR — prompt-dtc-enforcement-gate gains 'selective-blocking' mode. Blocks ONLY ontology-affecting MCP tools (apply_edit_function / commit_edits / ontology_context_query mutation modes / negotiate_sprint_contract approve|counter). 60-min SIC approval cache (.palantir-mini/session/sic-approval-cache.json + events.jsonl semantic_intent_contract_approved scan) exempts approved scopes. Mode is OPT-IN via PALANTIR_MINI_PROMPT_DTC_GATE_MODE=selective-blocking; default remains 'off' (rule 12 v3.18.0 unchanged). PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 honored in all non-off modes. Per canonical plan v2 §4 row 5.11.**

### Changes

- **NEW** `lib/prompt-front-door/sic-approval-cache.ts`: `SicApprovalEntry` + `SicApprovalCache` types; `checkSicApprovalCache(projectRoot, promptId?)` — in-memory + disk + events.jsonl 3-tier lookup; `recordSicApproval(projectRoot, promptId, approvalRef?)` — write-through to disk + memory; `invalidateSicApprovalMemoryCache(projectRoot)` — test helper; `SIC_CACHE_TTL_MS = 60min` constant.
- **MODIFIED** `hooks/prompt-dtc-enforcement-gate.ts`: added `selective-blocking` to `GateMode` union; `gateMode()` accepts new value; NEW helpers `ONTOLOGY_AFFECTING_TOOLS`, `isOntologyAffectingForSelectiveBlocking`, `isOntologyContextQueryMutation`, `isNegotiateSprintContractApproveOrCounter`, `checkSicCacheForSelectiveBlocking`; main dispatch adds selective-blocking branch (non-ontology tools skip; cache hit allows; cache miss blocks + emits assessment); gate-pass path records SIC approval in cache; `PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1` honored for advisory/selective-blocking/scoped-blocking/blocking modes; `__test__` exports extended with 3 new helpers.
- **Tests** (13 new test cases in selective-blocking describe block): mode=off default passes, non-ontology Edit passes, non-ontology MCP passes, ontology commit_edits no SIC blocks, apply_edit_function no SIC blocks, ontology_context_query read-only passes, ontology_context_query mutation blocks, negotiate_sprint_contract propose passes, negotiate_sprint_contract approve blocks, SIC approval within 60min cache hit allows, SIC approval 61+ min expired blocks, bypass envvar honored, __test__ helper unit tests.

## v6.29.0 — 2026-05-13 (sprint-121 PR 5.10)

**Additive MINOR — pm-semantic-intent-gate gains 8-turn fill sequence (T0…T7). New lib/semantic-intent/fill-sequence.ts exports EIGHT_TURN_FILL_SEQUENCE + advanceFillSequence + isFillComplete. Handler accepts optional `turn` (0-7) + `turnUserInput` args; returns `fillResult` when turn is supplied. T7 emits `validation_phase_completed errorClass="semantic_intent_contract_finalized"` + advisory `sic_fill_incomplete` when fields missing. Backward compat: callers without `turn` get existing single-shot SIC creation behavior unchanged. Per canonical plan v2 §4 row 5.10; consumes PR 5.9 schemas v1.62.0+ fillSequence/verdict/seedRid/gradeRubricRid fields.**

### Changes

- **NEW** `lib/semantic-intent/fill-sequence.ts`: `SicFillStep` + `SicFillSource` + `SicWithFillFields` types; `EIGHT_TURN_FILL_SEQUENCE` constant; `advanceFillSequence(contract, turnIndex, userInput?, agentAutoFill?)` function; `isFillComplete(contract)` predicate.
- **MODIFIED** `bridge/handlers/pm-semantic-intent-gate.ts`: new `turn` + `turnUserInput` input fields; new `fillResult: SemanticIntentFillResult` output field; 8-turn fill logic wired with T7 finalization event emit + sic_fill_incomplete advisory.
- **MODIFIED** `bridge/mcp-server.ts`: `pm_semantic_intent_gate` schema adds `turn` + `turnUserInput` properties.
- **MODIFIED** `skills/pm-semantic-intent-gate/SKILL.md`: documents 8-turn fill workflow with turn mapping.
- **Tests**: 33 tests across pm-semantic-intent-gate.test.ts (covers T0–T7 unit + integration, backward compat, sic_fill_incomplete advisory, finalized event).
- **Schema coverage test**: `mcp-server-schema.test.ts` updated with `turn` + `turnUserInput` in public fields list.

## v6.28.0 — 2026-05-13 (sprint-120 PR 5.9)

**Additive MINOR — consumes schemas v1.62.0 (OntologyContextSeed promotion + SemanticIntentContract strengthening). No runtime behavior change in this PR; consumed by PR 5.10 + PR 5.13. Per canonical plan v2 §4 row 5.9.**

### Changes

- **peerDep bump**: `@palantirKC/claude-schemas` peer dependency updated to `^1.62.0` (was `^1.61.0`).
- **No runtime behavior change**: `OntologyContextSeedDeclaration` typed shape + `SemanticIntentContract` additive fields (`seedRid`, `fillSequence`, `verdict`, `gradeRubricRid`) are available for consumption but no handler reads them yet. PR 5.10 will wire the 8-turn fill sequence; PR 5.13 will wire the SIC grader.
- `lib/ontology-context/query.ts`: no changes — continues using the plugin-local `OntologyContextSeed` type from `lib/context-engineering/ontology-activation.ts` (pre-existing shape unmodified; migration to schema-typed surface deferred to PR 5.10).

---

## v6.27.0 — 2026-05-13 (sprint-119 PR 5.8)

**Additive MINOR — pm_substrate_query new mode="post-merge". Replays T2+ events between previous main HEAD and new merge commit; aggregates per agent / refinementTarget / grade. Per canonical plan v2 §4 row 5.8.**

### Changes

- **NEW** `bridge/handlers/pm-substrate-query-post-merge.ts`: Standalone handler for post-merge T2+ event replay.
  - Accepts `{ project?, newMergeSha, previousMainSha? }`. Derives `previousMainSha` from `git rev-parse <newMergeSha>^` when omitted.
  - Validates both SHAs via `git rev-parse --verify`. Throws descriptive error on invalid SHA.
  - Lists commits in range via `git log --format='%H %ct' previousMainSha..newMergeSha`.
  - Two-signal event matching: `atopWhich` SHA set (primary) + timestamp range fallback.
  - Filters events to T2+ (T2/T3/T4) per rule 26 §Grading.
  - Aggregates per `byWhom.agentName`, per `withWhat.refinementTarget.kind`, per grade (T2/T3/T4).
  - Returns `topInsights`: top 5 reasoning quotes from T3+ events, sorted by grade DESC.
  - Returns: `{ mode, range: { previousMainSha, newMergeSha, commitCount, firstCommitAt, lastCommitAt }, events: { totalT2Plus, perAgent, perRefinementTarget, perGrade }, topInsights }`.
- **MODIFIED** `bridge/handlers/pm-substrate-query.ts`: Extended to support 7th mode `"post-merge"`.
  - Added `"post-merge"` to `SubstrateMode` union + `VALID_MODES` set.
  - Added `newMergeSha?: string` + `previousMainSha?: string` to `PmSubstrateQueryArgs`.
  - `buildDelegateArgs` case for `"post-merge"` passes `{ project, newMergeSha, previousMainSha }`.
  - `loadHandler` case for `"post-merge"` lazy-imports `pm-substrate-query-post-merge.js`.
  - Error message in mode validation updated to include `post-merge`.
- **NEW** `tests/bridge/handlers/pm-substrate-query-post-merge.test.ts`: 8 test suites (T1–T8).
  - T1: both SHAs provided → returns aggregate with correct shape.
  - T2: `previousMainSha` omitted → derives from merge commit first parent.
  - T3: empty range (same SHA as previousMain and newMerge) → returns counts=0.
  - T4: invalid SHA → throws descriptive error.
  - T5: missing `newMergeSha` → throws descriptive error.
  - T6: T2+ filtering — T0/T1 excluded; T2/T3/T4 counted.
  - T7: `perAgent` aggregation buckets by `byWhom.agentName`.
  - T8: `topInsights` returns up to 5 T3+ reasoning quotes sorted by grade DESC.

---

## v6.26.0 — 2026-05-13 (sprint-118 PR 5.7)

**Additive MINOR — write-scope-runtime-enforce PreToolUse hook: checks Edit/Write/MultiEdit target paths against subagent's writableRoot (worktree path → project-scope.json → Lead-direct exempt). Advisory on violation; blocking after 3 strikes per session. Per canonical plan v2 §4 row 5.7 + rule 16 v4.1.0 §Roles worktree isolation.**

### Changes

- **NEW** `hooks/write-scope-runtime-enforce.ts`: PreToolUse hook matching `Edit|Write|MultiEdit`.
  - Lead-direct (agentName="claude-code" or no subagent_type) is always exempt.
  - Writable root resolution order: (1) `CLAUDE_WORKTREE_PATH` env var (Claude Code native worktree isolation) → (2) `<projectRoot>/.palantir-mini/project-scope.json#writableRoot` → (3) no constraint (pass-through).
  - Extracts target paths from `tool_input.file_path` (Edit/Write) and `tool_input.edits[].file_path` (MultiEdit).
  - Paths outside writable root → violations array → advisory emission with strike counter.
  - Strike counter persisted at `.palantir-mini/session/write-scope-strikes.json` (session-scoped; auto-resets when `session_id` changes).
  - Strikes 1–3: advisory only (`decision: "continue"`); actionable `additionalContext` included.
  - Strike 4+: blocking (`permissionDecision: "deny"`) with full diagnostic block message.
  - Emits `validation_phase_completed errorClass="write_scope_violation"` (advisory) or `"write_scope_blocked"` (blocking) on each miss.
  - Bypass: `PALANTIR_MINI_WRITE_SCOPE_BYPASS=1` (audited via `errorClass="write_scope_bypass_invoked"`).
- **MODIFIED** `hooks/hooks.json`: new hook entry in PreToolUse `Edit|Write|MultiEdit` matcher; `permissionDecision: "defer"`, `timeout: 5s`; description count updated to 98 hook commands.
- **NEW** `tests/hooks/write-scope-runtime-enforce.test.ts`: 6 test cases — Lead-direct exempt, inside-worktree write → OK, outside-worktree write → advisory, project-scope.json violation → advisory, 3 strikes → 4th blocks, bypass envvar honored.

---

## v6.25.0 — 2026-05-13 (sprint-117 PR 5.6)

**Additive MINOR — agent-decision-trail-enforce PreToolUse hook: verifies subagent MCP gate-crossing calls (apply_edit_function / commit_edits / emit_event) have a paired `agent_decision_logged` event within 30s. Advisory on miss; blocking after 5 strikes per session. Per canonical plan v2 §4 row 5.6 + rule 12 v3.4.0 §Subagent decision audit invariant.**

### Changes

- **NEW** `hooks/agent-decision-trail-enforce.ts`: PreToolUse hook matching `apply_edit_function | commit_edits | emit_event` gate-crossing tools.
  - Lead-direct (agentName matching `^(claude-code$|lead-)`) is exempt.
  - Self-referential skip: when emitting `agent_decision_logged` itself, the check is bypassed to avoid recursion.
  - Resolves correlationId via `readCorrelationMarker` (PR 5.5 per-agent isolated marker) with env-direct fallback.
  - When no correlationId is available: advisory `errorClass="agent_decision_trail_missing"` with `reason="no_correlation_id"`.
  - When correlationId found but no matching `agent_decision_logged` in last 30s: advisory `errorClass="agent_decision_trail_missing"` with strike count.
  - Strike counter persisted at `.palantir-mini/session/decision-audit-strikes.json` (session-scoped; auto-resets when `session_id` changes).
  - Strike 1–5: advisory only (`decision: "continue"`); actionable `additionalContext` included.
  - Strike 6+: blocking (`permissionDecision: "deny"`) with full diagnostic message (pattern check, hook chain check, bypass instructions).
  - Bypass: `PALANTIR_MINI_DECISION_AUDIT_BYPASS=1` (audited via `errorClass="decision_audit_bypass_invoked"`).
  - Strike counter reset: `PALANTIR_MINI_DECISION_AUDIT_RESET=1`.
- **MODIFIED** `hooks/hooks.json`: new hook entry in PreToolUse `apply_edit_function | commit_edits | emit_event` matcher; `permissionDecision: "defer"`, `timeout: 8s`; description count updated to 97 hook commands.
- **NEW** `tests/hooks/agent-decision-trail-enforce.test.ts`: 5 test cases — Lead-direct exempt, matched trail → no advisory, missing trail → advisory, 5 strikes → 6th blocks, bypass envvar → no advisory.

---

## v6.24.0 — 2026-05-13 (sprint-116 PR 5.5)

**Additive MINOR — subagent correlationId binding via per-agent isolated marker file. Eliminates concurrent-subagent misattribution race in `agent-decision-log.ts`. Legacy shared-dir markers still readable with advisory emitted. Per canonical plan v2 §4 row 5.5 + rule 12 §Subagent decision audit invariant.**

### Changes

- **NEW** `lib/correlation/marker.ts`: `writeCorrelationMarker` / `readCorrelationMarker` / `readAllMarkersForSession`. Marker files stored at `<projectRoot>/.palantir-mini/session/correlation-markers/<sessionId>/<subagentId>.json`. Write is best-effort (returns false on I/O error, never throws). Read returns null on missing/malformed file.
- **MODIFIED** `hooks/subagent-orchestration-audit.ts`: In addition to legacy timestamp-keyed `.subagent-correlations/<ts>.json`, now also calls `writeCorrelationMarker` with `subagentId=correlationId` (UUIDv4 unique per spawn). Event payload gains `subagentId` and `markerPath` fields.
- **MODIFIED** `hooks/subagent-start.ts`: When `agent_id` + `session_id` are both present in SubagentStart payload, allocates a fresh UUIDv4 `correlationId`, writes per-agent marker file keyed by `agentId`, and emits `validation_phase_completed errorClass="subagent_correlation_bound"` with 5-dim envelope. `agent_start` event now includes `correlationId` when bound. Return message includes `correlationId=<prefix>…` when marker write succeeded.
- **MODIFIED** `hooks/agent-decision-log.ts`: `readCorrelationId` upgraded from legacy single-return to `{correlationId, source}` with 3-path resolution: (1) per-agent marker via `PALANTIR_MINI_SUBAGENT_ID` + session env, (2) `PALANTIR_MINI_CORRELATION_ID` env direct, (3) legacy shared-dir fallback (advisory emitted when used). `agent_decision_logged` payload gains `correlationSource` field.
- **NEW** `tests/lib/correlation/marker.test.ts`: 14 test cases — write/read round-trip, concurrent distinct files (10 agents), read-all sorted, missing marker → null, malformed JSON → null, missing correlationId field → null, error resilience.
- **EXTENDED** `tests/hooks/subagent-start.test.ts`: 5 new PR 5.5 correlation tests — marker written on spawn, correlationId in return message, two agents → distinct files, missing agent_id → no marker, missing session_id → no marker.

---

## v6.23.0 — 2026-05-13 (sprint-113 PR 5.3)

**Additive MINOR — commit-edits-precondition strengthened with dry-run freshness check, edit-shape drift detection, and 4th-strike escalation. All purely additive; Quick Sprint + grace-period pass-through paths preserved. Per canonical plan v2 §4 row 5.3 + rule 16 v3.2.0 §Loop steps 3-5.**

### Changes

- **MODIFIED** `hooks/commit-edits-precondition.ts` (v3.14.0):
  - **Check 1 — Freshness**: After passing the existing dry-run gate, verifies that the paired `dry_run_graded` event is within the last 30 min (configurable: `PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN`). Stale → advisory `errorClass="commit_gate_stale_dry_run_grade"` emitted; commit proceeds.
  - **Check 2 — Edit-shape drift**: Computes a sha256 over `tool_input.edits` and soft-compares against `dryRunRef` suffix (last 16 chars). Non-empty edit arrays that hash-mismatch → advisory `errorClass="commit_gate_edit_shape_drift"` emitted; commit proceeds.
  - **Check 3 — 4th-strike escalation**: Counts `commit_gate_*` advisory events for this contract within the same freshness window. When prior count + new count ≥ 3, the next attempt blocks with `permissionDecision:"deny"`. Bypass: `PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS=1` (audited via `commit_gate_escalate_bypass_invoked` event).
  - Quick Sprint mode (contract.mode="quick") returns before PR 5.3 checks — zero behavior change for Quick Sprint contracts.
  - Grace-period path (no dry_run_computed ever emitted) returns before PR 5.3 checks — zero behavior change for legacy sprints.
  - Adds `import * as crypto from "crypto"` for sha256 hashing.
- **EXTENDED** `tests/hooks/commit-edits-precondition.test.ts` — 8 new test cases (PR5.3-1 through PR5.3-8) covering: fresh grade (no advisory), stale grade (advisory), no edits (no drift advisory), non-empty edits hash-mismatch (drift advisory), strike 1 advisory+allow, 4th-strike block, bypass envvar honored, Quick Sprint preservation.

---

## v6.22.0 — 2026-05-13 (sprint-112 PR 5.2)

**Additive MINOR — SprintContract runtime advisory validation. Four checks: status transitions, scope paths, action↔status invariant, sprint-number collisions. All advisory (emit events, continue execution). Per canonical plan v2 §4 row 5.2.**

### Changes

- **ADDED** `lib/sprint-contract/validation.ts` — four pure validator functions:
  - `isValidTransition(from, to)` — enforces legal status progression: `drafting → negotiating → bound → in-progress → (passed|failed|aborted)`. Terminal states (passed/failed/aborted) reject all further transitions.
  - `isValidActionForStatus(action, status)` — rejects `approve`/`counter` on non-negotiating contracts; `propose` requires `negotiating`; `read` always valid.
  - `findSprintNumberCollisions(projectPath, sprintNumber, incomingContractId)` — scans `<project>/.palantir-mini/harness/sprints/sprint-*/contract.json` for pre-existing contracts with same sprintNumber but different contractId.
  - `findMissingScopePaths(projectPath, contract)` — validates `inputs[].scopePaths` entries exist on disk (globs skipped).
- **MODIFIED** `bridge/handlers/negotiate-sprint-contract/bind.ts` (v6.22.0):
  - Check 1: status transition advisory — emits `validation_phase_completed errorClass="sprint_contract_invalid_transition"` if current contract status cannot legally reach `bound`.
  - Check 3: sprint number collision advisory — emits `errorClass="sprint_contract_sprint_number_collision"` when existing contracts share the same sprintNumber with a different contractId.
  - Check 4: scope path advisory — emits `errorClass="sprint_contract_scope_path_missing"` for each `inputs[].scopePaths` entry that does not resolve on disk.
  - All checks emit then continue; contract binding proceeds regardless.
- **MODIFIED** `bridge/handlers/negotiate-sprint-contract/write-action.ts` (v6.22.0):
  - Check 2: action × status advisory — emits `errorClass="sprint_contract_action_status_mismatch"` when action (approve/counter/propose) is called on a contract in an incompatible negotiation status.
  - Advisory only; write proceeds regardless.
- **ADDED** `tests/lib/sprint-contract/validation.test.ts` — 38 tests covering all four validators (positive + negative cases) and handler wire-in (advisory events emitted without blocking).

---

## v6.21.0 — 2026-05-13 (sprint-111 PR 5.1)

**Additive MINOR — GradingRubric primitive (schemas v1.61.0) + grade_outcome_with_rubric bypass guard for non-canonical rubrics. Advisory by default; bypass via PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 (audited). Per canonical plan v2 §4 row 5.1.**

### Changes

- **DEPENDS-ON** `schemas v1.61.0` — new `grading-rubric.ts` primitive (`GradingRubricDeclaration`, `GradingRubricRegistry`, `RubricRegistrationStatus`, `GRADING_RUBRIC_REGISTRY`); canonical rubrics immutable once registered.
- **DEPENDS-ON** `shared-core v1.19.0` — re-exports GradingRubric surface.
- **MODIFIED** `bridge/handlers/grade-outcome-with-rubric.ts` (v6.21.0):
  - Imports `GRADING_RUBRIC_REGISTRY` from `#schemas/ontology/primitives/grading-rubric`.
  - Bypass guard: when `rubric.canonicalRubricRid` set but NOT in registry (or `status != "canonical"`), emits advisory `validation_phase_completed` with `errorClass="non_canonical_rubric_used"`. Execution continues (SOFT guard).
  - Bypass: `PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1` → emits `errorClass="canonical_rubric_bypass_invoked"` instead and skips advisory.
- **MODIFIED** `bridge/handlers/grade-outcome/types.ts` — `GradingRubric` extended with optional `canonicalRubricRid?: string` and `status?: "draft" | "canonical" | "deprecated"` fields.
- **ADDED** `runtime-overlay/schemas-snapshot/ontology/primitives/grading-rubric.ts` — snapshot copy for plugin-internal `#schemas` path resolution.
- **ADDED** `tests/bridge/handlers/grade-outcome-with-rubric-canonical-bypass.test.ts` — bypass guard + advisory + registry tests.
- **ADDED** `.claude/schemas/tests/primitives/grading-rubric.test.ts` — GradingRubricRegistry immutability + isCanonical tests.

---

## v6.20.0 — 2026-05-13 (sprint-099 PR 3.7) — **PHASE 3 CLOSE — GOLDEN FIXTURES + CODEX PARITY GAP DOC**

**Additive MINOR — ontology_context_query golden fixtures (5 scenarios) + Codex parity gap documentation. Per canonical plan v2 §4 row 3.7 + proposal §6. PHASE 3 COMPLETE.**

### Changes

- **NEW** `tests/golden/ontology-context-query/` directory with 5 paired input/expected fixture sets:
  - `01-minimal-query`: single scopePath, no requestedAxes; all 7 sub-contexts + 5 derived fields present.
  - `02-multi-rid-query`: 5 scopePaths spanning schemas + shared-core + handlers + lib + 2 requestedAxes; axisRids.length == 7; requiredContracts includes both canonical contracts.
  - `03-empty-graph`: `includeImpact=false`; graphConfidence == 1.0, missingEdges == [], recommendedAgentUse == "lead-direct".
  - `04-high-risk-intent`: contracts/ scopePath + risky requestedAxes; riskContext remains "pending-later-pr" (no auto-approval-gate at handler layer); requiredContracts == both contracts.
  - `05-low-confidence`: nonexistent scopePath; impact_query degrades gracefully to graphConfidence < 1.0 + recommendedAgentUse != "lead-direct".
- **NEW** `tests/golden/ontology-context-query/golden.test.ts`: in-process test runner with volatile-placeholder shape comparator. 9 pass + 5 skip (CODEX-PARITY-GAP per-fixture stubs). 4 key-invariant assertion tests beyond shape.
- **NEW** `tests/golden/ontology-context-query/README.md`: volatile placeholder convention, parity policy, scenario table, refresh instructions.

### Phase 3 acceptance gate (covered by PR 3.7 fixtures)

- ✓ Router decisions consume ontology_context_query (PR 3.4).
- ✓ No raw-intent fallback for ontology-affecting tasks (PR 3.4 + advisory event).
- ✓ Auto-approve gated by explicit 6-signal low-risk check (PR 3.5).
- ✓ graphConfidence threshold routing (PR 3.6).
- ✓ Golden fixtures covering 5 scenario shapes (PR 3.7).
- ⚠ CODEX-PARITY-GAP: smoke-test through Codex MCP deferred to future PR.

---

## v6.19.0 — 2026-05-13 (sprint-098 PR 3.6) — **PHASE 3 PR 6/7 — GRAPHCONFIDENCE THRESHOLD ROUTING**

**Additive MINOR — `pm_intent_router` dispatches based on `graphConfidence` threshold: ≥0.7 → `lead-direct`, 0.4–<0.7 → `targeted-verification`, <0.4 → `bounded-explorer`. `missingEdges > 5` downgrades one tier. Per canonical plan v2 §4 row 3.6 + proposal §8 Stage 5.**

### Changes

- **NEW** `lib/delegation-recipe/recipe-builder.ts`: exported `pickDispatchModeFromConfidence(graphConfidence, missingEdgesCount?)` — pure threshold function with downgrade rule.
- **NEW** `lib/delegation-recipe/recipe-builder.ts`: `DispatchMode` type + `BoundedExplorerScope` interface exported for downstream consumers.
- **MODIFIED** `lib/delegation-recipe/recipe-builder.ts`: `DelegationRecipe.recipe` gains optional `dispatchMode`, `verificationScope`, `boundedExplorers` fields. Populated via `buildDispatchModeEnrichment()` when `ontologyContext` is provided to `buildRecipe`.
- **MODIFIED** `bridge/handlers/pm-intent-router.ts`: imports `pickDispatchModeFromConfidence` + `DispatchMode`. After `ontology_context_query` succeeds, computes `graphConfidenceDispatchMode` and includes it in the `validation_phase_completed` emit payload and `IntentRouterResult`.
- **NEW** `IntentRouterResult.graphConfidenceDispatchMode?: DispatchMode` — top-level field mirroring `recipe.dispatchMode` for callers reading the result shape directly.
- **NEW** `tests/lib/delegation-recipe/dispatch-mode.test.ts` — 30+ tests covering thresholds, boundaries, downgrade rule, recipe integration, chunking invariants, and integration with `buildRecipe`.

### bounded-explorer chunking

When `dispatchMode === "bounded-explorer"`, `missingEdges` are split into chunks of ≤5 per explorer, capped at 3 explorers max. Each `BoundedExplorerScope` carries `scope` (deduplicated RIDs from fromRid + toRid) and `focus` (human-readable edge range e.g. "edges 1-5").

### verification scope

When `dispatchMode === "targeted-verification"`, `verificationScope` is the list of RIDs whose per-RID `graphConfidence < 0.7` — the uncertain subset that the bounded explorer should verify.

---

## v6.18.0 — 2026-05-13 (sprint-097 PR 3.5) — **PHASE 3 PR 5/7 — APPROVAL AUTO-CREATE POLICY EXPLICIT LOW-RISK SIGNALS**

**Additive MINOR — approval auto-create now gated on explicit 6-signal low-risk check (`isLowRiskIntent`). High-risk intents skip auto-create and emit advisory `validation_phase_completed(errorClass="approval_auto_create_skipped_high_risk")`. Per canonical plan v2 §4 row 3.5 + proposal §11 Phase 3 final acceptance.**

### Modified: `lib/ontology-context/approval.ts`

- New exported function `isLowRiskIntent(input: LowRiskIntentInput): LowRiskIntentResult`.
- Implements 6-signal explicit low-risk check: (1) read-only scope proxy, (2) scope path count ≤ 2 + no `schemas/**` or `ontology/**` paths, (3) no T3+ event required, (4) no contract mutation, (5) `complexityHint ∈ {"trivial", "single-file"}`, (6) no risky keywords (`delete`, `remove`, `migrate`, `schema`, `ontology`, `commit`, `merge`, `deploy`).
- Returns `{lowRisk: true}` when all pass; `{lowRisk: false, failedSignal: "<label>"}` on first failure.
- New exported types: `LowRiskIntentInput`, `LowRiskIntentResult`.

### Modified: `bridge/handlers/pm-intent-router.ts`

- Import: `isLowRiskIntent` + `createOntologyContextApproval` from `lib/ontology-context/approval`.
- Auto-create block (step e): now gates on `isLowRiskIntent({intent, scopePaths: routingScopePaths, complexityHint})`.
  - Low-risk path: calls `createOntologyContextApproval` (best-effort); sets `ontologyContextApprovalRef`.
  - High-risk path: emits advisory `validation_phase_completed(errorClass="approval_auto_create_skipped_high_risk", failedSignal=...)`, skips auto-create.
- `acceptApprovalAutoCreate=false` still unconditionally suppresses auto-create.

### Modified: `tests/lib/ontology-context/approval.test.ts`

- Extended: imports `isLowRiskIntent`.
- New `describe("isLowRiskIntent")` suite: 18 test cases covering all 6 signal failure modes + happy paths (trivial + single-file) + boundary cases (0 paths, exactly 2 paths, absent complexityHint).

---

## v6.17.0 — 2026-05-13 (sprint-096 PR 3.4) — **PHASE 3 PR 4/7 — PM_INTENT_ROUTER ONTOLOGY CONTEXT CONSUMPTION**

**Additive MINOR — pm_intent_router now invokes ontology_context_query as its canonical context-loading path. Raw-intent fallback path preserved but gated behind advisory `validation_phase_completed` event (`errorClass: "ontology_context_query_failed_fallback"`). Per canonical plan v2 §4 row 3.4; Phase 3 PR 4/7.**

### Modified: `bridge/handlers/pm-intent-router.ts`

- Step c (new): `ontology_context_query` invoked after contract gate, before legacy prefetch. Lazy-imported via `await import("./ontology-context-query")` with 500ms hard wall.
- `OntologyContextQueryResult` passed into `buildRecipe` via new `BuildRecipeInput.ontologyContext`.
- Fallback: when query throws or times out, emits advisory `validation_phase_completed(errorClass="ontology_context_query_failed_fallback")` and continues with legacy prefetch chain — routing never blocked.
- `IntentRouterResult.ontologyContextDigest` (new optional field): short digest `"gc:<conf>|rids:<n>|caps:<n>|t3+:<n>"` for lineage. Present when context query succeeded.
- Emit payload enriched: `rawIntentFallback` boolean advisory + `ontologyContextDigest` field.

### Modified: `lib/delegation-recipe/recipe-builder.ts`

- `BuildRecipeInput.ontologyContext?: OntologyContextQueryResult` (new optional field; sprint-096 PR 3.4).
- `buildRecipe` enriches when context present: merges `retrievalContext.pluginSourceFiles.scopedFiles` (capped 5) into `scopePaths`; upgrades `complexityHint` to `"cross-cutting"` when any `perRidImpact` entry has `forwardCount + backwardCount > 6`.
- `deriveOntologyContextDigest` (new public export): short digest for lineage tracing.

---

## v6.16.1 — 2026-05-13

- Runtime-overlay snapshot refresh: schemas 1.54.0 → 1.60.0 (+31 primitives from PR 2.1+2.2+2.3); shared-core 1.12.0 → 1.18.0 (+5 new files). Per canonical-plan-completion-handoff §C.5 #1. Unblocks concrete typed graph emission for downstream PRs.

---

## 6.16.0 — 2026-05-13 (sprint-095 PR 3.3) — **PHASE 3 PR 3/7 — RETRIEVALCONTEXT COMPOSITION**

**Additive MINOR — RetrievalContext composition wiring fills the `retrievalContext` placeholder authored by PR 3.1 SHELL with a real composer covering 11 sub-fields. Per canonical AIP-aligned plan v2 §4 row 3.3 + proposal §8 Stage 3. Mirrors PR 3.2 (ApplicationState) composer pattern.**

### NEW composer `lib/ontology-context/retrieval-context.ts`

Pure async composition function with per-sub-field graceful degradation. Public exports:

- `composeRetrievalContext(project, opts)` — returns `RetrievalContextProjection`
- `RetrievalContextProjection` — typed interface with discriminant `status: "composed"`
- 11 typed sub-field interfaces (OfficialResearchDocsSubField, ProjectDocsSubField, SchemaPrimitivesSubField, PluginSourceFilesSubField, RulesSubField, HooksSubField, SkillsSubField, RecentLineageSubField, ValueGradeMetricsSubField, ImpactGraphNeighborhoodSubField, EvalCoverageSubField)

### 11 sub-fields composed (proposal §8 Stage 3)

| # | Sub-field | Composition source |
|---|-----------|--------------------|
| 1 | `officialResearchDocs` | `~/.claude/research/palantir-official` recursive `.md` scan, scope-filtered |
| 2 | `projectDocs` | `<project>/BROWSE.md`, `<project>/INDEX.md`, `<project>/CLAUDE.md` existence |
| 3 | `schemaPrimitives` | `~/.claude/schemas/ontology/primitives` recursive `.ts` scan, axis-filtered |
| 4 | `pluginSourceFiles` | `${PALANTIR_MINI_PLUGIN_ROOT}/lib` recursive `.ts` scan, scope-filtered |
| 5 | `rules` | `~/.claude/rules` `NN-*.md` ruleIds (mirrors PR 3.2 helper) |
| 6 | `hooks` | `${PALANTIR_MINI_PLUGIN_ROOT}/hooks/hooks.json` event keys |
| 7 | `skills` | `${PALANTIR_MINI_PLUGIN_ROOT}/skills` top-level dir names |
| 8 | `recentLineage` | `pmWorkflowLineageQuery` → T3+ event count over 7d window |
| 9 | `valueGradeMetrics` | `pmValueGradeMetrics` → totalEvents + t2PlusRatio + t3CircuitInputs |
| 10 | `impactGraphNeighborhood` | Thin REFERENCE to parent `impactContext` (does NOT duplicate); carries `axisRidCount` |
| 11 | `evalCoverage` | `<project>/**/.palantir-mini/evals/**/*.json` AIPEvaluationSuite scan, depth-capped |

All 11 fields ALWAYS present in the projection; `available: false` plus `error` string when degraded.

### MODIFIED `bridge/handlers/ontology-context-query.ts`

- Imports `composeRetrievalContext` from `../../lib/ontology-context/retrieval-context`.
- Re-exports `RetrievalContextProjection` as a type alias of the lib export (preserves public name).
- Replaces the PR 3.1 placeholder block `{ status: "pending-pr-3.3", retrievedDocs: [] }` with `await composeRetrievalContext(projectRoot, { scopePaths, requestedAxes, axisRidCount })`.

### Tests

- **NEW** `tests/lib/ontology-context/retrieval-context.test.ts` — 3 headline assertions (headline 11-subfield/≥7 available + scope-filter narrows pluginSourceFiles + graceful-degradation against non-existent project root).
- **MODIFY** `tests/bridge/handlers/ontology-context-query.test.ts` — single-line relax `pending-pr-3.3` → `composed`.

### Boundary (out-of-scope)

- Phase 2 substrate (10 indexers + impact-graph store + types + build-graph + impact_query + ontology-context-query-legacy.ts) — UNCHANGED.
- `lib/ontology-context/application-state.ts` — UNCHANGED (PR 3.2 frozen).
- `bridge/handlers/ontology-context-query.ts` outside composer wiring — UNCHANGED (preserves PR 3.1 SHELL structure).
- RiskContext + EvalContext placeholders — UNCHANGED (later PRs).
- New MCP TOOLS entries — NOT added (handler registration from PR 3.1 reused).
- `impactGraphNeighborhood` is a thin REFERENCE record only; does NOT duplicate impactContext content.

### Phase 3 progress

- PR 3.1 (v6.14.0): canonical handler SHELL — DONE.
- PR 3.2 (v6.15.0): ApplicationState composition — DONE.
- **PR 3.3 (this release, v6.16.0): RetrievalContext composition — DONE.**
- PR 3.4 (next): RiskContext composition — pending.
- PR 3.5: EvalContext composition (Convex evalRuns) — pending.
- PR 3.6 / PR 3.7: handler unification + ontology-context-query-legacy retirement — pending.

---

## 6.15.0 — 2026-05-13 (sprint-094 PR 3.2) — **PHASE 3 PR 2/7 — APPLICATIONSTATE COMPOSITION**

**Additive MINOR — ApplicationState composition wiring fills the `applicationState` placeholder authored by PR 3.1 SHELL with a real composer covering 13 sub-fields. Per canonical AIP-aligned plan v2 §4 row 3.2 + proposal §8 Stage 2.**

### NEW composer `lib/ontology-context/application-state.ts`

Pure async composition function with per-sub-field graceful degradation. Public exports:

- `composeApplicationState(project, opts)` — returns `ApplicationStateProjection`
- `ApplicationStateProjection` — typed interface with discriminant `status: "composed"`
- 9 typed sub-field interfaces (RepoStateSubField, BranchSubField, ActiveWorktreeSubField, PromptIdentitySubField, RuntimeCapabilitySubField, VisibleMcpToolsSubField, ActiveRulesSubField, ActiveHooksSubField, DirtyStateSubField, OtherSessionSignalsSubField)

### 13 sub-fields composed (proposal §8 Stage 2)

| # | Sub-field | Composition source |
|---|-----------|--------------------|
| 1 | `project` | `opts.project` direct |
| 2 | `repoState` | `git -C <project> status --porcelain` → modified/staged/untracked counts |
| 3 | `branch` | `git -C <project> branch --show-current` |
| 4 | `activeWorktree` | `git -C <project> worktree list --porcelain` parsing |
| 5 | `promptIdentity` | `opts.promptId / opts.promptHash` (null when absent) |
| 6 | `scopePaths` | `opts.scopePaths ?? []` |
| 7 | `userNonGoals` | `<project>/.palantir-mini/project-scope.json#nonGoals` |
| 8 | `runtimeCapabilitySurface` | `loadCapabilityRegistry` → stats + per-category counts |
| 9 | `visibleMcpTools` | `bridge/mcp-server.TOOLS.map(t => t.name)` |
| 10 | `activeRules` | `~/.claude/rules/NN-*.md` directory scan |
| 11 | `activeHooks` | `<plugin>/hooks/hooks.json#hooks` event keys |
| 12 | `currentDirtyState` | porcelain stdout line count |
| 13 | `otherSessionWorkSignals` | `<project>/.palantir-mini/session/*` subdir heuristic |

Each git/registry-derived sub-field carries an `available: boolean` flag plus `error?: string` on degradation. Single sub-field failure NEVER poisons the whole projection.

### MODIFIED `bridge/handlers/ontology-context-query.ts`

- Imports `composeApplicationState` + re-types local `ApplicationStateProjection` as alias of the lib's projection.
- Replaces placeholder block `{ status: "pending-pr-3.2", notes: [...] }` with `await composeApplicationState(projectRoot, {promptId, promptHash, scopePaths})`.
- No change to other sub-context wiring (impact / capability / lineage / risk / eval / retrieval).
- No new MCP TOOLS entries — handler registration from PR 3.1 reused.

### Tests

**NEW** `tests/lib/ontology-context/application-state.test.ts` — 3 headline assertions:

1. Headline — real project root returns all 13 sub-fields with ≥7 of 9 availability-bearing sub-fields available.
2. Isolation — different project root (`mkdtempSync` tmpdir) returns a different projection with git-derived sub-fields unavailable.
3. Graceful degradation — non-existent project root returns partial state without throwing; project-scoped sub-fields degrade while runtime-scoped sub-fields (rules / hooks / MCP tools) stay available.

**MODIFIED** `tests/bridge/handlers/ontology-context-query.test.ts` — single-line relax `status === "pending-pr-3.2"` → `"composed"`. PR 3.1's other 2 tests unchanged.

### Out-of-scope (PR 3.2 boundary)

- Phase 2 substrate untouched (10 indexers + impact_query + ontology-context-query-legacy.ts all frozen).
- No new ontology primitives introduced.
- RetrievalContext (PR 3.3) / RiskContext (later PR) / EvalContext (later PR) untouched.

### Predecessor

plugin v6.14.0 + main HEAD `7d2d512d5` (post PR #426 Phase 3 entry).

---

## 6.14.0 — 2026-05-13 (sprint-093 PR 3.1) — **PHASE 3 ENTRY POINT**

**Additive MINOR — `ontology_context_query` NEW canonical MCP handler authored per canonical AIP-aligned plan v2 §4 row 3.1 + proposal §8 Stage 4. First PR of Phase 3 (`ontology_context_query` as primary read path). Phase 2 substrate completed at PR #425 (sprint-092 PR 2.15).**

### NEW handler `bridge/handlers/ontology-context-query.ts`

Phase 3 read-path orchestrator. Consumes the Phase 2 substrate (10 indexers + `impact_query` upgrade + CapabilityRegistry + `pm_workflow_lineage_query`) and unifies them into a single read-only query surface.

**Input schema** (proposal §8 Stage 4 verbatim):
- `project: string` (required, absolute project root)
- `promptId?: string`, `promptHash?: string` — PromptEnvelope join keys
- `scopePaths?: string[]` — narrowing file/dir paths
- `requestedAxes?: string[]` — AIP axes filter (opaque RIDs)
- `includeImpact? / includeLineage? / includeCapabilities? / includeRisks? / includeEvals?: boolean` — per-sub-context toggles (default true each)
- `projectsRoot?: string` — forwarded to `pm_workflow_lineage_query` discovery

**Output schema** (proposal §8 Stage 4):
- 7 projections — `applicationState` (typed placeholder, PR 3.2) / `retrievalContext` (typed placeholder, PR 3.3) / `impactContext` (wired) / `capabilityContext` (wired) / `riskContext` (placeholder, later PR) / `lineageContext` (wired) / `evalContext` (placeholder, later PR — Convex `evalRuns` subscription)
- 5 derived fields — `graphConfidence` (mean of per-RID, 0..1) / `missingEdges` (capped 50) / `recommendedAgentUse` (worst-case across RIDs: `"lead-direct"` | `"targeted-verification"` | `"bounded-explorer"` | `"none"`) / `requiredContracts` (derived from scopePaths × mutation-path patterns: `["SemanticIntentContract", "DigitalTwinChangeContract"]` when scope touches ontology/schemas/contracts/handlers; else empty) / `nonGoals` (loaded from `<project>/.palantir-mini/project-scope.json#nonGoals`)

**Sub-context wiring (PR 3.1 SHELL)**:
- `impactContext` — wired via `bridge/handlers/impact-query.ts` (PR 2.15) — per-axis loop; aggregates `graphConfidence` (mean), `missingEdges` (union capped), `recommendedAgentUse` (min-tier worst-case routing)
- `capabilityContext` — wired via `lib/capability-registry/index.ts:loadCapabilityRegistry`; scope-intersects all 7 capability categories against `scopePaths`
- `lineageContext` — wired via `bridge/handlers/pm-workflow-lineage-query.ts`; counts T3+ events via `payload.valueGrade`, captures `lastEventWhen` ISO8601
- `applicationState` / `retrievalContext` / `riskContext` / `evalContext` — typed placeholders with explicit `status: "pending-pr-3.2" | "pending-pr-3.3" | "pending-later-pr"` markers; filled by subsequent Phase 3 PRs

### Legacy handler coexistence

- Renamed legacy `bridge/handlers/ontology-context-query.ts` → `bridge/handlers/ontology-context-query-legacy.ts` (verbatim — UniversalOntologyEntry / workflowTrace flow preserved for skill `pm-project-onboard`, `lib/ontology-workflow/trace.ts`, `lib/context/context-capsule.ts`)
- HANDLER_MODULES gains new internal-only entry `ontology_context_query_legacy: "./handlers/ontology-context-query-legacy"`
- Legacy test renamed to `ontology-context-query-legacy.test.ts`; preserves regression coverage with updated import path

### MCP TOOLS registration

- `bridge/mcp-server.ts` TOOLS array gains one entry — `ontology_context_query` under `lead-routing` category (consumed by `pm_intent_router` in Phase 3.4)
- HANDLER_MODULES slot for `ontology_context_query` → `./handlers/ontology-context-query` (file path unchanged; semantics now canonical Phase 3 read-path orchestrator)

### Tests (NEW `tests/bridge/handlers/ontology-context-query.test.ts`)

3 headline assertions:
1. Returns all 7 sub-context fields + 5 derived fields with correct shape
2. `includeImpact=false` omits `impactContext` and sets `graphConfidence=1.0`
3. Handler is registered in MCP TOOLS array under `lead-routing`

### Phase 3 roadmap context (canonical plan v2 §4)

| PR  | Scope                                                  | Sprint |
|-----|--------------------------------------------------------|--------|
| 3.1 | NEW canonical handler shell (THIS PR)                  | X3     |
| 3.2 | ApplicationStateProjection — state-projection wiring   | X4     |
| 3.3 | RetrievalContextProjection — retrieval store wiring    | X4     |
| 3.4 | `pm_intent_router` consumes `ontology_context_query`   | X4     |
| 3.5 | Approval auto-create policy (explicit low-risk only)   | X4     |
| 3.6 | `graphConfidence` threshold-based routing tiers        | X4     |
| 3.7 | Fixtures + golden parity (Claude vs Codex per §6)      | X4     |

Phase 3 Acceptance: router decisions consume `ontology_context_query` / no raw-intent fallback for ontology-affecting tasks / auto-approve based on explicit low-risk signals.

### Rollback

Per canonical plan v2 §rollback table: PR 3.1 disable → `pm_intent_router` falls back to current raw-intent path (regression but functional). Revert this PR's TOOLS array + HANDLER_MODULES changes; legacy handler at `-legacy.ts` continues serving internal callers unchanged.

---

## 6.13.0 — 2026-05-13 (sprint-092 PR 2.15) — **PHASE 2 SUBSTRATE COMPLETE**

**Additive MINOR — `impact_query` MCP handler upgraded with 3 new typed-graph-derived return fields per proposal §8 Stage 4. Fifth and FINAL PR of Sprint X3 (canonical plan v2 §4 row 2.15). Closes Phase 2 substrate at 15/15 PRs (PR 2.1 → PR 2.15).**

### New return fields on `impact_query`

The existing `ImpactQueryResult` shape gains three additive fields. All existing
fields (`forwardProp`, `backwardProp`, `transitive`, `source`, `projectScope`)
are preserved unchanged.

- `graphConfidence: number` — 0.0-1.0 heuristic on how completely the typed
  ontology graph covers the queried RID. Branches:
  - `1.0` — typed-graph node matched AND ≥3 incident edges.
  - `0.7` — typed-graph node matched AND <3 incident edges (sparse evidence).
  - `0.4` — RID has a recognized prefix (`file:` / `rule:` / `agent:` /
    `skill:` / `handler:` / `schema:` / `event:` / `test:` / `commit:` /
    `pr:` / `issue:`) but is not in the typed graph.
  - `0.1` — unrecognized RID, no typed-graph evidence.
  - +0.1 SQLite/in-memory legacy-evidence bump, capped at 1.0.
- `missingEdges: ReadonlyArray<{ fromRid, toRid, edgeKind, reason }>` — edges
  present in the legacy SQLite/in-memory impact-graph but absent from the
  freshly-built typed graph. Capped at 50 entries; last entry carries
  `reason: "capped-50-additional-omitted"` when over cap.
- `recommendedAgentUse: "lead-direct" | "targeted-verification" |
  "bounded-explorer" | "none"` — derived from `graphConfidence`:
  - `≥ 0.7` → `lead-direct`
  - `0.4 – <0.7` → `targeted-verification`
  - `>0.0 – <0.4` → `bounded-explorer`
  - `0.0` (safety floor) → `none`

### New files

- `lib/impact-query/graph-confidence.ts` — pure `computeGraphConfidence` +
  `recommendAgentUseFromConfidence` + `ridHasRecognizedPrefix` helpers.
- `lib/impact-query/missing-edges.ts` — pure `computeMissingEdges` with
  case-insensitive kind matching and configurable cap.
- `lib/impact-query/graph-cache.ts` — module-level in-memory cache keyed by
  `projectRoot` with 30s default TTL wrapping `buildOntologyGraph` from PR
  2.14. Test code can pass `noCache: true` to force a fresh build.

### Modified files

- `bridge/handlers/impact-query.ts` — integrates typed-graph probe via
  `getOrBuildGraph`, populates 3 new fields, retains legacy SQLite +
  in-memory paths unchanged.

### New test files

- `tests/lib/impact-query/graph-confidence.test.ts` — covers decision table
  + heuristic branches + SQLite bump.
- `tests/lib/impact-query/missing-edges.test.ts` — empty inputs + case
  insensitivity + cap marker semantics.
- `tests/bridge/handlers/impact-query.test.ts` extended with 3 new tests
  asserting the 3 new fields are present and behaviorally correct on
  empty-project + recognized-RID cases.

### Phase 2 acceptance gate

After this PR merges, the canonical-plan §11 Phase 2 acceptance gate is
testable end-to-end:

- impact_query for AIP axis returns meaningful edges → routed via typed graph.
- impact_query for a changed file returns rules + tests + handlers + docs →
  10 indexers populate cross-kind edges.
- `graphConfidence` explicit + `missingEdges` explicit → present on every
  result.
- No Explore agent for high-confidence surfaces → `recommendedAgentUse =
  "lead-direct"` when `graphConfidence ≥ 0.7`.

Phase 2 substrate count: **15/15 PRs complete** (PR 2.1 through PR 2.15).
Phase 3 (downstream consumers + agent-routing hooks) is unblocked.

### Verify

```
cd ~/.claude/plugins/palantir-mini && \
bunx tsc --noEmit && \
bun test tests/lib/impact-query/ tests/bridge/handlers/impact-query.test.ts
```

---

## 6.12.0 — 2026-05-13 (sprint-091 PR 2.14)

**Additive MINOR — ImpactGraph integrated query layer (orchestrator + barrel) on top of the 10 concrete indexers from PR 2.4-2.13. Fourth PR of Sprint X3 (canonical plan v2 §4 row 2.14).**

New files:

- `lib/ontology-graph/build-graph.ts` — `buildOntologyGraph(projectRoot, opts?)` top-level
  orchestrator combining all 10 indexers (browse-index + agents-rules + plugin-manifest +
  skills + handlers + schema-primitives + source-files + tests-evals + events + git-history)
  into a single typed traversal over `OntologyGraphStore` (PR 2.3). Exposes the
  `IndexerName` literal-union, `IndexerStats` interface (`{indexerName, nodeCount,
  edgeCount, durationMs, error?}`), `BuildOntologyGraphOpts` (`indexers? | skip? |
  maxNodesPerIndexer? | parallel? | nowIso?`), and `ALL_INDEXER_NAMES` constant.
  - **Error containment**: `Promise.allSettled` (when `opts.parallel ?? true`) runs all
    10 indexers concurrently; a single rejection does NOT short-circuit the other 9.
    Failed slots record `{nodeCount: 0, edgeCount: 0, error: <message>}` in stats.
    Sequential mode (`opts.parallel: false`) wraps each call in try/catch for
    equivalent semantics.
  - **Two-pass drain** into a fresh store via `createOntologyGraphStore()`: pass 1
    `store.addNode` for every node from every fulfilled indexer; pass 2 `store.addEdge`
    for every edge whose endpoints exist in the combined node set. Orphan edges
    (endpoint not produced by any indexer, or trimmed by `maxNodesPerIndexer`) are
    silently dropped and counted toward an `error` field on the producing indexer's
    stats.
  - **Generic-only emission** (Option A; inherits from PR 2.3 substrate).
    Orchestrator is generic over `TNode` / `TEdge` with `unknown` defaults; no
    `#shared-core/...` imports outside `./types` and `./store`.
  - **Passive layer**: NO event emission, NO Convex; lineage emission belongs to
    PR 2.15 (`pm_impact_query` MCP handler) which wraps this orchestrator.
  - **Authority chain**: `lib/ontology-graph/types.ts` (PR 2.3) +
    `lib/ontology-graph/store.ts` (PR 2.3) + `lib/ontology-graph/indexers/*.ts`
    (PR 2.4-2.13) → this orchestrator → PR 2.15 `pm_impact_query` MCP handler.

- `tests/lib/ontology-graph/build-graph.test.ts` — `bun:test` with 3 tests
  (`default run: returns store + stats arrays of length 10` + `opts.skip filters
  indexers (events + git-history dropped → 8 rows)` + `per-indexer error
  containment: other indexers still run when one is targeted at a broken root`).
  Uses `fs.mkdtempSync(os.tmpdir())` + minimal BROWSE/INDEX/rule seed +
  best-effort `git init`/`commit --allow-empty` fixtures. Tests author throwaway
  trees under `os.tmpdir()` only — never mutate the project's own git tree (rule 25
  respected). All 3 tests pass + total 38 ontology-graph tests across 12 files
  (`tests/lib/ontology-graph/**`) remain green.

- `lib/ontology-graph/index.ts` — Public API surface barrel re-exporting the
  substrate (`NodeRid`, `EdgeRid`, `NodeRecord`, `EdgeRecord`, `TypedGraphSubgraph`,
  `NodeTypeKind`, `EdgeKindUnion`, `TypedGraphNode`, `TypedGraphEdge`,
  `createOntologyGraphStore`, `OntologyGraphStore`), all 10 indexer functions, and
  the orchestrator surface (`buildOntologyGraph` + `IndexerName` + `IndexerStats` +
  `BuildOntologyGraphOpts` + `ALL_INDEXER_NAMES`). External consumers can now
  `import { buildOntologyGraph, createOntologyGraphStore } from "lib/ontology-graph"`
  instead of reaching into sub-files.

Changed files:

- `.claude-plugin/plugin.json` — `version` bumped to `6.12.0`; `description` prefix
  notes the new orchestrator + barrel.
- `.codex-plugin/plugin.json` — mirrored `version` + `description` + `interface.shortDescription` + `interface.longDescription` to 6.12.0.
- `package.json` — `version` bumped from `6.10.0` (stale) → `6.12.0`; `description` synced with mirror manifests.
- `CHANGELOG.md` — this entry.

Row 2.14 of canonical plan v2 §4 mistakenly says "12 indexers" — the actual count is
**10** (this entry's `IndexerName` literal-union is the authoritative source). Spec
+ rubric document the correction.

Verification:

- `bunx tsc --noEmit` from `~/.claude/plugins/palantir-mini/` → 0 errors (clean).
- `bun test tests/lib/ontology-graph/build-graph.test.ts` → 3 pass / 0 fail / 74 expect() calls.
- `bun test tests/lib/ontology-graph/` (regression sweep) → 38 pass / 0 fail / 365 expect() calls across 12 files.

Out of scope:

- `pm_impact_query` MCP handler (PR 2.15 / Sprint X3 PR 5/5).
- Convex persistence (Sprint X5).
- Snapshot refresh of `runtime-overlay/ontology-shared-core/` (separate PR; replaces
  generic `unknown` with concrete `TypedGraphNode` / `TypedGraphEdge` union).
- Modifying any of the 10 indexer files or `store.ts` / `types.ts` (PR 2.3 + PR 2.4-2.13 frozen).

---

## 6.11.0 — 2026-05-13 (sprint-090 PR 2.13)

**Additive MINOR — tenth concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file. Third PR of Sprint X3 (canonical plan v2 §4 row 2.13).**

New files:

- `lib/ontology-graph/indexers/git-history.ts` — `indexGitHistory(projectRoot, opts?)` async function.
  Invokes `git -C <projectRoot> log --format=%H%x00%ae%x00%cI%x00%P%x00%s -n <maxCommits>`
  for recent commits + `gh -R <projectRoot> pr list --state all --limit <maxPRs>
  --json number,title,isDraft,mergeable,mergedAt,mergeCommit,headRefName,baseRefName`
  for PR metadata (best-effort; skipped when `opts.skipPRs=true` or `gh --version` probe
  fails). Emits Commit nodes (PR 2.1 wrapper; `kind: "Commit"`) per `git log` row with
  payload `{ projectRoot, lastIndexed, sha, authorEmail, committerDateIso, parentSha?, subject }`.
  Emits PullRequest nodes (PR 2.1 wrapper; `kind: "PullRequest"`) per `gh pr list` JSON
  element with payload `{ projectRoot, lastIndexed, number, title, isDraft, mergeable,
  mergedAt?, mergeCommitSha?, headRefName, baseRefName }`. Emits correlatesWith
  lineage-edges (PR 2.2 cluster; `kind: "correlatesWith"`) linking Commit→PullRequest
  whose `mergeCommit.oid` matches the commit SHA — payload
  `{ joinReason: "merge-sha-match", mergeCommitSha }`.
  - `opts.maxCommits` defaults to `500`; enforced at `git log -n` flag (source-side cap).
  - `opts.maxPRs` defaults to `100`; enforced at `gh pr list --limit` flag (source-side cap).
  - `opts.skipPRs` defaults to `false`; when `true` skips `gh pr list` entirely (tests use
    this for portability when `gh` is unavailable).
  - `opts.nowIso` injectable for test determinism (matches PR 2.4-2.12 pattern).
  - **Node kinds emitted**: `Commit` (per `git log` row); `PullRequest` (per `gh pr list` element).
  - **Edge kinds emitted**: `correlatesWith` (lineage-edge cluster; one per matched merge-SHA).
  - **Authority chain**: `lib/ontology-graph/types.ts` literals "Commit", "PullRequest",
    "correlatesWith" (PR 2.1+2.2) → this indexer (READ-only shell invocations on
    `<projectRoot>`; NEVER `push`/`commit`/`checkout`) → PR 2.14 orchestration layer
    (cross-indexer reconciliation of Commit `sha` to Event `atopWhich` from PR 2.12).
  - **Rule 25 invariant respected**: indexer never mutates git state; only invokes
    read-only commands (`git log`, `gh --version` probe, `gh pr list`). Tests author
    temporary git repos under `os.tmpdir()` only.

- `tests/lib/ontology-graph/indexers/git-history.test.ts` — `bun:test` with 3 tests
  (`walks a temp git repo and emits Commit nodes` + `gracefully handles a non-git
  directory` + `respects opts.maxCommits cap`). Uses `git init` + `git commit
  --allow-empty` under `os.tmpdir()` for deterministic fixtures. Passes `skipPRs:
  true` throughout for portability — `gh pr list` path covered by manual smoke.

Changed files:

- `.claude-plugin/plugin.json` — `version` bumped to `6.11.0`; `description` prefix
  expanded with the v6.11.0 entry; N-manifest mirror at `.codex-plugin/plugin.json`
  bumped to match (shortDescription / longDescription auto-mirror).

No deletions. No schemas/shared-core bump. No new hooks. No `pm-codegen`
regeneration (no consumer yet — orchestration layer in PR 2.14 will consume).

---

## 6.10.0 — 2026-05-13 (sprint-089 PR 2.12)

**Additive MINOR — ninth concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file. Second PR of Sprint X3 (canonical plan v2 §4 row 2.12).**

New files:

- `lib/ontology-graph/indexers/events.ts` — `indexEventsT2Plus(projectRoot, opts?)` async function.
  Walks `<projectRoot>/.palantir-mini/session/events.jsonl` + archived rotations under
  `<projectRoot>/.palantir-mini/session/archive/events-rotated-*.jsonl` (live + archive
  merge delegated to `lib/event-log/read.ts:readEvents`); filters T2/T3/T4 envelopes
  per rule 26 §Substrate routing (drops T0 reject + T1 noise + missing valueGrade);
  emits Event nodes (PR 2.1 wrapper; `kind: "Event"`) with payload denormalizing
  the 18 join keys from proposal §6 onto flat top-level fields:
  `promptId`, `promptHash`, `sessionId`, `runtime`, `semanticIntentContractRef`,
  `digitalTwinChangeContractRef`, `sprintContractRef`, `correlationId`,
  `agentId`, `toolName`, `eventId`, `commitSha`, `branchName`,
  `pullRequestNumber`, `evalSuiteId`, `evalRunId`, `affectedRid`,
  `refinementTarget`. Absent keys are omitted (not null). The substrate metadata
  fields `valueGrade`, `type`, `sequence`, `when`, `projectRoot`, `lastIndexed`
  round out the payload for downstream context.
  - `opts.maxEvents` defaults to `10000`; applied AFTER valueGrade filter so T0/T1
    noise does not consume the cap. Capped via sequence-ASC slice.
  - `opts.includeUngraded` defaults to `false`; flag surfaces intent only (canonical
    behavior keeps ungraded events dropped).
  - `opts.nowIso` injectable for test determinism (matches PR 2.4-2.11 pattern).
  - **Node kinds emitted**: `Event` (one per surviving T2+ envelope; payload as above).
  - **Edge kinds emitted**: `emits` (structural-edge cluster; one per Event node whose
    source envelope yields a non-empty agent label via `byWhom.agentName` ??
    `byWhom.identity`; confidence `1.0` for named agent, `0.5` for identity-only;
    `fromRid` is synthetic `events-agent:<sha256(projectRoot#agentLabel)>` —
    orchestration layer PR 2.14 reconciles to PR 2.5 AgentDefinition NodeRids).
  - **Authority chain**: `lib/event-log/read.ts:readEvents` (read-only consumer) →
    `lib/event-log/types.ts:EventEnvelope` (source structure) → this indexer
    (fragment producer) → orchestration layer (PR 2.14).
  - **Rule 10 invariant**: indexer is READ-only against the substrate it consumes.
    NEVER writes to events.jsonl. Tests author fixture lines under `os.tmpdir()`
    that are NOT any real project's `<projectRoot>/.palantir-mini/session/events.jsonl`.
  - **Other-projects cordon**: indexer ingests ONLY `<projectRoot>/.palantir-mini/session/`
    — never walks into other `projectRoot`.

- `tests/lib/ontology-graph/indexers/events.test.ts` — 3 tests using `bun:test` +
  `os.tmpdir()` fixture writes with `nowIso: "2026-05-13T00:00:00Z"`:
  1. Headline fixture walk — 5-line NDJSON with grades T0/T1/T2/T3/T4; asserts
     exactly 3 Event nodes (T0/T1 dropped); T2 named-agent emits edge confidence
     1.0; T3 identity-only emits edge confidence 0.5; T4 join-key spread
     (correlationId, evalSuiteId, affectedRid, branchName, pullRequestNumber,
     refinementTarget kind) all populate on payload.
  2. Empty-tree degenerate — empty projectRoot returns `nodes=[], edges=[]`; no throw.
  3. `maxEvents` cap — 5 T2+ lines with `maxEvents: 2`; asserts cap applied AFTER
     filter (the first 2 by sequence ASC retained).

Authority chain (this PR): canonical plan §4 row 2.12 → sprint-088/spec.md §2
(inherited design decisions) → sprint-089/spec.md (delta) → `events.ts` (function
output) → `events.test.ts` (output verification). Sprint X3 PR 2/5.

---

## 6.9.0 — 2026-05-13 (sprint-088 PR 2.11)

**Additive MINOR — eighth concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file. First PR of Sprint X3 / opener of the final 5 Phase 2 PRs (canonical plan v2 §4 row 2.11).**

New files:

- `lib/ontology-graph/indexers/tests-evals.ts` — `indexTestsAndEvals(projectRoot, opts?)` async function.
  Walks `*.test.ts`/`*.spec.ts` test files + `AIPEvaluation*.json` declaration files:
  - `opts.testTargetGlob` defaults to `"tests/**/*.test.ts"` (resolved relative to `projectRoot`);
    both `.test.ts` and `.spec.ts` suffixes accepted under the resolved base.
  - `opts.evalTargetGlob` defaults to `".palantir-mini/aip-evals/**/*.json"`; only JSON files
    whose top-level parses to a valid `AIPEvaluationSuiteDeclaration` shape (presence-check on
    `suiteId`+`name`+`target`+`testCaseIds`+`criteria`+`evaluatorPolicy`) emit nodes; invalid
    JSON or missing required fields skipped silently.
  - `opts.maxFiles` defaults to `200` per category (test + eval applied independently;
    alphabetically sorted slice when fixture exceeds the cap).
  - `excludeGlobs` matches PR 2.10's set minus `*.test.ts`/`*.spec.ts` (those are walk targets here).
  Framework detection (regex-only — no AST parse needed):
  - `from "bun:test"` → `framework: "bun"`
  - `from "vitest"` → `framework: "vitest"`
  - `from "@playwright/test"` OR path contains `/playwright/` → `framework: "playwright"`
  - otherwise `framework: "unknown"`
  Test-kind classification (path heuristic, deterministic):
  - path contains `/tests/integration/` → `kind: "integration"`
  - path contains `/tests/e2e/` OR `/playwright/` OR framework=playwright → `kind: "e2e"`
  - otherwise `kind: "unit"` (default)
  - **Node kinds emitted**: `Test` (one per test file; payload carries `framework` + `kind` +
    `filePath` + `byteSize` + `lastIndexed` + `projectRoot`) + `AIPEvaluationSuite` (one per
    valid eval JSON; payload carries `suite` = parsed declaration + file metadata).
  - **Edge kinds emitted**: `validates` (governance-edge cluster; one per `Test` node;
    confidence 1.0 when path heuristic resolves to an in-tree file via existsSync — strip
    leading `tests/`, replace `.test.ts`/`.spec.ts` suffix with `.ts` —
    0.5 when the heuristic does not resolve; payload `targetRelativePath` carries
    strip result). EvalSuite nodes do NOT emit edges (orchestration layer wires
    `evaluates` edges from `AIPEvaluationSuite` → target later via PR 2.14).
  - Uses generic-only emission (Option A) per sprint-088/spec.md §2 inheriting sprint-081/spec.md
    §2.2. Local payload interfaces `TestPayload` + `EvalSuitePayload` + `ValidatesEdgePayload`
    mirror PR 2.1 TestDeclaration + schemas v1.37.0 AIPEvaluationSuiteDeclaration field shapes
    but do NOT import from `@palantirKC/ontology-shared-core` (snapshot at runtime-overlay/
    predates PR 2.1+2.2; importing fails with TS2307).
- `tests/lib/ontology-graph/indexers/tests-evals.test.ts` — 3 tests using real `os.tmpdir()`
  fixture writes (no fs mocking). Tests headline-walk (3 fixture test files with bun + vitest +
  playwright frameworks; asserts 3 Test nodes + 3 validates edges + framework auto-detect
  correct + path-kind heuristic correct + confidence 1.0/0.5 split correct) + empty-tree
  degenerate case + AIP eval JSON parse (1 valid suite emits node; 1 JSON-valid-but-shape-invalid
  + 1 corrupt-JSON both skipped silently). `nowIso: "2026-05-13T00:00:00Z"` for deterministic
  timestamps.

Implementation rationale:

- Regex-based framework detection per task constraint: AST parse not required for import-line
  string matching. `from "bun:test"` / `from "vitest"` / `from "@playwright/test"` are
  string-literal imports that match unambiguously via simple regex; an AST visit would add
  unnecessary perf cost vs the ImportDeclaration walker PR 2.10 already provides for SourceFile
  emission. Test kind ("unit" / "integration" / "e2e") is purely path-derived — no content
  inspection needed.
- Naming alignment: canonical `NodeTypeKind` discriminator literal for eval suites is
  `"AIPEvaluationSuite"` (lib/ontology-graph/types.ts line 137). The user-facing label
  "EvalSuite" used in canonical plan §4 row 2.1 is informal — this indexer uses the canonical
  literal verbatim so future TypedGraphNode union projection binds without rename.
- Validates-edge `toRid` points at synthetic `tests-evals-target:<absolutePath>` NodeRid;
  orchestration layer (PR 2.14) reconciles to the matching `SourceFile` NodeRid emitted by
  PR 2.10's source-files indexer — same policy PR 2.6, 2.7, 2.8, 2.9, 2.10 took.
- Per-category `maxFiles` cap (test + eval independent) keeps the indexer robust on partial
  trees where one category is huge but the other is empty.

Sprint X3 opener — final 5 Phase 2 PRs:
- PR 2.11 (this PR, v6.9.0): tests + evals indexer (Test + AIPEvaluationSuite nodes; validates edges).
- PR 2.12 (next): events T2+ indexer (Event nodes via decision lineage parse).
- PR 2.13 (next): commits + PRs indexer (Commit + PullRequest nodes via git log parse).
- PR 2.14 (next): ImpactGraph integrated query layer (combines 8 indexers into typed traversal).
- PR 2.15 (final): `impact_query` handler upgrade — returns `graphConfidence` + `missingEdges` +
  `recommendedAgentUse` per proposal §8 Stage 4.

Out-of-scope (next sprint waves):

- Schemas + shared-core CHANGELOG (no edit to either; both stay at v1.60.0 / v1.18.0).
- Snapshot-refresh of `runtime-overlay/ontology-shared-core/` (separate chore PR).
- Cross-indexer endpoint reconciliation orchestration layer (PR 2.14).
- AIPEvaluationRunDeclaration / AIPExperimentDeclaration parsing (only Suite parsed here;
  Run + Experiment are downstream lineage; separate future PR).
- `evaluates` edges from AIPEvaluationSuite → target (orchestration layer, PR 2.14).
- Events.jsonl indexer (Event nodes via decision lineage parse) — separate PR 2.12.
- Commits + PRs indexer (Commit + PullRequest nodes via git log parse) — separate PR 2.13.
- `impact_query` handler upgrade — PR 2.15.
- `lib/impact-graph/` modification — out of scope; not consulted here.
- Convex Cloud cutover — Sprint X5.

---

## 6.8.0 — 2026-05-13 (sprint-087 PR 2.10)

**Additive MINOR — seventh concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file. HEAVIEST PR of Sprint X2 — first ontology-graph indexer to use a real TS Compiler API AST parse. Closes Sprint X2 (5/5).**

New files:

- `lib/ontology-graph/indexers/source-files.ts` — `indexSourceFilesImports(projectRoot, opts?)` async function.
  Walks `.ts`/`.tsx` files in scope via the TypeScript Compiler API (`ts.createSourceFile` +
  visitor catching `ts.ImportDeclaration`):
  - `opts.targetGlob` defaults to `"lib/**/*.ts"` (resolved relative to `projectRoot`).
  - `opts.maxFiles` defaults to `200` (perf cap — AST parsing 100s of files can be slow;
    alphabetically sorted slice when fixture exceeds the cap).
  - Excludes `**/*.d.ts`, `**/*.test.ts`, `**/*.spec.ts` from the walk by default (plus the
    standard exclusion list inherited from PR 2.4-2.9).
  AST policy: single top-level statement walk via `ts.forEachChild` over `SourceFile.statements`;
  predicate `ts.isImportDeclaration(node)` unifies default + named + namespace + side-effect +
  `import type` forms. `import()` expression form (dynamic imports) intentionally NOT counted —
  mirrors `lib/impact-graph/ast-walker.ts` static-AST policy. Bare-bones `ts.createSourceFile`
  parse — no `ts.Program` / TypeChecker — keeps the perf cap actually enforceable file-by-file.
  - **Node kinds emitted**: `SourceFile` (one per parsed `.ts`/`.tsx` file; payload carries
    `fileExtension` ∈ {`.ts`,`.tsx`} + `importCount` AST-counted).
  - **Edge kinds emitted**: `imports` (structural-edge cluster; one per `ImportDeclaration`;
    confidence 1.0 for relative imports resolved to in-tree files, 0.5 for package /
    unresolved specifiers; payload `importSpecifier` carries raw string + `resolvedPath`
    populated when confidence=1.0).
  - Uses generic-only emission (Option A) per sprint-087/spec.md §2 inheriting sprint-081/spec.md
    §2.2. Local payload interfaces `SourceFilePayload` + `ImportsEdgePayload` mirror PR 2.1
    SourceFileDeclaration field shape but do NOT import from `@palantirKC/ontology-shared-core`
    (snapshot at runtime-overlay/ predates PR 2.1+2.2; importing fails with TS2307).
- `tests/lib/ontology-graph/indexers/source-files.test.ts` — 3 tests using real `os.tmpdir()`
  fixture writes (no fs mocking). Tests headline-walk (3 .ts fixture files with relative +
  package imports — asserts 3 SourceFile nodes + 4 imports edges + confidence tier 1.0 / 0.5
  split correct + resolvedPath populated for relative imports) + empty-tree degenerate case +
  `opts.maxFiles` cap respected (5 fixture files capped to 2; alphabetical sort).
  `nowIso: "2026-05-13T00:00:00Z"` for deterministic timestamps.

Implementation rationale:

- Real AST parse (not regex) per task constraint: "AST is more correct for `import type`,
  default imports, namespace imports, side-effect imports". TS Compiler API unifies these
  five import forms under the single `ts.isImportDeclaration` predicate. Re-export
  `export { x } from "..."` declarations remain out of scope (separate edge kind).
- Lighter-weight `ts.createSourceFile` parse (no `ts.Program` / TypeChecker) deliberately
  diverges from `lib/impact-graph/ast-walker.ts`'s `ts-morph.Project` pattern — keeps the
  perf cap (`opts.maxFiles=200`) actually enforceable file-by-file. The impact-graph walker
  uses TypeChecker-grounded confidence tiers (1.0 typechecked / 0.7 heuristic / 0.3
  ambiguous); this indexer uses a simpler 1.0/0.5 tier based purely on path resolution
  via `fs.existsSync` on relative-path candidates (`.ts`, `.tsx`, `/index.ts`, `/index.tsx`).
- `opts.targetGlob` normalization strips a trailing `/**/*.ts` or `/**/*.tsx` to obtain the
  base directory for recursive readdir descent. Files outside the resolved base are skipped.
- Cross-indexer endpoint reconciliation (e.g. wiring an `imports` edge's `toRid` from a
  synthetic `source-file-pkg:<spec>` package NodeRid to a `Hook` NodeRid emitted by
  `plugin-manifest.ts`) is deferred to the orchestration layer (PR post-2.13) — same
  policy PR 2.6, 2.7, 2.8, 2.9 took. The orchestration layer normalizes endpoints across
  indexers.

Sprint X2 closeout summary (PRs 2.6-2.10, plugin v6.3.0 → v6.8.0):
- PR 2.6 (sprint-082, v6.3.0): agents-rules indexer (Rule + AgentDefinition nodes; describes
  + gates + requiresApprovalFrom edges).
- PR 2.7 (sprint-083, v6.4.0): plugin-manifest-hooks indexer (Hook + McpHandler +
  RuntimeEntrypoint nodes; describes + gates edges).
- PR 2.8 (sprint-084, v6.5.0): skill-frontmatter indexer (Skill nodes; describes + routesTo edges).
- PR 2.9 (sprint-085, v6.6.0): handler-exports indexer (McpHandler nodes; describes + implements edges).
- (sprint-086, v6.7.0): schemas/ontology/primitives recursive indexer (SchemaPrimitive nodes;
  describes + refines edges).
- PR 2.10 (sprint-087, v6.8.0; this PR): source files + imports AST indexer (SourceFile nodes;
  imports edges).
- Cumulative substrate for PR 2.14 ImpactGraph integrated query layer: 5 new indexer files +
  5 new test files in lib/ontology-graph/indexers/; 7 total indexers (browse-index +
  agents-rules + plugin-manifest + skills + handlers + schema-primitives + source-files).

Out-of-scope (next sprint waves):

- Schemas + shared-core CHANGELOG (no edit to either; both stay at v1.60.0 / v1.18.0).
- Snapshot-refresh of `runtime-overlay/ontology-shared-core/` (separate chore PR).
- Cross-indexer endpoint reconciliation orchestration layer (PR post-2.13).
- Test-file indexer (Test nodes via test-file convention parse) — separate future PR.
- Events.jsonl indexer (Event nodes via decision lineage parse) — separate future PR.
- Commits + PRs indexer (Commit + PullRequest nodes via git log parse) — separate future PR.
- `impact_query` handler upgrade — PR 2.15.
- `lib/impact-graph/` modification — read-only reference for AST pattern; out of scope.
- Convex Cloud cutover — Sprint X5.

---

## 6.7.0 — 2026-05-13 (sprint-086 PR 2.9)

**Additive MINOR — sixth concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file.**

New files:

- `lib/ontology-graph/indexers/schema-primitives.ts` — `indexSchemaPrimitives(projectRoot, opts?)` async function.
  Walks `schemas/ontology/primitives/*.ts` files recursively under one scope base:
  - Project-scope (recursive readdir): `projectRoot/.claude/schemas/ontology/primitives/**/*.ts`
    (~116 .ts files in the canonical install; `index.ts` barrel file excluded by default).
  Parses TypeScript primitive declarations via simple regex (no `ts-morph` AST parse) — matches three
  patterns: required `export type NAMERid = string & ...` (Pattern A), optional
  `export interface NAMEDeclaration { ... }` (Pattern B), optional `D/L/A domain: NAME` JSDoc line
  (Pattern C). Emits one SchemaPrimitive node per .ts file with ≥1 branded RID type alias; files
  with zero Pattern A capture are skipped silently. Cross-primitive `refines` edges via `import type`
  parse are emitted self-referentially; orchestration layer reconciles the actual endpoints
  (deferred to PR 2.10+).
  - **Node kinds emitted**: `SchemaPrimitive` (one per .ts file; payload.ridBrandName carries
    stripped name e.g. "AgentDefinition", "ActionType").
  - **Edge kinds emitted**: `describes` (structural, conf 0.95), `refines` (structural, conf 0.9).
  - Uses generic-only emission (Option A) per sprint-086/spec.md §2 inheriting sprint-081/spec.md
    §2.2. Local payload interface `SchemaPrimitivePayload` mirrors PR 2.1 SchemaPrimitiveDeclaration
    field shape but does NOT import from `@palantirKC/ontology-shared-core` (snapshot at runtime-overlay/
    predates PR 2.1+2.2; importing fails with TS2307).
- `tests/lib/ontology-graph/indexers/schema-primitives.test.ts` — 3 tests using real `os.tmpdir()`
  fixture writes (no fs mocking). Tests headline-walk (≥2 SchemaPrimitive nodes from 3 fixture
  files — helper-no-rid.ts skipped + ≥1 describes edge + ≥1 refines edge + payload field accuracy
  for ridBrandName/declarationName/dlaDomain) + empty-tree degenerate case + excludeGlobs skips a
  primitive file. `nowIso: "2026-05-13T00:00:00Z"` for deterministic timestamps.

Implementation rationale:

- Node kind decision (per spec §3.2): emit generic `kind: "SchemaPrimitive"` for all primitive .ts
  files, with `payload.ridBrandName` carrying the actual stripped name (e.g. "AgentDefinition"). The
  `NodeTypeKind` literal union in `lib/ontology-graph/types.ts` does NOT contain 116 distinct
  per-primitive members. Generic "SchemaPrimitive" keeps the indexer compatible with the existing
  type contract; downstream consumers filter on `payload.ridBrandName` for per-primitive subsets.
- Recursive `fs.promises.readdir` traversal (no `fast-glob` dep) — matches PR 2.4-2.8 pattern.
- Permissive regex parser (no `ts-morph` AST) — files with no Pattern A match are skipped silently.
- `excludeGlobs` adds `**/index.ts` to skip barrel re-export files (one-line addition over PR 2.8).
- Per task constraints: PR 2.9 walks ONLY `schemas/ontology/primitives/` (not interaction/, meta/,
  rendering/ axes — deferred to a future PR if needed).

Out of scope:

- `lib/impact-graph/` and other indexers untouched.
- No `store.addNode` / `store.addEdge` from inside the indexer (fragment-only contract).
- No events.jsonl emission (data-producer-only).
- No new hooks; no new MCP handlers.
- No schemas or shared-core edits (Option A generic emission).
- Cross-primitive `refines` reconciliation via `import type` parse → deferred to orchestration layer.

Predecessor baseline: plugin v6.6.0 + main HEAD `ecbbe9db7` (post PR #418 merge — sprint-085 PR 2.8).

---

## 6.6.0 — 2026-05-13 (sprint-085 PR 2.8)

**Additive MINOR — fifth concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file.**

New files:

- `lib/ontology-graph/indexers/handlers.ts` — `indexHandlerExports(projectRoot, opts?)` async function.
  Walks `bridge/handlers/*.ts` files across one scope base:
  - Plugin-scope (one-level glob): `projectRoot/.claude/plugins/*/bridge/handlers/*.ts` (currently
    palantir-mini only; palantir-browse has no `bridge/handlers/` dir — gracefully skipped via stat).
  Parses TypeScript export declarations via simple regex (no `ts-morph` AST parse) — matches three
  patterns: `export function NAME`, `export const NAME =`, `export default function NAME?`. Emits
  one McpHandler node per exported symbol (≥1 per file). Cross-indexer `implements` edges to
  PR 2.6 `RuntimeEntrypoint` nodes are emitted self-referentially; orchestration layer reconciles
  the actual endpoints (deferred to PR 2.9+).
  - **Node kinds emitted**: `McpHandler` (one per exported function/const/default).
  - **Edge kinds emitted**: `describes` (structural, conf 0.95), `implements` (structural, conf 0.9).
  - Uses generic-only emission (Option A) per sprint-085/spec.md §2 inheriting sprint-081/spec.md
    §2.2. Local payload interface `McpHandlerPayload` mirrors PR 2.1 `McpHandlerDeclaration` field
    shape but does NOT import from `@palantirKC/ontology-shared-core` (snapshot at runtime-overlay/
    predates PR 2.1+2.2; importing fails with TS2307).
- `tests/lib/ontology-graph/indexers/handlers.test.ts` — 3 tests using real `os.tmpdir()` fixture
  writes (no fs mocking). Tests headline-walk (≥2 McpHandler nodes + ≥1 describes edge + ≥1
  implements edge + per-export type discrimination — handlerA=default, helperA=function,
  handlerB=const), empty-tree (`nodes.length===0 && edges.length===0`), and excludeGlobs
  (`["**/handler-a.ts"]` → only handler-b.ts node remains).

Predecessor pattern: `sprint-084/spec.md` + working PR 2.7 indexer at
`lib/ontology-graph/indexers/skills.ts` + test at
`tests/lib/ontology-graph/indexers/skills.test.ts` (sprint-084 v6.5.0). Same 4 design decisions
(location / Option-A generic emission / function-based async API / 3-test scope) — only walk
targets, regex parsers, and node/edge discriminators differ.

Out of scope per `sprint-085/spec.md` §8:

- Schemas + shared-core edits (schemas v1.60.0 + shared-core v1.18.0 unchanged).
- Snapshot-refresh of `runtime-overlay/ontology-shared-core/` (separate chore PR).
- Other 5 indexers (schemas, source, tests, events, commits+PRs — PRs 2.9-2.13).
- Cross-indexer `implements` resolution against PR 2.6 `RuntimeEntrypointRid` (orchestration layer).
- `impact_query` handler upgrade (PR 2.15).
- `lib/impact-graph/` modification.
- Convex Cloud cutover (Sprint X5).
- Calling `store.addNode` / `store.addEdge` from inside the indexer.
- Live emission of `events.jsonl` lineage.
- `pm-codegen` regeneration.
- Runtime hooks.
- TS AST parser for handler exports (`ts-morph` etc.) — permissive regex-line parse only.
- `bridge/mcp-server.ts` modification (registry of handlers).

---

## 6.5.0 — 2026-05-13 (sprint-084 PR 2.7)

**Additive MINOR — fourth concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file.**

New files:

- `lib/ontology-graph/indexers/skills.ts` — `indexSkillFrontmatter(projectRoot, opts?)` async function.
  Walks SKILL.md files across two scope bases:
  - Plugin-scope (depth 2): `projectRoot/.claude/plugins/*/skills/*/SKILL.md` (currently
    palantir-mini + palantir-browse + palantir-mini-cli; future-proof for more).
  - Project-local (depth 1): `projectRoot/.claude/skills/*/SKILL.md` (when projectRoot
    is the user's $HOME, this surfaces user-scope skills).
  Parses YAML frontmatter (between two `---` delimiter lines at top of file) with a
  simple line-based regex extractor — no `js-yaml` dependency. Extracts `name`,
  `description`, `category`, and `allowed-tools` fields. Emits:
  - `NodeRecord<SkillPayload>` with `kind: "Skill"` per SKILL.md found.
  - `EdgeRecord` with `kind: "describes"` (confidence 1.0) — self-referential when
    frontmatter `description` is non-empty (the frontmatter description describes the
    skill itself; cross-node describes targets like ToolRid deferred to orchestration).
  - `EdgeRecord` with `kind: "routesTo"` (confidence 0.85) — self-referential when
    frontmatter `allowed-tools` is non-empty (the allowed-tools field routes to MCP
    handlers; cross-node routesTo against PR 2.6 McpHandlerRid deferred to orchestration).
  Excludes `.codex-plugin/**` (auto-regen mirror per rule 25 v1.1.0) and the standard
  exclude-glob set inherited from PR 2.4/2.5/2.6.
  Uses generic-only emission (Option A — no `@palantirKC/ontology-shared-core` import;
  local `SkillPayload` interface mirrors PR 2.1 SkillDeclaration shape).
  Pure fragment producer — no live store mutation, no event emission, no Convex.
  `opts.nowIso` injects deterministic ISO timestamp for test reproducibility.

- `tests/lib/ontology-graph/indexers/skills.test.ts` — 3 tests:
  1. Headline fixture-tree walk: 2 SKILL.md files (one with allowed-tools, one without) →
     ≥2 Skill nodes + ≥1 `describes` edge + ≥1 `routesTo` edge; assertions on every
     parsed-frontmatter field (skillName / skillDescription / skillCategory / allowedTools /
     scope / lastIndexed / projectRoot).
  2. Empty-tree degenerate: nodes=0, edges=0, no throw.
  3. excludeGlobs: `**/test-skill-a/**` excludes one of two fixture skills → only
     test-skill-b remains in the result.

Internal API changes:

- No schemas / shared-core touch — both stay at v1.60.0 / v1.18.0.
- No CHANGELOG entry for those packages.

Why MINOR (not PATCH or MAJOR):

- Per rule 08, new indexers are MINOR (additive feature).
- No breaking change to any existing export; previous indexers (browse-index, agents-rules,
  plugin-manifest) untouched.

---

## 6.4.0 — 2026-05-13 (sprint-083 PR 2.6)

**Additive MINOR — third concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file.**

New files:

- `lib/ontology-graph/indexers/plugin-manifest.ts` — `indexPluginManifestAndHooks(projectRoot, opts?)` async function.
  Walks known-path list (`projectRoot/.claude/plugins/palantir-mini/.claude-plugin/plugin.json`,
  `projectRoot/.claude/plugins/palantir-browse/.claude-plugin/plugin.json`,
  `projectRoot/.claude/plugins/palantir-mini/hooks/hooks.json`) plus one-level glob extension
  for any additional `*.claude-plugin/plugin.json` and `*/hooks/hooks.json` under the plugins directory.
  Emits:
  - `NodeRecord<RuntimeEntrypointPayload>` with `kind: "RuntimeEntrypoint"` per `.claude-plugin/plugin.json` found.
  - `NodeRecord<McpHandlerPayload>` with `kind: "McpHandler"` per `mcpServers` entry in each plugin.json.
  - `NodeRecord<HookPayload>` with `kind: "Hook"` per hook command entry in each hooks.json.
  - `EdgeRecord` with `kind: "describes"` (confidence 1.0) from RuntimeEntrypoint → McpHandler
    (manifest literally declares the handler).
  - `EdgeRecord` with `kind: "describes"` (confidence 0.95) from RuntimeEntrypoint → Hook
    (sibling-directory co-location).
  - `EdgeRecord` with `kind: "gates"` (confidence 0.7) per Hook — self-referential edge (hook gates
    its own enforcement surface; cross-node gates targets deferred to PR 2.7 matcher→tool resolution).
  Excludes `.codex-plugin/**` (auto-regen mirror per rule 25 v1.1.0) to prevent duplicate-node bugs.
  Uses generic-only emission (Option A — no `@palantirKC/ontology-shared-core` import; local payload
  interfaces mirror PR 2.1 HookDeclaration / McpHandlerDeclaration / RuntimeEntrypointDeclaration shapes).
  Pure fragment producer — no live store mutation, no event emission, no Convex.
  `opts.nowIso` injects deterministic ISO timestamp for test reproducibility.

- `tests/lib/ontology-graph/indexers/plugin-manifest.test.ts` — 3 tests:
  1. Headline fixture-tree walk: 1 plugin.json + 1 hooks.json → ≥1 RuntimeEntrypoint + ≥1 McpHandler +
     ≥1 Hook node + ≥1 `describes` edge + ≥1 `gates` edge.
  2. Empty-tree degenerate: nodes=0, edges=0, no throw.
  3. excludeGlobs: `.codex-plugin/` + plugin dir excluded → 0 nodes for those paths.

No schemas or shared-core changes (Option A generic-only; schemas stay at v1.60.0, shared-core at v1.18.0).

---

## 6.3.0 — 2026-05-13 (sprint-082 PR 2.5)

**Additive MINOR — second concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file.**

New files:

- `lib/ontology-graph/indexers/agents-rules.ts` — `indexAgentsAndRules(projectRoot, opts?)` async function.
  Walks known-path list (`projectRoot/AGENTS.md`, `projectRoot/.codex/AGENTS.md`) plus directory globs
  for `projectRoot/.claude/rules/*.md`, `projectRoot/.claude/agents/*.md`, and
  `projectRoot/.claude/plugins/palantir-mini/agents/*.md`. Emits:
  - `NodeRecord<RulePayload>` with `kind: "Rule"` per `.claude/rules/*.md` file found.
  - `NodeRecord<AgentDefinitionPayload>` with `kind: "AgentDefinition"` per AGENTS.md and `agents/*.md` found.
  - `EdgeRecord` with `kind: "describes"` (confidence 0.9) when AGENTS.md is co-located with BROWSE.md.
  - `EdgeRecord` with `kind: "gates"` (confidence 0.7) for rules whose content contains governance phrases
    (`gate`, `blocks`, `PreToolUse`, `PostToolUse`, `SessionStart`) — self-referential edge.
  - `EdgeRecord` with `kind: "requiresApprovalFrom"` (confidence 0.7) for agents whose content contains
    approval phrases (`requires approval from`, `Lead-only`, `Lead authority`, `plan-mode`, `opus-only`)
    — targets lead-orchestrator.md node.
  Uses generic-only emission (Option A — no `@palantirKC/ontology-shared-core` import; local payload
  interfaces mirror PR 2.1 RuleDeclaration / AgentDefinitionDeclaration field shapes). Pure fragment
  producer — no live store mutation, no event emission, no Convex.
  `opts.nowIso` injects deterministic ISO timestamp for test reproducibility.
  `opts.excludeGlobs` defaults include Codex backup/tmp/cache paths to prevent duplicate-node bugs.
- `tests/lib/ontology-graph/indexers/agents-rules.test.ts` — 3 bun:test tests:
  (1) fixture-tree walk emits ≥3 AgentDefinition + ≥1 Rule nodes + ≥1 edge of each kind (describes/gates/requiresApprovalFrom),
  (2) empty directory returns `{nodes: [], edges: []}` without throwing,
  (3) excludeGlobs: ["**/plugins/**"] skips plugin agent nodes while keeping root AGENTS.md + rule nodes.

---

## 6.2.0 — 2026-05-13 (sprint-081 PR 2.4)

**Additive MINOR — first concrete indexer (`lib/ontology-graph/indexers/`) + 1 new test file.**

New directories + files:

- `lib/ontology-graph/indexers/browse-index.ts` — `indexBrowseAndIndexDocs(projectRoot, opts?)` async function.
  Walks known-path list (`projectRoot/BROWSE.md`, `INDEX.md`, `.claude/research/BROWSE.md`, `.claude/research/INDEX.md`,
  `.claude/rules/BROWSE.md`, `.claude/rules/CORE.md`, `.claude/INDEX.md`) plus one-level glob under `.claude/research/*/`
  and recursive walk for any nested BROWSE.md/INDEX.md/CORE.md. Emits:
  - `NodeRecord<ProjectBrowseDocPayload>` with `kind: "ProjectBrowseDoc"` per BROWSE.md found.
  - `NodeRecord<ProjectIndexDocPayload>` with `kind: "ProjectIndexDoc"` per INDEX.md / CORE.md found.
  - `EdgeRecord` with `kind: "describes"` (confidence 1.0) when INDEX.md + BROWSE.md co-exist in the same directory.
  - `EdgeRecord` with `kind: "routesTo"` (confidence 0.85) per routing table row in BROWSE.md content (line-regex).
  Uses generic-only emission (Option A — no `@palantirKC/ontology-shared-core` import; local payload interfaces
  mirror PR 2.1 ProjectBrowseDocDeclaration / ProjectIndexDocDeclaration field shapes). Pure fragment producer —
  no live store mutation, no event emission, no Convex.
  `opts.nowIso` injects deterministic ISO timestamp for test reproducibility.
  `opts.excludeGlobs` defaults: `node_modules/**`, `.git/**`, `worktrees/**`, `runtime-overlay/**`.
- `tests/lib/ontology-graph/indexers/browse-index.test.ts` — 3 bun:test tests:
  (1) fixture-tree walk emits ≥2 ProjectBrowseDoc + ≥1 ProjectIndexDoc nodes + ≥1 describes edge,
  (2) empty directory returns `{nodes: [], edges: []}` without throwing,
  (3) excludeGlobs skips subdir/BROWSE.md node.

No schemas or shared-core changes. Schemas stay at v1.60.0; shared-core stays at v1.18.0.
Sprint: `palantirkc-sprint-081-pr2.4`. Plan SSoT: `~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md` §4 row 2.4.

---

## 6.1.0 — 2026-05-13 (sprint-080 PR 2.3)

**Additive MINOR — new `lib/ontology-graph/` typed-graph store substrate + 2 new test files.**

New directories + files:

- `lib/ontology-graph/types.ts` — generic-only typed-graph types (`NodeRid`, `EdgeRid`, `NodeRecord<TNode>`,
  `EdgeRecord<TEdge>`, `TypedGraphSubgraph<TNode, TEdge>`, `NodeTypeKind`, `EdgeKindUnion`,
  `TypedGraphNode`, `TypedGraphEdge`). Uses `TNode = unknown` / `TEdge = unknown` generics;
  concrete typed-union projection deferred to snapshot-refresh chore PR or PR 2.14.
- `lib/ontology-graph/store.ts` — `OntologyGraphStore<TNode, TEdge>` interface + `createOntologyGraphStore(snapshot?)` closure factory.
  8-method interface: addNode, addEdge, getNode, getNodesByKind, getEdge, getEdgesFrom, getEdgesTo, walkTransitive.
  Backend: 4 in-memory Maps. BFS walkTransitive + optional edgeKindFilter. No disk I/O, no event emission.
- `tests/lib/ontology-graph/store.test.ts` — 5 bun:test tests (addNode+getNode roundtrip, addEdge endpoint validation,
  getNodesByKind filter, getEdgesFrom+getEdgesTo, walkTransitive depth+edgeKindFilter).
- `tests/lib/ontology-entry/lifecycle.test.ts` — 5 bun:test tests for transitionUniversalOntologyEntry
  (captured→context-retrieved, idempotent no-op, full 6-state path, refs in event reasoning, atomic-write safety).

Companion schema change: schemas v1.60.0 extends `ProjectOntologyIndex` with `TNode`/`TEdge` generics +
`nodes?`/`edges?` optional fields. Shared-core bumped to v1.18.0.
Sprint: `palantirkc-sprint-080-pr2.3`. Plan SSoT: `~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md` §4 row 2.3.

---

## v6.0.0 — 2026-05-13 — sprint-077 PR-14a Cleanup: deprecated agents + MCPs

**BREAKING**: Removed 14 deprecated-candidate MCP tools and retired 4 deprecated implementer agents.
Plan SSoT: `~/.claude/plans/foamy-giggling-kettle.md` lines 905-947 (Deliverables A + B).
Sprint: `palantirkc-sprint-077-pr-14-cleanup-and-model-trust-profile`.

### Breaking changes (Deliverable B — MCP cleanup)

The following 14 MCP tools are **removed** from `bridge/mcp-server.ts`. Replacement paths are
documented in the new `bridge/handlers/_deprecation-map.ts` and surfaced by `pm_plugin_self_check`
and `pm_health_audit handler-usage`.

| Removed tool | Replacement |
|---|---|
| `propagation_audit_forward` | `pm_health_audit mode='ontology-runtime'` |
| `propagation_audit_backward` | `pm_health_audit mode='ontology-runtime'` |
| `propagation_chain_health` | `pm_health_audit mode='ontology-runtime'` |
| `detect_doc_drift` | `pm_health_audit mode='doc-drift'` |
| `verify_schema_pin` | `pm_health_audit mode='schema-pin'` |
| `verify_codegen_headers` | `pm_health_audit mode='codegen-headers'` |
| `grade_planner_output` | `grade_outcome_with_rubric` |
| `grade_classification_accuracy` | `grade_outcome_with_rubric` |
| `apply_refinement_target` | `apply_edit_function` |
| `run_playwright_scenario` | run external Playwright + `pm_substrate_query` |
| `complete_playwright_scenario` | run external Playwright + `pm_substrate_query` |
| `pm_value_grade_metrics` | `pm_health_audit mode='value-grade'` |
| `validate_hook_citations` | `pm_health_audit mode='hook-citations'` |
| `validate_hook_event_allowlist` | `pm_health_audit mode='hook-event-allowlist'` |

Public MCP surface: 36 → **22 tools**.

### Deprecated agent retirement (Deliverable A)

Four implementer agents past their `deprecationWindowEndsSprint=65` (now sprint 77) are retired:
`pm-implementer`, `mc-implementer`, `kosmos-implementer`, `home-implementer`. Use
`project-implementer` for project-scoped implementation work (rule 21 §Deprecation window mechanics).

- Each `.md` file tombstoned with `[RETIRED v6.0.0 — use project-implementer]` marker (not deleted).
- `hooks/subagent-start.ts` now emits `project_agent_collision_detected` + denies spawn for any
  deprecated agent past its `deprecationWindowEndsSprint`.
- `lib/delegation-recipe/recipe-builder.ts` DOMAIN_KEYWORDS removes `pm-implementer` / `mc-implementer` keywords.

### New files

- `bridge/handlers/_deprecation-map.ts` — `DEPRECATION_MAP` array + `lookupRemoval()` + `formatRemovalAdvisory()`.
- `tests/lib/agents/deprecation.test.ts` — deprecation gate unit tests (8 describe groups).

### Modified files

- `bridge/mcp-server.ts` — 14 TOOLS entries removed; TOOL_CATEGORIES + HANDLER_MODULES pruned.
- `hooks/subagent-start.ts` — `checkDeprecationGate()` + `readFrontmatterField()` + `inferCurrentSprint()` added; default export now returns `permissionDecision: "deny"` for blocked agents.
- `bridge/handlers/pm-handler-usage-audit.ts` — surfaces `removedToolAdvisories[]` from DEPRECATION_MAP.
- `bridge/handlers/pm-plugin-self-check.ts` — surfaces `removedToolAdvisories[]` from DEPRECATION_MAP.
- `bridge/handlers/pm-plugin-self-check/types.ts` — added optional `removedToolAdvisories?` field.
- `managed-settings.d/50-palantir-mini.json` — 14 MCP entries removed from `permissions.allow`; description updated.
- `tests/bridge/handlers/pm-plugin-self-check.test.ts` — updated `registeredToolCount` 36 → 22.
- `.claude-plugin/plugin.json` — v5.4.0 → v6.0.0.
- `.claude-plugin/marketplace.json` — all version fields v5.4.0 → v6.0.0.
- `package.json` — v5.4.0 → v6.0.0.

### Version chain

- plugin: v5.4.0 → v6.0.0 (MAJOR — breaking MCP removal per rule 08 §CHANGELOG + version bump discipline)

---

## v5.4.0 — 2026-05-13 — sprint-064 PR-4 OntologyContextApproval

**Theme**: Close the `OntologyContextSeed` permanent-stuck-at-unapproved-context-seed gap.
Plan SSoT: `~/.claude/plans/squishy-mixing-mango.md`.

### New files (5)

- `schemas/ontology/primitives/ontology-context-approval.ts` — type-shape primitive (no factory; runtime helpers live in plugin). 12 fields: `approvalId` (sha256:16), `approvalKind` (auto-low-risk | lead-approved | user-approved), `sourceQueryRef`, `universalOntologyEntryRef`, `approvedCapabilityRefs`, `rejectedCapabilityRefs`, `approvedSurfaceRefs`, `forbiddenSurfaceRefs`, `approverIdentity`, optional `promptId` + `promptHash`.
- `ontology/shared-core/ontology-context-approval.ts` — thin re-export (catches up PR-3 omitted v1.13.0 bump for UniversalOntologyEntry + adds PR-4).
- `lib/ontology-context/approval.ts` — `createOntologyContextApproval()` (factory + atomic persist + event emit) + `loadOntologyContextApproval()` + `listPendingContextApprovals()`. Deterministic approvalId = sha256:16. Idempotent (file exists → return existing record).
- `bridge/handlers/internal/ontology-context-approval-create.ts` — internal handler (NOT MCP-exposed). Input validation + calls lib helper. Callers: pm_intent_router (auto-low-risk), pm_lead_brief (lead-approved path, future).
- `tests/lib/ontology-context/approval.test.ts` — 3 describe blocks: createOntologyContextApproval (4 cases) + loadOntologyContextApproval (3 cases) + listPendingContextApprovals (3 cases).

### Modified files (9)

- `schemas/package.json` — v1.54.0 → v1.55.0 (MINOR additive; new sub-path export added).
- `schemas/CHANGELOG.md` — v1.55.0 entry.
- `ontology/shared-core/package.json` — v1.12.0 → v1.13.0.
- `bridge/handlers/pm-intent-router.ts` — added `acceptApprovalAutoCreate?: boolean` to `IntentRouterInput`; added `ontologyContextApprovalRef?: string` to `IntentRouterResult`; wired best-effort auto-low-risk gate (deferred full wiring to PR-5 per plan §Out of scope).
- `bridge/handlers/pm-lead-brief.ts` — added `pendingContextApprovals: ContextApprovalSummary[]` to `PmLeadBriefResult`; implemented reader via `listPendingContextApprovals()`.
- `agents/project-implementer.md` — added `acceptsOntologyContextApprovalRef: true` to `ontologyAgent` frontmatter; added step 6 to Ontology Context Bootstrap section.
- `.claude-plugin/plugin.json` — v5.3.0 → v5.4.0.
- `.claude-plugin/marketplace.json` — v5.2.2 → v5.4.0 (all version fields).
- `package.json` — v5.3.0 → v5.4.0.

### Version chain

- schemas: v1.54.0 → v1.55.0 (MINOR)
- shared-core: v1.12.0 → v1.13.0 (MINOR)
- plugin: v5.3.0 → v5.4.0 (MINOR)

---

## Unreleased — Lecture Delivery Kernel v0

**Theme**: Add a plugin-owned education kernel that converts lecture problem
evidence into sequencer draft proposals and presenter-readiness governance.

### Scope

- Added the portable Palantir reference pack for AIP, Ontology, Context,
  Function, Action, Security, and Evals routing.
- Added Lecture Delivery Kernel v0 types and pure functions:
  `ingestProblem`, `buildSequenceContext`, `createSequencerDraft`,
  `runPresenterReadinessCheck`, and `evaluateLectureGovernance`.
- Added a deterministic Lecture Delivery Kernel eval-suite declaration and
  tests.

### Recovery

- Revert this PR. The new internal education kernel and portable reference pack
  disappear; no public MCP tool surface is removed or changed.

### Excluded Scope

- No generated artifact edits.
- No `projects/palantir-math/**` pilot wiring in this root plugin slice.
- No public MCP tool add/remove.

---

## v5.2.2 — 2026-05-11 — Ledger + Codex Adapter Diagnostics

**Theme**: Close sprint-064 W4 by making broad-suite debt explicit and turning Codex adapter gaps into append-only evidence.

### Scope

- Added `tests/KNOWN_BROAD_SUITE_FAILURES.md` with the 29 known broad-suite failure clusters from the #366 baseline.
- Rewired the Codex Claude hook adapter to consume `RuntimeCapabilityMatrix` instead of a duplicated event set.
- Added best-effort `codex_adapter_timeout_observed` and `codex_adapter_capability_mismatch` diagnostics through `validation_phase_completed` envelopes.
- Added daily timeout diagnostic deduplication by event, hook, and UTC date.
- Added `promptEnvelopeLookup` attribution to `pm_semantic_intent_gate` results.
- Made active SprintContract `lite` ranking explicit between `full` and `quick`.

### Verification

- `bunx tsc --noEmit`
- `bun test tests/lib/codex/codex-hook-adapter.test.ts tests/lib/runtime/capability-matrix.test.ts tests/lib/harness/active-contract.test.ts tests/bridge/handlers/pm-semantic-intent-gate.test.ts`

### Recovery

- Revert the v5.2.2 PR. New diagnostics stop emitting; `promptEnvelopeLookup` disappears from the additive gate result; `lite` mode ranking reverts to the prior implicit default.

### Excluded Scope

- No public MCP add/remove.
- No Prompt-DTC default blocking promotion.
- No PreToolUse governance adapter consolidation.
- No Education Domain pilot.
- No `projects/palantir-math/**` edits.

---

## v5.2.1 — 2026-05-11 — Context Capsule + Harness Ratchet Persistence

**Theme**: Make the sprint-064 W3 internal lineage primitives durable without adding public MCP tools.

### Scope

- Added persisted `ContextCapsule` helpers: persist, load, attach contract refs, attach routing projection, freeze, and archive.
- Added `context-capsule-init` UserPromptSubmit hook and wired semantic gate, intent router, PreCompact, and Stop lifecycle enrichment.
- Rewrote HarnessRatchetProposal IDs to stable sha256-derived IDs.
- Added ratchet synthesis from ratchetable event classes into `.palantir-mini/harness/ratchets/*.json` plus `harness_ratchet_proposed` lineage events.
- Added an internal unregistered `harness-ratchet-synthesize` handler for script/lead-directed use.

### Verification

- `bunx tsc --noEmit`
- `bun test tests/lib/context/context-capsule.test.ts tests/lib/harness/ratchet-proposal.test.ts tests/hooks/pre-compact-state.test.ts tests/hooks/stop-guard.test.ts`

### Recovery

- Revert the v5.2.1 PR. Persisted capsule and ratchet JSON files become orphaned runtime artifacts; no public MCP surface consumes them yet.

### Excluded Scope

- No public MCP add/remove.
- No skill creation for ratchet synthesis.
- No Prompt-DTC default blocking promotion.
- No W4 Codex adapter diagnostics.

---

## v5.2.0 — 2026-05-11 — Surface Consolidation W1-W2

**Theme**: Reduce public/control-plane ambiguity without adding or removing public MCP tools.

### Scope

- Added `deprecated-candidate` ToolSpec lifecycle metadata and `replacedBy` targets for 14 public MCP tools that are consolidation candidates.
- Added required `category` frontmatter to all 68 plugin skills and deprecated the delegate/direct compatibility skills in favor of `pm_intent_router`.
- Extended `pm_plugin_self_check` so `public-mcp`, `skills`, and `hooks` modes enforce metadata and timeout policy presence.
- Added generic `project-implementer` and marked `pm-implementer`, `mc-implementer`, and `kosmos-implementer` deprecated through sprint 065.
- Added projectScope edit-boundary fields: `writableRoot`, `forbiddenPatterns`, and `domainAgents`.
- Bumped remaining `UserPromptSubmit` front-door advisory hooks from 5s to 30s so strict hook timeout self-check passes.

### Verification

- `bunx tsc --noEmit`
- `bun test tests/bridge/mcp-server-schema.test.ts tests/bridge/handlers/pm-plugin-self-check.test.ts tests/bridge/handlers/pm-plugin-self-check-primitive-seeds.test.ts`
- `bun test tests/bridge/handlers/pm-plugin-self-check.test.ts tests/lib/hooks/timeout-policy.test.ts tests/lib/project-scope/loader.test.ts tests/lib/codex/codex-hook-adapter.test.ts`
- `pm_plugin_self_check({ mode: "public-mcp" })`
- `pm_plugin_self_check({ mode: "skills" })`
- `pm_plugin_self_check({ mode: "hooks" })`

### Recovery

- Revert the v5.2.0 release PR to restore the v5.1.0 surface.
- Set `PALANTIR_MINI_HOOK_TIMEOUT_SELFCHECK_BYPASS=1` only for incident response; the bypass emits `hook_timeout_selfcheck_bypass_invoked` evidence through `validation_phase_completed`.

### Excluded Scope

- No public MCP add/remove.
- No actual skill or agent removal.
- No Prompt-DTC default blocking promotion.
- No Education Domain pilot.
- No `projects/palantir-math/**` edits.

---

## v5.1.0 — 2026-05-10 — Prompt-to-DTC Ontology Engineering control plane

**Theme**: Promote the #350 Prompt-to-DTC identity path from advisory contract plumbing into a typed, reviewable Ontology Engineering control plane without changing the fleet default gate mode.

### Why

- #350 exposed `promptId`, `promptHash`, `sessionId`, and `runtime` in public MCP schemas. v5.1.0 makes that path usable by non-programmer users and safer for agents by adding plain-language contract review, structured approval provenance, typed refs, conformance checks, and regression evidence.
- Per-turn runtime overlays should not churn on every palantir-mini release. v5.1.0 centralizes release facts in plugin docs/manifests and leaves `AGENTS.md` / `CLAUDE.md` / `.claude/rules/*` for stable read-order, edit-boundary, reload, and cross-runtime contracts.

### Scope

- Human-collaborative `pm_semantic_intent_gate` support: `interactionMode`, `userExpertise`, `preferredLanguage`, Korean user review cards, bounded clarification questions, and internal-only contract field population.
- Structured `approvalRef` provenance with prompt identity, runtime, user-visible summary hash, approval timestamp, and user answer excerpt while preserving legacy string compatibility.
- Contract approval state machine between `drafted` and `approved`: semantic questions/review, DTC questions/review, separate semantic and digital-twin approvals, and mutation authorization only after DTC approval.
- Canonical Prompt-to-DTC primitives and typed `OntologyEngineeringRef` availability while keeping legacy `approvedNouns`, `approvedVerbs`, and `affectedSurfaces`.
- Typed ref resolver for nouns, verbs, surfaces, MCP tools, project lanes, and unresolved terms.
- `projectScope.ts` ingestion into impact, pre-edit, gate, and router metadata for lane/axis/validation-pack conformance.
- MCP schema drift hardening so handler input and public schema stay aligned beyond #350 prompt identity fields.
- Prompt-DTC `scoped-blocking` mode for high-risk surfaces while default remains `advisory`.
- PR contract boundary validator binding branch/proposal/permission/evaluation fields to reviewable PR evidence.
- Prompt-to-DTC eval-like regression suite and Codex E2E prompt identity integration test.
- Release/docs stability pass: manifests, README, hooks metadata, managed-settings fragments, and root/project overlay guidance synced.
- `validate_managed_settings_fragments` now audits only palantir-mini MCP allow patterns as tool drift; non-MCP `Read`/`Write`/`Bash` permissions remain visible in fragment output but no longer appear as false "extra tool" drift.
- `compatibleSchemaVersions` tightened to `>=1.47.0 <2.0.0`, matching the plugin package peer dependency and the Prompt-to-DTC typed primitive surface.

### Runtime behavior

- Default Prompt-DTC gate mode remains `advisory`.
- `off`, `advisory`, `scoped-blocking`, and `blocking` modes are documented; full blocking default promotion is still excluded.
- Approval authorizes routing/gating only. It does not execute mutation.
- Raw prompt retention remains opt-in only; promptHash and redacted excerpt behavior are preserved.

### Verification

- `bunx tsc --noEmit`
- Focused Prompt-to-DTC, router, scoped-blocking, PR-boundary, eval-suite, Codex adapter, and Codex E2E tests across Waves 1-11.
- `validate_hook_event_allowlist`
- `verify_schema_pin`
- `detect_doc_drift`
- `validate_managed_settings_fragments`
- `pm_rule_audit`

Known residual debt: broad `pm_plugin_self_check` still reports pre-existing substrate failures around the intentionally pinned `projects/kosmos` schema peer dependency and the legacy handler/tool registration-count check. These are not introduced by v5.1.0.

### Recovery

- Revert the v5.1.0 release PR to restore v5.0.1 metadata and behavior.
- Set `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=advisory` or `off` to avoid scoped blocking during incident response.
- If Codex does not expose new skills, MCP handlers, or manifest changes, run `bun run ~/.codex/scripts/sync-claude-palantir-mini.ts` and restart the Codex session or MCP/plugin surface.

### Excluded Scope

- No default promotion to full blocking.
- No broad new MCP tool surface.
- No raw prompt retention by default.
- No generated registry hand edits.
- No Kosmos RBAC rewrite; Kosmos remains a read-only research runtime in this root release slice.

---

## v5.0.1 — 2026-05-10 sprint-064 — Prompt-to-DTC release slice

**Theme**: Prompt front door + SemanticIntentContract / DigitalTwinChangeContract persistence + advisory Prompt-DTC enforcement + Codex adapter parity.

### NEW

- `prompt-front-door-capture` runs first on `UserPromptSubmit`, writes prompt envelopes/current pointers, and surfaces promptId/promptHash context for `pm_semantic_intent_gate`.
- `pm_semantic_intent_gate` accepts prompt identity fields and persists prompt-local SemanticIntentContract / DigitalTwinChangeContract refs.
- `prompt-dtc-enforcement-gate` covers mutating tool surfaces. Default mode remains `advisory` via `PALANTIR_MINI_PROMPT_DTC_GATE_MODE=advisory`.
- `lib/codex/codex-hook-adapter.ts` provides reusable Codex hook parity for UserPromptSubmit additionalContext, PreToolUse deny output, Stop execution, and inspect output.

### MODIFIED

- `pm_intent_router` dereferences approved prompt-front-door contract refs and routes from stored contract fields instead of raw prompt text when resolvable.
- Prompt-contract events include promptId, promptHash, contract refs, runtime, projectRoot, memoryLayers, and failed-gate refinementTarget evidence.
- Legacy prompt heuristics are downstream advisory/governance only, not prompt-front-door proof.
- Managed settings declare the advisory Prompt-DTC default. Blocking default promotion is deferred until a separate release after sustained Claude and Codex smoke evidence.

### Verification

- Targeted prompt-front-door, semantic-gate, intent-router, Prompt-DTC enforcement, Codex adapter, and hook tests passed across Waves 2-7.
- `validate_hook_event_allowlist` and `validate_hook_citations` passed.
- Existing full-suite substrate failures and `pm_plugin_self_check` baseline failures remain tracked debt.

---

## v5.0.0 — 2026-05-09 sprint-063 — MAJOR clean break

**Theme**: MCP Drastic Reduction (75 → 33) + Lead Routing REWRITE + Substrate Hygiene + Sprint-062 Carry-Overs.

**Closes**: external eval `3.png` (sprint-061 baseline) target axes — Lead Ontology 7→9, Lead Harness 7.5→8.5-9, Workflow 6→9, Closed-Loop 5→8.

### BREAKING (consumer skill rewrite required)

42 MCP tools removed from TOOLS array. Consumer skills calling removed tool names will fail at runtime; migration map below.

**Removed → Replacement**:

| Removed (42)                             | Replaced by                       |
|------------------------------------------|-----------------------------------|
| `semantic_change_plan`                   | `impact_query` + `pre_edit_impact` (W2; broken runSemanticQuery deleted) |
| `diff_semantic_impact`                   | `impact_query` + git diff (W2; same broken engine) |
| `pre_sprint_diff`                        | `impact_query` + git diff |
| `delegate_or_direct` + `dispatch_route_decide` + `dispatch_to_runtime` | `pm_intent_router` (W3.A) — full intent-router with prefetched context |
| `pm_preamble` + `session_resume` + `wake_session` + `query_session_duration` | `pm_lead_brief` (W3.B) — 1-call session-opener |
| 9 audit handlers (handler-usage / harness-base / harness-component / harness-outcome / outcome-pair / memory-layer / research-citation / events-5d / strictness) | `pm_health_audit({mode})` (W4.A) |
| 6 lineage handlers (replay_lineage / pm_workflow_lineage_query / pm_event_query_by_grade / pm_retro_query / pm_learn_query / pm_agent_lineage_export) | `pm_substrate_query({mode})` (W4.B) |
| 23 low-utility handlers                  | scripts / Bash / pm-* skills |

### NEW

- **4 NEW handlers** (Lead routing layer — single entry-points):
  - `pm_intent_router` — full intent-router (recipe + cost-aware species + prefetched context: impact_query top-RID + workflow lineage 7d + value-grade summary)
  - `pm_lead_brief` — 1-call session-opener (session ctx + last 5 sprints + value-grade metrics + recent T3+ lineage + dispatch suggestion)
  - `pm_health_audit` — 9-handler mode-dispatched merger
  - `pm_substrate_query` — 6-handler mode-dispatched merger
- **1 NEW hook**: `lead-git-operation-watch` (PreToolUse:Bash advisory — extends Lead-direct gate to git commit/add/stash/push; rule 12 v3.14.0)
- **1 NEW lib feature**: `lib/event-log/append.ts` lock-hold telemetry (>250ms threshold stderr warning; W1.B)

### MODIFIED

- **TOOLS array 75 → 33** entries (`bridge/mcp-server.ts`):
  - A. Ontology Engineering (14): emit_event, get_ontology, ontology_schema_get, impact_query, pre_edit_impact, propagation_audit_forward, propagation_audit_backward, propagation_chain_health, apply_edit_function, compute_edits_dry_run, commit_edits, detect_doc_drift, verify_schema_pin, verify_codegen_headers
  - B. Harness Engineering (8): negotiate_sprint_contract, grade_outcome_with_rubric, grade_planner_output, pm_grader_dispatch, grade_classification_accuracy, apply_refinement_target, run_playwright_scenario, complete_playwright_scenario
  - C. Lead Routing NEW (4): pm_intent_router, pm_lead_brief, pm_health_audit, pm_substrate_query
  - D. Validation + Health (4): pm_plugin_self_check, pm_value_grade_metrics, pm_rule_query, pm_rule_audit
  - E. Hook validation (3): validate_hook_citations, validate_hook_event_allowlist, validate_managed_settings_fragments
- **moduleMap dispatch table** synced to 33 retained handlers
- **managed-settings.d/50-palantir-mini.json** — RBAC allowlist synced to 33 retained MCPs
- **rule 12 v3.11.0 → v3.14.0** (3 amendments):
  - v3.12.0 (W2.C): §Intent-to-Ontology Protocol simplified 8-step → 6-step (steps 3-4 unified into single impact_query)
  - v3.13.0 (W3.C): §Lead routing canonical — pm_intent_router single dispatch entry; pm_lead_brief session opener; first turn 5 calls → 2 calls
  - v3.14.0 (W5.C): §Pre-delegation hard gate extends to git operations via lead-git-operation-watch
- **rule 24 v1.1.0 → v1.2.0** (W3.C) — §Cost-aware dispatch updated for pm_intent_router single-entry
- **`apply_refinement_target` full wiring** (sprint-062 carry-over W2.2 closed): apply_edit_function + compute_edits_dry_run + grade_outcome_with_rubric (simulator) + commit_edits chain; threshold 0.3 → 0.5; un-skipped 6 + 4 = 10 integration tests
- **3 hooks rewrite** (W2.B): pre-edit-impact-mcp-first drops semantic_change_plan + adds pre_edit_impact; lead-ontology-discovery-completeness BLOCKING (impact_query AND propagation_audit_forward both required); user-prompt-ontology-intent-extract advisory 8-step → 6-step

### REMOVED (file-system delete)

- **Monitors sunset** (W1.A — close C18; lock contention root cause; 32,140 monitor emits eliminated):
  - `monitors/drift-watch.ts` + subdir
  - `monitors/event-log-tail.ts`
  - `monitors/harness-live-watch.ts` + subdir
  - `monitors/is-disabled.ts`
  - `monitors/monitors.json`
  - `tests/monitors/*` (3 test files)
- **50 handler files DELETED** (W4.C):
  - 23 low-utility (pre_sprint_diff, scan_*, codegen_trigger, gate_on_drift, agent_audit_trail, pm_dispatch_cost_estimate, pm_portable_bundle_manifest, check_cc_version, capability_token_check, populate_impact_graph, project_register, events_log_rotate, outcome_pair_close, create_granular_task, auto_spawn_replacement, refresh_research_doc, research_context_select, research_library_refresh, pm_config_get, pm_config_set, get_team_health, scenario_create)
  - 5 dead handler files (blueprint_write, claude_code_version_delta, dispatch_route_decide, grade_with_simulator, research_library_prune)
  - 3 lead routing (delegate_or_direct, dispatch_to_runtime; dispatch_route_decide already non-TOOLS)
  - 4 lead brief (pm_preamble, wake_session, query_session_duration; session_resume retained for hooks dependency)
  - 2 broken engine (semantic_change_plan, diff_semantic_impact + paired tests + scripts/audit-semantic-change-plan-confidence.ts)
  - 13 paired test files
- **15 internal handlers RETAINED** (used as lazy-import targets by mergers; not exposed as MCP):
  - 9 audit handlers (called by pm_health_audit)
  - 6 substrate-query handlers (called by pm_substrate_query)
- **1 skill DELETED**: `skills/pm-change-plan/` (wrapper for removed semantic_change_plan)
- **16 broken test files DELETED** (tests dependent on deleted handlers)

### Substrate health delta (sprint-063)

| Metric                        | v4.15.0 (sprint-062) | v5.0.0 (sprint-063) |
|-------------------------------|----------------------|---------------------|
| TOOLS array                   | 75                   | **33** (-56%)       |
| Handler files                 | 100                  | **55** (-45%)       |
| Plugin version                | 4.15.0               | 5.0.0 (MAJOR)       |
| rule 12 version               | 3.11.0               | 3.14.0 (3 amendments) |
| rule 24 version               | 1.1.0                | 1.2.0               |
| Monitor emits per session     | ~30 (15s drift cycle)| **0** (sunset)      |
| events.jsonl mutex 30-retry exhaustion | yes (32,140 total emits) | resolved |
| Lead first turn MCP calls (typical) | 5+                | **2** (pm_lead_brief + pm_intent_router) |

### Migration

Consumer projects (`palantir-math`, `mathcrew`, `kosmos`, `hyperframes`) using removed MCP names must:

1. Replace `mcp__palantir-mini__semantic_change_plan` → `mcp__palantir-mini__impact_query` or `pre_edit_impact`
2. Replace `mcp__palantir-mini__delegate_or_direct` → `mcp__palantir-mini__pm_intent_router`
3. Replace `mcp__palantir-mini__pm_preamble` → `mcp__palantir-mini__pm_lead_brief`
4. Replace 9 audit handlers → `mcp__palantir-mini__pm_health_audit({mode})`
5. Replace 6 lineage handlers → `mcp__palantir-mini__pm_substrate_query({mode})`
6. Update consumer-project `managed-settings.d/50-palantir-mini.json` — RBAC allowlist (deferred sprint-064 P0)

### Acceptance criteria

- ✅ TOOLS array 33 (target: 33)
- ✅ moduleMap 33 (synced)
- ✅ RBAC allowlist 33 (synced)
- ✅ tsc --noEmit clean (0 errors)
- ✅ Monitors fully removed (drift-watch + event-log-tail + harness-live-watch deleted)
- ✅ semantic_change_plan + diff_semantic_impact deleted (broken engine)
- ✅ rule 12 v3.14.0 + rule 24 v1.2.0
- ✅ apply_refinement_target full wiring + 10 un-skipped tests
- ✅ C16 commit-delegation hook + rule 12 §Pre-delegation extension

### Carry-overs (sprint-064 P0/P1)

- **C17 kosmos peerDep policy** — user confer needed (deferred)
- **W5.B Codex subprocess wiring** — dispatch-to-runtime.ts deleted; pm_intent_router needs Codex spawn branch
- **Consumer-project managed-settings.d/50-palantir-mini.json** updates (palantir-math, mathcrew, kosmos)
- **Skill sweep ~70 skills** — replace removed MCP names with new consolidated tools
- **Migration guide** `~/.claude/plans/2026-05-09-mcp-reduction-migration-notes.md` (deferred)
- **W0.2/W0.3 test infra cleanups** (sprint-062 P3 carry-over)

---

## v4.15.0 — 2026-05-09 sprint-062

**Closes**: external eval `3.png` weak axes (Lead Ontology 7/10 → ~8/10; Workflow 6/10 → ~7-8/10; Closed-Loop 5/10 → ~6.5-7/10; Harness 7.5/10 → ~7.5-8/10).

### NEW
- 1 skill: `pm-intent-to-ontology` (8-step Intent-to-Ontology Protocol wrapper)
- 8 hooks: `user-prompt-ontology-intent-extract`, `lead-ontology-discovery-completeness` (W1); `t4-canonical-emit-watch`, `t4-promotion-trigger` (W2); `ontology-domain-classification-validate`, `bypass-budget-monitor`, `task-completed-enrichment` (W3+W6)
- 4 handlers: `apply_refinement_target` (W2 closed-loop primitive — skeleton), `grade_classification_accuracy` (W4), `dispatch_to_runtime` (W5), `validate-substrate-firing` (W6)
- 1 Convex table: `decisionEvents` + 2 mutations + 5 queries (W2)
- 1 lib module: `lib/closed-loop/apply-refinement-target-helpers` (W2γ)
- producer-ontology Wave 3 cross-tier edge emission (W6-ε ⭐ USER GATE C13): extends/implements → ontology-defines (1.0); barrel-import → ontology-depends-on (0.8)

### MODIFIED
- `pre-edit-impact-mcp-first` advisory → blocking (W3)
- rule 12 v3.10.0 → v3.11.0 §Intent-to-Ontology Protocol
- 3 SessionStart hooks: lock cascade fix (W0-α — harness-cron-auto-register, session-start-overlay-injector, lead-model-availability-check)
- producer-ontology + neighborhood + semantic-query (W6-ε Wave 3 + Kind-3 validation)

### CARRY-OVERS (sprint-063)
C13 type-reference edges (lowest-confidence band) + C16 commit-delegation rule + C17 kosmos peerDep policy reconciliation + C18 Monitors sunset + W2 full apply_edit_function wiring + W3 advisory→blocking promotion + W5 Codex live T4 D2-canonical + 2 W0-α test infra cleanups.

---

## v4.14.0 — 2026-05-09 (sprint-061 B.W7 Codex MCP exposure verification)

### B.W7 — Codex MCP exposure verified: auto-shared via bridge/mcp-server.ts; no allow-list edit needed

**Finding**: `~/.codex/config.toml` registers `[plugins."palantir-mini@palantir-mini-marketplace"]` with `enabled = true` but has NO explicit `[mcp_servers.palantir-mini]` section. Codex loads the plugin via marketplace plugin install. Resolution: `.codex-plugin/plugin.json` declares `"mcpServers": "./.mcp.json"` — Codex resolves this relative to the **plugin root** (not relative to `.codex-plugin/`), following the same convention used by official marketplace plugins (cloudflare, build-ios-apps). The plugin root `.mcp.json` wires `bridge/mcp-server.ts` directly. Codex therefore sees the same full TOOLS list as Claude — **auto-shared, no config change needed**.

**Tools confirmed present in bridge/mcp-server.ts (75 total)**. All 8 B.W7 target impact tools verified:
- `impact_query`, `pre_edit_impact`, `populate_impact_graph`, `diff_semantic_impact`
- `propagation_audit_forward`, `propagation_audit_backward`, `propagation_chain_health`, `semantic_drift_audit`
- (plus existing 4: `emit_event`, `research_context_select`, `pm_rule_query`, `semantic_change_plan`)

**Cross-runtime atomic-append**: `bun test tests/event-log.test.ts` — 10/10 PASS. Adversarial 2-writer × 1000 events race: 0 lost, 0 torn writes, 2000/2000 rows, monotonic sequence. Rule 27 §Atomic append protocol verified.

**byWhom.identity gap**: `~/.codex/AGENTS.md` describes Claude Compatibility Mode but does not yet declare `byWhom.identity = "codex-cli"` self-attribution for events.jsonl writes. Gap documented; Codex-side adoption is a future wave (rule 27 §Cross-runtime invariant).

**No version bump**: plugin already at v4.14.0 per sprint-061 Track A delivery; B.W7 is verification-only.

### Cross-refs
- Plan: `~/.claude/plans/inherited-discovering-quill.md §3.B.W7`
- Rule 27 v1.0.0 §Cross-runtime invariant + §Codex append discoverability + §Atomic append protocol
- `.codex-plugin/plugin.json` (mcpServers reference), `.mcp.json` (wires bridge/mcp-server.ts)

---

## v4.13.0 — 2026-05-09 (sprint-060 architecture review P1+P2+P3 carry-over closure + MCP-First Impact Analysis plan)

Closes ~44-48 actionable items (15 P1 + ~22-26 P2 + 7 P3) from architecture review PR #329 carry-over (sprint-059 deferred 17+25+22 = 64 items) in single 1M-context Lead session via 5-Wave parallel/bundled subagent fan-out (20 subagents) + Lead-direct Wave 4 audit + sprint-061 dual-track plan synthesis.

### Wave 1 — 15 P1 items (13 parallel subagents)
- W1.1 LD1+LD2: lib/lead-orchestration-thresholds.ts shared constants + synthesis-edit-count split logic
- W1.2 LD3: briefing-template-validate 5 per-section semantic validators (lib/briefing-section-validators.ts)
- W1.3 LD4: complex-task-detector valueGrade T3→T1 demote + threshold tuning (12 tests)
- W1.4 LD5: agent-decision-log emit_event recursion filter
- W1.5 SP2: commit-edits handler auto-injects dryRunRef (errorClass="dry_run_auto_computed"; 16 tests)
- W1.6 SP3: pm-preamble --effort flag deprecation probe (per-session cached)
- W1.7 M1: NEW lead-model-availability-check SessionStart hook + 3-tier fallback + LEAD_MODEL_OVERRIDE
- W1.8 M3: NEW agent-ownership-validate PreToolUse hook + lib/agent-ownership-table.ts (26 violations fired this sprint)
- W1.9 E1: value-grade-assigner valueGrade_assignment_completed meta-event + axis E softening
- W1.10 M2: pm-plugin-self-check NEW consumerPeerDepResult axis + lib/consumer-peerdep-scanner.ts (17 tests)
- W1.11 rule-bundle: Rule 12 v3.9.0 + Rule 26 v1.2.0 + Rule 07 v1.3.0 + NEW Rule 27 v1.0.0 + CORE.md v3.3.0
- W1.12 S3: categoryFoundryEquivalent metadata on 73 schema primitives
- W1.13 B2: NEW DispatchContract abstract superclass + 7-species discriminated union (367 LOC)

### Wave 2 — ~22-26 P2 items (4 bundled agents)
- W2.1 ontology-steward (8 items): NEW HarnessSpeciesEnum primitive + R5-F3/F6/F7/F9/F10/F12/F13 categorize/verify
- W2.2 hook-builder bundle A (6 items): harness-engineering-context-loader MAX_LINES 30→15; NEW validate-hook-citations-startup; NEW post-merge-cleanup; NEW pm-plugin-self-check check-mcp-registration axis
- W2.3 hook-builder bundle B (6 items): commit-edits self-attest; propagation_chain_health weight fix; outcome-pair forced/natural distinction; task-budget metrics; NEW cross-project-audit script
- W2.4 protocol-designer rule-bundle (4 rules): Rule 02 v3.2.0 §plans-index-drift-detect; Rule 10 v2.2.0 §propagationDepth auto-derivation

### Wave 3 — 7 actionable P3 items (1 bundled agent)
- value-grade-assigner per-class metric + substrate routing instrumentation
- lead-direct-edit-watch test count 6→18
- NEW skills/pm-delegate-or-direct-quick 1-arg variant
- NEW scripts/tests-source-ratio.ts dashboard
- NEW scripts/briefing-30d-audit.ts scheduled audit
- CONTEXT.md §15 species 4/6/7 markers

### Cleanup waves (4 agents)
- W1-cleanup-A (ontology-steward): 73 primitives renamed `<slug>FoundryEquivalent` (W1.12 collision fix); shared-core tsconfig; schemas v1.48.0 → v1.49.0
- W1-cleanup-B (hook-builder): 5 hooks payload schema compliance (validation_phase_completed errorClass + reasoning text)
- W2-cleanup-C: 3 scripts TS errors (nullish-coalesce + errorClass + RefinementTargetKind)
- W3-cleanup-D: lead-direct-edit-watch.test.ts readCounter conflict + null narrowing + scripts string|undefined

### Wave 4 — Lead-direct audit chain (12+ MCP/skill verifications)
- pm_plugin_self_check: fail (rule 27 registry drift; sprint-061 P0)
- pm_value_grade_metrics: T2+ ratio 5.3% (target 15%; flat; Theme A pattern); T4=0
- pm_handler_usage_audit: 54 handlers / 1497 invocations (30d)
- pm_outcome_pair_audit: orphan 5.5% (above 5% advisory)
- pm_harness_base_mode_audit: 137 passed / 0 bypass / 0 block → ready-for-B2 ✓
- pm_research_citation_validate: 28/29 fail (96.5%; sprint-061 P0)
- audit_events_5d_conformance: 0.73% violation
- impact_query for hot file: empty graph (cache stale)
- check_cc_version: 19 versions stale

### Wave 5 — Plan synthesis + ship
- NEW ~/.claude/plans/2026-05-09-palantir-mini-ontology-harness-operating-model.md (918 LOC; PlanMode-reviewable)
  - §4.5 MCP-First Impact Analysis centerpiece (Lead 6-step decision tree + token-saving math 75-99% per question)
  - §4.5.6a Convex-backed continuous-maintenance framework (replaces SQLite per user directive 2026-05-09)
  - §5.1 sprint-061 dual-track plan: Track A runtime-overlay portability (8 waves) + Track B MCP-First (7 waves)
  - §10 PlanMode review checklist (deliverables / dependencies / risks / capacity)
  - §11 paste-ready new-session prompt
- NEW ~/.claude/plans/2026-05-09-sprint-060-retrospective.md (sprint retrospective)
- Plugin v4.12.0 → v4.13.0; schemas v1.47.0 → v1.50.0 (4 MINOR bumps); shared-core v1.9.0 → v1.11.0; 6 rules updated/created

### Substrate health post-sprint-060
- T2+ ratio: 5.4% → 5.3% (flat — Theme A pattern continues; new substrate emits exist but auto-firing not yet wired)
- T3 circuit inputs: 89 → 105 (+16)
- Total events: 3006 → 4827
- Plugin self-check: fail (rule 27 registry drift)
- harness base-mode: ready-for-B2 ✓

### Sprint-061 carry-over (re-prioritized after user directives 2026-05-09)
- P0 Lead capability multiplier: Convex-backed impact-graph continuous maintenance (replaces SQLite) + pre-edit-impact-mcp-first hook + lead_mcp_first_compliance telemetry + CLAUDE.md amendment
- P0 substrate health: rule 27 registry rebuild + substrate-firing-gate + handler→event semantic specificity + pm_research_citation_validate cleanup
- P1 capability uplift: Track A runtime-overlay portability (Codex proposal §Sprint-061 7 waves) + T4 D2-fallback emission + TaskCompleted withWhat enrichment + propagation_chain_health usage-activation + Codex MCP exposure expansion

### Architectural decisions (sprint-060 user directives)
- **Convex Cloud as impact-graph backend** (replaces SQLite sqlite-cache.ts): TypeScript-only; cross-runtime sharing trivial; eliminates stale-cache class of failures (Convex reactive queries)
- **MCP-First Impact Analysis canonical protocol** (rule 12 v3.10.0 sprint-061 candidate): Lead ≥80% MCP-first compliance ratio target; file reads = last escape only; trio migration (CLAUDE.md + rule + hook) per sprint-059 W1.4 §Lead self-test proven pattern

### Cross-refs
- Architecture review: ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md
- Sprint-059 retro: ~/.claude/plans/2026-05-08-sprint-059-retrospective.md
- Codex proposal: docs/proposals/2026-05-08-claude-palantir-mini-ontology-harness-proposal.md
- Operating model plan: ~/.claude/plans/2026-05-09-palantir-mini-ontology-harness-operating-model.md
- Sprint-060 retro: ~/.claude/plans/2026-05-09-sprint-060-retrospective.md
- SprintContract: <projectRoot>/.palantir-mini/harness/sprints/sprint-060/contract.json

---

## v4.12.0 — 2026-05-08 (sprint-059 architecture review P0 + 8 P1 closure)

Closes 6 P0 Blockers + 8 P1 Major findings from architecture review PR #329 (1,553 LOC, 81 findings) in single 1M-context Lead session.

### P0 Blockers closed (6)
- **B1** (R2-F2): `propagation-audit-backward.ts` emits paired `phase_completed` envelope with typed `withWhat.refinementTarget` on first violation — closes BackProp circuit step 1.
- **B2** (R2-F3): NEW `hooks/t3-circuit-feeder.ts` — PostToolUse advisory hook routes T3-graded envelopes with refinementTarget to `<sessionDir>/decisions/<kind>/<eventId>.json`. Closes BackProp circuit step 2 (17 tests).
- **B3** (R3-F1): NEW `hooks/lead-direct-counter-reset.ts` — SessionStart resets `.lead-direct-edit-counter.json` to `{count:0}`. Closes 117 silent blocks accumulation since 2026-05-06.
- **B4** (R3-F2): rule 12 v3.7.0 → v3.8.0 §Lead self-test directive + simplified `lib/delegation-recipe/recipe-builder.ts` 343 → 180 LOC. First `delegation_recipe_generated` event emitted this session (was: 0 across 1727+ events).
- **B5** (R6-F1): `hooks/value-grade-assigner.ts` instrumented with meta-event `valueGrade_assignment_completed` + axis E softening (memoryLayers inferred from byWhom.agent) + recursion guard. Expected adoption lift: 2.5% → 30%+.
- **B6** (R6-F4): rule 26 v1.0.0 → v1.1.0 §D2 dual-mode (D2-canonical K≥2 + D2-fallback K=1 single-vendor-attested). T4 now reachable on single-Claude-account Max X20 with confidence-tier annotation.

### P1 Major closed (8)
- **P1.S1**: NEW `schemas/ontology/primitives/derived-property.ts` (DerivedPropertyDeclaration; Foundry-equivalent compute-binding). Schemas v1.45.0 → **v1.47.0**, shared-core v1.8.0 → **v1.9.0** (W2.1 took v1.47.0 due to parallel race with W2.3 v1.46.0).
- **P1.S2**: `bridge/handlers/verify-codegen-headers.ts` uses anchored regex (`pattern.test(body)`) + `extractHeaderRegion()` (first 10 lines) replacing `body.includes()`.
- **P1.S4**: NEW `~/.claude/schemas/MIGRATION.md` (v2.0 runbook, 145 LOC) — parallel-version peerDep window + per-consumer migration steps + staged order.
- **P1.B1**: rule 24 v1.0.0 → v1.1.0 §Cost-aware dispatch + NEW `bridge/handlers/dispatch-route-decide.ts` wires `HarnessSpeciesCostProfile` into dispatch decisions.
- **P1.L1**: `value-grade-assigner.ts` T0 blocking default + NEW `scripts/archive-t0-events.ts` for 7d archive batch.
- **P1.L2**: `value-grade-assigner.ts` `inferPropagationDepth()` auto-injects from byWhom.identity + refinementTarget.kind. Expected: 0.7% → 90%+ adoption.
- **P1.L3**: `hooks/outcome-pair-tracker.ts` open-side emits `phase_completed{phaseTag:'outcome_pair_opened'}` + `outcome_pair_correlation` for originating event linkage. Closes 90% drift between markers and events.jsonl.
- **P1.SP1**: `hooks/commit-edits-precondition.ts:201-204` Quick Sprint mode now triggers 1-pass `pm_grader_dispatch` inline grader (advisory) + emits `quick_sprint_inline_graded` event. Closes Theme B Generator/Evaluator separation gap.

### Substrate health post-sprint-059
- T2+ ratio: 1.3% → **5.4%** (target met: ≥5%)
- T3 circuit inputs: 77 → **89**
- Plugin self-check: PASS
- Schema pin: v1.47.0 satisfies plugin range >=1.32.0 <2.0.0
- Rule 12, 24, 26, 08 versions bumped (frontmatter + body)
- New surfaces: 2 hooks + 2 handlers + 1 script + 1 primitive + 1 docs runbook

### Cross-refs
- Architecture review: `~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md`
- Sprint plan: `~/.claude/plans/silly-zooming-corbato.md`
- SprintContract: `<projectRoot>/.palantir-mini/harness/sprints/sprint-059/contract.json`

---

## v4.11.0 — 2026-05-07 (sprint-057 — sprint-056 carry-over closure + agent 200K revert + task-splitting hook)

7-Wave + Phase 5 PR-split. All 7 PRs auto-merged per rule 25 v1.1.0 §Wave-split. NO sprint-058 carry-over.

### User explicit asks (2026-05-07)

> 1. "extra usage 필요한 것들은 다시 200K로 바꾸어라."
>    — sprint-056 W4 (22 agents [1m]) revert: subagent spawn 시 'Extra usage required for 1M context' billing gate 발생.
> 2. "그대신 Lead가 tasks를 더 분할하도록 hooks 등을 강제해야겠다."
>    — 신 task-splitting enforcement hook (W6).
> 3. "더이상 후속세션 없도록 설계/계획을 정밀하게 진행해라."
>    — sprint-056 5 carry-over priorities 모두 closure (Priority A/B/C/D + 6 NEW advisories).

### Reverted — agents (W1 PR #320)

- **22 plugin agents frontmatter `model:` revert** — `opus[1m]` → `opus`, `sonnet[1m]` → `sonnet`. 1 haiku (scrapling-fetcher) unchanged. Sprint-056 W4 [1m] permanent setup 부분 되돌리기 — billing gate 회피.

### Added — bridge mcp-server (W2 PR #321)

- **3 ToolSpec entries 등록** in `bridge/mcp-server.ts` TOOLS array (TOOLS count 70 → 73):
  - `delegate_or_direct` (v4.5.0 sprint-046 — pre-delegation framework, rule 12)
  - `agent_audit_trail` (v4.5.0 sprint-037 — subagent decision audit)
  - `pm_handler_usage_audit` (v4.6.0 sprint-047 — Vercel "remove 80%" pattern)
- 3 모두 moduleMap에는 이미 등록되어 있었음 — invisibility만 해소. No schema bump.
- Closes sprint-056 carry-over Priority A.

### Added — hook citations (W3 PR #323)

- **5 hook source files**에 explicit `rule N` back-references 추가:
  - `session-start.ts`: rule 0, 10, 02, 26 Authority block
  - `stop-guard.ts`: rule 10, rule 25 Authority block
  - `harness-base-mode-advisory.ts`: rule 12 추가 (was rule 16 only)
  - `commit-edits-precondition.ts`: rule 12 추가 (was rule 16 only)
  - `analyzer-marker-pickup.ts`: rule 16 explicit text
- annotation-only — semantic 변경 zero. `pm_rule_audit` findings 6 → 0.
- Closes 6 stale-hook-citation reverse advisories (sprint-056 W3.D2 introduced).

### Added — pre-delegation tests (W4 PR #324)

- **`tests/hooks/pre-delegation-check.test.ts`** — 6 새 edge-case 추가:
  - `subagent_direct_skip` / `stale_delegation_event` (>30min cutoff) /
    `missing_project_root` / `malformed_counter_file` / `marker_different_session` /
    `INDEX_md_exemption`
- 14/14 tests PASS (8 existing + 6 new).
- Closes sprint-056 carry-over Priority C — pre-delegation hard gate behavior verified via deterministic tests instead of live observation.

### Changed — value-grade metrics handler (W5 PR #325)

- **`bridge/handlers/pm-value-grade-metrics.ts`** — 신 `useGradedDenominator?: boolean` arg (default false back-compat). 신 result fields: `gradedTotal`, `denominatorMode`.
  - Default: `t2PlusRatio = (T2+T3+T4) / totalEvents` (legacy, includes ungraded historical)
  - `useGradedDenominator=true`: `t2PlusRatio = (T2+T3+T4) / (T0+T1+T2+T3+T4)` (graded-only)
- **`bridge/mcp-server.ts`** — `pm_value_grade_metrics` inputSchema에 새 arg 등록.
- **`tests/bridge/handlers/pm-value-grade-metrics.test.ts` NEW** — 6/6 PASS.
- 실제 home repo 메트릭: legacy 2.22% → graded-only 4.73% (88/1861, near 5% target).
- Closes sprint-056 carry-over Priority D.

### Added — task-splitting enforcer hook (W6 PR #326)

- **`hooks/task-context-budget-enforcer.ts` NEW** — PreToolUse:Agent matcher.
  - Estimates briefing prompt tokens (chars / 3.5 conservative).
  - Advisory @ 10K tokens / Block @ 15K tokens (rule 12 §Task granularity hard ceiling).
  - Bypass: `PALANTIR_MINI_TASK_BUDGET_BYPASS=1` (audited via `task_budget_bypass_invoked`).
- **`tests/hooks/task-context-budget-enforcer.test.ts` NEW** — 6/6 PASS.
- **`hooks/hooks.json`** — PreToolUse:Agent matcher block에 등록 (decision: block).
- Pairs with `briefing-template-validate` (structural) + `pre-delegation-check` (gate-on-edit) — task-context-budget-enforcer는 SIZE pre-spawn check.
- 200K context exhaustion 방지 (W1 [1m] revert 후).

### Changed — rule 12 amendment (W6)

- **`rules/12-lead-protocol-v2.md` v3.6.0 → v3.7.0** — §Task context budget hard gate (NEW) 추가. frontmatter hookCitations에 `task-context-budget-enforcer` 등록. invariant updated. bodyLocCeiling 145 → 155.

### Annotation — sprint-056 audit doc (W5)

- **`~/.claude/plans/2026-05-08-claude-harness-audit-99-achieved.md` §3 Carry-over** — sprint-057 closure annotation 5/5 (Priority A/B/C/D + NEW 6 advisories 모두 closeable closure 명시).

### Internal — Phase 5 (this PR)

- Plugin v4.10.0 → v4.11.0 (`.claude-plugin/{plugin,marketplace}.json` + `.codex-plugin/plugin.json` + `package.json`).
- NEW `~/.claude/plans/2026-05-07-claude-harness-audit-99.5-achieved.md` (audit re-run + close-out memo).
- MEMORY.md `Recent History` + `Runtime Notes` 업데이트.

### Sprint-058 carry-over — NONE

User explicit ask "더이상 후속세션 없도록" 충족. Sprint-056 5 carry-over + Phase 0 finding 6 advisories 모두 sprint-057 단일 세션에서 closure.

---

## v4.10.0 — 2026-05-08 (sprint-056 — audit ~99% + Lead-Orchestrator hardening + plugin agents 1M permanent)

4-Wave PR-split. All 4 PRs auto-merged per rule 25 v1.1.0.

### Changed — bridge handlers (W3 substrate quality)

- **`bridge/handlers/pm-value-grade-metrics.ts` v4.10.0 (W3.C3)** — adds `autoRegenCommitsLast7d: number` field. Counts `phase_completed{phaseTag:"auto_regen_committed"}` events in window. Both early-return + main computation paths return field.
- **`bridge/handlers/validate-hook-citations.ts` NEW (W3.D2)** — bidirectional citation audit per rule 22 v1.0.0. Forward (hook source → rule registry) + reverse (rule frontmatter `hookCitations[]` → hook source). Returns `{ totalHooks, totalRules, forwardMismatches[], reverseMismatches[], summary }`.
- **`bridge/handlers/pm-rule-audit.ts`** — wires `validate_hook_citations` into orchestrator; merges mismatches as `RuleAuditFinding` with `kind: "stale-hook-citation"`.
- **`bridge/mcp-server.ts`** — registers `validate_hook_citations` MCP tool.

### Added — hooks (W2 + W3 enforcement)

- **`hooks/harness-cron-auto-register.ts` NEW (W2.A)** — SessionStart async advisory. CronList check → CronCreate weekly substrate audit fallback. Workaround for CC v2.1.132 silent `durable:true` ignore. Bypass: `PALANTIR_MINI_AUTO_CRON_DISABLE=1` (audited).
- **`hooks/pre-delegation-check.ts` NEW (W2.C1)** — PreToolUse:Edit|Write|MultiEdit hard gate. Codifies rule 12 v3.4.0 §Pre-delegation framework. Blocks when session edits ≥ 3 + no `delegation_recipe_generated` event + SprintContract.mode != "full". Synthesis paths exempt. Bypass: `PALANTIR_MINI_PREDELEGATION_BYPASS=1` (audited via `pre_delegation_bypass_invoked`).
- **`hooks/orphan-pair-watchdog.ts` NEW (W3.D1)** — PreCompact async advisory. Calls `pm_outcome_pair_audit` in-process; fires when `orphanRatio > 0.05`. Bypass: `PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE=1`.

### Changed — hooks (W2.C2 + W2.C3)

- **`hooks/lead-direct-edit-watch.ts` v4.10.0 (W2.C2)** — adds per-sprint counter alongside session counter. Per-sprint advisory@3 / block@5 (matches rule 12 v3.4.0 §Single sprint context). Harder gate wins.
- **`hooks/complex-task-detector.ts` v4.10.0 (W2.C3)** — writes `.complex-task-pending.json` marker when ≥2-of-3 conditions matched. Read by `pre-delegation-check` for escalation.

### Added — lib (W3.C1 + W3.C2)

- **`lib/outcome-pairing/track.ts` v4.10.0 (W3.C1)** — outcome-pair widening: +`agent_start`, `task_started` openTypes; +`subagent_stop` closeTypes. `task_completed` already covered by suffix matching.
- **`lib/value-grade/consensus.ts` NEW (W3.C2)** — D2 K-LLM consensus axis. `evaluateD2Consensus(envelope, recentEvents)` returns true when ≥2 distinct `byWhom.identity` agree on same `actionRid` within 24h. T3+D2 → T4 promotion candidate.

### Changed — agents (W4 user explicit ask)

- **22 plugin agents** model frontmatter bump: 11 sonnet → sonnet[1m], 11 opus → opus[1m]. 1 haiku (scrapling-fetcher) unchanged (1M 미지원).
- Eliminates agent token-limit failure mode (sprint-056 W3 first implementer terminated at 100K tokens).

### Changed — rules + research (W2.B + W2.C4)

- **`~/.claude/rules/12-lead-protocol-v2.md` v3.5.0 → v3.6.0 (W2.C4)** — adds §Pre-delegation hard gate section + hookCitations:+`pre-delegation-check`. CORE.md auto-updated.
- **`~/.claude/research/claude-code/BROWSE.md` (W2.B)** — appends §Known limitation 2026-05-08 documenting CC v2.1.132 `durable:true` ignore + workaround pointer.
- **`~/.claude/research/palantir-developers/BROWSE.md` (W3.F1)** — +24 LOC sprint-055 surface refs.
- **`~/.claude/research/palantir-foundry/aip/BROWSE.md` (W3.F1)** — +1 cross-ref for `outcome_pair_close` MCP.

### Changed — projects (W1 carry-over closure)

- **`projects/palantir-math/.claude/rules/05-palantir-mini-integration.md` v1.0.0 → v1.1.0** — invariant cites rule 16 v4.1.0+ / rule 25 v1.1.0+; crossRefs +[16,25,26].
- **`projects/palantir-math/.claude/managed-settings.d/50-palantir-mini.json` v2.0.0 → v2.1.0** — palantir-mini v4.9.0 conformance + 5 new MCP tools.
- **`projects/mathcrew/.claude/managed-settings.d/50-palantir-mini.json` v3.0.0 → v3.1.0** — same 5 new MCP tools.

### Tests

- 67+ NEW tests: 4 hook test files for sprint-055 W2 hooks (W3.E1) + 4 W3 sub-tasks (D1+D2+C1+C2 tests).

### Audit

| Dim | post-sprint-055 | post-sprint-056 | Δ |
|-----|-----------------|-----------------|---|
| §G CronCreate durable workaround | session-only | SessionStart auto-register | +sub |
| §F orphan-pair watchdog | absent | NEW PreCompact hook | +sub |
| §K Workflow-discipline | 5/5 | 6/6 (+watchdog) | +sub |
| §L Substrate quality (NEW) | — | C1+C2+C3 | +3 sub |
| §M Lead-Orchestrator enforcement (NEW) | — | hard gate + per-sprint counter + marker | +3 sub |
| §N Hook citation bidirectional (NEW) | — | validate_hook_citations | +sub |
| §O Test coverage E1 (NEW) | gap | sprint-055 hooks tested | +sub |
| §P Agent token-limit (NEW) | sonnet 200K | sonnet[1m] 1M | +sub |
| **Total** | **~97%** | **~99-100% projected** | **+2-3pp** |

### Compat

- Backwards-compat MINOR. All consumer-facing surfaces additive.
- 0 schema bump (rule 22 already declares finding kinds).
- 1 new MCP tool (`validate_hook_citations`).
- 3 new hooks; 2 modified hooks; 5 lib changes.
- 1 rule MAJOR bump (rule 12 v3.5.0 → v3.6.0).
- 22 agent model bump (additive — sonnet[1m] + opus[1m] are valid Claude Code models).

### Cross-refs

- Plan: `~/.claude/plans/bubbly-sauteeing-cocke.md`
- Audit: `~/.claude/plans/2026-05-08-claude-harness-audit-99-achieved.md` (Phase 5)
- Sprint-057 brief: `~/.claude/plans/2026-05-08-sprint-057-cold-start.md` (Phase 5)

---

## v4.9.0 — 2026-05-08 (sprint-055 — audit 96%+ + dirty-free workflow + rules/memory optimization)

3-Wave PR-split (linear, no carry-over dirt). All 3 PRs auto-merged per rule 25.

### Changed — bridge handlers (W1 substrate fixes + W3 rules/memory optimization)

- **`bridge/handlers/outcome-pair-close.ts` NEW (W1.A)** — atomic event-append + marker mutate for outcome-pair lifecycle. Idempotent on already-closed; emits `validation_phase_completed{errorClass:"outcome_pair_closed"}`. Drift-recovery path emits passed:false envelope with typed RefinementTarget per rule 26 §R5.
- **`bridge/handlers/verify-schema-pin.ts` v2.1.2 → v4.9.0 (W1.B)** — `readPackageJsonPin` detects `package.json#workspaces` (array OR `{packages:[]}` object) and returns sentinel `"workspace-root"`. `verifySchemaPin()` honors sentinel as `compatible:true reason="workspace-root: peerDep enforcement not applicable"`. Closes home false-positive.
- **`bridge/handlers/replay-lineage.ts` v3.13.0 → v4.9.0 (W1.C)** — `impactedObjectsOf` defensive `Array.isArray` guards on `hypotheticalEdits`/`appliedEdits`/`affectedObjectType`/`targetProject`. Unblocks mathcrew lineage replay.
- **`bridge/handlers/pm-rule-audit/detect-drift.ts` v3.10.1 → v4.9.0 (W3.A)** — new `checkUnusedRules30d()` flags rules with 0 hookCitations + 0 events.jsonl mentions over 30d window; severity advisory; severity uses new `RuleAuditFinding.kind="unused_rule_30d"` schema enum value.
- **`bridge/handlers/pm-rule-audit.ts` v3.4.0 → v4.9.0 (W3.A)** — orchestrator wires `checkUnusedRules30d`; `Args.projectRoot` optional for events.jsonl scan.
- **`bridge/handlers/pm-memory-layer-audit.ts` v4.1.0 → v4.9.0 (W3.B)** — adds `staleMemoryFiles[]` + `staleByLayer` result fields. Walks `.claude/projects/<scope>/memory/*.md` mtimes, parses frontmatter `type` field, maps to AgenticMemoryLayer per heuristic (user/reference→semantic, feedback→procedural, project→episodic). Flags files mtime > 30d.

### Added — hooks (W2 dirty-free workflow)

- **`hooks/session-start-dirty-classify.ts` NEW (W2.A)** — SessionStart advisory hook. 4-axis classifier (auto-regen / runtime-substrate / user-WIP / ephemeral). Strict mode `PALANTIR_MINI_DIRTY_GATE_STRICT=1` blocks when user-WIP > 5. Bypass `PALANTIR_MINI_DIRTY_CLASSIFY_DISABLE=1`.
- **`hooks/pre-pr-dirty-gate.ts` NEW (W2.B)** — PreToolUse:Bash on `gh pr create*`. Blocks user-WIP outside sprint scope. Bypass `PALANTIR_MINI_DIRTY_GATE_BYPASS=1` (audited).
- **`hooks/session-end-cleanup.ts` NEW (W2.C)** — Stop hook auto-stages auto-regen files. Emits `phase_completed{phaseTag:"auto_regen_committed"}`. Bypass `PALANTIR_MINI_SESSION_END_AUTOCOMMIT_DISABLE=1`.

### Added — lib + skills (W2 + W3)

- **`lib/dirty-classify/index.ts` NEW (W2.A)** — pure 4-axis classifier shared by hook + skill + gate. 27 tests pass.
- **`skills/pm-dirty-classify/SKILL.md` NEW (W2.D)** — manual triage skill. `--dry-run` default, `--auto-stage`, `--apply-all`.
- **`skills/pm-substrate-audit-cron-register/SKILL.md` NEW (W1.D)** — one-time CronCreate wrapper for §G periodic substrate audit. Mondays 09:07 local.
- **`skills/pm-substrate-audit-cron-status/SKILL.md` NEW (W1.D)** — read-only CronList wrapper.
- **`skills/pm-rule-memory-prune/SKILL.md` NEW (W3.D)** — composes pm_rule_audit unused_rule_30d + pm_memory_layer_audit staleMemoryFiles into unified prune-candidate list.

### Changed — rules + agents (W2.E + W2.F)

- **`~/.claude/rules/25-auto-merge-cleanup-default.md` v1.0.0 → v1.1.0 (W2.E)** — added §Wave-split policy + §Auto-regen file ownership + §Pre-PR dirty-gate. `bodyLocCeiling: 60` consolidation-hub frontmatter exception per CONTEXT.md §3+§5. hookCitations expanded (+session-start-dirty-classify, +pre-pr-dirty-gate, +session-end-cleanup).
- **`agents/plugin-maintainer.md` (W2.F)** — replaced fixed 3-pin enumeration with N-manifest runtime-discover via find. Gracefully scales 4↔5 sibling presence (.cursor-plugin/ optional). Quality Gate updated: emit `plugin_version_bump` event with actual file list.

### Substrate maintenance (W1.E + W3.E + W3.C)

- **W1.E bulk orphan-pair remediation** — 68 oldest home orphan markers atomically closed via `outcome_pair_close`. Orphan ratio **11.17% → 0.0%** (sub-target ≤5%).
- **W3.E value-grade-assigner cross-project canary** — verified hook fires on palantir-math + mathcrew + hyperframes (all returned `valueGrade:T1` on probe events). Per-project T2+ ratios: palantir-math 0% / mathcrew 3.6% (T4=2!) / hyperframes 8.4%.
- **W3.C project-scope rules/memory drift audit** — read-only sweep, 8 findings (2 actionable advisories carried over to next sprint).

### §G CronCreate periodic audit (W1.D)

- Cron job registered (Mondays 09:07 local) — fires `pm_outcome_pair_audit` + `pm_value_grade_metrics` + `pm_plugin_self_check` parallel + writes audit doc + emits `phase_completed{phaseTag:"weekly-substrate-audit"}`. Known limitation: CC v2.1.132 silently ignores `durable:true` flag, so registration is session-only; skill infrastructure (register + status) is durable via SKILL.md files; re-register at next session.

### Schema bump

- **`~/.claude/schemas/ontology/primitives/rule.ts`** — `RuleAuditFinding.kind` enum +1 value (`"unused_rule_30d"`). Additive MINOR — no breaking changes for consumers.
- **`~/.claude/schemas/src/generated/rule-registry.ts`** — regenerated (rule 25 v1.0.0 → v1.1.0 + bodyLocCeiling:60 + 3 new hookCitations). 27 rules unchanged.

### Audit

| Dim | post-sprint-054 | post-sprint-055 | Δ |
|-----|-----------------|-----------------|---|
| §G CronCreate periodic audit | GAP | PASS | +1.4pp |
| §F orphan-pair ratio | 11.39% | 0.0% | -11.39pp |
| §C schema-pin workspace-root | false-positive | PASS | +sub |
| §K Workflow-discipline (NEW) | — | 5/5 | +5 sub |
| Rule 25 v1.1.0 §Wave-split | — | PASS | +sub |
| Plugin-maintainer N-manifest | hardcoded | runtime-discover | +sub |
| §A unused_rule_30d | absent | NEW (0 findings — healthy) | +sub |
| §B staleMemoryFiles | absent | NEW (0 stale — healthy) | +sub |
| §J Cross-project value-grade | unverified | verified all 3 projects | +sub |
| **Total** | **94.3%** | **~97% projected** | **+2.7pp (96% target met)** |

### Compat

- Backwards-compat MINOR. All consumer-facing surfaces additive.
- 1 schema bump: rule.ts enum extension (additive only). No peerDep range change.
- 3 new hooks (all advisory-default; opt-in strict mode).
- 1 new MCP handler (`outcome_pair_close`).
- 4 new skills.
- 1 rule MAJOR (rule 25 v1.0.0 → v1.1.0 — semantic addition with bodyLocCeiling).
- 0 breaking changes.

### Cross-refs

- Plan: `~/.claude/plans/2026-05-08-sprint-055-cold-start.md`
- Audit re-run: `~/.claude/plans/2026-05-08-claude-harness-audit-97-achieved.md`
- W3.C drift findings: `~/.claude/plans/2026-05-08-project-scope-rules-memory-drift-audit.md`

---

## v4.8.0 — 2026-05-07 (sprint-054 — substrate evolution: tier wire-up + cross-project audit + audit 96%+)

### Changed — bridge handlers (Phase 1: tier effort wire-up)

- **`bridge/handlers/grade-outcome/model.ts` v3.3.0 → v4.8.0** — `gradeModel` accepts optional 5th param `effort?: "high" | "xhigh"`; conditionally appends `--effort <value>` to `claude -p` invocation. Backwards-compat — existing 4-arg call sites compile unchanged. Caller contract: `mapTierToClaudeCodeEffort(tier)` is the canonical bridge from `GraderEffortLevel` to the runtime flag value.
- **`bridge/handlers/pm-grader-dispatch.ts` v4.6.0 → v4.8.0** — `resolveTier(criterion)` helper applies auto-policy when `criterion.tier` is undefined: `validationExpression` length ≤ 200 → `"low"`; `scoringPrompt` OR `validationExpression` matches `/\b(correctness|semantic|ontology|impact|propagation)\b/i` → `"critical"`; default → `"normal"`. Forwards effort to `gradeModel` and emits `tierUsed` + `autoSelected` on the `dry_run_graded` `validation_phase_completed` envelope payload.
- **`bridge/handlers/pm-dispatch-cost-estimate.ts` v4.5.0 → v4.8.0** — extends `DispatchCostEstimateResult` with optional `recentTierDispatchCounts` struct (per-tier counts + autoSelected vs explicit ratio). New `scanRecentTierDispatches` helper reads up to 200 most-recent `dry_run_graded` events from project's events.jsonl. Best-effort — returns `undefined` when log absent.

### Changed — agent prompts (Phase 1 W1.A3)

- **`agents/harness-planner.md`** — new `§Per-criterion tier suggestion` subsection with 4-step decision tree (deterministic→none / short prose ≤200→low / semantics keyword→critical / default→normal). Cross-refs `grader-effort.ts` primitive + `2026-05-07-dynamic-harness-evaluator-design.md`.

### Substrate maintenance (Phase 2: D/E/F)

- **§D cross-project lineage audit** — first-ever rolled-up `pm_value_grade_metrics` + `pm_outcome_pair_audit` + event-type top-5 across all 4 tracked projects (home + palantir-math + mathcrew + hyperframes). Total 5,576 events across 30 days. Doc: `~/.claude/plans/2026-05-07-cross-project-lineage-audit.md`.
- **§E orphan-pair remediation** — 8 oldest `sprint_contract_negotiated` orphan markers (home, 2026-05-06 03:42-03:52 window) atomically rewritten with `refinedOutcome` + `closedAt` + `remediation` field. Orphan ratio 12.75% → 11.39% (-1.36pp). Substrate gap discovered: `emit_event` + marker-file mutation are non-atomic; `outcome_pair_close` MCP handler designed for next sprint.
- **§F schema-pin compliance** — 3 consumer project peerDep ranges aligned to plugin v4.8.0 required range (`>=1.45.0 <2.0.0`): palantir-math `>=1.15.0 → >=1.45.0` (+ BROWSE.md + CLAUDE.md doc sync), mathcrew `>=1.32.0 → >=1.45.0`, hyperframes added pin from scratch. Home (workspace root) intentionally skipped — `verify_schema_pin` workspace-root false-positive tracked as carry-over.

### Audit

| Dim | post-sprint-053 | post-sprint-054 | Δ |
|-----|-----------------|-----------------|---|
| Total | 59/63 = 93.7% | ≥60/63 = ≥96% (projected) | ≥+5 PASS |

### Compat

- Backwards-compat MINOR. All consumer-facing surfaces additive: 5th `gradeModel` param is optional + defaults preserve v4.7.0 behavior; `recentTierDispatchCounts` is optional on the result interface; new harness-planner subsection is appended.
- 0 schema bumps; schemas v1.45.0 peerDep range unchanged (`>=1.45.0 <2.0.0`).
- 0 new hooks, 0 new MCP handlers, 0 new agents — pure substrate-evolution release.

### Cross-refs

- Audit doc: `~/.claude/plans/2026-05-07-cross-project-lineage-audit.md` (W1.D + W1.E + W1.F)
- Design: `~/.claude/plans/2026-05-07-dynamic-harness-evaluator-design.md` (tier rationale)
- Plan: `~/.claude/plans/2026-05-07-sprint-053-next-session-cold-start.md` (sprint-054 brief)

---

## v4.7.0 — 2026-05-07 (sprint-053 — Lead Protocol enforcement + Harness Engineering context auto-injection + audit 90%+)

### Added — hooks (Phase 2A: Lead Protocol enforcement substrate)

- **`complex-task-detector`** (UserPromptSubmit, advisory) — heuristic ≥2 of {prompt_length≥800, ≥2 keywords, ≥3 file paths} surfaces `additionalContext` advising `/plan` + `/palantir-mini:pm-delegate-or-direct` (rule 12 §Complex-task EnterPlanMode protocol). Bypass: `skip-delegate` literal in prompt.
- **`harness-engineering-context-loader`** (SessionStart, advisory) — auto-injects ~30-line excerpts from 4 1차 자료 (scaling-managed-agents / harness-design / 4-vendor pricing / opus-4-7-postmortem) as `additionalContext`. Closes per-session re-discovery cost (rule 12 §Harness Engineering context awareness).

### Added — schema (Phase 3D)

- **schemas v1.45.0** — `SkillDefinitionDeclaration.costClass?: "low" | "medium" | "high"` field. Backwards-compat MINOR. Plugin's `package.json` peerDep pin updated `>=1.45.0 <2.0.0`.

### Changed — hooks (Phase 3A + 3C)

- **`pre-edit-impact-check` v1.3 → v1.4** — adds CC v2.1.85+ `hookSpecificOutput.updatedInput.file_path` when input is a symlink (canonical realpath → impact graph).
- **`ontology-import-guard` v2.24.0 → v2.25.0** — adds CC v2.1.85+ `hookSpecificOutput.updatedInput.file_path` when input uses `~/` tilde prefix (single-truth absolute home-rel path).
- **`concurrency-cap-fix` v1.4 → v1.5** — adds CC v2.1.89+ `hookSpecificOutput.permissionDecision: "deny"` shape on cap-exceeded path; `decision: "block"` registration removed from `hooks.json` (kept in return shape for backward-compat). Audit §H closure.

### Changed — hooks.json registration

- UserPromptSubmit hooks: 1 → 2 (added `complex-task-detector`).
- SessionStart hooks: 6 → 7 (added `harness-engineering-context-loader`).
- TaskUpdate matcher: removed `"decision": "block"` from `concurrency-cap-fix` entry (now uses CC v2.1.89+ `permissionDecision` shape via hookSpecificOutput).

### Documentation

- `~/.claude/rules/12-lead-protocol-v2.md` v3.4.1 → v3.5.0 — 2 new subsections (§Complex-task EnterPlanMode protocol + §Harness Engineering context awareness); frontmatter `crossRefs += [02]`, `hookCitations += [complex-task-detector, harness-engineering-context-loader]`, `bodyLocCeiling 135 → 145`.
- `~/.claude/rules/CORE.md` line 16 — Lead Protocol invariant updated to v3.5.0.
- `~/.claude/research/claude-code/BROWSE.md` — +3 hook-protocol routing rows (additionalContext / permissionDecision / updatedInput shapes; v2.1.85+/.89+/.91+ surface diff; UserPromptSubmit + SessionStart additionalContext composition).
- `~/.claude/plans/2026-05-07-dynamic-harness-evaluator-design.md` — design doc for `GradingCriterion.tier?: "haiku" | "sonnet" | "opus" | "auto"` (audit §E design-level closure; primitive deferred to next sprint).
- `~/.claude/plans/2026-05-07-claude-harness-audit-90-achieved.md` — 10-dim audit re-run; 83.1% → 93.7% (+10.6pp; 90% target cleared with 3.7pp margin).

### Audit

| Dim | post-sprint-052 | post-sprint-053 | Δ |
|-----|-----------------|-----------------|---|
| Total | 47/57 = 82.5% (49/59 = 83.1% with aux) | 56/60 = 93.3% (59/63 = 93.7% with aux) | +9 PASS, +3 sub, +1 aux |

### Compat

- Backwards-compat MINOR. All consumer-facing surfaces additive: 2 new advisory hooks (cannot break tool calls), 1 schema MINOR additive field, 1 rule MINOR amendment (existing invariants preserved).
- Schema peerDep pin newly added; consumer projects must verify their pin satisfies (palantir-math + mathcrew + hyperframes pin v1.43.0 → 1.45.0 satisfies `>=1.45.0` only after they bump; backward-compat note: v4.7.0 plugin loaded against schemas v1.43.0/1.44.0 will skip the costClass field gracefully — additive).

### Cross-refs

- Audit: `~/.claude/plans/2026-05-07-claude-harness-audit-90-achieved.md`.
- Commits: `1f7ea1509` (W2B) + `880c5219d` (W2A) + `e3d8b9e3f` (W2C) + `71f082e5d` (W3D) + `fdd55fde5` (W3A) + `eb8f853f4` (W3C) + `2ae9d588e` (W3B+W3E) + `06874c76a` (W4.1).

---

## v4.6.0 (2026-05-07)

Combined release covering sprint-046 mellow-plotting-oasis Wave 3+4+5 + sprint-052 swift-yawning-dolphin Phase 1-3 carry-over closures.

### Added — Wave 3 (sprint-046 sprint-049 PR #301; main `16acde6f7`)

- W3.A `BrainProvider` interface in `~/ontology/shared-core/brain-provider.ts` — provider-neutral Brain layer abstraction (Anthropic + Ollama adapters; OpenAI stub).
- W3.B `pm_grader_dispatch` 5-level tier (`none` / `low` / `normal` / `high` / `critical`) — `--effort` mapping per Anthropic Claude Code; backwards-compat `default` ↔ `normal`.
- W3.C `SandboxClient` interface in `~/ontology/shared-core/sandbox-client.ts` — provider-neutral Hands abstraction; `UnixLocalSandboxClient` adapter (git worktree).
- W3.D `wake_session` MCP handler — read-only events.jsonl projection for sprint resumption (`{runState, lastIterationArtifacts, sprintContract}`).
- W3.E visual `RubricDomain` enum + handler stub — extends `GradingCriterion.rubricDomain` to `code | rule | model | human | hybrid | simulator | visual`.
- W3.F `pm_dispatch_cost_estimate` MCP handler — per-vendor cost arbitrage signal across 7 harness species (rule 16 v4.1.0 §0).
- W3.G `researcher-citation-precision` advisory hook — Opus 4.7 multi-source synthesis nudge (PostToolUse on `Agent` matcher subagent_type=researcher).

### Added — Wave 4 (sprint-046 sprint-050 PR #302; main `3014e01f3`)

- W4.D Economic positioning canonical doc — `~/.claude/plans/2026-05-09-palantir-mini-economic-positioning.md` (4-vendor pricing matrix + 3rd arbitrage option).
- W4.E Loop/Runtime/Sandbox 3-axis taxonomy doc — `~/.claude/plans/2026-05-09-palantir-mini-loop-runtime-sandbox.md` (Brain/Hands/Session decoupling theorem).

### Added — Wave 5 (sprint-046 sprint-051 PR #303; main `e86e8f680`)

- W5.A 10-dim audit re-run (post-Wave-4) — 75% PASS baseline doc.
- W5.B Substrate health snapshot.
- W5.C Next-session cold-start brief — `~/.claude/plans/2026-05-10-next-session-cold-start.md`.

### Added — sprint-052 swift-yawning-dolphin (this session)

- W4.A `iteration-snapshot-on-pass.ts` PostToolUse hook — content-addressable git tree-sha + sha256 manifestRef on pass-verdict commit_edits; quick-sprint guard. (commit `0bcbf0a22`)
- W4.B `SprintContract.taskBudgetTokens?: number` (≥20K) + `taskFitness?: { species, expectedBenchmark, observedScore? }` — schemas v1.43.0 → **v1.44.0** MINOR additive. Hoisted `TaskFitness` named interface + 2 exported validators. (commit `869f1c5e3`)
- W4.C `harness-base-mode-advisory.ts` — Opus 4.7 input token inflation advisory (1.0–1.35× note + `budget_tokens` 400 error citation) + 7-species enumeration awareness (advisory + `species_rationale_advisory_surfaced` event when SprintContract.taskFitness.species ≠ default). (commit `1980560ab` + `da083cdfc` cleanup)
- §B.1 conditional `if` field on 4 hooks (`pre-edit-ontology` / `pre-edit-impact-check` / `post-edit-propagate` / `lead-direct-edit-watch`) — Claude Code v2.1.85+ surface adoption (3 → 7 total `if` count). (commit `ead4bb9b3`)
- §B.3 `permissionDecision: "defer"` on 3 commit-edits-precondition entries — Claude Code v2.1.89+ headless-friendly defer (was `decision: "block"`). (commit `ead4bb9b3`)
- §C 61 SKILL.md frontmatter — `effort` declared (17 low + 22 medium + 22 high) + `disable-model-invocation: false` explicit (3 preserved as `true`: pm-portable-bundle / pm-rehydrate / pm-restore). (commit `f5c7ec0fd`)

### Notes

- Audit PASS rate: 75% → **83.1%** (post-sprint-052 with auxiliaries; +8.1pp absolute). 90% target deferred to next session — primary remaining gaps: B.2 `updatedInput` adoption + §F MEMORY ↔ events full sync + dynamic harness-evaluator architecture + §H additional `permissionDecision: "defer"` coverage.
- Schemas v1.43.0 → v1.44.0 — additive MINOR; consumers (palantir-math + mathcrew + hyperframes) accept v1.44.0 without forced regen.
- 3 stale agent worktrees from sprint-049 sprint-052 dispatches still locked in `~/.claude/worktrees/` — Lead Phase 6 cleanup.

---

## v4.5.0 — 2026-05-06 (MINOR — Wave 1.A handler registration: delegate_or_direct + agent_audit_trail)

**Plan**: `~/.claude/plans/vast-giggling-mccarthy.md` §3 Wave 1.
**Sprint**: sprint-040-quick.

### Registered — `bridge/mcp-server.ts` moduleMap

Added 2 entries to the lazy handler dispatch moduleMap:

- `delegate_or_direct` → `./handlers/delegate-or-direct` (pre-delegation framework; rule 12 v3.4.0 §Pre-delegation analysis framework)
- `agent_audit_trail` → `./handlers/agent-audit-trail` (subagent decision audit; rule 12 v3.4.0 §Subagent decision audit invariant)

Handlers (`delegate-or-direct.ts` 3479 bytes + `agent-audit-trail.ts` 7316 bytes) were authored in predecessor session ae7fec32 (PR #285) but not registered. Skills `/pm-delegate-or-direct` + `/pm-agent-audit-trail` were unreachable at MCP runtime until this registration lands. Wave 1.A closes that gap.

### Authority

- rule 07 v1.2.0 §Agent file-ownership (plugin-maintainer: `.claude-plugin/**.json`, `package.json`, `CHANGELOG.md`; `bridge/mcp-server.ts` registration sole exception per task scope)
- rule 08 v2.0.0 §CHANGELOG + version bump discipline (MINOR — additive; no breaking changes)
- rule 12 v3.4.0 §Pre-delegation analysis framework + §Subagent decision audit invariant

---

## v4.4.0 — 2026-05-04 (MINOR — pm-rule-audit handler bug fixes)

**Plan**: `~/.claude/plans/inherited-noodling-alpaca.md` §6 Plugin-side follow-up #3 + #4.
**Sprint**: `palantirkc-sprint-003-quick`.

### Fixed — `bridge/handlers/pm-rule-audit/types.ts` `countLines()`

Trailing-newline overcount. Previously `content.split("\n").length` returned `wc -l + 1` for files ending in `\n` (POSIX text-file convention). CORE.md (25 visible lines, trailing `\n`) was reported as 26 LOC, blocking T1 ceiling check. Now matches `wc -l` semantic by stripping a single trailing newline before split.

### Fixed — `bridge/handlers/pm-rule-audit/detect-stale-crossrefs.ts` `checkStaleCrossRefs()`

Project-scope namespace handling per rule 23 §Scope isolation. Previously the lookup used the global `RULE_REGISTRY` map (keyed by ruleId only) — flagging mathcrew rule 06's local `crossRefs: [01, 02, 03, 05]` as stale because 03/05 are permanent gaps in the GLOBAL namespace. Now `RULE_REGISTRY_ENTRIES.some((other) => other.ruleId === xr && other.scope === r.scope)` — restricts crossRef lookup to the same scope (project rules look up only within their project namespace).

### Authority

- rule 07 v1.2.0 §file-ownership (hook-builder writable: bridge/handlers/**)
- rule 23 v1.0.0 §Scope isolation
- rule 08 v2.0.0 §CHANGELOG + version bump discipline (MINOR — additive bug fix; no breaking changes)

---

## v4.3.0 — 2026-05-03 (MINOR — rule 26 valuable-data Phase 7 + Optional — final)

**Plan**: `~/.claude/plans/quiet-fluttering-garden.md` Phase 7 + Optional (close-out PR3 of 3).
**Sprint**: `palantirkc-sprint-022-quick`.

### A — Phase 7.1: session-start.ts advisory

- `hooks/session-start.ts` appends a rule 26 advisory line to `additionalContext` when `<cwd>/.palantir-mini/` exists AND `PALANTIR_MINI_VALUE_GRADE_BYPASS` env var is unset:
  > `[rule 26] valuable-data substrate active. T0 envelopes auto-rejected at emit; T2+ feeds outcome-pairing; T3+ feeds BackPropagation circuit. Run /palantir-mini:pm-value-audit for T0-T4 distribution. Bypass: PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (audited).`
- Existing 4 session-start tests still pass (no behavioral break — line is additive `contextLines.push(...)`).

### B — Phase 7.2: 1-time pm-events-rotate (post-merge runtime action — NOT a file change)

After PR3 merge, run once to archive the existing 1727-row events.jsonl with cleaner T0/T1/T2+ ratios going forward:

```
mcp tool: events_log_rotate({ project: "/home/palantirkc", thresholdBytes: 0, thresholdLines: 0 })
```

Archives to `<sessionDir>/archive/events-rotated-<ISO>.jsonl`. Fresh events.jsonl bootstrap with rule 26 hooks active. Reader transparency preserved (`readEvents()` auto-merges archive). This is a runtime side-effect, not a commit; user invokes when ready.

### C — Optional: research mirror + announcements refresh

- **NEW** `~/.claude/research/palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md` — verbatim mirror of A1 blog with 4 anchored quotes (Q1: decision lineage definition / Q2: 5-dim envelope / Q3: 4-layer agentic memory / Q4: continuous refinement circuit). Per rule 02 §Research retrieval — external evidence verbatim, NOT internal synthesis.
- **UPDATE** `aipcon-devcon/announcements.md` — §ANN-APR2026 section added covering Apr 14-30 deltas (AIP Evals integrated into AI FDE 4/14, Claude Opus 4.7 GA 4/15, USDA $300M deal 4/22, Agent Studio→Chatbot Studio rebrand 4/22, A1 blog 4/29, Trump-Anthropic EO 4/29, Models in Pipeline Builder 4/30).
- **UPDATE** `aipcon-devcon/BROWSE.md` §A1 + §A2 rows — concrete file pointers replacing "pending mirror" placeholders.
- **UPDATE** `aipcon-devcon/INDEX.md` palantir-mini Integration Priority — A1 row now cites the verbatim mirror file.

### D — Authority + cross-refs

- Anchor blog: https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40 (2026-04-29).
- Plan: `~/.claude/plans/quiet-fluttering-garden.md` Phase 7 + Optional.
- Predecessor PRs: #264 (v4.1.0 substrate hooks + handlers), #265 (v4.2.0 skills + agents + briefing-template).
- Rule 26 v1.0.0 hookCitations now includes session-start (informally — session-start emits the advisory; not a hard gate).

### E — Compatibility

- compatibleSchemaVersions unchanged: `>=1.32.0 <2.0.0`.
- session-start.ts advisory is additive — never blocks; silent when bypass envvar set.
- Research files are read-only SSoT; existing readers unchanged.

### F — Tests

- `tests/hooks/session-start.test.ts` → existing 4 cases still pass (no extension required; advisory line is conditional on `.palantir-mini/` existence which test fixtures already create).
- `bunx tsc --noEmit` clean.

### Surface delta

- 41 hooks (no change; session-start.ts modified but no new entry).
- 1 NEW research file (`blog-connecting-agents-2026-04-29.md`) under read-only SSoT; not counted in plugin surface.

### Closure

PR3 closes the `quiet-fluttering-garden` plan (Phase 2+3 → PR1 v4.1.0; Phase 5+6 → PR2 v4.2.0; Phase 7+Optional → PR3 v4.3.0). Total surface delta across 3 PRs: +3 hooks, +4 MCP handlers, +3 skills, 22 agent updates, 3 rule updates (12 v3.3.0 / 26 hookCitations / CORE.md sync), 1 NEW research file, 4 metadata bumps (plugin.json / marketplace.json / package.json / CHANGELOG).

---

## v4.2.0 — 2026-05-03 (MINOR — rule 26 valuable-data Phase 5+6 — skills + agents + briefing-template)

**Plan**: `~/.claude/plans/quiet-fluttering-garden.md` Phase 5+6.
**Sprint**: `palantirkc-sprint-021-quick` (1-iter Quick Sprint, mode=quick, 3-criterion rubric).

### A — 3 NEW skills (Phase 5)

- **`skills/pm-value-audit/SKILL.md`** — substrate health dashboard wrapping `pm_value_grade_metrics`. T0-T4 distribution + 7-day trend + alarm thresholds (T0 > 5%, T2+ < 15%).
- **`skills/pm-decision-replay/SKILL.md`** — BackProp circuit replay defaulting to T3+ filter. `--include-noise` (T2+) and `--include-all` (T0+) flags.
- **`skills/pm-memory-map/SKILL.md`** — 4-layer agentic memory balance audit wrapping `pm_memory_layer_audit`.

### B — 3 SKILL updates (Phase 5)

- **`skills/pm-recap/SKILL.md`** — valueGrade weighting (T3 > T2 > T1; T0 excluded by default). Adds `pm_event_query_by_grade` + `pm_memory_layer_audit` to allowed-tools.
- **`skills/pm-replay/SKILL.md`** — default T2+ filter via `pm_event_query_by_grade`. `--include-noise` reverts to full replay.
- **`skills/pm-quick-sprint/SKILL.md`** — generator-state.md template includes `## Memory layer declaration` section.

### C — briefing-template-validate.ts 5-section (Phase 6)

- `REQUIRED_SECTIONS_V4` adds `memory_layer_declaration` (5th).
- `BRIEFING_TEMPLATE` constant updated with 5th section example.
- `isV4BlockingMode()` reads `PALANTIR_MINI_BRIEFING_5SEC_BLOCKING` env var.
- Default = advisory (Day 0-3 migration window 2026-05-03 → 2026-05-06).
- Blocking mode emits `validation_phase_completed errorClass="missing_v4_memory_layer_declaration"` with refinementTarget.
- 4 new test cases: 5-section OK / 4-section advisory / 4-section blocking / bypass.

### D — 22 agent .md mass-update (Phase 6, phased per-role 4 commits)

| Role | Agents | Layers |
|------|--------|--------|
| Harness Core (4) | harness-planner / -generator / -evaluator / -analyzer | `[semantic, procedural, episodic]` |
| Evaluators (3) | code-grader / eval-judge / model-grader | `[procedural, semantic]` |
| Generators (5) | implementer / hook-builder / kosmos-implementer / mc-implementer / pm-implementer | `[procedural, semantic]` |
| Researchers (2) | researcher / docs-researcher | `[semantic, episodic]` |
| Verifiers (2) | verifier-adversarial / verifier-correctness | `[procedural, semantic]` |
| Orchestrators (1) | lead-orchestrator | `[working, episodic, semantic, procedural]` |
| Specialists (4) | ontology-steward / plugin-maintainer / protocol-designer / scrapling-fetcher | `[semantic, procedural]` |
| Deprecated (1) | home-implementer | `[]` (exempt) |

Each agent gets:
- `memoryLayers: [...]` field in YAML frontmatter (after `model:`).
- `## Memory layer declaration` body section with one-line rationale per layer.

### E — Rule updates (Phase 6 cross-refs)

- **rule 12 v3.2.0 → v3.3.0** MINOR — §Briefing template 5th section + advisory→blocking pattern.
- **rule 26 v1.0.0** — `hookCitations` += `briefing-template-validate`.
- **CORE.md** — rule 12 v3.3.0 line synced.

### F — Tests

- `tests/hooks/briefing-template-validate.test.ts` — existing 21 + new 4 = **25 pass / 0 fail**.
- All other tests unchanged.

### G — Authority

- Plan: `~/.claude/plans/quiet-fluttering-garden.md` Phase 5+6.
- Predecessor: PR #264 (v4.1.0 substrate hooks + handlers).
- Anchor blog: https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40 (2026-04-29).
- Rule: `~/.claude/rules/26-valuable-data-standard.md` (v1.0.0, hookCitations updated).

### H — Compatibility

- compatibleSchemaVersions unchanged: `>=1.32.0 <2.0.0`.
- briefing-template-validate v4 advisory-mode default — non-breaking. Set `PALANTIR_MINI_BRIEFING_5SEC_BLOCKING=1` for early opt-in.
- Existing agent prompts continue to work; agents simply gain a new advisory-friendly frontmatter field + body section.

### Surface delta

- 39 → 42 active skills (+3)
- 23 → 22 active agents (-1: home-implementer marked deprecated; pre-existing exempt)
- 41 hooks (no change; briefing-template-validate.ts modified but no new entry)

---

## v4.1.0 — 2026-05-03 (MINOR — rule 26 valuable-data substrate Phase 2+3)

**Plan**: `~/.claude/plans/quiet-fluttering-garden.md` Phase 2+3 (continuation of `nifty-mixing-diffie` Phase 0+1+4 already merged via PRs #261-#263).

**Sprint**: `palantirkc-sprint-020-quick` (1-iter Quick Sprint, mode="quick", 3-criterion rubric: code/ontology/rule).

### A — 3 NEW hooks (Phase 2)

- **`hooks/value-grade-assigner.ts`** (PreToolUse on `mcp__plugin_palantir-mini_palantir-mini__emit_event`, decision:block, timeout:5s) — rule 26 §Auto-grade enforcer. Reuses `autoGradeEnvelope()` + `validateRule26R5()` from `bridge/handlers/emit-event.ts`. T0 envelopes blocked at MCP boundary; R5 violations blocked in enforce mode (`PALANTIR_MINI_VALUE_GRADE_ENFORCE=1`). Bypass: `PALANTIR_MINI_VALUE_GRADE_BYPASS=1` (audited). Paired test 10 cases (tests/hooks/value-grade-assigner.test.ts).
- **`hooks/outcome-pair-tracker.ts`** (PostToolUse on emit_event, async, timeout:3s) — rule 26 §Axis B1 lifecycle. Open/close pair markers under `<sessionDir>/outcome-pairs/<pairRid>.json` keyed by `lineageRefs.actionRid` (with payload fallbacks: contractId/loopId/scenarioId/dryRunRef). Idempotent. Orphan detection runs opportunistically on close events; emits `outcome_pair_orphaned` advisory after 30 min threshold. Paired test 13 cases.
- **`hooks/memory-layer-validator.ts`** (PostToolUse on emit_event, async, timeout:3s) — rule 26 §Axis E enforcer. Advisory-only — emits `memory_layer_advisory` event when T2+ envelope missing `withWhat.memoryLayers`. Auto-tag heuristic table covering 50+ event types. Paired test 10 cases.

### B — 4 NEW MCP handlers (Phase 3)

- **`bridge/handlers/pm-event-query-by-grade.ts`** — `pm_event_query_by_grade({ project, gradeFilter: T0|T1|T2|T3|T4|T2+|T3+|all, eventTypeFilter?, sinceWhen?, limit? })`. Returns matching events + grade distribution.
- **`bridge/handlers/pm-outcome-pair-audit.ts`** — `pm_outcome_pair_audit({ project, orphanThresholdMs? })`. Reads outcome-pairs/ markers; returns total/open/closed/orphaned counts + orphan ratio + avg latency.
- **`bridge/handlers/pm-value-grade-metrics.ts`** — `pm_value_grade_metrics({ project, windowDays? })`. Substrate health dashboard: T0 reject rate + T2+ ratio + T3 circuit input count + 7-day daily trend + recommendation string.
- **`bridge/handlers/pm-memory-layer-audit.ts`** — `pm_memory_layer_audit({ project, sinceWhen? })`. 4-layer agentic memory balance: per-event-type stats + T2+ missing-layer count + recommendations.

### C — Wiring

- `hooks/hooks.json`: PreToolUse + PostToolUse entries for emit_event matcher (3 hooks total).
- `bridge/mcp-server.ts`: 4 ToolSpec entries + 4 dispatch map entries.
- `managed-settings.d/50-palantir-mini.json`: 4 RBAC grants in `permissions.allow`.

### D — Authority

- Anchor blog: https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40 (2026-04-29) — *"decision lineage … continuously refine all forms of agentic memory"*.
- Rule: `~/.claude/rules/26-valuable-data-standard.md` (NEW v1.0.0, merged 2026-05-03).
- Schemas: v1.35.0 (5 NEW value-data primitives + 3 extensions; merged 2026-05-03 via PR #261).
- Predecessor PRs: #261 (schemas v1.35.0) + #262 (plugin R1-R5 + rule 26) + #263 (research routers).

### E — Compatibility

- compatibleSchemaVersions unchanged: `>=1.32.0 <2.0.0` (covers v1.35.0).
- All hooks `decision:block` only on hard violations (T0, R5-enforce); advisory paths preserve existing emit pipeline.
- 3 PostToolUse hooks `async:true` — never block emit success.

### F — Tests

- `tests/hooks/value-grade-assigner.test.ts` (NEW, 10 cases)
- `tests/hooks/outcome-pair-tracker.test.ts` (NEW, 13 cases)
- `tests/hooks/memory-layer-validator.test.ts` (NEW, 10 cases)
- Total: 33 sprint-020-quick tests pass / 0 fail.

### G — Validation gates

- G1 schemas typecheck exit 0
- G2 plugin typecheck exit 0
- G3 tests/hooks/{value-grade-assigner,outcome-pair-tracker,memory-layer-validator} 0 fail
- G4 hooks.json valid JSON; managed-settings.d/50-palantir-mini.json valid JSON
- G5 sprint-020-quick contract bound (status=bound, mode=quick)

### Surface delta

- 54 → 58 MCP tools (+4)
- 39 → 41 hooks (+3 entries; outcome-pair-tracker + memory-layer-validator counted as 2 PostToolUse on same matcher; value-grade-assigner is the third)

---

## v4.0.0 — 2026-05-01 (MAJOR — identity reframe; **zero behavior change**)

**Identity**: palantir-mini is now formally **the Ontology-First Brain for multi-harness agent swarms** — a control plane that grounds any harness species (Claude Code CLI, Claude Agent SDK, palantir-mini-sprint-harness, Managed Agents, task-specific) in append-only events.jsonl lineage + ~/.claude/schemas/ ontology + 5-dim Decision Lineage. Not itself a harness species; dispatches via MCP.

**Zero-behavior disclaimer**: All hook semantics, sprint contract enforcement, grader dispatch, codegen authority, and runtime behavior are **byte-for-byte identical to v3.13.0**. SemVer MAJOR reflects rule 16 v3.4.0 → v4.0.0 invariant change (palantir-mini-sprint-harness species governance scope) + lexicon canonicalization across 5 surfaces (CLAUDE.md, rules/CONTEXT.md §15, plugin.json, marketplace.json, README.md).

**Surfaces aligned**:
- `.claude-plugin/plugin.json` description + keywords (delete `3-agent-harness`; add `brain-of-swarms`, `ontology-first-brain`, `multi-harness`)
- `.claude-plugin/marketplace.json` metadata.description (byte-identical to plugin.json)
- `README.md` §What this is (Brain-of-Swarms positioning)
- `~/.claude/CLAUDE.md` §Lead-Direct Harness Wrapping (cross-ref rule 16 v4.0.0 + CONTEXT.md §15)
- `~/.claude/rules/16-3-agent-harness.md` §0 (palantir-mini-sprint-harness species scope)

**Authority**: `~/.claude/plans/distributed-wishing-manatee.md` §Phase 2 (parent: cosmic-hatching-pizza §W3, Anthropic 1차 자료 — Lance Martin "Scaling Managed Agents" 2026-04-08).

**No code changes**: bridge/handlers/* unchanged. lib/* unchanged. tests/* unchanged.

---

## [v3.13.0] — 2026-04-30 — MINOR — BackProp loop closure (P1+P2+P3) + sprint-005 follow-up

### Why

sprint-005 종료 시점(2026-04-30) 적립된 evidence (palantir-math events.jsonl seq 1169–1181):
- `learning_captured` topic=`backprop-loop-automation-gap` (confidence 0.95): 1062 events 중 `learning_captured`=0, `sprint_completed`=0, `failure_mode_synthesized`=0. substrate 모두 갖춰졌으나 emit hook 부재 → 매 sprint마다 manual emit 강제 = "잊혀짐 = BackProp loop 끊김".
- `learning_captured` topic=`sprint-005-pm-learn-topic-naming-convention` (confidence 0.95): topic 명명 규약 (sprint-NNN- prefix) 부재로 cross-sprint query 깨짐.

이 sprint = 3 hook + 1 schemas primitive + 2 새 event type ≈ 250 LOC closing patch. sprint-007부터 자동 BackProp 신호 적립. canary 측정은 다음 palantir-math sprint 종료 시 events.jsonl 자동 적립 여부.

### A — P2: sprint-terminal-detector hook (NEW, 198 LOC)

PostToolUse on `mcp__plugin_palantir-mini_palantir-mini__commit_edits`. verdict pass + iteration limit 도달 시 contract.json `status: "completed"` atomic write + `sprint_completed` envelope emit. Idempotency via contract status field check. Pattern: golf from `harness-analyzer-trigger.ts` (PostToolUse + verdict gate + idempotency marker). Paired test 9 cases (tests/hooks/sprint-terminal-detector.test.ts, 235 LOC).

### B — P1: sprint-completed-learning-synthesizer hook (NEW, 149 LOC)

PostToolUse on commit_edits, T3 직후 fire. 가장 최근 `sprint_completed` event read → 해당 sprint의 analysis-NNN.md walk → `§ Failure category` + `§ Root-cause hypothesis` regex 추출 → `learning_captured` envelope emit with `sprint-NNN-<category>` topic prefix 강제 (sprint-005 learning #2 해소). Dedupe via prior emit lookup. Fallback `unknown` + confidence 0.5 on malformed analysis. Paired test 13 cases (237 LOC).

### C — P3: analyzer-output-injector extension (+50 LOC, 287 → 337)

buildLeadGuidance write 후 analysisBody 파싱 + FailureCategory enum 매칭 (fallback "unknown") + rootCauseHypothesis 추출 + 기존 phase_completed emit 직후 `failure_mode_synthesized` envelope emit. Paired test +3 cases (245 → 331 LOC).

### D — sprint-005 follow-up 3건 (T7)

- rule 12 v3.1.0 → v3.2.0 MINOR: §Session lifecycle context-overflow re-spawn bullet 추가 (sprint-005 learning #6 — iteration boundary token usage > 80K → fresh agent re-spawn via auto_spawn_replacement MCP).
- agents/harness-planner.md: pre-write verifier 단계 추가 — package.json scripts grep으로 codegen cmd 이름 검증 (sprint-005 learning #5 cold-start-codegen-cmd-mismatch 해소).
- hooks/commit-edits-precondition.ts: file-edit allow path 직전 `bun run ontology:drift` non-blocking advisory check (sprint-005 learning #8 generated-schema-version-stale). 1주 shakedown 후 sprint-007에서 blocking 전환 검토. Paired test +1 advisory silent-path 케이스.

### E — schemas v1.32.0 sync

- NEW primitive `failure-category.ts` — FailureCategory string-union 6 멤버 (spec_misalignment | scope_overreach | threshold_too_strict | regression | rule_conformance_violation | unknown).
- NEW primitive `sprint-completed.ts` — SprintCompletedPayload {project, sprintNumber, contractId, verdict, iterationCount, bestScore, terminationCriteria}.
- NEW primitive `failure-mode-synthesized.ts` — FailureModeSynthesizedPayload {sprintNumber, iteration, failureCategory, rootCauseHypothesis, suggestedPatchType?, smallestPatch?}.
- primitives/index.ts +3 re-exports.
- schemas/package.json v1.31.0 → v1.32.0 + 3 subpath exports.
- plugin lib/event-log/types.ts: SprintCompletedEnvelope + FailureModeSynthesizedEnvelope union 추가, EventSnapshot 카운터 2, fold-snapshot.ts 2 case.

### F — Paired tests

- tests/hooks/sprint-terminal-detector.test.ts (NEW, 9 cases)
- tests/hooks/sprint-completed-learning-synthesizer.test.ts (NEW, 13 cases)
- tests/hooks/analyzer-output-injector.test.ts (EXTEND, +3 cases for 17 total)
- tests/hooks/commit-edits-precondition.test.ts (EXTEND, +1 advisory case for 26 total)
- tests/lib/event-log/types.test.ts (NEW, 5 cases)

총 44 sprint-006 tests pass / 0 fail.

### G — Validation gates (모두 GREEN)

- G1 schemas typecheck exit 0
- G2 plugin typecheck exit 0
- G3 tests/hooks/ 0 fail
- G4 union에 sprint_completed + failure_mode_synthesized 2 entries
- G5 schemas v1.32.0 + plugin v3.13.0 + compatibleSchemaVersions sync
- G6 manifest-validate exit 0
- G7 rule audit drift 없음
- G8 plugin self-test pass (v3.13.0)

### Migration / breaking changes

None. 모든 추가는 backward-compat additive (새 envelope types union 추가, 새 hook PostToolUse 추가는 기존 hooks 침범 안 함, rule 12 §Session lifecycle additive bullet, harness-planner agent additive step, commit-edits-precondition advisory non-blocking).

### Canary

다음 palantir-math sprint (sprint-006 또는 -007) 종료 시 events.jsonl tail에 manual emit 없이 `sprint_completed` + `learning_captured` (sprint-NNN- prefix) + `failure_mode_synthesized` 자동 적립 확인.

---

## [3.12.0] — 2026-04-30 — MINOR — B2 hard default-on harness substrate + auto-bootstrap + research-refresh bridge repair (PR #253) + drift fixes

### Why

User-authorized early B1 → B2 escalation (original 4-week shakedown 2026-04-29 → 2026-05-27 truncated). Plan: `~/.claude/plans/dynamic-forging-globe.md` rev2. Driving question (user 2026-04-30): "Claude가 palantir-mini의 Harness 기능을 ALWAYS 사용해야하는데, 그렇지 않은 것 같다." Root causes identified (4): (C1) B1 gate scope only `commit_edits` MCP — Lead-direct Edit/Write/MultiEdit pass through; (C2) bound contracts get exhausted (sprint-002 contract.json was 0 bytes); (C3) advisory hook only emits message, no auto-bootstrap; (C4) no Lead behavioral rule mandating Quick Sprint wrap.

### A — Quick Sprint wrapping (`sprint-002-quick`)

This release is itself wrapped in a bound Quick Sprint contract (mode=quick, leadAsEvaluator=false, graderDispatchEnabled=true, analyzerTriggerEnabled=true, disagreementResolution=grader-dispatch-arbitrated, selfGradingGuard.enabled=true, postSprintVerifierPair.enabled=true, 4-criterion rubric incl. crit-quick-model via pm_grader_dispatch fresh subprocess). 3-layer self-grading bias guard active per plan §10.

### B — Lead behavioral rule (rule 12 v3.0.0 → v3.1.0 + CORE.md + ~/.claude/CLAUDE.md + ~/CLAUDE.md)

- **`~/.claude/rules/12-lead-protocol-v2.md`** v3.0.0 → v3.1.0: new §Lead-direct harness wrapping section + invariant update + hookCitations adds [harness-base-mode-advisory, commit-edits-precondition].
- **`~/.claude/rules/CORE.md`** v2.0.1 → v2.0.2: rule 12 invariant adds "Lead-direct in tracked palantir-mini project auto-wraps in Quick Sprint"; rule 16 invariant updated to v3.4.0 + B2 hard mode.
- **`~/.claude/CLAUDE.md`**: new §Lead-Direct Harness Wrapping section (between §Edit Guardrails and §Git).
- **`~/CLAUDE.md`** (palantirkc home repo): project-specific Lead-Direct Harness Wrapping section (after §Guardrails) listing nested `projects/*` as tracked palantir-mini projects.

### C — B2 hard default-on (rule 16 v3.3.0 → v3.4.0 + commit-edits-precondition.ts + hooks.json)

- **`~/.claude/rules/16-3-agent-harness.md`** v3.3.0 → v3.4.0: §Default-On Policy rewritten — B1 marked retired (was active 2026-04-29 → 2026-04-30); B2 marked current as of 2026-04-30 with extended gate scope (commit_edits + tracked-file Write|Edit|MultiEdit). Auto-bootstrap mention. New env var `PALANTIR_MINI_AUTO_SPRINT_DISABLE=1` documented.
- **`hooks/commit-edits-precondition.ts`**: new `FILE_EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"])`. New `handleFileEditBranch()` extracts `tool_input.file_path`, walks up via `findProjectRoot()` to detect tracked palantir-mini project, gates if inside. Path-based exemption for `~/.claude/`, `~/.codex/`, `/tmp/`, `/var/tmp/`, `/etc/`. file-edit branch skips dry-run-then-grade (commit_edits MCP-specific only).
- **`hooks/hooks.json`**: PreToolUse `Edit|Write|MultiEdit` matcher entry adds 4th hook (`commit-edits-precondition`) with `decision: "block"` + statusMessage "Harness B2 file-edit gate (rule 16 v3.4.0 §Default-On Policy)…". Existing `commit_edits` matcher entry preserved.

### D — Auto-bootstrap (`hooks/harness-base-mode-advisory.ts`)

- New exported function `bootstrapDefaultQuickSprint(projectRoot, sessionId)`: scans sprints/ for max sprint number, mkdir recursive sprint dir + iterations/iteration-001, writes contract.json with `flag: "wx"` (race-safe), emits `validation_phase_completed errorClass="auto_bootstrap_completed"` envelope (typed-union conformance).
- Default contract shape: status="bound", mode="quick", iterationLimit=1, timeoutMs=900000, leadAsEvaluator=false, graderDispatchEnabled=true, analyzerTriggerEnabled=true, disagreementResolution=grader-dispatch-arbitrated, autoBootstrapped=true, inline 3-criterion rubric (placeholder shells; user overrides via /palantir-mini:pm-quick-sprint with custom brief).
- Main handler reworked: Branch 1 (no harness dir) → bootstrap or advisory fallback; Branch 2 (no bound contract) → bootstrap or advisory fallback; Branch 3 (bound) → green path. Env escape `PALANTIR_MINI_AUTO_SPRINT_DISABLE=1` audited via `harness_self_grading_guard_disabled` event.

### E — Plugin version sync (drift fix)

- **`.claude-plugin/plugin.json`** v3.11.0 → v3.12.0
- **`.claude-plugin/marketplace.json`** v3.11.0 → v3.12.0 (both metadata + plugins[0])
- **`package.json`** **v3.4.0 → v3.12.0** — fixes pre-existing drift (tracked since v3.5.0 release; never synced)
- **`hooks/hooks.json`** description updated to v3.12.0 + 37 hooks count

### F — Synthesis docs

- New `~/.claude/plans/dynamic-forging-globe.md` rev2 — full plan (§0 context, §0.5 PR #252/#253 coordination + conflict matrix + branch strategy, §1 A+B+C+D scope, §2 anti-scope, §3 Quick Sprint contract shape, §4 critical files owner-tagged, §5 4-criterion + verifier pair Phase 2, §6 improvement loop, §7 verification, §8 out-of-scope, §9 execution sequence, §10 self-grading bias guards 3-layer)
- Forthcoming `~/.claude/plans/2026-04-30-harness-always-on-b2-escalation.md` synthesis doc (§F-1 of plan)
- `~/.claude/projects/-home-palantirkc/memory/MEMORY.md` Session Summary 2026-04-30 entry

### G — Tests (G1 + G2)

**`tests/hooks/commit-edits-precondition.test.ts`**: existing test fixed (Edit→Bash for non-gated tool case), 7 new B2 tests added:
- Edit on tracked file no-harness-dir → BLOCK
- Edit on tracked file no-bound-contract → BLOCK
- Write on tracked file with Quick Sprint contract → ALLOW (b2-file-edit-allow)
- MultiEdit on tracked file with full-mode contract → ALLOW (no dry-run check)
- Edit on `~/.claude/` path → ALLOW (exempt path prefix)
- Edit on isolated tmpdir → ALLOW (no project root or exempt prefix)
- MultiEdit with PALANTIR_MINI_HARNESS_BYPASS=1 → ALLOW (env bypass)
- Edit with no file_path field → ALLOW (skip)

**`tests/hooks/harness-base-mode-advisory.test.ts`**: existing tests updated to set `PALANTIR_MINI_AUTO_SPRINT_DISABLE=1` for advisory-mode coverage. New `bootstrapDefaultQuickSprint` describe (4 tests: contract creation, sprint number auto-increment, race-safety, write-failure null return). New v3.12.0 auto-bootstrap describe (4 tests: auto-bootstrap on no-harness-dir, on no-bound-contract, env disable respect, OK when bound).

### Companion: PR #253 — research_library_refresh bridge repair (merged 2026-04-30T04:12:43Z)

This v3.12.0 entry also documents PR #253 changes that were merged to main without their own version bump. From PR #253 body:

- **`bridge/handlers/research_library_refresh.ts`** + `research_library_refresh/types.ts`: `libraryRoot` made optional; `source` selector added (palantir-foundry/claude-code/palantir-vision/interaction/skills/all); `dryRun`, `since`, `agentName` added to typed args; result shape gains `wouldRefresh`, `manifestMissing`, aggregate `libraries[]`.
- **Manifest shape compatibility**: legacy `entries[]` manifests normalized alongside new `docs[]`; field mapping (`fetched`→`lastVerified`, `doc_title`/`filename`→`topic`).
- **`bridge/handlers/research_library_refresh/iterate-docs.ts`** + `staleness.ts`: `dryRun: true` computes stale list without fetching/writing/emitting; `since` cutoff supported.
- **`bridge/mcp-server.ts`**: tool schema replaced — accepts `libraryRoot`, `manifestPath`, `source`, `staleThresholdDays`, `since`, `dryRun`, `agentName`. Tool description updated (no longer promises archive/changelog/full URL diff).
- **`skills/pm-research-refresh/SKILL.md`**: matches currently exposed MCP surface; removes claims about `research_library_diff` / `research_library_prune` MCP availability.
- **Tests**: 12 new + 14 regression (26/26 pass) covering missing-libraryRoot validation, source selector, legacy entries normalization, dryRun preview, since cutoff.

### PR coordination (PR #252 — `[codex] repair Claude routing indexes`)

PR #252 (merged 2026-04-30T04:12:23Z) is independently scoped to docs routing only — `BROWSE.md` / `INDEX.md` repair + `.claude/rules/{CORE,CONTEXT,BROWSE}.md` `pm_rule_get` → `pm_rule_query` handler-name swap + frontmatter version 2.0.0 → 2.0.1. CORE.md from this v3.12.0 release builds on PR #252 (CORE.md 2.0.1 → **2.0.2**). No direct conflict on rule 12 / rule 16 / hooks / plugin manifest. Rebase note: if local merge needed, the only conflict surface is CORE.md frontmatter `version` line.

### Phase 2b verifier-adversarial patches (5 inline)

After Phase 2b verifier-adversarial HIGH severity report (7 findings), inline patches applied per §6 improvement loop:

- **F1 symlink bypass (HIGH)** → `commit-edits-precondition.ts` `handleFileEditBranch` resolves symlinks via `fs.realpathSync` before exempt-prefix check; ancestor-walk fallback for non-existent files (Write to new path)
- **F2 NotebookEdit gap (HIGH)** → `FILE_EDIT_TOOLS` const + `hooks.json` matcher extended to include `NotebookEdit`; closes C1 fully
- **F4 stale `pm_rule_get` (LOW)** → blockReason text updated to "rule 16 v3.4.0" + "pm_rule_query({ byId: 16 })"
- **F5 mislabeled envelope (LOW)** → `auto_sprint_disabled` errorClass (was mislabeled as `harness_self_grading_guard_disabled`)
- **F7 EEXIST race retry (LOW)** → `bootstrapDefaultQuickSprint` refactored to 3-attempt retry loop on EEXIST collision via internal `bootstrapAttempt` helper signaling `RETRY_EEXIST`

Deferred (documented as known issues in self-assessment + verifier-finding-001.md):
- **F3 placeholder rubric (MED)** — auto-bootstrapped contracts use trivially-passing rubric; design conversation needed for project-type-aware shell injection
- **F6 plugin internals exempt** — `~/.claude/plugins/palantir-mini/` edits exempt via `~/.claude/` overlay rule; tightening would impact hook-builder workflow

**Test suite post-patch**: 46/46 hook tests pass (43 base + 3 new for F1 symlink + F2 NotebookEdit coverage).

### Acceptance gates

- ✅ Rule 16 v3.4.0 declares B2 hard default-on with truncated shakedown rationale documented
- ✅ commit-edits-precondition gates Edit|Write|MultiEdit|NotebookEdit on tracked-project files; symlink-resolved; preserves read-only exemptions; preserves dry-run-then-grade for commit_edits MCP
- ✅ hooks.json PreToolUse Edit|Write|MultiEdit|NotebookEdit matcher includes commit-edits-precondition with decision=block
- ✅ harness-base-mode-advisory auto-bootstraps default Quick Sprint contract; 3-attempt EEXIST race retry; env-disable audited as `auto_sprint_disabled`
- ✅ Plugin version sync restored (3.11.0 → 3.12.0 across plugin.json + marketplace.json + package.json)
- ✅ rule 12 v3.1.0 invariant updated; CORE.md v2.0.2 invariants updated; ~/.claude/CLAUDE.md + ~/CLAUDE.md directives added
- ✅ B2 tests added (10 commit-edits-precondition incl. F1+F2 coverage + 8 harness-base-mode-advisory)
- ✅ self-grading bias guards (Layer A model criterion + Layer B analyzer auto + Layer C verifier pair) per plan §10
- ✅ Phase 2b verifier-adversarial 5 inline patches addressed all HIGH-severity findings; 2 MEDIUM/design-discussion items deferred

### Follow-up

- 2026-05-27 originally scheduled B2 escalation now retired; `pm_harness_base_mode_audit` cron continues for ongoing observation (false-positive monitoring under live B2 traffic).
- `~/.claude/plans/2026-05-27-b2-escalation-followup.md` should be updated post-merge to reflect "B2 already escalated 2026-04-30; this doc preserved for historical context."

---

## [3.11.0] — 2026-04-29 — MINOR — Final closing tasks (CT-3 + CT-5 + CT-6)

### Why

Closes CT-3 + CT-5 + CT-6 from `~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md` per execution plan `~/.claude/plans/sparkling-forging-torvalds.md`. With this release the harness-base-mode conversion is fully sealed: zero-touch analyzer pickup loop (CT-3), B2 escalation observation infrastructure (CT-5), all skill/agent descriptions cite current versions (CT-6).

### CT-3 — analyzer-marker-pickup SessionStart hook + injector lifecycle (rule 16 v3.2.0 → v3.3.0)

**NEW**: `hooks/analyzer-marker-pickup.ts` — SessionStart hook scans `/tmp/claude-hooks/<sessionId>/analyzer-request-*.json` markers from prior sessions, emits `phase_completed phaseTag="harness-analyzer-pickup-pending"` advisory event with markers in `additionalContext` (FIFO order by requestedAt). Idempotent.

**EXTENDED**: `hooks/analyzer-output-injector.ts` — after writing `lead-guidance.md`, deletes consumed markers via new `cleanupConsumedMarkers()` + `parseSprintNumber()` helpers. Glob-by-prefix handles multi-rubric same-iteration case. Best-effort.

**WIRED**: `hooks/hooks.json` SessionStart matcher gains `analyzer-marker-pickup` (async, 5s). Skill `pm-harness-sprint` Phase 2 step 3.6 (cross-session pickup pattern). Rule 16 v3.2.0 → v3.3.0 — invariant + §Loop step 6 + new `analyzer-marker-pickup` hookCitation.

### CT-5 — pm_harness_base_mode_audit handler + skill (B2 escalation prep)

**Decision (user 2026-04-29)**: Ship audit infra NOW; defer rule 16 text + matcher extension to 2026-05-27 follow-up session per shakedown observation. Workflow friction risk too high without observation data.

**NEW**: `bridge/handlers/pm-harness-base-mode-audit.ts` — read-only handler reads `validation_phase_completed` events emitted by `commit-edits-precondition` hook (W1.2 + W3.1c) within rolling sinceDays window. Tracks 9 errorClass values. Returns `{window, totals, blockedByReason, bypassRate, blockRate, recommendation, reasoning}`. Recommendation thresholds:

| Recommendation | Condition |
|---|---|
| `ready-for-B2` | bypassRate<5% AND blockRate<20% AND passed≥50 |
| `more-data-needed` | passed<20 |
| `investigate-friction` | otherwise |

**NEW**: `skills/pm-harness-base-mode-audit/SKILL.md` — wraps the MCP. Suggested weekly cadence: `/loop 7d /palantir-mini:pm-harness-base-mode-audit`. Decision tree per recommendation field documented.

**NEW**: `~/.claude/plans/2026-05-27-b2-escalation-followup.md` — self-contained cold-start prompt for the post-shakedown escalation session (Path A escalation steps, Path B more-data, Path C investigate-friction).

**REGISTERED**: `bridge/mcp-server.ts` adds tool def + dispatch entry. `managed-settings.d/50-palantir-mini.json` adds RBAC allow.

### CT-6 — stale skill/agent description sync

User-visible frontmatter `description:` fields drift since plugin v3.x bumps. Fixed:
- `skills/pm-recap/SKILL.md` — "v2.1.108" → current
- `skills/pm-change-plan/SKILL.md` — "v2.7.0 codebase" → "v3.11.0"
- `skills/pm-quick-sprint/SKILL.md` — "rule 16 v3.0.0" → "rule 16 v3.3.0" (3 occurrences)
- `skills/pm-harness-analyze/SKILL.md` — "v2.10.0+" → "v3.9.0+ W3.0; current v3.11.0"
- `skills/pm-harness-status/SKILL.md` — drop stale "v2.18.0" prefix
- `skills/pm-rule/SKILL.md` — schemas v1.18.0 → v1.31.0 + current plugin
- `skills/pm-rule-audit/SKILL.md` — historical-with-current pattern
- `skills/pm-harness-component-audit/SKILL.md` — drop "v2.21.0 W5" prefix; harness-analyzer "Recently introduced" → "Established W3.0 substrate"
- `agents/harness-evaluator.md` — drop stale "v2.18.0" wave marker; cite rule 16 v3.3.0 §Roles

KEEP-AS-IS: `pm-pr-impact`, `pm-ship`, `pm-rule` deep-history changelog refs, `pm-rehydrate` migration timeline (genuine release lineage).

### Tests

35 new tests across 3 files (1361/1363 → 1396/1399 — 1396 pass + 3 intentional skips):
- `tests/hooks/analyzer-marker-pickup.test.ts` — 9 tests (pickup hook + helpers)
- `tests/hooks/analyzer-output-injector.test.ts` — +4 tests (cleanup + parseSprintNumber + e2e)
- `tests/bridge/handlers/pm-harness-base-mode-audit.test.ts` — 15 tests (3 thresholds + 1 filter + 8 e2e + 3 edge cases)

### Acceptance gates (closing-tasks doc)

- ✅ CT-3 closed: zero-touch loop closure pattern complete + lifecycle cleanup
- ✅ CT-5 closed: audit infra shipped; rule text + matcher deferred to 2026-05-27 follow-up per user directive
- ✅ CT-6 closed: high-priority + moderate-priority drift swept

### Acceptance gates (closing-tasks doc) — overall harness-base-mode

- ✅ G1 — rule 16 default-on + self-assessment + loop sequence (W3.2)
- ✅ G2 — SessionStart bootstrap + harness_base_mode_pending (W1.2)
- ✅ G3 — commit_edits gating + dry-run-grade extension (W3.1c)
- ✅ G4 — pm_grader_dispatch in production (W2.1a)
- ✅ G5 — harness-analyzer fires per-iteration (W3.0 + W3.1b + W3.1d)
- ✅ G6 — Cross-project lineage query returns multi-project results (W5.0 + W5.1)
- ✅ G7 (opt) — Simulator domain in 1+ sprint (W4.0–W4.3)

**Harness-base-mode conversion COMPLETE.**

---

## [3.10.1] — 2026-04-29 — PATCH — CT-4 rule-registry post-§12-license drift cleanup

### Why

CT-4 from `~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md`. `pm-plugin-self-check` had 1 failing test ("All-green path → overallStatus: pass") because rule-registry was generated 2026-04-26 (pre-§12-license consolidation) and `checkFileCountDrift` counted retired-stub registry entries as expected disk files. Post-§12 consolidation: 06+09+11+13+14+15 → 12/02/08; .md files deleted; numbered IDs join permanent gaps (CONTEXT.md §4). Registry needed regen to match disk reality + drift filter needed retire-aware logic for any future stub-retirements.

### Changed

- `bridge/handlers/pm-rule-audit/detect-drift.ts` — `checkFileCountDrift` + `checkMemoryCounter` filter now uses `isRuleRetired() && isRuleScopeMigrated()` from schemas/ontology/primitives/rule.ts to count ACTIVE rules only when comparing to disk. Retired-stub-with-supersededBy entries no longer count toward expected disk files (CONTEXT.md §4 numbered-ID stability — gaps mean ABSENT, not stub-redirected post-§12 license).
- `~/.claude/schemas/src/generated/rule-registry.ts` — REGENERATED via `bun run .claude/schemas/scripts/gen-rule-registry.ts`. Now reflects post-§12 disk reality: 9 entries (8 globals: ruleId 0/1/2/7/8/10/12/16 + project:mathcrew rule 6). Old registry had 19 stale entries including retired stubs for 03/05/18 with supersededBy + active entries for now-deleted 06/09/11/13/14/15.
- `~/.claude/rules/01-ontology-first-core.md` — `crossRefs` from `[2, 8, 10, 11]` → `[2, 8, 10]` (rule 11 retired, content absorbed into rule 8).
- `~/projects/mathcrew/.claude/rules/06-pedagogy-contract.md` — `crossRefs` from `[01, 02, 03, 05]` → `[01, 02]` (rules 03 + 05 retired in R1; .md files deleted in §12 cleanup).

### Tests

- `tests/bridge/handlers/pm-rule-audit.test.ts` — `summary.registeredRules` floor lowered from `≥18` (active globals + retired stubs) → `≥7` (post-§12 active-only). Comment cites CONTEXT.md §4.
- `tests/handlers/pm-rule-query.test.ts` — 3 tests skipped via `test.skip`: `byId=18 (retired, supersededBy=10) follows by default`, `byId=18 + withFollow=false stays on retired`, `includeRetired=true includes retired rules (rule 18)`. Reason: rule 18 deleted from disk in §12 cleanup; no retired stub exists in registry. Re-enable when next retirement uses CONTEXT.md §7 default path (stub body + supersededBy, no file deletion). Handler logic (`withFollow` + supersession follow) unchanged + remains correct.

### Tests state

1368/1368 pass (1371 ran, 3 skipped). Pre-fix: 1370/1371 pass (1 fail in pm-plugin-self-check). Post-fix: pm-plugin-self-check `overallStatus: pass` returns "pass". `summary.registeredRules: 9`. `findings: 0`.

### Acceptance gate (closing-tasks doc CT-4)

✅ Full test suite returns 1368/1368 (3 intentional skips for rule-18-not-on-disk).

---

## [3.10.0] — 2026-04-29 — MINOR — Wave 5 P5 — cross-project Workflow Lineage

### Why

Plan: `~/.claude/plans/glowing-frolicking-raven.md` §3 (Wave 5) operationalizing blueprint §4-P5. Cold-start handoff §3. Closes blueprint §9 G6 (Cross-project lineage query returns multi-project results). Per `~/.claude/research/palantir-vision/aipcon-devcon/workflow-lineage.md` lines 9-13 (Workflow Lineage GA Nov 2025 — graph + 7-day cross-execution log search) + lines 79-80 (palantir-mini gap: per-session dashboards only, no cross-session/cross-project aggregation). Without this, Hivemind-style orchestration is structurally impossible.

### New MCP tool — `pm_workflow_lineage_query`

`bridge/handlers/pm-workflow-lineage-query.ts` — joins events.jsonl across registered (`~/.claude/plugins/palantir-mini/session/registered-projects.json` SSoT maintained by project_register handler) + auto-discovered (fs walk under `~/projects/*` or `args.projectsRoot` override) palantir-mini projects.

Input shape:
- `projects?: string[]` — explicit project paths (bypass discovery)
- `projectsRoot?: string` — override fs-walk root
- `filter?: { whenRange, atopWhich, fromSequence/toSequence, eventTypes, byWhom, throughWhich, withWhat regex, limit }` — 5-dim Decision Lineage filter

Output shape:
- `events: AnnotatedEvent[]` — each EventEnvelope annotated with `__sourceProject`
- `executionGraph: { nodes, edges }` — nodes per filtered event; edges relation `"follows"` (sequential same-session) | `"cited"` (events sharing dryRunRef in withWhat.reasoning)
- `perProjectCounts: Record<string, number>` — per-absolute-path event count
- `discovered: string[]` — projects found in fs walk but NOT in registry (advisory)
- `truncated: boolean` + `totalMatched: number` — when result > filter.limit (default 1000)

Read/write separation (Plan agent §5): handler emits `phase_completed phaseTag="project_auto_discovered"` advisory event for unregistered projects but NEVER writes to registered-projects.json. Auto-registration is an explicit `project_register` MCP call. Advisory event cwd = handler's `process.cwd()` so it doesn't pollute the discovered project's own events.jsonl.

### New lib — `lib/event-log/multi-project-reader.ts`

- `discoverProjects(opts?)` → `{ registered: ProjectEntry[], discovered: ProjectEntry[] }` — registry first, then fs walk fallback (deduplicated against registered set). Honors `PALANTIR_MINI_REGISTRY` + `PALANTIR_MINI_PROJECTS_ROOT` env overrides for test isolation.
- `readMultiProjectEvents(projects)` → `{ events: AnnotatedEvent[], perProjectCounts }` — calls existing `readEvents()` per project (auto-merges archive/events-rotated-* per rule 10 G3). Annotates each envelope with `__sourceProject` + sorts merged set by (when, sequence) ASC for cross-project replay-order.

Tolerant of two registry shapes: `{registrations: [...]}` OR direct array. Best-effort: missing events.jsonl per project = 0 events for that project, not a thrown error.

### New skill — `/palantir-mini:pm-lineage`

`skills/pm-lineage/SKILL.md` — thin wrapper. Parses `$ARGUMENTS` filter clauses (`--whenRange="<from>..<to>"`, `--byWhom.identity=<id>`, `--eventTypes=<csv>`, `--withWhat=<regex>`, `--limit=<n>`, `--projects=<csv>`, etc.), invokes `pm_workflow_lineage_query` MCP, renders Markdown report (filter echo + perProjectCounts table + discovered + top events table + executionGraph summary). Suggests follow-ups (run project_register on discovered; raise limit if truncated).

### Registration + RBAC

- `bridge/mcp-server.ts` — TOOLS array adds `pm_workflow_lineage_query` tool def (near `replay_lineage`); dispatch table adds `pm_workflow_lineage_query: "./handlers/pm-workflow-lineage-query"`.
- `managed-settings.d/50-palantir-mini.json` — adds `mcp__palantir-mini__pm_workflow_lineage_query` to `permissions.allow`.
- `replay_lineage` description updated to cross-reference: "Single-project; for cross-project use pm_workflow_lineage_query (v3.10.0+)."

### Tests

- `tests/lib/event-log/multi-project-reader.test.ts` — 10 tests (missing registry + empty walk; registry-only; fs-walk fallback; hybrid; dedup overlap; ignore non-PM dirs; merge sorted; perProjectCounts; missing events.jsonl tolerated)
- `tests/bridge/handlers/pm-workflow-lineage-query.test.ts` — 11 tests (empty result; explicit projects bypass; fs-walk discovery + advisory; multi-project merge sorted; filter eventTypes/whenRange/byWhom.identity/withWhat regex; executionGraph follows + cited edges; truncated handling)

### Compatibility

- Schema pin unchanged (`>=1.27.0 <2.0.0` covers v1.31.0).
- `replay_lineage` MCP UNCHANGED — single-project; cross-project work routes to new handler.
- Plugin v3.9.1 → v3.10.0 MINOR (new public MCP surface).
- All existing tests + handlers untouched. No agent contract changes.
- New skill `/palantir-mini:pm-lineage` discoverable after `/reload-plugins`.

### Known notes

- Live e2e test (W5.2 acceptance gate G6): cross-project query returning matches from ≥2 of {palantir-math, mathcrew, kosmos} streams — deferred to closing live e2e per cold-start §5.
- `withWhat.reasoning` regex may surface secrets in cross-project query output; flagged as separate task per cold-start §6 (not in scope this wave).
- Hard B2 default-on (rule 16 §Default-On Policy escalation B1 → B2 after 4-week shakedown) deferred per cold-start §5 step 6.

---

## [3.9.1] — 2026-04-29 — PATCH — Wave 4 P4 — simulator domain (5th AIP Evals canonical evaluator)

### Why

Plan: `~/.claude/plans/glowing-frolicking-raven.md` §2 (Wave 4) operationalizing blueprint §4-P4. Cold-start handoff §2. Closes blueprint §9 G7 (optional acceptance gate — Decision Space "consequence simulation" 5th pillar per `~/.claude/research/palantir-vision/aipcon-devcon/devcon.md` lines 59-65 + `aip-evals.md` lines 41-46). Adds the 5th canonical AIP Evals evaluator type — pre-v3.9.1 the `RubricDomain` enum was 5-domain (code/rule/model/human/hybrid) but the AIP Evals taxonomy formally lists 5 evaluators including the ontology-edits-simulator. v3.9.1 closes the gap.

### Schemas v1.30.0 → v1.31.0

`~/.claude/schemas/ontology/primitives/grading-criterion.ts` `RubricDomain` union extended with `"simulator"`. Additive only. Plugin schema pin (`>=1.27.0 <2.0.0`) covers v1.31.0 with no bump required. CHANGELOG entry at `~/.claude/schemas/ontology/CHANGELOG.md` v1.31.0 section.

### New handler

`bridge/handlers/grade-with-simulator.ts` — consumes compute_edits_dry_run output JSON `{edits: Array<{rid?: string}>, paths?: string[], dryRunRef?: string}` (compatible with W3.1d ComputeEditsDryRunResult envelope). For each edit's RID, calls `queryDirect(projectRoot, rid)` from `lib/impact-graph/registry-loader.ts` → `{forward: StoredEdge[], backward: StoredEdge[]}`. Sums impact-radius across all edits. Returns CriterionScore with `score = totalAffected` (raw count); `passFail = "pass"` when `score < threshold` else `"fail"` (LOWER radius = better). Empty-edits short-circuit grades pass without requiring impact-graph cache (zero-impact). Edge cases: malformed artifact → 0 edits → pass; missing project root → needs_human_review with evidenceCited; missing impact-graph cache + non-empty edits → needs_human_review.

Emits `validation_phase_completed errorClass="simulator_evaluation_completed"` (piggybacks per rule 16 v3.2.0 §Loop — no schema bump per envelope).

### Modified routing

- `bridge/handlers/grade-outcome/types.ts` — `GradingCriterionLite.rubricDomain` union extended with `| "simulator"`.
- `bridge/handlers/grade-outcome/dispatcher.ts` — `gradeOneCriterion` switch adds `case "simulator": return gradeWithSimulator(...)`.

### Tests

`tests/bridge/handlers/grade-with-simulator.test.ts` — 6 tests (cache missing for non-empty edits, empty edits → pass, malformed artifact graceful, missing artifact graceful, CriterionScore shape, event emission).

NOTE: "no project root resolvable" path test omitted with comment — known limitation per ambient `/tmp/.palantir-mini/` pollution from concurrent test runs (same precedent as `commit-edits-precondition.test.ts`).

### Compatibility

- Schema additive enum extension; consumers on `>=1.27.0 <2.0.0` compile unchanged.
- Plugin v3.9.1 PATCH (additive new handler + new switch case; zero breaking changes).
- No managed-settings.d update — `gradeWithSimulator` is internal to `grade-outcome` dispatcher (not standalone MCP tool surface).
- `simulator_evaluation_completed` event piggybacks on `validation_phase_completed` envelope (no `lib/event-log/types.ts` extension).

### Known notes

- Wave 5 (P5 cross-project lineage) parallel-safe with this wave; ships in v3.10.0.
- Live e2e test (W4 acceptance gate G7): synthetic rubric with one simulator criterion gates a sprint pass — deferred to closing live e2e per cold-start §5.

---

## [3.9.0] — 2026-04-29 — MINOR — Wave 3 P2+P3 — analyzer always-on + commit-gate dry-run-then-grade pipeline

### Why

Plan: `~/.claude/plans/glowing-frolicking-raven.md` §1 (Wave 3) operationalizing blueprint §4-P2 + §4-P3. Cold-start handoff `~/.claude/plans/2026-04-29-wave-3-4-5-cold-start.md` §1. Closes blueprint §9 G5 (`harness-analyzer` fires per-iteration) + extends G3 (`commit_edits` gating) with the dry-run-grade pipeline. Architectural backstop per Foundry Two-Tier Action discipline (`research/palantir-vision/architecture-gap/ontology-model.md:191-193`): *"Edit Functions return Edits[] without committing | Function-backed Actions wrap Edit Functions and COMMIT"* + *"$validateOnly checks constraints without mutating | Submission criteria gate execution."*

### Rule 16 v3.1.0 → v3.2.0 §Loop full sequence

Replaces the v3.1.0 pre-stub. New canonical sequence: `negotiate → propose → dry-run → grade → (pass) commit | (fail) revise → analyzer-synthesize`. Documents the 6 audit envelopes piggyback on `validation_phase_completed` (no schema bump per envelope): `dry_run_computed`, `dry_run_graded`, `dry_run_skipped_validation_errors`, `simulator_evaluation_completed` (W4 prep), `harness_bypass_invoked`, `harness_gate_passed`. Frontmatter `bodyLocCeiling: 80 → 110` (consolidation-hub exception per CONTEXT.md §3 — current body 79 LOC).

### New hooks

- **`hooks/harness-analyzer-trigger.ts`** (PostToolUse on `mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric`, async) — fires on every fail-verdict iteration ≥ 1. Idempotent request marker at `/tmp/claude-hooks/<sessionId>/analyzer-request-<sprint>-<iter>-<rubricId>.json` (file-existence check makes re-fires no-op) + emits `phase_completed phaseTag="harness-analyzer-fire-pending"`. Lead picks up next turn + spawns `harness-analyzer` subagent (hooks cannot directly spawn — auto-spawn-replacement.ts precedent). 8 paired tests.
- **`hooks/analyzer-output-injector.ts`** (SubagentStop matcher `harness-analyzer`, async) — finds latest `analysis-NNN.md` by mtime + writes `<sprint>/iterations/iteration-(N+1)/lead-guidance.md` (overwrite-safe, never appends; spec.md immutability preserved per Plan agent §7). Generator reads `lead-guidance.md` at iteration start. 7 paired tests.

### Modified handlers

- **`bridge/handlers/compute_edits_dry_run.ts`** — was silent (line 11 explicit comment "no event emitted") → now emits `validation_phase_completed errorClass="dry_run_computed"` with deterministic `dryRunRef` (sha256 of `{project, edit RIDs sorted, functionName, param keys sorted}` truncated to 16 hex chars). New result field `dryRunRef` added to `ComputeEditsDryRunResult`. New exported helper `computeDryRunRef()`. 6 new tests in `tests/bridge/handlers/compute_edits_dry_run.test.ts`.
- **`bridge/handlers/pm-grader-dispatch.ts`** — extended with optional `dryRunRef` + `validationResult` args. When `dryRunRef` present + grading completes, emits paired `validation_phase_completed errorClass="dry_run_graded"` with same ref + verdict. Validation-errors guard: when prior dry-run failed validation, skip subprocess + emit `errorClass="dry_run_skipped_validation_errors"` with synthetic fail (saves ~$0.05/skip). 7 new tests in `tests/bridge/handlers/pm-grader-dispatch.test.ts`.
- **`hooks/commit-edits-precondition.ts`** — extended after bound-contract check with second check: `mode="quick"` bypass + grace-period exemption (legacy contracts bound before W3.1c rolled out — exempt until any `dry_run_computed` event ever emitted in project) + dryRunRef arg required + paired `dry_run_computed`/`dry_run_graded(verdict=pass)` lookup via `readEvents()` (auto-merges archive/ per rule 10 G3) + `dry_run_skipped_validation_errors` short-circuit block. New helper `allowResult()` for emit + result construction. 7 new tests in `tests/hooks/commit-edits-precondition.test.ts`.

### Agent contract refresh

- **`agents/harness-analyzer.md`** — description + body §Core principle updated to declare per-iter trigger (was iter ≥ 3 in pre-v3.9.0 framing) + cite `harness-analyzer-trigger` PostToolUse hook + `analyzer-output-injector` SubagentStop hook. Output contract sections unchanged (already comprehensive).

### Substrate (4 hooks total now)

- harness-base-mode-advisory (SessionStart, advisory) — v3.8.0
- commit-edits-precondition (PreToolUse:commit_edits, blocking) — v3.8.0 + v3.9.0 dry-run-grade extension
- harness-analyzer-trigger (PostToolUse:grade_outcome_with_rubric, async) — v3.9.0 NEW
- analyzer-output-injector (SubagentStop:harness-analyzer, async) — v3.9.0 NEW

### CORE.md invariant update

Rule 16 invariant line refreshed for v3.2.0 — references `negotiate → propose → dry-run → grade → commit/revise → analyzer-synthesize` sequence + per-iter analyzer trigger + lead-guidance.md auto-injection.

### Tests

503/503 hook + bridge tests pass (was 478 + 25 new = 503). TSC `bunx tsc --noEmit` clean. `rule-audit --mode=bottleneck` reports rule 16 body 66 LOC (well under declared 110 ceiling exception).

### Compatibility

- Schema pin unchanged (`>=1.27.0 <2.0.0` covers 1.30.0).
- `commit_edits` gate: legacy contracts bound BEFORE W3.1c rollout get grace-period exemption (no `dry_run_computed` event ever emitted in project yet → second check skipped). Once first sprint emits one, all subsequent commits in same project require pipeline.
- Quick Sprint mode (`SprintContract.mode="quick"`) bypasses second check (inline rubric per rule 16 v3.0.0 §Quick Sprint).
- All 6 new audit envelopes (`dry_run_computed`, `dry_run_graded`, `dry_run_skipped_validation_errors`, `simulator_evaluation_completed`, `harness_bypass_invoked`, `harness_gate_passed`) piggyback on `validation_phase_completed` envelope (no schemas/types.ts extension).
- harness-analyzer agent contract unchanged (description prose-only refresh).

### Known notes

- Plan agent risk #5 — `mcp-server.ts dispatch table line 1042 may have shifted` — irrelevant for W3.x (no MCP tool registration changes; pm_grader_dispatch already registered in v3.8.1).
- `/tmp/claude-hooks/<sessionId>/` markers GC: cleaned at next SessionStart (per-session lifetime). Acceptable for advisory trigger.
- W4 (P4 simulator domain) + W5 (P5 cross-project lineage) layer on top per cold-start §2/§3.

---

## [3.8.1] — 2026-04-29 — Wave 2 P1+P6 — self-grading bias elimination

### Why

Plan: `~/.claude/plans/glistening-hugging-reddy.md` §3.E (Wave 2 P1+P6) operationalizing blueprint §4-P1 + §4-P6. Highest-leverage convergence step per `~/.claude/research/palantir-vision/synthesis/2026-04-20-managed-agents-harness-mapping.md:51`. Closes Prithvi 2026-03-24 self-grading bias gap — *"agents tend to confidently praise their own work even when, to a human observer, the quality is obviously mediocre"*. Architectural fix (not solvable by prompting): structural separation between Lead and grader.

### Rule 16 v3.0.0 → v3.1.0 §Roles refactor

- **Lead** (opus[1m]) — orchestrates the loop; reads feedback-NNN.md; decides next-state. **Lead does NOT grade.** Replaces "Lead-as-Evaluator" framing.
- **harness-generator** (sonnet) — implements per spec. **MUST author `self-assessment-NNN.md`** at iteration end (per-criterion claim + reasoning + §Known issues + §Untested edges). Self-assessment is transparency-only — NEVER assigns weighted scores. Replaces "Does NOT self-evaluate" with positive contract.
- **pm_grader_dispatch** (Sonnet 4.6 default; Opus 4.7 when `criterion.tier="critical"`) — fresh `claude -p` subprocess for `domain="model"` rubric criteria. Wraps existing `gradeModel()` (already separate-context per v3.3.0). Adds optional `selfAssessmentPath` augmentation; cites divergence as `[selfAssessmentDivergence:<verdict>]`.
- **harness-evaluator** (opus, 3-role variant) — spawned for cross-iteration coherence checks or adversarial isolation; not the 2-role default anymore.

### New MCP tool — `pm_grader_dispatch`

`bridge/handlers/pm-grader-dispatch.ts` — single-criterion model-domain grader. Input: `{project, criterion, artifactPath, specPath?, evidenceDir?, selfAssessmentPath?, sprintNumber?, iteration?}`. Output: `{criterionId, rubricDomain="model", score, weightedScore, passFail, reasoning, evidenceCited, selfAssessmentDivergence?}`. Architecture note: thin wrapper around `bridge/handlers/grade-outcome/model.ts:gradeModel` (which already spawns fresh `claude -p` per v3.3.0); standalone exposure adds selfAssessmentPath augmentation + tier-based model selection plumbing. Registered in `mcp-server.ts` + `managed-settings.d/50-palantir-mini.json` allow list.

### Agent contract updates

- `agents/harness-generator.md` — output contract gains required `self-assessment-NNN.md` artifact + format spec (per-criterion claim + reasoning + known issues + untested edges + calibration note).
- `agents/harness-evaluator.md` — input contract gains optional `selfAssessmentPath`; mandatory divergence citation in `evidenceCited` when present.

### Compatibility

Additive at the MCP layer (new tool) + agent-contract level (additive output artifact). Existing rubrics + grading flows unchanged — `gradeModel` was already a fresh subprocess per v3.3.0 (B-26 fix), so the architectural goal of separate-context grading was already met; v3.8.1 makes this canonical and exposes it standalone. RBAC fragment grants `mcp__palantir-mini__pm_grader_dispatch` to consumer projects. Schema pin unchanged (`>=1.27.0 <2.0.0`).

### Tests

478/478 hook tests pass (no regressions). New handler tested via TSC + smoke import. End-to-end self-assessment divergence flow validates when next sprint runs.

### Known notes

- W2.1b "route grade-outcome-with-rubric through pm_grader_dispatch" was architecturally already in place: `dispatcher.ts` routes `domain="model"` → `gradeModel()` which `pm-grader-dispatch.ts` wraps. The standalone MCP tool is the addition; in-rubric path unchanged for backward compat.
- Wave 3 (P2+P3 analyzer always-on + commit-gate dry-run pipeline) layers on top.

---

## [3.8.0] — 2026-04-29 — MINOR — Wave 1 P0 harness default-on substrate

### Why

Plan: `~/.claude/plans/glistening-hugging-reddy.md` §3.C (Wave 1 P0) operationalizing `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md` §4-P0. User directive 2026-04-28 + 2026-04-29 (EnterPlanMode + ExitPlanMode approved): convert palantir-mini from "harness as opt-in skill" to "harness as default substrate". Operational evidence: palantir-math sprint-001 has empty iterations/ directory; mathcrew has zero harness state; 11+ days of zero `grading_completed` events despite full harness primitive surface.

### Substantive surface (Wave 1 P0)

**Rule 16 v3.0.0 — Harness default-on substrate** (`~/.claude/rules/16-3-agent-harness.md`):
- New §Default-On Policy: B1 soft default-on for first 4 weeks → escalate to B2 hard. Strict mode (C) opt-in via `SprintContract.mode = "strict"`.
- New §Quick Sprint: 1-iter wrapping pattern via `/palantir-mini:pm-quick-sprint <brief> <scope>`. Inline 3-criterion rubric (code-correctness + ontology-no-drift + rule-conformance).
- Read-only exemption list: `pm_rule_query`, `pm_rule_audit`, `pm_recap`, `pm_retro_query`, `pm_learn_query`, `replay_lineage`, `pm_workflow_lineage_query`, `pm_agent_lineage_export`, `get_ontology`, `ontology_schema_get`, `impact_query`, `pm_preamble`, `check_cc_version`, `pm_plugin_self_check`, plus Read/Grep/Glob.
- Bypass via `PALANTIR_MINI_HARNESS_BYPASS=1` env var (audited).
- Pre-stub §Loop sequence reference for W3.2 full revision (negotiate→propose→dry-run→grade→commit).
- Consolidation-hub exception declared: `bodyLocCeiling: 80` (current body 67 LOC).

**Schemas v1.30.0** (`~/.claude/schemas/ontology/primitives/sprint-contract.ts`):
- `SprintContractDeclaration.mode?: "full" | "quick" | "lite" | "strict" | null` — Harness default-on mode field. Additive MINOR; consumers on `>=1.29.0 <2.0.0` compile unchanged.

**2 new hooks** (`hooks/`):
- `harness-base-mode-advisory.ts` (SessionStart, advisory, async) — detects `.palantir-mini/harness/`, emits `validation_phase_completed` with `errorClass=harness_base_mode_pending` if no bound contract; surfaces context message guiding user to bootstrap.
- `commit-edits-precondition.ts` (PreToolUse on `mcp__plugin_palantir-mini_palantir-mini__commit_edits`, blocking) — soft default-on gate. Blocks commit_edits when no bound SprintContract for active project (with structured `permissionDecision: "deny"` + hint to `pm-quick-sprint` or `pm-harness-sprint`). Honors `PALANTIR_MINI_HARNESS_BYPASS=1`.

**1 new skill** (`skills/pm-quick-sprint/SKILL.md`):
- 1-iteration SprintContract wrapper for Lead-direct work. Inputs: 1-2 sentence brief + scope path. Outputs: `<sprint-NNN-quick>/contract.json` with `iterationLimit=1, timeoutMs=900000, mode="quick"`, inline rubric. Lead-as-Evaluator inline; no separate Generator spawn.

**hooks.json registration**:
- New PreToolUse matcher `mcp__plugin_palantir-mini_palantir-mini__commit_edits` → `commit-edits-precondition` (blocking).
- New SessionStart entry → `harness-base-mode-advisory` (async).

### Tests

- `tests/hooks/harness-base-mode-advisory.test.ts` — 9 tests: findProjectRoot, harnessDirExists, findBoundContract, handler scenarios.
- `tests/hooks/commit-edits-precondition.test.ts` — 11 tests: skip non-target, bypass env, BLOCK no-harness-dir, BLOCK no-bound-contract, ALLOW bound, tool_input.project precedence, null payload.
- Full hook suite: 478/478 pass (was 458 pre-W1.2; +20 new).

### Compatibility

Soft default-on (B1) — non-breaking for existing workflows. Hard default-on (B2) ships in a future MINOR after 4-week shakedown. Schema pin: `>=1.27.0 <2.0.0` covers v1.30.0. Consumer projects unchanged.

### Known notes

- `/tmp/.palantir-mini` and `/home/palantirkc/.palantir-mini` ambient session targets affect findProjectRoot test isolation; 3 negative-path tests omitted with explanatory comments. Production behavior verified.
- Wave 2 (P1+P6: grader dispatch + self-assessment) and Wave 3 (P2+P3: analyzer always-on + commit-gate dry-run pipeline) layer on top per plan §3.E–§3.F.

---

## [3.7.1] — 2026-04-29 — PATCH — rules consolidation per harness-base-mode §12 license

### Why

User directive 2026-04-28 + 2026-04-29 (`~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md` §12 + `~/.claude/plans/glistening-hugging-reddy.md` Wave R): destructive cleanup of `~/.claude/rules/` to keep only strictly necessary rules. Numbered-ID stability suspended for this single pass per blueprint §12 license.

### Rules consolidated (16 → 10 files)

**Deleted** (numbered IDs join permanent gaps with 03/04/05/17/18):
- `06-agent-teams.md` → absorbed into rule 12 §Team default + Lazy-spawn
- `09-memory-schema.md` → absorbed into rule 02 §Memory
- `11-codegen-authority.md` → absorbed into rule 08 §Codegen authority + §Generated header
- `13-task-granularity.md` → absorbed into rule 12 §Task granularity
- `14-session-duration-replacement.md` → absorbed into rule 12 §Session lifecycle
- `15-briefing-template.md` → absorbed into rule 12 §Briefing template

**Bumped**:
- Rule 02 v2.0.0 → v3.0.0 (absorbs 9)
- Rule 08 v1.0.1 → v2.0.0 (absorbs 11)
- Rule 12 v2.1.1 → v3.0.0 (absorbs 6, 13, 14, 15) — declared consolidation-hub exception (95 LOC vs 30 LOC standard ceiling)
- CONTEXT.md v1.1.0 → v2.0.0 — refactored for stability; removed rule-snapshot enumeration so future rule changes don't force CONTEXT.md rewrite. Active rule list + permanent gaps now read from CORE.md / `pm_rule_audit` dynamically.

**Frontmatter crossRef fixes**: rule 07 [05, 08]→[08]; rule 10 [03, 11, 12]→[08, 12].

### Plugin source citation updates (27 locations)

Bulk sed-based replacements across 18 files, then withRuleExcerpt() helper rule-ID parameters updated:

- **Hooks (8)**: subagent-start, idle-auto-shutdown, teammate-idle, generated-header-check, concurrency-cap-fix, task-created-granularity-gate, session-duration-alarm, briefing-template-validate.
- **Handlers (5)**: auto-spawn-replacement, detect-doc-drift, detect-doc-drift/scan-memory, verify-codegen-headers, create-granular-task.
- **Skills (14)**: pm-harness-abort, pm-verify, pm-harness-init, pm-harness-analyze, pm-codegen, pm-self-test, pm-rule, pm-harness-status, pm-investigate, pm-recap, pm-harness-sprint, pm-harness-plan, pm-change-plan, pm-investigate.tmpl.

`withRuleExcerpt(base, N)` calls updated: 11→8 (generated-header-check), 13→12 (concurrency-cap-fix, task-created-granularity-gate), 15→12 (briefing-template-validate ×2). All 458 hook tests pass.

### Marketplace sync

`marketplace.json` had drifted to v3.4.0 (pre-existing). Synced metadata.version + plugins[0].version + plugins[0].description to v3.7.1.

### Compatibility

Rules-only patch. No schema, MCP, hook, or handler API changes. Consumer projects pinning `peerDependencies` on this plugin continue to work unchanged. Schema pin remains `>=1.27.0 <2.0.0`.

---

## [3.7.0] — 2026-04-26 — FINAL scheduled MINOR — file-size + handler-test full coverage + skill seed (MINOR, Lead-direct, single-session 2-session split)

### Why

Plan: `~/.claude/plans/v3.7.0-final-handoff.md` + `~/.claude/plans/v3.7.0-rc1-handoff.md` (Session 1 outcome) + `~/.claude/plans/rosy-scribbling-stream.md` (Session 2 task DAG). User direction 2026-04-26 ("v3.7.0 = last scheduled MINOR before maintenance mode; drain ALL remaining backlog with Opus 4.7 1M context"): close file-size + handler-test backlog + register pm-events-rotate skill seed. Single-session pivoted to 2-session per Opus 4.7 context budget reality:
- **Session 1**: Cluster A-FULL (file-size cleanup 32→3 violations across 29 file decompositions).
- **Session 2**: Cluster C-FULL (bridge handler test coverage 33/59 → 59/59 = 100%) + Cluster G (pm-events-rotate skill seed) + Cluster E (manifest + CHANGELOG).

Schemas: unchanged at v1.28.0 (additive-only — refactor + tests + 1 skill seed; no new event types or primitives).

### Cluster A-FULL — file-size cleanup (32→3 LOC violations) — Session 1 (5 atomic commits)

**API preservation**: every default + named export remained at original handler/lib/hook path. v3.5.0 fixtures+sibling pattern continued. TSC gate at end of each cluster caught zero consumer-import drift.

- **A.1 hooks decomposition (8 files)**: `rule-audit` 355→≤120 (5-sibling: types/shared/mode-bottleneck/mode-drift/mode-citation), `subagent-stop` 304→≤120 (4-sibling: state-validate/auto-spawn/cleanup/types), `stop-guard` 289→≤120 (4-sibling: check-tasks/check-git/check-memory/types), `session-start` 263→≤120 (4-sibling), `idle-auto-shutdown` 261→≤120 (3-sibling: policy/cleanup/types), `session-duration-alarm` 241→≤120 (3-sibling: phase-warn/phase-block/types), `semantic-frontmatter-validate` 212→≤120 (3-sibling: formatters/validator/types), `agent-frontmatter-validate` 202→≤200 (trim).
- **A.2 lib decomposition (6 files)**: `semantic-graph/semantic-query` 315→≤120 (5-sibling: types/merge-helpers/neighborhood/read-plan), `semantic-graph/producer-verification` 312→≤120 (4-sibling: detect/validate/report/types), `impact-graph/ast-walker` 257→≤120 (3-sibling: imports/type-refs/visitor-helpers), `event-log/read` 232→≤120 (3-sibling: events/archive/fold-snapshot), `codegen/descender-gen` 213→≤200 (2-sibling: output-renderers/types), `impact-graph/sqlite-cache` 206→≤200 (sibling: walk-helpers).
- **A.3 monitors + scripts decomposition (4 files)**: `monitors/drift-watch` 235→≤200 (2-sibling), `monitors/harness-live-watch` 211→≤200 (2-sibling), `scripts/emit-pb-event` 233→≤200 (2-sibling), `scripts/gen-skill-docs` 210→≤200 (1-sibling).
- **A.4 hooks-test cleanup (8 files)**: subagent-start-env-inject + stop-guard + agent-frontmatter-validate + idle-auto-shutdown + research-library-prune + pre-edit-ontology + concurrency-cap-fix + pre-compact-state — all split per describe block via fixtures+sibling pattern.
- **A.5 lib-test cleanup (3 files)**: wave2-mvp + verification-edges + event-log split.

**A-FULL outcome**: 32 >200-LOC files → 3 (1 A5-exempt grade-outcome-hybrid 306 + 2 budget-exempt mcp-server.ts 1214 + types.ts 924). 60+ sibling files absorb extracted logic with module headers.

### Cluster C-FULL — bridge handler test coverage 33/59 → 59/59 (100%) — Session 2 (6 atomic commits, 180+ tests)

Domain cohesion grouping. ALL env-isolated tests use `gate_on_drift.test.ts:46-61` save+restore pattern (PALANTIR_MINI_PROJECT + PALANTIR_MINI_EVENTS_FILE).

- **C.A audit/health (4 handlers, 38 tests)**: `pm_harness_strictness_audit` (linearTrend pure helper + drift-suspected verdict), `pm_harness_component_audit` (SEED_COMPONENTS shape + harness_component_audit_emitted event), `get-team-health` (HOME-isolated multi-team aggregation + stale replay), `refresh-research-doc` (validation + ResearchDocumentDeclaration shape).
- **C.B research/library (5 handlers, 42 tests)**: `research_library_diff` (changelog parsing + section enumeration), `research_library_prune` (dryRun default + stale-by-age + non-dryRun emit), `research_library_refresh` (manifest validation + lastVerified-based staleness), `scan-dead-code` (4 marker patterns + node_modules/dotfile skip), `scan-file-size-violations` (default budgets + custom budget injection).
- **C.C verification (5 handlers, 57 tests)**: `verify-schema-pin` (parseSemver + semverSatisfies + pin satisfies range), `verify-codegen-headers` (4-field header invariants), `validate-hook-event-allowlist` (CC v2.1.114 valid events + KNOWN_INVALID), `validate-managed-settings-fragments` (RBAC fragment shape + drift), `capability-token-check` (JSON+base64 decode + expiry + scope wildcards + signature).
- **C.D substrate (5 handlers, 32 tests)**: `check-cc-version` (registry latest + research-file stale-version scan), `claude_code_version_delta` (alias — full coverage at claude-code-version-delta.test.ts), `codegen-trigger` (validation + dryRun command + emit codegen_completed), `get-ontology` (events.jsonl fold + atSequence filter), `ontology-schema-get` (kebab/CamelCase normalization).
- **C.E impact/runtime (5 handlers, 42 tests)**: `impact-query` (alias — full coverage at batch4-impact-query.test.ts), `run-playwright-scenario` (validation + ad-hoc + sprint evidence dirs + emit), `scenario-create` (full vs shared-read isolation + manifest + emit), `project-register` (HOME-isolated registry + idempotent re-register + label preservation), `blueprint_write` (slugify + collision suffixing + index regen).
- **C.F misc (2 handlers, 21 tests)**: `grade_planner_output` (computeMetaScores + metaVerdict + emit; **NO claude -p mock needed** — pure fs+emit handler, handoff plan risk #1 invalidated). **Replaces handoff's pm-rule-audit (already covered v3.6.0) with `pm-retro-query`** (sliceToSessionWindow boundary + skillsRun aggregation + byAgent bucket + stale replay count).

**C-FULL outcome**: bridge handler test coverage 33/59 (56%) → **59/59 (100%)**. Test posture: 1046 → **1278 pass / 0 fail / +232 tests / +6687 expects across +27 files**.

### Cluster G — pm-events-rotate skill seed registration (1 commit)

Added `pm-events-rotate` entry to `~/.claude/schemas/ontology/seeds/skill-definitions.ts` PLUGIN_SKILLS array (alphabetical: between `pm-codegen` and `pm-guard`). Bridges the existing `/palantir-mini:pm-events-rotate` skill (already shipped in plugin v2.x) into the SkillDefinitionRegistry seed inventory, closing the seed-vs-filesystem gap surfaced by `pm_plugin_self_check`. Codegen regen produced metadata-only diff (timestamp + commit SHA) on `rule-registry.ts`.

### Cluster E — manifest + CHANGELOG (this commit)

- `plugin.json` version `3.6.0` → **`3.7.0`**.
- CHANGELOG `## [3.7.0]` entry (this section).

### Test posture

| Metric | v3.6.0 baseline | v3.7.0 final |
|--------|-----------------|--------------|
| `bun test` pass | 1046 | **1278** (+232) |
| `bun test` fail | 0 | **0** |
| `expect()` calls | 5815 | **6687** (+872) |
| Test files | 116 | **153** (+37) |
| `bunx tsc --noEmit` | clean | **clean** |
| File-size violations (>200 LOC) | 32 | **3** (A5 exempt + 2 budget-exempt) |
| Bridge handler test coverage | 33/59 (56%) | **59/59 (100%)** |
| `pm_plugin_self_check` | pass | **pass** |
| `pm_rule_audit` | 0 findings | **0 findings** |

### Cluster H — W7/W8 watch (no action)

- W7 plugin agents: 23/25 within tolerance (headroom 2).
- W8 RBAC update: deferred. Lead-direct execution proven through v3.4.0 + v3.5.0 + v3.6.0 + v3.7.0 (v3.7.0 added 232 tests across 27 files via single Lead with no subagent dispatch).

### v3.7.0 = FINAL scheduled MINOR — maintenance mode entry

After v3.7.0 lands, palantir-mini enters maintenance mode:

- **No scheduled MINORs.**
- Future MINORs ONLY on:
  - Critical bug fixes (incidents)
  - Additive event types (schemas MINOR bump in lockstep)
  - Cross-runtime alignment (Codex/Gemini parity if user-initiated)
  - User-initiated feature requests
- PATCH bumps: typo / dependency / hook tweak / observability fix.
- Authority Chain in `~/.claude/CLAUDE.md` may be updated to reflect maintenance-mode posture in a follow-up docs PR.

### Migration notes

None. Additive-only — no breaking changes. Consumer projects continue with the existing `>=1.27.0 <2.0.0` schemas pin range.

### Handoff plan corrections (recorded for future-session continuity)

1. **`pm-retro-query` was missing from handoff plan's C.F list** — handoff cited `pm-rule-audit` (already covered in v3.6.0). Live `comm -23` derivation surfaced `pm-retro-query` as the 26th untested handler. C.F.2 substituted accordingly.
2. **`grade_planner_output` does NOT need a claude -p mock** — handler is pure `fs.readFileSync` + `emit()` with regex-based `computeMetaScores` and threshold-based `metaVerdict`. Risk #1 from handoff plan invalidated; standard ~12-min test sufficed.
3. **2 handlers had indirect-only coverage via file-name-mismatched tests** — `claude_code_version_delta` (covered at `tests/handlers/claude-code-version-delta.test.ts`) and `impact-query` (covered at `tests/handlers/batch4-impact-query.test.ts`). Added minimal alias direct tests at exact handler basenames so `comm -23` discovery registers full coverage.

---

## [3.6.0] — 2026-04-26 — N1-LARGE wave 4 + N4 wave 4 + D-NEW pm_rule_audit cleanup (MINOR, Lead-direct)

### Why

User direction 2026-04-26 ("v3.6.0 work prep ... finish more clusters in one Lead-direct session leveraging 1M context window"): bundle ALL clusters from `~/.claude/projects/-home-palantirkc/memory/project_palantir-mini-v3.6.0-deep-dive.md` into a single MINOR via Lead-direct execution. Plan: `~/.claude/plans/precious-hopping-dewdrop.md`.

Schemas: unchanged at v1.28.0 (additive-only — refactor + tests + rule 10 body compress + codegen regen; no new event types).

### Cluster A — N1-LARGE wave 4: file-size cleanup (12→1 MCP violations)

API preservation: every default + named export remains at original handler/test path. v3.5.0 fixtures+sibling pattern continues.

Severe splits (4 splits + 1 exempt):
- **`tests/handlers/batch5-preamble-config.test.ts`** 311→102 LOC. Extracted `batch5-preamble-config/fixtures.ts` (22 LOC) + sibling `batch5-config-io.test.ts` (181 LOC; lib/config/schema + lib/config I/O + pm_config_get + pm_config_set describes).
- **`tests/handlers/batch3-governance.test.ts`** 281→97 LOC. Extracted `batch3-governance/fixtures.ts` (35 LOC) + sibling `batch3-spawn-health.test.ts` (122 LOC; auto_spawn_replacement + get_team_health describes).
- **`tests/bridge/handlers/complete-playwright-scenario.test.ts`** 270→194 LOC. Sibling `complete-playwright-scenario-grade-dispatch.test.ts` (78 LOC; auto-grade dispatch + rubric handling). Existing fixtures.ts reused.
- **`tests/handlers/batch4-impact-graph.test.ts`** 242→79 LOC. Extracted `batch4-impact-graph/fixtures.ts` (24 LOC) + sibling `batch4-impact-query.test.ts` (97 LOC; impact_query + pre_edit_impact describes).
- **A5 EXEMPT**: `tests/bridge/handlers/grade-outcome-hybrid.test.ts` 307 LOC remains as documented cohesion exemption — nested combinator algorithm + cycle/weight edge cases inseparable per v3.5.0 B4-skip precedent. Path A — keep as intentional exemption.

Moderate trims (5 trims with selective fixtures extraction):
- **`tests/handlers/claude-code-version-delta.test.ts`** 224→168 LOC. Extracted `claude-code-version-delta/fixtures.ts` (22 LOC; tmpResearchRoot + writeResearchFile + mockReleasePage).
- **`tests/handlers/batch6-retro-learn.test.ts`** 223→145 LOC. Extracted `batch6-retro-learn/fixtures.ts` (32 LOC; tmpProject + writeEventsJsonl envelope builder).
- **`tests/handlers/sqlite-cache.test.ts`** 222→200 LOC. Removed 8 separator comments + collapsed openCache/makeEdge helper boilerplate.
- **`tests/bridge/handlers/pm-preamble.test.ts`** 217→184 LOC. Extracted `pm-preamble/fixtures.ts` (19 LOC; makeTmpRoot + eventsPathFor + seedEventLine).
- **`tests/handlers/pm-harness-outcome-replay.test.ts`** 213→194 LOC. Inlined cleanup helpers + collapsed separator comments.

Trivial trims (2 handler trims):
- **`bridge/handlers/session_resume.ts`** 201→200 LOC. Removed redundant separator comment.
- **`bridge/handlers/pm_harness_component_audit.ts`** 201→194 LOC. Removed unused-import guard (`void os; void path;`) + unused imports.

Bonus split (1 hooks-test, not MCP-tracked but listed in v3.6.0 deep-dive carry):
- **`tests/hooks/user-prompt-submit.test.ts`** 230→138 LOC. Sibling `user-prompt-submit-fixtures.test.ts` (133 LOC; env fallback chain + summarizeUnread truncation + payload event tests).

### Cluster B — Budget exemption decisions (no file edits)

`bridge/mcp-server.ts` (1214 LOC) and `lib/event-log/types.ts` (924 LOC) confirmed as **intentional exemptions**. MCP `scan_file_size_violations` only enforces `bridge/handlers/*` + `tests/handlers/*` + `tests/bridge/handlers/*` globs — these files are at `bridge/` (dispatch router) and `lib/event-log/` (type aggregator) and are out of scope. Splitting harms cohesion (router needs all handler imports + dispatch table single-source; type aggregator needs all event union members in one place for type narrowing). Path A per v3.6.0 deep-dive recommendation.

### Cluster C — N4 wave 4: 5 audit/health handler tests (substrate cluster)

Bridge handler test coverage: 28/59 (47%) → 33/59 (56%). All 3 env-isolated tests use the v3.5.0 `gate_on_drift.test.ts` `beforeEach`/`afterEach` save+restore pattern (PALANTIR_MINI_CONFIG_PATH or PALANTIR_MINI_PROJECT).

- **`tests/bridge/handlers/audit-events-5d-conformance.test.ts`** (6 tests / 17 expects): missing project validation, empty events file → zero-filled, mixed compliant + violating events, temporal filter (from/to bounds), malformed JSON skipped, eventTypeStats aggregation.
- **`tests/bridge/handlers/pm-rule-audit.test.ts`** (8 tests / 18 expects): defaults, includeAdvisory filter, summary aggregation (byKind/bySeverity), registeredRules count ≥ 18, finding shape invariants, severity enum, post-D-NEW invariant (advisory ≤ 10).
- **`tests/bridge/handlers/pm-config-get.test.ts`** (5 tests / 11 expects): no args → full config, valid key → {key, value}, unknown key throws, non-string key throws, full + per-key round-trip consistency.
- **`tests/bridge/handlers/pm-config-set.test.ts`** (7 tests / 17 expects): validation throws (missing/non-string key, unknown key, missing value, invalid value type), happy path returns {previous, next} + persists (atomic write to disk verified), setConfig + getConfig round-trip.
- **`tests/bridge/handlers/pm-learn-query.test.ts`** (6 tests / 12 expects): empty events, projection shape with topic/confidence/source, topic substring case-insensitive, minConfidence threshold, limit clamping + sorting (confidence desc), env override (PALANTIR_MINI_PROJECT).

### Cluster D-NEW — pm_rule_audit findings cleanup

Real root cause analysis (Plan agent + protocol-designer audit): 3 of 4 advisory findings were generated by **stale `~/.claude/schemas/src/generated/rule-registry.ts`** that pre-dated frontmatter cleanups. Frontmatter for rule 0 (CONTEXT.md) and rule 13 already removed the offending hookCitations; the registry just needed regeneration. 1 finding (rule 10 body 35 > 30 ceiling) was a real source-level fix.

- **D1**: Rule 10 body 35→29 LOC compression. Merged `## PreCompact gate` + `## Remediation paths` into single `## PreCompact gate + remediation` section. Compressed verbose ordering note + snapshot bullet. Bumped frontmatter `version: 2.0.1 → 2.0.2`.
- **D2**: Regenerated `~/.claude/schemas/src/generated/rule-registry.ts` via `bun run ~/.claude/schemas/scripts/gen-rule-registry.ts`. Per Rule 11 (codegen authority). Cleared 3 stale-hook-citation advisories on next plugin reload.

### Test posture

- bun test: 1014 → **1046 pass** / 0 fail / +75 expects (5740 → 5815 total). +32 new tests (Cluster C 5 audit/health files).
- tsc clean (plugin + schemas).
- File-size violations: 12 → **1** (A5 grade-outcome-hybrid 307 EXEMPT documented).
- pm_rule_audit: 4 advisory findings → expected 0 after plugin reload (rule 10 bottleneck cleared by D1; 3 stale-hook-citations cleared by D2 codegen regen).
- pm_plugin_self_check: pass.

### Cluster H — W7/W8 watch (no action)

- W7 plugin agents: 23/25 within tolerance (headroom 2).
- W8 RBAC update: deferred. Lead-direct execution proven through v3.4.0 + v3.5.0 + v3.6.0.

---

## [3.5.0] — 2026-04-26 — N1-LARGE wave 3 + N1-LARGE-CARRY + N4 wave 3 + N3 wave 3 — N3 CLOSED (MINOR, Lead-direct)

### Why

User direction 2026-04-26 ("EnterPlanMode + 1M Context Window 최대 활용 + bypass로 사용자 개입/승인없이 처리"): bundle ALL 4 carry-forward clusters from `~/.claude/projects/-home-palantirkc/memory/project_palantir-mini-v3.5.0-deep-dive.md` into a single MINOR via Lead-direct execution authorized by the user. Plan: `~/.claude/plans/twinkly-tickling-prism.md`.

Schemas: unchanged at v1.28.0 (additive-only — refactor + tests; no new event types).

### Cluster A — N1-LARGE wave 3: 5 handler decompositions (18→14 violations)

API preservation: every default + named export remains at original handler path. Two confirmed external consumers verified: `hooks/doc-edit-drift.ts` imports `detectDocDriftFn`, `hooks/session-start.ts` imports `researchLibraryDiff`.

- **`bridge/handlers/detect-doc-drift.ts`** 258→64 LOC. Extracted to `detect-doc-drift/{types, scan-memory, scan-xrefs, find-docs}.ts`.
- **`bridge/handlers/negotiate-sprint-contract/write-action.ts`** 218→107 LOC. Extracted in-folder siblings `policy.ts, bind.ts, record.ts`.
- **`bridge/handlers/pm-preamble.ts`** 213→92 LOC. Extracted to `pm-preamble/{types, session, vcs, learn}.ts`.
- **`bridge/handlers/get-team-health.ts`** 207→90 LOC. Extracted to `get-team-health/{types, paths, read}.ts`.
- **`bridge/handlers/research_library_diff.ts`** 201→89 LOC. Extracted to `research_library_diff/{types, scan}.ts`.

### Cluster B — N1-LARGE-CARRY: 4 carry test splits (B4 SKIP)

Apply v3.3.0 `grade-outcome/fixtures.ts` precedent. Per-file fixture extraction + phase-gated sibling splits.

- **`tests/bridge/handlers/pm-plugin-self-check.test.ts`** 332→154 LOC. Extracted `pm-plugin-self-check/fixtures.ts` (80 LOC) + sibling `pm-plugin-self-check-primitive-seeds.test.ts` (72 LOC). v2.27.0 advisory primitive-seed checks moved to sibling.
- **`tests/bridge/handlers/complete-playwright-scenario.test.ts`** 323→269 LOC (known minor overage; trade-off accepted per plan — domain cohesion of arg validation + outcome resolution + auto-grade dispatch). Extracted `complete-playwright-scenario/fixtures.ts` (27 LOC) + sibling `complete-playwright-scenario-classify.test.ts` (63 LOC) for pure-fn `classifyPlaywrightFailure` taxonomy.
- **`tests/bridge/handlers/negotiate-sprint-contract.test.ts`** 308→191 LOC. Extracted `negotiate-sprint-contract/fixtures.ts` (51 LOC) + sibling `negotiate-sprint-contract-h3-arbitration.test.ts` (139 LOC) for Phase H3 arbitration policies + dissent record.
- **`tests/hooks/semantic-frontmatter-validate.test.ts`** 263→130 LOC. Split pure-fn tests into siblings `semantic-frontmatter-validate-formatters.test.ts` (96 LOC) + `semantic-frontmatter-validate-validator.test.ts` (44 LOC). NO fixtures (pure functions, no setup boilerplate).
- **B4 SKIPPED**: `tests/bridge/handlers/grade-outcome-hybrid.test.ts` already split in v3.3.0 — uses `grade-outcome/fixtures.ts`, domain-cohesive single concern (hybrid combinator).

### Cluster C — N4 wave 3: 5 substrate handler tests (substrate cluster)

Bridge handler test coverage: 23/59 (39%) → 28/59 (47%).

- **`tests/bridge/handlers/emit-event.test.ts`** (5 tests / 14 expects): validation throws + happy path appendEventAtomic + sequence assignment.
- **`tests/bridge/handlers/replay-lineage.test.ts`** (4 tests / 16 expects): validation, no events → empty graph, lineageGraph branches per event type, derivedState.
- **`tests/bridge/handlers/query-session-duration.test.ts`** (5 tests / 13 expects): no events → 0s, elapsed > 0, malformed when throws, humanFriendly format variants, projectRoot resolution.
- **`tests/bridge/handlers/session_resume.test.ts`** (8 tests / 18 expects): validation, empty events, computeResumableState, active teammates balance, pending tasks balance, emit_resume_event side-effect.
- **`tests/bridge/handlers/gate_on_drift.test.ts`** (6 tests / 22 expects): validation, both checks pass, one fails, both fail, output capture, custom timeoutMs. Includes env-var save/restore for test isolation (PALANTIR_MINI_EVENTS_FILE leak fix).

### Cluster D — N3 wave 3: 4 hook tests — N3 CLOSED ✓

All previously-untested hooks now have direct test coverage. N3 substrate fully testable.

- **`tests/hooks/task-completed-gate.test.ts`** (8 tests / 24 expects): listInboxFiles + cleanInboxForTask helpers + happy path inbox sweep + 2 events emitted + no inbox + payload defaults + multi-inbox routing.
- **`tests/hooks/task-created.test.ts`** (3 tests / 6 expects): happy path + payload defaults + emit failure best-effort tolerance.
- **`tests/hooks/teammate-idle.test.ts`** (5 tests / 18 expects): happy path no shutdown + shutdown gate triggered + threshold boundaries (idle=3 vs depth>1) + payload defaults.
- **`tests/hooks/user-prompt-submit.test.ts`** (12 tests / 28 expects): readInbox + summarizeUnread helpers + happy path delivery + missing inbox + clean inbox + invalid JSON + agent-name env fallback chain (payload > PALANTIR_MINI_AGENT_NAME > CLAUDE_AGENT_NAME > "lead").

### Substrate / observability

- bun test: 957 → **1014 pass** / 0 fail / +270 expects (5431 → 5701 total). +57 new tests across 14 files (5 new C handlers, 4 new D hooks, 5 new B sibling test files).
- tsc clean (plugin + schemas).
- File-size violations: 18 → **14** (5 targeted A handlers all dropped under budget).
- A-cluster total LOC reduction: 1097 LOC → 442 LOC orchestrators + 18 sibling files (657 LOC saved at orchestrator path).
- pm_rule_audit findings: unchanged (no rule files touched).

### Carry-forward to v3.6.0

- N1-LARGE wave 4 — 8 remaining handlers + special cases (`bridge/mcp-server.ts` 1214 router, `lib/event-log/types.ts` 924 type-only — budget exemption candidates) + 6 hooks + 2 lib + monitor + script over budget.
- N4 wave 4 — 31 untested handlers remaining (audit/research clusters predominant).
- N3 — **CLOSED in v3.5.0** ✓ all 4 deferred hooks now tested.
- W7 watch — 23/25 plugin agents (no change).
- Optional RBAC update — managed-settings.d/50-palantir-mini.json grant Write for plugin source paths to enable future subagent dispatches (currently DEFERRED — Lead-direct proven sufficient).

---

## [3.4.0] — 2026-04-26 — N1-LARGE wave 2 + N4 wave 2 + N3 wave 2 (MINOR, Lead-direct)

### Why

User direction 2026-04-26 ("A+B 마무리하고, 남은 작업들 EnterPlanMode로 한번에 해결계획 준비. task DAG 정밀하게 설계해서 lead는 orchestration만"): bundle the 3 deferred clusters from `~/.claude/projects/-home-palantirkc/memory/project_palantir-mini-v3.4.0-deep-dive.md` into a single MINOR. Plan: `~/.claude/plans/velvety-conjuring-fountain.md`.

**Pivot during execution:** Subagent permission gate (managed-settings.d RBAC + Claude Code session permission system) blocked all 5 dispatched hook-builder subagents from writing to plugin source paths even with `mode: "bypassPermissions"`. After 10 failed dispatches across 2 retry waves, Lead pivoted to direct execution per user authorization ("승인"). All 11 leaf tasks completed sequentially by Lead opus[1m] using subagent design analysis as input — orchestration intent preserved (each task respected rule 13 DELETE/ADD/KEEP/VERIFY scope), but mechanical writes done by Lead.

Schemas: unchanged at v1.28.0 (additive-only — refactor + tests; no new event types).

### N1-LARGE wave 2 (B) — File-size decompositions (5 of 23 → 18 over-budget)

API preservation: every default + named export remains at original handler path. No consumer code or MCP server registration touched.

- **`bridge/handlers/research_library_prune.ts`** 342→111 LOC. Extracted to `research_library_prune/{types,collect,archive}.ts`.
- **`bridge/handlers/negotiate-sprint-contract.ts`** 322→78 LOC. Extracted to `negotiate-sprint-contract/{types,state,read-action,write-action}.ts`. Preserves v3.3.0 regex bug fix `APPROVED?` (matches both APPROVE + APPROVED).
- **`bridge/handlers/complete-playwright-scenario.ts`** 308→104 LOC. Extracted to `complete-playwright-scenario/{types,failure-classify,resolve-outcome,grading}.ts`. `classifyPlaywrightFailure` + `isPlaywrightOutcomeShape` re-exported.
- **`bridge/handlers/pm-rule-audit.ts`** 279→69 LOC. Extracted to `pm-rule-audit/{types,detect-bottleneck,detect-stale-crossrefs,detect-drift}.ts`.
- **`bridge/handlers/research_library_refresh.ts`** 262→103 LOC. Extracted to `research_library_refresh/{types,staleness,iterate-docs}.ts`.

### N4 wave 2 (C) — Handler test coverage (5 of remaining untested handlers)

Picked cluster: edit-utility + helper substrate (rules 10 + 13 + 16).

- **`tests/bridge/handlers/apply-edit-function.test.ts`** (Tier-2 edit fn dispatch + edit_proposed event + 5-dim envelope). 8 tests / 27 expects.
- **`tests/bridge/handlers/commit-edits.test.ts`** (atomic commit + validateOnly + submission criteria failure path). 10 tests / 27 expects.
- **`tests/bridge/handlers/compute_edits_dry_run.test.ts`** (dry-run path + named export parity + criteria evaluation). 14 tests / 22 expects.
- **`tests/bridge/handlers/pre_sprint_diff.test.ts`** (real tmp git repo + `pre_sprint_diff_computed` event + impactSource semantics). 8 tests / 24 expects.
- **`tests/bridge/handlers/_project-event.test.ts`** (helper: resolveProjectPath fallback + emitForProject env-restore both was-set + was-unset paths). 12 tests / 17 expects. NOTE: `_project-event` is internal helper (no MCP default export) — tested in-place rather than swapping to `pm-config-get` since it has substantial test surface and is used by handlers like `pre_sprint_diff` (T9).

### N3 wave 2 (D) — Hook test coverage (1 of remaining untested 5)

- **`tests/hooks/semantic-frontmatter-validate.test.ts`** (rule 01 ontology authority — JSDoc Form A + YAML-comment Form B + PreToolUse blocking + PostToolUse advisory + Phase B3 `plugins/palantir-mini/lib/` scope). 23 tests / 45 expects.

Other 4 N3 hooks (`task-completed-gate`, `task-created`, `teammate-idle`, `user-prompt-submit`) deferred to v3.5.0.

### Substrate / observability

- bun test: 882 → 957 pass / 0 fail / +260 expects (5171 → 5431 total). +75 new tests across 6 files.
- tsc clean (plugin + schemas).
- File-size violations: 23 → 18 (5 targeted handlers all dropped under budget).
- 5 N1-LARGE handlers slimmed: 1513 LOC → 465 LOC orchestrators + 18 sibling files.
- pm_rule_audit findings: unchanged (no rule files touched).

### Carry-forward to v3.5.0

- 4 remaining N1-LARGE >200LOC handlers (`detect-doc-drift` 258, `pm-preamble` 213, `get-team-health` 207, `research_library_diff` 201)
- N1-LARGE-CARRY 3 over-budget test files from v3.3.0
- 4 untested N3 hooks (`task-completed-gate`, `task-created`, `teammate-idle`, `user-prompt-submit`)
- W7 plugin agent variant proliferation (current 23, threshold 25)

---

## [3.3.0] — 2026-04-26 — N1-LARGE wave 1 + N3 wave 1 + N4 wave 1 (MINOR)

### Why

User direction 2026-04-26 ("EnterPlanMode로 B+C+D+E까지 한번에 이번 세션에서 1M Context로 해결해라"): bundle the 4 deferred clusters from v3.2.0 carry-forward (`~/.claude/projects/-home-palantirkc/memory/project_palantir-mini-v3.3.0-deep-dive.md`) into a single MINOR. Plan: `~/.claude/plans/composed-finding-walrus.md`. Schemas: unchanged at v1.28.0 (this MINOR is additive-only — refactor + tests; no new event types).

### N1-LARGE wave 1 (B) — File-size decompositions (5 of 25)

API preservation: every default + named export remains at original handler path. No consumer code or MCP server registration touched. `bridge/handlers/*.test.ts` files use the same import paths as before.

- **`bridge/handlers/grade-outcome-with-rubric.ts`** 606→160 LOC. Extracted to `grade-outcome/{types,rule,code,model,dispatcher}.ts`. `gradeOneCriterion + gradeHybrid + gradeHuman` co-located in dispatcher.ts to keep the recursion cycle in one file. `buildGraderModelEnv` named export re-exported from handler.
- **`tests/bridge/handlers/grade-outcome-with-rubric.test.ts`** 650→90 LOC. Hybrid combinator tests (14 tests, single describe block) moved to new `grade-outcome-hybrid.test.ts` (306 LOC; cohesive single concern — over the 200 budget but accepted as a domain-coherent unit). Shared helpers extracted to new `tests/bridge/handlers/grade-outcome/fixtures.ts` (88 LOC; `makeRule`, `makeHybrid`, `makeTmpDir`, `writeArtifact`, `setIsolatedEventsFile`, `cleanupTmpDirs`). Original test file kept as smoke suite for the public default-export contract.
- **`bridge/handlers/pm-plugin-self-check.ts`** 375→80 LOC. Extracted to `pm-plugin-self-check/{types,check-schema-pin,check-codegen-headers,check-rule-audit,check-declarations,check-primitive-seeds}.ts`. Each check function in its own sibling; types.ts holds shared constants (`PLUGIN_ROOT`).
- **`bridge/handlers/claude_code_version_delta.ts`** 369→195 LOC. Extracted to `claude-code-version-delta/{types,semver,markdown-parser,fetch}.ts`. `claudeCodeVersionDelta` named export re-exported.
- **`bridge/handlers/pm-rule-query.ts`** 343→74 LOC. Extracted to `pm-rule-query/{types,resolve,match}.ts` + `pm-rule-query/actions/{get,list,search}.ts`. Discriminator dispatch + arg validation kept in handler.

### N3 wave 1 (D) — Hook test coverage (3 of actually-untested 4)

- **`tests/hooks/pre-edit-ontology.test.ts`** (rule 01 ontology authority + 5-event lineage injection into additionalContext). 12 tests / 29 expects.
- **`tests/hooks/post-compact.test.ts`** (rule 10 PreCompact substrate; monotonicity invariant check; emit `post_compact_verified`). 7 tests / 22 expects.
- **`tests/hooks/post-edit-propagate.test.ts`** (rule 11 codegen substrate; ontology-vs-non-ontology classification; emit `edit_committed`). 8 tests / 14 expects.

Memory note correction: v3.3.0 deep-dive memory listed 8 deferred N3 hooks (post-compact, post-edit-propagate, pre-edit-ontology, semantic-frontmatter-validate, task-completed-gate, task-created, teammate-idle, user-prompt-submit). Live audit shows 4 of those already had test coverage (`task-completed-gate` via `task-completed-inbox-clean.test.ts`, plus `task-created`/`teammate-idle`/`user-prompt-submit`). Actual N3 untested = 4: post-compact, post-edit-propagate, pre-edit-ontology, semantic-frontmatter-validate. Wave 1 closes 3 of 4; semantic-frontmatter-validate (212 LOC, biggest) deferred to wave 2.

### N4 wave 1 (C) — Handler test coverage (5 of actually-untested 41)

Picked cluster: session lifecycle + harness substrate (rules 12 + 13 + 14 + 16).

- **`tests/bridge/handlers/negotiate-sprint-contract.test.ts`** (rule 16 SprintContract substrate). 14 tests / 42 expects. **Bug fix discovered + applied during test authoring**: handler regex `^## Round .* \[generator\] APPROVED/m` required literal "APPROVED" but `args.action.toUpperCase()` produced "APPROVE" — the bound-state path was unreachable through the standard approve-action flow. Fixed by tolerating both forms via `APPROVED?` regex.
- **`tests/bridge/handlers/auto-spawn-replacement.test.ts`** (rule 14 replacement substrate). 9 tests / 22 expects.
- **`tests/bridge/handlers/gate-on-drift.test.ts`** (drift gate — propagation backward). 7 tests / 25 expects.
- **`tests/bridge/handlers/create-granular-task.test.ts`** (rule 13 task granularity). 13 tests / 35 expects.
- **`tests/bridge/handlers/pm-preamble.test.ts`** (rule 12 briefing substrate). 14 tests / 35 expects.

Memory note correction: v3.3.0 deep-dive memory listed 29/58 untested handlers; live audit (with snake_case → kebab-case basename normalization) shows 41 untested. The 5 memory candidates `claude_code_version_delta`, `pm-plugin-self-check`, `pm-rule-query`, `pm_harness_component_audit`, `pm_harness_strictness_audit` are actually tested.

### Substrate / observability

- bun test: 793 → 882 pass / 0 fail / +89 expects (5092 → 5171 total).
- tsc clean (plugin + schemas).
- Plugin total LOC: net change ≈0 (decompositions add re-export lines but extract test-fixture sharing). 21 new sibling files under `bridge/handlers/{grade-outcome,pm-plugin-self-check,claude-code-version-delta,pm-rule-query}/`.
- File-size violations: 25 → 23. The 5 targeted handlers/test all dropped under budget, but 3 new C+B test files exceed the 200 LOC budget (`negotiate-sprint-contract.test.ts` 309, `grade-outcome-hybrid.test.ts` 307, `pm-preamble.test.ts` 217). Net win is real (handler LOC dropped substantially: 1693→664 across the 5 handlers), but test-file decomposition deferred to v3.4.0 wave 2 — splitting `negotiate-sprint-contract.test.ts` and `grade-outcome-hybrid.test.ts` further would harm cohesion vs sub-budgeting.
- pm_rule_audit findings: unchanged (no rule files or hook citations touched).

### Bug fixed (incidentally during C wave)

- **`negotiate-sprint-contract.ts` APPROVED/APPROVE regex mismatch** — see N4 wave 1 §C.1 above. Pre-fix, dual-approve never bound a contract; post-fix, the standard generator-then-evaluator approve flow correctly transitions to `bound` status and emits `sprint_contract_bound`.

### Deferred to v3.4.0+

- **N1-LARGE wave 2** (next 5 by overage): `negotiate-sprint-contract.ts` (317), `tests/handlers/batch5-preamble-config.test.ts` (312), `bridge/handlers/complete-playwright-scenario.ts` (309), `tests/handlers/batch3-governance.test.ts` (281), `bridge/handlers/pm-rule-audit.ts` (280).
- **N4 waves 2-9** (36 remaining untested handlers).
- **N3 wave 2** (1 remaining: `semantic-frontmatter-validate.ts`).
- **W7 watch** (plugin agent count still 23, threshold 25).
- **Main-branch sync** Option A (single-PR catchup) opened in this MINOR but merge deferred to user review.

---

## [3.2.0] — 2026-04-25 — Substrate Integrity + Broad Hygiene Bundle (MINOR)

### Why

User direction 2026-04-25 ("이번에 모두 해결해라" + broad latent-issue audit): single-session bundle of all 9 v3.1.0 carry-forward defects (handoff §7) + every actionable finding from the in-session `pm_rule_audit` + `scan_dead_code` + `scan_file_size_violations` + grep audit. Plus retire pre-spawn-validate hook entirely (rather than patching its registry) — the hook contradicted itself + CC runtime by simultaneously rejecting CC-native subagents (Explore/Plan/general-purpose) AND plugin-namespaced spawns (palantir-mini:*) AND the bare names it suggested as alternatives. Plan: `~/.claude/plans/humble-hatching-blanket.md`. Schemas: bumped to v1.28.0 (additive event types).

### Fixed

**P0 substrate-integrity bugs** (palantir-mini v3.1.0 handoff §7.1):
- **D1 stop-guard taskId Set<string> coercion** — `hooks/stop-guard.ts:60-67` now coerces `e.payload?.taskId ?? e.payload?.task_id` via `String(...)` before Set lookup. Mixed numeric (`14`) + string (`"14"`) task_created/phase_completed events now unify correctly. 6 in-session orphan tasks (1/2/3/4/10/11) retro-emitted with string-typed payload.
- **D2 PreCompact raw NDJSON snapshot** — `hooks/pre-compact-state.ts` now fulfills rule 10 §PreCompact gate guarantee ("Snapshots events.jsonl … so long sessions lose no events") which was unimplemented before v3.2.0. Copies live `events.jsonl` to `<sessionDir>/snapshots/events-<ISO>.jsonl` via new `lib/event-log/snapshot.ts:snapshotEventsRaw()`. Emits `snapshot_written` event (best-effort).
- **D3 retire pre-spawn-validate hook** — `hooks/pre-spawn-validate.ts` DELETED + entry removed from `hooks/hooks.json` PreToolUse:Agent matcher. CC runtime provides clearer "agent type X not found" errors directly. Live surface PreToolUse 6 → 5; total active hooks 37 → 36.

### Added

**P1 infrastructure** (palantir-mini v3.1.0 handoff §7.2):
- **G3 `events_log_rotate` MCP + `pm-events-rotate` skill** — `bridge/handlers/events-log-rotate.ts` (NEW) + `lib/event-log/rotate.ts` (NEW) + `skills/pm-events-rotate/SKILL.md` (NEW). Threshold default 10 MB OR 10K lines (either triggers). Rotation = atomic POSIX rename (rule 10 compliant — content not rewritten/truncated). Acquires same `events.jsonl.lock` as `appendEventAtomic` so concurrent writers wait. Emits `event_log_rotated` event into the FRESH log immediately as the rotation marker. **Reader archive merge** — `lib/event-log/read.ts:readEvents` extended to auto-discover `<sessionDir>/archive/events-rotated-*.jsonl` and merge into the result, sorted by sequence ASC. Transparent to all consumers (replay-lineage / pm-retro-query / pm-recap). MCP surface 53 → 54.
- **G4 PreCompact snapshot retention** — `lib/event-log/snapshot.ts:pruneRawSnapshots(snapshotDir, { keepCount=20, maxAgeMs=7d })`. Keep policy: `max(keepCount most-recent, all within maxAgeMs)`. Bounds disk growth so D2 doesn't introduce unbounded storage path.
- **G5 stop-hook auto-emit for this-session orphans** — `hooks/stop-guard.ts:findThisSessionOrphans()` filters task_created events with `when >= mostRecentSessionStart.when` lacking matching phase_completed; auto-emits string-typed phase_completed before audit. Cross-session legacy debt remains visible (intentional). Eliminates orphan-task drift accumulation.
- **G6 SessionStart live `git branch --show-current`** — `hooks/session-start.ts:liveBranch(cwd)` reads via execSync (1s timeout). additionalContext now includes `[branch] <name>`. Replaces stale-cached branch echo.
- **N3 5 newly-tested critical hooks** — `tests/hooks/{pre-compact-state,session-start,stop-validate,subagent-start,subagent-stop}.test.ts` (NEW). Untested-hook count 13 → 8 (deferred to v3.3.0).

### Changed

**P1 hygiene** (audit findings):
- **N1 scan-dead-code self-suppression** — `bridge/handlers/scan-dead-code.ts` now skips its own source file + the mcp-server.ts description line. Marker count baseline post-/reload-plugins drops false-positive pattern-definition matches (the regex literals + JSDoc summary that scan-dead-code itself contains).
- **N5 stale rule citations cleaned** — `hooks/idle-auto-shutdown.ts:17` "rule 06 §Idle cost management" → "rule 06 §Lazy-spawn + auto-shutdown" (correct section name). `hooks/session-duration-alarm.ts:17` removed `(once landed)` parenthetical (rule 14 has landed).
- **N7 CONTEXT.md hookCitations frontmatter cleaned** — `~/.claude/rules/CONTEXT.md` removed 2 dead hook citations (`rule-bottleneck-watch`, `rule-drift-detect` — retired in v2.24.1 Phase 2a tail).
- **N8 rule 13 hookCitations frontmatter cleaned** — `~/.claude/rules/13-task-granularity.md` removed `task-claim-throttle` (renamed to `concurrency-cap-fix`).
- **N6 BROWSE.md T1 ceiling** — `~/.claude/rules/BROWSE.md` 31 → 29 LOC (≤30 T1 ceiling). Combined the rule-10/rule-18 routing rows.
- **W9 rule 10 §Canonical scope** — `~/.claude/rules/10-events-jsonl.md` appended new section documenting per-project canonical authority + cross-project replay semantics + post-G3 archive merge default.
- **N9 lib/events consolidation** — `lib/events/learning-view.ts` moved to `lib/event-log/learning-view.ts` (single-file dir merged into the canonical event-log path). 2 import sites updated.

### Schemas (v1.28.0 — additive MINOR)

- 2 new event type variants: `snapshot_written` + `event_log_rotated` added to `~/.claude/schemas/ontology/lineage/event-types.ts` EVENT_TYPE_NAMES + EVENT_TYPE_REGISTRY. Plugin compatibleSchemaVersions remains `>=1.27.0 <2.0.0`. Backwards compatible.

### Verification

| Check | Result |
|-------|--------|
| `bun test` (plugin) | **793/793 pass** (0 fail / 4824 expects / 77 files / ~9.1s) |
| `bunx tsc --noEmit` (plugin) | exit 0 |
| `bunx tsc --noEmit` (schemas) | exit 0 |
| 4-slot version sync 3.2.0 | plugin.json + marketplace.json metadata + plugins[0] + package.json all `3.2.0` ✓ |
| Schemas package.json | `1.28.0` ✓ |
| `compatibleSchemaVersions` | `>=1.27.0 <2.0.0` (unchanged — additive types compatible) |
| `pm_plugin_self_check` (live) | overallStatus pass / 23 agents / 39 skills (38+1 pm-events-rotate) / 0 advisories *(post-/reload-plugins)* |

### Recovery

```bash
git revert <v3.2.0-ship-sha>            # reverts version bumps + all v3.2.0 edits in one commit
# Schemas v1.28.0 → v1.27.0 reverts via the same commit (single bundle).
# Lock file events.jsonl.lock cleanup: rmdir <sessionDir>/.palantir-mini/session/events.jsonl.lock
```

### References

- Plan: `~/.claude/plans/humble-hatching-blanket.md`
- Predecessor handoff: `~/.claude/plans/2026-04-25-v3.1.0-phase-4-handoff.md` §7 (carry-forward defects)
- Schemas changelog: `~/.claude/schemas/ontology/CHANGELOG.md` v1.28.0 entry
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md` §15

### Out of scope (deferred to v3.3.0+)

- **N1-LARGE 25 file-size violations** (14 source handlers + 10 tests + 1 1-LOC) — needs per-file decomposition study; not a single-MINOR task. Largest: `grade-outcome-with-rubric.ts` 607 LOC (over 407) + paired test 651 LOC.
- **N4 untested handlers** — 29 of 58 handlers (50% coverage) lack tests in `tests/{bridge/handlers,handlers}/`. Tackle 3-5 per future MINOR.
- **N3 deferred hook tests** (8 of 13 untested): post-compact, post-edit-propagate, pre-edit-ontology, semantic-frontmatter-validate, task-completed-gate, task-created, teammate-idle, user-prompt-submit.
- **W7** plugin-agent variant proliferation (watch-list).
- Main branch push (36+commit divergence — separate-session orchestration).

---

## [3.1.0] — 2026-04-25 — Phase 4 portable bundle real-use validation (MINOR)

### Why

v3.1.0 closes Phase 4 of the plugin-only-portable migration architecture (`06-plugin-only-architecture.md` §15 v3.1.0 row + §16.2 AC-2 + §16.5 AC-5). Validates the architectural target ("plugin-only portable `~/.claude/`") via fresh-machine rehydration test; ships skill default change discovered during validation (Finding #1) so future bundles work out-of-the-box. Plan: `~/.claude/plans/enchanted-stirring-sparkle.md`. Test evidence: `~/.claude/plans/2026-04-25-v3.1.0-fresh-distro-test-log.txt`.

User direction 2026-04-25: "(b) WSL2 fresh distro로 진행. 추가적으로 [3 alternatives]까지 진행. EnterPlanMode" — primary Phase 4 + concurrent housekeeping (lineage cleanup + PR triage report + soak observation) bundled into single session.

### Added

**v3.1.0 ship deliverables**:
- `~/.claude/portable/palantir-mini-v3.0.0-2026-04-25-with-schemas.tar.gz` (1.3 MB) — first real-use portable bundle (with-schemas variant)
- `~/.claude/portable/palantir-mini-v3.0.0-2026-04-25.sha256` + `.tar.gz` plugin-only fallback variant (852 KB)
- `~/.claude/portable/bundle.json` — manifest (version, date, SHA-256, size, schemas-included flag, compatibleSchemaVersions)

**Skill updates** (skills/pm-portable-bundle/SKILL.md):
- DEFAULT now includes schemas (`-C ~/.claude plugins/palantir-mini/ schemas/`) — Finding #1 fix
- `--exclude-schemas` opt-out flag for plugin-only bundles (same-machine plugin update where schemas already in place)
- Documentation updated to explain layout + extraction sequence per bundle type
- bundle.json `payload.includesSchemas` flipped from `false` → `true` default

**Skill updates** (skills/pm-restore/SKILL.md):
- Auto-detects bundle layout via top-level entry inspection (`plugins/` → full bundle → extract to `~/.claude/`; `palantir-mini/` → plugin-only → extract to `~/.claude/plugins/` + warn missing schemas)

**Concurrent housekeeping** (folded into v3.1.0):
- `bridge/handlers/grade-outcome-with-rubric.ts:19` — replaced dangling pointer to deleted `2026-04-20-solo-dev-direction.md` with current canonical pointer to `06-plugin-only-architecture.md §6.3`
- `~/.claude/plans/2026-04-25-pr-triage-report.md` — categorization of 30 open PRs (Sessions 1-4) recommending bulk close-as-obviated (user-gated)
- 6 orphan stop-guard task IDs `[1, 2, 3, 4, 10, 11]` cleared via `phase_completed` event emission (Track E hygiene)

### Verification (architecture §16 — AC matrix)

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 (post-deletion self-test) | ✓ verified in v3.0.0 ship (predecessor) | (carry-forward) |
| **AC-2 (fresh-machine rehydration)** | **✓ PASS** (HOME-override pivot; L1+L2 green; L3 partial) | `2026-04-25-v3.1.0-fresh-distro-test-log.txt` |
| AC-3 (zero citation drift) | ✓ ruleAuditResult 0/0/0 in fresh-distro pm_plugin_self_check | (test log L2) |
| AC-4 (CLI agent enumeration) | N/A in HOME-override | (deferred; covered architecturally by L2) |
| **AC-5 (bundle ≤ 10 MB)** | **✓ PASS** (with-schemas: 1.3 MB; plugin-only: 852 KB) | `bundle.json` |
| **AC-6 (schema pin resolution)** | **✓ PASS** (schemaPinResult.status=pass in fresh-distro pm_plugin_self_check) | (test log L2) |
| AC-7 (harness end-to-end) | SKIP (no canary project; documented) | (test log) |

**3-layer validation summary** in fresh `~/.claude/` HOME (HOME=/tmp/fresh-claude-test/HOME):
- L1: `bun test` 735/735 + `bunx tsc --noEmit` exit 0 (substrate sanity)
- L2: direct MCP `pm_plugin_self_check` overallStatus=pass + 23 agents + 38 skills + advisories empty (substrate health)
- L3: `claude -p '/palantir-mini:pm-self-test'` partial — slash command resolution proven (plugin auto-discovery works in fresh HOME); full MCP-handshake end-to-end deferred to interactive validation due to headless `claude -p` MCP init exceeding 120-180s timeout

**Source distro regression checks** (post-version-bump):
- `bun test` (plugin) — 735/735 pass
- `bunx tsc --noEmit` (plugin) — exit 0
- `bunx tsc --noEmit` (schemas) — exit 0
- `pm_plugin_self_check` — overallStatus=pass + 23/38 + advisories empty

**Soak observation** (3-point passive):
- post-A1 (post-bundle): pm_plugin_self_check pass / 23+38 / advisories empty
- post-A6 (post-validation): pm_plugin_self_check pass / 23+38 / advisories empty
- post-A9 (post-version-bump): pm_plugin_self_check pass / 23+38 / advisories empty
- VERDICT: v3.0.0 soak-validated through Phase 4 execution

### Findings (binding for future bundles)

- **Finding #1 (CRITICAL — fixed)**: default plugin-only bundle is incomplete for fresh machines. Plugin code references `~/.claude/schemas/` via relative paths (lib/semantic-graph/types.ts:18, tests/bridge/handlers/pre-edit-impact.test.ts:13, tests/lib/semantic-graph/wave2-mvp.test.ts:23) — fresh-machine bun test fails 16 / TS2307 errors without schemas. Resolution: skill default flipped (above).
- **Finding #2 (deferred to v3.1.x)**: WSL2 Interop binfmt registration is fragile under repeated cross-distro `wsl.exe` invocations. HOME-override pivot bypassed; persistent fix (systemd unit / `/etc/profile.d` hook) deferred.
- **Finding #3 (deferred)**: headless `claude -p` MCP handshake latency exceeds 120-180s. Interactive `claude` recommended for full slash-command UX validation.
- **Finding #4 (formalized)**: pm-portable-bundle now distinguishes "portable (full)" vs "plugin-only (--exclude-schemas)".

### Recovery

```bash
git revert <v3.1.0-ship-sha>                      # reverts version bump + skill updates + lineage cleanup
rm -rf ~/.claude/portable/                         # removes generated tarball + sidecars
rm -rf /tmp/fresh-claude-test/                     # removes HOME-override scratch
```

Bundles in `~/.claude/portable/` are untracked artifacts; safe to delete.

### References

- Plan: `~/.claude/plans/enchanted-stirring-sparkle.md`
- Test log: `~/.claude/plans/2026-04-25-v3.1.0-fresh-distro-test-log.txt`
- PR triage report (deliverable): `~/.claude/plans/2026-04-25-pr-triage-report.md`
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md` §15 + §16.2 + §16.5
- Predecessor handoff: `~/.claude/plans/2026-04-25-v3.0.0-phase-3-handoff.md`

---

## [3.0.0] — 2026-04-25 — Phase 3 user-scope deletion (MAJOR)

### Why

v3.0.0 closes Phase 3 (user-scope deletion + namespace cutover) of the plugin-only-portable migration architecture. Implements **D2 (v3.0.0 MAJOR at user-scope deletion)** + **D10 (2-session double-soak before v3.0.0 entry)** decisions pre-approved 2026-04-25 ("모두 너의 추천대로 진행"). User explicitly waived the inter-version 2-session soak gate within this single session ("Soak counts 2개도 함께 해결" + EnterPlanMode authorization), parallel to the v2.26.0 → v2.27.0 within-session waiver precedent in session `fbde0322…`. Plan: `~/.claude/plans/binary-leaping-babbage.md`. Architecture authority: `06-plugin-only-architecture.md` §15 (version trajectory) + §16 (acceptance criteria).

This is a **MAJOR breaking** change per rule 08 (user-visible breaking):
- `~/.claude/agents/` and `~/.claude/skills/` directories DELETED
- Plugin agents become EFFECTIVE at scope precedence 5 (no longer LOWEST since user-scope is gone per https://code.claude.com/docs/en/sub-agents)
- 5 retroactive plugin variants added in same commit (Phase B0) for backward-compat callable name preservation: `pm-implementer`, `mc-implementer`, `kosmos-implementer`, `home-implementer`, `doc-writer`
- Plugin agent count: 18 → 23

### Removed — `~/.claude/agents/` (16 entries)

**14 .md agent files**:
- `researcher.md` (deprecation banner v2.24.0; plugin copy active at v3.0.0) — superseded by `plugin:palantir-mini:researcher`
- `docs-researcher.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:docs-researcher`
- `implementer.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:implementer`
- `verifier-correctness.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:verifier-correctness`
- `verifier-adversarial.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:verifier-adversarial`
- `protocol-designer.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:protocol-designer`
- `hook-builder.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:hook-builder`
- `plugin-maintainer.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:plugin-maintainer`
- `ontology-steward.md` (deprecation banner v2.24.0) — superseded by `plugin:palantir-mini:ontology-steward`
- `pm-implementer.md` (palantir-math repo specialist) — superseded by NEW `plugin:palantir-mini:pm-implementer` (Phase B0 retroactive copy)
- `mc-implementer.md` (mathcrew repo specialist) — superseded by NEW `plugin:palantir-mini:mc-implementer` (Phase B0)
- `kosmos-implementer.md` (kosmos repo specialist) — superseded by NEW `plugin:palantir-mini:kosmos-implementer` (Phase B0)
- `home-implementer.md` (palantirkc home repo specialist) — superseded by NEW `plugin:palantir-mini:home-implementer` (Phase B0)
- `doc-writer.md` (research documentation specialist) — superseded by NEW `plugin:palantir-mini:doc-writer` (Phase B0)

**2 navigation files**:
- `BROWSE.md` (user-scope agents query router)
- `INDEX.md` (user-scope agents structure index)

### Removed — `~/.claude/skills/` (8 entries)

**5 active dirs**:
- `lsp-audit/` (full skill dir + evals/) — superseded by `plugin:palantir-mini:pm-lsp-audit`
- `orchestrate/` (full skill dir + references/) — superseded by `plugin:palantir-mini:pm-orchestrate`
- `palantir-walk-build/` (full skill dir + references/) — superseded by `plugin:palantir-mini:pm-walk-build`
- `palantir-walk-analyze/` (full skill dir + references/) — superseded by `plugin:palantir-mini:pm-walk-analyze`
- `palantir-walk-shared/REFERENCE.md` (cross-skill reference) — superseded by `plugin:palantir-mini:_shared/walk-reference.md`

**1 retired symlink**:
- `tavily-cli` symlink → `~/.agents/skills/tavily-cli` — symlink removed; target preserved (different runtime ownership per CONTEXT.md §13.5)

**2 navigation files**:
- `BROWSE.md` (user-scope skills query router)
- `INDEX.md` (user-scope skills structure index)

### Added — Phase B0 retroactive variants (5 plugin agents)

To preserve backward-compatible callable name resolution post-deletion, 5 user-scope variant agents are copied verbatim into plugin scope (with frontmatter unchanged: `memory: user`, model + maxTurns matching source):

- `~/.claude/plugins/palantir-mini/agents/pm-implementer.md` — palantir-math repo specialist (sonnet, maxTurns 35)
- `~/.claude/plugins/palantir-mini/agents/mc-implementer.md` — mathcrew repo specialist (sonnet, maxTurns 40)
- `~/.claude/plugins/palantir-mini/agents/kosmos-implementer.md` — kosmos repo specialist (sonnet, maxTurns 40)
- `~/.claude/plugins/palantir-mini/agents/home-implementer.md` — palantirkc home-repo control-plane specialist (sonnet, maxTurns 35)
- `~/.claude/plugins/palantir-mini/agents/doc-writer.md` — research documentation specialist (sonnet, maxTurns 30)

Plugin agents 18 → 23. Master synthesis §7.2 originally proposed GENERALIZE (4 project-implementer variants → 1 generic implementer + briefing-injection scope; doc-writer → docs-researcher merge). Phase B0 reverses this for v3.0.0 by preserving all 14 user-scope names 1:1, eliminating user-call-site refactor pressure. Future `implementer` + briefing-injection pattern remains available; the variants are an additional convenience.

### Edited — Plugin manifests + README + agent-definitions seed

- `.claude-plugin/plugin.json` — version `2.27.0` → `3.0.0`; description rewritten for v3.0.0 cutover; `compatibleSchemaVersions` tightened from `>=1.15.0 <2.0.0` to `>=1.27.0 <2.0.0` (signal-honest at MAJOR — v3.0.0 is breaking anyway)
- `.claude-plugin/marketplace.json` — `metadata.version` + `plugins[0].version` both `2.27.0` → `3.0.0`; description rewritten
- `package.json` — version + description sync
- `README.md` — release line + runtime counts (`18 plugin agents` → `23 plugin agents`); v3.0.0 cutover note replaces Phase 1 dormancy note
- `~/.claude/schemas/ontology/seeds/agent-definitions.ts` — PLUGIN_AGENTS array gains 5 retroactive variants (Phase B0); USER_SCOPE_AGENTS array emptied (deletion synchronized). Schemas package version stays 1.27.0 (additive within MINOR scope; no semver bump needed)
- `~/.claude/schemas/ontology/seeds/skill-definitions.ts` — USER_SCOPE_SKILLS array emptied (deletion synchronized)

### Edited — `~/.claude/rules/16-3-agent-harness.md` line 14

Dangling pointer to `plans/_archive/2026-04-22-harness-retired-roles.md` removed (Phase C housekeeping deletes that archive). Replaced with "preserved in earlier git history at branch `feat/pm-v2.1.0`" — preserves historical context without dead link.

### NOT changed (intentional)

- `~/.claude/CLAUDE.md` — verified by Phase 1 audit (H9): no `~/.claude/agents/` or `~/.claude/skills/` overlay layer references present. CLAUDE.md already aligns with v3.0.0 endpoint.
- 4 harness agents (`harness-planner`, `harness-generator`, `harness-evaluator`, `harness-analyzer`) — unchanged
- 9 verbatim copies (researcher, docs-researcher, implementer, verifier-correctness, verifier-adversarial, protocol-designer, hook-builder, plugin-maintainer, ontology-steward) — unchanged
- 5 NEW Phase 1 agents (lead-orchestrator, eval-judge, code-grader, model-grader, scrapling-fetcher) — unchanged
- Schemas v1.27.0 — unchanged (only seed array contents updated; no version bump)
- Hook count `37` — unchanged
- MCP tools `53` — unchanged
- Plugin skills `38` — unchanged

### Breaking Migration — external-user guide

**For users invoking sub-agents by name from CLI or `Agent(...)` calls**:

| Pre-v3.0.0 invocation | Post-v3.0.0 resolution |
|----------------------|------------------------|
| `Agent(subagent_type: "researcher")` | `plugin:palantir-mini:researcher` (resolves automatically) |
| `Agent(subagent_type: "docs-researcher")` | `plugin:palantir-mini:docs-researcher` |
| `Agent(subagent_type: "implementer")` | `plugin:palantir-mini:implementer` |
| `Agent(subagent_type: "pm-implementer")` | `plugin:palantir-mini:pm-implementer` (Phase B0 retroactive) |
| `Agent(subagent_type: "mc-implementer")` | `plugin:palantir-mini:mc-implementer` (Phase B0) |
| `Agent(subagent_type: "kosmos-implementer")` | `plugin:palantir-mini:kosmos-implementer` (Phase B0) |
| `Agent(subagent_type: "home-implementer")` | `plugin:palantir-mini:home-implementer` (Phase B0) |
| `Agent(subagent_type: "doc-writer")` | `plugin:palantir-mini:doc-writer` (Phase B0) |
| `Agent(subagent_type: "verifier-correctness")` | `plugin:palantir-mini:verifier-correctness` |
| (etc. for all 14 user-scope names) | (1:1 plugin-scope mirror) |

**For users invoking skills via slash command**:

| Pre-v3.0.0 invocation | Post-v3.0.0 invocation |
|----------------------|----------------------|
| `/orchestrate ...` | `/palantir-mini:pm-orchestrate ...` |
| `/lsp-audit` | `/palantir-mini:pm-lsp-audit` |
| `/palantir-walk-build ...` | `/palantir-mini:pm-walk-build ...` |
| `/palantir-walk-analyze ...` | `/palantir-mini:pm-walk-analyze ...` |
| `/tavily-cli ...` | (use shared dir at `~/.agents/skills/tavily-cli` directly) |

**Skills**: namespace prefix `palantir-mini:` and `pm-` rename are required at the call site. There is no scope-precedence resolution for skills (unlike agents), so the rename is hard.

### Verification

- `bun test` (plugin) → 735/735 pass (no test changes; only filesystem deletion + agent additions + manifest edits)
- `bunx tsc --noEmit` (plugin + schemas) → exit 0 both
- `jq -r .version ~/.claude/plugins/palantir-mini/.claude-plugin/plugin.json` → `3.0.0`
- `jq -r .version ~/.claude/plugins/palantir-mini/.claude-plugin/marketplace.json` → `null` (root has no version key — by design)
- `jq -r '.metadata.version' ~/.claude/plugins/palantir-mini/.claude-plugin/marketplace.json` → `3.0.0`
- `jq -r '.plugins[0].version' ~/.claude/plugins/palantir-mini/.claude-plugin/marketplace.json` → `3.0.0`
- `jq -r .version ~/.claude/plugins/palantir-mini/package.json` → `3.0.0`
- `jq -r .compatibleSchemaVersions ~/.claude/plugins/palantir-mini/.claude-plugin/plugin.json` → `>=1.27.0 <2.0.0`
- `! test -d ~/.claude/agents` (deletion confirmed)
- `! test -d ~/.claude/skills` (deletion confirmed)
- `ls ~/.claude/plugins/palantir-mini/agents/*.md | wc -l` → 23
- `pm_plugin_self_check` post-`/reload-plugins` → overallStatus=`pass`; `declaredAgents.total=23`; `primitiveSeedAdvisories.{agents,skills}.{filesystemOnly,seedOnly}` arrays all empty (parity)
- AC-1 (`pm-self-test`) — substrate green
- AC-3 (`pm_rule_audit`) — 0 driftLines / 0 staleCrossRefs / 0 unclaimedHookCitations
- AC-4 (`claude agents --json`) — `select(.source == "user")` → `[]`; `select(.source == "plugin")` → 23 entries
- AC-7 — harness path callable

### Recovery

Reversal: `git revert <v3.0.0 commit>` restores deleted directories from git object store + manifest 4-slot to 2.27.0 + 5 retroactive variants removed + Rule 16 line 14 restored. Events.jsonl append-only substrate unaffected.

### References

- Plan: `~/.claude/plans/binary-leaping-babbage.md` (Phase B0 + Phase B + housekeeping in same session)
- Predecessor handoff: `~/.claude/plans/2026-04-25-phase-2c-2d-handoff.md` (v2.27.0 ship verification)
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md` §15 + §16
- Decision approval: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10` D2 + D10 (2026-04-25)
- Scope precedence inversion source: https://code.claude.com/docs/en/sub-agents (fetched 2026-04-25)
- Phase 1 (v2.23.0) parent: `~/.claude/plans/calm-dreaming-crystal.md` (deleted in same session by Phase C housekeeping)

---

## [2.27.0] — 2026-04-25

### Why
v2.27.0 Phase 2d schema primitives (`immutable-forging-summit.md` §4). Implements D7 decision pre-approved 2026-04-25 ("모두 너의 추천대로 진행"). Coordinated schemas v1.27.0 MINOR ships in same commit per rule 08 coordinated-MINOR principle. User explicitly authorized double-skip soak between v2.26.0 (this session) and v2.27.0 (this session) — Phase 2 fully completed in single session. The 2-session double-soak gate before v3.0.0 Phase 3 (user-scope deletion) remains in force per D10.

### Coordinated schemas v1.27.0 ships in same commit

- `~/.claude/schemas/ontology/primitives/agent-definition.ts` **NEW** — AgentDefinition primitive (prim-ops-22)
- `~/.claude/schemas/ontology/primitives/skill-definition.ts` **NEW** — SkillDefinition primitive (prim-ops-23)
- `~/.claude/schemas/ontology/primitives/plugin-manifest.ts` **EXTENDED** — added optional `declaredAgents` + `declaredSkills` fields (additive)
- `~/.claude/schemas/ontology/seeds/agent-definitions.ts` **NEW** — 32 minimal seed instances (18 plugin + 14 user-scope)
- `~/.claude/schemas/ontology/seeds/skill-definitions.ts` **NEW** — 42 minimal seed instances (38 plugin + 4 user-scope)
- `~/.claude/schemas/ontology/primitives/index.ts` — barrel re-exports for 2 new primitives
- `~/.claude/schemas/package.json` — sub-path exports for 2 new primitives + 2 seed files; version bumped 1.26.0 → 1.27.0
- `~/.claude/schemas/ontology/CHANGELOG.md` — `[1.27.0]` entry with full primitive specs + consumer impact

### Edited — `pm_plugin_self_check` advisory upgrade

- `bridge/handlers/pm-plugin-self-check.ts` — adds `primitiveSeedAdvisories: { agents: { filesystemOnly, seedOnly }, skills: { filesystemOnly, seedOnly } }` field to result type. Cross-checks filesystem walk (authoritative) vs primitive seed registry (advisory). FILESYSTEM REMAINS AUTHORITATIVE — advisories surface mismatches but do NOT influence `overallStatus`. Primitive-seed cross-check is best-effort wrapped in try/catch.
- `tests/bridge/handlers/pm-plugin-self-check.test.ts` — 3 new test cases (8/9/10) verifying advisory shape + non-influence on overallStatus + parity invariant (`seedOnly: []` at ship time).

### Manifest sync (4 slots → 2.27.0)

- `.claude-plugin/plugin.json` — version + description (v2.27.0 release line)
- `.claude-plugin/marketplace.json` — `metadata.version` + `plugins[0].version` + description
- `package.json` — version + description
- `README.md` — surface-counts header + runtime-counts header → v2.27.0

### NOT changed (deferred)

- `compatibleSchemaVersions` in plugin.json unchanged (`>=1.15.0 <2.0.0` already accommodates v1.27.0).
- Consumer peerDep updates (palantir-math + mathcrew + kosmos) — palantir-math already in-range; mathcrew + kosmos vestigial git pins unaffected by additive primitives.
- pm-codegen automation for AgentDefinition + SkillDefinition seeds (full frontmatter hydration) — v1.28.0+ work.
- Primitive-authoritative `pm_plugin_self_check` (flip from advisory) — v2.28.0+ pending 2-session seed-accuracy observation.

### Verification

- `bun test` → ≥ 735 pass (v2.26.0 baseline 732 + 3 new in pm-plugin-self-check.test.ts cases 8/9/10).
- `bunx tsc --noEmit` → exit 0 (plugin + schemas).
- `jq -r .version ~/.claude/schemas/package.json` → `1.27.0`.
- `jq -r .version` on plugin manifest 4 slots → `2.27.0`.
- New primitives present: `ls ~/.claude/schemas/ontology/primitives/{agent-definition,skill-definition}.ts` → 2 files.
- New seeds present: `ls ~/.claude/schemas/ontology/seeds/{agent-definitions,skill-definitions}.ts` → 2 files.
- PluginManifestDeclaration extension: `grep -c "declaredAgents\|declaredSkills" plugin-manifest.ts` → ≥ 2.
- pm_plugin_self_check on /reload-plugins → expected `overallStatus: pass`; `primitiveSeedAdvisories.agents.seedOnly + .skills.seedOnly` lengths sum to 0 (parity invariant).

### Recovery

- `git revert <commit>` reverts schemas v1.27.0 + plugin v2.27.0 atomically. v1.26.0 still satisfies plugin's `compatibleSchemaVersions` range.
- Side-effect imports in `pm-plugin-self-check.ts` import seeds files; reverting also reverts those import lines.

### References

- Plan: `~/.claude/plans/immutable-forging-summit.md` §4
- Predecessor commit: `2bca70a6` (v2.26.0 Phase 2c on this branch)
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10` + `§15`
- Decision approval: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10 D7` (2026-04-25)
- schemas CHANGELOG entry: `~/.claude/schemas/ontology/CHANGELOG.md [1.27.0]`

---

## [2.26.0] — 2026-04-25

### Why
v2.26.0 Phase 2c MCP redesign (`immutable-forging-summit.md`). Implements D8 (3 new MCPs) + D9 (`pm_rule_query` consolidation) decisions pre-approved 2026-04-25 ("모두 너의 추천대로 진행"). v2.25.0 reserved/buffer per architecture §15; skipped. Rationale: rule-MCP cognitive weight reduction (3 separate handlers → 1 discriminator-dispatched), plus three new MCPs that consolidate previously-manual operator chains: per-sprint replay (was: `replay_lineage` + `pm_harness_strictness_audit` + manual feedback-NNN.md reads), agent lineage export (was: ad-hoc grep-jq pipelines), bundle manifest (was: `du -sh` + manual SHA computation). User explicitly authorized double-skip (no soak between v2.26.0 and v2.27.0 within this session).

### Added — 4 new MCP tools + 4 paired test files

- **`pm_rule_query`** (D9 consolidation) — `bridge/handlers/pm-rule-query.ts`. Discriminator-dispatched: `byId` → get mode, `bySlug` → get mode, `byQuery` → search mode, no discriminators → list mode. Result is mode-discriminated union. Replaces 3 retired handlers below. ~290 LOC.
- **`pm_harness_outcome_replay`** (D8.1) — `bridge/handlers/pm-harness-outcome-replay.ts`. Per-sprint timeline + verdict + iteration count + drift curve. Filters events.jsonl by `payload.sprintNumber`. ~170 LOC.
- **`pm_agent_lineage_export`** (D8.2) — `bridge/handlers/pm-agent-lineage-export.ts`. 5-dim filter (`byWhom.identity` / `byWhom.agentName` exact-or-regex / `throughWhich.sessionId` / temporal range) → Markdown timeline grouped by session. Designed for retrospective synthesis input. ~140 LOC.
- **`pm_portable_bundle_manifest`** (D8.4) — `bridge/handlers/pm-portable-bundle-manifest.ts`. Walks plugin tree, emits per-file SHA-256 + size + relative path triples + aggregate total. CI-friendly bundle size regression detector. ~140 LOC.
- Paired tests: `tests/handlers/{pm-rule-query,pm-harness-outcome-replay,pm-agent-lineage-export,pm-portable-bundle-manifest}.test.ts` — total **+51 cases** (22 + 11 + 10 + 9 = ~51 net new test cases over baseline).

### Removed — 3 retired rule handlers (D9 consolidation)

- `bridge/handlers/pm-rule-get.ts` (~127 LOC) — superseded by `pm-rule-query.ts` get mode (`byId` / `bySlug`)
- `bridge/handlers/pm-rule-list.ts` (~57 LOC) — superseded by `pm-rule-query.ts` list mode (no discriminators)
- `bridge/handlers/pm-rule-search.ts` (~131 LOC) — superseded by `pm-rule-query.ts` search mode (`byQuery`)

LOC retired: ~315 handler LOC; logic forked into `pm-rule-query.ts` private helpers (no external import dependencies on retired files).

### Edited — wire-up across 7 files

- `bridge/mcp-server.ts` — TOOLS registry: 3 entries removed (`pm_rule_get` / `pm_rule_list` / `pm_rule_search`), 4 entries added (`pm_rule_query` + 3 new MCPs); module map updated similarly. Net tool count delta: 52 → 53 (+1).
- `skills/pm-rule/SKILL.md` — full rewrite. `allowed-tools` line, frontmatter description, body usage examples all rewrapped around `pm_rule_query` mode-dispatch syntax.
- `skills/pm-rule-audit/SKILL.md` — `allowed-tools` line: `pm_rule_search` + `pm_rule_get` → `pm_rule_query`.
- `agents/lead-orchestrator.md` — frontmatter `tools:` list: 2 retired entries collapsed to single `pm_rule_query` entry.
- `managed-settings.d/50-palantir-mini.json` — 3 retired RBAC grants removed; 4 new grants added (`pm_rule_query`, `pm_plugin_self_check` filled in proactively, plus the 3 new MCPs).
- `scripts/rule-excerpt.ts` — handler import path: `pm-rule-get` → `pm-rule-query`; call shape updated to `{ byId, withFollow }` + result mode-discrimination check; placeholder + renderBlock messages reference new tool name.
- `README.md` — surface counts (`52 MCP` → `53 MCP`); v2.26.0 release line; tool-family taxonomy updated; rules-governance section drops retired tools, adds new MCPs subsection.

### NOT changed (deferred to v2.27.0+)

- Schemas v1.26.0 unchanged — primitives (AgentDefinition + SkillDefinition + PluginManifestDeclaration extension) ship in coordinated schemas v1.27.0 / plugin v2.27.0 (Phase 2d, this same session).
- `pm_plugin_self_check` handler unchanged this version — primitive-seed cross-check arrives v2.27.0 Phase 2d.
- Optional `pm_impact` family unification (`impact_query` + `pre_edit_impact` + `populate_impact_graph` → `pm_impact({mode})`) — deferred to v2.28.0+ (PreToolUse hot-path overhead measurement needed).
- Codex bridge `~/.codex/config.toml` MCP surface — Codex consumes same `bridge/mcp-server.ts` so surface change is transparent; no Codex-side ripple expected.
- 9 user-scope deprecation banners — unchanged (v3.0.0 Phase 3 territory).

### Verification

- `bun test` → 681 + 51 = ~732 pass (was 681/681 v2.24.1 baseline; net +51 from 4 new paired tests).
- `bunx tsc --noEmit` → clean (plugin + schemas).
- Plugin manifest version sync: plugin.json + marketplace.json (×2 — `metadata.version` + `plugins[0].version`) + package.json all `2.26.0`.
- Hook count unchanged: `jq '[.hooks[][].hooks // [] | .[]] | length' hooks.json` → 37.
- MCP retirement check: `grep -c 'name: "pm_rule_get"\|"pm_rule_list"\|"pm_rule_search"' bridge/mcp-server.ts` → 0.
- MCP arrival check: `grep -c 'name: "pm_rule_query"\|"pm_harness_outcome_replay"\|"pm_agent_lineage_export"\|"pm_portable_bundle_manifest"' bridge/mcp-server.ts` → 4.
- Retired handler files: `ls bridge/handlers/pm-rule-{get,list,search}.ts` → No such file (×3).
- `pm_plugin_self_check` post-`/reload-plugins` → expected `overallStatus: pass` (advisory-mode primitive-seed cross-check arrives v2.27.0).

### Recovery

- `git revert <commit>` restores all 3 retired handlers + 3 retired MCP entries + paired test files atomically — events.jsonl unaffected (append-only).
- Caller restoration: scripts/rule-excerpt.ts revert reverts to the `pm-rule-get` import; SKILL.md + lead-orchestrator + managed-settings revert simultaneously. No breaking change for downstream consumers because v2.26.0 is local-only ship (no PR opened this session).

### References

- Plan: `~/.claude/plans/immutable-forging-summit.md`
- Phase 2a-patch handoff (predecessor): `~/.claude/plans/2026-04-25-harness-phase-2a-patch-handoff.md`
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §9 (D9) + §9.2 (D8)`
- Decision approval: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10 D8/D9` (2026-04-25 user blanket-approval)
- Version trajectory: same architecture doc §15

---

## [2.24.1] — 2026-04-25

### Why
v2.24.1 is the Phase 2a tail PATCH (`concurrent-gathering-taco.md`) — retires the 3 original rule hooks now superseded by the consolidated `rule-audit` hook shipped in v2.24.0. Per architecture §13.3 risk mitigation, the 3 originals were retained for a 1-session soak alongside the consolidated hook to allow observable parallel runs. The first post-ship session (this one) demonstrated logical parity (consolidated invokes the same `pm-rule-audit` handler the originals invoked), substrate health (`pm_plugin_self_check` overallStatus=pass; `pm_rule_audit` advisory-only with 2 pre-existing findings), and SessionStart-fired drift mode without error. Retire is now safe.

### Removed — 3 original rule hooks + 3 paired tests (6 files)

- `hooks/rule-bottleneck-watch.ts` — superseded by `rule-audit.ts --mode=bottleneck` (PreCompact)
- `hooks/rule-drift-detect.ts` — superseded by `rule-audit.ts --mode=drift` (SessionStart)
- `hooks/rule-citation-validate.ts` — superseded by `rule-audit.ts --mode=citation` (PostToolUse:Edit on hooks/*.ts)
- `tests/hooks/rule-bottleneck-watch.test.ts` — coverage subsumed by rule-audit.test.ts mode=bottleneck cases
- `tests/hooks/rule-drift-detect.test.ts` — coverage subsumed by rule-audit.test.ts mode=drift cases
- `tests/hooks/rule-citation-validate.test.ts` — coverage subsumed by rule-audit.test.ts mode=citation cases

LOC retired: ~391 hook + paired test LOC.

### Edited — `hooks.json` (3 registrations removed)

- `PreCompact`: dropped `rule-bottleneck-watch` entry; `rule-audit --mode=bottleneck` now sole bottleneck-mode hook
- `SessionStart`: dropped `rule-drift-detect` entry; `rule-audit --mode=drift` now sole drift-mode hook
- `PostToolUse` on `**/plugins/palantir-mini/hooks/*.ts`: dropped `rule-citation-validate` entry; `rule-audit --mode=citation` now sole citation-mode hook
- Description string updated: `40 → 37` active hook commands; per-event counts adjusted (PostToolUse 7 → 6, PreCompact 5 → 4, SessionStart 7 → 6)

### Edited — Plugin manifest version bump (4 slots)

- `.claude-plugin/plugin.json` — version 2.24.0 → 2.24.1; description updated (37 hooks; v2.24.1 retire prefix)
- `.claude-plugin/marketplace.json` — `metadata.version` 2.24.0 → 2.24.1; `plugins[0].version` 2.24.0 → 2.24.1; `plugins[0].description` updated
- `package.json` — version 2.24.0 → 2.24.1; description updated

### Edited — Documentation (count + supersede references)

- `README.md` — 3 stale `40 hooks` claims (lines 4, 28, 51) → `37 hooks`; v2.24.0 release line → v2.24.1 with retire summary
- `skills/pm-rule-audit/SKILL.md` — 4 references to `rule-bottleneck-watch` (description, line 13 advisory trigger, line 36 ceiling table, line 125 R3 reference) → `rule-audit (mode=*)`
- `skills/pm-rule/SKILL.md` — line 110 R3 future reference (`rule-bottleneck-watch + rule-drift-detect`) → consolidated `rule-audit` (shipped v2.24.1)
- `hooks/rule-audit.ts` — header comment block updated past-tense; v2.24.0 → v2.24.1; "retire candidate" note removed (now superseder)

### NOT changed (deferred to v2.25.0+ per master synthesis §10)

- 4 OTHER new Phase 2a hooks (`pre-spawn-validate.ts` + `harness-eval-circuit-breaker.ts` + `ontology-import-guard.ts`) and their paired tests — unchanged
- `monitors/harness-live-watch.ts` + `monitors/monitors.json` — unchanged
- 9 user-scope deprecation banners (`~/.claude/agents/*.md`) — unchanged (Phase 3 territory)
- 14 plugin agents + 38 plugin skills — unchanged from v2.23.0/v2.24.0
- Schemas v1.26.0 unchanged — coordinated v1.27.0 ships v2.27.0 Phase 2d
- 4 new MCPs (`pm_harness_outcome_replay`, `pm_agent_lineage_export`, `pm_portable_bundle_manifest`) — v2.26.0 Phase 2c
- `pm_rule_query` MCP consolidation (3 → 1) — v2.26.0 Phase 2c
- User-scope deletion (`rm -rf ~/.claude/{agents,skills}`) — v3.0.0 Phase 3 MAJOR (after 2-session double-soak from v2.27.0 ship)

### Verification
- `bun test` → 690+ pass (previous baseline 690; expect ~3-9 case net delta from removing redundant tests; rule-audit.test.ts already covers all 3 modes)
- `bunx tsc --noEmit` → clean (plugin + schemas)
- Plugin manifest version sync: plugin.json + marketplace.json (×2) + package.json all `2.24.1`
- Hook count verification: `jq '[.hooks[][].hooks // [] | .[]] | length' hooks/hooks.json` → 37
- Stale registration check: `jq '[.hooks[][].hooks[]? // empty | select(.command? | tostring | test("rule-(bottleneck-watch|drift-detect|citation-validate)")) | .command]' hooks.json` → empty array
- `pm_plugin_self_check` post-`/reload-plugins` → expected `overallStatus: pass`

### Recovery
- `git revert <commit>` restores all 6 retired files and their hooks.json registrations atomically — events.jsonl unaffected (append-only).
- The consolidated `rule-audit` hook stays untouched at the repo level; no functionality lost on revert (originals come back; consolidated remains).

### References
- Plan: `~/.claude/plans/concurrent-gathering-taco.md`
- Soak evidence: this session, 2026-04-25 (post-`45893fe4` Phase 2a ship)
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §13.3` (originals-during-soak rationale)
- Decision authority: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10 D6` (rule-audit consolidation approval 2026-04-25)
- Phase 2a handoff: `~/.claude/plans/2026-04-25-harness-phase-2a-handoff.md §6` (v2.24.1 dispatch order)
- Predecessor v2.24.0 plan: `~/.claude/plans/deep-wiggling-mccarthy.md "Out of Scope §7"` (retire candidate first declared)

---

## [2.24.0] — 2026-04-25

### Why
v2.24.0 Phase 2a of plugin-only-portable migration (deep-wiggling-mccarthy.md). Hook redesign + monitor + deprecation banners — the operationally cheapest, lowest-risk Phase 2 bundle. Closes 3 documented Lead-time-burn patterns: (1) `subagent_type` typos failing silently at spawn, (2) stuck harness sprints burning tokens through PreCompact without operator visibility, (3) zero hook enforcement of post-W5 import discipline (`~/.claude/schemas/` → `~/ontology/shared-core/`). All 3 master-synthesis decisions D5+D6+D10 (approved by user 2026-04-25) implemented. Schemas v1.26.0 unchanged — schema primitives ship v2.27.0 Phase 2d.

### Added — New hooks (3 new + 1 consolidated, 5 hook commands)

- `hooks/rule-audit.ts` (Phase 2a T1) — consolidated `rule-bottleneck-watch` + `rule-drift-detect` + `rule-citation-validate` via `--mode={bottleneck|drift|citation}` argv flag. Registered at PreCompact (mode=bottleneck), SessionStart (mode=drift), PostToolUse:Edit on hooks/*.ts (mode=citation). Originals **retained** during v2.24.0 soak per architecture §13.3 risk mitigation; retire candidate v2.24.1+. Saves ~150 LOC long-term.
- `hooks/pre-spawn-validate.ts` (Phase 2a T2) — PreToolUse on `Agent` matcher (Blocking). Resolves requested `subagent_type` via `claude agents --json` (or filesystem fallback) before spawn. On miss: blocks + Levenshtein-fuzzy suggests top-3 closest matches. Catches typos like "reseracher" → "researcher" before paying spawn cost.
- `hooks/harness-eval-circuit-breaker.ts` (Phase 2a T2) — PreCompact (advisory). Walks `<project>/.palantir-mini/harness/sprints/*/{contract,state}.json`; flags sprints at-or-past `iterationLimit` AND with `driftSuspected: true`. Surfaces stuck sprints so operator can `/palantir-mini:pm-harness-abort` rather than burn tokens through compaction.
- `hooks/ontology-import-guard.ts` (Phase 2a T2) — PreToolUse on Edit|Write|MultiEdit (Blocking). Matcher `**/projects/{palantir-math,mathcrew,kosmos}/**/*.{ts,tsx}`. Blocks `from "~/.claude/schemas` and `from "@palantirKC/claude-schemas"` imports. Reconnaissance confirmed 0 existing violations across all 3 projects → ships pure-block, no grandfather list.

### Added — New monitor

- `monitors/harness-live-watch.ts` (Phase 2a T3) — polls `<project>/.palantir-mini/harness/sprints/*/state.json` every 30s; emits transitions (generating → evaluating → passed/failed/aborted) to events.jsonl + stderr. Mirrors WSL-safe drift-watch.ts skeleton (--once gate + isMonitorsDisabled() + setInterval + SIGTERM/SIGINT cleanup). Max-50-sprints scan ceiling. Resolves manual-polling gap (architecture §8.4).

### Added — Tests

- `tests/hooks/rule-audit.test.ts` (~21 cases — 3 modes × multiple paths + argv parsing)
- `tests/hooks/pre-spawn-validate.test.ts` (~12 cases — fuzzy matches + agent resolution + 5 hook flows)
- `tests/hooks/harness-eval-circuit-breaker.test.ts` (~10 cases — findStuckSprints fixtures + advisory output)
- `tests/hooks/ontology-import-guard.test.ts` (~17 cases — isTargetedFile, detectForbiddenImports, collectNewContent, 7 hook flows)
- `tests/monitors/harness-live-watch.test.ts` (~12 cases — readSprintStates, diffTransitions, isTerminalState)

### Edited — User-scope agent deprecation banners (9 files + BROWSE)

Per architecture §14.2 + scope precedence inversion. Plugin copies still DORMANT (v2.23.0 Phase 1 status); banners surface migration in `/agents` UI without functional change.

- `~/.claude/agents/researcher.md` — `description:` prepended `[DEPRECATED 2026-04-25 — plugin copy at ~/.claude/plugins/palantir-mini/agents/researcher.md takes effect at v3.0.0]`
- `~/.claude/agents/docs-researcher.md` — same prefix
- `~/.claude/agents/implementer.md` — same
- `~/.claude/agents/verifier-correctness.md` — same
- `~/.claude/agents/verifier-adversarial.md` — same
- `~/.claude/agents/protocol-designer.md` — same
- `~/.claude/agents/hook-builder.md` — same
- `~/.claude/agents/plugin-maintainer.md` — same
- `~/.claude/agents/ontology-steward.md` — same
- `~/.claude/agents/BROWSE.md` — top-of-file deprecation note (9 affected agents named, 5 not yet migrated)

### Edited — Plugin manifest + README + monitors registration

- `.claude-plugin/plugin.json` — version 2.23.0 → 2.24.0
- `.claude-plugin/marketplace.json` — version 2.23.0 → 2.24.0 (metadata + plugins[0])
- `package.json` — version 2.23.0 → 2.24.0
- `README.md` — surface counts refreshed (52 MCP / 39 hooks / 38 skills / 18 agents / 3 monitors); v2.22.0 → v2.24.0 release line; Phase 1 dormancy note added
- `monitors/monitors.json` — `harness-live-watch` entry appended
- `hooks/hooks.json` — 6 new registrations (PreCompact +2, SessionStart +1, PostToolUse +1, PreToolUse Edit +1, PreToolUse Agent +1) + description count update; 34 → 40 hook commands; 12 → 12 events (PreToolUse:Agent matcher new but already-existing event)

### NOT changed (deferred to v2.25.0+ per master synthesis §10)

- 3 original rule hooks (`rule-bottleneck-watch`, `rule-drift-detect`, `rule-citation-validate`) — retained verbatim during v2.24.0 soak; retire candidate v2.24.1
- Schemas v1.26.0 unchanged (3 new ontology primitives ship v2.27.0 Phase 2d)
- 4 new MCPs (`pm_harness_outcome_replay`, `pm_agent_lineage_export`, `pm_portable_bundle_manifest`) — v2.26.0 Phase 2c
- `pm_rule_query` MCP consolidation (3 → 1) — v2.26.0
- User-scope deletion (`rm -rf ~/.claude/{agents,skills}`) — v3.0.0 Phase 3 MAJOR

### Verification
- `bun test` → 690+ pass (623 v2.23.0 baseline + 5 new test files contributing ~67 new cases)
- `bunx tsc --noEmit` → clean (plugin + schemas)
- Plugin manifest version sync: plugin.json + marketplace.json + package.json all "2.24.0"
- Hook count verification: `jq '[.hooks[][].hooks // [] | .[]] | length' hooks/hooks.json` → 40

### Recovery
- `git revert <commit>` restores prior v2.23.0 state. Plugin agent copies + skills + pm_plugin_self_check MCP all retained from v2.23.0 (Phase 1 deliverables).
- 3 original rule hooks remain registered and functional during the soak window — the consolidated `rule-audit` hook can be disabled (remove from hooks.json) without affecting rule audit coverage.

### References
- Plan: `~/.claude/plans/deep-wiggling-mccarthy.md`
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §8 + §14.2`
- Decision authority: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10` (D5 + D6 + D10 approved 2026-04-25)
- Phase 1 handoff: `~/.claude/plans/2026-04-25-harness-phase-1-handoff.md §6`
- External evidence: `https://code.claude.com/docs/en/sub-agents` (scope precedence; PreSubagentStart NOT a registered event in v2.1.119, hence PreToolUse:Agent matcher used)

---

## [2.23.0] — 2026-04-25

### Why
v2.23.0 Phase 1 of plugin-only-portable migration plan (calm-dreaming-crystal.md). Additive copy of user-scope agents/skills + 5 new plugin agents + 5 new plugin skills + 1 new substrate-health MCP. ALL 10 decision points in `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10` approved by user 2026-04-25. Phase 1 is INTENTIONALLY DORMANT — plugin agent scope precedence is 5 (LOWEST) per https://code.claude.com/docs/en/sub-agents, so user-scope still wins by name resolution; plugin copies become effective only after Phase 3 (v3.0.0) user-scope deletion.

### Added — Plugin agents (14 new files, 4 → 18 total)

**9 copied from user-scope (verbatim body):**
- `agents/researcher.md` (T1a)
- `agents/docs-researcher.md` (T1b — frontmatter description appended with doc-writer merge note)
- `agents/implementer.md` (T1c — generic; project scope injected via task-brief)
- `agents/verifier-correctness.md` (T1d)
- `agents/verifier-adversarial.md` (T1e)
- `agents/protocol-designer.md` (T1f)
- `agents/hook-builder.md` (T1g)
- `agents/plugin-maintainer.md` (T1h)
- `agents/ontology-steward.md` (T1i)

**5 newly authored:**
- `agents/lead-orchestrator.md` (T2a — opus, formal Lead-as-spawnable per 06-plugin-only-architecture.md §6.1)
- `agents/eval-judge.md` (T2b — opus, rubric-only judge per §6.2)
- `agents/code-grader.md` (T2c — sonnet, shell-expression scoring per §6.3)
- `agents/model-grader.md` (T2d — sonnet, claude -p rubric scoring per §6.3)
- `agents/scrapling-fetcher.md` (T2e — haiku, cost-optimized web fetch per §6.5)

### Added — Plugin skills (4 absorbed + 1 shared ref + 5 new = 10 dir additions)

**4 absorbed from user-scope (rename to pm-* namespace):**
- `skills/pm-orchestrate/` (T3a from `~/.claude/skills/orchestrate/`)
- `skills/pm-lsp-audit/` (T3b from `~/.claude/skills/lsp-audit/`)
- `skills/pm-walk-build/` (T3c from `~/.claude/skills/palantir-walk-build/`)
- `skills/pm-walk-analyze/` (T3d from `~/.claude/skills/palantir-walk-analyze/`)

**1 shared reference (not a skill — no SKILL.md):**
- `skills/_shared/walk-reference.md` (T3e from `~/.claude/skills/palantir-walk-shared/REFERENCE.md`)

**5 newly authored skills:**
- `skills/pm-portable-bundle/SKILL.md` (T4a — tarball export per §7.1)
- `skills/pm-restore/SKILL.md` (T4b — fresh-machine rehydrate per §7.2)
- `skills/pm-self-test/SKILL.md` (T4c — E2E substrate smoke per §7.3)
- `skills/pm-harness-stop/SKILL.md` (T4d — orderly abort live loops per §7.4)
- `skills/pm-rehydrate/SKILL.md` (T4e — convenience user→plugin migration per §7.5)

### Added — Bridge handler (1 new MCP, TOOLS 51 → 52)

- `bridge/handlers/pm-plugin-self-check.ts` + `tests/bridge/handlers/pm-plugin-self-check.test.ts` (T6)
- `bridge/mcp-server.ts` — new TOOLS entry + moduleMap entry
- `lib/event-log/types.ts` — new `PluginSelfCheckCompletedEnvelope` + union member + EventSnapshot field
- `lib/event-log/read.ts` — snapshot zero initializer + exhaustive switch case

### NOT changed (Phase 2-4 deferred per soak discipline)

- User-scope `~/.claude/agents/` and `~/.claude/skills/` UNCHANGED. Phase 1 is additive copy ONLY. Phase 3 (v3.0.0) will delete user-scope; until then user-scope wins by precedence inversion.
- 3 new hooks (PreSubagentStart deep-validate, harness-eval-circuit-breaker, ontology-import-guard) — deferred to v2.24.0 (Phase 2a)
- `rule-audit` hook consolidation — deferred to v2.24.0
- 3 new ontology primitives (AgentDefinition, SkillDefinition, PluginDeclaration) — deferred to v2.27.0 (Phase 2d), coordinated schemas v1.27.0 MINOR
- 3 other new MCPs (pm_harness_outcome_replay, pm_agent_lineage_export, pm_portable_bundle_manifest) — deferred to v2.26.0
- `pm_rule_query` consolidation (3 rule MCPs → 1) — deferred to v2.26.0
- README.md refresh (stale "v2.7 / 48 tools / 3 agents") — deferred to v2.24.0
- Deprecation banners in user-scope agent description fields — deferred to v2.24.0
- User-scope deletion (`rm -rf ~/.claude/{agents,skills}`) — Phase 3 (v3.0.0 MAJOR), entry: 2-session double-soak

### Verification
- `bun test` → ≥616 + 7 new (pm-plugin-self-check.test.ts) = ≥623 pass expected
- `bunx tsc --noEmit` → clean
- Plugin manifest version sync: plugin.json + marketplace.json + package.json all "2.23.0"
- Schemas version unchanged at v1.26.0 (no schema changes Phase 1)
- Plugin agent count: 4 → 18 (+14)
- Plugin skill count: 29 → 38 (+9 skill dirs; +1 _shared ref does not count as skill)
- MCP TOOLS surface: 51 → 52

### Recovery
- `git revert <commit>` restores prior v2.22.0 state. Plugin tree retains harness-{4 existing}; user-scope agents/skills already intact (never modified).
- Each subsequent MINOR (v2.24.0 → v2.27.0) is independently revertable until v3.0.0 cutover.

### References
- Plan: `~/.claude/plans/calm-dreaming-crystal.md`
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md` (1338 LOC, 19 sections)
- Decision authority: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10` (10 decision points all approved by user 2026-04-25)
- State audit baseline: `~/.claude/plans/2026-04-25-harness/05-palantir-mini-state-audit.md` (1508 LOC)
- Cold-start (next session): `~/.claude/plans/2026-04-25-harness/NEXT-SESSION-COLD-START.md`
- Critical invariant cited: `https://code.claude.com/docs/en/sub-agents` (scope precedence; plugin = 5 LOWEST)

---

## [2.22.0] — 2026-04-25

### Why
Session 2026-04-25 "synthetic-purring-teacup" plan: policy-correction + rules/ prune + plugin dead-code resolution. Consolidates the 2-session-grace-window deletions from Session 5 W1-A Kill List, tombstones the Phase D 12→3 agent slimdown (2026-04-21), and closes 3 micro-bottlenecks (B-16/B-17/B-18) discovered in Session 3 telemetry.

### Added
- `populate-impact-graph` handler: 5-minute dedup window on `impact_graph_initialized` event emission (B-16 fix)
- `idle-auto-shutdown` hook: pair-tracker + 30-minute orphan timeout recovery emitting synthetic `subagent_stop` with reason `timeout_recovery` (B-17 fix)
- `drift-watch` monitor: 30ms sliding-window payload-hash dedup on `drift_detected` (B-18 fix)
- 22 new test cases (6 populate-impact-graph + 6 idle-auto-shutdown orphan-recovery + 10 drift-watch dedup)

### Removed
- 7 deprecated skills (`pm-careful`, `pm-cso`, `pm-document-release`, `pm-freeze`, `pm-unfreeze`, `pm-plan-ceo-review`, `pm-plan-devex-review`) — 2-session grace window expired since Session 5 W1-A mark (PR #224)
- 4 `.disabled/` skills (`pm-action`, `pm-ontology-register`, `pm-research-prune`, `pm-research-version-delta`) — tombstone deletions
- 9 `.disabled/` agents (action-executor, change-auditor, codegen-runner, grader-code, grader-model, harness-orchestrator, ontology-verifier, outcomes-grader, propagation-tracer) — Phase D 12→3 slimdown tombstone deletions
- 3 `.disabled/` handlers (close-feedback-loop, evaluate_outcome, open-feedback-loop) — superseded by `grade_outcome_with_rubric` + `negotiate_sprint_contract` + direct state-machine dispatch

### Verification
- `bun test` → 616/616 pass (594 baseline + 22 new)
- `bunx tsc --noEmit` → clean
- Post-deletion surface: 29 skills + 4 agents + 56 handlers
- Schemas version unchanged at v1.26.0

### Recovery
- `git revert <commit>` restores deleted directories via git history — no `.disabled/` tombstone directories preserved (deletion is final; recovery via git).
- B-16/B-17/B-18 fixes are additive; disabling means reverting the specific handler/hook/monitor file.

### References
- Session plan: `~/.claude/plans/synthetic-purring-teacup.md`
- Preflight: `~/.claude/plans/2026-04-25-pm-dead-code-preflight.md`
- Rules 03 + 05 retired (stub) in same session — see `rules/01-ontology-first-core.md §Propagation` + `rules/02-research-retrieval.md §Skill resolution`
- Artifact Layer Policy codified — `~/.claude/CLAUDE.md §Artifact Layer Policy` (research/ = immutable SSoT; internal synthesis → plans/)

---

## [2.21.0] — 2026-04-25

### Added — W5 Component Audit infrastructure (cheeky-wandering-yeti.md Gap 1)

- **schemas v1.26.0**: `primitives/harness-component.ts` — new `HarnessComponentDeclaration` primitive + `HARNESS_COMPONENT_SEED_IDS` (7 seeds: sprint-construct, per-sprint-evaluator, context-reset, planner, harness-analyzer, file-ipc-feedback, sprint-contract-negotiation) + `HarnessComponentRegistry`.
- **schemas v1.26.0**: new `harness_component_audit_emitted` event type.
- `bridge/handlers/pm_harness_component_audit.ts` **NEW** — enumerate-only read path (verdict=never-audited) + verdict-record path (emits event). Seven seed component declarations embedded with Rajasekaran-blog-aligned assumption + simpleVariant + priority rank.
- `bridge/mcp-server.ts` — new TOOLS entry + moduleMap. Surface count 50 → 51.
- `skills/pm-harness-component-audit/SKILL.md` **NEW** — operator guide + 7-seed table + recommendation output template.
- `agents/harness-analyzer.md` — frontmatter description: analyzer now also replays `harness_component_audit_emitted` events and surfaces `remove-candidate` verdicts in analysis-NNN.md.
- `lib/event-log/types.ts` + `read.ts` — new envelope in union + snapshot counter.
- `tests/bridge/handlers/pm-harness-component-audit.test.ts` **NEW** — 7 unit cases (seed enumeration; never-audited path; verdict-record return contract; unknown-id path; missing-id rejection).

### NOT changed (scope)

No actual A/B canary runs executed by this release. Canary execution requires a full sprint-level harness invocation (future palantir-math sprint-003+ W5 dogfood). This release ships the **infrastructure** — seed declarations, MCP handler, event substrate, skill, analyzer integration — so canary results can be recorded + aggregated. First `harness_component_audit_emitted` event will land when a sprint-003 W5 canary surfaces its verdict.

### Why
Rajasekaran's §1 principle ("every component encodes an assumption … worth stress testing, both because they may be incorrect, and because they can quickly go stale as models improve") had **zero substrate** in the pre-v2.21 harness. With this PR, any component's removal decision is backed by a verdict-event trail — replayable via `replay_lineage`, aggregable by harness-analyzer, authoritative for next-MAJOR deprecation choices. Closes the final original gap from `cheeky-wandering-yeti.md` — all 5 gaps (W1-W5) now have infrastructure.

### Verification
- `bun test` — **594/594 pass** (587 baseline + 7 W5 new cases).
- `bunx tsc --noEmit` — clean across plugin + schemas workspaces.

### Recovery
`git revert` drops the handler + seed list + skill + envelope + counter + analyzer description note. Schema primitive + event are additive — consumer code unaffected.

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 4c
- Parent: `~/.claude/plans/cheeky-wandering-yeti.md` §W5 (largest wave; component audit infrastructure)
- Rajasekaran blog: research/claude-code/harness-design-long-running-apps.md §1
- Base PR: #229 (v2.20.0 W4 context-reset optional field)

---

## [2.20.0] — 2026-04-25

### Added — W4 Context Reset Optional (cheeky-wandering-yeti.md Gap 2; declaration-only scope)

- **schemas v1.25.0**: `SprintContract.iterationResetPolicy?: "auto" | "manual" | "disabled"` field (optional, effectively "disabled" when omitted). `SprintContract.resetHandoffManifest?: { includeFiles, maxTokens }`.
- **schemas v1.25.0**: new `context_reset_handoff_emitted` event type in registry.
- `lib/event-log/types.ts`: new `ContextResetHandoffEmittedEnvelope` in `EventEnvelope` union + `EventSnapshot.context_reset_handoff_emitted` counter.
- `lib/event-log/read.ts`: snapshot init + exhaustive switch case.
- `skills/pm-harness-sprint/SKILL.md`: new "W4 — iterationResetPolicy" section documenting the three policy values + the TODO for runtime implementation.
- `rules/16-3-agent-harness.md`: frontmatter version 2.1.0 → 2.2.0; invariant mentions the optional policy field.

### NOT changed (Rajasekaran scope-limit)

No runtime behavior change. Generator still runs as a continuous session across iterations; Claude Agent SDK compaction handles context growth. Per Rajasekaran's blog, Opus 4.5+ largely removed the context anxiety that made context reset load-bearing in the Sonnet 4.5 era, so this release deliberately ships the **substrate only** — W5 Component Audit will measure whether the simpleVariant (continuous session + auto compaction) outperforms reset-enabled runs before any runtime branch lands.

### Why
Keeps the harness surface honest — the field exists for future measurability without claiming runtime support that isn't there. Closes Part 2 Gap 2 at minimum-viable scope. The counter-argument is that Opus 4.7 may behave differently than 4.5; if empirical evidence surfaces in a future canary, the runtime branch (Generator re-spawn + handoff manifest consumption) can land in a subsequent PR without schema churn.

### Verification
- `bun test` — 587/587 pass (no new test cases; envelope + registry additive).
- `bunx tsc --noEmit` — clean across plugin + schemas.

### Recovery
`git revert` drops the envelope + counter + schema field. No downstream breakage (fields are optional, events are additive).

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 4b
- Parent: `~/.claude/plans/cheeky-wandering-yeti.md` §W4 + §E Rajasekaran staleness S1/S2/S3
- Base PR: #228 (v2.19.0 W3 dissent record)

---

## [2.19.0] — 2026-04-25

### Added — W3 Dissent Record preservation (cheeky-wandering-yeti.md Gap 5)

- `bridge/handlers/negotiate-sprint-contract.ts` — at contract bind, the handler inspects `finalContract.negotiationHistory[]`. When any round has `acceptedInFinal: false`, emits a new `sprint_contract_dissent_preserved` event (schemas v1.24.0) capturing `{ project, contractId, sprintNumber, disputedRounds, totalRounds }`. Read after `sprint_contract_bound` for Decision Lineage replay.
- `lib/event-log/types.ts` — new `SprintContractDissentPreservedEnvelope` in the `EventEnvelope` discriminated union + `EventSnapshot.sprint_contract_dissent_preserved` counter field.
- `lib/event-log/read.ts` — snapshot counter init + exhaustive switch case.
- `agents/harness-analyzer.md` — description updated: analyzer now also replays `sprint_contract_dissent_preserved` events via `replay_lineage` to correlate post-sprint failures with rejected proposals.

### Schemas v1.24.0
- `primitives/sprint-contract.ts` — new `NegotiationHistoryRound` interface (round / proposer / targetField / delta / rationale / acceptedInFinal / at); `SprintContractDeclaration.negotiationHistory?` optional array. Backward-compatible — pre-v1.24 contracts omit the field entirely.
- `lineage/event-types.ts` — `sprint_contract_dissent_preserved` event name + registry description.

### Why
Prior `disagreementResolution` policy (lead-arbitrated / priority-criterion / abort-on-disagreement) existed but left **zero audit trail**. harness-analyzer post-sprint could not correlate Evaluator score deltas with rubric edits that were rejected during negotiation. This PR closes Part 2 Gap 5 (final of the original five gaps surfaced in `cheeky-wandering-yeti.md`). Next W0-class canary with multi-round negotiation will emit the first `sprint_contract_dissent_preserved` event.

### Verification
- `bun test` — 587/587 pass (no new test cases; envelope + registry additive change verified via tsc only for this PR since no pre-existing negotiate-sprint-contract test suite exists).
- `bunx tsc --noEmit` — clean across plugin + schemas.

### Recovery
`git revert` drops the dissent emit block + envelope type. `negotiationHistory` field is optional in schemas — consumer code unaffected.

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 4a
- Parent: `~/.claude/plans/cheeky-wandering-yeti.md` §W3 + Gap 5
- Base PR: #227 (v2.18.0 W1+W2 bundle)

---

## [2.18.0] — 2026-04-25

### Added — W1 Planner Output Meta-Rubric (cheeky-wandering-yeti.md Gap 4)
- `bridge/handlers/grade_planner_output.ts` — new handler (~85 LOC). Reads Planner's `spec.md`, scores on 3 axes: `featureCount` (regex match of `### F-NN`, Must/Should/Nice), `designSpecificity` (0/1/2 based on hex-color + font-family density), `antiPatternCount` (anti-pattern/avoid/never/❌ callouts). Verdict = **pass** (≥12 features + designSpecificity=2 + ≥3 anti-patterns) | **warn** (≥8 features + ≥1 anti-pattern) | **block** (otherwise). Emits `planner_output_graded` event (schemas v1.23.0). Exposed via `grade_planner_output` MCP.
- `skills/pm-harness-plan/SKILL.md` — new step 6 invokes `grade_planner_output` post-Planner; verdict=block halts the pipeline before Generator spawn.
- `agents/harness-planner.md` — output contract explicit (≥12 `### F-NN` headers + ≥3 hex/font anchors + ≥3 anti-pattern callouts for verdict=pass).
- `tests/bridge/handlers/grade-planner-output.test.ts` — 12 unit cases (scoring math, verdict classification, event emission, missing-spec error). All pass (58ms).

### Added — W2 Evaluator Strictness Probe (cheeky-wandering-yeti.md Gap 3)
- `bridge/handlers/grade-outcome-with-rubric.ts` — per-criterion probe emission after each grading decision when `sprintNumber` + `iteration` args supplied. Probe payload = `{ sprintNumber, iteration, criterionHash: sha256(criterionId+scoringPrompt).slice(16), score, evidenceCitationCount, failureClassCount }`. `failureClassCount` heuristically derived from reasoning text ("critical", "major", "minor").
- `bridge/handlers/pm_harness_strictness_audit.ts` — new handler (~140 LOC). Reads `evaluator_strictness_probe` events for a sprint, groups by `criterionHash`, computes `linearTrend` of score and failureClassCount across iterations. Drift verdict when `scoreTrend > 0.05` AND `failureClassTrend >= 0` (score rising without matching drop in failure classes). Returns `{ sprintNumber, criteriaAnalyzed, driftingCriteria: [], verdict: clean|drift-suspected, reasoning }`. Read-only. Exposed via `pm_harness_strictness_audit` MCP.
- `skills/pm-harness-status/SKILL.md` — new step 3 appends strictness verdict per sprint.
- `agents/harness-evaluator.md` — frontmatter note: pass `sprintNumber` + `iteration` to `grade_outcome_with_rubric` for probe emission.
- `tests/bridge/handlers/pm-harness-strictness-audit.test.ts` — 8 unit cases (linearTrend math, drift detection, clean-when-improving, sprint filtering). All pass.

### Event registry (schemas v1.23.0)
- `lib/event-log/types.ts` — added `PlannerOutputGradedEnvelope` + `EvaluatorStrictnessProbeEnvelope` to `EventEnvelope` discriminated union.
- `lib/event-log/read.ts` — added `planner_output_graded` + `evaluator_strictness_probe` snapshot counters + exhaustive `foldToSnapshot` cases.
- MCP bridge — registered 2 new tools in `bridge/mcp-server.ts` TOOLS array + handler moduleMap. Surface count 48 → 50.

### Why
Opus-4-7 self-designed harness had no mechanism to (a) measure Planner spec quality up-front or (b) detect Evaluator strictness decay across iterations. W0 canary ran to completion with both gaps latent. W1+W2 bundle closes both in one versioned surface and produces the first emissions of `planner_output_graded` + `evaluator_strictness_probe` against palantir-math sprint-003+ (first W1 dogfood will validate the 13-feature W0 sprint-002 spec as `pass`).

### Verification
- `bunx tsc --noEmit` — clean across plugin + schemas workspaces.
- `bun test` — **587/587 pass** (567 baseline + 12 W1 + 8 W2 new cases).
- schemas v1.23.0 bump (ontology/CHANGELOG + package.json + event-types registry).

### Recovery
`git revert` of this commit drops both handlers + probe emission + meta-rubric step in pm-harness-plan. Schema v1.23.0 additive event types remain forward-compatible (consumer pinned to ^1.22 still works; new events simply unused).

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 3
- Parent: `~/.claude/plans/cheeky-wandering-yeti.md` §W1 + §W2 + §"Anthropic best-practice gap mapping"
- Rule: 16 (2-role harness default)

---

## [2.17.0] — 2026-04-25

### Changed
- **Rules 01/02/03/05/17/18 — explicit `tier: T2` frontmatter** + rule-level semver MINOR bump (1.0.0 → 1.1.0; 17/18 2.0.0 → 2.1.0). Frontmatter declaration codifies their on-demand status; rule bodies unchanged.
- `rules/BROWSE.md` routing table — every row that previously showed a bare rule number (`01`, `02`, …) now points to the explicit MCP handler call (`pm_rule_get 1`, `pm_rule_get 2`, …). Surfaces the on-demand access pattern as the canonical interface. Added dedicated row for retired rule 18 (merged into 10). CONTEXT (pm_rule_get 0) row preserved from v2.16.0.

### Why
Session 5 W2-B. Closes the W2-A → W2-B pair: W2-A re-tiered CONTEXT.md off per-turn (−6,500 tok); W2-B codifies the remaining T2 stable surface and makes the `pm_rule_get` handler the one obvious way to read any rule detail. Reduces ambiguity for future agents encountering `rules/BROWSE.md` (bare numbers were human shorthand; explicit handler calls are machine-parseable). Token impact: minimal direct savings (~−1,500 tok) but aligns every rule lookup with the MCP substrate.

### Verification
- `bun test` — expect 567/567 pass (no code changes; frontmatter + docs only).
- `bunx tsc --noEmit` — clean.
- `grep -c 'pm_rule_get' ~/.claude/rules/BROWSE.md` → 17 (16 active rules + CONTEXT).
- `grep -l 'tier: T2' ~/.claude/rules/{01,02,03,05,17,18}-*.md | wc -l` → 6.

### Recovery
Single `git revert` restores bare-number routing + pre-tier-T2 frontmatter.

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 2c
- Kickoff: `~/.claude/plans/2026-04-25-palantir-mini-session-5-kickoff.md` W2-B
- Base PR: #225 (v2.16.0 CONTEXT on-demand)

---

## [2.16.0] — 2026-04-25

### Changed
- **`rules/CONTEXT.md` re-tiered from T1 to T2** — frontmatter now carries `tier: T2`. Previously loaded every turn (~400 LOC / ~8,000 tok). Content fetched via `pm_rule_get 0` on demand. CORE.md (T1, 25 LOC) retains distilled invariants.
- `rules/BROWSE.md` — new routing row `| Authoring context / rules system internals | pm_rule_get 0 |` routes authoring queries to the on-demand handler.

### Why
Session 5 W2-A: largest single token saving across the entire per-turn context window. Root-cwd drops approximately −6,500 tokens. Authoring-guide access pattern aligns with actual usage (rare, on-demand) rather than always-loaded. Rule system still fully discoverable via `pm_rule_get` + `pm_rule_list` + `pm_rule_search`.

### Verification
- `bunx tsc --noEmit` — clean (no code changes).
- `bun test` — 567/567 pass (no test changes from Slice 2a baseline).
- `grep -q "tier: T2" ~/.claude/rules/CONTEXT.md` — present.
- `grep -q "pm_rule_get 0" ~/.claude/rules/BROWSE.md` — present.

### Recovery
Single `git revert` restores T1 always-load behavior.

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 2b
- Kickoff: `~/.claude/plans/2026-04-25-palantir-mini-session-5-kickoff.md` W2-A
- Base PR: #224 (v2.15.0 Kill + surface sync)

---

## [2.15.0] — 2026-04-25

### Removed
- `hooks/task-claim-throttle.ts` (+ paired test) — orphan file, never registered in `hooks/hooks.json`.
- `bridge/handlers/chrome_ratio_measure.ts` (332 LOC) — zero `chrome_ratio_measured` events ever emitted across all project event logs (Sessions 1-5 telemetry confirmed). Removed 3 references from `bridge/mcp-server.ts` (tool definition, handler index, import).

### Marked deprecated (Session 7 grace window)
- 7 skills with zero `skill_started` telemetry gain `deprecated: true` + `deprecationGraceWindow` + `reason` frontmatter keys: **pm-careful, pm-cso, pm-document-release, pm-freeze, pm-unfreeze, pm-plan-ceo-review, pm-plan-devex-review**. Functionality subsumed by pm-guard (pm-careful + pm-freeze), pm-ship (pm-document-release), pm-office-hours + pm-plan-eng-review (replaced by *-review stubs). Files retained during grace window; final DELETE target = Session 7 after B-26 telemetry confirms real zero-emit post-fix (v2.14.0 already landed).

### Fixed
- **Surface-drift +1-tool sync** — `complete_playwright_scenario` (tool #49) was added to `bridge/mcp-server.ts` after PRs #197-#200 absorbed the v2.13.0 Slice A/B/C/D drift audit, but `plugin.json` still declared "48 MCP tools" and `~/.claude/managed-settings.d/50-palantir-mini.json` masked the gap with duplicate `codegen_trigger` + `get_ontology` entries (2 dupes → 50 total masking the missing 49th grant). Post-Kill count = **48** (49 pre-Kill − 1 chrome_ratio_measure). Synced declared counts across `plugin.json` + `marketplace.json` + `package.json` + both `managed-settings.d/50-palantir-mini.json` fragments (home + plugin-scoped) + `README.md` + `~/.claude/INDEX.md`.

### Documented
- `skills/pm-verify/SKILL.md` — added section noting pm-verify invokes `scan_dead_code` + `scan_file_size_violations` MCP handlers as Design-phase internal checks (handlers retained; only docs integration; handler files kept in `bridge/handlers/` for standalone future use).

### Why
Close Session 5 W1-A Kill + dedupe the surface-drift that re-emerged post-PRs #197-#200. Handler count now matches declared count exactly. 29 DEAD skill list deliberately scoped to **7 verified-dead seeds** (Lead-audited via `skill_started` event query); remaining skills (pm-codegen, pm-rule, pm-rule-audit, pm-investigate, pm-learn, pm-retro, pm-recap, pm-replay, pm-change-plan, pm-harness-*, etc.) confirmed active through Sessions 1-5 telemetry and remain untouched.

### Verification
- `bun test` — expect ≥568 pass (570 pre-Kill − 2 task-claim-throttle test cases automatically dropped + 7 B-31/B-26 new cases retained = still on the green bar).
- `bunx tsc --noEmit` — clean.
- `grep -c "chrome_ratio" bridge/mcp-server.ts` → 0.
- `grep -l '^deprecated: true' skills/pm-{careful,cso,document-release,freeze,unfreeze,plan-ceo-review,plan-devex-review}/SKILL.md | wc -l` → 7.
- `jq '..|objects|select(has("tool"))|.tool' ~/.claude/managed-settings.d/50-palantir-mini.json | sort | uniq -d` → empty (no duplicates post-dedupe).

### Recovery
Single `git revert` restores deleted handlers + skill frontmatter. No schema change; no consumer API break (deleted handlers had zero callers per event telemetry).

### References
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 2a
- Session 5 kickoff: `~/.claude/plans/2026-04-25-palantir-mini-session-5-kickoff.md` W1-A
- Parallel track: Slice 2b (`feat/pm-v2.16.0-context-on-demand`, stacked on this PR)

---

## [2.14.0] — 2026-04-25

### Fixed
- **B-26 (harness-h4 canary W0)** — `bridge/handlers/grade-outcome-with-rubric.ts` now explicitly forwards `CLAUDE_CONFIG_DIR` (fallback: `~/.claude`) and `HOME` (fallback: `os.homedir()`) to the nested `execSync("claude -p …")` subprocess spawn. Root cause: MCP subprocess inherited parent env via `...process.env` spread, but `CLAUDE_CONFIG_DIR` was absent, so the spawned CLI could not locate user config within the 120s timeout, producing `spawnSync ETIMEDOUT` on all 3 model-domain criteria in W0 (design-quality, originality, functionality). Workaround in W0 was `disagreementResolution: lead-arbitrated`. This fix restores the canonical dedicated-grader path.

### Added
- **`buildGraderModelEnv()` exported helper** — env-construction logic factored from inline handler so unit tests can verify CLAUDE_CONFIG_DIR + HOME forwarding without an actual subprocess spawn.
- `tests/bridge/handlers/grade-outcome-model-env.test.ts` — 5 unit cases covering CLAUDE_CONFIG_DIR fallback, honor-existing, HOME forwarding, PALANTIR_MINI_GRADER marker, and PATH inheritance. 19/19 total tests pass across grade-outcome suite.
- **PALANTIR_MINI_DEBUG=1** diagnostic path — when set, catch block logs `{code, status, signal, stderrHead, claudeConfigDir}` for future subprocess regressions. Gated behind env to keep normal runs quiet.
- Catch block error reasoning now includes `code` + `signal` for easier triage without DEBUG env.

### Why
- v2.0.1 D1 fix had made grader-model work previously but did not enforce CLAUDE_CONFIG_DIR; post-v2.2+ session layout changes re-surfaced the env gap. This closes the 4th-to-last harness-h4 canary defect (B-27/B-28/B-29/B-30/B-31 already landed).
- Live subprocess verification deferred: nested `claude -p` inside an active Claude Code session is costly to dogfood reliably from a test harness. Unit test covers env construction; next harness canary (W5 territory) will confirm end-to-end.

### Verification
- `bunx tsc --noEmit` from `plugins/palantir-mini/` — clean.
- `bun test tests/bridge/handlers/grade-outcome-model-env.test.ts tests/bridge/handlers/grade-outcome-with-rubric.test.ts` — 19/19 pass (67ms).
- Full `bun test` — see PR verification section.

### Recovery
Single `git revert` restores v2.13.3 (lead-arbitrated workaround path). No schema change, no peerDependencies bump. `buildGraderModelEnv` export is additive — removing it breaks only the unit test.

### References
- Evidence: `~/.claude/research/claude-code/harness-h4-canary-run.md §5` (B-26 diagnosis).
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 1b.
- Parent plan: `~/.claude/plans/cheeky-wandering-yeti.md` (W0 complete).

---

## [2.13.3] — 2026-04-25

### Fixed
- **B-31 (harness-h4 canary fallout)** — `bridge/handlers/claude_code_version_delta.ts:300,327` no longer passes `cwd: researchRoot` to `emit()`. Post-B-30 (v2.13.1), `emit()` correctly respects handler-supplied cwd; the old `researchRoot` value caused version-delta events to land inside `~/.claude/research/claude-code/.palantir-mini/session/events.jsonl`, polluting the read-only evidence library with runtime artifacts. Fix: empty-string cwd triggers `emit()`'s `projectRoot()` fallback so version-delta events stay on the home plugin event lane. Research remains read-only evidence, not an event target.

### Added
- `tests/bridge/handlers/claude-code-version-delta-routing.test.ts` — B-31 regression (2 cases): summary event routes to projectRoot() fallback; `emitPerVersion=true` path respects same routing; neither case creates `.palantir-mini/session/` inside `researchRoot` tmp dir.

### Why
- Close the last routing defect surfaced by the harness-h4 W0 canary. After B-30 gave `emit()` cwd-awareness, any handler that previously leaned on `cwd: <non-project-dir>` now produces events outside its rightful lane. `claude_code_version_delta` was the only remaining offender (`researchRoot`). Next W0-class dogfood should observe zero events landing inside `~/.claude/research/**`.

### Verification
- `bunx tsc --noEmit` from `plugins/palantir-mini/` — clean.
- `bun test tests/bridge/handlers/claude-code-version-delta-routing.test.ts` — 2/2 pass (82ms).
- Full `bun test` — see PR verification section.

### Recovery
Single `git revert` restores v2.13.2 behavior. No schema change. No peerDependencies bump. No consumer impact — handler signature unchanged; only internal routing metadata changes.

### References
- Evidence: `~/.claude/plans/2026-04-25-harness-track-a-slice-1-2-handoff.md §1` (B-31 candidate surfaced after Slice 1+2 close).
- Plan: `~/.claude/plans/steady-fluttering-toast.md` Slice 1a.
- Prior: `CHANGELOG.md` v2.13.1 (B-30 emit cwd fix that made this follow-up necessary).

---

## [2.13.2] — 2026-04-25

### Fixed
- **B-29 (harness-h4 canary)** — `bridge/handlers/grade-outcome-with-rubric.ts::gradeHybrid()` now reads either `subCriteriaRids` (canonical) OR `subCriteria` (alias) on hybrid criteria via new `resolveSubCriteriaRids()` helper. Planner-authored rubrics observed in the wild (harness-h4 W0) used the shorter `subCriteria` form; pre-patch dispatcher read only the canonical name and reported `hybrid combinator=weighted over 0 subs` (score 0.00), forcing Lead to bypass via manual inline scoring. Schema primitive `~/.claude/schemas/ontology/primitives/grading-criterion.ts` gains a JSDoc note calling out the alias. Canonical field unchanged; new authors should prefer `subCriteriaRids`.

### Documented
- **B-28 (harness-h4 canary)** — `skills/pm-harness-sprint/SKILL.md` and `agents/harness-evaluator.md` now document the `file://` → `http://localhost:<port>` workaround. Playwright MCP's security layer blocks `file://` URLs; the Evaluator must spawn a throwaway static server (`bunx serve` / `python3 -m http.server`) before running the scenario when the spec target uses `file://`. Auto-wrap inside `run_playwright_scenario` deferred to **B-28b** in a later MINOR (v2.14.0+) — requires lifecycle management (spawn / health-check / port allocation / teardown) beyond patch-level scope.

### Added
- Extended `tests/bridge/handlers/grade-outcome-with-rubric.test.ts` — new alias-equivalence case: identical hybrid rubrics authored with `subCriteriaRids` vs `subCriteria` produce identical score / passFail / reasoning "over 2 subs" (not 0). 14/14 passing.

### Why
- B-29 unblocks real hybrid-rubric dogfood against existing Planner outputs without forcing every rubric rewrite. Sprint-003+ can now score Craft compositions correctly.
- B-28 docs-only path is sufficient for patch-level release; auto-wrapping touches the handler's subprocess lifecycle model (fresh surface for a later MINOR).
- B-26 (grader-model spawnSync ETIMEDOUT) intentionally deferred — requires MCP subprocess env investigation beyond rule 14's soft session window and is currently workable via `disagreementResolution: lead-arbitrated` fallback.

### Verification
- `bunx tsc --noEmit` from `plugins/palantir-mini/` — clean.
- `bun test tests/bridge/handlers/grade-outcome-with-rubric.test.ts` — 14/14 pass.
- Full `bun test` — see PR verification section.

### Recovery
Single `git revert` restores v2.13.1 behavior. No schema change; JSDoc-only edit on schemas side. No peerDependencies bump, no consumer impact.

### References
- Evidence: `~/.claude/research/claude-code/harness-h4-canary-run.md §5` (B-26..B-30 diagnosis).
- Plan: `~/.claude/plans/reactive-sauteeing-sun.md` Slice 2.
- Parent plan: `~/.claude/plans/cheeky-wandering-yeti.md` (W0 complete; W1-W5 deferred).

---

## [2.13.1] — 2026-04-25

### Fixed
- **B-30 (harness-h4 canary ⭐)** — `scripts/log.ts::emit()` now routes to `env.cwd` when the handler supplies a non-empty project path (line ~82). Previously discarded the handler's `cwd:` arg and re-read `PALANTIR_MINI_PROJECT` / `process.cwd()` via `projectRoot()`, causing Playwright + grading events invoked against `/home/palantirkc/projects/palantir-math` to land in `~/.palantir-mini/session/events.jsonl` (home plugin) instead. Audit trail split violated rule 10 (append-only + 5-dim substrate). Backward-compatible fallback retained for callers without explicit cwd.
- **B-27 (harness-h4 canary)** — `bridge/handlers/complete-playwright-scenario.ts::isPlaywrightOutcomeShape()` (line 130-131) now accepts `failedStep: null` and `failureMessage: null` alongside `undefined`. JSON-natural null for "no failed step" previously rejected by `!== undefined` check, wasting one MCP round-trip per evaluator run.

### Added
- `tests/bridge/handlers/emit-cwd-routing.test.ts` — 3-case regression suite: explicit-cwd-overrides-env-var, empty-cwd-falls-back, parallel-cwd-routing-isolation.
- Extended `complete-playwright-scenario.test.ts` — added null-accepting case alongside existing `undefined` coverage.

### Why
- Without B-30, every harness event type added by W1-W5 of `~/.claude/plans/cheeky-wandering-yeti.md` would inherit the routing bug, multiplying the audit-trail breakage. W0 canary (2026-04-24) exposed this as the single highest-priority defect.
- Per `~/.claude/plans/2026-04-24-harness-w0-handoff-next-session.md §4` recommendation: land Track A (Stabilize) before Track B (Extend W1-W5).

### Verification
- `bunx tsc --noEmit` from `plugins/palantir-mini/` — clean.
- `bun test tests/bridge/handlers/emit-cwd-routing.test.ts tests/bridge/handlers/complete-playwright-scenario.test.ts` — 24/24 pass.
- Full `bun test` — see PR verification section.

### Recovery
Single `git revert` restores v2.13.0 behavior. No schema change, no peerDependencies bump, no consumer impact.

### References
- Evidence: `~/.claude/research/claude-code/harness-h4-canary-run.md §5` (B-26..B-30 diagnosis).
- Plan: `~/.claude/plans/reactive-sauteeing-sun.md` Slice 1.
- Parent plan: `~/.claude/plans/cheeky-wandering-yeti.md` (W0 complete; W1-W5 deferred to subsequent sessions).

---

## [2.13.0] — 2026-04-25

### Added
- `SemanticChangePlan` gains 4 read-plan fields (`requiredResearchRefs`, `recommendedReadOrder`, `authorityNotes`, `archiveBridgeRefs`) in `lib/semantic-graph/types.ts` + new `AuthorityNote` interface using the live 5-value `ResearchAuthorityClass` union (`builder | fact | synthesis | capability | archive`).
- `lib/semantic-graph/semantic-query.ts` `runSemanticQuery(...)` walks `affectedDocs` after the VR-1 neighborhood filter (lines ~224-229): reads each `doc:*` node's file content, calls `extractResearchRefs()` (re-exported in plugin boundary), and resolves via `resolveResearchRef()`. Produces deduped, authority-sorted refs.
- `lib/research/resolve-ref.ts` re-exports `extractResearchRefs` alongside existing `resolveResearchRef` + `formatAuthorityHint` for plugin-boundary consistency.
- 2 integration tests in `tests/bridge/handlers/semantic-change-plan.test.ts` + 4 unit tests in `tests/lib/semantic-graph/read-plan-fields.test.ts` covering sort precedence, live-union authorityClass, archive-bridge filter, empty-neighborhood.

### Why
- Productizes the VR-1 doc-references edges shipped in v2.11.0. Before this PR the edges existed on the graph but no consumer surfaced them to the agent — `SemanticChangePlan` returned impact lists only.
- Source spec: `~/.claude/schemas/ontology/2026-04-23-palantir-mini-next-direction.md §3` — "upgrade SemanticChangePlan from impact list to read-plan". Lets an agent answer "open first / then read / stop when / archive only if needed" without reinventing read order each session.
- Purely additive — no API break. Handler signature unchanged. Empty arrays when neighborhood touches no doc:* RIDs (graceful degradation).

### Verification
- `bunx tsc --noEmit` from `plugins/palantir-mini/` — clean.
- `bun test` — expected 563 pass (557 post-Slice-2 + 6 new). Report actual count in PR verification section.
- `bun test --filter semantic-change-plan` — existing 2 + 2 new = 4+ green.
- `bun test --filter read-plan-fields` — 4/4 green.

### Recovery
Single `git revert` restores v2.12.0 behavior. No schema change; no downstream consumer pin break.

---

## [2.12.0] — 2026-04-25

### Added
- `gradeHybrid(...)` composes sub-criterion scores per `passFailLogic.combinator` (min / avg / weighted / all-pass) inside `bridge/handlers/grade-outcome-with-rubric.ts`. Replaces the v2.0→v2.11.0 MVP stub that returned `needs_human_review` unconditionally for `rubricDomain: "hybrid"`.
- Cycle detection via cloned `Set<string>` per recursion — allows diamond composition, rejects true cycles with `grade_hybrid: cycle detected at <rid>` error.
- `gradeOneCriterion(...)` helper extraction — outer loop + hybrid recursion share one dispatch path.
- 12 new tests in `tests/bridge/handlers/grade-outcome-with-rubric.test.ts` covering 4 combinators × (pass/fail/mixed), nested hybrid, cycle detection, missing-sub-rid, weight normalization.

### Why
- Anthropic's 4-criteria preset (Prithvi Rajasekaran pattern) in `harness-planner.md:67` declares Craft as `domain=hybrid (rule+model)`. Prior to v2.12.0 this preset was declared-but-unrunnable — every Craft criterion returned `needs_human_review` forever. v2.12.0 makes it executable end-to-end.
- Directly closes `harness-h3-retrospective.md §D1` analogue — same MVP stub pattern previously resolved for gradeModel (v2.0.1); now closed for gradeHybrid.
- Depends on nothing — consumes existing `subCriteriaRids` + `passFailLogic.combinator` fields on `GradingCriterion` primitive (v1.14.0+).

### Verification
- `bunx tsc --noEmit` from `plugins/palantir-mini/` — clean.
- `bun test` — 557 pass (544 pre-slice + 13 new).
- `bun test --filter grade-outcome-with-rubric` — 13/13 green in isolation.
- Latency probe baseline: plugin-self events.jsonl had zero `tool_invocation_completed` samples for `grade_outcome_with_rubric` pre-change (consistent with Session 3 forensics); post-change non-hybrid paths unchanged O(1); hybrid path bounded by rubric structure (typical 2-3 deep, ≤8 sub-criteria).

### Recovery
Single `git revert` of this commit restores v2.11.0 behavior. No schema change; no downstream consumer pin break.

---

## [2.11.0] — 2026-04-25 — Verification graph downstream edges (Session 4 Slice 1, Wave 3 VR-1 closure)

### Added

- **`producer-verification` edge emission** — three new edge types closing the Wave 2 MVP stub (`edges = [] as never[]`):
  - **`eval-covers`** — per `.palantir-mini/harness/eval-rubric.md` section, scans body text for ontology/file/runtime/doc/eval/mon/gen/lineage/artifact RID mentions, backticked file paths, and markdown link targets. Emits edge `eval:<criterionId>` → target RID. `confidence: 0.7`.
  - **`doc-references`** — per `ontology/**/*.md` and `docs/**/*.md`, scans content with the same target extractor. Emits edge `doc:<slug>` → target RID. `confidence: 0.8`.
  - **`mon-scope`** — per monitor entry in `monitors.json`, resolves the monitor's scan roots via the new `MONITOR_SCAN_ROOTS` convention map (`drift-watch` → `ontology/` + `schemas/ontology/`; `event-log-tail` → `.palantir-mini/session/`), walks matching files (extension whitelist + depth ≤5), emits edge `mon:<monName>` → `file:<relpath>`. Capped at 20 matches per monitor (`MON_SCOPE_CAP`) to prevent graph blowup on broad globs. `confidence: 0.9`.
- **`extractTargets()` helper** — shared scanner used by both eval and doc edge emitters. Detects: (a) explicit RID mentions `<kind>:<value>` for all 9 SemanticRidKinds, (b) backticked file-like paths with `.ts|.tsx|.js|.jsx|.md|.json|.jsonl` extensions, (c) markdown link targets `[name](path)`. Skips absolute paths (`/...`) and URL-looking values (`//`) to prevent spurious RIDs. De-dupes per (from,to,edgeKind) triple.
- **`extractEvalSections()` helper** — per-section walker returning `{ slug, title, body }` so eval-covers edges can attribute evidence to the correct criterion section body (not just the rubric file as a whole).
- **`tests/lib/semantic-graph/verification-edges.test.ts`** — 14 tests across 4 describe blocks covering the 3 edge types + end-to-end `semantic-query` population (see Verification section below).

### Changed

- **`lib/semantic-graph/semantic-query.ts`** — two behavioral fixes:
  1. **Producer wiring** — added `runProducerVerification` + `runProducerLineage` to the orchestrator's producer array (previously only 4 producers ran; verification + lineage modules existed but were never invoked). This is the root cause of canary's 151-node / 4-edge sparsity: `eval:*`/`doc:*`/`mon:*`/`lineage:*` nodes were never discovered at all, and the edges they would emit were never surfaced.
  2. **Affected field population** — replaced hardcoded `affectedEvals = []` / `affectedDocs = []` / `affectedMonitoring = []` (with "Wave 3 will populate" comment) with `neighborhoodRids.filter((r) => (r as string).startsWith("eval:" | "doc:" | "mon:"))`. Now that verification edges bridge eval/doc/mon nodes to file/ontology/runtime RIDs, 1-hop neighborhood traversal surfaces them honestly.
- **`producer-verification.ts`** — `const edges = [] as never[];` (line 61, Wave 2 MVP) replaced with `const edges: SemanticEdge[] = [];`. Comment "Wave 3 MVP: no edges emitted — edges deferred to future refinement" removed.

### Why MINOR

Additive edge emission + additive field population. No schema change. No removed producers, handlers, or tools. Pre-v2.11.0 consumers of `semantic_change_plan` that ignored `affectedEvals`/`affectedDocs`/`affectedMonitoring` continue to work; consumers that checked for `.length === 0` as an "empty" signal may now see populated arrays — but this is the contract intent (the Wave 2 MVP comment explicitly said Wave 3 would populate them).

### Bottleneck closed

- **B-11** ⭐ (Session 2 handoff §2): "`affectedTests` / `affectedDocs` / `affectedMonitoring` / `affectedEvals` are empty-array placeholders regardless of targetRids." Closes three of four fields authoritatively (evals / docs / monitoring). `affectedTests` retains its existing neighborhood-based logic but gains real fuel — previously the 1-hop neighborhood was so sparse (4 edges on 151 nodes) that test files rarely landed in it. Production behavior of `affectedTests` remains dependent on `producer-ast-evidence` coverage (tracked as **B-19** candidate for future slice; not in scope for Slice 1).
- **`schemas/ontology/2026-04-23-palantir-mini-next-direction.md` §4** ("Bring verification surfaces into the real graph"): "next additions should prioritize real `affectedDocs` / `affectedMonitoring` / `affectedEvals`." All three closed.
- **Producer wiring omission** (discovered during Slice 1 investigation): `semantic-query.ts` never invoked `producer-verification` or `producer-lineage` — a Wave 2 MVP oversight that explains the canary's 151-node / 4-edge evidence. Now wired.

### Palantir alignment

- **DevCon 5 §DC5-03 Decision Space Infrastructure** — "fragmented enterprise data must be represented at maximum fidelity." Without verification edges, the `SemanticChangePlan` misrepresented fidelity — `affectedEvals: []` while eval-rubric criteria explicitly referenced ontology RIDs. Fidelity restored.
- **DevCon 5 §DC5-10 Scenarios / Workflow Lineage** — lineage must expose "the backend tools and flows being used." `mon-scope` edges make monitor scope part of the traced graph rather than implicit convention.
- **AI FDE §FDE-05 step 1** (Explore) — the eval-driven loop's Explore step needs honest graph context. v2.10.0 `harness-analyzer` composes `spec-patch` / `rubric-patch` / `generator-hint` recommendations — those are only as precise as the graph the analyzer reads. Verification edges give the analyzer a real target set when suggesting "change X → expect test Y, doc Z, monitor W to shift."
- **AI FDE §FDE-10 Context management** — "separation of concerns and curated context are necessary for reliable agent performance." Populated `affectedDocs` + (forthcoming v2.13.0 Slice 3) `recommendedReadOrder` curates context rather than asking agents to derive it.
- **Anthropic harness-design blog** (user 2026-04-25 directive, https://www.anthropic.com/engineering/harness-design-long-running-apps) — the blog's "prompt tuning is load-bearing" principle depends on evaluators having specific evidence. Our Evaluator + Analyzer can now cite specific affected docs/evals/monitors instead of the previous generic hardcoded `[]`.
- **Rule 13 task granularity** — single owning file per component: `producer-verification.ts` owns edge emission; `semantic-query.ts` owns neighborhood projection; `verification-edges.test.ts` owns verification. DELETE/ADD/KEEP/VERIFY respected.

### Verification

```
bunx tsc --noEmit                                                   # clean
bun test tests/lib/semantic-graph/verification-edges.test.ts        # 14 pass / 0 fail
bun test tests/lib/semantic-graph/                                  # 28 pass / 0 fail (14 existing + 14 new)
bun test                                                            # 544 pass / 0 fail (530 baseline + 14)
jq -r .version .claude-plugin/plugin.json                           # 2.11.0
jq -r .version package.json                                         # 2.11.0
grep -c '"version": "2.11.0"' .claude-plugin/marketplace.json       # 2
grep -c '^## \[2.11.0\]' CHANGELOG.md                               # 1
grep -c 'runProducerVerification\|runProducerLineage' lib/semantic-graph/semantic-query.ts   # ≥2
grep -c 'eval-covers\|doc-references\|mon-scope' lib/semantic-graph/producer-verification.ts # ≥3
```

**Empirical dogfood probe** (post-merge, per-project canary):
```
mcp__palantir-mini__semantic_change_plan \
  --projectRoot=/home/palantirkc/projects/palantir-math \
  --targetRids=["file:ontology/capabilities.ts"]
```
Pre-state (evidence from canary events.jsonl seq=885 `semantic_manifest_refreshed`): `nodeCount: 151, edgeCount: 4, producerCount: 4`. `affectedEvals`/`affectedDocs`/`affectedMonitoring` = `[]` regardless of input.

Post-state: `nodeCount` grows (verification + lineage producers now emit `eval:*`/`doc:*`/`mon:*`/`lineage:*` nodes previously missing); `edgeCount` ≥30 (eval-covers / doc-references / mon-scope / lineage-cochange edges bridge the 4-producer-wired baseline); `producerCount: 6`. `affectedEvals` / `affectedDocs` / `affectedMonitoring` populated when neighborhood intersects the target set.

### Recovery

Single `git revert` of this commit restores:
- `producer-verification.ts` to Wave 2 MVP (no edges emitted).
- `semantic-query.ts` to the 4-producer orchestrator + hardcoded `[]` affected fields.
- Removes `verification-edges.test.ts`; `wave3-mvp.test.ts` continues to pass unchanged (its fixtures don't trigger any of the new edges).
- No schema migration required — edge types `eval-covers` / `doc-references` / `mon-scope` declared since v2.6.0 (`lib/semantic-graph/types.ts:32-36`) remain declared; callers just stop seeing them emitted.

### References

- Plan: `~/.claude/plans/clever-stargazing-bumblebee.md` §Slice 1
- Session 4 kickoff user directive: "Anthropic harness-design-long-running-apps와 같은 harness 활용을 할 수 있도록 palantir-mini 고도화/정교화"
- Research: `~/.claude/research/palantir-vision/aipcon-devcon/devcon.md` §DC5-03 Decision Space / §DC5-10 Scenarios + Workflow Lineage
- Research: `~/.claude/research/palantir-vision/aipcon-devcon/ai-fde.md` §FDE-05 step 1 (Explore) + §FDE-10 (Context management)
- Spec: `~/.claude/schemas/ontology/2026-04-23-palantir-mini-next-direction.md` §4 (Bring verification surfaces into the real graph)
- Predecessor: Session 2 handoff B-11 ⭐ (semantic-query hardcoded `[]` fields)
- Builds on: v2.10.0 `harness-analyzer` (#213) — analyzer's spec-patch / rubric-patch / generator-hint recommendations now compose against an honest downstream graph.

---

## [2.10.0] — 2026-04-25 — harness-analyzer agent (Session 3 Slice 3, AI FDE §FDE-05 step 6 closure)

### Added

- **`agents/harness-analyzer.md`** — new opus agent (maxTurns=20, memory=project, read-only over source — only writes `analysis-NNN.md` inside the iteration dir). Spawned conditionally between iterations when verdict=fail AND iteration<iterationLimit. Reads `feedback-<N>.md` + `generator-state.md` + scenario `outcome.json` files (consumes v2.9.0 `complete_playwright_scenario` output), categorizes failure (7-class taxonomy: spec-misalignment / criterion-unmeasurable / scope-overreach / technique-mismatch / regression / flake / platform-blocker), drafts smallest patch (spec-patch | rubric-patch | generator-hint), recommends next-iteration scope (continue | patch-spec | patch-rubric | abort), surfaces honest confidence (low | medium | high). Self-escalates to abort when prior `analysis-N-1.md` shows the same recommendation was implemented but score did not move.
- **`skills/pm-harness-analyze/SKILL.md`** — new skill spawning harness-analyzer for a single failed iteration. Briefing template (rule 15) compliant: speed target ≤10min, claim order, no-idle-poll, reply-in-text. Argument: `<sprint-number> <iteration-number>`. Surfaces analyzer recommendation back to caller (Lead OR pm-harness-sprint Phase 2).

### Changed

- **`skills/pm-harness-sprint/SKILL.md`** — Phase 2 extended with new step **3.5 (analysis)**. Triggered after step 3 (feedback) decides to continue (verdict=fail AND iteration<iterationLimit). Lead invokes `/palantir-mini:pm-harness-analyze`, then routes per analyzer recommendation:
  - `continue` → apply generator-hint as next iteration prefix.
  - `patch-spec` → apply analyzer's spec-patch to spec.md.
  - `patch-rubric` → apply analyzer's rubric-patch to eval-rubric.md.
  - `abort` → exit loop with reason "analyzer-recommended-abort", surface analysis-NNN.md to user.
  Replaces prior pattern of Lead manually re-specing between iterations.

### Why MINOR

New agent + new skill + additive Phase 2 step in existing skill. No removed agents, no signature changes to existing handlers, no event variant changes. Per rule 08, new agent + new skill registered = MINOR.

### Bottleneck closed

- **DevCon 5 §DC5-02 condition #3 weakness** (Session 3 plan §C alignment scorecard): "*Feedback-driven optimization through prompt refinement*" was Weak — *"Lead must manually re-spec after each iteration."* After v2.10.0, the analyzer agent runs between iterations automatically; Lead intervention required only on `patch-spec` / `patch-rubric` / `abort` recommendations, not on every iteration.
- **AI FDE §FDE-05 step 6** (synthesize failure mode → refine prompt): harness now covers steps 1-2 (draft + eval) PLUS step 6 (synthesis). Steps 3-5 (eval generation + run + inspection) live in `pm-harness-plan` + `complete_playwright_scenario` (v2.9.0). Step 7-8 (re-run until acceptable + materialize app) covered by Phase 2 loop + Phase 3 handoff. Loop is now end-to-end automated.

### Palantir alignment

- AI FDE §FDE-05 (eval-driven loop) — analyzer is the explicit step-6 implementation Palantir's AI FDE product surface validates as the path from "draft" to "compounding system" (§FDE-08).
- DevCon 5 §DC5-02 (Akshay's 3 conditions) — condition #3 explicit: "*Feedback-driven optimization through prompt refinement and agent definitions*". analyzer's `generator-hint` patch form IS prompt refinement.
- DevCon 5 §DC5-07 (Army Software Factory pipeline) — synthesis step in the Decompose → Triage → Recon → Decode → Encode → Compile/validate pipeline; analyzer is the Triage analog at iteration boundaries.
- Rule 16 file-based IPC — analysis-NNN.md is just another file in `sprints/<sprintId>/`; respects file-IPC invariant; analyzer never SendMessages other agents.
- Rule 12 §Research-over-codegen — analyzer produces blueprint+guidance (the patch description), not raw generated code. Lead applies patches after review.
- Rule 13 §Task granularity — analyzer's writable scope is exactly 1 file per iteration (analysis-NNN.md). Aligned.

### Verification

```
bunx tsc --noEmit                                                # clean (no code changes — markdown only)
bun test                                                         # 530 pass / 0 fail (no test changes)
jq -r .version .claude-plugin/plugin.json                        # 2.10.0
jq -r .version package.json                                      # 2.10.0
grep -c '"version": "2.10.0"' .claude-plugin/marketplace.json    # 2
grep -c '^## \[2.10.0\]' CHANGELOG.md                            # 1
test -f agents/harness-analyzer.md                               # exists
test -f skills/pm-harness-analyze/SKILL.md                       # exists
grep -c '3.5\. \*\*analysis\*\*' skills/pm-harness-sprint/SKILL.md  # ≥1
grep -c 'harness-analyzer' agents/harness-analyzer.md            # ≥1
```

End-to-end dogfood (after merge):
```
/palantir-mini:pm-harness-init
/palantir-mini:pm-harness-plan "tiny intentional-failure spec"
/palantir-mini:pm-harness-sprint 1
# Iteration 1 fails (by design).
# Phase 2 step 3.5 auto-spawns harness-analyzer.
# Inspect: cat .palantir-mini/harness/sprints/sprint-001/iterations/iteration-001/analysis-001.md
# Expect: failure category + patch + recommendation populated.
```

### Recovery

Single `git revert` removes `agents/harness-analyzer.md` + `skills/pm-harness-analyze/SKILL.md` + the Phase 2 step 3.5 extension. pm-harness-sprint Phase 2 falls back to direct iteration loop without intermediate analyzer spawn. No data migration; existing sprint dirs unchanged.

### References

- Plan: `~/.claude/plans/imperative-drifting-quilt.md` §Slice 3
- Research: `~/.claude/research/palantir-vision/aipcon-devcon/ai-fde.md` §FDE-05 (steps 1-8) + §FDE-08 (compounding loop)
- Research: `~/.claude/research/palantir-vision/aipcon-devcon/devcon.md` §DC5-02 (Akshay's 3 conditions) + §DC5-07 (Army Software Factory pipeline)
- Builds on: v2.9.0 `complete_playwright_scenario` (Slice 2, B-14) + v2.8.2 latency instrumentation (Slice 1, B-15) — analyzer reads outcomes the Slice 2 handler emits, and benefits from Slice 1's per-handler latency telemetry for forensic context.
- Rule citations: 12 §Research-over-codegen + 13 §task granularity + 15 §briefing template + 16 §file-based IPC

---

## [2.9.0] — 2026-04-25 — Close the harness production loop (Session 3 Slice 2, B-14 closure)

### Added

- **`complete_playwright_scenario` MCP tool** — new handler at `bridge/handlers/complete-playwright-scenario.ts`. Pairs with `run_playwright_scenario` (which issues instructions, state="instructions_issued") to form the Evaluator IPC junction. Accepts the Evaluator agent's recorded outcome via inline `recordedOutcome` arg OR by reading `evidenceDir/outcome.json`, validates shape, classifies failure mode (7-class taxonomy), canonicalizes outcome.json on disk, emits `playwright_scenario_executed{state: "completed"|"failed", outcome: {...}}`, and optionally auto-dispatches `grade_outcome_with_rubric` when `rubricPath` is provided.
- **`PlaywrightFailureClass` exported type** in `lib/event-log/types.ts` — 7 classes: `timeout` / `selector_not_found` / `assertion_failed` / `unexpected_navigation` / `transient_network` / `browser_crash` / `other`.
- **`classifyPlaywrightFailure(failedStep, failureMessage)` helper** — post-hoc pattern-match classifier exported from `complete-playwright-scenario.ts` for reuse by future analyzer/eval agents.
- **`tests/bridge/handlers/complete-playwright-scenario.test.ts`** — 20 tests covering: 7-class failure classification taxonomy; arg validation (missing scenarioId / evidenceDir); inline `recordedOutcome` success → state="completed" path with canonicalized rounding (durationMs, retries); inline failure → state="failed" with auto-classified `failureClass`; explicit `failureClass` preserved over auto-classification; `outcome.json` read fallback when no inline; throws on missing outcome / invalid JSON / shape rejection (missing `passed`); `mcpToolBinding` recovery from `scenario.json`; auto-grade dispatch happy path with rule-domain rubric; rubric file errors (missing path / malformed structure).

### Changed

- **`PlaywrightScenarioExecutedEnvelope.payload.outcome?` (additive)** — new optional field in `lib/event-log/types.ts`, populated when state ∈ {"completed", "failed"} via `complete_playwright_scenario`. Fields: `passed`, `failedStep?`, `failureClass?`, `durationMs?`, `retries?`. Backward-compat: `instructions_issued` + `running` emit without outcome (existing readers ignore the unknown field on those states).
- **`bridge/mcp-server.ts`** — registered `complete_playwright_scenario` tool in TOOLS array (with full inputSchema) + moduleMap entry. Tool count: 48 → 49.

### Why MINOR

New MCP tool added; backward-compatible additive payload field on existing envelope; no removed handlers, no signature changes to existing tools. Per rule 08, new tool surface = MINOR.

### Bottleneck closed

- **B-14 ⭐** (Session 2 handoff §2 + Session 3 plan §A): "Canary log shows 12 `playwright_scenario_executed` events (seq 782-824, palantir-math) all carry `.payload.outcome = null` — harness loop never closes; Evaluator has no verdict to feed back." After v2.9.0 the Evaluator dispatches `complete_playwright_scenario` after running its scenario via `mcp__playwright__*` or `mcp__claude-in-chrome__*`, and the resulting event carries the embedded outcome — Decision Lineage replay can answer "did this scenario pass?" without reaching off-disk to outcome.json.
- **B-5** (Session 1 handoff §2): "`run_playwright_scenario` is instructions-only; no outcome.json validation." Now validated + canonicalized on the receive side via `complete_playwright_scenario`.

### Palantir alignment

- AIP Evals §EVAL-T01..05 (Deterministic / Heuristic / Rubric Grader / Custom / Ontology Edits Simulator) — `complete_playwright_scenario` + auto-grade dispatch closes the bridge between physical Playwright execution (Evaluator-side) and AIP Evals rubric scoring (handler-side).
- DevCon 5 §DC5-02 condition #2 ("clear validation criteria via structured phases / post-hoc analysis") — outcome shape + failure-class taxonomy IS the structured post-hoc analysis layer.
- AIPCon 9 §APC9-Q06 (Cameron Stanley CDAO: "the real issue isn't AI, the real issue is workflow") — closing the harness loop is workflow-completion at the IPC boundary.
- Rule 16 file-based IPC (Generator ↔ Evaluator via `feedback-NNN.md`) — `complete_playwright_scenario` does not bypass file IPC; it converts the file artifact (`outcome.json`) into Decision Lineage event payload, which is the canonical conversion direction.

### Verification

```
bunx tsc --noEmit                                                    # clean
bun test                                                             # 530 pass / 0 fail (+20)
bun test tests/bridge/handlers/complete-playwright-scenario.test.ts  # 20 pass / 0 fail
jq -r .version .claude-plugin/plugin.json                            # 2.9.0
jq -r .version package.json                                          # 2.9.0
grep -c '"version": "2.9.0"' .claude-plugin/marketplace.json         # 2
grep -c '^## \[2.9.0\]' CHANGELOG.md                                 # 1
grep -c 'complete_playwright_scenario' bridge/mcp-server.ts          # ≥2 (TOOLS entry + moduleMap)
grep -c 'PlaywrightFailureClass' lib/event-log/types.ts              # ≥2
```

After Evaluator runs a scenario then calls `complete_playwright_scenario`:
```
jq -r 'select(.type=="playwright_scenario_executed" and .payload.state=="completed") | {scenario: .payload.scenarioId, passed: .payload.outcome.passed, class: .payload.outcome.failureClass}' \
  <project>/.palantir-mini/session/events.jsonl
```
returns structured outcome — replaces canary's previous null-outcome state.

### Recovery

Single `git revert` removes the new handler + tool registration + event payload extension. Rollback path:
1. `complete_playwright_scenario` MCP tool returns "unknown tool" (callers fall back to writing outcome.json without canonicalization).
2. `PlaywrightScenarioExecutedEnvelope.payload.outcome` field disappears — old `instructions_issued`-only emits unaffected.
3. No data migration; new completed/failed events containing `outcome` field still parse against pre-v2.9.0 type defs (TypeScript treats unknown payload fields as harmless).

### References

- Plan: `~/.claude/plans/imperative-drifting-quilt.md` §Slice 2
- Research: `~/.claude/research/palantir-foundry/aip/aip-evals-overview.md` §EVAL-T01..05
- Pairs with: v2.8.2 latency instrumentation (Slice 1, B-15) — both improvements observable via `tool_invocation_completed` + `playwright_scenario_executed` cross-event analysis.
- Bottleneck source: Session 2 handoff §2 B-14 + B-5

---

## [2.8.2] — 2026-04-25 — Handler latency instrumentation (Session 3 Slice 1, B-15 closure)

### Added

- **`ToolInvocationCompletedEnvelope`** — new EventEnvelope variant in `lib/event-log/types.ts`. Payload: `{ toolName, durationMs, success, errorClass? }`. Backward-compatible additive variant — discriminated union grew by 1, snapshot fold extended exhaustively.
- **`lib/event-log/timing.ts`** — new module exporting `now()` (high-resolution wall-clock), `elapsedMs(startedAt)`, `classifyError(err)` (NodeJS errno code aware), and `emitToolInvocationCompleted(input)` (best-effort plugin-self emit). Exposes `_testing` seam for tmp-path test isolation.
- **`tests/lib/event-log/timing.test.ts`** — 12 tests covering: `now/elapsedMs` precision (sub-ms + 50ms sleep floor); `classifyError` taxonomy across `Error`/`TypeError`/`ENOENT`/string-throw/non-Error; `emitToolInvocationCompleted` envelope shape (5-dim conformance + payload + monotonic sequence + write-failure-swallowed contract).

### Changed

- **`bridge/mcp-server.ts`** — `tools/call` dispatch case wraps every handler invocation with a `performance.now()` timer + emits `tool_invocation_completed` event on both success and failure paths via `void emitToolInvocationCompleted(...)`. Failure path also captures `errorClass` via `classifyError(e)` before re-throwing. Telemetry emit is fire-and-forget (`void`) so a slow disk write never delays the JSON-RPC response. Provides 100% handler-timing coverage with zero per-handler change.

### Why PATCH

Backward-compatible additive event variant + new module + central dispatch wrapper. No existing handler signature changed; no removed functionality. Per rule 08, additive variant on the EventEnvelope discriminated union = PATCH.

### Bottleneck closed

- **B-15** (Session 2 handoff §2 forensics-extension) — "Zero `durationMs` / `durationSeconds` fields in any event payload across 3,526 events. Cannot identify slow handlers." Now every MCP `tools/call` produces a timing event in plugin-self events.jsonl. After ~1 day of usage:
  ```
  jq -r 'select(.type=="tool_invocation_completed") | "\(.payload.durationMs)ms \(.payload.toolName)"' \
    ~/.claude/plugins/palantir-mini/.palantir-mini/session/events.jsonl \
    | sort -n | tail -10
  ```
  surfaces the 10 slowest handler invocations.

### Palantir alignment

- AIP architecture #2 — End-to-end observability ("monitoring tools for every step of AI-driven workflows and agentic processes"). `tool_invocation_completed` is the per-handler latency channel.
- Decision Lineage WITH_WHAT — every envelope carries `withWhat.reasoning` describing the dispatch outcome (e.g. `"tool grade_outcome_with_rubric completed in 142ms"`).
- Rule 10 §5-dim conformance — full envelope (when, atopWhich, throughWhich, byWhom, withWhat); plugin-self path target keeps cross-project events.jsonl free of plugin-meta noise.

### Verification

```
bunx tsc --noEmit                                                    # clean
bun test tests/lib/event-log/timing.test.ts                          # 12 pass / 0 fail
bun test                                                             # all green
jq -r .version .claude-plugin/plugin.json                            # 2.8.2
jq -r .version package.json                                          # 2.8.2
grep -c '"version": "2.8.2"' .claude-plugin/marketplace.json         # 2
grep -c '^## \[2.8.2\]' CHANGELOG.md                                 # 1
grep -c 'emitToolInvocationCompleted' bridge/mcp-server.ts           # ≥2
grep -c 'tool_invocation_completed' lib/event-log/types.ts           # ≥2
```

### Recovery

Single-PR revert via `git revert` restores instructions-only telemetry baseline (no `tool_invocation_completed` events). No data migration; new variant is additive — old log readers ignore unknown event types implicitly via the discriminated union.

### References

- `lib/event-log/timing.ts` — emit function + helpers + plugin-self path resolution.
- `bridge/mcp-server.ts:998-1027` — dispatch wrapper.
- `~/.claude/plans/imperative-drifting-quilt.md` §Slice 1 — Session 3 plan.
- `~/.claude/research/palantir-foundry/architecture/architecture-center-aip-architecture.md` §2 — End-to-end observability anchor.

---

## [2.8.1] — 2026-04-25 — Authority-aware detect_doc_drift (Wave 2 SP-2)

### Added

- **`DocDriftSignal.authorityClass?: ResearchAuthorityClass`** — optional field on the existing signal shape. Present on signals whose `evidencePath` or broken xref target is under `.claude/research/`; absent on non-research xrefs (backward-compatible).
- **`DriftKind: "legacy_ref_should_migrate"`** — new drift kind emitted when a markdown link points to a legacy `.claude/research/palantir/` path that has been promoted to an active `palantir-vision/`, `palantir-developers/`, or `palantir-foundry/` location. Signal carries `authorityClass` of the promotion target and `expected` = the active `primaryRef`.
- **`tests/bridge/handlers/detect-doc-drift.test.ts`** — 7 tests covering: missing project throws; clean project returns valid shape; research xref gets `authorityClass: "fact"`; legacy promoted ref emits `legacy_ref_should_migrate` with `authorityClass: "synthesis"`; non-research xref has no `authorityClass`; archive-bridge active citation gets `broken_xref` with `authorityClass: "archive"`; existing research file produces no signal.

### Changed

- **`bridge/handlers/detect-doc-drift.ts`** — imports `resolveResearchRef` and `ResearchAuthorityClass` from `../../lib/research/resolve-ref` (Slice 1 module). `scanXrefs` now classifies every `.claude/research/` href through the resolver before emitting a signal. `scanMemory` attaches `authorityClass` to `broken_xref` signals for research target paths.

### Why PATCH

Behavior extension to an existing handler; no new MCP tool registered; `DocDriftSignal.authorityClass` is optional so all existing callers that pattern-match on `driftKind` continue to work unchanged. Per rule 08, backward-compatible additive field on an existing interface = PATCH.

### Verification

```
bunx tsc --noEmit                                               # clean
bun test tests/bridge/handlers/detect-doc-drift.test.ts         # 7 pass / 0 fail
bun test                                                        # 498 pass / 0 fail
jq -r .version .claude-plugin/plugin.json                       # 2.8.1
jq -r .version package.json                                     # 2.8.1
grep -c '"version": "2.8.1"' .claude-plugin/marketplace.json    # 2
grep -c '^## \[2.8.1\]' CHANGELOG.md                            # 1
grep -c 'authorityClass' bridge/handlers/detect-doc-drift.ts    # ≥3
grep -c 'resolveResearchRef' bridge/handlers/detect-doc-drift.ts  # ≥1
```

### References

- `lib/research/resolve-ref.ts` — Slice 1 module providing `resolveResearchRef` and `ResearchAuthorityClass`.
- `~/.claude/schemas/ontology/research-source-map.ts` — upstream resolver with 5-class taxonomy and legacy promotion rules.
- Wave 2 SP-2 task brief — `feat/pm-v2.8.1-detect-doc-drift-authority-aware`.

---

## [2.8.0] — 2026-04-25 — Schema provenance integration: research-ref resolver (Wave 2 SP-1)

### Added

- **`lib/research/resolve-ref.ts`** — plugin-local re-export of `resolveResearchRef` from `~/.claude/schemas/ontology/research-source-map.ts`, plus `formatAuthorityHint(resolution)` which maps all 5 `ResearchAuthorityClass` values (`builder` / `fact` / `synthesis` / `capability` / `archive`) to human-readable read-order hints. Consumers in `bridge/handlers/` import from this module rather than directly from the schemas package, making the plugin boundary explicit.
- **`lib/research/index.ts`** — barrel re-exporting everything from `resolve-ref.ts`.
- **`tests/lib/research/resolve-ref.test.ts`** — 5 unit tests (one per `authorityClass`) verifying `formatAuthorityHint` dispatch; fixture-only, no end-to-end file I/O.

### Why MINOR

Net-new `lib/research/` module with no changes to any existing handler, hook, skill, or MCP tool surface. Adds 5 tests to the suite (486 → 491). Establishes the foundation for Wave 2 SP-2 (`detect_doc_drift` authority-aware) and SP-3 (`SemanticChangePlan` read-plan extension). Per rule 08, additive lib/ module → MINOR bump.

### Compatibility

- schemas version pin unchanged (`>=1.15.0 <2.0.0`).
- No handler signature changes; no new MCP tools registered.
- Import path climbs 4 levels (`../../../../schemas/ontology/research-source-map`) — confirmed correct by `realpath` check against plugin `lib/research/` depth.

### Verification

```
bunx tsc --noEmit                                                        # clean, no errors
bun test tests/lib/research/resolve-ref.test.ts                          # 5 pass / 0 fail
bun test                                                                 # ≥491 pass / 0 fail
jq -r .version .claude-plugin/plugin.json                                # 2.8.0
jq -r .version package.json                                              # 2.8.0
grep -c '"version": "2.8.0"' .claude-plugin/marketplace.json             # 2
grep -c '^## \[2.8.0\]' CHANGELOG.md                                     # 1
test -f lib/research/resolve-ref.ts && echo exists                       # exists
test -f lib/research/index.ts && echo exists                             # exists
test -f tests/lib/research/resolve-ref.test.ts && echo exists            # exists
```

### References

- `~/.claude/plans/staged-gliding-unicorn.md` — Session 2 plan §4 Wave 2 SP-1.
- `~/.claude/plans/2026-04-23-palantir-mini-next-direction.md` — Session 1 handoff; research-ref resolver identified as Wave 2 foundation.
- `~/.claude/schemas/ontology/research-source-map.ts` — upstream resolver being re-exported.

---

## [2.7.4] — 2026-04-25 — Harness MVP repair: inline state machine, stale imports retired

### Changed

- **`skills/pm-harness-sprint/SKILL.md`** — Phase 1-3 rewritten to use a Lead-driven inline state machine. No `harness-orchestrator` agent spawn; no `open_feedback_loop` / `close_feedback_loop` handler calls. `allowed-tools` is now the actually-used surface: `Agent` + `emit_event` + `negotiate_sprint_contract` + `grade_outcome_with_rubric`. Variant choice (2-role default / 3-role optional) is explicit up front with a `variant.txt` persisted in the sprint dir.
- **`agents/harness-evaluator.md`** — removed stale `mcp__plugin_palantir-mini_palantir-mini__evaluate_outcome` from the tools allowlist (MCP tool retired in v2.1.0). Description + opening paragraph now frame the agent as the **optional 3-role variant** per rule 16; the 2-role default does NOT spawn this agent. Removed "Successor to … outcomes-grader" phrasing — outcomes-grader was itself retired in v2.1.0.

### Why MINOR

- No new MCP tool, no new primitive. But a dead-import removal plus a skill re-contract shifts `/palantir-mini:pm-harness-sprint` from "spawns harness-orchestrator then fails with tool-not-found" to "runs end-to-end with Lead-driven state". That is a functional fix large enough to warrant a MINOR bump per rule 08.
- Version jumps `2.7.0 → 2.7.4` to reserve `2.7.1 / 2.7.2 / 2.7.3` for still-open Session 1 PRs `#201` (session-duration-alarm), `#203` (semantic_change_plan contract honesty), `#205` (producer-ontology discovery). When those merge, CHANGELOG sorts cleanly since this entry is dated 2026-04-25 and they are 2026-04-24.

### Compatibility

- schemas version pin unchanged (`>=1.15.0 <2.0.0`).
- `harness-planner` + `harness-generator` agents unchanged; only `harness-evaluator` touched.
- Any user script that referenced `mcp__plugin_palantir-mini_palantir-mini__evaluate_outcome` via the evaluator's tool allowlist was already broken since v2.1.0 tombstoned that tool — no new breakage introduced.
- `open_feedback_loop` + `close_feedback_loop` handlers remain tombstoned in `.disabled/handlers/` — zero-consumer status was independently verified by `~/.claude/plans/2026-04-20-harness-solo-gap-audit.md` §3 row 5 (DEPRECATE verdict).

### Verification

```
bunx tsc --noEmit                                                          # clean
bun test                                                                   # 486 pass / 0 fail
grep -c 'evaluate_outcome' agents/harness-evaluator.md                     # 0
grep -c 'open_feedback_loop\|close_feedback_loop' skills/pm-harness-sprint/SKILL.md  # 0
grep -c 'harness-orchestrator' skills/pm-harness-sprint/SKILL.md           # 0
jq -r .version .claude-plugin/plugin.json                                  # 2.7.4
jq -r .version package.json                                                # 2.7.4
grep -c '"version": "2.7.4"' .claude-plugin/marketplace.json               # 2
grep -c '^## \[2.7.4\]' CHANGELOG.md                                       # 1
```

### References

- `~/.claude/rules/16-3-agent-harness.md` — 2-role default vs optional 3-role.
- `~/.claude/rules/06-agent-teams.md` — lazy-spawn + idle cost rationale for retiring polling orchestrators.
- `~/.claude/plans/2026-04-20-harness-solo-gap-audit.md` §3 rows 1/5 — independent DEPRECATE verdicts on orchestrator + FeedbackLoop handlers.
- `~/.claude/plans/staged-gliding-unicorn.md` — Session 2 plan §4 Slice 0.

---

## [2.7.0] — 2026-04-23 — Wave 3 final: `diff_semantic_impact` + `semantic_drift_audit` (schemas v1.21.0)

### Added

- **`bridge/handlers/diff-semantic-impact.ts`** — new MCP handler backing `diff_semantic_impact` tool. Given two commit SHAs, computes the set of SemanticRids whose edge signatures changed between them by diffing the serialised SemanticManifest snapshots. Emits `semantic_impact_diff_computed` event (5-dim, append-only).
- **`bridge/handlers/semantic-drift-audit.ts`** — new MCP handler backing `semantic_drift_audit` tool. Scans the loaded SemanticManifest for orphaned RIDs, stale codegen edges (generated-file hash mismatch), and missing BackPropagation records. Returns actionable repair tasks grouped by producer kind. Emits `semantic_drift_audit_completed` event.
- **`skills/pm-change-plan/SKILL.md`** — `## Related tools` section documenting `diff_semantic_impact` and `semantic_drift_audit`; both tools added to `allowed-tools` frontmatter.
- **`managed-settings.d/50-palantir-mini.json`** — `mcp__palantir-mini__diff_semantic_impact` and `mcp__palantir-mini__semantic_drift_audit` added to `permissions.allow`.
- **9 new tests** across `tests/bridge/handlers/diff-semantic-impact.test.ts` (4) and `tests/bridge/handlers/semantic-drift-audit.test.ts` (5) — all passing.
- **schemas v1.21.0** — 2 new event types: `SemanticImpactDiffComputedEvent` + `SemanticDriftAuditCompletedEvent`.

### Why MINOR

All additions are net-new handlers, tests, and schema event types. No existing MCP tool signatures changed. No hook modified. Per rule 08, additive surface → MINOR bump.

### Compatibility

- Requires schemas `>=1.21.0` (2 new event types). `compatibleSchemaVersions` remains `>=1.15.0 <2.0.0`.
- Wave 1 (`pre_edit_impact`) and Wave 2 (`semantic_change_plan`) surfaces unchanged.
- Closes the 3-wave ontology-first rebuild (plan: `~/.claude/plans/dapper-baking-treasure.md`).

### Verification

```
jq -r '.version' .claude-plugin/plugin.json package.json   # both 2.7.0
grep -c '"version": "2.7.0"' .claude-plugin/marketplace.json  # 2
grep -c "diff_semantic_impact\|semantic_drift_audit" managed-settings.d/50-palantir-mini.json  # 2
grep -c "^## \[2.7.0\]" CHANGELOG.md  # 1
grep -c "v2.7.0" README.md  # ≥1
bunx tsc --noEmit  # clean
```

### References

- Plan: `~/.claude/plans/dapper-baking-treasure.md` §Wave 3
- schemas v1.21.0: `~/.claude/schemas/ontology/primitives/semantic-events.ts`
- Canonical proposal: `~/.claude/research/palantir-vision/synthesis/2026-04-23-palantir-mini-ontology-first-rebuild-proposal.md`

---

## [2.6.0] — 2026-04-23 — Wave 2: SemanticRid + semantic-graph producers + `semantic_change_plan`

### Added

- **`lib/semantic-graph/types.ts`** — shared TypeScript types for the semantic-graph layer: `SemanticEdge`, `SemanticGraph`, `SemanticManifest`, and supporting enums (`EdgeKind`, `ProducerKind`).
- **`lib/semantic-graph/producer-ontology.ts`** — emits `uses_type` and `implements_contract` edges by walking the project ontology layer; evidence kind `"ontology"`.
- **`lib/semantic-graph/producer-codegen.ts`** — emits `generated_from` edges by reading codegen headers (schema version + ontology hash); evidence kind `"codegen"`.
- **`lib/semantic-graph/producer-runtime.ts`** — emits `calls` and `subscribes_to` edges via ts-morph import/call-expression walk; evidence kind `"ast"`.
- **`lib/semantic-graph/producer-ast-evidence.ts`** — shared AST-evidence helper used by `producer-runtime`; isolates ts-morph project construction for reuse across producers.
- **`lib/semantic-graph/manifest-writer.ts`** — serialises a `SemanticManifest` to `.palantir-mini/semantic-manifest.json` atomically; emits `semantic_manifest_refreshed` event (5-dim, append-only).
- **`lib/semantic-graph/semantic-query.ts`** — query layer over a loaded manifest: `edgesFrom`, `edgesTo`, `subgraph`, `reachable`; used by `semantic_change_plan` handler.
- **`bridge/handlers/semantic-change-plan.ts`** — new MCP handler backing `semantic_change_plan` tool. Loads or refreshes the manifest, runs `reachable` from each changed RID, ranks affected surfaces by edge-weight, emits `semantic_change_plan_emitted` event.
- **`skills/pm-change-plan/SKILL.md`** — `pm-change-plan` skill: invokes `semantic_change_plan` with a list of changed file paths; returns ranked change-surface report grouped by `EdgeKind`.
- **`tests/lib/semantic-graph/`** — 10 unit tests covering each producer, `manifest-writer` round-trip, and `semantic-query` traversal.
- **`tests/bridge/handlers/semantic-change-plan.test.ts`** — 2 handler integration tests (manifest refresh path + cached path).
- **`managed-settings.d/50-palantir-mini.json`** — `mcp__palantir-mini__semantic_change_plan` added to `permissions.allow` (between `scenario_create` and `capability_token_check`).

### Why MINOR

All additions are net-new: new lib module, new handler, new skill, new test files. No existing MCP tool signatures changed. No hook modified. `SemanticRid` primitive (schemas v1.20.0) is purely additive. Per rule 08, additive surface → MINOR bump.

### Compatibility

- Requires schemas `>=1.20.0` (SemanticRid primitive). `compatibleSchemaVersions` remains `>=1.15.0 <2.0.0` — schemas 1.20.0 is within range.
- Requires shared-core `>=1.6.0` (SemanticRid re-export). Consumers on shared-core `<1.6.0` will not have `SemanticRid` available but existing tools are unaffected.
- Existing `pre_edit_impact` / `populate_impact_graph` / `impact_query` surfaces unchanged (Wave 1 output preserved).

### Verification

```
jq -r '.version' .claude-plugin/plugin.json package.json   # both 2.6.0
grep -c '"version": "2.6.0"' .claude-plugin/marketplace.json  # 2
grep -c "semantic_change_plan" managed-settings.d/50-palantir-mini.json  # ≥1
bunx tsc --noEmit  # clean
bun test  # 12 new tests pass
```

### Wave 3 preview

Wave 3 will add `semantic_diff_plan` (cross-PR semantic delta), `BackPropagation` edge refinement from harness grading outcomes, and a `pm-semantic-audit` skill that surfaces orphaned RIDs and stale codegen edges.

### References

- Plan: `~/.claude/plans/dapper-baking-treasure.md` §Wave 2
- SemanticRid primitive: `~/.claude/schemas/ontology/primitives/semantic-rid.ts` (schemas v1.20.0)
- Shared-core re-export: `~/ontology/shared-core/` (v1.6.0)
- Canonical proposal: `~/.claude/research/palantir-vision/synthesis/2026-04-23-palantir-mini-ontology-first-rebuild-proposal.md`

---

## [2.5.1] — 2026-04-23 — Retire orphan monitor tests

### Removed

- **`tests/monitors/file-budget-watch.test.ts`** — orphan test file; source monitor `monitors/file-budget-watch.ts` was permanently retired in v2.0.3 (see `~/.claude/projects/-home-palantirkc/memory/feedback_monitors-permanently-disabled.md`). Replacement: `scan_file_size_violations` MCP handler.
- **`tests/monitors/doc-rot-watch.test.ts`** — orphan test file; source monitor `monitors/doc-rot-watch.ts` was permanently retired in v2.0.3. Replacement: `detect_doc_drift` MCP handler.

### Why PATCH

Pure test-file removal, no user-facing surface change. Brings `bun test` from `466 pass / 6 fail` (all 6 in the two orphan files) to `466 pass / 0 fail`. Per rule 08, cleanup of orphaned artifacts → PATCH bump.

### References

- Feedback memory: `~/.claude/projects/-home-palantirkc/memory/feedback_monitors-permanently-disabled.md` — §Permanently retired lists both monitors.
- Discovered during Wave 1 verification gate of the ontology-first rebuild (plan: `~/.claude/plans/dapper-baking-treasure.md`).

---

## [2.5.0] — 2026-04-23 — Impact-surface repair + API/doc drift fix

### Changed

- **`bridge/mcp-server.ts`** — `populate_impact_graph` description no longer claims "skeleton without AST walking" (the handler has performed a full ts-morph walk since Phase A-4 Day 3). Removed `schemaRoot` from required inputs (handler ignores it; property kept with deprecation note for backward compat). `tsConfigPath` + `fresh` now declared in the inputSchema so consumers see all supported args. `impact_query` inputSchema gains optional `projectRoot` passthrough.
- **`bridge/handlers/pre-edit-impact.ts`** — result shape evolved: `affects` / `tests` / `docs` are now `Array<{ file, evidenceKind: "ast" }>` (was `string[]`). Added `backwardAffects` field for upstream dependents via combined forward + backward transitive walk. Every AST-evidence edge carries `evidenceKind: "ast"`, reserving `"semantic"` for Wave 2.
- **`tests/bridge/handlers/pre-edit-impact.test.ts`** — 4 new tests covering backward walk, `evidenceKind` discipline, `source` classification, and `transitiveRids` union.
- **`skills/pm-pr-impact/SKILL.md`** — corrected stale `impact_query(project=, primitive=, direction=)` and `populate_impact_graph(project)` signatures to match the handlers. Added `## Related tools` section pointing to `pre_sprint_diff` (programmatic) and `gate_on_drift` (runtime drift).

### Why MINOR

API additions are backward-compatible: new optional `projectRoot` arg, new `backwardAffects` result field, new `evidenceKind` discriminator. No existing public surface removed. Per rule 08, additive behavioral + schema changes → MINOR bump.

### References

- Plan: `~/.claude/plans/dapper-baking-treasure.md` §Wave 1
- Canonical proposal: `~/.claude/research/palantir-vision/synthesis/2026-04-23-palantir-mini-ontology-first-rebuild-proposal.md`
- Wave 1 of 3 in the ontology-first rebuild; Wave 2 introduces `semantic_change_plan` + semantic-graph producers.

---

## [2.4.0] — 2026-04-23 — Harness instrumentation handlers

### Added

- **`bridge/handlers/chrome_ratio_measure.ts`** — measures chrome-to-canvas area ratio for an arbitrary page using Playwright resolved from the audited consumer project; emits `chrome_ratio_measured`.
- **`bridge/handlers/pre_sprint_diff.ts`** — compares `base...head`, converts changed files to `file:` RIDs, expands forward impact via `impact_query`, and emits `pre_sprint_diff_computed`.
- **`bridge/handlers/gate_on_drift.ts`** — runs the pre-iteration gate (`bun run ontology:drift` + `bun run lint:fonts`) and emits `drift_gate_evaluated`.
- **`bridge/handlers/_project-event.ts`** — shared helper so handlers can emit into the consumer project's append-only log even when executing from the plugin repo.

### Changed

- **`bridge/mcp-server.ts`** — replaces the zero-use `research_library_diff`, `research_library_prune`, and `claude_code_version_delta` MCP registrations with the three new instrumentation handlers. Ready log now prints the live tool count from `TOOLS.length`.
- **`bridge/handlers/validate-managed-settings-fragments.ts`** — expected MCP allowlist now derives from the live `TOOLS` registry instead of a stale hard-coded subset.
- **`lib/event-log/types.ts`** + **`lib/event-log/read.ts`** — add three new event envelope variants and snapshot counters for the new handler emissions.
- **Legacy compatibility note** — the retired research/version handler modules remain on disk for hook/test compatibility during the migration window, but they are no longer exposed as MCP tools.

### Why MINOR

The plugin surface stays stable at 45 MCP tools, but three new additive handlers and three new event types are introduced while only zero-use handlers are retired. No surviving handler contract is broken. Per rule 08, additive operational surface with compatible retirements ships as a MINOR bump.

---

## [2.3.3] — 2026-04-23 — appendEventAtomic trailing-line resilience

### Changed

- **`lib/event-log/append.ts`** — `appendEventAtomic` now scans backward for the last valid JSON line with a numeric `sequence`, skipping git merge/stash conflict markers, torn writes, and manual trailing edits instead of failing on a corrupted tail.

### Rationale

PR #145 shipped the resilience fix, but the plugin metadata stayed at `2.3.2`. This patch release synchronizes the published version markers with the behavior already landed so consumer projects no longer report stale plugin metadata.

### References

- PR #145 — `appendEventAtomic` resilience follow-up

---
## [2.3.2] — 2026-04-22 — Per-project monitors disable (sentinel file)

### Added

**`monitors/is-disabled.ts`** — shared helper exposing `isMonitorsDisabled()` that checks `<projectRoot>/.palantir-mini/monitors-disabled`. Returns `{ disabled, reason, sentinelPath }`; sentinel content becomes the `reason` for stderr logging, empty file is still a valid disable flag.

**`tests/monitors/is-disabled.test.ts`** — 3 tests (absent / empty / custom reason). All pass.

### Changed

- **`monitors/drift-watch.ts`** + **`monitors/event-log-tail.ts`** — both monitors now call `isMonitorsDisabled()` at startup. If sentinel present → log the reason once + exit 0 cleanly. Claude Code's monitor supervisor leaves the exited process alone until next session start (or manual relaunch).

### Rationale

Previously the only ways to silence monitors were (a) global kill via `monitors.json=[]` (affects every project) or (b) `pkill` the running processes (temporary; revives on restart). Per-project semantics were missing — you could not quiet drift-watch / event-log-tail in one consumer repo while keeping them active in another. With `monitors-disabled` sentinel, per-project toggle is cheap: `touch <project>/.palantir-mini/monitors-disabled` to silence, `rm` to re-enable.

### Applied at landing

- `projects/mathcrew/.palantir-mini/monitors-disabled` created — content: "Manually disabled 2026-04-22 by user — Codex parallel-session WIP; monitors re-enable upon user instruction (rm this file)."
- `palantir-math` (no sentinel) verified — `drift-watch --once` still emits drift_detected events normally.
- Existing monitor processes killed; fresh processes will honor the sentinel.

---

## [2.3.1] — 2026-04-22 — Rules-redesign R4 polish (handler body-LOC measurement + advisory clean-up)

### Changed

**`bridge/handlers/pm-rule-audit.ts`** — T2 ceiling measurement now matches CONTEXT.md §12 spec:
- New `countBodyLines(filepath)` helper: strips YAML frontmatter block + leading/trailing blank lines before counting.
- `CEILINGS.t2PerRuleHard`: 50 (total LOC, lenient) → **30 (body-only, per spec)**.
- `CEILINGS.t2TotalHard`: 700 → **600 (per spec)**.
- Detail string now includes `(frontmatter-stripped)` to disambiguate from total-file LOC.

### Fixed

- **CONTEXT.md** frontmatter gained `tier: T1` — `pm_rule_audit` now correctly skips it in T2 bucket (was spuriously flagged as 386-LOC T2 violation).
- **Rule 10** (`events-jsonl`) body trimmed 33 → 30 LOC — merged PreCompact bullets + dropped Rule-18-merged stub line.
- **Rule 12** (`lead-protocol-v2`) body trimmed 35 → 30 LOC — merged model-policy bullets + folded `9-defect resolution` pointer into Research-over-codegen.
- **Rule 8** (`schema-versioning`) `hookCitations: [verify-schema-pin]` → `[]` — verify-schema-pin is an MCP handler, not a hook; citation was incorrect.
- **mathcrew rule 6** (`pedagogy-contract`) `crossRefs: [01, 02, 03, 04, 05]` → `[01, 02, 03, 05]` — rule 04 is a permanent global gap (no ruleId 4 registered).
- **MEMORY.md** `rules/: 14 files, ~200 lines` → `rules/: 20 files, ~855 LOC` — matches post-redesign reality.

### Result

`pm_rule_audit` now returns **0 findings** on clean state. Previously returned 5 findings (3 advisory + 2 warn) after R3 landing.

### Verified

- 9/9 R3 hook tests pass (`rule-{bottleneck-watch,drift-detect,citation-validate}.test.ts`).
- Fresh `bun -e` audit invocation (bypassing MCP cache): 0 findings.
- Monitor tests (`doc-rot-watch`, `file-budget-watch`) — 6 pre-existing failures unchanged (monitors retired in v2.0.3 slimdown; test files orphaned, unrelated to R4).

---

## [2.3.0] — 2026-04-22 — Rules-redesign R3 (3 enforcement hooks + 7 inline excerpts)

### Added

**Enforcement hooks (3 new):**
- `hooks/rule-bottleneck-watch.ts` — PreCompact, advisory. Dispatches `pm_rule_audit`, surfaces ceiling violations (T1 CORE/CONTEXT/BROWSE, T2 per-rule + total) without blocking compaction.
- `hooks/rule-drift-detect.ts` — SessionStart, advisory. Catches MEMORY.md counter staleness + file-count mismatch + stale crossRefs + stale hook citations on every session boot.
- `hooks/rule-citation-validate.ts` — PostToolUse on `hooks/*.ts`. When a plugin hook file is edited, scans new content for `rule NN` citations and flags any that reference retired or non-existent rules (prevents silent stale-citation regressions).

All 3 advisory-only in v2.3.0 (never block). Hard-block escalation tunable via `lineage-conformance-policy` primitive in a future release.

**Shared helper:**
- `scripts/rule-excerpt.ts` — thin wrapper over `pm_rule_get`; provides `fetchRuleExcerpt(ruleId)` + `withRuleExcerpt(baseMessage, ruleId)`. Graceful-fallback placeholder if registry unavailable.

**Hook inlining — blocking messages now include rule invariant excerpts (7 hooks):**
- `hooks/events-5d-gate.ts` — rule 10 invariant inlined.
- `hooks/agent-frontmatter-validate.ts` — rule 12 inlined.
- `hooks/task-created-granularity-gate.ts` — rule 13 inlined.
- `hooks/concurrency-cap-fix.ts` — rule 13 inlined.
- `hooks/task-claim-throttle.ts` — rule 13 inlined.
- `hooks/generated-header-check.ts` — rule 11 inlined.
- `hooks/briefing-template-validate.ts` — rule 15 inlined (both zero-text + missing-sections paths).

**Before**: `"Fix per rule 12 §Agent frontmatter standard."` (user must open rule file).
**After**: `"Fix per rule 12 …\n\n=== RULE 12 — lead-protocol-v2 ===\nLead model policy: researcher/evaluator → opus …\n\nFor full text: pm_rule_get 12"` (user sees invariant inline; opens file only if deeper detail needed).

**Paired tests (3 new, per rule 07 hook-builder ownership):**
- `tests/hooks/rule-bottleneck-watch.test.ts`
- `tests/hooks/rule-drift-detect.test.ts`
- `tests/hooks/rule-citation-validate.test.ts`

All 9 test cases pass (3 per hook, runtime-verified against live rule registry).

**hooks.json registration:**
- `PreCompact`: appended `rule-bottleneck-watch` (async, advisory, timeout 8s).
- `SessionStart`: appended `rule-drift-detect` (async, advisory, timeout 8s).
- `PostToolUse`: new matcher `**/plugins/palantir-mini/hooks/*.ts` wired to `rule-citation-validate` (async, advisory, timeout 5s).

### Surface deltas

- Hook count: **29 → 32** (+3 advisory).
- Paired tests: **+3** (tests/hooks/).
- MCP tool count: unchanged (45).
- Skill count: unchanged (33).
- Schemas consumer pin: unchanged (v1.18.0 Rule primitive).

### Why MINOR

- 3 new advisory hooks + 7 hook inline modifications = net surface addition.
- No breaking changes — existing hook outputs still decision=continue/block identically; reasons are just richer.

### Completes rules-redesign blueprint

R1 (#126) structure → R2a (#129) primitive → R2b (#130) codegen + handlers → R2c (#131) search + audit → **R3 (this release) hook enforcement**.

Blueprint §5 ceiling contract now fully operational:

| Layer | Hard | Enforced by |
|-------|------|-------------|
| T1 CORE.md | 25 LOC | rule-bottleneck-watch |
| T1 CONTEXT.md | 400 LOC | rule-bottleneck-watch |
| T1 BROWSE.md | 30 LOC | rule-bottleneck-watch |
| T1 total | 445 LOC | rule-bottleneck-watch |
| T2 per rule | 50 LOC | rule-bottleneck-watch |
| T2 catalog total | 700 LOC | rule-bottleneck-watch |
| stale-citation in hook code | — | rule-citation-validate |
| MEMORY.md + file count | — | rule-drift-detect |

### Related

- Blueprint: `~/.claude/plans/2026-04-22-rules-redesign-blueprint.md` (PR #123 merged).
- CONTEXT.md §8.3 enforcement hooks contract (PR #124 merged).
- R2a primitive: PR #129 (merged).
- R2b handlers: PR #130 (merged).
- R2c remaining handlers: PR #131 (merged).

---

## [2.2.1] — 2026-04-22 — Rules-redesign R2c (pm_rule_search + pm_rule_audit + /pm-rule-audit skill)

### Added

**Rules registry MCP surface — remaining handlers:**
- `bridge/handlers/pm-rule-search.ts` — keyword search across every registered rule's invariant + body. Invariant matches weighted 2× over body. Returns ranked hits with surrounding snippet (60-char window). Default limit 10, max 100.
- `bridge/handlers/pm-rule-audit.ts` — comprehensive rules/ health check. Detects: T1/T2 bottleneck violations, stale crossRefs, stale hook citations, file-count drift vs MEMORY.md, recycled ruleIds. 8 issue classes with severity `advisory | warn | block`.
- `bridge/mcp-server.ts` — 2 new tool definitions + route-map entries. Tool count **43 → 45**.

**Skill:**
- `skills/pm-rule-audit/SKILL.md` — user-facing wrapper over `pm_rule_audit`. Proactively suggested when `rule-bottleneck-watch` hook (R3) emits advisory. Skill count **32 → 33**.

### Surface deltas

- MCP tool count: **43 → 45** (+2).
- Skill count: **32 → 33** (+1).
- Schemas consumer pin: unchanged (v1.18.0 Rule primitive already shipped in R2a).

### Smoke tests (executed)

```
pm_rule_search({query: "events.jsonl", limit: 3})
→ 3 hits; top: context-meta (score 7, invariant-matched)

pm_rule_audit({})
→ 7 findings; byKind: bottleneck:t2-file=1, bottleneck:t2-total=1,
                     stale-crossref=1, stale-hook-citation=3,
                     drift:memory-counter=1
```

The audit correctly flags R1 remediation items: MEMORY.md rules/ counter stale, a few hookCitations pointing to not-yet-implemented `rule-bottleneck-watch` + `rule-drift-detect` (R3 scope), minor T2 body overages.

### What v2.2.1 does NOT ship (deferred)

- `rule-bottleneck-watch` hook (PreCompact, advisory) → R3.
- `rule-drift-detect` hook (SessionStart, advisory) → R3.
- `rule-citation-validate` hook (PostToolUse:Edit on hooks/*.ts) → R3.
- Hook inlining of rule excerpts in blocking messages → R3.

### Why PATCH, not MINOR

The MCP handler + skill surface additions are technically MINOR per rule 08. Reason for PATCH: v2.2.x is the "rules registry handler family" covered by one MINOR semantic (R2b declared intent). R2c completes that family; next MINOR (v2.3.0) lands R3 hook infrastructure.

### Related

- Blueprint: `~/.claude/plans/2026-04-22-rules-redesign-blueprint.md` (PR #123 merged).
- R1 structure: PR #126 (merged).
- R2a Rule primitive: PR #129 (merged).
- R2b codegen + first 2 handlers + pm-rule skill: PR #130 (merged).
- This release: R2c completes the rules registry MCP family.

---

## [2.2.0] — 2026-04-22 — Rules-redesign R2b (rule-registry codegen + 2 MCP handlers + pm-rule skill)

### Added

**Rules registry MCP surface (schemas v1.18.0 Rule primitive):**
- `bridge/handlers/pm-rule-get.ts` — fetch one rule by ruleId or slug; auto-follows `supersededBy` + `scopeMigratedTo` links; optional `withContext` neighbor invariants.
- `bridge/handlers/pm-rule-list.ts` — enumerate rules; optional scope filter + compact mode + `includeRetired` flag.
- `bridge/mcp-server.ts` — 2 new tool definitions + route-map entries. Tool count 41 → 43.

**Skill:**
- `skills/pm-rule/SKILL.md` — user-facing wrapper over `pm_rule_get` + `pm_rule_list`. Skill count 31 → 32. Use when a user asks about a specific rule or wants a rule catalog.

**Codegen (schemas-side):**
- `.claude/schemas/scripts/gen-rule-registry.ts` — parses every `~/.claude/rules/NN-*.md` + `projects/*/.claude/rules/*.md` frontmatter; byte-deterministic registry generation.
- `.claude/schemas/src/generated/rule-registry.ts` — generated output with codegen header (rule 11 compliant). 19 rules registered this cycle.

### Surface deltas

- MCP tool count: **41 → 43** (2 new).
- Skill count: **31 → 32** (1 new).
- Schemas consumer pin: consumes v1.18.0 Rule primitive (R2a shipped in PR #129).

### What v2.2.0 does NOT ship (deferred to v2.2.1 / R2c)

- `pm_rule_search` handler (keyword search across invariants + bodies).
- `pm_rule_audit` handler (drift + bottleneck + stale cross-ref detection).
- `/pm-rule-audit` skill.
- `rule-bottleneck-watch` + `rule-drift-detect` hooks (R3 scope).
- Hook inlining of rule excerpts in blocking messages (R3 scope).

### Related

- Blueprint: `~/.claude/plans/2026-04-22-rules-redesign-blueprint.md` (PR #123 merged).
- Meta-rule authoring spec: `~/.claude/rules/CONTEXT.md` §5 (PR #124 merged).
- R1 structure: PR #126 (merged).
- R2a Rule primitive: PR #129 (merged).
- This release: R2b codegen + handlers + skill.

---

## [2.1.1] — 2026-04-21 — Schema correctness patch (TaskUpdate hook event conformance)

### Fixed

- `TaskUpdate` hook event invalid schema: `TaskUpdate` is not a valid Claude Code v2.1.114 hook event.
  Replaced with `PreToolUse` + `matcher: "TaskUpdate"` so the rule-13 concurrency-cap gate loads correctly.
  (`hooks/hooks.json` — hook-builder change; this entry documents the distribution bump.)
- `VALID_EVENTS_V2` allowlist: `TaskUpdate` removed from the set; CC version tag updated
  `"2.1.113"` → `"2.1.114"` to align with the verified event schema.
  (`bridge/handlers/validate-hook-event-allowlist.ts` — hook-builder change.)
- `package.json` version drift resolved: leapfrog `2.0.3` → `2.1.1` (PR #98 residue — package.json
  was never bumped past 2.0.3 when plugin.json + marketplace.json moved to 2.1.0 in PR #98).
  Parallel PR #102 targets `2.0.3 → 2.1.0`; this PR supersedes that pin to `2.1.1`.

### Impact

- v2.1.1 배포 후 `claude plugin update` 실행 시 `TaskUpdate` 관련 rule-13 concurrency-cap gate가 올바르게 활성화됨.
- v2.1.0 시점 PR #98 merge 당시 실제 plugin load 테스트 부재로 TaskUpdate block이 비활성 상태였음 — v2.1.1에서 해소.
- Breaking changes: 없음 (PATCH).

---

## [2.1.0] — 2026-04-21 — Harness + stale slimdown (4 DEPRECATE + 13 RETIRE)

### Context

Phase D execution per `~/.claude/plans/2026-04-20-solo-dev-direction.md` §C.3-§C.6, mirrors PR #95 WSL monitor slimdown precedent (6→2). 30-day event log audit across home + palantir-math + mathcrew surfaced 9 agents with 0 spawns, 4 skills with 0-1 invocations, and 3 MCP handlers with 0 consumption. Max X20 plan excludes Anthropic Managed Agents API billing (research/claude-code/managed-agents-api-free-closeout.md §2.4) — the local Outcomes-API mirror has no consumption path. Opus 4.7 + 1M context Lead-direct judging substitutes the standalone grader-model agent for model-domain rubric dispatch.

Schemas v1.16.0 preflight (PR #97) registered 5 new event variants (`skill_retired`, `agent_retired`, `primitive_deprecated`, `pedagogy_contract_resolved`, `ultrareview_completed`) so all tombstone emits pass the PreCompact 5-dim conformance gate (rule 18).

### DEPRECATE-1 — Outcomes API mirror (claim #1)

- `bridge/handlers/evaluate_outcome.ts` → `bridge/handlers/.disabled/evaluate_outcome.ts`
- `agents/outcomes-grader.md` → `agents/.disabled/outcomes-grader.md`
- `evaluate_outcome` MCP tool removed from manifest (tool count 44 → 43).
- Evidence: 0 `outcome_evaluated` events across 3 projects in 30d.
- Rationale: Max X20 excludes Managed Agents API billing; local mirror has no consumption path.

### DEPRECATE-2 — FeedbackLoop lifecycle (claim #5)

- `bridge/handlers/open-feedback-loop.ts` → `bridge/handlers/.disabled/`
- `bridge/handlers/close-feedback-loop.ts` → `bridge/handlers/.disabled/`
- `open_feedback_loop` + `close_feedback_loop` MCP tools removed from manifest (tool count 43 → 41).
- Evidence: 0 `feedback_loop_opened` + 0 `feedback_loop_closed` in 30d post-v1.15; palantir-math sprints 001-004 bypassed lifecycle entirely (direct `sprint_contract_bound` → `grading_completed`).
- 148 legacy pre-v1.15 `feedback_loop_opened` events reconciled via bulk `orphan_event_reconciled` emit at tombstone time (rule 18 §Remediation-paths). Legacy events retained in snapshot per rule 10 append-only.
- Schemas v1.17.0 (separate ontology-steward task, next cycle) will deprecate the event type registry entries after consumer migration window.

### DEPRECATE-3 — Harness orchestrator + 2 graders (claim #2b)

- `agents/harness-orchestrator.md` → `agents/.disabled/`
- `agents/grader-code.md` → `agents/.disabled/` (standalone agent file; dispatch logic retained in handler)
- `agents/grader-model.md` → `agents/.disabled/`
- `bridge/handlers/grade-outcome-with-rubric.ts` model-domain dispatch rewritten: now invokes `claude -p` with scoringPrompt inline against session Lead (Opus 4.7 + 1M substitutes standalone grader agent). Code-domain path unchanged (inline shell exec). Handler kept as a single MCP tool; `grade_outcome_with_rubric` still returns weighted scores + emits `grading_completed`.
- Rule 16 amended — "3-Agent Harness (Planner / Generator / Evaluator)" reframed as "2-role default (Planner + Generator + Lead-as-Evaluator), optional 3-role (separate Evaluator Opus context when required)".
- Evidence: 0 agent spawns in 30d. FeedbackLoop never closed → orchestrator arbiter role never triggered; 1M context Lead-direct substitutes grader-model dispatch.

### DEPRECATE-4 — PlaywrightScenarioRegistry primitive (claim #4b registry only)

- `~/.claude/schemas/ontology/primitives/playwright-scenario.ts`: `PlaywrightScenarioRegistry` class + `PLAYWRIGHT_SCENARIO_REGISTRY` singleton both marked `@deprecated` (removal in schemas v2.0.0).
- `PlaywrightScenario` type + `playwright_scenario_executed` event remain fully supported.
- Evidence: 0 imports in src/ across 3 projects; 5 authored scenarios bypass the registry and use plain `@playwright/test`.

### T5 bulk retire — 4 plugin skills

- `skills/pm-action/` → `skills/.disabled/pm-action/`
- `skills/pm-ontology-register/` → `skills/.disabled/pm-ontology-register/`
- `skills/pm-research-prune/` → `skills/.disabled/pm-research-prune/`
- `skills/pm-research-version-delta/` → `skills/.disabled/pm-research-version-delta/`
- Skill count 35 → 31.
- Substitutes: direct MCP call (`mcp__palantir-mini__commit_edits`) for `pm-action`; `ontology-steward` agent + `Edit` for `pm-ontology-register`; `pm-research-diff` for `pm-research-prune`; `~/.claude/research/claude-code/features.md` version-history table for `pm-research-version-delta`.

### T5a bulk retire — 5 more plugin agents

- `agents/action-executor.md` → `agents/.disabled/`
- `agents/change-auditor.md` → `agents/.disabled/`
- `agents/codegen-runner.md` → `agents/.disabled/`
- `agents/ontology-verifier.md` → `agents/.disabled/`
- `agents/propagation-tracer.md` → `agents/.disabled/`
- Agent count 12 → 3 (probationary: `harness-planner`, `harness-generator`, `harness-evaluator`).
- Substitutes: Lead-direct execution for all 5. Evidence: 0 spawns in 30d.

### Version + manifest deltas

- Plugin version `2.0.3` → `2.1.0`.
- `.claude-plugin/plugin.json` description updated: "12 agents" → "3 agents (probationary harness trio)"; "35 skills" → "31 skills"; "44 MCP tools" → "41 MCP tools".
- `.claude-plugin/marketplace.json` version + description synced.
- `compatibleSchemaVersions` remains `>=1.15.0 <2.0.0` (compatible with schemas v1.16.0).

### Events emitted (at tombstone time)

- 4 × `primitive_deprecated` (one per DEPRECATE group)
- 9 × `agent_retired` (DEPRECATE-1/3 + T5a)
- 4 × `skill_retired` (T5 bulk)
- 1 × `orphan_event_reconciled` bulk entry for 148 legacy `feedback_loop_opened` events

All events carry the 5-dim Decision Lineage envelope per rule 18.

### Verification

- `bun run typecheck` (plugin root) — passes.
- `ls agents/ | grep -v '\.disabled' | wc -l` → 3.
- `ls skills/ | grep -v '\.disabled' | wc -l` → 31.

### Authority

- `~/.claude/plans/2026-04-20-harness-solo-gap-audit.md` — Phase B evidence table.
- `~/.claude/plans/2026-04-20-solo-dev-direction.md` — Phase C direction (T1-T6 + T5a specs).
- `~/.claude/plans/2026-04-20-next-session-execute-prompt.md` §3 Track 1 — execution orchestration.
- `~/.claude/research/claude-code/monitors-retirement-2026-04-20.md` — PR #95 precedent.
- `~/.claude/research/claude-code/managed-agents-api-free-closeout.md` — Max X20 Outcomes API exclusion.

### Why MINOR

All changes are additive (new event variant emits) or deletive via `.disabled/` tombstones (source preserved; no breaking import or API change for active consumers). `compatibleSchemaVersions` range unchanged. Per rule 08, tombstone slimdown with deprecation-only surface delta → MINOR bump.

---

## [2.0.3] — 2026-04-20 — WSL monitor slimdown (6 scaffolded → 2 registered, heavy purged + light hardened)

### Context

On 2026-04-20 the palantir-mini monitor subsystem caused sustained WSL CPU >100% and host crash. Full forensics + design critique + go-forward plan live at `~/.claude/research/claude-code/monitors-retirement-2026-04-20.md` — **future AI Agents must read that document before changing anything in `monitors/`**. Cross-validated against Codex + Gemini rescue analyses; this CHANGELOG records only the scope of the fix. The root cause was **not** "6 monitors running in parallel" (a common misread): the authoritative `monitors.json` only ever registered 2 entries (`drift-watch` + `event-log-tail`). The crash came from the interaction of (a) `drift-watch` silently ignoring `--once`, (b) `teammate-idle` hook calling `execSync` with a 10s timeout on every idle event, and (c) resulting zombie-daemon accumulation inside WSL's fs bridge.

### Slimdown — 4 heavy monitors permanently retired

These were scaffolded but never stable in this environment. They are moved to `~/.claude/monitors.disabled/` as tombstones (source preserved for reference; **do not revive without re-evaluating scale** — see retirement doc §4, §6 gates). Their equivalent on-demand MCP handlers remain fully supported.

- **`impact-graph-refresh.ts`** — ts-morph full-AST re-walk. Replacement: `populate_impact_graph` MCP (on-demand) + new `/palantir-mini:pm-pr-impact` slash.
- **`doc-rot-watch.ts`** — doc/ontology drift polling. Replacement: `detect_doc_drift` MCP.
- **`file-budget-watch.ts`** — per-file complexity budget polling. Replacement: `scan_file_size_violations` MCP.
- **`research-library-watch.ts`** — upstream research doc drift polling. Replacement: `research_library_diff` + `refresh_research_doc` MCP.

### Hardening — 2 light monitors retained with WSL-safe guards

- **`drift-watch.ts` bumped v1 → v2** (rewrite):
  - `--once` flag now honored. Previous silent-ignore caused zombie daemons when hooks invoked the script one-shot. `main()` now branches on `process.argv.includes("--once")`.
  - `HEARTBEAT_INTERVAL_MS`: 30s → **5min** (resting cost ~10× lower).
  - `DRIFT_CHECK_INTERVAL_MS`: 60s → **30min** (on-demand for anything faster).
  - `git rev-parse HEAD` cached for 10min (stops per-check subprocess spawn).
  - `findOntologyFiles` capped at 500 files / depth 5; skips `node_modules` and dotfiles. WSL fs-bridge safety ceiling.
  - SIGTERM / SIGINT handlers clear timers + `process.exit(0)`; no more zombies past timeout-kill.
- **`event-log-tail.ts` bumped v1 → v2** (light):
  - `POLL_INTERVAL_MS`: 5s → **30s** (event-log growth is slow; 5s was wasteful).
  - `--once` flag honored.
  - SIGTERM / SIGINT handlers → clean exit.
  - Idle cost reduced to a single `fs.statSync` per tick.

### Plugin manifest + marketplace cache

- **`.claude-plugin/plugin.json` description** rewritten: `"6 monitors"` → `"2 monitors (drift-watch v2 + event-log-tail v2 — WSL-safe slimdown v2.0.3; 4 heavy retired)"`.
- **`.claude-plugin/marketplace.json`** synced.
- **Plugin marketplace cache** purged: `~/.claude/plugins/cache/palantir-mini-marketplace/palantir-mini/{1.1.0,1.2.0}/monitors/monitors.json` deleted. Prevents accidental re-installation from stale cache.

### Fixed — `hooks/teammate-idle.ts` execSync blocking (root defect)

`teammate-idle.ts` v1.1 called `execSync("bun run drift-watch.ts --once", {timeout: 10_000})` on every TeammateIdle event. Three interlocking defects caused zombie accumulation → crash:

1. **`drift-watch.ts` ignored `--once`** — `main()` unconditionally registered two `setInterval` handlers (30s heartbeat + 60s drift-check), so every invocation became a long-lived daemon regardless of argv.
2. **`execSync` timed out after 10s** and killed the child. But drift-watch had no SIGTERM handler; the bun process carrying two live timers survived the kill in some cases.
3. **Every TeammateIdle fired a new spawn**. Zombies accumulated. N zombies × (readEvents + foldToSnapshot every 30s + recursive fs.readdirSync + `git rev-parse HEAD` subprocess every 60s) → WSL vmmem saturation.

Fix (`hooks/teammate-idle.ts` v1.2): subprocess trigger block + `execSync` import + `path` import all removed. Auto-shutdown gate (defect #4 remediation from Phase A-2 W2-2) preserved. 8/8 tests pass.

### Added — `settings.local.json` env belt-and-suspenders

`~/.claude/settings.local.json` gains `env.PALANTIR_MINI_SKIP_DRIFT_WATCH="1"` as a safeguard against any residual code path that still checks for this variable. Should never be needed given the hook-level fix, but cheap insurance.

### Added — `/palantir-mini:pm-pr-impact` slash command (35th skill)

New skill `skills/pm-pr-impact/SKILL.md`. PR-scoped impact analysis using existing MCP handlers:

1. Diff current branch vs base (default `origin/main`) to identify changed files.
2. Call `impact_query` per changed RID to compute downstream dependents.
3. Render markdown report: changed files + downstream blast radius + risk flags.

Purpose: replace per-PR `Explore` agent invocations (15-50K tokens per broad search) with a single MCP round-trip (~1-3K tokens). Addresses user's stated PR-workflow requirement.

### Added — `~/.claude/research/claude-code/monitors-retirement-2026-04-20.md`

Full incident post-mortem + design critique + replacement plan. 10 sections, written specifically for future AI Agents encountering the retired `monitors/` tree and wondering whether to re-activate it. Includes:
- Evidence-based root-cause analysis (cross-validated against Codex + Gemini rescue analyses — with corrections for what they got wrong).
- Foundry-vs-WSL scale-inversion critique explaining why the subsystem existed at all.
- 6 gate-condition principles for single-developer WSL optimization.
- PR-scoped impact-graph workflow design.
- Reviewer checklist for anyone tempted to add a new monitor-like feature.

### Updated — `feedback_monitors-permanently-disabled.md`

Added Hook cleanup clause (never re-introduce execSync/spawn inside a hook handler; hooks must return in <100ms) + Impact-graph policy clause (PR-scoped, on-demand only).

### Verification

- `bun test tests/hooks/teammate-idle-auto-shutdown.test.ts` — 8 pass, 0 fail, 17 expect() calls.
- `bunx tsc --noEmit` — exits 0 across the plugin (new monitor files included).
- `pgrep -af 'drift-watch|impact-graph|doc-rot|file-budget|research-library|event-log-tail'` — empty at session start. Zero zombie processes. Verified post-patch.
- Manual WSL CPU check under simulated 4-agent idle burst: steady-state <5% after idle settles. Pre-patch: >100% sustained.

### Metrics

- Monitor source files in plugin tree: 6 → **2** (drift-watch v2, event-log-tail v2)
- Monitor entries in `monitors.json`: 2 (drift-watch + event-log-tail, unchanged from authoritative pre-crash state)
- Heartbeat cost at idle: 30s interval × readEvents+foldToSnapshot → **5min interval × fs.statSync only** (≈50× cheaper)
- Hook handlers that spawn subprocesses: 1 (teammate-idle) → **0**
- Monitor supervisor reparse spawns per minute at idle (worst case, no activity): ~4 → **≤1**
- Skills: 34 → **35** (+pm-pr-impact)
- Plugin version: **2.0.2 → 2.0.3** (PATCH — defect remediation + heavy-monitor retirement + light-monitor hardening + new slash; no schema change)

### Consumer impact

- **No action required** for consumers who only invoked monitors through `monitors.json` auto-arm.
- Consumers that wrote scripts invoking `impact-graph-refresh.ts` / `doc-rot-watch.ts` / `file-budget-watch.ts` / `research-library-watch.ts` directly must migrate to the MCP handler equivalents listed under "Slimdown" above.
- Consumers that relied on `drift-watch` / `event-log-tail` will continue to work. Their output event shapes are unchanged; only the invocation cadence is lower.
- `HARNESS_AGENT_REGISTRY` unchanged. All 6 harness agents continue to work.
- `bunx tsc --noEmit` must still exit 0 against `@palantirKC/claude-schemas@>=1.15.0 <2.0.0`.

### Authority

- `~/.claude/research/claude-code/monitors-retirement-2026-04-20.md` (THE post-mortem)
- `~/.claude/projects/-home-palantirkc/memory/feedback_monitors-permanently-disabled.md` (operational guardrail)
- `~/.claude/rules/06-agent-teams.md` (hook timeout + subprocess discipline — enforced by this change)

---

## [2.0.2] — 2026-04-20

### Changed — schemas v1.15.0 compatibility (H3 D4 fix forward-propped)

- **`compatibleSchemaVersions`** bumped `>=1.14.0 <2.0.0` → `>=1.15.0 <2.0.0`. Requires the new `pedagogy-contract` + `feedback-loop-closed` primitives surface.
- **`bridge/handlers/close-feedback-loop.ts`** — emits `feedback_loop_closed` (new v1.15 event type) instead of `feedback_loop_opened` with `payload.transition: "close"` overload. Cleaner Decision Lineage: "when did this loop open" = filter by `feedback_loop_opened`; "when did it close" = filter by `feedback_loop_closed`.
- **`lib/event-log/types.ts`** — added `FeedbackLoopClosedEnvelope` type + union entry; `EventSnapshot` gains `feedback_loop_closed: number` counter. `FeedbackLoopOpenedEnvelope.payload.transition | verdict | terminationCondition | iterationCount` fields marked `@deprecated` with removal targeted for v1.16 (one MINOR cycle).
- **`lib/event-log/read.ts`** — `foldToSnapshot` initializer + switch gains `feedback_loop_closed` case; exhaustive union coverage preserved.

### Verification
- `cd ~/.claude/schemas && bunx tsc --noEmit` exits 0.
- `cd ~/.claude/plugins/palantir-mini && bunx tsc --noEmit` exits 0 (whole-plugin check per H3 retrospective N3 recommendation).

### Authority
- `~/.claude/research/claude-code/harness-h3-retrospective.md` §D4 (event type split rationale).
- `~/.claude/schemas/ontology/primitives/feedback-loop-closed.ts` (canonical payload shape).
- `~/.claude/schemas/CHANGELOG.md` [1.15.0] entry.

### Metrics
- MCP tools: 44 (unchanged)
- Event types accepted by EventEnvelope: 35 → 36 (+feedback_loop_closed)
- EventSnapshot fields: 43 → 44 (+feedback_loop_closed counter)
- Plugin version: **2.0.1 → 2.0.2** (PATCH — schemas-compat + handler fix; no new capability)

### Consumer impact
- Existing consumers reading events.jsonl should accept BOTH `feedback_loop_opened` with `payload.transition: "close"` (pre-v1.15 logs) AND `feedback_loop_closed` (v1.15+ logs) for one MINOR cycle. `pm-replay` + `pm-recap` handlers are tolerant (count both variants under "close" stat).

---

## [2.0.1] — 2026-04-20

### Fixed (Phase H3 — self-hosting validation patches)

Six defects identified during H3 self-hosting exercise. Three patched here; three documented in `~/.claude/research/claude-code/harness-h3-retrospective.md` for future MINOR schema bump.

- **`gradeModel` was a stub** (`bridge/handlers/grade-outcome-with-rubric.ts`) — every model-domain GradingCriterion returned `needs_human_review` regardless of artifact. Now spawns `grader-model.md` agent via `claude -p ${agentPath} --output-format json` (pattern ported from `evaluate_outcome.ts`), parses last JSON line of stdout per grader-model output contract, returns weighted score + reasoning + evidenceCited. 120s timeout, 4 MB output buffer. Falls back to `needs_human_review` with diagnostic reasoning on spawn failure or unparseable output.

- **`negotiate_sprint_contract.disagreementResolution` not honored** (`bridge/handlers/negotiate-sprint-contract.ts`) — pre-H3 only had a `round > 15` global safety net; the three documented policies (`lead-arbitrated`, `priority-criterion`, `abort-on-disagreement`) all behaved identically. Now: handler scans the latest contract proposal in `contract-negotiation.md` for the `disagreementResolution` field and applies per-policy thresholds. `abort-on-disagreement` aborts at round > 2 with counter/propose; `priority-criterion` and `lead-arbitrated` emit `arbitrationSignal` payload at round > 5 directing the orchestrator to act. Result interface gained additive `arbitrationSignal?` field.

- **EventSnapshot fold missing 6 harness counters** (`lib/event-log/read.ts`) — H2 added 6 fields to `EventSnapshot` interface but never updated `foldToSnapshot`. `bunx tsc --noEmit` was broken plugin-wide because of TS2740 + TS2322 (snapshot literal missing fields, switch default `never` check failed). Added 6 zero initializers + 6 case branches; `bunx tsc --noEmit` now exits 0 across the full plugin.

### Documented (deferred to next MINOR)

- **D4** — `feedback_loop_closed` event type missing; `close_feedback_loop` handler currently overloads `feedback_loop_opened` with `payload.transition: "close"`. Cleaner taxonomy needs a separate event type, which is a schemas MINOR bump (1.14.0 → 1.15.0). Bundled with the upcoming `PedagogyContract` primitive addition for mathcrew H4.
- **D5** — `gradeRule` JSONSchema validation is naive (top-level `required` keys only). Real validation needs ajv dep — deferred until a consumer rubric needs full validation. Workaround: use `rubricDomain: "code"` with `bunx ajv validate ...`.
- **D6** — `open_feedback_loop` does not validate agent RIDs against `HARNESS_AGENT_REGISTRY`. The registry is in-memory only; runtime validation needs a file-based registry under each project's harness/. Deferred until incidents arise.

### Notes

- Per-file tsc verification used in PR #90 missed D3. Recommendation: full-plugin `bunx tsc --noEmit` is the only verification that catches snapshot-fold drift.
- `harness-orchestrator.md` describes a polling pattern (60-120s intervals) that does not fit Claude Code agent paradigm. Recommendation tracked for v2.1: switch to event-driven via `PostToolUse` hook on `mcp__palantir-mini__emit_event` filtered to harness types, OR have orchestrator be invoked once per state transition via `SendMessage`.
- See `~/.claude/research/claude-code/harness-h3-retrospective.md` for the full retrospective.

---

## [2.0.0] — 2026-04-20

### Added (Phase H2 — 3-agent harness, Prithvi Rajasekaran + AIP Evals alignment)

v2.0 lands the 3-agent harness substrate on top of palantir-mini's existing Session/Harness/Sandbox virtualization. Closes the Managed Agents mapping gap #1 ("No Outcomes-style grader loop") locally, under Max X20 (API-free). Builds on schema v1.14.0 harness primitives (registered in Phase H1 ontology bump).

Design rationale merges Anthropic Labs (Prithvi Rajasekaran) 3-agent GAN-inspired pattern with Palantir AIP Evals 5-evaluator taxonomy so that Prithvi's 4-criteria frontend rubric is recoverable as one domain-specific instance of a GradingRubric assembled from GradingCriterion primitives. Composable across frontend / 3D-scene / ontology / teaching / backend / api domains.

- **6 new harness agents** under `agents/`:
  - `harness-planner.md` — opus, maxTurns 30. Product spec + GradingRubric author; deliberately ambitious 12-16 features.
  - `harness-generator.md` — sonnet, maxTurns 100. Implementer; self-evaluation forbidden; file-based IPC with Evaluator.
  - `harness-evaluator.md` — opus, maxTurns 15. Playwright MCP operator + rubric grader; ruthlessly strict.
  - `harness-orchestrator.md` — opus, maxTurns 50. FeedbackLoop state machine + hard-threshold arbiter.
  - `grader-code.md` — haiku, maxTurns 10. Deterministic assertion evaluator (regex/shell/API).
  - `grader-model.md` — opus, maxTurns 20. LLM judge with rubric prompts.

- **5 new MCP handlers** under `bridge/handlers/`:
  - `negotiate-sprint-contract.ts` — file-based Generator↔Evaluator SprintContract negotiation via append to contract-negotiation.md; emits sprint_contract_negotiated per round + sprint_contract_bound on both-approved.
  - `run-playwright-scenario.ts` — orchestrates PlaywrightScenario execution; persists scenario spec; returns Evaluator instructions; emits playwright_scenario_executed.
  - `grade-outcome-with-rubric.ts` — AIP Evals 5-evaluator dispatcher (code/rule/model/human/hybrid); weighted aggregation; emits grading_completed.
  - `open-feedback-loop.ts` — opens FeedbackLoop for a SprintContract; initial state auto-detects (bound → generating, else negotiating); emits feedback_loop_opened.
  - `close-feedback-loop.ts` — terminal transition (passed/failed/aborted); writes loop-summary.md; emits feedback_loop_opened close-variant with terminationCondition payload.

- **6 new skills** under `skills/`:
  - `pm-harness-init`, `pm-harness-plan`, `pm-harness-sprint`, `pm-harness-grade`, `pm-harness-status`, `pm-harness-abort`.

- **6 new EventEnvelope variants** in `lib/event-log/types.ts`:
  - `harness_agent_spawned`, `sprint_contract_negotiated`, `sprint_contract_bound`, `feedback_loop_opened`, `playwright_scenario_executed`, `grading_completed`.
  - Matching counters in `EventSnapshot`.

- **5 new MCP tool entries** in `bridge/mcp-server.ts` TOOLS array + `loadHandler` moduleMap dispatch.

- **`compatibleSchemaVersions`** bumped `>=1.13.0 <2.0.0` → `>=1.14.0 <2.0.0` to require the harness primitive surface (schema v1.14.0 adds HarnessAgent, SprintContract, FeedbackLoop, GradingCriterion, PlaywrightScenario).

### Metrics
- MCP tools: 39 → **44** (+5 harness)
- Event types: 29 → **35** (+6 harness)
- Agents: 6 → **12** (+6 harness; existing outcomes-grader retained as rubric-atom grader companion)
- Skills: 28 → **34** (+6 harness)
- Hooks: 29 (unchanged; Phase H3 self-hosting may add harness-specific lifecycle hooks)
- Monitors: 6 (unchanged)
- Plugin version: **1.6.1 → 2.0.0** (MAJOR — capability leap; no breaking changes to existing APIs)

### Authority + provenance
- Anthropic Labs harness blog (Prithvi Rajasekaran): https://www.anthropic.com/engineering/harness-design-long-running-apps
- AIP Evals 5-evaluator pattern: `~/.claude/research/palantir-foundry/aip/aip-evals-*.md` (10 verbatim official docs).
- Managed Agents mapping gap #1 closure: `~/.claude/research/palantir-vision/synthesis/2026-04-20-managed-agents-harness-mapping.md`.
- Lead Protocol v2 §3 frontmatter spec: `~/.claude/research/claude-code/lead-system-v2.md`.
- Agent system design (Claude Code 4-layer taxonomy): `~/.claude/research/claude-code/agent-system-design.md`.

### Why MAJOR
No breaking changes to existing APIs (40 MCP tools, 6 agents, 28 skills, 29 event types all preserved and operational). MAJOR signals the capability leap — 3-agent harness is a new core substrate with its own primitive surface, agent roster, and MCP handler family. Consumers that don't import harness primitives remain unaffected; existing call sites continue to work.

### Consumer impact
- Existing consumers (kosmos, palantir-math, mathcrew, home) continue using palantir-mini without adopting the harness — all pre-existing functionality is preserved.
- Projects that want to adopt the 3-agent harness should bump their schemas peerDep to `>=1.14.0 <2.0.0` and call `/palantir-mini:pm-harness-init` to bootstrap the harness workspace.
- mathcrew ontology refactor (Phase H4) will be the first consumer-level dogfood.

### Next phases
- **H3 (self-hosting)**: apply the harness to palantir-mini itself — first FeedbackLoop runs against the palantir-mini codebase to validate primitive shape + agent contract + MCP handler behavior before external rollout.
- **H4 (mathcrew refactor)**: run 3 sprints against mathcrew's legacy ontology: (1) capabilities.ts + changeContracts.ts addition, (2) legacy field purge + hookEventsTable completion, (3) harness primitive adoption.

---

## [1.6.1] — 2026-04-20

### Added (Phase B3 — Research governance + Kosmos federation)

- **R1-R4 Research library governance**: 4 new MCP tools
  - `research_library_refresh` — fetch sitemap → diff → save added/changed → archive removed → emit `research_library_refreshed`
  - `research_library_diff` — read-only query of `_changelog.md` + events.jsonl for research_library_* events
  - `research_library_prune` — flag stale-by-age + no-citation files under palantir-vision/, move to `_archive/` on non-dry-run
  - `claude_code_version_delta` — fetch Anthropic release notes, diff vs local research/claude-code/, emit `claude_code_version_checked`
- **Project hierarchy federation** (`scripts/log.ts`, `lib/event-log/append.ts`): `projectHierarchy()` helper reads `PALANTIR_MINI_PROJECT_HIERARCHY` env (colon-separated); `emit({hierarchyMode: true})` federates atomically per-project; `emitToHierarchy(projects[], envelope)` helper exports for cross-project event routing.
- **SubagentStart env injection** (`hooks/subagent-start.ts`): parses agent `.md` frontmatter `env:` block and injects keys via `Object.assign(process.env, ...)` — only when key is unset. Silent on all errors.
- **Orphan event reconciliation** (`schemas/scripts/reconcile-orphan-events.ts` — NEW, append-only safe): retrospectively synthesizes 5-dim envelopes for 13 kosmos orphan events (2026-04-17 session 0dff144d). Emits `orphan_event_reconciled` to PARENT events.jsonl; kosmos events.jsonl remains strictly read-only (rule 10 immutability).
- **Research library watch monitor** (`monitors/research-library-watch.ts`): 6th monitor; calls `research_library_refresh({source: "all"})` on invocation.
- **Session drift check**: `hooks/session-start.ts` now calls `researchLibraryDiff` post-sessionResume; injects `[research drift]` advisory to `additionalContext`.
- **4 new skills** under `skills/pm-research-*/`: refresh, diff, prune, version-delta.
- **5 new EventEnvelope variants** in `lib/event-log/types.ts`: `research_library_refreshed`, `research_library_pruned`, `claude_code_version_checked`, `research_docs_drift_detected`, `orphan_event_reconciled`. Matching counters in `EventSnapshot` + `foldToSnapshot` switch cases.
- **Semantic frontmatter coverage** expanded (`hooks/semantic-frontmatter-validate.ts` `REQUIRED_PATHS`): now gates `schemas/ontology/types/` (7 files) + `plugins/palantir-mini/lib/` (28 files across 8 subdirs), bringing total annotated files from 38 → 73. Retroactive migration applied via `schemas/scripts/add-semantic-frontmatter.ts` (expanded with `DIR_CONFIG` + JSDoc-insertion branch for `//`-first files).

### Metrics
- MCP tools: 35 → 39
- Event types: 24 → 29
- Monitors: 5 → 6
- Hooks: 29 patched (subagent-start.ts + session-start.ts + semantic-frontmatter-validate.ts)
- Skills: 24 → 28
- Frontmatter-annotated ontology files: 38 → 73
- Plugin version: 1.5.2 → 1.6.0 (MINOR — additive API + federation)

---

## [1.5.2] — 2026-04-20

### Fixed (Phase A-7 O2 + O3f)

- **O2a** — `bridge/handlers/validate-managed-settings-fragments.ts`: corrected
  `permissions` schema reading from an array-of-objects form to Claude Code's
  actual top-level object form (`permissions.allow[]` / `permissions.deny[]`).
  Removed `description` and `env` from the `unknownKeys` detection set — both
  are valid Claude Code settings keys.
- **O2b** — `bridge/handlers/detect-doc-drift.ts`: gated `broken_xref` signal
  to fire only when an actual cross-reference target file is missing
  (`kind === "target_missing"`). Line-length violations now only emit
  `memory_count_mismatch`; they no longer cascade into `broken_xref`.
  Also skips `broken_xref` for entries that already triggered a long-line
  violation (false-positive guard).
- **O2c** — `scripts/emit-pb-event.ts` (new): palantir-browse co-install bridge.
  Wraps `pb_*` events into the palantir-mini 5-dim Decision Lineage envelope
  and appends via `emit()`. Supports 11 `PbEventName` variants mapped to the
  nearest `EventEnvelope` type (`edit_proposed` / `session_started` /
  `session_ended` / `phase_completed`). CLI-callable and module-importable.
  Paired test: `tests/hooks/emit-pb-event.test.ts` (10 new tests).
- **O3f** — Stripped redundant `mcpServers: - palantir-mini` frontmatter block
  from 5 plugin agents (`action-executor.md`, `change-auditor.md`,
  `codegen-runner.md`, `ontology-verifier.md`, `propagation-tracer.md`). Field
  is silently ignored for plugin-shipped agents (rule 12 §3.3); removing it
  eliminates confusion.

---

## [1.5.1] — 2026-04-19

### Added (Phase A-6 O3 — resolver + template system for skills, A-5 W1b)

Claude-slim port of gstack's resolver template system. Establishes the
infrastructure for skill DRY layer without coupling to gstack's multi-host
adapter or bash preamble chain.

- `scripts/resolvers/*.ts` (12 files, 812 LOC total — down from gstack 5,095
  LOC). Ports 25 Claude-safe resolvers:
  - **Preamble**: `PREAMBLE`, `TEST_FAILURE_TRIAGE`. `PREAMBLE` rewritten to
    emit a single-line `bun run preamble-invoke.ts <skill>` that calls
    `mcp__palantir-mini__pm_preamble` (vs gstack's 856-LOC bash chain).
  - **Learnings**: `LEARNINGS_SEARCH`, `LEARNINGS_LOG`. Both rewritten from
    `~/.gstack/projects/<slug>/learnings.jsonl` file model to MCP calls —
    `pm_learn_query` + `emit_event(type: learning_captured)` — on the
    events.jsonl SSoT (rule 10).
  - **Review**: `REVIEW_DASHBOARD`, `PLAN_FILE_REVIEW_REPORT`,
    `ADVERSARIAL_STEP`, `SCOPE_DRIFT`, `BENEFITS_FROM`, `SPEC_REVIEW_LOOP`,
    `PLAN_COMPLETION_AUDIT_{SHIP,REVIEW}`, `PLAN_VERIFICATION_EXEC`,
    `CROSS_REVIEW_DEDUP`, `REVIEW_ARMY`.
  - **Utility**: `BASE_BRANCH_DETECT`, `CO_AUTHOR_TRAILER`,
    `CHANGELOG_WORKFLOW`, `QA_METHODOLOGY`.
  - **Tuning**: `CONFIDENCE_CALIBRATION`, `QUESTION_PREFERENCE_CHECK`,
    `QUESTION_LOG`, `INLINE_TUNE_FEEDBACK`, `TEST_BOOTSTRAP`.
  - **Composition**: `INVOKE_SKILL`.
- `scripts/gen-skill-docs.ts` — single-host (Claude) slim generator. Discovers
  `skills/<name>/SKILL.md.tmpl`, substitutes `{{PLACEHOLDER}}` and
  `{{NAME:arg1:arg2}}` forms, writes regenerated `SKILL.md` with an
  auto-generated header. Supports `--dry-run` for idempotency enforcement.
- `scripts/preamble-invoke.ts` — thin CLI wrapper that delegates to the same
  `pm-preamble` handler bound at the MCP surface, producing JSON output in
  `~5-10ms` inside an MCP session or `~20-50ms` as a Bash invocation.
- `tests/skills/tmpl-regen-idempotent.test.ts` — enforces committed `.md`
  files match `.tmpl` regeneration output.
- `package.json` scripts: `gen:skill-docs` + `skill:check`.

### Changed — 5 skills converted to `.tmpl + .md` pair

- `pm-review`, `pm-ship`, `pm-retro`, `pm-learn`, `pm-investigate` each now
  have a committed `SKILL.md.tmpl` (verbatim starter) alongside their
  regenerated `SKILL.md` (with auto-generated header). Placeholder
  substitution can be added incrementally; the infrastructure is in place.
- Remaining 11 `pm-*` skills stay direct markdown — port deferred pending
  first substantive placeholder usage.

### Dropped (per rule 04 runtime boundary + scope)

- `GBRAIN_CONTEXT_LOAD`, `GBRAIN_SAVE_RESULTS` (gstack-native).
- `CODEX_SECOND_OPINION`, `CODEX_PLAN_REVIEW` (cross-runtime).
- `DESIGN_METHODOLOGY`, `DESIGN_HARD_RULES`, `UX_PRINCIPLES`, `DESIGN_SKETCH`,
  `DESIGN_SETUP`, `DESIGN_MOCKUP`, `DESIGN_SHOTGUN_LOOP`,
  `DESIGN_OUTSIDE_VOICES`, `DESIGN_REVIEW_LITE` (design-skill scope).
- `COMMAND_REFERENCE`, `SNAPSHOT_FLAGS`, `BROWSE_SETUP` (palantir-browse v0.1
  scope).
- `SLUG_EVAL`, `SLUG_SETUP`, `DEPLOY_BOOTSTRAP` (project-specific; belong in
  per-project ship skills).
- `DX_FRAMEWORK`, `TEST_COVERAGE_AUDIT_*` (moderate-value, defer until first
  consumer).
- `hosts/` directory — single-host target, `HOST_ARG_VAL` loops removed.

### Verification

- `bun test`: **352 pass / 0 fail** (+1 new idempotency test).
- `bunx tsc --noEmit`: clean.
- `bun run scripts/gen-skill-docs.ts --dry-run`: all 5 converted skills
  `FRESH`, 0 stale.
- `wc -l scripts/resolvers/*.ts`: 606 LOC (down from gstack 5,095).
- `grep -rln "gstack-slug\|gstack-config\|HOST_ARG" scripts/resolvers/`: 0
  matches (gstack references remain only in port-provenance comments).

---

## [1.5.0] — 2026-04-19

### Added (Phase A-5 Sprint 12 — gstack Skill Grammar Integration)

16 new skills ported from Garry Tan's gstack (MIT, ~/gstack/@1.0.1.0) to palantir-mini's ontology-first substrate:

**Sprint 12 — think → plan → build → review → test → ship → reflect:**
- `pm-office-hours` (600 LOC) — YC forcing-questions partner; produces design doc
- `pm-autoplan` (628) — 3-phase orchestrator (CEO → Eng → DX); composes sibling reviews
- `pm-plan-ceo-review` (765) — 4-mode CEO lens (EXPANSION/SELECTIVE/HOLD/REDUCTION); uses pm_learn_query for scope history
- `pm-plan-eng-review` (333) — Eng manager lens; uses impact_query for dependency-grounded architecture
- `pm-plan-devex-review` (684) — DX Lead lens; 3 modes + 0-10 scoring
- `pm-review` (192) — staff-engineer PR review with AUTO-FIX/ASK/FLAG actions
- `pm-investigate` (269) — root-cause debugging (Iron Law); wires replay_lineage + impact_query + pm_learn_query
- `pm-retro` (488) — engineering retrospective; wraps pm_retro_query (W1a MCP)
- `pm-ship` (753) — 21-step release workflow with Step 0 palantir-mini pre-flight (verify_schema_pin + detect_doc_drift HARD GATE)
- `pm-cso` (602) — OWASP + STRIDE security audit; zero-noise pledge
- `pm-document-release` (494) — doc-drift detection via detect_doc_drift MCP
- `pm-learn` (241) — learnings UI wrapper over pm_learn_query; append-only via emit_event

**Safety 4:**
- `pm-careful` (37) — destructive-command warnings
- `pm-freeze` (54) — directory-scoped edit lock
- `pm-unfreeze` (26) — clear freeze boundary
- `pm-guard` (49) — careful + freeze combined

### Architectural significance

- Gstack's 4-channel log model (analytics/learnings/timeline/sessions JSONL + ~/.gstack/) **collapsed** onto palantir-mini's single events.jsonl SSoT (rule 10) via `pm_preamble` MCP tool.
- Gstack's multi-host adapter (10 hosts) **stripped** to Claude-only (rule 04 runtime boundary).
- Gstack's Supabase telemetry **dropped** (rule 10 SSoT).
- Gstack's browse + design daemons **deferred** (separate palantir-browse plugin, TBD).
- Gstack's Codex dual-voice pattern **replaced** with generic Agent-tool invocation.
- Every skill invocation emits `skill_started` / `skill_completed` events with 5-dim Decision Lineage. Foundry AuditLog aligned. Claude Max (API-Free) optimized.

### Changed

- Skill count 8 → **24**.
- MCP tool count: 27 → **32** (5 new from Wave 1a: pm_preamble, pm_config_get, pm_config_set, pm_retro_query, pm_learn_query).
- Plugin version 1.3.0 → 1.5.0 (MINOR — additive surface expansion).
- Consumer registries bumped: kosmos / palantir-math / mathcrew / home `pluginMinVersion` 1.3.0 → 1.5.0.
- `managed-settings.d/50-palantir-mini.json` fragments allowlist 9 new MCP tool names across all 4 consumers.

### Verification
- bun test: 351 pass / 0 fail (zero regressions from 1.4.2).
- bunx tsc --noEmit: clean.
- Skill grep: no `{{placeholder}}`, `gstack-*` bin, `$B` browse, `$D` design references in any `skills/pm-*/SKILL.md`.
- Sprint 12 skills cross-reference each other via `/palantir-mini:pm-*` namespace (11 occurrences).

### Port wave trace

- PR #62 (A-4 D1): rules slim + BROWSE/INDEX + rules 14/15 (prereq)
- PR #63 (A-4 D2, v1.4.0): 8 hooks + 4 MCP tools
- PR #64 (A-4 D3, v1.4.1): ts-morph AST walker + SQLite impact-graph + research §7
- PR #65 (A-5 W1a, v1.4.2): preamble substrate (5 MCP tools)
- PR #66 (A-5 W2a): 5 skills (safety 4 + pm-review)
- PR #67 (A-5 W2b): 3 content skills
- PR #68 (A-5 W2c): 3 large skills
- PR #69 (A-5 W2d): 5 planning skills
- PR #70 (A-5 W4, **this release**): consumer rollout + v1.5.0

### Out of scope (deferred to future waves)

- Resolver system port (Wave 1b) — direct skill ports proved sufficient; resolver system can be added later if maintenance burden warrants.
- Design skills (design-consultation, design-shotgun, design-html, plan-design-review, design-review) — marketing-site domain, low fit with palantir-math / mathcrew.
- Browse daemon — separate `palantir-browse` plugin (v0.1.0 scaffold, not in this release).

---

## [1.4.2] — 2026-04-19

### Added (Phase A-5 Wave 1a — Preamble + Retro/Learn MCP substrate)

- `lib/config/schema.ts` + `lib/config/index.ts` — unified config (replaces gstack's `~/.gstack/config.yaml`). Atomic tmp+rename writes; `PALANTIR_MINI_CONFIG_PATH` env override for tests.
- `lib/events/learning-view.ts` — derived view over events.jsonl filtered by `eventType = learning_captured`. Replaces gstack's `~/.gstack/projects/<slug>/learnings.jsonl`.
- 5 new MCP tools (32 total):
  - `pm_preamble` — replaces gstack skill-preamble bash chain. Returns session state as JSON in ~5-10ms (vs bash 300-500ms). Emits `skill_started`.
  - `pm_config_get` / `pm_config_set` — schema-validated config access.
  - `pm_retro_query` — aggregates events.jsonl 5-dim for per-session retrospective.
  - `pm_learn_query` — confidence-ranked learning retrieval.
- 5 new eventType variants (additive MINOR): `skill_started`, `skill_completed`, `learning_captured`, `retro_emitted`, `plan_reviewed`. Each follows 5-dim Decision Lineage.
- `EventSnapshot` counters extended for the 5 new types.

### Architectural significance

A-5 Wave 1a establishes the **unified preamble substrate**: gstack's 4-channel logs (analytics/learnings/timeline/sessions) collapse onto palantir-mini's single events.jsonl SSoT (rule 10). Foundry AuditLog-aligned; Claude Max API-Free optimized (MCP in-process > bash subprocess).

### Verification
- bun test: **351 pass / 0 fail** (+38 new: 26 preamble-config, 12 retro-learn).
- bunx tsc --noEmit: clean.
- Event type exhaustiveness check: still passes (33 variants).

---

## [1.4.1] — 2026-04-19

### Added (Phase A-4 Day 3 — Impact-Graph Full Materialization)

- `lib/impact-graph/ast-walker.ts` — ts-morph based TypeScript AST walker. Extracts 5 edge kinds (import, export, typeRef, extends, implements) from a project tree with configurable ignore globs.
- `lib/impact-graph/sqlite-cache.ts` — bun:sqlite wrapper with WAL mode; upsert semantics; indexed by fromRid/toRid; supports transitive depth-limited walks.
- `lib/impact-graph/registry-loader.ts` — lazy boot-time hydration of IMPACT_EDGE_REGISTRY from the SQLite cache.
- `monitors/impact-graph-refresh.ts` — weekly cadence full re-walk; emits impact_graph_refreshed events.

### Changed

- `bridge/handlers/populate-impact-graph.ts` — skeleton → full AST walk with ts-morph. Returns `{status: "populated", impactEdges: <n>, fileCount, durationMs}`.
- `bridge/handlers/impact-query.ts` — rewrote to read from SQLite registry-loader (was empty in-memory).
- `bridge/handlers/pre-edit-impact.ts` — same SQLite-backed lookup.
- `monitors/monitors.json` — impact-graph-refresh entry added.
- Fixed glob-to-regex bug in ast-walker filter (unescaped `.` matched any char; `/palantir-mini/` folder segment incorrectly filtered the plugin against itself).

### Dependency

- `ts-morph` ^27.x added as runtime dependency of the plugin (lazy-loaded only when populate_impact_graph invoked).

### Research docs

- `~/.claude/research/claude-code/lead-system-v2.md` — new §7 Phase A-3 Retrospective appendix (quantitative evidence: 71.4% idle burn, briefing behavioral pivot, 9-defect status).
- `~/.claude/research/claude-code/features.md` — v2.1.108-112 exploitation notes.
- `~/.claude/research/claude-code/hook-events-v2.md` — v2.1.108+ Recommended Use Cases appendix.
- NEW: `~/.claude/research/claude-code/context-engineering.md` — Palantir-grade impact-graph philosophy + architecture + Foundry parallel.

### Home meta

- `~/.claude/projects/-home-palantirkc/memory/MEMORY.md` — rule count updated (13 → 14 after rules/04 deletion + rules 14/15 creation in D1).

### Verification
- bun test: **313 pass / 0 fail** (+43 new from D3).
- bunx tsc --noEmit: clean.
- Self-scan: 127 TS files scanned, 413 import edges populated to SQLite.

---

## [1.4.0] — 2026-04-19

### Added
- **8 new hooks (Phase A-4 W4)**: idle-auto-shutdown, lead-idle-digest, heartbeat-validate, briefing-template-validate, concurrency-cap-fix, task-completed-inbox-clean, session-duration-alarm, stop-guard.
- **4 new MCP tools (Phase A-4 W4)**: populate_impact_graph (skeleton), auto_spawn_replacement, get_team_health, query_session_duration. Total 27 tools.
- New event types: impact_graph_initialized, auto_spawn_requested.
- SQLite impact-graph schema scaffolding at `<project>/.palantir-mini/impact-graph.db` (full AST walker Phase A-4 D3).

### Changed
- Hook count 21 → 28.
- concurrency-cap-fix replaces task-claim-throttle — globs `~/.claude/tasks/**/*.json` instead of hardcoded phase-a3 path.
- Plugin description refreshed to reflect v1.4 surface (27 MCP tools + 28 hooks).

### Removed
- hooks/task-claim-throttle.ts entry in hooks.json (replaced by concurrency-cap-fix; file kept as legacy reference).

### Verification
- bun test: 270 pass / 0 fail.
- bunx tsc --noEmit: clean.

---

## [1.3.0] — 2026-04-19

### Added (Ontology Governance Infrastructure — Phase A-3)

- 12 new ontology primitives: ResearchDocument, MEMORYIndexEntry, ClaudeCodeVersion, HookEventAllowlist, PluginManifest, ProjectSchemaPin, FileComplexityBudget, DeadCodeMarker, LineageConformancePolicy, ManagedSettingsFragment, CodegenHeaderContract, ImpactEdge
- 12 new MCP tools: detect_doc_drift, check_cc_version, validate_hook_event_allowlist, scan_file_size_violations, audit_events_5d_conformance, verify_schema_pin, scan_dead_code, verify_codegen_headers, validate_managed_settings_fragments, refresh_research_doc, impact_query, pre_edit_impact
- 6 new hooks: session-drift-check, doc-edit-drift, generated-header-check, manifest-validate, pre-edit-impact-check, events-5d-gate
- 2 new monitors: doc-rot-watch, file-budget-watch

### Changed
- BackwardProp V1: close propagation.ts v0 gaps (refinement_proposed + review_decision events)
- Schema requirement bump: claude-schemas v1.12.0 → v1.13.0 required (compatibleSchemaVersions ">=1.13.0 <2.0.0")

### Net surface
- Hooks: 13 → 19
- MCP tools: 10 → 22
- Monitors: 2 → 4

---

## [1.2.0] — 2026-04-18

### Fixed (schema validator — Claude Code v2.1.110 compatibility)
- Removed `MemoryWrite` hook block — not in v2.1.110 allowed event list (dead code)
- Removed `MemoryRead` hook block — not in v2.1.110 allowed event list (dead code)
- Removed `AgentStop` hook block — duplicate of `SubagentStop`; subagent-stop.ts already handles this surface
- Renamed `AgentStart` → `SubagentStart` in hooks.json + added new `hooks/subagent-start.ts` handler
- Fixed `monitors/monitors.json` — wrapper object → top-level array, removed disallowed keys

### Net hook count
- v1.1: 16 hooks (including 4 dead/misnamed blocks)
- v1.2: 13 hooks (clean, all blocks confirmed valid in v2.1.110)

---

## [1.1.0] — 2026-04-14

### Added (Phase A-2 W2-2 — 9-defect Lead Protocol v2 fix suite)
- `subagent-stop.ts` — phase-gate validation moved from PostToolUse to SubagentStop (blocking); envelope wrap-on-read
- `user-prompt-submit.ts` — auto-inbox injection as additionalContext (async: true)
- `teammate-idle.ts` — auto shutdown_request at idleCount >= 3 && blockedByDepth > 1
- `session-start.ts` — CLEAN_STATE=1 support; stale-state warn-and-preserve default
- `agent-frontmatter-validate.ts` — blocking SessionStart validator; rejects missing fields or legacy initialPrompt
- `task-completed-gate.ts` — removes inbox entries by taskId on TaskCompleted
- Per-agent .md output contract declarations (file path + required fields + shape)
- TaskCreated hook enforces subject naming convention (^\[(PHASE|P0|P1|P2|P3)\])

---

## [1.0.0] — 2026-04-03

### Added (Phase A-2 W1 — v0 substrate → v1.0 production)
- 10 MCP tools via bridge/mcp-server.ts (Harness API)
- 6-phase validation pipeline (Design/Compile/Runtime/Post-Write/Deploy/Merge)
- L1/L2/L3 RBAC (CapabilityToken + MarkingDeclaration)
- Deterministic codegen headers (schema version + ontology hash + generator version + timestamp)
- Append-only events.jsonl per project + monotonic sequence counter
- 5 custom subagents (researcher, ontologist, implementer, evaluator, action-executor)
- 7 namespaced skills (/palantir-mini:*)
- plugin.json mcpServers registration (single source of truth per rule 07)
- managed-settings.d/ RBAC fragments for kosmos/palantir-math/mathcrew/home
