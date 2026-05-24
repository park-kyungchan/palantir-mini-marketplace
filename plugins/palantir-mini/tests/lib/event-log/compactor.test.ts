/**
 * Tests for lib/event-log/compactor.ts — Sprint-105 PR 4.3
 */
import { describe, expect, it } from "bun:test";
import {
  findSummarizableRuns, synthesizeSummaryEnvelope,
  DEFAULT_THRESHOLD, DEFAULT_COMPACTION_TYPES,
} from "../../../lib/event-log/compactor";
import type { EventEnvelope, EventsSummarizedEnvelope } from "../../../lib/event-log/types";

type SummarizableRunLike = ReturnType<typeof findSummarizableRuns>[0];

function makeEvent(type: EventEnvelope["type"], seq: number, payloadOverride: Record<string, unknown> = {}): EventEnvelope {
  return { type, eventId: `test-${type}-${seq}` as EventEnvelope["eventId"],
    when: `2026-05-14T00:${String(seq % 60).padStart(2, "0")}:00.000Z`,
    atopWhich: "abc1234" as EventEnvelope["atopWhich"],
    throughWhich: { sessionId: "test-session" as EventEnvelope["throughWhich"]["sessionId"], toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "claude-code" }, sequence: seq, payload: payloadOverride,
  } as unknown as EventEnvelope;
}
const makeVpc = (seq: number, passed: boolean) => makeEvent("validation_phase_completed", seq, { phase: "compile", passed });
const makeTic = (seq: number) => makeEvent("tool_invocation_completed", seq, { toolName: "Read", durationMs: 5, success: true });

describe("findSummarizableRuns", () => {
  it("returns empty array for empty input", () => { expect(findSummarizableRuns([])).toEqual([]); });
  it("returns empty when no run reaches threshold", () => {
    const events = Array.from({length:9},(_,i)=>makeVpc(i+1,true));
    expect(findSummarizableRuns(events,{threshold:10})).toHaveLength(0);
  });
  it("detects a single run at exactly threshold", () => {
    const events = Array.from({length:10},(_,i)=>makeVpc(i+1,true));
    const runs = findSummarizableRuns(events,{threshold:10});
    expect(runs).toHaveLength(1);
    expect(runs[0]!.type).toBe("validation_phase_completed");
    expect(runs[0]!.events).toHaveLength(10);
    expect(runs[0]!.firstSeq).toBe(1); expect(runs[0]!.lastSeq).toBe(10);
  });
  it("detects a run longer than threshold", () => {
    const events = Array.from({length:15},(_,i)=>makeVpc(i+1,true));
    expect(findSummarizableRuns(events,{threshold:10})[0]!.events).toHaveLength(15);
  });
  it("detects multiple runs separated by different-type event", () => {
    const runs = findSummarizableRuns([
      ...Array.from({length:10},(_,i)=>makeVpc(i+1,true)),
      makeEvent("edit_committed",11),
      ...Array.from({length:10},(_,i)=>makeTic(i+12)),
    ], {threshold:10});
    expect(runs).toHaveLength(2);
    expect(runs[0]!.type).toBe("validation_phase_completed");
    expect(runs[1]!.type).toBe("tool_invocation_completed");
  });
  it("does NOT merge runs of different types even if adjacent", () => {
    const runs = findSummarizableRuns([
      ...Array.from({length:10},(_,i)=>makeVpc(i+1,true)),
      ...Array.from({length:10},(_,i)=>makeTic(i+11)),
    ], {threshold:10});
    expect(runs).toHaveLength(2);
  });
  it("respects maxRuns cap", () => {
    const runs = findSummarizableRuns([
      ...Array.from({length:10},(_,i)=>makeVpc(i+1,true)),
      makeEvent("edit_committed",11),
      ...Array.from({length:10},(_,i)=>makeVpc(i+12,true)),
    ], {threshold:10,maxRuns:1});
    expect(runs).toHaveLength(1); expect(runs[0]!.firstSeq).toBe(1);
  });
  it("respects custom allowlist — excludes unlisted type", () => {
    expect(findSummarizableRuns(Array.from({length:10},(_,i)=>makeTic(i+1)),{threshold:10,allowlist:["validation_phase_completed"]})).toHaveLength(0);
  });
  it("respects custom allowlist — includes listed type", () => {
    expect(findSummarizableRuns(Array.from({length:10},(_,i)=>makeTic(i+1)),{threshold:10,allowlist:["tool_invocation_completed"]})).toHaveLength(1);
  });
  describe("validationPassedOnly filter", () => {
    it("excludes failed vpc by default", () => {
      expect(findSummarizableRuns(Array.from({length:10},(_,i)=>makeVpc(i+1,false)),{threshold:10})).toHaveLength(0);
    });
    it("includes failed vpc when passedOnly=false", () => {
      expect(findSummarizableRuns(Array.from({length:10},(_,i)=>makeVpc(i+1,false)),{threshold:10,validationPassedOnly:false})).toHaveLength(1);
    });
    it("breaks run at failed vpc", () => {
      const runs = findSummarizableRuns([
        ...Array.from({length:5},(_,i)=>makeVpc(i+1,true)),
        makeVpc(6,false),
        ...Array.from({length:5},(_,i)=>makeVpc(i+7,true)),
      ], {threshold:10});
      expect(runs).toHaveLength(0);
    });
    it("skips events_summarized envelopes", () => {
      const summary = makeEvent("events_summarized" as EventEnvelope["type"], 6, {summarizedType:"validation_phase_completed",count:5,firstSeq:1,lastSeq:5,firstAt:"",lastAt:"",sampledPayloads:[],threshold:5});
      const events = [
        ...Array.from({length:5},(_,i)=>makeVpc(i+1,true)),
        summary,
        ...Array.from({length:5},(_,i)=>makeVpc(i+7,true)),
      ];
      expect(findSummarizableRuns(events,{threshold:10})).toHaveLength(0);
    });
  });
  it("uses DEFAULT_THRESHOLD when no opts given", () => {
    const short = Array.from({length:DEFAULT_THRESHOLD-1},(_,i)=>makeVpc(i+1,true));
    expect(findSummarizableRuns(short)).toHaveLength(0);
    expect(findSummarizableRuns([...short,makeVpc(DEFAULT_THRESHOLD,true)])).toHaveLength(1);
  });
  it("does not compact non-allowlist types", () => {
    expect(findSummarizableRuns(Array.from({length:20},(_,i)=>makeEvent("edit_committed",i+1)))).toHaveLength(0);
  });
  it("records correct startIndex and endIndex", () => {
    const runs = findSummarizableRuns([
      makeEvent("edit_committed",1), makeEvent("edit_committed",2),
      ...Array.from({length:10},(_,i)=>makeVpc(i+3,true)),
    ], {threshold:10});
    expect(runs[0]!.startIndex).toBe(2); expect(runs[0]!.endIndex).toBe(11);
  });
});

