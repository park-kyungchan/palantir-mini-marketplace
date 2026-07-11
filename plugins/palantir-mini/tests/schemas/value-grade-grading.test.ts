// Tests: schemas package canonical rule-26 auto-grader (P1 unification S3,
// schemas v1.96.0). Ports the tier-ladder tests that previously pinned the
// inline bridge/handlers/emit-event.ts implementation (see
// tests/governance/rule-26-doc-grading-conformance.test.ts, which now
// exercises the RE-EXPORT path) and adds fixtures covering EVERY tier
// transition plus the two edge-case orderings the 16-fixture differential
// harness locked (D2 consulted only AFTER axis C; empty lineageRefs object is
// NOT an axis-B signal).
//
// Imports via the #schemas alias (package.json `imports` — direct file
// mapping to runtime-overlay/schemas-snapshot/*, no node_modules
// re-materialization required for a newly added module).

import { describe, test, expect } from "bun:test";
import {
  autoGradeEnvelope,
  type GradeableEnvelope,
} from "#schemas/ontology/lineage/value-grade-grading";

function baseFiveDim(): GradeableEnvelope {
  return {
    when: "2026-07-11T00:00:00.000Z",
    atopWhich: "deadbeefcafe",
    throughWhich: { sessionId: "sess-1", toolName: "test", cwd: "/tmp/x" },
    byWhom: { identity: "test-agent" },
    payload: {},
  };
}

describe("autoGradeEnvelope — T0 (A1 5-dim completeness)", () => {
  test.each([
    ["when", { ...baseFiveDim(), when: undefined }],
    ["atopWhich", { ...baseFiveDim(), atopWhich: "" }],
    ["throughWhich.sessionId", { ...baseFiveDim(), throughWhich: { sessionId: "", toolName: "t", cwd: "/tmp" } }],
    ["throughWhich.toolName", { ...baseFiveDim(), throughWhich: { sessionId: "s", cwd: "/tmp" } }],
    ["throughWhich.cwd", { ...baseFiveDim(), throughWhich: { sessionId: "s", toolName: "t" } }],
    ["byWhom.identity", { ...baseFiveDim(), byWhom: {} }],
  ] as [string, GradeableEnvelope][])("missing %s → T0", (_name, env) => {
    expect(autoGradeEnvelope(env)).toBe("T0");
  });
});

describe("autoGradeEnvelope — T1 (A full, E gate)", () => {
  test("5-dim full but memoryLayers absent → T1", () => {
    expect(autoGradeEnvelope(baseFiveDim())).toBe("T1");
  });

  test("memoryLayers EMPTY array counts as missing → T1", () => {
    expect(
      autoGradeEnvelope({ ...baseFiveDim(), withWhat: { memoryLayers: [] } }),
    ).toBe("T1");
  });

  test("E present but no axis-B signal → T1 (ceiling)", () => {
    expect(
      autoGradeEnvelope({ ...baseFiveDim(), withWhat: { memoryLayers: ["procedural"] } }),
    ).toBe("T1");
  });

  test("EMPTY lineageRefs object is NOT an axis-B signal → T1", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: { memoryLayers: ["procedural"] },
        lineageRefs: {},
      }),
    ).toBe("T1");
  });
});

describe("autoGradeEnvelope — T2 (axis B: lineageRefs OR hypothesis)", () => {
  test("E + lineageRefs.actionRid → T2", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: { memoryLayers: ["procedural"] },
        lineageRefs: { actionRid: "act-1" },
      }),
    ).toBe("T2");
  });

  test("E + hypothesis → T2", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: { memoryLayers: ["procedural"], hypothesis: "B-axis signal" },
      }),
    ).toBe("T2");
  });

  test("ordering edge: kLlmConsensus WITHOUT axis C stays T2 (D2 consulted only after C)", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: { memoryLayers: ["procedural"], hypothesis: "h" },
        payload: { kLlmConsensus: "dual-vendor" },
      }),
    ).toBe("T2");
  });
});

describe("autoGradeEnvelope — T3 (axis C: refinementTarget OR payload.failureCategory)", () => {
  test("E+B + withWhat.refinementTarget → T3", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: {
          memoryLayers: ["procedural"],
          hypothesis: "h",
          refinementTarget: { kind: "other", filePathOrRid: "x", description: "d", confidenceLevel: "high" },
        },
      }),
    ).toBe("T3");
  });

  test("E+B + payload.failureCategory → T3", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: { memoryLayers: ["procedural"], hypothesis: "h" },
        payload: { failureCategory: "fc-1" },
      }),
    ).toBe("T3");
  });
});

describe("autoGradeEnvelope — T4 (axis D2: payload.kLlmConsensus, full ladder)", () => {
  test("E+B+C + payload.kLlmConsensus → T4", () => {
    expect(
      autoGradeEnvelope({
        ...baseFiveDim(),
        withWhat: {
          memoryLayers: ["procedural"],
          hypothesis: "h",
          refinementTarget: { kind: "other", filePathOrRid: "x", description: "d", confidenceLevel: "high" },
        },
        payload: { kLlmConsensus: "dual-vendor" },
      }),
    ).toBe("T4");
  });
});
