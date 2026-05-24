---
name: pm-pr-impact
category: maintenance
description: "PR-scoped impact analysis — diffs current branch vs base, computes downstream blast radius per changed RID via impact_query MCP, renders markdown report. Replaces per-PR..."
effort: low
disable-model-invocation: false
---

# /palantir-mini:pm-pr-impact

PR-scoped impact analysis. Rebuilt from scratch in v2.0.3 as the on-demand replacement for the retired `impact-graph-refresh` monitor. See `~/.claude/research/claude-code/monitors-retirement-2026-04-20.md` §7 for the design rationale.

## When to invoke

- User about to open a PR and wants to know the blast radius.
- User in code-review mode asking "what does touching X affect?"
- Pre-`/palantir-mini:pm-ship` gate — proactively suggest this if the diff touches `ontology/`, `schemas/`, `bridge/handlers/`, or any file with downstream consumers.
- User explicitly says: "impact", "blast radius", "downstream", "who depends on this", "PR impact".

**Do NOT invoke** for:
- Single-file hotfixes with zero ontology churn (overkill).
- Exploratory questions ("what does `FooService` do?") — use `Explore` agent instead.

## Inputs

- `<base-branch>` (optional, default `origin/main`) — the ref to diff against.
- `<depth>` (optional, default `2`) — how many levels of downstream dependents to include in the report. Depth ≥3 gets verbose fast on large ontology trees.

## Procedure

### 1. Verify impact-graph cache is warm

```bash
ls -la "<project>/.palantir-mini/impact-graph.db" 2>&1
```

If missing or older than 24h, call `populate_impact_graph({ projectRoot })` via the MCP tool (also accepts optional `tsConfigPath`, `fresh`) to rebuild. Report to user: `"Impact graph cache stale — rebuilding (expect ~5-30s)..."` before calling.

### 2. Compute changed files

```bash
git diff --name-only "<base-branch>"...HEAD
```

Filter to source files: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.md` (for ontology docs). Ignore generated files (`src/generated/**`), lockfiles, and node_modules.

### 3. Map changed files to RIDs

For each changed file, identify the primary exported RID (if any) by reading the file's header comment + canonical export. Files without an RID are reported as "file-only changes" (no impact query).

### 4. Call `impact_query` per RID

Use MCP tool `mcp__palantir-mini__impact_query`:

```
impact_query({ rid: <rid>, depth: <depth>, projectRoot: <project> })
```

Collect results per RID. Dedupe downstream RIDs across queries.

### 5. Render markdown report

```markdown
# PR Impact Report — <branch> vs <base-branch>

## Changed files (N)
- `path/to/file1.ts` (RID: `rid.primitive.foo-bar`)
- `path/to/file2.md` (RID: `rid.doc.baz`)
- `path/to/file3.ts` *(no RID — file-only change)*

## Downstream blast radius (M dependents, depth ≤ <depth>)
| Dependent RID | Type | File | Shortest path from changed |
|---------------|------|------|----------------------------|
| ...           | ...  | ...  | ...                        |

## Risk flags
- **HIGH**: changes to `rid.primitive.foo-bar` affect N downstream ontology primitives — schema bump required per rule 08.
- **MEDIUM**: `rid.doc.baz` is referenced by K rules — verify rule cross-refs.
- **LOW**: `path/to/file3.ts` has no RID and no downstream dependents.

## Suggested next steps
- [ ] Run `/palantir-mini:pm-verify` to confirm no drift.
- [ ] If HIGH risk flagged: bump schemas version + CHANGELOG entry.
- [ ] Run `/palantir-mini:pm-ship` to land.
```

### 6. Emit event

Call `emit_event` with `type=plan_reviewed`, payload including impacted RID count + risk level. Enables `pm-retro` to surface impact-heavy PRs.

## Outputs

- Markdown report on stdout (user reads in terminal).
- `plan_reviewed` event appended to `events.jsonl`.
- No files written to disk (report is ephemeral unless user pipes to file).

## Why this exists

- **Pre-v2.0.3**: `impact-graph-refresh` monitor was supposed to maintain the cache continuously. It was registered in neither the active `monitors.json` nor a cron — so in practice it never ran. PR-impact queries fell back to `Explore` agent spawns at 15-50K tokens per search.
- **v2.0.3**: cache is rebuilt on demand + queried via single MCP call. Token cost ~1-3K per invocation. Principal savings on repeat use within a PR cycle.

## Non-goals

- Real-time notifications when someone else changes a file (we are single-developer).
- Cross-repo impact (`impact_query` is per-project; multi-repo walks are a separate slash — not yet built).
- GUI visualization — markdown is sufficient.

## Cross-refs

- `~/.claude/research/claude-code/monitors-retirement-2026-04-20.md` §7 (design rationale).
- `bridge/handlers/impact-query.ts` (the MCP handler this wraps).
- `bridge/handlers/populate-impact-graph.ts` (cache builder).
- `bridge/handlers/pre-edit-impact.ts` (related: pre-edit blast radius for a single planned change).
- `/palantir-mini:pm-verify` (runs this alongside drift checks at the pre-ship gate).

## Related tools

- `mcp__palantir-mini__pre_sprint_diff` — programmatic `base...head` diff → downstream RID expansion in one call. Use when a CI script needs the output, not when a human is reading the PR report.
- `mcp__palantir-mini__gate_on_drift` — runtime drift script gate (runs `bun run ontology:drift` + `bun run lint:fonts`). Orthogonal to PR-impact analysis.
