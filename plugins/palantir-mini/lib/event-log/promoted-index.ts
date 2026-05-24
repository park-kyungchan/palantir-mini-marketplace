// palantir-mini v6.55.0 — lib/event-log/promoted-index.ts
//
// Grade-aware event reader that defaults to T3+ promoted events.
// Sits above frozen read.ts (PR 4.5/4.6). Delegates raw I/O to
// readEvents(), then applies grade filtering.
//
// Grade resolution priority (per rule 26):
//  1. explicit envelope.valueGrade
//  2. payload.promotedFrom present → T4
//  3. heuristic: reasoning>=40chars + refinementTarget + memoryLayers → T3

import * as path from "path";
import * as fs from "fs";
import { readEvents } from "./read";
import type { EventEnvelope } from "./types";

export type GradeFilter = "T2+" | "T3+" | "T4-only" | "raw";

export interface ReadPromotedEventsOptions {
  /** Absolute path to .palantir-mini/session/ directory */
  sessionDir: string;
  /** Default: "T3+" */
  gradeFilter?: GradeFilter;
}

export interface ReadPromotedEventsResult {
  events: EventEnvelope[];
  /** Total events read from disk before filtering */
  totalRead: number;
  /** Count after grade filter applied */
  filteredCount: number;
  /** true when gradeFilter==="raw" (no filtering applied) */
  rawScan: boolean;
}

/** Map grade string to numeric for ">=" comparisons */
function gradeToNum(grade: string): number {
  switch (grade) {
    case "T0": return 0;
    case "T1": return 1;
    case "T2": return 2;
    case "T3": return 3;
    case "T4": return 4;
    default:   return -1;
  }
}

/**
 * Resolve the effective numeric grade for an event.
 * Priority:
 *  1. explicit envelope.valueGrade field
 *  2. payload.promotedFrom present → T4
 *  3. heuristic inference from withWhat fields
 */
export function resolveGradeNumeric(ev: EventEnvelope): number {
  // Priority 1 — explicit grade
  const explicit = (ev as unknown as Record<string, unknown>)["valueGrade"];
  if (typeof explicit === "string") {
    const n = gradeToNum(explicit);
    if (n >= 0) return n;
  }

  // Priority 2 — promotedFrom in payload (added by PR 4.2 grade-promotion layer)
  const payload = ev.payload as Record<string, unknown> | undefined;
  if (payload && payload["promotedFrom"]) {
    return 4; // T4
  }

  // Priority 3 — heuristic (rule 26 §A3 + B/C axes)
  const ww = ev.withWhat as Record<string, unknown> | undefined;
  if (!ww) return 1; // minimal T1

  const reasoning = typeof ww["reasoning"] === "string" ? ww["reasoning"] : "";
  const hasLongReasoning = reasoning.length >= 40;
  const hasRefinementTarget = ww["refinementTarget"] != null;
  const hasMemoryLayers = Array.isArray(ww["memoryLayers"]) && (ww["memoryLayers"] as unknown[]).length > 0;

  if (hasLongReasoning && hasRefinementTarget && hasMemoryLayers) return 3; // T3
  if (hasLongReasoning && (hasRefinementTarget || hasMemoryLayers)) return 2; // T2
  return 1; // T1
}

function passesGradeFilter(ev: EventEnvelope, filter: GradeFilter): boolean {
  const grade = resolveGradeNumeric(ev);
  switch (filter) {
    case "T4-only": return grade === 4;
    case "T3+":     return grade >= 3;
    case "T2+":     return grade >= 2;
    case "raw":     return true;
    default:        return grade >= 3;
  }
}

/**
 * Read events from sessionDir, filtering to the requested grade tier.
 *
 * Uses frozen readEvents() for raw I/O (PR 4.5/4.6 territory).
 * When gradeFilter="raw", returns all events with rawScan=true.
 *
 * Graceful fallback: when gradeFilter produces zero results (fresh project),
 * returns all events so callers never get an empty corpus.
 */
export function readPromotedEvents(opts: ReadPromotedEventsOptions): ReadPromotedEventsResult {
  const { sessionDir, gradeFilter = "T3+" } = opts;
  const eventsPath = path.join(sessionDir, "events.jsonl");

  // Graceful: missing file → empty result
  if (!fs.existsSync(eventsPath)) {
    return { events: [], totalRead: 0, filteredCount: 0, rawScan: false };
  }

  const rawResult = readEvents(eventsPath, { includeArchive: "all" });
  const allEvents = rawResult.events;
  const totalRead = allEvents.length;

  if (gradeFilter === "raw") {
    return { events: allEvents, totalRead, filteredCount: totalRead, rawScan: true };
  }

  const filtered = allEvents.filter((ev) => passesGradeFilter(ev, gradeFilter));

  // Graceful fallback: when no events pass the filter (fresh project with no T3+ yet),
  // return all events so callers never get an empty corpus.
  const resultEvents = filtered.length > 0 ? filtered : allEvents;

  return {
    events: resultEvents,
    totalRead,
    filteredCount: resultEvents.length,
    rawScan: false,
  };
}
