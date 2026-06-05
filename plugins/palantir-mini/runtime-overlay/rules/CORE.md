---
slug: core-invariants
tier: T1
version: 3.3.0
---
# Core Invariants
17 active rules (sprint-125 PR 5.14). Detail: `pm_rule_query({ byId: NN })`. Map: `CONTEXT.md`.

- **Ontology first** (01 v2.1.0): meaning → ontology → contracts → runtime; FwdProp/BwdProp audit handlers (W6).
- **Research/skills/memory** (02 v3.2.0): research/ AI-agent read-only SSoT; ~/docs/ external long-term layer; plugin > user > repo skill resolution; plans-index-drift-detect SessionStart advisory.
- **Plugin authority** (07 v1.3.0): plugin.json authoritative; agent file-ownership table + runtime enforcement hook; multi-plugin collision resolution per rule 19.
- **Schema + codegen** (08 v2.0.0): semver-tracked interface; pm-codegen sole writer of src/generated/**.
- **Append-only events** (10 v2.2.0): 5-dim envelope + propagationDepth auto-derived from emitter path (W6); PreCompact gate blocks non-conformant.
- **Lead Protocol** (12 v3.19.1): model pinned by role; 3-tier fallback chain; lazy-spawn + auto-shutdown; task granularity DELETE/ADD/KEEP/VERIFY + 1-file + ≤15K; Quick Sprint auto-wrap; briefing template 5-section; **Pre-delegation framework + Lead self-test directive + Lead-direct edit threshold + Subagent decision audit invariant + Complex-task EnterPlanMode protocol + Harness Engineering context awareness + Pre-delegation hard gate + Task context budget hard gate + Parallel-spawn dispatch v3.19.0 + ownerAgent field in plan DAG v3.19.1**.
- **Sprint-harness species** (16 v4.2.0): palantir-mini-sprint-harness B2 hard default-on; Quick Sprint mode binds in a SINGLE orchestrator-propose round (Lead proxies generator + evaluator inline); non-quick modes retain 3-round handshake; generator-tier agents use `isolation: "worktree"` (cattle-not-pets).
- **Multi-plugin precedence** (19 v1.0.0): plugin > user > repo resolution; same-scope exact-name collision fails loud.
- **Swarm orchestration mode** (20 v1.0.0): Lead-direct < Quick Sprint < Full Sprint < Agent Teams; pick lowest-overhead mode that fits.
- **Project-agent authority** (21 v1.0.0): plugin-scope agent wins name collision; project agent enters 1-sprint deprecation window.
- **Hook citation validation** (22 v1.0.0): every "rule NN" citation in hook source must reference an active rule; stale = blocking defect.
- **Project-rule formalization** (23 v1.0.0): project-scope rules require standard frontmatter; 1-sprint migration window on first detection.
- **Lead dispatch router** (24 v1.1.0): Brain-of-Swarms canonical dispatch: identify species → cost-profile check (HarnessSpeciesCostProfile) → mode → bind contract → emit lineage → spawn.
- **Auto-merge + cleanup default** (25 v1.0.0): allowlisted PR auto-merge (sprint-/fix/chore/docs prefix + isDraft=false + mergeable) + branch/worktree cleanup; opt-out via --no-merge or PALANTIR_MINI_AUTOMERGE_BYPASS=1 (audited).
- **Valuable data standard** (26 v1.3.0): every events.jsonl envelope auto-graded T0-T4 across 5 axes; A3 reasoning ≥40 chars; §R5 hard-flip sprint 062; §Axis E sub-identity convention; T0 rejected, T3+ BackPropagation, T4 D2-canonical/fallback; bypass PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (audited).
- **Cross-runtime substrate** (27 v1.0.0): events.jsonl shared across runtimes; atomic append via mkdir-mutex; byWhom.identity self-attributes writing runtime; direct file append forbidden.
- **Ontology-engineering turn fan-out** (28 v1.1.0): SIC evidenceDomains > 2 → each domain gets ≥1 dedicated evidence-gathering turn before Phase 3 (advisory@2 / blocking@3); EXEMPT under user-approved Claude Code plan (plan = cross-domain evidence consolidation); bypass PALANTIR_MINI_PLAN_MODE_EXEMPT=1 (audited).
