// palantir-mini v3.2.0 — session-start hook tests
// G6: live `git branch --show-current` resolution
// N3: previously untested hook — first coverage in v3.2.0

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import {
  liveBranch,
  buildFoldTriggerContext,
  selectFoldTriggerContext,
} from "../../hooks/session-start";
import { markPending } from "../../lib/second-brain/pending-fold";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ss-${label}-`));
}

describe("liveBranch (G6)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("lb"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("non-git cwd → null (advisory skip)", () => {
    expect(liveBranch(tmp)).toBeNull();
  });

  test("git repo on a fresh branch → branch name", () => {
    execSync("git init --quiet --initial-branch=main", { cwd: tmp });
    execSync('git config user.email "test@test"', { cwd: tmp });
    execSync('git config user.name "test"', { cwd: tmp });
    fs.writeFileSync(path.join(tmp, "README.md"), "x");
    execSync("git add -A && git commit --quiet -m init", { cwd: tmp, shell: "/bin/bash" } as never);
    execSync("git checkout --quiet -b feat/some-branch", { cwd: tmp });

    expect(liveBranch(tmp)).toBe("feat/some-branch");
  });

  test("detached HEAD → null (no current branch)", () => {
    execSync("git init --quiet --initial-branch=main", { cwd: tmp });
    execSync('git config user.email "test@test"', { cwd: tmp });
    execSync('git config user.name "test"', { cwd: tmp });
    fs.writeFileSync(path.join(tmp, "README.md"), "x");
    execSync("git add -A && git commit --quiet -m init", { cwd: tmp, shell: "/bin/bash" } as never);
    const sha = execSync("git rev-parse HEAD", { cwd: tmp, encoding: "utf8" }).trim();
    execSync(`git checkout --quiet ${sha}`, { cwd: tmp });

    // detached HEAD: `git branch --show-current` outputs empty → liveBranch returns null
    expect(liveBranch(tmp)).toBeNull();
  });

  test("nonexistent cwd → null (graceful)", () => {
    expect(liveBranch("/no/such/path")).toBeNull();
  });
});

describe("second-brain fold-trigger (P1-2 detect+inject)", () => {
  const SAVE = [
    "PALANTIR_MINI_PROJECT",
    "PALANTIR_MINI_EVENTS_FILE",
    "PALANTIR_MINI_EVENTS_FILE_FORCE",
    "PALANTIR_MINI_SESSION_START_EAGER",
    "HOME",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  const dirs: string[] = [];
  const fakeHomeDirs: string[] = [];

  beforeEach(() => {
    for (const k of SAVE) saved[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of SAVE) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k]!;
    }
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
    for (const h of fakeHomeDirs.splice(0)) { try { fs.rmSync(h, { recursive: true, force: true }); } catch { /* best-effort */ } }
  });

  /**
   * Tracked project with stub engine + transcript on disk. Returns
   * {root, sessionId, fakeHome}. sessionStart()/the second-brain-fold hook
   * resolve the transcript path via os.homedir(), which does NOT reflect an
   * in-process `process.env.HOME = ...` reassignment in Bun (see
   * session-start-subprocess.ts's header comment) — so this fixture never
   * sets process.env.HOME itself; callers that need the hook to see the
   * fixture pass the returned `fakeHome` explicitly as the `HOME` env var of
   * a child-process invocation instead, and the real ~/.claude/projects/** is
   * never touched.
   */
  function seed(): { root: string; sessionId: string; fakeHome: string } {
    const root = makeTmpDir("sbf");
    dirs.push(root);
    fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
    fs.mkdirSync(path.join(root, "second-brain", "scripts"), { recursive: true });
    fs.writeFileSync(path.join(root, "second-brain", "scripts", "fold.ts"), "// stub\n", "utf8");

    const fakeHome = makeTmpDir("sbf-home");
    fakeHomeDirs.push(fakeHome);

    const sessionId = `sess-st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const slug = path.resolve(root).split(path.sep).join("-");
    const projectsDir = path.join(fakeHome, ".claude", "projects", slug);
    fs.mkdirSync(projectsDir, { recursive: true });
    const transcript = path.join(projectsDir, sessionId + ".jsonl");
    fs.writeFileSync(transcript, '{"type":"user"}\n', "utf8");
    return { root, sessionId, fakeHome };
  }

  function setEnv(root: string): void {
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";
    process.env.PALANTIR_MINI_SESSION_START_EAGER = "1";
  }

  test("buildFoldTriggerContext includes [second-brain], the sessionId, and the projectRoot", () => {
    const line = buildFoldTriggerContext(
      [{ sessionId: "abc", transcriptPath: "/tmp/abc.jsonl", bookmarkedAt: "x", runtime: "claude-code" }],
      "/proj/root",
    );
    expect(line).toContain("[second-brain]");
    expect(line).toContain("abc");
    expect(line).toContain("/proj/root");
    expect(line).toContain("palantir-mini:second-brain-fold");
  });

  test("selectFoldTriggerContext (P2-9): supported capability → native Agent-tool trigger", () => {
    const pend = [{ sessionId: "abc", transcriptPath: "/tmp/abc.jsonl", bookmarkedAt: "x", runtime: "claude-code" as const }];
    const line = selectFoldTriggerContext(pend, "/proj/root", { supported: true, version: "2.1.186", reason: "ok" });
    expect(line).toContain("palantir-mini:second-brain-fold subagent (Agent tool)");
    expect(line).not.toContain("does not support native/background subagent dispatch");
  });

  test("selectFoldTriggerContext (P2-9): unsupported capability → CLI engine-direct fallback trigger", () => {
    const pend = [{ sessionId: "abc", transcriptPath: "/tmp/abc.jsonl", bookmarkedAt: "x", runtime: "claude-code" as const }];
    const line = selectFoldTriggerContext(pend, "/proj/root", { supported: false, version: null, reason: "cli-unavailable" });
    expect(line).toContain("[second-brain]");
    expect(line).toContain("does not support native/background subagent dispatch");
    expect(line).toContain("second-brain/scripts/fold.ts");
    expect(line).not.toContain("(Agent tool)");
  });

  // sessionStart() resolves the transcript path via os.homedir(), which does
  // NOT reflect an in-process `process.env.HOME = ...` reassignment in Bun —
  // run it in a genuinely separate child process instead (see
  // session-start-subprocess.ts's header comment).
  function runSessionStartWithHome(payload: unknown, home: string): { hookSpecificOutput?: { hookEventName?: string; additionalContext?: string } } {
    const helperPath = path.join(import.meta.dir, "session-start-subprocess.ts");
    const proc = Bun.spawnSync(["bun", "run", helperPath, JSON.stringify(payload)], {
      env: { ...process.env, HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
    expect(proc.exitCode, `subprocess stderr: ${stderr}`).toBe(0);
    const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
    return JSON.parse(stdout);
  }

  test("eager + engine + unfolded transcript + pending bookmark → additionalContext names the session", () => {
    const { root, sessionId, fakeHome } = seed();
    setEnv(root);
    markPending(root, { sessionId, transcriptPath: `/x/${sessionId}.jsonl`, bookmarkedAt: "x", runtime: "monitor" });

    const result = runSessionStartWithHome({ cwd: root, session_id: "live-sess" }, fakeHome);
    // FIX-FOLD-WIRING: the fold-trigger rides nested at
    // hookSpecificOutput.additionalContext (hookEventName "SessionStart"); a
    // top-level additionalContext would be silently dropped by Claude.
    expect(result.hookSpecificOutput?.hookEventName).toBe("SessionStart");
    expect(typeof result.hookSpecificOutput?.additionalContext).toBe("string");
    expect(result.hookSpecificOutput?.additionalContext).toContain("[second-brain]");
    expect(result.hookSpecificOutput?.additionalContext).toContain(sessionId);
    expect(result.hookSpecificOutput?.additionalContext).toContain(root);
  });

  test("fold trigger fires WITHOUT eager env (P1 eager-gate fix regression guard)", () => {
    const { root, sessionId, fakeHome } = seed();
    // Set ONLY the events env — deliberately NOT PALANTIR_MINI_SESSION_START_EAGER.
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";
    delete process.env.PALANTIR_MINI_SESSION_START_EAGER;
    markPending(root, { sessionId, transcriptPath: `/x/${sessionId}.jsonl`, bookmarkedAt: "x", runtime: "monitor" });

    const result = runSessionStartWithHome({ cwd: root, session_id: "live-sess" }, fakeHome);
    expect(result.hookSpecificOutput?.hookEventName).toBe("SessionStart");
    expect(typeof result.hookSpecificOutput?.additionalContext).toBe("string");
    expect(result.hookSpecificOutput?.additionalContext).toContain("[second-brain]");
    expect(result.hookSpecificOutput?.additionalContext).toContain(sessionId);
  });

  test("A2-prior line is pushed UNCONDITIONALLY (eager flag OFF) — Sink-1 READ", () => {
    const { root, fakeHome } = seed();
    // Deliberately do NOT set PALANTIR_MINI_SESSION_START_EAGER — A2-prior must
    // still fire (mirrors the unconditional second-brain fold-detect push).
    process.env.PALANTIR_MINI_PROJECT = root;
    const epath = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE = epath;
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";
    delete process.env.PALANTIR_MINI_SESSION_START_EAGER;

    // A freshly-emitted T2 lead_decision that promotion has NOT yet graded T3+.
    // The A2-prior BY-TYPE branch must still surface it NEXT session.
    fs.writeFileSync(
      epath,
      JSON.stringify({
        when: "2026-06-25T00:00:00.000Z",
        atopWhich: "x",
        throughWhich: { sessionId: "s", toolName: "t", cwd: root },
        byWhom: { identity: "claude-code" },
        sequence: 1,
        type: "lead_decision",
        valueGrade: "T2",
        withWhat: { reasoning: "delegate STAGE 4 to opus subagent" },
      }) + "\n",
      "utf8",
    );

    const result = runSessionStartWithHome({ cwd: root, session_id: "live-sess" }, fakeHome);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("[A2-prior]");
    expect(ctx).toContain("lead_decision");
  });

  test("a session already in foldedSessions is NOT named (listPending exclusion)", () => {
    const { root, sessionId, fakeHome } = seed();
    setEnv(root);
    markPending(root, { sessionId, transcriptPath: `/x/${sessionId}.jsonl`, bookmarkedAt: "x", runtime: "monitor" });
    // mark it folded in the engine manifest
    fs.writeFileSync(
      path.join(root, "second-brain", "manifest.json"),
      JSON.stringify({ foldedSessions: { [sessionId]: { foldedAt: "x", nodeCount: 0, edgeCount: 0 } } }),
      "utf8",
    );

    const result = runSessionStartWithHome({ cwd: root, session_id: "live-sess" }, fakeHome);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain(sessionId);
  });

  test("no unfolded transcripts → no [second-brain] line", () => {
    const root = makeTmpDir("sbf-empty");
    dirs.push(root);
    fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
    fs.mkdirSync(path.join(root, "second-brain", "scripts"), { recursive: true });
    fs.writeFileSync(path.join(root, "second-brain", "scripts", "fold.ts"), "// stub\n", "utf8");
    // ensure no leftover transcripts for this fresh slug, under a fake HOME
    // fixture (never the real ~/.claude/projects/**) — resolved via a
    // subprocess invocation (see session-start-subprocess.ts's header
    // comment for why an in-process process.env.HOME reassignment does not
    // work in Bun).
    const fakeHome = makeTmpDir("sbf-empty-home");
    fakeHomeDirs.push(fakeHome);
    const slug = path.resolve(root).split(path.sep).join("-");
    const projectsDir = path.join(fakeHome, ".claude", "projects", slug);
    fs.mkdirSync(projectsDir, { recursive: true });
    setEnv(root);

    const result = runSessionStartWithHome({ cwd: root, session_id: "live-sess" }, fakeHome);
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("[second-brain]");
  });
});
