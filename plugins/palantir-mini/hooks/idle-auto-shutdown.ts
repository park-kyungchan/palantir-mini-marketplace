// palantir-mini v3.7.0 — hooks/idle-auto-shutdown.ts (orchestrator)
// TeammateIdle blocking hook: persistent idle state + CC v2.1.112 JSON shutdown + B-17 orphan recovery.
// Decomposed in v3.7.0 A.1: state/paths/pair-tracker helpers extracted to ./idle-auto-shutdown/*.
//
// Phase A-4: tracks per-teammate idleCount in /tmp/claude-hooks/<sessionId>/idle-state.json.
// When idleCount >= 3 AND no available unblocked claimable tasks exist,
// returns {continue: false, stopReason: "..."} to trigger JSON shutdown.
//
// B-17: pair-tracker memo keyed by agentId records agent_start timestamps.
// On each hook tick, entries older than ORPHAN_TIMEOUT_MS without a matching
// subagent_stop emit a synthetic subagent_stop with reason="timeout_recovery".
//
// See rule 12 §Lazy-spawn + shutdown, rule 12 §Team default + Lazy-spawn.

import { emit } from "../scripts/log";
import { resolveSessionId } from "./idle-auto-shutdown/paths";
import {
  readIdleState,
  writeIdleState,
} from "./idle-auto-shutdown/idle-state";
import { scanOrphans } from "./idle-auto-shutdown/pair-tracker";
import { IDLE_SHUTDOWN_THRESHOLD, type HookPayload, type HookResult } from "./idle-auto-shutdown/types";

// Backward-compat re-exports for tests + external callers
export {
  IDLE_SHUTDOWN_THRESHOLD,
  ORPHAN_TIMEOUT_MS,
} from "./idle-auto-shutdown/types";
export type {
  HookPayload,
  IdleState,
  PairTrackerEntry,
  PairTrackerState,
  HookResult,
} from "./idle-auto-shutdown/types";
export {
  readIdleState,
  writeIdleState,
  resetAgentIdleState,
} from "./idle-auto-shutdown/idle-state";
export {
  readPairTracker,
  writePairTracker,
  recordAgentStart,
  recordSubagentStop,
  scanOrphans,
} from "./idle-auto-shutdown/pair-tracker";

export default async function idleAutoShutdown(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd       = p.cwd ?? process.cwd();
  const agentId   = p.agent_id ?? "unknown";
  const sessionId = resolveSessionId(p);

  // B-17: scan for orphaned agent_start entries (no matching subagent_stop within 30min)
  await scanOrphans(sessionId, cwd);

  // Use payload idle_count if provided; otherwise accumulate from persistent state
  const payloadIdleCount  = p.idle_count ?? 0;
  const blockedByDepth    = p.blocked_by_depth ?? 0;
  const availableTasks    = p.available_tasks ?? -1; // -1 = unknown

  // Read + update persistent state
  const state = readIdleState(sessionId);
  const prior = state[agentId] ?? { idleCount: 0, lastUpdatedAt: "" };

  // Accumulate: take the larger of payload count and persisted count + 1
  const accumulated = Math.max(payloadIdleCount, prior.idleCount + 1);
  state[agentId] = {
    idleCount:     accumulated,
    lastUpdatedAt: new Date().toISOString(),
  };
  writeIdleState(sessionId, state);

  // Shutdown condition: 3+ consecutive idles AND no available claimable work
  const noAvailableWork = availableTasks === 0 || (availableTasks === -1 && blockedByDepth > 1);
  const shouldShutdown  = accumulated >= IDLE_SHUTDOWN_THRESHOLD && noAvailableWork;

  try {
    await emit({
      type:      "teammate_idle",
      payload:   { agentId, idleCount: accumulated },
      toolName:  "TeammateIdle",
      cwd,
      sessionId,
      identity:  "monitor",
      reasoning: `idle-auto-shutdown: accumulated=${accumulated}, blockedByDepth=${blockedByDepth}, availableTasks=${availableTasks}, shouldShutdown=${shouldShutdown}`,
    });
  } catch { /* best-effort */ }

  if (shouldShutdown) {
    const stopReason = `auto-shutdown: ${accumulated} consecutive idles with no available work (agent=${agentId})`;

    try {
      await emit({
        type:      "shutdown_request",
        payload: {
          agentId,
          reason:        "auto-idle-shutdown-stateful",
          idleCount:     accumulated,
          blockedByDepth,
        },
        toolName:  "TeammateIdle",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: stopReason,
      });
    } catch { /* best-effort */ }

    return {
      message:    `palantir-mini: idle-auto-shutdown triggered (agent=${agentId}, idle=${accumulated})`,
      continue:   false,
      stopReason,
    };
  }

  return {
    message:  `palantir-mini: idle-auto-shutdown pass (agent=${agentId}, idle=${accumulated}, depth=${blockedByDepth})`,
    decision: "continue",
  };
}
