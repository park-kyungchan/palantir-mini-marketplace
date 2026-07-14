// palantir-mini v7.21.0 — ontology-drift-fold hook tests (Pillar C #3)
// Tests: not a tracked project → skip; no .palantir-mini/ → skip; clean fold
// (stale===0) → no emit; stale>0 → one ontology_drift_detected advisory carrying
// comparator + noiseWarning verbatim; bypass envvar → skip + bypass-invoked emit;
// always returns { message } and never throws.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "node:child_process";
import ontologyDriftFold from "../../hooks/ontology-drift-fold";

let TMP: string;

/** Build a minimal .palantir-mini project fixture in TMP. */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

/** Read the emitted events from events.jsonl. */
function readEmittedEvents(): Array<{ payload?: { errorClass?: string } }> {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean) as Array<{ payload?: { errorClass?: string } }>;
}

/** Init a git repo in TMP with one tracked backing file and capture its SHA. */
function git(...args: string[]): string {
  return execFileSync("git", ["-C", TMP, ...args], { encoding: "utf8" }).trim();
}
function initGitWithBackingFile(backingRel: string): string {
  git("init", "-q");
  git("config", "user.email", "t@t.test");
  git("config", "user.name", "test");
  fs.mkdirSync(path.dirname(path.join(TMP, backingRel)), { recursive: true });
  fs.writeFileSync(path.join(TMP, backingRel), "v1\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return git("rev-parse", "HEAD");
}

/**
 * Write ONE edit_committed event registering an object primitive atop `atopSha`,
 * with `backingSourceRef` pointing at `backingRel`. The per-file detector flags it
 * stale iff `backingRel` changed in (atopSha, HEAD].
 */
function writeRegisteredPrimitive(atopSha: string, backingRel: string): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const evt = {
    type: "edit_committed",
    eventId: "evt-reg-1",
    when: new Date().toISOString(),
    atopWhich: atopSha,
    sequence: 1,
    throughWhich: { sessionId: "test", toolName: "commit_edits", cwd: TMP },
    byWhom: { identity: "claude-code" },
    payload: {
      // F1b — a REGISTERED built-in self-ontology verb so the fold's registration
      // guard materializes this primitive into registeredPrimitives (presence→registration).
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      appliedEdits: [
        {
          kind: "object",
          rid: "ri.ontology.main.object-type.drift-fixture",
          properties: { primitiveKind: "ObjectType", backingSourceRef: backingRel },
        },
      ],
    },
  };
  fs.writeFileSync(eventsPath, JSON.stringify(evt) + "\n");
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-drift-fold-"));
  setupProject();
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_DRIFT_FOLD_BYPASS;
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("ontology-drift-fold", () => {
  test("T1: cwd not in a tracked project → skip, no emit", async () => {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
    // The filesystem root has no `.palantir-mini` ancestor → findProjectRoot returns null.
    // (os.tmpdir() is NOT used here: some environments carry a /tmp/.palantir-mini marker.)
    const fsRoot = path.parse(os.tmpdir()).root;
    const result = await ontologyDriftFold({ cwd: fsRoot, session_id: "test" });
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("not a tracked project");
  });

  test("T2: clean fold (no stale primitives) → OK message, no advisory emit", async () => {
    // No registered primitives in events.jsonl → inspectedCount 0 → stale 0 → silent.
    initGitWithBackingFile("src/backing.ts");
    const result = await ontologyDriftFold({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("OK");
    expect(result.message).not.toContain("ADVISORY");
    const advisory = readEmittedEvents().find((e) => e.payload?.errorClass === "ontology_drift_detected");
    expect(advisory).toBeUndefined();
  });

  test("T3: stale>0 → one ontology_drift_detected advisory carrying comparator + noiseWarning", async () => {
    const backingRel = "src/backing.ts";
    const atopSha = initGitWithBackingFile(backingRel);
    // Move the backing file PAST atopSha so per-file-sha flags the primitive stale.
    fs.writeFileSync(path.join(TMP, backingRel), "v2 — structural change\n");
    git("commit", "-q", "-am", "move backing");
    writeRegisteredPrimitive(atopSha, backingRel);

    const result = await ontologyDriftFold({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("ADVISORY");

    const events = readEmittedEvents();
    const advisory = events.find((e) => e.payload?.errorClass === "ontology_drift_detected");
    expect(advisory).toBeDefined();
    // comparator + noiseWarning surfaced verbatim in the advisory reasoning
    const reasoning = (advisory as { withWhat?: { reasoning?: string } })?.withWhat?.reasoning ?? "";
    expect(reasoning).toContain("per-file-sha");
    expect(reasoning).toContain("noiseWarning:");
    expect(reasoning).toContain("structural-fingerprint");
  });

  test("T4: bypass envvar → skip + drift_fold_bypass_invoked emit", async () => {
    process.env.PALANTIR_MINI_DRIFT_FOLD_BYPASS = "1";
    initGitWithBackingFile("src/backing.ts");
    const result = await ontologyDriftFold({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("PALANTIR_MINI_DRIFT_FOLD_BYPASS=1");
    const bypassEvt = readEmittedEvents().find((e) => e.payload?.errorClass === "drift_fold_bypass_invoked");
    expect(bypassEvt).toBeDefined();
    // bypass path must NOT emit a drift advisory
    expect(readEmittedEvents().find((e) => e.payload?.errorClass === "ontology_drift_detected")).toBeUndefined();
  });

  test("T5: returns a { message } string and never throws (advisory contract)", async () => {
    // No git, no registered primitives — exercises the clean path; the hook must
    // resolve to a string message and never throw (Stop hook never blocks).
    const result = await ontologyDriftFold({ cwd: TMP, session_id: "test" });
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });

  // FIX F2: a stray .palantir-mini marker AT $HOME must not make HOME the drift frame
  // (would detect drift + emit governed events under the wrong root). The marker passes
  // the .palantir-mini existence gate, so only isExcludedProjectRoot stops it.
  test("T6: cwd resolves to an EXCLUDED root ($HOME stray marker) → skip, no drift emit", () => {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
    // Fake HOME fixture — NEVER touch the real $HOME. isExcludedProjectRoot()
    // (lib/project/find-root.ts) reads os.homedir(), which does NOT reflect an
    // in-process `process.env.HOME = ...` reassignment in Bun — only a
    // genuinely separate child process spawned with HOME already set sees it
    // (see ontology-drift-fold-subprocess.ts's header comment). This test runs
    // the hook in such a subprocess instead, and never touches the real HOME.
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "pm-odf-fakehome-"));
    try {
      const marker = path.join(fakeHome, ".palantir-mini");
      fs.mkdirSync(marker, { recursive: true });
      const helperPath = path.join(import.meta.dir, "ontology-drift-fold-subprocess.ts");
      const proc = Bun.spawnSync(
        ["bun", "run", helperPath, JSON.stringify({ cwd: fakeHome, session_id: "test" })],
        { env: { ...process.env, HOME: fakeHome }, stdout: "pipe", stderr: "pipe" },
      );
      const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
      expect(proc.exitCode, `subprocess stderr: ${stderr}`).toBe(0);
      const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
      const result = JSON.parse(stdout) as { message: string };
      expect(result.message).toContain("excluded project root");
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });
});
