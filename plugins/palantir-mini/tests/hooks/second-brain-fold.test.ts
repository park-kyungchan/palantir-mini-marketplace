// palantir-mini — second-brain-fold hook tests (LEARN lane, Stop shim)
// Covers the pm-OFF-verifiable parts:
//   (a) EMIT INTEGRATION — emit() a resolution_verdict envelope carrying the full
//       T3 recipe (5-dim + memoryLayers + hypothesis + refinementTarget) and assert
//       the appended events.jsonl row is type==="resolution_verdict" AND valueGrade==="T3".
//       This proves the in-band Path B grader end-to-end, pm-OFF.
//   (b) SHIM FAIL-SAFE — the hook default export resolves to a { message } object and
//       never throws when invoked against a tmp dir with NO second-brain/ engine.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../../scripts/log";
import secondBrainFold from "../../hooks/second-brain-fold";

const originalEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
const originalEventsFileForce = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sbf-"));
  tmpDirs.push(dir);
  return dir;
}

function restoreEnv(): void {
  if (originalEventsFile === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = originalEventsFile;

  if (originalEventsFileForce === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
  else process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = originalEventsFileForce;
}

afterEach(() => {
  restoreEnv();
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("second-brain-fold — emit integration (T3 recipe, Path B)", () => {
  test("a resolution_verdict envelope with full T3 axes grades T3 and round-trips", async () => {
    const tmpRoot = makeTmpProject();
    const eventsFile = path.join(tmpRoot, "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";

    await emit({
      type: "resolution_verdict",
      payload: { verdict: "ADD", targetId: "n1", derivedFrom: ["u1"] },
      toolName: "Stop",
      cwd: tmpRoot,
      sessionId: "sess-sbf-test",
      identity: "monitor",
      // Axis E (past T1)
      memoryLayers: ["semantic", "episodic"],
      // Axis B (past T1)
      hypothesis: "Folding this session resolved node n1 as ADD in the second-brain graph.",
      // Axis C (T2 → T3)
      refinementTarget: {
        kind: "other",
        filePathOrRid: "second-brain/graph.json",
        description: "resolution_verdict ADD for a node persisted to second-brain/graph.json.",
        confidenceLevel: "medium",
      },
    });

    const lines = fs
      .readFileSync(eventsFile, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(1);

    const row = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(row["type"]).toBe("resolution_verdict");
    expect(row["valueGrade"]).toBe("T3");

    // payload round-trips intact
    const payload = row["payload"] as Record<string, unknown>;
    expect(payload["verdict"]).toBe("ADD");
    expect(payload["targetId"]).toBe("n1");

    // the C axis (refinementTarget) that lifts T2 → T3 is carried in withWhat
    const withWhat = row["withWhat"] as { refinementTarget?: { kind?: string } };
    expect(withWhat?.refinementTarget?.kind).toBe("other");
  });
});

describe("second-brain-fold — shim fail-safe", () => {
  test("returns a { message } object and never throws when project has no second-brain engine", async () => {
    const tmpRoot = makeTmpProject();
    // Make it a tracked project (.palantir-mini/) but with NO second-brain/ engine.
    fs.mkdirSync(path.join(tmpRoot, ".palantir-mini", "session"), { recursive: true });
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpRoot, ".palantir-mini", "session", "events.jsonl");

    const result = await secondBrainFold({ cwd: tmpRoot, session_id: "sess-sbf-test" });
    expect(typeof result.message).toBe("string");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("no second-brain engine");
  });

  test("returns a { message } object when cwd is not a tracked project (never throws)", async () => {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
    const fsRoot = path.parse(os.tmpdir()).root;
    const result = await secondBrainFold({ cwd: fsRoot, session_id: "sess-sbf-test" });
    expect(typeof result.message).toBe("string");
    expect(result.message).toContain("skipped");
  });
});
