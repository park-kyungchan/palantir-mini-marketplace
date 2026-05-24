# Rendering Schema — Query Interface

Use this file when you know the question and want the smallest schema read set.

If you need structure, provenance, or change discipline instead, open `INDEX.md`.

## Role Contract
- `BROWSE.md` chooses the smallest schema read set for a concrete 3D rendering question.
- `INDEX.md` explains structure, provenance, authority flow, and maintenance discipline.
- Project-local rendering semantics stay downstream of this schema package.

## Read Order
1. project-local `BROWSE.md`
2. project-local `INDEX.md`
3. `~/.claude/research/BROWSE.md` when upstream reasoning is needed
4. `~/.claude/schemas/rendering/BROWSE.md`
5. target schema file(s)

## Primary Routes

| Question | Read These Files |
|----------|------------------|
| Where is 3D rendering semantic authority defined? | `semantics.ts` |
| Where are shared rendering types (domain classification, exports) defined? | `types.ts` |
| Which material type is correct for WebGPU vs WebGL? | `semantics.ts` (RENDERER_MATERIAL_MATRIX), `materials/schema.ts` |
| How are CDN font or texture dependencies constrained? | `semantics.ts` (CDN_DEPENDENCY_RULE) |
| Is the post-processing pipeline (MRT, bloom, fog) correct? | `pipeline/schema.ts` |
| Are React/R3F component patterns correct (stale closures, state)? | `scene/schema.ts` |
| Are frame budget / texture lifecycle / text rendering constraints met? | `performance/schema.ts` |
| How does the full validation test suite work? | `rendering.test.ts` |
| What changed recently? | Check git log for `schemas/rendering/` |

## Subdomain Routes (HC/DH Constant Prefixes)

| Prefix | Subdomain | File | Bug Source |
|--------|-----------|------|------------|
| `HC-RENDER-MAT-*` | Material selection, CDN deps, R3F Suspense | `materials/schema.ts` | mathcrew v0.3–v0.9 |
| `HC-RENDER-PIPE-*` | Post-processing chain, MRT, fog ordering | `pipeline/schema.ts` | mathcrew v0.9–v0.10 |
| `HC-RENDER-SC-*` | React/R3F stale closures, input state | `scene/schema.ts` | mathcrew v0.7 |
| `HC-RENDER-PERF-*` | useFrame setState, texture lifecycle, text | `performance/schema.ts` | mathcrew v0.7–v0.10 |

## Purpose: Empirical Backpropagation

This schema encodes 24+ bugs discovered during mathcrew v0.1–v0.10 (2026-03-23/24).
Each HC constant traces to a specific bug, commit, and root cause. This is the
LEARN loop applied to the meta-framework:

```text
Project bug (SENSE) → Root cause analysis (DECIDE) → Schema constant (ACT) → Future prevention (LEARN)
```

Authority chain:
```text
mathcrew project backpropagation table (teaching-framework.md)
  → schemas/rendering/ (this schema — meta-level constants)
    → project world/*.tsx (validated by 3D Scene Audit skill)
```

## Verification
- `bun test ~/.claude/schemas/rendering/rendering.test.ts`
- `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler ~/.claude/schemas/rendering/types.ts ~/.claude/schemas/rendering/semantics.ts`
