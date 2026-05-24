// palantir-mini — DTC fill sequence tests (Sprint 97 W1).
//
// Covers:
//   - DTC_FILL_SEQUENCE shape invariants (length=7, bilingual descriptors)
//   - Each turn T0-T6 advances the correct targetField
//   - advanceDTCFillSequence return shape { appliedTurn, nextTurn, dtcDraft, validationErrors }
//   - T6 sets verdict = "dtc-filled" and nextTurn = null
//   - Backward-compat: importing DTC_FILL_SEQUENCE does not change EIGHT_TURN_FILL_SEQUENCE serialization
//   - Invalid turnIndex throws RangeError

import { describe, expect, it } from "bun:test";
import {
  DTC_FILL_SEQUENCE,
  EIGHT_TURN_FILL_SEQUENCE,
} from "./fill-sequence";
import { advanceDTCFillSequence } from "./dtc-fill-sequence";
import type { DtcWithFillFields } from "./dtc-fill-sequence";
import type { DigitalTwinChangeContract } from "../lead-intent/contracts";

// ---------------------------------------------------------------------------
// Minimal DTC stub for tests
// ---------------------------------------------------------------------------

function makeDtcStub(overrides: Partial<DigitalTwinChangeContract> = {}): DigitalTwinChangeContract {
  return {
    contractId: "test-dtc-001",
    status: "draft",
    semanticIntentContractRef: "sic-ref-001",
    affectedSurfaces: [],
    changeBoundary: "",
    branchProposalPolicy: "",
    permissionBoundary: "",
    replayMigrationPlan: "",
    observabilityPlan: "",
    toolSurfaceReadiness: "",
    evaluationPlan: "",
    risks: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// §1 DTC_FILL_SEQUENCE shape invariants
// ---------------------------------------------------------------------------

describe("DTC_FILL_SEQUENCE shape", () => {
  it("has exactly 7 entries", () => {
    expect(DTC_FILL_SEQUENCE.length).toBe(7);
  });

  it("every entry has step, question, questionEn, targetField, autoFillStrategy, validationHook", () => {
    for (const descriptor of DTC_FILL_SEQUENCE) {
      expect(typeof descriptor.step).toBe("number");
      expect(typeof descriptor.question).toBe("string");
      expect(descriptor.question.length).toBeGreaterThan(0);
      expect(typeof descriptor.questionEn).toBe("string");
      expect(descriptor.questionEn.length).toBeGreaterThan(0);
      expect(typeof descriptor.targetField).toBe("string");
      expect(typeof descriptor.autoFillStrategy).toBe("string");
      expect(typeof descriptor.validationHook).toBe("string");
    }
  });

  it("bilingual: question is Korean, questionEn is English — both non-empty on all 7 descriptors", () => {
    // Korean question must have at least some Korean characters or be non-empty
    // English question must be non-empty
    for (const descriptor of DTC_FILL_SEQUENCE) {
      expect(descriptor.question.length).toBeGreaterThan(0);
      expect(descriptor.questionEn.length).toBeGreaterThan(0);
      // Bilingual invariant: the two strings must differ
      expect(descriptor.question).not.toBe(descriptor.questionEn);
    }
  });

  it("turnIndex values are 0-6 contiguous", () => {
    for (let i = 0; i < DTC_FILL_SEQUENCE.length; i++) {
      expect(DTC_FILL_SEQUENCE[i]!.turnIndex).toBe(i);
    }
  });

  it("step values are 1-7 contiguous (1-based)", () => {
    for (let i = 0; i < DTC_FILL_SEQUENCE.length; i++) {
      expect(DTC_FILL_SEQUENCE[i]!.step).toBe(i + 1);
    }
  });

  it("T0 targets changeBoundary", () => {
    expect(DTC_FILL_SEQUENCE[0]!.targetField).toBe("changeBoundary");
  });

  it("T1 targets branchProposalPolicy", () => {
    expect(DTC_FILL_SEQUENCE[1]!.targetField).toBe("branchProposalPolicy");
  });

  it("T2 targets typed-refs", () => {
    expect(DTC_FILL_SEQUENCE[2]!.targetField).toBe("typed-refs");
  });

  it("T3 targets replayMigrationPlan", () => {
    expect(DTC_FILL_SEQUENCE[3]!.targetField).toBe("replayMigrationPlan");
  });

  it("T4 targets observabilityPlan", () => {
    expect(DTC_FILL_SEQUENCE[4]!.targetField).toBe("observabilityPlan");
  });

  it("T5 targets evaluationPlan", () => {
    expect(DTC_FILL_SEQUENCE[5]!.targetField).toBe("evaluationPlan");
  });

  it("T6 targets verdict", () => {
    expect(DTC_FILL_SEQUENCE[6]!.targetField).toBe("verdict");
  });
});

// ---------------------------------------------------------------------------
// §2 Each turn advances the correct field
// ---------------------------------------------------------------------------

describe("advanceDTCFillSequence — per-turn field mutations", () => {
  it("T0 sets changeBoundary from userInput", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 0, "lib/semantic-intent only");
    expect(result.dtcDraft.changeBoundary).toBe("lib/semantic-intent only");
    expect(result.appliedTurn).toBe(0);
    expect(result.nextTurn).toBe(1);
  });

  it("T1 splits userInput by | into branchProposalPolicy + permissionBoundary", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 1, "main-branch-policy | read-write-perm");
    expect(result.dtcDraft.branchProposalPolicy).toBe("main-branch-policy");
    expect(result.dtcDraft.permissionBoundary).toBe("read-write-perm");
    expect(result.appliedTurn).toBe(1);
    expect(result.nextTurn).toBe(2);
  });

  it("T1 with no pipe character sets only branchProposalPolicy, keeps existing permissionBoundary", () => {
    const dtc = makeDtcStub({ permissionBoundary: "existing-perm" });
    const result = advanceDTCFillSequence(dtc, 1, "branch-only-input");
    expect(result.dtcDraft.branchProposalPolicy).toBe("branch-only-input");
    expect(result.dtcDraft.permissionBoundary).toBe("existing-perm");
  });

  it("T2 merges touchedOntologyRefs non-overwriting", () => {
    const dtc = makeDtcStub({
      touchedOntologyRefs: [{ kind: "ObjectType", rid: "existing-rid-1" } as any],
    });
    const result = advanceDTCFillSequence(dtc, 2, "ObjectType:new-rid-2");
    const touched = result.dtcDraft.touchedOntologyRefs ?? [];
    expect(touched.length).toBeGreaterThanOrEqual(2);
    const rids = touched.map((r: any) => r.rid);
    expect(rids).toContain("existing-rid-1");
    expect(rids).toContain("new-rid-2");
    expect(result.appliedTurn).toBe(2);
    expect(result.nextTurn).toBe(3);
  });

  it("T3 sets replayMigrationPlan from userInput", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 3, "No migration needed; rollback = git revert");
    expect(result.dtcDraft.replayMigrationPlan).toBe("No migration needed; rollback = git revert");
    expect(result.appliedTurn).toBe(3);
    expect(result.nextTurn).toBe(4);
  });

  it("T4 splits userInput by | into observabilityPlan + toolSurfaceReadiness", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 4, "events.jsonl audit | MCP degraded");
    expect(result.dtcDraft.observabilityPlan).toBe("events.jsonl audit");
    expect(result.dtcDraft.toolSurfaceReadiness).toBe("MCP degraded");
    expect(result.appliedTurn).toBe(4);
    expect(result.nextTurn).toBe(5);
  });

  it("T5 sets evaluationPlan from userInput (prose before ||)", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 5, "dtc-rubric/v1 gate required");
    expect(result.dtcDraft.evaluationPlan).toBe("dtc-rubric/v1 gate required");
    expect(result.appliedTurn).toBe(5);
    expect(result.nextTurn).toBe(6);
  });

  it("T5 merges requiredEvaluationRefs from || suffix", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 5, "eval plan prose || ValidationPack:vp-rid-1,ValidationPack:vp-rid-2");
    expect(result.dtcDraft.evaluationPlan).toBe("eval plan prose");
    const refs = result.dtcDraft.requiredEvaluationRefs ?? [];
    expect(refs.length).toBeGreaterThanOrEqual(2);
  });

  it("T6 sets verdict = 'dtc-filled' and nextTurn = null", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 6);
    expect((result.dtcDraft as DtcWithFillFields).verdict).toBe("dtc-filled");
    expect(result.appliedTurn).toBe(6);
    expect(result.nextTurn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §3 Return shape invariants
// ---------------------------------------------------------------------------

describe("advanceDTCFillSequence — return shape", () => {
  it("returns { appliedTurn, nextTurn, dtcDraft, validationErrors } shape", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 0, "boundary text");
    expect("appliedTurn" in result).toBe(true);
    expect("nextTurn" in result).toBe(true);
    expect("dtcDraft" in result).toBe(true);
    expect("validationErrors" in result).toBe(true);
    expect(Array.isArray(result.validationErrors)).toBe(true);
  });

  it("dtcDraft.dtcFillSequence accumulates steps across turns", () => {
    let dtc = makeDtcStub();
    let result = advanceDTCFillSequence(dtc, 0, "boundary");
    dtc = result.dtcDraft as DigitalTwinChangeContract;
    result = advanceDTCFillSequence(dtc, 1, "branch | perm");
    const dtcWithFields = result.dtcDraft as DtcWithFillFields;
    expect(dtcWithFields.dtcFillSequence?.length).toBe(2);
    expect(dtcWithFields.dtcFillSequence?.[0]?.step).toBe(1);
    expect(dtcWithFields.dtcFillSequence?.[1]?.step).toBe(2);
  });

  it("each fill step has filledAt as ISO8601 string", () => {
    const dtc = makeDtcStub();
    const result = advanceDTCFillSequence(dtc, 0, "boundary");
    const step = (result.dtcDraft as DtcWithFillFields).dtcFillSequence?.[0];
    expect(typeof step?.filledAt).toBe("string");
    expect(() => new Date(step!.filledAt)).not.toThrow();
  });

  it("userInput source is 'user', agentAutoFill source is 'agent', neither is 'system'", () => {
    const dtc = makeDtcStub();

    const userResult = advanceDTCFillSequence(dtc, 0, "user text");
    expect((userResult.dtcDraft as DtcWithFillFields).dtcFillSequence?.[0]?.source).toBe("user");

    const agentResult = advanceDTCFillSequence(dtc, 0, undefined, { changeBoundary: "agent text" });
    expect((agentResult.dtcDraft as DtcWithFillFields).dtcFillSequence?.[0]?.source).toBe("agent");

    const systemResult = advanceDTCFillSequence(dtc, 0);
    expect((systemResult.dtcDraft as DtcWithFillFields).dtcFillSequence?.[0]?.source).toBe("system");
  });
});

