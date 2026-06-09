/**
 * Atomic commit wrapper
 * @owner palantirkc-plugin-actions
 * @purpose Atomic commit wrapper
 */
// palantir-mini v0 — Atomic commit wrapper
// Domain: ACTION (prim-action-03 AtomicCommit + prim-action-02 Tier-2)
//
// The ONE place where OntologyEdit[] actually gets committed:
//   1. Run submission criteria pre-flight (LOGIC evaluator — SECURITY gate)
//   2. If ALL passed AND !validateOnly: append an edit_committed event.
//   3. If ANY failed: append a submission_criteria_failed event, do NOT commit.
//
// Mirrors OSDK 2.0 `$validateOnly` / `$returnEdits` semantics.
// Atomic mutex is handled by lib/event-log/append.ts (fs.mkdir lock).

import * as path from "path";
import * as fs from "fs";
import type { OntologyEdit } from "../event-log/types";
import type { EventEnvelope, EventId, SessionId, CommitSha } from "../event-log/types";
import { appendEventAtomic } from "../event-log/append";
import { evaluateCriteria, type SubmissionCriterion, type CriterionResult } from "./submission-criteria";

export interface CommitRequest {
  project:             string;  // absolute project root path
  actionTypeRid:       string;
  edits:               OntologyEdit[];
  submissionCriteria?: SubmissionCriterion[];
  validateOnly?:       boolean;
  /** Optional Decision Lineage overrides */
  byWhom?: EventEnvelope["byWhom"];
  throughWhich?: {
    sessionId?: string;
    toolName?:  string;
    cwd?:       string;
  };
  reasoning?: string;
  hypothesis?: string;
}

export interface CommitResult {
  result:             "VALID" | "INVALID" | "COMMITTED" | "VALIDATE_ONLY";
  committed:          boolean;
  appliedEdits?:      OntologyEdit[];
  perCriterionResult: CriterionResult[];
  passedCriteria:     string[];
  failedCriteria:     string[];
  sequence?:          number;
  eventType:          "edit_committed" | "submission_criteria_failed" | "none";
  /**
   * O-2 observability: count of just-committed register-primitive edits (an edit
   * tagged `properties.primitiveKind` or a `kind:"link"` edit). Derived from
   * req.edits — additive to the return type only; no behavior change to the append.
   */
  materializedPrimitives?: number;
}

/** Count edits that materialize a typed primitive (object w/ primitiveKind tag, or a link). */
function countMaterializedPrimitives(edits: OntologyEdit[]): number {
  let count = 0;
  for (const edit of edits) {
    if (edit.kind === "link") count++;
    else if (edit.kind === "object" && (edit.properties as Record<string, unknown> | undefined)?.primitiveKind) count++;
  }
  return count;
}

function eventsPathFor(project: string): string {
  return path.join(project, ".palantir-mini", "session", "events.jsonl");
}

function uniqueEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function gitHeadSha(project: string): string {
  const gitHead = path.join(project, ".git", "HEAD");
  if (!fs.existsSync(gitHead)) return "no-git";
  try {
    const head = fs.readFileSync(gitHead, "utf8").trim();
    if (head.startsWith("ref: ")) {
      const refPath = path.join(project, ".git", head.slice(5));
      if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf8").trim();
      return head.slice(5);
    }
    return head;
  } catch {
    return "no-git";
  }
}

function baseLineage(req: CommitRequest) {
  return {
    eventId: uniqueEventId() as unknown as EventId,
    when:    new Date().toISOString(),
    atopWhich: gitHeadSha(req.project) as unknown as CommitSha,
    throughWhich: {
      sessionId: (req.throughWhich?.sessionId ?? "local") as unknown as SessionId,
      toolName:  req.throughWhich?.toolName  ?? "commit_edits",
      cwd:       req.throughWhich?.cwd       ?? req.project,
    },
    byWhom: req.byWhom ?? { identity: "claude-code" as const },
    withWhat: req.reasoning || req.hypothesis ? {
      reasoning:  req.reasoning,
      hypothesis: req.hypothesis,
    } : undefined,
  };
}

/**
 * Commit edits atomically with submission criteria pre-flight.
 * The commit is rejected if ANY criterion fails. validateOnly=true returns the
 * verdict without writing any event.
 */
export async function commitEdits(req: CommitRequest): Promise<CommitResult> {
  const criteria = req.submissionCriteria ?? [];
  const evalResult = evaluateCriteria(req.edits, criteria);

  const epath = eventsPathFor(req.project);

  if (!evalResult.allPassed) {
    const envelope: Omit<EventEnvelope, "sequence"> = {
      ...baseLineage(req),
      type: "submission_criteria_failed",
      payload: {
        actionTypeRid: req.actionTypeRid,
        failedConstraints: evalResult.results
          .filter((r) => !r.passed)
          .map((r) => ({ constraintType: r.type, failureMessage: r.reason ?? "failed" })),
      },
    };
    const sequence = await appendEventAtomic(epath, envelope);
    return {
      result: "INVALID",
      committed: false,
      perCriterionResult: evalResult.results,
      passedCriteria: evalResult.passedNames,
      failedCriteria: evalResult.failedNames,
      sequence,
      eventType: "submission_criteria_failed",
    };
  }

  if (req.validateOnly) {
    return {
      result: "VALIDATE_ONLY",
      committed: false,
      perCriterionResult: evalResult.results,
      passedCriteria: evalResult.passedNames,
      failedCriteria: evalResult.failedNames,
      eventType: "none",
    };
  }

  // All passed, commit.
  const envelope: Omit<EventEnvelope, "sequence"> = {
    ...baseLineage(req),
    type: "edit_committed",
    payload: {
      actionTypeRid: req.actionTypeRid,
      appliedEdits:  req.edits,
      submissionCriteriaPassed: evalResult.passedNames,
    },
  };
  const sequence = await appendEventAtomic(epath, envelope);

  return {
    result: "COMMITTED",
    committed: true,
    appliedEdits: req.edits,
    perCriterionResult: evalResult.results,
    passedCriteria: evalResult.passedNames,
    failedCriteria: evalResult.failedNames,
    sequence,
    eventType: "edit_committed",
    materializedPrimitives: countMaterializedPrimitives(req.edits),
  };
}
