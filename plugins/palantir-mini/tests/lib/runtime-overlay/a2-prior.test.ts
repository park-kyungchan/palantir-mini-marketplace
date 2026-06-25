// palantir-mini — tests for lib/runtime-overlay/a2-prior.ts (Sink-1 READ)
//
// Covers:
//   - recentT3Plus surfaces a literal valueGrade ∈ {T3,T4}
//   - the BY-TYPE branch surfaces a freshly-emitted T2 lead_decision (the dogfood
//     READ gap) carrying reasoning + refinementTarget, even with NO T3 grade
//   - tail-only: lines beyond the tail window are NOT scanned (perf bound)
//   - the formatter returns a SINGLE non-empty line
//   - best-effort: missing file → empty result, "" line

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  readA2Prior,
  formatA2PriorLine,
  a2PriorContextLine,
  A2_PRIOR_TAIL_LINES,
} from "../../../lib/runtime-overlay/a2-prior";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-a2prior-"));
}

/** Minimal 5-dim-valid row builder. */
function row(extra: Record<string, unknown>): string {
  return JSON.stringify({
    when: "2026-06-25T00:00:00.000Z",
    atopWhich: "x",
    throughWhich: { sessionId: "s", toolName: "t", cwd: "/" },
    byWhom: { identity: "claude-code" },
    sequence: 1,
    ...extra,
  });
}

function writeEvents(dir: string, rows: string[]): string {
  const sdir = path.join(dir, ".palantir-mini", "session");
  fs.mkdirSync(sdir, { recursive: true });
  const epath = path.join(sdir, "events.jsonl");
  fs.writeFileSync(epath, rows.join("\n") + "\n", "utf8");
  return epath;
}

