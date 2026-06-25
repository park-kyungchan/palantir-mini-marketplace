// palantir-mini — replay-promote-grades script tests (rule 26 §Substrate routing)
//
// Drives the offline grade-promotion replay and asserts:
//   1. dryRun: reports transition counts WITHOUT appending any rows.
//   2. real run: appends promotion rows and the counts match the dry run.
//   3. T1→T2 (attestation) and T2→T3 (typed refinementTarget) transitions count.
//   4. append-only: source rows are byte-for-byte unchanged after a real run.
//   5. idempotency: a 2nd real run promotes 0 with no duplicate rows.
//
// Authority: rule 26 §Substrate routing + rule 10 §append-only invariant.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  replayPromoteGrades,
  eventsJsonlPath,
} from "../../scripts/replay-promote-grades";

// ─── Test utilities ──────────────────────────────────────────────────────────

let TMP: string;
let seq = 0;

function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

function eventsFile(): string {
  return eventsJsonlPath(TMP);
}

function writeEvent(ev: Record<string, unknown>): void {
  fs.appendFileSync(eventsFile(), JSON.stringify(ev) + "\n");
}

function readLines(): string[] {
  if (!fs.existsSync(eventsFile())) return [];
  return fs.readFileSync(eventsFile(), "utf8").split("\n").filter((l) => l.trim().length > 0);
}

function readEvents(): Array<Record<string, unknown>> {
  return readLines().map((l) => JSON.parse(l) as Record<string, unknown>);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** T1 event eligible for T1→T2 once an attestation references it. */
function makeT1Source(eventId: string): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "edit_proposed",
    when: new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T1",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "T1 source", memoryLayers: ["working"] },
    payload: { functionName: "noop", params: {}, hypotheticalEdits: [] },
  };
}

/**
 * An on-disk T2 event carrying a typed refinementTarget. promoteT2ToT3 guards
 * on source.valueGrade === "T2", so the T2→T3 transition fires only when the
 * source row is already graded T2 on disk (single-pass library behavior).
 */
function makeT2WithRefinementTarget(eventId: string): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T2",
    byWhom: { identity: "claude-code" },
    withWhat: {
      reasoning: "T2 source with refinement target",
      memoryLayers: ["episodic"],
      refinementTarget: {
        kind: "spec",
        filePathOrRid: "/spec.md",
        description: "promotion candidate",
        confidenceLevel: "high",
      },
    },
    payload: { phase: "post_write", passed: true, errorClass: "t2-src" },
  };
}

/** A passed validation that attests the given source eventId (T1→T2 evidence). */
function makeAttestation(sourceEventId: string): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId: `attest-${sourceEventId}`,
    type: "validation_phase_completed",
    when: new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T2",
    byWhom: { identity: "claude-code" },
    lineageRefs: { actionRid: sourceEventId },
    withWhat: { reasoning: "attestation", memoryLayers: ["episodic"] },
    payload: { phase: "post_write", passed: true, errorClass: "attest" },
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-replay-promote-"));
  setupProject();
  seq = 0;
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("replay-promote-grades — transition counts (dryRun then real)", () => {

  test("dryRun reports T1→T2 transition without appending any row", async () => {
    const sourceId = "src-t1t2";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const linesBefore = readLines().length;

    const dry = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });
    expect(dry.dryRun).toBe(true);
    expect(dry.byTransition.t1ToT2).toBe(1);
    expect(dry.byTransition.t3ToT4).toBe(0);
    expect(dry.promotedCount).toBe(1);

    // No rows appended during a dry run.
    expect(readLines().length).toBe(linesBefore);
  });

  test("real run appends rows; counts match the dry run", async () => {
    const sourceId = "src-real";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const dry = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });
    const linesBefore = readLines().length;

    const real = await replayPromoteGrades({ projectRoot: TMP, dryRun: false });
    expect(real.byTransition.t1ToT2).toBe(dry.byTransition.t1ToT2);
    expect(real.promotedCount).toBe(dry.promotedCount);

    // Real run appended exactly promotedCount rows.
    expect(readLines().length).toBe(linesBefore + real.promotedCount);
  });

  test("T1→T2 (attestation) and T2→T3 (typed refinementTarget) transitions both count; never T3→T4", async () => {
    // Source A: on-disk T1 + attestation → T1→T2.
    const aId = "src-t1";
    writeEvent(makeT1Source(aId));
    writeEvent(makeAttestation(aId));
    // Source B: on-disk T2 + typed refinementTarget → T2→T3.
    const bId = "src-t2";
    writeEvent(makeT2WithRefinementTarget(bId));

    const real = await replayPromoteGrades({ projectRoot: TMP, dryRun: false });
    expect(real.byTransition.t1ToT2).toBe(1);
    expect(real.byTransition.t2ToT3).toBe(1);
    expect(real.byTransition.t3ToT4).toBe(0);

    const after = readEvents();
    const t2Rows = after.filter(
      (e) => (e.payload as Record<string, unknown>)?.promotedFrom === "T1" &&
             (e.lineageRefs as Record<string, unknown>)?.actionRid === aId,
    );
    const t3Rows = after.filter(
      (e) => (e.payload as Record<string, unknown>)?.promotedFrom === "T2" &&
             (e.lineageRefs as Record<string, unknown>)?.actionRid === bId,
    );
    expect(t2Rows.length).toBe(1);
    expect(t3Rows.length).toBe(1);
  });

  test("append-only: source rows are byte-for-byte unchanged after a real run", async () => {
    const sourceId = "src-append-only";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const linesBefore = readLines();
    await replayPromoteGrades({ projectRoot: TMP, dryRun: false });
    const linesAfter = readLines();

    // Every original line must still be present verbatim and in order.
    for (let i = 0; i < linesBefore.length; i++) {
      expect(linesAfter[i]).toBe(linesBefore[i]);
    }
    // And new rows were appended after them.
    expect(linesAfter.length).toBeGreaterThan(linesBefore.length);
  });

  test("idempotency: a 2nd real run promotes 0 with no duplicate rows", async () => {
    const sourceId = "src-idem";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const first = await replayPromoteGrades({ projectRoot: TMP, dryRun: false });
    expect(first.promotedCount).toBeGreaterThan(0);
    const linesAfterFirst = readLines().length;

    const second = await replayPromoteGrades({ projectRoot: TMP, dryRun: false });
    expect(second.promotedCount).toBe(0);
    expect(second.byTransition.t1ToT2).toBe(0);
    expect(readLines().length).toBe(linesAfterFirst);
  });
});
