---
title: Skill & Agent Audit — palantir-mini v1.5.0 Alignment
slug: skill-agent-audit-v1-5
fileClass: vision-audit
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: null, fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# Skill & Agent Audit — palantir-mini v1.5.0 Alignment

**Scope**: home-scope (`~/.claude/`), palantir-math (`~/palantir-math/.claude/`), mathcrew (`~/mathcrew/.claude/`)
**Reference baseline**: palantir-mini v1.5.0 released 2026-04-19 — 32 MCP tools, 24 pm-* skills, 28 hooks, 5 monitors, 5 plugin-shipped agents
**Audit date**: 2026-04-19
**Authority**: rule 06 §Granular agent definitions, rule 12 Lead Protocol v2 §Agent frontmatter standard, rule 13 Task Granularity
**Scan provenance** — inventory surveyed read-only; no source files modified. LOC counts via `wc -l`. Frontmatter extracted by `head -30`. Cross-refs validated via `grep -n`.
**Legacy path note**: this audit predates the 2026-04-20 research-library split. Any recommendation that names `~/.claude/research/palantir/...` should now be read as either `~/.claude/research/_archive/2026-04-20-palantir-consolidation/...` or a newer route under `palantir-developers/`, `palantir-foundry/`, or `palantir-vision/`.
**Legacy rule note**: this audit predates the current CORE rule map. Mentions of rule 05, 06, or 13 are historical evidence, not active routing authority. Use `~/.claude/rules/CORE.md` plus the current numbered rule files for live policy.

---

## Executive Summary

| Metric | Count |
|---|---|
| Non-plugin skills scanned | **13** (6 home + 5 palantir-math + 2 mathcrew) |
| Plugin skills baseline | **24** pm-* under `~/.claude/plugins/palantir-mini/skills/` |
| Non-plugin agents scanned | **27** (16 home + 8 palantir-math + 3 mathcrew) |
| Plugin agents baseline | **5** under `~/.claude/plugins/palantir-mini/agents/` |
| Retire candidates | **3** (`palantir-dispatch`, `lsp-audit` ref-broken, `ship` if not promoted) |
| Promote candidates | **2** (mathcrew `verify` cross-applies; `ship` → `pm-ship` replacement) |
| Split candidates | **2** (`orchestrate` 594 LOC, `palantir-math` 958 LOC) |
| Merge candidates | **1** (`palantir-math-workspace/`+`concept-math-workspace/` empty shells) |
| MCP-tool-wiring gaps | **9** skills/agents (4 non-plugin skills + 5 agents lack MCP wiring) |
| Frontmatter non-conformance (at audit) | 14 agents (revised to 6 in §Executive Summary revision below) |
| Frontmatter non-conformance (post-A-7 2026-04-20) | **0** — implementer model + 5 plugin mcpServers all resolved |
| LOC total non-plugin skills | **5,680** LOC (2,269 home + 2,946 math + 465 mathcrew) |
| LOC total plugin skills | **6,802** LOC across 24 pm-* |

**Reality check**: The home layer retains 6 legacy skills (orchestrate/ship/palantir-dispatch/palantir-walk/lsp-audit/tavily-cli) that predate v1.5.0's 24 pm-* surface. Four of the six (orchestrate/ship/palantir-dispatch) duplicate or overlap with pm-* equivalents; two (palantir-walk/tavily-cli) are genuinely complementary; one (lsp-audit) has a broken dependency reference to `~/.claude/rules/ontology-authority.md` (file does not exist). Project-level skills are domain-specific (math-problem-solving, 3D-scene-audit, runtime-verify) and remain justified — but should wire into the new v1.5.0 MCP substrate (pm_preamble, pm_retro_query, pm_learn_query, impact_query, detect_doc_drift).

---

## 1. Overlap with pm-* (Duplication)

