// palantir-mini — promotion-linkage wave 3 (incidental sibling filter) regression guard
//
// WHY THIS EXISTS: bridge/handlers/commit-edits.ts's three pre-flight checkpoints
// (errorClass "contract_self_attested" / "dry_run_auto_computed" / "dry_run_auto_skip")
// deliberately stamp the SAME lineageRefs.actionRid=actionTypeRid so they correlate with
// EACH OTHER as audit-trail bookkeeping — accepted in wave 2 fix round 1 as "not a
// stand-in for edit_committed's own promotion". Before this wave, that bookkeeping
// correlation ALSO satisfied the promotion engine's correlation-rid join predicate
// (scripts/replay-promote-grades.ts ridJoins()), incidentally granting T1->T2 promotions
// (and T3->T4 dual-identity credit) to sibling checkpoints that never independently
// validated each other. This wave adds a targeted filter (isIncidentalSiblingPair) that
// suppresses ONLY rid matches where BOTH sides carry one of the three sibling errorClass
// values — every other correlation-rid pairing (including a sibling paired with a
// genuinely different, non-sibling validation) is untouched.
//
// Authority: rule 26 §Substrate routing + rule 10 §append-only invariant;
//            promotion-linkage wave 3 (#209 follow-up).

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
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-promote-linkage-wave3-"));
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

/** Stands in for one of commit-edits.ts's three pre-flight sibling checkpoints. */
function makeSiblingCheckpoint(
  eventId: string,
  opts: { rid: string; errorClass: string; when: string; grade?: "T1" | "T2" | "T3"; identity?: string },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    valueGrade: opts.grade ?? "T1",
    byWhom: { identity: opts.identity ?? "claude-code" },
    withWhat: { reasoning: `commit_edits pre-flight checkpoint (${opts.errorClass})`, memoryLayers: ["procedural"] },
    payload: { phase: "design", passed: true, errorClass: opts.errorClass },
    lineageRefs: { actionRid: opts.rid },
  };
}

/** A T1 source event carrying a correlation rid, standing in for a gated intent decision. */
function makeT1Source(eventId: string, opts: { rid: string; when: string }): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    valueGrade: "T1",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "T1 source carrying a correlation rid stamped at the flow's emit site", memoryLayers: ["working"] },
    payload: { phaseTag: "semantic-gate", taskId: "task-4" },
    lineageRefs: { actionRid: opts.rid },
  };
}

/** A non-sibling validation_phase_completed event carrying the same correlation rid. */
function makeGenuineValidation(
  eventId: string,
  opts: { rid: string; when: string; identity?: string },
): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "validation_phase_completed",
    when: opts.when,
    atopWhich: "abcdef0",
    valueGrade: "T2",
    byWhom: { identity: opts.identity ?? "claude-code" },
    withWhat: { reasoning: "genuine, non-sibling validation checkpoint", memoryLayers: ["semantic", "procedural"] },
    payload: { passed: true, errorClass: "semantic_intent_gate_completed" },
    lineageRefs: { actionRid: opts.rid },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("promotion-linkage wave 3 — incidental sibling filter", () => {
  test("(a) two sibling checkpoints sharing actionRid do NOT promote each other (T1->T2)", async () => {
    const rid = "actiontype:ontology.edit.commit";
    writeEvent(makeSiblingCheckpoint("evt-self-attest", {
      rid, errorClass: "contract_self_attested", when: "2026-07-10T00:00:00.000Z",
    }));
    writeEvent(makeSiblingCheckpoint("evt-dry-run", {
      rid, errorClass: "dry_run_auto_computed", when: "2026-07-10T00:00:01.000Z",
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-self-attest");
    expect(result.promotedEventIds).not.toContain("evt-dry-run");
  });

  test("(b) dry_run_auto_skip sibling paired with contract_self_attested also does NOT promote", async () => {
    const rid = "actiontype:ontology.edit.commit-2";
    writeEvent(makeSiblingCheckpoint("evt-self-attest-2", {
      rid, errorClass: "contract_self_attested", when: "2026-07-10T00:00:00.000Z",
    }));
    writeEvent(makeSiblingCheckpoint("evt-skip-audit", {
      rid, errorClass: "dry_run_auto_skip", when: "2026-07-10T00:00:01.000Z",
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-self-attest-2");
  });

  test("(c) sibling checkpoint paired with a GENUINE non-sibling validation still promotes (filter is precise)", async () => {
    const rid = "actiontype:ontology.edit.commit-3";
    writeEvent(makeSiblingCheckpoint("evt-self-attest-3", {
      rid, errorClass: "contract_self_attested", when: "2026-07-10T00:00:00.000Z",
    }));
    writeEvent(makeGenuineValidation("evt-genuine-3", { rid, when: "2026-07-10T00:00:01.000Z" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain("evt-self-attest-3");
  });

  test("(d) non-sibling correlation-rid promotions are unaffected (regression guard)", async () => {
    const rid = "semantic-intent:wave3-regression";
    writeEvent(makeT1Source("evt-src-4", { rid, when: "2026-07-10T00:00:00.000Z" }));
    writeEvent(makeGenuineValidation("evt-validation-4", { rid, when: "2026-07-10T00:00:01.000Z" }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedEventIds).toContain("evt-src-4");
  });

  test("(e) T3->T4: two sibling checkpoints with distinct identities do NOT count as dual-vendor consensus", async () => {
    const rid = "actiontype:ontology.edit.commit-5";
    // T3 source with a typed refinementTarget (dual-identity candidate).
    writeEvent({
      sequence: seq++,
      eventId: "evt-t3-source-5",
      type: "phase_completed",
      when: "2026-07-10T00:00:00.000Z",
      atopWhich: "abcdef0",
      valueGrade: "T3",
      byWhom: { identity: "claude-code" },
      withWhat: {
        reasoning: "T3 source ready for D2 attestation",
        memoryLayers: ["working"],
        refinementTarget: {
          kind: "other",
          filePathOrRid: "lib/actions/commit.ts",
          description: "T3 refinement target",
          confidenceLevel: "high",
        },
      },
      payload: { phaseTag: "commit-gate", taskId: "task-5" },
      lineageRefs: { actionRid: rid },
    });
    // Two sibling checkpoints, deliberately distinct identities, to isolate the
    // errorClass filter from the existing identity-dedup logic.
    writeEvent(makeSiblingCheckpoint("evt-sib-a-5", {
      rid, errorClass: "contract_self_attested", when: "2026-07-10T00:00:01.000Z", identity: "claude-code",
    }));
    writeEvent(makeSiblingCheckpoint("evt-sib-b-5", {
      rid, errorClass: "dry_run_auto_computed", when: "2026-07-10T00:00:02.000Z", identity: "codex",
    }));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t3ToT4).toBe(0);
    expect(result.promotedEventIds).not.toContain("evt-t3-source-5");
  });
});
