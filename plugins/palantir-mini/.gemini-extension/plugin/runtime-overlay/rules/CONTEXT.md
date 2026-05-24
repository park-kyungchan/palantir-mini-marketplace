---
ruleId: 0
slug: context-meta
scope: global
version: 3.2.0
tier: T2
invariant: "Canonical onboarding context for the rules/ system. AI agents read this first to grasp how all other rules work, how to author new ones, and why the system is sized the way it is."
supersededBy: null
crossRefs: [01, 02, 07, 08, 10, 12, 16]
hookCitations: [session-start]
mandatoryLoad: true
audience: [claude-lead, claude-implementer, claude-researcher, palantir-mini-agents, codex-runtime, external-ai]
bodyLocCeiling: 400
---

# Rules System — Context & Authoring Guide

> **You are reading this because every Claude-compatible AI agent must grasp the rules/ system before acting. This document is self-contained — you don't need to read any other rule to understand what follows.**

## §1 — Purpose

`~/.claude/rules/` is a **behavioral overlay layer**. It does not describe what the system IS (that's `~/.claude/schemas/`), nor what has been OBSERVED (that's `~/.claude/research/`), nor what the current project needs (that's `<project>/CLAUDE.md` + `<project>/BROWSE.md`).

Rules describe **how AI agents must behave** inside the Claude runtime when they are operating in the palantir-mini-instrumented ontology system. Example concerns covered:

- Substrate invariants (e.g. append-only event log, never rewrite/truncate).
- Codegen authority (generated files off-limits; only the declared generator writes).
- Lead model policy (no `model:` override when spawning teammates).
- Task granularity (DELETE/ADD/KEEP/VERIFY + 1 owning file + bounded context).
- Plugin/MCP authority + agent file-ownership.
- Harness 2-role default + file-based IPC.

Rules are **enforceable** — palantir-mini hooks block tool calls with blocking messages that cite specific rule numbers. They are not aspirational guidelines. **For the current active rule list and per-rule invariants, read `CORE.md` (T1 sibling) — that is the canonical snapshot. This file describes the META-RULES (how rules are authored, versioned, retired, enforced) and is intentionally decoupled from the rule snapshot.**

## §2 — Authority chain (where rules sit)

```
research/   (evidence — external sources, synthesis, findings)
    ↓ promotes durable findings
schemas/    (structure — ontology primitives, types, registries)
    ↓ generates
ontology/shared-core/   (consumer surface)
    ↓ consumed by
project ontology/       (per-project semantic layer)
    ↓ fed into
contracts → runtime → artifacts
    ↓ audited against
rules/      (behavior overlay — "how to operate the above")
```

Rules are **downstream** of schemas/ontology but **upstream** of runtime behavior. They codify operational discipline learned from research, enforced by hooks at runtime.

- If a rule contradicts `CLAUDE.md` on project-specific behavior → CLAUDE.md wins (per CLAUDE.md §Authority Chain).
- If two rules contradict each other → higher-numbered rule wins (newer supersedes older).
- If a rule contradicts a schema primitive → schema wins (rule misread the ontology; file a fix).

## §3 — Three-tier load architecture

Rules follow a strict ceiling-enforced 3-tier structure. Violating the ceilings is a hard error surfaced by `rule-bottleneck-watch` hook (PreCompact).

| Tier | Artifact | When loaded | Hard ceiling | Purpose |
|------|----------|-------------|--------------|---------|
| **T1** | `CORE.md` | Every turn | 25 LOC / 500 tok | Distilled invariants across all rules |
| **T1** | `CONTEXT.md` (this file) | Every turn | 400 LOC / 8,000 tok | Meta-rule + authoring guide |
| **T1** | `BROWSE.md` | Every turn | 20 LOC / 400 tok | Query router ("which rule answers X?") |
| **T2** | `NN-slug.md` (current set listed in CORE.md) | On-demand via `pm_rule_query` | 30 LOC each / 600 tok (consolidation-hub rules may carry an explicit exception flagged in their frontmatter `bodyLocCeiling` field) | Detail, examples, cross-refs |
| **T3** | `~/.claude/research/**` | On-demand | — | Evidence; cited by rules |

**T1 total** (every-turn load, hard cap): ~445 LOC / ~8,900 tok (25 CORE + 400 CONTEXT + 20 BROWSE).

The key insight: T1 tokens must TEACH, not just list. CONTEXT spends ~8K tokens once-per-turn so AI agents can operate all rules without fetching each one every turn. When an agent needs rule 10's exact 5-dim field schema, it calls `pm_rule_query({ byId: 10 })` — CONTEXT has already taught it that rule 10 exists, what it governs, and when to fetch it. The trade is intentional: a higher T1 baseline in exchange for zero per-rule-lookup cost on the common path.

## §4 — Numbered-ID stability contract (load-bearing)

**Hard invariant**: rule numbers are a **stable API**. The current active set + permanent-gap list is canonical in `CORE.md`; query `pm_rule_audit` for the live snapshot. Numbered IDs appear in palantir-mini hook blocking messages, skill + agent + plan + CHANGELOG + PR descriptions, and cross-refs within other rules.

**Stability rules**:
1. **Never rename** an existing rule's ID. Renaming = breaking hook blocking messages.
2. **Never recycle** a deleted rule's ID. The number stays a permanent gap forever, preserving historical readability of old PRs.
3. **New rules get the next-available number** — query `pm_rule_audit` for the next available ID.
4. **Slugs are softer stability** — renameable with a semver MAJOR bump + deprecation window. Numbers are forever.
5. **Scope migrations are one-way**: global → plugin or global → project. Never the reverse.
6. **§12-license suspensions are one-time, scoped, and explicit**. Numbered-ID stability re-locks immediately on cleanup completion. Each license event is recorded in the originating blueprint under `~/.claude/plans/` and reflected in CORE.md's gap list at the time it lands.

## §5 — Frontmatter schema (Rule primitive v1.18.0)

Every T2 rule file MUST have frontmatter matching this schema. Hooks + `pm_rule_query` depend on it. CONTEXT.md and CORE.md are exempt (they're T1 meta, not catalog entries) but still SHOULD carry frontmatter for consistency.

```yaml
---
ruleId:        <number>                    # 01-16 currently active; next = 19; 0 is reserved for this CONTEXT file
slug:          <kebab-case>                # e.g., "events-jsonl", "lead-protocol"
scope:         global | plugin:<id> | project:<id>
version:       <semver>                    # Rule itself has a semver — MINOR for additions, MAJOR for rename/supersede
invariant:     "<≤1 sentence summary>"     # What CORE.md inlines for this rule
supersededBy:  <ruleId> | null             # If retired + replaced, point to replacement
supersedes:    [<ruleId>, ...]             # If this rule absorbs retired ones (e.g., rule 12 supersedes [6, 13, 14, 15])
crossRefs:     [<ruleId>, ...]             # Related rules
hookCitations: [<hook-name>, ...]          # Hooks that emit blocking messages citing this rule
---
```

Field purposes:
- `invariant`: the 1-sentence distillation. `CORE.md` auto-generates from these. `pm_rule_query` list mode with `compact: true` returns these.
- `supersededBy` / `supersedes`: deprecation pointers. Retired rules are deleted (not stub-stayed) when §12 license active; otherwise stub-redirected.
- `crossRefs`: used by `pm_rule_query` get mode with `withContext: true` to auto-fetch neighbors.
- `hookCitations`: used by `rule-drift-detect` to verify no hook cites a deleted or renamed rule.

## §6 — Authoring a new rule (workflow)

Belongs in `rules/` ONLY IF all three: (1) **Behavioral** — governs how agents operate; (2) **Enforceable** — hook/audit/MCP can enforce; (3) **Cross-project** OR palantir-mini core. Other placements: project-local → `<project>/.claude/rules/`; structural type → `~/.claude/schemas/`; research finding → `~/.claude/research/`.

Workflow:
1. **Draft invariant** (1 sentence; if can't compress, split into multiple rules).
2. **Write body** ≤30 LOC: frontmatter + invariant + rationale (2-3 lines) + mechanics (3-5 lines) + crossRefs.
3. **Filename**: `~/.claude/rules/NN-slug.md` (next-available zero-padded, currently 19). Slug kebab-case, no version suffixes.
4. **Update dependents**: CORE.md invariant line, BROWSE.md routing row, MEMORY.md counter, hookCitations.
5. **PR**: branch `docs/rules-NN-<slug>-<date>`; reviewer = `protocol-designer` agent; merge requires `rule-bottleneck-watch` green.

## §7 — Amending an existing rule

- **PATCH** (body tweak, no semantic change): bump version PATCH. No CHANGELOG.
- **MINOR** (additive invariant, backwards-compatible): bump MINOR + update CORE.md if distillation changes.
- **MAJOR** (invariant change): bump MAJOR. If invariant fundamentally changes → create NEW rule (next number), mark old rule `supersededBy: <new>`. Hook citations migrate over 1 MINOR window.
- **Retirement (default path)**: stub body + set `supersededBy`; do NOT delete file (preserves PR history).
- **Retirement (§12-license path)**: full deletion permitted only under explicit blueprint license; rule numbers become permanent gaps.

## §8 — palantir-mini integration (the bottleneck killer)

The every-turn load stays small BECAUSE palantir-mini provides on-demand lookup. Agents do not need to keep all numbered rules in context; they fetch what they need when they need it.

### §8.1 MCP handlers

| Handler | Signature | Use case |
|---------|-----------|----------|
| `pm_rule_query` | `({ byId? \| bySlug? \| byQuery?, compact?, scope?, withContext? }) → get \| list \| search result` | Fetch, enumerate, or search rules through the consolidated handler |
| `pm_rule_audit` | `() → { driftLines, bottleneckFlags, staleCrossRefs, unclaimedHookCitations }` | Comprehensive health check |

Rule query/audit handlers emit 5-dim lineage events when the runtime exposes that path — this gives BackwardProp visibility into which rules agents actually use. After 30d, rules with 0 fetches become retirement candidates.

### §8.2 Hook inlining pattern

Blocking hooks fetch the cited rule's invariant and inline it:

```
palantir-mini events-5d-gate: events.jsonl has 3 rows missing atopWhich.

=== RULE 10 INVARIANT ===
events.jsonl is append-only; every edit emits a 5-dim event (when, atopWhich, throughWhich, byWhom, withWhat) BEFORE writing files.

For full text: pm_rule_query({ byId: 10 }) (or /palantir-mini:pm-rule 10)
```

User + AI agent both see the invariant inline; no tool call needed for recovery.

### §8.3 Hooks that enforce rules/ discipline

- `rule-bottleneck-watch` (PreCompact, advisory → blocking if hard ceiling): scans `rules/*.md` file sizes. Fires on T1 >300 LOC total, T2 per-file >30 LOC (or higher if frontmatter `bodyLocCeiling` flags an explicit consolidation-hub exception), T2 total >600 LOC. Emits `rule_bottleneck_warned` event.
- `rule-drift-detect` (SessionStart, advisory): cross-checks registered rule count vs file count; checks MEMORY.md counter; checks that every `hookCitations` entry in frontmatter refers to an existing hook. Emits `rule_drift_detected` event.
- `rule-citation-validate` (PostToolUse:Edit on hooks/*.ts, advisory): when a hook file is edited, checks that every `rule NN` citation in the hook source refers to a live rule (not a retired one). Emits `rule_citation_stale` event.

### §8.4 Skills

- `/palantir-mini:pm-rule <id-or-slug>` — thin wrapper over `pm_rule_query`. Use in-session when you hit an unfamiliar rule citation.
- `/palantir-mini:pm-rule-audit` — calls `pm_rule_audit`. Proactively suggested when `rule-bottleneck-watch` fires.

## §9 — Scope + precedence

Multi-layer rule precedence (highest wins): project-local rule → plugin-scope rule → global rule → CLAUDE.md (project-specific) → schema primitive (structural). A rule at narrower scope wins. Do NOT duplicate rule bodies across scopes — use supersession or scope migration.

## §10 — Anti-patterns (do NOT do these)

1. **Duplicate invariant across rules** — merge them.
2. **Embed code inside a rule** — rules describe, hooks/MCP implement.
3. **Cite rule by number without slug** — `"rule 10 (events-jsonl)"` survives future renames.
4. **Author without frontmatter** — breaks `pm_rule_query` + hooks.
5. **Rule as workaround documentation** — workarounds go in code comments or PR descriptions.
6. **Exceed hard ceilings** — split the rule (or invoke explicit blueprint exception).
7. **Silent deletion** — retire via stub + `supersededBy`, never delete (except under §12 license).
8. **Project-specific rule at global scope** — move to `<project>/.claude/rules/`.
9. **Cite retired/nonexistent rule** — `rule-drift-detect` catches.
10. **Conflate rule version with schemas version** — independent semver lanes.

## §11 — "Where does this knowledge go?" flowchart

```
Is it durable behavior AI agents must follow across sessions?
├─ No → code comment / PR description / memory file (session-local).
└─ Yes → Enforceable via hook/audit/MCP?
   ├─ No → Structural? → schemas/ ; else research finding → research/ .
   └─ Yes → Cross-project (palantir-math + mathcrew + future)?
      ├─ Yes → ~/.claude/rules/ (this directory).
      └─ No  → <project>/.claude/rules/.
```

## §12 — Ceiling + bottleneck invariants

| Limit | Hard (blocks) | Soft (warns) | Who enforces |
|-------|---------------|--------------|--------------|
| T1 `CORE.md` | 25 LOC | 20 LOC | `rule-bottleneck-watch` |
| T1 `CONTEXT.md` | 400 LOC | 350 LOC | `rule-bottleneck-watch` |
| T1 `BROWSE.md` | 20 LOC | 15 LOC | `rule-bottleneck-watch` |
| T1 total | 445 LOC | 385 LOC | `rule-bottleneck-watch` |
| T2 per rule body | 30 LOC (consolidation-hub rules may carry frontmatter `bodyLocCeiling` exception) | 20 LOC | `rule-bottleneck-watch` per file |
| T2 catalog total | 600 LOC | 400 LOC | `pm_rule_audit` |
| Every-turn tokens (T1 + CLAUDE.md + MEMORY.md top-200) | 8,000 tok | 5,000 tok | `session-start` advisory |

Ceiling-bust options in priority order: (1) trim existing rules first; (2) split the rule; (3) move detail to research/; (4) scope migration; (5) LAST RESORT — propose a ceiling raise via blueprint + user approval.

## §13 — CONTEXT.md maintenance

This file is `ruleId: 0`. Versioned per §5. Amendment triggers: new MCP/hook in rules system, authoring workflow change, ceiling change, scope-structure change, new §10 anti-pattern. Author: `protocol-designer` or Lead; user approves MINOR+ changes (PATCH = typo fixes go direct).

## §13.5 — Cross-runtime coexistence (Claude ↔ Codex ↔ Gemini)

This file is **Claude-native only**. Other native runtimes on this machine (Codex, Gemini, Cursor) run in parallel with their own overlay layers. Do NOT assume Claude rules transfer.

**Runtime overlay map (parallel, non-transitive)**:

| Runtime | Global overlay | Hooks | Memory | Skills |
|---------|----------------|-------|--------|--------|
| **Claude** | `~/.claude/CLAUDE.md` + `~/.claude/rules/**` | palantir-mini hook intent from `/home/palantirkc/palantir-mini/hooks/**` via the Claude compatibility install | `~/.claude/projects/**/memory/**` | plugin source from `/home/palantirkc/palantir-mini` + `~/.claude/skills/**` |
| **Codex** | `~/.codex/AGENTS.md` | `~/.codex/hooks/**` (3) | `~/.codex/{memories,sessions,history.jsonl,state_5.sqlite}` | `~/.codex/skills/**` + shared `~/.agents/skills/**` |
| **Universal** | `~/AGENTS.md` (thin delegation only) | — | — | `~/.agents/skills/**` (shared) |

**Shared spine (single source of truth; both runtimes consume)**:

- **palantir-mini plugin** — canonical source at `/home/palantirkc/palantir-mini/`. Codex `config.toml` points its MCP server to this source and launches the same `bridge/mcp-server.ts`. `~/.claude/plugins/palantir-mini/` is a temporary Claude compatibility/install target only. DO NOT fork the plugin install.
- **`~/ontology/shared-core/`** — import surface for both runtimes.
- **`~/.claude/schemas/**`** — ontology primitives; `pm-codegen` is the sole codegen authority.
- **`~/.claude/research/**`** — evidence library; read-shared.
- **`.palantir-mini/session/events.jsonl`** (per-project) — append-only substrate; BOTH runtimes append, `byWhom.agent` self-attributes entries.

**Claude-side palantir-mini-centric discipline**: When Claude operates, it does so through palantir-mini MCP handlers + hooks as the primary substrate, not ad-hoc tool use. Numbered rules + hook-inlined excerpts (§8) enforce this. Codex operates through a lighter subset (3 hooks + MCP client); Claude holds the fullest substrate and is the canonical enforcement side.

**Cross-runtime edit rule of thumb**:
- `~/.claude/**` (excluding plugin) → Claude-only.
- `/home/palantirkc/palantir-mini/**` → BOTH affected (coordinate runtime wrappers if MCP surface changes).
- `~/.claude/plugins/palantir-mini/**` → Claude compatibility/install target only; do not edit as semantic source.
- `~/.codex/**` → Codex-only; Claude hooks must not depend.
- `~/ontology/`, `~/.claude/schemas/`, `~/.claude/research/`, `~/AGENTS.md` → both runtimes; rule 08 schema versioning governs breaking changes.

**Anti-pattern**: writing Codex-specific logic into Claude hooks/rules (or vice versa). If runtime-specific behavior is needed, place it in that runtime's hooks/overlay layer.

## §14 — First-time agent entry point

If this is your first rule document this session: (1) Rules are enforced by hooks, not suggestions; (2) `CORE.md` has 1-line invariants for every rule; (3) For any detail, `pm_rule_query({ byId: <id> })`; (4) Edits under `plugins/palantir-mini/hooks/**` → rule 07 §file-ownership first; (5) Every event emission → 5-dim envelope (rule 10); (6) Every task → DELETE/ADD/KEEP/VERIFY + 1 owning file + ≤15K ctx (rule 12 §Task granularity); (7) Spawning teammates → lazy-spawn (rule 12) + no `model:` override (rule 12); (8) In doubt → `BROWSE.md` routes queries.

## §15 — Glossary

**Rules system**:
- **T1 / T2 / T3**: every-turn / on-demand / research.
- **Invariant**: 1-sentence rule distillation in frontmatter + CORE.md.
- **Hook citation / crossRef**: rule-number references from hooks / other rules.
- **Scope migration / supersession**: one-way rule relocation / rule retirement via stub.
- **§12 license**: explicit one-time blueprint authorization to suspend numbered-ID stability for destructive cleanup.
- **Protocol-designer**: canonical rule-authoring agent.

**Lineage substrate** (rule 01 + rule 10):
- **5-dim envelope**: `when / atopWhich / throughWhich / byWhom / withWhat` (rule 10).
- **BackwardProp / ForwardProp**: events.jsonl replay (rule 10) / authority chain (rule 01 §Propagation).

**Harness taxonomy** (Anthropic-confirmed; Lance Martin "Scaling Managed Agents" 2026-04-08):
- **Harness (genus)**: *"the loop that calls Claude and routes Claude's tool calls to the relevant infrastructure"*. Generic architectural concept, NOT a product.
- **Harness species** (7): (1) Claude Code CLI, (2) Claude Agent SDK, (3) task-specific harness (e.g. Prithvi Rajasekaran 3-agent 2026-03-24), (4) Managed Agents internal pre-built harness *(Operationally inactive — documented only; no active palantir-mini dispatch route as of sprint-060)*, (5) palantir-mini-sprint-harness (rule 16 governs), (6) Gemini Enterprise Agent Platform — Google Cloud's harness species (April 2026 launch); components-metered *(Operationally inactive — documented only; no active palantir-mini dispatch route as of sprint-060)*, (7) Microsoft Foundry Agent Service — bundled in M365 + AI Foundry; $0.0994/vCPU-hour + $0.0118/GiB-hour + $0.25/1K events *(Operationally inactive — documented only; no active palantir-mini dispatch route as of sprint-060)*. Citation: `~/.claude/research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md`.
- **Meta-harness**: *"harness-agnostic harness ... unopinionated about the specific harness ... allows many different harnesses"*. Managed Agents = self-described meta-harness.
- **NOT a harness**: Messages API / Client SDK (user writes own loop); palantir-mini itself (control plane Brain, not a harness species).
- **Brain / Hands / Session** (Lance Martin layer model): model + harness species (thinking) / sandbox executor (action; *"cattle, not pets"*) / append-only event log (state, swappable independently).
- **Agent Teams**: Claude Code CLI's multi-agent extension. NOT a separate harness species — same loop, multi-subagent fan-out via `~/.claude/teams/{name}/config.json` + `~/.claude/tasks/{name}/`.

**palantir-mini identity** (rule 16 v4.0.0 target):
> palantir-mini is the **Ontology-First Brain for multi-harness agent swarms**: a control plane that grounds any harness species in append-only `events.jsonl` lineage + `~/.claude/schemas/` ontology + 5-dimensional Decision Lineage. It is not itself a harness species — it dispatches to and audits any species via MCP.

**Vocabulary anti-patterns** (lint target — 0 unqualified hits):
- "harness" alone (always qualify: harness species X / harness genus / quoted definition).
- Treating Managed Agents as a harness species (it's a meta-harness *containing* a pre-built species).
- Conflating Agent Teams with a harness species (it's an extension of Claude Code CLI harness).

**New rule slugs (v3.0.0)**:
- **multi-plugin-precedence** (rule 19): plugin > user > repo scope resolution; exact-name collision at same scope fails loud.
- **swarm-orchestration-mode** (rule 20): mode ladder Lead-direct < Quick Sprint < Full Sprint < Agent Teams < explicit species.
- **project-agent-authority** (rule 21): plugin-scope agent wins name collision; project agent deprecation window.
- **hook-citation-validation** (rule 22): every "rule NN" citation in hook source must be an active rule.
- **project-rule-formalization** (rule 23): project-scope rules require standard frontmatter.
- **lead-dispatch-router** (rule 24): Brain-of-Swarms canonical dispatch flowchart.

**Propagation terms** (rule 01 v2.1.0 + rule 10 v2.1.0):
- **propagation step**: one layer transition in the authority chain: `research | schema | shared-core | project-ontology | contracts | runtime`.
- **propagation depth**: integer field on an event row counting hops from the chain origin (0 = origin layer). Tracked by optional `propagationDepth` field (rule 10 v2.1.0).

## §16 — References

- Blueprints: `~/.claude/plans/2026-04-22-rules-redesign-blueprint.md` (PR #123 — initial 3-tier design); `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md` §12 (2026-04-29 destructive cleanup license + 6 rule retirements); `~/.claude/plans/glistening-hugging-reddy.md` §2 (Wave R execution proposal).
- Rule primitive source: `~/.claude/schemas/ontology/primitives/rule.ts`.
- MCP handlers: `/home/palantirkc/palantir-mini/bridge/handlers/pm-rule-*.ts`.
- Enforcement hooks: `/home/palantirkc/palantir-mini/hooks/rule-audit.ts` (consolidated mode-dispatch).
- Authority reference: `~/.claude/CLAUDE.md` §Authority Chain.

## §17 — Brain-of-Swarms layer model

palantir-mini is the Ontology-First Brain for multi-harness agent swarms (CLAUDE.md §Vocabulary). It bridges 7 harness species via MCP — it is not itself a species.

**Layer model** (Lance Martin "Scaling Managed Agents" 2026-04-08):

| Layer | Component | Role |
|-------|-----------|------|
| **Brain** | model + harness species | thinking — plans, decides, orchestrates |
| **Hands** | sandbox executor | action — runs tools, writes files (*"cattle, not pets"*) |
| **Session** | `events.jsonl` (append-only) | state — swappable independently of Brain or Hands |

**7 harness species** (rule 16 v4.0.0 §0; species 6-7 added sprint-047 W2.C):
1. Claude Code CLI — default species; rule 16 governs sprint-harness layer within it.
2. Claude Agent SDK — user-authored loop; no built-in sprint gate.
3. Task-specific harness (Prithvi 3-agent pattern 2026-03-24).
4. Managed Agents internal pre-built harness (inside meta-harness product). *(Operationally inactive — documented only)*
5. palantir-mini-sprint-harness — Sprint Contract + grader dispatch loop.
6. Gemini Enterprise Agent Platform — Google Cloud (April 2026); components-metered. *(Operationally inactive — documented only)*
7. Microsoft Foundry Agent Service — M365 + AI Foundry bundled (April 2026). *(Operationally inactive — documented only)*

**4-vendor convergence (April 2026)**: Anthropic Managed Agents (April 8) + OpenAI Agents SDK (April 15) + Microsoft Foundry Agent Service + Google Gemini Enterprise Agent Platform (April 22) — within 16 days, 4 vendors publicly converged on "harness is the product." palantir-mini's positioning is *layer-above*: it dispatches *across* vendor harnesses (now 7 species per §15); it does NOT compete to be a harness itself. The economic pivot opens a 3rd pricing arbitrage — BYO-Claude-Code-CLI-via-Max-flat-rate — outside both the rented-runtime model (Anthropic/Google/Microsoft) and BYO-sandbox model (OpenAI). See `~/.claude/research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md` for vendor-by-vendor pricing matrix.

**Cross-refs**: rule 16 (sprint species governance), rule 19 (multi-plugin precedence within species), rule 20 (orchestration mode selection), rule 24 (dispatch flowchart).

## §18 — ForwardProp/BackwardProp audit substrate

W6 MCP handlers provide explicit audit trails for the propagation chain (rule 01 v2.1.0). Schema primitives: `PropagationAuditPayload`, `PropagationReplayPayload`, `PropagationHealthPayload` (schemas v1.34.0+).

| Handler | Direction | Purpose |
|---------|-----------|---------|
| `propagation_audit_forward` | research → runtime | validates each layer transition is intact |
| `propagation_audit_backward` | runtime → ontology | surfaces drift between outcomes and current ontology |
| `propagation_chain_health` | both | composite health check; returns per-step status |
| `pm_research_citation_validate` | research layer | verifies research citations resolve to live files |

- Run `propagation_audit_forward` before cross-layer schema promotions or ontology refactors.
- Run `propagation_audit_backward` when runtime behavior diverges from ontology expectations.
- `propagationDepth` field on event rows (rule 10 v2.1.0) feeds chain reconstruction in these handlers.
- **Cross-refs**: rule 01 v2.1.0 §ForwardProp/BackwardProp Audit, rule 10 v2.1.0 §propagationDepth.

---

**Author**: Lead opus[1m] | initial 2026-04-22 v1.0.0 (Track R companion to rules-redesign blueprint PR #123). Updated 2026-04-29 v2.0.0 (post-§12 consolidation: 13→7 numbered rules per harness-base-mode blueprint). Updated 2026-05-01 v3.0.0 (cosmic-hatching-pizza W4: +6 rules 19-24, §15 glossary expansion, §17 Brain-of-Swarms, §18 FwdProp/BwdProp audit substrate). Updated 2026-05-04 v3.1.0 (palantirkc sprint-001-quick: §19 Appendix moved here from CORE.md to satisfy T1 25-LOC ceiling). Updated 2026-05-06 v3.2.0 (sprint-047 W2.C: §15 species 5→7 + §17 4-vendor convergence paragraph). Updated 2026-05-09 v3.2.1 (sprint-060 W3 R6-F16: species 4/6/7 "Operationally inactive" marker in §15 + §17).

## §19 — Appendix: rule retirements + permanent gaps

Retired 2026-04-29 (per harness-base-mode blueprint §12 license): 06+13+14+15 → 12; 11 → 08; 09 → 02. Permanent gaps: 03/04/05/17/18. Precedence at conflict: higher-numbered wins; CLAUDE.md outranks rules; schemas outrank on structure. (Moved from CORE.md 2026-05-04 — CORE.md trimmed from 27 LOC to 25 LOC to clear T1 ceiling.)
