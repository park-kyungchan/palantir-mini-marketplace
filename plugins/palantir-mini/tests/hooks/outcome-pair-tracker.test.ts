// palantir-mini v4.1.0 — outcome-pair-tracker hook tests (rule 26 §Axis B1)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import outcomePairTracker, {
  classifyPairRole,
  scanOrphans,
} from "../../hooks/outcome-pair-tracker";
import type { OutcomePairingRid } from "#schemas/ontology/primitives/outcome-pairing";

const EMIT_EVENT_TOOL = "mcp__plugin_palantir-mini_palantir-mini__emit_event";
let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-outcome-pair-tracker-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

function pairsDir(): string {
  return path.join(TMP, ".palantir-mini", "session", "outcome-pairs");
}

function listMarkers(): string[] {
  if (!fs.existsSync(pairsDir())) return [];
  return fs.readdirSync(pairsDir()).filter((f) => f.endsWith(".json"));
}

describe("classifyPairRole", () => {
  test("named open events", () => {
    expect(classifyPairRole("edit_proposed")).toBe("open");
    expect(classifyPairRole("dry_run_computed")).toBe("open");
    expect(classifyPairRole("harness_agent_spawned")).toBe("open");
    expect(classifyPairRole("feedback_loop_opened")).toBe("open");
  });

  test("named close events", () => {
    expect(classifyPairRole("edit_committed")).toBe("close");
    expect(classifyPairRole("dry_run_graded")).toBe("close");
    expect(classifyPairRole("sprint_completed")).toBe("close");
    expect(classifyPairRole("feedback_loop_closed")).toBe("close");
  });

  test("suffix-based fallback", () => {
    expect(classifyPairRole("foo_proposed")).toBe("open");
    expect(classifyPairRole("foo_observed")).toBe("close");
    expect(classifyPairRole("foo_completed")).toBe("close");
    expect(classifyPairRole("foo_committed")).toBe("close");
  });

  test("_started suffix is NOT auto-open (lifecycle marker risk)", () => {
    // skill_started, session_started etc. are lifecycle, not pair halves.
    // Named events handle real _started pairs explicitly.
    expect(classifyPairRole("skill_started")).toBe(null);
    expect(classifyPairRole("foo_started")).toBe(null);
  });

  test("non-pair-able events", () => {
    expect(classifyPairRole("session_started")).toBe(null);
    expect(classifyPairRole("user_prompt_submitted")).toBe(null);
    expect(classifyPairRole("phase_completed")).toBe(null); // lifecycle marker, not pair
    expect(classifyPairRole("session_ended")).toBe(null);
  });
});

