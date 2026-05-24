// palantir-mini v4.1.0 — MCP tool handler: pm_event_query_by_grade
// Domain: LEARN (rule 26 §Grading filter — events.jsonl by valueGrade)
//
// Reads project events.jsonl + filters by valueGrade. Supports T0..T4 single
// grades plus aggregate filters T2+ (T2|T3|T4) and T3+ (T3|T4). Optional
// eventTypeFilter narrows to specific types; optional sinceWhen excludes
// older rows.
//
// Returns matching events + aggregate distribution per valueGrade.
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Grading
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 3.1

import * as fs from "fs";
import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import { VALUE_GRADES, type ValueGrade } from "#schemas/ontology/primitives/value-grade";
import type { EventEnvelope } from "../../lib/event-log/types";

type GradeFilter = ValueGrade | "T2+" | "T3+" | "all";

interface PmEventQueryByGradeArgs {
  project:           string;
  gradeFilter:       GradeFilter;
  eventTypeFilter?:  string[];
  sinceWhen?:        string;
  limit?:            number;
}

interface PmEventQueryByGradeResult {
  events:            EventEnvelope[];
  totalScanned:      number;
  matchedCount:      number;
  gradeDistribution: Record<ValueGrade, number>;
}

const GRADE_INDEX: Readonly<Record<ValueGrade, number>> = {
  T0: 0,
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
};

function gradeMatches(grade: ValueGrade | undefined, filter: GradeFilter): boolean {
  if (filter === "all") return true;
  if (grade === undefined) return false;
  if (filter === "T2+") return GRADE_INDEX[grade] >= GRADE_INDEX.T2;
  if (filter === "T3+") return GRADE_INDEX[grade] >= GRADE_INDEX.T3;
  return grade === filter;
}

export default async function pmEventQueryByGrade(
  rawArgs: unknown,
): Promise<PmEventQueryByGradeResult> {
  const args = (rawArgs ?? {}) as PmEventQueryByGradeArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_event_query_by_grade: `project` is required");
  }
  const filter: GradeFilter = args.gradeFilter ?? "all";
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 1000;

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) {
    return {
      events: [],
      totalScanned: 0,
      matchedCount: 0,
      gradeDistribution: { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0 },
    };
  }

  const events = readEvents(eventsPath);
  const distribution: Record<ValueGrade, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0 };
  const matched: EventEnvelope[] = [];

  for (const ev of events) {
    const grade = (ev as EventEnvelope).valueGrade;
    if (grade !== undefined && (VALUE_GRADES as readonly string[]).includes(grade)) {
      distribution[grade] += 1;
    }

    if (args.sinceWhen && typeof ev.when === "string" && ev.when < args.sinceWhen) continue;
    if (
      args.eventTypeFilter &&
      args.eventTypeFilter.length > 0 &&
      !args.eventTypeFilter.includes((ev as EventEnvelope).type)
    ) {
      continue;
    }
    if (!gradeMatches(grade, filter)) continue;

    matched.push(ev as EventEnvelope);
    if (matched.length >= limit) break;
  }

  return {
    events: matched,
    totalScanned: events.length,
    matchedCount: matched.length,
    gradeDistribution: distribution,
  };
}
