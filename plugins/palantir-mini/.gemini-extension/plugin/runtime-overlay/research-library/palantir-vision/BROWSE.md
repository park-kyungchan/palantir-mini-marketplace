# palantir-vision/ — Query Router

> **Scope:** Our synthesis layer: philosophy, conference/talk notes, TypeScript/OSDK rationale, Decision Lineage interpretation, architecture-gap analysis, audits, and date-stamped synthesis.
> **Authority:** Interpretation layer. Defers to `../palantir-developers/` and `../palantir-foundry/` for official facts, and to project-local ontology for runtime behavior.

## Primary routes

| Question | Open first |
|----------|------------|
| What is the ontology-first philosophy, digital twin, LLM grounding, or tribal knowledge argument? | `philosophy/BROWSE.md` |
| What was covered at AIPCon 9, DevCon 5, or recent official launch materials, and what should palantir-mini absorb? | `aipcon-devcon/BROWSE.md` |
| Why TypeScript / OSDK / structural typing matters in Palantir's stack? | `typescript/BROWSE.md` |
| How do we read Decision Lineage vs Workflow Lineage? | `decision-lineage/BROWSE.md` |
| What cross-cutting patterns matter across providers and agent surfaces? | `cross-cutting/BROWSE.md` |
| Where does our adapter diverge from upstream Palantir architecture? | `architecture-gap/BROWSE.md` |
| How should palantir-mini require user-confirmed semantic intent before Ontology Engineering? | `architecture-gap/semantic-intent-gate-for-ontology-engineering.md` |
| How should Claude route the full Lead intent-to-Digital-Twin proposal, including ambiguity closure and final-review authority for major plugin rewrites? | `architecture-gap/BROWSE.md` -> `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md` |
| What is the lowest-cognitive-cost synthesis on a topic, including MAVEN design reading? | `~/docs/research-synthesis/INDEX.md` |
| What internal audit findings exist? | `audits/BROWSE.md` |
| What is our Ship-OS / delivery interpretation? | `ship-os/BROWSE.md` |

## Fast paths

- Strategic direction:
  `philosophy/BROWSE.md` -> `~/docs/research-synthesis/INDEX.md`
- Managed-agent / palantir-mini alignment:
  `~/docs/research-synthesis/INDEX.md`
- MAVEN / defense design reading:
  `~/docs/research-synthesis/INDEX.md` -> `~/docs/research-synthesis/2026-04-23-maven-defense-osdk-design-reading.md`
- AI Agent / AI FDE / eval-loop direction for palantir-mini:
  `aipcon-devcon/BROWSE.md` -> `aipcon-devcon/ai-fde.md` + `aipcon-devcon/aip-evals.md` + `aipcon-devcon/devcon.md` + `aipcon-devcon/aipcon.md`
- Lead intent-to-Digital-Twin contract direction:
  `../palantir-foundry/BROWSE.md` -> `architecture-gap/BROWSE.md` -> `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md`

## Provenance markers

- `[Official]` — direct from Palantir talks, docs, blog posts, or API references.
- `[Inference]` — reasoning derived from official material.
- `[Adapter]` — palantirkc-specific mapping of an official concept.
- `[Vision]` — aspirational or forward-looking; not a fact claim.
- `[Synthesis]` — multi-source merge.

## Retrieval rules

- Use `~/docs/research-synthesis/` when the user wants the current internal position with minimum reading cost. The old `palantir-vision/synthesis/` route was migrated on 2026-05-01.
- Use subdir-scoped files when the user wants the underlying argument or talk evidence.
- Prefer exact files, not glob patterns.
- When citing in runtime code or ontology decisions, use absolute path plus marker anchors where available.

## Drift rule

When a `palantir-vision/` interpretation drifts from upstream official docs, the official layer wins and the synthesis should be updated rather than treated as co-equal authority.
