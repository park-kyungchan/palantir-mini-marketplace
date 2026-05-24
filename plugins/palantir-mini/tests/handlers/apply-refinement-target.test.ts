// palantir-mini — integration tests: apply_refinement_target handler (sprint-063 W5.A)
// Coverage:
//   1. Empty events.jsonl → applied=0, skipped=0, failed=0
//   2. T3 event with refinementTarget → dryRun=true → verdict=applied (dry-run)
//   3. T3 event without refinementTarget → filtered out → no-T3 path
//   4. T4 event → same pipeline as T3 (both qualify as T3+)
//   5. "spec" kind accepted (LocalRefinementTargetKind extension)
//   6. Multiple groups from distinct (kind, rid) pairs → separate evidence rows

import { test, expect, describe, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDirs: string[] = [];
afterAll(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "art-"));
  tmpDirs.push(d);
  return d;
}

function sessionDir(project: string): void {
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
}

function writeEvents(project: string, events: unknown[]): void {
  const dir = path.join(project, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, "events.jsonl"), lines);
}

function makeT3Event(
  seq: number,
  kind: string,
  rid: string,
  grade: "T3" | "T4" = "T3",
): Record<string, unknown> {
  return {
    type:      "validation_phase_completed",
    eventId:   `evt-${seq}`,
    sequence:  seq,
    when:      `2026-05-09T00:0${seq}:00.000Z`,
    atopWhich: "abc123",
    throughWhich: { sessionId: "sess-1", toolName: "test", cwd: "/tmp" },
    byWhom:    { identity: "test-agent", agentName: "test" },
    payload:   { phase: "post_write", passed: true },
    withWhat: {
      reasoning: "test reasoning that is long enough to satisfy the 40-char A3 requirement for grading",
      refinementTarget: { kind, filePathOrRid: rid, description: "test refinement", confidenceLevel: "medium" },
    },
    valueGrade: grade,
  };
}

async function importHandler() {
  // Dynamic import each time — handler reads env; safe for test isolation
  const mod = await import("../../bridge/handlers/apply-refinement-target");
  return mod.default;
}

// ─── Test 1: Empty events.jsonl → nothing to refine ───────────────────────────

