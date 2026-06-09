/**
 * elevate — COMPOSED GOVERNED OE-ELEVATION FLOW.
 *
 * A thin orchestrator that runs the already-built governed steps in sequence as
 * ONE flow, so a runtime adapter (Claude/Codex) DRIVES the governed pipeline
 * through pm via a SINGLE governed call instead of ad-hoc individual ones:
 *
 *   ingest (SOURCE → session candidates)
 *     → lint (advisory construction anti-pattern pass)
 *     → draft_sic (Semantic Intent Contract draft from the session)
 *     → APPROVAL GATE (governance — caller-supplied, never auto-fabricated)
 *     → register (mint per-project rids → single batched commit)
 *
 * This file REUSES the governed step cores (it does NOT re-implement ingest /
 * lint / register): `ingestJsonlSourceToCandidates`, `lintConstructionCandidates`,
 * `createSemanticIntentContractDraftFromFDEOntologySession`, and
 * `registerAcceptedCandidates` + the ONE commit path (commit_edits handler). The
 * approval gate mirrors the `register` seam precondition (D3 + D5): register only
 * when the caller EXPLICITLY supplied SIC approved + DTC approved + readiness.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Compose the governed ingest→lint→draft_sic→approve→register flow
 */

import { ingestJsonlSourceToCandidates } from "../fde-ontology-engineering/source-ingest";
import { createSemanticIntentContractDraftFromFDEOntologySession } from "../fde-ontology-engineering/sic-from-session";
import {
  readFDEOntologyEngineeringSession,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../fde-ontology-engineering/session-store";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../fde-ontology-engineering/types";
import { lintConstructionCandidates } from "../construction-lint/lint-candidates";
import type { ConstructionLintFinding } from "../construction-lint/lint-candidates";
import { registerAcceptedCandidates } from "./register-accepted";
import commitEditsHandler from "../../bridge/handlers/commit-edits";
import getOntology from "../../bridge/handlers/get-ontology";
import { COMMIT_EDITS_ACTION_TYPE_RID } from "../../runtime-overlay/schemas-snapshot/ontology/self/action-types";
import type { OntologyEngineeringRegisterResult } from "./types";

export interface ElevateInput {
  readonly projectRoot: string;
  readonly sourceJsonlPath: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly readyForDigitalTwin?: boolean;
  readonly rawUserRequest?: string;
  readonly sessionId?: string;
}

export interface ElevateResult {
  readonly phase: "awaiting-approval" | "elevated";
  readonly ingest: {
    readonly counts: {
      readonly objects: number;
      readonly functions: number;
      readonly actions: number;
      readonly roles: number;
      readonly properties: number;
      readonly links: number;
    };
    readonly skipped: {
      readonly edges: ReadonlyArray<{ readonly candidateId: string; readonly reason: string }>;
      readonly records: ReadonlyArray<{ readonly line: number; readonly reason: string }>;
    };
  };
  readonly lint: { readonly findings: readonly ConstructionLintFinding[] };
  readonly sic: { readonly contractRef?: string };
  readonly register?: OntologyEngineeringRegisterResult;
  readonly note?: string;
}

/**
 * Build the construction-lint input from a session's candidate arrays (the same
 * mapping the `lint`/`register` seams use). Advisory: surfaced, never blocks.
 */
function lintFindingsForSession(
  session: FDEOntologyEngineeringSession,
): readonly ConstructionLintFinding[] {
  return lintConstructionCandidates({
    objects: session.objectCandidates,
    actions: session.actionCandidates,
    functions: session.functionCandidates,
    links: session.linkCandidates,
    roles: session.roleCandidates ?? [],
  });
}

/** A passing readiness grade — set on the session ONLY when the caller authorized. */
function passedReadinessProfile(): FDEReadinessProfileEvaluation {
  return {
    profileId: "mission-decision",
    score: 1,
    readyForSemanticIntent: true,
    readyForDigitalTwin: true,
    requirementResults: [],
    missingRequired: [],
    warnings: [],
  };
}

/**
 * Run the REGISTER governed step exactly as the `register` seam does: re-derive
 * the idempotency snapshot, map accepted candidates → edits, then commit through
 * the ONE commit path. Mirrors handleRegister's body (the gate has already passed
 * in the caller). Attaches advisory lint findings.
 */
async function registerStep(
  session: FDEOntologyEngineeringSession,
  projectRoot: string,
): Promise<OntologyEngineeringRegisterResult> {
  const snapshot = (await getOntology({ project: projectRoot })).snapshot.registeredPrimitives;
  const alreadyRegistered = new Set<string>([
    ...(snapshot?.objectTypes ?? []),
    ...(snapshot?.actionTypes ?? []),
    ...(snapshot?.functions ?? []),
    ...(snapshot?.linkTypes ?? []),
    ...(snapshot?.roles ?? []),
    ...(snapshot?.properties ?? []),
  ]);

  const { edits, registered, skipped } = await registerAcceptedCandidates({
    session,
    projectRoot,
    alreadyRegistered,
  });

  if (edits.length === 0) {
    return {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped,
      invalidReason: "nothing to register: no new accepted candidates (all already registered or none present)",
    };
  }

  const commitResult = await commitEditsHandler({
    project: projectRoot,
    actionTypeRid: COMMIT_EDITS_ACTION_TYPE_RID,
    edits,
  });

  return {
    committed: true,
    registered,
    skipped,
    commitResult,
    lint: lintFindingsForSession(session),
  };
}

/**
 * Compose the governed ingest → lint → draft_sic → approve → register flow.
 *
 * The approval gate is GOVERNANCE, caller-supplied — NEVER auto-fabricated. The
 * flow registers ONLY when the caller explicitly supplied
 * semanticIntentContractStatus==="approved" AND digitalTwinChangeContractStatus==="approved"
 * AND readyForDigitalTwin===true. Otherwise it returns phase:"awaiting-approval"
 * with the ingest counts + lint findings + sic ref and registers nothing.
 */
export async function elevateOntologyFromSource(input: ElevateInput): Promise<ElevateResult> {
  const projectRoot = input.projectRoot;

  // ── 1) INGEST: SOURCE jsonl → session candidate arrays (capture sessionId). ──
  const { session: ingestedSession, counts, skipped } = ingestJsonlSourceToCandidates({
    sourceJsonlPath: input.sourceJsonlPath,
    projectRoot,
    rawUserRequest: input.rawUserRequest,
  });
  const sessionId = ingestedSession.sessionId;

  // ── 2) LINT: advisory construction anti-pattern pass over the candidates. ──
  const findings = lintFindingsForSession(ingestedSession);

  // ── 3) DRAFT_SIC: Semantic Intent Contract draft from the session. ──
  const contract = createSemanticIntentContractDraftFromFDEOntologySession(ingestedSession);
  const contractRef = contract.contractId;

  const ingest = { counts, skipped };
  const lint = { findings };
  const sic = { contractRef };

  // ── 4) APPROVAL GATE (caller-supplied governance — never auto-fabricated). ──
  const authorized =
    input.semanticIntentContractStatus === "approved" &&
    input.digitalTwinChangeContractStatus === "approved" &&
    input.readyForDigitalTwin === true;

  if (!authorized) {
    return {
      phase: "awaiting-approval",
      ingest,
      lint,
      sic,
      note: "supply approved SIC+DTC contract statuses and readiness to register",
    };
  }

  // Authorized: persist the passing readiness grade on the session (the grade
  // signal the register gate reads), then run the governed register step.
  const persisted = readFDEOntologyEngineeringSession(projectRoot, sessionId) ?? ingestedSession;
  const gradedSession: FDEOntologyEngineeringSession = {
    ...persisted,
    readinessProfileId: "mission-decision",
    readinessProfile: passedReadinessProfile(),
    updatedAt: new Date().toISOString(),
  };
  writeFDEOntologyEngineeringSessionSnapshot(gradedSession);

  const register = await registerStep(gradedSession, projectRoot);

  return {
    phase: "elevated",
    ingest,
    lint,
    sic,
    register,
  };
}
