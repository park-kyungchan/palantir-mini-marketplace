---
ruleId: 0
slug: context-meta
scope: global
version: 3.6.0
tier: T1
invariant: "Every-turn framing for the rules/ system: what it is, the authority chain, the three-tier load, cross-runtime coexistence, and the confirmed Ontology-First-through-pm / two-altitude north-star (§17). Rule-authoring procedure split out to AUTHORING.md (on-demand)."
supersededBy: null
crossRefs: [01, 02, 07, 08, 10, 25, 26, 27]
hookCitations: [session-start]
mandatoryLoad: true
audience: [claude-lead, claude-implementer, claude-researcher, palantir-mini-agents, codex-runtime, external-ai]
bodyLocCeiling: 400
---

# Rules System — Context (every-turn framing)

> **Every Claude-compatible AI agent must grasp this before acting.** The rule-AUTHORING procedure
> (§4-§13, §16, §18, §19) is split into `AUTHORING.md` (on-demand) to cut per-turn tokens — fetch it
> only when writing / amending / retiring a rule.

## §1 — Purpose

`~/.claude/rules/` is a **behavioral overlay** — *how AI agents must behave* in the palantir-mini-instrumented ontology system. Distinct from `~/.claude/schemas/` (what the system IS), `~/.claude/research/` (what was OBSERVED), and `<project>/CLAUDE.md` + `BROWSE.md` (project needs). Concerns: substrate invariants (append-only events), codegen authority, plugin/MCP authority + agent file-ownership, valuable-data grading, cross-runtime substrate.

Rules are **enforceable** — palantir-mini hooks block tool calls with messages citing specific rule numbers; not aspirational. **Active rule list + per-rule invariants = `CORE.md`** (the canonical snapshot). THIS file = the every-turn META-framing; the authoring/versioning/enforcement procedure lives in `AUTHORING.md`.

## §2 — Authority chain (where rules sit)

```
research/ (evidence) → schemas/ (structure) → ontology/shared-core/ → project ontology/ → contracts → runtime → artifacts
rules/ (behavior overlay — "how to operate the above") = downstream of schemas, upstream of runtime, audited against artifacts
```

Conflict precedence: **CLAUDE.md wins** project-specific behavior; **higher-numbered rule wins** rule-vs-rule (newer supersedes); **schema wins** if a rule contradicts a primitive (file a fix).

## §3 — Three-tier load architecture

Ceiling-enforced by `rule-bottleneck-watch` (PreCompact; hard = error).

| Tier | Artifact | Loaded | Hard ceiling | Purpose |
|------|----------|--------|--------------|---------|
| **T1** | `CORE.md` | every turn | 25 LOC / 500 tok | distilled invariants + north-star |
| **T1** | `CONTEXT.md` (this) | every turn | 400 LOC / 8,000 tok | every-turn meta framing |
| **T1** | `BROWSE.md` | every turn | 20 LOC / 400 tok | query router |
| **T2** | `NN-slug.md`, `AUTHORING.md` | on-demand via `pm_rule_query` / direct read | 30 LOC / 600 tok (`bodyLocCeiling` may raise for hubs) | rule detail; authoring procedure |
| **T3** | `~/.claude/research/**` | on-demand | — | evidence cited by rules |

**Key insight**: T1 must TEACH the framing + north-star, not exhaustively list procedure. For rule detail call `pm_rule_query({ byId: NN })`; for the authoring/ceiling/enforcement procedure read `AUTHORING.md`.

## §4-§13, §16, §18, §19 — moved to `AUTHORING.md` (on-demand)

ID-stability (§4), frontmatter schema (§5), authoring (§6), amending (§7), pm-integration handlers+hooks (§8), scope (§9), anti-patterns (§10), the knowledge-placement flowchart (§11), ceiling invariants (§12), maintenance (§13), references (§16), ForwardProp/BackwardProp handlers (§18), retirements + permanent gaps (§19) → all in `~/.claude/rules/AUTHORING.md` (same § numbers). Read it before authoring/amending a rule. (§13.5 cross-runtime stays below — it is every-turn operational context.)

## §13.5 — Cross-runtime coexistence

This file is **Claude-native**; Codex/Gemini run parallel overlays. Do NOT assume Claude rules transfer.

| Runtime | Global overlay | Memory | Skills |
|---------|----------------|--------|--------|
| **Claude** | `~/.claude/CLAUDE.md` + `rules/**` | `~/.claude/projects/**/memory/**` | `palantir-mini@…` + `~/.claude/skills/**` |
| **Codex** | `~/.codex/AGENTS.md` + `~/AGENTS.md` | `~/.codex/{memories,sessions,history.jsonl}` | `palantir-mini@…` + `~/.agents/skills/**` |
| **Gemini** | `~/.gemini/GEMINI.md` | runtime-native | `~/.gemini/extensions/palantir-mini/` + `~/.agents/skills/**` |
| **Universal** | `~/AGENTS.md` (thin delegation) | — | `~/.agents/skills/**` |

**Shared spine** (all runtimes consume): pm plugin (`park-kyungchan/palantir-mini-marketplace`; Gemini = gemini-extension) · `~/ontology/shared-core/` · `~/.claude/schemas/**` (pm-codegen sole authority) · `~/.claude/research/**` · per-project `.palantir-mini/session/events.jsonl` (both runtimes append; `byWhom.identity` self-attributes). Claude operates **through pm MCP handlers + hooks as the primary substrate, not ad-hoc tool use**.

