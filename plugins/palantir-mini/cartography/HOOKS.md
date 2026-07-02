<!-- GENERATED FILE — do not edit. Regenerate: bun run gen:cartography (source: hooks/hooks.json) -->


# HOOKS — generated hook-event map

Mirrors `hooks/hooks.json`, grouped by lifecycle event in source (JSON key) order; entries within a group preserve the original array order (not re-sorted). See `CARTOGRAPHY.md` routing table ("Add/modify a hook") for the source-of-truth rule.

## SessionStart

- `hook-step:sessionstart-cold-start-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" session-start` — sync — timeout: 50ms

_1 entry, 0 blocking._

## UserPromptSubmit

- `hook-step:userprompt-front-door` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" prompt-front-door-capture` — sync — timeout: 100ms
- `hook-step:userprompt-front-door` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" context-capsule-init` — sync — timeout: 100ms

_2 entries, 0 blocking._

## PreToolUse

- `hook-step:pretool-ontology-engineering-workflow` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/ontology-engineering-workflow-enforcement-gate.ts"` — matcher: `*` — sync — failureMode: fail-closed — timeout: 40ms — permissionDecision: defer
- `hook-step:pretool-prompt-dtc-write-gate` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/prompt-dtc-enforcement-gate.ts"` — matcher: `*` — sync — failureMode: fail-closed — timeout: 40ms — permissionDecision: defer
- `hook-step:pretool-plugin-ownership` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/agent-ownership-validate.ts"` — matcher: `Edit|Write|MultiEdit` — sync — timeout: 15ms — permissionDecision: defer
- `hook-step:pretool-plugin-ownership` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/write-scope-runtime-enforce.ts"` — matcher: `Edit|Write|MultiEdit` — sync — timeout: 25ms — permissionDecision: defer
- `hook-step:pretool-edit-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" pre-edit-ontology` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — sync — timeout: 50ms
- `hook-step:pretool-edit-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" pre-edit-impact-check` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — async — timeout: 40ms
- `hook-step:pretool-edit-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" ontology-import-guard` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — sync — timeout: 25ms — permissionDecision: defer
- `hook-step:pretool-edit-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" pre-edit-impact-mcp-first` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — sync — failureMode: fail-closed — timeout: 25ms — permissionDecision: defer
- `hook-step:pretool-edit-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/ontology-domain-classification-validate.ts"` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — sync — timeout: 25ms — permissionDecision: defer
- `hook-step:pretool-edit-governance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/lead-ontology-discovery-completeness.ts"` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — async — timeout: 25ms
- `hook-step:pretool-schema-frontmatter` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" semantic-frontmatter-validate` — matcher: `**/schemas/ontology/(primitives|contracts|codegen)/**/*.ts` — sync — timeout: 25ms — decision: block
- `hook-step:pretool-emit-event-value` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" value-grade-assigner` — matcher: `mcp__plugin_palantir-mini_palantir-mini__emit_event|mcp__palantir_mini__emit_event|mcp__palantir_mini__.emit_event|mcp__palantir-mini__emit_event|mcp_palantir-mini_emit_event|mcp_palantir_mini_emit_event` — sync — timeout: 25ms — decision: block
- `hook-step:pretool-agent-dispatch` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/researcher-citation-precision.ts"` — matcher: `Agent` — async — timeout: 25ms

_13 entries, 9 blocking._

## PostToolUse

- `hook-step:posttool-edit-propagation` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" post-edit-propagate` — matcher: `Edit|Write|MultiEdit` — sync — timeout: 75ms
- `hook-step:posttool-edit-propagation` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" post-edit-verifier-suggest` — matcher: `Edit|Write|MultiEdit` — async — timeout: 25ms
- `hook-step:posttool-schema-frontmatter` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" semantic-frontmatter-validate` — matcher: `**/schemas/ontology/(primitives|contracts|codegen)/**/*.ts` — async — timeout: 25ms
- `hook-step:posttool-doc-drift` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" doc-edit-drift` — matcher: `**/MEMORY.md|**/BROWSE.md|**/INDEX.md|**/CLAUDE.md` — sync — timeout: 50ms
- `hook-step:posttool-generated-header` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" generated-header-check` — matcher: `**/src/generated/**` — sync — timeout: 25ms
- `hook-step:posttool-manifest-validation` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" manifest-validate` — matcher: `**/.codex-plugin/plugin.json|**/hooks.json` — sync — timeout: 25ms
- `hook-step:posttool-emit-event-value` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" emit-event-postdispatch` — matcher: `mcp__plugin_palantir-mini_palantir-mini__emit_event|mcp__palantir_mini__emit_event|mcp__palantir_mini__.emit_event|mcp__palantir-mini__emit_event|mcp_palantir-mini_emit_event|mcp_palantir_mini_emit_event` — async — timeout: 40ms
- `hook-step:posttool-edit-watch` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/impact-graph-maintain.ts"` — matcher: `Edit|Write|MultiEdit|NotebookEdit` — async — timeout: 25ms
- `hook-step:posttool-git-impact-maintenance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" post-merge-cleanup` — matcher: `Bash` — async — timeout: 40ms
- `hook-step:posttool-git-impact-maintenance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" pre-pr-dirty-gate` — matcher: `Bash` — sync — timeout: 40ms — permissionDecision: defer
- `hook-step:posttool-git-impact-maintenance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/impact-graph-cascade-delete.ts"` — matcher: `Bash` — async — timeout: 25ms
- `hook-step:posttool-git-impact-maintenance` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/impact-graph-bulk-refresh.ts"` — matcher: `Bash` — async — timeout: 40ms
- `hook-step:posttool-taskupdate-enrichment` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/task-completed-enrichment.ts"` — matcher: `TaskUpdate` — async — timeout: 25ms

_13 entries, 1 blocking._

## PreCompact

- `hook-step:precompact-lineage-integrity` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" pre-compact-state` — sync — timeout: 100ms — decision: block
- `hook-step:precompact-lineage-integrity` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" events-5d-gate` — sync — timeout: 75ms — decision: block
- `hook-step:precompact-lineage-integrity` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" rule-audit --mode=bottleneck` — async — timeout: 40ms
- `hook-step:precompact-lineage-integrity` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" orphan-pair-watchdog` — async — timeout: 25ms
- `hook-step:precompact-lineage-integrity` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/workflow-trace-leak-detect.ts"` — async — timeout: 25ms

_5 entries, 2 blocking._

## Stop

- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" session-end-cleanup` — async — timeout: 40ms
- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/impact-graph-session-end-flush.ts"` — async — timeout: 75ms
- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/t4-promotion-trigger.ts"` — async — timeout: 100ms
- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/bypass-budget-monitor.ts"` — async — timeout: 40ms
- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/ontology-drift-fold.ts"` — async — timeout: 40ms
- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/hooks/second-brain-fold.ts"` — async — timeout: 15ms
- `hook-step:stop-session-closeout` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" stop-validate` — sync — timeout: 75ms

_7 entries, 0 blocking._

## SubagentStart

- `hook-step:subagentstart-briefing` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" subagent-start` — async — timeout: 50ms

_1 entry, 0 blocking._

## SubagentStop

- `hook-step:subagentstop-heartbeat` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" subagent-stop` — sync — timeout: 50ms
- `hook-step:subagentstop-heartbeat` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" heartbeat-validate` — async — timeout: 25ms

_2 entries, 0 blocking._

## PostCompact

- `hook-step:postcompact-state-restore` — command: `bun run "${CLAUDE_PLUGIN_ROOT}/scripts/run.ts" post-compact` — sync — timeout: 100ms

_1 entry, 0 blocking._
