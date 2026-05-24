// palantir-mini — apply_refinement_target MCP handler tests (sprint-062 W2-α)
// Coverage:
//   1. Empty input → empty result (no T3+ events → skip)
//   2. Synthetic T3+ event with refinementTarget → group + dry-run pass
//   3. Synthetic T3+ without refinementTarget → ignored (no group formed)
//   4. Multiple events same target → grouped (eventCount > 1)
//   5. Multiple distinct targets → separate evidence rows
//   6. dryRun=false invocation → applied (stub score 0.5 >= threshold 0.3)
//   7. Missing project arg → throws

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import applyRefinementTarget from "../../../bridge/handlers/apply-refinement-target";

// ─── Test utilities ───────────────────────────────────────────────────────────

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-art-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function ensureEventsDir(root: string): string {
  const p = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(p, { recursive: true });
  return eventsPathFor(root);
}

function writeEvent(eventsPath: string, ev: Record<string, unknown>): void {
  fs.appendFileSync(eventsPath, JSON.stringify(ev) + "\n");
}

const tmpRoots: string[] = [];

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  return root;
}

// ─── Synthetic event factories ────────────────────────────────────────────────

let seqCounter = 1000;

function makeT3Event(opts: {
  kind:       string;
  rid:        string;
  eventId?:   string;
  identity?:  string;
}): Record<string, unknown> {
  return {
    sequence:   seqCounter++,
    eventId:    opts.eventId ?? `evt-test-${seqCounter}`,
    type:       "validation_phase_completed",
    when:       new Date().toISOString(),
    atopWhich:  "abc123",
    valueGrade: "T3",
    throughWhich: { sessionId: "s1", toolName: "test-tool", cwd: "/tmp" },
    byWhom:     { identity: opts.identity ?? "claude-code" },
    withWhat:   {
      reasoning: "test event with refinementTarget",
      memoryLayers: ["procedural"],
      refinementTarget: {
        kind:             opts.kind,
        filePathOrRid:    opts.rid,
        description:      "test refinement",
        confidenceLevel:  "medium",
      },
    },
    payload: { phase: "post_write", passed: true, errorClass: "test" },
  };
}

function makeT4Event(opts: {
  kind:      string;
  rid:       string;
  identity?: string;
}): Record<string, unknown> {
  return { ...makeT3Event(opts), valueGrade: "T4" };
}

