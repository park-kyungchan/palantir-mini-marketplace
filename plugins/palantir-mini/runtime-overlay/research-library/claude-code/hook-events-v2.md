# Claude Code Hook Events (v2.1.110+) — [Official]

> Scope: Valid hook event catalog with signatures + enforcement/advisory classification.
> Provenance: `[Official]` from `features.md` v2.1.108 delta + code.claude.com docs; `[Applied]` 14-invalid-event removal 2026-04-19.
> Last verified: 2026-04-19 (reconciled with cc-guide + plugin v1.2 CHANGELOG; v2.1.108+ recommended use cases appendix added).

## Event Catalog (valid hook events only)

> Note: The following events appeared in pre-v2.1.110 docs but are NOT valid hook event names:
> MemoryWrite, MemoryRead, AgentStart, AgentStop, AgentError, AgentMessage, TeamCreated, TeamDeleted, TeammateJoin, TeammateLeave, TeammateError, ShutdownRequest, ShutdownResponse, PlanApproval.
> Source: cc-guide authoritative check 2026-04-19 + plugin v1.2 CHANGELOG. [Applied]

### Session lifecycle
| Event | Purpose | Mode |
|-------|---------|------|
| `SessionStart` | Session boot | Advisory |
| `InstructionsLoaded` | CLAUDE.md + rules loaded | Advisory |
| `Stop` | Session end | **Blocking** |
| `StopFailure` | Session end on error | Advisory |
| `PreCompact` | Before context compaction | **Blocking** (`decision: "block"` supported as of v2.1.105) |
| `PostCompact` | After compaction completes | Advisory |
| `SessionEnd` | Session close | Advisory |

### Tool lifecycle
| Event | Purpose | Mode |
|-------|---------|------|
| `PreToolUse` | Before any tool call | **Blocking** (matcher-scoped) |
| `PostToolUse` | After any tool call | Advisory |
| `PostToolUseFailure` | After a tool call fails | Advisory |
| `ToolApproval` / `ToolDenied` | Permission decision | Advisory |
| `PermissionRequest` | Permission ask | Advisory |
| `PermissionDenied` (v2.1.89+) | User denies a permission | Advisory |

### Agent lifecycle (Agent Teams)
| Event | Purpose | Mode |
|-------|---------|------|
| `SubagentStart` | Subagent starts | Advisory |
| `SubagentStop` | Subagent complete | **Blocking** |
| `TeammateIdle` (v2.1.33+) | Teammate idleness | Advisory |
| `TaskCreated` / `TaskCompleted` | Task lifecycle | **Blocking** (phase gates) |
| `UserPromptSubmit` | User turn submitted | Advisory |

### Config / workspace
| Event | Purpose | Mode |
|-------|---------|------|
| `ConfigChange` | settings.json modification | Advisory |
| `WorktreeCreate` / `WorktreeRemove` (v2.1.50+) | Worktree lifecycle | Advisory |
| `Notification` | Permission/idle/auth/elicitation prompts | Advisory |
| `FileChanged` | Literal filename match | Advisory |
| `CwdChanged` | Working directory change | Advisory |

