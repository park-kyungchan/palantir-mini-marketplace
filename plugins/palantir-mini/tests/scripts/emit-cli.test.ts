// palantir-mini — paired test for scripts/emit-cli.ts (P1 unification S2 cross-tree
// contract surface: reads ONE envelope JSON object from stdin, routes through
// scripts/log.ts emit()).
//
// Covers:
//   - valid envelope: sequence returned, row appended, valueGrade stamped.
//   - 5-dim-incomplete envelope (missing toolName/cwd): documents Path-B's existing
//     T0 policy — scripts/log.ts emit() has NO T0 hard-reject (unlike the MCP Path-A
//     bridge/handlers/emit-event.ts, which only rejects under
//     PALANTIR_MINI_VALUE_GRADE_ENFORCE=1); the row is still appended, graded "T0".
//   - malformed JSON: parseEnvelope / emitFromStdin throws (CLI wrapper maps this
//     to a nonzero exit + {"ok":false,"error"} on stderr).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseEnvelope, emitFromStdin } from "../../scripts/emit-cli";

const tmpDirs: string[] = [];

/** TEMP project lane: <tmp>/.palantir-mini/session marker dir, per repo test discipline. */
function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-emit-cli-"));
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function readRows(root: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(eventsPath(root), "utf8");
  return raw
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("scripts/emit-cli parseEnvelope", () => {
  test("rejects malformed JSON", () => {
    expect(() => parseEnvelope("{not json")).toThrow(/not valid JSON/);
  });

  test("rejects a non-object JSON value", () => {
    expect(() => parseEnvelope("[]")).toThrow(/must be a single JSON object/);
    expect(() => parseEnvelope("42")).toThrow(/must be a single JSON object/);
  });

  test("rejects a missing/empty type", () => {
    expect(() => parseEnvelope(JSON.stringify({ payload: {} }))).toThrow(/type must be a non-empty string/);
    expect(() => parseEnvelope(JSON.stringify({ type: "", payload: {} }))).toThrow(/type must be a non-empty string/);
  });

  test("rejects a missing payload", () => {
    expect(() => parseEnvelope(JSON.stringify({ type: "session_started" }))).toThrow(/payload must be an object/);
  });

  test("accepts a well-formed envelope (round-trip)", () => {
    const env = parseEnvelope(
      JSON.stringify({ type: "session_started", payload: { model: "x" }, toolName: "t", cwd: "/tmp" }),
    );
    expect(env.type).toBe("session_started");
    expect(env.toolName).toBe("t");
  });
});

describe("scripts/emit-cli emitFromStdin (routes through scripts/log.ts emit())", () => {
  test("valid envelope: sequence returned, row appended, valueGrade stamped", async () => {
    const project = makeTmpProject();
    const stdin = JSON.stringify({
      type: "session_started",
      payload: { model: "test-model", effort: "low" },
      toolName: "emit-cli.test",
      cwd: project,
      sessionId: "sess-emit-cli",
      memoryLayers: ["procedural"],
      reasoning: "emit-cli valid-envelope coverage",
    });

    const seq = await emitFromStdin(stdin);
    expect(typeof seq).toBe("number");

    const rows = readRows(project);
    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(row["type"]).toBe("session_started");
    expect(row["sequence"]).toBe(seq);
    // 5-dim + memoryLayers (E), no B/C signal → T1.
    expect(row["valueGrade"]).toBe("T1");
  });

  test("5-dim-incomplete envelope (missing toolName/cwd): Path-B policy is append-anyway, graded T0", async () => {
    const project = makeTmpProject();
    // No toolName/cwd → throughWhich.toolName/cwd are undefined → autoGradeEnvelope's
    // dim5 check fails → T0. emit() (Path B) has no T0 hard-reject (that gate only
    // exists on the MCP Path-A bridge/handlers/emit-event.ts, and only under
    // PALANTIR_MINI_VALUE_GRADE_ENFORCE=1) — the row is appended regardless.
    const stdin = JSON.stringify({
      type: "session_started",
      payload: { model: "test-model" },
    });

    const prevProject = process.env.PALANTIR_MINI_PROJECT;
    process.env.PALANTIR_MINI_PROJECT = project;
    try {
      const seq = await emitFromStdin(stdin);
      expect(typeof seq).toBe("number");

      const rows = readRows(project);
      expect(rows.length).toBe(1);
      expect(rows[0]!["valueGrade"]).toBe("T0");
    } finally {
      if (prevProject === undefined) delete process.env.PALANTIR_MINI_PROJECT;
      else process.env.PALANTIR_MINI_PROJECT = prevProject;
    }
  });

  test("malformed JSON on stdin: emitFromStdin rejects, nothing appended", async () => {
    const project = makeTmpProject();
    // bun-types under-types `.rejects.toThrow()` as `void` (not `Promise<void>`),
    // so `await` on the bare expression is flagged "has no effect on the type" —
    // the cast makes the real runtime Promise honest to the type checker while
    // keeping the actual awaited assertion (needed so a match failure surfaces
    // as a clean test failure here, not an unhandled rejection after return).
    const rejection = expect(emitFromStdin("{not json")).rejects.toThrow(/not valid JSON/) as unknown as Promise<void>;
    await rejection;
    expect(fs.existsSync(eventsPath(project))).toBe(false);
  });
});
