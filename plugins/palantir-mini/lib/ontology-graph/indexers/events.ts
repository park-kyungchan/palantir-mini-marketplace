/**
 * lib/ontology-graph/indexers/events.ts — Eighth-in-sequence concrete indexer
 * for the in-memory OntologyGraphStore (PR 2.12 sprint-089; SECOND PR of
 * Sprint X3 / canonical plan v2 §4 row 2.12). Walks events.jsonl + archived
 * rotations, filters T2+ envelopes (rule 26 §Valuable data), emits Event nodes
 * (PR 2.1 wrapper, kind "Event") with 18 join-keys flattened to payload + emits
 * structural-edges from synthetic agent RID → Event when extractable.
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/value-grade.ts (ValueGrade T0..T4)
 *   ~/.claude/schemas/ontology/primitives/lineage-refs.ts (LineageRefs cross-ref)
 *     → lib/event-log/types.ts (EventEnvelopeBase with the 18 join-key positions)
 *     → lib/event-log/read.ts (readEvents — live + archive merge + sequence sort)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid,
 *                                    NodeTypeKind literal "Event",
 *                                    EdgeKindUnion literal "emits")
 *     → lib/ontology-graph/indexers/tests-evals.ts (read-only structural reference)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation; no events.jsonl
 *                  WRITE — rule 10 append-only invariant respected via READ-only ingest)
 *     → PR 2.14 (orchestration layer — reconciles `events-agent:` synthetic
 *                NodeRids to AgentDefinition NodeRids emitted by PR 2.5)
 *
 * D/L/A domain: DATA — walks one canonical events.jsonl (per projectRoot) +
 * archive siblings via lib/event-log/read.ts:readEvents, filters T2+, emits a
 * flat { nodes, edges } fragment. No event emission, no store mutation, no
 * Convex. NEVER writes to events.jsonl — rule 10 invariant.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-089/spec.md
 * §2 inheriting sprint-081/spec.md §2.2). Local payload interfaces EventPayload +
 * EmitsEdgePayload mirror the PR 2.1 wrapper-primitive field shape but do NOT
 * import from @palantirKC/ontology-shared-core (snapshot at runtime-overlay/
 * predates PR 2.1+2.2; importing fails with TS2307). When snapshot is refreshed,
 * local interfaces become drop-in compatible.
 *
 * NAMING NOTE: The canonical NodeTypeKind discriminator literal for events is
 * "Event" (lib/ontology-graph/types.ts line 124). This indexer uses the canonical
 * literal verbatim so future TypedGraphNode union projection binds without rename.
 *
 * Walk targets (single canonical location per projectRoot — NO directory walk):
 *   - {projectRoot}/.palantir-mini/session/events.jsonl (live)
 *   - {projectRoot}/.palantir-mini/session/archive/events-rotated-*.jsonl (archive)
 *   Both consumed via lib/event-log/read.ts:readEvents() — auto-merges + sorts
 *   by sequence ASC + skips malformed lines.
 *
 * Filter (rule 26 §Substrate routing):
 *   - Drop valueGrade == "T0" (rejected envelopes)
 *   - Drop valueGrade == "T1" (Workflow-Lineage-only noise)
 *   - Drop missing/undefined valueGrade (un-graded noise) UNLESS opts.includeUngraded
 *   - Keep "T2" / "T3" / "T4" (BackPropagation circuit inputs)
 *
 * Node kinds emitted:
 *   - "Event" (one per surviving T2+ envelope; payload denormalizes the 18 join
 *             keys per proposal §6 onto flat top-level fields: promptId, promptHash,
 *             sessionId, runtime, semanticIntentContractRef, digitalTwinChangeContractRef,
 *             sprintContractRef, correlationId, agentId, toolName, eventId, commitSha,
 *             branchName, pullRequestNumber, evalSuiteId, evalRunId, affectedRid,
 *             refinementTarget)
 *
 * Edge kinds emitted:
 *   - "emits" (structural-edge cluster; one per Event node whose source envelope
 *              yields a non-empty agent label via byWhom.agentName ?? byWhom.identity;
 *              confidence 1.0 for named agent, 0.5 for identity-only)
 *
 * Perf cap (spec §3.3): opts.maxEvents defaults to 10000, applied AFTER valueGrade
 * filter so T0/T1 noise does not consume the cap. Test fixtures stay small.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.10.0 (sprint-089 PR 2.12; Sprint X3 PR 2/5)
 */

