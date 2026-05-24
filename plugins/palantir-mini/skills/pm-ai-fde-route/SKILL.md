---
name: pm-ai-fde-route
category: core-workflow
description: "Route a user prompt to the appropriate AI FDE mode (8 canonical modes) + suggest mode-eligible tools + retrieval context."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__research_context_select Read Bash
effort: medium
disable-model-invocation: false
---

# pm-ai-fde-route — AI FDE 8-mode prompt router

## When to use

- Lead is unsure which AI FDE mode (and which scoped tool surface) fits a user prompt.
- Building agent workflows that need mode-aware retrieval + tool restriction.
- When `/palantir-mini:pm-ai-fde-route` is invoked or these phrases appear: "AI FDE mode", "what mode for this task", "route this prompt", "AI FDE 8 modes".

## Prerequisites

- Schemas v1.40.0+ (`aip-mode-and-skill.ts` with `AIPMode` 8-mode enum + `AIPSkill` struct).
- Plugin v4.5.0+ (this skill).

## The 8 AI FDE modes (doc-canonical from research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md)

| Mode | Purpose | Eligible tool families |
|------|---------|----------------------|
| `data-integration` | Build/modify data pipelines (DATA domain) | dataset-build, pipeline-run |
| `ontology-editing` | Create/update objects, links, actions (DATA + LOGIC + ACTION) | apply_edit_function, commit_edits, ontology_schema_get |
| `functions-editing` | Author logic/functions (LOGIC) | code-edit, function-test |
| `exploration` | Read-only investigation (cross-domain) | Read, Grep, Glob, ontology_schema_get |
| `governance` | Audit permissions, markings, RBAC (SECURITY) | marking-audit, policy-check |
| `machine-learning` | ML model authoring + deployment (LOGIC + ACTION) | model-train, model-deploy |
| `osdk-react` | Build frontend on ontology data (frontend) | osdk-codegen, frontend-design |
| `platform-qa` | Platform Q&A reference (Reference) | search-docs, research_context_select |

## How to run

### Step 1 — Classify the user prompt

Apply heuristics in order (first match wins):

1. Prompt contains `pipeline | dataset | ETL | dataflow | ingestion` → **data-integration**
2. Prompt contains `object type | link type | action type | ontology edit | DH-DATA | HC-DATA` → **ontology-editing**
3. Prompt contains `function | AIP Logic | code | implement | function-backed` → **functions-editing**
4. Prompt contains `marking | RBAC | permission | policy | security | audit` → **governance**
5. Prompt contains `model | training | inference | predict | ML | classifier` → **machine-learning**
6. Prompt contains `frontend | React | OSDK | UI | component | osdk-react` → **osdk-react**
7. Prompt contains `how do I | what is | docs | reference | platform Q&A | Q&A` → **platform-qa**
8. Prompt contains `read | grep | glob | what does | where is | inspect` (without mutation verbs) → **exploration**
9. Default → **exploration** (safest read-only fallback)

### Step 2 — Compose route response

```typescript
{
  suggestedMode: AIPMode,
  rationale: "<which heuristic matched + which keywords triggered>",
  enabledTools: [/* from the 8-mode table */],
  retrievalContext: [
    /* call mcp__palantir-mini__research_context_select with topic-mapped query;
       e.g. ontology-editing → research/schemas + research/palantir-foundry/ontology/ */
  ],
  alternativeModes: [/* second + third best per heuristic ranking */]
}
```

### Step 3 — Emit route event

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "ai-fde-mode-routed", taskId: "<prompt-hash>", validations: ["mode-classified", "tools-resolved", "retrieval-context-fetched"] },
  withWhat: {
    reasoning: "Prompt routed to <mode>; <heuristic>; <N> tools enabled",
    memoryLayers: ["procedural", "semantic"]
  }
})
```

## Output

```
# AI FDE route — <suggestedMode>

Rationale: <heuristic match>
Enabled tools: <list>
Retrieval context: <smallest-read-set from research_context_select>
Alternative modes: <2-3 fallbacks>

Suggested next: invoke the chosen tool with the retrieved context, OR re-prompt with a more specific verb if the routed mode feels wrong.
```

## Authority + cross-refs

- Schemas: `aip-mode-and-skill.ts` (v1.40+).
- 1차 자료: `~/.claude/research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md`.
- Companion: `/pm-aip-agent-author` (uses mode classifications), `/pm-research-context-select` (for retrieval).
- Plan §3.W3.C — `~/.claude/plans/mossy-mapping-eich.md`.
