// palantir-mini — MCP tool handler: grade_classification_accuracy (sprint-062 W4-α; updated sprint-063 W2.A)
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog — post-hoc calibration grader)
//
// Read-only retrospective handler. Replays impact_query RID predictions
// vs edit_committed events within a configurable time window.
// Uses impact_query for affected RID gathering + cross-references last 24h
// edit_committed events from events.jsonl.
//
// Emits: validation_phase_completed errorClass="classification_accuracy_graded"
//
// Authority: sprint-062 W4-α briefing §2 NEW handler
//            sprint-063 W2.A (semantic_change_plan removed; rewired to impact_query)
//            rule 10 §Append-only (events.jsonl read-only here)
//            rule 26 §Grading (T3+ substrate routing)
//            schemas/ontology/primitives/impact-edge.ts ImpactEdgeKind

import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import {
  computeClassificationAccuracy,
  type CalibrationScore,
} from "../../lib/recap/classification-accuracy";
import { emit } from "../../scripts/log";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeClassificationInput {
  /** Absolute path to project root. Default: $PALANTIR_MINI_PROJECT or cwd. */
  project: string;
  /**
   * Rolling window in days for pairing plan predictions to edit_committed.
   * Default 14 days (covers most sprint lifetimes).
   */
  windowDays?: number;
  /**
   * Aggregate accuracy ≥ trustThreshold → trust=true.
   * Default 0.8 (80% accuracy = reliable calibration).
   */
  trustThreshold?: number;
  /**
   * Aggregate accuracy < retrainThreshold → retrain=true (signals calibration
   * is too low to trust; retrain Visitor heuristics or rubric weights).
   * Default 0.6.
   */
  retrainThreshold?: number;
}

export interface GradeClassificationResult {
  calibration: CalibrationScore;
  trust: boolean;
  retrain: boolean;
  reasoning: string;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function gradeClassificationAccuracy(
  rawArgs: unknown,
): Promise<GradeClassificationResult> {
  const args = (rawArgs ?? {}) as GradeClassificationInput;

  const projectRoot = args.project ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const windowDays = typeof args.windowDays === "number" && args.windowDays > 0
    ? args.windowDays
    : 14;
  const trustThreshold = typeof args.trustThreshold === "number"
    ? args.trustThreshold
    : 0.8;
  const retrainThreshold = typeof args.retrainThreshold === "number"
    ? args.retrainThreshold
    : 0.6;

  const windowMs = windowDays * 24 * 3_600_000;

  // Read events.jsonl (read-only; never writes to events.jsonl here)
  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  const events = readEvents(eventsPath);

  // Compute calibration score
  const calibration = computeClassificationAccuracy(events as unknown[], windowMs);

  // Determine trust / retrain flags
  const trust = calibration.aggregate >= trustThreshold;
  const retrain = calibration.aggregate < retrainThreshold;

  // Build reasoning string
  const pct = (calibration.aggregate * 100).toFixed(1);
  const kindCount = Object.keys(calibration.perKind).length;
  const parts: string[] = [
    `aggregate accuracy ${pct}% over ${calibration.totalPlans} plan predictions`,
    `(${calibration.totalMatches} matches, ${kindCount} ImpactEdgeKind${kindCount !== 1 ? "s" : ""}, ${windowDays}-day window)`,
  ];
  if (trust) {
    parts.push(`trust=true (≥${(trustThreshold * 100).toFixed(0)}% threshold)`);
  } else if (retrain) {
    parts.push(`retrain=true (below ${(retrainThreshold * 100).toFixed(0)}% threshold)`);
  } else {
    parts.push(`trust=false, retrain=false (below ${(trustThreshold * 100).toFixed(0)}% but above ${(retrainThreshold * 100).toFixed(0)}%)`);
  }

  const reasoning = parts.join("; ");

  // Emit validation_phase_completed errorClass="classification_accuracy_graded"
  // (best-effort; never throws)
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        errorClass: "classification_accuracy_graded" as string,
        passed: trust,
      } as Record<string, unknown>,
      toolName: "grade_classification_accuracy",
      cwd: projectRoot,
      reasoning: `Classification accuracy grader: ${reasoning}. Rule 26 T3 circuit input — closes external eval Lead Ontology calibration gap.`,
      memoryLayers: ["procedural", "semantic"],
      refinementTarget: trust
        ? undefined
        : {
            kind: "grading-criterion-threshold" as const,
            filePathOrRid: "palantir-mini/bridge/handlers/grade-classification-accuracy.ts",
            description: "impact_query calibration accuracy below trust threshold; rubric weights or impact-graph edges may need retraining",
            confidenceLevel: "medium" as const,
          },
    });
  } catch {
    // best-effort — never block the handler result
  }

  return {
    calibration,
    trust,
    retrain,
    reasoning,
  };
}
