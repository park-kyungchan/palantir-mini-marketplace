// palantir-mini v1 — PostCompact hook handler
// Fires on: PostCompact (after Claude context compaction completes)
//
// Wires event-log-tail monitor: on PostCompact, run invariant check on events.jsonl
// to ensure no events were lost during compaction. Emits a post_compact_verified event.

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";

interface HookPayload {
  session_id?: string;
  cwd?:        string;
}

export default async function postCompact(payload: unknown): Promise<{ message: string; additionalContext?: string }> {
  const p = (payload ?? {}) as HookPayload;
  const root = p.cwd ?? projectRoot();
  const cwd = root;
  const epath = eventsPathFor(root);

  let totalEvents = 0;
  let lastSequence = 0;
  let invariantOk = true;
  let invariantNote = "";

  if (fs.existsSync(epath)) {
    try {
      const events = readEvents(epath);
      totalEvents  = events.length;
      lastSequence = events.at(-1)?.sequence ?? 0;

      // Check monotonicity post-compaction
      let prev = 0;
      for (const ev of events) {
        if (ev.sequence <= prev) {
          invariantOk  = false;
          invariantNote = `non-monotonic: ${prev} -> ${ev.sequence}`;
          break;
        }
        prev = ev.sequence;
      }
    } catch (e) {
      invariantOk  = false;
      invariantNote = `read error: ${(e as Error).message}`;
    }
  }

  try {
    await emit({
      type: "post_compact_verified",
      payload: {
        totalEvents,
        lastSequence,
        invariantOk,
        invariantNote: invariantNote || undefined,
      },
      toolName:  "PostCompact",
      cwd,
      sessionId: p.session_id,
      identity:  "claude-code",
      reasoning: invariantOk ? "events.jsonl intact post-compaction" : `invariant violation: ${invariantNote}`,
    });
  } catch {
    // best-effort
  }

  const context = `PostCompact check: totalEvents=${totalEvents}, lastSequence=${lastSequence}, invariantOk=${invariantOk}${invariantNote ? `, note=${invariantNote}` : ""}`;

  return {
    message: `palantir-mini: post_compact_verified (ok=${invariantOk})`,
    additionalContext: context,
  };
}
