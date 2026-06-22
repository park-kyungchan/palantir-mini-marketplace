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
import type { OntologyEdit } from "../event-log/types";
import type { EventEnvelope, EventId, SessionId, CommitSha } from "../event-log/types";
import { appendEventAtomic } from "../event-log/append";
import { evaluateCriteria, type SubmissionCriterion, type CriterionResult } from "./submission-criteria";
import { gitHeadSha } from "../git/head-sha";
import { readEvents, foldToSnapshot } from "../event-log/read";
import { ACTION_TYPE_REGISTRY } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/action-type";
// Side-effect import: action-types.ts populates ACTION_TYPE_REGISTRY (the singleton above)
// with all self-ontology verbs at module load, so .list() returns the full self catalog.
import "../../runtime-overlay/schemas-snapshot/ontology/self/action-types";

// A2 — mirror of EXECUTOR_ACTION_TYPE_RID (lib/sandbox/executor.ts:53). Inlined as a
// literal (not imported) because executor.ts already imports commitEdits from this file,
// so importing back from executor would create a circular import.
const EXECUTOR_ACTION_TYPE_RID = "pm.self.ontology/action-type/executor";

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
  /** A2 — set to "unregistered_action_type" when the ActionType gate refused the commit. */
  errorClass?: "unregistered_action_type";
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

/**
 * A2 — ActionType commit gate. The design invariant "an ActionType is the only thing that
 * COMMITS edits" requires the rid to resolve to a real ActionType, not free text.
 * Honored when the rid is either a built-in pm self-ontology ActionType (the system verbs
 * register/commit/executor flow through — genesis must be satisfiable) OR a project-registered
 * ActionType folded from prior edit_committed events.
 */
function isRegisteredActionType(project: string, actionTypeRid: string): boolean {
  // (a0) the Executor self ActionType — registered separately from SELF_ACTION_TYPES; the
  //      sandbox executor commits with `request.actionTypeRid ?? EXECUTOR_ACTION_TYPE_RID`.
  if (actionTypeRid === EXECUTOR_ACTION_TYPE_RID) return true;
  // (a) built-in self-ontology ActionTypes (covers genesis: register-*, commit-edits,
  //     apply-edit-function, etc. — see runtime-overlay self/action-types.ts).
  for (const decl of ACTION_TYPE_REGISTRY.list()) {
    if ((decl.rid as unknown as string) === actionTypeRid) return true;
  }
  // (b) project-registered ActionTypes folded into registeredPrimitives.actionTypes
  //     (fold-snapshot.ts bins committed object edits tagged primitiveKind:"ActionType").
  const events = readEvents(eventsPathFor(project));
  const snapshot = foldToSnapshot(events);
  const projectActionTypes = snapshot.registeredPrimitives?.actionTypes ?? [];
  return projectActionTypes.some((e) => e.rid === actionTypeRid);
}

function uniqueEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

  // A2 — fail-closed ActionType gate: refuse to commit through an unregistered ActionType.
  if (!isRegisteredActionType(req.project, req.actionTypeRid)) {
    return {
      result: "INVALID",
      committed: false,
      perCriterionResult: evalResult.results,
      passedCriteria: evalResult.passedNames,
      failedCriteria: evalResult.failedNames,
      eventType: "none",
      errorClass: "unregistered_action_type",
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
