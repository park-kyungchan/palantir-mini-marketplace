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
 * W2 (feat/cartography-and-model-policy) — ELEVATION AS STATUS TRANSITION:
 * candidate → registered used to be a LOSSY copy: business-meaning fields
 * captured on the candidate (whyItMayMatter / businessMeaning / operationalIntent
 * / evidenceRefs / evaluatorKind / invokingActorScopeRef) were dropped and never
 * reached the registered declaration. Every `mapXCandidateToDeclaration()` below
 * is now a PURE, exported, unit-testable function that threads those fields into
 * `declaration.semantics` (+ dedicated fields for Function's evaluatorKind /
 * invokingActorScopeRef — see aip-logic-function.ts doc comment for why those two
 * stay dedicated rather than folded into the free-form semantics blob) plus
 * `declaration.status` (always "active" at registration time) and
 * `declaration.provenance` (candidateId + sicRef + promotedAt + byWhom). This
 * makes candidate→registered a STATUS TRANSITION that preserves semantics,
 * mirroring real Foundry's ObjectType Description+Status persisting across
 * status transitions with an audit record — not a lossy copy that discards them.
 *
 * ChatbotContextCandidate is DELIBERATELY NOT given a registration path here
 * (no ObjectType/LinkType/ActionType/Function/Role fits its application-state
 * shape) — see `chatbotContextLineagePayload()` and elevate.ts, which instead
 * preserve its content into the elevation event payload so it is at least
 * captured in lineage. This is a documented scope decision, not an oversight.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Map accepted candidates → register OntologyEdit[] (register seam)
 */

// Side-effect: ensures the four pm.actions.ontology.applyRegister* verbs are
// registered in the edit-function registry when this module loads.
import "../actions/ontology-register";

import { applyEditFunction } from "../actions/tier2-function";
import type { OntologyEdit } from "../event-log/types";
import type {
  FDEOntologyEngineeringSession,
  ObjectTypeCandidate,
  LinkTypeCandidate,
  ActionTypeCandidate,
  FunctionCandidate,
  RoleCandidate,
  PropertyCandidate,
  ChatbotContextCandidate,
} from "../fde-ontology-engineering/types";
import { projectPrimitiveRid } from "../actions/project-primitive-rid";
import { resolveHostRuntimeIdentity } from "../runtime/identity";

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
  /**
   * Re-bind (drift-fold re-elevation) mode. When true, candidates whose rid is in
   * `alreadyRegistered` are NOT skipped — their EXISTING declaration is RE-EMITTED
   * as an edit so commitEdits stamps a fresh edit_committed at atopWhich=HEAD
   * (pure provenance; no grammar change). Genuinely-new rids (rid NOT in
   * `alreadyRegistered`) follow the existing register path unchanged. Default false.
   * The CALLER is responsible for proving the supplied candidate set is
   * all-already-registered before passing true (fail-closed: this flag re-emits, it
   * does NOT verify).
   */
  readonly reElevateAlreadyRegistered?: boolean;
  /**
   * The Semantic Intent Contract ref (contractId) that authorized this
   * elevation (W2 — PrimitiveProvenance.sicRef). Optional: the register seam
   * has historically been callable without a bound SIC (e.g. drift-fold
   * re-elevation); when absent, `provenance.sicRef` is simply omitted rather
   * than persisting a fabricated value.
   */
  readonly sicRef?: string;
  /**
   * Identity of the actor/runtime performing this elevation (W2 —
   * PrimitiveProvenance.byWhom). Defaults to `resolveHostRuntimeIdentity()`
   * (the same host-runtime identity resolution the workflow handler uses
   * elsewhere) so the field is never fabricated as a literal "user"/name.
   */
  readonly byWhom?: string;
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
  /**
   * W2 — ChatbotContextCandidate lineage-only capture. ChatbotContextCandidate
   * has NO registration path (see file doc comment); its content is instead
   * surfaced here so the caller (elevate.ts) can fold it into the elevation
   * event payload, preserving it in lineage even though nothing is registered.
   */
  readonly chatbotContextLineage: ReadonlyArray<{
    readonly candidateId: string;
    readonly plainName: string;
    readonly applicationStateNeed: string;
    readonly retrievalContextNeed?: string;
    readonly evidenceRefs: readonly string[];
  }>;
}

/**
 * Write-side mirror of the staleness detector's read-side `deriveBackingRef`: pick
 * the FIRST `evidenceRefs` entry that is a real path (string, non-empty, NOT a
 * `data:` inline literal). Returns `undefined` when none qualify, so the present-only
 * `backingSourceRef` is omitted rather than persisting a `data:` literal the
 * detector would skip anyway.
 */
