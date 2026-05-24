// palantir-mini — Context Engineering -> SIC deterministic fill policy.
//
// This additive policy requires a concrete DATA / LOGIC / ACTION /
// SECURITY-GOVERNANCE readiness trail before a SemanticIntentContract can be
// treated as approved for routing. Legacy SIC fill policies are unchanged.

import type {
  SemanticIntentContract,
  ContractValidationIssue,
} from "../lead-intent/contracts";
import type {
  SicFillSource,
  SicFillStep,
  SicTurnDescriptor,
  SicWithFillFields,
} from "./fill-sequence";

export const CONTEXT_ENGINEERING_TO_SIC_POLICY = "context-engineering-to-sic" as const;

export interface ContextEngineeringReadiness {
  readonly dataEvidenceRefs: readonly string[];
  readonly logicRefs: readonly string[];
  readonly actionRefs: readonly string[];
  readonly governanceRefs: readonly string[];
  readonly readinessVerdict: "draft" | "ready-for-sic";
}

export type ContextEngineeringSicContract = SemanticIntentContract & SicWithFillFields & {
  readonly fillPolicy?: typeof CONTEXT_ENGINEERING_TO_SIC_POLICY;
  readonly contextEngineeringReadiness?: ContextEngineeringReadiness;
};

export const CONTEXT_ENGINEERING_TO_SIC_SEQUENCE: readonly SicTurnDescriptor[] = [
  {
    turnIndex: 0,
    step: 1,
    question: "T0 user prompt, operational decision, and explicit non-goals.",
    targetField: "rawIntent",
  },
  {
    turnIndex: 1,
    step: 2,
    question: "T1 DATA: evidence, authority source, and runtime state.",
    targetField: "approvedNouns",
  },
  {
    turnIndex: 2,
    step: 3,
    question: "T2 LOGIC: rules, functions, validators, and graders.",
    targetField: "approvedVerbs",
  },
  {
    turnIndex: 3,
    step: 4,
    question: "T3 ACTION: tools, writeback, release actions, and forbidden actions.",
    targetField: "downstreamAllowed",
  },
  {
    turnIndex: 4,
    step: 5,
    question: "T4 SECURITY/GOVERNANCE: permissions, provenance, and eval expectations.",
    targetField: "permissionsAndProposal",
  },
  {
    turnIndex: 5,
    step: 6,
    question: "T5 readiness: mark the Context Engineering package ready for SIC draft/approval.",
    targetField: "verdict",
  },
] as const;

