// palantir-mini v4.15.0 — lead-ontology-discovery-completeness hook tests (sprint-062 Phase 2 W1-α)
//
// Test plan:
//   Synthesis path → exempt, continue
//   Small edit (≤5 LOC) → exempt, continue
//   No file_path → skipped
//   Non-tracked project → skipped (no .palantir-mini ancestor)
//   No discovery call in events.jsonl → blocking denial emitted
//   Discovery call present → no advisory (PASSED)
//   PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 → bypass, no advisory
//   Null payload → no throw
//   Blocking text sets hookSpecificOutput.permissionDecision: deny

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import leadOntologyDiscoveryCompleteness from "../../hooks/lead-ontology-discovery-completeness";

// ─── Setup/teardown ───────────────────────────────────────────────────────────

let TMP: string;
let savedBypass: string | undefined;
let savedProject: string | undefined;
let savedEventsFile: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-lead-ontology-"));
  savedBypass       = process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS;
  savedProject      = process.env.PALANTIR_MINI_PROJECT;
  savedEventsFile   = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS;
  }
  if (savedProject !== undefined) {
    process.env.PALANTIR_MINI_PROJECT = savedProject;
  } else {
    delete process.env.PALANTIR_MINI_PROJECT;
  }
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helper: create a tracked project (with .palantir-mini/) ─────────────────

function makeTrackedProject(): { root: string; eventsPath: string } {
  const root       = path.join(TMP, "tracked-project");
  const sessionDir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const eventsPath = path.join(sessionDir, "events.jsonl");
  return { root, eventsPath };
}

/** Write an event row to the events.jsonl file. */
function writeEvent(eventsPath: string, toolName: string, eventType = "mcp_tool_invoked"): void {
  const when = new Date().toISOString();
  const row = JSON.stringify({
    type:        eventType,
    when,
    atopWhich:   "abc123",
    throughWhich: { toolName, sessionId: "test-session", cwd: "/tmp" },
    byWhom:       { identity: "claude-code" },
    payload:      {},
  });
  fs.appendFileSync(eventsPath, row + "\n");
}

// ─── Exemption tests ──────────────────────────────────────────────────────────

describe("exemptions", () => {
  test("E1: synthesis path (plans/) → exempt, skipped message", async () => {
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: { file_path: path.join(os.homedir(), ".claude", "plans", "2026-05-09-sprint-062.md") },
      cwd:        TMP,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("synthesis path");
  });

  test("E1b: canonical .palantir-mini/plan path → exempt, skipped message", async () => {
    const { root } = makeTrackedProject();
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: { file_path: path.join(root, ".palantir-mini", "plan", "handoff.md") },
      cwd:        root,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("synthesis path");
  });

  test("E2: BROWSE.md → exempt", async () => {
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: { file_path: "/home/palantirkc/.claude/research/BROWSE.md" },
      cwd:        TMP,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("synthesis path");
  });

  test("E3: INDEX.md → exempt", async () => {
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: { file_path: "/some/project/INDEX.md" },
      cwd:        TMP,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("synthesis path");
  });

  test("E4: MEMORY.md → exempt", async () => {
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: { file_path: "/home/palantirkc/.claude/projects/-home/memory/MEMORY.md" },
      cwd:        TMP,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("synthesis path");
  });

  test("E5: small edit (2 old_string lines + 2 new_string lines = 4 LOC ≤ 5) → exempt", async () => {
    const { root } = makeTrackedProject();
    const filePath = path.join(root, "hooks", "foo.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// foo\n");

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "line1\nline2",
        new_string: "line1\nline3",
      },
      cwd: root,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("small edit");
  });

  test("E6: no file_path in tool_input → skipped", async () => {
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Write",
      tool_input: {},
      cwd:        TMP,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("skipped");
  });

  test("E7: non-tracked project (no .palantir-mini/ ancestor) → skipped", async () => {
    const isolatedDir = path.join(TMP, "not-tracked");
    fs.mkdirSync(isolatedDir, { recursive: true });
    const filePath = path.join(isolatedDir, "foo.ts");
    fs.writeFileSync(filePath, "// test\n");

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "x",
        new_string:  "y".repeat(50),
      },
      cwd: isolatedDir,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("skipped");
  });
});

// ─── Advisory: no discovery call found ───────────────────────────────────────