| Project path | Skill name | LOC | pm-* equivalent (v1.5.0) | Overlap severity | Recommendation |
|---|---|---|---|---|---|
| `~/.claude/skills/ship/SKILL.md` | `ship` | 492 | `pm-ship` (753 LOC, W2d) — 21-step release workflow with verify_schema_pin + detect_doc_drift HARD GATE | HIGH — both ship PRs, both emit events, both run drift audits | **RETIRE** home skill; pm-ship is pan-project, uses the MCP substrate natively. Preserve the "Ontology-Driven semantic drift firewall" doctrine in a `~/.claude/research/palantir/ship-doctrine.md` note if durable. |
| `~/.claude/skills/palantir-dispatch/SKILL.md` | `palantir-dispatch` | 237 | NONE direct, but semantically subsumed by pm-office-hours (600 LOC) + Claude Code native skill-matching | MEDIUM — intent classification is Claude Code's native job via skill descriptions | **RETIRE**. Claude Code v2.1.110 matches skills on description triggers; a hand-rolled classifier is redundant. Current version routes `register`→`pm-ontology-register` and `scenario`→`mcp__palantir-mini__scenario_create` correctly, but the taxonomy is stale (no `investigate`, `review`, `retro`, `learn`, `ceo-review`, `devex-review`, `eng-review`, `cso` routes — all 8 new Sprint-12 intents). Rewriting to keep in sync with 24 pm-* > deleting and letting Claude's native matcher handle it. |
| `~/.claude/skills/orchestrate/SKILL.md` | `orchestrate` | 594 | Partial — `pm-autoplan` (628 LOC) is the chained-review orchestrator; no direct 1:1 | MEDIUM — orchestrate's 6-phase Lead Protocol v1 partially overlaps pm-autoplan's 3-phase pipeline but orchestrate is more ontology-native | **KEEP** but **REBADGE** as `pm-orchestrate` if/when palantir-mini plugin absorbs it. The 6-phase protocol (Phase 0-5 CHECK→INJECT→AUDIT→DECIDE→DECOMPOSE→EXECUTE→VALIDATE) is Lead-Protocol-v2-aligned and references 19 MCP tools — it is doing what pm-autoplan does NOT (full Ontology-Driven DAG decomposition with file ownership). Consider splitting per §3 below. |
| `~/.claude/skills/palantir-walk/SKILL.md` | `palantir-walk` | 574 | NONE | NONE | **KEEP**. Interactive ontology learning is not in pm-* scope; this is a user-facing learning tool, not a governance operation. |
| `~/.claude/skills/lsp-audit/SKILL.md` | `lsp-audit` | 296 | Partial — `scan_dead_code` MCP tool (v1.3) covers dead-code fraction; `impact_query` covers boundary rules; `pre_edit_impact` covers cross-module analysis | MEDIUM — 30-40% of lsp-audit's scope now has an MCP analog | **KEEP but REWIRE**. Retain LSP-specific checks (goToDefinition, incomingCalls, prepareCallHierarchy — not yet in MCP); delegate dead-code/circular-import/boundary checks to `scan_dead_code` + `impact_query` MCPs. Fix broken ref to `~/.claude/rules/ontology-authority.md` (file does not exist — rules/ has 01-13 but no such filename). |
| `~/.claude/skills/tavily-cli/SKILL.md` | `tavily-cli` | 76 (symlink) | NONE | NONE | **KEEP**. Tavily web-search is outside palantir-mini scope; symlink to `~/.agents/skills/tavily-cli` is legitimate. |
| `~/palantir-math/.claude/skills/palantir-math/SKILL.md` | `palantir-math` | 958 | NONE | NONE (domain-specific) | **KEEP** but **REWIRE** §2 below. D/L/A/LEARN math problem solver is palantir-math-domain and not a pm-* target. |
| `~/palantir-math/.claude/skills/concept-math/SKILL.md` | `concept-math` | 641 | NONE | NONE | **KEEP**. Atomic concept explainer with Teaching Narrative integration — domain-specific. |
| `~/palantir-math/.claude/skills/sequencer-math/SKILL.md` | `sequencer-math` | 628 | NONE | NONE | **KEEP**. seq-data.json compiler — palantir-math internal pipeline. |
| `~/palantir-math/.claude/skills/sequencer-conc/SKILL.md` | `sequencer-conc` | 557 | NONE | NONE | **KEEP**. Concept-chain sibling of sequencer-math. |
| `~/palantir-math/.claude/skills/vc-scenario/SKILL.md` | `vc-scenario` | 162 | NONE | NONE | **KEEP**. VisualComponentV2 scenario generator — palantir-math UI authoring. |
| `~/mathcrew/.claude/skills/3d-scene-audit/SKILL.md` | `3d-scene-audit` | 325 | NONE | NONE | **KEEP**. Three.js scene graph audit + physics spatial safety; mathcrew-domain. |
| `~/mathcrew/.claude/skills/mathcrew-runtime-verify/SKILL.md` | `mathcrew-verify` | 140 | Partial — `pm-verify` (60 LOC) runs Design+Compile+Runtime+Post-Write phases but does NOT hit dev-server / Playwright / runtime console | LOW — both named "verify" but scopes differ | **KEEP but RENAME** to `mathcrew-runtime-verify` to clarify. pm-verify is ontology-schema validation; mathcrew-verify is live-app runtime validation (dev-server health + Playwright MCP browser check). Cross-reference them in both SKILL.md descriptions to prevent confusion. |
| `~/palantir-math/.claude/skills/concept-math-workspace/` | (no SKILL.md) | 0 | n/a | NO SKILL CONTENT — empty shell with evals/ + iteration-1/ subdirs | **PRUNE** — this is workspace scratch, not a declarable skill. Move under `~/palantir-math/evals/` if kept. |
| `~/palantir-math/.claude/skills/palantir-math-workspace/` | (no SKILL.md) | 0 | n/a | Same as above | **PRUNE** — workspace scratch. |

**Retire candidates**: `ship` (→pm-ship), `palantir-dispatch` (→Claude native matching)
**Consolidate candidates**: `palantir-math-workspace/` and `concept-math-workspace/` → both should move out of the skill tree

---

## 2. MCP Tool Wiring Gaps

The v1.5.0 substrate exposes 32 MCP tools. Legacy skills and agents should delegate heavy operations to MCP (in-process, 5-10ms) instead of bash subprocess (300-500ms). Specific skill-level gaps:

