// palantir-mini v3.11.0 — analyzer-marker-pickup hook tests (W3.1d, CT-3)
// Coverage: empty dir → no event, single marker, multiple markers, malformed JSON skip,
// missing fields skip, env-var session-id override.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import analyzerMarkerPickup, {
  buildPickupContext,
  resolveMarkerDir,
  scanMarkers,
} from "../../hooks/analyzer-marker-pickup";

let TMP: string;
let savedEventsFile: string | undefined;
let savedSessionEnv: string | undefined;
let SESSION_ID: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-marker-pickup-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  savedSessionEnv = process.env.PALANTIR_MINI_SESSION_ID;
  delete process.env.PALANTIR_MINI_SESSION_ID;
  SESSION_ID = `test-pickup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
});

afterEach(() => {
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (savedSessionEnv !== undefined) {
    process.env.PALANTIR_MINI_SESSION_ID = savedSessionEnv;
  } else {
    delete process.env.PALANTIR_MINI_SESSION_ID;
  }
  const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
  if (fs.existsSync(markerDir)) {
    fs.rmSync(markerDir, { recursive: true, force: true });
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

function writeMarker(
  sessionId: string,
  sprint: number,
  iter: number,
  rubric: string,
  extra: Record<string, unknown> = {},
): string {
  const dir = path.join(os.tmpdir(), "claude-hooks", sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `analyzer-request-${sprint}-${iter}-${rubric}.json`);
  const body = {
    sprintNumber: sprint,
    iteration: iter,
    rubricId: rubric,
    project: "/test/project",
    failedCount: 1,
    requestedAt: `2026-04-29T${String(10 + iter).padStart(2, "0")}:00:00.000Z`,
    sessionId,
    ...extra,
  };
  fs.writeFileSync(file, JSON.stringify(body, null, 2), "utf8");
  return file;
}

describe("analyzer-marker-pickup hook", () => {
  test("no markers → empty additionalContext + no event", async () => {
    const result = await analyzerMarkerPickup({
      session_id: SESSION_ID,
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no pending markers");
    expect(result.additionalContext).toBeUndefined();
    // No event in events.jsonl
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    expect(fs.existsSync(eventsPath)).toBe(false);
  });

  test("single marker → 1 advisory event + additionalContext", async () => {
    writeMarker(SESSION_ID, 7, 2, "rubric-A");
    const result = await analyzerMarkerPickup({
      session_id: SESSION_ID,
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("1 pending");
    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("HARNESS ANALYZER PICKUP PENDING");
    expect(result.additionalContext).toContain("sprint 7 iter 2 rubric rubric-A");
    expect(result.additionalContext).toContain("/palantir-mini:pm-harness-analyze 7 2");

    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const evt = lines.map((l) => JSON.parse(l)).find(
      (e: any) => e.payload?.phaseTag === "harness-analyzer-pickup-pending",
    );
    expect(evt).toBeDefined();
    expect(evt.type).toBe("phase_completed");
    expect(evt.payload.taskId).toBe(`session-${SESSION_ID}-analyzer-pickup`);
    expect(evt.payload.validations).toContain("markers-scanned");
  });

  test("multiple markers (2 sprints) → both surfaced in FIFO order by requestedAt", async () => {
    writeMarker(SESSION_ID, 5, 1, "rubric-X", { requestedAt: "2026-04-29T11:00:00.000Z" });
    writeMarker(SESSION_ID, 3, 2, "rubric-Y", { requestedAt: "2026-04-29T10:00:00.000Z" });

    const result = await analyzerMarkerPickup({
      session_id: SESSION_ID,
      cwd: TMP,
    });
    expect(result.message).toContain("2 pending");
    expect(result.additionalContext).toBeDefined();
    // Y (10:00) should appear BEFORE X (11:00)
    const ctx = result.additionalContext!;
    const idxY = ctx.indexOf("sprint 3 iter 2 rubric rubric-Y");
    const idxX = ctx.indexOf("sprint 5 iter 1 rubric rubric-X");
    expect(idxY).toBeGreaterThan(-1);
    expect(idxX).toBeGreaterThan(-1);
    expect(idxY).toBeLessThan(idxX);
  });

  test("malformed JSON marker is skipped silently", async () => {
    const dir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "analyzer-request-bad.json"), "not valid json {{{", "utf8");
    writeMarker(SESSION_ID, 1, 1, "ok");

    const result = await analyzerMarkerPickup({
      session_id: SESSION_ID,
      cwd: TMP,
    });
    expect(result.message).toContain("1 pending"); // bad one excluded
    expect(result.additionalContext).toContain("sprint 1 iter 1 rubric ok");
  });

  test("marker with missing required fields is skipped", async () => {
    const dir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "analyzer-request-incomplete.json"),
      JSON.stringify({ sprintNumber: 1 /* missing iteration, rubricId, project */ }),
      "utf8",
    );
    writeMarker(SESSION_ID, 9, 9, "complete");

    const result = await analyzerMarkerPickup({
      session_id: SESSION_ID,
      cwd: TMP,
    });
    expect(result.message).toContain("1 pending");
    expect(result.additionalContext).toContain("sprint 9 iter 9 rubric complete");
  });

  test("session-id env override (PALANTIR_MINI_SESSION_ID) when payload omits", async () => {
    writeMarker(SESSION_ID, 4, 1, "rubric-Z");
    process.env.PALANTIR_MINI_SESSION_ID = SESSION_ID;
    // Empty payload — should fall through to env
    const result = await analyzerMarkerPickup({});
    expect(result.message).toContain("1 pending");
    expect(result.additionalContext).toContain("sprint 4 iter 1");
  });
});

describe("analyzer-marker-pickup helpers", () => {
  test("resolveMarkerDir returns expected path", () => {
    const sid = "abc123";
    expect(resolveMarkerDir(sid)).toBe(path.join(os.tmpdir(), "claude-hooks", sid));
  });

  test("scanMarkers returns [] for nonexistent dir", () => {
    expect(scanMarkers("/nonexistent/path/xyz")).toEqual([]);
  });

  test("buildPickupContext renders all entries with project + spawn line", () => {
    const lines = buildPickupContext([
      {
        sprintNumber: 2,
        iteration: 3,
        rubricId: "r-test",
        project: "/some/proj",
        failedCount: 4,
        requestedAt: "2026-04-29T10:00:00.000Z",
        sessionId: "s",
        markerPath: "/tmp/x.json",
      },
    ]);
    const txt = lines.join("\n");
    expect(txt).toContain("sprint 2 iter 3 rubric r-test (4 failed)");
    expect(txt).toContain("project: /some/proj");
    expect(txt).toContain("/palantir-mini:pm-harness-analyze 2 3");
  });
});
