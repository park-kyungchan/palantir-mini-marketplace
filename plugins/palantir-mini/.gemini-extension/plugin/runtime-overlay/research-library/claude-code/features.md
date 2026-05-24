# Claude Code — Complete Feature Reference

> Last updated: 2026-04-19 (Phase A-6 O5 — Opus 4.7 + v2.1.114 verification). Current version: **v2.1.114** (April 19, 2026).
> Model: **Claude Opus 4.7** (1M context, 128k max output). Fast: **Sonnet 4.6**.
> Sources: Official docs (code.claude.com), GitHub changelog, Anthropic blog, platform.claude.com.
> Opus 4.7 integration verification: see `opus-4.7-integration.md` for palantir-mini substrate compatibility audit.

---

## Version History (Key Milestones)

| Version | Date | Key Feature |
|---------|------|-------------|
| v2.1.32 | 2026-02-05 | Opus 4.6 launch, **Agent Teams** research preview, auto-memory |
| v2.1.45 | 2026-02-17 | Sonnet 4.6 support |
| v2.1.49 | 2026-02-19 | `--worktree` flag, `isolation: "worktree"`, OAuth support |
| v2.1.59 | 2026-02-26 | **Auto-memory** goes live, `/copy` command |
| v2.1.63 | 2026-02-28 | `/simplify` and `/batch` bundled skills, worktree+memory sharing |
| v2.1.68 | 2026-03-04 | Opus 4.6 defaults to medium effort, "ultrathink" keyword |
| v2.1.69 | 2026-03-05 | Voice mode +10 languages, `InstructionsLoaded` hook, plugin `git-subdir` |
| v2.1.71 | 2026-03-07 | `/loop` command (recurring interval), cron scheduling |
| v2.1.72 | 2026-03-10 | `/btw` side-question, `ExitWorktree` tool, effort levels simplified |
| v2.1.76 | 2026-03-14 | MCP elicitation, `PostCompact` hook, 1M context GA, `/effort`, `worktree.sparsePaths` |
| v2.1.77 | 2026-03-17 | Opus 4.6 64k→128k output, `/fork`→`/branch`, `claude plugin validate` |
| v2.1.78 | 2026-03-17 | `StopFailure` hook, `${CLAUDE_PLUGIN_DATA}` persistent state |
| v2.1.79 | 2026-03-18 | `--console` auth, `/remote-control` in VSCode, multi seed dirs |
| v2.1.80 | 2026-03-19 | Statusline rate limits, plugin declarations in settings, effort frontmatter, MCP channels |
| v2.1.81 | 2026-03-20 | `--bare` scripting flag, permission relay, voice stability |
| v2.1.84 | 2026-03-26 | **PowerShell tool**, `TaskCreated` hook, effort detection env vars, deep links preferred terminal |
| v2.1.85 | 2026-03-26 | Conditional hooks (`if` field), MCP OAuth RFC 9728, org policy blocks |
| v2.1.86 | 2026-03-27 | `X-Claude-Code-Session-Id` header, keychain cache 5s→30s, `@` mention token reduction |
| v2.1.87 | 2026-03-29 | Cowork Dispatch fix |
| v2.1.89 | 2026-04-01 | **Flicker-free alt-screen**, `PermissionDenied` hook, named subagents, `/powerup`, defer for headless |
| v2.1.90 | 2026-04-01 | PowerShell hardening, rate-limit dialog fix |
| v2.1.91 | ~2026-04-02 | MCP per-tool truncation override (`anthropic/maxResultSizeChars` up to 500K) |
| v2.1.92 | 2026-04-04 | **Amazon Bedrock wizard** (Mantle), `/release-notes` interactive, `/cost` per-model breakdown |
| v2.1.94 | 2026-04-07 | Default effort → **high** (API/Bedrock/Vertex/Team/Enterprise), plugin skill frontmatter `name` |
| v2.1.96 | 2026-04-08 | Bedrock auth fix, `AWS_BEARER_TOKEN_BEDROCK` replaces `SKIP_BEDROCK_AUTH` |
| v2.1.97 | 2026-04-08 | Focus view toggle (`Ctrl+O`), `refreshInterval` statusline, Bash hardening |
| v2.1.98 | 2026-04-09 | **Google Vertex AI wizard**, **Monitor tool**, subprocess sandboxing, LSP `clientInfo` |
| v2.1.101 | 2026-04-10 | `/team-onboarding`, OS CA certs, OTEL tracing vars, extensive stability/security fixes |
| v2.1.102 | 2026-04-11 | (internal stability) |
| v2.1.103 | 2026-04-12 | (internal stability) |
| v2.1.104 | 2026-04-12 | (internal stability) |
| v2.1.105 | 2026-04-13 | **PreCompact `decision: "block"`**, `EnterWorktree` `path` param, plugin manifest `monitors` key, `/proactive` alias, MCP large-output truncation UI |
| v2.1.106 | 2026-04-13 | (internal stability) |
| v2.1.107 | 2026-04-14 | Show thinking hints sooner during long operations |
| v2.1.108 | 2026-04-14 | **`/recap` command**, `ENABLE_PROMPT_CACHING_1H` / `FORCE_PROMPT_CACHING_5M`, model-driven Skill invocation (`/init`, `/review`, `/security-review`), `/undo` alias |
| v2.1.110 | 2026-04-17 | Plugin manifest `mcpServers` registration (palantir-mini v1.0 requires floor) |
| v2.1.113 | 2026-04-18 | Stability + documentation deltas (captured via palantir-mini `check_cc_version` pre-v2.1.114) |
| v2.1.114 | 2026-04-19 | **Opus 4.7 (1M context)** integration floor; Phase A-6 O5 verification pass (no substrate behavior regressions vs 4.6) |

Release cadence: almost daily. 100+ versions shipped Jan–Apr 2026.

### Delta: v2.1.102 → v2.1.108 (April 11–15, 2026)

**Hooks**
- **PreCompact `decision: "block"`** (v2.1.105): Block compaction via exit code 2 or `{"decision":"block"}`. Protects ontology-state invariants when world-model.json or eval-results.json have unresolved contradictions.

**Tools**
- **`EnterWorktree` `path` parameter** (v2.1.105): Switch into an existing worktree instead of creating a new one. Enables cross-project worktree reuse.

**Commands & Skills**
- **`/recap`** (v2.1.108): Generates session context summary on return; configurable via `/config`. `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1` forces recap when telemetry disabled.
- **Model-driven Skill invocation** (v2.1.108): Model can discover and invoke `/init`, `/review`, `/security-review` via the Skill tool — not just user-triggered.
- **`/proactive`** (v2.1.105): Alias for `/loop`.
- **`/undo`** (v2.1.108): Alias for `/rewind`.

