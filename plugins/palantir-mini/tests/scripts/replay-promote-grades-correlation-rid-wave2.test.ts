// palantir-mini — promotion-linkage wave 2 (correlation-rid join) regression guard
//
// WHY THIS EXISTS: wave 1 locked the audit finding that class-A validation_phase_completed
// sites carry contract/action rids (contractId, semanticIntentContractRef,
// digitalTwinChangeContractRef, promptId, actionTypeRid, workContractRef, routerBindingRef)
// that are NEVER equal to any source event's eventId, so the engine's eventId join
// (lineageRefs.actionRid === source.eventId) could never fire for them. The user decision
// (2026-07-10) adopted a CORRELATION-RID JOIN as an ADDITIVE join kind: source and
// validation events share the SAME lineageRefs.actionRid correlation rid (not an eventId),
// with a when-ordering + per-source-per-transition cardinality rule. The eventId join is
// KEPT as fallback (see replay-promote-grades-linkage-wave1.test.ts for that regression).
//
// Authority: rule 26 §Substrate routing + rule 10 §append-only invariant; wave-2 user decision.

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

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-promote-corr-rid-wave2-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  seq = 0;
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
});

function eventsFile(): string {
  return eventsJsonlPath(TMP);
}

function writeEvent(ev: Record<string, unknown>): void {
  fs.appendFileSync(eventsFile(), JSON.stringify(ev) + "\n");
}

function makeT1Source(eventId: string, opts: { rid?: string; when?: string } = {}): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "phase_completed",
    when: opts.when ?? new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T1",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "T1 source carrying a correlation rid stamped at the flow's emit site", memoryLayers: ["working"] },
    payload: { phaseTag: "semantic-gate", taskId: "task-1" },
    ...(opts.rid ? { lineageRefs: { actionRid: opts.rid } } : {}),
  };
}

/** A T3 source event, standing in for a source that has already reached T3. */
function makeT3Source(eventId: string, opts: { rid?: string; when?: string } = {}): Record<string, unknown> {
  return {
    ...makeT1Source(eventId, opts),
    valueGrade: "T3",
    withWhat: {
      reasoning: "T3 source ready for D2 attestation",
      memoryLayers: ["working"],
      refinementTarget: {
        kind: "other",
        filePathOrRid: "bridge/handlers/pm-semantic-intent-gate.ts",
        description: "T3 refinement target",
        confidenceLevel: "high",
      },
    },
  };
}

function makeValidation(
  eventId: string,
  opts: { rid?: string; when?: string; passed?: boolean; identity?: string } = {},
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when ?? new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T2",
    byWhom: { identity: opts.identity ?? "claude-code" },
    withWhat: { reasoning: "class-A validation checkpoint", memoryLayers: ["semantic", "procedural"] },
    payload: {
      passed: opts.passed ?? true,
      errorClass: "semantic_intent_gate_completed",
      semanticIntentContractRef: "semantic-intent/s-1/prompt-s1-20260710-0/semantic-intent:test-intent",
    },
    ...(opts.rid ? { lineageRefs: { actionRid: opts.rid } } : {}),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("promotion-linkage wave 2 — correlation-rid join", () => {
  test("(a) source stamped rid X + validation passed=true stamped rid X -> t1ToT2 promotes", async () => {
    const rid = "semantic-intent:test-intent";
    writeEvent(makeT1Source("evt-source-a", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeValidation("evt-validation-a", { rid, when: "2026-07-10T00:01:00.000Z" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain("evt-source-a");
  });

  test("(b) eventId-join regression still works (validation.lineageRefs.actionRid === source.eventId)", async () => {
    const sourceId = "evt-source-b";
    writeEvent(makeT1Source(sourceId));
    writeEvent({
      sequence: seq++,
      eventId: "evt-validation-b",
      type: "validation_phase_completed",
      when: new Date().toISOString(),
      atopWhich: "abcdef0",
      valueGrade: "T2",
      byWhom: { identity: "claude-code" },
      withWhat: { reasoning: "eventId-join validation", memoryLayers: ["semantic"] },
      payload: { passed: true, errorClass: "semantic_intent_gate_completed" },
      lineageRefs: { actionRid: sourceId },
    });

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain(sourceId);
  });

  test("(c) cardinality: 2 sources same rid, 1 validation -> both attested, each promoted once", async () => {
    const rid = "semantic-intent:shared-flow";
    writeEvent(makeT1Source("evt-source-c1", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeT1Source("evt-source-c2", { rid, when: "2026-07-10T00:00:30.000Z" }));
    writeEvent(makeValidation("evt-validation-c", { rid, when: "2026-07-10T00:01:00.000Z" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(2);
    expect(result.promotedEventIds).toContain("evt-source-c1");
    expect(result.promotedEventIds).toContain("evt-source-c2");
    // Each source promotes at most once (no duplicate entries for either id).
    expect(result.promotedEventIds.filter((id) => id === "evt-source-c1")).toHaveLength(1);
    expect(result.promotedEventIds.filter((id) => id === "evt-source-c2")).toHaveLength(1);
  });

  test("(d) when-ordering: validation BEFORE source -> no promotion", async () => {
    const rid = "semantic-intent:out-of-order";
    writeEvent(makeT1Source("evt-source-d", { rid, when: "2026-07-10T00:05:00.000Z" }));
    writeEvent(makeValidation("evt-validation-d", { rid, when: "2026-07-10T00:00:00.000Z" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-source-d");
  });

  test("(e) passed=false + matching rid -> no promotion", async () => {
    const rid = "semantic-intent:failed-gate";
    writeEvent(makeT1Source("evt-source-e", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeValidation("evt-validation-e", { rid, when: "2026-07-10T00:01:00.000Z", passed: false }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-source-e");
  });

  test("T3->T4 union: 2 distinct identities attest via correlation-rid join alone", async () => {
    const rid = "semantic-intent:t3-t4-union";
    writeEvent(makeT3Source("evt-source-t4", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeValidation("evt-validation-t4-1", { rid, when: "2026-07-10T00:01:00.000Z", identity: "claude-code" }));
    writeEvent(makeValidation("evt-validation-t4-2", { rid, when: "2026-07-10T00:02:00.000Z", identity: "codex" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t3ToT4).toBe(1);
    expect(result.promotedEventIds).toContain("evt-source-t4");
  });

  test("T3->T4 union: 1 identity via eventId join + 1 distinct identity via rid join together clear the >=2 bar", async () => {
    const rid = "semantic-intent:t3-t4-mixed";
    const sourceId = "evt-source-t4-mixed";
    writeEvent(makeT3Source(sourceId, { rid, when: "2026-07-10T00:00:00.000Z" }));
    // eventId-join attestation (identity: claude-code)
    writeEvent({
      sequence: seq++,
      eventId: "evt-validation-mixed-1",
      type: "validation_phase_completed",
      when: "2026-07-10T00:01:00.000Z",
      atopWhich: "abcdef0",
      valueGrade: "T2",
      byWhom: { identity: "claude-code" },
      withWhat: { reasoning: "eventId-join attestation", memoryLayers: ["semantic"] },
      payload: { passed: true, errorClass: "semantic_intent_gate_completed" },
      lineageRefs: { actionRid: sourceId },
    });
    // rid-join attestation (identity: codex) — distinct identity, same source.
    writeEvent(makeValidation("evt-validation-mixed-2", { rid, when: "2026-07-10T00:02:00.000Z", identity: "codex" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t3ToT4).toBe(1);
    expect(result.promotedEventIds).toContain(sourceId);
  });
});
