# DATAFLOW — write paths, event lifecycle, fold sequence, impact graph

## Write paths: MCP emit_event vs Path B

Two ways an event lands in `events.jsonl`, chosen by which MCP tools are visible:

- **MCP `emit_event`** (`bridge/handlers/emit-event.ts`) — used when the active
  `PALANTIR_MINI_MCP_PROFILE` exposes it (`studio-core`, `dev-full`,
  `internal-telemetry`; see `lib/capability-registry/mcp-tool-capability.ts`
  `INTERNAL_TELEMETRY_MCP_TOOL_NAMES`). The model calls the tool directly.
- **Path B in-process emit** — used under the `altitude-2` profile
  (`.mcp.json` sets `PALANTIR_MINI_MCP_PROFILE=altitude-2`), which hides
  `emit_event`, `commit_edits`, `apply_edit_function`, `events_log_rotate`
  (only `ALTITUDE_2_READ_MCP_TOOL_NAMES` + `STUDIO_CORE_MCP_TOOL_NAMES` = 11 of
  23 tools stay visible). Callers instead import `emit()` from `scripts/log.ts`
  directly: `lib/second-brain/foldedsessions-emit-cli.ts` and
  `lib/lead-intent/lead-decision-emit-cli.ts` both do
  `import { emit } from "../../scripts/log"`. `agents/second-brain-fold.md`
  states the reason explicitly: it uses the in-process CLI "the MCP emit_event
  tool being hidden under the live altitude-2 profile."

Both paths converge on the same writer: `scripts/log.ts`'s `emit()` builds the
5-dim envelope (WHEN/ATOP_WHICH/THROUGH_WHICH/BY_WHOM/WITH_WHAT, with
`withWhat.reasoning` as the first-class WHY) and calls `appendEventAtomic` from
`lib/event-log/append.ts`.

## events.jsonl lifecycle

1. **Append** — `lib/event-log/append.ts`: atomic append via `fs.mkdirSync`
   mutex (recursive:false is atomic on POSIX incl. NFS; `LOCK_SUFFIX = ".lock"`).
   Target file: `<project>/.palantir-mini/session/events.jsonl`.
2. **Read / fold** — `lib/event-log/read.ts` reads live + archive log, quarantines
   malformed rows (`lib/event-log/quarantine.ts`); `foldToSnapshot` delegates to
   `lib/event-log/read/fold-snapshot.ts`.
3. **Replay** — `lib/event-log/replay.ts`: deterministic filter over the
   append-only log by the 5-dim envelope; backing store for `replay_lineage`.
4. **Snapshot** — `lib/event-log/snapshot.ts`: a snapshot is a fold up to a
   sequence cut-point. Explicitly documented as "CACHE, not truth" — events.jsonl
   is truth.
5. **Rotation** — the `events_log_rotate` MCP tool
   (`bridge/handlers/events-log-rotate.ts`) calls `rotateEventLog` in
   `lib/event-log/rotate.ts`, sharing the same append-lock.
6. **Grade promotion** — `lib/event-log/grade-promotion.ts` assigns T0-T4 value
   grades; `lib/event-log/promoted-index.ts` defaults readers to `T3+`. The
   `hooks/t4-promotion-trigger.ts` Stop hook (`hook-step:stop-session-closeout`
   in `hooks/hooks.json`) fires a session-end promotion digest.
7. **Convex T3+/T4 mirror** — `convex/decisionEvents.ts` mirrors only T3+/T4
   envelopes into the `decisionEvents` table (`convex/schema.ts`), keyed on an
   18-field join shape (7 original sprint-062 fields + 11 sprint-101 BackProp
   fields: eventId, promptId, promptHash, sessionId, runtime,
   semanticIntentContractRef, digitalTwinChangeContractRef, sprintContractRef,
   correlationId, agentId, toolName, commitSha, branchName, pullRequestNumber,
   evalSuiteId, evalRunId, affectedRid, refinementTarget).

## SecondBrain fold sequence

1. **Stop hook bookmark** — `hooks/second-brain-fold.ts` fires on `Stop`
   (deterministic, fs-only, NO LLM, never blocks). It resolves the project root,
   gates on `.palantir-mini/` and `<root>/second-brain/scripts/fold.ts` existing,
   then calls `markPending()` (`lib/second-brain/pending-fold.ts`), writing
   `<project>/second-brain/pending-fold.json` (a queue, NOT authoritative).
2. **SessionStart dispatch** — `hooks/session-start.ts` reads pending entries via
   `listPending`/`readPendingFold` and instructs the model to dispatch the
   `palantir-mini:second-brain-fold` subagent (Agent tool) once per pending
   session.
3. **Model-driven fold** — `agents/second-brain-fold.md` runs the project-owned
   fold engine, which extracts transcript chunks and persists
   `<project>/second-brain/graph.json` per batch; the engine also owns
   `second-brain/manifest.json`'s `foldedSessions` completion map (the
   authoritative completion record — `pending-fold.json` is only a safety-net
   queue). The subagent never edits `graph.json` or the manifest marker fields
   directly; it emits governed lineage via Path B
   (`lib/second-brain/foldedsessions-emit-cli.ts`) and advances the marker via
   a bump CLI (`lib/second-brain/foldedsessions-bump-cli.ts`).

## Impact graph

Maintained by four hooks, all importing `getConvexClient()` from
`lib/impact-graph/convex-client.ts`:
`hooks/impact-graph-maintain.ts` (continuous, 50ms Convex-lookup ceiling),
`hooks/impact-graph-cascade-delete.ts`, `hooks/impact-graph-bulk-refresh.ts`,
`hooks/impact-graph-session-end-flush.ts` (async, Stop hook). Convex tables:
`impactEdges`, `fileState`, `graphMutations` (`convex/schema.ts`).
**Caveat**: as of sprint W3f-1, `convex-client.ts` is STUB-ONLY — the real
`ConvexHttpClient` is removed and `getConvexClient()` always returns a
`StubConvexClient` (queries return empty, mutations no-op to stderr); callers
degrade gracefully via `.isStub`.

## End-to-end diagram

```
 model/tool call
      |
      v
 emit_event (visible profiles)  OR  Path B scripts/log.ts emit() (altitude-2)
      |                                   ^
      v                                   | (foldedsessions-emit-cli /
 scripts/log.ts emit()  -------------------  lead-decision-emit-cli)
      |
      v
 lib/event-log/append.ts (mkdir mutex) --> .palantir-mini/session/events.jsonl
      |                       |                        |
      v                       v                        v
 read.ts/replay.ts      rotate.ts (events_log_rotate)  grade-promotion.ts (T0-T4)
                                                          |
                                                          v
                                          t4-promotion-trigger.ts (Stop hook)
                                                          |
                                                          v
                                     convex/decisionEvents.ts (T3+/T4 mirror, STUB)

 Stop: second-brain-fold.ts (bookmark) -> pending-fold.json -> SessionStart dispatch
    -> agents/second-brain-fold.md -> second-brain/graph.json + manifest.json

 impact-graph-{maintain,cascade-delete,bulk-refresh,session-end-flush}.ts
    -> lib/impact-graph/convex-client.ts (STUB) -> impactEdges/fileState/graphMutations
```
