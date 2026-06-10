---
name: pm-lineage
category: maintenance
surfaceStatus: public-core
description: "Cross-project workflow lineage query — joins events.jsonl across registered +..."
allowed-tools:
  - mcp__plugin_palantir-mini_palantir-mini__pm_workflow_lineage_query
  - mcp__palantir-mini__replay_lineage
  - Read
  - Bash
effort: low
disable-model-invocation: false
---

# `/palantir-mini:pm-lineage` — Workflow Lineage Query + Trace Reconstruction

Three modes, selected by `$ARGUMENTS` shape:

| Mode | Trigger | Use when |
|------|---------|----------|
| `query` (default) | filter clauses (`--whenRange=…`, `--eventTypes=…`, …) | Cross-project event query / execution graph |
| `trace` | `--traceId=<id>` OR a bare `<traceId>` argument | Render a single OntologyWorkflowTrace lifecycle |
| `reconstruct` | `--promptId / --sessionId / --commitSha / --correlationId` | Rebuild an event lineage by ID key |

---

## Mode: query — Cross-Project Workflow Lineage Query

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
/palantir-mini:pm-lineage --projects=/home/user/projects/your-project,/home/user/projects/your-app
```

---

## Mode: trace — Single workflow-trace lifecycle renderer

(Absorbed from the former `pm-trace` skill.)

### When to use

- User says `trace <id>`, `show trace lifecycle`, or passes `--traceId=<id>` / a bare `<traceId>`.
- After `pm-recap` surfaces an open trace and the user wants lifecycle details.
- Debugging a stuck or leaked trace (e.g. `lastEvent=transitioned` older than 1 hour).

### What it does

1. Reads `<project>/.palantir-mini/session/workflow-traces/<traceId>.json` for the persisted snapshot (mode, lastEvent, outcome, updatedAt).
2. Calls `replay_lineage` with the `traceId` filter to fetch the ordered event chain (workflow_trace_opened → workflow_trace_transitioned → workflow_trace_closed).
3. Renders a compact markdown table: timestamp / event-kind / mode / refs-summary / outcome.

```
mcp__palantir-mini__replay_lineage({ project: "<path>", traceId: "<traceId>" })
```

### Example output

```
# Workflow Trace: ontology-workflow-trace:context-only-...

Snapshot: mode=semantic-gate lastEvent=transitioned updatedAt=2026-05-13T10:02Z

| When | Event | From → To | Refs added | Outcome |
|------|-------|-----------|-----------|---------|
| 2026-05-13T10:00 | workflow_trace_opened | — → context-only | UOE: entry-x | — |
| 2026-05-13T10:02 | workflow_trace_transitioned | context-only → semantic-gate | SIC: sic-y | — |
| 2026-05-13T10:05 | workflow_trace_closed | — implementation | — | passed |
```

---

## Mode: reconstruct — Event lineage by ID key

(Absorbed from the former `pm-debug-trace` skill.)

### Usage

`/palantir-mini:pm-lineage --<key>=<value>` — keys (any one required):

- `--promptId=<id>` — all events with payload.promptId match
- `--sessionId=<id>` — all events emitted within a session
- `--commitSha=<sha>` — all events that reference this commit (payload.commitSha or atopWhich)
- `--correlationId=<id>` — all events with payload.correlationId match (subagent decision trail)

Optional: `--limit=N` (default 100), `--includeArchive=all|live-only|archive-only` (default all), `--includeQuarantine` (default false).

### Behavior

1. Validate at least one key is provided; if none, error and stop.
2. Read events via `readEvents` from `lib/event-log/read.ts` with `{includeArchive, includeQuarantine}`.
3. Filter by the provided keys (OR across keys — an event matches if any supplied key matches its field).
4. Apply `--limit=N` (default 100) — take the first N chronologically.
5. Render in chronological order: `[seq] <when> <byWhom.agent>/<byWhom.identity> <type> — <withWhat.reasoning?.slice(0, 80)>`.
6. Print a summary line: `Total matched: <count> (limit: <limit>)`.

Read-only over events.jsonl + archives + quarantine; this mode does NOT mutate.

### Bash one-liner (quick alternative)

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('<project>/.palantir-mini/session/events.jsonl','utf8').split('\n').filter(Boolean);
const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const key = '<key>', val = '<value>';
const fieldMap = { promptId: e => e.payload?.promptId, sessionId: e => e.payload?.sessionId, commitSha: e => e.payload?.commitSha || e.atopWhich, correlationId: e => e.payload?.correlationId };
const fn = fieldMap[key];
const matched = fn ? events.filter(e => (fn(e) ?? '').startsWith(val)) : events;
matched.slice(0, 100).forEach(e => console.log('[' + (e.sequence ?? '?') + '] ' + e.when + ' ' + (e.byWhom?.agent ?? '?') + '/' + (e.byWhom?.identity ?? '?') + ' ' + e.type + ' — ' + ((e.withWhat?.reasoning ?? '').slice(0, 80))));
console.log('Total matched: ' + matched.length);
"
```

---

## Rule citations (trace + reconstruct modes)

- `rule 01 §ForwardProp` — trace lifecycle follows the authority chain (context-only → semantic-gate → router → pre-mutation → implementation → closed).
- `rule 10 §5-dim` — every lifecycle event carries the full 5-dim envelope with `payload.traceId`.
- `rule 26 §Substrate routing` — T3+ events from a trace feed the BackPropagation circuit.

## Memory layer declaration

`episodic` (single-trace + ID-key reconstruction are episodic recall) + `semantic` (OntologyWorkflowTrace + event lineage map to typed primitives).

## Authority + cross-refs

- MCP handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-workflow-lineage-query.ts` (v3.10.0 W5.0b)
- Lib backing: `~/.claude/plugins/palantir-mini/lib/event-log/multi-project-reader.ts` (v3.10.0 W5.0a)
- `replay_lineage` handler: `bridge/handlers/replay-lineage.ts`; `readEvents`: `lib/event-log/read.ts`.
- Plan: `~/.claude/plans/glowing-frolicking-raven.md` §3 (Wave 5)
- Blueprint: `~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md` §4-P5
- Research: `~/.claude/research/palantir-vision/aipcon-devcon/workflow-lineage.md` lines 9-13 + 79-80
