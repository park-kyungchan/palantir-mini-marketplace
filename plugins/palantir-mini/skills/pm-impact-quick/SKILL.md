---
name: pm-impact-quick
category: maintenance
surfaceStatus: public-core
description: "1-call wrapper for impact_query + pm_substrate_query (mode workflow) targeting a single RID."
allowed-tools: mcp__palantir-mini__impact_query,mcp__palantir-mini__pm_substrate_query,mcp__palantir-mini__emit_event
effort: low
disable-model-invocation: false
---

# pm-impact-quick — 1-call MCP-first impact bundle

## When to use

- Lead is about to edit a file and wants to satisfy the MCP-first protocol advisory.
- User asks "what depends on X?" or "what changes if I edit X?" or "show me the blast radius of this change".
- Hook `pre-edit-impact-mcp-first` fires with `outcome: "bypassed"` — call this skill to clear the advisory.
- Before semantic schema changes or ontology refactors (run before first Write/Edit).

## What this does

Bundles 2 MCP calls into a single skill invocation and returns a combined result ≤5KB:

1. `impact_query { rid: <rid>, depth: 3 }` — downstream dependency graph (blast radius)
2. `pm_substrate_query { mode: "workflow", filter: { rid: <rid> } }` — recent workflow events referencing this RID

The combined output tells Lead: (a) what breaks, (b) what activity recently touched this RID.

<!-- sprint-063 W2.C: legacy semantic planning handler removed; impact_query remains the supported path. -->

## Usage

```
/palantir-mini:pm-impact-quick file:hooks/pre-edit-impact-mcp-first.ts
/palantir-mini:pm-impact-quick ontology:PalantirEvent
/palantir-mini:pm-impact-quick file:lib/event-log/types.ts
```

## Step-by-step execution

When invoked with `/palantir-mini:pm-impact-quick <rid>`:

### Step 1 — impact_query (blast radius)

```json
mcp__palantir-mini__impact_query({ "rid": "<rid>", "depth": 3 })
```

Captures: downstream RIDs, edge types, impact score.

### Step 2 — pm_substrate_query (mode workflow)

```json
mcp__palantir-mini__pm_substrate_query({ "mode": "workflow", "filter": { "rid": "<rid>" } })
```

Captures: recent events referencing this RID (last 30 events by default).

### Step 3 — emit lead_mcp_first_compliance

After both calls succeed, emit a `skill_started` event so `pre-edit-impact-mcp-first`
hook can detect the call in the next edit cycle:

```json
mcp__palantir-mini__emit_event({
  "type": "skill_started",
  "payload": {
    "skillName": "pm-impact-quick",
    "rid": "<rid>",
    "skillContext": "<rid>"
  },
  ...5-dim envelope...
})
```

## Output format

Render combined result as:

```
## Impact Quick Summary for <rid>

### Blast Radius (impact_query, depth=3)
<impact_query result: downstream count, top edges>

### Recent Lineage
<pm_substrate_query mode=workflow result: last N events referencing this RID>
```

Total output MUST be ≤5KB. Truncate lineage to last 5 events if needed.

## Failure modes

- `impact_query not found` — handler not wired; fallback: run `Read` on the file + `grep` for imports.
- `pm_substrate_query mode=workflow empty` — no events referencing this RID yet; normal for new files.
- Any step fails → report partial results + still emit `skill_started` so hook sees the invocation.

## MCP-first hook integration

`pre-edit-impact-mcp-first` hook scans `events.jsonl` for:
- `throughWhich.toolName` in `{ impact_query, pm_substrate_query }`, OR
- `type === "skill_started" && payload.skillName === "pm-impact-quick"` AND `payload.skillContext` contains the target file path or parent directory

Running this skill within 5 min of an Edit/Write/MultiEdit satisfies the MCP-first advisory and changes the hook outcome from `"bypassed"` to `"passed"`.

## Ontology citations

- Sprint-061 plan §3.B.W3 (MCP-first hook + pm-impact-quick skill — the discipline lever)
- MCP-First protocol (owned by protocol-designer)
- Rule 26 §Axis B1 — outcome-paired events (`lead_mcp_first_compliance` open/close pair)
- `pre-edit-impact-mcp-first.ts` — paired hook that this skill satisfies

## Related skills

- `/palantir-mini:pm-replay --circuit` — query historical decisions for a RID
- `/palantir-mini:pm-pr-impact` — broader PR-level impact analysis
- `/palantir-mini:pm-lineage` — full lineage trace for an event or RID
