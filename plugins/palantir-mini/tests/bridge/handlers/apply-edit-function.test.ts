// palantir-mini — apply_edit_function MCP handler tests (v3.4.0 N4 wave 2)
// Coverage: arg validation, registered-function happy path, unknown-function path,
// edit_proposed event substrate (rule 10 5-dim envelope assertion).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import applyEditFunctionHandler from "../../../bridge/handlers/apply-edit-function";
import { registerEditFunction } from "../../../lib/actions/tier2-function";
import { readEvents } from "../../../lib/event-log/read";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-aef-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

const tmpRoots: string[] = [];

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  return root;
}

// Register a deterministic test edit function once per file load
registerEditFunction({
  name: "test_apply_edit_function_noop",
  apply: () => [],
});

registerEditFunction<{ ridLabel?: string }>({
  name: "test_apply_edit_function_one_edit",
  apply: (params) => [
    {
      kind: "create" as const,
      rid: `rid:test:${params?.ridLabel ?? "x"}` as any,
      payload: { label: params?.ridLabel ?? "x" },
    } as any,
  ],
});

describe("apply_edit_function handler", () => {
  test("throws when project missing", async () => {
    await expect(
      applyEditFunctionHandler({ functionName: "test_apply_edit_function_noop" }),
    ).rejects.toThrow(/project.*required/i);
  });

  test("throws when functionName missing", async () => {
    const root = setupRoot("missing-fn");
    await expect(
      applyEditFunctionHandler({ project: root }),
    ).rejects.toThrow(/functionName.*required/i);
  });

  test("throws when project is non-string", async () => {
    await expect(
      applyEditFunctionHandler({ project: 42, functionName: "test_apply_edit_function_noop" }),
    ).rejects.toThrow(/project.*required/i);
  });

  test("throws when functionName not registered", async () => {
    const root = setupRoot("unknown-fn");
    await expect(
      applyEditFunctionHandler({ project: root, functionName: "definitely_not_registered" }),
    ).rejects.toThrow(/not registered/);
  });

  test("returns empty edits for noop function + writes edit_proposed event", async () => {
    const root = setupRoot("noop-happy");
    const result = await applyEditFunctionHandler({
      project: root,
      functionName: "test_apply_edit_function_noop",
      params: {},
    });

    expect(result.functionName).toBe("test_apply_edit_function_noop");
    expect(result.edits).toEqual([]);
    expect(typeof result.editProposedSequence).toBe("number");
    expect(result.editProposedSequence).toBeGreaterThan(0);

    const events = readEvents(eventsPathFor(root));
    const proposed = events.filter((e) => e.type === "edit_proposed");
    expect(proposed.length).toBe(1);
    const evt = proposed[0]!;
    expect(evt.throughWhich.toolName).toBe("apply_edit_function");
    expect(evt.byWhom.identity).toBe("claude-code");
    expect((evt.payload as any).functionName).toBe("test_apply_edit_function_noop");
    expect((evt.payload as any).hypotheticalEdits).toEqual([]);
  });

  test("returns edits + records params for non-empty function", async () => {
    const root = setupRoot("one-edit");
    const result = await applyEditFunctionHandler({
      project: root,
      functionName: "test_apply_edit_function_one_edit",
      params: { ridLabel: "alpha" },
    });

    expect(result.edits.length).toBe(1);
    expect((result.edits[0] as any).rid).toBe("rid:test:alpha");

    const events = readEvents(eventsPathFor(root));
    const proposed = events.filter((e) => e.type === "edit_proposed");
    expect(proposed.length).toBe(1);
    const evt = proposed[0]!;
    expect((evt.payload as any).params).toEqual({ ridLabel: "alpha" });
    expect((evt.payload as any).hypotheticalEdits.length).toBe(1);
  });

  test("each invocation appends a new event (sequence increments)", async () => {
    const root = setupRoot("seq-increment");
    const r1 = await applyEditFunctionHandler({
      project: root,
      functionName: "test_apply_edit_function_noop",
      params: {},
    });
    const r2 = await applyEditFunctionHandler({
      project: root,
      functionName: "test_apply_edit_function_noop",
      params: { iteration: 2 },
    });

    expect(r2.editProposedSequence).toBeGreaterThan(r1.editProposedSequence);
    const events = readEvents(eventsPathFor(root));
    expect(events.filter((e) => e.type === "edit_proposed").length).toBe(2);
  });

  test("event envelope has 5-dim shape (rule 10)", async () => {
    const root = setupRoot("five-dim");
    await applyEditFunctionHandler({
      project: root,
      functionName: "test_apply_edit_function_noop",
      params: {},
    });
    const events = readEvents(eventsPathFor(root));
    const evt = events.filter((e) => e.type === "edit_proposed")[0]!;
    // when
    expect(typeof evt.when).toBe("string");
    expect(evt.when).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // atopWhich
    expect(typeof evt.atopWhich).toBe("string");
    // throughWhich
    expect(evt.throughWhich.toolName).toBe("apply_edit_function");
    expect(evt.throughWhich.cwd).toBe(root);
    // byWhom
    expect(evt.byWhom).toBeDefined();
    // payload (the "withWhat")
    expect(evt.payload).toBeDefined();
  });
});