describe("outcomePairTracker", () => {
  test("skips non-emit_event tool", async () => {
    const result = await outcomePairTracker({
      tool_name: "Bash",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("OPEN: edit_proposed creates marker keyed by actionRid", async () => {
    const result = await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "edit_proposed",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          lineageRefs: { actionRid: "act-001" },
          payload: { functionName: "test", hypotheticalEdits: [] },
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("opened pair");

    const markers = listMarkers();
    expect(markers.length).toBe(1);
    const decl = JSON.parse(fs.readFileSync(path.join(pairsDir(), markers[0]!), "utf8"));
    expect(decl.actionRid).toBe("act-001");
    expect(decl.refinedOutcome).toBeUndefined();
  });

  test("CLOSE: edit_committed with same actionRid mutates marker to closed", async () => {
    // First open
    await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "edit_proposed",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          lineageRefs: { actionRid: "act-002" },
          payload: {},
        },
      },
    });
    expect(listMarkers().length).toBe(1);

    // Then close
    const result = await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "edit_committed",
          eventId: "evt-2",
          when: "2026-05-03T19:01:00.000Z",
          lineageRefs: { actionRid: "act-002" },
          payload: { actionTypeRid: "test", appliedEdits: [], submissionCriteriaPassed: [] },
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("closed pair");

    const markers = listMarkers();
    expect(markers.length).toBe(1);
    const decl = JSON.parse(fs.readFileSync(path.join(pairsDir(), markers[0]!), "utf8"));
    expect(decl.actionRid).toBe("act-002");
    expect(decl.refinedOutcome).toBeDefined();
    expect(decl.closedAt).toBe("2026-05-03T19:01:00.000Z");
    expect(decl.deltaMetrics?.latencyMs).toBe(60000); // 1 min
  });

  test("OPEN idempotency: re-firing same actionRid is no-op", async () => {
    const callPayload = {
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "edit_proposed",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          lineageRefs: { actionRid: "act-003" },
          payload: {},
        },
      },
    };
    await outcomePairTracker(callPayload);
    expect(listMarkers().length).toBe(1);

    const result = await outcomePairTracker(callPayload);
    expect(result.message).toContain("no-op");
    expect(listMarkers().length).toBe(1);
  });

  test("CLOSE without prior OPEN, ungraded degenerate snapshot, is SKIPPED (no marker)", async () => {
    // Degenerate guard (D bottleneck): an ungraded close-without-open would
    // produce baselineOutcome === refinedOutcome with score -1 / verdict
    // "unknown" — zero analytical signal. The hook must skip it, writing no
    // marker, instead of accumulating drift.
    const result = await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "sprint_completed",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          lineageRefs: { actionRid: "act-004" },
          payload: {}, // no verdict, no overallScore → degenerate snapshot
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("degenerate");
    expect(listMarkers().length).toBe(0);
  });

  test("CLOSE without prior OPEN, WITH a real grade, still writes standalone closed marker", async () => {
    // Non-degenerate close-without-open (graded: score >= 0) must still write —
    // the guard only suppresses the zero-signal ungraded case.
    const result = await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "sprint_completed",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          lineageRefs: { actionRid: "act-004b" },
          payload: { verdict: "passed", overallScore: 0.92 },
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("close-without-open");
    expect(listMarkers().length).toBe(1);
    const decl = JSON.parse(fs.readFileSync(path.join(pairsDir(), listMarkers()[0]!), "utf8"));
    expect(decl.actionRid).toBe("act-004b");
    expect(decl.refinedOutcome?.score).toBe(0.92);
    expect(decl.refinedOutcome?.verdict).toBe("pass");
  });

  test("scanOrphans returns markers older than threshold", () => {
    const dir = pairsDir();
    fs.mkdirSync(dir, { recursive: true });
    // Stale marker (created 1h ago, no refinedOutcome)
    const staleAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const stale = {
      pairingId: "pair-stale-001",
      scenario: "edit_proposed",
      actionRid: "act-stale",
      baselineOutcome: { verdict: "unknown", score: -1, capturedAt: staleAt },
      evidence: { actionRid: "act-stale" },
      createdAt: staleAt,
    };
    fs.writeFileSync(path.join(dir, "pair-stale-001.json"), JSON.stringify(stale));

    // Fresh marker (created now, no refinedOutcome)
    const freshAt = new Date().toISOString();
    const fresh = {
      pairingId: "pair-fresh-001",
      scenario: "edit_proposed",
      actionRid: "act-fresh",
      baselineOutcome: { verdict: "unknown", score: -1, capturedAt: freshAt },
      evidence: { actionRid: "act-fresh" },
      createdAt: freshAt,
    };
    fs.writeFileSync(path.join(dir, "pair-fresh-001.json"), JSON.stringify(fresh));

    const orphans = scanOrphans(dir, 30 * 60 * 1000, Date.now());
    expect(orphans).toContain("pair-stale-001" as OutcomePairingRid);
    expect(orphans).not.toContain("pair-fresh-001" as OutcomePairingRid);
  });

  test("non-pair-able event types skip", async () => {
    const result = await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "session_started",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          payload: { model: "opus", effort: "max" },
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("not pair-able");
    expect(listMarkers().length).toBe(0);
  });

  test("derives actionRid fallback from payload (contractId)", async () => {
    const result = await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "sprint_contract_negotiated",
          eventId: "evt-1",
          when: "2026-05-03T19:00:00.000Z",
          payload: {
            project: TMP,
            sprintNumber: 20,
            round: 1,
            role: "orchestrator",
            action: "propose",
            contractId: "contract-fallback",
          },
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("opened pair");
    const markers = listMarkers();
    expect(markers.length).toBe(1);
    const decl = JSON.parse(fs.readFileSync(path.join(pairsDir(), markers[0]!), "utf8"));
    expect(decl.actionRid).toBe("contract-fallback");
  });

  // W2.7 — open-side emit: phase_completed written to events.jsonl on open
  test("OPEN: emits phase_completed with phaseTag=outcome_pair_opened to events.jsonl", async () => {
    // Ensure the session dir exists so events.jsonl can be written
    const sessionDir = path.join(TMP, ".palantir-mini", "session");
    fs.mkdirSync(sessionDir, { recursive: true });
    const eventsPath = path.join(sessionDir, "events.jsonl");

    await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "edit_proposed",
          eventId: "evt-open-emit-1",
          when: "2026-05-08T10:00:00.000Z",
          lineageRefs: { actionRid: "act-open-emit-1" },
          payload: { functionName: "test", hypotheticalEdits: [] },
        },
      },
    });

    // events.jsonl should contain the open-side emit (best-effort; allow small delay)
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const openEvent = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((e) => e?.payload?.phaseTag === "outcome_pair_opened");
    expect(openEvent).toBeDefined();
    expect(openEvent?.lineageRefs?.outcomePairId).toBeDefined();
    expect(openEvent?.lineageRefs?.actionRid).toBe("act-open-emit-1");
    // openEventType is encoded in validations array
    expect(
      (openEvent?.payload?.validations as string[] | undefined)?.some(
        (v: string) => v.includes("openEventType=edit_proposed"),
      ),
    ).toBe(true);
  });

  // W2.7 — pairRid back-propagation: correlation event links originating eventId
  test("OPEN: emits outcome_pair_correlation event linking originatingEventId to pairRid", async () => {
    const sessionDir = path.join(TMP, ".palantir-mini", "session");
    fs.mkdirSync(sessionDir, { recursive: true });
    const eventsPath = path.join(sessionDir, "events.jsonl");

    await outcomePairTracker({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "dry_run_computed",
          eventId: "evt-corr-orig-1",
          when: "2026-05-08T10:01:00.000Z",
          lineageRefs: { actionRid: "act-corr-1" },
          payload: { dryRunRef: "sha256-abc" },
        },
      },
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const corrEvent = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((e) => e?.payload?.phaseTag === "outcome_pair_correlation");
    expect(corrEvent).toBeDefined();
    const corrValidations = corrEvent?.payload?.validations as string[] | undefined;
    expect(corrValidations?.some((v: string) => v.includes("originatingEventId=evt-corr-orig-1"))).toBe(true);
    expect(corrValidations?.some((v: string) => v.includes("originatingEventType=dry_run_computed"))).toBe(true);
    expect(corrEvent?.lineageRefs?.outcomePairId).toBeDefined();
    expect(corrEvent?.lineageRefs?.actionRid).toBe("act-corr-1");
    // outcomePairId in correlation event matches the open event's pairRid
    const openEvent = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((e) => e?.payload?.phaseTag === "outcome_pair_opened");
    expect(corrEvent?.lineageRefs?.outcomePairId).toBe(openEvent?.lineageRefs?.outcomePairId);
  });
});
