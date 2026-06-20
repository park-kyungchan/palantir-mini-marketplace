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
      actionTypeRid: "pm.actions.ontology.commitEdits",
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
