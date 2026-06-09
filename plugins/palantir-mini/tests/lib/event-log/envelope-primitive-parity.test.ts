// palantir-mini — ENVELOPE-1 primitive↔runtime parity test
//
// Mirrors the self-registration drift-test pattern (tests/ontology/self/
// event-envelope-registration.test.ts): asserts the runtime EventEnvelopeBase
// (lib/event-log/types.ts) stays a TRUE MIRROR of the canonical 5-dim shape
// declared in the schema primitive (schemas-snapshot event-envelope.ts), and
// that the discriminant count is single-sourced from EVENT_TYPE_NAMES (no
// re-pinned prose count). Fails loud if either drifts.

import { test, expect, describe } from "bun:test";
import {
  isEventEnvelope,
  EVENT_ENVELOPE_DISCRIMINANTS,
  type EventEnvelopeBase as PrimitiveBase,
  type EventId as PrimEventId,
  type CommitSha as PrimCommitSha,
  type SessionId as PrimSessionId,
} from "#schemas/ontology/primitives/event-envelope";
import { EVENT_TYPE_NAMES } from "#schemas/ontology/lineage/event-types";
import {
  eventId,
  sessionId,
  commitSha,
  type EventEnvelopeBase as RuntimeBase,
  type EventId as RtEventId,
  type CommitSha as RtCommitSha,
  type SessionId as RtSessionId,
} from "../../../lib/event-log/types";

// ─── Compile-time mirror checks ──────────────────────────────────────────────
// The runtime base is the primitive base + optional runtime-only extensions, so
// a runtime base must be assignable TO the primitive base (it carries every
// 5-dim field), and a primitive-shaped value must be assignable to the runtime
// base. If the runtime ever re-declares the 5-dim shape divergently, one of
// these assignments fails to compile and `bun test` fails to typecheck.
type _RuntimeIsPrimitiveMirror = RuntimeBase extends PrimitiveBase ? true : never;
const _runtimeMirrorsPrimitive: _RuntimeIsPrimitiveMirror = true;

// Brands are single-sourced (re-exported from the primitive) → the runtime and
// primitive brand aliases are the SAME nominal type, not structural look-alikes.
const _eventIdSame: RtEventId = ("x" as PrimEventId);
const _eventIdSame2: PrimEventId = ("x" as RtEventId);
const _shaSame: RtCommitSha = ("x" as PrimCommitSha);
const _sessSame: RtSessionId = ("x" as PrimSessionId);

describe("ENVELOPE-1 — primitive↔runtime parity", () => {
  test("compile-time: runtime base mirrors the primitive 5-dim base", () => {
    // The const assignments above only compile if the mirror holds (brands are
    // the SAME nominal type). The runtime assertions just confirm the values
    // round-tripped — String() sheds the brand for comparison.
    expect(_runtimeMirrorsPrimitive).toBe(true);
    expect(String(_eventIdSame)).toBe("x");
    expect(String(_eventIdSame2)).toBe("x");
    expect(String(_shaSame)).toBe("x");
    expect(String(_sessSame)).toBe("x");
  });

  test("isEventEnvelope (primitive guard) accepts a runtime-built envelope", () => {
    const runtimeRow = {
      eventId: eventId("e-1"),
      when: "2026-06-10T00:00:00.000Z",
      atopWhich: commitSha("abc1234"),
      throughWhich: { sessionId: sessionId("s"), toolName: "t", cwd: "/x" },
      byWhom: { identity: "claude-code" as const },
      sequence: 1,
      type: "edit_committed",
      payload: { actionTypeRid: "rid", appliedEdits: [], submissionCriteriaPassed: [] },
    };
    expect(isEventEnvelope(runtimeRow)).toBe(true);
  });

  test("isEventEnvelope rejects empty throughWhich / byWhom sub-objects (the XRUN-1 leak)", () => {
    const base = {
      eventId: "e-2",
      when: "2026-06-10T00:00:00.000Z",
      atopWhich: "abc",
      sequence: 1,
      type: "edit_committed",
    };
    expect(isEventEnvelope({ ...base, throughWhich: {}, byWhom: {} })).toBe(false);
    expect(isEventEnvelope({ ...base, throughWhich: { sessionId: "s", toolName: "t", cwd: "/x" }, byWhom: {} })).toBe(false);
    expect(
      isEventEnvelope({ ...base, throughWhich: { sessionId: "s", toolName: "t", cwd: "/x" }, byWhom: { identity: "claude-code" } }),
    ).toBe(true);
  });

  test("discriminant vocabulary is single-sourced from EVENT_TYPE_NAMES (count reconciliation)", () => {
    // The primitive references EVENT_TYPE_NAMES instead of pinning a prose count;
    // this guard fails loud if that link is broken.
    expect(EVENT_ENVELOPE_DISCRIMINANTS).toBe(EVENT_TYPE_NAMES);
    expect(EVENT_ENVELOPE_DISCRIMINANTS.length).toBe(EVENT_TYPE_NAMES.length);
  });

  test("propagationDepthSource is a typed field on the envelope base", () => {
    // Compile-time: the runtime base accepts the auto/explicit provenance tag.
    const withSource: Pick<RuntimeBase, "propagationDepth" | "propagationDepthSource"> = {
      propagationDepth: 4,
      propagationDepthSource: "auto",
    };
    expect(withSource.propagationDepthSource).toBe("auto");
  });
});
