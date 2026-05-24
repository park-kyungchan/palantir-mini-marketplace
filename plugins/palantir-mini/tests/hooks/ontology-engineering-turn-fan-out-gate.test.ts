// palantir-mini — ontology-engineering-turn-fan-out-gate hook tests (sprint-125 PR 5.14)
// Covers rule 28 v1.0.0 §Advisory → blocking ladder:
//
//   1. No active SIC → no-op (decision: "continue").
//   2. SIC with evidenceDomains.length ≤ 2 → no-op.
//   3. SIC with evidenceDomains.length > 2, all domains visited → allow (no advisory).
//   4. SIC with evidenceDomains.length > 2, 1 unvisited domain → advisory (strike 1).
//   5. 2nd unvisited spawn attempt → advisory (strike 2).
//   6. 3rd unvisited spawn attempt → blocking (decision: "deny", permissionDecision: "deny").
//   7. PALANTIR_MINI_TURN_FAN_OUT_BYPASS=1 → bypass audited, always continue.

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/ontology-engineering-turn-fan-out-gate.ts",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

let TMP: string;
let SIC_DIR: string;
let EVENTS_FILE: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-turn-fan-out-"));
  SIC_DIR = path.join(TMP, ".palantir-mini", "session");
  fs.mkdirSync(SIC_DIR, { recursive: true });
  EVENTS_FILE = path.join(SIC_DIR, "events.jsonl");
  process.env["PALANTIR_MINI_EVENTS_FILE"] = EVENTS_FILE;
  process.env["PALANTIR_MINI_PROJECT"]     = TMP;
  // Reset strikes by ensuring no leftover strike file interferes
  // (each test uses unique session_id to avoid cross-test contamination)
});

