// palantir-mini — harness-worktree-advisory hook tests (W1.D sprint-046)
// Covers:
//   1. Allowlisted subagent_type + missing isolation → emit fires + advisory message.
//   2. Allowlisted subagent_type + isolation === "worktree" → emit does NOT fire.
//   3. Non-allowlisted subagent_type (researcher / docs-researcher) → emit does NOT fire.
//   4. Always returns { decision: "continue" }.

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/harness-worktree-advisory.ts",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-harness-worktree-advisory-"));
  // Route events.jsonl to temp dir so we never touch a live project log
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, "events.jsonl");
  process.env.PALANTIR_MINI_PROJECT     = TMP;
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

/**
 * Run the hook script via bun, passing payload as stdin.
 * env is merged with current process.env so PALANTIR_MINI_* overrides are passed.
 */
function runHook(payload: unknown, extraEnv: Record<string, string> = {}): {
  exitCode: number;
  stdout:   string;
  stderr:   string;
  result:   Record<string, unknown> | null;
  eventsWritten: number;
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

  // Count events written to the temp events.jsonl
  const eventsPath = path.join(TMP, "events.jsonl");
  let eventsWritten = 0;
  if (fs.existsSync(eventsPath)) {
    const lines = fs.readFileSync(eventsPath, "utf8")
      .split("\n")
      .filter(l => l.trim().length > 0);
    eventsWritten = lines.length;
  }

  return {
    exitCode:      proc.status ?? 0,
    stdout:        proc.stdout ?? "",
    stderr:        proc.stderr ?? "",
    result:        parsed,
    eventsWritten,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("harness-worktree-advisory", () => {

  // Test 1: allowlisted subagent_type + missing isolation → advisory fires
  it("1. allowlisted + no isolation → emit fires + advisory in stderr", () => {
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-1",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:harness-generator",
        // isolation intentionally omitted
      },
    };

    const r = runHook(payload);

    // Must always exit 0
    expect(r.exitCode).toBe(0);

    // Must always return decision: "continue"
    expect(r.result).not.toBeNull();
    expect(r.result?.decision).toBe("continue");

    // Advisory message in stdout
    expect(r.result?.message).toContain("harness-worktree-advisory");
    expect(r.result?.message).toContain("harness-generator");

    // Advisory printed to stderr
    expect(r.stderr).toContain("harness-worktree-advisory");
    expect(r.stderr).toContain("palantir-mini:harness-generator");
    expect(r.stderr).toContain("worktree");
    expect(r.stderr).toContain("rule 16 v4.1.0");

    // Emit fired: 1 event in events.jsonl
    expect(r.eventsWritten).toBe(1);

    // Verify event shape
    const eventsPath = path.join(TMP, "events.jsonl");
    const evtRaw = fs.readFileSync(eventsPath, "utf8").trim().split("\n")[0]!;
    const evt = JSON.parse(evtRaw) as Record<string, unknown>;
    expect(evt["type"]).toBe("validation_phase_completed");
    const evtPayload = evt["payload"] as Record<string, unknown>;
    expect(evtPayload["errorClass"]).toBe("harness_worktree_advisory_emitted");
    expect(evtPayload["subagentType"]).toBe("palantir-mini:harness-generator");
  });

  // Test 2: allowlisted + isolation === "worktree" → no advisory
  it("2. allowlisted + isolation=worktree → emit does NOT fire, no stderr advisory", () => {
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-2",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:implementer",
        isolation:     "worktree",
      },
    };

    const r = runHook(payload);

    expect(r.exitCode).toBe(0);
    expect(r.result?.decision).toBe("continue");

    // No advisory in stderr
    expect(r.stderr).not.toContain("harness-worktree-advisory");

    // No emit: 0 events
    expect(r.eventsWritten).toBe(0);

    // Message confirms no advisory needed
    expect(r.result?.message).toContain("no advisory needed");
  });

  // Test 3: non-allowlisted subagent_type → no advisory
  it("3. non-allowlisted subagent_type (researcher, docs-researcher) → emit does NOT fire", () => {
    for (const nonAllowlisted of ["palantir-mini:researcher", "palantir-mini:docs-researcher", "palantir-mini:evaluator", "general-purpose"]) {
      const payload = {
        cwd:        TMP,
        session_id: "sess-test-3",
        tool_name:  "Agent",
        tool_input: {
          subagent_type: nonAllowlisted,
          // isolation intentionally omitted — would trigger if allowlisted
        },
      };

      // Recreate TMP for each sub-case to get clean event count
      const subTmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-hwa-sub-"));
      const subEnv: Record<string, string> = {
        PALANTIR_MINI_EVENTS_FILE: path.join(subTmp, "events.jsonl"),
        PALANTIR_MINI_PROJECT:     subTmp,
      };

      const proc = spawnSync("bun", ["run", HOOK_SCRIPT], {
        input:    JSON.stringify(payload),
        encoding: "utf8",
        env:      { ...process.env, ...subEnv },
        timeout:  15_000,
      });

      expect(proc.status).toBe(0);

      // No advisory in stderr
      expect(proc.stderr ?? "").not.toContain("harness-worktree-advisory");

      // No events written
      const eventsPath = path.join(subTmp, "events.jsonl");
      const eventsExist = fs.existsSync(eventsPath);
      const eventsCount = eventsExist
        ? fs.readFileSync(eventsPath, "utf8").split("\n").filter(l => l.trim().length > 0).length
        : 0;
      expect(eventsCount).toBe(0);

      // Message confirms no advisory
      let parsedResult: Record<string, unknown> | null = null;
      try { parsedResult = JSON.parse((proc.stdout ?? "").trim()) as Record<string, unknown>; } catch { /* */ }
      expect(parsedResult?.decision).toBe("continue");
      expect(parsedResult?.message).toContain("no advisory needed");

      fs.rmSync(subTmp, { recursive: true, force: true });
    }
  });

  // Test 4: always returns { decision: "continue" } — bare names also trigger advisory
  it("4. bare name allowlisted + no isolation → returns continue + advisory fires", () => {
    // Also verifies bare names (without palantir-mini: prefix) are accepted
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-4",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "hook-builder",  // bare name, no namespace prefix
        // isolation intentionally omitted
      },
    };

    const r = runHook(payload);

    expect(r.exitCode).toBe(0);
    // Non-blocking: always continue
    expect(r.result?.decision).toBe("continue");

    // Advisory fires for bare name too
    expect(r.stderr).toContain("harness-worktree-advisory");
    expect(r.stderr).toContain("hook-builder");

    // Emit fired
    expect(r.eventsWritten).toBe(1);

    const eventsPath = path.join(TMP, "events.jsonl");
    const evtRaw = fs.readFileSync(eventsPath, "utf8").trim().split("\n")[0]!;
    const evt = JSON.parse(evtRaw) as Record<string, unknown>;
    expect(evt["type"]).toBe("validation_phase_completed");
    const evtPayload = evt["payload"] as Record<string, unknown>;
    expect(evtPayload["errorClass"]).toBe("harness_worktree_advisory_emitted");
    expect(evtPayload["subagentType"]).toBe("hook-builder");
  });

});
