import type { SemanticIntentContract } from "../lead-intent/contracts";
import type {
  ActionTypeRef,
  FunctionRef,
  LinkTypeRef,
  ObjectTypeRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";
import type {
  SemanticIntentAxes,
  SicAccessBoundary,
  SicAxis,
  SicAxisFacet,
  SicDataLink,
  SicDataObject,
  SicLogicFunction,
  SicWritebackAction,
} from "#schemas/ontology/primitives/semantic-intent-contract";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import type {
  FDEOntologyEngineeringSession,
  LatentIntentFamily,
  LatentIntentHypothesis,
} from "./types";
import { LATENT_HYPOTHESIS_TEMPLATES } from "./latent-hypothesis-templates";

export interface FDEOntologyEngineeringSicDraftOptions {
  readonly contractId?: string;
  readonly affectedSurfaces?: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

/**
 * Build one of the nine SemanticIntentAxes from session signal. A session-derived
 * axis with signal is `draft` — a PROPOSAL awaiting per-axis user confirmation,
 * NEVER `filled`; `filled` / user-`not-applicable` are minted ONLY by the 9-axis
 * turn engine (advanceNineAxisSicSequence). An axis with no plain-language summary
 * is left `open` — never `not-applicable`. Auto-marking an axis not-applicable
 * would reduce the nine-axis heart; `open`/`draft` let readiness flag it for the
 * turn-by-turn fill where the user confirms (or explicitly waives) it.
 */
function buildAxis(summary: string, refs: readonly string[]): SicAxis {
  const trimmedSummary = summary.trim();
  return {
    summary: trimmedSummary,
    refs: unique(refs),
    status: trimmedSummary.length > 0 ? "draft" : "open",
  };
}

/**
 * Like {@link buildAxis}, but additionally attaches an optional typed `facet`
 * (the machine-typed projection of the same proposal the prose `summary` answers,
 * DP-0..DP-4). `summary` + `status` are computed identically to `buildAxis`, so an
 * enriched axis stays byte-identical in its prose/status; only `facet` is added,
 * and ONLY when present (an absent facet ⇒ a record byte-identical to `buildAxis`).
 */
function buildAxisWithFacet(
  summary: string,
  refs: readonly string[],
  facet: SicAxisFacet | undefined,
): SicAxis {
  const axis = buildAxis(summary, refs);
  return facet === undefined ? axis : { ...axis, facet };
}

/**
 * DP-1: project the session's DATA signal into a typed Palantir noun-graph facet.
 * `objectCandidates` become `SicDataObject`s with `propertyCandidates` folded in by
 * `ownerObjectName`; `linkCandidates` become `SicDataLink`s, each carrying
 * `endpointsResolved` = both endpoints appear as object names (an unresolved
 * endpoint is confirmation debt, never a silent link). Returns `undefined` when the
 * session carries no DATA-object signal, so an empty DATA axis stays facet-free.
 */
function buildDataGraphFacet(session: FDEOntologyEngineeringSession): SicAxisFacet | undefined {
  if (session.objectCandidates.length === 0) return undefined;

  const propertiesByOwner = new Map<string, { readonly name: string; readonly dataType?: string }[]>();
  for (const property of session.propertyCandidates ?? []) {
    const owner = property.ownerObjectName?.trim();
    if (!owner) continue;
    const folded = propertiesByOwner.get(owner) ?? [];
    folded.push(
      property.dataType !== undefined
        ? { name: property.plainName, dataType: property.dataType }
        : { name: property.plainName },
    );
    propertiesByOwner.set(owner, folded);
  }

  const objects: SicDataObject[] = session.objectCandidates.map((candidate) => ({
    name: candidate.plainName,
    properties: propertiesByOwner.get(candidate.plainName) ?? [],
    refs: unique(candidate.evidenceRefs),
  }));

  const objectNames = new Set(objects.map((object) => object.name));
  const links: SicDataLink[] = session.linkCandidates.map((candidate) => {
    const sourceObject = candidate.sourceObject ?? "";
    const targetObject = candidate.targetObject ?? "";
    return {
      name: candidate.plainName,
      sourceObject,
      targetObject,
      businessMeaning: candidate.businessMeaning,
      endpointsResolved: objectNames.has(sourceObject) && objectNames.has(targetObject),
    };
  });

  return { kind: "data-graph", objects, links };
}

/**
 * DP-3: project the session's ACTION signal into a typed write-back facet. Each
 * `actionCandidate` becomes a `SicWritebackAction` carrying its `writebackRisk` and
 * its per-action `submissionCriteria` (the "done/correct" gate for THIS action;
 * default `[]` when the session declared none — an action with no submission
 * criteria is confirmation debt, never silently waved through). Returns `undefined`
 * when the session carries no ACTION signal, so an empty ACTION axis stays facet-free.
 */
function buildActionWritebackFacet(
  session: FDEOntologyEngineeringSession,
): SicAxisFacet | undefined {
  if (session.actionCandidates.length === 0) return undefined;

  const actions: SicWritebackAction[] = session.actionCandidates.map((candidate) => ({
    name: candidate.plainName,
    writebackRisk: candidate.writebackRisk,
    submissionCriteria: [...(candidate.submissionCriteria ?? [])],
    refs: unique(candidate.evidenceRefs),
  }));

  return { kind: "action-writeback", actions };
}

/**
 * DP-3: the ACTION→SUCCESS-EVAL *proposal* binding (elicitation-side only). Collect
 * every action's `submissionCriteria` into typed `submission-criteria://<action>/<idx>`
 * refs so the SUCCESS-EVAL turn confirms BOTH the user's success signals AND the
 * per-action submission criteria as one proposal. SCOPE GUARD: this is the
 * understand-layer proposal binding ONLY — it threads refs into the SUCCESS-EVAL
 * axis and never touches `requiredEvaluationRefs` or the DTC synthesis gate
 * (`synthesizeOntologyDtcBuildFields`), which is the back-half / OE-8 line.
 */
function actionSubmissionCriteriaRefs(
  session: FDEOntologyEngineeringSession,
): string[] {
  return session.actionCandidates.flatMap((candidate) =>
    (candidate.submissionCriteria ?? []).map(
      (_criterion, index) => `submission-criteria://${candidate.plainName}/${index}`,
    ),
  );
}

/**
 * DP-2: resolve a function candidate's `invokingActorScopeRef` (a RoleCandidate
 * candidateId) to that role's plainName — the actor whose GOVERNANCE scope the
 * function's tool calls inherit. Returns `undefined` when the ref is absent OR
 * matches no role (an UNRESOLVED scope is confirmation debt, never an auto-grant;
 * the GOVERNANCE access-boundary turns it into a `resolved:false` toolScope).
 */
function resolveInvokingActorScope(
  session: FDEOntologyEngineeringSession,
  invokingActorScopeRef: string | undefined,
): string | undefined {
  if (!invokingActorScopeRef) return undefined;
  const role = (session.roleCandidates ?? []).find(
    (candidate) => candidate.candidateId === invokingActorScopeRef,
  );
  return role?.plainName;
}

/**
 * DP-2: project the session's LOGIC signal into a typed AIP-Logic block facet.
 * Each `functionCandidate` becomes a `SicLogicFunction` carrying its
 * `evaluatorKind` (default `"unspecified"` when the session declared none) and
 * the resolved `invokingActorScope` (the actor whose permissions its tool calls
 * inherit; absent when the ref is unresolved — fail-closed, never widened).
 * Returns `undefined` when the session carries no LOGIC signal.
 */
function buildLogicBlockFacet(session: FDEOntologyEngineeringSession): SicAxisFacet | undefined {
  if (session.functionCandidates.length === 0) return undefined;

  const functions: SicLogicFunction[] = session.functionCandidates.map((candidate) => {
    const invokingActorScope = resolveInvokingActorScope(session, candidate.invokingActorScopeRef);
    return {
      name: candidate.plainName,
      evaluatorKind: candidate.evaluatorKind ?? "unspecified",
      ...(invokingActorScope !== undefined ? { invokingActorScope } : {}),
      refs: unique(candidate.evidenceRefs),
    };
  });

  return { kind: "logic-block", functions };
}

/**
 * DP-2/DP-4 (the cross-axis fail-closed binding): derive the GOVERNANCE
 * `toolScopes` from the LOGIC functions that route through an Apply-action (a
 * `pure-evaluator` persists nothing, so it contributes no scope to govern). Each
 * such function contributes ONE toolScope; an unresolved invoking-actor scope
 * yields `resolved:false` (confirmation debt the GOVERNANCE turn must confirm),
 * NEVER a `resolved:true` default grant — the model/agent cannot widen scope.
 */
function buildToolScopes(
  session: FDEOntologyEngineeringSession,
): SicAccessBoundary["toolScopes"] {
  return session.functionCandidates.flatMap((candidate) => {
    if (candidate.evaluatorKind !== "routes-through-apply-action") return [];
    const actorScope = resolveInvokingActorScope(session, candidate.invokingActorScopeRef);
    return [
      {
        toolName: candidate.plainName,
        actorScope: actorScope ?? "",
        resolved: actorScope !== undefined,
      },
    ];
  });
}

/**
 * DP-4 (govern-fold): project the session's GOVERNANCE signal into a typed
 * access-boundary facet — Security as the GOVERNANCE access-control facet, NOT a
 * 10th axis or a `DigitalTwinDecisionDomain` member. `policyMarkings` come from
 * the governance summary + role permissions; `accessibleSurfaces` are DEFAULT-DENY
 * (a surface appears ONLY when the session carries confirmed signal for it);
 * `toolScopes` come from DP-2's LOGIC binding; `failClosed` is the literal `true`
 * the type itself carries (an access boundary can never be constructed
 * default-open). Returns `undefined` when the session carries no GOVERNANCE signal.
 */
function buildAccessBoundaryFacet(
  session: FDEOntologyEngineeringSession,
  governanceSummary: string,
  toolScopes: SicAccessBoundary["toolScopes"],
): SicAxisFacet | undefined {
  const roleCandidates = session.roleCandidates ?? [];
  const hasGovernanceSignal =
    governanceSummary.trim().length > 0 || roleCandidates.length > 0 || toolScopes.length > 0;
  if (!hasGovernanceSignal) return undefined;

  const policyMarkings = unique([
    ...(session.stableSummary?.governanceSummary ? [session.stableSummary.governanceSummary] : []),
    ...roleCandidates.flatMap((candidate) => candidate.permissions ?? []),
  ]);

  // DEFAULT-DENY: a surface is accessible ONLY when the session carries confirmed
  // signal for it; a surface with no signal is ABSENT (denied), never granted.
  const accessibleSurfaces: SicAccessBoundary["accessibleSurfaces"] = [
    ...(session.objectCandidates.length > 0 ? (["data"] as const) : []),
    ...(session.functionCandidates.length > 0 ? (["logic"] as const) : []),
    ...(session.actionCandidates.length > 0 ? (["action"] as const) : []),
    ...(toolScopes.length > 0 ? (["tools"] as const) : []),
  ];

  const accessBoundary: SicAccessBoundary = {
    policyMarkings,
    accessibleSurfaces,
    toolScopes,
    failClosed: true,
  };
  return { kind: "access-boundary", accessBoundary };
}

/**
 * Read a candidate's declared RID. The typed-ref `declaredRid` field has landed on
 * the candidate types (E-PRF), so this reads it directly; candidates without a rid
 * are skipped. A non-empty declared rid flows into the typed-ref arrays.
 */
function declaredRid(candidate: { readonly declaredRid?: string }): string | undefined {
  const rid = candidate.declaredRid;
  return typeof rid === "string" && rid.trim().length > 0 ? rid.trim() : undefined;
}

function acceptedHypothesisSummaries(session: FDEOntologyEngineeringSession): readonly string[] {
  const accepted = new Set(session.acceptedHypothesisIds);
  return session.latentHypotheses
    .filter((hypothesis) => accepted.has(hypothesis.hypothesisId))
    .map((hypothesis) => hypothesis.plainLanguage);
}

function confirmedIntent(session: FDEOntologyEngineeringSession): string {
  return (
    session.stableSummary?.confirmedIntent
    ?? session.confirmedUserGoal
    ?? session.missionModel?.operationalDecision
    ?? "FDE ontology engineering session requires more accepted mission state."
  );
}

/**
 * Surface the nine understand-phase axes from accepted session signal. Every axis
 * is always represented; axes lacking session signal stay `open` (rule: only the
 * user, turn-by-turn, may record an axis as not-applicable).
 */
function buildAxes(session: FDEOntologyEngineeringSession): SemanticIntentAxes {
  const roleCandidates = session.roleCandidates ?? [];
  const roleNames = roleCandidates.map((candidate) => candidate.plainName);

  const dataNames = [
    ...session.objectCandidates.map((candidate) => candidate.plainName),
    ...session.chatbotContextCandidates.map((candidate) => candidate.plainName),
  ];
  const logicNames = session.functionCandidates.map((candidate) => candidate.plainName);
  const actionNames = session.actionCandidates.map((candidate) => candidate.plainName);

  const governanceSummary = [
    session.stableSummary?.governanceSummary,
    roleNames.length > 0 ? `Roles: ${roleNames.join(", ")}` : undefined,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");

  // DP-2/DP-4: the LOGIC→GOVERNANCE actor-scope binding. Derive the toolScopes
  // once (from LOGIC functions routing through Apply-action) and thread them into
  // the GOVERNANCE access-boundary facet. An unresolved scope is `resolved:false`
  // (fail-closed confirmation debt), never a default grant.
  const toolScopes = buildToolScopes(session);

  const successSignals = session.missionModel?.successSignals ?? [];
  // DP-3: thread each action's submission criteria into SUCCESS-EVAL as a typed
  // proposal (elicitation-side only; requiredEvaluationRefs / the synthesis gate
  // stay untouched — that is the OE-8 back-half line).
  const submissionCriteriaRefs = actionSubmissionCriteriaRefs(session);
  const successEvalSummaryParts = [
    successSignals.length > 0 ? `Success signals: ${successSignals.join(", ")}` : undefined,
    submissionCriteriaRefs.length > 0
      ? `Per-action submission criteria: ${submissionCriteriaRefs.join(", ")}`
      : undefined,
  ].filter((part): part is string => part !== undefined);

  const memoryPriorRefs = unique([
    ...(session.semanticIntentContextRef ? [session.semanticIntentContextRef] : []),
    ...(session.semanticIntentContractRef ? [session.semanticIntentContractRef] : []),
    ...(session.digitalTwinChangeContractRef ? [session.digitalTwinChangeContractRef] : []),
  ]);

  return {
    data: buildAxisWithFacet(
      dataNames.length > 0 ? `Operational objects and application state: ${dataNames.join(", ")}` : "",
      [...session.objectCandidates, ...session.chatbotContextCandidates].flatMap(
        (candidate) => candidate.evidenceRefs,
      ),
      dataNames.length > 0 ? buildDataGraphFacet(session) : undefined,
    ),
    logic: buildAxisWithFacet(
      logicNames.length > 0 ? `Decision logic / functions: ${logicNames.join(", ")}` : "",
      session.functionCandidates.flatMap((candidate) => candidate.evidenceRefs),
      logicNames.length > 0 ? buildLogicBlockFacet(session) : undefined,
    ),
    action: buildAxisWithFacet(
      actionNames.length > 0 ? `Write-back actions: ${actionNames.join(", ")}` : "",
      session.actionCandidates.flatMap((candidate) => candidate.evidenceRefs),
      actionNames.length > 0 ? buildActionWritebackFacet(session) : undefined,
    ),
    governance: buildAxisWithFacet(
      governanceSummary,
      roleCandidates.flatMap((candidate) => candidate.evidenceRefs ?? []),
      buildAccessBoundaryFacet(session, governanceSummary, toolScopes),
    ),
    context: buildAxis(
      session.evidenceModel?.evidenceDefinition ?? "",
      [
        ...(session.evidenceModel?.sourceArtifactRefs ?? []),
        ...session.sourceRefs,
      ],
    ),
    successEval: buildAxis(
      successEvalSummaryParts.join("; "),
      submissionCriteriaRefs,
    ),
    constraintsNonGoals: buildAxis(
      session.confirmedNonGoals.length > 0
        ? `Confirmed non-goals: ${session.confirmedNonGoals.join(", ")}`
        : "",
      [],
    ),
    actors: buildAxis(
      roleNames.length > 0 ? `Actors / roles: ${roleNames.join(", ")}` : "",
      roleCandidates.flatMap((candidate) => candidate.evidenceRefs ?? []),
    ),
    memoryPrior: buildAxis(
      memoryPriorRefs.length > 0 ? `Prior-session contract refs: ${memoryPriorRefs.join(", ")}` : "",
      memoryPriorRefs,
    ),
  };
}

function approvedObjectTypeRefs(session: FDEOntologyEngineeringSession): ObjectTypeRef[] {
  return session.objectCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "ObjectType", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

function approvedActionTypeRefs(session: FDEOntologyEngineeringSession): ActionTypeRef[] {
  return session.actionCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "ActionType", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

function approvedFunctionRefs(session: FDEOntologyEngineeringSession): FunctionRef[] {
  return session.functionCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "Function", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

function approvedLinkTypeRefs(session: FDEOntologyEngineeringSession): LinkTypeRef[] {
  return session.linkCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "LinkType", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

export function createSemanticIntentContractDraftFromFDEOntologySession(
  session: FDEOntologyEngineeringSession,
  options: FDEOntologyEngineeringSicDraftOptions = {},
): SemanticIntentContract {
  const acceptedSummaries = acceptedHypothesisSummaries(session);
  const nouns = unique([
    ...session.objectCandidates.map((candidate) => candidate.plainName),
    ...session.linkCandidates.map((candidate) => candidate.plainName),
    ...session.chatbotContextCandidates.map((candidate) => candidate.plainName),
  ]);
  const verbs = unique([
    ...session.actionCandidates.map((candidate) => candidate.plainName),
    ...session.functionCandidates.map((candidate) => candidate.plainName),
  ]);
  const intent = confirmedIntent(session);
  const objectTypeRefs = approvedObjectTypeRefs(session);
  const actionTypeRefs = approvedActionTypeRefs(session);
  const functionRefs = approvedFunctionRefs(session);
  const linkTypeRefs = approvedLinkTypeRefs(session);

  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: options.contractId ?? `semantic-intent:fde-session:${session.sessionId}`,
    status: "draft",
    rawIntent: intent,
    confirmedIntent: [
      intent,
      ...acceptedSummaries,
    ].join("\n"),
    nonGoals: [...session.confirmedNonGoals],
    approvedNouns: nouns,
    approvedVerbs: verbs,
    affectedSurfaces: unique([
      ...(options.affectedSurfaces ?? []),
      ...session.sourceRefs,
    ]),
    ...(objectTypeRefs.length > 0 ? { approvedObjectTypeRefs: objectTypeRefs } : {}),
    ...(actionTypeRefs.length > 0 ? { approvedActionTypeRefs: actionTypeRefs } : {}),
    ...(functionRefs.length > 0 ? { approvedFunctionRefs: functionRefs } : {}),
    ...(linkTypeRefs.length > 0 ? { approvedLinkTypeRefs: linkTypeRefs } : {}),
    axes: buildAxes(session),
    permissionsAndProposal: "Drafted from accepted FDE ontology engineering session state; not from raw prompt text.",
    acceptedRisks: (session.deferredHypothesisIds ?? []).map((id) => `Deferred hypothesis remains open: ${id}`),
    downstreamAllowed: [
      "Use accepted session state to review SemanticIntentContract fields.",
      "Ask additional FDE ontology engineering questions for unresolved gaps.",
    ],
    downstreamForbidden: [
      "Do not authorize ontology mutation from this draft alone.",
      "Do not rehydrate raw prompt text into the contract.",
    ],
    clarificationQuestions: session.unresolvedQuestions.map((question) => ({
      questionId: question.questionId,
      ambiguityType: "decision",
      materiality: question.blocking ? "blocking" : "important",
      decisionSpec: {
        decisionId: question.questionId,
        phase: question.phase,
        plainKoreanTitle: "FDE 결정 필요",
        plainKoreanSummary: question.plainQuestion,
        whyItMatters: question.whyItMatters,
        recommendedChoiceId: `${question.questionId}.answer`,
        choices: [
          {
            choiceId: `${question.questionId}.answer`,
            label: "답변 반영",
            consequence: question.recommendedDefault ?? "Answer before contract approval.",
            recommended: true,
          },
          {
            choiceId: `${question.questionId}.defer`,
            label: "보류",
            consequence: "The contract remains draft and cannot authorize downstream execution.",
            recommended: false,
          },
        ],
        evidenceRefs: session.sourceRefs,
        blocking: question.blocking,
        freeTextAllowed: true,
        stateEffectPreview: "Record a UserDecisionRecord before SIC approval.",
      },
      prompt: question.plainQuestion,
      recommendedAnswer: question.recommendedDefault ?? "Keep as an open clarification.",
      whyItMatters: question.whyItMatters,
      plainLanguageExplanation: question.whyItMatters,
      palantirArchitectureMapping: {
        operationalMeaning: question.phase,
        platformTerm: "Ontology Proposal",
      },
      defaultIfUserAcceptsRecommendation: question.recommendedDefault ?? "Keep as an open clarification.",
      whatWillNotHappen: [
        "No ontology edit will be authorized from an unresolved clarification.",
      ],
      requiresUserApproval: question.blocking,
      status: "open",
    })),
  };
}

/**
 * DP-5: per-axis confirmation-debt metadata. Each enriched-or-plain `"draft"` axis
 * maps to a stable `LatentIntentFamily` + (where the axis is in the latent
 * `decisionAxis` union) a `decisionAxis`. ALL members reused — no new
 * `LatentIntentFamily` / `decisionAxis` member is added. Axes outside the latent
 * `decisionAxis` union (context / successEval / constraintsNonGoals / actors /
 * memoryPrior) carry NO `decisionAxis` (the field is optional).
 */
const DRAFT_AXIS_DEBT_META: Record<
  keyof SemanticIntentAxes,
  {
    readonly label: string;
    readonly family: LatentIntentFamily;
    readonly decisionAxis?: NonNullable<LatentIntentHypothesis["decisionAxis"]>;
  }
> = {
  data: { label: "DATA", family: "data-authority", decisionAxis: "data" },
  logic: { label: "LOGIC", family: "logic-authority", decisionAxis: "logic" },
  action: { label: "ACTION", family: "action-writeback-risk", decisionAxis: "action" },
  governance: { label: "GOVERNANCE", family: "governance-boundary", decisionAxis: "governance" },
  context: { label: "CONTEXT", family: "framework-discovery" },
  successEval: { label: "SUCCESS-EVAL", family: "framework-discovery" },
  constraintsNonGoals: { label: "CONSTRAINTS-NONGOALS", family: "framework-discovery" },
  actors: { label: "ACTORS", family: "framework-discovery" },
  memoryPrior: { label: "MEMORY-PRIOR", family: "framework-discovery" },
};

/**
 * DP-5: the mutation an UNCONFIRMED draft axis would wrongly authorize — bound to
 * the DP-1 / DP-3 / DP-4 facet risks when the axis carries a typed facet, else a
 * generic per-axis default. An unresolved DATA endpoint, a write-back action with
 * no submission criteria, and an unresolved GOVERNANCE tool-scope each surface
 * their specific risk in the corresponding axis's debt (DP-5 binds the structural
 * risks DP-1/3/4 expose).
 */
function draftAxisRiskIfWrong(axisKey: keyof SemanticIntentAxes, axis: SicAxis): string {
  const facet = axis.facet;
  if (facet?.kind === "data-graph" && facet.links.some((link) => !link.endpointsResolved)) {
    return "A DATA link with an unresolved endpoint could create a dangling relationship the user never confirmed.";
  }
  if (
    facet?.kind === "action-writeback"
    && facet.actions.some((action) => action.submissionCriteria.length === 0)
  ) {
    return "A write-back action with no submission criteria could commit an unchecked mutation.";
  }
  if (
    facet?.kind === "access-boundary"
    && facet.accessBoundary.toolScopes.some((scope) => !scope.resolved)
  ) {
    return "An unresolved tool scope could grant access the user never approved.";
  }
  switch (axisKey) {
    case "data":
      return "An unconfirmed DATA proposal could register objects, properties, or links the user never confirmed.";
    case "logic":
      return "An unconfirmed LOGIC proposal could encode a decision rule or function the user never confirmed.";
    case "action":
      return "An unconfirmed ACTION proposal could authorize a write-back the user never confirmed.";
    case "governance":
      return "An unconfirmed GOVERNANCE proposal could grant access or authority the user never approved.";
    default:
      return "An unconfirmed axis proposal could authorize a decision the user never confirmed.";
  }
}

/**
 * DP-5: derive a typed confirmation-debt `LatentIntentHypothesis` for every
 * `"draft"`-status axis of a session-derived SIC. A `"draft"` axis is a PROPOSAL
 * the 9-axis turn engine has not yet confirmed — standing confirmation debt that
 * should be EXPLICIT + typed + reviewable (turn-engine-agent-skills §4
 * Request-clarification = first-class stop-and-ask), not silent.
 *
 * SELF-CLEARING by construction: the debt is computed from the axis's CURRENT
 * status, so once the turn engine mints `"filled"` / `"not-applicable"`, that axis
 * no longer matches the `"draft"` predicate and re-deriving emits no debt for it.
 * An `"open"` axis (no signal, nothing proposed) emits NO debt. Reuses the
 * `draftAxisConfirmationDebt` template + existing `LatentIntentFamily` /
 * `decisionAxis` members — no new sink, no new machinery.
 */
export function deriveDraftAxisConfirmationDebt(
  contract: Pick<SemanticIntentContract, "axes">,
): LatentIntentHypothesis[] {
  const axes = contract.axes;
  if (axes === undefined) return [];
  const template = LATENT_HYPOTHESIS_TEMPLATES.draftAxisConfirmationDebt;

  return (Object.keys(DRAFT_AXIS_DEBT_META) as (keyof SemanticIntentAxes)[]).flatMap((axisKey) => {
    const axis = axes[axisKey];
    if (axis === undefined || axis.status !== "draft") return [];

    const meta = DRAFT_AXIS_DEBT_META[axisKey];
    const summary = axis.summary.trim();
    return [
      {
        hypothesisId: `latent:confirmation-debt:${axisKey}`,
        status: "inferred",
        templateId: template.templateId,
        family: meta.family,
        ...(meta.decisionAxis !== undefined ? { decisionAxis: meta.decisionAxis } : {}),
        readinessRequirementIds: [`axes.${axisKey}`],
        plainLanguage: `Proposed for the ${meta.label} axis but not yet user-confirmed: ${summary}`,
        whyLeadInferredThis:
          summary.length > 0
            ? `The session produced a draft ${meta.label} proposal from accepted signal (${summary}), but the ${meta.label} axis turn has not confirmed it.`
            : template.whyLeadInferredThis,
        whatUserMayNotHaveNoticed: template.whatUserMayNotHaveNoticed,
        recommendedDefault: template.recommendedDefault,
        riskIfWrong: draftAxisRiskIfWrong(axisKey, axis),
        whatWillNotHappenIfAccepted: template.whatWillNotHappenIfAccepted,
        ontologyImplication: {
          possibleObjects: [...template.possibleObjects],
          possibleLinks: [...template.possibleLinks],
          possibleActions: [...template.possibleActions],
          possibleFunctions: [...template.possibleFunctions],
        },
        evidenceNeeded: [...template.evidenceNeeded],
        sourceRefs: unique([...axis.refs]),
      },
    ];
  });
}

/**
 * P1 fix (SSoT: intent-to-build-flow.md:53 "Stop if any 9-axis slot is missing
 * or contradicted"; turn-engine-agent-skills.md:112 Request-clarification=Copy).
 *
 * A SemanticIntentContract draft is HOLLOW when it carries no grounded meaning:
 * every one of the nine axes carries no signal (an axis carries signal when its
 * status is `filled` OR `draft` AND its summary is non-empty), AND the approved
 * noun/verb candidate arrays are empty, AND confirmedIntent is empty or only the
 * known mission-absent placeholder (`confirmedIntent()` emits that sentence when
 * no mission/goal state exists). A hollow draft must NOT read as progress — the
 * draft_sic tool result reports `clarification-required` and surfaces the blocking
 * questions, instead of a success-shaped `draft`. The persisted contract object is
 * unchanged (schema-compatible); only the tool-result framing changes.
 */
export const SIC_MISSION_ABSENT_SENTINEL =
  "FDE ontology engineering session requires more accepted mission state.";

export function isSemanticIntentContractHollow(
  sic: Pick<
    SemanticIntentContract,
    "axes" | "approvedNouns" | "approvedVerbs" | "confirmedIntent"
  >,
): boolean {
  const axes = sic.axes;
  const everyAxisUnfilled =
    axes === undefined ||
    (Object.keys(axes) as (keyof typeof axes)[]).every((key) => {
      const a = axes[key];
      return (
        a === undefined ||
        (a.status !== "filled" && a.status !== "draft") ||
        a.summary.trim().length === 0
      );
    });
  const noNouns = (sic.approvedNouns ?? []).length === 0;
  const noVerbs = (sic.approvedVerbs ?? []).length === 0;
  const intent = (sic.confirmedIntent ?? "").trim();
  const intentHollow =
    intent.length === 0 || intent === SIC_MISSION_ABSENT_SENTINEL;
  return everyAxisUnfilled && noNouns && noVerbs && intentHollow;
}

/**
 * The blocking clarification questions on a draft SIC, surfaced as the PRIMARY
 * payload when the draft is hollow (P1). Returns `materiality:"blocking"` /
 * `requiresUserApproval` questions only.
 */
export function blockingClarificationQuestions(
  sic: Pick<SemanticIntentContract, "clarificationQuestions">,
): readonly NonNullable<SemanticIntentContract["clarificationQuestions"]>[number][] {
  return (sic.clarificationQuestions ?? []).filter(
    (q) => q.materiality === "blocking" || q.requiresUserApproval === true,
  );
}
