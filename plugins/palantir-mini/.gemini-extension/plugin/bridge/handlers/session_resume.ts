// palantir-mini v1.6 — MCP tool handler: session_resume
// Domain: LEARN (SessionResume — Managed Agents local mirror)
//
// Reads the project's events.jsonl, identifies the last session_started event,
// and reconstructs resumable state: last session RID, last sequence, active
// teammates, pending tasks.
//
// Emits a session_resumed event when emit_resume_event=true (caller controls
// whether the resume is recorded to the log or merely queried).
//
// Mirrors Anthropic Managed Agents Session lifecycle (Session.resume) in the
// API-free local-runtime substrate. See managed-agents-api-free-closeout.md.

import * as path from "path";
import * as fs from "fs";
import { readEvents } from "../../lib/event-log/read";
import { appendEventAtomic } from "../../lib/event-log/append";
import { resolveHostRuntimeIdentity } from "../../lib/runtime/identity";
import type { EventEnvelope, EventId, SessionId, CommitSha } from "../../lib/event-log/types";

export interface SessionResumeArgs {
  project: string;
  /** If true, emit a session_resumed event after computing state */
  emit_resume_event?: boolean;
}

export interface SessionResumeResult {
  last_session_rid: string | null;
  last_sequence: number;
  active_teammates: string[];
  pending_tasks: unknown[];
  emit_resume_event: boolean;
}

function uniqueEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function gitHeadSha(project: string): string {
  const gitHead = path.join(project, ".git", "HEAD");
  if (!fs.existsSync(gitHead)) return "no-git";
  try {
    const head = fs.readFileSync(gitHead, "utf8").trim();
    if (head.startsWith("ref: ")) {
      const refPath = path.join(project, ".git", head.slice(5));
      if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf8").trim();
      return head.slice(5);
    }
    return head;
  } catch {
    return "no-git";
  }
}

// ─── state reconstruction ────────────────────────────────────────────────────

function computeResumableState(
  events: EventEnvelope[]
): Omit<SessionResumeResult, "emit_resume_event"> {
  if (events.length === 0) {
    return {
      last_session_rid: null,
      last_sequence: 0,
      active_teammates: [],
      pending_tasks: [],
    };
  }

  const lastSequence = events.reduce(
    (max, ev) => Math.max(max, ev.sequence),
    0
  );

  // Find most recent session_started event
  let last_session_rid: string | null = null;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev === undefined) continue;
    if (ev.type === "session_started") {
      // Use the eventId as the session RID (stable identity)
      last_session_rid = ev.eventId as string;
      break;
    }
  }

  // Derive active teammates: agents started but not stopped
  const startedAgents = new Set<string>();
  const stoppedAgents = new Set<string>();

  for (const ev of events) {
    if (ev.type === "agent_start") {
      const name = ev.payload.agentName ?? ev.payload.agentId;
      startedAgents.add(name);
    } else if (ev.type === "agent_stop") {
      const name = ev.payload.agentName ?? ev.payload.agentId;
      stoppedAgents.add(name);
    } else if (ev.type === "subagent_stop") {
      stoppedAgents.add(ev.payload.agentId);
    } else if (ev.type === "shutdown_request") {
      stoppedAgents.add(ev.payload.agentId);
    }
  }

  const active_teammates = Array.from(startedAgents).filter(
    (name) => !stoppedAgents.has(name)
  );

  // Derive pending tasks: tasks created but no corresponding phase_completed
  const createdTaskIds = new Set<string>();
  const completedTaskIds = new Set<string>();

  for (const ev of events) {
    if (ev.type === "task_created") {
      createdTaskIds.add(ev.payload.taskId);
    } else if (ev.type === "phase_completed") {
      completedTaskIds.add(ev.payload.taskId);
    }
  }

  const pendingTaskIds = Array.from(createdTaskIds).filter(
    (id) => !completedTaskIds.has(id)
  );

  // Build pending task summaries from task_created payloads
  const pending_tasks: unknown[] = [];
  for (const ev of events) {
    if (ev.type === "task_created" && pendingTaskIds.includes(ev.payload.taskId)) {
      pending_tasks.push({
        taskId: ev.payload.taskId,
        subject: ev.payload.subject,
        description: ev.payload.description,
        createdAt: ev.when,
        sequence: ev.sequence,
      });
    }
  }

  return {
    last_session_rid,
    last_sequence: lastSequence,
    active_teammates,
    pending_tasks,
  };
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function sessionResume(
  args: SessionResumeArgs
): Promise<SessionResumeResult> {
  if (!args.project || typeof args.project !== "string") {
    throw new Error("session_resume: `project` required");
  }

  const sessionDir = path.join(args.project, ".palantir-mini", "session");
  const eventsPath = path.join(sessionDir, "events.jsonl");

  // Ensure session dir exists (read-only safe — mkdir is idempotent)
  fs.mkdirSync(sessionDir, { recursive: true });

  const events = readEvents(eventsPath);
  const state = computeResumableState(events);
  const emit_resume_event = args.emit_resume_event ?? false;

  if (emit_resume_event) {
    const envelope = {
      eventId: uniqueEventId() as unknown as EventId,
      when: new Date().toISOString(),
      atopWhich: gitHeadSha(args.project) as unknown as CommitSha,
      throughWhich: {
        sessionId: "mcp" as unknown as SessionId,
        toolName: "session_resume",
        cwd: args.project,
      },
      byWhom: { identity: resolveHostRuntimeIdentity() },
      type: "session_resumed",
      payload: {
        last_session_rid: state.last_session_rid,
        last_sequence: state.last_sequence,
        active_teammates: state.active_teammates,
        pending_task_count: state.pending_tasks.length,
      },
    } as unknown as Omit<EventEnvelope, "sequence">;

    await appendEventAtomic(eventsPath, envelope);
  }

  return {
    ...state,
    emit_resume_event,
  };
}

export default async function sessionResumeHandler(
  rawArgs: unknown
): Promise<SessionResumeResult> {
  const args = (rawArgs ?? {}) as SessionResumeArgs;
  return sessionResume(args);
}
