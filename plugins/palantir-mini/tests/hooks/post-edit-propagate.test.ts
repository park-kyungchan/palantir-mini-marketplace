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
