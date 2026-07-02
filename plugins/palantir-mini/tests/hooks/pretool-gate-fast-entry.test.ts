// palantir-mini — differential test: thin PreToolUse gate ENTRY files vs their
// impl modules' `runFromPayload`.
//
// The gate-split refactor (hooks/gates/ split) moved the full assessment logic
// into hooks/gates/<name>.impl.ts and rewrote hooks/<name>.ts (SAME filename) as
// a thin entry: fast top-level logic + static imports only, dynamically
// import()-ing the impl ONLY when its fast path does not apply. This test proves
// the entry (spawned as a real subprocess, exactly as hooks.json invokes it) and
// the impl's `runFromPayload` (called in-process) produce IDENTICAL verdicts for
// an identical payload — for both the fast-path lane and the slow (dynamic
// import) lane, for both gates.
//
// Spawn convention follows the established pattern in
// tests/hooks/write-scope-runtime-enforce.test.ts / tests/hooks/t4-promotion-trigger.test.ts
// (spawnSync("bun", ["run", HOOK_SCRIPT], { input, env, encoding: "utf8" })).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

const PLUGIN_ROOT = path.resolve(import.meta.dirname!, "../..");

const GATE1_ENTRY = path.join(PLUGIN_ROOT, "hooks", "ontology-engineering-workflow-enforcement-gate.ts");
const GATE2_ENTRY = path.join(PLUGIN_ROOT, "hooks", "prompt-dtc-enforcement-gate.ts");

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

function freshProjectDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-gate-fast-entry-"));
  fs.mkdirSync(path.join(dir, ".palantir-mini"), { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

function freshNonProjectDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-gate-fast-entry-noproj-"));
  tmpDirs.push(dir);
  return dir;
}

interface SpawnResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runEntry(
  entryPath: string,
  payload: unknown,
  extraEnv: Record<string, string | undefined> = {},
): SpawnResult {
  const env = { ...process.env, ...extraEnv } as Record<string, string>;
  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined) delete env[key];
  }
  const res = spawnSync("bun", ["run", entryPath], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    cwd: PLUGIN_ROOT,
    env,
    encoding: "utf8",
    timeout: 20_000,
  });
  return {
    exitCode: res.status ?? 0,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("pretool-gate-fast-entry: gate1 (ontology-engineering-workflow-enforcement-gate)", () => {
  test("(a) plain Read tool payload in a fresh project root -> fast path; entry stdout matches runFromPayload", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-a",
      tool_name: "Read",
      tool_input: { file_path: path.join(projectDir, "README.md") },
    };

    const entryResult = runEntry(GATE1_ENTRY, payload);
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/ontology-engineering-workflow-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
    // Confirm this genuinely took the fast path (no FDE-provenance / mutation
    // logic engaged) — the skip verdict is the plain "gate skipped" message.
    expect(JSON.parse(entryResult.stdout).message).toBe("palantir-mini: ontology-engineering workflow gate skipped");
  });

  test("(b) Read payload with 'ontology-engineering' in file_path -> gate1 falls through to slow path; entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-b",
      tool_name: "Read",
      tool_input: { file_path: path.join(projectDir, "docs", "ontology-engineering", "notes.md") },
    };

    const entryResult = runEntry(GATE1_ENTRY, payload);
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/ontology-engineering-workflow-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
  });

  test("(c) AskUserQuestion tool name -> gate1 takes the slow path via legacy-UI token match (advisory); entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-c",
      tool_name: "AskUserQuestion",
      tool_input: { question: "Which option?" },
    };

    const entryResult = runEntry(GATE1_ENTRY, payload);
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/ontology-engineering-workflow-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
    expect(JSON.parse(entryResult.stdout).message).toContain("ADVISORY");
  });

  test("(d) generic Edit tool payload (mutating) -> both gates take the slow path; gate1 entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-d",
      tool_name: "Edit",
      tool_input: { file_path: path.join(projectDir, "src", "index.ts"), old_string: "a", new_string: "b" },
    };

    const entryResult = runEntry(GATE1_ENTRY, payload);
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/ontology-engineering-workflow-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
  });

  test("(e) unknown/made-up tool name (not in readOnlyTools) -> slow path; gate1 entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-e",
      tool_name: "TotallyMadeUpTool",
      tool_input: { foo: "bar" },
    };

    const entryResult = runEntry(GATE1_ENTRY, payload);
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/ontology-engineering-workflow-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
  });

  test("(h1) malformed JSON stdin -> gate1 entry prints the exact malformed-payload verdict", () => {
    const entryResult = runEntry(GATE1_ENTRY, "{not valid json");
    expect(entryResult.exitCode).toBe(0);
    expect(entryResult.stdout).toBe(
      `${JSON.stringify({
        message: "palantir-mini: ontology-engineering workflow gate skipped - malformed hook payload",
        decision: "continue",
      })}\n`,
    );
  });
});

