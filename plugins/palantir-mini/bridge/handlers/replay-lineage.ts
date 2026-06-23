// palantir-mini v6.55.0 — MCP tool handler: replay_lineage
// Domain: LEARN (LineageReplay — prim-learn-04)
//
// BackwardProp via replay. Deterministic filter over events.jsonl by the
// 5-dim Decision Lineage query. Returns matching events + a derived state
// snapshot + a compact lineage graph.
//
// v3.13.0+ crystalline-resilient-narwhal P-EXTRA: optional `projectSlug`
// post-filter for cross-project audit clarity. Matches against
// payload.projectSlug (when present, e.g. on sprint_contract_bound /
// sprint_completed / sprint_contract_dissent_preserved envelopes) OR
// derives slug from `project` arg basename for legacy events.
//
// B.W2.c (sprint-061): optional `verbose` param (default false).
// When verbose=true, T3+ events are formatted as human-readable markdown blocks
// instead of raw JSON dump, enabling post-hoc audit readability.
// Back-compat: verbose=false preserves existing raw-JSON behavior.
//
// PR 4.7 (sprint-109): default path prefers promoted-index (T3+ grade filter).
// Pass includeLegacyRaw=true to fall back to full raw scan via readEvents.

import * as path from "path";
import { replayLineage, type LineageFilter, type ReplayResult } from "../../lib/event-log/replay";
import { foldToSnapshot, foldDecisionRecords } from "../../lib/event-log/read";
import { readPromotedEvents } from "../../lib/event-log/promoted-index";
import { deriveProjectSlug } from "../../lib/project/slug";
import type { EventEnvelope, EventSnapshot, DecisionRecord } from "../../lib/event-log/types";

interface ReplayLineageArgs {
  project: string;
  filter?: LineageFilter;
  /**
   * v3.13.0+ — Optional project slug post-filter
   * (crystalline-resilient-narwhal P-EXTRA, 2026-05-01).
   * Matches payload.projectSlug exactly when present, else falls back to
   * deriveProjectSlug(args.project) basename comparison. Used to scope
   * cross-project results when the same events.jsonl was federated across
   * projects (rare today; reserved for future).
   */
  projectSlug?: string;
  /**
   * B.W2.c — verbose mode (default false).
   * When true, T3+ filtered events are formatted as readable markdown blocks
   * instead of raw JSON. Preserves raw-JSON mode when false (back-compat).
   */
  verbose?: boolean;
  /**
   * PR-10 — OntologyWorkflowTrace ID filter.
   * When provided, only events whose payload.traceId === traceId are returned.
   * Enables per-trace lifecycle replay: open → transitions → close.
   * Additive: existing behavior unchanged when traceId absent.
   */
  traceId?: string;
  /**
   * PR 4.7 — When true, skip the promoted-index path and fall back to a full
   * raw scan of events.jsonl + archives via readEvents (legacy behaviour).
   * Default false (promoted-index preferred; T3+ grade filter applied).
   */
  includeLegacyRaw?: boolean;
  /**
   * EFFORT-A (b) — Optional cap on the folded `decisionRecords` projection
   * (default DECISION_RECORDS_DEFAULT_LIMIT = 200). Bounds an otherwise
   * unbounded read so a long window cannot blow up the response. The slice is
   * post-fold (only the projection is capped; `derivedState`/`lineageGraph`/
   * the raw `events` stream are unaffected). When the fold produced more than
   * the limit, `decisionRecordsTruncated` is set true. Additive + non-breaking:
   * absent ⇒ the 200 default, which preserves current behaviour for any window
   * with ≤200 decision records.
   */
  decisionRecordsLimit?: number;
}

interface ReplayLineageResult extends ReplayResult {
  derivedState: EventSnapshot;
  lineageGraph: Array<{
    sequence: number;
    eventType: EventEnvelope["type"];
    when: string;
    byWhom: string;
    impactedObjects: string[];
  }>;
  /**
   * B.W2.c — populated when verbose=true.
   * Human-readable markdown blocks for T3+ events.
   * undefined when verbose=false (back-compat).
   */
  verboseMarkdown?: string;
  /**
   * P1-13 — bound D+L+A+S DecisionRecords folded from the SAME filtered stream
   * that feeds `derivedState`/`lineageGraph`. The replay path is the BackwardProp
   * lineage read, so it is the natural production consumer of `foldDecisionRecords`:
   * each `edit_proposed` (Logic + staged edit) bound to its `edit_committed`
   * (Action + Security + Data) surfaces as ONE meaning-bearing decision instead of
   * the unlinked propose/commit rows in `events`. Additive + non-breaking: a pure
   * read derived from `postFilteredEvents`; empty `[]` when the window carries no
   * propose/commit rows. (decision-model.md + approval-and-lineage.md.)
   *
   * EFFORT-A (b) — bounded by `decisionRecordsLimit` (default 200). When the
   * underlying fold produced MORE records than the cap, this array is the
   * `.slice(0, limit)` head and `decisionRecordsTruncated` is true.
   */
  decisionRecords: DecisionRecord[];
  /**
   * EFFORT-A (b) — true when the folded decision set exceeded
   * `decisionRecordsLimit` and `decisionRecords` was capped. false otherwise
   * (including the empty `[]` case). Lets callers know the list is a head, not
   * the complete decision set for the window.
   */
  decisionRecordsTruncated: boolean;
}

