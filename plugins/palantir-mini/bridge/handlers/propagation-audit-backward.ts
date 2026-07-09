// palantir-mini v4.0.0 — MCP tool handler: propagation_audit_backward
// Domain: LEARN (BackwardProp replay from violation event)
//
// Seeds at a single events.jsonl row and walks backward via the 5-dim
// Decision Lineage envelope (byWhom chains, atopWhich predecessors,
// propagationDepth filter) to identify the earliest propagation step
// where an invariant was first violated.
//
// Authority chain:
//   rules/10-events-jsonl.md (5-dim append-only substrate)
//   schemas/ontology/primitives/propagation-replay.ts (PropagationReplayPayload SSoT)
//   plans/distributed-wishing-manatee.md §T4.3

import * as fs from "fs";
import * as path from "path";
import { emit, eventsPathFor } from "../../scripts/log";
import {
  type PropagationReplayPayload,
  type PropagationReplayNode,
  type LineageDimension,
  type PropagationStep,
} from "#schemas/ontology/primitives/propagation-replay";
import {
  PROPAGATION_DEPTH_TO_STEP,
  PROPAGATION_STEPS,
} from "#schemas/ontology/primitives/propagation-audit";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";

export interface PropagationAuditBackwardInput {
  project: string;
  seedEventId: string;
  maxDepth?: number;
  filterDimensions?: LineageDimension[];
}

// ── Event row shape (minimal superset of EventEnvelopeBase) ───────────────

interface RawEventRow {
  eventId?: string;
  when?: string;
  atopWhich?: string;
  throughWhich?: { sessionId?: string; toolName?: string; cwd?: string };
  byWhom?: { identity?: string; agentName?: string; teamName?: string };
  withWhat?: { reasoning?: string; hypothesis?: string };
  sequence?: number;
  propagationDepth?: number;
  type?: string;
  payload?: unknown;
}

// ── events.jsonl reader ────────────────────────────────────────────────────

function readAllEvents(project: string): RawEventRow[] {
  const eventsPath = eventsPathFor(project);
  if (!fs.existsSync(eventsPath)) return [];
  const rows: RawEventRow[] = [];
  for (const line of fs.readFileSync(eventsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed) as RawEventRow);
    } catch {
      // skip malformed rows
    }
  }
  // Also merge archived rotated logs
  const archiveDir = path.join(project, ".palantir-mini", "session", "archive");
  if (fs.existsSync(archiveDir)) {
    for (const f of fs.readdirSync(archiveDir).sort()) {
      if (!f.startsWith("events-rotated-")) continue;
      const full = path.join(archiveDir, f);
      for (const line of fs.readFileSync(full, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          rows.push(JSON.parse(trimmed) as RawEventRow);
        } catch {
          // skip
        }
      }
    }
  }
  return rows;
}

// ── Propagation step classification heuristic ─────────────────────────────

/**
 * Classifies an event row into a PropagationStep based on event type
 * or propagationDepth field. Returns null when unclassifiable.
 */
function classifyStep(row: RawEventRow): PropagationStep | null {
  // 1. propagationDepth field takes precedence (T1.4 addition).
  // XRUN-2: depth is the canonical 0-4 layer scale (research+schema collapsed to
  // layer 0). Map via PROPAGATION_DEPTH_TO_STEP — NOT by indexing the 6-value
  // PropagationStep vocabulary (which would mis-map every depth ≥1).
  if (typeof row.propagationDepth === "number") {
    const step = PROPAGATION_DEPTH_TO_STEP[row.propagationDepth];
    if (step) return step;
  }
  // 2. Event-type heuristics
  const t = row.type ?? "";
  if (t.includes("research") || t.includes("citation")) return "research";
  if (t.includes("schema") || t.includes("codegen")) return "schema";
  if (t.includes("shared_core") || t.includes("shared-core")) return "shared-core";
  if (t.includes("ontology") || t.includes("doc_drift") || t.includes("drift")) return "project-ontology";
  if (t.includes("contract") || t.includes("generated") || t.includes("sprint_contract")) return "contracts";
  if (t.includes("runtime") || t.includes("tsc") || t.includes("compile")) return "runtime";
  return null;
}

// ── Violation detection heuristic ─────────────────────────────────────────

/**
 * Returns true if the row's type or payload signals a violation/failure.
 */
