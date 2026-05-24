// palantir-mini v3.7.0 — hooks/idle-auto-shutdown/types.ts
// Types + constants extracted from idle-auto-shutdown.ts during A.1 decomposition.

export interface HookPayload {
  agent_id?:          string;
  idle_count?:        number;
  blocked_by_depth?:  number;
  available_tasks?:   number;
  session_id?:        string;
  cwd?:               string;
}

export interface IdleState {
  [agentId: string]: {
    idleCount:       number;
    lastUpdatedAt:   string;
  };
}

/** B-17: pair-tracker entry for agent_start / subagent_stop pairing. */
export interface PairTrackerEntry {
  startTs:   string;   // ISO8601 of agent_start
  resolved:  boolean;  // true once matching subagent_stop received
}

export interface PairTrackerState {
  [agentId: string]: PairTrackerEntry;
}

export interface HookResult {
  message:      string;
  decision?:    "block" | "continue";
  reason?:      string;
  continue?:    boolean;
  stopReason?:  string;
}

export const IDLE_SHUTDOWN_THRESHOLD = 3;
/** 30 minutes — orphan entries older than this get a synthetic subagent_stop (B-17). */
export const ORPHAN_TIMEOUT_MS = 30 * 60 * 1000;