function firstRealPath(evidenceRefs: readonly unknown[] | undefined): string | undefined {
  if (!Array.isArray(evidenceRefs)) return undefined;
  for (const ref of evidenceRefs) {
    if (typeof ref === "string" && ref.length > 0 && !ref.startsWith("data:")) return ref;
  }
  return undefined;
}

/** Present-only backingSourceRef derivation shared by every mapXCandidateToDeclaration below. */
function backingSourceRefOf(candidate: {
  readonly backingSourceRef?: string;
  readonly evidenceRefs?: readonly unknown[];
}): Record<string, unknown> {
  const value = candidate.backingSourceRef ?? firstRealPath(candidate.evidenceRefs);
  return value !== undefined ? { backingSourceRef: value } : {};
}

/**
 * W2 elevation provenance. Pure — the caller supplies `promotedAt` (so tests
 * can pin a deterministic timestamp) and the optional `sicRef`/`byWhom` from
 * `RegisterAcceptedInput`. Always populated with `candidateId` +
 * `promotedAt` + `byWhom`; `sicRef` is present-only.
 */
export interface ElevationProvenanceContext {
  readonly sicRef?: string;
  readonly byWhom: string;
  readonly promotedAt: string;
}

function provenanceFor(
  candidateId: string,
  ctx: ElevationProvenanceContext,
): Record<string, unknown> {
  return {
    provenance: {
      candidateId,
      promotedAt: ctx.promotedAt,
      byWhom: ctx.byWhom,
      ...(ctx.sicRef !== undefined ? { sicRef: ctx.sicRef } : {}),
    },
  };
}

// ─── Pure candidate → registered-declaration mapping functions ─────────────
//
// Each function is PURE (no fs, no clock read — `ctx.promotedAt` is supplied
// by the caller) and returns the `declaration` bag threaded into the
// corresponding applyRegister* edit-function's `declaration` param. Exported
// so both `registerAcceptedCandidates` (below) and the check-semantic-loss
// self-check axis (bridge/handlers/pm-plugin-self-check/check-semantic-loss.ts)
// exercise the SAME real mapping — a behavioral check, not source-text grepping.

/**
 * ObjectTypeCandidate → registered ObjectType declaration.
 * whyItMayMatter → semantics.whyItMayMatter; evidenceRefs → semantics.evidenceRefs.
 */
export function mapObjectTypeCandidateToDeclaration(
  candidate: ObjectTypeCandidate,
  ctx: ElevationProvenanceContext,
): Record<string, unknown> {
  return {
    plainName: candidate.plainName,
    whyItMayMatter: candidate.whyItMayMatter,
    evidenceRefs: candidate.evidenceRefs,
    candidateId: candidate.candidateId,
    ...backingSourceRefOf(candidate),
    semantics: {
      whyItMayMatter: candidate.whyItMayMatter,
      evidenceRefs: candidate.evidenceRefs,
    },
    status: "active",
    ...provenanceFor(candidate.candidateId, ctx),
  };
}

/**
 * ActionTypeCandidate → registered ActionType declaration.
 * operationalIntent → semantics.businessMeaning (the ActionType analog of
 * LinkType's businessMeaning); evidenceRefs → semantics.evidenceRefs.
 */
export function mapActionTypeCandidateToDeclaration(
  candidate: ActionTypeCandidate,
  ctx: ElevationProvenanceContext,
): Record<string, unknown> {
  return {
    plainName: candidate.plainName,
    operationalIntent: candidate.operationalIntent,
    writebackRisk: candidate.writebackRisk,
    submissionCriteria: candidate.submissionCriteria,
    evidenceRefs: candidate.evidenceRefs,
    candidateId: candidate.candidateId,
    ...backingSourceRefOf(candidate),
    semantics: {
      businessMeaning: candidate.operationalIntent,
      evidenceRefs: candidate.evidenceRefs,
    },
    status: "active",
    ...provenanceFor(candidate.candidateId, ctx),
  };
}

/**
 * FunctionCandidate → registered Function declaration.
 * logicIntent → semantics.businessMeaning; evidenceRefs → semantics.evidenceRefs.
 * evaluatorKind / invokingActorScopeRef are preserved as DEDICATED fields
 * (least-lossy home decision — see aip-logic-function.ts doc comment: both are
 * closed/ref-shaped values that governance tooling resolves structurally, so
 * folding them into the free-form semantics.businessMeaning string would lose
 * machine-readability).
 */