describe("blocking_no_discovery_call", () => {
  test("A1: no discovery call → blocking denial emitted", async () => {
    const { root, eventsPath } = makeTrackedProject();
    // Write a non-discovery event to ensure events.jsonl exists but has no discovery rows
    writeEvent(eventsPath, "some_other_tool");

    const filePath = path.join(root, "hooks", "new-hook.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// hook\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "x",
        // multi-line content to defeat ≤5 LOC small-file exemption
        new_string:  "y\n".repeat(20),
      },
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("BLOCKED");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("impact_query");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("ontology_context_query");
  });

  test("A2: blocking text mentions pm-intent-to-ontology skill", async () => {
    const { root, eventsPath } = makeTrackedProject();
    writeEvent(eventsPath, "some_other_tool");

    const filePath = path.join(root, "hooks", "foo.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// hook\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Write",
      // multi-line content to defeat ≤5 LOC small-file exemption
      tool_input: { file_path: filePath, content: "x\n".repeat(20) },
      cwd:        root,
    });

    const ctx = result.hookSpecificOutput?.permissionDecisionReason ?? "";
    expect(ctx).toContain("pm-intent-to-ontology");
    expect(ctx).toContain("impact_query");
    expect(ctx).toContain("ontology_context_query");
    expect(ctx).toContain("pm_substrate_query");
    expect(ctx).toContain("BLOCKED");
  });

  test("A3: empty events.jsonl → blocking denial fires (no discovery call)", async () => {
    const { root, eventsPath } = makeTrackedProject();
    // Create empty events file
    fs.writeFileSync(eventsPath, "");

    const filePath = path.join(root, "src", "foo.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// source\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "// source",
        new_string:  "// updated\n".repeat(20),
      },
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("BLOCKED");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });
});

// ─── Passed: discovery call found ────────────────────────────────────────────

describe("passed_discovery_call_found", () => {
  test("D1: get_ontology called recently → PASSED, no advisory", async () => {
    const { root, eventsPath } = makeTrackedProject();
    writeEvent(eventsPath, "get_ontology");

    const filePath = path.join(root, "hooks", "bar.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// bar\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "// bar",
        new_string:  "// baz\n".repeat(30),
      },
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("PASSED");
  });

  test("D2: pm_substrate_query called recently → PASSED", async () => {
    const { root, eventsPath } = makeTrackedProject();
    writeEvent(eventsPath, "pm_substrate_query");

    const filePath = path.join(root, "lib", "foo.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// lib\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Write",
      tool_input: { file_path: filePath, content: "// updated\n".repeat(20) },
      cwd:        root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("PASSED");
  });

  test("D3: pm-intent-to-ontology skill event → PASSED", async () => {
    const { root, eventsPath } = makeTrackedProject();
    // Write a validation_phase_completed with the skill errorClass
    const row = JSON.stringify({
      type:        "validation_phase_completed",
      when:        new Date().toISOString(),
      atopWhich:   "abc123",
      throughWhich: { toolName: "prompt-front-door-capture", sessionId: "test", cwd: root },
      byWhom:       { identity: "monitor" },
      payload:      { errorClass: "intent_to_ontology_protocol_advised" },
    });
    fs.appendFileSync(eventsPath, row + "\n");

    const filePath = path.join(root, "hooks", "baz.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// baz\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "// baz",
        new_string:  "// qux\n".repeat(30),
      },
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("PASSED");
  });

  test("D4: Codex namespace impact_query called recently → PASSED", async () => {
    const { root, eventsPath } = makeTrackedProject();
    writeEvent(eventsPath, "mcp__palantir_mini__impact_query");

    const filePath = path.join(root, "hooks", "codex-impact.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// codex impact\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {
        file_path:  filePath,
        old_string: "// codex impact",
        new_string:  "// updated\n".repeat(30),
      },
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("PASSED");
  });

  test("D5: Codex dotted namespace ontology_context_query called recently → PASSED", async () => {
    const { root, eventsPath } = makeTrackedProject();
    writeEvent(eventsPath, "mcp__palantir_mini__.ontology_context_query");

    const filePath = path.join(root, "hooks", "codex-propagation.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// codex propagation\n");

    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Write",
      tool_input: { file_path: filePath, content: "// updated\n".repeat(20) },
      cwd:        root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("PASSED");
  });
});

// ─── Bypass ───────────────────────────────────────────────────────────────────

describe("bypass", () => {
  test("B1: PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 → bypass, no advisory", async () => {
    process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS = "1";
    const { root } = makeTrackedProject();

    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: { file_path: path.join(root, "hooks", "foo.ts") },
      cwd:        root,
    });

    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("BYPASS");
  });
});

// ─── Robustness ───────────────────────────────────────────────────────────────

describe("robustness", () => {
  test("R1: null payload → no throw", async () => {
    let threw = false;
    let result: Awaited<ReturnType<typeof leadOntologyDiscoveryCompleteness>>;
    try {
      result = await leadOntologyDiscoveryCompleteness(null);
    } catch {
      threw = true;
      result = { message: "" };
    }
    expect(threw).toBe(false);
    expect(typeof result.message).toBe("string");
  });

  test("R2: empty tool_input → no throw, skipped", async () => {
    const result = await leadOntologyDiscoveryCompleteness({
      tool_name:  "Edit",
      tool_input: {},
      cwd:        TMP,
    });
    expect(result.additionalContext).toBeUndefined();
    expect(result.message).toContain("skipped");
  });
});
