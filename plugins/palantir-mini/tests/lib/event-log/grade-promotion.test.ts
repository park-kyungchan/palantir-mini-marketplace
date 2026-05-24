// sprint-104 PR 4.2 — grade-promotion tests
// Covers promoteT1ToT2, promoteT2ToT3, promoteT3ToT4 transitions +
// happy paths + no-promote when evidence is missing/insufficient.

import { test, expect, describe } from "bun:test";
import {
  promoteT1ToT2,
  promoteT2ToT3,
  promoteT3ToT4,
  type T1ToT2Evidence,
  type T2ToT3Evidence,
  type T3ToT4Evidence,
} from "../../../lib/event-log/grade-promotion";
import {
  eventId,
  sessionId,
  commitSha,
  type EventEnvelope,
  type ValidationPhaseCompletedEnvelope,
} from "../../../lib/event-log/types";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeBase(seq: number, grade: "T1" | "T2" | "T3" | "T4"): EventEnvelope {
  return {
    type: "phase_completed",
    sequence: seq,
    eventId: eventId(`e-${seq}`),
    when: "2026-05-13T00:00:00.000Z",
    atopWhich: commitSha("abc1234"),
    throughWhich: {
      sessionId: sessionId("s-1"),
      toolName: "test-tool",
      cwd: "/home/palantirkc",
    },
    byWhom: {
      identity: "claude-code",
      agentName: "test-agent",
    },
    withWhat: {
      reasoning:
        "Sprint-104 PR 4.2 test fixture: grade-promotion unit test event for tier " + grade,
    },
    valueGrade: grade,
    payload: {
      phaseTag: "test-phase",
      taskId: `task-${seq}`,
      validations: [],
    },
  } as EventEnvelope;
}

function makeT1Event(seq: number): EventEnvelope {
  return makeBase(seq, "T1");
}

function makeT2Event(seq: number): EventEnvelope {
  const ev = makeBase(seq, "T2");
  return ev;
}

function makeT2EventWithRefinementTarget(seq: number): EventEnvelope {
  const ev = makeBase(seq, "T2");
  return {
    ...ev,
    withWhat: {
      reasoning:
        "Sprint-104 PR 4.2 test fixture T2 with refinement target for promotion to T3",
      refinementTarget: {
        kind: "other",
        filePathOrRid: "lib/event-log/grade-promotion.ts",
        description: "Test refinement target for T2→T3 promotion.",
        confidenceLevel: "high",
      },
      memoryLayers: ["procedural"],
    },
  } as EventEnvelope;
}

function makeT3Event(seq: number): EventEnvelope {
  return makeBase(seq, "T3");
}

function makeT1ToT2Evidence(outcomePairEventId: string): T1ToT2Evidence {
  return {
    outcomePairEventId,
    outcomePairId: `pair-${outcomePairEventId}`,
    rationale: "Test outcome pair for T1→T2 promotion.",
  };
}

function makeT2ToT3Evidence(): T2ToT3Evidence {
  return {
    refinementTarget: {
      kind: "other",
      filePathOrRid: "lib/event-log/grade-promotion.ts",
      description: "Test refinement target for T2→T3 promotion.",
      confidenceLevel: "high",
    },
    memoryLayers: ["procedural"],
    rationale: "Test refinement target evidence.",
  };
}

function makeT3ToT4EvidenceCanonical(): T3ToT4Evidence {
  return {
    attestingIdentities: ["claude-code", "codex"],
    kLlmConsensus: "dual-vendor-canonical",
    confidenceTier: "high",
    attestationEventIds: ["attest-1", "attest-2"],
    rationale: "D2-canonical: two distinct vendor attestations.",
  };
}

function makeT3ToT4EvidenceFallback(): T3ToT4Evidence {
  return {
    kLlmConsensus: "single-vendor-attested",
    confidenceTier: "lower",
    rationale: "D2-fallback: single-vendor attestation.",
  };
}

// ─── promoteT1ToT2 ─────────────────────────────────────────────────────────────

