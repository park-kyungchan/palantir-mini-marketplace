---
title: "Connecting Agents to Decisions" — Verbatim Mirror
slug: blog-connecting-agents-2026-04-29
source: https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40
publishedAt: 2026-04-29
mirroredAt: 2026-05-03
authority: external/official  # Palantir corporate blog
mirrorReason: "Anchor for rule 26 v1.0.0 (Valuable Data Operating Standard); 4-layer agentic memory (working/episodic/semantic/procedural) verbatim quote propagated into ~/.claude/schemas/ontology/primitives/agentic-memory-layer.ts."
---

# Verbatim Mirror — Palantir Blog "Connecting Agents to Decisions"

> ⚠ **AI-agent READ-ONLY**. This file is a verbatim mirror of an external official source.
> Do not edit body text. Update frontmatter ONLY for navigation/policy corrections.
> Internal palantir-mini synthesis goes to `~/.claude/plans/`, never here (rule 02 §Research retrieval).

**Source**: https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40
**Published**: 2026-04-29 (4 days before mirror)
**Author**: @PalantirTech
**Public reach** (at time of mirror): 115.3K views, ≥1.6K shares.

---

## Why this mirror exists

This blog formalizes — at corporate-blog level — the substrate that decision lineage IS the BackPropagation circuit refining all 4 forms of agentic memory. Prior Palantir public material (AIPCon 9 / DevCon 5 §DC5-02, AI FDE §FDE-08, AIP Evals 5-evaluator taxonomy) covered pieces; this blog joins them under a single corporate authority signal.

palantir-mini rule 26 v1.0.0 (Valuable Data Operating Standard, 2026-05-03) cites this blog as the anchor for:

- **§Axis E (Memory-mapped)** — `AgenticMemoryLayer` enum (working / episodic / semantic / procedural).
- **§Definition** — "valuable data closes the BackPropagation circuit" framing.
- **§Substrate routing** — T0 reject / T1 ops / T2 candidate / T3 circuit input / T4 promotion grading.

---

## §Q1 — Decision lineage definition (verbatim)

> *"At Palantir, we have always believed that the path to durable AI advantage runs through Decisions, not Models. Connecting agents to decisions means tying every agent action — whether a draft, a forecast, an alert, or an autonomous handoff — back to the specific decision it was meant to inform."*

**palantir-mini propagation**: rule 26 v1.0.0 §Definition (decision-paired event closes the circuit).

---

## §Q2 — Five-dimensional Decision Lineage (verbatim)

> *"Decision lineage records, for every agent action, when a given decision was made, atop which version of enterprise data, and through which application — by whom, with what reasoning."*

**palantir-mini propagation**: rule 10 v2.1.0 5-dim envelope (`when` / `atopWhich` / `throughWhich` / `byWhom` / `withWhat`) + `LineageRefs` schema primitive (schemas v1.35.0; `actionRid` / `dryRunRef` / `outcomePairId` / `evidenceUrls` / `playgroundSandboxId`).

---

## §Q3 — 4-layer agentic memory (verbatim)

> *"Decision lineage is the substrate that allows us to continuously refine all forms of agentic memory: working memory (the active context an agent holds during a task), episodic memory (the specific past sessions and outcomes that inform learning), semantic memory (the typed knowledge graph that gives agents shared truth), and procedural memory (the skills, tools, and routines an agent has been taught to apply)."*

**palantir-mini propagation**:
- `AgenticMemoryLayer` schema primitive (schemas v1.35.0 `agentic-memory-layer.ts`): `"working" | "episodic" | "semantic" | "procedural"`.
- `EventEnvelopeBase.withWhat.memoryLayers?: AgenticMemoryLayer[]` (decision-lineage extension).
- `pm_memory_layer_audit` MCP handler (palantir-mini v4.1.0 Phase 3.4).
- `memory-layer-validator` PostToolUse hook (palantir-mini v4.1.0 Phase 2.3) advisory + auto-tag heuristic table (50+ event types).
- 22 active agent §Memory layer declaration (palantir-mini v4.2.0 Phase 6).

---

## §Q4 — Continuous refinement circuit (verbatim)

> *"Each decision becomes both an output and an input — the artifact of one judgment and the data that improves the next. This is how an enterprise builds compounding intelligence rather than islands of automation."*

**palantir-mini propagation**:
- T3+ events feed BackPropagation circuit input substrate (rule 26 §Substrate routing).
- `OutcomePairing` schema primitive (schemas v1.35.0 `outcome-pairing.ts`) — typed before/after delta on every paired action.
- `outcome-pair-tracker` PostToolUse hook (palantir-mini v4.1.0 Phase 2.2) — pair lifecycle markers under `<sessionDir>/outcome-pairs/`.
- `pm_outcome_pair_audit` MCP handler — orphan ratio + avg latency dashboard.

---

## Cross-references

- `~/.claude/rules/26-valuable-data-standard.md` — rule 26 v1.0.0 (this blog is the §Anchor).
- `~/.claude/schemas/ontology/primitives/value-grade.ts` — T0-T4 grading per §Substrate routing.
- `~/.claude/schemas/ontology/primitives/agentic-memory-layer.ts` — 4-layer enum from §Q3.
- `~/.claude/schemas/ontology/primitives/lineage-refs.ts` — typed cross-references (Axis A3).
- `~/.claude/schemas/ontology/primitives/outcome-pairing.ts` — pair lifecycle (Axis B1).
- `~/.claude/plans/nifty-mixing-diffie.md` — predecessor plan (Phase 0+1+4 merged 2026-05-03).
- `~/.claude/plans/quiet-fluttering-garden.md` — current plan (Phase 2-7 + Optional, this PR).
- `palantir-vision/aipcon-devcon/BROWSE.md §A1` — local navigation route.

---

## Mirror provenance

- **Mirror author**: Lead opus[1m].
- **Mirror date**: 2026-05-03 (sprint-022-quick PR3, plan `quiet-fluttering-garden`).
- **Verbatim quotes verified against**: blog.palantir.com URL + @PalantirTech post 2026-04-29.
- **Mirror policy** (rule 02 §Authority across runtimes): research/ is AI-agent read-only SSoT for upstream evidence routing. This file is external evidence verbatim; updates require re-fetching from canonical URL.