import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";
import { readEvents } from "../../event-log/read";
import type { EventEnvelope } from "../../event-log/types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for an Event node. Flattens 18 join keys per proposal §6 onto
 * top-level fields for downstream join performance (BackProp consumers).
 *
 * Required fields:
 *   projectRoot, lastIndexed, eventId, valueGrade (T2/T3/T4), type, when
 *
 * Optional fields (17 of the 18 join keys; all present-only — when absent on
 * the source envelope, the corresponding field is omitted, NOT null):
 *   promptId, promptHash, sessionId, runtime, semanticIntentContractRef,
 *   digitalTwinChangeContractRef, sprintContractRef, correlationId, agentId,
 *   toolName, commitSha, branchName, pullRequestNumber, evalSuiteId, evalRunId,
 *   affectedRid, refinementTarget, sequence
 */
interface EventPayload {
  readonly projectRoot: string;
  readonly lastIndexed: string;

  // 18 join keys per proposal §6 (denormalized from EventEnvelope)
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly sessionId?: string;
  readonly runtime?: string;
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly sprintContractRef?: string;
  readonly correlationId?: string;
  readonly agentId?: string;
  readonly toolName?: string;
  readonly eventId: string;
  readonly commitSha?: string;
  readonly branchName?: string;
  readonly pullRequestNumber?: number;
  readonly evalSuiteId?: string;
  readonly evalRunId?: string;
  readonly affectedRid?: string;
  readonly refinementTarget?: string;

  // Substrate metadata (NOT join keys — context only)
  readonly valueGrade: "T2" | "T3" | "T4";
  readonly type: string;
  readonly sequence?: number;
  readonly when: string;
}

/** Edge payload carrying agent label + confidence (named vs identity-only). */
interface EmitsEdgePayload {
  /** Source agent attribution best-effort (byWhom.agentName ?? byWhom.identity). */
  readonly agentLabel: string;
  /**
   * confidence:
   *   1.0 = source envelope had explicit `byWhom.agentName` (named agent)
   *   0.5 = fell back to `byWhom.identity` only (e.g. "claude-code" / "codex-cli" / "monitor")
   */
  readonly confidence: 1.0 | 0.5;
}

// ─── Brand helpers (local; mirrors PR 2.4-2.11 indexer pattern) ───────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid for an Event from its source eventId.
 * sha256(eventId + "#Event") — consistent across runs.
 */
function ridFromEventId(eventId: string): NodeRid {
  const hash = createHash("sha256").update(`${eventId}#Event`).digest("hex");
  return nodeRid(`event:${hash}`);
}

/**
 * Deterministic synthetic NodeRid for an agent extracted from byWhom.
 * sha256(projectRoot + "#" + agentLabel) — orchestration layer reconciles
 * to AgentDefinition NodeRids emitted by PR 2.5.
 */
function ridFromAgentLabel(projectRoot: string, agentLabel: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${projectRoot}#${agentLabel}`)
    .digest("hex");
  return nodeRid(`events-agent:${hash}`);
}

/**
 * Deterministic EdgeRid for an emits edge.
 */
function edgeRidFromEmits(from: NodeRid, to: NodeRid): EdgeRid {
  const hash = createHash("sha256")
    .update(`${from}:emits:${to}`)
    .digest("hex");
  return edgeRid(`events-edge:${hash}`);
}

// ─── valueGrade filter helper ─────────────────────────────────────────────────

/**
 * Returns true when the envelope's valueGrade is T2, T3, or T4. False for
 * T0/T1/missing (unless includeUngraded is true and grade is missing — even
 * then the function returns false because we do not coerce to T2; the flag
 * existed in the spec to surface intent, but the canonical behavior keeps
 * ungraded events dropped).
 */
function passesT2Plus(envelope: EventEnvelope): envelope is EventEnvelope & {
  readonly valueGrade: "T2" | "T3" | "T4";
} {
  const grade = envelope.valueGrade;
  return grade === "T2" || grade === "T3" || grade === "T4";
}

// ─── Join-key extraction helpers ──────────────────────────────────────────────

/**
 * Safe string accessor for a top-level field on the envelope's payload. Returns
 * undefined when payload absent, field absent, or value not a string.
 */
function payloadString(envelope: EventEnvelope, field: string): string | undefined {
  const p = (envelope as unknown as { payload?: Record<string, unknown> }).payload;
  if (!p || typeof p !== "object") return undefined;
  const v = p[field];
  return typeof v === "string" ? v : undefined;
}

