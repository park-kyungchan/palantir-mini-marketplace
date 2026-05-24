// palantir-mini v3.7.0 — pre-edit-ontology lineage sibling (A.4 split)
// Coverage: 5-event lineage injection into additionalContext, filter behavior.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import preEditOntology from "../../hooks/pre-edit-ontology";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-peol-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv["PALANTIR_MINI_PROJECT"]     = process.env["PALANTIR_MINI_PROJECT"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  process.env["PALANTIR_MINI_PROJECT"]     = root;
  process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);
  return root;
}

function seedEdgeEvent(root: string, sequence: number, type: string): void {
  const evt = {
    sequence,
    eventId: `evt-test-${sequence}`,
    type,
    payload: type === "edit_committed"
      ? { actionTypeRid: "X", appliedEdits: [], submissionCriteriaPassed: [] }
      : { functionName: "PreToolUse:Edit", params: {}, hypotheticalEdits: [] },
    when: `2026-04-26T00:00:0${sequence}.000Z`,
    atopWhich: "deadbeef",
    throughWhich: { sessionId: "test", toolName: "Edit", cwd: root },
    byWhom: { identity: "claude-code", agentName: "claude-code" },
    withWhat: { reasoning: "seed" },
  };
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, "events.jsonl"), JSON.stringify(evt) + "\n", "utf8");
}

describe("pre-edit-ontology lineage", () => {
  test("non-ontology file with prior lineage events → additionalContext rendered", async () => {
    const root = setupRoot("non-onto-w-lineage");
    seedEdgeEvent(root, 1, "edit_committed");
    seedEdgeEvent(root, 2, "drift_detected");
    const out = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/repo/foo.md" },
      cwd: root,
    });
    expect(out.hookSpecificOutput.additionalContext).toContain("palantir-mini lineage");
    expect(out.hookSpecificOutput.additionalContext).toContain("[seq=1]");
    expect(out.hookSpecificOutput.additionalContext).toContain("[seq=2]");
  });

  test("lineage limited to 5 entries (replay returns first 5 in append order)", async () => {
    const root = setupRoot("lineage-limit");
    for (let i = 1; i <= 8; i++) seedEdgeEvent(root, i, "edit_committed");
    const out = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/repo/note.txt" },
      cwd: root,
    });
    const ctx = out.hookSpecificOutput.additionalContext ?? "";
    const seqLines = ctx.split("\n").filter((l) => l.includes("[seq="));
    expect(seqLines.length).toBe(5);
    expect(ctx).toContain("[seq=1]");
    expect(ctx).toContain("[seq=5]");
    expect(ctx).not.toContain("[seq=6]");
  });

  test("non-edit_proposed/committed/drift_detected events filtered out of lineage", async () => {
    const root = setupRoot("filtered");
    const dir = path.join(root, ".palantir-mini", "session");
    fs.mkdirSync(dir, { recursive: true });
    const otherEvent = {
      sequence: 1,
      eventId: "evt-other",
      type: "session_started",
      payload: {},
      when: "2026-04-26T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "test", toolName: "Init", cwd: root },
      byWhom: { identity: "claude-code" },
    };
    fs.writeFileSync(path.join(dir, "events.jsonl"), JSON.stringify(otherEvent) + "\n", "utf8");
    const out = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/repo/foo.md" },
      cwd: root,
    });
    expect(out.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  test("permissionDecisionReason text varies by classification", async () => {
    const root = setupRoot("reason-text");
    const ontoOut = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/x/ontology/y.ts" },
      cwd: root,
    });
    const nonOntoOut = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/x/README.md" },
      cwd: root,
    });
    expect(ontoOut.hookSpecificOutput.permissionDecisionReason).toContain("recorded");
    expect(nonOntoOut.hookSpecificOutput.permissionDecisionReason).toContain("non-ontology");
  });
});