export function mapFunctionCandidateToDeclaration(
  candidate: FunctionCandidate,
  ctx: ElevationProvenanceContext,
): Record<string, unknown> {
  return {
    plainName: candidate.plainName,
    logicIntent: candidate.logicIntent,
    deterministic: candidate.deterministic,
    evidenceRefs: candidate.evidenceRefs,
    candidateId: candidate.candidateId,
    ...backingSourceRefOf(candidate),
    semantics: {
      businessMeaning: candidate.logicIntent,
      evidenceRefs: candidate.evidenceRefs,
    },
    status: "active",
    ...provenanceFor(candidate.candidateId, ctx),
    ...(candidate.evaluatorKind !== undefined ? { evaluatorKind: candidate.evaluatorKind } : {}),
    ...(candidate.invokingActorScopeRef !== undefined
      ? { invokingActorScopeRef: candidate.invokingActorScopeRef }
      : {}),
  };
}

/**
 * RoleCandidate → registered Role declaration.
 * whyItMayMatter → semantics.whyItMayMatter; evidenceRefs → semantics.evidenceRefs
 * (RoleCandidate's semantic-bearing fields — same treatment as ObjectType, since
 * Role's own doc comment frames it as "why does this principal->permission grant
 * exist", the same shape as an ObjectType's whyItMayMatter).
 */
export function mapRoleCandidateToDeclaration(
  candidate: RoleCandidate,
  ctx: ElevationProvenanceContext,
): Record<string, unknown> {
  return {
    plainName: candidate.plainName,
    principalKind: candidate.principalKind,
    grantedResourceRefs: candidate.grantedResourceRefs,
    permissions: candidate.permissions,
    candidateId: candidate.candidateId,
    evidenceRefs: candidate.evidenceRefs,
    ...backingSourceRefOf(candidate),
    semantics: {
      whyItMayMatter: candidate.whyItMayMatter,
      evidenceRefs: candidate.evidenceRefs,
    },
    status: "active",
    ...provenanceFor(candidate.candidateId, ctx),
  };
}

/**
 * PropertyCandidate → registered Property declaration (the 6th elevation
 * kind — W2 remediation parity closure). whyItMayMatter → semantics.
 * whyItMayMatter; evidenceRefs → semantics.evidenceRefs (same treatment as
 * ObjectType/Role, since PropertyCandidate's own doc comment frames
 * `whyItMayMatter` the same way). `ownerRid` is resolved by the caller
 * (registerAcceptedCandidates) via the combined name->rid map BEFORE this
 * mapper runs — see the "Properties" registration pass below — and threaded
 * in as part of the same declaration bag so it survives alongside semantics/
 * status/provenance rather than being assembled ad hoc at the call site.
 */
export function mapPropertyCandidateToDeclaration(
  candidate: PropertyCandidate,
  ctx: ElevationProvenanceContext,
  ownerRid: string | undefined,
): Record<string, unknown> {
  return {
    plainName: candidate.plainName,
    ownerObjectName: candidate.ownerObjectName,
    ownerRid,
    dataType: candidate.dataType,
    // ingest-widening: thread column-level access-security (readableBy) into
    // the Property declaration so it SURVIVES into the FOLD-1 declaration the
    // same way the ActionType's submissionCriteria does. Present-only so
    // legacy folds (no access-security) stay byte-identical.
    ...(candidate.readableBy !== undefined ? { readableBy: candidate.readableBy } : {}),
    candidateId: candidate.candidateId,
    evidenceRefs: candidate.evidenceRefs,
    ...backingSourceRefOf(candidate),
    semantics: {
      whyItMayMatter: candidate.whyItMayMatter,
      evidenceRefs: candidate.evidenceRefs,
    },
    status: "active",
    ...provenanceFor(candidate.candidateId, ctx),
  };
}

/**
 * LinkTypeCandidate → registered LinkType semantics/status/provenance bag.
 * businessMeaning → semantics.businessMeaning (THE CORE BUG this task closes:
 * LinkTypeCandidate.businessMeaning was previously dropped entirely — the
 * native `kind:"link"` OntologyEdit variant carries no `properties` bag, so
 * this is threaded directly onto the edit's own fields, not a `declaration`
 * param, by `applyRegisterLinkType` in ontology-register.ts).
 */
export function mapLinkTypeCandidateToLinkEditFields(
  candidate: LinkTypeCandidate,
  ctx: ElevationProvenanceContext,
): {
  readonly semantics: { readonly businessMeaning: string; readonly evidenceRefs: readonly string[] };
  readonly status: "active";
  readonly provenance: Record<string, unknown>;
} {
  return {
    semantics: {
      businessMeaning: candidate.businessMeaning,
      evidenceRefs: candidate.evidenceRefs,
    },
    status: "active",
    provenance: (provenanceFor(candidate.candidateId, ctx) as { provenance: Record<string, unknown> })
      .provenance,
  };
}