**Plugin Manifests**
- **`monitors` key** (v2.1.105): Top-level plugin manifest field auto-arms background `Monitor` streams at session start or skill invoke. Syntax: `"monitors": [{ "script": "..." }]`. Critical for API-Free background drift detection.

**Settings & Env Vars**
- **`ENABLE_PROMPT_CACHING_1H`** (v2.1.108): Opt into 1-hour prompt cache TTL.
- **`FORCE_PROMPT_CACHING_5M`** (v2.1.108): Force 5-minute cache TTL.
- **`CLAUDE_CODE_ENABLE_AWAY_SUMMARY`** (v2.1.108): Force recap generation when telemetry disabled.

**Stability**
- Improved stalled API stream handling (v2.1.105), file write display, skill descriptions cap raised 250→1,536 chars (v2.1.105).
- Show thinking hints sooner during long operations (v2.1.107).
- Multiple stability fixes: paste in `/login`, telemetry cache TTL, Agent tool permissions, Bash output, session names, terminal escape codes, `/resume` chain recovery (v2.1.108).

**Top 3 most relevant for multi-project Ontology-First runtime**
1. **PreCompact `decision: "block"`** — Lets ontology-state hooks veto compaction when invariants fail. Critical for preserving semantic state across compaction boundaries.
2. **Plugin `monitors` manifest key** — Lets `~/.claude/plugins/palantir-mini/` auto-arm a drift-watch Monitor at session start without user opt-in. Background drift detection becomes free under API-Free Max X20.
3. **`/recap` + away summary** — Drift-check workflow can rely on `/recap` to surface state when the user returns to a session, eliminating cold-start cost of re-reading 6 ontology-state files.

---

## 1. Agent Teams (Experimental, v2.1.32+)

**Enable**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json env.

**Architecture**:
- **Lead**: Main session — creates team, spawns teammates, coordinates
- **Teammates**: Separate CC instances with own context windows
- **Task List**: Shared, file-lock-based claiming, dependency tracking
- **Mailbox**: Direct messaging (`SendMessage`), broadcast (`to: "*"`)

**Display**: `in-process` (Shift+Down to cycle) or `split panes` (tmux/iTerm2)

**Quality gates via hooks**: `TeammateIdle` (exit 2 = feedback), `TaskCompleted` (exit 2 = reject)

**Limits**: No session resumption, one team per session, no nested teams, fixed lead, max 10 subagents. Split panes not supported in VS Code terminal/Windows Terminal/Ghostty.

**Best practices**: 3-5 teammates, 5-6 tasks per teammate, disjoint file ownership.

**TeamCreate parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `team_name` | string | Yes | Unique team identifier |
| `description` | string | No | Team purpose/goal |
| `agent_type` | string | No | Subagent type for lead role |

**TeamDelete**: Requires all teammates shut down first. Removes `~/.claude/teams/{name}/` and `~/.claude/tasks/{name}/`.

**SendMessage parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | Yes | Recipient name or `"*"` for broadcast |
| `message` | string/object | Yes | Plain text or structured protocol message |
| `summary` | string | No | Short preview for UI notification |

**Structured message types**: `shutdown_request`, `shutdown_response`, `plan_approval_response` (with `request_id`, `approve`, `feedback`).

---

## 2. Task Management Tools

Session-scoped task list for complex multi-step work tracking. Visible via `Ctrl+T`.

### TaskCreate

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `subject` | string | Yes | — | Brief imperative title |
| `description` | string | Yes | — | What needs to be done |
| `activeForm` | string | No | — | Present continuous form for spinner (e.g., "Running tests") |
| `metadata` | object | No | `{}` | Arbitrary key-value pairs |

### TaskUpdate

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `taskId` | string | Yes | — | Task identifier |
| `status` | enum | No | unchanged | `pending` / `in_progress` / `completed` / `deleted` |
| `subject` | string | No | unchanged | Updated title |
| `description` | string | No | unchanged | Updated description |
| `activeForm` | string | No | unchanged | Spinner text |
| `owner` | string | No | unchanged | Agent name for team assignment |
| `metadata` | object | No | unchanged | Merge keys (set key to `null` to delete) |
| `addBlocks` | string[] | No | — | Task IDs that cannot start until this completes |
| `addBlockedBy` | string[] | No | — | Task IDs that must complete before this can start |

### TaskList
Returns: `id`, `subject`, `status`, `owner`, `blockedBy` for each task. No parameters.

### TaskGet
Parameter: `taskId` (string, required). Returns full task details including `blocks`, `blockedBy`, `description`.

### TaskStop
Parameter: `task_id` (string, required). Kills a running background task.

### TaskOutput (DEPRECATED)
Use `Read` on the task's output file path instead. Parameters: `task_id`, `block` (bool), `timeout` (ms).

---

## 3. Hooks System (24+ Event Types)

**Types**: `command` (shell), `prompt` (LLM/Haiku), `agent` (multi-turn), `http` (POST JSON)

**Config**: `~/.claude/settings.json` (global), `.claude/settings.json` (project), `.claude/settings.local.json` (local), plugin `hooks/hooks.json`, skill/agent frontmatter.

**Exit codes**: 0=allow (stdout=context injection), 2=block (stderr=feedback), other=continue silently.

**All Events**:

| # | Event | Matcher | Added |
|---|-------|---------|-------|
| 1 | `SessionStart` | startup/resume/clear/compact | — |
| 2 | `UserPromptSubmit` | — | — |
| 3 | `PreToolUse` | tool name regex | — |
| 4 | `PermissionRequest` | tool name | — |
| 5 | `PostToolUse` | tool name regex | — |
| 6 | `PostToolUseFailure` | tool name | — |
| 7 | `Notification` | permission_prompt/idle_prompt/auth_success/elicitation_dialog | — |
| 8 | `SubagentStart` | agent type | — |
| 9 | `SubagentStop` | agent type | — |
| 10 | `Stop` | — | — |
| 11 | `StopFailure` | rate_limit/auth_failed/billing_error/etc. | v2.1.78 |
| 12 | `TeammateIdle` | — | v2.1.33 |
| 13 | `TaskCompleted` | — | v2.1.33 |
| 14 | `InstructionsLoaded` | session_start/nested_traversal/path_glob_match/include/compact | v2.1.69 |
| 15 | `ConfigChange` | user/project/local/policy_settings/skills | v2.1.49 |
| 16 | `WorktreeCreate` | — | v2.1.50 |
| 17 | `WorktreeRemove` | — | v2.1.50 |
| 18 | `PreCompact` | — | — |
| 19 | `PostCompact` | — | v2.1.76 |
| 20 | `Elicitation` | MCP server name | v2.1.76 |
| 21 | `ElicitationResult` | MCP server name | v2.1.76 |
| 22 | `SessionEnd` | clear/logout/prompt_input_exit/bypass_permissions_disabled/other | — |
| 23 | `TaskCreated` | — | v2.1.84 |
| 24 | `PermissionDenied` | — | v2.1.89 |

