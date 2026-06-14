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
 * ORDER is load-bearing: objects → actions → functions → roles → properties →
 * links. All non-link kinds are registered first and a COMBINED plainName→rid map
 * is built across ALL of them, so a LinkType candidate can resolve its
 * sourceObject/targetObject against ANY registered primitive — a DATA↔LOGIC↔ACTION
 * edge (e.g. object→function) resolves, not just object→object. A link whose
 * endpoint name is truly absent from the combined map is SKIPPED-and-reported
 * (never throws) — D6.
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
    readonly roles: string[];
    readonly properties: string[];
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
    roles: [] as string[],
    properties: [] as string[],
  };
  const skipped = { links: [] as Array<{ linkName: string; reason: string }> };

  // COMBINED plainName → rid across ALL non-link kinds, so a LinkType candidate
  // can resolve its endpoints against ANY registered primitive (cross-layer:
  // object↔function↔action↔role↔property), not just objects. Built in the same
  // order primitives are registered below; later same-name bindings win, but a
  // frozen SOURCE should not collide plain names across kinds.
  const nameToRid = new Map<string, string>();

  // ── 1) Objects ────────────────────────────────────────────────────────────
  for (const candidate of session.objectCandidates ?? []) {
    // Prefer a SOURCE-declared rid (e.g. a previously-promoted pm.self.ontology
    // atom) over a freshly-minted one, so authored rids round-trip; mint when absent.
    const rid =
      candidate.declaredRid ?? projectPrimitiveRid(projectRoot, "object-type", candidate.plainName);
    // Always record the name→rid binding so links resolve, even when the object
    // is already registered (idempotent re-register).
    nameToRid.set(candidate.plainName, rid);
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
    const rid =
      candidate.declaredRid ?? projectPrimitiveRid(projectRoot, "action-type", candidate.plainName);
    nameToRid.set(candidate.plainName, rid);
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
    const rid =
      candidate.declaredRid ?? projectPrimitiveRid(projectRoot, "function", candidate.plainName);
    nameToRid.set(candidate.plainName, rid);
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

  // ── 4) Roles (principal→permission grants; no endpoint dependency) ─────────
  for (const candidate of session.roleCandidates ?? []) {
    const rid = projectPrimitiveRid(projectRoot, "role", candidate.plainName);
    nameToRid.set(candidate.plainName, rid);
    if (alreadyRegistered.has(rid)) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterRole",
      {
        rid,
        declaration: {
          plainName: candidate.plainName,
          principalKind: candidate.principalKind,
          grantedResourceRefs: candidate.grantedResourceRefs,
          permissions: candidate.permissions,
          candidateId: candidate.candidateId,
          evidenceRefs: candidate.evidenceRefs,
        },
      },
    );
    edits.push(...e);
    registered.roles.push(rid);
  }

  // ── 5) Properties (an ObjectType's stored field; owner resolved AFTER objects) ──
  for (const candidate of session.propertyCandidates ?? []) {
    const rid =
      candidate.declaredRid ?? projectPrimitiveRid(projectRoot, "property", candidate.plainName);
    nameToRid.set(candidate.plainName, rid);
    if (alreadyRegistered.has(rid)) continue;
    // Resolve the owner ObjectType rid via the combined map (objects are registered
    // before this pass). If unresolved, register the property standalone — never skip.
    const ownerRid = candidate.ownerObjectName
      ? nameToRid.get(candidate.ownerObjectName)
      : undefined;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterProperty",
      {
        rid,
        declaration: {
          plainName: candidate.plainName,
          ownerObjectName: candidate.ownerObjectName,
          ownerRid,
          dataType: candidate.dataType,
          candidateId: candidate.candidateId,
          evidenceRefs: candidate.evidenceRefs,
        },
      },
    );
    edits.push(...e);
    registered.properties.push(rid);
  }

  // ── 6) Links — LAST so endpoints resolve against the COMBINED cross-layer map.
  //       Skip-and-report only when an endpoint name is truly absent (D6).
  for (const candidate of session.linkCandidates ?? []) {
    const srcName = candidate.sourceObject;
    const dstName = candidate.targetObject;
    const srcRid = srcName ? nameToRid.get(srcName) : undefined;
    const dstRid = dstName ? nameToRid.get(dstName) : undefined;
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
    const rid =
      candidate.declaredRid ?? projectPrimitiveRid(projectRoot, "link-type", candidate.plainName);
    if (alreadyRegistered.has(rid)) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterLinkType",
      {
        rid,
        srcRid,
        dstRid,
        linkName: candidate.plainName,
        // OE-11: thread the candidate's first-class cardinality through register so
        // it survives into the FOLD-1 LinkType declaration. Omitted when absent.
        ...(candidate.srcCardinality !== undefined ? { srcCardinality: candidate.srcCardinality } : {}),
        ...(candidate.dstCardinality !== undefined ? { dstCardinality: candidate.dstCardinality } : {}),
      },
    );
    edits.push(...e);
    registered.linkTypes.push(rid);
  }

  return { edits, registered, skipped };
}
