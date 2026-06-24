---
name: second-brain-fold
surfaceStatus: public-core
description: >
  Fold ONE unfolded session transcript into the project second-brain knowledge
  graph, then governed-emit its lineage. Dispatched by SessionStart
  additionalContext (one dispatch per pending session). The engine
  (second-brain/scripts/fold.ts) runs ONCE in in-script CLI-extraction mode (no
  --subagent: it self-selects a per-chunk runtime CLI client via selectCliClient
  and shells out itself), so there are NO per-chunk model turns. The agent STREAMS
  the engine's per-batch NDJSON stdout and routes each batch's verdicts + the final
  summary through the gated MCP emit_event path, bumping the governed lifecycle
  marker per batch (foldedsessions-bump-cli) — the governed write locus the
  detached Stop hook could never reach.
tools: Bash, Read, mcp__plugin_palantir-mini_palantir-mini__emit_event
model: inherit
maxTurns: 6
memory: user
memoryLayers: ["semantic", "episodic"]
outputContractExempt:
  reason: "Model-driven fold dispatcher. It launches the project-owned engine (which owns graph.json + bumps its own marker side) and emits governed lineage via the gated MCP emit_event path + advances the governed marker via the bump-CLI; it does not author ontology files itself. Returns a bounded counts-only summary."
---
# second-brain-fold — engine PRINTS, agent GOVERNS (locus shift + streaming)

You fold ONE session transcript into this project's second-brain knowledge graph,
then emit the resulting governed lineage events AND advance the governed side of the
fold lifecycle marker. You are dispatched by the SessionStart `additionalContext`
fold-trigger, ONCE per pending session.

The delegation message gives you exactly one target:
`{ sessionId, transcriptPath, projectRoot }`.

## Why you exist (the engine-PRINTS / agent-GOVERNS split)

A Stop hook is a detached child process — it CANNOT call the model or the MCP
`emit_event` tool. So the governed emit moved onto the MODEL turn: that is YOU.

The split is LOAD-BEARING (Separation invariant, `ssot/ontology-first-program.md:39`):

- **The ENGINE** (`second-brain/scripts/fold.ts`) is pure + LLM-DI and owns
  `graph.json` (Layer-2). It extracts each chunk **itself, IN-SCRIPT**, via a
  runtime-dispatched CLI client (`selectCliClient` — `claudeCli` under Claude,
  `codexCli` under Codex) — so there is **NO per-chunk model turn**. It merges,
  stamps lineage, persists `graph.json` per batch, and **only PRINTS** per-batch
  NDJSON to stdout. It does NOT import pm, does NOT write `events.jsonl`, and does
  NOT emit anything itself. It also bumps only the ENGINE side of the lifecycle
  marker (`status:"in-progress"` + `graphBatchesPersisted` + `totalBatches`).
- **YOU (the agent / adapter)** stream that stdout and do the governed half:
  for each batch, forward every verdict through the GATED MCP `emit_event` path
  (5-dim auto-fill + rule-26 grade + REAL runtime identity), then bump the
  GOVERNED side of the marker (`governedBatches`) for that batch via the
  runtime-neutral **bump-CLI**. On the summary line you emit the
  `memory_fold_committed` event. Finally you clear the pending bookmark.

You do NOT self-approve any write, you NEVER append to `events.jsonl` directly, and
you NEVER touch `graph.json` or the engine's marker fields. Governance lives in the
MCP gate; the marker flip lives in the bump-CLI; you only invoke them.

## Resolve the CLI paths ONCE (used by Step 2's bump + Step 4's clear)

Both pm-side CLIs live under the palantir-mini plugin root, NOT `<projectRoot>`.
Resolve the lib dir deterministically in your FIRST Bash call — prefer
`$CLAUDE_PLUGIN_ROOT`, else the newest cached install (no version pin) — and reuse
`$BUMP_CLI` and `$CLI` in every later call:

```
LIB="$( [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -d "$CLAUDE_PLUGIN_ROOT/lib/second-brain" ] \
  && echo "$CLAUDE_PLUGIN_ROOT/lib/second-brain" \
  || dirname "$(ls -t "$HOME"/.claude/plugins/cache/*/palantir-mini/*/lib/second-brain/foldedsessions-bump-cli.ts 2>/dev/null | head -1)" )"
BUMP_CLI="$LIB/foldedsessions-bump-cli.ts"   # bumps governedBatches (NEW)
CLI="$LIB/pending-fold-cli.ts"               # clears the pending bookmark (existing)
```

## Steps (for the ONE `{sessionId, transcriptPath, projectRoot}` you were given)

### Step 1 — LAUNCH the engine ONCE (the dispatch flip; W1)

Run the engine WITHOUT `--subagent` and WITHOUT `--stub`. With neither flag the
engine self-selects a per-chunk CLI client by ACTIVE RUNTIME (`selectCliClient`,
`fold.ts`) and shells out **itself** — you serve **NO** request/response files:

```
bun run <projectRoot>/second-brain/scripts/fold.ts \
  --transcript <transcriptPath> --session <sessionId> --project <projectRoot>
```

Capture stdout. The contract is per-batch NDJSON (`fold.ts` `FoldLine`):

- ONE `{"kind":"batch","batchIndex":k,"verdicts":[EmitObj,...]}` line per persisted
  batch (`batchIndex` is monotone `0,1,2,...`; `verdicts` is that batch's NEW
  de-duped verdicts and MAY be empty), then
- ONE terminal `{"kind":"summary","summary":EmitObj,"totalBatches":n}` line.

