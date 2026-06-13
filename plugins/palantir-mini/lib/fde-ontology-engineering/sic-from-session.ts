import type { SemanticIntentContract } from "../lead-intent/contracts";
import type {
  ActionTypeRef,
  FunctionRef,
  LinkTypeRef,
  ObjectTypeRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";
import type {
  SemanticIntentAxes,
  SicAxis,
  SicAxisFacet,
  SicDataLink,
  SicDataObject,
} from "#schemas/ontology/primitives/semantic-intent-contract";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import type { FDEOntologyEngineeringSession } from "./types";

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

  const successSignals = session.missionModel?.successSignals ?? [];

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
    logic: buildAxis(
      logicNames.length > 0 ? `Decision logic / functions: ${logicNames.join(", ")}` : "",
      session.functionCandidates.flatMap((candidate) => candidate.evidenceRefs),
    ),
    action: buildAxis(
      actionNames.length > 0 ? `Write-back actions: ${actionNames.join(", ")}` : "",
      session.actionCandidates.flatMap((candidate) => candidate.evidenceRefs),
    ),
    governance: buildAxis(
      governanceSummary,
      roleCandidates.flatMap((candidate) => candidate.evidenceRefs ?? []),
    ),
    context: buildAxis(
      session.evidenceModel?.evidenceDefinition ?? "",
      [
        ...(session.evidenceModel?.sourceArtifactRefs ?? []),
        ...session.sourceRefs,
      ],
    ),
    successEval: buildAxis(
      successSignals.length > 0 ? `Success signals: ${successSignals.join(", ")}` : "",
      [],
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
