# palantir-vision/architecture-gap/ — Structure Index

Structural reference for architecture-gap analysis.

## File catalog

| File | Role |
|------|------|
| `ontology-model.md` | Structural interpretation of Palantir ontology primitives and layering |
| `orchestration-map.md` | Orchestration and propagation map |
| `adapter-gap-analysis.md` | Where palantirkc diverges intentionally from upstream patterns |
| `semantic-intent-gate-for-ontology-engineering.md` | Interpretation layer for requiring user-confirmed semantic intent before Ontology Engineering and Harness execution |

## Companion plans

| Plan | Role |
|------|------|
| `~/.claude/plans/2026-05-09-lead-intent-to-digital-twin-gap-analysis.md` | Claude-facing implementation proposal for `pm_lead_brief -> SemanticIntentContract -> DigitalTwinChangeContract -> pm_intent_router`, including ambiguity closure, community failure-mode evidence, and final-review authority for major palantir-mini plugin rewrites when bottlenecks block the contract boundary |

## Boundary

- Upstream official docs still win on exact product facts.
- This directory exists to explain divergence, not to erase it.
- Plans carry implementation authority; this directory carries interpretation and routing.