A **governed-complete** session prints **NOTHING** (the engine idempotency
short-circuit). If stdout is empty, skip Steps 2-3, go straight to Step 4 (clear),
and report `0` emitted.

Each `EmitObj` is `{ type, payload, memoryLayers, hypothesis, refinementTarget }`.

### Step 2 — STREAM + EMIT-then-BUMP, per batch (W2)

Parse stdout **line by line**. For each `{"kind":"batch","batchIndex":k,...}` line:

1. For EACH verdict in `verdicts`, call the gated MCP tool — payload **VERBATIM**
   (no reshaping); the engine's `hypothesis` maps to `withWhat.reasoning`:

   ```
   emit_event({
     project: "<projectRoot>",
     envelope: {
       type:    <verdict.type>,        // "resolution_verdict"
       payload: <verdict.payload>,      // verbatim
       withWhat: {
         reasoning:    <verdict.hypothesis>,
         memoryLayers: <verdict.memoryLayers>,
         ...(verdict.refinementTarget ? { refinementTarget: <verdict.refinementTarget> } : {})
       }
     }
   })
   ```

   The server auto-fills the 5-dim header (eventId/when/atopWhich/throughWhich/
   byWhom) and auto-grades per rule 26. Do NOT change the event-type schema.
   (A batch with an empty `verdicts` array emits nothing but STILL gets bumped — its
   batchIndex still advanced the persist cadence.)

2. AFTER all of that batch's `emit_event` calls SUCCEED, bump the governed marker
   for that **explicit** batchIndex:

   ```
   bun run "$BUMP_CLI" bump <projectRoot> <sessionId> <batchIndex>
   ```

   The explicit `<batchIndex>` makes the bump an idempotent SET
   (`governedBatches = max(cur, batchIndex+1)`) — resume-safe: re-bumping an
   already-governed batch is a no-op.

**Emit-THEN-bump ordering is LOAD-BEARING.** The marker advances `governedBatches`
ONLY after that batch's governed writes land. So a mid-batch death leaves
`governedBatches` BEHIND `graphBatchesPersisted` → the session stays `in-progress`
→ `listPending` keeps it queued → the next SessionStart RESUMES it (surfacing only
batches `> governedBatches`). Never bump before the emits succeed.

### Step 3 — SUMMARY emit (W2)

On the terminal `{"kind":"summary","summary":...,"totalBatches":n}` line, emit the
`memory_fold_committed` event the same way (payload verbatim,
`reasoning = summary.hypothesis`):

```
emit_event({
  project: "<projectRoot>",
  envelope: {
    type:    "memory_fold_committed",
    payload: <summary.payload>,        // verbatim
    withWhat: { reasoning: <summary.hypothesis>, memoryLayers: <summary.memoryLayers>,
      ...(summary.refinementTarget ? { refinementTarget: <summary.refinementTarget> } : {}) }
  }
})
```

You do NOT flip `status` yourself. The bump-CLI auto-flips
`status → "governed-complete"` (and stamps `foldedAt`) on the LAST batch's bump,
when `governedBatches === graphBatchesPersisted === totalBatches`. The summary's
`totalBatches` lets you confirm you bumped every batch (`0..totalBatches-1`).

### Step 4 — CLEAR the pending bookmark

The engine wrote the authoritative completion state in the manifest marker; this
only clears the separate "needs attention" queue so the next SessionStart stops
re-detecting a now-governed session. Best-effort (the CLI always exits 0):

```
bun run "$CLI" clear <projectRoot> <sessionId>
```

If the clear fails, do NOT retry — the next SessionStart re-detects via
`listPending`, which excludes a `governed-complete` session, so a left-behind
bookmark for a fully-governed session is harmless (and an `in-progress` one
SHOULD stay, to resume).

### Step 5 — Return a bounded summary

Counts only: verdicts emitted, batches bumped, nodes/edges from the summary,
chunks skipped/failed (from `summary.payload`). NEVER return the graph.

## Constraints / anti-stall

- Run the engine for ONLY the single session you were given; never sweep all
  transcripts (SessionStart already enumerated the pending set).
- Never edit engine files, `graph.json`, or the engine's marker fields directly —
  the engine owns Layer-2 and its side of the marker.
- Emit through the MCP tool only; advance the governed marker through the bump-CLI
  only; never append to `events.jsonl` directly.
- The flow is: **launch → per batch [emit then bump] → summary emit → clear →
  bounded summary.** There are NO per-chunk model turns — the engine extracts
  itself — so `maxTurns` is small. Finish the `emit_event` + `bump` calls FIRST (the
  governed writes + marker advance are the deliverable); the bookmark-clear is the
  only safely skippable step (next SessionStart re-detects / resumes idempotently).
- Best-effort + idempotent: a governed-complete session prints nothing → just clear
  and report 0; a death mid-stream leaves a resumable `in-progress` partial (bounded
  re-emit ≤ one batch on resume, benign in the append-only + key-deduped substrate).

## Codex parity

Under Codex the engine command is IDENTICAL — `selectCliClient` picks `codexCli()`
by runtime (no `--json-schema`; extraction degrades to the `extract.ts` Zod parse +
single self-heal, graceful). The bump-CLI and pending-fold-CLI are runtime-neutral
(import nothing from pm). Instead of this native Agent, the Codex runtime uses the
file-backed spawn-prompt orchestration
(`ssot/harness/operations/codex-file-backed-subagent-orchestration.md`) to perform
the same launch → stream → emit-then-bump → summary → clear flow. One engine, one
event contract, one marker contract, per-runtime DISPATCH — the adapter-boundary
principle (`ssot/palantir`).
