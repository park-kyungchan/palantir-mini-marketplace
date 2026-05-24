// palantir-mini v6.27.0 — pm_substrate_query mode=post-merge handler
// Domain: LEARN (rule 26 §Grading — T2+ event replay between merge commits)
//
// Replays events.jsonl entries between a previous main HEAD SHA and a new
// merge commit SHA. Filters to T2+ grades per rule 26 §Grading. Aggregates
// per byWhom.agent + per refinementTarget + per grade. Returns a structured
// summary suitable for ship-time PR retrospectives.
//
// Authority:
//   canonical plan v2 §4 row 5.8 (sprint-119 PR 5.8)
//   rules/26-valuable-data-standard.md §Grading (T2+ filter)
//   rules/10-events-jsonl.md (events.jsonl read-only consumer)

import { execSync } from "child_process";
import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import { eventsPathFor } from "../../scripts/log";
import type { EventEnvelope } from "../../lib/event-log/types";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PostMergeArgs {
  project?: string;
  /** New merge commit SHA (required). */
  newMergeSha: string;
  /**
   * Previous main HEAD SHA (optional). When omitted, derived from
   * `git rev-parse <newMergeSha>^` — the merge commit's first parent.
   */
  previousMainSha?: string;
}

export interface PostMergeRange {
  previousMainSha: string;
  newMergeSha: string;
  commitCount: number;
  firstCommitAt: string | null;
  lastCommitAt: string | null;
}

export interface PostMergeEvents {
  totalT2Plus: number;
  perAgent: Record<string, number>;
  perRefinementTarget: Record<string, number>;
  perGrade: Record<"T2" | "T3" | "T4", number>;
}

export interface PostMergeResult {
  mode: "post-merge";
  range: PostMergeRange;
  events: PostMergeEvents;
  /** Top 5 reasoning quotes from highest-value (T3+) events. */
  topInsights: string[];
}

// ─── Grade helpers ────────────────────────────────────────────────────────────

const T2_PLUS_GRADES: ReadonlySet<ValueGrade> = new Set<ValueGrade>(["T2", "T3", "T4"]);

