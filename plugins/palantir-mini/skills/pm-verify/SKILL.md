---
name: pm-verify
category: core-workflow
surfaceStatus: public-core
description: "Run the palantir-mini validation pipeline against a project — executes Design +..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__replay_lineage
effort: high
disable-model-invocation: false
---

# pm-verify — Run the 3-phase validation pipeline

## When to use

- The user asks to verify, validate, or check an ontology.
- Proactively after ontology edits to catch drift early.
- Before any `action-executor` commit as a safety net.
- `/palantir-mini:verify` slash invocation.

## Phases run

1. **Design** — schemas/ontology/ structural sanity (fast, file-level).
2. **Compile** — `bunx tsc --noEmit` (scope: the active project).
3. **Runtime** — submission criteria pre-flight (if edits + criteria supplied).
4. **Post-Write** — drift check (schema_mismatch | stale_codegen | orphan_reference).

## How to run

```bash
bun run "${PALANTIR_MINI_PLUGIN_ROOT}/lib/validation/pipeline.ts" \
  --projectRoot "$(pwd)" \
  --schemaRoot  "$HOME/.claude/schemas/ontology"
```

Or programmatically:

```typescript
import { runPipeline } from "palantir-mini/lib/validation/pipeline";
const result = await runPipeline({
  projectRoot: "<absolute>",
  schemaRoot:  "~/.claude/schemas/ontology",
  phases: ["design", "compile", "post_write"],
});
```

## Output

```
# pm-verify report — <project>

## design    — PASS (0 errors, 2 warnings)
## compile   — PASS (0 errors)
## runtime   — SKIPPED (no edits supplied)
## post_write — PASS (0 errors, 1 warning)

Overall: PASS
```

## Design-phase internal checks

The **Design** phase internally invokes two MCP handlers as structural sub-checks (both handlers are retained as active MCP tools):

- `scan_dead_code` — scans registered hooks, handlers, and skills for files with zero event emissions across the project event log. Reports orphan candidates; does not auto-delete.
- `scan_file_size_violations` — scans handler and hook source files for LOC ceiling violations (rules/CONTEXT.md §12). Reports offenders with current vs. hard-limit counts.

These are invoked automatically during Design phase; they are not exposed as standalone slash-skill commands.

## Rule citations

- `~/.claude/rules/08-schema-versioning.md` — pm-verify blocks when the consumer `@palantirKC/claude-schemas` pin is incompatible with the installed schema version.
- `~/.claude/rules/08-schema-versioning.md §Codegen authority` — Post-Write phase checks that generated files are not out of sync with their source ontology/schema hash.
- `~/.claude/rules/10-events-jsonl.md` — Runtime phase validates submission criteria and emits events for failures.
- `~/.claude/rules/05-skill-invocation-order.md` — plugin-scope version is authoritative.
