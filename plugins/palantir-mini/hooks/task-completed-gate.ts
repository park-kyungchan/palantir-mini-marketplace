// palantir-mini v1.1 — TaskCompleted hook handler
// Fires on: TaskCompleted (v2.1.84+)
//
// v1.1 upgrades (Phase A-2 W2-2 defect #9):
//   - On TaskCompleted, sweep all inbox-*.json files and remove any
//     `task_assignment` entries whose taskId matches the completed task.
//   - Emits inbox_cleaned event with removed count + inbox file list.
//
// Preserves the existing phase-gate emission behavior (phase_completed event).

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot } from "../scripts/log";

interface HookPayload {
  task_id?:    string;
  phase_tag?:  string;
  session_id?: string;
  cwd?:        string;
}

interface InboxMessage {
  id:     string;
  type?:  string;
  taskId?: string;
  read:   boolean;
  [k: string]: unknown;
}

interface InboxFile {
  recipient: string;
  messages:  InboxMessage[];
}

/**
 * Lists all inbox-*.json paths under .palantir-mini/session/.
 */
export function listInboxFiles(root: string): string[] {
  const dir = path.join(root, ".palantir-mini", "session");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith("inbox-") && f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Strips task_assignment messages whose taskId matches the given value.
 * Writes the file atomically and returns count of messages removed.
 */
export function cleanInboxForTask(inboxPath: string, taskId: string): number {
  let raw: string;
  try {
    raw = fs.readFileSync(inboxPath, "utf8");
  } catch {
    return 0;
  }
  if (!raw.trim()) return 0;
  let parsed: InboxFile;
  try {
    parsed = JSON.parse(raw) as InboxFile;
  } catch {
    return 0;
  }
  if (!Array.isArray(parsed.messages)) return 0;
  const before = parsed.messages.length;
  parsed.messages = parsed.messages.filter((m) => !(m.type === "task_assignment" && m.taskId === taskId));
  const removed = before - parsed.messages.length;
  if (removed === 0) return 0;
  const tmp = inboxPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, inboxPath);
  return removed;
}

export default async function taskCompletedGate(payload: unknown): Promise<{ decision?: "block" | "continue"; reason?: string; message?: string }> {
  const p = (payload ?? {}) as HookPayload;
  const taskId = p.task_id ?? "unknown-task";
  const phaseTag = p.phase_tag ?? "general";
  const cwd = p.cwd ?? process.cwd();
  const root = projectRoot();

  // Preserve existing phase_completed emission (existing phase-gate behavior)
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag,
        taskId,
        validations: ["task_completion_recorded"],
      },
      toolName:  "TaskCompleted",
      cwd,
      sessionId: p.session_id,
      identity:  "claude-code",
    });
  } catch (e) {
    return {
      decision: "block",
      reason: `palantir-mini: phase_completed emit failed: ${(e as Error).message}`,
    };
  }

  // Defect #9: sweep inboxes for stale task_assignment
  const inboxFiles = listInboxFiles(root);
  const touchedInboxes: string[] = [];
  let totalRemoved = 0;
  for (const f of inboxFiles) {
    try {
      const removed = cleanInboxForTask(f, taskId);
      if (removed > 0) {
        totalRemoved += removed;
        touchedInboxes.push(path.relative(root, f));
      }
    } catch { /* best-effort */ }
  }

  if (totalRemoved > 0) {
    try {
      await emit({
        type: "inbox_cleaned",
        payload: {
          taskId,
          removedCount: totalRemoved,
          inboxFiles:   touchedInboxes,
        },
        toolName:  "TaskCompleted",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
      });
    } catch { /* best-effort */ }
  }

  return {
    decision: "continue",
    message: `palantir-mini: task_completed taskId=${taskId}${totalRemoved > 0 ? ` (cleaned ${totalRemoved} inbox task_assignment entr${totalRemoved === 1 ? "y" : "ies"})` : ""}`,
  };
}
