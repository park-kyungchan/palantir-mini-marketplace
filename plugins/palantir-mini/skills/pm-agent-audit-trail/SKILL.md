---
name: pm-agent-audit-trail
category: maintenance
description: "Query subagent decision trail. Aggregates per-correlationId — Agent spawn →..."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__agent_audit_trail mcp__plugin_palantir-mini_palantir-mini__pm_workflow_lineage_query mcp__plugin_palantir-mini_palantir-mini__replay_lineage Read
effort: low
disable-model-invocation: false
---

# pm-agent-audit-trail — Subagent Decision Trail Query

## When to use

- Lead end-of-sprint review: inspect what every subagent decided and why.
- Debugging a subagent regression: which tools did it call, with what reasoning?
- Cost-attribution drill-down: identify high-decision-count agents for delegation tuning.
- Trigger phrases: "agent audit", "decision audit", "audit trail", "어떤 판단을 왜 내렸나", "감사", "subagent 추적", `/pm-agent-audit-trail`.

## NOT for

- **Real-time streaming** — tail `events.jsonl` directly for live event watching.
- **Full text replay** — use `/palantir-mini:pm-decision-replay` for narrative BackProp replay.
- **Cross-project rollup** — use `pm_workflow_lineage_query` with multi-project filter.

## Inputs

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `project` | string | required | Absolute path to project root |
| `sprintRef` | string | optional | Filter to a specific sprint contract ref |
| `agentName` | string | optional | Filter to a specific spawned agent name |
| `whenRange.from` | ISO8601 | optional | Inclusive lower bound on event `when` |
| `whenRange.to` | ISO8601 | optional | Inclusive upper bound on event `when` |
| `correlationId` | string | optional | Narrow to a single spawn → decisions chain |
| `outputFormat` | string | `markdown-table` | `markdown-table` \| `json` \| `mermaid-graph` |

## Steps

1. Invoke `agent_audit_trail` MCP handler with desired filter + format.
2. Inspect output:
   - **markdown-table**: scan `toolCount` and `reasoning(first)` columns for anomalies.
   - **mermaid-graph**: trace spawn → decision chain visually.
   - **json**: full `DecisionTrail` for programmatic inspection.
3. Cross-ref with `/palantir-mini:pm-three-questions` for cost attribution (Step 3 per-agent breakdown).

## Output schema

```
{
  format:  "markdown-table" | "json" | "mermaid-graph",
  content: string,
  summary: {
    totalCorrelations: number,
    totalDecisions:    number,
    totalSpawns:       number,
    perAgent: { [agentName]: { spawnCount: number, decisionCount: number } }
  }
}
```

### markdown-table columns

| Column | Source |
|--------|--------|
| `correlationId` | W1.G spawn correlationId (truncated 12 chars) |
| `spawnedAgent` | W1.G payload.spawnedAgent |
| `description` | W1.G payload.description (≤60 chars) |
| `toolCount` | count of W1.E agent_decision_logged events |
| `reasoning(first)` | first W1.E decision reasoning (≤60 chars) |
| `terminalType` | subagent_stop \| edit_committed \| (none) |
| `durationMs` | spawnTimestamp → terminalEvent.timestamp |

## Representative invocations

### 1. Audit current sprint

```json
agent_audit_trail({
  "project": "/home/palantirkc",
  "sprintRef": "monorepo-root-sprint-037-quick",
  "outputFormat": "markdown-table"
})
```

### 2. Audit specific subagent across a time window

```json
agent_audit_trail({
  "project": "/home/palantirkc",
  "agentName": "implementer",
  "whenRange": { "from": "2026-05-06T00:00Z" },
  "outputFormat": "mermaid-graph"
})
```

### 3. Audit a single spawn by correlationId

```json
agent_audit_trail({
  "project": "/home/palantirkc",
  "correlationId": "<uuid>",
  "outputFormat": "json"
})
```

## Authority + cross-refs

- **Rule 12 v3.4.0** §Subagent decision audit invariant — mandates audit substrate for every subagent tool call.
- **Rule 26 §Axis E** — semantic (Lead audit query interface) + procedural (query flow) + episodic (sprint-037 audit substrate trio) + working (correlationId join keys).
- **W1.E** `hooks/agent-decision-log.ts` — emits `agent_decision_logged` events read here.
- **W1.G** `hooks/subagent-orchestration-audit.ts` — emits `subagent_orchestration_audited` spawn records read here.
- **Handler** `bridge/handlers/agent-audit-trail.ts` — MCP implementation.
- **Lib** `lib/agent-audit/decision-extractor.ts` — pure `extractDecisionTrail()` function.
- **Related** `/palantir-mini:pm-decision-replay` (BackProp narrative), `/palantir-mini:pm-three-questions` (cost attribution Step 3), `/palantir-mini:pm-recap` (session fold).

## Memory layer declaration

- `semantic` — Lead audit query interface; aggregates per-correlationId decision trail (orchestration spawn → N decision logs → terminal stop).
- `procedural` — query flow: `pm_workflow_lineage_query` raw events → `extractDecisionTrail` aggregator → format markdown-table | json | mermaid-graph.
- `episodic` — sprint-037 cost-optimization Wave 1 query layer; pairs with W1.E + W1.G to complete the audit substrate trio.
- `working` — correlationId join keys + per-agent grouping logic + mermaid syntax for spawn → decisions → outcome graph.
