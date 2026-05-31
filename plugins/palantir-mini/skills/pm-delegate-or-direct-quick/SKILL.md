---
name: pm-delegate-or-direct-quick
category: deprecated
surfaceStatus: deprecated-candidate
deprecated: true
supersededBy: pm_intent_router
description: "Deprecated compatibility shortcut. Use pm_intent_router with an intent and inferred..."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__pm_intent_router mcp__plugin_palantir-mini_palantir-mini__pm_rule_query
effort: low
disable-model-invocation: false
---

# pm-delegate-or-direct-quick — Deprecated redirect to pm_intent_router

This skill is deprecated. Call `pm_intent_router` instead. It is the canonical
Lead routing entrypoint and should receive prompt-front-door contract refs when
the work is ontology-affecting.

Do not use the retired delegation shortcut for new work.

## When to use

Trigger phrases:
- "quick delegate", "quick direct", "빠른 위임"
- "/pm-delegate-or-direct-quick"
- "should I delegate this?" (short task, no file list ready)
- "who handles X?" (quick check)

Use `pm_intent_router` when you have an intent but have not yet identified
specific file paths. Pass explicit `scopePaths` when available; otherwise let
the router operate from the intent and project context.

## NOT for

- Cases already covered by a full `pm-delegate-or-direct` call in the last 30 min
  (per `PRE_DELEGATION_COOLDOWN_MIN` threshold).
- Trivially obvious 1-line Lead-direct fixes (skip to `commit_edits`).

## Input

| Field | Required | Description |
|-------|----------|-------------|
| `intent` | YES | 1-2 sentence task description |

`scopePaths` may be omitted for quick checks, but explicit paths remain better
when the Lead already knows the writable surface.

## Steps

1. **Resolve cwd** — use the current working directory as the project root.
2. **Call pm_intent_router** — pass `{ project: cwd, intent }` plus prompt and contract refs when available.
3. **Return router result** — Lead reads the enriched result and either proceeds Lead-direct or spawns the recommended agent.

## Output schema

```ts
{
  decision: "lead-direct" | `delegate-to-${string}`;
  rationale: string;
  recipe?: {
    agent: string;
    agentModel: "opus" | "sonnet" | "haiku";
    mcpTools: string[];
    skills: string[];
    sprintArgs: { mode: "quick" | "full"; iterationLimit: number; timeoutMs: number };
    criticalFiles: string[];
    verifyCommand: string | null;
    memoryLayers: Array<"working" | "episodic" | "semantic" | "procedural">;
    outOfScope: string[];
    briefingTemplate: string;
  };
}
```

## Deprecation window

This skill remains resolvable for one sprint as a redirect. New routing work
must use `pm_intent_router`.

## Authority + cross-refs

- Rule 12 §Pre-delegation analysis framework
- Rule 07 §Agent file-ownership table
- Handler: `~/.claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts`
- Architecture review §5.D.12 (sprint-060 W3 R3-F12)
