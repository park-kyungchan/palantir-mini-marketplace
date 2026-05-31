---
name: pm-lineage
category: maintenance
surfaceStatus: public-core
description: "Cross-project workflow lineage query — joins events.jsonl across registered +..."
allowed-tools:
  - mcp__plugin_palantir-mini_palantir-mini__pm_workflow_lineage_query
  - Read
  - Bash
effort: low
disable-model-invocation: false
---

# `/palantir-mini:pm-lineage` — Cross-Project Workflow Lineage Query

You are invoked to query events across registered + auto-discovered palantir-mini projects. Wrap the `pm_workflow_lineage_query` MCP tool, parse `$ARGUMENTS` filter clauses, and present results as a Markdown report.

## Procedure

### Phase 1 — Parse `$ARGUMENTS`

Recognized filter clauses (all optional; combine freely):

| Clause | Maps to | Example |
|---|---|---|
| `--whenRange="<from>..<to>"` | `filter.whenRange` ISO8601 inclusive | `--whenRange="2026-04-25..2026-04-30"` |
| `--byWhom.identity=<id>` | `filter.byWhom.identity` exact | `--byWhom.identity=claude-code` |
| `--byWhom.agentName=<name>` | `filter.byWhom.agentName` exact | `--byWhom.agentName=harness-generator` |
| `--throughWhich.toolName=<tool>` | `filter.throughWhich.toolName` exact | `--throughWhich.toolName=commit_edits` |
| `--eventTypes=<csv>` | `filter.eventTypes` array | `--eventTypes=grading_completed,sprint_contract_bound` |
| `--withWhat=<regex>` | `filter.withWhat` regex against reasoning | `--withWhat="dryRunRef=abc"` |
| `--atopWhich=<sha-substring>` | `filter.atopWhich` glob | `--atopWhich=510e574d` |
| `--limit=<n>` | `filter.limit` (default 1000) | `--limit=50` |
| `--projects=<csv>` | `args.projects` explicit list | `--projects=/path/A,/path/B` |
| `--projectsRoot=<dir>` | `args.projectsRoot` fs-walk root | `--projectsRoot=/home/user/projects` |

Build the args JSON. Skip clauses not provided.

### Phase 2 — Invoke MCP

Call `mcp__plugin_palantir-mini_palantir-mini__pm_workflow_lineage_query` with the constructed args.

### Phase 3 — Render Markdown

Format result as:

```markdown
# Cross-Project Workflow Lineage Query

**Filter**: <echo of args.filter>
**Total matched**: <result.totalMatched> (truncated: <result.truncated>)

## Per-project counts

| Project | Events |
|---|---|
| <projectPath> | <count> |
| ... | ... |

## Discovered (in fs walk, NOT registered)

- <projectPath>  ← run `project_register` to track explicitly
- ...
(or: "None — all projects already registered")

## Top events (first N up to limit)

| When | Project | Type | byWhom | sequence | reasoning excerpt |
|---|---|---|---|---|---|
| <when> | <basename(project)> | <type> | <byWhom> | <seq> | <truncate to 80 chars> |
| ... |

## Execution graph

- **Nodes**: <count>
- **Edges**: <count> (follows: <n>, cited: <n>, impacted: <n>)

(If user asks for graph detail, render edges by relation.)
```

### Phase 4 — Suggest follow-ups

After rendering, surface:

- If `discovered.length > 0`: "Run `project_register` on the discovered projects to track them explicitly."
- If `truncated`: "Result truncated at limit=<n>; raise `--limit` to see more."
- If `executionGraph.edges.length === 0`: "No cross-project follow/cited edges found in this window — events are session-isolated."

## Examples

```
/palantir-mini:pm-lineage --whenRange="2026-04-25..2026-04-30" --byWhom.identity=claude-code
/palantir-mini:pm-lineage --eventTypes=grading_completed,sprint_contract_bound --limit=50
/palantir-mini:pm-lineage --withWhat="dryRunRef=" --eventTypes=validation_phase_completed
/palantir-mini:pm-lineage --projects=/home/palantirkc/projects/palantir-math,/home/palantirkc/projects/mathcrew
```

## Authority + cross-refs

- MCP handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-workflow-lineage-query.ts` (v3.10.0 W5.0b)
- Lib backing: `~/.claude/plugins/palantir-mini/lib/event-log/multi-project-reader.ts` (v3.10.0 W5.0a)
- Plan: `~/.claude/plans/glowing-frolicking-raven.md` §3 (Wave 5)
- Blueprint: `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md` §4-P5
- Research: `~/.claude/research/palantir-vision/aipcon-devcon/workflow-lineage.md` lines 9-13 + 79-80