| Path | Skill/Agent | Current tool state | Recommended MCP additions | Rationale |
|---|---|---|---|---|
| `~/.claude/skills/ship/SKILL.md` | `ship` | Uses `replay_lineage`, `emit_event`, `codegen_trigger`, `get_ontology` (8 call sites) — NOT declared in frontmatter | Add `verify_schema_pin`, `detect_doc_drift`, `get_team_health` to invocation. Declare `allowed-tools` in frontmatter. | ship Phase 3 semantic drift audit exactly matches `detect_doc_drift`'s purpose. Phase 6 verify-before-merge requires `verify_schema_pin` (matches pm-ship Step 0 HARD GATE). Missing frontmatter means Claude Code permission layer cannot pre-authorize the MCP calls. |
| `~/.claude/skills/orchestrate/SKILL.md` | `orchestrate` | Uses `replay_lineage`, `emit_event`, `apply_edit_function`, `commit_edits`, `capability_token_check`, `get_ontology` (19 call sites) — NOT declared in frontmatter | Add `pm_preamble` at Phase 0 INJECT, `pm_learn_query` at Phase 1, `impact_query`/`pre_edit_impact` at Phase 4 DECOMPOSE, `pm_retro_query` at Phase 5 VALIDATE | `pm_preamble` was designed exactly to replace bash-based context-injection chains. `impact_query` gives the 6-phase DAG task decomposer ground-truth file-dependency edges (SQLite impact-graph). Not wiring it is leaving 5-10× perf on the table. Declare `allowed-tools` (missing `argument-hint: "task description"` implies frontmatter partial). |
| `~/.claude/skills/palantir-dispatch/SKILL.md` | `palantir-dispatch` | Uses `emit_event`, `scenario_create` (3 call sites) | If kept (see §1): add `pm_preamble` for project context, update routing table for 8 new Sprint-12 intents. | Current intent taxonomy has 7 routes; post-1.5.0 the real intent surface is 24 pm-* + 6 home skills. Dispatch is stale. |
| `~/.claude/skills/lsp-audit/SKILL.md` | `lsp-audit` | Uses LSP (not MCP), Grep | Add `mcp__palantir-mini__scan_dead_code` (replaces ~40% of LSP work), `mcp__palantir-mini__impact_query` (boundary checks via SQLite), `mcp__palantir-mini__pre_edit_impact` (pre-edit blast-radius) | LSP is still needed for call-hierarchy, but dead-code + boundary is now cheaper via SQLite impact-graph. `scan_dead_code` gives marker-based dead-code detection. |
| `~/.claude/skills/palantir-walk/SKILL.md` | `palantir-walk` | Declares no tools; reads filesystem via Read/Grep | None required (pure learning-mode skill) | Acceptable as-is; walk is a teaching tool, not a governance action. |
| `~/palantir-math/.claude/skills/palantir-math/SKILL.md` | `palantir-math` | No tools/allowed-tools declared in frontmatter; runs as open-ended | Add `mcp__palantir-mini__pm_preamble` at session entry, `mcp__palantir-mini__pm_learn_query` for past-problem pattern lookup, `mcp__palantir-mini__emit_event` for D/L/A/LEARN loop lineage | The D/L/A/LEARN 5-dim Decision Lineage is the event taxonomy that palantir-mini v1.4.2 added (`learning_captured`). Not emitting it means no replay via `pm-replay`/`pm-recap` for problem-solving sessions. |
| `~/palantir-math/.claude/skills/concept-math/SKILL.md` | `concept-math` | No tools declared | Add `mcp__palantir-mini__pm_learn_query` (prior concept explanations), `mcp__palantir-mini__emit_event` (learning_captured) | Same reasoning as palantir-math skill — concept lineage should flow through events.jsonl. |
| `~/mathcrew/.claude/skills/3d-scene-audit/SKILL.md` | `3d-scene-audit` | No tools declared in frontmatter; uses Read/Grep/threejs-devtools-mcp | Add `mcp__palantir-mini__detect_doc_drift` for declared-vs-actual scene-spec drift detection (analogous to ontology drift), `mcp__palantir-mini__emit_event` for audit_completed lineage | 3d-scene-audit is doing structural-vs-runtime drift detection — the same pattern as detect_doc_drift, applied to a different axis (scene graph). Either reuse or declare a sibling drift path. |
| `~/mathcrew/.claude/skills/mathcrew-runtime-verify/SKILL.md` | `mathcrew-runtime-verify` | Uses bun/curl/Playwright MCP; no palantir-mini MCP | Add `mcp__palantir-mini__emit_event` (runtime_verified) — optional: record the verification outcome in events.jsonl for retro aggregation. | Runtime verification outcomes are valuable for pm-retro/pm-learn aggregation. |
| `~/.claude/agents/researcher.md` | researcher agent | Has WebFetch, WebSearch, scrapling suite, LSP | Already wired; no pm-* MCP needed (research agent is deliberately generic) | Acceptable. |
| `~/.claude/agents/docs-researcher.md` | docs-researcher | Has WebFetch, WebSearch, scrapling suite, LSP, Write/Edit | Consider adding `mcp__palantir-mini__refresh_research_doc` for staleness refresh | v1.3 added `refresh_research_doc` specifically for research docs; docs-researcher agent is the natural consumer. |
| `~/.claude/agents/verifier-correctness.md` | verifier-correctness | Has Read, Glob, Grep, Bash, LSP | Add `mcp__palantir-mini__audit_events_5d_conformance` for 5-dim envelope audits | v1.3 added 5d-conformance tool; verifier-correctness is the natural caller. |
| `~/.claude/agents/verifier-adversarial.md` | verifier-adversarial | Has Read, Glob, Grep, Bash, LSP | Add `mcp__palantir-mini__impact_query` for blast-radius examination | Adversarial verification needs to know "if this changes, what else breaks" — impact_query answers that via SQLite impact-graph. |
| `~/.claude/agents/ontology-steward.md` | ontology-steward | Has Read, Write, Edit, Glob, Grep, Bash, LSP | Add `mcp__palantir-mini__verify_schema_pin`, `mcp__palantir-mini__validate_managed_settings_fragments`, `mcp__palantir-mini__verify_codegen_headers` | ontology-steward owns schema versioning (rule 08) — these three MCP tools are exactly the schema-validation surface. |
| `~/.claude/agents/hook-builder.md` | hook-builder | Has Read, Write, Edit, Glob, Grep, Bash, LSP | Add `mcp__palantir-mini__validate_hook_event_allowlist` | Hook builder authors the very hooks that emit events — should validate event allowlist at authoring time. |
| `~/.claude/agents/plugin-maintainer.md` | plugin-maintainer | Has Read, Write, Edit, Glob, Grep, Bash, LSP | Add `mcp__palantir-mini__validate_managed_settings_fragments`, `mcp__palantir-mini__check_cc_version` | plugin-maintainer owns RBAC fragment management — these MCPs are its declared work. |
| `~/.claude/agents/verifier-correctness.md` + `verifier-adversarial.md` | both | Missing `mcp__palantir-mini__audit_events_5d_conformance` | Add both | Correctness verifies the lineage envelope; adversarial verifies the edge cases that envelope misses. |
| `~/.claude/agents/protocol-designer.md` | protocol-designer | Read, Write, Edit, Glob, Grep, Bash | None required — protocol-designer writes rule files only; intentional minimal surface. | Acceptable as-is. |

**Summary of MCP wiring gaps**: 4 non-plugin skills (ship, orchestrate, palantir-dispatch, lsp-audit) use MCP calls in body but do not declare them in frontmatter — a Claude Code permission-layer anti-pattern. 5 home agents (ontology-steward, hook-builder, plugin-maintainer, docs-researcher, verifier-*) could benefit from 1-3 MCP additions each.

---

## 3. Granularity — Split / Merge

