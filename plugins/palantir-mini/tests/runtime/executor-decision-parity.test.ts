/**
 * W3e-3b — Executor pre-spawn decision-parity gate.
 *
 * Before spawning a sandbox, the Executor projects the neutral RuntimeDecision
 * through every adapter and runs compareRuntimeDecisionParity. If any runtime
 * diverges on one of the 12 compared (semantic) fields the spawn is BLOCKED — the
 * sandbox is never created. A conforming adapter family passes the gate; an
 * adapter that cannot serve a requested step kind is a CAPABILITY_GAP (also
 * pre-spawn). This is the future-load-bearing cross-runtime regression guard (Q6).
 */
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runExecutor } from "../../lib/sandbox/executor";
import type {
  ExecStepKind,
  SandboxClientPort,
  SandboxSession,
} from "../../lib/sandbox/contract";
import type { ExecAdapter } from "../../lib/sandbox/adapter";
import { CLAUDE_EXEC_ADAPTER } from "../../lib/claude/exec-adapter";
import { CODEX_EXEC_ADAPTER } from "../../lib/codex/exec-adapter";

function makeFakeClient() {
  let createCount = 0;
  let closed = false;
  const client: SandboxClientPort = {
    async create(): Promise<SandboxSession> {
      createCount += 1;
      return {
        id: "fake",
        worktreePath: "/tmp/fake-nonexistent",
        branch: "agent/fake",
        async run(command: string) {
          return { stdout: `ran:${command}`, stderr: "", exitCode: 0 };
        },
      };
    },
    async close(): Promise<void> {
      closed = true;
    },
  };
  return { client, stats: () => ({ createCount, closed }) };
}

let TMP = "";
beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w3e3b-parity-"));
});
afterEach(() => {
  if (TMP) fs.rmSync(TMP, { recursive: true, force: true });
});

describe("executor pre-spawn parity gate", () => {
  test("blocks the spawn when a runtime diverges on a compared (semantic) field", async () => {
    // A buggy codex adapter that flips the mutation authorization decision.
    const divergentCodex: ExecAdapter = {
      ...CODEX_EXEC_ADAPTER,
      projectRuntimeDecision: ({ neutral }) => ({ ...neutral, runtime: "codex", decision: "allow" }),
    };

    const { client, stats } = makeFakeClient();
    const result = await runExecutor(
      { project: "/tmp/parity-never-touched", runtimeAdapter: "codex", steps: [] },
      { sandboxClient: client, adapters: { claude: CLAUDE_EXEC_ADAPTER, codex: divergentCodex } },
    );

    expect(result.status).toBe("PARITY_BLOCKED");
    expect(result.parity?.status).toBe("fail");
    expect(result.parity?.differences.map((d) => d.field)).toContain("decision");
    expect(result.worktreeDiscarded).toBe(false);
    // The sandbox was NEVER spawned.
    expect(stats().createCount).toBe(0);
  });

  test("conforming adapter family passes the gate and proceeds to spawn", async () => {
    const { client, stats } = makeFakeClient();
    const result = await runExecutor(
      { project: TMP, runtimeAdapter: "claude", steps: [] },
      { sandboxClient: client },
    );

    expect(result.status).not.toBe("PARITY_BLOCKED");
    expect(result.parity?.status).toBe("pass");
    expect(stats().createCount).toBe(1);
  });

  test("a step kind the chosen adapter cannot serve is a pre-spawn CAPABILITY_GAP", async () => {
    const shellOnlyCodex: ExecAdapter = {
      ...CODEX_EXEC_ADAPTER,
      supportedStepKinds: new Set<ExecStepKind>(["shell"]),
    };

    const { client, stats } = makeFakeClient();
    const result = await runExecutor(
      {
        project: "/tmp/parity-never-touched",
        runtimeAdapter: "codex",
        steps: [{ kind: "edit", proposedEdits: [{ kind: "object", rid: "r", properties: {} }] }],
      },
      { sandboxClient: client, adapters: { claude: CLAUDE_EXEC_ADAPTER, codex: shellOnlyCodex } },
    );

    expect(result.status).toBe("CAPABILITY_GAP");
    expect(result.unsupportedStepKinds).toEqual(["edit"]);
    expect(stats().createCount).toBe(0);
  });
});

describe("adapter ingress normalization", () => {
  test("codex maps exec_command/write_stdin → shell; apply_patch → null (out of v1)", () => {
    expect(CODEX_EXEC_ADAPTER.normalizeNativeStep?.("functions.exec_command", { command: "ls -la" })).toEqual([
      { kind: "shell", command: "ls -la" },
    ]);
    expect(CODEX_EXEC_ADAPTER.normalizeNativeStep?.("functions.write_stdin", { command: "cat" })).toEqual([
      { kind: "shell", command: "cat" },
    ]);
    expect(
      CODEX_EXEC_ADAPTER.normalizeNativeStep?.("apply_patch", { command: "*** Add File: a.ts\n+x" }),
    ).toBeNull();
  });

  test("claude maps Bash → shell", () => {
    expect(CLAUDE_EXEC_ADAPTER.normalizeNativeStep?.("Bash", { command: "echo hi" })).toEqual([
      { kind: "shell", command: "echo hi" },
    ]);
  });
});
