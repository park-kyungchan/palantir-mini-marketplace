// palantir-mini — subagent-orchestration-audit hook tests (W1.G sprint-037)
// Covers: event emission, correlation file write, unknown-agent fallback,
//         prompt truncation, promptDigest correctness.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/subagent-orchestration-audit.ts",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-subagent-orch-audit-"));
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

/** sha256 hex of a string — mirrors the hook's sha256Hex helper. */
function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

/** Read correlation files from the temp dir's .subagent-correlations/ sub-dir. */
function readCorrelationFiles(): Array<Record<string, unknown>> {
  const corrDir = path.join(TMP, ".palantir-mini", "session", ".subagent-correlations");
  if (!fs.existsSync(corrDir)) return [];
  return fs.readdirSync(corrDir)
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(corrDir, f), "utf8")) as Record<string, unknown>;
      } catch {
        return {};
      }
    });
}

// ─── Test 1: agent_spawn_emits_event ─────────────────────────────────────────

describe("subagent-orchestration-audit", () => {

  test("1. agent_spawn_emits_event — resolves model from frontmatter", () => {
    // "palantir-mini:implementer" → strips prefix → implementer.md → model: sonnet
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-1",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:implementer",
        description:   "Implement the W1.G hook per task spec.",
        prompt:        "You are a subagent. Your task is to implement the hook.",
      },
    };

    // Point plugin root at the real plugin so agent .md files are found
    const pluginRoot = path.resolve(import.meta.dirname!, "../..");
    const result = runHook(payload, { PALANTIR_MINI_PLUGIN_ROOT: pluginRoot });

    expect(result.exitCode).toBe(0);
    expect(result.result).not.toBeNull();
    expect(result.result?.message).toContain("subagent_orchestration_audited");
    expect(result.result?.message).toContain("palantir-mini:implementer");
    // Model resolved from implementer.md frontmatter should be "sonnet"
    expect(result.result?.message).toContain("model=sonnet");

    // Also verify the event was written to events.jsonl
    const eventsPath = path.join(TMP, "events.jsonl");
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
    const lastEvent = JSON.parse(lines[lines.length - 1]!) as Record<string, unknown>;
    expect(lastEvent["type"]).toBe("validation_phase_completed");
    const evPayload = lastEvent["payload"] as Record<string, unknown>;
    expect(evPayload["errorClass"]).toBe("subagent_orchestration_audited");
    expect(evPayload["model"]).toBe("sonnet");
    expect(evPayload["spawnedAgent"]).toBe("palantir-mini:implementer");
    expect(typeof evPayload["correlationId"]).toBe("string");
    expect((evPayload["correlationId"] as string).length).toBeGreaterThan(8);
  });

  // ─── Test 2: correlation_file_written ──────────────────────────────────────

  test("2. correlation_file_written — .subagent-correlations/<ts>.json has all required fields", () => {
    const prompt = "Full prompt text for the subagent spawn.";
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-2",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:researcher",
        description:   "Research the topic.",
        prompt,
        team_name:     "core-team",
        mode:          "quick",
      },
    };

    const pluginRoot = path.resolve(import.meta.dirname!, "../..");
    const result = runHook(payload, { PALANTIR_MINI_PLUGIN_ROOT: pluginRoot });

    expect(result.exitCode).toBe(0);

    // Verify correlation file was written
    const corrFiles = readCorrelationFiles();
    expect(corrFiles.length).toBeGreaterThanOrEqual(1);

    const corrData = corrFiles[corrFiles.length - 1]!;
    expect(corrData["correlationId"]).toBeDefined();
    expect(typeof corrData["correlationId"]).toBe("string");
    expect(corrData["leadAgent"]).toBe("claude-code");
    expect(corrData["spawnedAgent"]).toBe("palantir-mini:researcher");
    expect(corrData["promptDigest"]).toBe(sha256Hex(prompt));
    expect(corrData["team_name"]).toBe("core-team");
    expect(corrData["mode"]).toBe("quick");
    expect(corrData["spawnTimestamp"]).toBeDefined();
    // model should be resolved ("unknown" for researcher since it exists in plugin dir)
    expect(typeof corrData["model"]).toBe("string");
  });

  // ─── Test 3: unknown_agent_resolves_to_unknown ────────────────────────────

  test("3. unknown_agent_resolves_to_unknown — nonexistent agent .md → model=unknown", () => {
    const payload = {
      cwd:        TMP,
      session_id: "sess-test-3",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:nonexistent-agent-xyz-12345",
        description:   "Task with unknown agent.",
        prompt:        "Do something.",
      },
    };

    const pluginRoot = path.resolve(import.meta.dirname!, "../..");
    const result = runHook(payload, { PALANTIR_MINI_PLUGIN_ROOT: pluginRoot });

    expect(result.exitCode).toBe(0);
    // model should fall back to "unknown"
    expect(result.result?.message).toContain("model=unknown");

    // Correlation file should still be written with model=unknown
    const corrFiles = readCorrelationFiles();
    expect(corrFiles.length).toBeGreaterThanOrEqual(1);
    const corrData = corrFiles[corrFiles.length - 1]!;
    expect(corrData["model"]).toBe("unknown");
  });

  // ─── Test 4: prompt_truncation_works ─────────────────────────────────────

  test("4. prompt_truncation_works — 5000-char prompt → promptPreview ≤500 chars; promptDigest is sha256 of full prompt", () => {
    // Build a 5000-char prompt
    const fullPrompt = "X".repeat(5000);
    const expectedDigest = sha256Hex(fullPrompt);

    const payload = {
      cwd:        TMP,
      session_id: "sess-test-4",
      tool_name:  "Agent",
      tool_input: {
        subagent_type: "palantir-mini:implementer",
        description:   "Long prompt test.",
        prompt:        fullPrompt,
      },
    };

    const pluginRoot = path.resolve(import.meta.dirname!, "../..");
    const result = runHook(payload, { PALANTIR_MINI_PLUGIN_ROOT: pluginRoot });

    expect(result.exitCode).toBe(0);

    // Verify event written to events.jsonl
    const eventsPath = path.join(TMP, "events.jsonl");
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
    const lastEvent = JSON.parse(lines[lines.length - 1]!) as Record<string, unknown>;
    const evPayload = lastEvent["payload"] as Record<string, unknown>;

    // promptDigest must be sha256 of the FULL (5000-char) prompt
    expect(evPayload["promptDigest"]).toBe(expectedDigest);

    // promptPreview must be ≤500 chars
    const preview = evPayload["promptPreview"] as string;
    expect(typeof preview).toBe("string");
    expect(preview.length).toBeLessThanOrEqual(500);
    // Should end with truncation marker
    expect(preview.endsWith("... [truncated]")).toBe(true);

    // Correlation file: promptDigest also full-prompt hash
    const corrFiles = readCorrelationFiles();
    expect(corrFiles.length).toBeGreaterThanOrEqual(1);
    const corrData = corrFiles[corrFiles.length - 1]!;
    expect(corrData["promptDigest"]).toBe(expectedDigest);
  });

});