| Path | Skill | LOC | Action | Justification |
|---|---|---|---|---|
| `~/.claude/skills/orchestrate/SKILL.md` | orchestrate | **594** | **KEEP single** — do NOT split | Borderline. 594 LOC covers 7 phases (Pre-protocol detection + 0-5). Splitting would break the DAG continuity — each phase depends on prior phase state (events.jsonl lineage). The phases are a pipeline, not independent skills. Rule 13 applies to task granularity, not skill granularity. Keep. |
| `~/.claude/skills/ship/SKILL.md` | ship | **492** | **RETIRE** (see §1) | Subsumed by pm-ship (753 LOC). |
| `~/.claude/skills/palantir-walk/SKILL.md` | palantir-walk | **574** | **SPLIT** into `palantir-walk-build` (Mode A small-block) + `palantir-walk-analyze` (Mode B project analysis) | Two fundamentally different modes with different user intents, different inputs (domain-name vs. project+file), different outputs (scaffold vs. design-rationale). Modes have zero code path overlap. Rule 13 §"Each task owns exactly 1 primary file path" aligns with "each skill owns exactly 1 user intent." Current 574-LOC skill tries to be both a learning tool AND an analysis tool — confusing. |
| `~/palantir-math/.claude/skills/palantir-math/SKILL.md` | palantir-math | **958** | **SPLIT** into `palantir-math-expert` (Expert default mode) + `palantir-math-student` (Student 시행착오 simulation) + `palantir-math-walk` (Deep Path Walk) | Three modes with fundamentally different outputs: Expert→optimal solve (1 solution), Student→simulated trial-error (multiple failed attempts), Walk→parallel comparison (multiple full D/L/A). Three distinct invocation intents — skill description currently says "explicit invocation only" as a workaround. Split would enable Claude's native skill matcher. 958 LOC single-skill is the largest in the project tree. |
| `~/palantir-math/.claude/skills/concept-math/SKILL.md` | concept-math | **641** | **KEEP single** | One coherent purpose (atomic concept → concept.md with Teaching Narrative). Teaching Narrative expansion added bulk, not concept-divergence. |
| `~/palantir-math/.claude/skills/sequencer-math/SKILL.md` | sequencer-math | **628** | **KEEP single** | One coherent compiler with one output (seq-data.json). |
| `~/palantir-math/.claude/skills/sequencer-conc/SKILL.md` | sequencer-conc | **557** | **KEEP single** | Concept-chain sibling of sequencer-math; same structure, different input. |
| `~/palantir-math/.claude/skills/vc-scenario/SKILL.md` | vc-scenario | **162** | **KEEP single** | Narrow scope, coherent. |
| `~/mathcrew/.claude/skills/3d-scene-audit/SKILL.md` | 3d-scene-audit | **325** | **KEEP single** | Two-layer hybrid (static + runtime) is architecturally a single audit — splitting would break the diff-against-declared-spec contract. |
| `~/mathcrew/.claude/skills/mathcrew-runtime-verify/SKILL.md` | mathcrew-runtime-verify | **140** | **KEEP single** | Narrow, 5-layer pipeline, coherent scope. |
| `~/.claude/skills/lsp-audit/SKILL.md` | lsp-audit | **296** | **KEEP but REWIRE** per §2 | Single-project code-integrity audit; coherent scope. Boundary check + type safety + interaction schema sit inside one tsc/LSP session — splitting would require re-enumerating files N times. |
| `~/.claude/skills/palantir-dispatch/SKILL.md` | palantir-dispatch | 237 | **RETIRE** (see §1) | Claude native skill matcher is the replacement. |

**Split candidates (2)**: `palantir-walk` (Mode A vs. Mode B), `palantir-math` (Expert vs. Student vs. Walk).
**Merge candidates (0)**: no cases of two skills that should be one.
**Prune empty shells**: `palantir-math-workspace/`, `concept-math-workspace/`.

---

## 4. Legacy Delete Candidates

| Path | Skill/Agent | Reason | Risk | Recommendation |
|---|---|---|---|---|
| `~/.claude/skills/lsp-audit/SKILL.md` line 116 | `lsp-audit` | References non-existent file `~/.claude/rules/ontology-authority.md` (not in `~/.claude/rules/` directory — only 01-13 exist). Also line 169 refs `~/.claude/schemas/interaction/` which DOES exist but tangentially. | HIGH — skill is broken but not actively failing (reads are best-effort) | **FIX the broken ref** before retire. Replace with the actual rule `~/.claude/rules/01-ontology-first-core.md` or remove the boundary-rules section entirely if ontology-authority was a pre-v1.0 rule. Do NOT delete the skill — LSP dead-code audit remains valuable. |
| `~/.claude/skills/ship/SKILL.md` | `ship` | Subsumed by pm-ship (see §1) | MEDIUM — home-scope ship still used in CLAUDE.md flows | **RETIRE after transition window**. Update all rule-files, CLAUDE.md, and BROWSE.md entries to point at `/palantir-mini:pm-ship`. Deprecation period: 2 sprints. |
| `~/.claude/skills/palantir-dispatch/SKILL.md` | `palantir-dispatch` | Stale intent taxonomy (lacks 8 Sprint-12 intents); redundant with Claude native skill matching | LOW — seldom invoked directly | **RETIRE**. Document the taxonomy once in `~/.claude/research/palantir/skill-routing.md` if durable knowledge worth preserving. |
| `~/palantir-math/.claude/skills/palantir-math-workspace/` | n/a — empty shell | No SKILL.md; contains evals/ and iteration-1/ | NONE | **PRUNE** — move to `~/palantir-math/evals/` or a non-skill location. |
| `~/palantir-math/.claude/skills/concept-math-workspace/` | n/a — empty shell | No SKILL.md; contains evals/ and iteration-1/ | NONE | **PRUNE** — same. |
| `~/.claude/skills/trigger-eval-aggregate.json` | not a skill (stale JSON trigger from pre-v2.1.91) | 331 bytes; no SKILL.md, no evals | NONE | **PRUNE** — orphan file. |

**Rule-10 violation check**: Scanned all 13 non-plugin skills for any shadow log writes. **NONE found**. All skills that emit events route through `mcp__palantir-mini__emit_event` correctly (rule 10 compliant). The `ship` skill explicitly delegates PR body generation to `replay_lineage`, not a manual lineage file — correct.

**No skills contradict palantir-mini v1.5.0 substrate directly.** The overlaps are semantic (same-job-different-API), not architectural (competing truth sources).

---

## 5. New Skill Proposals

Proposed additions, ordered by impact:

### 5.1 `pm-orchestrate` (port from home skill into plugin)
- **Rationale**: Home-scope `orchestrate` (594 LOC, Lead Protocol v1) is strong ontology-driven 6-phase pipeline. It uses 19 MCP call sites. Moving it into plugin-scope brings it under v1.5.0 governance.
- **MCP wiring**: Keep existing `replay_lineage` + `emit_event` + `apply_edit_function` + `commit_edits` + `capability_token_check` + `get_ontology`. Add `pm_preamble` (Phase 0 session context), `impact_query` + `pre_edit_impact` (Phase 4 DAG decomposition), `pm_retro_query` (Phase 5 validation).
- **Model policy**: `model: opus` (Lead role).
- **Name collision risk**: home skill gets retired simultaneously to avoid skill-resolution drift (rule 05).

### 5.2 `pm-lsp-audit` (port lsp-audit into plugin)
- **Rationale**: Same as 5.1 — lift the existing skill into plugin, fix broken ref, wire to `scan_dead_code` + `impact_query` MCPs.
- **MCP wiring**: `scan_dead_code`, `impact_query`, `pre_edit_impact`, `emit_event`.
- **Model policy**: `model: sonnet` (implementer-style audit).

### 5.3 `pm-browse-nav` (placeholder for palantir-browse)
- **Rationale**: palantir-mini v1.5.0 CHANGELOG (line 73) declares "Browse daemon — separate `palantir-browse` plugin (v0.1.0 scaffold, not in this release)". Currently no skill exists to navigate the palantir-browse scaffold when it lands.
- **Defer** until palantir-browse v0.1.0 exists. Document as a placeholder here.