afterEach(() => {
  delete process.env["PALANTIR_MINI_EVENTS_FILE"];
  delete process.env["PALANTIR_MINI_PROJECT"];
  delete process.env["PALANTIR_MINI_TURN_FAN_OUT_BYPASS"];
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

/** Write a SIC JSON to the session directory. */
function writeSic(evidenceDomains: string[]): void {
  fs.writeFileSync(
    path.join(SIC_DIR, "semantic-intent-contract.json"),
    JSON.stringify({ evidenceDomains }),
    "utf8",
  );
}

/** Append an evidence_domain_visited event to events.jsonl. */
function appendDomainVisit(domain: string): void {
  const evt = JSON.stringify({
    type:      "evidence_domain_visited",
    withWhat:  { domain },
    timestamp: new Date().toISOString(),
  });
  fs.appendFileSync(EVENTS_FILE, evt + "\n", "utf8");
}

/** Run the hook script via bun, passing payload as stdin. */
function runHook(
  payload: unknown,
  extraEnv: Record<string, string> = {},
): {
  exitCode:   number;
  stdout:     string;
  stderr:     string;
  result:     Record<string, unknown> | null;
} {
  const proc = spawnSync(
    "bun",
    ["run", HOOK_SCRIPT],
    {
      input:    JSON.stringify(payload),
      encoding: "utf8",
      env:      { ...process.env, ...extraEnv },
      timeout:  15_000,
    },
  );

  let parsed: Record<string, unknown> | null = null;
  if (proc.stdout && proc.stdout.trim().length > 0) {
    try {
      parsed = JSON.parse(proc.stdout.trim()) as Record<string, unknown>;
    } catch {
      // leave null
    }
  }

  return {
    exitCode: proc.status ?? 0,
    stdout:   proc.stdout ?? "",
    stderr:   proc.stderr ?? "",
    result:   parsed,
  };
}

// Unique session_id per test to isolate strike files
let testCounter = 0;
function nextSessionId(): string {
  // Long enough to be unique; slice(0,12) in hook = first 12 chars
  return `tst${++testCounter}x${Math.random().toString(36).slice(2, 10)}`;
}

/** Clean up any leftover strike files for a given sessionId. */
function cleanStrikes(sessionId: string): void {
  const p = path.join(
    os.tmpdir(),
    `claude-hooks-${sessionId.slice(0, 12)}-ontology-engineering-turn-fan-out-strikes.json`,
  );
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* best-effort */ }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ontology-engineering-turn-fan-out-gate", () => {

  // Test 1: No active SIC → no-op
  it("1. No SIC present → no-op (decision: continue)", () => {
    const payload = {
      cwd:        TMP,
      session_id: nextSessionId(),
      tool_name:  "Agent",
      tool_input: { subagent_type: "palantir-mini:implementer" },
    };
    const r = runHook(payload);
    expect(r.exitCode).toBe(0);
    expect(r.result?.decision).toBe("continue");
    expect(r.result?.message).toContain("no-op");
    // No blocking, no stderr advisory
    expect(r.stderr).not.toContain("BLOCKING");
  });

  // Test 2: SIC with evidenceDomains.length ≤ 2 → no-op
  it("2. SIC evidenceDomains.length ≤ 2 → no-op", () => {
    writeSic(["schemas/", "plans/"]);
    const payload = {
      cwd:        TMP,
      session_id: nextSessionId(),
      tool_name:  "Agent",
      tool_input: {},
    };
    const r = runHook(payload);
    expect(r.exitCode).toBe(0);
    expect(r.result?.decision).toBe("continue");
    expect(r.result?.message).toContain("no-op");
  });

  // Test 3: SIC evidenceDomains.length > 2, all visited → allow
  it("3. SIC evidenceDomains > 2, all domains visited → allow (continue, no advisory)", () => {
    writeSic(["schemas/", "plans/", "research/"]);
    appendDomainVisit("schemas/");
    appendDomainVisit("plans/");
    appendDomainVisit("research/");

    const payload = {
      cwd:        TMP,
      session_id: nextSessionId(),
      tool_name:  "Agent",
      tool_input: {},
    };
    const r = runHook(payload);
    expect(r.exitCode).toBe(0);
    expect(r.result?.decision).toBe("continue");
    expect(r.result?.message).toContain("all");
    expect(r.result?.message).toContain("visited");
    expect(r.stderr).not.toContain("BLOCKING");
    expect(r.stderr).not.toContain("advisory");
  });

  // Test 4: SIC evidenceDomains > 2, 1 unvisited → advisory (strike 1)
  it("4. SIC evidenceDomains > 2, 1 unvisited domain → advisory (strike 1, decision: continue)", () => {
    writeSic(["schemas/", "plans/", "research/"]);
    appendDomainVisit("schemas/");
    appendDomainVisit("plans/");
    // "research/" not visited

    const sessionId = nextSessionId();
    cleanStrikes(sessionId);  // ensure fresh start
    const payload = {
      cwd:        TMP,
      session_id: sessionId,
      tool_name:  "Agent",
      tool_input: {},
    };
    const r = runHook(payload);

    expect(r.exitCode).toBe(0);
    expect(r.result?.decision).toBe("continue");
    expect(r.stderr).toContain("research/");
    expect(r.stderr).toContain("Strike 1");
    expect(r.stderr).toContain("advisory");
    expect(r.stderr).not.toContain("BLOCKING");
    expect(r.result?.permissionDecision).toBeUndefined();
  });

  // Test 5: 2nd unvisited spawn attempt → advisory (strike 2)
  it("5. 2nd unvisited spawn attempt → advisory (strike 2, decision: continue)", () => {
    writeSic(["schemas/", "plans/", "research/"]);
    appendDomainVisit("schemas/");
    // "plans/" and "research/" not visited

    const sessionId = nextSessionId();
    cleanStrikes(sessionId);  // ensure fresh start
    const payload = {
      cwd:        TMP,
      session_id: sessionId,
      tool_name:  "Agent",
      tool_input: {},
    };

    // First strike
    const r1 = runHook(payload);
    expect(r1.result?.decision).toBe("continue");
    expect(r1.stderr).toContain("Strike 1");

    // Second strike (same session, same SIC, still missing domains)
    const r2 = runHook(payload);
    expect(r2.exitCode).toBe(0);
    expect(r2.result?.decision).toBe("continue");
    expect(r2.stderr).toContain("Strike 2");
    expect(r2.stderr).toContain("advisory");
    expect(r2.stderr).not.toContain("BLOCKING");
  });

  // Test 6: 3rd unvisited spawn attempt → blocking
  it("6. 3rd unvisited spawn attempt → blocking (decision: deny, permissionDecision: deny)", () => {
    writeSic(["schemas/", "plans/", "research/"]);
    // No domains visited

    const sessionId = nextSessionId();
    cleanStrikes(sessionId);  // ensure fresh start
    const payload = {
      cwd:        TMP,
      session_id: sessionId,
      tool_name:  "Agent",
      tool_input: {},
    };

    // Strikes 1 and 2 (advisory)
    const r1 = runHook(payload);
    expect(r1.result?.decision).toBe("continue");

    const r2 = runHook(payload);
    expect(r2.result?.decision).toBe("continue");

    // Strike 3 → blocking
    const r3 = runHook(payload);
    expect(r3.exitCode).toBe(0);
    expect(r3.result?.decision).toBe("deny");
    expect(r3.result?.permissionDecision).toBe("deny");
    expect(r3.stderr).toContain("BLOCKING");
    expect(r3.stderr).toContain("Strike 3");
    expect(r3.result?.stopReason).toContain("rule 28");
  });

  // Test 7: PALANTIR_MINI_TURN_FAN_OUT_BYPASS=1 → bypass honored
  it("7. PALANTIR_MINI_TURN_FAN_OUT_BYPASS=1 → bypass audited, always continue", () => {
    writeSic(["schemas/", "plans/", "research/", "runtime/"]);
    // No domains visited — would trigger advisory without bypass

    const payload = {
      cwd:        TMP,
      session_id: nextSessionId(),
      tool_name:  "Agent",
      tool_input: {},
    };
    const r = runHook(payload, { PALANTIR_MINI_TURN_FAN_OUT_BYPASS: "1" });

    expect(r.exitCode).toBe(0);
    expect(r.result?.decision).toBe("continue");
    expect(r.result?.message).toContain("bypass");
    // No blocking advisory
    expect(r.stderr).not.toContain("BLOCKING");
    expect(r.stderr).not.toContain("Strike");
  });

});
