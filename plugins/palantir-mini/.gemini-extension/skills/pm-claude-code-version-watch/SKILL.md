---
name: pm-claude-code-version-watch
category: maintenance
description: "Audit Claude Code release drift. Wraps claude_code_version_delta MCP handler — diffs..."
allowed-tools: mcp__plugin_palantir-mini_palantir-mini__claude_code_version_delta mcp__plugin_palantir-mini_palantir-mini__emit_event Read Glob Grep Bash
effort: low
disable-model-invocation: false
---

# pm-claude-code-version-watch — Claude Code release drift audit

## When to use

- SessionStart `claude-code-version-check` hook fires drift advisory (W3.B companion hook).
- User manually invokes before sprint to verify plugin surface alignment.
- Trigger phrases: "Claude Code version", "version watch", "Claude 버전 확인", "/pm-claude-code-version-watch", "어떤 새 기능 나왔나", "version audit".

## NOT for

- Updating Claude Code itself — use the `claude` CLI's own update command (`claude update`).
- Mass-patching plugin surfaces — this skill detects + reports only; patch work requires Lead approval + per-task delegation via `/pm-delegate-or-direct`.
- Re-fetching research library sources — use `/palantir-mini:pm-research-refresh`.

## Inputs

None required. Uses:
- Bash `claude --version` for installed version.
- `<projectRoot>/.palantir-mini/session/claude-code-version.json` for last-checked state (absent = first-run).
- `researchRoot` defaults to `/home/palantirkc/.claude/research/claude-code`.

## Steps

### Step 1 — Read installed version

```bash
claude --version 2>/dev/null | awk '{print $1}'
```

### Step 2 — Read last-checked version from session state

```
Read: <projectRoot>/.palantir-mini/session/claude-code-version.json
```

If absent, treat `lastChecked` as null (first-run comparison against remote only).

### Step 3 — Invoke claude_code_version_delta handler

```
mcp__plugin_palantir-mini_palantir-mini__claude_code_version_delta({
  researchRoot: "/home/palantirkc/.claude/research/claude-code",
  emitPerVersion: true
})
```

Handler fetches Anthropic release notes, cross-references local research files, returns `{ localLatest, remoteLatest, newVersionAvailable, newVersions, summary }`.

### Step 4 — Spawn claude-code-guide subagent for surface diff

If `newVersionAvailable = true`, spawn `claude-code-guide` subagent with prompt:

```
Summarize Claude Code v<remoteLatest> changes vs v<localLatest>:
- new agent frontmatter fields
- new hook event types
- new MCP tool fields or new MCP tools
- new skill trigger keywords
- deprecated features

Cite documentation refs (URLs where known).
Output as JSON:
{
  "newAgentFields": [],
  "newHookEvents": [],
  "newMcpFields": [],
  "newSkillTriggers": [],
  "deprecated": []
}
```

If `newVersionAvailable = false`, skip subagent spawn; proceed to Step 6.

### Step 5 — Match subagent output against palantir-mini surface registry

For each category returned by `claude-code-guide`, grep the plugin surfaces:

| Category | Grep target |
|----------|-------------|
| `newAgentFields` | `~/.claude/plugins/palantir-mini/agents/*.md` |
| `newHookEvents` | `~/.claude/plugins/palantir-mini/hooks/*.ts` |
| `newMcpFields` | `~/.claude/plugins/palantir-mini/bridge/handlers/*.ts` |
| `newSkillTriggers` | `~/.claude/plugins/palantir-mini/skills/*/SKILL.md` |
| `deprecated` | all four above |

Each match that shows the plugin surface is NOT yet using a new field/event = one `AffectedComponent` record:

```json
{
  "componentKind": "agent" | "hook" | "handler" | "skill",
  "filePathOrRid": "<absolute-path>",
  "patchSuggestion": "<one-line description of what should change>"
}
```

### Step 6 — Emit audit event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  type: "validation_phase_completed",
  payload: {
    errorClass: "claude_code_version_audited",
    taskId: "pm-claude-code-version-watch",
    validations: ["version-delta", "surface-registry-match"],
    installed: "<installed>",
    lastChecked: "<lastChecked>",
    deltaType: "patch" | "minor" | "major",
    affectedComponents: [...],
    claudeCodeVersionDeclarationId: "<rid-if-known>"
  },
  withWhat: {
    reasoning: "<summary from handler + surface match count>",
    memoryLayers: ["semantic", "procedural"]
  }
})
```

Derive `deltaType` from semver comparison of `installed` vs `lastChecked`:
- MAJOR version bump → `"major"`
- MINOR bump → `"minor"`
- PATCH bump → `"patch"`
- No change → omit `deltaType`

### Step 7 — Update session state

Write updated `lastChecked` to `<projectRoot>/.palantir-mini/session/claude-code-version.json`:

```json
{
  "lastChecked": "<installed-version>",
  "checkedAt": "<ISO8601>",
  "lastAuditSummary": "<handler summary one-liner>"
}
```

### Step 8 — Report to Lead

Output the structured audit report (see Output schema below). If `affectedComponents` is non-empty, list each with `patchSuggestion`. Conclude with: "Lead approval required before any patches are applied."

## Output schema

```json
{
  "installed": "2.1.131",
  "lastChecked": "2.1.130",
  "deltaType": "patch",
  "summary": "<claude_code_version_delta handler summary>",
  "affectedComponents": [
    {
      "componentKind": "agent" | "hook" | "handler" | "skill",
      "filePathOrRid": "<absolute-path>",
      "patchSuggestion": "<text>"
    }
  ],
  "claudeCodeVersionDeclarationId": "<rid-or-null>",
  "auditedAt": "<ISO8601>"
}
```

## Authority + cross-refs

- Rule 12 v3.4.0 §Lead protocol — Lead = orchestration; this skill = orchestration interface only.
- Rule 26 §Axis E — memory layers: semantic (surface taxonomy) + procedural (skill flow).
- W3.B hook `claude-code-version-check` (SessionStart drift detection companion).
- Existing handler: `~/.claude/plugins/palantir-mini/bridge/handlers/claude_code_version_delta.ts`.
- Schemas v1.40 `~/.claude/schemas/ontology/primitives/claude-code-version.ts` (ClaudeCodeVersionDeclaration).
- Research MANIFEST: `~/.claude/research/claude-code/MANIFEST.json` (warm, 30d cadence).

## Cadence

Hot-7d advisory via `~/.claude/research/claude-code/MANIFEST.json` (W3.D). Run manually before any sprint that touches `agents/`, `hooks/`, `bridge/handlers/`, or `skills/` surfaces.