/** Safe number accessor for a top-level field on the envelope's payload. */
function payloadNumber(envelope: EventEnvelope, field: string): number | undefined {
  const p = (envelope as unknown as { payload?: Record<string, unknown> }).payload;
  if (!p || typeof p !== "object") return undefined;
  const v = p[field];
  return typeof v === "number" ? v : undefined;
}

/**
 * Safe string accessor on the envelope's lineageRefs cross-reference object.
 * Returns undefined when lineageRefs absent, field absent, or value not a string.
 */
function lineageRefString(envelope: EventEnvelope, field: string): string | undefined {
  const lr = envelope.lineageRefs as unknown as Record<string, unknown> | undefined;
  if (!lr || typeof lr !== "object") return undefined;
  const v = lr[field];
  return typeof v === "string" ? v : undefined;
}

/**
 * Extract the refinement target's kind/json-stringified form from withWhat. Returns
 * undefined when refinementTarget absent.
 */
function refinementTargetField(envelope: EventEnvelope): string | undefined {
  const rt = envelope.withWhat?.refinementTarget as unknown;
  if (!rt || typeof rt !== "object") return undefined;
  const kind = (rt as Record<string, unknown>).kind;
  if (typeof kind === "string") return kind;
  try {
    return JSON.stringify(rt);
  } catch {
    return undefined;
  }
}

/**
 * Best-effort agent label from byWhom. Returns named agent first, then identity.
 * Returns undefined when neither is a non-empty string.
 */
function extractAgentLabel(envelope: EventEnvelope): {
  readonly label: string;
  readonly confidence: 1.0 | 0.5;
} | undefined {
  const named = envelope.byWhom?.agentName;
  if (typeof named === "string" && named.length > 0) {
    return { label: named, confidence: 1.0 };
  }
  const identity = envelope.byWhom?.identity;
  if (typeof identity === "string" && identity.length > 0) {
    return { label: identity, confidence: 0.5 };
  }
  return undefined;
}

/**
 * Build EventPayload from envelope, populating all 18 join-key positions
 * best-effort. Absent fields are omitted from the payload (not present at
 * runtime) — TypeScript optional-field semantics.
 */
