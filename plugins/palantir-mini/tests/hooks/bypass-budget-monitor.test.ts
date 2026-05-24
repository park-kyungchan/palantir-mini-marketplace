// palantir-mini v4.14.0 — bypass-budget-monitor hook tests (sprint-062 W3-α)
// Tests: 6× same bypass envvar → advisory event emitted; 5× → no advisory;
// mixed different → no advisory; no events.jsonl → skip; not a tracked project → skip.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import bypassBudgetMonitor from "../../hooks/bypass-budget-monitor";

let TMP: string;

/** Build a minimal .palantir-mini project fixture in TMP. */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

/**
 * Write N bypass_invoked events for a given errorClass to events.jsonl.
 */
function writeBypassEvents(errorClass: string, count: number): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const evt = {
      type: "validation_phase_completed",
      eventId: `evt-bypass-${errorClass}-${i}`,
      when: new Date().toISOString(),
      atopWhich: "abc123",
      sequence: i + 1,
      throughWhich: { sessionId: "test", toolName: "Edit", cwd: TMP },
      byWhom: { identity: "monitor" },
      withWhat: { reasoning: `bypass ${i}` },
      payload: {
        phase: "design",
        passed: true,
        errorClass,
      },
    };
    lines.push(JSON.stringify(evt));
  }
  fs.writeFileSync(eventsPath, lines.join("\n") + "\n");
}

/**
 * Write events for multiple bypass types.
 * `counts`: { errorClass: count }
 */
function writeMixedBypassEvents(counts: Record<string, number>): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const lines: string[] = [];
  let seq = 0;
  for (const [errorClass, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      const evt = {
        type: "validation_phase_completed",
        eventId: `evt-bypass-${errorClass}-${i}`,
        when: new Date().toISOString(),
        atopWhich: "abc123",
        sequence: ++seq,
        throughWhich: { sessionId: "test", toolName: "Edit", cwd: TMP },
        byWhom: { identity: "monitor" },
        withWhat: { reasoning: `bypass ${errorClass} ${i}` },
        payload: {
          phase: "design",
          passed: true,
          errorClass,
        },
      };
      lines.push(JSON.stringify(evt));
    }
  }
  fs.writeFileSync(eventsPath, lines.join("\n") + "\n");
}

/** Read the emitted events from events.jsonl to verify advisory was emitted. */
function readEmittedEvents(): Array<{ payload: { errorClass?: string } }> {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs.readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-bypass-budget-"));
  setupProject();
  // Override PALANTIR_MINI_EVENTS_FILE so emit() writes to TMP
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("bypass-budget-monitor", () => {
  test("T1: 6× mcp_first_bypass_invoked → advisory event emitted", async () => {
    writeBypassEvents("mcp_first_bypass_invoked", 6);

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });

    // Should return advisory message (not OK)
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("PALANTIR_MINI_MCP_FIRST_BYPASS=1");

    // Check that advisory event was appended to events.jsonl
    const allEvents = readEmittedEvents();
    const advisoryEvt = allEvents.find(
      (e) => e.payload?.errorClass === "bypass_budget_exceeded"
    );
    expect(advisoryEvt).toBeDefined();
  });

  test("T2: exactly 5× bypass → no advisory (at threshold, not exceeding)", async () => {
    writeBypassEvents("mcp_first_bypass_invoked", 5);

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });

    // 5 is not > 5, so no advisory
    expect(result.message).toContain("OK");

    const allEvents = readEmittedEvents();
    const advisoryEvt = allEvents.find(
      (e) => e.payload?.errorClass === "bypass_budget_exceeded"
    );
    expect(advisoryEvt).toBeUndefined();
  });

  test("T3: mixed bypasses, each ≤5 → no advisory", async () => {
    writeMixedBypassEvents({
      mcp_first_bypass_invoked:    3,
      harness_bypass_invoked:      2,
      lead_direct_bypass_invoked:  1,
      predelegation_bypass_invoked: 4,
    });

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("OK");

    const allEvents = readEmittedEvents();
    const advisoryEvt = allEvents.find(
      (e) => e.payload?.errorClass === "bypass_budget_exceeded"
    );
    expect(advisoryEvt).toBeUndefined();
  });

  test("T4: multiple bypass types, one exceeds threshold → advisory for that type only", async () => {
    writeMixedBypassEvents({
      mcp_first_bypass_invoked: 8,   // exceeds threshold 5
      harness_bypass_invoked:   3,   // does not exceed
    });

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("PALANTIR_MINI_MCP_FIRST_BYPASS=1");
    // harness should NOT appear in advisory
    expect(result.message).not.toContain("PALANTIR_MINI_HARNESS_BYPASS=1");
  });

  test("T5: no events.jsonl → skip (no advisory)", async () => {
    // Don't create events.jsonl at all
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    if (fs.existsSync(eventsPath)) fs.unlinkSync(eventsPath);
    delete process.env.PALANTIR_MINI_EVENTS_FILE;

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });
    expect(result.message).toMatch(/skipped|OK/i);
    expect(result.message).not.toContain("ADVISORY");
  });

  test("T6: cwd not in a tracked project → skip", async () => {
    // Use /tmp directly (no .palantir-mini parent)
    const result = await bypassBudgetMonitor({ cwd: os.tmpdir(), session_id: "test" });
    expect(result.message).toContain("skipped");
  });

  test("T7: zero bypass events → OK message", async () => {
    // Write events.jsonl with non-bypass events only
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    const evt = {
      type: "edit_committed",
      eventId: "evt-noop",
      when: new Date().toISOString(),
      atopWhich: "abc",
      sequence: 1,
      throughWhich: { sessionId: "test", toolName: "Edit", cwd: TMP },
      byWhom: { identity: "claude-code" },
      payload: { files: [] },
    };
    fs.writeFileSync(eventsPath, JSON.stringify(evt) + "\n");

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("OK");
    expect(result.message).not.toContain("ADVISORY");
  });

  test("T8: domain_classification_bypass_invoked 7× → advisory with correct envvar", async () => {
    writeBypassEvents("domain_classification_bypass_invoked", 7);

    const result = await bypassBudgetMonitor({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS=1");
  });
});
