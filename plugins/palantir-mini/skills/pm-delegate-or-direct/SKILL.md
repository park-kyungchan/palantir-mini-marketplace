---
name: pm-delegate-or-direct
category: deprecated
deprecated: true
supersededBy: pm_intent_router
description: "Deprecated compatibility wrapper. Use pm_intent_router for Lead routing and..."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__pm_intent_router mcp__plugin_palantir-mini_palantir-mini__impact_query mcp__plugin_palantir-mini_palantir-mini__pm_rule_query
effort: medium
disable-model-invocation: false
---

# pm-delegate-or-direct — Deprecated redirect to pm_intent_router

This skill is deprecated. Call `pm_intent_router` instead. It is the canonical
Lead routing entrypoint and subsumes delegation/direct decisions, dispatch
species selection, Prompt-to-DTC contract continuity, and prefetched context.

Do not use the retired delegation shortcut for new work.

## When to use

Trigger phrases:
- "delegate", "direct", "lead-direct", "위임", "분석 후 위임"
- "/pm-delegate-or-direct"
- "어디까지 lead-direct"
- "who should handle this?"
- "which agent owns this?"
- "should I spawn a subagent for this?"

Use `pm_intent_router` before spawning any subagent or starting non-trivial
Lead-direct work. Treat this skill as a compatibility reminder only.

## NOT for

- Tasks already known to be trivially small (1-line fix, obvious Lead-direct). Skip straight to `commit_edits`.
- Cases where the user has explicitly said "do it yourself" or "Lead-direct only".

## Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `intent` | YES | 1-2 sentence task description (e.g. "Add PostToolUse hook for Edit tracking") |
| `scopePaths` | optional | List of file paths or globs the work targets. Omit to use intent-based heuristic. |
| `complexityHint` | optional | `"trivial"` / `"single-file"` / `"multi-file"` / `"cross-cutting"` |

## Steps

1. **impact_query** (optional) — if scopePaths known, call `impact_query` to surface transitive dependencies.
2. **route** — call `pm_intent_router` with `{ project, intent, scopePaths, complexityHint, promptId, promptHash, sessionId, runtime, semanticIntentContractRef, digitalTwinChangeContractRef }`.
3. **return** — Lead reads the enriched router result and either proceeds Lead-direct or spawns the recommended agent inside the approved boundary.

## Output schema (DelegationRecipe)

```ts
{
  decision: "lead-direct" | `delegate-to-${string}`;
  rationale: string;
  recipe?: {
    agent: string;              // e.g. "protocol-designer", "hook-builder"
    agentModel: "opus" | "sonnet" | "haiku";
    mcpTools: string[];         // MCP tools the agent should be granted
    skills: string[];           // Skill slugs to include in briefing
    sprintArgs: {
      mode: "quick" | "full";
      iterationLimit: number;
      timeoutMs: number;
    };
    criticalFiles: string[];    // Files the agent will touch
    verifyCommand: string | null;
    memoryLayers: Array<"working" | "episodic" | "semantic" | "procedural">;
    outOfScope: string[];       // Files the agent MUST NOT touch (rule 07)
    briefingTemplate: string;   // Pre-filled 5-section briefing (rule 12)
  };
}
```

## 5 representative examples

### 1. Rule edit → protocol-designer (sonnet)

Input:
```json
{
  "project": "/home/palantirkc",
  "intent": "Edit rule 12 to add new pre-delegation framework section",
  "scopePaths": [".claude/rules/12-lead-protocol-v2.md"],
  "complexityHint": "single-file"
}
```

Expected output:
- `decision`: `"delegate-to-protocol-designer"`
- `agent`: `"protocol-designer"`, `agentModel`: `"sonnet"`
- `mcpTools`: `["pm_rule_query", "pm_rule_audit", "emit_event"]`
- `sprintArgs.mode`: `"quick"` (1 file ≤ 3)
- `verifyCommand`: `"bunx tsc --noEmit"` (N/A for .md → `"pm_rule_audit"`)

### 2. New hook → hook-builder (sonnet)

Input:
```json
{
  "project": "/home/palantirkc",
  "intent": "Add NEW PostToolUse hook for Edit/Write tracking with emit_event",
  "scopePaths": [".claude/plugins/palantir-mini/hooks/edit-write-tracker.ts"],
  "complexityHint": "single-file"
}
```

Expected output:
- `decision`: `"delegate-to-hook-builder"`
- `agent`: `"hook-builder"`, `agentModel`: `"sonnet"`
- `mcpTools`: `["apply_edit_function", "commit_edits", "compute_edits_dry_run", "emit_event"]`
- `outOfScope` includes `".codex-plugin/plugin.json"`, `"agents/**"`

### 3. New schemas primitive → ontology-steward (opus)

Input:
```json
{
  "project": "/home/palantirkc",
  "intent": "Add NEW schemas primitive ClaudeCodeVersionDeclaration to schemas/ontology/primitives/",
  "scopePaths": [".claude/schemas/ontology/primitives/"],
  "complexityHint": "single-file"
}
```

Expected output:
- `decision`: `"delegate-to-ontology-steward"`
- `agent`: `"ontology-steward"`, `agentModel`: `"opus"`
- `skills` includes `"/palantir-mini:pm-codegen"`, `"/palantir-mini:pm-verify"`
- `memoryLayers`: `["semantic", "procedural"]`

### 4. Mirror blog → docs-researcher (opus)

Input:
```json
{
  "project": "/home/palantirkc",
  "intent": "Mirror Palantir blog post from URL into research/ as markdown",
  "scopePaths": [".claude/research/palantir-vision/"],
  "complexityHint": "single-file"
}
```

Expected output:
- `decision`: `"delegate-to-docs-researcher"`
- `agent`: `"docs-researcher"`, `agentModel`: `"opus"`
- `skills` includes `"/palantir-mini:pm-research-diff"`
- `memoryLayers`: `["episodic", "semantic"]`

### 5. Mass-edit agents → implementer (sonnet)

Input:
```json
{
  "project": "/home/palantirkc",
  "intent": "Mass-edit 12 plugin agents adding emit_event guidance section to each",
  "complexityHint": "multi-file"
}
```

Expected output:
- `decision`: `"delegate-to-implementer"`
- `agent`: `"implementer"`, `agentModel`: `"sonnet"`
- `sprintArgs.mode`: `"full"` (multi-file complexityHint)
- `sprintArgs.iterationLimit`: `4`

## Authority + cross-refs

- Rule 12 §Pre-delegation framework — `~/.claude/rules/12-lead-protocol-v2.md`
- Rule 07 §Agent file-ownership table — `~/.claude/rules/07-plugins-and-mcp.md`
- Rule 26 §Axis E (memory-mapped) — `~/.claude/rules/26-valuable-data-standard.md`
- Handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts`
- Lib: `~/.claude/plugins/palantir-mini/lib/delegation-recipe/recipe-builder.ts`

## Deprecation window

This skill remains resolvable for one sprint as a redirect. New routing work
must use `pm_intent_router`.
