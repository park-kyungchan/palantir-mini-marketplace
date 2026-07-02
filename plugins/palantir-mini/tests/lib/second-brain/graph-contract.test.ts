// palantir-mini — graph-contract tests (W3 workstream B, LEARN lane).
// Pure runtime validation for the second-brain fold's governed NDJSON interchange:
// batch lines ({"kind":"batch",...}) and the terminal summary line
// ({"kind":"summary",...}). Covers accept + reject cases, actionable error shape
// (field/expected/found/batchIndex), and that a batch's per-verdict validation
// aggregates ALL errors (not just the first).

import { test, expect, describe } from "bun:test";
import {
  validateBatchLine,
  validateSummaryLine,
  validateVerdictEmitObj,
  formatGraphContractErrors,
} from "../../../lib/second-brain/graph-contract";

function verdictObj(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "resolution_verdict",
    payload: { verdict: "ADD", targetId: "node-1", derivedFrom: ["u1"] },
    memoryLayers: ["semantic", "episodic"],
    hypothesis: "test hypothesis",
    ...overrides,
  };
}

function batchLine(verdicts: unknown[], batchIndex = 0): Record<string, unknown> {
  return { kind: "batch", batchIndex, verdicts };
}

function summaryLine(overrides: Record<string, unknown> = {}, totalBatches = 2): Record<string, unknown> {
  return {
    kind: "summary",
    totalBatches,
    summary: {
      type: "memory_fold_committed",
      payload: { graphPath: "second-brain/graph.json", nodeCount: 9, edgeCount: 3, sessionId: "sess-1" },
      memoryLayers: ["semantic", "episodic"],
      hypothesis: "folded",
      ...overrides,
    },
  };
}

describe("graph-contract — validateBatchLine (accept)", () => {
  test("a well-formed batch with one valid verdict passes", () => {
    const r = validateBatchLine(batchLine([verdictObj()]));
    expect(r.ok).toBe(true);
  });

  test("a batch with an EMPTY verdicts array passes (0 new verdicts is valid)", () => {
    const r = validateBatchLine(batchLine([]));
    expect(r.ok).toBe(true);
  });

  test("a verdict without memoryLayers/hypothesis/refinementTarget (all optional) still passes", () => {
    const r = validateBatchLine(batchLine([{ type: "resolution_verdict", payload: { verdict: "NONE" } }]));
    expect(r.ok).toBe(true);
  });
});

