// palantir-mini v6.55.0 — MCP tool handler: pm_retro_query
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog — retrospective view)
//
// Aggregates session retrospective metrics from events.jsonl:
//   - sessionMinutes         — wall-clock between session_started and now/session_ended
//   - phaseCompletedCount    — # of phase_completed events
//   - skillsRun              — per-skill count + avg duration
//   - byAgent?               — optional agent-bucketed event counts
//   - staleReplayCount       — task_assignment inbox messages duplicated after TaskCompleted
//
// Authority chain: plans/luminous-wondering-kettle.md §Wave 1
//                  rules/10-events-jsonl.md (read-only)
//
// PR 4.7 (sprint-109): default path prefers promoted-index (T3+ grade filter).
// Pass includeLegacyRaw=true to fall back to full raw scan via readEvents.

import { readEvents } from "../../lib/event-log/read";
import { readPromotedEvents } from "../../lib/event-log/promoted-index";
import type { EventEnvelope } from "../../lib/event-log/types";
import { eventsPathFor } from "../../scripts/log";

interface PmRetroQueryArgs {
  projectRoot?: string;
  /** N-from-end session boundary. Default 1 = most recent session window. */
  sessionLast?: number;
  /** Include byAgent bucketing. Default false. */
  byAgent?:     boolean;
  /**
   * PR 4.7 — When true, skip the promoted-index path and perform a full raw
   * scan of events.jsonl + archives. Default false (promoted-index T3+).
   */
  includeLegacyRaw?: boolean;
}

interface SkillRunStat {
  skill:         string;
  count:         number;
  avgDurationMs: number;
}

interface PmRetroQueryResult {
  sessionMinutes:      number;
  phaseCompletedCount: number;
  skillsRun:           SkillRunStat[];
  byAgent?:            Record<string, number>;
  staleReplayCount:    number;
}

/** Slice events to the Nth-from-end session window. */
function sliceToSessionWindow(
  events: EventEnvelope[],
  sessionLast: number,
): EventEnvelope[] {
  // Find indices of session_started events in order
  const startIdxs: number[] = [];
  for (let i = 0; i < events.length; i++) {
    if (events[i]?.type === "session_started") startIdxs.push(i);
  }
  if (startIdxs.length === 0) return events;

  // sessionLast=1 → most recent session start
  const idxFromEnd = Math.max(1, sessionLast);
  const targetIdx  = startIdxs[startIdxs.length - idxFromEnd];
  if (targetIdx === undefined) return events;

  // Slice to end; if a later session_ended exists before next session_started,
  // it's fine — we take through log end, caller gets whatever occurred in that window.
  const nextStartInFuture = startIdxs.find((i) => i > targetIdx);
  const endIdx = nextStartInFuture ?? events.length;
  return events.slice(targetIdx, endIdx);
}

/** Compute elapsed minutes between first and last event in slice. */
function computeSessionMinutes(slice: EventEnvelope[]): number {
  if (slice.length === 0) return 0;
  const first = slice[0];
  const last  = slice[slice.length - 1];
  if (!first || !last) return 0;
  const firstMs = new Date(first.when).getTime();
  const lastMs  = new Date(last.when).getTime();
  if (isNaN(firstMs) || isNaN(lastMs)) return 0;
  const diffMs = Math.max(0, lastMs - firstMs);
  return Math.floor(diffMs / 60000);
}

/** Aggregate skill_started / skill_completed pairs into SkillRunStat[]. */
function computeSkillsRun(slice: EventEnvelope[]): SkillRunStat[] {
  const counts:    Record<string, number> = {};
  const durations: Record<string, number[]> = {};

  for (const ev of slice) {
    if (ev.type === "skill_started") {
      const name = ev.payload.skillName;
      counts[name] = (counts[name] ?? 0) + 1;
      if (!durations[name]) durations[name] = [];
    } else if (ev.type === "skill_completed") {
      const name = ev.payload.skillName;
      if (!durations[name]) durations[name] = [];
      (durations[name] as number[]).push(ev.payload.durationMs);
      // Still count started separately; skill_completed without started is unusual
      if (!(name in counts)) counts[name] = 0;
    }
  }

  const stats: SkillRunStat[] = [];
  for (const [skill, count] of Object.entries(counts)) {
    const samples = durations[skill] ?? [];
    const avg =
      samples.length === 0
        ? 0
        : Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    stats.push({ skill, count, avgDurationMs: avg });
  }
  stats.sort((a, b) => b.count - a.count);
  return stats;
}

/** Count stale task_assignment replays: task_assignment emitted after a TaskCompleted for same taskId. */
function computeStaleReplayCount(slice: EventEnvelope[]): number {
  // We look for inbox_cleaned + inbox_delivered patterns where a task_assignment
  // duplicate was replayed. Proxy signal: inbox_cleaned events with removedCount > 0
  // after the corresponding phase/task closure — contributes to stale replay count.
  let stale = 0;
  for (const ev of slice) {
    if (ev.type === "inbox_cleaned" && ev.payload.removedCount > 0) {
      stale += ev.payload.removedCount;
    }
  }
  return stale;
}

/** Build byAgent bucket from agentName in byWhom. */
function computeByAgent(slice: EventEnvelope[]): Record<string, number> {
  const bucket: Record<string, number> = {};
  for (const ev of slice) {
    const agent = ev.byWhom.agentName ?? ev.byWhom.identity;
    bucket[agent] = (bucket[agent] ?? 0) + 1;
  }
  return bucket;
}

export default async function pmRetroQuery(
  rawArgs: unknown,
): Promise<PmRetroQueryResult> {
  const args = (rawArgs ?? {}) as PmRetroQueryArgs;

  const projectRoot    = args.projectRoot ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const sessionLast    = typeof args.sessionLast === "number" && args.sessionLast > 0 ? args.sessionLast : 1;
  const includeByAgent = args.byAgent === true;
  const useLegacyRaw   = args.includeLegacyRaw === true;

  const eventsPath = eventsPathFor(projectRoot);

  // PR 4.7: default path uses promoted-index (T3+) for better signal quality.
  // Use includeLegacyRaw=true for full-coverage retros.
  let allEvents: EventEnvelope[];
  if (useLegacyRaw) {
    allEvents = readEvents(eventsPath);
  } else {
    const sessionDir = eventsPath.replace(/\/events\.jsonl$/, "");
    const promoted   = readPromotedEvents({ sessionDir, gradeFilter: "T3+" });
    // Graceful fallback: if no T3+ events, use raw scan so callers always get data.
    allEvents = promoted.events.length > 0 ? promoted.events : readEvents(eventsPath);
  }

  const slice      = sliceToSessionWindow(allEvents, sessionLast);

  const sessionMinutes      = computeSessionMinutes(slice);
  const phaseCompletedCount = slice.filter((e) => e.type === "phase_completed").length;
  const skillsRun           = computeSkillsRun(slice);
  const staleReplayCount    = computeStaleReplayCount(slice);

  const result: PmRetroQueryResult = {
    sessionMinutes,
    phaseCompletedCount,
    skillsRun,
    staleReplayCount,
  };
  if (includeByAgent) {
    result.byAgent = computeByAgent(slice);
  }
  return result;
}
