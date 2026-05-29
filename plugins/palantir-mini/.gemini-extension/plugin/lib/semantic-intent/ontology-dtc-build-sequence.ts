// palantir-mini — deterministic Ontology -> DTC build policy.
//
// This additive policy requires explicit ObjectType, LinkType, ActionType,
// Function, Application State, replay/observability/eval, and readiness turns
// before a DigitalTwinChangeContract can be approved for routing.

import type {
  ContractValidationIssue,
  DigitalTwinChangeContract,
} from "../lead-intent/contracts";
import type {
  DtcFillSource,
  DtcFillStep,
  DtcTurnDescriptor,
} from "./fill-sequence";
import type { DtcWithFillFields, DtcAdvanceResult } from "./dtc-fill-sequence";
import type {
  OntologyEngineeringRef,
  ValidationPackRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";

export const ONTOLOGY_DTC_BUILD_POLICY = "ontology-dtc-build" as const;

export interface OntologyDtcBuildReadiness {
  readonly objectTypeRefs: readonly string[];
  readonly linkTypeRefs: readonly string[];
  readonly actionTypeRefs: readonly string[];
  readonly functionRefs: readonly string[];
  readonly applicationStateRefs: readonly string[];
  readonly evaluationRefs: readonly string[];
  readonly nonApplicablePrimitiveKinds?: readonly string[];
  readonly nonApplicableEvidenceRefs?: readonly string[];
  readonly readinessVerdict: "draft" | "ready-for-dtc";
}

export interface OntologyDtcBuildReadinessIssueOptions {
  readonly requirePolicy?: boolean;
}

export type OntologyDtcBuildContract = DigitalTwinChangeContract & DtcWithFillFields & {
  readonly fillPolicy?: typeof ONTOLOGY_DTC_BUILD_POLICY;
  readonly ontologyDtcBuildSequence?: readonly DtcFillStep[];
  readonly ontologyDtcBuildReadiness?: OntologyDtcBuildReadiness;
};

export const ONTOLOGY_DTC_BUILD_SEQUENCE: readonly DtcTurnDescriptor[] = [
  {
    turnIndex: 0,
    step: 1,
    question: "T0 ObjectType + fields/properties/security.",
    questionEn: "T0 ObjectType plus fields, properties, and security.",
    targetField: "typed-refs",
    secondaryFields: ["touchedOntologyRefs[kind=ObjectType]", "objectSecurityPolicy"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillObjectTypesFromOntologyContext",
    validationHook: "validateOntologyDtcObjectTypes",
  },
  {
    turnIndex: 1,
    step: 2,
    question: "T1 LinkType + relationship semantics/cardinality.",
    questionEn: "T1 LinkType plus relationship semantics and cardinality.",
    targetField: "typed-refs",
    secondaryFields: ["touchedOntologyRefs[kind=LinkType]"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillLinkTypesFromOntologyContext",
    validationHook: "validateOntologyDtcLinkTypes",
  },
  {
    turnIndex: 2,
    step: 3,
    question: "T2 ActionType + submission criteria/writeback/permission.",
    questionEn: "T2 ActionType plus submission criteria, writeback, and permission.",
    targetField: "typed-refs",
    secondaryFields: ["touchedOntologyRefs[kind=ActionType]", "permissionBoundary"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillActionTypesFromOntologyContext",
    validationHook: "validateOntologyDtcActionTypes",
  },
  {
    turnIndex: 3,
    step: 4,
    question: "T3 Function + reusable logic/eval hooks.",
    questionEn: "T3 Function plus reusable logic and evaluation hooks.",
    targetField: "typed-refs",
    secondaryFields: ["touchedOntologyRefs[kind=Function]", "requiredEvaluationRefs"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillFunctionsFromOntologyContext",
    validationHook: "validateOntologyDtcFunctions",
  },
  {
    turnIndex: 4,
    step: 5,
    question: "T4 Chatbot/Application State.",
    questionEn: "T4 Chatbot and Application State.",
    targetField: "toolSurfaceReadiness",
    secondaryFields: ["affectedSurfaces", "applicationStateRefs"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillApplicationStateFromContext",
    validationHook: "validateOntologyDtcApplicationState",
  },
  {
    turnIndex: 5,
    step: 6,
    question: "T5 replay, migration, observability, and evaluation.",
    questionEn: "T5 replay, migration, observability, and evaluation.",
    targetField: "evaluationPlan",
    secondaryFields: ["replayMigrationPlan", "observabilityPlan", "requiredEvaluationRefs"],
    expectedSource: "hybrid",
    autoFillStrategy: "autoFillEvaluationRefsFromProjectPolicy",
    validationHook: "validateOntologyDtcEvalReadiness",
  },
  {
    turnIndex: 6,
    step: 7,
    question: "T6 readiness, then DTC draft/approval.",
    questionEn: "T6 readiness before DTC draft and approval.",
    targetField: "verdict",
    secondaryFields: ["ontologyDtcBuildReadiness.readinessVerdict"],
    expectedSource: "agent",
    autoFillStrategy: "finalizeOntologyDtcBuildVerdict",
    validationHook: "validateDigitalTwinChangeContract",
  },
] as const;

export function advanceOntologyDTCBuildSequence(
  contract: DigitalTwinChangeContract,
  turnIndex: number,
  userInput?: string,
  agentAutoFill?: Partial<DigitalTwinChangeContract>,
): DtcAdvanceResult {
  if (turnIndex < 0 || turnIndex >= ONTOLOGY_DTC_BUILD_SEQUENCE.length) {
    throw new RangeError(
      `advanceOntologyDTCBuildSequence: turnIndex must be 0-${ONTOLOGY_DTC_BUILD_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }

  const ext = contract as OntologyDtcBuildContract;
  const descriptor = ONTOLOGY_DTC_BUILD_SEQUENCE[turnIndex]!;
  const source: DtcFillSource =
    userInput !== undefined ? "user" : agentAutoFill !== undefined ? "agent" : "system";
  const existingReadiness = ext.ontologyDtcBuildReadiness ?? emptyReadiness();
  const existingRefs = contract.touchedOntologyRefs ?? [];
  const existingEvalRefs = contract.requiredEvaluationRefs ?? [];
  const autoFillFields: Partial<DigitalTwinChangeContract> =
    agentAutoFill !== undefined && userInput === undefined ? agentAutoFill : {};

  const t0 = turnIndex === 0 ? typedRefTurn("ObjectType", existingRefs, existingReadiness, userInput, "objectTypeRefs") : {};
  const t1 = turnIndex === 1 ? typedRefTurn("LinkType", existingRefs, existingReadiness, userInput, "linkTypeRefs") : {};
  const t2 = turnIndex === 2 ? typedRefTurn("ActionType", existingRefs, existingReadiness, userInput, "actionTypeRefs") : {};
  const t3 = turnIndex === 3 ? typedRefTurn("Function", existingRefs, existingReadiness, userInput, "functionRefs") : {};
  const t4 = turnIndex === 4 ? applicationStateTurn(contract, existingReadiness, userInput) : {};
  const t5 = turnIndex === 5 ? evaluationTurn(contract, existingReadiness, existingEvalRefs, userInput, agentAutoFill) : {};
  const t6 = turnIndex === 6
    ? {
        verdict: "dtc-filled" as const,
        ontologyDtcBuildReadiness: {
          ...existingReadiness,
          ...readinessFrom(t0),
          ...readinessFrom(t1),
          ...readinessFrom(t2),
          ...readinessFrom(t3),
          ...readinessFrom(t4),
          ...readinessFrom(t5),
          readinessVerdict: "ready-for-dtc" as const,
        },
      }
    : {};
  const readiness = {
    ...existingReadiness,
    ...readinessFrom(t0),
    ...readinessFrom(t1),
    ...readinessFrom(t2),
    ...readinessFrom(t3),
    ...readinessFrom(t4),
    ...readinessFrom(t5),
    ...readinessFrom(t6),
  };
  const touchedOntologyRefs = dedupeRefs([
    ...existingRefs,
    ...refsFrom(t0),
    ...refsFrom(t1),
    ...refsFrom(t2),
    ...refsFrom(t3),
    ...(agentAutoFill?.touchedOntologyRefs ?? []),
  ]);
  const requiredEvaluationRefs = dedupeRefs([
    ...existingEvalRefs,
    ...evalRefsFrom(t5),
    ...(agentAutoFill?.requiredEvaluationRefs ?? []),
  ]);
  const capturedRefs = [
    ...refsFrom(t0),
    ...refsFrom(t1),
    ...refsFrom(t2),
    ...refsFrom(t3),
    ...evalRefsFrom(t5),
  ].map((ref) => ref.rid ?? JSON.stringify(ref));
  const step: DtcFillStep = {
    step: descriptor.step,
    question: descriptor.question,
    answer: userInput ?? (agentAutoFill ? JSON.stringify(agentAutoFill) : undefined),
    filledAt: new Date().toISOString(),
    source,
    ...(capturedRefs.length > 0 ? { capturedRefs } : {}),
  };
  const nextTurn = turnIndex < ONTOLOGY_DTC_BUILD_SEQUENCE.length - 1 ? turnIndex + 1 : null;
  const draft: OntologyDtcBuildContract = {
    ...contract,
    ...autoFillFields,
    ...withoutBuildFields(t4),
    ...withoutBuildFields(t5),
    ...withoutBuildFields(t6),
    fillPolicy: ONTOLOGY_DTC_BUILD_POLICY,
    touchedOntologyRefs,
    requiredEvaluationRefs,
    ontologyDtcBuildSequence: [...(ext.ontologyDtcBuildSequence ?? []), step],
    dtcFillSequence: [...(ext.dtcFillSequence ?? []), step],
    ontologyDtcBuildReadiness: readiness,
  };

  return {
    appliedTurn: turnIndex,
    nextTurn,
    dtcDraft: draft,
    validationErrors: [],
  };
}

export function ontologyDtcBuildReadinessIssues(
  contract: DigitalTwinChangeContract,
  options: OntologyDtcBuildReadinessIssueOptions = {},
): ContractValidationIssue[] {
  const ext = contract as OntologyDtcBuildContract;
  if (ext.fillPolicy !== ONTOLOGY_DTC_BUILD_POLICY) {
    if (!options.requirePolicy) return [];
    return [
      {
        field: "fillPolicy",
        message:
          "ontology-affecting DTC must use fillPolicy=ontology-dtc-build before approval or routing",
      },
    ];
  }

  const issues: ContractValidationIssue[] = [];
  const readiness = ext.ontologyDtcBuildReadiness;
  if (!ext.ontologyDtcBuildSequence || ext.ontologyDtcBuildSequence.length < ONTOLOGY_DTC_BUILD_SEQUENCE.length) {
    issues.push({
      field: "ontologyDtcBuildSequence",
      message: "ontology-dtc-build requires all T0-T6 turns before DTC approval",
    });
  }
  for (const [field, primitiveKind, values] of [
    ["objectTypeRefs", "ObjectType", readiness?.objectTypeRefs],
    ["linkTypeRefs", "LinkType", readiness?.linkTypeRefs],
    ["actionTypeRefs", "ActionType", readiness?.actionTypeRefs],
    ["functionRefs", "Function", readiness?.functionRefs],
    ["applicationStateRefs", "ApplicationState", readiness?.applicationStateRefs],
    ["evaluationRefs", "Eval", readiness?.evaluationRefs],
  ] as const) {
    if (
      (!Array.isArray(values) || values.length === 0) &&
      !hasNonApplicableEvidence(readiness, primitiveKind)
    ) {
      issues.push({
        field: `ontologyDtcBuildReadiness.${field}`,
        message: `${field} must be non-empty or explicitly non-applicable with evidence for ontology-dtc-build`,
      });
    }
  }
  if (readiness?.readinessVerdict !== "ready-for-dtc") {
    issues.push({
      field: "ontologyDtcBuildReadiness.readinessVerdict",
      message: "ontology-dtc-build readinessVerdict must be ready-for-dtc",
    });
  }
  for (const requiredKind of ["ObjectType", "LinkType", "ActionType", "Function"]) {
    if (
      !hasTouchedKind(contract.touchedOntologyRefs, requiredKind) &&
      !hasNonApplicableEvidence(readiness, requiredKind)
    ) {
      issues.push({
        field: "touchedOntologyRefs",
        message: `ontology-dtc-build requires touchedOntologyRefs for ${requiredKind} or explicit non-applicable evidence`,
      });
    }
  }
  if (
    (!contract.requiredEvaluationRefs || contract.requiredEvaluationRefs.length === 0) &&
    !hasNonApplicableEvidence(readiness, "Eval")
  ) {
    issues.push({
      field: "requiredEvaluationRefs",
      message:
        "ontology-dtc-build requires at least one requiredEvaluationRef or explicit non-applicable evidence",
    });
  }
  return issues;
}

function hasNonApplicableEvidence(
  readiness: OntologyDtcBuildReadiness | undefined,
  primitiveKind: string,
): boolean {
  const evidenceRefs = readiness?.nonApplicableEvidenceRefs ?? [];
  if (evidenceRefs.length === 0) return false;
  const target = primitiveKind.toLowerCase();
  return (readiness?.nonApplicablePrimitiveKinds ?? []).some(
    (kind) => kind.toLowerCase() === target,
  );
}

function typedRefTurn(
  kind: string,
  existingRefs: readonly OntologyEngineeringRef[],
  readiness: OntologyDtcBuildReadiness,
  userInput: string | undefined,
  readinessField: keyof Pick<
    OntologyDtcBuildReadiness,
    "objectTypeRefs" | "linkTypeRefs" | "actionTypeRefs" | "functionRefs"
  >,
) {
  const refs = parseRefs(userInput ?? "", kind);
  const existingReadiness = readiness[readinessField] ?? [];
  return {
    touchedOntologyRefs: dedupeRefs([...existingRefs, ...refs]),
    ontologyDtcBuildReadiness: {
      ...readiness,
      [readinessField]: mergeUnique(existingReadiness, refs.map((ref) => ref.rid ?? JSON.stringify(ref))),
    },
  };
}

function applicationStateTurn(
  contract: DigitalTwinChangeContract,
  readiness: OntologyDtcBuildReadiness,
  userInput: string | undefined,
) {
  const refs = csv(userInput ?? "");
  return {
    toolSurfaceReadiness: userInput?.trim() || contract.toolSurfaceReadiness,
    affectedSurfaces: mergeUnique(contract.affectedSurfaces, refs),
    ontologyDtcBuildReadiness: {
      ...readiness,
      applicationStateRefs: mergeUnique(readiness.applicationStateRefs, refs),
    },
  };
}

function evaluationTurn(
  contract: DigitalTwinChangeContract,
  readiness: OntologyDtcBuildReadiness,
  existingEvalRefs: readonly ValidationPackRef[],
  userInput: string | undefined,
  agentAutoFill: Partial<DigitalTwinChangeContract> | undefined,
) {
  const [plansPart, refsPart] = (userInput ?? "").split("||").map((part) => part.trim());
  const [replay, observability, evaluation] = (plansPart ?? "").split("|").map((part) => part.trim());
  const refs = dedupeRefs([
    ...existingEvalRefs,
    ...(parseRefs(refsPart ?? "", "ValidationPack") as unknown as ValidationPackRef[]),
    ...(agentAutoFill?.requiredEvaluationRefs ?? []),
  ]);
  return {
    replayMigrationPlan: replay || contract.replayMigrationPlan,
    observabilityPlan: observability || contract.observabilityPlan,
    evaluationPlan: evaluation || contract.evaluationPlan,
    requiredEvaluationRefs: refs,
    ontologyDtcBuildReadiness: {
      ...readiness,
      evaluationRefs: mergeUnique(readiness.evaluationRefs, refs.map((ref) => ref.rid ?? JSON.stringify(ref))),
    },
  };
}

function parseRefs(input: string, defaultKind: string): OntologyEngineeringRef[] {
  return csv(input).map((entry) => {
    if (entry.includes(":")) {
      const [kind, ...ridParts] = entry.split(":");
      return { kind, rid: ridParts.join(":") } as unknown as OntologyEngineeringRef;
    }
    return { kind: defaultKind, rid: entry } as unknown as OntologyEngineeringRef;
  });
}

function hasTouchedKind(
  refs: readonly OntologyEngineeringRef[] | undefined,
  kind: string,
): boolean {
  return (refs ?? []).some((ref) =>
    String((ref as { kind?: string }).kind ?? "").toLowerCase() === kind.toLowerCase(),
  );
}

function refsFrom(value: unknown): OntologyEngineeringRef[] {
  if (!value || typeof value !== "object") return [];
  return [...((value as { touchedOntologyRefs?: OntologyEngineeringRef[] }).touchedOntologyRefs ?? [])];
}

function evalRefsFrom(value: unknown): ValidationPackRef[] {
  if (!value || typeof value !== "object") return [];
  return [...((value as { requiredEvaluationRefs?: ValidationPackRef[] }).requiredEvaluationRefs ?? [])];
}

function readinessFrom(value: unknown): Partial<OntologyDtcBuildReadiness> {
  if (!value || typeof value !== "object") return {};
  return (value as { ontologyDtcBuildReadiness?: Partial<OntologyDtcBuildReadiness> }).ontologyDtcBuildReadiness ?? {};
}

function withoutBuildFields(value: object): Record<string, unknown> {
  const {
    ontologyDtcBuildReadiness: _readiness,
    touchedOntologyRefs: _touched,
    requiredEvaluationRefs: _eval,
    ...rest
  } = value as Record<string, unknown>;
  void _readiness;
  void _touched;
  void _eval;
  return rest;
}

function emptyReadiness(): OntologyDtcBuildReadiness {
  return {
    objectTypeRefs: [],
    linkTypeRefs: [],
    actionTypeRefs: [],
    functionRefs: [],
    applicationStateRefs: [],
    evaluationRefs: [],
    readinessVerdict: "draft",
  };
}

function csv(input: string): string[] {
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeUnique(left: readonly string[] = [], right: readonly string[] = []): string[] {
  return [...new Set([...left, ...right].filter(Boolean))];
}

function dedupeRefs<T extends { rid?: string }>(refs: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const ref of refs) {
    const key = ref.rid ?? JSON.stringify(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}
