/**
 * W3e-3b — Executor write-path invariant.
 *
 * The structural guarantee: the Executor can persist the ontology ONLY through
 * commitEdits. A failed submission criterion ⇒ REJECTED ⇒ the proposed edits are
 * never persisted, the project SOURCE is byte-identical, commitEdits is the sole
 * persist call, and the worktree is discarded (cattle, not pets).
 */
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runExecutor, EXECUTOR_ACTION_TYPE_RID } from "../../lib/sandbox/executor";
import { EXECUTOR_EDIT_FUNCTION_NAME, applyEditSteps } from "../../lib/sandbox/edit-functions";
import { EXEC_STEP_KINDS } from "../../lib/sandbox/contract";
import type {
  ExecRequest,
  SandboxClientPort,
  SandboxSession,
} from "../../lib/sandbox/contract";
import type { OntologyEdit } from "../../lib/event-log/types";
import { commitEdits } from "../../lib/actions/commit";
import { applyEditFunction, listEditFunctions } from "../../lib/actions/tier2-function";
import {
  EXECUTOR_ACTION_TYPE,
  EXECUTOR_ACTION_TYPE_RID as SNAPSHOT_RID,
} from "#schemas/ontology/self/executor.actiontype";

function makeFakeClient() {
  let createCount = 0;
  let closed = false;
  const runCommands: string[] = [];
  const client: SandboxClientPort = {
    async create(): Promise<SandboxSession> {
      createCount += 1;
      return {
        id: "fake-session",
        worktreePath: "/tmp/fake-worktree-nonexistent",
        branch: "agent/fake",
        async run(command: string) {
          runCommands.push(command);
          return { stdout: `ran:${command}`, stderr: "", exitCode: 0 };
        },
      };
    },
    async close(): Promise<void> {
      closed = true;
    },
  };
  return { client, stats: () => ({ createCount, closed, runCommands }) };
}

let TMP = "";
const SRC_REL = path.join("ontology", "foo.txt");
const SRC_CONTENT = "original-content\n";

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w3e3b-exec-"));
  fs.mkdirSync(path.join(TMP, "ontology"), { recursive: true });
  fs.writeFileSync(path.join(TMP, SRC_REL), SRC_CONTENT);
});

afterEach(() => {
  if (TMP) fs.rmSync(TMP, { recursive: true, force: true });
});

function eventLines(): Array<{ type: string; [k: string]: unknown }> {
  const p = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { type: string });
}

describe("executor write-path", () => {
  test("failed submission criterion ⇒ REJECTED, source byte-identical, commitEdits sole persist, worktree discarded", async () => {
    const srcBefore = fs.readFileSync(path.join(TMP, SRC_REL));

    let commitCalls = 0;
    const commitSpy: typeof commitEdits = async (req) => {
      commitCalls += 1;
      return commitEdits(req);
    };

    const request: ExecRequest = {
      project: TMP,
      runtimeAdapter: "claude",
      steps: [
        { kind: "shell", command: "echo hi" },
        { kind: "edit", proposedEdits: [{ kind: "object", rid: "obj-1", properties: { name: "x" } }] },
      ],
      submissionCriteria: [{ type: "Unevaluable", name: "force-reject", reason: "test forces reject" }],
    };

    const { client, stats } = makeFakeClient();
    const result = await runExecutor(request, { sandboxClient: client, commit: commitSpy });

    // Verdict + discard.
    expect(result.status).toBe("REJECTED");
    expect(result.committed).toBe(false);
    expect(result.worktreeDiscarded).toBe(true);
    expect(stats().closed).toBe(true);
    expect(stats().createCount).toBe(1);
    expect(stats().runCommands).toEqual(["echo hi"]);
    expect(result.shellResults).toHaveLength(1);
    expect(result.shellResults[0]?.exitCode).toBe(0);

    // commitEdits is the ONLY persist path — called exactly once.
    expect(commitCalls).toBe(1);

    // Project SOURCE byte-identical (no fs.write* of edits).
    expect(fs.readFileSync(path.join(TMP, SRC_REL)).equals(srcBefore)).toBe(true);

    // The only persisted event is the rejection — edits NEVER persisted.
    const events = eventLines();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("submission_criteria_failed");
    expect(events.some((e) => e.type === "edit_committed")).toBe(false);
  });

  test("passing criteria ⇒ COMMITTED via commitEdits (edits persist as the edit_committed event, not files)", async () => {
    let commitCalls = 0;
    const commitSpy: typeof commitEdits = async (req) => {
      commitCalls += 1;
      return commitEdits(req);
    };
    const srcBefore = fs.readFileSync(path.join(TMP, SRC_REL));

    const request: ExecRequest = {
      project: TMP,
      runtimeAdapter: "codex",
      steps: [{ kind: "edit", proposedEdits: [{ kind: "object", rid: "obj-2", properties: { n: 1 } }] }],
    };

    const { client, stats } = makeFakeClient();
    const result = await runExecutor(request, { sandboxClient: client, commit: commitSpy });

    expect(result.status).toBe("COMMITTED");
    expect(result.committed).toBe(true);
    expect(result.worktreeDiscarded).toBe(true);
    expect(stats().closed).toBe(true);
    expect(commitCalls).toBe(1);
    expect(fs.readFileSync(path.join(TMP, SRC_REL)).equals(srcBefore)).toBe(true);

    const events = eventLines();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("edit_committed");
  });
});

describe("executor self-model reconciliation", () => {
  test("runtime constants match the W3e-3a self-model Executor ActionType", () => {
    expect(EXECUTOR_EDIT_FUNCTION_NAME).toBe(EXECUTOR_ACTION_TYPE.editFunctionName);
    expect(EXECUTOR_ACTION_TYPE_RID).toBe(SNAPSHOT_RID as string);
    expect(listEditFunctions()).toContain(EXECUTOR_EDIT_FUNCTION_NAME);

    // The self-model's stepKind param type is single-sourced from its EXEC_STEP_KINDS;
    // the lib's EXEC_STEP_KINDS must reproduce that exact literal union.
    const stepKindParam = EXECUTOR_ACTION_TYPE.parameters?.find((p) => p.name === "stepKind");
    expect(stepKindParam?.type).toBe(EXEC_STEP_KINDS.map((k) => `"${k}"`).join(" | "));

    const adapterParam = EXECUTOR_ACTION_TYPE.parameters?.find((p) => p.name === "runtimeAdapter");
    expect(adapterParam?.required).toBe(true);
  });

  test("applyEditSteps is pure (validates + returns; never commits)", async () => {
    const good: OntologyEdit[] = [{ kind: "object", rid: "r", properties: {} }];
    expect(applyEditSteps({ proposedEdits: good })).toHaveLength(1);

    const viaRegistry = await applyEditFunction(EXECUTOR_EDIT_FUNCTION_NAME, { proposedEdits: good });
    expect(viaRegistry.edits).toHaveLength(1);

    const badEdit = { kind: "bogus", rid: "x" } as unknown as OntologyEdit;
    expect(() => applyEditSteps({ proposedEdits: [badEdit] })).toThrow();
  });
});