**New hook features (v2.1.84–v2.1.101)**:
- `if` field: Conditional execution using permission rule syntax (v2.1.85)
- `async: true`: Run command hooks in background without blocking
- `statusMessage`: Custom spinner message for any hook type
- `updatedInput`: `PreToolUse` hooks can modify tool input (e.g., satisfy `WorkflowContract turn-card decision`)
- `updatedPermissions`: `PermissionRequest` hooks can save allow/deny rules persistently
- `permissionDecision: "defer"`: Pause headless sessions (`-p --resume`) for later re-evaluation (v2.1.89)
- `PermissionDenied` supports `{retry: true}` option
- MCP tool matching: `mcp__<server>__<tool>` regex patterns

**HTTP hook example**:
```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/pre-tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"],
  "timeout": 30
}
```

---

## 4. MCP (Model Context Protocol)

**Install**: `claude mcp add --transport http|sse|stdio <name> <url/command>`
**Manage**: `claude mcp list|get|remove`, `/mcp` in session
**Scopes**: `--scope local` (~/.claude.json), `--scope project` (.mcp.json), `--scope user`

**Tool Search** (v2.1.76+, default enabled): Auto-enabled >10% context. ~85-95% token reduction. Only tool names load at session start (~8.7K tokens vs ~77K). `ENABLE_TOOL_SEARCH=auto:5`.

**Elicitation** (v2.1.76): MCP servers request structured input. `Elicitation`/`ElicitationResult` hooks.

**OAuth**: `--callback-port`, `--client-id`, step-up auth, discovery caching (v2.1.49+). RFC 9728 Protected Resource Metadata (v2.1.85). Dynamic Client Registration.

**claude.ai connectors**: Reuse claude.ai MCPs in CC (v2.1.46).

**Resources**: `@server:resource://path` mentions.

**Per-tool truncation override** (v2.1.91): MCP servers set `_meta["anthropic/maxResultSizeChars"]` up to 500K per tool in `tools/list` response.

**MCP channels** (v2.1.80): `--channels` for MCP servers to push messages.

**MCP Apps**: UI capabilities for MCP servers, managed configuration for enterprise control.

**Built-in MCPs**: Slack (14 tools), Playwright (20+), Figma, Context7, Gmail, Google Calendar, Scrapling.

---

## 5. Skills / Slash Commands

**Location**: `~/.claude/skills/name/SKILL.md` or `.claude/skills/name/SKILL.md`.

**Frontmatter**: `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowedTools`, `model`, `context: fork`, `agent`, `hooks`, `memory`, `effort` (v2.1.80), `output-style` (v2.1.94), `shell`, `paths`.

**Subs**: `$ARGUMENTS`, `$0`, `$ARGUMENTS[N]`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`.
**Dynamic**: `` !`command` `` runs before skill sent. Disable with `disableSkillShellExecution: true`.

**Bundled** (v2.1.63+): `/batch`, `/simplify`, `/claude-api`, `/debug`, `/loop`, `/schedule`.

**Compaction**: First 5,000 tokens of each skill preserved; up to 25K combined budget.

**New frontmatter fields**:
- `effort`: `low|medium|high|max` — controls LLM reasoning budget
- `output-style: keep-coding-instructions` — preserves inline technical instructions
- `paths`: Glob patterns limiting skill activation (monorepo support)
- `shell`: Force `bash` or `powershell`

---

## 6. Custom Agents / Subagents

**Location**: `.claude/agents/name.md` or `~/.claude/agents/name.md`.

**Frontmatter**: `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `skills`, `mcpServers`, `memory` (user/project/local), `background`, `isolation` ("worktree"), `hooks`, `effort`, `maxTurns`.

**Built-in**: Explore (Haiku), Plan (read-only), general-purpose. Max 10 simultaneous.

**Invoke**: `@"name (agent)" prompt`, `/agents`, `claude --agent name`.
**Resume**: `SendMessage({to: agentId})` — `resume` param removed (v2.1.77).
**Named subagents** (v2.1.89): Appear in `@` mention typeahead with stable names.

### Agent Tool Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | Yes | Short 3-5 word description |
| `prompt` | string | Yes | Full task briefing for the agent |
| `subagent_type` | string | No | Agent type to use |
| `name` | string | No | Addressable name for SendMessage |
| `run_in_background` | boolean | No | Run async, notify on completion |
| `isolation` | `"worktree"` | No | Isolated git worktree |
| `mode` | enum | No | `acceptEdits`/`auto`/`bypassPermissions`/`default`/`dontAsk`/`plan` |
| `model` | enum | No | `sonnet`/`opus`/`haiku` |
| `team_name` | string | No | Team to join |

### Available subagent_types

| Type | Tools | Use Case |
|------|-------|----------|
| `general-purpose` | All | Default multi-step tasks |
| `Explore` | Read-only | Fast codebase exploration |
| `Plan` | Read-only | Implementation planning |
| `claude-code-guide` | Read + Web | Claude Code feature questions |
| `implementer` | Read + Write + Edit + Bash + LSP | Focused coding tasks |
| `researcher` | Read + Web + scrapling MCPs | Deep research |
| `verifier-correctness` | Read-only + Bash + LSP | Correctness verification |
| `verifier-adversarial` | Read-only + Bash + LSP | Red-team/edge-case verification |
| `statusline-setup` | Read + Edit | Status line configuration |
| Custom (`.claude/agents/`) | Configurable | Domain-specific agents |

### Subagent Context Isolation
- **Receives**: Own system prompt + Agent tool prompt, project CLAUDE.md, tool definitions
- **Does NOT receive**: Parent conversation history, parent system prompt, skills (unless listed)

---

## 7. Memory System

**CLAUDE.md**: Managed > Session > Local > Project > User.
**Import**: `@path/to/file` (max 5 hops).
**Rules**: `.claude/rules/name.md` with `paths:` frontmatter. Survives compaction.

