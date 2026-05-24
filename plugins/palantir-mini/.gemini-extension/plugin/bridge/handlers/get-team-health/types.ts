// palantir-mini v3.5.0 — get-team-health sibling: type definitions
// v3.5.0 N1-LARGE wave 3 decomposition (was bridge/handlers/get-team-health.ts 207 LOC).

export interface GetTeamHealthArgs {
  team?: string;
}

export interface TeammateHealth {
  name: string;
  idleCount: number;
  unreadInbox: number;
  inProgressCount: number;
}

export interface GetTeamHealthResult {
  teammates: TeammateHealth[];
  staleReplayCount: number;
  totalInboxSize: number;
  queriedAt: string;
}

export const STALE_TASK_ASSIGNMENT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
