// palantir-mini v3.7.0 — pre-edit-ontology classification tests (main)
// Coverage: ontology-vs-non-ontology routing + edit_proposed event emission + malformed-payload handling.
// Decomposed in v3.7.0 A.4: lineage describe → -lineage.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import preEditOntology from "../../hooks/pre-edit-ontology";
import { readEvents } from "../../lib/event-log/read";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-peo-${label}-`));
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

describe("pre-edit-ontology classification", () => {
  test("non-ontology file → allow + no event + no additionalContext", async () => {
    const root = setupRoot("non-onto");
    const out = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/repo/README.md" },
      cwd: root,
    });
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain("non-ontology");
    expect(out.hookSpecificOutput.additionalContext).toBeUndefined();
    expect(fs.existsSync(eventsPathFor(root))).toBe(false);
  });

  test("schemas/ontology/ file → allow + edit_proposed event + lineage", async () => {
    const root = setupRoot("onto-schemas");
    const out = await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/home/user/.claude/schemas/ontology/primitives/foo.ts" },
      cwd: root,
    });
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain("recorded");
    const events = readEvents(eventsPathFor(root));
    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe("edit_proposed");
    expect(out.hookSpecificOutput.additionalContext).toContain("palantir-mini lineage");
  });

  test("project ontology/*.ts → allow + edit_proposed event", async () => {
    const root = setupRoot("onto-project");
    await preEditOntology({
      tool_name: "Write",
      tool_input: { file_path: "/repo/projects/palantir-math/ontology/entities.ts" },
      cwd: root,
    });
    const events = readEvents(eventsPathFor(root));
    expect(events.length).toBe(1);
    expect(events[0]!.payload).toMatchObject({ functionName: "PreToolUse:Write" });
  });

  // bd-006 DROP: the 4 palantir-math-SPECIFIC descender/codegen layouts are NO
  // LONGER classified as ontology (they were math-KG-shaped bakes, not generic
  // project-ontology path-classes). pre-edit-ontology is OBSERVE-only, so the sole
  // effect is a missed audit event on those math-specific layouts — no block lost.
  test("generated registry → NON-ontology (dropped math-descender, no event)", async () => {
    const root = setupRoot("drop-gen");
    await preEditOntology({
      tool_name: "Write",
      tool_input: { file_path: "/proj/src/generated/learn-registry.generated.ts" },
      cwd: root,
    });
    expect(readEvents(eventsPathFor(root)).length).toBe(0);
  });

  test("convex/schema.ts → NON-ontology (dropped math-descender, no event)", async () => {
    const root = setupRoot("drop-convex");
    await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/proj/convex/schema.ts" },
      cwd: root,
    });
    expect(readEvents(eventsPathFor(root)).length).toBe(0);
  });

  test("problems seq-data.json → NON-ontology (dropped math-descender, no event)", async () => {
    const root = setupRoot("drop-problem");
    await preEditOntology({
      tool_name: "Edit",
      tool_input: { file_path: "/proj/problems/p001/seq-data.json" },
      cwd: root,
    });
    expect(readEvents(eventsPathFor(root)).length).toBe(0);
  });

  test("generic NON-math project ontology path-class → edit_proposed event (de-hardcode payoff)", async () => {
    const root = setupRoot("onto-acme");
    await preEditOntology({
      tool_name: "Write",
      tool_input: { file_path: "/repo/projects/acme-widgets/object-type/widget.ts" },
      cwd: root,
    });
    expect(readEvents(eventsPathFor(root)).length).toBe(1);
  });

  test("malformed payload (undefined) → graceful, allow, no event", async () => {
    const root = setupRoot("malformed");
    const out = await preEditOntology(undefined);
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain("non-ontology");
    expect(fs.existsSync(eventsPathFor(root))).toBe(false);
  });

  test("missing tool_input.file_path → non-ontology classification", async () => {
    const root = setupRoot("missing-fp");
    const out = await preEditOntology({
      tool_name: "Edit",
      tool_input: {},
      cwd: root,
    });
    expect(out.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(out.hookSpecificOutput.additionalContext).toBeUndefined();
  });
});
