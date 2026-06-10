---
ruleId: 27
slug: cross-runtime-substrate
scope: global
version: 1.0.0
invariant: "events.jsonl is a shared substrate; cross-runtime appends use atomic write+rename; byWhom.identity self-attributes the writing runtime."
supersededBy: null
supersedes: []
crossRefs: [10]
hookCitations: []
---

# Rule 27 — Cross-Runtime Substrate

## §Cross-runtime invariant

Both Claude (`byWhom.identity = "claude-code"`) and Codex (`"codex-cli"`) MAY append to the same per-project `events.jsonl`. Future runtimes (Gemini CLI, Cursor) follow the same contract. Each runtime MUST self-attribute via `byWhom.identity` — no runtime may write another's identity value.

## §Atomic append protocol

- Appends use `mkdir`-mutex lock (existing in `lib/event-log/`) OR fcntl-style file lock.
- Lock held only for write+rename sequence, max 100ms hold time.
- Contention test: `pm_plugin_self_check` runs a 2-writer race at startup (0-lost / 2000 test per lib contract).
- Cross-runtime contention test verifies Codex + Claude concurrent appends produce no lost rows.

## §Codex append discoverability

- Codex `config.toml` MUST register `bridge/mcp-server.ts` as its MCP server. `mcp__palantir-mini__emit_event` is the canonical write path for all runtimes.
- Direct file append to `events.jsonl` is forbidden — bypasses the 5-dim validation gate (rule 10) and `value-grade-assigner` hook (rule 26).

## §Failure modes

- Corruption (partial line at tail): emit `events_log_corruption_detected` event to a fresh file; recovery = replay from latest archive (`lib/event-log/read.ts:readEvents` auto-merges rotated archives), drop trailing partial line, re-append.
- Runtime identity collision (two runtimes claim same `byWhom.identity`): emit `runtime_identity_collision` advisory; `byWhom.agent` field disambiguates.

## §Version history

- v1.0.0 (2026-05-09, sprint-060 W1.11): initial. Closes M4/M23/J.4 (architecture review `~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md`).
