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
import { evaluateFDEReadinessProfile } from "../fde-ontology-engineering/readiness-profile";
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
import { sicBackedDigitalTwinReady } from "./sic-backed-readiness";
import type { SemanticIntentContract } from "../lead-intent/contracts";
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
  /**
   * The MINTED approved SemanticIntentContract snapshot persisted on the project's
   * workflow state. ANTI-FABRICATION: this MUST be populated by the HANDLER from the
   * persisted workflow store (the same `approvedSemanticIntentContractSnapshot` the
   * register seam re-verifies) — NEVER from the MCP caller's input params. It is the
   * unforgeable readiness evidence the decoupled FDE session lacks; a caller cannot
   * supply it to manufacture readiness.
   */
  readonly approvedSicSnapshot?: SemanticIntentContract | undefined;
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

/**
 * OE-2 (D3-2) — read the session's INDEPENDENT readiness grade. The grade is NOT
 * fabricated by this flow: it is whatever a real grading run persisted on the
 * session (`session.readinessProfile`), or — when none was persisted — computed
 * live from the session candidates via `evaluateFDEReadinessProfile`. A caller
 * flag (`readyForDigitalTwin`) can NEVER manufacture a passing grade; if the
 * session does not independently grade ready, the register step does not run.
 * (Replaces the former `passedReadinessProfile()` which stamped score:1 /
 * readyForDigitalTwin:true regardless of evidence.)
 */
function independentReadinessProfile(
  session: FDEOntologyEngineeringSession,
): FDEReadinessProfileEvaluation {
  if (session.readinessProfile !== undefined) return session.readinessProfile;
  return evaluateFDEReadinessProfile(
    session,
    session.readinessProfileId ?? "mission-decision",
  );
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
  // FOLD-1: bucket entries are now { rid, declaration? } — project to bare rids
  // for the idempotency set.
  const alreadyRegistered = new Set<string>([
    ...(snapshot?.objectTypes ?? []),
    ...(snapshot?.actionTypes ?? []),
    ...(snapshot?.functions ?? []),
    ...(snapshot?.linkTypes ?? []),
    ...(snapshot?.roles ?? []),
    ...(snapshot?.properties ?? []),
  ].map((e) => e.rid));

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

  // ── 4) APPROVAL GATE (caller-supplied governance INTENT — never the grade). ──
  // The caller flags express the governance DECISION to elevate; they do NOT
  // manufacture readiness. OE-2 (D3-2): the readiness GRADE is read INDEPENDENTLY
  // from the session below — a caller flag can clear the intent gate but cannot
  // fabricate a passing readiness profile.
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

  // Authorized intent: read the session's INDEPENDENT readiness grade (NOT a
  // fabricated pass). Register runs ONLY when the session itself grades ready —
  // EITHER via a real persisted FDE readiness profile, OR via the GENUINE,
  // UNFORGEABLE minted approved-SIC snapshot the handler sourced from the
  // persisted workflow store (`approvedSicSnapshot`) plus ingested candidates
  // (`sicBackedDigitalTwinReady`). The OR never replaces the unforgeable check; a
  // caller flag still cannot fabricate either branch.
  const persisted = readFDEOntologyEngineeringSession(projectRoot, sessionId) ?? ingestedSession;
  const readinessProfile = independentReadinessProfile(persisted);
  const ready =
    readinessProfile.readyForDigitalTwin === true ||
    sicBackedDigitalTwinReady(input.approvedSicSnapshot, persisted);

  if (!ready) {
    return {
      phase: "awaiting-approval",
      ingest,
      lint,
      sic,
      note:
        "session is not independently graded ready for digital twin " +
        "(neither readinessProfile.readyForDigitalTwin === true nor a re-verified minted " +
        "approved-SIC snapshot + ingested candidates); the caller flag cannot fabricate readiness",
    };
  }

  const gradedSession: FDEOntologyEngineeringSession = {
    ...persisted,
    readinessProfileId: persisted.readinessProfileId ?? readinessProfile.profileId,
    readinessProfile,
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