/**
 * ChatbotContextCandidate → lineage-only payload. NOT a registered-primitive
 * mapping (there is no ObjectType/LinkType/ActionType/Function/Role shape it
 * fits) — see file doc comment for the deliberate scope decision. Exported so
 * the same pure function backs both `registerAcceptedCandidates`'s
 * `chatbotContextLineage` result field and the self-check axis.
 */
export function chatbotContextLineagePayload(
  candidate: ChatbotContextCandidate,
): {
  readonly candidateId: string;
  readonly plainName: string;
  readonly applicationStateNeed: string;
  readonly retrievalContextNeed?: string;
  readonly evidenceRefs: readonly string[];
} {
  return {
    candidateId: candidate.candidateId,
    plainName: candidate.plainName,
    applicationStateNeed: candidate.applicationStateNeed,
    ...(candidate.retrievalContextNeed !== undefined
      ? { retrievalContextNeed: candidate.retrievalContextNeed }
      : {}),
    evidenceRefs: candidate.evidenceRefs,
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
  // Re-bind mode (default false): an already-registered rid is RE-EMITTED instead
  // of skipped, so its declaration is committed afresh at atopWhich=HEAD. Genuinely-
  // new rids are unaffected either way. Fail-closed: caller proves all-registered.
  const reElevate = input.reElevateAlreadyRegistered === true;
  const provenanceCtx: ElevationProvenanceContext = {
    sicRef: input.sicRef,
    byWhom: input.byWhom ?? resolveHostRuntimeIdentity(),
    promotedAt: new Date().toISOString(),
  };
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
    if (alreadyRegistered.has(rid) && !reElevate) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterObjectType",
      {
        rid,
        declaration: mapObjectTypeCandidateToDeclaration(candidate, provenanceCtx),
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
    if (alreadyRegistered.has(rid) && !reElevate) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterActionType",
      {
        rid,
        declaration: mapActionTypeCandidateToDeclaration(candidate, provenanceCtx),
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
    if (alreadyRegistered.has(rid) && !reElevate) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterFunction",
      {
        rid,
        declaration: mapFunctionCandidateToDeclaration(candidate, provenanceCtx),
      },
    );
    edits.push(...e);
    registered.functions.push(rid);
  }

  // ── 4) Roles (principal→permission grants; no endpoint dependency) ─────────
  for (const candidate of session.roleCandidates ?? []) {
    const rid = projectPrimitiveRid(projectRoot, "role", candidate.plainName);
    nameToRid.set(candidate.plainName, rid);
    if (alreadyRegistered.has(rid) && !reElevate) continue;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterRole",
      {
        rid,
        declaration: mapRoleCandidateToDeclaration(candidate, provenanceCtx),
      },
    );
    edits.push(...e);
    registered.roles.push(rid);
  }

  // ── 5) Properties (an ObjectType's stored field; owner resolved AFTER objects) ──
  // W2 remediation — PropertyCandidate is the 6th elevation kind; previously
  // registered via an inline declaration bag that DROPPED whyItMayMatter and
  // never attached semantics/status/provenance (unlike the other 5 kinds).
  // Now routed through the pure, exported mapPropertyCandidateToDeclaration()
  // so it reaches the same semantic-preservation parity as ObjectType/
  // LinkType/ActionType/Function/Role.
  for (const candidate of session.propertyCandidates ?? []) {
    const rid =
      candidate.declaredRid ?? projectPrimitiveRid(projectRoot, "property", candidate.plainName);
    nameToRid.set(candidate.plainName, rid);
    if (alreadyRegistered.has(rid) && !reElevate) continue;
    // Resolve the owner ObjectType rid via the combined map (objects are registered
    // before this pass). If unresolved, register the property standalone — never skip.
    const ownerRid = candidate.ownerObjectName
      ? nameToRid.get(candidate.ownerObjectName)
      : undefined;
    const { edits: e } = await applyEditFunction(
      "pm.actions.ontology.applyRegisterProperty",
      {
        rid,
        declaration: mapPropertyCandidateToDeclaration(candidate, provenanceCtx, ownerRid),
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
    if (alreadyRegistered.has(rid) && !reElevate) continue;
    const linkFields = mapLinkTypeCandidateToLinkEditFields(candidate, provenanceCtx);
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
        // W2: businessMeaning (the core lossy-copy bug) + evidenceRefs + status +
        // provenance survive onto the native kind:"link" edit's own fields.
        semantics: linkFields.semantics,
        status: linkFields.status,
        provenance: linkFields.provenance,
      },
    );
    edits.push(...e);
    registered.linkTypes.push(rid);
  }

  // ── ChatbotContextCandidate — lineage-only capture (no registration path). ──
  const chatbotContextLineage = (session.chatbotContextCandidates ?? []).map(
    chatbotContextLineagePayload,
  );

  return { edits, registered, skipped, chatbotContextLineage };
}
