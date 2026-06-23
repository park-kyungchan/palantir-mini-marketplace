// palantir-mini 7.22.2 — Part B: foldToSnapshot dedup-by-rid (latest-wins).
//
// PROVES the fold mirrors ontology-staleness.ts's byRid latest-wins:
//   (a) NO-OP on dup-free data — a single registration folds to identical bucket
//       contents AND identical first-appearance order (byte-identical), so the
//       published grammar counts are unchanged.
//   (b) a re-elevation (a SECOND edit_committed re-emitting an already-registered
//       rid) COLLAPSES to ONE entry (latest declaration wins) at the rid's
//       FIRST-seen position — preserving order of a dup-free prefix.

import { test, expect, describe } from "bun:test";
import { foldToSnapshot } from "../../lib/event-log/read/fold-snapshot";
import type { EventEnvelope, OntologyEdit } from "../../lib/event-log/types";

function objectEdit(rid: string, props: Record<string, unknown>): OntologyEdit {
  return { kind: "object", rid, properties: { primitiveKind: "ObjectType", ...props } } as OntologyEdit;
}

function commit(seq: number, atopWhich: string, edits: OntologyEdit[]): EventEnvelope {
  return {
    sequence: seq,
    type: "edit_committed",
    eventId: `c${seq}` as never,
    when: new Date().toISOString(),
    atopWhich: atopWhich as never,
    throughWhich: { sessionId: "s" as never, toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "test-agent" },
    payload: {
      // F1b — a REGISTERED built-in self-ontology verb so the fold's registration
      // guard materializes these edits (presence→registration upgrade).
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      appliedEdits: edits,
      submissionCriteriaPassed: ["ok"],
    },
  } as unknown as EventEnvelope;
}

describe("foldToSnapshot — dedup-by-rid latest-wins (Part B, 7.22.2)", () => {
  test("NO-OP on dup-free data: identical bucket contents AND first-appearance order", () => {
    const events = [
      commit(1, "sha-A", [
        objectEdit("rid.X", { plainName: "X" }),
        objectEdit("rid.Y", { plainName: "Y" }),
        objectEdit("rid.Z", { plainName: "Z" }),
      ]),
    ];
    const reg = foldToSnapshot(events).registeredPrimitives!;
    // Count unchanged (3) and ORDER preserved (first-seen: X, Y, Z).
    expect(reg.objectTypes.map((e) => e.rid)).toEqual(["rid.X", "rid.Y", "rid.Z"]);
    expect(reg.objectTypes.length).toBe(3);
  });

  test("a re-elevation COLLAPSES to one entry (latest declaration wins, first-seen position)", () => {
    const events = [
      commit(1, "sha-OLD", [
        objectEdit("rid.X", { plainName: "X", v: 1 }),
        objectEdit("rid.Y", { plainName: "Y" }),
      ]),
      // re-elevation of rid.X at a newer sha with an updated declaration field.
      commit(2, "sha-HEAD", [objectEdit("rid.X", { plainName: "X", v: 2 })]),
    ];
    const reg = foldToSnapshot(events).registeredPrimitives!;
    // rid.X appears exactly ONCE (no double-count) — grammar count is 2, not 3.
    expect(reg.objectTypes.length).toBe(2);
    expect(reg.objectTypes.filter((e) => e.rid === "rid.X").length).toBe(1);
    // First-appearance order preserved: X before Y.
    expect(reg.objectTypes.map((e) => e.rid)).toEqual(["rid.X", "rid.Y"]);
    // Latest declaration wins (v:2 from the re-elevation).
    const x = reg.objectTypes.find((e) => e.rid === "rid.X");
    expect(x?.declaration?.v).toBe(2);
  });

  test("F1b registration guard — edit_committed WITHOUT a registered actionTypeRid is NOT counted and NOT materialized", () => {
    const forged = {
      sequence: 1,
      type: "edit_committed",
      eventId: "forged-1" as never,
      when: new Date().toISOString(),
      atopWhich: "sha-X" as never,
      throughWhich: { sessionId: "s" as never, toolName: "test", cwd: "/tmp" },
      byWhom: { identity: "test-agent" },
      // No actionTypeRid in payload — provenance is absent.
      payload: {
        appliedEdits: [objectEdit("rid.forged", { plainName: "Forged" })],
        submissionCriteriaPassed: [],
      },
    } as unknown as EventEnvelope;
    const snap = foldToSnapshot([forged]);
    // F1b presence→registration upgrade: an unregistered-rid (here absent) commit row
    // is NOT counted in the banner total...
    expect(snap.edit_committed).toBe(0);
    // ...and its edits are NOT trusted into the registered grammar.
    expect(snap.registeredPrimitives!.objectTypes.length).toBe(0);
  });

  test("F1b registration guard — a non-empty but UNREGISTERED actionTypeRid is also rejected (presence is not enough)", () => {
    const unregistered = {
      sequence: 1,
      type: "edit_committed",
      eventId: "unreg-1" as never,
      when: new Date().toISOString(),
      atopWhich: "sha-X" as never,
      throughWhich: { sessionId: "s" as never, toolName: "test", cwd: "/tmp" },
      byWhom: { identity: "test-agent" },
      payload: {
        // Non-empty string that would PASS the old presence-only guard, but is not a
        // registered ActionType — the registration upgrade rejects it.
        actionTypeRid: "PostToolUse:Edit",
        appliedEdits: [objectEdit("rid.phantom", { plainName: "Phantom" })],
        submissionCriteriaPassed: [],
      },
    } as unknown as EventEnvelope;
    const snap = foldToSnapshot([unregistered]);
    expect(snap.edit_committed).toBe(0);
    expect(snap.registeredPrimitives!.objectTypes.length).toBe(0);
  });

  test("dedup keys by FULL rid, never by coarse kind (object-family kinds stay distinct)", () => {
    const events = [
      commit(1, "sha-A", [
        { kind: "object", rid: "rid.obj", properties: { primitiveKind: "ObjectType", plainName: "O" } } as OntologyEdit,
        { kind: "object", rid: "rid.act", properties: { primitiveKind: "ActionType", plainName: "A" } } as OntologyEdit,
        { kind: "object", rid: "rid.fn", properties: { primitiveKind: "Function", plainName: "F" } } as OntologyEdit,
      ]),
    ];
    const reg = foldToSnapshot(events).registeredPrimitives!;
    // Three distinct kind:"object" rids land in THREE different buckets — not collapsed.
    expect(reg.objectTypes.map((e) => e.rid)).toEqual(["rid.obj"]);
    expect(reg.actionTypes.map((e) => e.rid)).toEqual(["rid.act"]);
    expect(reg.functions.map((e) => e.rid)).toEqual(["rid.fn"]);
  });
});
