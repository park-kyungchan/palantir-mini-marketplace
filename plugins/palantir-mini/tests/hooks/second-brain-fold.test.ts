// palantir-mini — second-brain-fold hook tests (LEARN lane, Stop = detect+bookmark)
// Covers the pm-OFF-verifiable parts:
//   (a) EMIT INTEGRATION — emit() a resolution_verdict envelope carrying the full
//       T3 recipe (5-dim + memoryLayers + hypothesis + refinementTarget) and assert
//       the appended events.jsonl row is type==="resolution_verdict" AND valueGrade==="T3".
//       This proves the in-band Path B grader (still used by the retained
//       forwardFoldOutput helper) end-to-end, pm-OFF.
//   (b) SHIM FAIL-SAFE — the hook default export resolves to a { message } object and
//       never throws when invoked against a tmp dir with NO second-brain/ engine.
//   (c) DETERMINISTIC BOOKMARK (W3) — with a stub engine present + a transcript on
//       disk, the Stop hook writes a status:"pending" entry directly into
//       manifest.json.foldedSessions[sessionId] (single manifest authority — no
//       separate pending-fold.json write path anymore) and does NOT spawn the
//       engine (graph.json never appears); the message says "bookmarked".
//   (d) BYPASS — bypass envvar set → no manifest.foldedSessions entry + audit event.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../../scripts/log";
import secondBrainFold from "../../hooks/second-brain-fold";
import { manifestPath } from "../../lib/second-brain/foldedsessions-bump-cli";

const SECOND_BRAIN_FOLD_BYPASS = "PALANTIR_MINI_SECOND_BRAIN_FOLD_BYPASS";

const originalEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
const originalEventsFileForce = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
const originalBypass = process.env[SECOND_BRAIN_FOLD_BYPASS];
const tmpDirs: string[] = [];
const tmpTranscripts: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sbf-"));
  tmpDirs.push(dir);
  return dir;
}

/**
 * Make `root` a tracked project with a STUB engine file present + a transcript on
 * disk at the slug path the hook computes. Returns the sessionId. The transcript
 * lives under the real ~/.claude/projects/<slug>/ (the hook reads os.homedir());
 * it is tracked for cleanup.
 */
function seedTrackedProjectWithTranscript(root: string): string {
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  fs.mkdirSync(path.join(root, "second-brain", "scripts"), { recursive: true });
  // stub engine: present but never executed by the bookmark path
  fs.writeFileSync(path.join(root, "second-brain", "scripts", "fold.ts"), "// stub engine\n", "utf8");

  const sessionId = `sess-bm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = path.resolve(root).split(path.sep).join("-");
  const projectsDir = path.join(os.homedir(), ".claude", "projects", slug);
  fs.mkdirSync(projectsDir, { recursive: true });
  const transcript = path.join(projectsDir, sessionId + ".jsonl");
  fs.writeFileSync(transcript, '{"type":"user"}\n', "utf8");
  tmpTranscripts.push(transcript);
  return sessionId;
}

function restoreEnv(): void {
  if (originalEventsFile === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = originalEventsFile;

  if (originalEventsFileForce === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
  else process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = originalEventsFileForce;

  if (originalBypass === undefined) delete process.env[SECOND_BRAIN_FOLD_BYPASS];
  else process.env[SECOND_BRAIN_FOLD_BYPASS] = originalBypass;
}

afterEach(() => {
  restoreEnv();
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  for (const t of tmpTranscripts.splice(0)) {
    try { fs.rmSync(t, { force: true }); } catch { /* best-effort */ }
  }
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

  // FIX F2: a stray .palantir-mini marker AT $HOME must not make HOME the fold target
  // (would write graph.json + emit governed lineage under the wrong root). The marker
  // satisfies the .palantir-mini existence gate, so only isExcludedProjectRoot stops it.
  test("skips when cwd resolves to an EXCLUDED root ($HOME with a stray .palantir-mini marker)", async () => {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
    const home = os.homedir();
    const marker = path.join(home, ".palantir-mini");
    const hadMarker = fs.existsSync(marker);
    if (!hadMarker) fs.mkdirSync(marker, { recursive: true });
    try {
      const result = await secondBrainFold({ cwd: home, session_id: "sess-sbf-test" });
      expect(result.message).toContain("excluded project root");
    } finally {
      if (!hadMarker) { try { fs.rmSync(marker, { recursive: true, force: true }); } catch { /* best-effort */ } }
    }
  });
});

describe("second-brain-fold — deterministic bookmark (W3 single manifest authority)", () => {
  test("with a stub engine + transcript, writes status:\"pending\" into manifest.json.foldedSessions and does NOT spawn the engine", async () => {
    const tmpRoot = makeTmpProject();
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpRoot, ".palantir-mini", "session", "events.jsonl");
    delete process.env[SECOND_BRAIN_FOLD_BYPASS];
    const sessionId = seedTrackedProjectWithTranscript(tmpRoot);

    const result = await secondBrainFold({ cwd: tmpRoot, session_id: sessionId });

    expect(result.message).toContain("bookmarked");
    // bookmark written directly into manifest.json.foldedSessions (no separate pending-fold.json)
    const manifest = JSON.parse(fs.readFileSync(manifestPath(tmpRoot), "utf8")) as {
      foldedSessions?: Record<string, Record<string, unknown>>;
    };
    const rec = manifest.foldedSessions?.[sessionId];
    expect(rec?.status).toBe("pending");
    expect(rec?.transcriptPath as string).toContain(sessionId + ".jsonl");
    // engine was NOT spawned: no graph.json materialized
    expect(fs.existsSync(path.join(tmpRoot, "second-brain", "graph.json"))).toBe(false);
  });
});

describe("second-brain-fold — bypass", () => {
  test("bypass envvar set → no manifest.foldedSessions entry + audit event emitted", async () => {
    const tmpRoot = makeTmpProject();
    const eventsFile = path.join(tmpRoot, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";
    process.env[SECOND_BRAIN_FOLD_BYPASS] = "1";
    const sessionId = seedTrackedProjectWithTranscript(tmpRoot);

    const result = await secondBrainFold({ cwd: tmpRoot, session_id: sessionId });

    expect(result.message).toContain(SECOND_BRAIN_FOLD_BYPASS);
    // a bypassed session is never queued: no manifest.json even created for it
    const manifestP = manifestPath(tmpRoot);
    if (fs.existsSync(manifestP)) {
      const manifest = JSON.parse(fs.readFileSync(manifestP, "utf8")) as {
        foldedSessions?: Record<string, unknown>;
      };
      expect(sessionId in (manifest.foldedSessions ?? {})).toBe(false);
    }
    // audit event was emitted (bypass-budget-monitor counts it)
    const lines = fs
      .readFileSync(eventsFile, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    const audit = lines.find(
      (r) =>
        r["type"] === "validation_phase_completed" &&
        (r["payload"] as Record<string, unknown>)?.["errorClass"] === "second_brain_fold_bypass_invoked",
    );
    expect(audit).toBeDefined();
  });
});
