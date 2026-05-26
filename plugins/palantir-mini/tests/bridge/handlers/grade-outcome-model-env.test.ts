/**
 * palantir-mini v2.14.0 — B-26 regression: grader-model env forwarding.
 *
 * W0 canary (2026-04-24, harness-h4-canary-run.md §5) observed all 3
 * model-domain criteria returning `needs_human_review` because
 * `execSync("claude -p …")` timed out at 120s. Root cause — inherited env
 * via `...process.env` spread did not explicitly forward CLAUDE_CONFIG_DIR,
 * so the subprocess CLI could not bootstrap auth in time.
 *
 * Fix factored `enhancedEnv` construction into `buildGraderModelEnv()` so
 * the env object is verifiable without an actual subprocess. Live dogfood
 * of the subprocess path is deferred to the next harness canary (W5
 * component audit territory).
 */

import { test, expect, describe, afterEach, beforeEach } from "bun:test";
import * as os from "os";
import * as path from "path";
import {
  buildGraderModelEnv,
  gradeModel,
  resolveModelGraderHostRuntime,
  type GradingCriterionLite,
} from "../../../bridge/handlers/grade-outcome-with-rubric";

const savedEnv: Record<string, string | undefined> = {};

function save(key: string) {
  savedEnv[key] = process.env[key];
}

beforeEach(() => {
  for (const k of [
    "CLAUDE_CONFIG_DIR",
    "HOME",
    "PALANTIR_MINI_GRADER",
    "PALANTIR_MINI_DEBUG",
    "MCP_CONNECTION_NONBLOCKING",
    "PALANTIR_MINI_HOST_RUNTIME",
  ]) save(k);
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("buildGraderModelEnv (B-26 regression)", () => {
  test("sets CLAUDE_CONFIG_DIR fallback when unset in parent env", () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    const env = buildGraderModelEnv();
    expect(env.CLAUDE_CONFIG_DIR).toBe(path.join(os.homedir(), ".claude"));
  });

  test("honors existing CLAUDE_CONFIG_DIR when set", () => {
    process.env.CLAUDE_CONFIG_DIR = "/opt/custom/.claude";
    const env = buildGraderModelEnv();
    expect(env.CLAUDE_CONFIG_DIR).toBe("/opt/custom/.claude");
  });

  test("forwards HOME with homedir fallback", () => {
    delete process.env.HOME;
    const env = buildGraderModelEnv();
    expect(env.HOME).toBe(os.homedir());
    process.env.HOME = "/custom/home";
    const env2 = buildGraderModelEnv();
    expect(env2.HOME).toBe("/custom/home");
  });

  test("sets PALANTIR_MINI_GRADER=model marker", () => {
    const env = buildGraderModelEnv();
    expect(env.PALANTIR_MINI_GRADER).toBe("model");
  });

  test("inherits other PATH-like env entries via spread", () => {
    process.env.PATH = "/usr/local/bin:/usr/bin";
    const env = buildGraderModelEnv();
    expect(env.PATH).toBe("/usr/local/bin:/usr/bin");
  });

  test("sets MCP_CONNECTION_NONBLOCKING=true (W1.B — skip MCP wait for grader subprocess)", () => {
    const env = buildGraderModelEnv();
    expect(env.MCP_CONNECTION_NONBLOCKING).toBe("true");
  });

  test("does NOT set --bare flag (Max X20 constraint: no ANTHROPIC_API_KEY)", () => {
    const env = buildGraderModelEnv();
    // Negative assertion: --bare must never appear in any env value.
    // Using --bare would require ANTHROPIC_API_KEY; Max X20 users have none.
    const allValues = Object.values(env).join(" ");
    expect(allValues).not.toContain("--bare");
  });

  test("resolves only current supported host runtimes", () => {
    expect(resolveModelGraderHostRuntime(undefined)).toBe("claude-code");
    expect(resolveModelGraderHostRuntime("claude")).toBe("claude-code");
    expect(resolveModelGraderHostRuntime("codex-cli")).toBe("codex");
    expect(resolveModelGraderHostRuntime("gemini-cli")).toBe("gemini");
    expect(resolveModelGraderHostRuntime("future-runtime")).toBe("unknown");
  });

  test("Codex host returns runtime-gap review instead of spawning Claude CLI", () => {
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";
    const criterion: GradingCriterionLite = {
      criterionId: "model-runtime-gap",
      title: "Runtime gap",
      rubricDomain: "model",
      passFailLogic: { threshold: 7, scale: "0-10" },
      weightInRubric: 1,
      scoringPrompt: "Score this artifact from 0-10 and return JSON.",
    };

    const result = gradeModel(criterion, "/tmp/nonexistent-artifact.md");

    expect(result.passFail).toBe("needs_human_review");
    expect(result.reasoning).toContain("host runtime codex");
    expect(result.reasoning).toContain("no claude subprocess was spawned");
    expect(result.evidenceCited).toEqual(["runtime-gap:model-grader:codex"]);
  });

  test("Gemini host returns runtime-gap review instead of spawning Claude CLI", () => {
    process.env.PALANTIR_MINI_HOST_RUNTIME = "gemini";
    const criterion: GradingCriterionLite = {
      criterionId: "model-runtime-gap-gemini",
      title: "Runtime gap Gemini",
      rubricDomain: "model",
      passFailLogic: { threshold: 7, scale: "0-10" },
      weightInRubric: 1,
      scoringPrompt: "Score this artifact from 0-10 and return JSON.",
    };

    const result = gradeModel(criterion, "/tmp/nonexistent-artifact.md");

    expect(result.passFail).toBe("needs_human_review");
    expect(result.reasoning).toContain("host runtime gemini");
    expect(result.reasoning).toContain("no claude subprocess was spawned");
    expect(result.evidenceCited).toEqual(["runtime-gap:model-grader:gemini"]);
  });
});
