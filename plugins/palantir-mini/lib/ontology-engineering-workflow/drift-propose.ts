/**
 * palantir-mini v7.21.0 — drift-propose: Pillar C propose-step SCAFFOLD (pure, read-only).
 * @owner palantirkc-plugin-events
 * @purpose Compose re-elevation PROPOSALS from a drift staleness report (detect→propose
 *          seam, gated, NO commit). The drift detector (lib/event-log/ontology-staleness.ts)
 *          produces the report; this module turns each stale primitive into a FULL
 *          `GlobalBranchingProposal` the existing review flow + elevate gate consume unchanged.
 *
 * Domain: LEARN (BackwardProp drift→proposal) + LOGIC (pure compose). STRICTLY READ-ONLY.
 *
 * BOUNDARY (SPEC #2 / DESIGN §2.1): this module DETECTS NOTHING and MUTATES NOTHING. It is a
 *   pure function from an `OntologyStalenessReport` to proposal objects. It MUST NOT call
 *   `elevate`'s register path, MUST NOT call `commit_edits`, and performs NO fs/git/IO.
 *   Persistence is the SKILL's job (skills/pm-ontology-drift-propose). The two-layer
 *   governance (no auto-apply, no proposal-spam) is enforced by the GATE below.
 *
 * GATE (SPEC #2, three guards): proposals are emitted ONLY when
 *   `report.comparator === "per-file-sha"` (the noisier repo-wide raw-sha path is too coarse
 *   to drive a proposal). The structural-fingerprint comparator that would suppress benign
 *   same-file edits is DEFERRED (DESIGN OPEN #1) — until it lands, `report.noiseWarning` is
 *   threaded VERBATIM into every proposal's `validationSummary.notes`, and this scaffold is
 *   invoked MANUALLY via its SKILL (NOT auto-fired by the always-on Stop hook).
 *
 * ENUM GAP (SPEC #2 correction 1, rule-08 follow-up): `OntologyResourceKind` covers
 *   object/link/action/function but NOT `role` or `property`. Stale role/property entries are
 *   returned in an explicit `skipped[]` list ({rid, kind, reason}), NEVER silently dropped.
 *   Widening the enum is an additive schema change owned by the schema owner, not done here.
 */
// Domain: LEARN (prim-learn — BackwardProp drift→proposal) + LOGIC (pure compose)

import type {
  OntologyStalenessReport,
  StalePrimitive,
  StalePrimitiveKind,
} from "../event-log/ontology-staleness";
import type {
  OntologyResourceKind,
  OntologyProposalRid,
  OntologyBranchRid,
  OntologyProposalDeclaration,
} from "#schemas/ontology/primitives/ontology-branch-proposal";
import {
  ontologyProposalRid,
  ontologyBranchRid,
} from "#schemas/ontology/primitives/ontology-branch-proposal";
import type { GlobalBranchingProposal } from "#schemas/ontology/primitives/global-branching-proposal";
import { isGlobalBranchingProposal } from "#schemas/ontology/primitives/global-branching-proposal";

/**
 * Map a detector `StalePrimitiveKind` to an `OntologyResourceKind`, or `undefined`
 * when the enum has no covering value (role / property — the rule-08 gap). LinkType,
 * ObjectType, ActionType, Function are covered.
 */
function kindToResourceKind(kind: StalePrimitiveKind): OntologyResourceKind | undefined {
  switch (kind) {
    case "objectType": return "object-type";
    case "linkType":   return "link-type";
    case "actionType": return "action-type";
    case "function":   return "aip-logic-function";
    case "role":       return undefined; // enum gap — see skipped[]
    case "property":   return undefined; // enum gap — see skipped[]
    default:           return undefined;
  }
}

/** A stale primitive the propose-step could NOT turn into a proposal, with the reason. */
export interface SkippedStaleEntry {
  readonly rid: string;
  readonly kind: StalePrimitiveKind;
  readonly reason: string;
}

/** Result of composing proposals from a staleness report. */
export interface DriftProposeResult {
  /** One GlobalBranchingProposal per covered stale primitive (empty when gated out). */
  readonly proposals: GlobalBranchingProposal[];
  /** Stale entries with no covering OntologyResourceKind (role / property), never dropped. */
  readonly skipped: SkippedStaleEntry[];
  /** Why no proposals were emitted, when `proposals` is empty (gate / no-stale). */
  readonly gateNote?: string;
}