**Edit boundaries**: `~/.claude/**` (excl. plugin) = Claude-only · pm marketplace source = all runtimes (coordinate on MCP changes) · plugin caches = installed payloads, never edit as source · `~/.codex/**` = Codex-only · `~/ontology/`, `~/.claude/schemas/`, `~/.claude/research/`, `~/AGENTS.md` = shared (rule 08 governs breaking changes). **Anti-pattern**: runtime-specific logic in another runtime's overlay.

## §14 — First-time agent entry

(1) Rules are hook-enforced, not suggestions. (2) `CORE.md` = north-star + 1-line invariants. (3) Rule detail → `pm_rule_query({ byId })`; authoring procedure → `AUTHORING.md`. (4) Editing `plugins/palantir-mini/hooks/**` → rule 07 file-ownership first. (5) Every event → 5-dim envelope (rule 10). (6) In doubt → `BROWSE.md`.

## §15 — Glossary

**Rules system**: T1/T2/T3 = every-turn / on-demand / research · Invariant = 1-sentence distillation (frontmatter + CORE) · Hook-citation / crossRef = rule-number refs from hooks / rules · Scope-migration / supersession = one-way relocation / stub-retirement · §12 license = one-time blueprint authorization to suspend ID stability · Protocol-designer = canonical rule-authoring agent.

**Lineage** (rule 01 + 10): 5-dim envelope = `when / atopWhich / throughWhich / byWhom / withWhat` (rule 10) · ForwardProp = authority chain (rule 01) / BackwardProp = events replay refining ontology · propagation depth = hops from chain origin (`propagationDepth`, rule 10).

**Harness vocabulary**: *harness (genus)* = the loop that calls the model + routes tool calls to infrastructure · *harness species* = a concrete harness (Claude Code CLI, Codex, …; detail in `~/.claude/research/harness-engineering-2026/`) · *meta-harness* = harness-agnostic. **Always qualify "harness"** (species/genus) — bare "harness" is a lint target.

## §17 — pm identity + Ontology-First (the north-star, confirmed)

**What the Ontology IS** (not a data model / knowledge graph): a governed **semantic** (object / property / shared-property / link / interface = nouns) + **kinetic** (action / function = verbs) layer — the codebase's **"digital twin"** — where a decision = **Data + Logic + Action + Security** bound in ONE model (the Action/write-back layer is what makes it operational, not a catalog). **Ontology-First = every surface BINDS to that one Ontology** (one meaning, many consumers); local re-definition is the defect. It is a *binding* principle, **not** a "consult-the-ontology-first" retrieval tactic. pm's mutation surface (`emit_event` / the write path) is the kinetic **ActionType** layer; rules 10 (events) / 26 (memory) / 07 (tool-ownership) are **three views of one ontology-governed substrate** under one policy.

**Two altitudes** (pm's deliberate non-dev adaptation — Palantir does NOT split build vs operate): **Altitude-1 — OntologyEngineering, on demand** (a turn-by-turn 9-axis FDE-session, Lead proposes each axis + user confirms → **SemanticIntentContract** *records the approved boundary* → **SIC→DTC** converts it to concrete primitives → Claude/Codex build the Ontology); **Altitude-2 — everyday Ontology-First operation** atop the built ontology (impact analysis is one example). The 9-axis understand-phase runs at **Altitude-1 ONLY** — never forced per task. Detail: memory `pm-intent-and-architecture`; grounding: `~/harness-upstream/_workspace/2026-06-09-palantir-mini-legacy-audit/ONTOLOGY-FIRST-meaning-2026-06-10.md`.

**pm IS the runtime-neutral harness** — every non-model control surface (instruction / context / tool-registry / policy+approval / sandbox / audit / recovery) grounding an LLM through understand→act→verify→recover→stop. **Claude / Codex / Gemini runtimes are ADAPTERS** (model + raw execution = the Hands), swapped beneath the one harness — NOT a "Brain dispatching across harness species" (superseded framing).

**Why this is runtime-invariant**: the Ontology + append-only `events.jsonl` lineage live in pm (**Brain/Session**), not in any runtime (**Hands**), so every adapter reasons from the SAME canonical, machine-checkable substrate — meaning is single-sourced (cures drift), runtime-neutral (no adapter re-derives it), auditable (5-dim ForwardProp/BackwardProp), compounding (M-SELF). Cross-refs: rule 07 / 10 / 27; CORE.md north-star; memory `pm-harness-north-star`.

| Layer | Component | Role |
|-------|-----------|------|
| **Brain** | pm harness + model | thinking — plans, decides, grounds in ontology |
| **Hands** | runtime adapter / sandbox | action — runs tools, writes files (*"cattle, not pets"*) |
| **Session** | `events.jsonl` (append-only) | state — swappable independently |

---
**v3.6.0** (2026-06-10): SLIM — split the rule-authoring procedure (§4-§13, §16, §18, §19) into on-demand `AUTHORING.md`, cutting per-turn tokens ~60%; kept the every-turn framing (§1-3, §13.5 cross-runtime, §14, §15, §17). §17 reconstructed on the user-confirmed intent: the Ontology's real meaning (semantic+kinetic "digital twin"; decision=Data+Logic+Action+Security; Ontology-First = a BINDING principle) + pm's two-altitude model. Prior: v3.5.0 (§17 reconstruct); v3.4.0 (slim + pm-identity reconcile); v3.3.0 Wave-3; v3.0.0 Brain-of-Swarms; v1.0.0 (PR #123). Author: Lead opus[1m].