describe("promoteT1ToT2", () => {
  test("returns null when source grade is not T1", () => {
    const source = makeT2Event(1);
    const evidence = makeT1ToT2Evidence("outcome-1");
    expect(promoteT1ToT2(source, evidence)).toBeNull();
  });

  test("returns null when outcomePairEventId is empty", () => {
    const source = makeT1Event(1);
    const evidence: T1ToT2Evidence = { outcomePairEventId: "" };
    expect(promoteT1ToT2(source, evidence)).toBeNull();
  });

  test("returns null when outcomePairEventId is whitespace only", () => {
    const source = makeT1Event(1);
    const evidence: T1ToT2Evidence = { outcomePairEventId: "   " };
    expect(promoteT1ToT2(source, evidence)).toBeNull();
  });

  test("returns PromotionResult with newGrade T2 on happy path", () => {
    const source = makeT1Event(1);
    const evidence = makeT1ToT2Evidence("outcome-ev-1");
    const result = promoteT1ToT2(source, evidence);

    expect(result).not.toBeNull();
    expect(result!.newGrade).toBe("T2");
    expect(result!.previousGrade).toBe("T1");
  });

  test("promoted envelope has valueGrade T2", () => {
    const source = makeT1Event(2);
    const evidence = makeT1ToT2Evidence("outcome-ev-2");
    const result = promoteT1ToT2(source, evidence)!;

    expect(result.promotedEnvelope.valueGrade).toBe("T2");
  });

  test("promoted envelope has byWhom.agentName = grade-promotion-job", () => {
    const source = makeT1Event(3);
    const evidence = makeT1ToT2Evidence("outcome-ev-3");
    const result = promoteT1ToT2(source, evidence)!;

    expect(result.promotedEnvelope.byWhom.agentName).toBe("grade-promotion-job");
  });

  test("promoted envelope payload carries promotedFrom = T1", () => {
    const source = makeT1Event(4);
    const evidence = makeT1ToT2Evidence("outcome-ev-4");
    const result = promoteT1ToT2(source, evidence)!;

    const payload = result.promotedEnvelope.payload as Record<string, unknown>;
    expect(payload.promotedFrom).toBe("T1");
  });

  test("promoted envelope lineageRefs.actionRid points to source eventId", () => {
    const source = makeT1Event(5);
    const evidence = makeT1ToT2Evidence("outcome-ev-5");
    const result = promoteT1ToT2(source, evidence)!;

    expect(result.promotedEnvelope.lineageRefs?.actionRid).toBe(source.eventId as string);
  });

  test("promoted envelope lineageRefs.outcomePairId is set when evidence provides it", () => {
    const source = makeT1Event(6);
    const evidence: T1ToT2Evidence = {
      outcomePairEventId: "outcome-ev-6",
      outcomePairId: "pair-123",
    };
    const result = promoteT1ToT2(source, evidence)!;

    // outcomePairId is a branded type — compare as string via cast
    expect(result.promotedEnvelope.lineageRefs?.outcomePairId as string).toBe("pair-123");
  });

  test("promoted envelope withWhat.refinementTarget references grade-promotion.ts", () => {
    const source = makeT1Event(7);
    const evidence = makeT1ToT2Evidence("outcome-ev-7");
    const result = promoteT1ToT2(source, evidence)!;

    const rt = result.promotedEnvelope.withWhat?.refinementTarget as Record<string, unknown> | undefined;
    expect(rt?.filePathOrRid).toBe("lib/event-log/grade-promotion.ts");
  });

  test("source event is not mutated", () => {
    const source = makeT1Event(8);
    const originalGrade = source.valueGrade;
    const evidence = makeT1ToT2Evidence("outcome-ev-8");
    promoteT1ToT2(source, evidence);

    expect(source.valueGrade).toBe(originalGrade);
    expect((source.payload as Record<string, unknown>).promotedFrom).toBeUndefined();
  });
});

// ─── promoteT2ToT3 ─────────────────────────────────────────────────────────────

