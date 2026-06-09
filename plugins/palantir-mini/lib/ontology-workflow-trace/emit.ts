// palantir-mini — OntologyWorkflowTrace emitter (PR-10 foamy-giggling-kettle)
//
// Wraps createOntologyWorkflowTrace + events.jsonl emission + snapshot persistence.
// Three lifecycle functions:
//   openOntologyWorkflowTrace    — creates trace, emits workflow_trace_opened
//   transitionOntologyWorkflowTrace — advances mode, emits workflow_trace_transitioned
//   closeOntologyWorkflowTrace   — closes trace, emits workflow_trace_closed
//
// Persistence: .palantir-mini/session/workflow-traces/<traceId>.json
// Events: workflow_trace_opened | workflow_trace_transitioned | workflow_trace_closed
//
// All emit() calls are best-effort (.catch(() => {})) — handler failures must
// not propagate from telemetry (rule 26 §A3 reasoning ≥40 chars required).
//
// Authority:
//   rule 01 §ForwardProp (trace opens at context retrieval, closes at commit)
//   rule 10 §5-dim envelope (every emit carries full 5-dim + memoryLayers)
//   rule 26 §A3 (reasoning ≥40 chars; memoryLayers declared)
//   foamy-giggling-kettle plan lines 746-787 (PR-10 spec)

import * as fs from "node:fs";
import * as path from "node:path";
import {
  createOntologyWorkflowTrace,
  type OntologyWorkflowTrace,
} from "./trace";
import { emit } from "../../scripts/log";

// ─── Snapshot persistence ─────────────────────────────────────────────────────

function traceStoreDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "workflow-traces");
}

function traceStorePath(projectRoot: string, traceId: string): string {
  const safe = traceId.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").slice(0, 128) || "trace";
  return path.join(traceStoreDir(projectRoot), `${safe}.json`);
}

interface TraceSnapshotMeta {
  lastEvent: "opened" | "transitioned" | "closed";
  outcome?: "passed" | "failed" | "aborted";
  updatedAt: string;
}