/**
 * EFFORT-A (b) — default cap for the folded `decisionRecords` projection.
 * Bounds an otherwise unbounded read; overridable per-call via
 * `decisionRecordsLimit`.
 */
const DECISION_RECORDS_DEFAULT_LIMIT = 200;

// ── B.W2.c: T3+ verbose formatter ────────────────────────────────────────

/**
 * Determine the value grade of an event envelope.
 * T3+ requires: A-axis full (5-dim) + B-axis (outcome-paired / rubric /
 * hypothesis) + C-axis (LEARN-mapped refinement). We conservatively identify
 * T3+ by the presence of withWhat.reasoning with ≥40 chars AND either a
 * refinementTarget or a hypothesis (rule 26 §Grading T3 criteria subset).
 */
function isT3Plus(ev: EventEnvelope): boolean {
  // Prefer the explicit valueGrade field when present (auto-assigned by value-grade-assigner)
  const grade = (ev as unknown as { valueGrade?: string }).valueGrade;
  if (grade !== undefined) {
    return grade === "T3" || grade === "T4";
  }
  // Fallback heuristic: reasoning ≥40 chars + hypothesis or refinementTarget
  const ww = ev.withWhat;
  if (!ww) return false;
  const hasReasoning = typeof ww.reasoning === "string" && ww.reasoning.length >= 40;
  const hasHypothesis = typeof ww.hypothesis === "string" && ww.hypothesis.length > 0;
  const hasRefinement = ww.refinementTarget !== undefined;
  return hasReasoning && (hasHypothesis || hasRefinement);
}

/**
 * Format a single T3+ event as a readable markdown block (B.W2.c).
 * Block shape:
 * ## Event {eventId} @ {when} (T3, {byWhom.identity})
 *   - decision: {withWhat.reasoning}
 *   - hypothesis: {withWhat.hypothesis}
 *   - refinementTarget: {kind}:{rid}
 *   - lineageRefs: {count}
 */
function formatT3EventMarkdown(ev: EventEnvelope): string {
  const identity = ev.byWhom?.identity ?? "unknown";
  const grade = (ev as unknown as { valueGrade?: string }).valueGrade ?? "T3";
  const lines: string[] = [
    `## Event ${ev.eventId} @ ${ev.when} (${grade}, ${identity})`,
  ];

  const ww = ev.withWhat;
  if (ww?.reasoning) {
    lines.push(`  - decision: ${ww.reasoning}`);
  }
  if (ww?.hypothesis) {
    lines.push(`  - hypothesis: ${ww.hypothesis}`);
  }
  if (ww?.refinementTarget) {
    const rt = ww.refinementTarget as { kind?: string; filePathOrRid?: string };
    const kind = rt.kind ?? "unknown";
    const rid  = rt.filePathOrRid ?? "unknown";
    lines.push(`  - refinementTarget: ${kind}:${rid}`);
  }
  const lineageRefs = (ev as unknown as { lineageRefs?: unknown }).lineageRefs;
  if (lineageRefs && typeof lineageRefs === "object") {
    const count = Object.keys(lineageRefs).filter(
      (k) => (lineageRefs as Record<string, unknown>)[k] !== undefined,
    ).length;
    lines.push(`  - lineageRefs: ${count}`);
  } else {
    lines.push(`  - lineageRefs: 0`);
  }

  return lines.join("\n");
}

/**
 * Build a verbose markdown report for T3+ events in the replay result.
 * Returns undefined when no T3+ events exist in the filtered set.
 */
function buildVerboseMarkdown(events: EventEnvelope[]): string | undefined {
  const t3Plus = events.filter(isT3Plus);
  if (t3Plus.length === 0) return undefined;
  const blocks = t3Plus.map(formatT3EventMarkdown);
  return `# T3+ Decision Lineage (${t3Plus.length} events)\n\n` + blocks.join("\n\n");
}

// FOLD-1 note: this `.map(e => e.rid)` is intentionally rid-graph-only — it
// builds the lineageGraph's impacted-rid list for display, NOT the meaning-
// bearing fold. The committed declarations flow through `derivedState =
// foldToSnapshot(...)` (registeredPrimitives now carry declarations); get_ontology
// is the sole meaning read. Keep this list as bare rids.
function impactedObjectsOf(ev: EventEnvelope): string[] {
  switch (ev.type) {
    case "edit_proposed":   return Array.isArray(ev.payload?.hypotheticalEdits) ? ev.payload.hypotheticalEdits.map((e) => e.rid) : [];
    case "edit_committed":  return Array.isArray(ev.payload?.appliedEdits) ? ev.payload.appliedEdits.map((e) => e.rid) : [];
    case "drift_detected":  return ev.payload?.affectedObjectType ? [ev.payload.affectedObjectType] : [];
    case "codegen_started":
    case "codegen_completed": return ev.payload?.targetProject ? [ev.payload.targetProject] : [];
    default: return [];
  }
}

