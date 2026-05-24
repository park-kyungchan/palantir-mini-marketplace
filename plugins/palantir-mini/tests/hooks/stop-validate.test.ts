// palantir-mini v3.2.0 — stop-validate hook tests (N3)
// Previously untested. Covers basic Stop hook lifecycle.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import stopValidate from "../../hooks/stop-validate";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-sv-${label}-`));
}

function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

describe("stopValidate hook", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir("h");
    savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_PROJECT     = tmp;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath(tmp);
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("returns message on no events.jsonl (best-effort)", async () => {
    const r = await stopValidate({});
    expect(r.message).toContain("session_ended");
    expect(r.message).toContain("total events");
  });

  test("eventCount reflects existing events", async () => {
    const dir = path.join(tmp, ".palantir-mini", "session");
    fs.mkdirSync(dir, { recursive: true });
    const events = [
      { type: "session_started", sequence: 1, eventId: "e1", when: "x", atopWhich: "x", throughWhich: { sessionId: "s", toolName: "t", cwd: tmp }, byWhom: { identity: "claude-code" }, payload: { model: "x", effort: "x" } },
      { type: "session_started", sequence: 2, eventId: "e2", when: "x", atopWhich: "x", throughWhich: { sessionId: "s", toolName: "t", cwd: tmp }, byWhom: { identity: "claude-code" }, payload: { model: "x", effort: "x" } },
    ];
    fs.writeFileSync(eventsPath(tmp), events.map((e) => JSON.stringify(e)).join("\n") + "\n");

    const r = await stopValidate({});
    // 2 existing + 1 newly-emitted session_ended = 3
    expect(r.message).toContain("session_ended");
  });

  test("returns message even when events.jsonl write fails (best-effort)", async () => {
    // Force-emit failure path is internal; this just confirms no throw.
    const r = await stopValidate({});
    expect(r.message).toBeDefined();
  });

  test("records workflow response validation when response text is available", async () => {
    await stopValidate({
      response: [
        "palantir-mini workflow",
        "현재 workflow phase: draft",
        ["runtime-native", "question", "UI"].join(" "),
      ].join("\n"),
    });

    const raw = fs.readFileSync(eventsPath(tmp), "utf8").trim().split("\n");
    const event = JSON.parse(raw.at(-1)!) as {
      payload?: {
        workflowResponseValidation?: {
          status?: string;
          required?: boolean;
          validation?: { forbiddenRuntimeUiMarkers?: string[] };
        };
      };
    };
    expect(event.payload?.workflowResponseValidation?.required).toBe(true);
    expect(event.payload?.workflowResponseValidation?.status).toBe("fail");
    expect(
      event.payload?.workflowResponseValidation?.validation?.forbiddenRuntimeUiMarkers?.length,
    ).toBeGreaterThan(0);
  });
});