function isViolationRow(row: RawEventRow): boolean {
  const t = row.type ?? "";
  const failTypes = [
    "drift_detected", "doc_drift_detected", "validation_phase_completed",
    "research_citation_validated",
  ];
  if (failTypes.some((ft) => t.startsWith(ft))) {
    // Check payload for failure indicator
    const p = row.payload as Record<string, unknown> | undefined;
    if (p) {
      if (p["verdict"] === "fail" || p["verdict"] === "failed") return true;
      if (p["errorClass"] && typeof p["errorClass"] === "string") return true;
      if (p["driftDetected"] === true) return true;
    }
    return false;
  }
  if (t.includes("fail") || t.includes("error") || t.includes("violated")) return true;
  return false;
}

// ── Backward walk ──────────────────────────────────────────────────────────

/**
 * Walk backward from seedEventId. Strategy:
 *  - Build index: byWhom.agentName → events (sorted by sequence desc)
 *  - Build index: eventId → row
 *  - From seed, follow: same-agent predecessor (sequence-1), then atopWhich ancestors
 *  - Classify each visited row into a PropagationStep
 *  - Detect violation at the earliest (highest-authority) step reached
 */
function walkBackward(
  rows: RawEventRow[],
  seedEventId: string,
  maxDepth: number,
  filterDimensions: LineageDimension[],
): { nodes: PropagationReplayNode[]; firstViolationStep: PropagationStep | null } {
  const byEventId = new Map<string, RawEventRow>();
  const byAgentAndStep = new Map<string, RawEventRow[]>();

  for (const row of rows) {
    if (row.eventId) byEventId.set(row.eventId, row);
    const agent = row.byWhom?.agentName ?? row.byWhom?.identity ?? "unknown";
    const existing = byAgentAndStep.get(agent) ?? [];
    existing.push(row);
    byAgentAndStep.set(agent, existing);
  }

  // Sort each agent's events by sequence ascending
  for (const evts of byAgentAndStep.values()) {
    evts.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }

  const seedRow = byEventId.get(seedEventId);
  if (!seedRow) {
    return { nodes: [], firstViolationStep: null };
  }

  const visited = new Set<string>();
  const nodes: PropagationReplayNode[] = [];
  let firstViolationStep: PropagationStep | null = null;
  // Track earliest (most-authoritative) violation step found. Authority order
  // is the canonical 6-value PropagationStep vocabulary (research highest).
  const STEP_ORDER: readonly PropagationStep[] = PROPAGATION_STEPS;

  const queue: Array<{ row: RawEventRow; depth: number }> = [
    { row: seedRow, depth: 0 },
  ];

  while (queue.length > 0 && nodes.length <= maxDepth) {
    const item = queue.shift()!;
    const { row, depth } = item;
    const id = row.eventId ?? `seq-${row.sequence}`;
    if (visited.has(id)) continue;
    visited.add(id);

    const agent = row.byWhom?.agentName ?? row.byWhom?.identity ?? "unknown";

    nodes.push({
      eventId: id,
      propagationDepth: depth,
      byWhom: agent,
      when: row.when ?? new Date().toISOString(),
    });

    // Check for violation
    const step = classifyStep(row);
    if (step && (isViolationRow(row) || depth === 0)) {
      const stepIdx = STEP_ORDER.indexOf(step);
      const currentViolIdx = firstViolationStep ? STEP_ORDER.indexOf(firstViolationStep) : 999;
      if (isViolationRow(row) && stepIdx < currentViolIdx) {
        firstViolationStep = step;
      }
    }

    if (depth >= maxDepth) continue;

    // Strategy 1: same-agent predecessor by sequence
    const agentEvents = byAgentAndStep.get(agent) ?? [];
    const agentIdx = agentEvents.findIndex((e) => e.eventId === id || e.sequence === row.sequence);
    if (agentIdx > 0) {
      const predecessor = agentEvents[agentIdx - 1]!;
      // Apply dimension filters
      let include = true;
      if (filterDimensions.length > 0) {
        include = false;
        for (const dim of filterDimensions) {
          if (dim === "byWhom" && predecessor.byWhom?.agentName === row.byWhom?.agentName) {
            include = true; break;
          }
          if (dim === "atopWhich" && predecessor.atopWhich === row.atopWhich) {
            include = true; break;
          }
          if (dim === "throughWhich" && predecessor.throughWhich?.sessionId === row.throughWhich?.sessionId) {
            include = true; break;
          }
          if (dim === "when" || dim === "withWhat") {
            include = true; break;
          }
        }
      }
      if (include) {
        queue.push({ row: predecessor, depth: depth + 1 });
      }
    }

    // Strategy 2: atopWhich ancestor — find events with same commit SHA emitted earlier
    if (filterDimensions.includes("atopWhich") || filterDimensions.length === 0) {
      if (row.atopWhich) {
        const sameCommit = rows.filter(
          (r) =>
            r.atopWhich === row.atopWhich &&
            (r.sequence ?? 0) < (row.sequence ?? 0) &&
            r.eventId &&
            !visited.has(r.eventId),
        );
        if (sameCommit.length > 0) {
          // Pick the immediately prior one
          sameCommit.sort((a, b) => (b.sequence ?? 0) - (a.sequence ?? 0));
          queue.push({ row: sameCommit[0]!, depth: depth + 1 });
        }
      }
    }
  }

  // Sort by ascending propagationDepth (seed first)
  nodes.sort((a, b) => a.propagationDepth - b.propagationDepth);
  return { nodes, firstViolationStep };
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function propagationAuditBackward(
  rawArgs: unknown,
): Promise<PropagationReplayPayload> {
  const args = (rawArgs ?? {}) as Partial<PropagationAuditBackwardInput>;

  if (!args.project || typeof args.project !== "string") {
    throw new Error("propagation_audit_backward: `project` is required");
  }
  if (!args.seedEventId || typeof args.seedEventId !== "string") {
    throw new Error("propagation_audit_backward: `seedEventId` is required");
  }

  const project = args.project;
  const seedEventId = args.seedEventId;
  const maxDepth = args.maxDepth ?? 10;
  const filterDimensions: LineageDimension[] = args.filterDimensions ?? [
    "when", "atopWhich", "throughWhich", "byWhom", "withWhat",
  ];

  const rows = readAllEvents(project);
  const { nodes, firstViolationStep } = walkBackward(rows, seedEventId, maxDepth, filterDimensions);

  const replayId = crypto.randomUUID();
  const replayedAt = new Date().toISOString();

  const payload: PropagationReplayPayload = {
    replayId,
    seedEventId,
    tracedDimensions: filterDimensions,
    firstViolationStep,
    lineageNodes: nodes,
    replayedAt,
  };

  await emit({
    type: "validation_phase_completed",
    payload: {
      phase: "post_write",
      passed: firstViolationStep === null,
      errorClass: "propagation_audit_backward",
    },
    toolName: "propagation_audit_backward",
    cwd: project,
    reasoning: `BackwardProp replay: seed=${seedEventId} depth=${maxDepth} nodes=${nodes.length} firstViolation=${firstViolationStep ?? "none"}`,
    memoryLayers: ["episodic"],
    // R-M2 (promotion-linkage wave 4) — stamped with the seed event's real
    // eventId, satisfying the engine's exact-match eventId-class join. Stamped
    // UNCONDITIONALLY (not gated on firstViolationStep === null): the
    // promotion engine's own evidence loop (findT1ToT2Evidence /
    // findT3ToT4Evidence in scripts/replay-promote-grades.ts) already filters
    // out payload.passed === false validation-side events BEFORE calling
    // ridJoins(), so a failed audit (passed:false) can never itself serve as
    // promotion evidence — no additional gate is needed here.
    lineageRefs: { actionRid: seedEventId },
  });

  // When a violation was detected, emit a paired `phase_completed` event
  // carrying a typed RefinementTarget so downstream T3 circuit consumers
  // (decisions/ subdir, BackPropagation feeder) can dispatch refinement
  // without parsing prose. Rule 26 §R5 + §Substrate routing T3.
  if (firstViolationStep !== null) {
    const refinementTarget: RefinementTarget = {
      kind: "rule-conformance-policy",
      filePathOrRid: firstViolationStep,
      description: `BackwardProp violation detected at propagation step "${firstViolationStep}": lineage conformance policy requires review at this layer.`,
      confidenceLevel: "medium",
    };
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "backprop_violation_refinement_proposed",
        taskId: replayId,
        validations: [`firstViolationStep:${firstViolationStep}`, `seedEventId:${seedEventId}`],
      },
      toolName: "propagation_audit_backward",
      cwd: project,
      reasoning: `Paired refinement-target emit for BackwardProp violation at step="${firstViolationStep}" (rule 26 §R5 + §Substrate routing T3). Closes BackProp circuit step 1 of 3.`,
      refinementTarget,
      memoryLayers: ["procedural", "semantic"],
    });
  }

  return payload;
}