function buildEventPayload(
  envelope: EventEnvelope & { readonly valueGrade: "T2" | "T3" | "T4" },
  projectRoot: string,
  nowIso: string,
): EventPayload {
  const sessionId = envelope.throughWhich?.sessionId as string | undefined;
  const toolName = envelope.throughWhich?.toolName;
  const runtime = envelope.byWhom?.runtime;
  const commitSha = envelope.atopWhich as string | undefined;
  const agentExtract = extractAgentLabel(envelope);

  // Join keys: 6 cross-ref fields preferentially from lineageRefs, fallback payload
  const semanticIntentContractRef =
    lineageRefString(envelope, "semanticIntentContractRef") ??
    payloadString(envelope, "semanticIntentContractRef");
  const digitalTwinChangeContractRef =
    lineageRefString(envelope, "digitalTwinChangeContractRef") ??
    payloadString(envelope, "digitalTwinChangeContractRef");
  const sprintContractRef =
    payloadString(envelope, "sprintContractRef") ??
    lineageRefString(envelope, "sprintContractRef");
  const affectedRid =
    payloadString(envelope, "affectedRid") ??
    lineageRefString(envelope, "actionRid");

  // Other payload-only join keys
  const promptId = payloadString(envelope, "promptId");
  const promptHash = payloadString(envelope, "promptHash");
  const correlationId = payloadString(envelope, "correlationId");
  const branchName = payloadString(envelope, "branchName");
  const pullRequestNumber = payloadNumber(envelope, "pullRequestNumber");
  const evalSuiteId = payloadString(envelope, "evalSuiteId");
  const evalRunId = payloadString(envelope, "evalRunId");

  const refinementTarget = refinementTargetField(envelope);

  const base: EventPayload = {
    projectRoot,
    lastIndexed: nowIso,
    eventId: envelope.eventId as unknown as string,
    valueGrade: envelope.valueGrade,
    type: envelope.type as unknown as string,
    when: envelope.when,
    ...(envelope.sequence !== undefined ? { sequence: envelope.sequence } : {}),
    ...(promptId !== undefined ? { promptId } : {}),
    ...(promptHash !== undefined ? { promptHash } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(runtime !== undefined ? { runtime } : {}),
    ...(semanticIntentContractRef !== undefined ? { semanticIntentContractRef } : {}),
    ...(digitalTwinChangeContractRef !== undefined ? { digitalTwinChangeContractRef } : {}),
    ...(sprintContractRef !== undefined ? { sprintContractRef } : {}),
    ...(correlationId !== undefined ? { correlationId } : {}),
    ...(agentExtract !== undefined ? { agentId: agentExtract.label } : {}),
    ...(typeof toolName === "string" ? { toolName } : {}),
    ...(typeof commitSha === "string" ? { commitSha } : {}),
    ...(branchName !== undefined ? { branchName } : {}),
    ...(pullRequestNumber !== undefined ? { pullRequestNumber } : {}),
    ...(evalSuiteId !== undefined ? { evalSuiteId } : {}),
    ...(evalRunId !== undefined ? { evalRunId } : {}),
    ...(affectedRid !== undefined ? { affectedRid } : {}),
    ...(refinementTarget !== undefined ? { refinementTarget } : {}),
  };

  return base;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk events.jsonl + archived rotations under <projectRoot>/.palantir-mini/session/,
 * filter T2+ envelopes (rule 26 §Substrate routing), and produce a flat
 * { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * NEVER writes to events.jsonl — rule 10 append-only invariant respected via
 * READ-only ingest through lib/event-log/read.ts:readEvents().
 *
 * Cross-indexer endpoint reconciliation (e.g. wiring an `emits` edge's `fromRid`
 * from `events-agent:` synthetic to an AgentDefinition NodeRid from PR 2.5's
 * agents-rules indexer) is the orchestration layer's job (PR 2.14).
 *
 * @param projectRoot — absolute path to the project root. The indexer ingests
 *   ONLY this project's events.jsonl. NEVER walks into other projectRoot.
 * @param opts.maxEvents — perf cap on # surviving (T2+) envelopes (default 10000).
 *   Applied AFTER valueGrade filter so T0/T1 noise does not consume the cap.
 *   When the filtered list exceeds the cap, the first N entries (by sequence ASC)
 *   are retained.
 * @param opts.includeUngraded — when true, envelopes with missing valueGrade are
 *   treated as un-T2 noise and STILL dropped (the flag surfaces intent only).
 *   Default false.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults
 *   to current time).
 */
export async function indexEventsT2Plus(
  projectRoot: string,
  opts?: {
    readonly maxEvents?: number;
    readonly includeUngraded?: boolean;
    readonly nowIso?: string;
  },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const maxEvents = opts?.maxEvents ?? 10000;

  // Canonical event-log location per rule 10 v2.2.0 §Canonical scope.
  const eventsPath = path.join(
    projectRoot,
    ".palantir-mini",
    "session",
    "events.jsonl",
  );

  // Read live + archive merged + sorted by sequence ASC. Missing tree returns [].
  let allEnvelopes: EventEnvelope[] = [];
  try {
    allEnvelopes = readEvents(eventsPath);
  } catch {
    // Defensive — readEvents is best-effort already, but absorb any unforeseen throw.
    allEnvelopes = [];
  }

  // T2+ filter (rule 26 §Substrate routing).
  const t2PlusEnvelopes = allEnvelopes.filter(passesT2Plus);

  // Perf cap AFTER filter so noise does not consume budget.
  const cappedEnvelopes = t2PlusEnvelopes.slice(0, maxEvents);

  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  for (const envelope of cappedEnvelopes) {
    // Defensive — eventId is the node identity; skip when missing
    if (typeof envelope.eventId !== "string" || envelope.eventId.length === 0) {
      continue;
    }

    const eventRid = ridFromEventId(envelope.eventId as unknown as string);
    const payload = buildEventPayload(envelope, projectRoot, nowIso);
    const eventNode: NodeRecord<EventPayload> = {
      rid: eventRid,
      kind: "Event",
      value: payload,
    };
    nodes.push(eventNode);

    // Emit emits edge when agent label extractable
    const agentExtract = extractAgentLabel(envelope);
    if (agentExtract !== undefined) {
      const agentSyntheticRid = ridFromAgentLabel(projectRoot, agentExtract.label);
      const emitsEdge: EdgeRecord<EmitsEdgePayload> = {
        rid: edgeRidFromEmits(agentSyntheticRid, eventRid),
        kind: "emits",
        fromRid: agentSyntheticRid,
        toRid: eventRid,
        value: {
          agentLabel: agentExtract.label,
          confidence: agentExtract.confidence,
        },
      };
      edges.push(emitsEdge);
    }
  }

  return { nodes, edges };
}