### 5.4 `math-problem-author` (palantir-math wrapper)
- **Rationale**: palantir-math has 5 skills (palantir-math, concept-math, sequencer-math, sequencer-conc, vc-scenario) — the problem-authoring pipeline wraps 3 of them: `/palantir-math` → `/sequencer-math` → `/vc-scenario` → ship. User says "author problem 수능 14번" and gets the full pipeline. Currently user invokes each step manually.
- **MCP wiring**: `pm_preamble`, `apply_edit_function`, `commit_edits` (ontology-editor) via `changeContracts`, `verify_schema_pin` (check peerDep), `detect_doc_drift` (check problem-manifest staleness), `emit_event` (`math_problem_authored`).
- **Model policy**: `model: opus` (orchestrates 3 sub-skills + ontology state).
- **Flag for Lead decision** — worth the maintenance cost only if authoring is frequent.

### 5.5 `mc-beat-review` (mathcrew wrapper)
- **Rationale**: mathcrew has BinaryDecisionTheater + scene-beat-meta-framework (rule 01/02 mathcrew). A "beat review" wrapper would invoke `pm-review` (diff review) + `3d-scene-audit` (spatial correctness) + `mathcrew-runtime-verify` (runtime sanity) + spatial-support audit in parallel. Currently user invokes each manually.
- **MCP wiring**: `pm_preamble`, `detect_doc_drift` (beat ↔ teaching config), `impact_query` (which beats ref the changed file), `emit_event` (`beat_reviewed`).
- **Model policy**: `model: opus` (parallel audit orchestration).

### 5.6 `pm-ontology-shift` (shared-core migration helper)
- **Rationale**: Home repo has `~/ontology/shared-core/` (v1.0 rebuild 2026-04-17). Consumer projects still carry migration work (`palantir-math` peerDep v1.0.0 — done; `mathcrew` peerDep v1.0.0 — done; `kosmos` pending). A skill that migrates a consumer project's imports from direct `~/.claude/schemas/` to `~/ontology/shared-core/` would standardize that work.
- **MCP wiring**: `verify_schema_pin`, `validate_managed_settings_fragments`, `pre_edit_impact`, `codegen_trigger`, `emit_event` (`schema_migrated`).
- **Model policy**: `model: sonnet` (implementer).

### 5.7 `pm-codex-cross` (Codex second-opinion, deferred)
- **Rationale**: User may want a Codex / Gemini second-opinion on a plan or review. palantir-mini v1.5.0 CHANGELOG (line 40) states "Gstack's Codex dual-voice pattern **replaced** with generic Agent-tool invocation." Currently no dedicated skill.
- **Defer** — flag for Lead decision. Rule 04 runtime-boundary says "Claude, Codex, Gemini...are independent native runtimes." Creating a Claude-native cross-runtime skill violates rule 04. Better: document the Agent-tool-invocation pattern in `~/.claude/research/claude-code/cross-runtime-second-opinion.md` if durable.

### 5.8 `pm-doc-drift-auto` (proactive drift monitor)
- **Rationale**: `detect_doc_drift` MCP tool exists (v1.3). No skill proactively runs it on a cadence. A skill that runs drift detection after every `pm-ship` and flags findings to `events.jsonl` would close the loop.
- **MCP wiring**: `detect_doc_drift`, `refresh_research_doc`, `emit_event` (`drift_auto_detected`).
- **Model policy**: `model: sonnet`.
- **Redundancy check**: `monitors/doc-rot-watch.ts` already does this on a cadence. Proposing a skill is partially redundant with the monitor. Flag for Lead decision — skill-form vs. monitor-form depends on user-invocability preference.

**Priority ordering**: 5.1 (pm-orchestrate) and 5.2 (pm-lsp-audit) are low-cost wins. 5.5 (mc-beat-review) and 5.4 (math-problem-author) are moderate-impact. 5.3/5.6/5.7/5.8 flag-for-Lead-decision.

---

## 6. Agent Frontmatter Audit

Rule 12 Lead Protocol v2 §Agent frontmatter standard REQUIRES: `name`, `description`, `tools`, `model`. RECOMMENDED: `maxTurns`, `memory`, `disallowedTools` (verifiers). FORBIDDEN: `initialPrompt`.

### Home agents (`~/.claude/agents/` — 14 total .md files + BROWSE.md + INDEX.md)

| Path | Agent | name | desc | tools | model | maxTurns | memory | Forbidden fields | Conformance | Rec |
|---|---|---|---|---|---|---|---|---|---|---|
| `~/.claude/agents/doc-writer.md` | doc-writer | ✓ | ✓ | ✓ | sonnet | 30 | user | none | **PASS** | keep |
| `~/.claude/agents/docs-researcher.md` | docs-researcher | ✓ | ✓ | ✓ | opus | 40 | user | none | **PASS** | keep |
| `~/.claude/agents/home-implementer.md` | home-implementer | ✓ | ✓ | ✓ | sonnet | 35 | user | none | **PASS** | keep |
| `~/.claude/agents/hook-builder.md` | hook-builder | ✓ | ✓ | ✓ | sonnet | 35 | user | none | **PASS** | keep |
| `~/.claude/agents/implementer.md` | implementer | ✓ | ✓ | ✓ | sonnet | 30 | user | none | **PASS** (was FAIL pre-A-7; fixed 2026-04-20, see P0 §below) | keep |
| `~/.claude/agents/kosmos-implementer.md` | kosmos-implementer | ✓ | ✓ | ✓ | sonnet | 40 | user | none | **PASS** | keep |
| `~/.claude/agents/mc-implementer.md` | mc-implementer | ✓ | ✓ | ✓ | sonnet | 40 | user | none | **PASS** | keep |
| `~/.claude/agents/ontology-steward.md` | ontology-steward | ✓ | ✓ | ✓ | opus | 40 | user | none | **PASS** | keep (ontology-steward is research-grade; opus is policy-aligned) |
| `~/.claude/agents/plugin-maintainer.md` | plugin-maintainer | ✓ | ✓ | ✓ | sonnet | 30 | user | none | **PASS** | keep |
| `~/.claude/agents/pm-implementer.md` | pm-implementer | ✓ | ✓ | ✓ | sonnet | 35 | user | none | **PASS** | keep |
| `~/.claude/agents/protocol-designer.md` | protocol-designer | ✓ | ✓ | ✓ | sonnet | 25 | user | none | **PASS** | keep |
| `~/.claude/agents/researcher.md` | researcher | ✓ | ✓ | ✓ (+disallowedTools Write/Edit/NotebookEdit) | opus | 30 | user | none | **PASS** | keep |
| `~/.claude/agents/verifier-correctness.md` | verifier-correctness | ✓ | ✓ | ✓ (+disallowedTools Write/Edit/NotebookEdit) | opus | 30 | user | none | **PASS** | keep |
| `~/.claude/agents/verifier-adversarial.md` | verifier-adversarial | ✓ | ✓ | ✓ (+disallowedTools Write/Edit/NotebookEdit) | opus | 30 | user | none | **PASS** | keep |