describe("a2-prior readA2Prior (Sink-1 READ)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("recentT3Plus surfaces a literal valueGrade ∈ {T3,T4}", () => {
    const epath = writeEvents(tmp, [
      row({ type: "edit_committed", valueGrade: "T1" }),
      row({ type: "sprint_completed", valueGrade: "T3", withWhat: { reasoning: "sprint passed all criteria after 2 iterations" } }),
      row({ type: "grading_completed", valueGrade: "T4" }),
    ]);

    const r = readA2Prior(epath);
    expect(r.recentT3Plus.length).toBe(2);
    expect(r.recentT3Plus.map((e) => e.valueGrade).sort()).toEqual(["T3", "T4"]);
    const t3 = r.recentT3Plus.find((e) => e.valueGrade === "T3");
    expect(t3?.type).toBe("sprint_completed");
    expect(t3?.reasoning).toContain("sprint passed");
    // T1 must NOT surface in the T3+ bucket
    expect(r.recentT3Plus.some((e) => e.type === "edit_committed")).toBe(false);
  });

  test("BY-TYPE branch surfaces a FRESH T2 lead_decision (dogfood READ gap) even with NO T3 grade", () => {
    // A freshly-emitted lead_decision carrying reasoning + refinementTarget but NOT
    // graded T3+ (valueGrade T2). The grade/heuristic path would NOT promote it yet;
    // the BY-TYPE branch must surface it regardless so it reaches the NEXT session.
    const epath = writeEvents(tmp, [
      row({
        type: "lead_decision",
        valueGrade: "T2",
        withWhat: {
          reasoning: "delegate STAGE 4 to an opus subagent; lead orchestrates only",
          refinementTarget: { kind: "code-impl", filePathOrRid: "lib/runtime-overlay/a2-prior.ts", description: "Sink-1 READ", confidenceLevel: "high" },
        },
      }),
    ]);

    const r = readA2Prior(epath);
    // Not promoted → absent from the T3+ bucket
    expect(r.recentT3Plus.length).toBe(0);
    // But surfaced BY TYPE, carrying reasoning + the refinementTarget pointer
    expect(r.recentFoldVerdicts.length).toBe(1);
    const v = r.recentFoldVerdicts[0]!;
    expect(v.type).toBe("lead_decision");
    expect(v.reasoning).toContain("delegate STAGE 4");
    expect(v.refinementTarget).toBe("lib/runtime-overlay/a2-prior.ts");

    // And the formatted line is non-empty and names the fresh decision.
    const line = formatA2PriorLine(r);
    expect(line).toContain("[A2-prior]");
    expect(line).toContain("lead_decision");
  });

  test("BY-TYPE also surfaces resolution_verdict + memory_fold_committed", () => {
    const epath = writeEvents(tmp, [
      row({ type: "resolution_verdict", withWhat: { reasoning: "ADD verdict for new node" } }),
      row({ type: "memory_fold_committed", withWhat: { reasoning: "folded session into graph" } }),
      row({ type: "session_started" }), // not a fold-verdict type → excluded
    ]);
    const r = readA2Prior(epath);
    const types = r.recentFoldVerdicts.map((v) => v.type).sort();
    expect(types).toEqual(["memory_fold_committed", "resolution_verdict"]);
  });

  test("recentOutcomePairs surfaces lineageRefs.outcomePairId", () => {
    const epath = writeEvents(tmp, [
      row({ type: "validation_phase_completed", lineageRefs: { outcomePairId: "op-123" } }),
      row({ type: "edit_committed" }), // no outcome pair
    ]);
    const r = readA2Prior(epath);
    expect(r.recentOutcomePairs.length).toBe(1);
    expect(r.recentOutcomePairs[0]!.outcomePairId).toBe("op-123");
  });

  test("tail-only: rows BEFORE the tail window are NOT scanned (perf bound)", () => {
    // One T3 row at the very top, then > A2_PRIOR_TAIL_LINES filler rows after it.
    // A full scan would surface the top T3; a tail-only scan must NOT.
    const filler = Array.from({ length: A2_PRIOR_TAIL_LINES + 50 }, () =>
      row({ type: "session_started" }),
    );
    const epath = writeEvents(tmp, [
      row({ type: "sprint_completed", valueGrade: "T3", withWhat: { reasoning: "this is BEFORE the tail window and must not surface" } }),
      ...filler,
    ]);

    const r = readA2Prior(epath);
    // Tail window only — the top T3 is out of range.
    expect(r.scannedLines).toBe(A2_PRIOR_TAIL_LINES);
    expect(r.recentT3Plus.length).toBe(0);
  });

  test("formatA2PriorLine returns a SINGLE non-empty line", () => {
    const epath = writeEvents(tmp, [
      row({ type: "lead_decision", valueGrade: "T2", withWhat: { reasoning: "pick approach A" } }),
      row({ type: "sprint_completed", valueGrade: "T3", withWhat: { reasoning: "passed" } }),
      row({ type: "edit_committed", lineageRefs: { outcomePairId: "op-9" } }),
    ]);
    const line = a2PriorContextLine(epath);
    expect(line.length).toBeGreaterThan(0);
    // Single line — no embedded newlines.
    expect(line.includes("\n")).toBe(false);
    expect(line.startsWith("[A2-prior]")).toBe(true);
  });

  test("best-effort: missing file → empty result + empty line", () => {
    const missing = path.join(tmp, ".palantir-mini", "session", "events.jsonl");
    const r = readA2Prior(missing);
    expect(r.recentT3Plus).toEqual([]);
    expect(r.recentFoldVerdicts).toEqual([]);
    expect(r.recentOutcomePairs).toEqual([]);
    expect(r.scannedLines).toBe(0);
    expect(a2PriorContextLine(missing)).toBe("");
  });

  test("malformed rows are skipped, not thrown", () => {
    const sdir = path.join(tmp, ".palantir-mini", "session");
    fs.mkdirSync(sdir, { recursive: true });
    const epath = path.join(sdir, "events.jsonl");
    fs.writeFileSync(
      epath,
      "{not json\n" + row({ type: "lead_decision", valueGrade: "T2", withWhat: { reasoning: "ok" } }) + "\n",
      "utf8",
    );
    const r = readA2Prior(epath);
    expect(r.recentFoldVerdicts.length).toBe(1);
  });
});
