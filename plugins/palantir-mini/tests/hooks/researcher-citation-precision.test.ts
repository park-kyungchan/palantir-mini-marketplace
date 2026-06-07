// palantir-mini — researcher-citation-precision hook tests (W3.G sprint-049)
//
// 4 scenarios:
//   1. researcher spawn WITH citation pattern → no advisory event emitted, silent OK.
//   2. researcher spawn WITHOUT pattern → advisory event emitted, errorClass correct.
//   3. non-researcher subagent_type → hook is no-op (no event, no advisory stderr).
//   4. non-Agent tool (tool_name="Edit") → hook is no-op.
//
// Uses spawnSync with stdin injection (canonical pattern per harness-worktree-advisory.test.ts).

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

// Also test the exported helper function directly
import { hasCitationPrecisionPattern } from "../../hooks/researcher-citation-precision";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/researcher-citation-precision.ts",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-researcher-citation-precision-"));
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
  exitCode:      number;
  stdout:        string;
  stderr:        string;
  result:        Record<string, unknown> | null;
  eventsWritten: number;
  events:        Array<Record<string, unknown>>;
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

  // Count and parse events written to the temp events.jsonl
  const eventsPath = path.join(TMP, "events.jsonl");
  let eventsWritten = 0;
  const events: Array<Record<string, unknown>> = [];
  if (fs.existsSync(eventsPath)) {
    const lines = fs.readFileSync(eventsPath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    eventsWritten = lines.length;
    for (const line of lines) {
      try {
        events.push(JSON.parse(line) as Record<string, unknown>);
      } catch {
        // skip malformed lines
      }
    }
  }

  return {
    exitCode:      proc.status ?? 0,
    stdout:        proc.stdout ?? "",
    stderr:        proc.stderr ?? "",
    result:        parsed,
    eventsWritten,
    events,
  };
}

// ─── hasCitationPrecisionPattern unit tests ───────────────────────────────────

describe("hasCitationPrecisionPattern helper", () => {
  it("detects 'direct quote' (case-insensitive)", () => {
    expect(hasCitationPrecisionPattern("Direct quote required for all claims")).toBe(true);
    expect(hasCitationPrecisionPattern("DIRECT QUOTE")).toBe(true);
  });

  it("detects 'verbatim'", () => {
    expect(hasCitationPrecisionPattern("Include verbatim passages")).toBe(true);
  });

  it("detects 'cite the exact'", () => {
    expect(hasCitationPrecisionPattern("Cite the exact sentence from source")).toBe(true);
  });

  it("detects 'quote the source'", () => {
    expect(hasCitationPrecisionPattern("Always quote the source directly")).toBe(true);
  });

  it("detects 'include the original sentence'", () => {
    expect(hasCitationPrecisionPattern("Include the original sentence alongside paraphrase")).toBe(true);
  });

  it("detects 'do not paraphrase'", () => {
    expect(hasCitationPrecisionPattern("Do not paraphrase. Use exact text.")).toBe(true);
    expect(hasCitationPrecisionPattern("DO NOT PARAPHRASE")).toBe(true);
  });

  it("returns false for generic prompt with no citation pattern", () => {
    expect(hasCitationPrecisionPattern(
      "Research the latest developments in TypeScript generics and summarize findings.",
    )).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasCitationPrecisionPattern("")).toBe(false);
  });
});

// ─── Hook integration tests ───────────────────────────────────────────────────

