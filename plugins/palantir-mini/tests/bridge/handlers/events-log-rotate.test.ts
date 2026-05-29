// palantir-mini v6.80.0 — events_log_rotate handler tests

import { describe, expect, test, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import eventsLogRotate from "../../../bridge/handlers/events-log-rotate";
import { readEvents } from "../../../lib/event-log/read";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-events-log-rotate-"));
  tmpDirs.push(dir);
  return dir;
}

function eventsPath(project: string): string {
  return path.join(project, ".palantir-mini", "session", "events.jsonl");
}

function writeEvents(project: string, count: number): void {
  fs.mkdirSync(path.dirname(eventsPath(project)), { recursive: true });
  const lines: string[] = [];
  for (let i = 1; i <= count; i++) {
    lines.push(JSON.stringify({
      eventId: `evt-${i}`,
      when: "2026-05-29T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-handler-test", toolName: "test", cwd: project },
      byWhom: { identity: "test-agent" },
      withWhat: { memoryLayers: ["episodic"] },
      type: "phase_completed",
      payload: { phaseTag: "test", taskId: `task-${i}`, validations: [] },
      valueGrade: "T1",
      sequence: i,
    }));
  }
  fs.writeFileSync(eventsPath(project), lines.join("\n") + "\n", "utf8");
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("events_log_rotate handler", () => {
  test("validation — missing project throws", async () => {
    await expect(eventsLogRotate({})).rejects.toThrow(/project/);
  });

  test("under thresholds returns no-op and keeps live events", async () => {
    const project = makeTmpProject();
    writeEvents(project, 2);

    const result = await eventsLogRotate({
      project,
      thresholdBytes: 1_000_000,
      thresholdLines: 1_000,
    });

    expect(result.rotated).toBe(false);
    expect(result.eventsPath).toBe(eventsPath(project));
    expect(fs.existsSync(eventsPath(project))).toBe(true);
    expect(readEvents(eventsPath(project)).map((event) => event.sequence)).toEqual([1, 2]);
  });

  test("over threshold archives breached log and writes sequence-continuous bridge event", async () => {
    const project = makeTmpProject();
    writeEvents(project, 3);

    const result = await eventsLogRotate({
      project,
      thresholdBytes: 100_000_000,
      thresholdLines: 1,
      sessionId: "sess-handler-test",
      agentName: "handler-test-agent",
    });

    expect(result.rotated).toBe(true);
    expect(result.archivedPath).toBeTruthy();
    expect(result.lastSequence).toBe(3);
    expect(result.rotationEventSequence).toBe(4);
    expect(fs.existsSync(result.archivedPath!)).toBe(true);
    expect(fs.existsSync(eventsPath(project))).toBe(true);

    const allEvents = readEvents(eventsPath(project));
    expect(allEvents.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
    const bridgeEvent = allEvents.at(-1)!;
    expect(bridgeEvent.type).toBe("event_log_rotated");
    expect(bridgeEvent.valueGrade).toBe("T3");
    expect(bridgeEvent.throughWhich.toolName).toBe("events_log_rotate");
    expect(bridgeEvent.payload).toMatchObject({
      archivedPath: result.archivedPath,
      lineCount: 3,
      thresholdBytes: 100_000_000,
      thresholdLines: 1,
    });
  });
});
