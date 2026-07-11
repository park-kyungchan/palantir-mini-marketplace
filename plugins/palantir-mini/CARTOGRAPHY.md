# CARTOGRAPHY — palantir-mini entry map

palantir-mini is an ontology-first control plane: one governed meaning (ontology +
contracts), swappable per-runtime adapters. Governance invariants: append-only
lineage (`.palantir-mini/session/events.jsonl`, never blind-deleted), approval
before mutation (SIC → DTC gates ahead of any commit), and strict SSoT boundaries
(events.jsonl is truth; Convex and snapshots are caches/mirrors, never authority).

## Relationship diagram

```
        Altitude-1 (FDE ontology-engineering ladder, 8 stages)
        docs/altitude1-runtime-guide/{README,BROWSE,INDEX}.md
        pm_ontology_engineering_workflow + pm_semantic_intent_gate
                          |
                          v  (builds/advances the ontology)
                     [ ontology ]
                          |
                          v  (consumed read-only during normal work)
        Altitude-2 (everyday MCP operation, 12/24 tools visible)
        PALANTIR_MINI_MCP_PROFILE=altitude-2 (.mcp.json)
                          |
        +-----------------------------+-------------------------------+
        |                             |                                |
        v                             v                                v
  events.jsonl  <---append---   Path B in-process emit          SecondBrain (orthogonal
  (the spine,               (scripts/log.ts emit(), used         memory lane: Stop hook
   append-only,              because emit_event/commit_edits      bookmark -> SessionStart
   5D lineage)                are HIDDEN under altitude-2)         dispatches fold agent)
        |
        v  (secondary mirror only, never authority)
  Convex (convex/schema.ts: impactEdges/fileState/graphMutations,
  decisionEvents T3+/T4 mirror, evalSuites/evalRuns)
```

## Routing table — task intent -> read exactly these files

| Task intent | Entry files | Also consult |
|---|---|---|
| Build/change ontology (Altitude-1) | `docs/altitude1-runtime-guide/README.md`, `bridge/handlers/pm-ontology-engineering-workflow.ts`, `bridge/handlers/pm-semantic-intent-gate.ts` | `docs/altitude1-runtime-guide/{BROWSE,INDEX}.md` |
| Everyday operation (Altitude-2) | `.mcp.json`, `lib/capability-registry/mcp-tool-capability.ts` | `cartography/TOOLS.md` |
| Add/modify an MCP handler | `bridge/mcp-server.ts` (TOOLS[] + HANDLER_MODULES map), `bridge/handlers/<name>.ts` | `cartography/TOOLS.md` |
| Add/modify a hook | `hooks/hooks.json`, matching `hooks/<name>.ts` | `cartography/HOOKS.md` |
| Add/modify a skill | `skills/<skill-name>/SKILL.md` | `cartography/SKILLS.md` |
| Add/modify an agent | `agents/<name>.md` (frontmatter `model: sonnet` is normative) | `cartography/AGENTS.md` |
| Query lineage / impact | `lib/event-log/{read.ts,replay.ts,snapshot.ts}`, `lib/impact-graph/` | `cartography/DATAFLOW.md` |
| Second-brain / session-fold work | `hooks/second-brain-fold.ts`, `lib/second-brain/pending-fold.ts`, `agents/second-brain-fold.md` | `cartography/DATAFLOW.md`, `cartography/AGENTS.md` |
| Release / version work | `plugins/palantir-mini/CHANGELOG.md`, `package.json`, `bridge/handlers/pm-plugin-self-check.ts` | `docs/RUNTIME_LAYER_BOUNDARY.md` |
| Research lookup | `runtime-overlay/research-library/research-root/{BROWSE,INDEX}.md` (never glob the library directly) | — |

## Generated cartography pages

- `cartography/SKILLS.md` — generated, do not edit. One row per skill.
- `cartography/AGENTS.md` — generated, do not edit. One row per agent, its frontmatter model, and its trigger.
- `cartography/HOOKS.md` — generated, do not edit. Hook-event -> script map mirroring `hooks/hooks.json`.
- `cartography/TOOLS.md` — generated, do not edit. All 24 MCP tools with owning handler + surface profile.
- `cartography/DATAFLOW.md` — hand-written. Write paths, events.jsonl lifecycle, SecondBrain fold sequence, impact graph.

(These generator outputs may not exist yet in your checkout; a parallel task adds the generator. Reference them anyway once present.)

## Layer rule (normative)

Import direction is `bridge -> lib -> core`, one-way. `bridge/` may import `lib/`;
`lib/` may import `core/`; neither may import upward. **Known violations pending
fix** (lib/ importing bridge/ — flagged, not yet corrected):
`lib/ontology-context/retrieval-context.ts`, `lib/lead-intent/registered-ontology-rids.ts`,
`lib/lead-intent/ontology-ref-resolver.ts`, `lib/ontology-engineering-workflow/elevate.ts`,
`lib/delegation-recipe/recipe-builder.ts`.

tsconfig only typechecks `bridge/**`, `lib/**`, `hooks/**`, `scripts/**`, `tests/**`
(`core/` and `convex/` are excluded from typecheck).

## Forbidden zone

`runtime-overlay/research-library/` (3,873 files, 37MB mirrored Palantir docs) —
agents must never glob or read this directly. Entry only via
`runtime-overlay/research-library/research-root/{BROWSE,INDEX}.md`.

## Model policy (normative)

All subagents spawn as `model: sonnet` with maximum reasoning effort.
`agents/*.md` frontmatter is the single source of truth for model selection —
never pass `model` at spawn time.

## Reading order for deep work

`README.md` -> `SSOT-AUTHORITY.md` -> `docs/RUNTIME_LAYER_BOUNDARY.md` (only when
touching cross-runtime adapter boundaries).