/**
 * v3.13.0+ crystalline-resilient-narwhal — slug-based event post-filter.
 * Returns true when the event matches the requested slug, OR when the event
 * carries no slug AND the requested slug equals the project basename slug
 * (legacy fallback for events emitted before crystalline-resilient-narwhal).
 */
function eventMatchesSlug(ev: EventEnvelope, requestedSlug: string, fallbackSlug: string): boolean {
  const payloadSlug = (ev.payload as { projectSlug?: string }).projectSlug;
  if (typeof payloadSlug === "string" && payloadSlug.length > 0) {
    return payloadSlug === requestedSlug;
  }
  // Legacy event without explicit slug → match against fallback (project basename).
  return requestedSlug === fallbackSlug;
}

export default async function replayLineageHandler(rawArgs: unknown): Promise<ReplayLineageResult> {
  const args = (rawArgs ?? {}) as ReplayLineageArgs;
  if (!args.project || typeof args.project !== "string") throw new Error("replay_lineage: `project` required");

  const sessionDir   = path.join(args.project, ".palantir-mini", "session");
  const eventsPath   = path.join(sessionDir, "events.jsonl");
  const filter       = args.filter ?? {};
  const useLegacyRaw = args.includeLegacyRaw === true;

  // PR 4.7: always run replayLineage for the 5-dim filter logic. On the
  // promoted-index path, intersect the 5-dim-filtered result with the T3+
  // promoted set. On the raw path, take all 5-dim-filtered events as-is.
  const result = replayLineage(eventsPath, filter);

  let baseEvents: EventEnvelope[];
  if (useLegacyRaw) {
    baseEvents = result.events;
  } else {
    const promoted   = readPromotedEvents({ sessionDir, gradeFilter: "T3+" });
    const promotedIds = new Set(promoted.events.map((e) => e.eventId));
    // Graceful fallback: when promoted set is empty (no T3+ events yet),
    // use all 5-dim-filtered events so callers always get a response.
    baseEvents = promoted.events.length > 0
      ? result.events.filter((e) => promotedIds.has(e.eventId))
      : result.events;
  }

  // v3.13.0+ optional slug post-filter (crystalline-resilient-narwhal P-EXTRA).
  let postFilteredEvents = baseEvents;
  if (typeof args.projectSlug === "string" && args.projectSlug.length > 0) {
    const fallbackSlug = deriveProjectSlug(args.project);
    postFilteredEvents = baseEvents.filter((ev) =>
      eventMatchesSlug(ev, args.projectSlug as string, fallbackSlug),
    );
  }

  // PR-10 — OntologyWorkflowTrace traceId filter (additive; back-compat when absent).
  if (typeof args.traceId === "string" && args.traceId.length > 0) {
    postFilteredEvents = postFilteredEvents.filter((ev) => {
      const payloadTraceId = (ev.payload as { traceId?: string }).traceId;
      return payloadTraceId === args.traceId;
    });
  }

  const derivedState = foldToSnapshot(postFilteredEvents);

  // P1-13 — fold the SAME filtered stream into bound D+L+A+S DecisionRecords so a
  // lineage replay surfaces each decision as one united Logic⇄Action+Data+Security
  // unit (not the raw, unlinked propose/commit rows in `events`). Pure read.
  //
  // EFFORT-A (b) — bound the projection: a long window could otherwise fold an
  // unbounded list into the response. Cap post-fold via `.slice(0, limit)` and
  // flag truncation so callers know the list is a head, not the full set.
  const decisionRecordsLimit =
    typeof args.decisionRecordsLimit === "number" && args.decisionRecordsLimit >= 0
      ? args.decisionRecordsLimit
      : DECISION_RECORDS_DEFAULT_LIMIT;
  const allDecisionRecords = foldDecisionRecords(postFilteredEvents);
  const decisionRecords = allDecisionRecords.slice(0, decisionRecordsLimit);
  const decisionRecordsTruncated = allDecisionRecords.length > decisionRecordsLimit;

  const lineageGraph = postFilteredEvents.map((ev) => ({
    sequence:  ev.sequence,
    eventType: ev.type,
    when:      ev.when,
    // Defense-in-depth optional chaining mirrors pm-workflow-lineage-query
    // graph-builder; multi-project-reader chokepoint should have already
    // filtered byWhom-less events, but archive-only callers may bypass.
    byWhom:    ev.byWhom?.agentName ?? ev.byWhom?.identity ?? "unknown",
    impactedObjects: impactedObjectsOf(ev),
  }));

  // B.W2.c: verbose mode — build T3+ markdown blocks when requested.
  const verboseMarkdown = args.verbose === true
    ? buildVerboseMarkdown(postFilteredEvents)
    : undefined;

  return {
    ...result,
    events: postFilteredEvents,
    matched: postFilteredEvents.length,
    derivedState,
    decisionRecords,
    decisionRecordsTruncated,
    lineageGraph,
    ...(verboseMarkdown !== undefined ? { verboseMarkdown } : {}),
  };
}
