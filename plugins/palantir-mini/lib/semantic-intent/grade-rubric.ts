// palantir-mini — 7-criterion SIC grader (PR 5.13, sprint-124).
//
// Pure deterministic scorer for SemanticIntentContract.
// No LLM calls — all heuristics are structural checks on the contract fields.
//
// Per canonical plan v2 §4 row 5.13.
//
// Authority: ~/.claude/schemas/ontology/primitives/semantic-intent-contract.ts
//            lib/semantic-intent/fill-sequence.ts (fillSequence shape)

import type { SemanticIntentContract } from "../lead-intent/contracts";
import type { SicWithFillFields } from "./fill-sequence";
import { EIGHT_TURN_FILL_SEQUENCE } from "./fill-sequence";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface SicGradingResult {
  perCriterion: {
    clarityOfIntent: number;
    scopeBoundedness: number;
    nounVerbDisambiguation: number;
    nonGoalsClarity: number;
    downstreamBlastRadius: number;
    fillSequenceCompleteness: number;
    evidenceGrounding: number;
  };
  overall: number;
  verdict: "pass" | "revise" | "reject";
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Vague-phrase guard (clarityOfIntent)
// ---------------------------------------------------------------------------

const VAGUE_PHRASES = [
  /^\s*(improve|fix|make better|make it better|update|clean up|refactor|optimize)\s*$/i,
];

function isVagueIntent(text: string): boolean {
  return VAGUE_PHRASES.some((re) => re.test(text.trim()));
}

// ---------------------------------------------------------------------------
// Path-like surface guard (scopeBoundedness)
// ---------------------------------------------------------------------------

function isPathLike(s: string): boolean {
  // Accepts: path segments with slashes, dots, hyphens, underscores, tildes.
  // Rejects empty or pure whitespace.
  return s.trim().length > 0 && /^[~./a-zA-Z0-9_\-*]+$/.test(s.trim());
}

// ---------------------------------------------------------------------------
// Evidence ref guard (evidenceGrounding)
// ---------------------------------------------------------------------------

const EVIDENCE_PREFIXES = [
  "~/.claude/research/",
  ".claude/research/",
  ".claude/schemas/",
  "~/.claude/schemas/",
];

function isValidEvidenceRef(ref: string): boolean {
  return EVIDENCE_PREFIXES.some((prefix) => ref.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Per-criterion scorers
// ---------------------------------------------------------------------------

/** C1 — clarityOfIntent: rawIntent + confirmedIntent concrete + actionable. */
function scoreClarityOfIntent(sic: SemanticIntentContract): number {
  const raw = typeof sic.rawIntent === "string" ? sic.rawIntent : "";
  const confirmed = typeof sic.confirmedIntent === "string" ? sic.confirmedIntent : "";
  if (raw.length < 30 || confirmed.length < 30) return 0;
  if (isVagueIntent(raw) || isVagueIntent(confirmed)) return 0;
  return 1;
}

/** C2 — scopeBoundedness: affectedSurfaces enumerated + non-overlapping + targeted. */
function scoreScopeBoundedness(sic: SemanticIntentContract): number {
  const surfaces = Array.isArray(sic.affectedSurfaces) ? sic.affectedSurfaces : [];
  if (surfaces.length < 1 || surfaces.length > 10) return 0;
  const valid = surfaces.filter((s) => typeof s === "string" && isPathLike(s));
  if (valid.length < 1) return 0;
  return 1;
}

/** C3 — nounVerbDisambiguation: ≥2 nouns + ≥2 verbs, no vague placeholders. */
function scoreNounVerbDisambiguation(sic: SemanticIntentContract): number {
  const nouns = Array.isArray(sic.approvedNouns) ? sic.approvedNouns : [];
  const verbs = Array.isArray(sic.approvedVerbs) ? sic.approvedVerbs : [];
  const validNouns = nouns.filter(
    (n) => typeof n === "string" && n.trim().length > 0 && n.trim() !== "<noun>",
  );
  const validVerbs = verbs.filter(
    (v) => typeof v === "string" && v.trim().length > 0 && v.trim() !== "<verb>",
  );
  if (validNouns.length >= 2 && validVerbs.length >= 2) return 1;
  return 0;
}

/** C4 — nonGoalsClarity: nonGoals ≥ 1 explicit entry. */
function scoreNonGoalsClarity(sic: SemanticIntentContract): number {
  const ng = Array.isArray(sic.nonGoals) ? sic.nonGoals : [];
  const valid = ng.filter((n) => typeof n === "string" && n.trim().length > 0);
  return valid.length >= 1 ? 1 : 0;
}

/** C5 — downstreamBlastRadius: allowed+forbidden lists non-trivial. */
function scoreDownstreamBlastRadius(sic: SemanticIntentContract): number {
  const allowed = Array.isArray(sic.downstreamAllowed) ? sic.downstreamAllowed : [];
  const forbidden = Array.isArray(sic.downstreamForbidden) ? sic.downstreamForbidden : [];
  const total = allowed.length + forbidden.length;
  return total >= 1 ? 1 : 0;
}

/** C6 — fillSequenceCompleteness: if fillSequence present, count distinct steps / 8. Absent → 0.5 neutral. */
function scoreFillSequenceCompleteness(sic: SemanticIntentContract): number {
  const ext = sic as SicWithFillFields;
  const seq = ext.fillSequence;
  if (!seq || seq.length === 0) return 0.5;
  const totalExpected = EIGHT_TURN_FILL_SEQUENCE.length; // 8
  const distinctSteps = new Set(seq.map((s) => s.step)).size;
  return Math.min(1, distinctSteps / totalExpected);
}

/**
 * C7 — evidenceGrounding: supportingResearchRefs non-empty + each ref starts
 * with a valid evidence prefix. Falls back to seedRid check when no explicit
 * supportingResearchRefs field. Absent → 0.5 neutral.
 */
function scoreEvidenceGrounding(sic: SemanticIntentContract): number {
  // The schema primitive has no `supportingResearchRefs` field directly on
  // SemanticIntentContract — it's carried through an OntologyContextSeed linkage
  // (seedRid). We apply a pragmatic heuristic:
  //   1. If clarificationQuestions reference research evidence paths → 1.
  //   2. If seedRid (v1.62.0 additive field) is present and non-empty → 0.75.
  //   3. Otherwise → 0.5 neutral (unknown; no evidence to penalise).
  const ext = sic as SicWithFillFields & { supportingResearchRefs?: readonly string[] };
  const refs: readonly string[] | undefined = ext.supportingResearchRefs;
  if (Array.isArray(refs) && refs.length > 0) {
    const allValid = refs.every((r) => typeof r === "string" && isValidEvidenceRef(r));
    return allValid ? 1 : 0.5;
  }
  if (typeof ext.seedRid === "string" && ext.seedRid.trim().length > 0) return 0.75;
  return 0.5;
}

// ---------------------------------------------------------------------------
// Top-level scorer
// ---------------------------------------------------------------------------

/**
 * Grade a SemanticIntentContract against the canonical 7-criterion rubric.
 *
 * Equal weight (1/7) per criterion.
 * Verdict: overall ≥ 0.7 → pass; ≥ 0.5 → revise; < 0.5 → reject.
 */
export function gradeSemanticIntentContract(sic: SemanticIntentContract): SicGradingResult {
  const perCriterion = {
    clarityOfIntent:           scoreClarityOfIntent(sic),
    scopeBoundedness:          scoreScopeBoundedness(sic),
    nounVerbDisambiguation:    scoreNounVerbDisambiguation(sic),
    nonGoalsClarity:           scoreNonGoalsClarity(sic),
    downstreamBlastRadius:     scoreDownstreamBlastRadius(sic),
    fillSequenceCompleteness:  scoreFillSequenceCompleteness(sic),
    evidenceGrounding:         scoreEvidenceGrounding(sic),
  };

  const scores = Object.values(perCriterion);
  const overall = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const verdict: "pass" | "revise" | "reject" =
    overall >= 0.7 ? "pass" : overall >= 0.5 ? "revise" : "reject";

  const criterionLines = Object.entries(perCriterion)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join("; ");
  const reasoning =
    `Sprint-124 PR 5.13 — SIC graded via 7-criterion deterministic rubric (canonical plan v2 §4 row 5.13). ` +
    `Per-criterion: ${criterionLines}. Overall=${overall.toFixed(3)}, verdict=${verdict}.`;

  return { perCriterion, overall, verdict, reasoning };
}