**Auto memory** (v2.1.59+): `~/.claude/projects/<project>/memory/MEMORY.md`.
- 200-line cap (beyond invisible unless accessed).
- `/memory` to browse.
- Shared across worktrees (v2.1.63).
- Stored locally in `~/.claude/memory/` (user-level) and `.claude/memory/` (project-level).

**Memory types**: `user`, `feedback`, `project`, `reference`.
**Frontmatter**: `name`, `description`, `type`.

**Four-phase consolidation**: Scattered session notes → organized project knowledge. Claude decides what's worth saving based on future utility.

---

## 8. Scheduling & Automation

### CronCreate

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cron` | string | Yes | — | 5-field cron: `M H DoM Mon DoW` (local timezone) |
| `prompt` | string | Yes | — | Prompt to execute at fire time |
| `recurring` | boolean | No | `true` | `false` = one-shot, auto-delete after firing |
| `durable` | boolean | No | `false` | `true` = persist to `.claude/scheduled_tasks.json` |

**Jitter**: Recurring up to 10% of period late (max 15 min). One-shot at :00/:30 up to 90s early.
**Expiry**: Recurring tasks auto-expire after 7 days.
**Disable**: `CLAUDE_CODE_DISABLE_CRON=1`.
**Limit**: Max 50 per session.

### CronDelete / CronList
`CronDelete`: `id` (string, required). `CronList`: no parameters.

### /loop Command
Quick polling: `/loop 5m <prompt>` (fixed) or `/loop <prompt>` (dynamic, Claude chooses 1min–1hr).
Custom loop config: `.claude/loop.md` (project) or `~/.claude/loop.md` (user).

### /schedule Command
Creates, updates, lists, or runs scheduled **remote agents** (RemoteTrigger-based, cloud infrastructure).

### RemoteTrigger

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | enum | Yes | `list`/`get`/`create`/`update`/`run` |
| `trigger_id` | string | For get/update/run | Trigger identifier |
| `body` | object | For create/update | JSON configuration |

---

## 9. Worktrees (v2.1.49+)

`claude --worktree name` or `isolation: "worktree"` in agents.
`worktree.sparsePaths` for monorepos (v2.1.76).
Hooks: `WorktreeCreate`, `WorktreeRemove`. Auto-cleanup if clean.
`.worktreeinclude` file: Copy gitignored files (`.env`, secrets) into worktree.
`/batch` uses worktrees for parallel PRs.
Orphaned subagent worktrees: auto-cleanup after `cleanupPeriodDays` (default 30 days).

### EnterWorktree
Parameter: `name` (string, optional). Creates at `<repo>/.claude/worktrees/<name>/`, branches from `origin/HEAD`.

### ExitWorktree
Parameters: `action` (`"keep"` / `"remove"`), `discard_changes` (boolean, for remove with uncommitted changes).

---

## 10. Code Review (v2.1.72+, Teams/Enterprise)

Multi-agent PR review. Parallel bug search → false positive filter → severity rank.
~$15-$25/review. 54% PRs get findings, <1% incorrect. Large PRs: 84% findings, avg 7.5 issues.

**Setup**: Enable in settings → Install GitHub App → Select repositories.
**Custom**: `CLAUDE.md` for project-wide focus, `REVIEW.md` for review-specific customizations.

---

## 11. Plugins & Marketplace (v2.1.69+)

Plugins ship: settings, skills, agents, hooks.
`${CLAUDE_PLUGIN_DATA}` persistent state (v2.1.78). `${CLAUDE_PLUGIN_ROOT}` installation dir (changes on update).
`claude plugin validate` (v2.1.77). Multi seed dirs (v2.1.79).

**Plugin declaration in settings.json** (v2.1.80):
```json
{
  "extraKnownMarketplaces": {
    "my-plugins": {
      "source": { "source": "git", "url": "https://..." }
    }
  }
}
```

**Ecosystem** (~April 2026): 101 official plugins, 2,400+ skills, 497+ plugins in Build with Claude marketplace.
`allowedChannelPlugins` managed setting (v2.1.84). Org policy can block plugins (v2.1.85).
`disableSkillShellExecution` managed setting (v2.1.91).

---

## 12. Computer Use (v2.1.84+, macOS, Research Preview)

Desktop automation: Claude directly interacts with your computer — click, type, open apps, navigate browsers.

- **Capabilities**: Open native apps, click UI elements, fill forms, navigate desktop
- **Safety**: Safe actions auto-run; risky actions blocked with safer alternatives
- **Default**: Off by default; Claude asks before each action
- **Platform**: macOS only (initially). Pro/Max users.

---

## 13. Monitor Tool (v2.1.98+)

Streams events from long-running background scripts. Each stdout line becomes a notification.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | Yes | Shell script (each stdout line = event) |
| `description` | string | Yes | Human-readable description for notifications |
| `timeout_ms` | number | Yes | Kill after deadline (max 3,600,000ms) |
| `persistent` | boolean | Yes | `true` = session-lifetime, no timeout |

**Use cases**: Tail logs, poll CI/PR status, watch file changes, track build output.
**Tips**: Use `grep --line-buffered` in pipes. Poll 30s+ for remote APIs. Redirect noise to `/dev/null`.

---

## 14. Models & Effort

| Model | Context | Max Output | Price (MTok) |
|-------|---------|-----------|-------------|
| Opus 4.7 (2026) | 1M | 128k | $15 in / $75 out |
| Opus 4.6 | 1M | 128k | $15 in / $75 out |
| Sonnet 4.6 | — | 64k | $3 in / $15 out |
| Haiku 4.5 (2025-10-01) | — | — | cheapest |

**Effort**: `/effort` (low/medium/high). Default: **high** for API-key/Bedrock/Vertex/Team/Enterprise users (v2.1.94), medium for Pro/Max subscription.
**Fast mode**: `/fast` — same model, faster output.
**Effort detection**: `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL_SUPPORTS` env vars (v2.1.84).

**Cloud platform wizards**:
- **Amazon Bedrock** (v2.1.92): Interactive setup, `CLAUDE_CODE_USE_MANTLE=1`
- **Google Vertex AI** (v2.1.98): Interactive setup with GCP auth

---

## 15. Permissions

**Modes**: default, acceptEdits, dontAsk, bypassPermissions, plan. Cycle: Shift+Tab.
**Syntax**: `Read(*)`, `Bash(npm:*)`, `Edit(.env)`, `mcp__github__*`, `Skill(deploy)`, `Agent(Explore)`, `Task(agent_type)`.
**Sandbox**: `allowRead` (v2.1.77), `enableWeakerNetworkIsolation` (v2.1.69).

**Auto-mode denied commands**: Now appear in `/permissions` → Recent tab with `r` retry (v2.1.89).
**Subprocess sandboxing** (v2.1.98): Linux PID namespace isolation. `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, `CLAUDE_CODE_SCRIPT_CAPS`.

