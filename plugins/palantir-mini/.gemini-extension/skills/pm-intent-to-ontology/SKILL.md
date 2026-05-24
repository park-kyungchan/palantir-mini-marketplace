---
name: pm-intent-to-ontology
category: core-workflow
description: "1-call wrapper for the 6-step Intent-to-Ontology Protocol (sprint-063 W2.C simplification)."
trigger: 'When Lead receives a complex task touching ≥2 files OR new feature OR architectural change. User invocations: "/palantir-mini:pm-intent-to-ontology", "intent to ontology", "Steps 1-5 batch".'
memory_layers: [procedural, semantic]
---

# pm-intent-to-ontology — 6-Step Intent-to-Ontology Protocol Wrapper

## When to use

- Lead receives a complex prompt touching ≥2 files OR introducing a new feature OR proposing architectural change.
- `user-prompt-ontology-intent-extract` hook fires with Intent-to-Ontology advisory.
- `lead-ontology-discovery-completeness` PreToolUse advisory fires (no MCP discovery call detected).
- After `prompt-front-door-capture` and `pm_semantic_intent_gate` have established
  prompt identity / contract continuity.
- Before binding a SprintContract for non-trivial edits — run this downstream
  discovery pass, then bind.

## What this does

The canonical prompt-to-DTC front door is `prompt-front-door-capture` plus
`pm_semantic_intent_gate`. This 6-step Intent-to-Ontology Protocol is a
downstream discovery/advisory pass that grounds Lead's work in the ontology
layer before any Edit/Write/MultiEdit:

1. **get_ontology** — snapshot the current ontology state for the project.
2. **impact_query** — blast radius walk from scope RIDs (depth=2).
3. **pm_workflow_lineage_query** — past 7-day edit history for the project (last 30 committed edits).
4. **pm_event_query_by_grade T3+** — decision events that informed prior work (BackProp inputs).
5. **propagation_audit_forward** — ForwardProp chain integrity (research → runtime).
6. **negotiate_sprint_contract** — bind before non-trivial Edit/Write/MultiEdit.
   *(Lead action; no MCP call)*

<!-- sprint-063 W2.C: legacy semantic planning handler removed from protocol. Former 8-step -> 6-step: dropped Lead-internal intent/scope detection and the removed handler. impact_query retained (step 2). -->

## Usage

```
/palantir-mini:pm-intent-to-ontology "<intent>" <scopePath1> [<scopePath2> ...]
/palantir-mini:pm-intent-to-ontology "implement X hook" hooks/foo.ts lib/bar.ts
/palantir-mini:pm-intent-to-ontology "refactor event log" lib/event-log/
```

Args:
- `intent` (string, required): Plain-language description of what Lead intends to do.
- `scopePaths` (string[], required): File paths or directories in scope. Used for lineage query RID matching.
- `project` (string, optional): Absolute project root path. Defaults to cwd.

## Step-by-step execution

When invoked with `/palantir-mini:pm-intent-to-ontology <intent> <scopePaths...>`:

### Step 1 — get_ontology

```json
mcp__palantir-mini__get_ontology({ "project": "<project>" })
```

Captures: ontology snapshot (entity types, relation types, current state).

### Step 2 — impact_query (blast radius, depth=2)

```json
mcp__palantir-mini__impact_query({ "rid": "<scopePaths[0]>", "depth": 2 })
```

Captures: downstream dependency graph (blast radius) for top-RID in scope.

### Step 3 — pm_workflow_lineage_query

```json
mcp__palantir-mini__pm_workflow_lineage_query({
  "projects": ["<project>"],
  "filter": {
    "whenRange": { "from": "<7 days ago ISO>", "to": "<now ISO>" },
    "byWhom": { "identity": "claude-code" },
    "eventTypes": ["edit_committed"],
    "limit": 30
  }
})
```

Captures: last 30 committed edits in the last 7 days — shows what recently changed.

### Step 4 — pm_event_query_by_grade T3+

```json
mcp__palantir-mini__pm_event_query_by_grade({ "project": "<project>", "gradeFilter": "T3+" })
```

Captures: T3+ decision events — the BackProp circuit inputs that informed prior work.

### Step 5 — propagation_audit_forward

```json
mcp__palantir-mini__propagation_audit_forward({ "project": "<project>" })
```

Captures: ForwardProp chain integrity — whether research → schemas → shared-core →
project-ontology → contracts → runtime is all intact.

## Output format

```json
{
  "intent": "<user intent>",
  "scopePaths": ["<path>", ...],
  "ontology": { /* get_ontology result */ },
  "impact": { /* impact_query result */ },
  "lineage": { /* pm_workflow_lineage_query result */ },
  "decisions": { /* pm_event_query_by_grade T3+ result */ },
  "propagation": { /* propagation_audit_forward result */ },
  "totalElapsedMs": 1234
}
```

Total output MUST be ≤25K. Truncate lineage to last 5 events if needed.

## Failure modes

- `get_ontology not found` — handler not wired; fallback: Read ontology files manually.
- `impact_query not found` — handler not wired; skip blast radius; proceed with lineage only.
- `pm_workflow_lineage_query empty` — no recent edits; normal for fresh projects.
- `pm_event_query_by_grade T3+ empty` — no T3+ events yet; BackProp circuit is new.
- `propagation_audit_forward unavailable` — handler not wired; skip + note in output.
- Any step fails → report partial results with error context.

## Hook integration

- `user-prompt-ontology-intent-extract` (UserPromptSubmit) fires advisory when heuristic matches.
- `lead-ontology-discovery-completeness` (PreToolUse) fires advisory when no MCP discovery call was made.
- Running this skill satisfies the `lead-ontology-discovery-completeness` advisory (emits `intent_to_ontology_skill_invoked` event).
- This skill does not replace `pm_semantic_intent_gate` and is not a prompt/DTC
  proof token.

## Ontology citations

- Sprint-062 Phase 2 W1-alpha (hook-builder task T-W1a-1)
- Rule 12 v3.10.0 §MCP-First protocol (MCP discovery before edit)
- Rule 01 §ForwardProp Audit (propagation_audit_forward required before cross-layer schema promotion)
- Rule 26 §Axis E (procedural + semantic memory layers)
- `user-prompt-ontology-intent-extract.ts` — companion UserPromptSubmit hook
- `lead-ontology-discovery-completeness.ts` — companion PreToolUse advisory hook

## Related skills

- `/palantir-mini:pm-impact-quick` — blast radius for a single RID (impact_query + lineage; quick pre-edit check)
- `/palantir-mini:pm-decision-replay` — query historical decisions for a RID
- `/palantir-mini:pm-lineage` — full lineage trace for an event or RID
