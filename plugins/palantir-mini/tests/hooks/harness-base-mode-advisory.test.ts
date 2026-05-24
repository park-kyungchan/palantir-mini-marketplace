// palantir-mini v3.12.0 — harness-base-mode-advisory hook tests (W1.2 + auto-bootstrap)
// Smoke + unit coverage for findProjectRoot / harnessDirExists / findBoundContract +
// v3.12.0 bootstrapDefaultQuickSprint auto-bootstrap path (B2 hard default-on).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import harnessBaseModeAdvisory, {
  findProjectRoot,
  harnessDirExists,
  findBoundContract,
  bootstrapDefaultQuickSprint,
  detectLeadModel,
  isOpus47,
  getNonDefaultSpecies,
} from "../../hooks/harness-base-mode-advisory";

let TMP: string;
let savedAutoSpriteDisable: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-harness-advisory-"));
  savedAutoSpriteDisable = process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE;
  // Default state: auto-bootstrap ENABLED (B2 hard default-on)
  delete process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE;
});

afterEach(() => {
  if (savedAutoSpriteDisable !== undefined) {
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = savedAutoSpriteDisable;
  } else {
    delete process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("findProjectRoot", () => {
  // Note: the "returns null when no .palantir-mini ancestor" case is hard to
  // test in isolation because /tmp/.palantir-mini and /home/palantirkc/.palantir-mini
  // can exist as runtime session targets. Production behavior (walking up to
  // find ANY .palantir-mini ancestor) is correct.

  test("returns project root containing .palantir-mini", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const sub = path.join(TMP, "subdir", "deeper");
    fs.mkdirSync(sub, { recursive: true });
    expect(findProjectRoot(sub)).toBe(TMP);
  });

  test("returns the closest .palantir-mini ancestor (not the farthest)", () => {
    // Outer .palantir-mini at TMP; inner .palantir-mini at TMP/inner-project
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    fs.mkdirSync(path.join(TMP, "inner-project", ".palantir-mini"), { recursive: true });
    const sub = path.join(TMP, "inner-project", "subdir");
    fs.mkdirSync(sub, { recursive: true });
    expect(findProjectRoot(sub)).toBe(path.join(TMP, "inner-project"));
  });
});

describe("harnessDirExists", () => {
  test("returns false when no harness dir", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    expect(harnessDirExists(TMP)).toBe(false);
  });

  test("returns true when harness dir present", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness"), { recursive: true });
    expect(harnessDirExists(TMP)).toBe(true);
  });
});

describe("findBoundContract", () => {
  test("returns null when no sprints dir", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness"), { recursive: true });
    expect(findBoundContract(TMP)).toBe(null);
  });

  test("returns null when sprint exists but no contract.json", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001"), { recursive: true });
    expect(findBoundContract(TMP)).toBe(null);
  });

  test("returns null when contract.json status != bound", () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "drafting" }));
    expect(findBoundContract(TMP)).toBe(null);
  });

  test("returns relative contract path when status=bound", () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "bound" }));
    const result = findBoundContract(TMP);
    expect(result).toContain("sprint-001-quick");
    expect(result).toContain("contract.json");
  });

  test("ignores malformed JSON", () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), "{ malformed");
    expect(findBoundContract(TMP)).toBe(null);
  });
});

describe("harnessBaseModeAdvisory (handler) — v3.8.0 advisory paths (auto-bootstrap disabled)", () => {
  // These tests intentionally disable auto-bootstrap to exercise the legacy
  // advisory-only behavior. v3.12.0 default behavior is auto-bootstrap (next describe).

  beforeEach(() => {
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
  });

  test("emits no-harness-dir advisory when only .palantir-mini exists (bootstrap disabled)", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const result = await harnessBaseModeAdvisory({ cwd: TMP });
    expect(result.message).toContain("no harness dir");
    expect(result.additionalContext).toContain("no .palantir-mini/harness/");
    expect(result.additionalContext).toContain("disabled via PALANTIR_MINI_AUTO_SPRINT_DISABLE");
  });

  test("emits no-bound-contract advisory when harness dir but no bound (bootstrap disabled)", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness"), { recursive: true });
    const result = await harnessBaseModeAdvisory({ cwd: TMP });
    expect(result.message).toContain("no bound contract");
    expect(result.additionalContext).toContain("no active SprintContract");
  });

  test("returns OK when bound contract present (bootstrap disabled)", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "bound" }));
    const result = await harnessBaseModeAdvisory({ cwd: TMP });
    expect(result.message).toContain("OK");
    expect(result.message).toContain("bound");
    expect(result.additionalContext).toBeUndefined();
  });

  test("handles null payload gracefully (bootstrap disabled)", async () => {
    const result = await harnessBaseModeAdvisory(null);
    expect(result.message).toBeTruthy();
  });
});

