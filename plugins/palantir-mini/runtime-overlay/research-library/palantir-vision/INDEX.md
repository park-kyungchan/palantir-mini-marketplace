# palantir-vision/ — Structure Index

Structural reference for the synthesis layer. `BROWSE.md` is the query router.

## Role contract

- Interpretation layer on top of `~/.claude/research/palantir-developers/` and `~/.claude/research/palantir-foundry/`.
- Holds leadership talks, philosophy essays, TypeScript/OSDK analysis, Decision Lineage interpretation, adapter-gap analysis, internal audits, and consolidated synthesis docs.
- Defers to official docs for product facts and to project-local ontology for runtime behavior.

## Directory map

| Path | Content | Count | Harness species mentioned |
|------|---------|-------|--------------------------|
| `philosophy/` | Ontology-first vision, digital twin, LLM grounding, tribal knowledge essays | 7 MD | none-direct (architectural philosophy) |
| `aipcon-devcon/` | AIPCon 9 / DevCon 5 / announcements / AI FDE / AIP Evals / model catalog / workflow lineage notes | 9 MD | task-specific harness (Prithvi 3-agent referenced via AI FDE [§FDE-05] DevCon 5 builder loop) |
| `typescript/` | TypeScript-first and type-safety rationale | 4 MD | none-direct (type system rationale) |
| `decision-lineage/` | Workflow-lineage-focused routing and lineage bridge docs | 3 MD | palantir-mini-sprint-harness (decision lineage = palantir-mini substrate) |
| `cross-cutting/` | LLM independence, progressive autonomy, tool exposure, broad lineage framing | 6 MD | cross-species (K-LLM thesis applies across all harness species) |
| `ship-os/` | Application proposal patterns, stack evaluation, deployment patterns | 5 MD | palantir-mini-sprint-harness + Claude Code CLI harness |
| `architecture-gap/` | Adapter gap analysis, orchestration map, ontology-model interpretation, semantic-intent gate for Ontology Engineering, and routing to the 2026-05-09 Lead intent-to-Digital-Twin proposal | 6 MD | palantir-mini-sprint-harness (adapter gap relative to Foundry AI FDE) |
| `audits/` | Internal audit artifacts | 3 MD | palantir-mini-sprint-harness (audit artifacts) |
| `synthesis/` | (MIGRATING 2026-05-01 → `~/docs/research-synthesis/` per cosmic-hatching-pizza plan W2) | 8 MD | mixed; row will be removed post-migration |

Total: ~50 MD files including routing docs (post-migration: ~42).

**Harness vocabulary** — see `~/.claude/rules/CONTEXT.md §15 Glossary` for canonical taxonomy. `harnessSpeciesMentioned` is also a per-file frontmatter field (W1 standardization, pending).

**Stale rule**: per-file `lastVerified` field (W1 frontmatter) — files with `lastVerified > 90 days ago` flagged stale by extended `pm_rule_audit`.

## Provenance per subdir

- `philosophy/` — [Synthesis] + [Official]
- `aipcon-devcon/` — [Official] + [Official]-derived
- `typescript/` — [Official] + [Synthesis]
- `decision-lineage/` — [Official] + [Inference] + [Adapter]
- `cross-cutting/` — [Inference] + [Adapter]
- `ship-os/` — [Inference] + [Vision]
- `architecture-gap/` — [Adapter]
- `audits/` — [Internal]
- `synthesis/` — [Synthesis]

## File naming conventions

- Source-aligned notes use stable topical names like `aipcon.md`, `devcon.md`.
- Synthesis files use `YYYY-MM-DD-topic.md`.
- Adapter docs use topical names, not dates.

## Maintenance rules

- New synthesis docs are additive.
- Keep routing exact; avoid glob-based instructions.
- When `palantir-foundry/` contradicts an interpretation here, update the interpretation rather than splitting authority.

## Restructure provenance

Legacy `~/.claude/research/palantir/` material was split into:

- `palantir-developers/` — official builder entry layer
- `palantir-foundry/` — official fact layer
- `palantir-vision/` — interpretation layer

## 2026-05-09 Lead intent-to-Digital-Twin interpretation route

Use `architecture-gap/BROWSE.md` when the question is local interpretation of official Palantir AI FDE, Ontology, MCP, Global Branching, AIP Evals, or Workflow Lineage material. The detailed Claude-facing implementation proposal lives outside research:

- `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md`

This separation is intentional:

- `palantir-vision/architecture-gap/semantic-intent-gate-for-ontology-engineering.md` explains the interpretation layer.
- The plan records the final implementation direction ambiguity-closure loop, community failure-mode catalog, and final-review permission for major palantir-mini plugin rewrites.
- Official product facts still come from `palantir-foundry/`, not this directory.

Historical pre-split material remains available in `_archive/2026-04-20-palantir-consolidation/`.
