// palantir-mini v3.8.0 — commit-edits-precondition hook tests (W1.2)
// Smoke + scenario coverage for the harness commit gate.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import commitEditsPrecondition from "../../hooks/commit-edits-precondition";

const COMMIT_EDITS_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
let TMP: string;
let savedBypass: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-commit-precondition-"));
  savedBypass = process.env.PALANTIR_MINI_HARNESS_BYPASS;
  delete process.env.PALANTIR_MINI_HARNESS_BYPASS;
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_HARNESS_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_HARNESS_BYPASS;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

function declareReviewArtifact(reportFile: string): void {
  const promptDir = path.join(TMP, "_workspace", "run-1", "spawn-prompts");
  fs.mkdirSync(promptDir, { recursive: true });
  fs.writeFileSync(path.join(promptDir, "index.md"), `Required output: ${reportFile}\n`);
}

describe("commitEditsPrecondition", () => {
  test("skips when tool_name is neither commit_edits nor file-edit (Bash)", async () => {
    const result = await commitEditsPrecondition({
      tool_name: "Bash",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("blocks PALANTIR_MINI_HARNESS_BYPASS=1 for commit_edits", async () => {
    process.env.PALANTIR_MINI_HARNESS_BYPASS = "1";
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("harness-bypass-denied");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  // Note: "skipped when no project root resolvable" path is hard to test in
  // isolation (ambient .palantir-mini in /tmp + /home make findProjectRoot
  // return non-null even from temp dirs). Production behavior is correct.

  test("BLOCKS with no-harness-dir when only .palantir-mini exists", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-harness-dir");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("rule 16 v3.4.0");
  });

  test("BLOCKS with no-bound-contract when harness dir but no bound contract", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001"), { recursive: true });
    fs.writeFileSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001", "contract.json"),
      JSON.stringify({ status: "drafting" }));
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-bound-contract");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("ALLOWS when bound contract present", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick" }));
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    expect(result.message).toContain("sprint-001-quick");
  });

  test("uses tool_input.project over cwd for resolution", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const otherCwd = fs.mkdtempSync(path.join(os.tmpdir(), "pm-other-cwd-"));
    try {
      const result = await commitEditsPrecondition({
        tool_name: COMMIT_EDITS_TOOL,
        cwd: otherCwd, // unrelated cwd
        tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
      });
      // Should resolve to TMP (no harness dir there) → BLOCK
      expect(result.decision).toBe("block");
      expect(result.message).toContain("no-harness-dir");
    } finally {
      fs.rmSync(otherCwd, { recursive: true, force: true });
    }
  });

  test("handles null payload gracefully", async () => {
    const result = await commitEditsPrecondition(null);
    expect(result.message).toBeTruthy();
    expect(result.decision).toBe("continue"); // null tool_name → skip
  });
});

// ─── v3.9.0 W3.1c — dry-run-then-grade gate ───

