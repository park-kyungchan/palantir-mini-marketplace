---
name: pm-init
category: core-workflow
description: "Bootstrap palantir-mini for a project. Creates <project>/.palantir-mini/session/ directory structure, emits a session_started event, and optionally writes a stub..."
allowed-tools: mcp__palantir-mini__emit_event mcp__palantir-mini__get_ontology mcp__palantir-mini__replay_lineage
effort: medium
disable-model-invocation: false
---

# pm-init — Bootstrap palantir-mini for a project

## When to use

- The user wants to start using palantir-mini on a new project.
- The user says "initialize", "bootstrap", "setup", or invokes `/palantir-mini:init`.
- A project is detected with `.claude/` but no `.palantir-mini/session/` directory.

## What this does

1. Create `<project>/.palantir-mini/session/` tree:
   ```
   session/
   ├── events.jsonl      (initially empty)
   ├── snapshots/        (empty)
   ├── handoffs/         (empty)
   └── locks/            (empty)
   ```
2. Emit a `session_started` event as the first record.
3. Optionally write a project-local `managed-settings.d/50-palantir-mini.json`
   fragment (if the project already has a `managed-settings.d/` dir).
4. Print a confirmation of the events.jsonl path.

## How to run

```
mcp__palantir-mini__emit_event({
  project: "<absolute path>",
  envelope: {
    type: "session_started",
    eventId: "evt-init-<timestamp>",
    when: "<ISO8601>",
    atopWhich: "<git HEAD>",
    throughWhich: { sessionId: "init", toolName: "pm-init", cwd: "<path>" },
    byWhom: { identity: "<active-runtime-identity>" },
    payload: { model: "<runtime-default-model>", effort: "<runtime-effort>" }
  }
})
```

## Success criteria

- `.palantir-mini/session/events.jsonl` exists and contains a single
  `session_started` line.
- `foldToSnapshot(readEvents(path)).session_started === 1`.

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — append-only event log semantics.
- `~/.claude/rules/05-skill-invocation-order.md` — plugin-scope takes precedence over user-scope.
- `~/.claude/rules/08-schema-versioning.md` — consumer projects should pin `@palantirKC/claude-schemas` in peerDependencies so `pm-verify` can gate on compatibility.
