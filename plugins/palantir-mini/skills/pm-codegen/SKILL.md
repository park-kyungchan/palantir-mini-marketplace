---
name: pm-codegen
category: maintenance
surfaceStatus: public-core
description: "Run palantir-mini codegen to regenerate <project>/src/generated/ from..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__replay_lineage
effort: low
disable-model-invocation: false
---

# pm-codegen — Regenerate descender artifacts

## When to use

- Schema files under `~/.claude/schemas/ontology/primitives/` changed.
- A project's `src/generated/` is missing or stale.
- `/palantir-mini:codegen` invocation.

## What this does

Invokes the `codegen-runner` agent which:
1. Emits `codegen_started` event.
2. Reads `~/.claude/schemas/ontology/{primitives,functions,policies,lineage,generators}/*.ts`.
3. Runs `lib/codegen/descender-gen.ts` for the target project.
4. Writes output into `<project>/src/generated/`.
5. Emits `codegen_completed` event with generated file list and durationMs.

## How to run

```
Invoke the codegen-runner agent with:
  project: "<absolute path>"
  schemaRoot: "~/.claude/schemas/ontology"
```

Or directly:

```bash
bun run "${PALANTIR_MINI_PLUGIN_ROOT}/lib/codegen/descender-gen.ts" "<project>"
```

## Success criteria

- `<project>/src/generated/*.ts` files are newer than the newest schema file.
- `bunx tsc --noEmit` in `<project>` is clean after codegen.
- Both `codegen_started` and `codegen_completed` events exist in events.jsonl.

## Rule citations

- `~/.claude/rules/08-schema-versioning.md §Codegen authority` — pm-codegen is the sole authorized writer into `<project>/src/generated/`. Generated files carry schema version + ontology hash + generator version + timestamp headers. Determinism required.
- `~/.claude/rules/08-schema-versioning.md` — codegen reads from the pinned `@palantirKC/claude-schemas` version; pm-verify blocks on drift.
- `~/.claude/rules/10-events-jsonl.md` — codegen_started and codegen_completed events carry full 5-dim Decision Lineage.
- `~/.claude/rules/05-skill-invocation-order.md` — plugin-scope wins over user-scope.
