// palantir-mini v4.14.0 — task-completed-enrichment hook tests (sprint-062 W6-β C5)
//
// Coverage:
//   T1: TaskUpdate status=completed with subject → enrichment event emitted
//   T2: TaskUpdate status=in_progress → no-op (no enrichment event)
//   T3: non-TaskUpdate tool → no-op
//   T4: TaskUpdate completed with description → reasoning includes truncated description
//   T5: missing tool_input fields → graceful fallback (no crash)
//   T6: malformed JSON input → exits 0 (advisory, never blocks)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as childProcess from "child_process";

// ─── Test utilities ──────────────────────────────────────────────────────────

let TMP: string;

function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

function eventsPath(): string {
  return path.join(TMP, ".palantir-mini", "session", "events.jsonl");
}

function readEmittedEvents(): Array<Record<string, unknown>> {
  const ep = eventsPath();
  if (!fs.existsSync(ep)) return [];
  return fs
    .readFileSync(ep, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; }
    })
    .filter((v): v is Record<string, unknown> => v !== null);
}

/**
 * Run task-completed-enrichment as a subprocess, feeding hookPayload as stdin.
 * Returns { stdout, stderr, exitCode }.
 */
function runHook(hookPayload: Record<string, unknown>): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const hookPath = path.resolve(
    __dirname,
    "../../hooks/task-completed-enrichment.ts",
  );

  const result = childProcess.spawnSync(
    "bun",
    ["run", hookPath],
    {
      input:   JSON.stringify(hookPayload),
      env: {
        ...process.env,
        PALANTIR_MINI_EVENTS_FILE: eventsPath(),
        PALANTIR_MINI_PROJECT:     TMP,
      },
      encoding: "utf8",
      timeout:  10_000,
    },
  );

  return {
    stdout:   result.stdout ?? "",
    stderr:   result.stderr ?? "",
    exitCode: result.status ?? 0,
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-tce-"));
  setupProject();
});

afterEach(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("task-completed-enrichment hook", () => {
  test("T1: TaskUpdate completed with subject → enrichment event emitted", () => {
    const payload = {
      tool_name:  "TaskUpdate",
      tool_input: {
        taskId:  "task-abc",
        status:  "completed",
        subject: "implement validate-substrate-firing handler",
      },
      session_id: "test-session",
      cwd:        TMP,
    };

    const { exitCode } = runHook(payload);
    expect(exitCode).toBe(0);

    const events = readEmittedEvents();
    const enrichmentEvt = events.find(
      (e) => (e.payload as Record<string, unknown>)?.errorClass === "task_completed_enriched",
    );
    expect(enrichmentEvt).toBeDefined();

    // Verify withWhat.reasoning is present and mentions the subject
    const withWhat = enrichmentEvt?.withWhat as Record<string, unknown> | undefined;
    expect(typeof withWhat?.reasoning).toBe("string");
    expect((withWhat?.reasoning as string)).toContain("implement validate-substrate-firing handler");
    expect((withWhat?.reasoning as string)).toContain("completed");
  });

  test("T2: TaskUpdate status=in_progress → no enrichment event emitted", () => {
    const payload = {
      tool_name:  "TaskUpdate",
      tool_input: {
        taskId: "task-xyz",
        status: "in_progress",
      },
      cwd: TMP,
    };

    const { exitCode } = runHook(payload);
    expect(exitCode).toBe(0);

    const events = readEmittedEvents();
    const enrichmentEvt = events.find(
      (e) => (e.payload as Record<string, unknown>)?.errorClass === "task_completed_enriched",
    );
    expect(enrichmentEvt).toBeUndefined();
  });

  test("T3: non-TaskUpdate tool (Edit) → no enrichment event emitted", () => {
    const payload = {
      tool_name:  "Edit",
      tool_input: { file_path: "/tmp/foo.ts" },
      cwd:        TMP,
    };

    const { exitCode } = runHook(payload);
    expect(exitCode).toBe(0);

    const events = readEmittedEvents();
    const enrichmentEvt = events.find(
      (e) => (e.payload as Record<string, unknown>)?.errorClass === "task_completed_enriched",
    );
    expect(enrichmentEvt).toBeUndefined();
  });

  test("T4: TaskUpdate completed with description → reasoning includes description snippet", () => {
    const payload = {
      tool_name:  "TaskUpdate",
      tool_input: {
        taskId:      "task-def",
        status:      "completed",
        subject:     "write paired tests",
        description: "Write bun:test tests for validate-substrate-firing and task-completed-enrichment hooks. Covers 11 and 6 test cases respectively.",
      },
      cwd: TMP,
    };

    const { exitCode } = runHook(payload);
    expect(exitCode).toBe(0);

    const events = readEmittedEvents();
    const enrichmentEvt = events.find(
      (e) => (e.payload as Record<string, unknown>)?.errorClass === "task_completed_enriched",
    );
    expect(enrichmentEvt).toBeDefined();

    const withWhat = enrichmentEvt?.withWhat as Record<string, unknown> | undefined;
    const reasoning = withWhat?.reasoning as string | undefined;
    expect(reasoning).toBeDefined();
    // Description should appear (truncated to 120 chars)
    expect(reasoning).toContain("Write bun:test tests");
  });

  test("T5: missing tool_input fields → no crash, exit 0", () => {
    const payload = {
      tool_name:  "TaskUpdate",
      tool_input: { status: "completed" }, // no subject, no taskId
      cwd:        TMP,
    };

    const { exitCode, stderr } = runHook(payload);
    expect(exitCode).toBe(0);
    // stderr may have a note but should not throw an unhandled error
    expect(stderr).not.toContain("Unhandled");
  });

  test("T6: malformed JSON stdin → exits 0 (advisory, never blocks)", () => {
    const hookPath = path.resolve(
      __dirname,
      "../../hooks/task-completed-enrichment.ts",
    );

    const result = childProcess.spawnSync(
      "bun",
      ["run", hookPath],
      {
        input: "not valid json {{{{",
        env: {
          ...process.env,
          PALANTIR_MINI_EVENTS_FILE: eventsPath(),
          PALANTIR_MINI_PROJECT:     TMP,
        },
        encoding: "utf8",
        timeout:  10_000,
      },
    );
    expect(result.status ?? 0).toBe(0);
  });

  test("T7: enriched event has validation_phase_completed type and runtime phase", () => {
    const payload = {
      tool_name:  "TaskUpdate",
      tool_input: {
        taskId:  "task-ghi",
        status:  "completed",
        subject: "close sprint-062 W6-β",
      },
      cwd: TMP,
    };

    runHook(payload);

    const events = readEmittedEvents();
    const enrichmentEvt = events.find(
      (e) => (e.payload as Record<string, unknown>)?.errorClass === "task_completed_enriched",
    );
    expect(enrichmentEvt?.type).toBe("validation_phase_completed");
    const p = enrichmentEvt?.payload as Record<string, unknown> | undefined;
    expect(p?.phase).toBe("runtime");
    expect(p?.passed).toBe(true);
  });
});