describe("pretool-gate-fast-entry: gate2 (prompt-dtc-enforcement-gate)", () => {
  test("(a) plain Read tool payload in a fresh project root -> fast path; entry stdout matches runFromPayload", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-a2",
      tool_name: "Read",
      tool_input: { file_path: path.join(projectDir, "README.md") },
    };

    const entryResult = runEntry(GATE2_ENTRY, payload, {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: undefined,
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: undefined,
    });
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/prompt-dtc-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
    expect(JSON.parse(entryResult.stdout).message).toBe(
      "palantir-mini: prompt-DTC gate skipped (Read is not ontology-affecting; selective-blocking mode)",
    );
  });

  test("(d) generic Edit tool payload (mutating) -> gate2 takes the slow path; entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-d2",
      tool_name: "Edit",
      tool_input: { file_path: path.join(projectDir, "src", "index.ts"), old_string: "a", new_string: "b" },
    };

    const entryResult = runEntry(GATE2_ENTRY, payload, {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: undefined,
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: undefined,
    });
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/prompt-dtc-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
  });

  test("(e) unknown/made-up tool name (not in readOnlyTools) -> slow path; gate2 entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-e2",
      tool_name: "TotallyMadeUpTool",
      tool_input: { foo: "bar" },
    };

    const entryResult = runEntry(GATE2_ENTRY, payload, {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: undefined,
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: undefined,
    });
    expect(entryResult.exitCode).toBe(0);

    const impl = await import("../../hooks/gates/prompt-dtc-enforcement-gate.impl");
    const implResult = await impl.runFromPayload(payload);
    const expectedStdout = `${JSON.stringify(implResult)}\n`;

    expect(entryResult.stdout).toBe(expectedStdout);
  });

  test("(f) PALANTIR_MINI_PROMPT_DTC_GATE_MODE=blocking on the spawn -> forces slow path; entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-f",
      tool_name: "Read",
      tool_input: { file_path: path.join(projectDir, "README.md") },
    };

    const entryResult = runEntry(GATE2_ENTRY, payload, {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: "blocking",
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: undefined,
    });
    expect(entryResult.exitCode).toBe(0);

    const savedMode = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    try {
      const impl = await import("../../hooks/gates/prompt-dtc-enforcement-gate.impl");
      const implResult = await impl.runFromPayload(payload);
      const expectedStdout = `${JSON.stringify(implResult)}\n`;
      expect(entryResult.stdout).toBe(expectedStdout);
      // Confirm this genuinely did NOT take the "not ontology-affecting" fast-path
      // shortcut message (mode=blocking forces the slow path even for a read-only tool).
      expect(entryResult.stdout).not.toBe(
        `${JSON.stringify({
          message: "palantir-mini: prompt-DTC gate skipped (Read is not ontology-affecting; selective-blocking mode)",
        })}\n`,
      );
    } finally {
      if (savedMode === undefined) delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
      else process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = savedMode;
    }
  });

  test("(g) PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 on the spawn -> forces slow path; entry and impl agree", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-g",
      tool_name: "Read",
      tool_input: { file_path: path.join(projectDir, "README.md") },
    };

    const entryResult = runEntry(GATE2_ENTRY, payload, {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: undefined,
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: "1",
    });
    expect(entryResult.exitCode).toBe(0);

    const savedBypass = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS = "1";
    try {
      const impl = await import("../../hooks/gates/prompt-dtc-enforcement-gate.impl");
      const implResult = await impl.runFromPayload(payload);
      const expectedStdout = `${JSON.stringify(implResult)}\n`;
      expect(entryResult.stdout).toBe(expectedStdout);
    } finally {
      if (savedBypass === undefined) delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
      else process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS = savedBypass;
    }
  });

  test("(h2) malformed JSON stdin -> gate2 entry prints the exact malformed-payload verdict", () => {
    const entryResult = runEntry(GATE2_ENTRY, "{not valid json", {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: undefined,
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: undefined,
    });
    expect(entryResult.exitCode).toBe(0);
    expect(entryResult.stdout).toBe(
      `${JSON.stringify({
        message: "palantir-mini: prompt-DTC gate skipped - malformed hook payload",
        decision: "continue",
      })}\n`,
    );
  });

  test("no current FDE session (fresh project dir has none) still allows the fast path for a read-only tool", async () => {
    const projectDir = freshProjectDir();
    const payload = {
      cwd: projectDir,
      session_id: "s-fast-entry-noFde",
      tool_name: "Grep",
      tool_input: { pattern: "foo" },
    };

    const entryResult = runEntry(GATE2_ENTRY, payload, {
      PALANTIR_MINI_PROMPT_DTC_GATE_MODE: undefined,
      PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS: undefined,
    });
    expect(entryResult.exitCode).toBe(0);
    expect(JSON.parse(entryResult.stdout).message).toBe(
      "palantir-mini: prompt-DTC gate skipped (Grep is not ontology-affecting; selective-blocking mode)",
    );
  });
});
