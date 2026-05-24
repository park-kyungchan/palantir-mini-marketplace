---
name: pm-harness-stop
category: core-workflow
description: "Orderly abort of all active harness loops in the current project. Reads bound sprint contracts, writes user-aborted signals, emits sprint_aborted events, kills live generator..."
allowed-tools: Read Write Bash mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__auto_spawn_replacement mcp__plugin_palantir-mini_palantir-mini__pm_preamble
effort: high
disable-model-invocation: false
---

# /palantir-mini:pm-harness-stop — Orderly Abort All Active Harness Loops

Cleanly aborts every bound harness sprint in the current project.

Start by calling `mcp__plugin_palantir-mini_palantir-mini__pm_preamble` to load project context.

## Step 1 — Discover active sprints

```bash
find <project>/.palantir-mini/harness/sprints/ -name "contract.json" 2>/dev/null
```

If no contracts found: `"No active harness sprints found."` — exit.

For each `contract.json` found, read:
- `sprintId`
- `theme`
- `status` (only abort if status is `"active"` or `"in-progress"`)

## Step 2 — Write user-aborted signal per active sprint

For each active sprint, write the abort signal to `state.json`:

```bash
# Path: <project>/.palantir-mini/harness/sprints/<sprintId>/state.json
# Write or update with:
jq '. + {"status": "user-aborted", "abortedAt": "<ISO8601>", "abortedBy": "pm-harness-stop"}' \
  <project>/.palantir-mini/harness/sprints/<sprintId>/state.json > /tmp/state-tmp.json
mv /tmp/state-tmp.json <project>/.palantir-mini/harness/sprints/<sprintId>/state.json
```

If `state.json` does not exist, create it:
```json
{ "status": "user-aborted", "abortedAt": "<ISO8601>", "abortedBy": "pm-harness-stop" }
```

## Step 3 — Emit sprint_aborted event per sprint

For each aborted sprint:

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  project: "<project>",
  envelope: {
    type: "sprint_aborted",
    eventId: "evt-abort-<sprintId>-<timestamp>",
    when: "<ISO8601>",
    atopWhich: "<git HEAD>",
    throughWhich: { sessionId: "<sprintId>", toolName: "pm-harness-stop", cwd: "<project>" },
    byWhom: { identity: "claude-code", agentName: "Lead" },
    withWhat: { reasoning: "User-initiated orderly abort via pm-harness-stop." },
    payload: { sprintId: "<sprintId>", theme: "<theme>", previousStatus: "<status>" }
  }
})
```

## Step 4 — Kill live generator agents

```
mcp__plugin_palantir-mini_palantir-mini__auto_spawn_replacement({
  action: "kill",
  agentType: "harness-generator"
})
```

If MCP not available or returns error, note the failure but continue.

## Step 5 — Clean up bunx serve children (B-28 workaround)

```bash
# Find and kill any lingering bunx serve processes
ps aux | grep "bunx serve" | grep -v grep | awk '{print $2}' | xargs -r kill -TERM 2>/dev/null || true
echo "bunx serve cleanup attempted"
```

## Step 6 — Report

```
## pm-harness-stop — Abort Report

Sprints aborted:
  - <sprintId>: <theme> (was: <previousStatus>)
  - <sprintId>: <theme> (was: <previousStatus>)

Generator agent kill: sent
bunx serve cleanup: done

All harness loops have been signaled to stop. Run /palantir-mini:pm-harness-status to verify.
```

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — `sprint_aborted` events emitted before state writes.
- `~/.claude/rules/16-3-agent-harness.md` — harness loop abort is a legitimate termination path.
- B-28 context: `bunx serve` child cleanup required because harness generator may spawn a dev server.
