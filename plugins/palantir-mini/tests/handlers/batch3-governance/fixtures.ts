// palantir-mini v3.6.0 — shared fixtures for batch3 governance tests
// Extracted from batch3-governance.test.ts during v3.6.0 N1-LARGE wave 4 (A2).

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-h3-"));
}

/** Build synthetic ~/.claude/teams + tasks + idle-state for get_team_health tests. */
export function makeFakeTeamsDir(dir: string): void {
  const inboxDir = path.join(dir, ".claude", "teams", "alpha", "inboxes");
  fs.mkdirSync(inboxDir, { recursive: true });

  const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  fs.writeFileSync(path.join(inboxDir, "alice.json"), JSON.stringify([
    { type: "task_assignment", read: false, sentAt: oldDate, taskId: "t1" },
    { type: "dm",              read: true,  sentAt: new Date().toISOString() },
  ]));
  fs.writeFileSync(path.join(inboxDir, "bob.json"), JSON.stringify([
    { type: "dm", read: true, sentAt: new Date().toISOString() },
  ]));

  const tasksDir = path.join(dir, ".claude", "tasks", "alpha");
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.writeFileSync(path.join(tasksDir, "tasks.json"), JSON.stringify([
    { id: "t1", status: "in_progress", owner: "alice" },
    { id: "t2", status: "in_progress", owner: "alice" },
    { id: "t3", status: "completed",   owner: "bob" },
  ]));

  const sid = process.env["CLAUDE_SESSION_ID"] ?? "test-session-health";
  const idleDir = path.join("/tmp", "claude-hooks", sid);
  fs.mkdirSync(idleDir, { recursive: true });
  fs.writeFileSync(path.join(idleDir, "idle-state.json"), JSON.stringify({
    alice: 2,
    bob:   0,
  }));
}
