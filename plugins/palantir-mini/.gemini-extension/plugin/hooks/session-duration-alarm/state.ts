// palantir-mini v3.7.0 — hooks/session-duration-alarm/state.ts
// Alarm state I/O + start-time resolution + elapsed helpers.
// Extracted from session-duration-alarm.ts during A.1 decomposition.

import * as fs from "fs";
import { alarmDir, alarmStatePath, broadcastsPath } from "./paths";
import type { AlarmState } from "./types";

export function readAlarmState(sessionId: string): AlarmState | null {
  const p = alarmStatePath(sessionId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as AlarmState;
  } catch {
    return null;
  }
}

export function writeAlarmState(sessionId: string, state: AlarmState): void {
  const dir = alarmDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(alarmStatePath(sessionId), JSON.stringify(state, null, 2), "utf8");
}

export function appendBroadcast(sessionId: string, msg: unknown): void {
  const dir = alarmDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(broadcastsPath(sessionId), JSON.stringify(msg) + "\n", "utf8");
}

/** Read the first event's 'when' field from events.jsonl. */
export function readFirstEventTimestamp(eventsFile: string): string | null {
  if (!fs.existsSync(eventsFile)) return null;
  try {
    const first = fs.readFileSync(eventsFile, "utf8").split("\n").find((l) => l.trim().length > 0);
    if (!first) return null;
    const parsed = JSON.parse(first) as { when?: string };
    return parsed.when ?? null;
  } catch {
    return null;
  }
}

export function resolveStartTime(sessionId: string, eventsFile: string): Date | null {
  // Prefer first event timestamp (most accurate session start)
  const evtTs = readFirstEventTimestamp(eventsFile);
  if (evtTs) return new Date(evtTs);

  // Fall back to alarm state written at SessionStart
  const state = readAlarmState(sessionId);
  if (state) return new Date(state.sessionStartedAt);

  return null;
}

export function elapsedSeconds(startTime: Date): number {
  return Math.floor((Date.now() - startTime.getTime()) / 1000);
}
