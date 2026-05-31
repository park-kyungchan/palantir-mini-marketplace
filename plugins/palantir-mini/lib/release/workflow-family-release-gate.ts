import * as fs from "node:fs";
import * as path from "node:path";
import {
  WORKFLOW_FAMILIES,
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
  WORKFLOW_FAMILY_RELEASE_GATE_REQUIRED_EVIDENCE_REFS,
  type WorkflowFamilyEnforcementContract,
} from "../../core/contracts/workflow-family-enforcement";

export const WORKFLOW_FAMILY_RELEASE_GATE_SCHEMA_VERSION =
  "palantir-mini/workflow-family-release-gate/v1" as const;

export type WorkflowFamilyReleaseGateReasonCode =
  | "workflow_family_release_gate_pass"
  | "workflow_family_required_evidence_missing"
  | "workflow_family_release_gate_contract_missing_evidence"
  | "workflow_family_blocking_gate_not_enforced"
  | "workflow_family_release_blocking_self_check_missing"
  | "workflow_family_replay_eval_missing_evidence"
  | "workflow_family_unsupported_runtime_claim"
  | "workflow_family_complex_e2e_missing";

export interface WorkflowFamilyReleaseGateFinding {
  readonly code: WorkflowFamilyReleaseGateReasonCode;
  readonly workflowFamily?: string;
  readonly ref?: string;
  readonly message: string;
  readonly blocking: true;
}

export interface WorkflowFamilyReleaseGateResult {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_RELEASE_GATE_SCHEMA_VERSION;
  readonly status: "pass" | "fail";
  readonly releaseBlocking: true;
  readonly reasonCodes: readonly WorkflowFamilyReleaseGateReasonCode[];
  readonly requiredEvidenceRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly findings: readonly WorkflowFamilyReleaseGateFinding[];
  readonly metrics: {
    readonly workflowFamilyCount: number;
    readonly requiredEvidenceRefCount: number;
    readonly releaseGateEvidenceRefCount: number;
    readonly enforcedBlockingPhaseCount: number;
    readonly replayEvalCount: number;
  };
}

export interface WorkflowFamilyReleaseGateInput {
  readonly pluginRoot?: string;
  readonly contracts?: readonly WorkflowFamilyEnforcementContract[];
  readonly requiredEvidenceRefs?: readonly string[];
}

