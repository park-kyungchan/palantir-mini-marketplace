// palantir-mini — write-scope-runtime-enforce hook tests (PR 5.7 sprint-118)
//
// Acceptance gates:
//   T1. Lead-direct (agentName="claude-code") → exempt, no advisory
//   T2. Subagent with worktree env set, write INSIDE worktree → OK
//   T3. Subagent with worktree env set, write OUTSIDE worktree → advisory (not blocking)
//   T4. Subagent with project-scope.json writableRoot set, write outside → advisory
//   T5. 3 strikes accumulated → 4th attempt blocks with permissionDecision="deny"
//   T6. PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 → no advisory, no block

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { spawnSync } from "child_process";

// ─── Constants ───────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/write-scope-runtime-enforce.ts",
);

const EDIT_TOOL       = "Edit";
const WRITE_TOOL      = "Write";
const MULTI_EDIT_TOOL = "MultiEdit";

// ─── Temp dir + env setup ─────────────────────────────────────────────────────

let TMP: string;
let WORKTREE: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-write-scope-"));
  WORKTREE = path.join(TMP, "worktrees", "my-subagent");
  fs.mkdirSync(WORKTREE, { recursive: true });

  // Create minimal session + .palantir-mini directory
  const palantirDir = path.join(TMP, ".palantir-mini", "session");
  fs.mkdirSync(palantirDir, { recursive: true });

  // Wire env so emit() writes to temp file, not live project
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(palantirDir, "events.jsonl");
  process.env.PALANTIR_MINI_PROJECT     = TMP;

  // Clear relevant env vars
  delete process.env.CLAUDE_WORKTREE_PATH;
  delete process.env.PALANTIR_MINI_WRITE_SCOPE_BYPASS;
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.CLAUDE_WORKTREE_PATH;
  delete process.env.PALANTIR_MINI_WRITE_SCOPE_BYPASS;

  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runHook(
  payload: unknown,
  extraEnv: Record<string, string> = {},
): {
  exitCode: number;
  stdout: string;
  stderr: string;
  result: Record<string, unknown> | null;
} {
  const envWithTmp = { ...process.env, ...extraEnv };
  const res = spawnSync("bun", ["run", HOOK_SCRIPT], {
    input:    JSON.stringify(payload),
    encoding: "utf8",
    env:      envWithTmp,
    timeout:  15_000,
  });
  let parsed: Record<string, unknown> | null = null;
  if (res.stdout?.trim().length > 0) {
    try {
      parsed = JSON.parse(res.stdout.trim()) as Record<string, unknown>;
    } catch { /* leave null */ }
  }
  return {
    exitCode: res.status ?? 0,
    stdout:   res.stdout ?? "",
    stderr:   res.stderr ?? "",
    result:   parsed,
  };
}

/**
 * Build a minimal hook payload for Edit tool.
 */
function buildEditPayload(opts: {
  agentName?:    string;
  subagentType?: string;
  filePath?:     string;
  cwd?:          string;
  sessionId?:    string;
}) {
  const {
    agentName    = "implementer",
    subagentType = "implementer",
    filePath     = path.join(TMP, "some-file.ts"),
    cwd          = TMP,
    sessionId    = "sess-test",
  } = opts;

  return {
    tool_name:      EDIT_TOOL,
    cwd,
    session_id:     sessionId,
    tool_input:     { file_path: filePath },
    byWhom:         { agentName },
    subagent_type:  subagentType,
  };
}

/**
 * Build a MultiEdit payload with multiple file paths.
 */
function buildMultiEditPayload(opts: {
  agentName?: string;
  filePaths?: string[];
  cwd?:       string;
  sessionId?: string;
}) {
  const {
    agentName  = "implementer",
    filePaths  = [path.join(TMP, "file1.ts"), path.join(TMP, "file2.ts")],
    cwd        = TMP,
    sessionId  = "sess-test",
  } = opts;

  return {
    tool_name:     MULTI_EDIT_TOOL,
    cwd,
    session_id:    sessionId,
    tool_input:    { edits: filePaths.map((fp) => ({ file_path: fp })) },
    byWhom:        { agentName },
    subagent_type: agentName,
  };
}

/**
 * Write a project-scope.json with a specific writableRoot.
 */
function writeProjectScope(writableRoot: string): void {
  const scopeDir = path.join(TMP, ".palantir-mini");
  fs.mkdirSync(scopeDir, { recursive: true });
  const scope = {
    projectId:                    "test-project",
    sourcePath:                   TMP,
    writableRoot,
    forbiddenPatterns:            ["src/generated/**"],
    domainAgents:                 ["implementer"],
    pathMarkers:                  [".palantir-mini"],
    projectOntologyAxes:          [],
    surfaceMutationBoundaries:    [],
    seqDataLaneInventory:         [],
    projectOntologyScopeRedesign: {
      id:                "test-redesign",
      status:            "active",
      purpose:           "test",
      validationLadder:  [],
    },
  };
  fs.writeFileSync(
    path.join(scopeDir, "project-scope.json"),
    JSON.stringify(scope, null, 2),
    "utf8",
  );
}

/**
 * Write a strike file with the given count to simulate accumulated strikes.
 */
