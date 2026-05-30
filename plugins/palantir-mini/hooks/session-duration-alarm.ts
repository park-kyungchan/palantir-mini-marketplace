// palantir-mini v3.7.0 — hooks/session-duration-alarm.ts (orchestrator)
// SessionStart + UserPromptSubmit hook: 3h warn + 4h Agent-spawn block.
// Decomposed in v3.7.0 A.1: paths/state/policy helpers extracted to ./session-duration-alarm/*.
//
// Behavior:
// - At SessionStart: writes {sessionStartedAt: ISO} to /tmp/palantir-mini-hooks/<sessionId>/session-alarm.json.
// - At each UserPromptSubmit: reads events.jsonl 'when' of first event as session anchor;
//   falls back to session-alarm.json startedAt.
// - 3h elapsed → broadcast to /tmp/palantir-mini-hooks/<sessionId>/lead-broadcasts.jsonl + warning context.
// - 4h elapsed → exit-2 on any Agent-related tool call (blocks new spawns).
//   Respects CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC override.
//
// See rule 12 §Session lifecycle.

import * as path from "path";
import { emit } from "../scripts/log";
import { resolveSessionId } from "./session-duration-alarm/paths";
import {
  readAlarmState,
  writeAlarmState,
  appendBroadcast,
  resolveStartTime,
  elapsedSeconds,
} from "./session-duration-alarm/state";
import { getLimitSeconds, isAgentRelatedTool } from "./session-duration-alarm/policy";
import type { AlarmState, HookPayload, HookResult } from "./session-duration-alarm/types";

// Backward-compat re-exports for tests + external callers
export { DEFAULT_WARN_SEC, DEFAULT_BLOCK_SEC } from "./session-duration-alarm/types";
export type { HookPayload, AlarmState, HookResult } from "./session-duration-alarm/types";
export {
  readAlarmState,
  writeAlarmState,
  appendBroadcast,
  readFirstEventTimestamp,
  resolveStartTime,
  elapsedSeconds,
} from "./session-duration-alarm/state";
export { getLimitSeconds, isAgentRelatedTool } from "./session-duration-alarm/policy";

export default async function sessionDurationAlarm(payload: unknown): Promise<HookResult> {
  const p         = (payload ?? {}) as HookPayload;
  const cwd       = p.cwd ?? process.cwd();
  const sessionId = resolveSessionId(p);
  const event     = p.event ?? "unknown";
  const toolName  = p.tool_name;

  // SessionStart path: record the start time
  if (event === "SessionStart") {
    const state: AlarmState = {
      sessionStartedAt: new Date().toISOString(),
      broadcastSent3h:  false,
    };
    writeAlarmState(sessionId, state);

    try {
      await emit({
        type:      "session_started",
        payload:   { model: "unknown", effort: "session-duration-alarm" },
        toolName:  "SessionStart",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: "session-duration-alarm: recording session start time",
      });
    } catch { /* best-effort */ }

    return { message: `palantir-mini: session-duration-alarm initialized (sessionId=${sessionId})` };
  }

  // Check path: called on UserPromptSubmit or any other event
  // Respect PALANTIR_MINI_EVENTS_FILE override (used in tests)
  const eventsFile = process.env.PALANTIR_MINI_EVENTS_FILE
    ?? path.join(
        process.env.PALANTIR_MINI_PROJECT ?? cwd,
        ".palantir-mini", "session", "events.jsonl",
      );
  const startTime  = resolveStartTime(sessionId, eventsFile);

  if (!startTime) {
    return { message: "palantir-mini: session-duration-alarm — no start time found, skipped" };
  }

  const elapsed               = elapsedSeconds(startTime);
  const { warnSec, blockSec } = getLimitSeconds();

  // 4h hard block: new Agent spawns blocked
  if (elapsed >= blockSec && isAgentRelatedTool(toolName)) {
    const reason = `palantir-mini session-duration-alarm: session exceeded ${Math.floor(blockSec / 3600)}h limit (${Math.floor(elapsed / 60)}min elapsed). New agent spawns blocked. Wrap up with /ship.`;
    process.stderr.write(`[palantir-mini/session-duration-alarm] ${reason}\n`);

    try {
      await emit({
        type:      "validation_phase_completed",
        payload:   { phase: "runtime", passed: false, errorClass: "session_duration_block" },
        toolName:  toolName ?? "UserPromptSubmit",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: reason,
      });
    } catch { /* best-effort */ }

    return {
      message:  `palantir-mini: session-duration-alarm BLOCK (${Math.floor(elapsed / 60)}min >= ${Math.floor(blockSec / 60)}min)`,
      decision: "block",
      reason,
    };
  }

  // 3h warning: broadcast to lead
  if (elapsed >= warnSec) {
    const state = readAlarmState(sessionId) ?? { sessionStartedAt: startTime.toISOString(), broadcastSent3h: false };

    if (!state.broadcastSent3h) {
      const broadcast = {
        type:      "session_duration_warning",
        elapsed_min: Math.floor(elapsed / 60),
        threshold_min: Math.floor(warnSec / 60),
        message:   `Session exceeded ${Math.floor(warnSec / 3600)}h. Terminate active teammates when current task completes. Do NOT spawn new teammates. Prepare /ship.`,
        sentAt:    new Date().toISOString(),
      };

      appendBroadcast(sessionId, broadcast);
      state.broadcastSent3h = true;
      writeAlarmState(sessionId, state);

      try {
        await emit({
          type:      "validation_phase_completed",
          payload:   { phase: "runtime", passed: true, errorClass: "session_duration_warn" },
          toolName:  toolName ?? "UserPromptSubmit",
          cwd,
          sessionId,
          identity:  "monitor",
          reasoning: `3h threshold crossed: ${Math.floor(elapsed / 60)}min elapsed`,
        });
      } catch { /* best-effort */ }

      return {
        message:           `palantir-mini: session-duration-alarm 3h WARNING (${Math.floor(elapsed / 60)}min elapsed)`,
        decision:          "continue",
        additionalContext: broadcast.message,
      };
    }
  }

  return {
    message:  `palantir-mini: session-duration-alarm OK (${Math.floor(elapsed / 60)}min elapsed)`,
    decision: "continue",
  };
}