---

## 16. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+C | Interrupt |
| Ctrl+B | Background task |
| Ctrl+F | Kill all background agents |
| Ctrl+G | Edit plan in editor |
| Ctrl+O | Toggle verbose / **Focus view** (in `NO_FLICKER` mode) |
| Ctrl+T | Toggle task list |
| Shift+Tab | Cycle permission modes |
| Shift+Down | Cycle teammates |
| Double-Esc | Timeline (fork/rewind) |

Custom: `~/.claude/keybindings.json`.

---

## 17. In-Session Commands

```
/agents /skills /hooks /memory /config /mcp
/compact /context /resume /rename /clear
/batch /simplify /debug /loop /plan /schedule
/model /effort /btw /voice /remote-control
/copy /color /branch /keybindings /init /help /team
/powerup /team-onboarding /release-notes /cost
/permissions /insights
```

**Removed** (v2.1.92): `/tag`, `/vim`.

---

## 18. Rendering & Terminal

**Flicker-free alt-screen** (v2.1.89): `CLAUDE_CODE_NO_FLICKER=1`. Virtualized scrollback.
**Focus view** (v2.1.97): `Ctrl+O` in `NO_FLICKER` mode — shows prompt, tool summary, response only.
**Statusline**: `refreshInterval` (v2.1.97), `workspace.git_worktree` (v2.1.98), rate limit display (v2.1.80).
**Agent indicator**: `● N running` in `/agents` (v2.1.97).

---

## 19. Scripting & Headless

- `--bare` flag (v2.1.81): Skip hooks, LSP, plugin sync for scripted `-p` calls. Requires `ANTHROPIC_API_KEY`.
- `MCP_CONNECTION_NONBLOCKING=true`: Skip MCP wait in `-p` mode (v2.1.89).
- `permissionDecision: "defer"`: Pause headless sessions for later resume (v2.1.89).
- `-p --resume <name>`: Accepts session titles from `/rename`.

---

## 20. Observability & Tracing

- `X-Claude-Code-Session-Id` header for proxy session aggregation (v2.1.86).
- `W3C TRACEPARENT` env var in Bash subprocesses for OTEL tracing (v2.1.98).
- `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT` (v2.1.101).
- `/cost` shows per-model and cache-hit breakdown (v2.1.92).
- `/insights` includes report file link (v2.1.101).

---

## 21. Pricing

| Plan | Price | Window |
|------|-------|--------|
| Pro | $20/mo | ~44k |
| Max 5x | $100/mo | ~88k |
| Max 20x | $200/mo | ~220k |
| Team | $25/user/mo + $150 premium | Code Review |

Average: ~$6/dev/day.

---

## 22. Slack MCP (14 tools)

**Write**: send_message, send_message_draft, schedule_message
**Search**: search_public (no consent), search_public_and_private (consent), search_channels, search_users
**Read**: read_channel, read_thread, read_user_profile, read_canvas
**Canvas**: create_canvas, update_canvas
**Skills**: summarize-channel, find-discussions, standup, channel-digest, draft-announcement

---

## 23. Notable