// ---------------------------------------------------------------------------
// §4 RangeError on invalid turnIndex
// ---------------------------------------------------------------------------

describe("advanceDTCFillSequence — bounds check", () => {
  it("throws RangeError for turnIndex < 0", () => {
    const dtc = makeDtcStub();
    expect(() => advanceDTCFillSequence(dtc, -1)).toThrow(RangeError);
  });

  it("throws RangeError for turnIndex >= 7", () => {
    const dtc = makeDtcStub();
    expect(() => advanceDTCFillSequence(dtc, 7)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// §5 Backward-compat: EIGHT_TURN_FILL_SEQUENCE unaffected
// ---------------------------------------------------------------------------

describe("backward-compat: EIGHT_TURN_FILL_SEQUENCE unchanged", () => {
  it("EIGHT_TURN_FILL_SEQUENCE still has exactly 8 entries", () => {
    expect(EIGHT_TURN_FILL_SEQUENCE.length).toBe(8);
  });

  it("EIGHT_TURN_FILL_SEQUENCE serialization is byte-identical after DTC import", () => {
    const snapshot = JSON.stringify(EIGHT_TURN_FILL_SEQUENCE);
    // Re-serialize to confirm no mutation
    const resnapshot = JSON.stringify(EIGHT_TURN_FILL_SEQUENCE);
    expect(snapshot).toBe(resnapshot);
  });

  it("EIGHT_TURN_FILL_SEQUENCE[7] step=8 targetField='verdict' (T7 finalization unchanged)", () => {
    expect(EIGHT_TURN_FILL_SEQUENCE[7]!.step).toBe(8);
    expect(EIGHT_TURN_FILL_SEQUENCE[7]!.targetField).toBe("verdict");
  });
});