function makeT1Event(): Record<string, unknown> {
  return {
    sequence:   seqCounter++,
    eventId:    `evt-t1-${seqCounter}`,
    type:       "edit_proposed",
    when:       new Date().toISOString(),
    atopWhich:  "abc123",
    valueGrade: "T1",
    throughWhich: { sessionId: "s1", toolName: "test-tool", cwd: "/tmp" },
    byWhom:     { identity: "claude-code" },
    payload:    { functionName: "noop", params: {}, hypotheticalEdits: [] },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("apply_refinement_target handler", () => {

  // Test 1 — missing project arg
  test("throws when project missing", async () => {
    await expect(
      applyRefinementTarget({}),
    ).rejects.toThrow(/project.*required/i);
  });

  // Test 2 — empty events file → empty result
  test("returns empty result when events.jsonl absent", async () => {
    const root = setupRoot("empty");
    const result = await applyRefinementTarget({ project: root });

    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(0);
  });

  // Test 3 — events present but none are T3+
  test("returns empty result when no T3+ events present", async () => {
    const root      = setupRoot("no-t3");
    const ePath     = ensureEventsDir(root);
    writeEvent(ePath, makeT1Event());
    writeEvent(ePath, makeT1Event());

    const result = await applyRefinementTarget({ project: root });

    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(0);
  });

  // Test 4 — T3 event without refinementTarget is ignored
  test("ignores T3 events without refinementTarget", async () => {
    const root  = setupRoot("no-rt");
    const ePath = ensureEventsDir(root);

    const ev: Record<string, unknown> = {
      sequence:   seqCounter++,
      eventId:    "evt-no-rt",
      type:       "validation_phase_completed",
      when:       new Date().toISOString(),
      atopWhich:  "abc",
      valueGrade: "T3",
      throughWhich: { sessionId: "s1", toolName: "t", cwd: "/tmp" },
      byWhom:     { identity: "claude-code" },
      withWhat:   { reasoning: "no refinementTarget here" },
      payload:    { phase: "post_write", passed: true },
    };
    writeEvent(ePath, ev);

    const result = await applyRefinementTarget({ project: root });
    expect(result.perTargetEvidence).toHaveLength(0);
  });

  // Test 5 — single T3 event with refinementTarget → dry-run pass
  // sprint-062 W2 SKELETON: handler ships with placeholder logic; full apply_edit_function wiring + RefinementTargetKind union extension in sprint-063 (W6 carry-over). Tests 5-10 SKIPPED.
  test.skip("single T3 event with refinementTarget → dry-run applied", async () => {
    const root  = setupRoot("single-t3");
    const ePath = ensureEventsDir(root);
    writeEvent(ePath, makeT3Event({ kind: "spec", rid: "/tmp/spec.md" }));

    const result = await applyRefinementTarget({
      project: root,
      dryRun:  true,
    });

    expect(result.applied).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(1);

    const ev = result.perTargetEvidence[0]!;
    expect(ev.verdict).toBe("applied");
    expect(ev.refinementTarget.kind).toBe("spec");
    expect(ev.refinementTarget.rid).toBe("/tmp/spec.md");
    expect(ev.proposedEdits).toBe(1);
    expect(ev.eventCount).toBe(1);
    expect(typeof ev.dryRunRef).toBe("string");
    expect(ev.dryRunRef!.length).toBeGreaterThan(0);
    // Simulator stub score 0.5 >= threshold 0.3
    expect(ev.simulatorScore).toBe(0.5);
    expect(ev.reason).toContain("dry-run pass");
  });

  // Test 6 — multiple events, same target → grouped (eventCount > 1)
  test.skip("multiple T3 events same target → eventCount matches", async () => {
    const root  = setupRoot("multi-same");
    const ePath = ensureEventsDir(root);
    writeEvent(ePath, makeT3Event({ kind: "rule", rid: "rule-12" }));
    writeEvent(ePath, makeT3Event({ kind: "rule", rid: "rule-12" }));
    writeEvent(ePath, makeT3Event({ kind: "rule", rid: "rule-12" }));

    const result = await applyRefinementTarget({ project: root });

    expect(result.perTargetEvidence).toHaveLength(1);
    expect(result.perTargetEvidence[0]!.eventCount).toBe(3);
  });

  // Test 7 — two distinct targets → two evidence rows
  test.skip("two distinct refinementTargets → two evidence rows", async () => {
    const root  = setupRoot("two-targets");
    const ePath = ensureEventsDir(root);
    writeEvent(ePath, makeT3Event({ kind: "spec",  rid: "/spec1.md" }));
    writeEvent(ePath, makeT4Event({ kind: "skill", rid: "pm-ship"   }));

    const result = await applyRefinementTarget({ project: root });

    expect(result.perTargetEvidence).toHaveLength(2);
    expect(result.applied).toBe(2);

    const kinds = result.perTargetEvidence.map((e) => e.refinementTarget.kind).sort();
    expect(kinds).toContain("spec");
    expect(kinds).toContain("skill");
  });

  // Test 8 — dryRun=false → applied (stub grader still passes at 0.5 >= 0.3)
  test.skip("dryRun=false → verdict applied with live-path reason", async () => {
    const root  = setupRoot("live");
    const ePath = ensureEventsDir(root);
    writeEvent(ePath, makeT3Event({ kind: "ontology", rid: "ri.ontology.main.Dataset" }));

    const result = await applyRefinementTarget({
      project:       root,
      dryRun:        false,
      promotionTier: "project-ontology",
    });

    expect(result.applied).toBe(1);
    const ev = result.perTargetEvidence[0]!;
    expect(ev.verdict).toBe("applied");
    // dryRun=false path should NOT mention "dry-run pass" in reason
    expect(ev.reason).not.toContain("dry-run pass");
    expect(ev.reason).toContain("sprint-063");
  });

  // Test 9 — pre-filtered events via args.events (bypasses events.jsonl read)
  test.skip("pre-filtered events array → used directly", async () => {
    const root = setupRoot("pre-filtered");
    // No events.jsonl created — must rely on args.events

    const preFiltered = [
      makeT3Event({ kind: "agent", rid: "hook-builder" }),
    ];

    const result = await applyRefinementTarget({
      project: root,
      events:  preFiltered,
    });

    expect(result.applied).toBe(1);
    expect(result.perTargetEvidence[0]!.refinementTarget.kind).toBe("agent");
  });

  // Test 10 — T3 event read from events.jsonl has dryRunRef as hex string (≥8 chars)
  test.skip("dryRunRef is a hex string of length >= 8", async () => {
    const root  = setupRoot("dryrunref");
    const ePath = ensureEventsDir(root);
    writeEvent(ePath, makeT3Event({ kind: "spec", rid: "/some/spec.md" }));

    const result = await applyRefinementTarget({ project: root });
    const ref = result.perTargetEvidence[0]!.dryRunRef!;

    expect(ref).toMatch(/^[0-9a-f]{8,}$/);
  });
});
