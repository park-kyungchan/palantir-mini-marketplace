// palantir-mini v3.7.0 — hooks/idle-auto-shutdown/idle-state.ts
// Persistent idle-state JSON read/write (per-session).
// Extracted from idle-auto-shutdown.ts during A.1 decomposition.

import * as fs from "fs";
import { idleStateDir, idleStatePath } from "./paths";
import type { IdleState } from "./types";

export function readIdleState(sessionId: string): IdleState {
  const p = idleStatePath(sessionId);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as IdleState;
  } catch {
    return {};
  }
}

export function writeIdleState(sessionId: string, state: IdleState): void {
  const dir = idleStateDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(idleStatePath(sessionId), JSON.stringify(state, null, 2), "utf8");
}

export function resetAgentIdleState(sessionId: string, agentId: string): void {
  const state = readIdleState(sessionId);
  delete state[agentId];
  writeIdleState(sessionId, state);
}
