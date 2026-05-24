// palantir-mini v1.5.2 — emit-pb-event tests
// Verifies: PbEventName mapping, payload construction, env isolation, error guards.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { emitPbEvent } from "../../scripts/emit-pb-event";
import type { PbEventName } from "../../scripts/emit-pb-event";

function tmp(): string { return fs.mkdtempSync(path.join(os.tmpdir(), "pm-pb-")); }

function readEvents(dir: string): unknown[] {
  const eventsPath = path.join(dir, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as unknown);
}

describe("emitPbEvent", () => {
  afterEach(() => {
    // Ensure env var is cleaned up between tests
    delete process.env.PALANTIR_MINI_PROJECT;
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  });

  test("emits pb_navigate as edit_proposed with correct fields", async () => {
    const dir = tmp();
    const result = await emitPbEvent({
      pbEventName: "pb_navigate",
      project: dir,
      payload: { url: "https://example.com" },
    });
    expect(result.sequence).toBeGreaterThan(0);
    expect(result.pbEventName).toBe("pb_navigate");
    expect(result.project).toBe(dir);

    const events = readEvents(dir);
    expect(events).toHaveLength(1);
    const ev = events[0] as Record<string, unknown>;
    expect(ev["type"]).toBe("edit_proposed");
    const payload = ev["payload"] as Record<string, unknown>;
    expect(payload["functionName"]).toBe("pb_navigate");
    expect(Array.isArray(payload["hypotheticalEdits"])).toBe(true);
  });

  test("emits pb_browser_opened as session_started", async () => {
    const dir = tmp();
    await emitPbEvent({ pbEventName: "pb_browser_opened", project: dir, payload: { mode: "cdp" } });
    const events = readEvents(dir);
    const ev = events[0] as Record<string, unknown>;
    expect(ev["type"]).toBe("session_started");
    const payload = ev["payload"] as Record<string, unknown>;
    expect(payload["effort"]).toBe("cdp");
  });

  test("emits pb_browser_closed as session_ended", async () => {
    const dir = tmp();
    await emitPbEvent({ pbEventName: "pb_browser_closed", project: dir });
    const events = readEvents(dir);
    const ev = events[0] as Record<string, unknown>;
    expect(ev["type"]).toBe("session_ended");
    const payload = ev["payload"] as Record<string, unknown>;
    expect(payload["reason"]).toBe("other");
  });

  test("emits pb_status_checked as phase_completed", async () => {
    const dir = tmp();
    await emitPbEvent({ pbEventName: "pb_status_checked", project: dir, payload: { status: "ok" } });
    const events = readEvents(dir);
    const ev = events[0] as Record<string, unknown>;
    expect(ev["type"]).toBe("phase_completed");
    const payload = ev["payload"] as Record<string, unknown>;
    expect(payload["phaseTag"]).toBe("pb_status_checked");
    expect((payload["validations"] as string[])[0]).toBe("ok");
  });

  test("emits pb_cookies_imported as phase_completed", async () => {
    const dir = tmp();
    await emitPbEvent({ pbEventName: "pb_cookies_imported", project: dir, payload: { cookieCount: 5 } });
    const events = readEvents(dir);
    const ev = events[0] as Record<string, unknown>;
    expect(ev["type"]).toBe("phase_completed");
  });

  test("5D envelope fields are populated", async () => {
    const dir = tmp();
    await emitPbEvent({ pbEventName: "pb_snapshot", project: dir, reasoning: "test snapshot" });
    const events = readEvents(dir);
    const ev = events[0] as Record<string, unknown>;
    expect(typeof ev["when"]).toBe("string");
    expect(typeof ev["atopWhich"]).toBe("string");
    expect(typeof ev["eventId"]).toBe("string");
    expect(typeof ev["sequence"]).toBe("number");
    const byWhom = ev["byWhom"] as Record<string, unknown>;
    expect(byWhom["identity"]).toBe("monitor");
    expect(byWhom["agentName"]).toBe("palantir-browse");
    const withWhat = ev["withWhat"] as Record<string, unknown>;
    expect(withWhat["reasoning"]).toBe("test snapshot");
  });

  test("sequential emits produce monotonic sequence", async () => {
    const dir = tmp();
    const r1 = await emitPbEvent({ pbEventName: "pb_navigate", project: dir });
    const r2 = await emitPbEvent({ pbEventName: "pb_snapshot", project: dir });
    expect(r2.sequence).toBe(r1.sequence + 1);
  });

  test("PALANTIR_MINI_PROJECT env is restored after emit", async () => {
    const dir = tmp();
    const originalEnv = process.env.PALANTIR_MINI_PROJECT;
    await emitPbEvent({ pbEventName: "pb_navigate", project: dir });
    expect(process.env.PALANTIR_MINI_PROJECT).toBe(originalEnv);
  });

  test("throws when project is missing", async () => {
    await expect(
      emitPbEvent({ pbEventName: "pb_navigate", project: "" })
    ).rejects.toThrow("project");
  });

  test("throws when pbEventName is missing", async () => {
    const dir = tmp();
    await expect(
      emitPbEvent({ pbEventName: "" as PbEventName, project: dir })
    ).rejects.toThrow("pbEventName");
  });
});