export function evaluateWorkflowFamilyReleaseGate(
  input: WorkflowFamilyReleaseGateInput = {},
): WorkflowFamilyReleaseGateResult {
  const pluginRoot = input.pluginRoot ?? path.resolve(__dirname, "../..");
  const marketplaceRoot = path.resolve(pluginRoot, "../..");
  const contracts = input.contracts ?? WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY;
  const requiredEvidenceRefs =
    input.requiredEvidenceRefs ?? WORKFLOW_FAMILY_RELEASE_GATE_REQUIRED_EVIDENCE_REFS;
  const findings: WorkflowFamilyReleaseGateFinding[] = [];
  const releaseContract = contracts.find((contract) =>
    contract.workflowFamily === "releaseAndShipping"
  );
  const releaseGateEvidenceRefs = new Set(
    releaseContract?.enforcement.releaseGates.flatMap((gate) => gate.requiredEvidenceRefs) ?? [],
  );

  for (const evidenceRef of requiredEvidenceRefs) {
    if (!releaseGateEvidenceRefs.has(evidenceRef)) {
      findings.push(finding({
        code: "workflow_family_release_gate_contract_missing_evidence",
        ref: evidenceRef,
        message: `releaseAndShipping gate does not aggregate required evidence ref: ${evidenceRef}`,
      }));
    }
    if (!fs.existsSync(evidencePath(pluginRoot, marketplaceRoot, evidenceRef))) {
      findings.push(finding({
        code: "workflow_family_required_evidence_missing",
        ref: evidenceRef,
        message: `required workflow-family release evidence file is missing: ${evidenceRef}`,
      }));
    }
  }

  for (const workflowFamily of WORKFLOW_FAMILIES) {
    const contract = contracts.find((candidate) => candidate.workflowFamily === workflowFamily);
    if (!contract) {
      findings.push(finding({
        code: "workflow_family_complex_e2e_missing",
        workflowFamily,
        message: `workflow family contract is missing: ${workflowFamily}`,
      }));
      continue;
    }
    if (contract.complexE2EScenarios.length === 0) {
      findings.push(finding({
        code: "workflow_family_complex_e2e_missing",
        workflowFamily,
        message: `workflow family lacks a complex E2E scenario: ${workflowFamily}`,
      }));
    }

    for (const phase of contract.phases) {
      if (phase.blockingGates.length > 0 && phase.deterministicStatus !== "enforced") {
        findings.push(finding({
          code: "workflow_family_blocking_gate_not_enforced",
          workflowFamily,
          ref: phase.phaseId,
          message:
            `blocking phase ${phase.phaseId} must have deterministicStatus='enforced' before release`,
        }));
      }
    }

    for (const evalRef of contract.enforcement.evals) {
      if (evalRef.replayRequired && evalRef.evidenceRefs.length === 0) {
        findings.push(finding({
          code: "workflow_family_replay_eval_missing_evidence",
          workflowFamily,
          ref: evalRef.evalId,
          message: `replay-required eval ${evalRef.evalId} lacks evidence refs`,
        }));
      }
    }

    for (const runtime of ["claude", "gemini"] as const) {
      const support = contract.runtimeProjection[runtime];
      if (support.support !== "unsupported" || support.evidenceRefs.length > 0) {
        findings.push(finding({
          code: "workflow_family_unsupported_runtime_claim",
          workflowFamily,
          ref: runtime,
          message: `${runtime} must remain unsupported unless runtime-native evidence exists`,
        }));
      }
    }
  }

  const releaseBlockingSelfCheck = releaseContract?.enforcement.selfChecks.find((check) =>
    check.checkId === "self-check:workflow-family-release-gate" &&
    check.releaseBlocking &&
    check.determinism === "enforced"
  );
  if (!releaseBlockingSelfCheck) {
    findings.push(finding({
      code: "workflow_family_release_blocking_self_check_missing",
      workflowFamily: "releaseAndShipping",
      message:
        "releaseAndShipping must register self-check:workflow-family-release-gate as release-blocking and enforced",
    }));
  }

  const reasonCodes = findings.length === 0
    ? ["workflow_family_release_gate_pass" as const]
    : unique(findings.map((item) => item.code));

  return {
    schemaVersion: WORKFLOW_FAMILY_RELEASE_GATE_SCHEMA_VERSION,
    status: findings.length === 0 ? "pass" : "fail",
    releaseBlocking: true,
    reasonCodes,
    requiredEvidenceRefs,
    evidenceRefs: unique([
      ...requiredEvidenceRefs,
      ...(releaseBlockingSelfCheck?.evidenceRefs ?? []),
    ]),
    findings,
    metrics: {
      workflowFamilyCount: contracts.length,
      requiredEvidenceRefCount: requiredEvidenceRefs.length,
      releaseGateEvidenceRefCount: releaseGateEvidenceRefs.size,
      enforcedBlockingPhaseCount: contracts.flatMap((contract) =>
        contract.phases.filter((phase) =>
          phase.blockingGates.length > 0 && phase.deterministicStatus === "enforced"
        )
      ).length,
      replayEvalCount: contracts.flatMap((contract) =>
        contract.enforcement.evals.filter((evalRef) => evalRef.replayRequired)
      ).length,
    },
  };
}

function evidencePath(pluginRoot: string, marketplaceRoot: string, evidenceRef: string): string {
  if (evidenceRef.startsWith("ci/") || evidenceRef.startsWith(".github/")) {
    return path.join(marketplaceRoot, evidenceRef);
  }
  return path.join(pluginRoot, evidenceRef);
}

function finding(input: Omit<WorkflowFamilyReleaseGateFinding, "blocking">) {
  return {
    ...input,
    blocking: true,
  } satisfies WorkflowFamilyReleaseGateFinding;
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}
