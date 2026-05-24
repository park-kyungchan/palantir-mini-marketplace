---
name: pm-convex-mirror-verify
category: substrate-query
description: "Audit local events.jsonl vs Convex Cloud decisionEvents table parity. Reads last N events from local + queries Cloud, computes diff, emits convex_mirror_parity_verified event..."
allowed-tools: Read Bash
effort: low
disable-model-invocation: false
---

# /palantir-mini:pm-convex-mirror-verify

**Usage**: `/palantir-mini:pm-convex-mirror-verify [--limit=N] [--since=<ISO>]`

Options:
- `--limit=N` (default 100): max events to check.
- `--since=<ISO>`: only verify events since this timestamp.
- `--dry-run`: don't emit the verified event, just print delta.

## Behavior

1. Read last N T2+ events from local `<projectRoot>/.palantir-mini/session/events.jsonl` (via `lib/event-log/read.ts` `readEvents`).
2. Query Convex Cloud `decisionEvents` table for the same event IDs.
3. Compute parity delta using `lib/convex-mirror/verify.ts` `computeParityDelta`:
   - `localOnly: number` — events in local but not Cloud (mirror lag/loss).
   - `cloudOnly: number` — events in Cloud but not local (cross-runtime emit, possibly).
   - `mismatched: number` — events with same eventId but different payload digest.
   - `matched: number` — perfect parity.
4. Emit `convex_mirror_parity_verified` envelope with `payload: {localOnly, cloudOnly, mismatched, matched, totalLocal, totalCloud, sampledMismatches}` + reasoning ≥40 chars citing canonical plan v2 §4 row 4.1d.

## Implementation reference

Use `lib/impact-graph/convex-client.ts` (PR 4.1c shipped Cloud-aware client) + `lib/event-log/read.ts` (existing `readEvents`). Pure delta logic lives in `lib/convex-mirror/verify.ts`.

## Error handling

When Cloud unreachable (ECONNREFUSED / ETIMEDOUT / 5xx / network): emit `convex_mirror_parity_skipped` advisory and return early (no false-failure).

When STUB MODE active (`PALANTIR_MINI_CONVEX_STUB=1`): emit `convex_mirror_parity_skipped` advisory and return early.

## Memory layers

- **episodic**: records parity delta history per sprint cutover to detect regression.
- **semantic**: informs model of current Cloud mirroring health for routing decisions.

Per canonical plan v2 §4 row 4.1d.