**Home agents: 14 PASS / 0 FAIL** (post-A-7; was 13 PASS / 1 FAIL pre-2026-04-20).

### palantir-math agents (`~/palantir-math/.claude/agents/` — 8 agents)

| Path | Agent | name | desc | tools | model | maxTurns | memory | Forbidden | Conformance | Rec |
|---|---|---|---|---|---|---|---|---|---|---|
| `docs-writer.md` | docs-writer | ✓ | ✓ | ✓ (YAML list form) | sonnet | 30 | project | none | **PASS** | keep |
| `lib-builder.md` | lib-builder | ✓ | ✓ | ✓ (+ mcp__palantir-mini__emit_event, get_ontology) | sonnet | 40 | project | none | **PASS** | keep — uses MCP tools correctly |
| `llm-judge.md` | llm-judge | ✓ | ✓ | ✓ (+replay_lineage) + disallowedTools Edit/Write/NotebookEdit | opus | 20 | project | none | **PASS** | keep — opus for verifier role is rule 12 aligned |
| `ontology-editor.md` | ontology-editor | ✓ | ✓ | ✓ (+apply_edit_function, commit_edits) | sonnet | 40 | project | none | **PASS** | keep — commit_edits via ontology-editor matches plugin action-executor pattern |
| `presenter-integrator.md` | presenter-integrator | ✓ | ✓ | ✓ | sonnet | 40 | project | none | **PASS** | keep |
| `runtime-refactorer.md` | runtime-refactorer | ✓ | ✓ | ✓ | sonnet | 40 | project | none + `isolation: worktree` (not rule-12 forbidden) | **PASS** | keep — worktree isolation is acceptable enhancement |
| `ui-builder.md` | ui-builder | ✓ | ✓ | ✓ | sonnet | 40 | project | none | **PASS** | keep |
| `vc-scenario-generator.md` | vc-scenario-generator | ✓ | ✓ | ✓ (inline form `tools: Read, Grep, Glob, Bash, Write, Edit`) | sonnet | 30 | project | none | **PASS** | keep — inline comma form is valid per agent-frontmatter-validate hook allowlist |

**palantir-math agents: 8 PASS / 0 FAIL**.

### mathcrew agents (`~/mathcrew/.claude/agents/` — 3 agents)

| Path | Agent | name | desc | tools | model | maxTurns | memory | Forbidden | Conformance | Rec |
|---|---|---|---|---|---|---|---|---|---|---|
| `implementer.md` | implementer | ✓ | ✓ | ✓ (+ scoped Bash patterns + mcp__palantir-mini__get_ontology/emit_event) | sonnet | 30 | project | none | **PASS** | keep — Bash scoping is correct use of permission-rule format |
| `pedagogy-expert.md` | pedagogy-expert | ✓ | ✓ | ✓ | sonnet | 30 | project | none | **PASS** | keep |
| `theater-expert.md` | theater-expert | ✓ | ✓ | ✓ | sonnet | 30 | project | none | **PASS** | keep |

**mathcrew agents: 3 PASS / 0 FAIL**.

### Plugin agents (`~/.claude/plugins/palantir-mini/agents/` — 5 agents) — reference baseline

| Agent | name | desc | tools | model | maxTurns | memory | Forbidden | Conformance |
|---|---|---|---|---|---|---|---|---|
| `action-executor.md` | ✓ | ✓ | ✓ (+disallowedTools NotebookEdit) | sonnet | 8 | project | none + `mcpServers` (note: plugin-shipped agents should NOT declare mcpServers per rule 12 §plugin-shipped caveats — silently ignored; not a fail per current enforcement, but stylistically non-conformant) | **PASS-with-note** |
| `change-auditor.md` | ✓ | ✓ | ✓ (+disallowedTools Write/Edit/MultiEdit/NotebookEdit) | sonnet | 6 | project | mcpServers (same note) | **PASS-with-note** |
| `codegen-runner.md` | ✓ | ✓ | ✓ (+disallowedTools NotebookEdit) | sonnet | 10 | project | mcpServers (same note) | **PASS-with-note** |
| `ontology-verifier.md` | ✓ | ✓ | ✓ (+disallowedTools Write/Edit/MultiEdit/NotebookEdit) | opus | 8 | project | mcpServers (same note) | **PASS-with-note** |
| `propagation-tracer.md` | ✓ | ✓ | ✓ (+disallowedTools Write/Edit/MultiEdit/NotebookEdit) | opus | 10 | project | mcpServers (same note) | **PASS-with-note** |

**Plugin agents: 5 PASS (post-A-7)** — previously 5 PASS-with-note for redundant `mcpServers: - palantir-mini`; the field was stripped 2026-04-20 in Phase A-7 O3f (palantir-mini v1.5.2). All plugin agents now align with rule 12 §3.3 canonical form (mcpServers inherited from plugin manifest).

### Summary of agent audit

- **Total agents**: 27 non-plugin + 5 plugin = **32**
- **PASS**: 24 non-plugin + 5 plugin (with note) = **29**
- **FAIL**: 0 (was 1 pre-A-7 — `~/.claude/agents/implementer.md` fixed 2026-04-20)
- **No `initialPrompt`** in any agent (rule 12 §6 clean — good)
- **Redundant field**: 5 plugin agents declare `mcpServers: - palantir-mini` (rule 12 §3.3 caveat — silently ignored)

**Agent frontmatter non-conformance count**: 0 blockers + 0 style issues = **0 total needing adjustment** (post-A-7). Pre-A-7 count was 1 blocker (implementer model) + 5 style issues (plugin mcpServers redundancy) = 6 total. Both tranches resolved 2026-04-20 in Phase A-7 O3a + O3f.

Updating §Executive Summary count: `Frontmatter non-conformance = 6` (not 14 — initial estimate was high).

---

## 7. Cross-Project Promotion Candidates

### Skills that should be promoted to home-scope

| Current project | Skill | Reason to promote |
|---|---|---|
| None obvious | — | No project-local skill demonstrably applies equally to both palantir-math AND mathcrew. The two projects have distinct domain languages (math-problem-solving vs. 3D-scene-authoring) — no cross-applies. |

