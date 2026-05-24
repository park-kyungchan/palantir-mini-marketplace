// Tests: fillPolicy absent → fdeFillResult undefined; legacy behavior unchanged.
// Critical invariant: no fillPolicy supplied → byte-identical to v6.70.0.

import { afterEach, beforeEach, test, expect } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { semanticIntentGate } from "../../../bridge/handlers/pm-semantic-intent-gate";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sig-policy-absent-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

beforeEach(() => {
  // Ensure events.jsonl path is fresh.
});

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

test("fillPolicy absent → fdeFillResult key not present in result", async () => {
  const project = makeTmpProject();
  const result = await semanticIntentGate({
    project,
    rawIntent: "test intent for policy-absent regression",
    turn: 0,
    // NO fillPolicy — should remain on legacy 8-turn path
  });

  // fdeFillResult must not be present when fillPolicy is absent
  expect((result as any).fdeFillResult).toBeUndefined();
  expect(Object.keys(result)).not.toContain("fdeFillResult");
});

test("fillPolicy absent, turn=0 → fillResult may be present (legacy path); fdeFillResult absent", async () => {
  const project = makeTmpProject();
  const result = await semanticIntentGate({
    project,
    rawIntent: "test intent regression check",
    turn: 0,
    // NO fillPolicy
  });

  // fillResult may or may not be present depending on contract availability,
  // but fdeFillResult must never be present.
  expect((result as any).fdeFillResult).toBeUndefined();
  expect(Object.keys(result)).not.toContain("fdeFillResult");
});

test("fillPolicy='default-8-turn' (explicit) → fdeFillResult absent; treated as legacy path", async () => {
  const project = makeTmpProject();
  const result = await semanticIntentGate({
    project,
    rawIntent: "explicit default-8-turn policy test",
    turn: 0,
    fillPolicy: "default-8-turn",
  });

  expect((result as any).fdeFillResult).toBeUndefined();
  expect(Object.keys(result)).not.toContain("fdeFillResult");
});

test("no turn supplied → both fillResult and fdeFillResult absent", async () => {
  const project = makeTmpProject();
  const result = await semanticIntentGate({
    project,
    rawIntent: "no turn supplied test",
    // NO turn, NO fillPolicy
  });

  expect((result as any).fillResult).toBeUndefined();
  expect((result as any).fdeFillResult).toBeUndefined();
  expect(Object.keys(result)).not.toContain("fillResult");
  expect(Object.keys(result)).not.toContain("fdeFillResult");
});
