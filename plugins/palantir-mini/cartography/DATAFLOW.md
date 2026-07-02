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

## SecondBrain fold sequence (W3 — single manifest authority)

`<project>/second-brain/manifest.json`'s `foldedSessions` map is the SOLE
persisted fold-state store — there is no separate `pending-fold.json` queue file
anymore. Every session's state lives at `foldedSessions[sessionId]` under one of
three explicit `status` literals: `"pending"` (bookmarked, not yet picked up),
`"in-progress"` (engine has persisted ≥1 batch), `"governed-complete"` (governed
emit fully landed). A ONE-TIME forward migration
(`migrateLegacyPendingFile()` in `lib/second-brain/pending-fold.ts`) folds any
surviving legacy `pending-fold.json` file into the manifest as `status:"pending"`
(never clobbering an existing further-along record) then renames it to
`pending-fold.json.migrated`; it is idempotent and is called from both the Stop
hook and the pending-list read path.

1. **Stop hook bookmark** — `hooks/second-brain-fold.ts` fires on `Stop`
   (deterministic, fs-only, NO LLM, never blocks). It resolves the project root,
   runs the legacy-file migration, gates on `.palantir-mini/` and
   `<root>/second-brain/scripts/fold.ts` existing, then calls `markPending()`
   (`lib/second-brain/pending-fold.ts`), which writes a `status:"pending"` entry
   directly into `manifest.json.foldedSessions[sessionId]` under the same
   two-writer manifest lock the bump-CLI uses (`foldedsessions-bump-cli.ts`'s
   `withManifestLock`). `markPending()` never regresses an existing
   `"in-progress"`/`"governed-complete"`/legacy no-status record back to
   `"pending"`.
2. **SessionStart dispatch** — `hooks/session-start.ts` reads pending entries via
   `listPending()` (which filters `manifest.json.foldedSessions` for
   `status === "pending"`, running the legacy migration first) and instructs the
   model to dispatch the `palantir-mini:second-brain-fold` subagent (Agent tool)
   once per pending session.
3. **Model-driven fold** — `agents/second-brain-fold.md` runs the project-owned
   fold engine, which extracts transcript chunks and persists
   `<project>/second-brain/graph.json` per batch, printing per-batch NDJSON
   (`{"kind":"batch",...}`) and a terminal `{"kind":"summary",...}` line — a
   governed contract now typed at
   `runtime-overlay/schemas-snapshot/ontology/primitives/second-brain-graph.ts`
   and validated at runtime by `lib/second-brain/graph-contract.ts` (actionable
   field/expected/found/batchIndex errors). The subagent never edits
   `graph.json` directly; for each batch it calls
   `foldedsessions-emit-cli.ts batch` (validates the WHOLE batch BEFORE emitting
   any verdict — all-or-nothing per batch; a rejected batch emits nothing and is
   never bumped) then `foldedsessions-bump-cli.ts bump` (advancing
   `governedBatches`). The bump on the LAST batch performs the
   `"in-progress"` → `"governed-complete"` transition as ONE atomic manifest
   read-modify-write under the lock, stamping `foldedAt` + the audit `byWhom`
   identity together (workstream C). The terminal summary is emitted via
   `foldedsessions-emit-cli.ts summary`, which additively enriches a
   `memory_fold_committed` payload with `fromStatus`/`toStatus`/`totalBatches`/
   `foldedAt`/`byWhom` (see `MemoryFoldCommittedEnvelope` in
   `lib/event-log/types.ts` — additive fields only, no existing field
   removed/renamed).
4. **Retention (compaction, not deletion)** — `lib/second-brain/retention.ts`'s
   pure `planRetention()` flags `governed-complete` markers older than a policy
   window and/or beyond a max-live-entries cap; `foldedsessions-retention-cli.ts`
   executes the plan under the same manifest lock by APPENDING pruned markers to
   `<project>/second-brain/manifest-archive.jsonl` (append-only, one JSON object
   per line) BEFORE removing them from the live manifest — never a silent
   delete. `graph.json` CONTENT pruning stays engine-side and out-of-repo: the
   plugin's contract expectation is that the engine independently manages
   `graph.json`'s own lifecycle (e.g. compacting/archiving stale nodes), and
   that manifest-marker compaction here never implies or triggers any
   `graph.json` mutation.

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

 Stop: second-brain-fold.ts (bookmark, migrates legacy pending-fold.json first)
    -> manifest.json.foldedSessions[sid].status="pending" -> SessionStart dispatch
    -> agents/second-brain-fold.md -> second-brain/graph.json
    + manifest.json.foldedSessions[sid] (pending -> in-progress -> governed-complete,
      atomic flip + byWhom/foldedAt audit stamp)
    -> foldedsessions-retention-cli.ts compact -> manifest-archive.jsonl (append-only)

 impact-graph-{maintain,cascade-delete,bulk-refresh,session-end-flush}.ts
    -> lib/impact-graph/convex-client.ts (STUB) -> impactEdges/fileState/graphMutations
```