describe("commitEditsPrecondition — W3.1c dry-run-grade gate", () => {
  let savedEventsFile: string | undefined;

  function appendEvent(eventsPath: string, ev: object): void {
    const line = JSON.stringify(ev) + "\n";
    fs.appendFileSync(eventsPath, line, "utf8");
  }

  function makeBoundContract(sprintDir: string, mode?: string): void {
    fs.mkdirSync(sprintDir, { recursive: true });
    const contract: Record<string, unknown> = { status: "bound" };
    if (mode) contract.mode = mode;
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify(contract));
  }

  function setupW31c(modeArg?: string): { eventsPath: string; sprintDir: string } {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001");
    makeBoundContract(sprintDir, modeArg);
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, ""); // empty events.jsonl
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    return { eventsPath, sprintDir };
  }

  afterEach(() => {
    if (savedEventsFile !== undefined) {
      process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
    } else {
      delete process.env.PALANTIR_MINI_EVENTS_FILE;
    }
    savedEventsFile = undefined;
  });

  test("Quick Sprint mode runs inline grader (not full dry-run pipeline) and allows commit", async () => {
    // sprint-059 W2.8: Quick Sprint no longer hard-bypasses. It now runs inline
    // grader advisory and still allows commit. The reasonTag is "quick-sprint-inline-graded".
    setupW31c("quick");
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("continue");
    // W2.8: reasonTag changed from "quick-sprint-bypass-dry-run-check" to "quick-sprint-inline-graded"
    expect(result.message).toContain("quick-sprint-inline-graded");
    expect(result.message).toContain("OK");
  });

  test("Grace period (no dry_run_computed event ever) → allow", async () => {
    setupW31c("full");
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("grace-period-no-dry-run-pipeline-yet");
  });

  test("Once dry-run pipeline is in use, missing dryRunRef in commit_edits → block", async () => {
    const { eventsPath } = setupW31c("full");
    // Simulate prior dry-run-computed event for some other ref → triggers grace-period exit
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "dry_run_computed" },
      withWhat: { reasoning: "dry-run-computed dryRunRef=otherref000000" },
      throughWhich: { sessionId: "x", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-1",
      sequence: 1,
    });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
      // NO dryRunRef
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("missing-dry-run-ref");
  });

  test("Paired computed + graded(pass) → allow", async () => {
    const { eventsPath } = setupW31c("full");
    const ref = "abc1234567890def";
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "dry_run_computed" },
      withWhat: { reasoning: `dry-run-computed dryRunRef=${ref}` },
      throughWhich: { sessionId: "x", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-1",
      sequence: 1,
    });
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "dry_run_graded" },
      withWhat: { reasoning: `dry-run-graded dryRunRef=${ref} verdict=pass` },
      throughWhich: { sessionId: "x", toolName: "pm_grader_dispatch", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-2",
      sequence: 2,
    });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    expect(result.message).toContain(`dryRunRef=${ref}`);
  });

  test("Paired computed + graded(fail) → block (verdict=fail)", async () => {
    const { eventsPath } = setupW31c("full");
    const ref = "failedref0000000";
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "dry_run_computed" },
      withWhat: { reasoning: `dry-run-computed dryRunRef=${ref}` },
      throughWhich: { sessionId: "x", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-1",
      sequence: 1,
    });
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: false, errorClass: "dry_run_graded" },
      withWhat: { reasoning: `dry-run-graded dryRunRef=${ref} verdict=fail` },
      throughWhich: { sessionId: "x", toolName: "pm_grader_dispatch", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-2",
      sequence: 2,
    });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("dry-run-graded-fail");
  });

  test("computed but no graded → block (dry-run-not-graded)", async () => {
    const { eventsPath } = setupW31c("full");
    const ref = "ungradedref00000";
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "dry_run_computed" },
      withWhat: { reasoning: `dry-run-computed dryRunRef=${ref}` },
      throughWhich: { sessionId: "x", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-1",
      sequence: 1,
    });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("dry-run-not-graded");
  });

  test("dry_run_skipped_validation_errors → block (validation errors)", async () => {
    const { eventsPath } = setupW31c("full");
    const ref = "skippedref000000";
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: false, errorClass: "dry_run_computed" },
      withWhat: { reasoning: `dry-run-computed dryRunRef=${ref} validation=errors` },
      throughWhich: { sessionId: "x", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-1",
      sequence: 1,
    });
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: false, errorClass: "dry_run_skipped_validation_errors" },
      withWhat: { reasoning: `dry-run-graded dryRunRef=${ref} verdict=fail (skipped grading)` },
      throughWhich: { sessionId: "x", toolName: "pm_grader_dispatch", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-2",
      sequence: 2,
    });
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("dry-run-validation-errors");
  });
});

// ─── v3.12.0 B2 — file-edit branch (Edit|Write|MultiEdit gating) ───