function persistTraceSnapshot(
  projectRoot: string,
  trace: OntologyWorkflowTrace,
  meta: TraceSnapshotMeta,
): void {
  const filePath = traceStorePath(projectRoot, trace.traceId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const snapshot = { ...trace, ...meta };
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

// ─── Open ─────────────────────────────────────────────────────────────────────

export interface OpenOntologyWorkflowTraceInput {
  readonly projectRoot: string;
  readonly mode: OntologyWorkflowTrace["mode"];
  readonly universalOntologyEntryRef?: string;
  readonly ontologyContextQueryRef?: string;
  readonly capabilityRefs?: readonly string[];
  readonly knownIssueRefs?: readonly string[];
  readonly validationPackRefs?: readonly string[];
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly implementationRefs?: readonly string[];
  readonly ratchetRefs?: readonly string[];
  readonly sessionId?: string;
  readonly reasoning?: string;
  readonly now?: Date;
}

export async function openOntologyWorkflowTrace(
  input: OpenOntologyWorkflowTraceInput,
): Promise<OntologyWorkflowTrace> {
  const trace = createOntologyWorkflowTrace(input);
  persistTraceSnapshot(input.projectRoot, trace, {
    lastEvent: "opened",
    updatedAt: trace.createdAt,
  });
  await emit({
    type: "workflow_trace_opened",
    payload: {
      traceId: trace.traceId,
      mode: trace.mode,
      refs: trace.refs,
    } as Record<string, unknown>,
    toolName: "ontology_workflow_trace",
    cwd: input.projectRoot,
    sessionId: input.sessionId,
    reasoning:
      input.reasoning ??
      `openOntologyWorkflowTrace mode=${trace.mode} traceId=${trace.traceId} — rule 01 §ForwardProp; PR-10 of foamy-giggling-kettle plan closes the trace-emit gap (Agent D's LARGEST GAP)`,
    memoryLayers: ["procedural", "semantic"],
  }).catch(() => {/* best-effort */});
  return trace;
}

// ─── Transition ───────────────────────────────────────────────────────────────

export interface TransitionOntologyWorkflowTraceInput {
  readonly projectRoot: string;
  readonly trace: OntologyWorkflowTrace;
  readonly nextMode: OntologyWorkflowTrace["mode"];
  readonly refsPatch?: Partial<OntologyWorkflowTrace["refs"]>;
  readonly sessionId?: string;
  readonly reasoning?: string;
  readonly now?: Date;
}

export async function transitionOntologyWorkflowTrace(
  input: TransitionOntologyWorkflowTraceInput,
): Promise<OntologyWorkflowTrace> {
  const updatedAt = (input.now ?? new Date()).toISOString();
  const merged: OntologyWorkflowTrace = {
    ...input.trace,
    mode: input.nextMode,
    refs: { ...input.trace.refs, ...(input.refsPatch ?? {}) } as OntologyWorkflowTrace["refs"],
  };
  persistTraceSnapshot(input.projectRoot, merged, {
    lastEvent: "transitioned",
    updatedAt,
  });
  await emit({
    type: "workflow_trace_transitioned",
    payload: {
      traceId: merged.traceId,
      fromMode: input.trace.mode,
      toMode: input.nextMode,
      refs: merged.refs,
    } as Record<string, unknown>,
    toolName: "ontology_workflow_trace",
    cwd: input.projectRoot,
    sessionId: input.sessionId,
    reasoning:
      input.reasoning ??
      `transitionOntologyWorkflowTrace ${input.trace.mode}→${input.nextMode} traceId=${merged.traceId} — rule 01 §ForwardProp; per PR-10 spec wire pattern`,
    memoryLayers: ["procedural"],
  }).catch(() => {/* best-effort */});
  return merged;
}

// ─── Close ────────────────────────────────────────────────────────────────────

export interface CloseOntologyWorkflowTraceInput {
  readonly projectRoot: string;
  readonly trace: OntologyWorkflowTrace;
  readonly outcome: "passed" | "failed" | "aborted";
  readonly refsPatch?: Partial<OntologyWorkflowTrace["refs"]>;
  readonly sessionId?: string;
  readonly reasoning?: string;
  readonly now?: Date;
}

export async function closeOntologyWorkflowTrace(
  input: CloseOntologyWorkflowTraceInput,
): Promise<void> {
  const updatedAt = (input.now ?? new Date()).toISOString();
  const merged: OntologyWorkflowTrace = {
    ...input.trace,
    refs: { ...input.trace.refs, ...(input.refsPatch ?? {}) } as OntologyWorkflowTrace["refs"],
  };
  persistTraceSnapshot(input.projectRoot, merged, {
    lastEvent: "closed",
    outcome: input.outcome,
    updatedAt,
  });
  await emit({
    type: "workflow_trace_closed",
    payload: {
      traceId: merged.traceId,
      mode: merged.mode,
      outcome: input.outcome,
      refs: merged.refs,
    } as Record<string, unknown>,
    toolName: "ontology_workflow_trace",
    cwd: input.projectRoot,
    sessionId: input.sessionId,
    reasoning:
      input.reasoning ??
      `closeOntologyWorkflowTrace outcome=${input.outcome} mode=${merged.mode} traceId=${merged.traceId} — rule 01 §BackwardProp; closes PR-10 trace lifecycle`,
    memoryLayers: ["procedural", "episodic"],
  }).catch(() => {/* best-effort */});
}

// ─── DTC fill turn emitter (Sprint 97 W1) ────────────────────────────────────

import type { DtcFillTurnAdvancedPayload } from "../event-log/types";

export interface EmitDtcFillTurnAdvancedInput {
  readonly projectRoot: string;
  readonly dtcStep: number;
  readonly advancedField: string;
  readonly capturedRefs?: readonly string[];
  readonly promptId?: string;
  readonly sessionId?: string;
  readonly reasoning?: string;
}

/**
 * Emit a `dtc_fill_turn_advanced` event to the project's events.jsonl.
 *
 * Called each time the DTC fill workflow advances one turn (i.e., one field
 * or dimension is filled). Provides a per-step audit trail so BackProp can
 * reconstruct the exact fill sequence for any DTC (rule 10 5-dim; rule 26 T2+).
 *
 * Best-effort: promise rejects are caught internally and do not propagate to
 * the caller — telemetry must never block domain logic.
 */
export async function emitDtcFillTurnAdvanced(
  input: EmitDtcFillTurnAdvancedInput,
): Promise<void> {
  const payload: DtcFillTurnAdvancedPayload = {
    dtcStep: input.dtcStep,
    advancedField: input.advancedField,
    ...(input.capturedRefs !== undefined ? { capturedRefs: input.capturedRefs } : {}),
    ...(input.promptId !== undefined ? { promptId: input.promptId } : {}),
  };
  await emit({
    type: "dtc_fill_turn_advanced",
    payload,
    toolName: "dtc_fill_workflow",
    cwd: input.projectRoot,
    sessionId: input.sessionId,
    reasoning:
      input.reasoning ??
      `emitDtcFillTurnAdvanced step=${input.dtcStep} field=${input.advancedField} — Sprint 97 W1; rule 10 5-dim BackProp substrate for DTC fill sequence reconstruction`,
    memoryLayers: ["episodic", "procedural"],
  }).catch(() => {/* best-effort */});
}

// Re-export the type for callers
export type { OntologyWorkflowTrace } from "./trace";
