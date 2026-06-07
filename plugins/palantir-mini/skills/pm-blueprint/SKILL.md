---
name: pm-blueprint
category: research
surfaceStatus: public-core
description: "Generate a TechBlueprint for a new architecture question using a 7-agent research..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__replay_lineage
effort: medium
disable-model-invocation: false
---

# pm-blueprint — TechBlueprint research pipeline

## When to use

- The user needs a deep architectural decision validated before implementation.
- The user says "blueprint", "deep research", or "/palantir-mini:blueprint".
- A new tech stack is being evaluated for cross-project adoption.

## What this does

This skill runs a multi-agent TechBlueprint pipeline. palantir-mini standardizes the invocation and writes
the resulting `blueprint.json` + `final-report.md` to the project's
`.palantir-mini/session/` directory.

## How to run

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--topic <slug>` | No | Kebab-case topic identifier for the output filenames. If omitted, derived from the first line of the user prompt via slugify (kebab-case, ASCII only). |

### Output paths (session-scoped naming)

Each blueprint run produces three artifacts under the project's blueprints directory:

```
<project>/.palantir-mini/session/blueprints/
  YYYY-MM-DD-<topic-slug>.blueprint.json    # structured evaluation artifact
  YYYY-MM-DD-<topic-slug>.final-report.md  # human-readable final report (13 sections)
  _index.md                                 # auto-appended after each run (one row per blueprint)
```

`YYYY-MM-DD` is the run date (ISO format). If a same-day same-slug file already exists, a
collision-free suffix is appended: `-2`, `-3`, etc. — overwrite is never performed.

`_index.md` is regenerated after every run via `updateBlueprintIndex()` (see
`bridge/handlers/blueprint_write.ts`).

### Legacy fixed-name path

Prior to session-scoped naming (N1), output was written to a fixed path:
```
<project>/.palantir-mini/session/blueprint.json
<project>/.palantir-mini/session/final-report.md
```
This legacy path remains valid when invoked without the `--topic` flag in environments
that have not yet adopted `blueprint_write.ts`. New runs should use the session-scoped
naming above.

### Invocation examples

```bash
# With explicit topic slug
/palantir-mini:blueprint --topic "bun-vs-node-runtime"

# Without topic (slug derived from prompt first line)
/palantir-mini:blueprint
```

For the full pipeline:
```
# Use the pm-blueprint skill to launch T1-T12 with the 7-agent pipeline.
# Output routed via resolveBlueprintPath() in bridge/handlers/blueprint_write.ts
```

For single-project scope:
```
# resolveBlueprintPath({ project, topicSlug }) resolves the output paths.
# updateBlueprintIndex(projectPath) regenerates _index.md after writing.
```

## Success criteria

- `blueprint.json` passes the evaluator gate (R1-R15, 15 rejection criteria).
- `final-report.md` has all 13 sections.
- At least 2 competing hypotheses run through Simulation + Prototype + Eval phases.
- `evaluatorGate: "ACCEPT"` on the winning hypothesis.

## Rule citations

- `~/.claude/rules/01-ontology-first-core.md` — blueprints start from meaning → ontology → contracts → runtime, not implementation.
- `~/.claude/rules/02-research-retrieval.md` — the pipeline's Stage 2 uses project `BROWSE.md` and `INDEX.md` first before external retrieval.
- `~/.claude/rules/03-forward-backward-propagation.md` — blueprint carries ForwardProp + BackwardProp paths through the 3-phase DevCon 5 journey.
- `~/.claude/rules/05-skill-invocation-order.md` — plugin-scope wins over user-scope.
