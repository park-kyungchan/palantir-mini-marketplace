# Ontology Schema — Structure Index

Structural reference for `~/.claude/schemas/ontology/`.

`BROWSE.md` routes schema questions. `INDEX.md` explains coverage, authority flow, and maintenance discipline.

## Role Contract
- Schema-level automation should stay reusable across projects.
- Project-specific meaning belongs downstream in project ontology, contracts, tests, and runtime.

## Role Map

| File | Role |
|------|------|
| `semantics.ts` | meta-level semantic authority and schema version |
| `types.ts` | export contracts for backend, frontend, runtime, and LEARN infrastructure |
| `project-validator.ts` | deterministic structural/reference validation |
| `semantic-audit.ts` | meaning-level coverage audit and upgrade planning |
| `project-test.test.ts` | portable project-facing entrypoint that composes validator + audit |
| `research-source-map.ts` | schema-local crosswalk that translates legacy `research/palantir/*` citations into the active research split |
| `upgrade-apply.ts` | upgrade spec to patch generation |
| `helpers.ts` | shared naming helpers |
| `validate-file.ts` / `validate-rules.ts` | file/rule-level validation utilities |
| `CHANGELOG.md` | versioned change history |

## palantir-mini Primitives Layer (v0)

Typed executable contracts for the `palantir-mini` plugin
(`~/.claude/plugins/palantir-mini/`). These primitives promote the active
research split from declarative evidence to executable contract across
`kosmos / palantir-math / mathcrew` and future projects.

| Subdir | Files | Role |
|--------|-------|------|
| `primitives/` | object/link/action/property/interface plus governance, harness, eval, agent, and AIP/Foundry operational primitives | DATA + LOGIC + ACTION + LEARN + OPS primitive declarations |
| `functions/` | `function-signature.ts`, `derived-property.ts`, `reducer.ts` | LOGIC compute primitives (EditFunction, DerivedProperty, Reducer) |
| `policies/` | `submission-criteria.ts`, `rbac.ts`, `propagation.ts` | SECURITY + propagation policies (9 constraint classes, Layer-1 RBAC, ForwardProp + BackwardProp) |
| `lineage/` | `decision-lineage.ts`, `event-types.ts` | LEARN Decision Lineage 5-dim + runtime EventEnvelope registry |
| `generators/` | `osdk-2.0-config.ts`, `lazy-loader.ts` | Codegen configuration (OSDK 2.0 client/generated split, LazyRef pattern) |

New AIP/Foundry operational primitives added in v1.37:

| File | Role |
|------|------|
| `primitives/object-view.ts` | Object View exposure boundary for apps/workflows/agent tools |
| `primitives/ontology-branch-proposal.ts` | Global Branching / AI FDE proposal lifecycle |
| `primitives/aip-evaluation.ts` | AIP Evals suites, test cases, runs, experiments |

**Provenance**: Derived from the kosmos TechBlueprint
(`park-kyungchan/kosmos@767fa10`) produced by the 7-agent Agent Teams
research pipeline (T1–T12, R1–R15 evaluator gates, 0 debate rounds,
evaluator verdict ACCEPT). H-A append-only event log won 0 lost / 2000
at 2-writer adversarial race vs H-B 484 / 2000 (24.2% loss rate).

**Consumers**: The locally-installed `palantir-mini` plugin
(`plugins/palantir-mini/lib/codegen/descender-gen.ts`) reads these
declarations and emits per-project generated TypeScript into
`<project>/src/generated/`. End-to-end verified against `~/projects/palantir-math`.

## Authority Flow

> Design rationale (the WHY behind these ontology primitives — 9-axis/DTC/OSDK-binding/lineage) is distilled in `~/harness-upstream/ssot/palantir/` (DESIGN-authority), UPSTREAM of this schema/codegen contract layer (the WHAT). This package (`@palantirKC/claude-schemas`, in-plugin `runtime-overlay/schemas-snapshot/`) is the SOLE canonical contract-surface authority (rule 08 v2.2.0; g12 `de-2026-07-11-schemas-authority-ruling-plugin-self-containment-confirmed`) — not a mirror of any external tree; the retired `~/.claude/schemas/` tree mirrored THIS package, not the reverse.

```text
~/.claude/research/palantir-developers/
  -> ~/.claude/research/palantir-foundry/
  -> ~/.claude/research/palantir-vision/
  -> ~/.claude/research/_archive/2026-04-20-palantir-consolidation/ (legacy bridge only)
  -> research-source-map.ts
  -> semantics.ts
  -> types.ts
  -> project-validator.ts / semantic-audit.ts
  -> project ontology/schema.ts
  -> project runtime/tests
```

## AI-Agent Retrieval Contract

- Agents should treat schema files as the downstream contract layer, not as an excuse to skip research provenance.
- Agents should select schema context through palantir-mini
  `research_context_select` where available, or through `BROWSE.md`'s minimal
  schema slices.
- When an entry or domain file still cites a legacy `research/palantir/*` path, agents must resolve it through `research-source-map.ts` before claiming authority.
- `palantir-developers/` answers "where do I start"; `palantir-foundry/` answers "what is officially true"; `palantir-vision/` answers "how do we interpret or adapt it"; `_archive/` answers only "what exact legacy nuance is this schema still carrying".
- The goal is not "zero old strings". The goal is "zero false authority".

## Change Discipline
- When LEARN, Workflow Lineage, BackPropagation, or project-scope semantics change, update `types.ts`, `semantic-audit.ts`, `project-validator.ts`, `project-test.test.ts` when needed, `CHANGELOG.md`, and this directory’s `BROWSE.md` / `INDEX.md` together.
- Keep schema docs maintainable and extensible by documenting new validation or upgrade paths here instead of hiding them in ad hoc scripts.
