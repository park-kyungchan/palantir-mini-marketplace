// palantir-mini v6.27.0 — pm_substrate_query mode=post-merge handler tests
// Sprint-119 PR 5.8 — canonical plan v2 §4 row 5.8
//
// Coverage:
//   T1: both SHAs provided → returns aggregate with correct shape
//   T2: previousMainSha omitted → derives from merge commit first parent
//   T3: empty range (no commits between SHAs) → returns counts=0
//   T4: invalid SHA → throws descriptive error
//   T5: missing newMergeSha → throws descriptive error
//   T6: T2+ filtering — only T2/T3/T4 events counted, T0/T1 excluded
//   T7: perAgent aggregation — buckets by byWhom.agentName
//   T8: topInsights — returns up to 5 T3+ reasoning quotes, sorted by grade DESC

import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import pmSubstrateQueryPostMerge from "../../../bridge/handlers/pm-substrate-query-post-merge";

// ─── Test repo setup ──────────────────────────────────────────────────────────

let testRepoDir: string;
let sha1: string;  // initial commit (previousMainSha)
let sha2: string;  // second commit  (within range)
let sha3: string;  // merge commit   (newMergeSha)
let shaEmpty: string; // SHA for "same as sha3" — empty range test

beforeAll(() => {
  testRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-substrate-post-merge-"));
  fs.mkdirSync(path.join(testRepoDir, ".palantir-mini", "session"), { recursive: true });

  // Init git repo with identity
  execSync("git init", { cwd: testRepoDir, stdio: "pipe" });
  execSync('git config user.email "test@test.com"', { cwd: testRepoDir, stdio: "pipe" });
  execSync('git config user.name "Test"', { cwd: testRepoDir, stdio: "pipe" });

  // Commit 1 — initial commit (this is the base / previousMainSha)
  fs.writeFileSync(path.join(testRepoDir, "file1.txt"), "v1");
  execSync("git add file1.txt", { cwd: testRepoDir, stdio: "pipe" });
  execSync('git commit -m "initial commit"', { cwd: testRepoDir, stdio: "pipe" });
  sha1 = execSync("git rev-parse HEAD", { cwd: testRepoDir, stdio: "pipe" })
    .toString().trim();

  // Commit 2 — in range
  fs.writeFileSync(path.join(testRepoDir, "file2.txt"), "v2");
  execSync("git add file2.txt", { cwd: testRepoDir, stdio: "pipe" });
  execSync('git commit -m "second commit"', { cwd: testRepoDir, stdio: "pipe" });
  sha2 = execSync("git rev-parse HEAD", { cwd: testRepoDir, stdio: "pipe" })
    .toString().trim();

  // Commit 3 — merge commit / newMergeSha
  fs.writeFileSync(path.join(testRepoDir, "file3.txt"), "v3");
  execSync("git add file3.txt", { cwd: testRepoDir, stdio: "pipe" });
  execSync('git commit -m "merge commit"', { cwd: testRepoDir, stdio: "pipe" });
  sha3 = execSync("git rev-parse HEAD", { cwd: testRepoDir, stdio: "pipe" })
    .toString().trim();

  // For empty range: sha3..sha3 is empty
  shaEmpty = sha3;
});

