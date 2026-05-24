/**
 * palantir-mini v2.18.0 — W2 Evaluator Strictness Audit regression.
 *
 * Covers: linearTrend math, probe-row filtering by sprintNumber, criterion
 * grouping by criterionHash, drift verdict logic (score up + failureClass
 * flat/up → drift; score up + failureClass down → clean).
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  linearTrend,
  pmHarnessStrictnessAudit,
} from "../../../bridge/handlers/pm_harness_strictness_audit";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function mkProjectWithEvents(events: unknown[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w2-audit-"));
  tmpDirs.push(dir);
  const sessionDir = path.join(dir, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionDir, "events.jsonl"),
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    "utf8",
  );
  return dir;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("linearTrend", () => {
  test("returns 0 for empty or single-value", () => {
    expect(linearTrend([])).toBe(0);
    expect(linearTrend([5])).toBe(0);
  });

  test("positive trend on rising sequence", () => {
    expect(linearTrend([1, 2, 3, 4, 5])).toBeGreaterThan(0);
  });

  test("negative trend on falling sequence", () => {
    expect(linearTrend([5, 4, 3, 2, 1])).toBeLessThan(0);
  });

  test("zero trend on flat sequence", () => {
    expect(linearTrend([3, 3, 3, 3])).toBe(0);
  });
});

describe("pmHarnessStrictnessAudit verdict", () => {
  test("returns clean when no probes found", async () => {
    const project = mkProjectWithEvents([]);
    const result = await pmHarnessStrictnessAudit({ sprintNumber: 42, projectPath: project });
    expect(result.verdict).toBe("clean");
    expect(result.criteriaAnalyzed).toBe(0);
    expect(result.driftingCriteria).toEqual([]);
  });

  test("detects drift — score rising while failureClassCount flat", async () => {
    const events = [1, 2, 3, 4].map((iter) => ({
      type: "evaluator_strictness_probe",
      payload: {
        sprintNumber: 1,
        iteration: iter,
        criterionHash: "abc123",
        score: 6 + iter * 0.5, // rising: 6.5, 7, 7.5, 8
        evidenceCitationCount: 2,
        failureClassCount: 3, // flat
      },
    }));
    const project = mkProjectWithEvents(events);
    const result = await pmHarnessStrictnessAudit({ sprintNumber: 1, projectPath: project });
    expect(result.verdict).toBe("drift-suspected");
    expect(result.driftingCriteria.length).toBe(1);
    expect(result.driftingCriteria[0]!.criterionHash).toBe("abc123");
    expect(result.driftingCriteria[0]!.scoreTrend).toBeGreaterThan(0.05);
  });

  test("clean when score rises AND failureClassCount drops (legitimate improvement)", async () => {
    const events = [1, 2, 3, 4].map((iter) => ({
      type: "evaluator_strictness_probe",
      payload: {
        sprintNumber: 2,
        iteration: iter,
        criterionHash: "xyz789",
        score: 6 + iter * 0.5,
        evidenceCitationCount: 2,
        failureClassCount: 4 - iter, // dropping: 3, 2, 1, 0
      },
    }));
    const project = mkProjectWithEvents(events);
    const result = await pmHarnessStrictnessAudit({ sprintNumber: 2, projectPath: project });
    expect(result.verdict).toBe("clean");
    expect(result.driftingCriteria).toEqual([]);
  });

  test("ignores probes from other sprints", async () => {
    const events = [
      ...[1, 2, 3].map((iter) => ({
        type: "evaluator_strictness_probe",
        payload: { sprintNumber: 5, iteration: iter, criterionHash: "sprint5-crit", score: 7, evidenceCitationCount: 0, failureClassCount: 0 },
      })),
      {
        type: "evaluator_strictness_probe",
        payload: { sprintNumber: 99, iteration: 1, criterionHash: "other-sprint", score: 10, evidenceCitationCount: 0, failureClassCount: 0 },
      },
    ];
    const project = mkProjectWithEvents(events);
    const result = await pmHarnessStrictnessAudit({ sprintNumber: 5, projectPath: project });
    expect(result.criteriaAnalyzed).toBe(1); // only sprint5-crit, not other-sprint
  });
});
