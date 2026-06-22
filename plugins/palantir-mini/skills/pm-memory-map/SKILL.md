---
name: pm-memory-map
category: research
surfaceStatus: public-core
description: "4-layer agentic memory balance audit (working / episodic / semantic / procedural)."
allowed-tools: mcp__palantir-mini__pm_health_audit
effort: low
disable-model-invocation: false
---

# pm-memory-map — 4-layer agentic memory audit

## When to use

- User asks for "memory map", "memory layer breakdown", "agentic memory audit".
- Diagnosing T2+ envelopes missing memoryLayers (`memory-layer-validator` advisory has been firing).
- Periodic balance check: does the substrate refine all 4 layers (working / episodic / semantic / procedural) at expected ratios?
- Pre-PR sanity: confirm no event type drift left a layer abandoned.

## What this does

Wraps `pm_health_audit` (mode `memory-layer`) MCP handler. Computes:

| Field | Meaning |
|-------|---------|
| `layerDistribution` | counts per layer (working / episodic / semantic / procedural) |
| `t2PlusEvents` | total T2+ envelopes |
| `t2PlusMissingLayers` | T2+ envelopes WITHOUT `withWhat.memoryLayers` |
| `t2PlusMissingRatio` | missing / total T2+ |
| `perEventTypeLayerStats` | per event type → per layer count |
| `t2PlusMissingByType` | top event types missing layers |
| `recommendations` | human-readable remediation suggestions |

## Usage

### A. Default (full window)

```
/palantir-mini:pm-memory-map
```

Internal call:
```json
{ "project": "<absolute path>" }
```

### B. Time-bounded

```
/palantir-mini:pm-memory-map since 2026-04-29
```

Internal call:
```json
{ "project": "<...>", "sinceWhen": "2026-04-29T00:00:00.000Z" }
```

## Output format

```
# Memory Layer Audit — <timestamp>

Total events scanned: <N>
T2+ events: <X> (missing layers: <Y> = <pct>%)

## Layer distribution
- working:    <c1> (<rate1>%)
- episodic:   <c2> (<rate2>%)
- semantic:   <c3> (<rate3>%)
- procedural: <c4> (<rate4>%)

## Top T2+ types missing layers
- <type>: <count>
- ...

## Per-event-type breakdown (top 10)
event_type            working  episodic  semantic  procedural
edit_committed        ...      ...       ...       ...
agent_start           ...      ...       ...       ...
...

## Recommendations
- <recommendation 1>
- <recommendation 2>
```

## Auto-tag heuristics

When you see T2+ events missing layers, the `memory-layer-validator` PostToolUse hook auto-suggests via `AUTO_TAG_HEURISTICS` table at `~/.claude/plugins/palantir-mini/hooks/memory-layer-validator.ts:65-150`. To extend:

1. Add the new event type → suggested layers entry to `AUTO_TAG_HEURISTICS`.
2. Bump plugin PATCH version + CHANGELOG entry.
3. Re-run `/palantir-mini:pm-memory-map` to verify the layer balance improved.

## Authority + cross-refs

- Rule 26 v1.0.0 §Axis E (Memory-mapped).
- Anchor: Palantir "Connecting Agents to Decisions" (2026-04-29) — *"continuously refine all forms of agentic memory (working / episodic / semantic / procedural)"*.
- Plan: `~/.claude/plans/quiet-fluttering-garden.md` Phase 5.3.
- Handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-memory-layer-audit.ts`.
- Schema: `~/.claude/schemas/ontology/primitives/agentic-memory-layer.ts`.
- Hook: `memory-layer-validator` PostToolUse on emit_event (advisory + auto-tag suggest).
- Related: `/palantir-mini:pm-value-audit` (overall substrate health), `/palantir-mini:pm-replay --circuit` (T3+ circuit fold).

## Memory layer declaration

`procedural` (audit script) + `semantic` (4-layer taxonomy DH).
