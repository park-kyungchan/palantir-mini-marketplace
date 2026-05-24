// palantir-mini v1 — TaskCreated hook handler
// Fires on: TaskCreated (new task added to task list)
//
// Emits a task_created event to events.jsonl for decision lineage tracking.

import { emit } from "../scripts/log";

interface HookPayload {
  task_id?:    string;
  subject?:    string;
  description?: string;
  session_id?: string;
  cwd?:        string;
}

export default async function taskCreated(payload: unknown): Promise<{ message: string }> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  try {
    await emit({
      type: "task_created",
      payload: {
        taskId:      p.task_id ?? "unknown",
        subject:     p.subject,
        description: p.description,
      },
      toolName:  "TaskCreated",
      cwd,
      sessionId: p.session_id,
      identity:  "claude-code",
    });
  } catch {
    // best-effort — never block on event-log write failure
  }

  return { message: `palantir-mini: task_created recorded (id=${p.task_id ?? "unknown"})` };
}
