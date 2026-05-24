// palantir-mini — OntologyWorkflowTrace emitter tests (PR-10)
// Verifies:
//   - open → transition → close lifecycle emits correct event chain
//   - snapshots persisted to workflow-traces/ dir
//   - traceId preserved across mode transitions
//   - refsPatch merges without dropping prior refs

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  openOntologyWorkflowTrace,
  transitionOntologyWorkflowTrace,
  closeOntologyWorkflowTrace,
} from "../../../lib/ontology-workflow/emit";

function readEventLines(projectRoot: string): Array<Record<string, unknown>> {
  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function snapshotPath(projectRoot: string, traceId: string): string {
  const safe = traceId.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").slice(0, 128);
  return path.join(projectRoot, ".palantir-mini", "session", "workflow-traces", `${safe}.json`);
}

describe("ontology-workflow/emit", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-emit-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("open → 3 transitions → close emits 5 events with persisted snapshots", async () => {
    const trace = await openOntologyWorkflowTrace({
      projectRoot: tmpDir,
      mode: "context-only",
      universalOntologyEntryRef: "universal-ontology-entry://test",
      reasoning: "test open — rule 01 §ForwardProp: traceId established at context-only mode for PR-10 lifecycle test",
    });
    expect(trace.mode).toBe("context-only");
    expect(trace.traceId).toMatch(/^ontology-workflow-trace:/);

    const t2 = await transitionOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace,
      nextMode: "semantic-gate",
      reasoning: "test transition 1 — rule 01 §ForwardProp: advancing from context-only to semantic-gate for PR-10 test",
    });
    expect(t2.mode).toBe("semantic-gate");
    expect(t2.traceId).toBe(trace.traceId);

    const t3 = await transitionOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace: t2,
      nextMode: "router",
      reasoning: "test transition 2 — rule 01 §ForwardProp: advancing semantic-gate to router for PR-10 test",
    });
    const t4 = await transitionOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace: t3,
      nextMode: "implementation",
      reasoning: "test transition 3 — rule 01 §ForwardProp: advancing router to implementation for PR-10 test",
    });

    await closeOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace: t4,
      outcome: "passed",
      reasoning: "test close — rule 01 §BackwardProp: trace lifecycle closed with passed outcome for PR-10 test",
    });

    const events = readEventLines(tmpDir);
    const kinds = events
      .map((e) => e.type as string)
      .filter((k) => k?.startsWith("workflow_trace_"));
    expect(kinds).toEqual([
      "workflow_trace_opened",
      "workflow_trace_transitioned",
      "workflow_trace_transitioned",
      "workflow_trace_transitioned",
      "workflow_trace_closed",
    ]);

    const snapPath = snapshotPath(tmpDir, trace.traceId);
    expect(fs.existsSync(snapPath)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(snapPath, "utf8")) as Record<string, unknown>;
    expect(snapshot.lastEvent).toBe("closed");
    expect(snapshot.outcome).toBe("passed");
  });

  test("transitions preserve traceId across mode changes", async () => {
    const trace = await openOntologyWorkflowTrace({
      projectRoot: tmpDir,
      mode: "context-only",
      reasoning: "test — traceId preservation check for PR-10; rule 10 §5-dim envelope",
    });
    const t2 = await transitionOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace,
      nextMode: "router",
      reasoning: "test — traceId must be unchanged after mode transition; rule 01 §ForwardProp invariant",
    });
    expect(t2.traceId).toBe(trace.traceId);
  });

  test("refsPatch merges into refs without dropping prior keys", async () => {
    const trace = await openOntologyWorkflowTrace({
      projectRoot: tmpDir,
      mode: "context-only",
      universalOntologyEntryRef: "universal-ontology-entry://a",
      reasoning: "test — refs merge verification for PR-10; rule 26 §A3 reasoning present",
    });
    const t2 = await transitionOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace,
      nextMode: "router",
      refsPatch: { semanticIntentContractRef: "sic://test" },
      reasoning: "test — refsPatch should merge with existing refs without loss; PR-10 wire spec",
    });
    expect(t2.refs.universalOntologyEntryRef).toBe("universal-ontology-entry://a");
    expect(t2.refs.semanticIntentContractRef).toBe("sic://test");
  });

  test("snapshot written on open with lastEvent=opened", async () => {
    const trace = await openOntologyWorkflowTrace({
      projectRoot: tmpDir,
      mode: "context-only",
      reasoning: "test — snapshot must be written immediately on open; PR-10 persistence spec",
    });
    const snapPath = snapshotPath(tmpDir, trace.traceId);
    expect(fs.existsSync(snapPath)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(snapPath, "utf8")) as Record<string, unknown>;
    expect(snapshot.lastEvent).toBe("opened");
    expect(snapshot.traceId).toBe(trace.traceId);
    expect(snapshot.mode).toBe("context-only");
  });

  test("snapshot lastEvent=transitioned after mode advance", async () => {
    const trace = await openOntologyWorkflowTrace({
      projectRoot: tmpDir,
      mode: "context-only",
      reasoning: "test — snapshot lastEvent check after transition; PR-10 lifecycle spec",
    });
    await transitionOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace,
      nextMode: "semantic-gate",
      reasoning: "test — advancing to semantic-gate; verifying snapshot update; rule 01 §ForwardProp",
    });
    const snapPath = snapshotPath(tmpDir, trace.traceId);
    const snapshot = JSON.parse(fs.readFileSync(snapPath, "utf8")) as Record<string, unknown>;
    expect(snapshot.lastEvent).toBe("transitioned");
    expect(snapshot.mode).toBe("semantic-gate");
  });

  test("close with outcome=failed records failure in snapshot", async () => {
    const trace = await openOntologyWorkflowTrace({
      projectRoot: tmpDir,
      mode: "context-only",
      reasoning: "test — failed outcome snapshot check; PR-10 BackwardProp coverage",
    });
    await closeOntologyWorkflowTrace({
      projectRoot: tmpDir,
      trace,
      outcome: "failed",
      reasoning: "test — closing with failed outcome; rule 01 §BackwardProp closes drift circuit",
    });
    const snapPath = snapshotPath(tmpDir, trace.traceId);
    const snapshot = JSON.parse(fs.readFileSync(snapPath, "utf8")) as Record<string, unknown>;
    expect(snapshot.lastEvent).toBe("closed");
    expect(snapshot.outcome).toBe("failed");
  });
});
