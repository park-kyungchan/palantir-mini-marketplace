// palantir-mini v3.6.0 — shared fixtures for batch6 retro-learn tests (A7 trim).

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function tmpProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-b6-"));
}

/** Minimal envelope builder for tests — writes raw NDJSON lines. */
export function writeEventsJsonl(
  projectRoot: string,
  events: Array<Record<string, unknown>>,
): string {
  const sessionDir = path.join(projectRoot, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const eventsPath = path.join(sessionDir, "events.jsonl");

  const lines = events.map((ev, i) => {
    const filled: Record<string, unknown> = {
      eventId:   `evt-${i}`,
      when:      (ev["when"] as string) ?? new Date(2026, 0, 1 + i).toISOString(),
      atopWhich: "test-sha",
      throughWhich: { sessionId: "test-session", toolName: "test-tool", cwd: projectRoot },
      byWhom:   ev["byWhom"] ?? { identity: "test-agent", agentName: "tester" },
      sequence: (ev["sequence"] as number) ?? i + 1,
      ...ev,
    };
    return JSON.stringify(filled);
  });
  fs.writeFileSync(eventsPath, lines.join("\n") + "\n");
  return eventsPath;
}
