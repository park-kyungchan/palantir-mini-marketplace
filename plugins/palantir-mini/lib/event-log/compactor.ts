/**
 * palantir-mini — Events compactor for repeated low-value runs
 * Sprint-105 PR 4.3 — canonical plan v2 §4 row 4.3
 *
 * SOURCE EVENTS ARE NEVER MUTATED (rule 10 §append-only).
 * Emits `events_summarized` envelopes (schemas v1.66.0) as NEW appends.
 */
import type { EventEnvelope, EventType, EventsSummarizedEnvelope, ValidationPhaseCompletedEnvelope } from "./types";
import { eventId, sessionId, commitSha } from "./types";

export const DEFAULT_COMPACTION_TYPES: readonly EventType[] = [
  "validation_phase_completed",
  "tool_invocation_completed",
] as const;

export const DEFAULT_THRESHOLD = 10;

export interface CompactionOptions {
  threshold?: number;
  allowlist?: readonly EventType[];
  maxRuns?: number;
  validationPassedOnly?: boolean;
}

export interface SummarizableRun {
  type: EventType;
  events: EventEnvelope[];
  firstSeq: number;
  lastSeq: number;
  firstAt: string;
  lastAt: string;
  startIndex: number;
  endIndex: number;
}

function isEligible(event: EventEnvelope, opts: Required<CompactionOptions>): boolean {
  if (!opts.allowlist.includes(event.type)) return false;
  if (event.type === "events_summarized") return false;
  if (event.type === "validation_phase_completed" && opts.validationPassedOnly) {
    const payload = (event as ValidationPhaseCompletedEnvelope).payload;
    if (!payload || payload.passed !== true) return false;
  }
  return true;
}

export function findSummarizableRuns(
  events: readonly EventEnvelope[],
  opts: CompactionOptions = {},
): SummarizableRun[] {
  const threshold            = opts.threshold ?? DEFAULT_THRESHOLD;
  const allowlist            = opts.allowlist ?? DEFAULT_COMPACTION_TYPES;
  const maxRuns              = opts.maxRuns ?? Infinity;
  const validationPassedOnly = opts.validationPassedOnly ?? true;
  const resolvedOpts: Required<CompactionOptions> = { threshold, allowlist, maxRuns, validationPassedOnly };

  const runs: SummarizableRun[] = [];
  const n = events.length;
  let i = 0;

  while (i < n && runs.length < maxRuns) {
    const ev = events[i]!;
    if (!isEligible(ev, resolvedOpts)) { i++; continue; }

    const runType = ev.type;
    let j = i + 1;
    while (j < n && events[j]!.type === runType && isEligible(events[j]!, resolvedOpts)) { j++; }

    const runLength = j - i;
    if (runLength >= threshold) {
      const runEvents = events.slice(i, j) as EventEnvelope[];
      const first = runEvents[0]!;
      const last  = runEvents[runEvents.length - 1]!;
      runs.push({ type: runType, events: runEvents, firstSeq: first.sequence ?? 0,
        lastSeq: last.sequence ?? 0, firstAt: first.when, lastAt: last.when,
        startIndex: i, endIndex: j - 1 });
      i = j;
    } else { i++; }
  }
  return runs;
}

export function synthesizeSummaryEnvelope(
  run: SummarizableRun,
  opts: { atopWhich: string; sessionId?: string; cwd?: string; threshold?: number } = { atopWhich: "unknown" },
): Omit<EventsSummarizedEnvelope, "sequence"> {
  const { events, type, firstSeq, lastSeq, firstAt, lastAt } = run;
  const count     = events.length;
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const firstThree = events.slice(0, 3).map((e) => (e as { payload?: unknown }).payload);
  const lastOne    = (events[events.length - 1] as { payload?: unknown }).payload;
  const sampledPayloads: unknown[] = count <= 3 ? firstThree : [...firstThree, lastOne];
  const reasoning =
    `Compacted ${count} consecutive ${type} events (seqs ${firstSeq}-${lastSeq}) ` +
    `per canonical plan v2 §4 row 4.3 (rule 10 append-only; rule 26 §T0/T1 retention). ` +
    `Threshold=${threshold}. Source events immutable.`;
  const now = new Date().toISOString();
  return {
    type: "events_summarized",
    eventId: eventId(`compactor-${type}-${firstSeq}-${lastSeq}-${Date.now()}`),
    when: now,
    atopWhich: commitSha(opts.atopWhich),
    throughWhich: { sessionId: sessionId(opts.sessionId ?? "compactor-job"), toolName: "run-compactor", cwd: opts.cwd ?? process.cwd(), surface: "cli" },
    byWhom: { identity: "claude-code", agentName: "compactor-job" },
    withWhat: { reasoning },
    payload: { summarizedType: type, count, firstSeq, lastSeq, firstAt, lastAt, sampledPayloads, threshold },
    propagationDepth: 4,
  };
}
