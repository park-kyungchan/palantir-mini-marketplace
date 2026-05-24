# Interaction Schema — Structure Index

Structural reference for `~/.claude/schemas/interaction/`.

`BROWSE.md` routes interaction questions. `INDEX.md` explains coverage, authority flow, and maintenance discipline.

## Role Contract
- Schema-level automation should stay reusable across projects.
- Project-specific gesture semantics belong downstream in project interaction declarations, contracts, tests, and runtime.

## Role Map

| File / Directory | Role |
|------------------|------|
| `semantics.ts` | Meta-level semantic authority: GESTURE_EXPOSURE_SYMMETRY, foundational interaction classification, schema version |
| `types.ts` | Export contracts: InteractionDomain, GestureSystem, EventStream, InteractionExports, InteractionHardConstraint, InteractionDecisionHeuristic |
| `gesture/schema.ts` | HC-GEST-* / DH-GEST-* constants: physical gesture declaration and classification |
| `binding/schema.ts` | HC-BIND-* / DH-BIND-* constants: gesture → action/navigation binding rules |
| `element/schema.ts` | HC-ELEM-* / DH-ELEM-* constants: DOM element gesture ownership and profile configuration |
| `component/schema.ts` | HC-COMP-* / DH-COMP-* constants: component composition (state propagation, ID convention, selection, wrapper behavior) |
| `validator.ts` | Runtime validator: validates project InteractionExports against HC-INT, HC-GEST, HC-BIND, HC-ELEM constants |
| `validator.test.ts` | Validation test suite: coverage for validator.ts; 13 of 20 HC constants have runtime validators |

## Authority Flow

```text
~/.claude/research/interaction/pointer-events-spec.md       (§PE.FIRE-01)
~/.claude/research/interaction/wcag-gesture-requirements.md (§WCAG.TS-01, §WCAG.PG-01)
~/.claude/research/interaction/os-system-gestures.md        (§GEST.OS-01)
  → ~/.claude/schemas/interaction/semantics.ts              (GESTURE_EXPOSURE_SYMMETRY)
  → ~/.claude/schemas/interaction/*/schema.ts               (HC/DH constants)
  → project interaction declarations                        (validated by validator.ts)
```

Cross-reference:
```text
~/.claude/schemas/meta/types.ts (ConstraintContext)
  → imported by schemas/interaction/types.ts (InteractionHardConstraint.context)

~/.claude/schemas/ontology/types.ts (OntologyExports)
  → parallel axis: ontology describes WHAT exists; interaction describes HOW users interact with it
```

Parallel schema axes:
```text
schemas/ontology/types.ts    → OntologyExports    (what exists — DATA/LOGIC/ACTION domain)
schemas/interaction/types.ts → InteractionExports  (how users interact — gestures, WCAG)
schemas/rendering/types.ts   → RenderingExports    (how things are displayed in 3D)
```

## Provenance

| Source | Markers | Description |
|--------|---------|-------------|
| `~/.claude/research/interaction/wcag-gesture-requirements.md` | §WCAG.TS-01, §WCAG.PG-01 | WCAG 2.1 touch target size + pointer gesture alternative requirements |
| `~/.claude/research/interaction/pointer-events-spec.md` | §PE.FIRE-01 | W3C Pointer Events spec — event firing order, unified pointer/touch/mouse stream |
| `~/.claude/research/interaction/os-system-gestures.md` | §GEST.OS-01 | OS-reserved gesture list (iOS back swipe, Android home gesture, notch zones) |
| `palantir-math v2.0 session (2026-03-22)` | HC-INT-01, HC-INT-04 | Root case: two gesture libraries on same DOM element caused event stream conflict |
| `palantir-math v9.0 E2E audit (2026-03-24)` | HC-COMP-* | 7 component composition bugs not covered by gesture/binding/element sub-schemas |

## File Ownership

| File / Directory | Maintained By | Update Trigger |
|------------------|--------------|----------------|
| `semantics.ts` | Schema maintainer | New foundational interaction pattern discovered |
| `types.ts` | Schema maintainer | New InteractionDomain, EventStream, or export contract needed |
| `gesture/schema.ts` | Schema maintainer | New gesture class discovered; OS-reserved gesture list updated |
| `binding/schema.ts` | Schema maintainer | New gesture → action binding rule needed |
| `element/schema.ts` | Schema maintainer | New DOM element configuration constraint discovered |
| `component/schema.ts` | Schema maintainer | New component composition bug backpropagated from project |
| `validator.ts` | Schema maintainer | New HC constant with runtime-checkable invariant added |
| `validator.test.ts` | Schema maintainer | New HC constant added; test coverage must expand |
| `BROWSE.md` / `INDEX.md` | Schema maintainer | Subdomain count changes; new markers or research files added |

## Change Discipline

- When a new project interaction bug is discovered: backpropagate to the relevant subdomain schema, add HC/DH constant, add validator coverage in `validator.ts` when checkable at runtime, add test in `validator.test.ts`, update `BROWSE.md` subdomain route table, and update this file's Role Map.
- When new WCAG, Pointer Events, or OS gesture research is added to `~/.claude/research/interaction/`, update the Provenance table and BROWSE.md marker table to reflect new marker families.
- Do not store project-local interaction truth in this schema package — project interaction declarations are the runtime location.
- Keep HC/DH constants reusable: one constant should apply to any project, not just palantir-math.