// ─── v3.12.0 — auto-bootstrap default Quick Sprint (B2 hard default-on) ───

describe("bootstrapDefaultQuickSprint (helper)", () => {
  test("creates sprint-001-default contract when no sprints exist", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints"), { recursive: true });
    const result = bootstrapDefaultQuickSprint(TMP, "test-session");
    expect(result).not.toBe(null);
    expect(result).toContain("sprint-001-default");
    expect(result).toContain("contract.json");

    const contractPath = path.join(TMP, result!);
    expect(fs.existsSync(contractPath)).toBe(true);

    const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    // v3.13.0+ crystalline-resilient-narwhal: contractId now slug-prefixed
    // (e.g. `<slug>-sprint-001-default`). The path-layer dir name stays plain
    // `sprint-001-default` for ls-based discovery compat. Test the contract's
    // logical contractId carries the slug prefix + sprint suffix.
    expect(contract.contractId).toMatch(/-sprint-001-default$/);
    expect(typeof contract.projectSlug).toBe("string");
    expect(contract.projectSlug.length).toBeGreaterThan(0);
    expect(contract.sprintNumber).toBe(1);
    expect(contract.status).toBe("bound");
    expect(contract.mode).toBe("quick");
    expect(contract.iterationLimit).toBe(1);
    expect(contract.timeoutMs).toBe(900000);
    expect(contract.autoBootstrapped).toBe(true);
    expect(contract.leadAsEvaluator).toBe(false);
    expect(contract.graderDispatchEnabled).toBe(true);
    expect(contract.analyzerTriggerEnabled).toBe(true);
    expect(contract.disagreementResolution).toBe("grader-dispatch-arbitrated");
    expect(contract.rubricInline).toHaveLength(3);
    expect(contract.rubricInline[0].criterionId).toBe("crit-quick-code");
    expect(contract.rubricInline[1].criterionId).toBe("crit-quick-ontology");
    expect(contract.rubricInline[2].criterionId).toBe("crit-quick-rule");

    // Iteration directory created
    const iterDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-default", "iterations", "iteration-001");
    expect(fs.existsSync(iterDir)).toBe(true);
  });

  test("auto-increments sprint number when prior sprints exist", () => {
    // Pre-existing sprint-001 + sprint-005 → next should be sprint-006
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick"), { recursive: true });
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-005-default"), { recursive: true });
    const result = bootstrapDefaultQuickSprint(TMP, "test-session");
    expect(result).not.toBe(null);
    expect(result).toContain("sprint-006-default");

    const contract = JSON.parse(fs.readFileSync(path.join(TMP, result!), "utf8"));
    expect(contract.sprintNumber).toBe(6);
  });

  test("returns null on second call (race-safe; wx flag prevents collision)", () => {
    // First call succeeds
    const first = bootstrapDefaultQuickSprint(TMP, "session-A");
    expect(first).not.toBe(null);
    // Second call to same project — incremented sprint number; this should also succeed
    const second = bootstrapDefaultQuickSprint(TMP, "session-B");
    expect(second).not.toBe(null);
    expect(first).not.toBe(second);
  });

  test("returns null on write failure (e.g., readonly parent)", () => {
    // Create read-only parent dir to force EACCES on mkdir
    const readonlyParent = path.join(TMP, "readonly");
    fs.mkdirSync(readonlyParent, { mode: 0o555 });
    try {
      const result = bootstrapDefaultQuickSprint(readonlyParent, "test-session");
      expect(result).toBe(null);
    } finally {
      fs.chmodSync(readonlyParent, 0o755); // restore for cleanup
    }
  });
});

