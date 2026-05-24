// palantir-mini v1.4 — heartbeat-validate hook
// Fires on: SubagentStop (advisory) — checks activity since SubagentStart.
//
// Phase A-4: detects stuck/confused teammates before Lead force-shutdown.
// If a teammate hasn't committed a file edit or TaskUpdate within N minutes
// (default 10, configurable via PALANTIR_MINI_HEARTBEAT_TIMEOUT_MIN),
// injects a mandatory plain-text status prompt via their inbox.
//
// Activity tracking: reads the subagent's recent events from events.jsonl.
// A "heartbeat event" is any event with byWhom.agentName matching the agent
// AND type in {edit_committed, task_created, phase_completed, agent_stop}.
//
// This hook is advisory only (async: true equivalent). It never blocks the
// SubagentStop event itself — the teammate is already stopping/stopped.
//
// See plan §Layer 3 hook #3.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  agent_id?:    string;
  agent_name?:  string;
  exit_code?:   number;
  session_id?:  string;
  cwd?:         string;
}

interface EventRecord {
  type?:        string;
  when?:        string;
  byWhom?:      { agentName?: string };
}

export const DEFAULT_HEARTBEAT_TIMEOUT_MIN = 10;

export const HEARTBEAT_EVENT_TYPES = new Set([
  "edit_committed",
  "task_created",
  "phase_completed",
  "agent_stop",
  "validation_phase_completed",
]);

function resolveHeartbeatTimeout(): number {
  const override = parseInt(process.env.PALANTIR_MINI_HEARTBEAT_TIMEOUT_MIN ?? "", 10);
  return (!isNaN(override) && override > 0) ? override : DEFAULT_HEARTBEAT_TIMEOUT_MIN;
}

function readEventsForAgent(eventsFile: string, agentName: string): EventRecord[] {
  if (!fs.existsSync(eventsFile)) return [];
  try {
    return fs
      .readFileSync(eventsFile, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        try { return JSON.parse(l) as EventRecord; } catch { return null; }
      })
      .filter((e): e is EventRecord => e !== null && e.byWhom?.agentName === agentName);
  } catch {
    return [];
  }
}

export function findLastHeartbeatTime(events: EventRecord[]): Date | null {
  const relevant = events
    .filter((e) => e.type && HEARTBEAT_EVENT_TYPES.has(e.type) && e.when)
    .map((e) => new Date(e.when!).getTime())
    .filter((t) => !isNaN(t));

  if (relevant.length === 0) return null;
  return new Date(Math.max(...relevant));
}

export function isStuck(lastHeartbeat: Date | null, timeoutMin: number): boolean {
  if (!lastHeartbeat) return true; // never emitted = stuck
  const elapsed = (Date.now() - lastHeartbeat.getTime()) / 60000;
  return elapsed >= timeoutMin;
}

export default async function heartbeatValidate(payload: unknown): Promise<{
  message:            string;
  additionalContext?: string;
}> {
  const p          = (payload ?? {}) as HookPayload;
  const cwd        = p.cwd ?? process.cwd();
  const agentName  = p.agent_name ?? p.agent_id ?? "unknown";
  const sessionId  = p.session_id;
  const timeoutMin = resolveHeartbeatTimeout();

  const eventsFile = path.join(
    process.env.PALANTIR_MINI_PROJECT ?? cwd,
    ".palantir-mini", "session", "events.jsonl",
  );

  const agentEvents     = readEventsForAgent(eventsFile, agentName);
  const lastHeartbeat   = findLastHeartbeatTime(agentEvents);
  const stuck           = isStuck(lastHeartbeat, timeoutMin);

  try {
    await emit({
      type:      "subagent_stop",
      payload:   {
        agentId:  agentName,
        exitCode: p.exit_code,
        reason:   stuck ? `no-heartbeat-${timeoutMin}min` : "normal-stop",
      },
      toolName:  "SubagentStop",
      cwd,
      sessionId,
      identity:  "monitor",
      reasoning: `heartbeat-validate: lastHeartbeat=${lastHeartbeat?.toISOString() ?? "never"}, stuck=${stuck}, timeout=${timeoutMin}min`,
    });
  } catch {
    // best-effort
  }

  if (stuck) {
    const prompt = `MANDATORY STATUS CHECK: You have been inactive for ${timeoutMin}+ minutes. Reply with plain-text status: what are you currently working on? If you are blocked, state the blocker. If you are done, call TaskUpdate(completed) and self-shutdown.`;

    return {
      message:           `palantir-mini: heartbeat-validate STUCK (agent=${agentName}, lastActivity=${lastHeartbeat?.toISOString() ?? "never"})`,
      additionalContext: prompt,
    };
  }

  const elapsedMin = lastHeartbeat
    ? Math.floor((Date.now() - lastHeartbeat.getTime()) / 60000)
    : null;

  return {
    message: `palantir-mini: heartbeat-validate OK (agent=${agentName}, lastActivity=${elapsedMin ?? "unknown"}min ago)`,
  };
}
