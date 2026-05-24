// palantir-mini v3.7.0 — hooks/idle-auto-shutdown/pair-tracker.ts
// B-17 pair-tracker: agent_start ↔ subagent_stop pairing + orphan recovery.
// Extracted from idle-auto-shutdown.ts during A.1 decomposition.

import * as fs from "fs";
import { emit } from "../../scripts/log";
import { idleStateDir, pairTrackerPath } from "./paths";
import { ORPHAN_TIMEOUT_MS, type PairTrackerState } from "./types";

export function readPairTracker(sessionId: string): PairTrackerState {
  const p = pairTrackerPath(sessionId);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as PairTrackerState;
  } catch {
    return {};
  }
}

export function writePairTracker(sessionId: string, state: PairTrackerState): void {
  const dir = idleStateDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(pairTrackerPath(sessionId), JSON.stringify(state, null, 2), "utf8");
}

/** Record an agent_start event in the pair tracker. */
export function recordAgentStart(sessionId: string, agentId: string, startTs: string): void {
  const state = readPairTracker(sessionId);
  state[agentId] = { startTs, resolved: false };
  writePairTracker(sessionId, state);
}

/** Mark a subagent_stop as received (resolves the pair). */
export function recordSubagentStop(sessionId: string, agentId: string): void {
  const state = readPairTracker(sessionId);
  if (state[agentId]) {
    state[agentId].resolved = true;
    writePairTracker(sessionId, state);
  }
}

/**
 * Scan the pair tracker for unresolved entries older than ORPHAN_TIMEOUT_MS.
 * Emits synthetic subagent_stop events for each orphan and marks them resolved.
 * `now` is injectable for testing.
 */
export async function scanOrphans(
  sessionId: string,
  cwd: string,
  now: number = Date.now(),
): Promise<string[]> {
  const state = readPairTracker(sessionId);
  const recovered: string[] = [];

  for (const [agentId, entry] of Object.entries(state)) {
    if (entry.resolved) continue;
    const startMs = Date.parse(entry.startTs);
    if (!Number.isFinite(startMs)) continue;
    const elapsed = now - startMs;
    if (elapsed < ORPHAN_TIMEOUT_MS) continue;

    // Orphan detected — emit synthetic subagent_stop
    // Payload is constrained to SubagentStopEnvelope shape; extra context in reasoning.
    try {
      await emit({
        type:      "subagent_stop",
        payload: {
          agentId,
          reason:    "timeout_recovery",
        },
        toolName:  "TeammateIdle",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: `B-17 orphan recovery: agent=${agentId} started ${entry.startTs}, elapsed ${elapsed}ms > ${ORPHAN_TIMEOUT_MS}ms threshold`,
      });
    } catch { /* best-effort */ }

    const trackerEntry = state[agentId];
    if (trackerEntry) trackerEntry.resolved = true;
    recovered.push(agentId);
  }

  if (recovered.length > 0) {
    writePairTracker(sessionId, state);
  }

  return recovered;
}