describe("synthesizeSummaryEnvelope", () => {
  function makeRun(count: number): SummarizableRunLike {
    return findSummarizableRuns(Array.from({length:count},(_,i)=>makeVpc(i+1,true)),{threshold:count})[0]!;
  }
  it("type is 'events_summarized'", () => { expect(synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc"}).type).toBe("events_summarized"); });
  it("payload.summarizedType matches run type", () => { expect(synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc"}).payload.summarizedType).toBe("validation_phase_completed"); });
  it("payload.count matches run length", () => { expect(synthesizeSummaryEnvelope(makeRun(12),{atopWhich:"abc"}).payload.count).toBe(12); });
  it("payload.firstSeq/lastSeq correct", () => {
    const run = makeRun(10);
    const env = synthesizeSummaryEnvelope(run,{atopWhich:"abc"});
    expect(env.payload.firstSeq).toBe(run.firstSeq); expect(env.payload.lastSeq).toBe(run.lastSeq);
  });
  it("payload.firstAt/lastAt correct", () => {
    const run = makeRun(10);
    const env = synthesizeSummaryEnvelope(run,{atopWhich:"abc"});
    expect(env.payload.firstAt).toBe(run.firstAt); expect(env.payload.lastAt).toBe(run.lastAt);
  });
  it("payload.threshold matches opts", () => { expect(synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc",threshold:7}).payload.threshold).toBe(7); });
  it("sampledPayloads: first 3 + last 1 for count > 3", () => { expect(synthesizeSummaryEnvelope(makeRun(12),{atopWhich:"abc"}).payload.sampledPayloads.length).toBe(4); });
  it("sampledPayloads: all events for count <= 3", () => {
    const events = Array.from({length:3},(_,i)=>makeVpc(i+1,true));
    const run: SummarizableRunLike = {type:"validation_phase_completed",events,firstSeq:1,lastSeq:3,firstAt:events[0]!.when,lastAt:events[2]!.when,startIndex:0,endIndex:2};
    expect(synthesizeSummaryEnvelope(run,{atopWhich:"abc",threshold:3}).payload.sampledPayloads.length).toBe(3);
  });
  it("reasoning >= 40 chars (rule 26 A3)", () => { expect(synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc"}).withWhat!.reasoning!.length).toBeGreaterThanOrEqual(40); });
  it("byWhom.agentName is 'compactor-job'", () => { expect(synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc"}).byWhom.agentName).toBe("compactor-job"); });
  it("atopWhich set from opts", () => { expect(String(synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"deadbeef"}).atopWhich)).toBe("deadbeef"); });
  it("no sequence field on returned envelope", () => { expect((synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc"}) as {sequence?:unknown}).sequence).toBeUndefined(); });
  it("type-safe as Omit<EventsSummarizedEnvelope,'sequence'>", () => {
    const env: Omit<EventsSummarizedEnvelope,"sequence"> = synthesizeSummaryEnvelope(makeRun(10),{atopWhich:"abc"});
    expect(env.type).toBe("events_summarized");
  });
});

describe("source immutability", () => {
  it("findSummarizableRuns does not mutate source", () => {
    const events = Array.from({length:10},(_,i)=>makeVpc(i+1,true));
    const before = JSON.stringify(events);
    findSummarizableRuns(events,{threshold:10});
    expect(JSON.stringify(events)).toBe(before);
  });
  it("synthesizeSummaryEnvelope does not mutate source", () => {
    const events = Array.from({length:10},(_,i)=>makeVpc(i+1,true));
    const runs = findSummarizableRuns(events,{threshold:10});
    const before = JSON.stringify(events);
    synthesizeSummaryEnvelope(runs[0]!,{atopWhich:"abc"});
    expect(JSON.stringify(events)).toBe(before);
  });
  it("SummarizableRun.events is a distinct array (slice)", () => {
    const events = Array.from({length:10},(_,i)=>makeVpc(i+1,true));
    expect(findSummarizableRuns(events,{threshold:10})[0]!.events).not.toBe(events);
  });
});

describe("integration", () => {
  it("20 vpc + 5 edit + 12 tic → 2 envelopes with correct counts", () => {
    const vpc = Array.from({length:20},(_,i)=>makeVpc(i+1,true));
    const mid = Array.from({length:5},(_,i)=>makeEvent("edit_committed",i+21));
    const tic = Array.from({length:12},(_,i)=>makeTic(i+26));
    const runs = findSummarizableRuns([...vpc,...mid,...tic],{threshold:10});
    expect(runs).toHaveLength(2);
    const envs = runs.map(r=>synthesizeSummaryEnvelope(r,{atopWhich:"feedcafe"}));
    expect(envs[0]!.payload.count).toBe(20); expect(envs[1]!.payload.count).toBe(12);
    expect(envs[0]!.payload.summarizedType).toBe("validation_phase_completed");
    expect(envs[1]!.payload.summarizedType).toBe("tool_invocation_completed");
    expect(vpc.length+mid.length+tic.length).toBe(37);
  });
  it("both envelopes have type events_summarized", () => {
    const runs = findSummarizableRuns([
      ...Array.from({length:10},(_,i)=>makeVpc(i+1,true)),
      makeEvent("edit_committed",11),
      ...Array.from({length:10},(_,i)=>makeTic(i+12)),
    ], {threshold:10});
    runs.map(r=>synthesizeSummaryEnvelope(r,{atopWhich:"abc"})).forEach(e=>expect(e.type).toBe("events_summarized"));
  });
  it("envelopes have distinct eventIds", () => {
    const runs = findSummarizableRuns([
      ...Array.from({length:10},(_,i)=>makeVpc(i+1,true)),
      makeEvent("edit_committed",11),
      ...Array.from({length:10},(_,i)=>makeVpc(i+12,true)),
    ], {threshold:10});
    const envs = runs.map(r=>synthesizeSummaryEnvelope(r,{atopWhich:"abc"}));
    expect(String(envs[0]!.eventId)).not.toBe(String(envs[1]!.eventId));
  });
});

describe("DEFAULT_COMPACTION_TYPES", () => {
  it("includes validation_phase_completed", () => { expect(DEFAULT_COMPACTION_TYPES).toContain("validation_phase_completed"); });
  it("includes tool_invocation_completed", () => { expect(DEFAULT_COMPACTION_TYPES).toContain("tool_invocation_completed"); });
  it("DEFAULT_THRESHOLD is 10", () => { expect(DEFAULT_THRESHOLD).toBe(10); });
});
