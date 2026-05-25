# Native Runtime Gaps — Claude, Codex, and Gemini Hook/Event Parity

> Per canonical plan v2 §4 row 6.3 (sprint-130 PR 6.3; PHASE 6 PR 3/7).
> Last audited: 2026-05-25.
> Runtime-boundary migration note: runtime gap evidence should move to runtime-owned docs under `~/.codex/**` and `~/.claude/**`. This file remains compatibility documentation in the canonical source root at `plugins/palantir-mini` until that migration debt is closed.

This document catalogs palantir-mini hook/event parity between Claude Code CLI,
Codex CLI, and Gemini CLI. It is a runtime map, not a plugin source authority.
The source of truth for Claude/Codex hook intent is
`plugins/palantir-mini/hooks/hooks.json`; Gemini mounts that intent
through `.gemini-extension/hooks/hooks.json` and
`lib/gemini/native-hook-adapter.ts`.

## Context

Per rule 27 (cross-runtime substrate), Claude and Codex may append to the same
`events.jsonl`, but they do not expose identical native lifecycle events. Codex
integrates through:

```
~/.codex/hooks.json
  -> ~/.codex/hooks/palantir-mini-claude-hook-adapter.ts  (generated shim)
    -> ~/.codex/lib/palantir-mini/native-hook-adapter.ts  (Codex-native protocol owner)
      -> plugins/palantir-mini/hooks/hooks.json
```

The generated shim is not a source fork. It delegates to the Codex-native
protocol adapter, which reads the canonical hook intent from `hooks/hooks.json`.
Any remaining plugin-side Codex adapter path, including
`palantir-mini/lib/codex/claude-hook-adapter.ts`, is compatibility debt and must
not be used as evidence that Claude-only lifecycle events are native in Codex.
The runtime capability matrix likewise separates `PreCompact` and `PostCompact`
as schema-only events; live-read hook config is not enough to claim native Codex
parity for those lifecycle events.

As of v6.79.0, `hooks/hooks.json` reports 105 hook commands. The removed
`image-teacher-qa` UserPromptSubmit workflow is no longer a runtime surface; the
Methodological SSoT remains a documentation/ontology-engineering authority, not
an image-teacher-qa hook.

Current Codex hook config wires these events through the adapter:

| Codex-configured event | Status |
|------------------------|--------|
| `SessionStart` | adapter-wired |
| `PreToolUse` | adapter-wired, enforcement parity depends on the Codex hook payload |
| `PermissionRequest` | adapter-wired |
| `PostToolUse` | adapter-wired, parity depends on the Codex hook payload |
| `UserPromptSubmit` | adapter-wired; prompt-front-door still requires explicit MCP gate verification |
| `Stop` | adapter-wired |
| `PreCompact` | schema-only unless a runtime smoke test proves native firing |
| `PostCompact` | schema-only unless a runtime smoke test proves native firing |

Gemini CLI integration is packaged under `.gemini-extension/` because Gemini
hook registration uses different event names and millisecond timeouts. The
Gemini adapter maps:

| Gemini event | palantir-mini policy event |
|--------------|----------------------------|
| `SessionStart` | `SessionStart` |
| `BeforeAgent` | `UserPromptSubmit` |
| `BeforeTool` | `PreToolUse` |
| `AfterTool` | `PostToolUse` |
| `AfterAgent` | `Stop` |
| `PreCompress` | `PreCompact` |
| `SessionEnd` | `Stop` |

Canonical source `hooks/hooks.json` currently contains 12 event groups:
`PreToolUse`, `PostToolUse`, `PreCompact`, `TaskCompleted`, `Stop`,
`SessionStart`, `TaskCreated`, `TeammateIdle`, `SubagentStart`, `SubagentStop`,
`PostCompact`, and `UserPromptSubmit`.

## Parity Table

