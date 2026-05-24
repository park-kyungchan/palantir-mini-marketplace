// palantir-mini v3.5.0 — get-team-health sibling: read-only fs helpers
// Pure read-only — no fs writes, no events.

import * as fs from "fs";
import * as path from "path";
import { claudeTeamsRoot, idleStatePath } from "./paths";
import { STALE_TASK_ASSIGNMENT_THRESHOLD_MS } from "./types";

/** Read idle-state.json; returns Record<agentName, idleCount>. */
export function readIdleState(): Record<string, number> {
  const p = idleStatePath();
  if (!fs.existsSync(p)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, number>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Count in-progress tasks per owner across a team's task files. */
export function readInProgressPerOwner(teamDir: string): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!fs.existsSync(teamDir)) return counts;
  for (const file of fs.readdirSync(teamDir)) {
    if (!file.endsWith(".json")) continue;
    const fpath = path.join(teamDir, file);
    try {
      const tasks: unknown[] = JSON.parse(fs.readFileSync(fpath, "utf8"));
      if (!Array.isArray(tasks)) continue;
      for (const task of tasks) {
        if (
          task &&
          typeof task === "object" &&
          (task as Record<string, unknown>)["status"] === "in_progress"
        ) {
          const owner =
            ((task as Record<string, unknown>)["owner"] as string | undefined) ??
            "unknown";
          counts[owner] = (counts[owner] ?? 0) + 1;
        }
      }
    } catch {
      /* skip malformed */
    }
  }
  return counts;
}

/** Read inboxes for a team directory. Returns per-teammate stats. */
export function readInboxes(inboxDir: string): {
  perTeammate: Record<string, { unread: number; staleReplays: number }>;
  totalInboxSize: number;
} {
  const perTeammate: Record<string, { unread: number; staleReplays: number }> = {};
  let totalInboxSize = 0;

  if (!fs.existsSync(inboxDir)) return { perTeammate, totalInboxSize };

  for (const file of fs.readdirSync(inboxDir)) {
    if (!file.endsWith(".json")) continue;
    const agentName = file.replace(/\.json$/, "");
    const fpath = path.join(inboxDir, file);
    let messages: unknown[];
    try {
      messages = JSON.parse(fs.readFileSync(fpath, "utf8"));
      if (!Array.isArray(messages)) messages = [];
    } catch {
      messages = [];
    }

    totalInboxSize += messages.length;
    let unread = 0;
    let staleReplays = 0;
    const now = Date.now();

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;
      const m = msg as Record<string, unknown>;
      if (m["read"] === false || m["read"] === undefined) unread++;

      // Stale replay: task_assignment messages older than 1h with read: false
      if (
        m["type"] === "task_assignment" &&
        (m["read"] === false || m["read"] === undefined) &&
        typeof m["sentAt"] === "string"
      ) {
        const age = now - new Date(m["sentAt"] as string).getTime();
        if (age > STALE_TASK_ASSIGNMENT_THRESHOLD_MS) staleReplays++;
      }
    }

    perTeammate[agentName] = { unread, staleReplays };
  }

  return { perTeammate, totalInboxSize };
}

/** List team names under teamsRoot. If team specified, return [team]. */
export function resolveTeams(team?: string): string[] {
  if (team) return [team];
  const root = claudeTeamsRoot();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}