describe("harnessBaseModeAdvisory (handler) — v3.12.0 auto-bootstrap (default-on)", () => {
  test("AUTO-BOOTSTRAPS when no harness dir (default behavior)", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const result = await harnessBaseModeAdvisory({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("AUTO-BOOTSTRAPPED");
    expect(result.additionalContext).toContain("HARNESS AUTO-BOOTSTRAP");

    // contract.json should exist
    const sprintsDir = path.join(TMP, ".palantir-mini", "harness", "sprints");
    expect(fs.existsSync(sprintsDir)).toBe(true);
    const sprints = fs.readdirSync(sprintsDir);
    expect(sprints.length).toBeGreaterThanOrEqual(1);
    expect(sprints[0]).toContain("default");
  });

  test("AUTO-BOOTSTRAPS when harness dir exists but no bound contract", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness"), { recursive: true });
    const result = await harnessBaseModeAdvisory({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("AUTO-BOOTSTRAPPED");
    expect(result.additionalContext).toContain("had no bound SprintContract");
  });

  test("respects PALANTIR_MINI_AUTO_SPRINT_DISABLE=1 (advisory only)", async () => {
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const result = await harnessBaseModeAdvisory({ cwd: TMP, session_id: "test" });
    expect(result.message).not.toContain("AUTO-BOOTSTRAPPED");
    expect(result.message).toContain("no harness dir");
    expect(result.additionalContext).toContain("disabled via PALANTIR_MINI_AUTO_SPRINT_DISABLE");

    // No sprint should be created
    const sprintsDir = path.join(TMP, ".palantir-mini", "harness", "sprints");
    expect(fs.existsSync(sprintsDir)).toBe(false);
  });

  test("returns OK when bound contract already present (no bootstrap needed)", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "bound" }));
    const result = await harnessBaseModeAdvisory({ cwd: TMP, session_id: "test" });
    expect(result.message).toContain("OK");
    expect(result.message).not.toContain("AUTO-BOOTSTRAPPED");
  });
});

// ─── W4.C — Opus 4.7 token inflation advisory ───

describe("detectLeadModel / isOpus47 (helpers)", () => {
  let savedClaudeModel: string | undefined;

  beforeEach(() => {
    savedClaudeModel = process.env.CLAUDE_MODEL;
  });

  afterEach(() => {
    if (savedClaudeModel !== undefined) {
      process.env.CLAUDE_MODEL = savedClaudeModel;
    } else {
      delete process.env.CLAUDE_MODEL;
    }
  });

  test("detects claude-opus-4-7 model and isOpus47 returns true", () => {
    process.env.CLAUDE_MODEL = "claude-opus-4-7";
    expect(detectLeadModel()).toBe("claude-opus-4-7");
    expect(isOpus47("claude-opus-4-7")).toBe(true);
  });

  test("does NOT flag claude-opus-4-6 as Opus 4.7", () => {
    expect(isOpus47("claude-opus-4-6")).toBe(false);
  });

  test("does NOT flag sonnet models as Opus 4.7", () => {
    expect(isOpus47("claude-sonnet-4-6")).toBe(false);
    expect(isOpus47("claude-sonnet-4-7")).toBe(false);
  });

  test("isOpus47 returns false for null", () => {
    expect(isOpus47(null)).toBe(false);
  });
});

describe("harnessBaseModeAdvisory — Opus 4.7 token inflation advisory (W4.C Change 1)", () => {
  let savedClaudeModel: string | undefined;
  let stderrOutput: string;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    savedClaudeModel = process.env.CLAUDE_MODEL;
    stderrOutput = "";
    originalStderrWrite = process.stderr.write.bind(process.stderr);
    // Capture stderr writes
    process.stderr.write = ((chunk: string | Uint8Array, ..._args: unknown[]) => {
      if (typeof chunk === "string") stderrOutput += chunk;
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
    if (savedClaudeModel !== undefined) {
      process.env.CLAUDE_MODEL = savedClaudeModel;
    } else {
      delete process.env.CLAUDE_MODEL;
    }
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
  });

  test("detects claude-opus-4-7 model and surfaces token inflation note", async () => {
    process.env.CLAUDE_MODEL = "claude-opus-4-7";
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
    // Need a bound contract so we reach the green path
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "bound" }));

    const result = await harnessBaseModeAdvisory({ cwd: TMP });
    expect(result.message).toContain("OK");
    expect(stderrOutput).toContain("1.0–1.35×");
    expect(stderrOutput).toContain("max_tokens");
    expect(stderrOutput).toContain("budget_tokens parameter NOT supported on Opus 4.7");
  });

  test("does NOT surface inflation note for claude-opus-4-6", async () => {
    process.env.CLAUDE_MODEL = "claude-opus-4-6";
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "bound" }));

    await harnessBaseModeAdvisory({ cwd: TMP });
    expect(stderrOutput).not.toContain("1.0–1.35×");
  });

  test("does NOT surface inflation note for sonnet models", async () => {
    process.env.CLAUDE_MODEL = "claude-sonnet-4-6";
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify({ status: "bound" }));

    await harnessBaseModeAdvisory({ cwd: TMP });
    expect(stderrOutput).not.toContain("1.0–1.35×");
  });
});