| Surface | Claude event | Codex bridge status | Notes |
|---------|--------------|---------------------|-------|
| Session start | `SessionStart` | partial | Adapter invokes source hook commands. Blocking semantics must be verified per hook because Codex hook payloads differ from Claude's. |
| Session stop / SessionStop | `Stop` | partial | Adapter invokes source hook commands. Exit-time cleanup should still be verified with an explicit smoke test. |
| Pre-tool checks | `PreToolUse` | partial | Adapter-wired, but not every Claude matcher maps cleanly to Codex tool names or payloads. Critical MCP/edit gates should be verified through explicit MCP preflight when risk is high. |
| Permission request | Codex-specific bridge event | partial | Codex exposes this separately; the adapter can use it as a Codex-side enforcement point, but it is not a Claude-native event group. |
| Post-tool checks | `PostToolUse` | partial | Adapter-wired. Treat value grading, generated-file checks, and doc drift hooks as needing smoke evidence before claiming parity. |
| User prompt submit | `UserPromptSubmit` | partial | Adapter-wired, but Codex cannot assume prompt-to-DTC approval. Call `pm_semantic_intent_gate` explicitly before ontology-affecting routing. |
| Pre-compact | `PreCompact` | schema-only | Present in `~/.codex/hooks.json`; current Codex runtime parity should be treated as unproven unless smoke-tested in the native Codex lifecycle. |
| Post-compact | `PostCompact` | schema-only | Same as `PreCompact`; keep schema-only until native firing is smoke-proven. |
| Task created | `TaskCreated` | native gap | Codex has no observed native TaskCreated lifecycle equivalent. |
| Task completed | `TaskCompleted` | native gap | Codex has no observed native TaskCompleted lifecycle equivalent. |
| Teammate idle | `TeammateIdle` | native gap | Claude Agent Teams concept; no Codex-native teammate idle surface. |
| Subagent start | `SubagentStart` | native gap | Codex subagents must be handled through Codex-native `spawn_agent`/`/agent` flow and explicit briefing discipline. |
| Subagent stop | `SubagentStop` | native gap | No Codex-native SubagentStop hook parity; post-agent processing must be manual or MCP-driven. |
| Agent/TaskUpdate matchers | `PreToolUse`/`PostToolUse` matchers | native gap unless represented in Codex payload | Do not assume Claude Agent or TaskUpdate matchers fire in Codex. |

## Summary Counts

| Bridge status | Count |
|---------------|-------|
| partial adapter bridge | 6 (`SessionStart`, `Stop`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `UserPromptSubmit`) |
| schema-only / unproven | 2 (`PreCompact`, `PostCompact`) |
| native gap | 5 (`TaskCreated`, `TaskCompleted`, `TeammateIdle`, `SubagentStart`, `SubagentStop`) |

## Required Codex Workarounds

For ontology-affecting work in Codex:

1. Call `pm_semantic_intent_gate` explicitly with prompt identity before routing.
2. Do not treat a drafted SemanticIntentContract or DigitalTwinChangeContract as approved.
3. If Codex cannot present the required approval UI, record that runtime gap and keep the edit scope narrow.
4. Use `ontology_context_query`, `pre_edit_impact`, `validate_managed_settings_fragments`, and `pm_plugin_self_check` for explicit verification instead of relying on Claude-only hook side effects.
5. For subagent work, use Codex-native delegation only when authorized, and apply palantir-mini briefing/routing discipline manually.
6. For mutation-capable palantir-mini agents, treat `SubagentStart` and `SubagentStop` hook parity as a native gap in Codex: manually require the PR-G output contract fields (`statePath`, `requiredFields`, `envelopeKind`, `mutationSummary`, `filesTouched`, `verification`, `eventRefs`, `handoffStatus`) in the worker briefing and inspect the reported state/handoff as a manual fallback when native `SubagentStop` does not fire.

## Required Gemini Workarounds

For ontology-affecting work in Gemini:

1. Install or link `plugins/palantir-mini/.gemini-extension` rather
   than using the plugin root directly; the root hook registry is Claude/Codex
   shaped and has incompatible timeout units for Gemini.
2. Treat `BeforeAgent` prompt capture as the Gemini prompt-front-door surface.
   If the hook payload lacks `prompt`, record the runtime gap and call
   `pm_semantic_intent_gate` manually before routing.
3. Treat `BeforeTool`/`AfterTool` as adapter-native projections of
   `PreToolUse`/`PostToolUse`; do not claim native parity for Claude
   `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, or
   `TeammateIdle`.
4. Use extension policies for coarse tool safety, but keep semantic approval in
   palantir-mini SIC/DTC/work-contract state.

## References

- `plugins/palantir-mini/hooks/hooks.json` — hook intent registry SSoT.
- `~/.codex/lib/palantir-mini/native-hook-adapter.ts` — Codex-native protocol adapter owner.
- `plugins/palantir-mini/.gemini-extension/` — Gemini-native extension package.
- `plugins/palantir-mini/lib/gemini/native-hook-adapter.ts` — Gemini event adapter owner.
- `docs/CODEX_HOOK_ADAPTER.md` — compatibility shim and sync workflow.
- `docs/RELOAD_PER_RUNTIME.md` — reload requirements and Codex sync wrapper.
- `SSOT-AUTHORITY.md` — plugin source authority.
- `~/.claude/rules/CONTEXT.md §13.5` — cross-runtime coexistence map.
- Rule 27 (cross-runtime substrate): `~/.claude/rules/27-cross-runtime-substrate.md`.