## Hook Declaration (within plugin's `hooks.json`)

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write|MultiEdit",
      "hooks": [{
        "type": "command",
        "command": "bun run ${CLAUDE_PLUGIN_ROOT}/scripts/run.ts pre-edit-ontology",
        "timeout": 10
      }]
    }],
    "PreCompact": [{
      "hooks": [{
        "type": "command",
        "command": "bun run ${CLAUDE_PLUGIN_ROOT}/scripts/run.ts pre-compact-state",
        "timeout": 20,
        "decision": "block"
      }]
    }]
  }
}
```

## Frontmatter Fields (v2.1.80+)

Hook entries support:
- `timeout`: seconds (was milliseconds in v2.1.79 and earlier)
- `decision`: `"block"` to block on exit code 2 or structured JSON (PreCompact, Stop, SubagentStop, TaskCompleted)
- `if`: conditional expression (v2.1.85+)
- `statusMessage`: shown in CLI while running (v2.1.80+)
- `async`: run in background (v2.1.85+)

## Our palantir-mini Hook Usage

| Hook script | Event | Matcher | Mode |
|-------------|-------|---------|------|
| `pre-edit-ontology.ts` | PreToolUse | `Edit\|Write\|MultiEdit` | Advisory (validates ontology-state target) |
| `post-edit-propagate.ts` | PostToolUse | `Edit\|Write` | Advisory (emits event) |
| `pre-compact-state.ts` | PreCompact | — | **Blocking** (snapshots events.jsonl) |
| `stop-validate.ts` | Stop | — | **Blocking** (validates invariants) |
| `task-completed-gate.ts` | TaskCompleted | — | **Blocking** (phase gate) |
| `session-start.ts` | SessionStart | — | Advisory (state injection) |

## Removed / Never-Valid Events [Applied]

> Source: cc-guide authoritative check 2026-04-19 + plugin v1.2 CHANGELOG.

The following event names appeared in pre-v2.1.110 internal docs or plugin drafts but are NOT valid hook event types in Claude Code. Hooks referencing them silently no-op.

| Event | Category | Reason invalid |
|-------|----------|----------------|
| `MemoryWrite` | Memory | Never a hook event; memory ops are not observable |
| `MemoryRead` | Memory | Never a hook event; memory ops are not observable |
| `AgentStart` | Agent lifecycle | Never existed; use `SubagentStart` |
| `AgentStop` | Agent lifecycle | Never existed; use `SubagentStop` |
| `AgentError` | Agent lifecycle | Never existed; no error variant in agent lifecycle |
| `AgentMessage` | Agent lifecycle | Never existed; inter-agent messages are not hookable |
| `TeamCreated` | Team lifecycle | Never existed; no team creation event |
| `TeamDeleted` | Team lifecycle | Never existed; no team deletion event |
| `TeammateJoin` | Team lifecycle | Never existed; only `TeammateIdle` is valid |
| `TeammateLeave` | Team lifecycle | Never existed; only `TeammateIdle` is valid |
| `TeammateError` | Team lifecycle | Never existed; no teammate error event |
| `ShutdownRequest` | Protocol | Message type (SendMessage protocol), not a hook event |
| `ShutdownResponse` | Protocol | Message type (SendMessage protocol), not a hook event |
| `PlanApproval` | Protocol | Message type (SendMessage protocol), not a hook event |

## Cross-References
- `plugin-system.md` — how hooks ship with plugins
- `mcp-server-registration.md` — MCP tools the hooks call
- `features.md` — full v2.1.108 delta
- Rules: `~/.claude/rules/10-events-jsonl.md` (events.jsonl invariants)

---

## v2.1.108+ Recommended Use Cases [Applied — 2026-04-19]

> Drawn from phase-a3 session evidence and Phase A-4 plugin v1.4 design. Each entry pairs a hook event with a real-world enforcement pattern that has been validated or is targeted for enforcement. `[Applied]` provenance unless noted.

### Blocking hooks — when to use exit-2 enforcement

**`TaskCreated` — task-granularity gate**

Rejects task creation when the task description is missing required sections (DELETE / ADD / KEEP / VERIFY, per rule 13). Also enforces `subject` naming convention (`^\[(PHASE|P0|P1|P2|P3)\]`) and requires an explicit `blockedBy` list or `blockedBy: []` (not implicit). Phase-a3 evidence: tasks without VERIFY sections were completed without validation steps; gate catches this at creation, not at completion.

```json
{
  "TaskCreated": [{
    "hooks": [{
      "type": "command",
      "command": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/task-created-granularity-gate.ts",
      "timeout": 5,
      "statusMessage": "Validating task structure…"
    }]
  }]
}
```

**`TaskCompleted` — output-contract + inbox-clean gate** (v2.1.112 blocking)

Rejects task completion when: (a) the task's declared output file does not exist or fails schema validation; (b) inbox entries for this task's `task_assignment` have not been cleared. Was Advisory before v2.1.112; upgrade to Blocking at that version enables mechanical enforcement. Phase-a3 experienced 7+ stale-replay incidents from un-cleaned `task_assignment` entries.

Recommended shape for each agent `.md` output contract:

```markdown
## Output Contract
- file: `.palantir-mini/session/blueprints/{{phase}}-blueprint.json`
- required fields: `version`, `entities[]`, `queries[]`, `mutations[]`
- hook validates with: `ajv` against `schemas/blueprint-schema.json`
```

**`SubagentStop` — state-file schema validation**

Validates that the completed teammate's output files match the declared schema before accepting the stop. Exit-2 forces the teammate to continue (with stderr feedback as context injection). This is the correct timing surface — `PostToolUse` may fire before the agent's own `Write` settles (Phase A-2 defect #1). `SubagentStop` is guaranteed post-write.

```json
{
  "SubagentStop": [{
    "hooks": [{
      "type": "command",
      "command": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/subagent-stop.ts",
      "timeout": 15,
      "statusMessage": "Validating teammate output contract…"
    }]
  }]
}
```

**`PreCompact` — ontology-state invariant guard** (v2.1.105 blocking)

Blocks context compaction when `world-model.json` has unresolved contradictions or `eval-results.json` is in a partial-write state. Without this gate, compaction can strip the unresolved contradiction from context; the next turn proceeds as if resolution happened. Phase-a3 did not hit this defect but the guard is cheap insurance: ontology-state files are read in <10ms; most compaction triggers will pass immediately.

**`Stop` — session-close checklist** (v2.1.106 blocking)

Blocks session end when: (a) active task groups have no `phase_completed` event; (b) home or project repos have uncommitted changes; (c) `MEMORY.md` has no session summary. Prevents silent session close that leaves pipeline state ambiguous. Phase-a3 ran 4h 43min without a close-checklist; this gate enforces the `/ship` discipline at the platform level.

**`PreToolUse(Edit|Write)` — generated-file guard**

Rejects edits to files matching `src/generated/**/*.ts` or any file with the codegen header (`// GENERATED — do not edit`). Regeneration is the correct path (rule 11). Phase-a3 evidence: three implementers attempted inline edits to generated resolvers when regeneration was the correct path; gate prevents this and injects "run pm-codegen" guidance in stderr.