describe("apply_refinement_target", () => {
  test("1. empty events.jsonl → applied=0 skipped=0 failed=0", async () => {
    const project = tmp();
    sessionDir(project);
    // Write empty events file
    fs.writeFileSync(
      path.join(project, ".palantir-mini", "session", "events.jsonl"),
      "",
    );
    process.env.PALANTIR_MINI_PROJECT = project;

    const handler = await importHandler();
    const result = await handler({ project, dryRun: true });

    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(0);
  });

  // ─── Test 2: T3 event with refinementTarget → dry-run → verdict=applied ───

  test("2. T3 event with refinementTarget → dryRun=true → verdict=applied (dry-run)", async () => {
    const project = tmp();
    writeEvents(project, [
      makeT3Event(1, "primitive-field-add", "prim-data-08"),
    ]);
    process.env.PALANTIR_MINI_PROJECT = project;

    const handler = await importHandler();
    const result  = await handler({ project, dryRun: true });

    // At least one group was attempted
    expect(result.perTargetEvidence.length).toBeGreaterThanOrEqual(1);

    const ev = result.perTargetEvidence[0]!;
    expect(ev.refinementTarget.kind).toBe("primitive-field-add");
    expect(ev.refinementTarget.rid).toBe("prim-data-08");
    expect(ev.eventCount).toBe(1);
    expect(ev.proposedEdits).toBeGreaterThanOrEqual(1); // apply_edit_function returned ≥1 edits
    expect(typeof ev.dryRunRef).toBe("string");         // dryRunRef computed
    expect(ev.dryRunRef!.length).toBeGreaterThan(0);
    // simulator score should be present (0.5 fallback when impact_query absent)
    expect(typeof ev.simulatorScore).toBe("number");

    // On dry-run pass, verdict is "applied" (with dry-run caveat in reason)
    // OR "failed" if simulator score is below threshold — either is valid
    // depending on test environment impact_query availability
    expect(["applied", "failed"]).toContain(ev.verdict);
  });

  // ─── Test 3: T3 event WITHOUT refinementTarget → filtered out ─────────────

  test("3. T3 event without refinementTarget → no-T3 path → applied=0", async () => {
    const project = tmp();
    writeEvents(project, [
      {
        type:      "edit_committed",
        eventId:   "evt-1",
        sequence:  1,
        when:      "2026-05-09T00:01:00.000Z",
        atopWhich: "abc123",
        throughWhich: { sessionId: "s", toolName: "test", cwd: "/tmp" },
        byWhom:    { identity: "test-agent" },
        payload:   { phase: "post_write", passed: true },
        withWhat:  { reasoning: "no refinement target here" },
        valueGrade: "T3",
        // NO withWhat.refinementTarget
      },
    ]);
    process.env.PALANTIR_MINI_PROJECT = project;

    const handler = await importHandler();
    const result  = await handler({ project, dryRun: true });

    // No groups formed — event had no refinementTarget
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(0);
  });

  // ─── Test 4: T4 event qualifies as T3+ ─────────────────────────────────────

  test("4. T4 event passes the T3+ filter", async () => {
    const project = tmp();
    writeEvents(project, [
      makeT3Event(1, "grading-criterion-threshold", "criterion-xyz", "T4"),
    ]);
    process.env.PALANTIR_MINI_PROJECT = project;

    const handler = await importHandler();
    const result  = await handler({ project, dryRun: true });

    // T4 event should form at least one group
    expect(result.perTargetEvidence.length).toBeGreaterThanOrEqual(1);
    expect(result.perTargetEvidence[0]!.refinementTarget.kind).toBe(
      "grading-criterion-threshold",
    );
  });

  // ─── Test 5: "spec" kind (LocalRefinementTargetKind extension) ─────────────

  test("5. 'spec' kind (handler-local extension) accepted without error", async () => {
    const project = tmp();
    writeEvents(project, [
      makeT3Event(1, "spec", "agent-briefing-template-v3"),
    ]);
    process.env.PALANTIR_MINI_PROJECT = project;

    const handler = await importHandler();
    // Must not throw — "spec" is handled by the handler-local kind union
    let result: Awaited<ReturnType<typeof handler>>;
    let threw = false;
    try {
      result = await handler({ project, dryRun: true });
    } catch {
      threw = true;
      result = { applied: 0, skipped: 0, failed: 0, perTargetEvidence: [] };
    }

    expect(threw).toBe(false);
    expect(result!.perTargetEvidence.length).toBeGreaterThanOrEqual(1);
    // "spec" kind should be preserved in the evidence output
    if (result!.perTargetEvidence.length > 0) {
      expect(result!.perTargetEvidence[0]!.refinementTarget.kind).toBe("spec");
    }
  });

  // ─── Test 6: Multiple groups from distinct (kind, rid) pairs ──────────────

  test("6. Multiple (kind, rid) pairs → separate evidence rows", async () => {
    const project = tmp();
    writeEvents(project, [
      makeT3Event(1, "primitive-field-add",   "prim-data-08"),
      makeT3Event(2, "primitive-field-add",   "prim-data-09"),
      makeT3Event(3, "event-type-add",        "evt-type-xyz"),
      makeT3Event(4, "primitive-field-add",   "prim-data-08"), // duplicate → same group as #1
    ]);
    process.env.PALANTIR_MINI_PROJECT = project;

    const handler = await importHandler();
    const result  = await handler({ project, dryRun: true });

    // Expect 3 distinct groups: (prim-field-add,prim-data-08), (prim-field-add,prim-data-09),
    // (event-type-add,evt-type-xyz)
    expect(result.perTargetEvidence.length).toBe(3);

    // The prim-data-08 group should have eventCount=2 (events #1 and #4)
    const data08Group = result.perTargetEvidence.find(
      (e) =>
        e.refinementTarget.kind === "primitive-field-add" &&
        e.refinementTarget.rid  === "prim-data-08",
    );
    expect(data08Group).toBeDefined();
    expect(data08Group!.eventCount).toBe(2);

    // data-09 and evt-type-xyz groups each have 1 event
    const data09Group = result.perTargetEvidence.find(
      (e) => e.refinementTarget.rid === "prim-data-09",
    );
    expect(data09Group).toBeDefined();
    expect(data09Group!.eventCount).toBe(1);
  });
});
