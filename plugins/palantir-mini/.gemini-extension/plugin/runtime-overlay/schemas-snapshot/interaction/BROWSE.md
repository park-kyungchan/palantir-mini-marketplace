# Interaction Schema — Query Interface

Use this file when you know the question and want the smallest schema read set.

If you need structure, provenance, or change discipline instead, open `INDEX.md`.

## Role Contract
- `BROWSE.md` chooses the smallest schema read set for a concrete gesture/accessibility question.
- `INDEX.md` explains structure, provenance, authority flow, and maintenance discipline.
- Project-local interaction semantics stay downstream of this schema package.

## Read Order
1. project-local `BROWSE.md`
2. project-local `INDEX.md`
3. `~/.claude/research/BROWSE.md` when upstream reasoning is needed
4. `~/.claude/schemas/interaction/BROWSE.md`
5. target schema file(s)

## Primary Routes

| Question | Read These Files |
|----------|------------------|
| Where is foundational gesture/WCAG semantic authority defined? | `semantics.ts` |
| Where are shared interaction types (domain, event stream, exports) defined? | `types.ts` |
| How do I validate a project's interaction declarations? | `validator.ts`, then `validator.test.ts` |
| Which physical inputs exist and how are they classified? | `gesture/schema.ts` |
| How does a gesture map to an ontology action or navigation? | `binding/schema.ts` |
| Which DOM elements own which gestures, and how are they configured? | `element/schema.ts` |
| How do components compose state, IDs, selection, and wrappers? | `component/schema.ts` |
| What changed recently? | Check git log for `schemas/interaction/` |

## Subdomain Routes (HC/DH Constant Prefixes)

| Prefix | Subdomain | File | Key Concern |
|--------|-----------|------|-------------|
| `HC-GEST-*`, `DH-GEST-*` | Gesture declarations (what inputs exist) | `gesture/schema.ts` | §GEST.OS-01: OS-reserved gestures must not be re-bound |
| `HC-BIND-*`, `DH-BIND-*` | Gesture → action binding (how input maps to system) | `binding/schema.ts` | §WCAG.TS-01: Touch targets ≥ 44×44px |
| `HC-ELEM-*`, `DH-ELEM-*` | Element profiles (DOM element gesture ownership) | `element/schema.ts` | HC-INT-01: One element → one gesture system |
| `HC-COMP-*`, `DH-COMP-*` | Component composition (state, IDs, selection, wrappers) | `component/schema.ts` | §WCAG.PG-01: pointer gesture alternatives required |
| `HC-INT-*` | Cross-cutting interaction constraints | `semantics.ts`, `element/schema.ts` | §PE.FIRE-01: PointerEvent stream unification |

## Key Research Markers

| Marker | Topic | Source File |
|--------|-------|-------------|
| §WCAG.TS-01 | Touch target minimum size (44×44px) | `~/.claude/research/interaction/wcag-gesture-requirements.md` |
| §WCAG.PG-01 | Pointer gesture alternatives (all path-based gestures need alternatives) | `~/.claude/research/interaction/wcag-gesture-requirements.md` |
| §PE.FIRE-01 | PointerEvent firing order and unified stream | `~/.claude/research/interaction/pointer-events-spec.md` |
| §GEST.OS-01 | OS-reserved gesture list (back swipe, notch, home gesture) | `~/.claude/research/interaction/os-system-gestures.md` |

## Purpose: Gesture Exposure Symmetry

This schema extends Palantir's Tool Exposure Model (§TE-02) to human agents.
The foundational claim in `semantics.ts`:

```text
Palantir AIP:  Ontology → Tool Exposure → AI Agent  (3 categories)
Interaction:   Ontology → Gesture Exposure → Human Agent  (4 domains)
```

Authority chain:
```text
~/.claude/research/interaction/ (pointer-events-spec.md, wcag-gesture-requirements.md, os-system-gestures.md)
  → schemas/interaction/ (this schema — meta-level constraints)
    → project interaction declarations
      → validated by validator.ts + validator.test.ts
```

## Verification
- `bun test ~/.claude/schemas/interaction/validator.test.ts`
- `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler ~/.claude/schemas/interaction/types.ts ~/.claude/schemas/interaction/semantics.ts ~/.claude/schemas/interaction/validator.ts`
