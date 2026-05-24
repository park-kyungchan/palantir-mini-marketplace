---
name: pm-debug-trace
category: substrate-query
description: "Reconstruct an event lineage by promptId / sessionId / commitSha / correlationId. Reads <project>/.palantir-mini/session/events.jsonl + archives + quarantine via..."
allowed-tools: Read Bash
effort: low
disable-model-invocation: false
---

# /palantir-mini:pm-debug-trace

**Usage**: `/palantir-mini:pm-debug-trace --<key>=<value>`

Keys (any one required):

- `--promptId=<id>` — all events with payload.promptId match
- `--sessionId=<id>` — all events emitted within a session
- `--commitSha=<sha>` — all events that reference this commit (via payload.commitSha or atopWhich)
- `--correlationId=<id>` — all events with payload.correlationId match (subagent decision trail)

Optional:

- `--limit=N` (default 100)
- `--includeArchive=all|live-only|archive-only` (default all)
- `--includeQuarantine` (default false)

## Behavior

1. Validate at least one key is provided. If none, emit an error and stop.
2. Read events via `readEvents` from `lib/event-log/read.ts` with `{includeArchive, includeQuarantine}` options.
3. Filter by the provided keys (OR across keys — an event matches if any supplied key matches its corresponding field).
4. Apply `--limit=N` (default 100) — take the first N chronologically.
5. Render in chronological order with:
   `[seq] <when> <byWhom.agent>/<byWhom.identity> <type> — <withWhat.reasoning?.slice(0, 80)>`
6. Print a summary line: `Total matched: <count> (limit: <limit>)`.
7. Emit `validation_phase_completed errorClass="debug_trace_rendered"` with reasoning ≥40 chars citing canonical plan v2 §4 row 4.8.

## Implementation

This is a markdown skill — Lead reads the file and follows the instructions when invoked. No new TS handler needed (filtering is pure JS over the read result).

When invoked, Lead should run a Bash one-liner or inline script using the pattern below.

### Acceptable reference implementation

```typescript
import { readEvents } from "<plugin>/lib/event-log/read.ts";
import * as path from "node:path";

const project = process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
const sessionDir = path.join(project, ".palantir-mini", "session");
const eventsPath = path.join(sessionDir, "events.jsonl");

const includeArchive = (process.env.PM_DEBUG_INCLUDE_ARCHIVE ?? "all") as
  | "all"
  | "live-only"
  | "archive-only";
const includeQuarantine = process.env.PM_DEBUG_INCLUDE_QUARANTINE === "true";
const limit = parseInt(process.env.PM_DEBUG_LIMIT ?? "100", 10);

// Keys to filter on (each may be undefined)
const filterPromptId      = process.env.PM_DEBUG_PROMPT_ID;
const filterSessionId     = process.env.PM_DEBUG_SESSION_ID;
const filterCommitSha     = process.env.PM_DEBUG_COMMIT_SHA;
const filterCorrelationId = process.env.PM_DEBUG_CORRELATION_ID;

const { events } = readEvents(eventsPath, { includeArchive, includeQuarantine });

const matched = events.filter((e) => {
  if (filterPromptId      && e.payload?.promptId      === filterPromptId)      return true;
  if (filterSessionId     && e.payload?.sessionId     === filterSessionId)     return true;
  if (filterCorrelationId && e.payload?.correlationId === filterCorrelationId) return true;
  if (filterCommitSha) {
    if (e.payload?.commitSha?.startsWith(filterCommitSha)) return true;
    if (e.atopWhich?.startsWith(filterCommitSha))          return true;
  }
  return false;
});

const limited = matched.slice(0, limit);

for (const e of limited) {
  const seq      = String(e.sequence ?? "?").padStart(6);
  const when     = e.when ?? "?";
  const agent    = e.byWhom?.agent    ?? "?";
  const identity = e.byWhom?.identity ?? "?";
  const type     = e.type ?? "?";
  const reason   = (e.withWhat as { reasoning?: string } | undefined)?.reasoning?.slice(0, 80) ?? "";
  console.log(`[${seq}] ${when} ${agent}/${identity} ${type} — ${reason}`);
}

console.log(`\nTotal matched: ${matched.length} (limit: ${limit})`);
```

### Bash one-liner (quick alternative)

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('<project>/.palantir-mini/session/events.jsonl','utf8').split('\n').filter(Boolean);
const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const key = '<key>', val = '<value>';
const fieldMap = { promptId: e => e.payload?.promptId, sessionId: e => e.payload?.sessionId, commitSha: e => e.payload?.commitSha || e.atopWhich, correlationId: e => e.payload?.correlationId };
const fn = fieldMap[key];
const matched = fn ? events.filter(e => (fn(e) ?? '').startsWith(val)) : events;
matched.slice(0, 100).forEach(e => console.log('[' + (e.sequence ?? '?') + '] ' + e.when + ' ' + (e.byWhom?.agent ?? '?') + '/' + (e.byWhom?.identity ?? '?') + ' ' + e.type + ' — ' + ((e.withWhat?.reasoning ?? '').slice(0, 80))));
console.log('Total matched: ' + matched.length);
"
```

## Out of scope

- This skill does NOT mutate. Read-only over events.jsonl + archives + quarantine.
- It does NOT query Convex Cloud (PR 4.1c+ wires Cloud client).

## Rule citations

- `rule 10 §5-dim` — every event in events.jsonl carries the full 5-dim envelope; this skill reads those envelopes.
- `rule 26 §Substrate routing` — T3+ events from this trace feed the BackPropagation circuit.

## Memory layer declaration

`episodic` (reconstructing what happened in a past session is fundamentally episodic recall) + `semantic` (event lineage maps to typed ontology primitives).

## Per canonical plan v2 §4 row 4.8.