- **Computer use** (v2.1.84): Desktop automation research preview (macOS)
- **Session forking**: Double-Esc → timeline → `--fork-session`
- **Ant CLI**: Standalone Claude API CLI, natively understood by CC
- **`/powerup`** (v2.1.89): Interactive lessons with animated demos
- **`/team-onboarding`** (v2.1.101): Generate teammate ramp-up guides
- **Safety issue** (#27430): Autonomous fabricated publishing incident (2026-02-19)
- **Community**: VoltAgent/awesome-claude-code-subagents (100+ agents)

---

## 24. Security & Hardening (v2.1.84–v2.1.101)

- PowerShell: `-ErrorAction Break` hang fix, trailing `&` bypass prevention (v2.1.90)
- Bash: Tightened env-var prefixes, network redirects, backslash-escaped flag bypass fix (v2.1.97, v2.1.101)
- Compound Bash commands bypassing forced permission prompts fixed (v2.1.101)
- LSP: Command injection in POSIX `which` fallback fixed (v2.1.101)
- Edit/Write: CRLF doubling on Windows fixed
- Symlink: `Edit(//path/**)` and `Read(//path/**)` check resolved symlink targets (v2.1.89)
- Subprocess sandboxing: Linux PID namespace (v2.1.98)
- OS CA certificate store trust by default for enterprise TLS proxies (v2.1.101)
- Unrecognized hook event names no longer cause entire settings file to be ignored (v2.1.101)

---

## 25. Environment Variables Reference (New since v2.1.79)

| Variable | Version | Purpose |
|----------|---------|---------|
| `CLAUDE_CODE_NO_FLICKER` | v2.1.89 | Flicker-free alt-screen rendering |
| `CLAUDE_CODE_USE_MANTLE` | v2.1.92 | Enable Bedrock Mantle support |
| `CLAUDE_CODE_PERFORCE_MODE` | v2.1.98 | Fail on read-only files with `p4 edit` hint |
| `CLAUDE_CODE_EXCLUDE_DYNAMIC_SYSTEM_PROMPT_SECTIONS` | v2.1.98 | Improve cross-user prompt caching |
| `CLAUDE_CODE_CERT_STORE` | v2.1.101 | Use bundled certs instead of OS CA store |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | v2.1.98 | Enable env scrubbing in sandboxed subprocesses |
| `CLAUDE_CODE_SCRIPT_CAPS` | v2.1.98 | Limit per-session script invocations |
| `AWS_BEARER_TOKEN_BEDROCK` | v2.1.96 | Replaces `CLAUDE_CODE_SKIP_BEDROCK_AUTH` |
| `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL_SUPPORTS` | v2.1.84 | Effort/thinking capability detection |
| `OTEL_LOG_USER_PROMPTS` | v2.1.101 | Include user prompts in OTEL traces |
| `OTEL_LOG_TOOL_DETAILS` | v2.1.101 | Include tool details in traces |
| `OTEL_LOG_TOOL_CONTENT` | v2.1.101 | Include tool content in traces |
| `MCP_CONNECTION_NONBLOCKING` | v2.1.89 | Skip MCP wait in `-p` mode |

---

## 26. Claude Managed Agents (Public Beta, April 8, 2026)

**What**: Fully managed agent harness + production infrastructure on Anthropic's cloud. Build and deploy agents at scale without managing runtime.

**Beta header**: `anthropic-beta: managed-agents-2026-04-01` (required on all requests).

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | Reusable versioned configuration: model, system prompt, tools, MCP servers |
| **Environment** | Cloud container template (packages, networking, mounted files) |
| **Session** | Running instance performing a task; maintains state and filesystem |
| **Events** | Bidirectional messages (user messages, tool results, status updates) via SSE |
| **Vault** | Credential storage for MCP server authentication |

### Managed Agents vs Agent SDK vs Claude Code

| Aspect | Managed Agents | Agent SDK | Claude Code |
|--------|---------------|-----------|-------------|
| **Deployment** | Anthropic cloud | Your infrastructure | Local CLI / IDE |
| **Scaling** | Automatic | Manual | Single-user |
| **Network** | Sandboxed containers | Full access | Full access |
| **Best for** | Production at scale | Custom integrations | Development & prototyping |
| **Pricing** | $0.08/session-hour + tokens | Your infra costs | Subscription |

### API Endpoints

**Agents**: `POST/GET /v1/agents`, `GET/PATCH /v1/agents/{id}`, `GET /v1/agents/{id}/versions`, `POST /v1/agents/{id}/archive`
**Environments**: `POST/GET /v1/environments`, `GET /v1/environments/{id}`
**Sessions**: `POST/GET /v1/sessions`, `GET/DELETE /v1/sessions/{id}`, `POST /v1/sessions/{id}/archive`
**Events**: `POST /v1/sessions/{id}/events` (send), `GET /v1/sessions/{id}/events/stream` (SSE), `GET /v1/sessions/{id}/events` (list)
**Resources**: `POST/GET /v1/sessions/{id}/resources`
**Vaults**: `POST /v1/vaults`, `GET /v1/vaults/{id}`

### Agent Creation Parameters

```json
{
  "name": "string (required)",
  "model": "claude-opus-4-6 | claude-sonnet-4-6 | claude-haiku-4-5 (required)",
  "system": "string (optional, system prompt)",
  "description": "string (optional)",
  "tools": [
    { "type": "agent_toolset_20260401" },
    { "type": "custom", "name": "...", "description": "...", "input_schema": {...} },
    { "type": "mcp_toolset", "mcp_server_name": "..." }
  ],
  "mcp_servers": [
    { "type": "url", "name": "...", "url": "https://..." }
  ],
  "skills": [],
  "callable_agents": [],
  "metadata": {}
}
```

### Pre-Built Tools (`agent_toolset_20260401`)

| Tool | Name | Capabilities |
|------|------|-------------|
| Bash | `bash` | Shell commands in container |
| Read | `read` | Read files |
| Write | `write` | Write files |
| Edit | `edit` | String replacement |
| Glob | `glob` | File pattern matching |
| Grep | `grep` | Regex text search |
| Web Fetch | `web_fetch` | Fetch URLs |
| Web Search | `web_search` | Search the web |

### Session Creation

```json
{
  "agent": "agent_id (required)",
  "environment_id": "env_id (required)",
  "title": "string (optional)",
  "vault_ids": ["vault_id1"],
  "metadata": {}
}
```

### Event Types

| Direction | Type | Description |
|-----------|------|-------------|
| Client → Agent | `user.message` | User text or attachments |
| Client → Agent | `tool.result` | Custom tool execution result |
| Agent → Client | `agent.message` | Agent text response |
| Agent → Client | `agent.tool_use` | Agent requests tool call |
| Agent → Client | `session.status_running` | Processing started |
| Agent → Client | `session.status_idle` | Awaiting input |
| Agent → Client | `session.error` | Error occurred |

### SDK Support

All SDKs via `client.beta.agents.create(...)`:
- Python: `pip install anthropic`
- TypeScript: `npm install @anthropic-ai/sdk`
- Go, Java, C#, Ruby, PHP also supported
- CLI: `ant beta:agents create ...`

### Pricing

- **$0.08 per session-hour** (measured to millisecond, only during `status_running`)
- **Standard Claude token rates** apply separately
- Rate limits: 60 create req/min, 600 read req/min (org-level)

### Quick Start

```python
from anthropic import Anthropic
client = Anthropic()

agent = client.beta.agents.create(
    name="Coding Assistant",
    model="claude-sonnet-4-6",
    system="You are a helpful coding assistant.",
    tools=[{"type": "agent_toolset_20260401"}],
)

environment = client.beta.environments.create(
    name="quickstart-env",
    config={"type": "cloud", "networking": {"type": "unrestricted"}},
)

session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
)

with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(session.id, events=[
        {"type": "user.message", "content": [
            {"type": "text", "text": "Write a Fibonacci generator"}
        ]}
    ])
    for event in stream:
        if event.type == "agent.message":
            for block in event.content:
                print(block.text, end="")
        elif event.type == "session.status_idle":
            break
```

### Early Adopters
Notion, Rakuten, Asana, Sentry, Vibecode.

---

## Sources

- [Official Changelog](https://code.claude.com/docs/en/changelog)
- [GitHub CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Hooks Guide](https://code.claude.com/docs/en/hooks)
- [Skills](https://code.claude.com/docs/en/skills)
- [Memory](https://code.claude.com/docs/en/memory)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Scheduled Tasks](https://code.claude.com/docs/en/scheduled-tasks)
- [Tools Reference](https://code.claude.com/docs/en/tools-reference)
- [Code Review](https://claude.com/blog/code-review)
- [Plugins](https://code.claude.com/docs/en/discover-plugins)
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
- [Claude 4.6](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6)
- [Managed Agents Overview](https://platform.claude.com/docs/en/managed-agents/overview)
- [Managed Agents Quickstart](https://platform.claude.com/docs/en/managed-agents/quickstart)
- [Managed Agents Agent Setup](https://platform.claude.com/docs/en/managed-agents/agent-setup)
- [Managed Agents Blog](https://claude.com/blog/claude-managed-agents)
- [Managed Agents Engineering](https://www.anthropic.com/engineering/managed-agents)
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)

---

## Phase A-4 Exploitation Notes — v2.1.108-112 [Applied — 2026-04-19]

> These notes identify which v2.1.108-112 features Phase A-4 directly exploits in plugin v1.4 + rule additions. Grounded on phase-a3 session evidence (`lead-system-v2.md §7`). `[Applied]` provenance.

### TaskCompleted blocking (v2.1.112) — exploited by `task-completed-inbox-clean.ts`

Before v2.1.112, `TaskCompleted` was Advisory: hooks could observe but could not reject task completion. Phase A-3 observed 7+ stale `task_assignment` inbox replays when completed tasks were re-run from task lists that hadn't been garbage-collected. The Advisory-only hook meant no mechanical gate on completion.

At v2.1.112, `TaskCompleted` became Blocking: a hook returning exit-2 (or `{"decision":"block"}`) holds the teammate at the current task until the hook passes. Phase A-4 exploits this to enforce two invariants before any TaskCompleted is accepted: (a) all `task_assignment` inbox entries for that task ID are removed; (b) the task's output contract file (if any) passes schema validation. This closes phase-a3 defect A3-1 and Lead-Protocol-v2 defect #9 at the mechanical level.

```json
// hooks.json — TaskCompleted Blocking gate (plugin v1.4)
{
  "TaskCompleted": [{
    "hooks": [{
      "type": "command",
      "command": "bun run ${CLAUDE_PLUGIN_ROOT}/hooks/task-completed-inbox-clean.ts",
      "timeout": 5,
      "statusMessage": "Cleaning task inbox + validating output contract…"
    }]
  }]
}
```

### TeammateIdle JSON shutdown (v2.1.112) — exploited by `idle-auto-shutdown.ts`

Before v2.1.112, auto-shutdown required Lead to send a `shutdown_request` via `SendMessage` and wait for the teammate's acknowledgment. This was asynchronous: the teammate would receive the shutdown request only on its next turn, meaning at minimum one additional idle turn was consumed. In phase-a3, with 170/238 (71.4%) of Lead-inbox messages being `idle_notification` pings, the async path added measurable overhead.

At v2.1.112, a `TeammateIdle` hook can return structured JSON `{continue: false, stopReason: "..."}` to terminate the teammate synchronously without a SendMessage round-trip. Phase A-4's `idle-auto-shutdown.ts` hook uses this to terminate teammates when `idleCount >= 3 && available_claimable_tasks == 0` — eliminating the extra idle turn the async path required.

```typescript
// idle-auto-shutdown.ts pattern (plugin v1.4 sketch)
const claimable = await getClaimableTasks(teamName);
if (idleCount >= 3 && claimable.length === 0) {
  process.stdout.write(JSON.stringify({
    continue: false,
    stopReason: `auto-shutdown: ${idleCount} consecutive idles, no claimable tasks`
  }));
  process.exit(0);
}
```

### Stop hook blocking (v2.1.106) — exploited by `stop-guard.ts`

`Stop` hooks became Blocking at v2.1.106 (a two-version window before the v2.1.108 snapshot). A `Stop` hook can now exit-2 or return `{"decision":"block"}` to prevent session end. Phase A-4 exploits this in `stop-guard.ts` which blocks session close unless: (a) all active task groups have emitted `phase_completed` events; (b) no project has uncommitted work (or user explicitly said "wrap up"); (c) `MEMORY.md` has a session summary entry. Phase-a3 ran 4h 43min without any enforcement at session close; `stop-guard.ts` closes that gap.

### /recap away summary (v2.1.108) — exploited in drift-check workflows

`/recap` generates a context summary when returning to a session. Combined with `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1`, it auto-fires when the user returns after a period of inactivity. In the ontology-first runtime, this eliminates the cold-start cost of re-reading 6+ ontology-state files at session resume — `/recap` includes the session's events.jsonl summary and last TaskCompleted outputs as context injection. Phase A-4's `session-duration-alarm` hook appends a pre-formatted `/recap` trigger to its 3h broadcast so users returning to a nearly-complete pipeline get state immediately.

### Plugin `monitors` manifest key (v2.1.105) — exploited by `impact-graph-refresh`

The `monitors` plugin manifest key auto-arms background `Monitor` streams at session start. Phase A-4's `impact-graph-refresh.ts` monitor uses this to do periodic (24h) full re-walks of each tracked project's source tree and update the SQLite impact-graph cache. Since `Monitor` streams are API-free (they call no LLM endpoints), running them continuously under Max 20x has zero per-token cost. The monitor emits structured stdout lines that feed back as `impact_graph_refreshed` events to `events.jsonl`.

```json
// plugin.json monitors key (plugin v1.4 addition)
{
  "monitors": [
    { "script": "${CLAUDE_PLUGIN_ROOT}/monitors/impact-graph-refresh.ts" },
    { "script": "${CLAUDE_PLUGIN_ROOT}/monitors/doc-rot-watch.ts" }
  ]
}
```

Cross-ref: `lead-system-v2.md §7.4`, `hook-events-v2.md §v2.1.108+ Recommended Use Cases`, `context-engineering.md §7`. [Applied]

---

## v2.1.110+ Delta (verified 2026-04-18)

> Phase A-2 W2-7 addendum. Extends the v2.1.102→v2.1.108 delta (above) to v2.1.110+. Grounded on `hook-events-v2.md` (27-event catalog), `plugin-system.md` (manifest v2.1.110+), and W2-0 SSoT `lead-system-v2.md`. Five gaps called out in `lead-system-v2.md §9` are resolved or marked "still unresolved" inline.

### v2.1.110+ Hook Catalog — 27 events [Official]

`hook-events-v2.md` is now the authoritative hook catalog (supersedes §3's 24-event table above). Net additions over the v2.1.108 snapshot:

- `CwdChanged` [Official] — emitted on cwd transitions (surfaced during worktree entry/exit).
- `FileChanged` [Official] — matcher supports **literal filenames** (e.g., `.envrc|.env`) rather than regex.

> Note: AgentStart, AgentStop, AgentError, AgentMessage, TeamCreated, TeamDeleted, TeammateJoin, TeammateLeave, TeammateError, ShutdownRequest, ShutdownResponse — previously listed here as "[Official]" — are NOT valid hook event names (cc-guide authoritative check 2026-04-19 + plugin v1.2 CHANGELOG). ShutdownRequest/ShutdownResponse are SendMessage protocol message types, not hookable events. Removed from catalog. [Applied]

Cross-ref: `lead-system-v2.md` §2 (Mode + Contract columns clarify which are Blocking vs Advisory — critical for gate design).

### Frontmatter spec additions since v2.1.108 [Official]

Canonical field list is in `lead-system-v2.md` §3. Deltas from the pre-W2-0 features.md reference:

- `effort` frontmatter promoted from experimental to documented: `low / medium / high / max` with env-var detection via `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL_SUPPORTS`.
- `disallowedTools` formalized as a deny-list **layered on top of** the `tools` allowlist. Verifier agents should still declare both (Lead Protocol v2 §3.2 convention).
- Forbidden: `initialPrompt` (Phase A defect #6). `agent-frontmatter-validate` (plugin v1.1 hook) rejects any `.md` file that still declares it.
- Silently-ignored in plugin-shipped agents: `permissionMode`, `hooks`, `mcpServers` (palantir-mini blueprint Correction 1). Validator treats them as "warn and continue" for user/project agents, but "fail and block" for plugin-shipped.

### Plugin manifest `mcpServers` block [Official]

Plugin `.claude-plugin/plugin.json` is now the canonical MCP registration path for cross-project tooling (over per-project `.mcp.json` fallback). Shape documented in `lead-system-v2.md` §4.1 and `plugin-system.md`. Key contract reminder:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "bun",
      "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.ts"],
      "env": { "MY_PLUGIN_ROOT": "${CLAUDE_PLUGIN_ROOT}" }
    }
  }
}
```

Per-session state belongs in project dirs (`<project>/.palantir-mini/session/`), never in `${CLAUDE_PLUGIN_ROOT}` (wiped on plugin update). `${CLAUDE_PLUGIN_DATA}` (v2.1.78+) is the persistent-state alternative.

### Gap resolutions (W2-0 §9 → W2-7 status)

> No `claude-code-guide` subagent was dispatched in W2-7 (agent type is not available in the current session allowlist). Resolutions below draw on the already-cached v2.1.110+ material (`hook-events-v2.md`, `plugin-system.md`, `mcp-server-registration.md`) plus the Phase A-2 applied evidence. Gaps that remain under-documented after that pass are marked **still unresolved**.

| # | Gap | Status | Resolution / Best-effort note |
|---|-----|--------|-------------------------------|
| 1 | Managed Agents v2.1.110+ deltas | **still unresolved** | Cache cuts off at the 2026-04-08 public beta. Outcomes / Multiagent / Memory research-preview features may have GA'd but we have no post-beta upstream capture. Close in a follow-up W3 delegation with live docs fetch. |
| 2 | `StopFailure` matcher granularity post-v2.1.78 | **resolved (partial)** | See subsection below — cache lists `rate_limit / auth_failed / billing_error / etc.`, and no v2.1.78→v2.1.108 changelog entry widens that list. The `etc.` is explicitly enumerative in the upstream docs — expansion happens via new matcher tokens in future versions. **Treat current set as stable.** |
| 3 | `if` expression grammar (v2.1.85+) | **resolved (partial)** | See subsection below. Grammar is permission-rule syntax; operators + negation + MCP-tool globbing documented here from cache. |
| 4 | Plugin `monitors` manifest payload shape (v2.1.105) | **still unresolved** | `features.md` Delta §v2.1.105 names the key and its purpose ("auto-arm background Monitor at session start") but payload shape (`"monitors": [{ "script": "..." }]`) is only notional. Need upstream schema fetch. **Flag for W3.** |
| 5 | `ShutdownRequest` exact payload schema | **resolved** | See subsection below — payload documented from `SendMessage` tool description and `lead-system-v2.md` §2.5. |

### Gap #2 — `StopFailure` matcher enumeration [Official]

From `hook-events-v2.md` §2.1 + §3 of this file, the v2.1.78+ matcher list is:

- `rate_limit` — upstream 429 / quota exhaustion.
- `auth_failed` — credential or token failure.
- `billing_error` — payment / quota-plan failure.
- `etc.` — upstream docs use this token as a forward-compat placeholder. Interpretation: **assume the list is additive-only; future versions introduce new tokens, none of the above are renamed.**

Contract: `StopFailure` is Advisory (not Blocking) — hooks consuming it cannot force a retry via exit-2. Use for logging + state re-injection only.

### Gap #3 — `if` expression grammar (v2.1.85+) [Official]

The `if` field on `PreToolUse` / `PostToolUse` accepts **permission-rule syntax** (same shape as `permissions.allow` / `permissions.deny` in settings.json). Documented operators and forms:

- **Literal tool name**: `"if": "Bash"` matches any `Bash` tool call.
- **Scoped pattern**: `"if": "Bash(bunx tsc *)"` matches only `Bash` invocations whose command begins with `bunx tsc`.
- **MCP-tool glob**: `"if": "mcp__palantir-mini__*"` matches all palantir-mini MCP tools.
- **Negation**: `"if": "!Write(**/*.generated.ts)"` — the leading `!` negates the match. Supported for `allow`, `deny`, and `if` alike.
- **Conjunction**: not expressible in a single `if`; Claude Code does not parse `&&` / `||` in this field. Author multiple hooks with disjoint `if` clauses instead.

**Performance note**: when `if` evaluates false, the hook process is NOT spawned. This is the cheap path for narrowly-scoped gates and should be used aggressively (rule 06 §Hook field v2 conventions codifies this).

### Gap #5 — `ShutdownRequest` / `ShutdownResponse` payload schema [Official]

From the SendMessage tool description (present in the SDK contract since v2.1.89+) and `lead-system-v2.md` §2.5, the protocol round-trip is:

```json
// Lead → teammate
{
  "to": "<teammate-name>",
  "message": {
    "type": "shutdown_request",
    "request_id": "<uuid>",
    "reason": "<optional string>"
  }
}

// Teammate → Lead (response)
{
  "to": "team-lead",
  "message": {
    "type": "shutdown_response",
    "request_id": "<echoes the uuid above>",
    "approve": true,
    "reason": "<optional string>"
  }
}
```

- `approve: true` on the response terminates the teammate process.
- `approve: false` keeps the teammate alive (used when the teammate has outstanding work it does not want to abandon).
- Do NOT originate `shutdown_request` from the teammate side unless Lead has explicitly invited it.

A parallel `plan_approval_request` / `plan_approval_response` protocol exists with the same `request_id` echo shape (used by Plan-mode approval UX).

### Applied: cross-repo adoption proves the v2.1.110+ surfaces are stable [Applied]

W2-2 shipped 6 new hooks at v2.1.110+ semantics; W2-3..W2-6 rolled them across 4 repos with no hook-event regressions observed. Total hook test count reached 70 after W2-2 (PR #56, 63 new cases) [Applied: events.jsonl seq 40]. Test counts post-adoption: kosmos 289/289, palantir-math 797/797, mathcrew 180 pass / 3 pre-existing unrelated failures [Applied: seq 41, 43, 44]. The v2.1.110+ hook catalog is production-proven in the ontology-first stack.
