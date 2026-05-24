import { describe, it, expect } from "bun:test";
import {
  groupEventsByTarget,
  simulatorDomainGraderStub,
  dryRunRefSerialize,
  determineD2Path,
  type ValueGradedEvent,
} from "../../../lib/closed-loop/apply-refinement-target-helpers";

describe("groupEventsByTarget", () => {
  it("groups events by (kind, rid) tuple", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "validation_phase_completed", valueGrade: "T3",
        withWhat: { refinementTarget: { kind: "rule-12-fallback-chain", rid: "settings.json" } } },
      { eventId: "e2", sequence: 2, type: "validation_phase_completed", valueGrade: "T3",
        withWhat: { refinementTarget: { kind: "rule-12-fallback-chain", rid: "settings.json" } } },
      { eventId: "e3", sequence: 3, type: "validation_phase_completed", valueGrade: "T4",
        withWhat: { refinementTarget: { kind: "other", rid: "hook.ts" } } },
    ];
    const map = groupEventsByTarget(events);
    expect(map.size).toBe(2);
    expect(map.get("rule-12-fallback-chain::settings.json")?.length).toBe(2);
    expect(map.get("other::hook.ts")?.length).toBe(1);
  });

  it("excludes events without refinementTarget", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "validation_phase_completed", valueGrade: "T3" },
    ];
    expect(groupEventsByTarget(events).size).toBe(0);
  });

  it("excludes events with empty kind or rid", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "v", valueGrade: "T3",
        withWhat: { refinementTarget: { kind: "", rid: "foo" } } },
      { eventId: "e2", sequence: 2, type: "v", valueGrade: "T3",
        withWhat: { refinementTarget: { kind: "foo", rid: "" } } },
    ];
    expect(groupEventsByTarget(events).size).toBe(0);
  });

  it("returns empty map for empty input", () => {
    expect(groupEventsByTarget([]).size).toBe(0);
  });
});

describe("simulatorDomainGraderStub", () => {
  it("returns 0.5 above 0.3 threshold (sprint-062 W2 stub)", () => {
    const result = simulatorDomainGraderStub(
      { kind: "rule-12", rid: "settings.json" },
      [{ filePath: "/foo", newContent: "x", reason: "y" }],
    );
    expect(result.score).toBe(0.5);
    expect(result.reasoning).toContain("sprint-062");
    expect(result.reasoning).toContain("W6 C13");
  });

  it("includes refinementTarget in reasoning", () => {
    const result = simulatorDomainGraderStub(
      { kind: "hook-ts", rid: "pre-edit-impact.ts" },
      [],
    );
    expect(result.reasoning).toContain("hook-ts");
    expect(result.reasoning).toContain("pre-edit-impact.ts");
  });

  it("includes proposed edit count in reasoning", () => {
    const edits = [
      { filePath: "/a", newContent: "a", reason: "r1" },
      { filePath: "/b", newContent: "b", reason: "r2" },
    ];
    const result = simulatorDomainGraderStub({ kind: "k", rid: "r" }, edits);
    expect(result.reasoning).toContain("2 proposed edits");
  });

  it("score is always ≥ 0.3 threshold", () => {
    const result = simulatorDomainGraderStub({ kind: "k", rid: "r" }, []);
    expect(result.score).toBeGreaterThanOrEqual(0.3);
  });
});

describe("dryRunRefSerialize", () => {
  it("produces deterministic sha256 for same edits", () => {
    const edits = [{ filePath: "/a", newContent: "x", reason: "r" }];
    expect(dryRunRefSerialize(edits)).toBe(dryRunRefSerialize(edits));
  });

  it("different edits → different ref", () => {
    const r1 = dryRunRefSerialize([{ filePath: "/a", newContent: "x", reason: "r" }]);
    const r2 = dryRunRefSerialize([{ filePath: "/a", newContent: "y", reason: "r" }]);
    expect(r1).not.toBe(r2);
  });

  it("returns a 64-char hex string (sha256)", () => {
    const ref = dryRunRefSerialize([{ filePath: "/a", newContent: "x", reason: "r" }]);
    expect(ref).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different filePath → different ref", () => {
    const r1 = dryRunRefSerialize([{ filePath: "/a", newContent: "x", reason: "r" }]);
    const r2 = dryRunRefSerialize([{ filePath: "/b", newContent: "x", reason: "r" }]);
    expect(r1).not.toBe(r2);
  });
});

describe("determineD2Path", () => {
  it("≥2 distinct identities → canonical", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "v", valueGrade: "T3", byWhom: { identity: "claude-code" } },
      { eventId: "e2", sequence: 2, type: "v", valueGrade: "T3", byWhom: { identity: "codex-cli" } },
    ];
    const result = determineD2Path(events);
    expect(result.path).toBe("canonical");
    expect(result.identities.length).toBe(2);
  });

  it("1 identity → fallback", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "v", valueGrade: "T3", byWhom: { identity: "claude-code" } },
      { eventId: "e2", sequence: 2, type: "v", valueGrade: "T4", byWhom: { identity: "claude-code" } },
    ];
    expect(determineD2Path(events).path).toBe("fallback");
  });

  it("3 distinct identities still canonical (≥2 threshold)", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "v", valueGrade: "T3", byWhom: { identity: "claude-code" } },
      { eventId: "e2", sequence: 2, type: "v", valueGrade: "T3", byWhom: { identity: "codex-cli" } },
      { eventId: "e3", sequence: 3, type: "v", valueGrade: "T4", byWhom: { identity: "gemini-cli" } },
    ];
    const result = determineD2Path(events);
    expect(result.path).toBe("canonical");
    expect(result.identities.length).toBe(3);
  });

  it("empty events → fallback with empty identities", () => {
    const result = determineD2Path([]);
    expect(result.path).toBe("fallback");
    expect(result.identities.length).toBe(0);
  });

  it("events with missing identity are excluded", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "v", valueGrade: "T3" },
      { eventId: "e2", sequence: 2, type: "v", valueGrade: "T3", byWhom: {} },
    ];
    const result = determineD2Path(events);
    expect(result.path).toBe("fallback");
    expect(result.identities.length).toBe(0);
  });

  it("deduplicates identities across events", () => {
    const events: ValueGradedEvent[] = [
      { eventId: "e1", sequence: 1, type: "v", valueGrade: "T3", byWhom: { identity: "claude-code" } },
      { eventId: "e2", sequence: 2, type: "v", valueGrade: "T3", byWhom: { identity: "claude-code" } },
      { eventId: "e3", sequence: 3, type: "v", valueGrade: "T4", byWhom: { identity: "claude-code" } },
    ];
    const result = determineD2Path(events);
    expect(result.path).toBe("fallback");
    expect(result.identities.length).toBe(1);
  });
});
