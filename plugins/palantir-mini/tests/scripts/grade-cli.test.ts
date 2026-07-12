// palantir-mini — paired test for scripts/grade-cli.ts (P1 unification S3: HOME-side
// consult surface for the canonical rule-26 5-axis grader).
//
// Covers:
//   - a T1-shaped envelope (5-dim full + memoryLayers, no B/C signal) grades T1.
//   - a T0-shaped envelope (5-dim incomplete) grades T0.
//   - malformed JSON on stdin: parseGradeableEnvelope/gradeFromStdin throws (the CLI
//     wrapper maps this to a nonzero exit + {"ok":false,"error"} on stderr).
//   - no side effects: grading a valid envelope in a tmp cwd never creates/appends
//     events.jsonl (this CLI is GRADING ONLY — no emit, no filesystem writes).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseGradeableEnvelope, gradeFromStdin } from "../../scripts/grade-cli";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-grade-cli-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("scripts/grade-cli parseGradeableEnvelope", () => {
  test("rejects malformed JSON", () => {
    expect(() => parseGradeableEnvelope("{not json")).toThrow(/not valid JSON/);
  });

  test("rejects a non-object JSON value", () => {
    expect(() => parseGradeableEnvelope("[]")).toThrow(/must be a single JSON object/);
    expect(() => parseGradeableEnvelope("42")).toThrow(/must be a single JSON object/);
  });

  test("accepts a well-formed envelope (round-trip)", () => {
    const env = parseGradeableEnvelope(
      JSON.stringify({ when: "2026-07-12T00:00:00Z", atopWhich: "deadbeef" }),
    );
    expect(env.when).toBe("2026-07-12T00:00:00Z");
    expect(env.atopWhich).toBe("deadbeef");
  });
});

describe("scripts/grade-cli gradeFromStdin (routes through the canonical autoGradeEnvelope)", () => {
  test("golden grade: 5-dim full + memoryLayers (E), no B/C signal -> T1", async () => {
    const stdin = JSON.stringify({
      when: "2026-07-12T00:00:00Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "grade-cli.test", cwd: "/tmp" },
      byWhom: { identity: "test" },
      withWhat: { memoryLayers: ["procedural"] },
    });

    const grade = await gradeFromStdin(stdin);
    expect(grade).toBe("T1");
  });

  test("5-dim incomplete (missing throughWhich) -> T0", async () => {
    const stdin = JSON.stringify({
      when: "2026-07-12T00:00:00Z",
      atopWhich: "deadbeef",
    });

    const grade = await gradeFromStdin(stdin);
    expect(grade).toBe("T0");
  });

  test("malformed JSON on stdin: gradeFromStdin rejects", async () => {
    const rejection = expect(gradeFromStdin("{not json")).rejects.toThrow(/not valid JSON/) as unknown as Promise<void>;
    await rejection;
  });

  test("no side effects: grading in a tmp cwd never creates events.jsonl", async () => {
    const tmpCwd = makeTmpDir();
    const eventsPath = path.join(tmpCwd, ".palantir-mini", "session", "events.jsonl");
    const stdin = JSON.stringify({
      when: "2026-07-12T00:00:00Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "grade-cli.test", cwd: tmpCwd },
      byWhom: { identity: "test" },
      withWhat: { memoryLayers: ["procedural"] },
    });

    const prevProject = process.env.PALANTIR_MINI_PROJECT;
    process.env.PALANTIR_MINI_PROJECT = tmpCwd;
    try {
      const grade = await gradeFromStdin(stdin);
      expect(grade).toBe("T1");
      expect(fs.existsSync(eventsPath)).toBe(false);
    } finally {
      if (prevProject === undefined) delete process.env.PALANTIR_MINI_PROJECT;
      else process.env.PALANTIR_MINI_PROJECT = prevProject;
    }
  });
});
