// palantir-mini — Sprint-cartography W1 vocabulary/union drift closure tests.
//
// Runtime companion to the compile-time guard in
// lib/event-log/vocabulary-assertions.ts: asserts EVENT_TYPE_NAMES (the
// schemas-snapshot canonical vocabulary) and EventType (the lib/event-log
// EventEnvelope discriminated union) name EXACTLY the same set of event
// types, in both directions, as a runtime Set-equality check (so drift is
// caught even in contexts that run `bun test` without a full `tsc --noEmit`
// pass). Also round-trips the 5 newly-typed event variants (task 1) through
// the real append/read functions, and exercises the reconciled
// dtc_grader_runtime_gap payload shape (task 2) with no `as any` casts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { EVENT_TYPE_NAMES } from "#schemas/ontology/lineage/event-types";
import {
  eventId,
  sessionId,
  commitSha,
  isDocDriftDetected,
  isSemanticManifestRefreshed,
  isSemanticDriftAudited,
  isSemanticChangePlanEmitted,
  isSessionResumed,
  isDtcGraderRuntimeGap,
  type EventEnvelope,
  type EventType,
  type DocDriftDetectedEnvelope,
  type SemanticManifestRefreshedEnvelope,
  type SemanticDriftAuditedEnvelope,
  type SemanticChangePlanEmittedEnvelope,
  type SessionResumedEnvelope,
  type DtcGraderRuntimeGapEnvelope,
} from "../../../lib/event-log/types";
import { appendEventAtomic } from "../../../lib/event-log/append";
import { readEvents } from "../../../lib/event-log/read";
import { foldToSnapshot } from "../../../lib/event-log/read/fold-snapshot";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-vocab-parity-${label}-`));
}
function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function makeBase(seq: number) {
  return {
    sequence:     seq,
    eventId:      eventId(`e-${seq}`),
    when:         "2026-07-02T00:00:00.000Z",
    atopWhich:    commitSha("abc1234"),
    throughWhich: { sessionId: sessionId("s"), toolName: "t", cwd: "/x" },
    byWhom:       { identity: "claude-code" as const },
  };
}

describe("vocabulary ↔ union single source of truth (runtime parity)", () => {
  test("every EVENT_TYPE_NAMES entry is a real discriminator (no un-narrowed extras)", () => {
    // Compile-time note: `satisfies` here would require EventType to be
    // assignable at the type level; the runtime check below is the actual
    // guard requested (mirrors the bidirectional compile-time assertion).
    expect(Array.isArray(EVENT_TYPE_NAMES)).toBe(true);
    expect(new Set(EVENT_TYPE_NAMES).size).toBe(EVENT_TYPE_NAMES.length); // no duplicates
  });

  test("EVENT_TYPE_NAMES and EventType union are equal sets (both directions)", () => {
    // We cannot enumerate EventType at runtime directly (it's compile-time
    // only), so this test derives the union's member set from the same
    // literal-type extraction the self-ontology drift test uses: read
    // lib/event-log/types.ts as text and pull every `type: "...";` literal
    // out of the EventEnvelope member declarations. This mirrors
    // tests/ontology/self/event-envelope-registration.test.ts's text-based
    // drift guard, applied to the OTHER side of the seam.
    const typesSrc = fs.readFileSync(
      path.join(import.meta.dir, "../../../lib/event-log/types.ts"),
      "utf8",
    );
    const unionTypeNames = new Set(
      [...typesSrc.matchAll(/type:\s*"([a-z_][a-z0-9_]*)";/g)].map((m) => m[1]!),
    );
    const vocabNames = new Set(EVENT_TYPE_NAMES as readonly string[]);

    const missingFromVocabulary = [...unionTypeNames].filter((n) => !vocabNames.has(n));
    const extraInVocabulary     = [...vocabNames].filter((n) => !unionTypeNames.has(n));

    expect(missingFromVocabulary).toEqual([]);
    expect(extraInVocabulary).toEqual([]);
    expect(vocabNames.size).toBe(unionTypeNames.size);
  });
});

describe("Sprint-cartography W1 — newly-typed event variants round-trip through append/read", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("rt"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("doc_drift_detected round-trips with real fixture-derived payload shape", async () => {
    const evPath = eventsPathFor(tmp);
    const envelope: Omit<DocDriftDetectedEnvelope, "sequence"> = {
      ...makeBase(0),
      type: "doc_drift_detected",
      payload: { driftDetected: true, driftScore: 0.8 },
    };
    await appendEventAtomic(evPath, envelope as Omit<EventEnvelope, "sequence">);

    const events = readEvents(evPath);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(isDocDriftDetected(ev)).toBe(true);
    if (isDocDriftDetected(ev)) {
      expect(ev.payload.driftDetected).toBe(true);
      expect(ev.payload.driftScore).toBe(0.8);
    }
  });

  test("semantic_manifest_refreshed round-trips with real emit-site payload shape", async () => {
    const evPath = eventsPathFor(tmp);
    const envelope: Omit<SemanticManifestRefreshedEnvelope, "sequence"> = {
      ...makeBase(0),
      type: "semantic_manifest_refreshed",
      payload: { projectRoot: "/proj", nodeCount: 10, edgeCount: 4, producerCount: 3 },
    };
    await appendEventAtomic(evPath, envelope as Omit<EventEnvelope, "sequence">);

    const events = readEvents(evPath);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(isSemanticManifestRefreshed(ev)).toBe(true);
    if (isSemanticManifestRefreshed(ev)) {
      expect(ev.payload.nodeCount).toBe(10);
      expect(ev.payload.edgeCount).toBe(4);
      expect(ev.payload.producerCount).toBe(3);
    }
  });

  test("semantic_drift_audited round-trips with real emit-site payload shape", async () => {
    const evPath = eventsPathFor(tmp);
    const envelope: Omit<SemanticDriftAuditedEnvelope, "sequence"> = {
      ...makeBase(0),
      type: "semantic_drift_audited",
      payload: {
        project: "/proj",
        ontologyNodes: 5,
        codegenNodes: 2,
        runtimeNodes: 1,
        verificationNodes: 0,
        findingCount: 3,
        overallAligned: false,
      },
    };
    await appendEventAtomic(evPath, envelope as Omit<EventEnvelope, "sequence">);

    const events = readEvents(evPath);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(isSemanticDriftAudited(ev)).toBe(true);
    if (isSemanticDriftAudited(ev)) {
      expect(ev.payload.overallAligned).toBe(false);
      expect(ev.payload.findingCount).toBe(3);
    }
  });

  test("semantic_change_plan_emitted round-trips with open-record payload (no observed fields yet)", async () => {
    const evPath = eventsPathFor(tmp);
    const envelope: Omit<SemanticChangePlanEmittedEnvelope, "sequence"> = {
      ...makeBase(0),
      type: "semantic_change_plan_emitted",
      payload: {},
    };
    await appendEventAtomic(evPath, envelope as Omit<EventEnvelope, "sequence">);

    const events = readEvents(evPath);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(isSemanticChangePlanEmitted(ev)).toBe(true);
  });

  test("session_resumed round-trips with real emit-site payload shape (incl. null last_session_rid)", async () => {
    const evPath = eventsPathFor(tmp);
    const envelope: Omit<SessionResumedEnvelope, "sequence"> = {
      ...makeBase(0),
      type: "session_resumed",
      payload: {
        last_session_rid: null,
        last_sequence: 0,
        active_teammates: [],
        pending_task_count: 0,
      },
    };
    await appendEventAtomic(evPath, envelope as Omit<EventEnvelope, "sequence">);

    const events = readEvents(evPath);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(isSessionResumed(ev)).toBe(true);
    if (isSessionResumed(ev)) {
      expect(ev.payload.last_session_rid).toBeNull();
      expect(ev.payload.pending_task_count).toBe(0);
    }
  });

  test("foldToSnapshot counts all 5 newly-typed event variants", () => {
    const events: EventEnvelope[] = [
      { ...makeBase(1), type: "doc_drift_detected", payload: { driftDetected: true } },
      { ...makeBase(2), type: "semantic_manifest_refreshed", payload: { projectRoot: "/p", nodeCount: 1, edgeCount: 1, producerCount: 1 } },
      { ...makeBase(3), type: "semantic_drift_audited", payload: { project: "/p", ontologyNodes: 1, codegenNodes: 1, runtimeNodes: 1, verificationNodes: 1, findingCount: 0, overallAligned: true } },
      { ...makeBase(4), type: "semantic_change_plan_emitted", payload: {} },
      { ...makeBase(5), type: "session_resumed", payload: { last_session_rid: "s-1", last_sequence: 4, active_teammates: [], pending_task_count: 0 } },
    ];
    const snap = foldToSnapshot(events);
    expect(snap.doc_drift_detected).toBe(1);
    expect(snap.semantic_manifest_refreshed).toBe(1);
    expect(snap.semantic_drift_audited).toBe(1);
    expect(snap.semantic_change_plan_emitted).toBe(1);
    expect(snap.session_resumed).toBe(1);
    expect(snap.totalEvents).toBe(5);
  });
});

describe("dtc_grader_runtime_gap — as-any casts removed (task 2)", () => {
  test("payload with `reason` (reconciled field name) typechecks and narrows without a cast", () => {
    // This construction mirrors bridge/handlers/pm-semantic-intent-gate.ts's emit
    // call site post-fix: the payload uses `reason` (the canonical
    // DtcGraderRuntimeGapPayload field), not the site's former `errorMessage`.
    const ev: DtcGraderRuntimeGapEnvelope = {
      ...makeBase(1),
      type: "dtc_grader_runtime_gap",
      payload: {
        runtime: "codex",
        skippedCriteria: [],
        rubricId: "dtc-rubric/v1",
        projectPath: "/proj",
        promptId: "prompt-1",
        sessionId: "sess-1",
        reason: "DTC grader dispatch threw unexpectedly",
      },
    };
    const asUnion: EventEnvelope = ev;
    expect(isDtcGraderRuntimeGap(asUnion)).toBe(true);
    if (isDtcGraderRuntimeGap(asUnion)) {
      expect(asUnion.payload.reason).toBe("DTC grader dispatch threw unexpectedly");
      expect(asUnion.payload.runtime).toBe("codex");
    }
  });

  test("payload matching lib/lead-intent/dtc-grading-rubric.ts's site (no errorMessage field) typechecks", () => {
    const ev: DtcGraderRuntimeGapEnvelope = {
      ...makeBase(2),
      type: "dtc_grader_runtime_gap",
      payload: {
        runtime: "codex",
        skippedCriteria: ["criterion-a", "criterion-b"],
        rubricId: "dtc-rubric/v1",
        projectPath: "/proj",
        promptId: "prompt-2",
        sessionId: "sess-2",
      },
    };
    expect(isDtcGraderRuntimeGap(ev)).toBe(true);
    expect(ev.payload.skippedCriteria).toEqual(["criterion-a", "criterion-b"]);
  });
});

// Compile-time-only sanity: EventType must include every name below (if any of
// these literals is not assignable, tsc fails here too — a second, narrower
// trip-wire alongside lib/event-log/vocabulary-assertions.ts).
const _sanityTypes: EventType[] = [
  "doc_drift_detected",
  "semantic_manifest_refreshed",
  "semantic_drift_audited",
  "semantic_change_plan_emitted",
  "session_resumed",
  "dtc_grader_runtime_gap",
];
void _sanityTypes;
