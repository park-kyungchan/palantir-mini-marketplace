// palantir-mini — promotion-linkage wave 4 regression guard
//
// WHY THIS EXISTS: wave 4 stamps 13 needs-context-plumbing sites (additive,
// inert until a companion emitter exists) plus three Lead-ruled fixes that
// DO have companion emitters today:
//
//   R-M1 — lib/actions/commit.ts's F4 fail-closed refusal (errorClass
//     "unregistered_action_type", validation_phase_completed, passed:false)
//     now stamps lineageRefs.actionRid=actionTypeRid. Ground truth (verified
//     against scripts/replay-promote-grades.ts): both findT1ToT2Evidence and
//     findT3ToT4Evidence filter `if (!p.passed) continue;` BEFORE calling
//     ridJoins() — the engine's evidence predicate REQUIRES payload.passed
//     === true. So a passed:false refusal can never itself serve as
//     promotion evidence, and no INCIDENTAL_SIBLING_ERROR_CLASSES change was
//     needed for this site.
//
//   R-M2 — bridge/handlers/propagation-audit-backward.ts's summary emit now
//     stamps lineageRefs.actionRid=seedEventId (a real eventId-class value,
//     matching ridJoins()'s exact-match eventId join:
//     `ev.lineageRefs?.actionRid === sourceId`). Stamped UNCONDITIONALLY
//     (not gated on firstViolationStep === null) because the SAME
//     passed-only gate above already prevents a failed audit (passed:false)
//     from ever serving as evidence.
//
//   R-M3 Option 1 — lib/actions/commit.ts's edit_committed success envelope
//     stamps lineageRefs.actionRid=actionTypeRid (kept per Lead ruling part
//     (i), but NOT the join key — see fix round 1 below), and
//     bridge/handlers/commit-edits.ts emits exactly ONE new post-commit
//     checkpoint (errorClass "commit_confirmed", passed:true) immediately
//     after commitEdits() returns committed:true. "commit_confirmed" is
//     deliberately excluded from INCIDENTAL_SIBLING_ERROR_CLASSES — unlike
//     the 3 pre-flight siblings, it is real evidence and SHOULD count toward
//     promotion.
//
//   FIX ROUND 1 (verified blocker) — the checkpoint originally joined to
//     edit_committed via the correlation-rid join (both stamped
//     lineageRefs.actionRid=actionTypeRid). actionTypeRid is a TYPE-level rid
//     shared by EVERY invocation of a verb, so one invocation's checkpoint
//     could promote a DIFFERENT, unrelated invocation's edit_committed event
//     whenever both happened to share an actionTypeRid — reproduced with two
//     edit_committed events months apart and one later checkpoint, both
//     promoted. The checkpoint now instead stamps
//     lineageRefs.actionRid=<the specific edit_committed's own eventId>
//     (returned as CommitResult.eventId), using ridJoins()'s eventId join
//     (`ev.lineageRefs?.actionRid === sourceId`) — per-invocation-unique, so
//     the cross-invocation promotion is now structurally impossible. See
//     test (e) below.
//
// Authority: rule 26 §Substrate routing + rule 10 §append-only invariant;
//            promotion-linkage wave 4 (docs/2026-07-10-promotion-linkage-wave3.md
//            §(b) Option 1 + Lead rulings R-M1/R-M2/R-M3; fix round 1).

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
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-promote-linkage-wave4-"));
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

/** Stands in for lib/actions/commit.ts's edit_committed success envelope. */
function makeEditCommitted(
  eventId: string,
  opts: { rid: string; when: string; grade?: "T1" | "T2" | "T3" },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "edit_committed",
    when: opts.when,
    atopWhich: "abcdef0",
    valueGrade: opts.grade ?? "T1",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "edit_committed source event stamped by R-M3 Option 1" },
    payload: { actionTypeRid: opts.rid, appliedEdits: [], submissionCriteriaPassed: [] },
    lineageRefs: { actionRid: opts.rid },
  };
}

/**
 * Stands in for commit-edits.ts's new post-commit "commit_confirmed" checkpoint.
 * FIX ROUND 1: joins via `sourceEventId` (the specific edit_committed's own
 * eventId, per CommitResult.eventId), NOT the type-level actionTypeRid —
 * `rid` is still carried in payload.actionTypeRid for observability only.
 */
function makeCommitConfirmed(
  eventId: string,
  opts: { rid: string; sourceEventId: string; when: string },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "commit_edits post-commit checkpoint (R-M3 Option 1, fix round 1)", memoryLayers: ["procedural"] },
    payload: { phase: "post_write", passed: true, errorClass: "commit_confirmed", actionTypeRid: opts.rid },
    lineageRefs: { actionRid: opts.sourceEventId },
  };
}

/** Stands in for one of commit-edits.ts's three pre-flight sibling checkpoints (wave 2/3). */
function makeSiblingCheckpoint(
  eventId: string,
  opts: { rid: string; errorClass: string; when: string },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: `commit_edits pre-flight checkpoint (${opts.errorClass})`, memoryLayers: ["procedural"] },
    payload: { phase: "design", passed: true, errorClass: opts.errorClass },
    lineageRefs: { actionRid: opts.rid },
  };
}