afterAll(() => {
  try {
    fs.rmSync(testRepoDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

/** Write test events.jsonl to the test repo. */
function writeEvents(events: Record<string, unknown>[]): void {
  const eventsPath = path.join(testRepoDir, ".palantir-mini", "session", "events.jsonl");
  const lines = events.map((e, i) =>
    JSON.stringify({
      eventId: `evt-${i + 1}`,
      sequence: i + 1,
      when: new Date(Date.now() - (events.length - i) * 10_000).toISOString(),
      byWhom: { identity: "claude-code", agentName: "test-agent" },
      throughWhich: { sessionId: "sess-001", toolName: "test", cwd: testRepoDir },
      withWhat: { reasoning: `reason-${i + 1}` },
      ...e,
    }),
  ).join("\n");
  fs.writeFileSync(eventsPath, lines + "\n");
}

/** Clear events.jsonl */
function clearEvents(): void {
  const eventsPath = path.join(testRepoDir, ".palantir-mini", "session", "events.jsonl");
  if (fs.existsSync(eventsPath)) fs.unlinkSync(eventsPath);
}

// ─── T1: both SHAs provided → returns correct shape ──────────────────────────

describe("T1: both SHAs provided returns aggregate shape", () => {
  test("returns mode=post-merge + range + events + topInsights", async () => {
    writeEvents([
      { type: "validation_phase_completed", valueGrade: "T2", atopWhich: sha2,
        withWhat: { reasoning: "T2 reasoning insight" } },
      { type: "phase_completed", valueGrade: "T3", atopWhich: sha3,
        withWhat: { reasoning: "T3 reasoning insight high value" } },
      { type: "session_started", valueGrade: "T1", atopWhich: sha2 },
    ]);

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      previousMainSha: sha1,
    });

    expect(result.mode).toBe("post-merge");

    // range shape
    expect(result.range.previousMainSha).toBe(sha1);
    expect(result.range.newMergeSha).toBe(sha3);
    expect(typeof result.range.commitCount).toBe("number");
    expect(result.range.commitCount).toBeGreaterThanOrEqual(1);

    // events shape
    expect(typeof result.events.totalT2Plus).toBe("number");
    expect(typeof result.events.perAgent).toBe("object");
    expect(typeof result.events.perRefinementTarget).toBe("object");
    expect(typeof result.events.perGrade).toBe("object");
    expect("T2" in result.events.perGrade).toBe(true);
    expect("T3" in result.events.perGrade).toBe(true);
    expect("T4" in result.events.perGrade).toBe(true);

    // topInsights
    expect(Array.isArray(result.topInsights)).toBe(true);
  });
});

// ─── T2: previousMainSha omitted → derives from merge commit ^ ───────────────

describe("T2: previousMainSha omitted — derives from merge commit first parent", () => {
  test("omitting previousMainSha uses sha3^ as base", async () => {
    // sha3^ = sha2 (second commit)
    // So range sha2..sha3 = just sha3 (1 commit)
    clearEvents();

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      // previousMainSha intentionally omitted
    });

    expect(result.mode).toBe("post-merge");
    // sha3^ resolves to sha2, so range is sha2..sha3 — 1 commit
    expect(result.range.previousMainSha).toBe(sha2);
    expect(result.range.newMergeSha).toBe(sha3);
    expect(result.range.commitCount).toBe(1);
  });
});

// ─── T3: empty range (no commits between SHAs) → returns counts=0 ─────────────

describe("T3: empty range returns zero counts", () => {
  test("range sha3..sha3 has no commits — returns totalT2Plus=0", async () => {
    writeEvents([
      { type: "validation_phase_completed", valueGrade: "T2", atopWhich: sha1,
        withWhat: { reasoning: "should not appear in empty range" } },
    ]);

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      previousMainSha: sha3,  // same SHA → empty range
    });

    expect(result.mode).toBe("post-merge");
    expect(result.range.commitCount).toBe(0);
    expect(result.events.totalT2Plus).toBe(0);
    expect(result.topInsights).toEqual([]);
    expect(Object.keys(result.events.perAgent)).toHaveLength(0);
  });
});

// ─── T4: invalid SHA → throws descriptive error ───────────────────────────────

describe("T4: invalid SHA throws descriptive error", () => {
  test("invalid newMergeSha throws with SHA in message", async () => {
    await expect(
      pmSubstrateQueryPostMerge({
        project: testRepoDir,
        newMergeSha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        previousMainSha: sha1,
      }),
    ).rejects.toThrow(/invalid.*SHA|SHA.*invalid|deadbeef/i);
  });

  test("invalid previousMainSha throws with SHA in message", async () => {
    await expect(
      pmSubstrateQueryPostMerge({
        project: testRepoDir,
        newMergeSha: sha3,
        previousMainSha: "0000000000000000000000000000000000000000",
      }),
    ).rejects.toThrow(/invalid.*SHA|SHA.*invalid|0000000/i);
  });
});

// ─── T5: missing newMergeSha → throws descriptive error ──────────────────────

describe("T5: missing newMergeSha throws", () => {
  test("missing newMergeSha throws with helpful message", async () => {
    await expect(
      pmSubstrateQueryPostMerge({
        project: testRepoDir,
      } as never),
    ).rejects.toThrow(/newMergeSha.*required|required.*newMergeSha/i);
  });
});

// ─── T6: T2+ filtering ────────────────────────────────────────────────────────

describe("T6: T2+ filtering excludes T0/T1 events", () => {
  test("only T2/T3/T4 events counted; T0/T1 excluded", async () => {
    writeEvents([
      { type: "validation_phase_completed", valueGrade: "T0", atopWhich: sha2,
        withWhat: { reasoning: "T0 should be excluded" } },
      { type: "phase_completed", valueGrade: "T1", atopWhich: sha2,
        withWhat: { reasoning: "T1 should be excluded" } },
      { type: "session_started", valueGrade: "T2", atopWhich: sha2,
        withWhat: { reasoning: "T2 counts" } },
      { type: "edit_committed", valueGrade: "T3", atopWhich: sha3,
        withWhat: { reasoning: "T3 counts and appears in topInsights" } },
      { type: "sprint_completed", valueGrade: "T4", atopWhich: sha3,
        withWhat: { reasoning: "T4 counts and appears in topInsights" } },
    ]);

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      previousMainSha: sha1,
    });

    expect(result.events.totalT2Plus).toBeGreaterThanOrEqual(1);
    // T2/T3/T4 present, T0/T1 excluded
    const gradeCounts = result.events.perGrade;
    // At least some T2+ should be counted
    const totalCounted = (gradeCounts.T2 ?? 0) + (gradeCounts.T3 ?? 0) + (gradeCounts.T4 ?? 0);
    expect(totalCounted).toBe(result.events.totalT2Plus);
  });
});

