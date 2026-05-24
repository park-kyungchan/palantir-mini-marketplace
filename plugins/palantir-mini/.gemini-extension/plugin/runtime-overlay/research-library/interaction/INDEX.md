# research/interaction/ — Structural Reference

## Purpose
Frontend gesture + pointer + accessibility evidence library. Feeds `~/.claude/schemas/interaction/` typed schema.

## Authority Boundary
Evidence only. Project-local interaction contracts live in each project's `ontology/interaction.ts` (if applicable).

## File Tree
```
interaction/
├── BROWSE.md
├── INDEX.md
├── os-system-gestures.md          [Official] iOS, Android, Windows system gestures
├── pointer-events-spec.md         [Official] W3C Pointer Events L3 / L4 spec
└── wcag-gesture-requirements.md   [Official] WCAG 2.2 SC 2.5 (Input Modalities)
```

## Provenance Summary
- `[Official]`: 3
- Last verified: 2026-03-22 (os-system-gestures via scrapling MCP)

## Cross-References
- `~/.claude/schemas/interaction/BROWSE.md` — typed schema router
- `~/.claude/schemas/rendering/` — rendering surface integration
- `../palantir/platform/` — Palantir Tool Exposure doctrine (gesture-exposure parallel)

## Notes
Created 2026-04-17 (previously had no BROWSE/INDEX). Content in source files is current.