function writeStrikes(count: number, sessionId = "sess-test"): void {
  const fpath = path.join(TMP, ".palantir-mini", "session", "write-scope-strikes.json");
  fs.writeFileSync(
    fpath,
    JSON.stringify({ count, sessionId, lastViolation: new Date().toISOString() }),
    "utf8",
  );
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("write-scope-runtime-enforce", () => {

  test("T1. Lead-direct (agentName=claude-code) is exempt — no advisory", () => {
    const payload = {
      tool_name:  EDIT_TOOL,
      cwd:        TMP,
      session_id: "sess-test",
      tool_input: { file_path: path.join(os.homedir(), "some-random-file.ts") },
      byWhom:     { agentName: "claude-code" },
      // no subagent_type → Lead-direct
    };

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH: WORKTREE,  // even with worktree set, Lead is exempt
    });

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("EXEMPT");
    expect(
      (result?.hookSpecificOutput as Record<string, unknown> | undefined)?.permissionDecision,
    ).toBeUndefined();
  });

  test("T2. Subagent with worktree env, write INSIDE worktree → OK (no advisory)", () => {
    const fileInsideWorktree = path.join(WORKTREE, "src", "feature.ts");
    const payload = buildEditPayload({ filePath: fileInsideWorktree, cwd: WORKTREE });

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH: WORKTREE,
    });

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("OK");
    // No permissionDecision on OK path
    expect(
      (result?.hookSpecificOutput as Record<string, unknown> | undefined)?.permissionDecision,
    ).toBeUndefined();
  });

  test("T3. Subagent with worktree env, write OUTSIDE worktree → advisory (not blocking)", () => {
    // File is in TMP root, not inside WORKTREE
    const fileOutsideWorktree = path.join(TMP, "escaped-file.ts");
    const payload = buildEditPayload({
      filePath: fileOutsideWorktree,
      cwd:      WORKTREE,   // cwd is inside worktree
    });

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH: WORKTREE,
    });

    expect(exitCode).toBe(0);
    // Advisory → decision is "continue" (not "block")
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("advisory");
    // No blocking permissionDecision on advisory
    expect(
      (result?.hookSpecificOutput as Record<string, unknown> | undefined)?.permissionDecision,
    ).toBeUndefined();
    // additionalContext mentions writableRoot
    const additionalCtx = (
      result?.hookSpecificOutput as Record<string, unknown> | undefined
    )?.additionalContext as string | undefined;
    expect(additionalCtx).toBeTruthy();
    expect(additionalCtx).toContain(WORKTREE);
    expect(additionalCtx).toContain("Strike 1");
  });

  test("T4. Subagent with project-scope.json writableRoot, write outside → advisory", () => {
    // Set up project-scope.json with writableRoot = WORKTREE
    writeProjectScope(WORKTREE);

    // Write to TMP root, which is outside the writableRoot
    const fileOutside = path.join(TMP, "outside.ts");
    const payload = buildEditPayload({
      agentName: "project-implementer",
      filePath:  fileOutside,
      cwd:       TMP,
    });

    // No CLAUDE_WORKTREE_PATH → falls back to project-scope.json
    const { exitCode, result } = runHook(payload);

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("advisory");
    const additionalCtx = (
      result?.hookSpecificOutput as Record<string, unknown> | undefined
    )?.additionalContext as string | undefined;
    expect(additionalCtx).toBeTruthy();
    expect(additionalCtx).toContain(WORKTREE);
  });

  test("T5. 3 strikes accumulated → 4th attempt blocks with permissionDecision='deny'", () => {
    // Pre-seed 3 strikes
    writeStrikes(3, "sess-test");

    // Write outside worktree — this is the 4th violation
    const fileOutside = path.join(TMP, "blocked-file.ts");
    const payload = buildEditPayload({
      filePath:  fileOutside,
      cwd:       WORKTREE,
      sessionId: "sess-test",
    });

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH: WORKTREE,
    });

    expect(exitCode).toBe(0);
    // Blocking
    expect(result?.decision).toBe("block");
    const hookOut = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(hookOut?.permissionDecision).toBe("deny");
    expect(hookOut?.permissionDecisionReason as string).toContain("BLOCK");
    expect(hookOut?.permissionDecisionReason as string).toContain("Strike count = 4");
    expect(result?.message).toContain("BLOCK");
  });

  test("T6. PALANTIR_MINI_WRITE_SCOPE_BYPASS=1 → no advisory, no block regardless of scope", () => {
    // Pre-seed high strike count to ensure bypass actually bypasses
    writeStrikes(10, "sess-test");

    const fileOutside = path.join(os.homedir(), "totally-out-of-scope.ts");
    const payload = buildEditPayload({
      filePath:  fileOutside,
      cwd:       WORKTREE,
      sessionId: "sess-test",
    });

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH:            WORKTREE,
      PALANTIR_MINI_WRITE_SCOPE_BYPASS: "1",
    });

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("BYPASS");
    // No permissionDecision
    expect(
      (result?.hookSpecificOutput as Record<string, unknown> | undefined)?.permissionDecision,
    ).toBeUndefined();
  });

  test("T2b. Lead-direct with no agentName and no subagent_type → exempt", () => {
    const payload = {
      tool_name:  WRITE_TOOL,
      cwd:        TMP,
      session_id: "sess-test",
      tool_input: { file_path: path.join(os.homedir(), "any-file.ts") },
      // no byWhom, no subagent_type → inferred Lead-direct
    };

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH: WORKTREE,
    });

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("EXEMPT");
  });

  test("T3b. MultiEdit with some paths inside and some outside → advisory (outside paths counted)", () => {
    const insidePath  = path.join(WORKTREE, "inside.ts");
    const outsidePath = path.join(TMP, "outside.ts");
    const payload = buildMultiEditPayload({
      filePaths: [insidePath, outsidePath],
      cwd:       WORKTREE,
    });

    const { exitCode, result } = runHook(payload, {
      CLAUDE_WORKTREE_PATH: WORKTREE,
    });

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("advisory");
    const additionalCtx = (
      result?.hookSpecificOutput as Record<string, unknown> | undefined
    )?.additionalContext as string | undefined;
    expect(additionalCtx).toBeTruthy();
    // Should mention only the outside path as violation
    expect(additionalCtx).toContain(outsidePath);
  });

});