### Advisory hooks — recommended use patterns

**`TeammateIdle` — idle digest + auto-shutdown** (v2.1.112 JSON shutdown available)

Two-hook pattern:
1. `lead-idle-digest.ts` (async, Advisory): accumulates idle pings into a 5-minute aggregation buffer; suppresses per-ping delivery to Lead. Prevents 170-of-238 idle-notification pattern from phase-a3.
2. `idle-auto-shutdown.ts` (JSON shutdown via `{continue: false}`): terminates the teammate when `idleCount >= 3 && available_claimable_tasks == 0`. Phase-a3 evidence: v1.1 condition (`depth > 1`) was too narrow for single-wave blocking. New condition is correct.

Do not combine both into one hook: digest needs `async: true` (non-blocking aggregation); auto-shutdown needs synchronous `{continue: false}` return. Two separate hooks with different async properties is the correct shape.

**`SessionStart` — state injection + frontmatter validation**

Two responsibilities traditionally combined in one hook. Recommend splitting:
- `session-start.ts`: clean mutable state (`CLEAN_STATE=1`), inject ontology summary as `additionalContext`.
- `agent-frontmatter-validate.ts`: scan `.claude/agents/*.md`; exit-2 on non-conformant frontmatter (missing `name/description/tools/model`, present `initialPrompt`).

Splitting avoids a slow validator blocking the state-injection path. State injection is always fast; frontmatter scan can take 1-3s on large agent rosters.

**`UserPromptSubmit` — inbox auto-injection**

Reads unread inbox entries for the current teammate; emits them as `additionalContext`; marks as read; emits `inbox_delivered` event. Must be `async: true` — never block the user turn. Phase-a3 evidence: replacements had 100% inbox-read rate; originals had 40% inbox-ignore rate. The difference was briefing quality, not injection (injection was already live). Injection is load-bearing for message delivery; briefing quality is load-bearing for compliance.

**`SubagentStart` — briefing template validation**

Parses the spawned teammate's initial briefing prompt. Requires presence of four sections: speed target, claim order, no-polling directive, reply-in-text expectation. Exit-2 if any missing. Phase-a3 confirmed: the 4/22 inbox-ignore incidents mapped exactly to original-cohort spawns that lacked these four sections.

**`PostToolUse(Edit|Write)` — incremental impact-graph update**

After any file edit, re-scan only the edited file through the AST walker. Diff against stored AST hash. Update only changed edges in SQLite. This incremental path keeps the impact graph current without a full re-walk. Cost: <50ms for most single-file edits. Cross-ref: `context-engineering.md §3`.

### Interaction patterns

**Gate layering — TaskCreated → TaskCompleted**

A two-gate pattern where `TaskCreated` enforces structural prerequisites (task shape, naming, explicit `blockedBy`) and `TaskCompleted` enforces semantic postconditions (output contract, inbox clean) is the recommended standard for Ontology-Driven pipelines. Neither gate alone is sufficient: creation-time checks catch malformed tasks before they enter the pipeline; completion-time checks catch tasks that completed without producing correct outputs.

**Blocking-then-Advisory chain — SubagentStop → PostToolUse**

Use `SubagentStop` (Blocking) for the phase gate. Use `PostToolUse` (Advisory) for lightweight post-write propagation (event emission, cache invalidation). Never combine both concerns in one hook: the phase gate needs exit-2 semantics; the propagation step should not block under any condition.

**TeammateIdle three-tier policy (v1.1 + v1.4)**

| idleCount | blockedByDepth | claimable tasks | Action |
|-----------|----------------|-----------------|--------|
| < 3 | any | any | Silent pass |
| 3-5 | > 1 | = 0 | `{continue: false}` — auto-shutdown |
| 3-5 | 1 | > 0 | Inject cost warning via `additionalContext` |
| 3-5 | 1 | = 0 | `{continue: false}` — auto-shutdown |
| >= 6 | any | = 0 | `{continue: false}` — force shutdown regardless of depth |

The v1.1 condition (`depth > 1`) produced the phase-a3 idle burn. The v1.4 upgrade adds `claimable == 0` as a bypass condition so single-wave blocking no longer exempts teammates from shutdown. [Applied]