export function advanceContextEngineeringToSicSequence(
  contract: SemanticIntentContract,
  turnIndex: number,
  userInput?: string,
  agentAutoFill?: Partial<SemanticIntentContract>,
): ContextEngineeringSicContract {
  if (turnIndex < 0 || turnIndex >= CONTEXT_ENGINEERING_TO_SIC_SEQUENCE.length) {
    throw new RangeError(
      `advanceContextEngineeringToSicSequence: turnIndex must be 0-${CONTEXT_ENGINEERING_TO_SIC_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }

  const ext = contract as ContextEngineeringSicContract;
  const descriptor = CONTEXT_ENGINEERING_TO_SIC_SEQUENCE[turnIndex]!;
  const source: SicFillSource =
    userInput !== undefined ? "user" : agentAutoFill !== undefined ? "agent" : "system";
  const step: SicFillStep = {
    step: descriptor.step,
    question: descriptor.question,
    answer: userInput ?? (agentAutoFill ? JSON.stringify(agentAutoFill) : undefined),
    filledAt: new Date().toISOString(),
    source,
  };

  const autoFillFields: Partial<SemanticIntentContract> =
    agentAutoFill !== undefined && userInput === undefined ? agentAutoFill : {};
  const existingReadiness = ext.contextEngineeringReadiness ?? emptyReadiness();

  const t0Fields = turnIndex === 0 && userInput !== undefined
    ? parseT0(contract, userInput)
    : {};
  const t1Fields = turnIndex === 1 && userInput !== undefined
    ? parseDataTurn(contract, existingReadiness, userInput)
    : {};
  const t2Fields = turnIndex === 2 && userInput !== undefined
    ? parseLogicTurn(contract, existingReadiness, userInput)
    : {};
  const t3Fields = turnIndex === 3 && userInput !== undefined
    ? parseActionTurn(contract, existingReadiness, userInput)
    : {};
  const t4Fields = turnIndex === 4 && userInput !== undefined
    ? parseGovernanceTurn(contract, existingReadiness, userInput)
    : {};
  const t5Fields = turnIndex === 5
    ? {
        verdict: "filled" as const,
        contextEngineeringReadiness: {
          ...existingReadiness,
          ...readinessFrom(t1Fields),
          ...readinessFrom(t2Fields),
          ...readinessFrom(t3Fields),
          ...readinessFrom(t4Fields),
          readinessVerdict: "ready-for-sic" as const,
        },
      }
    : {};

  const readiness = {
    ...existingReadiness,
    ...readinessFrom(t1Fields),
    ...readinessFrom(t2Fields),
    ...readinessFrom(t3Fields),
    ...readinessFrom(t4Fields),
    ...readinessFrom(t5Fields),
  };

  return {
    ...contract,
    ...autoFillFields,
    ...withoutReadiness(t0Fields),
    ...withoutReadiness(t1Fields),
    ...withoutReadiness(t2Fields),
    ...withoutReadiness(t3Fields),
    ...withoutReadiness(t4Fields),
    ...withoutReadiness(t5Fields),
    fillPolicy: CONTEXT_ENGINEERING_TO_SIC_POLICY,
    fillSequence: [...(ext.fillSequence ?? []), step],
    contextEngineeringReadiness: readiness,
  } as ContextEngineeringSicContract;
}

export function isContextEngineeringToSicReady(contract: SemanticIntentContract): boolean {
  return contextEngineeringSicReadinessIssues(contract).length === 0;
}

export function contextEngineeringSicReadinessIssues(
  contract: SemanticIntentContract,
): ContractValidationIssue[] {
  const ext = contract as ContextEngineeringSicContract;
  if (ext.fillPolicy !== CONTEXT_ENGINEERING_TO_SIC_POLICY) return [];

  const issues: ContractValidationIssue[] = [];
  const readiness = ext.contextEngineeringReadiness;
  if (!ext.fillSequence || ext.fillSequence.length < CONTEXT_ENGINEERING_TO_SIC_SEQUENCE.length) {
    issues.push({
      field: "fillSequence",
      message: "context-engineering-to-sic requires all T0-T5 turns before SIC approval",
    });
  }
  requireNonEmpty(issues, "rawIntent", contract.rawIntent);
  requireNonEmpty(issues, "confirmedIntent", contract.confirmedIntent);
  requireArray(issues, "affectedSurfaces", contract.affectedSurfaces);
  requireArray(issues, "approvedNouns", contract.approvedNouns);
  requireArray(issues, "approvedVerbs", contract.approvedVerbs);
  requireArray(issues, "downstreamAllowed", contract.downstreamAllowed);
  requireArray(issues, "downstreamForbidden", contract.downstreamForbidden);
  requireNonEmpty(issues, "permissionsAndProposal", contract.permissionsAndProposal);
  requireArray(issues, "contextEngineeringReadiness.dataEvidenceRefs", readiness?.dataEvidenceRefs);
  requireArray(issues, "contextEngineeringReadiness.logicRefs", readiness?.logicRefs);
  requireArray(issues, "contextEngineeringReadiness.actionRefs", readiness?.actionRefs);
  requireArray(issues, "contextEngineeringReadiness.governanceRefs", readiness?.governanceRefs);
  if (readiness?.readinessVerdict !== "ready-for-sic") {
    issues.push({
      field: "contextEngineeringReadiness.readinessVerdict",
      message: "context-engineering-to-sic readinessVerdict must be ready-for-sic",
    });
  }
  return issues;
}

function parseT0(
  contract: SemanticIntentContract,
  userInput: string,
): Partial<SemanticIntentContract> {
  const [intentPart, nonGoalPart] = userInput.split("||").map((part) => part.trim());
  return {
    rawIntent: contract.rawIntent || intentPart || userInput.trim(),
    confirmedIntent: contract.confirmedIntent || intentPart || userInput.trim(),
    nonGoals: mergeUnique(contract.nonGoals, csv(nonGoalPart ?? "")),
  };
}

function parseDataTurn(
  contract: SemanticIntentContract,
  readiness: ContextEngineeringReadiness,
  userInput: string,
) {
  const values = csv(userInput);
  return {
    approvedNouns: mergeUnique(contract.approvedNouns, values),
    affectedSurfaces: mergeUnique(contract.affectedSurfaces, values.filter((value) => value.includes("/") || value.includes("."))),
    contextEngineeringReadiness: {
      ...readiness,
      dataEvidenceRefs: mergeUnique(readiness.dataEvidenceRefs, values),
    },
  };
}

function parseLogicTurn(
  contract: SemanticIntentContract,
  readiness: ContextEngineeringReadiness,
  userInput: string,
) {
  const values = csv(userInput);
  return {
    approvedVerbs: mergeUnique(contract.approvedVerbs, values),
    contextEngineeringReadiness: {
      ...readiness,
      logicRefs: mergeUnique(readiness.logicRefs, values),
    },
  };
}

function parseActionTurn(
  contract: SemanticIntentContract,
  readiness: ContextEngineeringReadiness,
  userInput: string,
) {
  const [allowedPart, forbiddenPart] = userInput.split("|").map((part) => part.trim());
  const allowed = csv(allowedPart ?? "");
  const forbidden = csv(forbiddenPart ?? "");
  return {
    downstreamAllowed: mergeUnique(contract.downstreamAllowed, allowed),
    downstreamForbidden: mergeUnique(contract.downstreamForbidden, forbidden),
    contextEngineeringReadiness: {
      ...readiness,
      actionRefs: mergeUnique(readiness.actionRefs, [...allowed, ...forbidden]),
    },
  };
}

function parseGovernanceTurn(
  contract: SemanticIntentContract,
  readiness: ContextEngineeringReadiness,
  userInput: string,
) {
  const values = csv(userInput);
  return {
    permissionsAndProposal: userInput.trim() || contract.permissionsAndProposal,
    acceptedRisks: mergeUnique(contract.acceptedRisks, values.filter((value) => value.toLowerCase().includes("risk"))),
    contextEngineeringReadiness: {
      ...readiness,
      governanceRefs: mergeUnique(readiness.governanceRefs, values),
    },
  };
}

function emptyReadiness(): ContextEngineeringReadiness {
  return {
    dataEvidenceRefs: [],
    logicRefs: [],
    actionRefs: [],
    governanceRefs: [],
    readinessVerdict: "draft",
  };
}

function readinessFrom(value: unknown): Partial<ContextEngineeringReadiness> {
  if (!value || typeof value !== "object") return {};
  const maybe = value as { contextEngineeringReadiness?: Partial<ContextEngineeringReadiness> };
  return maybe.contextEngineeringReadiness ?? {};
}

function withoutReadiness(value: object): Record<string, unknown> {
  const { contextEngineeringReadiness: _unused, ...rest } = value as Record<string, unknown>;
  void _unused;
  return rest;
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

function requireNonEmpty(
  issues: ContractValidationIssue[],
  field: string,
  value: string | undefined,
): void {
  if (!value?.trim()) {
    issues.push({ field, message: `${field} is required for context-engineering-to-sic` });
  }
}

function requireArray(
  issues: ContractValidationIssue[],
  field: string,
  value: readonly unknown[] | undefined,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ field, message: `${field} must be non-empty for context-engineering-to-sic` });
  }
}
