/**
 * palantir-mini lib/fde-build/naming-classifier.ts
 *
 * Pure classifier for FDE naming-audit findings. Classifies term hits against
 * the NAMING_TERM_BASELINE_TABLE (brief §8 baseline, Slice 2.A schema).
 *
 * HARD INVARIANTS:
 *   1. This module contains ZERO I/O calls (no fs.readFile, no fs.writeFile,
 *      no process.exit). Pure functions only.
 *   2. compatibility-identifier findings always carry a non-empty compatibilityReason.
 *   3. Returns null for unknown terms — callers decide what to do with unknowns.
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 2.B
 */

import {
  type NamingAuditFinding,
  type NamingTermSpec,
  NAMING_TERM_BASELINE_TABLE,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-naming-classification";

// =============================================================================
// Helpers
// =============================================================================

/** Stable counter for finding IDs within a classifier session. */
let _findingCounter = 0;

/** Reset the finding counter (call between audit runs in tests). */
export function resetFindingCounter(): void {
  _findingCounter = 0;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Classify a term hit (file path + line + excerpt) against the baseline table.
 *
 * Pure function — no I/O. Returns a NamingAuditFinding if the term is in the
 * baseline table, or null if the term is not tracked.
 *
 * Matching is case-sensitive exact-match on the term string (brief §8 uses
 * exact casing for each term).
 */
export function classifyTermHit(input: {
  readonly term: string;
  readonly location: string;
  readonly line?: number;
  readonly excerpt?: string;
}): NamingAuditFinding | null {
  const spec = NAMING_TERM_BASELINE_TABLE.find((s) => s.term === input.term);
  if (!spec) return null;

  _findingCounter += 1;
  const findingId = `finding-${String(_findingCounter).padStart(4, "0")}`;

  const finding: NamingAuditFinding = {
    findingId,
    term: input.term,
    classification: spec.classification,
    severity: spec.severity,
    location: input.location,
    ...(input.line !== undefined ? { line: input.line } : {}),
    ...(input.excerpt !== undefined
      ? { excerpt: input.excerpt.slice(0, 200) }
      : {}),
    ...(spec.compatibilityReason !== undefined
      ? { compatibilityReason: spec.compatibilityReason }
      : {}),
    ...(spec.recommendedAction !== undefined
      ? { recommendedAction: spec.recommendedAction }
      : {}),
  };

  return finding;
}

/**
 * Return all term specs from the baseline table.
 * Convenience re-export for runners that need to iterate terms.
 */
export function getBaselineTermSpecs(): readonly NamingTermSpec[] {
  return NAMING_TERM_BASELINE_TABLE;
}

/**
 * Predicate: is the given term a compatibility identifier?
 * Compatibility identifiers must be preserved verbatim (brief §8.3).
 */
export function isCompatibilityIdentifier(term: string): boolean {
  const spec = NAMING_TERM_BASELINE_TABLE.find((s) => s.term === term);
  return spec?.classification === "compatibility-identifier";
}