describe("commitEditsPrecondition — v3.12.0 B2 file-edit branch", () => {
  test("Edit on tracked file with no harness dir → BLOCK no-harness-dir", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const targetFile = path.join(TMP, "foo.ts");
    fs.writeFileSync(targetFile, "// stub");
    const result = await commitEditsPrecondition({
      tool_name: "Edit",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-harness-dir");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("Edit on tracked file with harness dir but no bound contract → BLOCK no-bound-contract", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness"), { recursive: true });
    const targetFile = path.join(TMP, "foo.ts");
    fs.writeFileSync(targetFile, "// stub");
    const result = await commitEditsPrecondition({
      tool_name: "Edit",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-bound-contract");
  });

  test("Write on tracked file with bound Quick Sprint contract → ALLOW", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick" }));
    const targetFile = path.join(TMP, "src", "module.ts");
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    const result = await commitEditsPrecondition({
      tool_name: "Write",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    expect(result.message).toContain("b2-file-edit-allow");
  });

  test("MultiEdit on tracked file with bound full-mode contract → ALLOW (no dry-run check)", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-002");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "full" }));
    const targetFile = path.join(TMP, "src", "module.ts");
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    const result = await commitEditsPrecondition({
      tool_name: "MultiEdit",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("b2-file-edit-allow");
  });

  test("Edit with file_path inside ~/.claude/ → ALLOW (overlay exempt prefix)", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const home = process.env.HOME ?? "";
    if (home.length === 0) {
      // skip if no HOME (CI edge case)
      return;
    }
    const targetFile = path.join(home, ".claude", "rules", "test-only.md");
    const result = await commitEditsPrecondition({
      tool_name: "Edit",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("overlay exempt prefix");
  });

  test("Edit with file_path outside any tracked project → ALLOW (no project root)", async () => {
    // Note: production environment may have /tmp/.palantir-mini ambient — skip if so
    // (production findProjectRoot walks up; /tmp/.palantir-mini makes /tmp tracked).
    if (fs.existsSync("/tmp/.palantir-mini") || fs.existsSync(path.join(os.tmpdir(), ".palantir-mini"))) {
      // Ambient .palantir-mini at tmpdir root — skip this test scenario
      return;
    }
    const isolated = fs.mkdtempSync(path.join(os.tmpdir(), "pm-isolated-no-pm-"));
    try {
      const targetFile = path.join(isolated, "foo.ts");
      const result = await commitEditsPrecondition({
        tool_name: "Edit",
        cwd: isolated,
        tool_input: { file_path: targetFile },
      });
      // No .palantir-mini ancestor → "no project root" branch ALLOWS
      expect(result.decision).toBe("continue");
      expect(result.message).toContain("no project root");
    } finally {
      fs.rmSync(isolated, { recursive: true, force: true });
    }
  });

  test("Write to assigned markdown report artifact path → ALLOW without harness contract", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const reportFile = path.join(TMP, "_workspace", "run-1", "agent-outputs", "W1-report.md");
    declareReviewArtifact(reportFile);
    const result = await commitEditsPrecondition({
      tool_name: "Write",
      cwd: TMP,
      tool_input: { file_path: reportFile },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("assigned review artifact path");
  });

  test("Write to undeclared report-lane markdown path still requires harness contract", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const reportFile = path.join(TMP, "_workspace", "run-1", "agent-outputs", "W1-report.md");
    const result = await commitEditsPrecondition({
      tool_name: "Write",
      cwd: TMP,
      tool_input: { file_path: reportFile },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-harness-dir");
  });

  test("Write to non-report workspace markdown path still requires harness contract", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const reportFile = path.join(TMP, "_workspace", "run-1", "source-notes.md");
    const result = await commitEditsPrecondition({
      tool_name: "Write",
      cwd: TMP,
      tool_input: { file_path: reportFile },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-harness-dir");
  });

  test("MultiEdit with PALANTIR_MINI_HARNESS_BYPASS=1 → BLOCK (env bypass denied)", async () => {
    process.env.PALANTIR_MINI_HARNESS_BYPASS = "1";
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const targetFile = path.join(TMP, "src", "module.ts");
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    const result = await commitEditsPrecondition({
      tool_name: "MultiEdit",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("harness-bypass-denied");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("Edit with no file_path field → ALLOW (skip; cannot determine tracked status)", async () => {
    const result = await commitEditsPrecondition({
      tool_name: "Edit",
      cwd: TMP,
      tool_input: { /* no file_path */ },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("file_path missing");
  });

  // ─── F2 patch coverage: NotebookEdit gating ───
  test("NotebookEdit on tracked file with no harness dir → BLOCK (F2)", async () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const targetFile = path.join(TMP, "notebook.ipynb");
    fs.writeFileSync(targetFile, "{}");
    const result = await commitEditsPrecondition({
      tool_name: "NotebookEdit",
      cwd: TMP,
      tool_input: { notebook_path: targetFile },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("no-harness-dir");
  });

  test("NotebookEdit on tracked file with bound contract → ALLOW (F2)", async () => {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick" }));
    const targetFile = path.join(TMP, "notebook.ipynb");
    fs.writeFileSync(targetFile, "{}");
    const result = await commitEditsPrecondition({
      tool_name: "NotebookEdit",
      cwd: TMP,
      tool_input: { notebook_path: targetFile },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("b2-file-edit-allow");
  });

  // ─── F1 patch coverage: symlink resolution ───
  // ─── T7b advisory: ontology:drift silent-path ───
  test("advisory ontology:drift skips silently when script missing (no crash, decision=continue)", async () => {
    // Arrange: tracked project + bound contract + NO package.json with ontology:drift script.
    // execSync("bun run ontology:drift") will throw → silent catch → no driftAdvisory.
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick" }));
    // TMP has no package.json → bun run ontology:drift exits non-zero → silent
    const targetFile = path.join(TMP, "src", "advisory-test.ts");
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    const result = await commitEditsPrecondition({
      tool_name: "Write",
      cwd: TMP,
      tool_input: { file_path: targetFile },
    });
    // Must NOT block — advisory is non-blocking
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("b2-file-edit-allow");
    // additionalContext either absent or does NOT contain a block signal
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("BLOCK");
  });

  test("Edit with symlink under ~/.claude/ pointing to tracked project file → BLOCK (F1)", async () => {
    // Setup tracked project at TMP, no contract → would block normally
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness"), { recursive: true });
    const tracked = path.join(TMP, "secret.ts");
    fs.writeFileSync(tracked, "// real");

    const home = process.env.HOME ?? "";
    if (home.length === 0 || !fs.existsSync(path.join(home, ".claude"))) {
      // skip — no ~/.claude/ to host symlink
      return;
    }
    try {
      fs.accessSync(path.join(home, ".claude"), fs.constants.W_OK);
    } catch {
      // skip — sandboxed runtimes may expose ~/.claude as read-only
      return;
    }
    const symlink = path.join(home, ".claude", `pm-test-symlink-${Date.now()}.ts`);
    try {
      fs.symlinkSync(tracked, symlink);
      const result = await commitEditsPrecondition({
        tool_name: "Edit",
        cwd: home,
        tool_input: { file_path: symlink },
      });
      // Without F1 patch, exempt-prefix would ALLOW; with patch, realpath resolves
      // to /tmp/.../secret.ts which has tracked ancestor → BLOCK no-bound-contract.
      expect(result.decision).toBe("block");
      expect(result.message).toContain("no-bound-contract");
    } finally {
      try { fs.unlinkSync(symlink); } catch { /* ignore */ }
    }
  });
});

// ─── PR-11 — pre_mutation_governance_decided event emission ───

describe("commitEditsPrecondition — PR-11 pre_mutation_governance_decided", () => {
  let savedEventsFile: string | undefined;

  function setupHarness(): { sprintDir: string; eventsPath: string } {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-pr11-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick", theme: "pr-11-test" }));
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, "");
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    return { sprintDir, eventsPath };
  }

  afterEach(() => {
    if (savedEventsFile !== undefined) {
      process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
    } else {
      delete process.env.PALANTIR_MINI_EVENTS_FILE;
    }
    savedEventsFile = undefined;
  });

  test("on allow, emits pre_mutation_governance_decided with ruleApplied=default-allow", async () => {
    const { eventsPath } = setupHarness();
    const result = await commitEditsPrecondition({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("continue");
    // Give fire-and-forget emissions time to flush
    await new Promise((resolve) => setTimeout(resolve, 150));
    const events = fs.readFileSync(eventsPath, "utf8")
      .trim().split("\n").filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
    const gov = events.find((e) => e.type === "pre_mutation_governance_decided");
    expect(gov).toBeDefined();
    expect(gov?.payload?.ruleApplied).toBe("default-allow");
    expect(gov?.payload?.allowed).toBe(true);
  });

  test("on block (no harness dir), emits pre_mutation_governance_decided with allowed=false", async () => {
    // TMP has no harness dir; commit_edits should block and emit decided event
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, "");
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await commitEditsPrecondition({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("block");
    await new Promise((resolve) => setTimeout(resolve, 150));
    const events = fs.readFileSync(eventsPath, "utf8")
      .trim().split("\n").filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
    const gov = events.find((e) => e.type === "pre_mutation_governance_decided");
    expect(gov).toBeDefined();
    expect(gov?.payload?.allowed).toBe(false);
    expect(gov?.payload?.ruleApplied).toBe("missing-digital-twin-change-contract");
  });
});

// ─── sprint-113 PR 5.3 — dry-run gate strengthening (freshness + drift + escalation) ───

describe("commitEditsPrecondition — sprint-113 PR 5.3 dry-run gate strengthening", () => {
  let savedEventsFile: string | undefined;
  let savedFreshnessMin: string | undefined;
  let savedEscalateBypass: string | undefined;

  function appendEvent(eventsPath: string, ev: object): void {
    const line = JSON.stringify(ev) + "\n";
    fs.appendFileSync(eventsPath, line, "utf8");
  }

  function setupFullMode(): { eventsPath: string; sprintDir: string } {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-pr53");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "full" }));
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, "");
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    return { eventsPath, sprintDir };
  }

  function appendComputedAndGraded(eventsPath: string, ref: string, gradedIso: string, pass: boolean): void {
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "dry_run_computed" },
      withWhat: { reasoning: `dry-run-computed dryRunRef=${ref}` },
      throughWhich: { sessionId: "x", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: gradedIso,
      atopWhich: "no-git",
      eventId: "evt-computed",
      sequence: 1,
    });
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: pass, errorClass: "dry_run_graded" },
      withWhat: { reasoning: `dry-run-graded dryRunRef=${ref} verdict=${pass ? "pass" : "fail"}` },
      throughWhich: { sessionId: "x", toolName: "pm_grader_dispatch", cwd: TMP },
      byWhom: { identity: "claude-code" },
      when: gradedIso,
      atopWhich: "no-git",
      eventId: "evt-graded",
      sequence: 2,
    });
  }

  afterEach(() => {
    if (savedEventsFile !== undefined) {
      process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
    } else {
      delete process.env.PALANTIR_MINI_EVENTS_FILE;
    }
    if (savedFreshnessMin !== undefined) {
      process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN = savedFreshnessMin;
    } else {
      delete process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN;
    }
    if (savedEscalateBypass !== undefined) {
      process.env.PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS = savedEscalateBypass;
    } else {
      delete process.env.PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS;
    }
    savedEventsFile = undefined;
    savedFreshnessMin = undefined;
    savedEscalateBypass = undefined;
  });

  test("(PR5.3-1) Fresh dry-run grade (within 30 min) → no freshness advisory, commit proceeds", async () => {
    const { eventsPath } = setupFullMode();
    const ref = "freshref0000000a";
    const recentIso = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    appendComputedAndGraded(eventsPath, ref, recentIso, true);

    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    // No freshness advisory in additionalContext
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("commit_gate_stale_dry_run_grade");
  });

  test("(PR5.3-2) Stale dry-run grade (>30 min old) → advisory emitted, commit still proceeds (advisory only)", async () => {
    const { eventsPath } = setupFullMode();
    // Set freshness window to 1 min to make 10-min-old grade stale
    savedFreshnessMin = process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN;
    process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN = "1";
    const ref = "staleref000000ab";
    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago (>1 min window)
    appendComputedAndGraded(eventsPath, ref, staleIso, true);

    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    // Advisory only — commit still proceeds
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    // Advisory present in additionalContext
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("commit_gate_stale_dry_run_grade");
  });

  test("(PR5.3-3) Edit shape matches dryRunRef (no edits provided) → no drift advisory, commit proceeds", async () => {
    const { eventsPath } = setupFullMode();
    const ref = "nodriftref000000";
    const recentIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    appendComputedAndGraded(eventsPath, ref, recentIso, true);

    // No edits in tool_input → skip drift check (can't compare shape)
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", dryRunRef: ref },
    });
    expect(result.decision).toBe("continue");
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("commit_gate_edit_shape_drift");
  });

  test("(PR5.3-4) Non-empty edits that hash-mismatch dryRunRef suffix → drift advisory emitted, commit proceeds", async () => {
    const { eventsPath } = setupFullMode();
    // dryRunRef chosen so its last 16 chars will NOT match the sha256 of the edits below
    const ref = "aaaaaaaaaaaaaaaa0000000000000000";
    const recentIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    appendComputedAndGraded(eventsPath, ref, recentIso, true);

    // Edits: non-empty array — their sha256 prefix will differ from ref's last 16 chars ("0000000000000000")
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [{ file: "src/foo.ts", content: "changed" }], dryRunRef: ref },
    });
    // Advisory only — commit still proceeds
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("commit_gate_edit_shape_drift");
  });

  test("(PR5.3-5) Strike 1 (1 prior advisory, 1 new = 2 total): advisory only, commit proceeds", async () => {
    // Use tiny freshness window (1 min) to reliably produce stale advisories
    savedFreshnessMin = process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN;
    process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN = "1";
    const { eventsPath } = setupFullMode();
    const ref = "strikeref111111ab";
    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    appendComputedAndGraded(eventsPath, ref, staleIso, true);

    // Pre-seed 1 advisory event in events.jsonl (simulating a prior attempt)
    const contractPath = path.join(".palantir-mini", "harness", "sprints", "sprint-pr53", "contract.json");
    appendEvent(eventsPath, {
      type: "validation_phase_completed",
      payload: { phase: "design", passed: true, errorClass: "commit_gate_stale_dry_run_grade", advisory: true, contract: contractPath },
      withWhat: { reasoning: `commit-edits-precondition PR5.3 advisory: commit_gate_stale_dry_run_grade contract=${contractPath} dryRunRef=${ref}` },
      throughWhich: { sessionId: "x", toolName: "PreToolUse", cwd: TMP },
      byWhom: { identity: "monitor" },
      when: new Date().toISOString(),
      atopWhich: "no-git",
      eventId: "evt-adv-1",
      sequence: 3,
    });

    // This attempt: 1 prior advisory + 1 new stale advisory = 2 total → still < 3, allow
    const r1 = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(r1.decision).toBe("continue");
    // Stale advisory present in context
    const ctx = r1.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("commit_gate_stale_dry_run_grade");
  });

  test("(PR5.3-6) 4th strike (≥3 prior advisories) → permissionDecision=deny (blocking)", async () => {
    savedFreshnessMin = process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN;
    process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN = "1";
    const { eventsPath } = setupFullMode();
    const ref = "strike4ref0000000";
    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    appendComputedAndGraded(eventsPath, ref, staleIso, true);

    // Pre-seed 3 advisory events to trigger 4th-strike
    const contractPath = path.join(".palantir-mini", "harness", "sprints", "sprint-pr53", "contract.json");
    for (let i = 0; i < 3; i++) {
      appendEvent(eventsPath, {
        type: "validation_phase_completed",
        payload: { phase: "design", passed: true, errorClass: "commit_gate_stale_dry_run_grade", advisory: true, contract: contractPath },
        withWhat: { reasoning: `commit-edits-precondition PR5.3 advisory: commit_gate_stale_dry_run_grade contract=${contractPath} dryRunRef=${ref}` },
        throughWhich: { sessionId: "x", toolName: "PreToolUse", cwd: TMP },
        byWhom: { identity: "monitor" },
        when: new Date().toISOString(),
        atopWhich: "no-git",
        eventId: `evt-adv-${i + 1}`,
        sequence: 3 + i,
      });
    }

    // 4th attempt → should block
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.message).toContain("commit_gate_4th_strike_escalation");
  });

  test("(PR5.3-7) Bypass env honored on 4th strike: PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS=1 → allow", async () => {
    savedFreshnessMin = process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN;
    process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN = "1";
    savedEscalateBypass = process.env.PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS;
    process.env.PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS = "1";

    const { eventsPath } = setupFullMode();
    const ref = "bypassref0000000a";
    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    appendComputedAndGraded(eventsPath, ref, staleIso, true);

    // Pre-seed 3 advisories
    const contractPath = path.join(".palantir-mini", "harness", "sprints", "sprint-pr53", "contract.json");
    for (let i = 0; i < 3; i++) {
      appendEvent(eventsPath, {
        type: "validation_phase_completed",
        payload: { phase: "design", passed: true, errorClass: "commit_gate_stale_dry_run_grade", advisory: true, contract: contractPath },
        withWhat: { reasoning: `commit-edits-precondition PR5.3 advisory: commit_gate_stale_dry_run_grade contract=${contractPath} dryRunRef=${ref}` },
        throughWhich: { sessionId: "x", toolName: "PreToolUse", cwd: TMP },
        byWhom: { identity: "monitor" },
        when: new Date().toISOString(),
        atopWhich: "no-git",
        eventId: `evt-adv-${i + 1}`,
        sequence: 3 + i,
      });
    }

    // 4th attempt with bypass → should allow
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: ref },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
  });

  test("(PR5.3-8) Quick Sprint mode preserved — no dry-run freshness/drift checks run at all", async () => {
    // Quick Sprint returns at the contractMode="quick" early-exit — PR5.3 checks never reached.
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-pr53-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick" }));
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, "");
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [], dryRunRef: "any-ref" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("quick-sprint-inline-graded");
    // Must NOT contain any PR5.3 advisory error classes
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).not.toContain("commit_gate_stale_dry_run_grade");
    expect(ctx).not.toContain("commit_gate_edit_shape_drift");
    expect(ctx).not.toContain("commit_gate_4th_strike_escalation");
  });
});

// ─── sprint-059 W2.8 — Quick Sprint inline grader ───

describe("commitEditsPrecondition — sprint-059 W2.8 Quick Sprint inline grader", () => {
  const COMMIT_EDITS_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
  let savedEventsFile: string | undefined;

  function setupQuickSprint(rubricCriteria?: object[]): { sprintDir: string; eventsPath: string } {
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    const contract: Record<string, unknown> = { status: "bound", mode: "quick" };
    if (rubricCriteria) {
      contract.gradingRubric = { rubricId: "quick-rubric", criteria: rubricCriteria };
    }
    fs.writeFileSync(path.join(sprintDir, "contract.json"), JSON.stringify(contract));
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, "");
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    return { sprintDir, eventsPath };
  }

  afterEach(() => {
    if (savedEventsFile !== undefined) {
      process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
    } else {
      delete process.env.PALANTIR_MINI_EVENTS_FILE;
    }
    savedEventsFile = undefined;
  });

  test("(W2.8-1) Quick Sprint commit with no inline rubric emits quick_sprint_inline_graded and allows commit", async () => {
    // Contract has no gradingRubric — empty criteria → vacuous pass
    setupQuickSprint(/* no criteria */);
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    // Commit must be allowed (Quick Sprint speed semantics)
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("quick-sprint-inline-graded");
    expect(result.message).toContain("OK");
  });

  test("(W2.8-2) Quick Sprint commit with passing code criterion emits quick_sprint_inline_graded and allows commit", async () => {
    // code-domain: validationExpression = "true" (always passes in shell)
    setupQuickSprint([
      {
        criterionId: "code-correctness",
        title: "Code correctness",
        rubricDomain: "code",
        validationExpression: "true",
        passFailLogic: { threshold: 1, scale: "0-1" },
        weightInRubric: 1,
      },
    ]);
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    // Commit still allowed even after inline grade
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("quick-sprint-inline-graded");
    expect(result.message).toContain("OK");
  });

  test("(W2.8-3) Quick Sprint commit with failing code criterion still allows commit (advisory only)", async () => {
    // code-domain: validationExpression = "false" (always fails in shell)
    setupQuickSprint([
      {
        criterionId: "code-correctness",
        title: "Code correctness",
        rubricDomain: "code",
        validationExpression: "false",
        passFailLogic: { threshold: 1, scale: "0-1" },
        weightInRubric: 1,
      },
    ]);
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    // CRITICAL: even though inline grade fails, commit is STILL allowed (advisory only)
    expect(result.decision).toBe("continue");
    // The allowResult message still contains "quick-sprint-inline-graded" (the reasonTag)
    expect(result.message).toContain("quick-sprint-inline-graded");
    expect(result.message).toContain("OK");
    // NOT a block
    expect(result.message).not.toContain("BLOCK");
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
  });

  test("(W2.8-4) PALANTIR_MINI_HARNESS_BYPASS=1 is denied before inline grade", async () => {
    process.env.PALANTIR_MINI_HARNESS_BYPASS = "1";
    setupQuickSprint([
      {
        criterionId: "code-correctness",
        title: "Code correctness",
        rubricDomain: "code",
        validationExpression: "false", // would fail if grader ran
        passFailLogic: { threshold: 1, scale: "0-1" },
        weightInRubric: 1,
      },
    ]);
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("harness-bypass-denied");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.message).not.toContain("quick-sprint-inline-graded");
  });

  test("(W2.8-5) Quick Sprint commit with model-domain criterion skips subprocess, still allows commit", async () => {
    // model-domain criteria cannot run claude -p in hook context — needs_human_review
    setupQuickSprint([
      {
        criterionId: "semantic-correctness",
        title: "Semantic correctness",
        rubricDomain: "model",
        scoringPrompt: "Does the code correctly implement the spec?",
        passFailLogic: { threshold: 0.8, scale: "0-1" },
        weightInRubric: 1,
      },
    ]);
    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    // Commit still allowed — model-domain skip doesn't block
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
  });

  test("(W2.8-6) Legacy Quick Sprint contract without rubric still allows commit (backwards compat)", async () => {
    // Older Quick Sprint contracts have no gradingRubric field at all
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    fs.mkdirSync(sprintDir, { recursive: true });
    // Write minimal legacy contract (no gradingRubric)
    fs.writeFileSync(path.join(sprintDir, "contract.json"),
      JSON.stringify({ status: "bound", mode: "quick", theme: "legacy-sprint" }));
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    fs.writeFileSync(eventsPath, "");
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    const result = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, actionTypeRid: "test", edits: [] },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
    expect(result.message).toContain("quick-sprint-inline-graded");
  });
});