### Skills that leaked to home but should be project-local

| Current home path | Skill | Is project-specific because | Recommendation |
|---|---|---|---|
| `~/.claude/skills/palantir-walk/SKILL.md` | `palantir-walk` | Trigger description names `palantir-math`, `mathcrew`, `~/palantir-math/ontology/`, `~/mathcrew/ontology/`. Mode B explicitly walks THESE two projects' ontology code. | **KEEP in home-scope** — it IS cross-project in the sense that the walk tool needs access to multiple projects. But the project paths are hardcoded. If a third project joins (e.g. kosmos), update palantir-walk. **Not a leak** per se — the skill's scope (home) matches its audience (cross-project ontology learner). |
| `~/.claude/skills/lsp-audit/SKILL.md` | `lsp-audit` | Works on ANY TypeScript project but references `convex/`, `src/`, `features/*/hooks/` paths that are palantir-math-specific. | **KEEP in home-scope** — the skill is generic TypeScript analysis; the boundary rules reference `~/.claude/rules/` which IS home-scope. But the Phase 2 boundary table ("convex/ → src/") is palantir-math-only. Add per-project boundary-rule-sources so other projects can use it too. |

### Agents that should promote home → project, OR project → home

| Current path | Agent | Cross-applies? | Recommendation |
|---|---|---|---|
| `~/.claude/agents/implementer.md` | implementer | Generic, should be home-scope. | Keep home; already correct scope. (After model fix per §6.) |
| `~/.claude/agents/pm-implementer.md` | pm-implementer | Named after palantir-math (`pm-*`) but scope-limited to `.claude/` subtree | Keep home-scope — it's a meta-agent that edits `.claude/` config for palantir-math. Home is the correct layer. |
| `~/.claude/agents/mc-implementer.md` | mc-implementer | Named after mathcrew, scope-limited to `.claude/` | Keep home-scope — same reasoning. |
| `~/.claude/agents/kosmos-implementer.md` | kosmos-implementer | Named after kosmos, scope-limited to `.claude/` | Keep home-scope — same reasoning. |
| `~/palantir-math/.claude/agents/docs-writer.md` + `~/.claude/agents/doc-writer.md` | **name collision** (singular vs. plural) | Both exist; both sonnet; both write docs. palantir-math version focuses on ontology/BEHAVIOR.md; home version focuses on `~/.claude/research/claude-code/` | Not a duplication — **disjoint scopes**. But **rename** to be more distinct: `~/.claude/agents/research-doc-writer.md` (home) and `~/palantir-math/.claude/agents/palantir-math-docs-writer.md` (project) to avoid user confusion. Flag for Lead decision. |
| `~/palantir-math/.claude/agents/llm-judge.md` | llm-judge | Used by palantir-math orchestrate Phase 6; could apply to any Ontology-Driven project | **Flag for Lead decision** — promoting to home-scope makes it reusable by mathcrew and kosmos; leaving it project-scope preserves palantir-math's rule-05 palantir-mini-integration tie. Neutral on balance. |

**Promotion actions**: 0 skills, 0 agents *must* move. 2 skills (palantir-walk, lsp-audit) have project-specific paths baked in that could be parameterized but work as-is. 1 agent naming conflict (docs-writer vs doc-writer) worth renaming for clarity.

---

## Recommendations (prioritized)

### P0 — Blocking (rule-12 violation)

1. **Fix `~/.claude/agents/implementer.md` model policy**: change `model: opus` → `model: sonnet` per rule 12 §Model policy. Generic implementers are Sonnet. If the user genuinely wants Opus-grade implementers, rename to `lead-implementer` and document the rationale. (Single edit, high impact — this is the one blocker.) **[APPLIED 2026-04-20 — Phase A-7 O3a; verified `model: sonnet` on disk. Note: `.claude/agents/` is gitignored so no commit footprint — change was applied in a prior session and persisted in local file. Audit row in §6 table above still shows FAIL and should be refreshed on next audit pass.]**

### P1 — High-impact, low-cost wins

2. **Fix broken ref in `~/.claude/skills/lsp-audit/SKILL.md` line 116** (`~/.claude/rules/ontology-authority.md` does not exist). Replace with `~/.claude/rules/01-ontology-first-core.md` or remove the boundary-rules section entirely. **[APPLIED 2026-04-19 — Phase A-6 O4; replaced with `01-ontology-first-core.md`]**
3. **Declare `allowed-tools` frontmatter in the 3 home skills that use MCP** (`ship`, `orchestrate`, `palantir-dispatch`). Without the declaration, Claude Code permission layer cannot pre-authorize the MCP calls (they succeed via fallback but emit permission-prompt turns). Specifically:
   - ship: add `verify_schema_pin detect_doc_drift get_team_health replay_lineage emit_event codegen_trigger get_ontology` — **[N/A — skill RETIRED per P2.6]**
   - orchestrate: add `pm_preamble replay_lineage emit_event apply_edit_function commit_edits capability_token_check get_ontology impact_query pre_edit_impact pm_retro_query` — **[APPLIED 2026-04-19 — Phase A-6 O4; declared plus pm_learn_query + detect_doc_drift + get_team_health]**
   - palantir-dispatch: add `emit_event scenario_create pm_preamble` — **[N/A — skill RETIRED per P2.7]**