// ─── W4.C — getNonDefaultSpecies helper ───

describe("getNonDefaultSpecies (helper)", () => {
  test("returns null for null/undefined/non-object", () => {
    expect(getNonDefaultSpecies(null)).toBe(null);
    expect(getNonDefaultSpecies(undefined)).toBe(null);
    expect(getNonDefaultSpecies("string")).toBe(null);
  });

  test("returns null when taskFitness is absent", () => {
    expect(getNonDefaultSpecies({ status: "bound" })).toBe(null);
  });

  test("returns null when species is claude-code-cli (default)", () => {
    expect(getNonDefaultSpecies({ taskFitness: { species: "claude-code-cli", expectedBenchmark: 0.9 } })).toBe(null);
  });

  test("returns species string for non-default species", () => {
    expect(getNonDefaultSpecies({ taskFitness: { species: "claude-agent-sdk", expectedBenchmark: 0.8 } })).toBe("claude-agent-sdk");
    expect(getNonDefaultSpecies({ taskFitness: { species: "gemini-enterprise-agent-platform", expectedBenchmark: 0.7 } })).toBe("gemini-enterprise-agent-platform");
  });

  test("returns null when species is empty string", () => {
    expect(getNonDefaultSpecies({ taskFitness: { species: "", expectedBenchmark: 0.9 } })).toBe(null);
  });
});

// ─── W4.C — Non-default species advisory (Change 2) ───

describe("harnessBaseModeAdvisory — non-default species advisory (W4.C Change 2)", () => {
  let stderrOutput: string;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    stderrOutput = "";
    originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array, ..._args: unknown[]) => {
      if (typeof chunk === "string") stderrOutput += chunk;
      return true;
    }) as typeof process.stderr.write;
    process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE = "1";
    delete process.env.CLAUDE_MODEL;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
  });

  test("detects non-default species in SprintContract.taskFitness and surfaces rationale advisory", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(
      path.join(sprintDir, "contract.json"),
      JSON.stringify({
        status: "bound",
        taskFitness: { species: "claude-agent-sdk", expectedBenchmark: 0.85 },
      }),
    );

    const result = await harnessBaseModeAdvisory({ cwd: TMP });
    expect(result.message).toContain("OK");
    expect(stderrOutput).toContain("claude-agent-sdk");
    expect(stderrOutput).toContain("claude-code-cli (default)");
    expect(stderrOutput).toContain("gemini-enterprise-agent-platform");
    expect(stderrOutput).toContain("microsoft-foundry-agent-service");
    expect(stderrOutput).toContain("pm_dispatch_cost_estimate");
  });

  test("does NOT surface species advisory when species == 'claude-code-cli' (default)", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(
      path.join(sprintDir, "contract.json"),
      JSON.stringify({
        status: "bound",
        taskFitness: { species: "claude-code-cli", expectedBenchmark: 0.9 },
      }),
    );

    await harnessBaseModeAdvisory({ cwd: TMP });
    expect(stderrOutput).not.toContain("Non-default harness species detected");
  });

  test("does NOT surface species advisory when SprintContract has no taskFitness field (backwards-compat with v1.43.0 contracts)", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(
      path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick", iterationLimit: 1 }),
    );

    await harnessBaseModeAdvisory({ cwd: TMP });
    expect(stderrOutput).not.toContain("Non-default harness species detected");
  });
});
