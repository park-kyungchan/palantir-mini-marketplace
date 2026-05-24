// palantir-mini v3.7.0 — concurrency-cap-fix helpers (main)
// Coverage: IN_PROGRESS_CAP + collectJsonFiles + loadAllTasks + countInProgressGlobal.
// Decomposed in v3.7.0 A.4: hook integration → -hook.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  IN_PROGRESS_CAP,
  collectJsonFiles,
  loadAllTasks,
  countInProgressGlobal,
} from "../../hooks/concurrency-cap-fix";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ccf-${label}-`));
}

describe("IN_PROGRESS_CAP", () => {
  test("is 2 per rule 13", () => expect(IN_PROGRESS_CAP).toBe(2));
});

describe("collectJsonFiles", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir("cjf"); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  test("returns empty array for nonexistent dir", () => {
    expect(collectJsonFiles("/nonexistent/path")).toEqual([]);
  });

  test("finds json files recursively", () => {
    const sub1 = path.join(tmpDir, "team-a");
    const sub2 = path.join(tmpDir, "team-b", "sub");
    fs.mkdirSync(sub1, { recursive: true });
    fs.mkdirSync(sub2, { recursive: true });
    fs.writeFileSync(path.join(sub1, "tasks.json"), "[]");
    fs.writeFileSync(path.join(sub2, "tasks.json"), "[]");
    fs.writeFileSync(path.join(tmpDir, "root.json"), "{}");
    fs.writeFileSync(path.join(sub1, "not-json.txt"), "x");

    const files = collectJsonFiles(tmpDir);
    expect(files.length).toBe(3);
    expect(files.every((f) => f.endsWith(".json"))).toBe(true);
  });

  test("depth limit prevents infinite recursion", () => {
    let cur = tmpDir;
    for (let i = 0; i < 6; i++) {
      cur = path.join(cur, `d${i}`);
      fs.mkdirSync(cur, { recursive: true });
      fs.writeFileSync(path.join(cur, "t.json"), "{}");
    }
    const files = collectJsonFiles(tmpDir);
    expect(files.length).toBeLessThanOrEqual(5);
  });
});

describe("loadAllTasks", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir("lat"); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  test("loads tasks from array JSON", () => {
    const team = path.join(tmpDir, "phase-x");
    fs.mkdirSync(team, { recursive: true });
    fs.writeFileSync(path.join(team, "tasks.json"), JSON.stringify([
      { id: "t1", owner: "agent-a", status: "in_progress" },
      { id: "t2", owner: "agent-b", status: "completed" },
    ]));
    const tasks = loadAllTasks(tmpDir);
    expect(tasks.length).toBe(2);
  });

  test("loads tasks from object JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "single.json"), JSON.stringify(
      { id: "t1", owner: "x", status: "in_progress" },
    ));
    const tasks = loadAllTasks(tmpDir);
    expect(tasks.length).toBe(1);
  });

  test("skips corrupt files gracefully", () => {
    fs.writeFileSync(path.join(tmpDir, "corrupt.json"), "{ not valid json");
    const tasks = loadAllTasks(tmpDir);
    expect(tasks).toEqual([]);
  });

  test("aggregates across multiple team dirs", () => {
    for (const team of ["team-a", "team-b", "team-c"]) {
      const dir = path.join(tmpDir, team);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "tasks.json"), JSON.stringify([
        { id: `${team}-t1`, owner: "shared-agent", status: "in_progress" },
      ]));
    }
    const tasks = loadAllTasks(tmpDir);
    expect(tasks.length).toBe(3);
  });
});

describe("countInProgressGlobal", () => {
  const tasks = [
    { id: "1", owner: "a1", status: "in_progress" },
    { id: "2", owner: "a1", status: "in_progress" },
    { id: "3", owner: "a2", status: "in_progress" },
    { id: "4", owner: "a1", status: "completed" },
  ];

  test("counts only in_progress for owner", () => {
    expect(countInProgressGlobal(tasks, "a1")).toBe(2);
  });

  test("excludes the task being claimed", () => {
    expect(countInProgressGlobal(tasks, "a1", "1")).toBe(1);
  });

  test("returns 0 for unknown owner", () => {
    expect(countInProgressGlobal(tasks, "ghost")).toBe(0);
  });
});
