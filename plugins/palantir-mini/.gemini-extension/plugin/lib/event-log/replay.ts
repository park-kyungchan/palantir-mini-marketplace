/**
 * replay events.jsonl filtered by 5-dim Decision Lineage
 * @owner palantirkc-plugin-events
 * @purpose replay events.jsonl filtered by 5-dim Decision Lineage
 */
// palantir-mini v0 — replay events.jsonl filtered by 5-dim Decision Lineage
// Domain: LEARN (prim-learn-04 LineageReplay)
//
// Deterministic filter over the append-only event log. The 5-dim filter maps to
// Palantir Decision Lineage §DL-02: WHEN / ATOP_WHICH / THROUGH_WHICH / BY_WHOM / WITH_WHAT.
// Foundation for BackwardProp. Backing store for the `replay_lineage` MCP tool.

import { readEvents } from "./read";
import type { EventEnvelope, EventType } from "./types";

export interface LineageFilter {
  /** ATOP_WHICH — filter by CommitSha substring */
  atopWhich?: string;
  /** Range — sequence bounds (inclusive) */
  fromSequence?: number;
  toSequence?:   number;
  /** Event type filter — if set, only matching variants are returned */
  eventTypes?: EventType[];
  /** BY_WHOM — filter by identity or agentName substring */
  byWhom?: {
    identity?:  string;
    agentName?: string;
    teamName?:  string;
  };
  /** THROUGH_WHICH — filter by sessionId / toolName / cwd substring */
  throughWhich?: {
    sessionId?: string;
    toolName?:  string;
    cwd?:       string;
  };
  /** Temporal window on `when` (ISO8601) */
  whenFrom?: string;
  whenTo?:   string;
  /** Limit the result size */
  limit?: number;
}

function matchesFilter(ev: EventEnvelope, f: LineageFilter): boolean {
  if (f.fromSequence !== undefined && ev.sequence < f.fromSequence) return false;
  if (f.toSequence   !== undefined && ev.sequence > f.toSequence)   return false;

  if (f.eventTypes && f.eventTypes.length > 0 && !f.eventTypes.includes(ev.type)) return false;

  if (f.atopWhich && !(ev.atopWhich as string).includes(f.atopWhich)) return false;

  if (f.byWhom) {
    if (f.byWhom.identity  && ev.byWhom.identity  !== f.byWhom.identity)  return false;
    if (f.byWhom.agentName && ev.byWhom.agentName !== f.byWhom.agentName) return false;
    if (f.byWhom.teamName  && ev.byWhom.teamName  !== f.byWhom.teamName)  return false;
  }

  if (f.throughWhich) {
    if (f.throughWhich.sessionId && (ev.throughWhich.sessionId as string) !== f.throughWhich.sessionId) return false;
    if (f.throughWhich.toolName  && ev.throughWhich.toolName  !== f.throughWhich.toolName)               return false;
    if (f.throughWhich.cwd       && ev.throughWhich.cwd       !== f.throughWhich.cwd)                    return false;
  }

  if (f.whenFrom && ev.when < f.whenFrom) return false;
  if (f.whenTo   && ev.when > f.whenTo)   return false;

  return true;
}

export interface ReplayResult {
  events:      EventEnvelope[];
  totalScanned: number;
  matched:      number;
  filter:       LineageFilter;
}

/**
 * Replay the event log filtered by a Decision Lineage 5-dim query.
 * Returns matching events in append order.
 */
export function replayLineage(eventsPath: string, filter: LineageFilter): ReplayResult {
  const all = readEvents(eventsPath);
  const matched: EventEnvelope[] = [];
  for (const ev of all) {
    if (matchesFilter(ev, filter)) {
      matched.push(ev);
      if (filter.limit !== undefined && matched.length >= filter.limit) break;
    }
  }
  return {
    events:       matched,
    totalScanned: all.length,
    matched:      matched.length,
    filter,
  };
}
