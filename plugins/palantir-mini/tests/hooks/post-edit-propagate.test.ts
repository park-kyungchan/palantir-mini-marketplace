// palantir-mini v0 — post-edit-propagate hook tests (v3.3.0 N3 wave 1)
// Coverage: ontology-vs-non-ontology classification, drift_detected (stale_codegen)
// event emission, missing file_path graceful, malformed payload graceful, message contract.
//
// F1b — a schema-source FILE edit emits a drift signal (codegen potentially stale),
// NOT edit_committed (which is reserved to the governed commit path, ssot/palantir
// approval-and-lineage). These assertions track that retype.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import postEditPropagate from "../../hooks/post-edit-propagate";
import { readEvents } from "../../lib/event-log/read";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-pep-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

const ENV_KEYS = [
  "PALANTIR_MINI_PROJECT",
  "PALANTIR_MINI_EVENTS_FILE",
  "PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE",
  "PALANTIR_MINI_CODEGEN_DEBOUNCE_MS",
] as const;

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  // The drift-classification suite below isolates the (a) drift signal — codegen (c) is
  // exercised in its own describe block. Disable CodegenRun by default so these tests
  // assert exactly one event (the drift), not the drift + codegen_started/completed.
  process.env["PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE"] = "1";
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

describe("post-edit-propagate hook", () => {
  test("non-ontology file → no propagation, no event", async () => {
    const root = setupRoot("non-onto");
    const out = await postEditPropagate({
      tool_name: "Edit",
      tool_input: { file_path: "/repo/README.md" },
      cwd: root,
    });
    expect(out.message).toContain("non-ontology");
    expect(fs.existsSync(eventsPathFor(root))).toBe(false);
  });

  test("schemas/ontology/ file → drift_detected (stale_codegen) event emitted", async () => {
    const root = setupRoot("onto-schemas");
    const fp = "/home/x/.claude/schemas/ontology/primitives/foo.ts";
    const out = await postEditPropagate({
      tool_name: "Edit",
      tool_input: { file_path: fp },
      cwd: root,
    });
    expect(out.message).toContain("drift_detected");
    const events = readEvents(eventsPathFor(root));
    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe("drift_detected");
    expect(events[0]!.payload).toEqual({ driftType: "stale_codegen", affectedObjectType: fp });
  });

  test("project ontology/*.ts → drift_detected payload references file", async () => {
    const root = setupRoot("onto-project");
    const fp = "/repo/projects/palantir-math/ontology/entities.ts";
    await postEditPropagate({
      tool_name: "Write",
      tool_input: { file_path: fp },
      cwd: root,
    });
    const events = readEvents(eventsPathFor(root));
    const evt = events[0]!;
    expect(evt.type).toBe("drift_detected");
    expect(evt.payload).toEqual({ driftType: "stale_codegen", affectedObjectType: fp });
  });

  test("missing file_path → non-ontology classification", async () => {
    const root = setupRoot("missing-fp");
    const out = await postEditPropagate({
      tool_name: "Edit",
      tool_input: {},
      cwd: root,
    });
    expect(out.message).toContain("non-ontology");
    expect(fs.existsSync(eventsPathFor(root))).toBe(false);
  });

  test("malformed payload (undefined) → graceful, no event", async () => {
    const root = setupRoot("malformed");
    const out = await postEditPropagate(undefined);
    expect(out.message).toContain("non-ontology");
    expect(fs.existsSync(eventsPathFor(root))).toBe(false);
  });

  test("missing tool_input → non-ontology", async () => {
    const root = setupRoot("no-input");
    const out = await postEditPropagate({ tool_name: "Edit", cwd: root });
    expect(out.message).toContain("non-ontology");
  });

  test("MultiEdit ontology file → drift_detected referencing the edited file", async () => {
    const root = setupRoot("multiedit");
    const fp = "/x/ontology/types.ts";
    await postEditPropagate({
      tool_name: "MultiEdit",
      tool_input: { file_path: fp },
      cwd: root,
    });
    const events = readEvents(eventsPathFor(root));
    expect(events[0]!.type).toBe("drift_detected");
    expect(events[0]!.payload).toEqual({ driftType: "stale_codegen", affectedObjectType: fp });
  });

  test("non-ts ontology dir file → not classified (regex requires .ts)", async () => {
    const root = setupRoot("ontology-dir-md");
    const out = await postEditPropagate({
      tool_name: "Edit",
      tool_input: { file_path: "/repo/ontology/README.md" },
      cwd: root,
    });
    expect(out.message).toContain("non-ontology");
  });
});

