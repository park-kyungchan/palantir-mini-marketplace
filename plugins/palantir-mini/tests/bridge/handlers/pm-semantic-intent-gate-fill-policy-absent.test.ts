// Tests: fillPolicy absent → fdeFillResult undefined (a SIC policy never sets it).
// W3d-2b DEFAULT FLIP: an absent fillPolicy now routes to the 9-axis understand-heart
// (was legacy 8-turn). The before/after tests at the bottom assert this explicitly;
// legacy 8-turn stays reachable via explicit "default-8-turn".

import { afterEach, beforeEach, test, expect } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { semanticIntentGate } from "../../../bridge/handlers/pm-semantic-intent-gate";
import { draftSemanticIntentContract } from "../../../lib/lead-intent/contracts";

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
    // NO fillPolicy — W3d-2b: routes to the nine-axis default (this assertion is policy-agnostic)
  });

  // fdeFillResult must not be present when fillPolicy is absent
  expect((result as any).fdeFillResult).toBeUndefined();
  expect(Object.keys(result)).not.toContain("fdeFillResult");
});

test("fillPolicy absent, turn=0 → fillResult may be present (default path); fdeFillResult absent", async () => {
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

// ---------------------------------------------------------------------------
// W3d-2b DEFAULT FLIP — explicit before/after routing assertions.
// AFTER: absent fillPolicy now routes to the 9-axis understand-heart.
// BEFORE (still reachable): explicit "default-8-turn" routes to legacy 8-turn.
// The discriminator at turn=1: nine-axis fills axes.data; legacy fills affectedSurfaces.
// ---------------------------------------------------------------------------

test("W3d-2b: absent fillPolicy + turn=1 → 9-axis default (axes.data filled, not affectedSurfaces)", async () => {
  const project = makeTmpProject();
  const contract = draftSemanticIntentContract({ intent: "default-flip after-state" });

  const result = await semanticIntentGate({
    project,
    rawIntent: "default-flip after-state",
    turn: 1, // 9-axis T1 → axes.data
    // NO fillPolicy — flipped default is nine-axis
    semanticIntentContract: contract,
    turnUserInput: "Student, Grade",
  });

  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.contract.axes).toBeDefined();
  expect(result.fillResult!.contract.axes!.data.status).toBe("filled");
  // The legacy 8-turn T1 effect (appending turnUserInput to affectedSurfaces) must NOT happen.
  expect(result.fillResult!.contract.affectedSurfaces ?? []).not.toContain("Student, Grade");
});

test("W3d-2b: explicit default-8-turn + turn=1 → legacy 8-turn still reachable (affectedSurfaces, no axes)", async () => {
  const project = makeTmpProject();
  const contract = draftSemanticIntentContract({ intent: "default-flip before-state" });

  const result = await semanticIntentGate({
    project,
    rawIntent: "default-flip before-state",
    fillPolicy: "default-8-turn", // explicit legacy
    turn: 1, // legacy T1 → affectedSurfaces
    semanticIntentContract: contract,
    turnUserInput: "lib/semantic-intent/fill-sequence.ts",
  });

  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.contract.affectedSurfaces).toContain(
    "lib/semantic-intent/fill-sequence.ts",
  );
  // Legacy path never populates the 9-axis surface.
  expect(result.fillResult!.contract.axes).toBeUndefined();
});