describe("promoteT2ToT3", () => {
  test("returns null when source grade is not T2", () => {
    const source = makeT1Event(1);
    const evidence = makeT2ToT3Evidence();
    expect(promoteT2ToT3(source, evidence)).toBeNull();
  });

  test("returns null when refinementTarget.kind is empty", () => {
    const source = makeT2Event(1);
    const evidence: T2ToT3Evidence = {
      refinementTarget: {
        kind: "",
        filePathOrRid: "some/file.ts",
        description: "Test.",
        confidenceLevel: "high",
      },
    };
    expect(promoteT2ToT3(source, evidence)).toBeNull();
  });

  test("returns null when refinementTarget.filePathOrRid is empty", () => {
    const source = makeT2Event(2);
    const evidence: T2ToT3Evidence = {
      refinementTarget: {
        kind: "other",
        filePathOrRid: "",
        description: "Test.",
        confidenceLevel: "high",
      },
    };
    expect(promoteT2ToT3(source, evidence)).toBeNull();
  });

  test("returns null when refinementTarget.description is empty", () => {
    const source = makeT2Event(3);
    const evidence: T2ToT3Evidence = {
      refinementTarget: {
        kind: "other",
        filePathOrRid: "lib/event-log/grade-promotion.ts",
        description: "",
        confidenceLevel: "high",
      },
    };
    expect(promoteT2ToT3(source, evidence)).toBeNull();
  });

  test("returns PromotionResult with newGrade T3 on happy path", () => {
    const source = makeT2Event(4);
    const evidence = makeT2ToT3Evidence();
    const result = promoteT2ToT3(source, evidence);

    expect(result).not.toBeNull();
    expect(result!.newGrade).toBe("T3");
    expect(result!.previousGrade).toBe("T2");
  });

  test("promoted envelope has valueGrade T3", () => {
    const source = makeT2Event(5);
    const evidence = makeT2ToT3Evidence();
    const result = promoteT2ToT3(source, evidence)!;

    expect(result.promotedEnvelope.valueGrade).toBe("T3");
  });

  test("promoted envelope payload carries promotedFrom = T2", () => {
    const source = makeT2Event(6);
    const evidence = makeT2ToT3Evidence();
    const result = promoteT2ToT3(source, evidence)!;

    const payload = result.promotedEnvelope.payload as Record<string, unknown>;
    expect(payload.promotedFrom).toBe("T2");
  });

  test("promoted envelope withWhat.refinementTarget is populated from evidence", () => {
    const source = makeT2Event(7);
    const evidence = makeT2ToT3Evidence();
    const result = promoteT2ToT3(source, evidence)!;

    const rt = result.promotedEnvelope.withWhat?.refinementTarget as Record<string, unknown> | undefined;
    expect(rt?.kind).toBe("other");
    expect(rt?.filePathOrRid).toBe("lib/event-log/grade-promotion.ts");
  });

  test("promoted envelope withWhat.memoryLayers is set when evidence provides them", () => {
    const source = makeT2Event(8);
    const evidence: T2ToT3Evidence = {
      refinementTarget: {
        kind: "other",
        filePathOrRid: "lib/event-log/grade-promotion.ts",
        description: "Test.",
        confidenceLevel: "high",
      },
      memoryLayers: ["semantic", "procedural"],
    };
    const result = promoteT2ToT3(source, evidence)!;

    expect(result.promotedEnvelope.withWhat?.memoryLayers).toEqual(["semantic", "procedural"]);
  });

  test("promoted envelope byWhom.agentName = grade-promotion-job", () => {
    const source = makeT2Event(9);
    const evidence = makeT2ToT3Evidence();
    const result = promoteT2ToT3(source, evidence)!;

    expect(result.promotedEnvelope.byWhom.agentName).toBe("grade-promotion-job");
  });

  test("source event is not mutated", () => {
    const source = makeT2EventWithRefinementTarget(10);
    const originalGrade = source.valueGrade;
    const evidence = makeT2ToT3Evidence();
    promoteT2ToT3(source, evidence);

    expect(source.valueGrade).toBe(originalGrade);
    expect((source.payload as Record<string, unknown>).promotedFrom).toBeUndefined();
  });
});

// ─── promoteT3ToT4 ─────────────────────────────────────────────────────────────

