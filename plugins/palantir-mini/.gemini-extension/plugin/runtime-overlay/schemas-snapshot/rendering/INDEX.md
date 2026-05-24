# Rendering Schema — Structure Index

Structural reference for `~/.claude/schemas/rendering/`.

`BROWSE.md` routes rendering questions. `INDEX.md` explains coverage, authority flow, and maintenance discipline.

## Role Contract
- Schema-level automation should stay reusable across projects.
- Project-specific 3D rendering meaning belongs downstream in project world files, contracts, tests, and runtime.

## Role Map

| File / Directory | Role |
|------------------|------|
| `semantics.ts` | Meta-level semantic authority: RENDERING_AUTHORITY, RENDERER_MATERIAL_MATRIX, CDN_DEPENDENCY_RULE, schema version |
| `types.ts` | Export contracts: RenderingDomain, RendererBackend, MaterialSystem, RenderingExports, RenderingHardConstraint |
| `materials/schema.ts` | HC-RENDER-MAT-* constants (5): material selection, R3F Suspense font trap, WebGPU/WebGL material matrix |
| `pipeline/schema.ts` | HC-RENDER-PIPE-* constants (5): MRT selective bloom, post-processing chain ordering, fog configuration |
| `scene/schema.ts` | HC-RENDER-SC-* constants (4): stale closure prevention, input state management in useFrame/useCallback |
| `performance/schema.ts` | HC-RENDER-PERF-* constants (6): useFrame setState prevention, texture lifecycle, CJK text wrapping |
| `rendering.test.ts` | Validation test suite: well-formedness and internal consistency of all HC/DH constants |

## Authority Flow

```text
mathcrew project backpropagation table (teaching-framework.md)
  → ~/.claude/schemas/rendering/semantics.ts  (RENDERING_AUTHORITY)
  → ~/.claude/schemas/rendering/*/schema.ts   (HC/DH constants)
  → project world/*.tsx                       (validated by 3D Scene Audit skill)
```

Cross-reference:
```text
~/.claude/schemas/meta/types.ts (ConstraintContext)
  → imported by schemas/rendering/types.ts (RenderingHardConstraint.context)
```

Parallel schema axes:
```text
schemas/ontology/types.ts   → OntologyExports  (what exists — DATA/LOGIC/ACTION domain)
schemas/interaction/types.ts → InteractionExports (how users interact — gestures, WCAG)
schemas/rendering/types.ts  → RenderingExports  (how things are displayed in 3D)
```

## Provenance

This schema domain is backed by **empirical project evidence**, not external specification documents.

| Source | Description |
|--------|-------------|
| `mathcrew v0.1–v0.10` | 24+ bugs from 3D educational math world development (2026-03-23/24) |
| `teaching-framework.md` | Project-level backpropagation table — each bug → root cause → schema constant |
| `Three.js r182–r183 changelog` | Secondary: material API changes (NodeMaterial, WebGPU adapter) |
| `WebGPU spec` | Secondary: GPU pipeline constraints affecting material selection |
| `R3F v9.5 release notes` | Secondary: React Three Fiber hook behavior changes |

Unlike `schemas/ontology/` (backed by 73 Palantir research files) and
`schemas/interaction/` (backed by §TE-02 Tool Exposure / WCAG specification),
this domain's authority is empirical backpropagation from real project bugs.

## File Ownership

| File / Directory | Maintained By | Update Trigger |
|------------------|--------------|----------------|
| `semantics.ts` | Schema maintainer | New bug class discovered; RENDERING_AUTHORITY totalConstants changes |
| `types.ts` | Schema maintainer | New RenderingDomain, RendererBackend, or MaterialSystem variant needed |
| `materials/schema.ts` | Schema maintainer | New material-selection bug backpropagated from project |
| `pipeline/schema.ts` | Schema maintainer | New post-processing or MRT bug backpropagated |
| `scene/schema.ts` | Schema maintainer | New React/R3F pattern bug backpropagated |
| `performance/schema.ts` | Schema maintainer | New frame-budget or texture lifecycle bug backpropagated |
| `rendering.test.ts` | Schema maintainer | New HC constant added; test coverage must expand |
| `BROWSE.md` / `INDEX.md` | Schema maintainer | Subdomain count changes; new questions need routing |

## Change Discipline

- When a new project bug is backpropagated: add HC/DH constant to relevant subdomain schema, update `RENDERING_AUTHORITY.totalConstants` in `semantics.ts`, add test case in `rendering.test.ts`, update `BROWSE.md` subdomain route table, and update this file's Role Map.
- Do not store project-local rendering truth in this schema package — project world/*.tsx files are the runtime location.
- Keep schema constants reusable: one HC constant should apply to any project using Three.js / R3F, not just mathcrew.
