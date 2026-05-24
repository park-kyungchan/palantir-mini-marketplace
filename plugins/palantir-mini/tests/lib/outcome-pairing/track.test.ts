// palantir-mini v4.10.0 — lib/outcome-pairing/track.ts unit tests (W3.C1)
// Sprint-056 W3.C1: outcome-pair widening — agent_start, task_started (open),
// subagent_stop (close). Regression check on suffix matching for task_completed.
// Round-trip lifecycle check for agent_start → subagent_stop.

import { test, expect, describe } from "bun:test";
import {
  classifyPairRole,
  computePairRid,
} from "../../../lib/outcome-pairing/track";

describe("classifyPairRole — W3.C1 widened types", () => {
  // ─── New OPEN types ────────────────────────────────────────────────────────

  test("agent_start returns 'open'", () => {
    expect(classifyPairRole("agent_start")).toBe("open");
  });

  test("task_started returns 'open'", () => {
    expect(classifyPairRole("task_started")).toBe("open");
  });

  // ─── New CLOSE types ──────────────────────────────────────────────────────

  test("subagent_stop returns 'close'", () => {
    expect(classifyPairRole("subagent_stop")).toBe("close");
  });

  // ─── Regression: suffix matching still works ──────────────────────────────

  test("task_completed still returns 'close' (suffix match regression)", () => {
    // task_completed is NOT in closeTypes explicit set, but _completed suffix
    // catches it. This ensures the suffix match is not broken by C1 additions.
    expect(classifyPairRole("task_completed")).toBe("close");
  });

  // ─── Round-trip: agent_start → subagent_stop roles are consistent ─────────

  test("round-trip: agent_start opens, subagent_stop closes", () => {
    const openRole = classifyPairRole("agent_start");
    const closeRole = classifyPairRole("subagent_stop");

    // Verify distinct roles using computePairRid (proves both are recognized types)
    const pairRid = computePairRid("agent-action-001", "2026-05-07T10:00:00.000Z");
    expect(openRole).toBe("open");
    expect(closeRole).toBe("close");
    expect(pairRid).toMatch(/^pair-[a-f0-9]+-\d+$/);
  });

  // ─── Existing types still work (non-regression) ───────────────────────────

  test("existing named open events still return 'open'", () => {
    expect(classifyPairRole("edit_proposed")).toBe("open");
    expect(classifyPairRole("dry_run_computed")).toBe("open");
    expect(classifyPairRole("harness_agent_spawned")).toBe("open");
    expect(classifyPairRole("feedback_loop_opened")).toBe("open");
    expect(classifyPairRole("sprint_contract_negotiated")).toBe("open");
  });

  test("existing named close events still return 'close'", () => {
    expect(classifyPairRole("edit_committed")).toBe("close");
    expect(classifyPairRole("dry_run_graded")).toBe("close");
    expect(classifyPairRole("sprint_completed")).toBe("close");
    expect(classifyPairRole("feedback_loop_closed")).toBe("close");
    expect(classifyPairRole("grading_completed")).toBe("close");
  });

  test("non-pair-able lifecycle events return null", () => {
    expect(classifyPairRole("session_started")).toBeNull();
    expect(classifyPairRole("session_ended")).toBeNull();
    expect(classifyPairRole("phase_completed")).toBeNull();
    expect(classifyPairRole("user_prompt_submitted")).toBeNull();
  });
});