// ── (b) Dedup stale_codegen drift per affected file ──────────────────────────
describe("post-edit-propagate — dedup stale_codegen (F1b follow-up)", () => {
  const fp = "/x/ontology/types.ts";
  const other = "/x/ontology/other.ts";

  function countStaleDrift(root: string, forPath: string): number {
    return readEvents(eventsPathFor(root)).filter(
      (e) =>
        e.type === "drift_detected" &&
        (e.payload as { driftType?: string; affectedObjectType?: string }).driftType === "stale_codegen" &&
        (e.payload as { affectedObjectType?: string }).affectedObjectType === forPath,
    ).length;
  }

  test("repeat edit of the SAME file while a drift is pending is deduped (no second drift row)", async () => {
    const root = setupRoot("dedup-same");
    // codegen stays disabled (beforeEach) so the drift stays pending-unresolved.
    const first = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    expect(first.message).toContain("drift_detected");
    expect(countStaleDrift(root, fp)).toBe(1);

    const second = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    expect(second.message).toContain("deduped");
    // No SECOND drift row for the same path — the lane stays clean.
    expect(countStaleDrift(root, fp)).toBe(1);
  });

  test("a DIFFERENT file is not deduped (dedup is per affected file)", async () => {
    const root = setupRoot("dedup-diff");
    await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    const out = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: other }, cwd: root });
    expect(out.message).toContain("drift_detected");
    expect(countStaleDrift(root, fp)).toBe(1);
    expect(countStaleDrift(root, other)).toBe(1);
  });
});

// ── (c) CodegenRun v1 ForwardProp (debounced) ────────────────────────────────
describe("post-edit-propagate — CodegenRun v1 ForwardProp (F1b follow-up)", () => {
  const fp = "/x/ontology/types.ts";

  function eventTypes(root: string): string[] {
    return readEvents(eventsPathFor(root)).map((e) => e.type);
  }

  test("a fresh drift triggers a REAL codegen pass (codegen_started + codegen_completed appended)", async () => {
    const root = setupRoot("codegen-run");
    delete process.env["PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE"]; // enable CodegenRun
    const out = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    expect(out.message).toContain("CodegenRun");
    const types = eventTypes(root);
    expect(types).toContain("drift_detected");
    expect(types).toContain("codegen_started");
    expect(types).toContain("codegen_completed");
  });

  test("codegen is DEBOUNCED — a second drift within the window does not re-run codegen", async () => {
    const root = setupRoot("codegen-debounce");
    delete process.env["PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE"];
    process.env["PALANTIR_MINI_CODEGEN_DEBOUNCE_MS"] = "600000"; // 10 min — guarantees in-window

    // Edit 1: fresh drift + codegen pass (resolves the drift via codegen_completed).
    const first = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    expect(first.message).toContain("CodegenRun");
    const started1 = eventTypes(root).filter((t) => t === "codegen_started").length;
    expect(started1).toBe(1);

    // Edit 2: the prior codegen_completed resolved the drift, so a fresh drift is emitted,
    // but codegen is DEBOUNCED (within window) → no SECOND codegen_started.
    const second = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    expect(second.message).toContain("debounced");
    const started2 = eventTypes(root).filter((t) => t === "codegen_started").length;
    expect(started2).toBe(1);
  });

  test("PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE=1 → drift only, no codegen", async () => {
    const root = setupRoot("codegen-disabled");
    process.env["PALANTIR_MINI_CODEGEN_ON_EDIT_DISABLE"] = "1";
    const out = await postEditPropagate({ tool_name: "Edit", tool_input: { file_path: fp }, cwd: root });
    expect(out.message).toContain("codegen disabled");
    const types = eventTypes(root);
    expect(types).toContain("drift_detected");
    expect(types).not.toContain("codegen_started");
  });
});
