// palantir-mini v3.7.0 — scripts/emit-pb-event/mappers.ts
// pb_* → EventEnvelope type + payload mapping.
// Extracted from emit-pb-event.ts during A.3 decomposition.

import type { PbEventName, PbEventPayload, MappedType } from "./types";

export function resolvePbEventType(pbEventName: PbEventName): MappedType {
  switch (pbEventName) {
    case "pb_navigate":
    case "pb_snapshot":
    case "pb_click":
    case "pb_fill":
      return "edit_proposed";
    case "pb_browser_opened":
    case "pb_session_started":
      return "session_started";
    case "pb_browser_closed":
    case "pb_session_ended":
      return "session_ended";
    case "pb_status_checked":
    case "pb_cookies_imported":
    case "pb_agent_paired":
    default:
      return "phase_completed";
  }
}

export function buildPbPayload(
  type: MappedType,
  pbEventName: PbEventName,
  payload: PbEventPayload,
): { type: MappedType; payload: unknown } {
  switch (type) {
    case "edit_proposed":
      return {
        type,
        payload: {
          functionName: pbEventName,
          params: payload,
          hypotheticalEdits: [],
        },
      };
    case "session_started":
      return {
        type,
        payload: {
          model: "palantir-browse",
          effort: payload.mode ?? "cdp",
        },
      };
    case "session_ended":
      return {
        type,
        payload: {
          reason: "other" as const,
          eventCount: 0,
        },
      };
    case "phase_completed":
    default:
      return {
        type: "phase_completed",
        payload: {
          phaseTag: pbEventName,
          taskId: pbEventName,
          validations: payload.status ? [payload.status] : [],
        },
      };
  }
}
