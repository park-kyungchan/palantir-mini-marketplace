// palantir-mini v1.4 — task-completed-inbox-clean hook
// Fires on: TaskCompleted (advisory)
//
// Phase A-4: dedicated inbox-clean hook (companion to task-completed-gate.ts).
// task-completed-gate.ts already does inbox clean, but this hook is a
// standalone, explicitly-named version for the new hooks.json registration
// that the plumbing wave will add.
//
// Removes task_assignment inbox entries matching the completed taskId from
// ALL inbox-*.json files under <cwd>/.palantir-mini/session/.
// Eliminates 100% of defect #9 stale-replay incidents.
//
// See plan §Layer 3 hook #6, the former Lead-Protocol policy §Inbox read-flag + TaskCompleted auto-clean,
// defect #9 in the 9-defect resolution table.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  task_id?:    string;
  phase_tag?:  string;
  session_id?: string;
  cwd?:        string;
}

interface InboxMessage {
  id?:     string;
  type?:   string;
  taskId?: string;
  read?:   boolean;
}

interface InboxFile {
  recipient?: string;
  messages:   InboxMessage[];
}

/** Find all inbox-*.json files under the session dir. */
export function listInboxFiles(sessionDir: string): string[] {
  if (!fs.existsSync(sessionDir)) return [];
  try {
    return fs
      .readdirSync(sessionDir)
      .filter((f) => f.startsWith("inbox-") && f.endsWith(".json"))
      .map((f) => path.join(sessionDir, f));
  } catch {
    return [];
  }
}

/**
 * Remove task_assignment messages matching taskId from a single inbox file.
 * Returns the count of removed entries. Only rewrites the file if removals occur.
 */
export function cleanInboxForTask(inboxFile: string, taskId: string): number {
  let raw: InboxFile;
  try {
    raw = JSON.parse(fs.readFileSync(inboxFile, "utf8")) as InboxFile;
  } catch {
    return 0;
  }

  const before = raw.messages.length;
  const after  = raw.messages.filter(
    (m) => !(m.type === "task_assignment" && m.taskId === taskId),
  );

  const removed = before - after.length;
  if (removed > 0) {
    raw.messages = after;
    fs.writeFileSync(inboxFile, JSON.stringify(raw, null, 2), "utf8");
  }
  return removed;
}

export default async function taskCompletedInboxClean(payload: unknown): Promise<{
  message:   string;
  decision?: "block" | "continue";
}> {
  const p      = (payload ?? {}) as HookPayload;
  const cwd    = p.cwd ?? process.cwd();
  const taskId = p.task_id ?? "unknown-task";

  const sessionDir = path.join(
    process.env.PALANTIR_MINI_PROJECT ?? cwd,
    ".palantir-mini", "session",
  );

  const inboxFiles  = listInboxFiles(sessionDir);
  let totalRemoved  = 0;
  const cleanedFiles: string[] = [];

  for (const f of inboxFiles) {
    const removed = cleanInboxForTask(f, taskId);
    if (removed > 0) {
      totalRemoved += removed;
      cleanedFiles.push(path.basename(f));
    }
  }

  // Always emit phase_completed for task tracking
  try {
    await emit({
      type:      "phase_completed",
      payload: {
        phaseTag:    p.phase_tag ?? "TaskCompleted",
        taskId,
        validations: ["inbox_clean"],
      },
      toolName:  "TaskCompleted",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      reasoning: `task-completed-inbox-clean: swept ${inboxFiles.length} inbox file(s), removed ${totalRemoved} stale task_assignment(s) for taskId=${taskId}`,
    });
  } catch {
    // best-effort
  }

  if (totalRemoved > 0) {
    try {
      await emit({
        type:      "inbox_cleaned",
        payload: {
          taskId,
          removedCount: totalRemoved,
          inboxFiles:   cleanedFiles,
        },
        toolName:  "TaskCompleted",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: `defect #9 prevention: removed ${totalRemoved} stale task_assignment(s) across ${cleanedFiles.length} inbox file(s)`,
      });
    } catch {
      // best-effort
    }
  }

  return {
    message:  `palantir-mini: task-completed-inbox-clean (taskId=${taskId}, removed=${totalRemoved}, files=${cleanedFiles.length})`,
    decision: "continue",
  };
}
