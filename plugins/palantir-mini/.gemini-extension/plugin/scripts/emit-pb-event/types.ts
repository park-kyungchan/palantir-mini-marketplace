// palantir-mini v3.7.0 — scripts/emit-pb-event/types.ts
// Types for palantir-browse pb_* event bridging.
// Extracted from emit-pb-event.ts during A.3 decomposition.

// ─── Known pb_* event names (palantir-browse v0.1 scaffold + planned v0.2) ──
export type PbEventName =
  | "pb_status_checked"
  | "pb_browser_opened"
  | "pb_browser_closed"
  | "pb_navigate"
  | "pb_snapshot"
  | "pb_click"
  | "pb_fill"
  | "pb_cookies_imported"
  | "pb_agent_paired"
  | "pb_session_started"
  | "pb_session_ended";

// ─── Payload shape for pb_* events ───────────────────────────────────────────
export interface PbEventPayload {
  /** Target URL (navigate, snapshot, click, fill) */
  url?: string;
  /** palantir-browse version string */
  version?: string;
  /** Operation mode: "scaffold" | "cdp" | "playwright" */
  mode?: string;
  /** Whether palantir-mini is co-installed (detected at emit time) */
  pmCoInstalled?: boolean;
  /** Number of cookies imported */
  cookieCount?: number;
  /** Agent name for pb_agent_paired */
  agentName?: string;
  /** Duration of the operation in ms */
  durationMs?: number;
  /** Human-readable status or result text */
  status?: string;
  /** Arbitrary extension fields */
  [key: string]: unknown;
}

export interface EmitPbEventArgs {
  pbEventName: PbEventName;
  project: string;
  payload?: PbEventPayload;
  sessionId?: string;
  reasoning?: string;
}

export interface EmitPbEventResult {
  sequence: number;
  pbEventName: PbEventName;
  project: string;
}

export type MappedType =
  | "edit_proposed"
  | "session_started"
  | "session_ended"
  | "phase_completed";