describe("graph-contract — validateBatchLine (reject)", () => {
  test("wrong kind is rejected with an actionable field/expected/found error", () => {
    const r = validateBatchLine({ kind: "not-batch", batchIndex: 0, verdicts: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const kindErr = r.errors.find((e) => e.field === "kind");
      expect(kindErr).toBeDefined();
      expect(kindErr?.expected).toContain("batch");
      expect(kindErr?.found).toBe("string");
    }
  });

  test("missing batchIndex is rejected", () => {
    const r = validateBatchLine({ kind: "batch", verdicts: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "batchIndex")).toBe(true);
  });

  test("negative batchIndex is rejected", () => {
    const r = validateBatchLine(batchLine([], -1));
    expect(r.ok).toBe(false);
  });

  test("non-array verdicts is rejected", () => {
    const r = validateBatchLine({ kind: "batch", batchIndex: 0, verdicts: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "verdicts")).toBe(true);
  });

  test("an invalid verdict kind (payload.verdict not in ADD/UPDATE/DELETE/NONE) is rejected with batchIndex context", () => {
    const r = validateBatchLine(batchLine([verdictObj({ payload: { verdict: "BOGUS" } })], 3));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const err = r.errors.find((e) => e.field.includes("payload.verdict"));
      expect(err).toBeDefined();
      expect(err?.batchIndex).toBe(3);
      expect(err?.found).toBe("string");
    }
  });

  test("a verdict missing `type` is rejected", () => {
    const r = validateBatchLine(batchLine([{ payload: { verdict: "ADD" } }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field.endsWith(".type"))).toBe(true);
  });

  test("a verdict with non-object payload is rejected", () => {
    const r = validateBatchLine(batchLine([{ type: "resolution_verdict", payload: "nope" }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field.endsWith(".payload"))).toBe(true);
  });

  test("MULTIPLE invalid verdicts in one batch → ALL errors surfaced (not just the first)", () => {
    const r = validateBatchLine(
      batchLine([
        { type: "resolution_verdict", payload: { verdict: "BOGUS" } },
        { payload: { verdict: "ADD" } }, // missing type
      ]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field.includes("verdicts[0]"))).toBe(true);
      expect(r.errors.some((e) => e.field.includes("verdicts[1]"))).toBe(true);
    }
  });

  test("a totally malformed (non-object) line is rejected", () => {
    const r = validateBatchLine("not an object");
    expect(r.ok).toBe(false);
  });

  test("null is rejected", () => {
    const r = validateBatchLine(null);
    expect(r.ok).toBe(false);
  });
});

describe("graph-contract — validateVerdictEmitObj (single verdict, direct)", () => {
  test("a valid verdict at a given index/batchIndex passes", () => {
    const r = validateVerdictEmitObj(verdictObj(), 0, 5);
    expect(r.ok).toBe(true);
  });

  test("derivedFrom must be an array when present", () => {
    const r = validateVerdictEmitObj(verdictObj({ payload: { verdict: "ADD", derivedFrom: "not-an-array" } }), 0, 0);
    expect(r.ok).toBe(false);
  });
});

describe("graph-contract — validateSummaryLine (accept)", () => {
  test("a well-formed memory_fold_committed summary passes", () => {
    const r = validateSummaryLine(summaryLine());
    expect(r.ok).toBe(true);
  });
});

describe("graph-contract — validateSummaryLine (reject)", () => {
  test("wrong kind is rejected", () => {
    const r = validateSummaryLine({ kind: "batch", summary: {}, totalBatches: 1 });
    expect(r.ok).toBe(false);
  });

  test("missing totalBatches is rejected", () => {
    const s = summaryLine();
    delete (s as Record<string, unknown>).totalBatches;
    const r = validateSummaryLine(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "totalBatches")).toBe(true);
  });

  test("missing summary.payload.graphPath is rejected with an actionable field name", () => {
    const bad = summaryLine();
    const summaryObj = bad.summary as Record<string, unknown>;
    const payload = { ...(summaryObj.payload as Record<string, unknown>) };
    delete payload.graphPath;
    summaryObj.payload = payload;
    const r = validateSummaryLine(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const err = r.errors.find((e) => e.field === "summary.payload.graphPath");
      expect(err).toBeDefined();
      expect(err?.expected).toContain("string");
    }
  });

  test("non-finite nodeCount/edgeCount is rejected", () => {
    const bad = summaryLine();
    const summaryObj = bad.summary as Record<string, unknown>;
    summaryObj.payload = { ...(summaryObj.payload as Record<string, unknown>), nodeCount: "nine" };
    const r = validateSummaryLine(bad);
    expect(r.ok).toBe(false);
  });

  test("missing sessionId is rejected", () => {
    const bad = summaryLine();
    const summaryObj = bad.summary as Record<string, unknown>;
    const payload = { ...(summaryObj.payload as Record<string, unknown>) };
    delete payload.sessionId;
    summaryObj.payload = payload;
    const r = validateSummaryLine(bad);
    expect(r.ok).toBe(false);
  });

  test("malformed summary envelope (missing type) is rejected", () => {
    const bad = summaryLine();
    const summaryObj = bad.summary as Record<string, unknown>;
    delete summaryObj.type;
    const r = validateSummaryLine(bad);
    expect(r.ok).toBe(false);
  });
});

describe("graph-contract — formatGraphContractErrors", () => {
  test("renders field/expected/found/batchIndex into one readable line", () => {
    const r = validateBatchLine(batchLine([{ type: "resolution_verdict", payload: { verdict: "BOGUS" } }], 2));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = formatGraphContractErrors(r.errors);
      expect(msg).toContain("batchIndex=2");
      expect(msg).toContain("field=");
      expect(msg).toContain("expected=");
      expect(msg).toContain("found=");
    }
  });
});
