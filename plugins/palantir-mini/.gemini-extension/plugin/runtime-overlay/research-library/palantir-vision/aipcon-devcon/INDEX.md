# palantir-vision/aipcon-devcon/ — Structure Index

Structural reference for talk, announcement, and launch-note material.

## File catalog

| File | Role | Provenance |
|------|------|------------|
| `announcements.md` | Official platform update notes and launch deltas | [Official] |
| `aipcon.md` | AIPCon 9 notes and extracts | [Official] |
| `ai-fde.md` | AI FDE framing and builder-loop synthesis | [Official]-derived |
| `aip-evals.md` | AIP Evals framing and evaluator interpretation | [Official]-derived |
| `devcon.md` | DevCon series and DevCon 5 architecture notes | [Official]-derived |
| `model-catalog.md` | Public model/provider posture | [Official] |
| `workflow-lineage.md` | Workflow lineage interpretation from talks and launches | [Official/Synthesis] |

## Boundary

- Talks can be aspirational.
- Exact product behavior still belongs to official doc/API surfaces.
- `palantir-mini` roadmap changes should cite both this synthesis layer and the official fact layer.

## palantir-mini Integration Priority

| Theme | Start Here | Local Mapping |
|-------|------------|---------------|
| Shared mutable ontology for human-agent work | `devcon.md` [§DC5-02..06] | schema primitives, `~/ontology/shared-core/`, project ontology routers |
| Eval-driven builder loop | `ai-fde.md` [§FDE-05..08], `aip-evals.md` [§EVAL-*] | harness dry-run, grader dispatch, feedback-to-eval artifacts |
| Workflow and decision observability | `workflow-lineage.md`, `devcon.md` [§DC5-10] | `pm_workflow_lineage_query`, events 5D, replay/recap |
| Decision-centric Maven/ShipOS operations | `aipcon.md` [§APC9-06..07] | scenarios, progressive autonomy, decision lineage, model independence |
| Model/provider independence | `model-catalog.md`, `aipcon.md` [§APC9-07] | provider-neutral grader/model policy and fallback-free verification |
| **Decision lineage refining 4-layer agentic memory** (Palantir A1 blog 2026-04-29) | `blog-connecting-agents-2026-04-29.md` (verbatim mirror, Q1-Q4) + `BROWSE.md` §A1 + `~/.claude/plans/{nifty-mixing-diffie,quiet-fluttering-garden}.md` | rule 26 v1.0.0 (Valuable Data Operating Standard) + schemas v1.35.0 primitives (`value-grade.ts`, `agentic-memory-layer.ts`, `lineage-refs.ts`, `outcome-pairing.ts`, `refinement-target.ts`) + 3 hooks (value-grade-assigner / outcome-pair-tracker / memory-layer-validator) + 4 MCP handlers (pm_event_query_by_grade / pm_outcome_pair_audit / pm_value_grade_metrics / pm_memory_layer_audit) + 3 skills (pm-value-audit / pm-decision-replay / pm-memory-map) + 22 agent §Memory layer declaration + briefing-template-validate 5-section + session-start advisory |
