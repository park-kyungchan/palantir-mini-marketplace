# research/interaction/ — Query Router

> Scope: Gesture primitives, pointer/touch events, WCAG accessibility for gestural UIs.
> Authority: Evidence library; defers to `~/.claude/schemas/interaction/` for project-local contracts.

## Common Questions

| Question | File |
|----------|------|
| What OS-level system gestures exist across iOS/Android/Windows? | `os-system-gestures.md` |
| What's the W3C pointer events spec? | `pointer-events-spec.md` |
| What gesture requirements does WCAG enforce? | `wcag-gesture-requirements.md` |

## Cross-References
- `~/.claude/schemas/interaction/` — typed interaction schema (gestures, bindings, components, elements)
- `~/.claude/schemas/rendering/` — rendering surface that gestures target

## Invariants
- Evidence is `[Official]` (W3C, Apple HIG, Microsoft, WCAG).
- Prefer platform-neutral gesture primitives; platform-specific overrides go into schema `gesture/` subdomain.