4. **Prune `~/palantir-math/.claude/skills/palantir-math-workspace/` and `concept-math-workspace/`** — empty shells with no SKILL.md. **[APPLIED 2026-04-20 — Phase A-7 O3b; moved 39 eval files to `~/palantir-math/evals/` via git rename (R100), PR palantir-math#172]**
5. **Prune `~/.claude/skills/trigger-eval-aggregate.json`** — orphan file from pre-v2.1.91. **[APPLIED 2026-04-19 — Phase A-6 O4]**

### P2 — Structural alignment (medium cost)

6. **Retire `~/.claude/skills/ship/SKILL.md`** in favor of `/palantir-mini:pm-ship` (same job, already in plugin, has HARD GATE via verify_schema_pin + detect_doc_drift). Update CLAUDE.md references; 2-sprint deprecation window. **[APPLIED 2026-04-19 — Phase A-6 O4; also updated rule 14 bare `/ship` → `/palantir-mini:pm-ship`, BROWSE.md + INDEX.md rosters]**
7. **Retire `~/.claude/skills/palantir-dispatch/SKILL.md`** — Claude Code native skill matcher covers the intent routing. Archive the taxonomy to `~/.claude/research/palantir/skill-routing.md` if durable. **[APPLIED 2026-04-19 — Phase A-6 O4; taxonomy archival deferred — audit doc §1 already captures the 7 routes as reference]**
8. **Split `~/.claude/skills/palantir-walk/SKILL.md`** into `palantir-walk-build` (Mode A) + `palantir-walk-analyze` (Mode B). Rationale: §3 granularity — two fundamentally different intents. **[APPLIED 2026-04-20 — Phase A-8 A8-T2; split into palantir-walk-build/analyze + shared REFERENCE. PR palantirkc#(A8-T2 PR).]**
9. **Split `~/palantir-math/.claude/skills/palantir-math/SKILL.md`** into Expert/Student/Walk — three modes with distinct outputs. §3. **[APPLIED 2026-04-20 — Phase A-8 A8-T3; split 3-way + shared REFERENCE. PR palantir-math#(A8-T3 PR).]**
10. **Rename `~/mathcrew/.claude/skills/mathcrew-runtime-verify/SKILL.md`** to `mathcrew-runtime-verify` to disambiguate from `pm-verify`. Cross-reference both in the descriptions. **[APPLIED 2026-04-20 — Phase A-7 O3d; dir renamed via git mv, frontmatter + body updated with scope disambiguation paragraph, PR mathcrew#120]**

### P3 — Substrate wiring (high value, medium cost)

11. **Wire MCP tools into home agents per §2**:
    - `ontology-steward`: add `verify_schema_pin`, `validate_managed_settings_fragments`, `verify_codegen_headers`
    - `hook-builder`: add `validate_hook_event_allowlist`
    - `plugin-maintainer`: add `validate_managed_settings_fragments`, `check_cc_version`
    - `docs-researcher`: add `refresh_research_doc`
    - `verifier-correctness`: add `audit_events_5d_conformance`
    - `verifier-adversarial`: add `impact_query`
12. **Wire MCP into project skills per §2**:
    - `palantir-math/palantir-math/`: add `pm_preamble`, `pm_learn_query`, `emit_event`
    - `palantir-math/concept-math/`: add `pm_learn_query`, `emit_event`
    - `mathcrew/3d-scene-audit/`: add `detect_doc_drift`, `emit_event`
    - `mathcrew/mathcrew-runtime-verify/`: add `emit_event` (runtime_verified)

### P4 — New surface (proposed, Lead-decision-gated)

13. Port `orchestrate` → plugin as `pm-orchestrate` (keeps existing LOC; gains v1.5.0 governance).
14. Port `lsp-audit` → plugin as `pm-lsp-audit` (after broken-ref fix).
15. Consider `math-problem-author` wrapper skill for palantir-math.
16. Consider `mc-beat-review` wrapper skill for mathcrew.
17. Consider `pm-ontology-shift` for consumer migrations to shared-core.

### P5 — Style / cleanup

18. Strip `mcpServers: - palantir-mini` from all 5 plugin agents (rule 12 §3.3 caveat — silently ignored; harmless but non-canonical). **[APPLIED 2026-04-20 — Phase A-7 O3f; stripped from action-executor, change-auditor, codegen-runner, ontology-verifier, propagation-tracer. Shipped as part of palantir-mini v1.5.2 bundle PR palantirkc#79.]**
19. Flag for Lead decision: rename `~/.claude/agents/doc-writer.md` vs. `~/palantir-math/.claude/agents/docs-writer.md` (plural/singular name collision — currently resolves by scope precedence rule 05, but visually confusing).

### Gaps / uncertain items

- Unknown whether `pm-orchestrate` (port of home orchestrate) would cleanly fit pm-* namespace — would depend on Lead-Protocol-v2 alignment review.
- Unknown whether `math-problem-author` wrapper is frequent enough to warrant the maintenance cost.
- Unknown whether `palantir-browse` v0.1.0 will ship; skills depending on it (§5.3) are deferred.
- Unknown whether rule 05 skill-invocation-order produces conflicts when both home `/ship` and plugin `/palantir-mini:pm-ship` exist simultaneously. Plugin-scope wins per rule 05 point 1. But the namespaces differ (`ship` vs `pm-ship`) so there may be no collision — user explicit `/ship` still hits the home skill. Verify before P2 retirement.
- ONE durable lesson from this audit worth flagging to `protocol-designer`: the pattern of "legacy skill uses MCP but does not declare it in allowed-tools frontmatter" may be worth codifying as rule 14 Skill MCP Declaration Discipline. Not authoring that rule here — flag per docs-researcher protocol.

---

## Provenance

- **[Applied]** claims are cross-reference counts I performed via `grep -c` / `wc -l` on file paths cited.
- **[Official]** baseline counts: palantir-mini v1.5.0 CHANGELOG line 8-67; README lines 85-127; MCP-server tool enumeration lines 55-588.
- **[Synthesis]** recommendations are my interpretations of rule 12 + rule 13 + rule 06 applied to the observed surface.

### Source files scanned (25)

- `~/.claude/CLAUDE.md`, `~/CLAUDE.md`, `~/mathcrew/CLAUDE.md`, `~/palantir-math/CLAUDE.md`, `~/palantir-math/BROWSE.md`
- `~/.claude/rules/{01-13}-*.md` (13 files) — rules 01-13
- `~/.claude/skills/{lsp-audit,orchestrate,palantir-dispatch,palantir-walk,ship,tavily-cli}/SKILL.md` — 6 files
- `~/.claude/agents/*.md` — 14 files + 2 BROWSE/INDEX
- `~/palantir-math/.claude/skills/{concept-math,palantir-math,sequencer-conc,sequencer-math,vc-scenario}/SKILL.md` — 5 files
- `~/palantir-math/.claude/agents/*.md` — 8 files
- `~/palantir-math/.claude/rules/{01-05}-*.md` — 5 files
- `~/mathcrew/.claude/skills/{3d-scene-audit,mathcrew-runtime-verify}/SKILL.md` — 2 files
- `~/mathcrew/.claude/agents/*.md` — 3 files
- `~/mathcrew/.claude/rules/{01-05}-*.md` — 5 files
- `~/.claude/plugins/palantir-mini/README.md`, `CHANGELOG.md` (lines 1-150)
- `~/.claude/plugins/palantir-mini/bridge/mcp-server.ts` (TOOLS array)
- `~/.claude/plugins/palantir-mini/skills/*/SKILL.md` — 24 files (frontmatter)
- `~/.claude/plugins/palantir-mini/agents/*.md` — 5 files (frontmatter)
- `~/.claude/plugins/palantir-mini/hooks/`, `monitors/`, `bridge/handlers/` — directory listings for context