describe("promoteT3ToT4", () => {
  test("returns null when source grade is not T3", () => {
    const source = makeT2Event(1);
    const evidence = makeT3ToT4EvidenceCanonical();
    expect(promoteT3ToT4(source, evidence)).toBeNull();
  });

  test("returns null when no valid D2 evidence is provided", () => {
    const source = makeT3Event(1);
    const evidence: T3ToT4Evidence = {
      attestingIdentities: ["claude-code"], // only 1 identity — not canonical
      // no kLlmConsensus fallback marker
    };
    expect(promoteT3ToT4(source, evidence)).toBeNull();
  });

  test("returns null when attestingIdentities has only 1 unique identity", () => {
    const source = makeT3Event(2);
    const evidence: T3ToT4Evidence = {
      attestingIdentities: ["claude-code", "claude-code"], // duplicates collapse to 1
    };
    expect(promoteT3ToT4(source, evidence)).toBeNull();
  });

  test("D2-canonical happy path: ≥2 distinct identities → T4", () => {
    const source = makeT3Event(3);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence);

    expect(result).not.toBeNull();
    expect(result!.newGrade).toBe("T4");
    expect(result!.previousGrade).toBe("T3");
  });

  test("D2-canonical: promoted envelope has valueGrade T4", () => {
    const source = makeT3Event(4);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence)!;

    expect(result.promotedEnvelope.valueGrade).toBe("T4");
  });

  test("D2-canonical: withWhat.kLlmConsensus = dual-vendor-canonical", () => {
    const source = makeT3Event(5);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence)!;

    const withWhat = result.promotedEnvelope.withWhat as Record<string, unknown> | undefined;
    expect(withWhat?.kLlmConsensus).toBe("dual-vendor-canonical");
  });

  test("D2-canonical: withWhat.confidenceTier = high", () => {
    const source = makeT3Event(6);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence)!;

    const withWhat = result.promotedEnvelope.withWhat as Record<string, unknown> | undefined;
    expect(withWhat?.confidenceTier).toBe("high");
  });

  test("D2-fallback happy path: kLlmConsensus = single-vendor-attested → T4", () => {
    const source = makeT3Event(7);
    const evidence = makeT3ToT4EvidenceFallback();
    const result = promoteT3ToT4(source, evidence);

    expect(result).not.toBeNull();
    expect(result!.newGrade).toBe("T4");
  });

  test("D2-fallback: withWhat.kLlmConsensus = single-vendor-attested", () => {
    const source = makeT3Event(8);
    const evidence = makeT3ToT4EvidenceFallback();
    const result = promoteT3ToT4(source, evidence)!;

    const withWhat = result.promotedEnvelope.withWhat as Record<string, unknown> | undefined;
    expect(withWhat?.kLlmConsensus).toBe("single-vendor-attested");
  });

  test("D2-fallback: withWhat.confidenceTier = lower", () => {
    const source = makeT3Event(9);
    const evidence = makeT3ToT4EvidenceFallback();
    const result = promoteT3ToT4(source, evidence)!;

    const withWhat = result.promotedEnvelope.withWhat as Record<string, unknown> | undefined;
    expect(withWhat?.confidenceTier).toBe("lower");
  });

  test("promoted envelope payload carries promotedFrom = T3", () => {
    const source = makeT3Event(10);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence)!;

    const payload = result.promotedEnvelope.payload as Record<string, unknown>;
    expect(payload.promotedFrom).toBe("T3");
  });

  test("D2-canonical payload carries d2Path = canonical", () => {
    const source = makeT3Event(11);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence)!;

    const payload = result.promotedEnvelope.payload as Record<string, unknown>;
    expect(payload.d2Path).toBe("canonical");
  });

  test("D2-fallback payload carries d2Path = fallback", () => {
    const source = makeT3Event(12);
    const evidence = makeT3ToT4EvidenceFallback();
    const result = promoteT3ToT4(source, evidence)!;

    const payload = result.promotedEnvelope.payload as Record<string, unknown>;
    expect(payload.d2Path).toBe("fallback");
  });

  test("promoted envelope lineageRefs.actionRid points to source eventId", () => {
    const source = makeT3Event(13);
    const evidence = makeT3ToT4EvidenceCanonical();
    const result = promoteT3ToT4(source, evidence)!;

    expect(result.promotedEnvelope.lineageRefs?.actionRid).toBe(source.eventId as string);
  });

  test("source event is not mutated", () => {
    const source = makeT3Event(14);
    const originalGrade = source.valueGrade;
    const evidence = makeT3ToT4EvidenceCanonical();
    promoteT3ToT4(source, evidence);

    expect(source.valueGrade).toBe(originalGrade);
    expect((source.payload as Record<string, unknown>).promotedFrom).toBeUndefined();
  });
});

// ─── Chained promotion (T1→T2→T3→T4) ──────────────────────────────────────────

describe("chained promotion chain T1→T2→T3→T4", () => {
  test("T1 event can be promoted all the way to T4 via chained calls", () => {
    const t1Source = makeT1Event(1);

    // T1 → T2
    const evidenceT1 = makeT1ToT2Evidence("outcome-chain-1");
    const r12 = promoteT1ToT2(t1Source, evidenceT1)!;
    expect(r12).not.toBeNull();
    expect(r12.newGrade).toBe("T2");

    // T2 → T3 (use the promoted T2 envelope as source)
    const t2Env = { ...r12.promotedEnvelope, sequence: 2 } as EventEnvelope;
    const evidenceT2 = makeT2ToT3Evidence();
    const r23 = promoteT2ToT3(t2Env, evidenceT2)!;
    expect(r23).not.toBeNull();
    expect(r23.newGrade).toBe("T3");

    // T3 → T4 (use the promoted T3 envelope as source)
    const t3Env = { ...r23.promotedEnvelope, sequence: 3 } as EventEnvelope;
    const evidenceT3 = makeT3ToT4EvidenceCanonical();
    const r34 = promoteT3ToT4(t3Env, evidenceT3)!;
    expect(r34).not.toBeNull();
    expect(r34.newGrade).toBe("T4");

    // Final T4 envelope should still point back to the original T1 source
    expect((r34.promotedEnvelope.payload as Record<string, unknown>).promotedFrom).toBe("T3");
  });
});