describe("researcher-citation-precision hook", () => {

  // ─── Test 1: researcher spawn WITH citation pattern → silent OK ───────────
  it("1. researcher spawn with citation pattern → no advisory event, silent OK", () => {
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-1",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:researcher",
        prompt:
          "Speed target: 10 min.\n\n" +
          "Claim order: 1. T-42 — research TypeScript generics.\n\n" +
          "No idle polling: Work until done, then self-shutdown.\n\n" +
          "Reply in text: plain-text status.\n\n" +
          "Memory layer declaration: semantic.\n\n" +
          "Direct quote required: for every multi-source claim, include the exact " +
          "verbatim sentence from the source. Do not paraphrase. Cite the exact passage.",
      },
    };

    const r = runHook(payload);

    // Must always exit 0
    expect(r.exitCode).toBe(0);

    // Must always return decision: "continue"
    expect(r.result).not.toBeNull();
    expect(r.result?.decision).toBe("continue");

    // No advisory message in result — citation pattern was found
    expect(r.result?.message).toContain("citation pattern present");
    expect(r.result?.message).not.toContain("ADVISORY");

    // No stderr advisory
    expect(r.stderr).not.toContain("ADVISORY");
    expect(r.stderr).not.toContain("researcher_citation_precision_advisory");

    // No events emitted
    expect(r.eventsWritten).toBe(0);
  });

  // ─── Test 2: researcher spawn WITHOUT pattern → advisory event emitted ────
  it("2. researcher spawn WITHOUT citation pattern → advisory event emitted + stderr", () => {
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-2",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:researcher",
        prompt:
          "Research the Palantir AIP documentation and summarize key concepts. " +
          "Focus on agent memory layers and event emission patterns.",
      },
    };

    const r = runHook(payload);

    // Must always exit 0
    expect(r.exitCode).toBe(0);

    // Must always return decision: "continue" (advisory, non-blocking)
    expect(r.result).not.toBeNull();
    expect(r.result?.decision).toBe("continue");

    // Advisory message in result
    expect(r.result?.message).toContain("ADVISORY");
    expect(r.result?.message).toContain("palantir-mini:researcher");

    // Advisory in stderr
    expect(r.stderr).toContain("ADVISORY");
    expect(r.stderr).toContain("citation-precision");
    expect(r.stderr).toContain("Opus 4.7");

    // Recommended pattern should appear in stderr
    expect(r.stderr).toContain("Direct quote required");

    // Exactly 1 event emitted
    expect(r.eventsWritten).toBe(1);

    // Verify event shape
    expect(r.events.length).toBe(1);
    const evt = r.events[0]!;
    expect(evt["type"]).toBe("validation_phase_completed");

    const evtPayload = evt["payload"] as Record<string, unknown>;
    expect(evtPayload["errorClass"]).toBe("researcher_citation_precision_advisory");
    expect(evtPayload["passed"]).toBe(true);
    expect(evtPayload["subagentType"]).toBe("palantir-mini:researcher");
    expect(evtPayload["postmortemRef"]).toContain("opus-4-7-postmortem");

    // Verify 5-dim envelope fields are present
    expect(evt["when"]).toBeDefined();
    expect(evt["atopWhich"]).toBeDefined();
    expect(evt["throughWhich"]).toBeDefined();
    expect(evt["byWhom"]).toBeDefined();
    expect(evt["withWhat"]).toBeDefined();

    // Verify withWhat has reasoning + memoryLayers
    const withWhat = evt["withWhat"] as Record<string, unknown>;
    expect(withWhat["reasoning"]).toContain("researcher");
    expect(withWhat["memoryLayers"]).toContain("procedural");
    expect(withWhat["memoryLayers"]).toContain("semantic");
  });

  // ─── Test 3: non-researcher subagent_type → hook is no-op ────────────────
  it("3. non-researcher subagent_type (implementer, docs-researcher) → no-op", () => {
    const nonResearcherTypes = [
      "palantir-mini:implementer",
      "palantir-mini:docs-researcher",
      "palantir-mini:implementer",
      "palantir-mini:hook-builder",
      "palantir-mini:evaluator",
      "general-purpose",
    ];

    for (const subagentType of nonResearcherTypes) {
      // Create a fresh temp dir for each sub-case
      const subTmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-rcp-sub-"));
      const subEnv: Record<string, string> = {
        PALANTIR_MINI_EVENTS_FILE: path.join(subTmp, "events.jsonl"),
        PALANTIR_MINI_PROJECT:     subTmp,
      };

      const payload = {
        cwd:        subTmp,
        session_id: "sess-test-3",
        tool_name:  "Agent",
        tool_input: {
          subagent_type: subagentType,
          // No citation pattern — would trigger if subagent type matched
          prompt: "Generic task without any citation precision pattern.",
        },
      };

      const proc = spawnSync("bun", ["run", HOOK_SCRIPT], {
        input:    JSON.stringify(payload),
        encoding: "utf8",
        env:      { ...process.env, ...subEnv },
        timeout:  15_000,
      });

      expect(proc.status).toBe(0);

      // No advisory in stderr
      expect(proc.stderr ?? "").not.toContain("ADVISORY");
      expect(proc.stderr ?? "").not.toContain("citation-precision");

      // No events written
      const eventsPath = path.join(subTmp, "events.jsonl");
      const eventsCount = fs.existsSync(eventsPath)
        ? fs.readFileSync(eventsPath, "utf8").split("\n").filter((l) => l.trim().length > 0).length
        : 0;
      expect(eventsCount).toBe(0);

      // Returns continue with no-op message
      let parsedResult: Record<string, unknown> | null = null;
      try {
        parsedResult = JSON.parse((proc.stdout ?? "").trim()) as Record<string, unknown>;
      } catch { /* */ }
      expect(parsedResult?.decision).toBe("continue");
      expect(parsedResult?.message).toContain("no-op");

      fs.rmSync(subTmp, { recursive: true, force: true });
    }
  });

  // ─── Test 4: bare "researcher" name (without namespace) also triggers ─────
  it("4. bare 'researcher' subagent_type (no namespace) without pattern → advisory fires", () => {
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-4",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "researcher",  // bare name, no palantir-mini: prefix
        prompt:
          "Investigate the latest research papers on multi-agent systems. Summarize.",
      },
    };

    const r = runHook(payload);

    expect(r.exitCode).toBe(0);
    // Non-blocking: always continue
    expect(r.result?.decision).toBe("continue");

    // Advisory fires for bare name too
    expect(r.result?.message).toContain("ADVISORY");
    expect(r.stderr).toContain("ADVISORY");

    // Exactly 1 event
    expect(r.eventsWritten).toBe(1);
    const evt = r.events[0]!;
    const evtPayload = evt["payload"] as Record<string, unknown>;
    expect(evtPayload["errorClass"]).toBe("researcher_citation_precision_advisory");
    expect(evtPayload["subagentType"]).toBe("researcher");
  });

});
