// palantir-mini — closed-loop helpers (sprint-062 W2-γ)
// Domain: LOGIC (pure helpers for ApplyRefinementTarget primitive)
//
// Factors out grouping + simulator stub + dry-run serialization from
// bridge/handlers/apply-refinement-target.ts so they're independently
// testable + reusable across hooks (t4-canonical-emit-watch,
// t4-promotion-trigger).
//
// Authority:
//   rule 26 v1.3.0 §D2 (T4 D2-canonical/fallback)
//   rule 16 v4.1.0 §GradingRubric simulator domain
//   AIP Evals OntologyEditSimulation pattern
//
// Sprint-062 W2 limitation:
//   Simulator grader returns 0.5 default until W6 C13 producer-ontology
//   Wave 3 fix lands. Threshold lowered to 0.3 (from 0.5) per plan R-3.

import * as crypto from "crypto";

export interface ValueGradedEvent {
  eventId:          string;
  sequence:         number;
  type:             string;
  valueGrade:       "T0" | "T1" | "T2" | "T3" | "T4";
  withWhat?: {
    refinementTarget?: { kind: string; rid: string };
    [key: string]: unknown;
  };
  byWhom?: {
    identity?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ProposedEdit {
  filePath:    string;
  oldContent?: string;
  newContent:  string;
  reason:      string;
}

/**
 * Group T3+/T4 events by (refinementTarget.kind, refinementTarget.rid).
 * Events without refinementTarget are excluded.
 */
export function groupEventsByTarget(
  events: ValueGradedEvent[],
): Map<string, ValueGradedEvent[]> {
  const map = new Map<string, ValueGradedEvent[]>();
  for (const ev of events) {
    const target = ev.withWhat?.refinementTarget;
    if (!target?.kind || !target?.rid) continue;
    const key = `${target.kind}::${target.rid}`;
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  return map;
}

/**
 * Simulator-domain grader stub (sprint-062 W2 placeholder).
 * Returns a fixed 0.5 score until W6 C13 lands and impact_query starts
 * returning real impact-radius data.
 *
 * Threshold for pass: 0.3 (lowered from 0.5 per plan R-3 mitigation).
 */
export function simulatorDomainGraderStub(
  refinementTarget: { kind: string; rid: string },
  proposedEdits: ProposedEdit[],
): { score: number; reasoning: string } {
  // sprint-062 W2-γ: stub returning fixed 0.5 (above 0.3 threshold = pass)
  // sprint-063: replace with real impact_query-driven simulator (post W6 C13)
  return {
    score:     0.5,
    reasoning: `simulator stub (sprint-062 W2): ${refinementTarget.kind}/${refinementTarget.rid} with ${proposedEdits.length} proposed edits — threshold 0.3, returns 0.5; replaces with real impact_query-driven scoring post W6 C13`,
  };
}

/**
 * Compute deterministic dryRunRef from proposed edits.
 * Used to pair compute_edits_dry_run output with grader verdict
 * via validation_phase_completed envelope.
 */
export function dryRunRefSerialize(edits: ProposedEdit[]): string {
  const canonical = JSON.stringify(
    edits.map((e) => ({ filePath: e.filePath, newContent: e.newContent, reason: e.reason })),
    Object.keys(edits[0] ?? {}).sort(),
  );
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Determine D2 path (canonical vs fallback) from grouped events.
 * D2-canonical: ≥2 distinct byWhom.identity values
 * D2-fallback: 1 distinct byWhom.identity (single-vendor-attested)
 */
export function determineD2Path(events: ValueGradedEvent[]): {
  path:        "canonical" | "fallback";
  identities:  string[];
} {
  const identities = new Set<string>();
  for (const ev of events) {
    const id = ev.byWhom?.identity;
    if (typeof id === "string" && id.length > 0) identities.add(id);
  }
  const arr = Array.from(identities);
  return {
    path:       arr.length >= 2 ? "canonical" : "fallback",
    identities: arr,
  };
}