function isT2Plus(grade: ValueGrade | undefined): grade is "T2" | "T3" | "T4" {
  return grade !== undefined && T2_PLUS_GRADES.has(grade);
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

/** Validate that a SHA resolves to a commit in the repo at `cwd`. */
function validateSha(sha: string, cwd: string): void {
  try {
    execSync(`git rev-parse --verify "${sha}^{commit}"`, {
      cwd,
      stdio: "pipe",
    });
  } catch {
    throw new Error(
      `pm_substrate_query[post-merge]: invalid or missing git commit SHA "${sha}" in repo at ${cwd}`,
    );
  }
}

/**
 * Derive previousMainSha from the merge commit's first parent.
 * For a merge commit the first parent is the branch it was merged into (main).
 */
function deriveParentSha(newMergeSha: string, cwd: string): string {
  try {
    return execSync(`git rev-parse "${newMergeSha}^"`, {
      cwd,
      stdio: "pipe",
    })
      .toString()
      .trim();
  } catch {
    throw new Error(
      `pm_substrate_query[post-merge]: could not derive parent SHA from "${newMergeSha}" — is it a merge commit?`,
    );
  }
}

interface CommitEntry {
  sha: string;
  timestamp: number;
}

/**
 * Return commits in range (previousMainSha..newMergeSha], sorted by timestamp ASC.
 * Uses `git log --format='%H %ct'` for lightweight parsing.
 */
function listCommitsInRange(
  previousMainSha: string,
  newMergeSha: string,
  cwd: string,
): CommitEntry[] {
  try {
    const raw = execSync(
      `git log --format="%H %ct" "${previousMainSha}..${newMergeSha}"`,
      { cwd, stdio: "pipe" },
    )
      .toString()
      .trim();

    if (raw.length === 0) return [];

    const commits: CommitEntry[] = [];
    for (const line of raw.split("\n")) {
      const [sha, ctStr] = line.trim().split(" ");
      if (!sha || !ctStr) continue;
      const timestamp = parseInt(ctStr, 10);
      if (!isNaN(timestamp)) {
        commits.push({ sha, timestamp });
      }
    }

    // Sort ASC by timestamp
    commits.sort((a, b) => a.timestamp - b.timestamp);
    return commits;
  } catch {
    return [];
  }
}

// ─── Event filtering + aggregation ───────────────────────────────────────────

/**
 * Filter events.jsonl to those whose `atopWhich` SHA is included in the
 * commit range, OR whose `when` timestamp falls within [firstCommitTs, lastCommitTs].
 *
 * Two-signal approach: `atopWhich` is the primary match; timestamp range is a
 * fallback that catches events emitted during the PR (between commits) that may
 * not have an exact SHA match for every intermediate commit.
 */
function filterEventsInRange(
  events: EventEnvelope[],
  commitShas: Set<string>,
  firstCommitTs: number,
  lastCommitTs: number,
): EventEnvelope[] {
  return events.filter((ev) => {
    // Primary: atopWhich SHA is in the commit range
    if (ev.atopWhich && commitShas.has(ev.atopWhich as string)) return true;

    // Fallback: event `when` timestamp falls within [firstCommit, lastCommit]
    if (ev.when) {
      const evMs = new Date(ev.when).getTime();
      if (!isNaN(evMs) && evMs >= firstCommitTs * 1000 && evMs <= lastCommitTs * 1000 + 59_999) {
        return true;
      }
    }

    return false;
  });
}

function aggregateEvents(
  t2PlusEvents: EventEnvelope[],
): Pick<PostMergeResult, "events" | "topInsights"> {
  const perAgent: Record<string, number> = {};
  const perRefinementTarget: Record<string, number> = {};
  const perGrade: Record<"T2" | "T3" | "T4", number> = { T2: 0, T3: 0, T4: 0 };
  const t3PlusInsights: Array<{ grade: number; reasoning: string }> = [];

  const gradeRank: Record<"T2" | "T3" | "T4", number> = { T2: 2, T3: 3, T4: 4 };

  for (const ev of t2PlusEvents) {
    // Grade aggregation
    const grade = ev.valueGrade as "T2" | "T3" | "T4";
    perGrade[grade] = (perGrade[grade] ?? 0) + 1;

    // Per-agent aggregation
    const agent =
      ev.byWhom.agentName ?? ev.byWhom.identity ?? "unknown";
    perAgent[agent] = (perAgent[agent] ?? 0) + 1;

    // Per-refinementTarget aggregation
    const rt = ev.withWhat?.refinementTarget;
    if (rt && typeof rt === "object") {
      const rtAny = rt as unknown as Record<string, unknown>;
      const rtKey =
        rtAny["kind"] !== undefined
          ? `${rtAny["kind"]}`
          : JSON.stringify(rt);
      perRefinementTarget[rtKey] = (perRefinementTarget[rtKey] ?? 0) + 1;
    }

    // Collect T3+ reasoning for topInsights
    if (gradeRank[grade] >= 3) {
      const reasoning = ev.withWhat?.reasoning;
      if (reasoning && typeof reasoning === "string" && reasoning.length > 0) {
        t3PlusInsights.push({ grade: gradeRank[grade], reasoning });
      }
    }
  }

  // Sort T3+ by grade DESC, take top 5
  t3PlusInsights.sort((a, b) => b.grade - a.grade);
  const topInsights = t3PlusInsights.slice(0, 5).map((x) => x.reasoning);

  return {
    events: {
      totalT2Plus: t2PlusEvents.length,
      perAgent,
      perRefinementTarget,
      perGrade,
    },
    topInsights,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function pmSubstrateQueryPostMerge(
  rawArgs: PostMergeArgs,
): Promise<PostMergeResult> {
  const project = rawArgs.project ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const newMergeSha = rawArgs.newMergeSha;

  if (!newMergeSha || typeof newMergeSha !== "string") {
    throw new Error("pm_substrate_query[post-merge]: `newMergeSha` is required");
  }

  // Validate newMergeSha exists in repo
  validateSha(newMergeSha, project);

  // Derive or validate previousMainSha
  const previousMainSha =
    rawArgs.previousMainSha && typeof rawArgs.previousMainSha === "string"
      ? rawArgs.previousMainSha
      : deriveParentSha(newMergeSha, project);

  // Also validate previousMainSha
  validateSha(previousMainSha, project);

  // List commits in range
  const commits = listCommitsInRange(previousMainSha, newMergeSha, project);
  const commitShas = new Set(commits.map((c) => c.sha));

  const firstCommitTs = commits.length > 0 ? commits[0]!.timestamp : 0;
  const lastCommitTs = commits.length > 0 ? commits[commits.length - 1]!.timestamp : 0;

  const range: PostMergeRange = {
    previousMainSha,
    newMergeSha,
    commitCount: commits.length,
    firstCommitAt:
      firstCommitTs > 0 ? new Date(firstCommitTs * 1000).toISOString() : null,
    lastCommitAt:
      lastCommitTs > 0 ? new Date(lastCommitTs * 1000).toISOString() : null,
  };

  // Read events.jsonl
  const eventsPath = eventsPathFor(project);
  const allEvents = readEvents(eventsPath);

  // Filter to range + T2+
  let rangeEvents: EventEnvelope[];
  if (commits.length === 0) {
    // Empty range — no commits between the SHAs
    rangeEvents = [];
  } else {
    rangeEvents = filterEventsInRange(allEvents, commitShas, firstCommitTs, lastCommitTs);
  }

  const t2PlusEvents = rangeEvents.filter((ev) => isT2Plus(ev.valueGrade));

  // Aggregate
  const { events, topInsights } = aggregateEvents(t2PlusEvents);

  return {
    mode: "post-merge",
    range,
    events,
    topInsights,
  };
}
