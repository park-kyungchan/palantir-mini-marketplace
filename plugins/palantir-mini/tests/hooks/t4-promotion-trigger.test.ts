// palantir-mini — t4-promotion-trigger hook tests (Sink-2 closure)
//
// The Stop hook now runs the offline grade-promotion replay at session end,
// closing T1→T2→T3 promotions (the 0-promotedFrom Sink-2 gap). Coverage:
//   1. T1 row + matching attestation → appends a promotedFrom=T1 row, with the
//      SOURCE row byte-for-byte unchanged (rule 10 §append-only invariant).
//   2. Idempotency: a 2nd consecutive run promotes 0 and writes no duplicates.
//   3. Solo-dev ceiling: the trigger NEVER promotes T3→T4 and NEVER writes a
//      kLlmConsensus marker on single-vendor input.
//   4. Audited bypass: PALANTIR_MINI_PROMOTE_DISABLE=1 → no promotion rows.
//
// Strategy: drive the real hook as a subprocess (it reads stdin + process.exit),
// feeding a Stop payload and a fixture events.jsonl, then assert on the file.

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
  // The hook reads/promotes against <project>/.palantir-mini/session/events.jsonl
  // directly (replayPromoteGrades uses eventsJsonlPath, not the env override).
  return path.join(TMP, ".palantir-mini", "session", "events.jsonl");
}

function readEventLines(): string[] {
  const ep = eventsPath();
  if (!fs.existsSync(ep)) return [];
  return fs.readFileSync(ep, "utf8").split("\n").filter((l) => l.trim().length > 0);
}

function readEvents(): Array<Record<string, unknown>> {
  return readEventLines().map((l) => JSON.parse(l) as Record<string, unknown>);
}

function writeEvent(ev: Record<string, unknown>): void {
  fs.appendFileSync(eventsPath(), JSON.stringify(ev) + "\n");
}

/**
 * Run the t4-promotion-trigger hook as a subprocess with a Stop payload.
 * PALANTIR_MINI_EVENTS_FILE points emit()'s summary append at the same fixture
 * file so the in-band summary event lands alongside the promotion rows.
 */
function runHook(extraEnv: Record<string, string> = {}): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const hookPath = path.resolve(__dirname, "../../hooks/t4-promotion-trigger.ts");
  const result = childProcess.spawnSync("bun", ["run", hookPath], {
    input: JSON.stringify({ cwd: TMP, session_id: "s-test", reason: "end" }),
    env: {
      ...process.env,
      PALANTIR_MINI_PROJECT:     TMP,
      PALANTIR_MINI_EVENTS_FILE: eventsPath(),
      PALANTIR_MINI_EVENTS_FILE_FORCE: "1",
      ...extraEnv,
    },
    encoding: "utf8",
    timeout: 20_000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 0,
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

let seq = 0;

/** A T1 source event eligible for T1→T2 once an attestation references it. */
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
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-t4pt-"));
  setupProject();
  seq = 0;
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("t4-promotion-trigger — Sink-2 closure (append-only T1→T2→T3 replay)", () => {

  test("T1 source + matching attestation → appends promotedFrom=T1 row; source byte-unchanged", () => {
    const sourceId = "evt-src-1";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    // Capture the exact source line BEFORE the hook runs.
    const linesBefore = readEventLines();
    const sourceLineBefore = linesBefore.find((l) => {
      const o = JSON.parse(l) as Record<string, unknown>;
      return o.eventId === sourceId && !(o.payload as Record<string, unknown>)?.promotedFrom;
    });
    expect(sourceLineBefore).toBeDefined();

    const r = runHook();
    expect(r.exitCode).toBe(0);

    const after = readEvents();
    // A new promotion row referencing the source must now exist.
    const promotionRows = after.filter(
      (e) =>
        (e.payload as Record<string, unknown>)?.promotedFrom === "T1" &&
        (e.lineageRefs as Record<string, unknown>)?.actionRid === sourceId,
    );
    expect(promotionRows.length).toBe(1);
    expect(promotionRows[0]!.valueGrade).toBe("T2");

    // The ORIGINAL source line must be byte-for-byte unchanged (append-only).
    const linesAfter = readEventLines();
    const sourceLineAfter = linesAfter.find((l) => {
      const o = JSON.parse(l) as Record<string, unknown>;
      return o.eventId === sourceId && !(o.payload as Record<string, unknown>)?.promotedFrom;
    });
    expect(sourceLineAfter).toBe(sourceLineBefore!);
  });

  test("idempotency: 2nd consecutive run promotes 0 and writes no duplicate promotion rows", () => {
    const sourceId = "evt-src-2";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const r1 = runHook();
    expect(r1.exitCode).toBe(0);
    const afterFirst = readEvents();
    const promoRowsFirst = afterFirst.filter(
      (e) => (e.payload as Record<string, unknown>)?.promotedFrom === "T1" &&
             (e.lineageRefs as Record<string, unknown>)?.actionRid === sourceId,
    );
    expect(promoRowsFirst.length).toBe(1);

    const r2 = runHook();
    expect(r2.exitCode).toBe(0);
    // The 2nd run's stderr digest must report promoted=0 (idempotent).
    expect(r2.stderr).toContain("promoted (appended rows): 0");

    const afterSecond = readEvents();
    const promoRowsSecond = afterSecond.filter(
      (e) => (e.payload as Record<string, unknown>)?.promotedFrom === "T1" &&
             (e.lineageRefs as Record<string, unknown>)?.actionRid === sourceId,
    );
    // Still exactly one promotion row — no duplicate appended.
    expect(promoRowsSecond.length).toBe(1);
  });

  test("solo-dev ceiling: never promotes T3→T4 and never writes a kLlmConsensus marker", () => {
    const sourceId = "evt-src-3";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const r = runHook();
    expect(r.exitCode).toBe(0);

    const after = readEvents();
    // No T3→T4 promotion row may exist.
    const t3ToT4Rows = after.filter(
      (e) => (e.payload as Record<string, unknown>)?.promotedFrom === "T3",
    );
    expect(t3ToT4Rows.length).toBe(0);

    // No event may carry a kLlmConsensus marker (single-vendor input).
    const consensusRows = after.filter((e) => {
      const ww = e.withWhat as Record<string, unknown> | undefined;
      return ww?.kLlmConsensus !== undefined;
    });
    expect(consensusRows.length).toBe(0);

    // The stderr digest must report zero T3→T4 transitions.
    expect(r.stderr).toContain("T3→T4: 0");
  });

  test("audited bypass: PALANTIR_MINI_PROMOTE_DISABLE=1 → no promotion rows appended", () => {
    const sourceId = "evt-src-4";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const r = runHook({ PALANTIR_MINI_PROMOTE_DISABLE: "1" });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("bypassed (PALANTIR_MINI_PROMOTE_DISABLE=1)");

    const after = readEvents();
    const promoRows = after.filter(
      (e) => (e.payload as Record<string, unknown>)?.promotedFrom === "T1",
    );
    expect(promoRows.length).toBe(0);
  });

  test("emits ONE value_grade_promotion_completed summary event (in-band emit)", () => {
    const sourceId = "evt-src-5";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeAttestation(sourceId));

    const r = runHook();
    expect(r.exitCode).toBe(0);

    const after = readEvents();
    const summary = after.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as Record<string, unknown>)?.errorClass === "value_grade_promotion_completed",
    );
    expect(summary.length).toBe(1);
  });
});
