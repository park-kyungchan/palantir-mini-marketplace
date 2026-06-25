// palantir-mini — paired + DOGFOOD test for lib/lead-intent/lead-decision-emit-cli.ts (P3)
//
// The dogfood loop this proves end-to-end:
//   1. emitLeadDecision() lands a `lead_decision` event (T3, with refinementTarget)
//      into a fixture <root>/.palantir-mini/session/events.jsonl via Path-B emit().
//   2. readA2Prior() / a2PriorContextLine() (the Sink-1 READ from Stage 4) tail-reads
//      that SAME file and folds the decision back.
//   3. ASSERT the Lead's decision (its reasoning) appears in the returned [A2-prior]
//      line — the concrete proof this session's evidence folds into the NEXT session.
//
// Also covers:
//   - the emitted row grades T3 (5-dim + memoryLayers + hypothesis + refinementTarget)
//   - identity is the REAL runtime (never "monitor") — a Lead decision is a runtime decision
//   - parseDecisionObj rejects malformed input (fail-closed on missing decision/reasoning/memoryLayers)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  emitLeadDecision,
  parseDecisionObj,
  type LeadDecisionObj,
} from "../../../lib/lead-intent/lead-decision-emit-cli";
import { readA2Prior, a2PriorContextLine } from "../../../lib/runtime-overlay/a2-prior";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-lead-decision-"));
}

/** Canonical per-project events.jsonl path that emit() writes to for `root`. */
function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

/** Read + JSON-parse every row in the fixture events.jsonl. */
function readRows(root: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(eventsPath(root), "utf8");
  return raw
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe("lead-decision-emit-cli (P3 Path-B governed emit)", () => {
  let tmp: string;
  let savedEventsFile: string | undefined;

  beforeEach(() => {
    tmp = makeTmpDir();
    // Isolate from any ambient events-file override so emit() writes to the
    // canonical <root>/.palantir-mini/session/events.jsonl path under our tmpdir.
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  });
  afterEach(() => {
    if (savedEventsFile === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
    else process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("DOGFOOD: a T3 lead_decision folds back into the [A2-prior] line", async () => {
    const decision = "delegate STAGE 5 to an opus subagent; lead orchestrates only";
    const obj: LeadDecisionObj = {
      decision,
      // The WHY (rule 26 §Axis A) echoes the decision — this is what a2-prior surfaces.
      reasoning: decision,
      // Axis B — hypothesis present → grade reaches ≥T2.
      hypothesis: "Path-B emit lands the decision where the fold READ can surface it",
      // Axis C — refinementTarget present → grade reaches T3.
      refinementTarget: {
        kind: "event-type-add",
        filePathOrRid: "lib/lead-intent/lead-decision-emit-cli.ts",
        description: "P3 Lead-decision Path-B governed emit",
        confidenceLevel: "high",
      },
      // Axis E — explicit memory layers (lead_decision has no AUTO_TAG_HEURISTICS entry).
      memoryLayers: ["episodic", "procedural"],
    };

    const seq = await emitLeadDecision(obj, tmp, "sess-stage5");
    expect(typeof seq).toBe("number");

    // ─── The emitted row is a graded lead_decision with the REAL runtime identity ───
    const rows = readRows(tmp);
    const leadRows = rows.filter((r) => r["type"] === "lead_decision");
    expect(leadRows.length).toBe(1);
    const ev = leadRows[0]!;
    // T3 — 5-dim + memoryLayers + hypothesis (B) + refinementTarget (C).
    expect(ev["valueGrade"]).toBe("T3");
    // payload carries the decision string.
    expect((ev["payload"] as { decision?: string }).decision).toBe(decision);
    // identity is the real runtime, NEVER "monitor".
    expect((ev["byWhom"] as { identity?: string }).identity).not.toBe("monitor");
    expect((ev["byWhom"] as { identity?: string }).identity).toBe("claude-code");

    // ─── DOGFOOD: a2-prior (Sink-1 READ) surfaces the decision NEXT session ───
    const r = readA2Prior(eventsPath(tmp));
    // Surfaced BY TYPE (the load-bearing dogfood branch), even though it is not T3+
    // in the literal-grade bucket scan (T3 grade IS surfaced too, but the BY-TYPE
    // branch is the gap this closes).
    const verdict = r.recentFoldVerdicts.find((v) => v.type === "lead_decision");
    expect(verdict).toBeDefined();
    expect(verdict!.refinementTarget).toBe("lib/lead-intent/lead-decision-emit-cli.ts");

    // The concrete dogfood assertion: the decision string folds back into the line.
    const line = a2PriorContextLine(eventsPath(tmp));
    expect(line).toContain("[A2-prior]");
    expect(line).toContain("lead_decision");
    // a2-prior clips reasoning to 60 chars; assert a decision substring within that window.
    expect(line).toContain(decision.slice(0, 40));
  });

  test("grades ≥T2 even WITHOUT refinementTarget (hypothesis supplies axis B)", async () => {
    const obj: LeadDecisionObj = {
      decision: "pick approach A over B for the fold READ",
      reasoning: "approach A keeps the SessionStart budget bounded",
      hypothesis: "tail-only read stays within ~50ms",
      memoryLayers: ["procedural"],
    };
    await emitLeadDecision(obj, tmp, "sess-t2");
    const ev = readRows(tmp).find((r) => r["type"] === "lead_decision")!;
    // No refinementTarget → axis C absent → caps at T2 (still ≥T2, the floor the stage requires).
    expect(ev["valueGrade"]).toBe("T2");
  });

  test("parseDecisionObj rejects malformed input (fail-closed)", () => {
    expect(() => parseDecisionObj("{not json")).toThrow(/valid JSON/);
    expect(() => parseDecisionObj("[]")).toThrow(/must be a JSON object/);
    expect(() => parseDecisionObj(JSON.stringify({ reasoning: "x", memoryLayers: ["procedural"] })))
      .toThrow(/decision must be a non-empty string/);
    expect(() => parseDecisionObj(JSON.stringify({ decision: "d", memoryLayers: ["procedural"] })))
      .toThrow(/reasoning must be a non-empty string/);
    expect(() => parseDecisionObj(JSON.stringify({ decision: "d", reasoning: "r" })))
      .toThrow(/memoryLayers must be a non-empty/);
    expect(() => parseDecisionObj(JSON.stringify({ decision: "d", reasoning: "r", memoryLayers: [] })))
      .toThrow(/memoryLayers must be a non-empty/);
  });

  test("parseDecisionObj accepts a well-formed decision (round-trip)", () => {
    const obj = parseDecisionObj(
      JSON.stringify({
        decision: "delegate task #1",
        reasoning: "lead orchestrates, subagent implements",
        memoryLayers: ["episodic"],
      }),
    );
    expect(obj.decision).toBe("delegate task #1");
    expect(obj.memoryLayers).toEqual(["episodic"]);
  });
});
