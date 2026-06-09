/**
 * register-accepted — map an approved ontology-engineering session's accepted
 * candidate set → OntologyEdit[] (ENTRY-loop register seam, O-2 closure).
 *
 * This is the PURE core of the `action:"register"` seam: it consumes the
 * session's *Candidates and produces the register OntologyEdit[] (via the four
 * live applyRegister* edit-functions), minting a per-project namespaced rid for
 * each (project-isolated). It does NOT commit — persistence is commitEdits' job
 * (the handler calls the commit handler with the concatenated edits). Same
 * 2-stage seam the O-2 round-trip exercises.
 *
 * ORDER is load-bearing: objects → actions → functions → links. Objects are
 * registered first and their plainName→rid map is built so a LinkType candidate
 * can resolve its sourceObject/targetObject to the just-minted object rids.
 * A link whose endpoints don't both resolve is SKIPPED-and-reported (never
 * throws) — D6.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Map accepted candidates → register OntologyEdit[] (register seam)
 */

// Side-effect: ensures the four pm.actions.ontology.applyRegister* verbs are
// registered in the edit-function registry when this module loads.
import "../actions/ontology-register";

import { applyEditFunction } from "../actions/tier2-function";
import type { OntologyEdit } from "../event-log/types";
import type { FDEOntologyEngineeringSession } from "../fde-ontology-engineering/types";
import { projectPrimitiveRid } from "../actions/project-primitive-rid";

export interface RegisterAcceptedInput {
  readonly session: FDEOntologyEngineeringSession;
  readonly projectRoot: string;
  /**
   * Rids already materialized in the project's ontology snapshot. Candidates
   * whose minted rid is in this set are SKIPPED (no duplicate edit emitted) —
   * this is what makes a repeated `register` idempotent against the append-only
   * fold (which does not itself dedup). Optional; defaults to empty.
   */
  readonly alreadyRegistered?: ReadonlySet<string>;
}

export interface RegisterAcceptedResult {
  readonly edits: OntologyEdit[];
  readonly registered: {
    readonly objectTypes: string[];
    readonly actionTypes: string[];
    readonly functions: string[];
    readonly linkTypes: string[];
  };
  readonly skipped: {
    readonly links: Array<{ linkName: string; reason: string }>;
  };
}

/**
 * Register ALL *Candidates present on the session. Approval IS the accept of the
 * contract's candidate set (D1) — the gate that this set is approved lives in the
 * handler (the precondition re-check), not here.
 */
export async function registerAcceptedCandidates(
  input: RegisterAcceptedInput,
): Promise<RegisterAcceptedResult> {
  const { session, projectRoot } = input;
  const alreadyRegistered = input.alreadyRegistered ?? new Set<string>();
  const edits: OntologyEdit[] = [];
  const registered = {
    objectTypes: [] as string[],
    actionTypes: [] as string[],
    functions: [] as string[],
    linkTypes: [] as string[],
  };
  const skipped = { links: [] as Array<{ linkName: string; reason: string }> };

  // plainName → rid for objects, so links can resolve their endpoints.
  const objectRidByName = new Map<string, string>();

  // ── 1) Objects ────────────────────────────────────────────────────────────
  for (const candidate of session.objectCandidates ?? []) {
    const rid = projectPrimitiveRid(projectRoot, "object-type", candidate.plainName);
    // Always record the name→rid binding so links resolve, even when the object
    // is already registered (idempotent re-register).
    objectRidByName.set(candidate.plainName, rid);
    if (alreadyRegistered.has(rid)) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterObjectType",
      {
        rid,
        declaration: {
          plainName: candidate.plainName,
          whyItMayMatter: candidate.whyItMayMatter,
          evidenceRefs: candidate.evidenceRefs,
          candidateId: candidate.candidateId,
        },
      },
    );
    edits.push(...e);
    registered.objectTypes.push(rid);
  }

  // ── 2) Actions ────────────────────────────────────────────────────────────
  for (const candidate of session.actionCandidates ?? []) {
    const rid = projectPrimitiveRid(projectRoot, "action-type", candidate.plainName);
    if (alreadyRegistered.has(rid)) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterActionType",
      {
        rid,
        declaration: {
          plainName: candidate.plainName,
          operationalIntent: candidate.operationalIntent,
          writebackRisk: candidate.writebackRisk,
          submissionCriteria: candidate.submissionCriteria,
          evidenceRefs: candidate.evidenceRefs,
          candidateId: candidate.candidateId,
        },
      },
    );
    edits.push(...e);
    registered.actionTypes.push(rid);
  }

  // ── 3) Functions ──────────────────────────────────────────────────────────
  for (const candidate of session.functionCandidates ?? []) {
    const rid = projectPrimitiveRid(projectRoot, "function", candidate.plainName);
    if (alreadyRegistered.has(rid)) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterFunction",
      {
        rid,
        declaration: {
          plainName: candidate.plainName,
          logicIntent: candidate.logicIntent,
          deterministic: candidate.deterministic,
          evidenceRefs: candidate.evidenceRefs,
          candidateId: candidate.candidateId,
        },
      },
    );
    edits.push(...e);
    registered.functions.push(rid);
  }

  // ── 4) Links (skip-and-report when an endpoint is unresolved — D6) ─────────
  for (const candidate of session.linkCandidates ?? []) {
    const srcName = candidate.sourceObject;
    const dstName = candidate.targetObject;
    const srcRid = srcName ? objectRidByName.get(srcName) : undefined;
    const dstRid = dstName ? objectRidByName.get(dstName) : undefined;
    if (srcRid === undefined || dstRid === undefined) {
      const missing: string[] = [];
      if (srcRid === undefined) missing.push(`sourceObject=${srcName ?? "(none)"}`);
      if (dstRid === undefined) missing.push(`targetObject=${dstName ?? "(none)"}`);
      skipped.links.push({
        linkName: candidate.plainName,
        reason: `unresolved endpoint(s): ${missing.join(", ")}`,
      });
      continue;
    }
    const rid = projectPrimitiveRid(projectRoot, "link-type", candidate.plainName);
    if (alreadyRegistered.has(rid)) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterLinkType",
      { rid, srcRid, dstRid, linkName: candidate.plainName },
    );
    edits.push(...e);
    registered.linkTypes.push(rid);
  }

  return { edits, registered, skipped };
}