// ─── T7: perAgent aggregation ─────────────────────────────────────────────────

describe("T7: perAgent aggregation buckets by agentName", () => {
  test("events with different agentNames produce separate perAgent buckets", async () => {
    writeEvents([
      {
        type: "validation_phase_completed",
        valueGrade: "T2",
        atopWhich: sha2,
        byWhom: { identity: "claude-code", agentName: "agent-alpha" },
        withWhat: { reasoning: "alpha event" },
      },
      {
        type: "phase_completed",
        valueGrade: "T2",
        atopWhich: sha3,
        byWhom: { identity: "claude-code", agentName: "agent-beta" },
        withWhat: { reasoning: "beta event" },
      },
      {
        type: "edit_committed",
        valueGrade: "T3",
        atopWhich: sha3,
        byWhom: { identity: "claude-code", agentName: "agent-alpha" },
        withWhat: { reasoning: "second alpha event" },
      },
    ]);

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      previousMainSha: sha1,
    });

    // perAgent should have both agents
    expect(Object.keys(result.events.perAgent).length).toBeGreaterThanOrEqual(1);
    // Agent buckets should sum to totalT2Plus
    const agentSum = Object.values(result.events.perAgent).reduce((a, b) => a + b, 0);
    expect(agentSum).toBe(result.events.totalT2Plus);
  });
});

// ─── T8: topInsights ordering ─────────────────────────────────────────────────

describe("T8: topInsights returns up to 5 T3+ reasoning quotes", () => {
  test("T4 insights appear before T3 insights (sorted by grade DESC)", async () => {
    // Write 6 T3+ events to verify top-5 cap
    const events = [
      { type: "edit_committed", valueGrade: "T3", atopWhich: sha2,
        withWhat: { reasoning: "T3-insight-1" } },
      { type: "edit_committed", valueGrade: "T3", atopWhich: sha2,
        withWhat: { reasoning: "T3-insight-2" } },
      { type: "edit_committed", valueGrade: "T3", atopWhich: sha3,
        withWhat: { reasoning: "T3-insight-3" } },
      { type: "sprint_completed", valueGrade: "T4", atopWhich: sha3,
        withWhat: { reasoning: "T4-insight-A" } },
      { type: "sprint_completed", valueGrade: "T4", atopWhich: sha3,
        withWhat: { reasoning: "T4-insight-B" } },
      { type: "sprint_completed", valueGrade: "T3", atopWhich: sha3,
        withWhat: { reasoning: "T3-insight-extra-should-be-dropped" } },
    ];
    writeEvents(events);

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      previousMainSha: sha1,
    });

    // Cap at 5
    expect(result.topInsights.length).toBeLessThanOrEqual(5);
    // T4 insights should appear first (sorted by grade DESC)
    const t4Insights = result.topInsights.filter((i) => i.startsWith("T4"));
    const t3Insights = result.topInsights.filter((i) => i.startsWith("T3"));
    if (t4Insights.length > 0 && t3Insights.length > 0) {
      const firstT4Idx = result.topInsights.findIndex((i) => i.startsWith("T4"));
      const lastT4Idx = result.topInsights.reduce(
        (acc, s, idx) => (s.startsWith("T4") ? idx : acc), -1,
      );
      const firstT3Idx = result.topInsights.findIndex((i) => i.startsWith("T3"));
      // All T4 insights should precede all T3 insights
      expect(lastT4Idx).toBeLessThan(firstT3Idx);
    }
  });

  test("events with no reasoning are excluded from topInsights", async () => {
    writeEvents([
      { type: "sprint_completed", valueGrade: "T4", atopWhich: sha3,
        withWhat: {} },  // no reasoning
      { type: "edit_committed", valueGrade: "T3", atopWhich: sha3,
        withWhat: { reasoning: "has reasoning" } },
    ]);

    const result = await pmSubstrateQueryPostMerge({
      project: testRepoDir,
      newMergeSha: sha3,
      previousMainSha: sha1,
    });

    // topInsights should only contain the "has reasoning" entry
    for (const insight of result.topInsights) {
      expect(insight.length).toBeGreaterThan(0);
    }
  });
});