const ENUM_GAP_REASON = "OntologyResourceKind enum gap, rule-08 follow-up";

/** The single-reviewer approval policy used for a drift re-elevation proposal. */
function singleReviewerPolicy() {
  return {
    eligibleReviewers: ["ontology-owner"],
    requiredApprovals: 1,
    allowSelfApprove: false,
  } as const;
}

/**
 * Compose a FULL GlobalBranchingProposal for one stale primitive. The embedded
 * `baseProposal` is a complete OntologyProposalDeclaration with the single affected
 * resource; `noiseWarning` is threaded VERBATIM into `validationSummary.notes`.
 */
function composeProposal(
  prim: StalePrimitive,
  resourceKind: OntologyResourceKind,
  report: OntologyStalenessReport,
  nowIso: string,
): GlobalBranchingProposal {
  const proposalId = ontologyProposalRid(
    `proposal:drift:${prim.rid}:${prim.atopWhich}`,
  ) as OntologyProposalRid;
  const sourceBranchId = ontologyBranchRid(`branch:drift:${prim.rid}`) as OntologyBranchRid;

  const notes =
    `Drift re-elevation candidate. comparator=${report.comparator}; ` +
    `atopWhich=${prim.atopWhich}; comparedAgainst=${prim.comparedAgainst}; ` +
    `backingSourceRef=${prim.backingSourceRef ?? "(none)"}. ` +
    `noiseWarning(verbatim): ${report.noiseWarning ?? "(none)"}`;

  const baseProposal: OntologyProposalDeclaration = {
    proposalId,
    sourceBranchId,
    title: `re-elevate ${prim.rid} (drift: ${report.comparator})`,
    status: "draft",
    affectedResources: [{ kind: resourceKind, rid: prim.rid }],
    validationSummary: { notes },
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    proposalId,
    baseProposal,
    applicationsAffected: [],
    approvalPolicy: singleReviewerPolicy(),
    doNotMerge: false,
    lifecycleState: "in-review",
    resourceCheckResults: [],
  };
}

/**
 * PURE, READ-ONLY drift propose-step. Turns each stale primitive in `report.stale[]` whose
 * kind maps to a covered `OntologyResourceKind` into a FULL GlobalBranchingProposal
 * (`isGlobalBranchingProposal(p) === true`). role / property stale entries are returned in
 * `skipped[]` (enum gap), never dropped.
 *
 * GATE: emits proposals ONLY when `report.comparator === "per-file-sha"`. A `raw-sha` report
 * yields zero proposals (the role/property `skipped[]` is still reported for visibility) and a
 * `gateNote`. Composes objects only — writes nothing, calls no elevate/commit path.
 *
 * @param report the staleness report from `detectOntologyStaleness(Git)`.
 * @param nowIso optional ISO timestamp for createdAt/updatedAt (deterministic in tests).
 */
export function driftPropose(
  report: OntologyStalenessReport,
  nowIso: string = new Date().toISOString(),
): DriftProposeResult {
  const skipped: SkippedStaleEntry[] = [];

  // Role/property are visible regardless of gate (the enum gap is comparator-independent).
  for (const prim of report.stale) {
    if (kindToResourceKind(prim.kind) === undefined) {
      skipped.push({ rid: prim.rid, kind: prim.kind, reason: ENUM_GAP_REASON });
    }
  }

  // GATE: only the per-file-sha comparator is precise enough to drive a proposal.
  if (report.comparator !== "per-file-sha") {
    return {
      proposals: [],
      skipped,
      gateNote:
        `gated: comparator="${report.comparator}" — drift propose-step emits proposals ONLY ` +
        `for "per-file-sha". Raw-sha is too coarse (fires on every backing commit). ` +
        `Structural fingerprint (DESIGN OPEN #1) is deferred.`,
    };
  }

  const proposals: GlobalBranchingProposal[] = [];
  for (const prim of report.stale) {
    const resourceKind = kindToResourceKind(prim.kind);
    if (resourceKind === undefined) continue; // already in skipped[]
    const proposal = composeProposal(prim, resourceKind, report, nowIso);
    // Self-check: the composed object must satisfy the snapshot's type guard.
    if (isGlobalBranchingProposal(proposal)) proposals.push(proposal);
  }

  return {
    proposals,
    skipped,
    ...(proposals.length === 0
      ? { gateNote: "no covered stale primitives to propose (all stale entries skipped or none stale)" }
      : {}),
  };
}