/** Stands in for lib/actions/commit.ts's F4 fail-closed refusal (R-M1). */
function makeF4Refusal(
  eventId: string,
  opts: { rid: string; when: string },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    byWhom: { identity: "claude-code" },
    withWhat: {
      reasoning: "F4 fail-closed refusal: unregistered ActionType",
      memoryLayers: ["procedural"],
      refinementTarget: {
        kind: "other",
        filePathOrRid: opts.rid,
        description: "Register this ActionType before committing edits through it.",
        confidenceLevel: "high",
      },
    },
    payload: { phase: "post_write", passed: false, errorClass: "unregistered_action_type" },
    lineageRefs: { actionRid: opts.rid },
  };
}

/** Stands in for a prior T1 source event that propagation_audit_backward seeds from. */
function makeT1Source(eventId: string, opts: { when: string }): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    valueGrade: "T1",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "T1 source seeded by a BackwardProp replay", memoryLayers: ["working"] },
    payload: { phaseTag: "backprop-seed", taskId: "task-w4" },
  };
}

/** Stands in for bridge/handlers/propagation-audit-backward.ts's summary emit (R-M2). */
function makeBackwardPropSummary(
  eventId: string,
  opts: { seedEventId: string; when: string; passed: boolean },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: `BackwardProp replay: seed=${opts.seedEventId}`, memoryLayers: ["episodic"] },
    payload: { phase: "post_write", passed: opts.passed, errorClass: "propagation_audit_backward" },
    lineageRefs: { actionRid: opts.seedEventId },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("promotion-linkage wave 4", () => {
  test("(a) edit_committed <-> commit_confirmed join promotes T1->T2 via eventId join", async () => {
    const rid = "actiontype:ontology.edit.commit-w4a";
    writeEvent(makeEditCommitted("evt-edit-committed-a", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeCommitConfirmed("evt-commit-confirmed-a", {
      rid, sourceEventId: "evt-edit-committed-a", when: "2026-07-10T00:00:01.000Z",
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain("evt-edit-committed-a");
  });

  test("(b) pre-flight siblings paired with edit_committed remain suppressed as validation evidence", async () => {
    const rid = "actiontype:ontology.edit.commit-w4b";
    // Deliberately dated AFTER edit_committed to isolate the errorClass filter
    // from the when-ordering rule (pre-flight checkpoints always precede
    // edit_committed by construction in production, but the filter must hold
    // independent of ordering).
    writeEvent(makeEditCommitted("evt-edit-committed-b", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeSiblingCheckpoint("evt-self-attest-b", {
      rid, errorClass: "contract_self_attested", when: "2026-07-10T00:00:01.000Z",
    }));
    writeEvent(makeSiblingCheckpoint("evt-dry-run-b", {
      rid, errorClass: "dry_run_auto_computed", when: "2026-07-10T00:00:02.000Z",
    }));
    writeEvent(makeSiblingCheckpoint("evt-skip-audit-b", {
      rid, errorClass: "dry_run_auto_skip", when: "2026-07-10T00:00:03.000Z",
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-edit-committed-b");
  });

  test("(c) a stamped F4 refusal never promotes an earlier edit_committed sharing the same actionTypeRid", async () => {
    const rid = "actiontype:ontology.edit.commit-w4c";
    writeEvent(makeEditCommitted("evt-edit-committed-c", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeF4Refusal("evt-f4-refusal-c", { rid, when: "2026-07-10T00:00:01.000Z" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-edit-committed-c");
  });

  test("(d) R-M2: propagation_audit_backward's passed=true summary joins its seed event via eventId-class actionRid and promotes T1->T2", async () => {
    writeEvent(makeT1Source("evt-seed-d", { when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeBackwardPropSummary("evt-backprop-summary-d", {
      seedEventId: "evt-seed-d", when: "2026-07-10T00:00:01.000Z", passed: true,
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain("evt-seed-d");
  });

  test("(d2) R-M2 pass-only guard: a failed BackwardProp audit (passed=false) never promotes its seed", async () => {
    writeEvent(makeT1Source("evt-seed-d2", { when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeBackwardPropSummary("evt-backprop-summary-d2", {
      seedEventId: "evt-seed-d2", when: "2026-07-10T00:00:01.000Z", passed: false,
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-seed-d2");
  });

  test("(e) fix round 1: a commit_confirmed checkpoint never promotes a DIFFERENT, unrelated invocation's edit_committed sharing the same actionTypeRid", async () => {
    // Two unrelated edit_committed events, months apart, that happen to share
    // the same actionTypeRid (the type-level rid every invocation of this
    // verb carries) — mirrors the empirically-reproduced blocker.
    const rid = "actiontype:ontology.edit.commit-w4e";
    writeEvent(makeEditCommitted("evt-invocation-A-unrelated", { rid, when: "2026-01-01T00:00:00.000Z" }));
    writeEvent(makeEditCommitted("evt-invocation-B-unrelated", { rid, when: "2026-03-01T00:00:00.000Z" }));

    // ONE commit_confirmed checkpoint from a THIRD, later invocation — joined
    // via its own edit_committed's eventId (evt-invocation-C-own), NOT the
    // shared actionTypeRid.
    writeEvent(makeEditCommitted("evt-invocation-C-own", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeCommitConfirmed("evt-commit-confirmed-e", {
      rid, sourceEventId: "evt-invocation-C-own", when: "2026-07-10T00:00:01.000Z",
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    // Only the matching invocation (C) is promoted; A and B — unrelated
    // invocations that merely share the type-level actionTypeRid — are not.
    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain("evt-invocation-C-own");
    expect(result.promotedEventIds).not.toContain("evt-invocation-A-unrelated");
    expect(result.promotedEventIds).not.toContain("evt-invocation-B-unrelated");
  });
});
