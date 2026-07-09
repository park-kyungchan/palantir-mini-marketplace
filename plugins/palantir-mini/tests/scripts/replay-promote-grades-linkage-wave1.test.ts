// palantir-mini — promotion-linkage wave 1 (class-A site audit) regression guard
//
// WHY THIS EXISTS: the class-A validation_phase_completed emit sites nominated for
// wave 1 (bridge/handlers/pm-semantic-intent-gate.ts, commit-edits.ts,
// pm-intent-router.ts) were audited against the engine's actual join key
// (scripts/replay-promote-grades.ts findT1ToT2Evidence / findT3ToT4Evidence:
// `sourceId = source.eventId`, the emitted-envelope id from scripts/log.ts
// `uniqueEventId()`, format `evt-<base36 ts>-<random>`). Every in-scope variable
// at those sites (contractId, semanticIntentContractRef, digitalTwinChangeContractRef,
// promptId, actionTypeRid, dryRunRef) is a DIFFERENT identifier class — a namespaced
// contract/prompt/record ref (e.g. `semantic-intent:<slug>`, `prompt-<session>-<time>-<seq>`,
// `<kind>/<sessionId>/<promptId>/<contractId>` composite refs) — never equal in format
// or value to any prior event's eventId. Stamping any of them into
// lineageRefs.actionRid would NEVER join under the engine's exact-match predicate, so
// wave 1 deferred all 21 nominated sites (see PR body / handoff for the full list)
// rather than stamp inert values.
//
// This file locks TWO things so a future correctly-threaded fix has a concrete target:
//   1. the EXACT shape a fixed class-A emitter must produce (validation_phase_completed +
//      lineageRefs.actionRid === the source event's real eventId) DOES promote T1→T2.
//   2. the shape the class-A sites produce TODAY (payload carries contractId/promptId/
//      etc. but no lineageRefs, no payload.sourceEventId) does NOT promote — i.e. the
//      starvation this wave set out to fix is still reproducible and asserted, not just
//      narrated.
//
// Authority: rule 26 §Substrate routing + rule 10 §append-only invariant; wave-1 handoff.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  replayPromoteGrades,
  eventsJsonlPath,
} from "../../scripts/replay-promote-grades";

// ─── Test utilities ──────────────────────────────────────────────────────────

let TMP: string;
let seq = 0;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-promote-linkage-wave1-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  seq = 0;
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
});

function eventsFile(): string {
  return eventsJsonlPath(TMP);
}

function writeEvent(ev: Record<string, unknown>): void {
  fs.appendFileSync(eventsFile(), JSON.stringify(ev) + "\n");
}

/** T1 source event standing in for the intent/gate decision a class-A site validates. */
function makeT1Source(eventId: string): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId,
    type: "phase_completed",
    when: new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T1",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "T1 source standing in for a gated intent decision", memoryLayers: ["working"] },
    payload: { phaseTag: "semantic-gate", taskId: "task-1" },
  };
}

/**
 * The shape a class-A emit site (e.g. pm-semantic-intent-gate.ts:2222) produces
 * TODAY: validation_phase_completed with contract/prompt refs in the payload but
 * NO lineageRefs and NO payload.sourceEventId — the wrong-identifier-class gap this
 * wave found. Never joins.
 */
function makeClassASiteCurrentShape(): Record<string, unknown> {
  return {
    sequence: seq++,
    eventId: "evt-classA-current",
    type: "validation_phase_completed",
    when: new Date().toISOString(),
    atopWhich: "abcdef0",
    valueGrade: "T2",
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "pm_semantic_intent_gate: status=contract_required allowsRouting=false", memoryLayers: ["semantic", "procedural"] },
    payload: {
      passed: false,
      errorClass: "contract_required",
      semanticIntentContractRef: "semantic-intent/s-1/prompt-s1-20260710-0/semantic-intent:test-intent",
      digitalTwinChangeContractRef: "digital-twin-change/s-1/prompt-s1-20260710-0/digital-twin-change:test-intent",
      promptId: "prompt-s1-20260710-0",
    },
    // Deliberately absent: lineageRefs, payload.sourceEventId.
  };
}

/**
 * The shape a CORRECTLY fixed class-A emitter would need to produce: identical
 * payload (except passed=true, matching a successful gate/attest outcome), PLUS
 * lineageRefs.actionRid threaded through to the real source eventId.
 */
function makeClassASiteFixedShape(sourceEventId: string): Record<string, unknown> {
  const base = makeClassASiteCurrentShape();
  const payload = { ...(base.payload as Record<string, unknown>), passed: true, errorClass: "semantic_intent_gate_completed" };
  return {
    ...base,
    eventId: "evt-classA-fixed",
    payload,
    lineageRefs: { actionRid: sourceEventId },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("promotion-linkage wave 1 — class-A site shape vs. engine join key", () => {
  test("a class-A emit site shaped WITH lineageRefs.actionRid joining the source eventId promotes T1->T2", async () => {
    const sourceId = "evt-source-fixed";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeClassASiteFixedShape(sourceId));

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(1);
    expect(result.promotedCount).toBeGreaterThan(0);
    expect(result.promotedEventIds).toContain(sourceId);
  });

  test("negative control: today's class-A shape (contractId/promptId in payload, no lineageRefs) promotes nothing", async () => {
    const sourceId = "evt-source-unfixed";
    writeEvent(makeT1Source(sourceId));
    writeEvent(makeClassASiteCurrentShape());

    const result = await replayPromoteGrades({ projectRoot: TMP, dryRun: true });

    expect(result.byTransition.t1ToT2).toBe(0);
    expect(result.promotedCount).toBe(0);
    expect(result.promotedEventIds).not.toContain(sourceId);
  });
});
