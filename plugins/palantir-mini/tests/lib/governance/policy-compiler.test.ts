import { describe, test, expect } from "bun:test";
import {
  compilePreMutationPolicy,
  isFillComplete,
  isOntologyAffectingBySurfaces,
  type CompilePreMutationPolicyInput,
  type CompilePreMutationPolicyResult,
} from "../../../lib/governance/policy-compiler";
import { extractDtcMutationSurfacePolicy } from "../../../lib/governance/dtc-surface-policy";
import { createUserApprovalRef } from "../../../lib/prompt-front-door/approval-ref";
import type { DtcWithFillFields } from "../../../lib/semantic-intent/dtc-fill-sequence";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

interface Fixture {
  readonly name: string;
  readonly input: CompilePreMutationPolicyInput;
  readonly expectedAllowed: boolean;
  readonly expectedReason: CompilePreMutationPolicyResult["reason"];
}

const FIXTURES: readonly Fixture[] = [
  {
    name: "rule-1: read-only tool Read is allowed",
    input: { toolName: "Read", targetFiles: ["/x/y.ts"] },
    expectedAllowed: true,
    expectedReason: "read-only-allow",
  },
  {
    name: "rule-1: Grep is in read-only allowlist",
    input: { toolName: "Grep", targetFiles: [] },
    expectedAllowed: true,
    expectedReason: "read-only-allow",
  },
  {
    name: "rule-2: Edit on generated file forbidden",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/src/generated/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
    },
    expectedAllowed: false,
    expectedReason: "generated-file-direct-edit-forbidden",
  },
  {
    name: "rule-2: Edit on /generated/ path is also forbidden",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/generated/output.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
    },
    expectedAllowed: false,
    expectedReason: "generated-file-direct-edit-forbidden",
  },
  {
    name: "rule-3: Edit outside writableRoot denied",
    input: {
      toolName: "Edit",
      targetFiles: ["/outside/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/outside/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      projectScope: { writableRoot: "/inside/", forbiddenPatterns: [], domainAgents: [], pathMarkers: [], projectId: "test", sourcePath: "/inside/", projectOntologyAxes: [], surfaceMutationBoundaries: [], seqDataLaneInventory: [], projectOntologyScopeRedesign: { id: "", status: "", purpose: "", validationLadder: [] } },
    },
    expectedAllowed: false,
    expectedReason: "outside-writable-root",
  },
  {
    name: "rule-4: forbidden-pattern match denies",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/secret.key"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      projectScope: { writableRoot: "/x/", forbiddenPatterns: ["\\.key$"], domainAgents: [], pathMarkers: [], projectId: "test", sourcePath: "/x/", projectOntologyAxes: [], surfaceMutationBoundaries: [], seqDataLaneInventory: [], projectOntologyScopeRedesign: { id: "", status: "", purpose: "", validationLadder: [] } },
    },
    expectedAllowed: false,
    expectedReason: "forbidden-pattern",
  },
  {
    name: "rule-5: no DTC denies protected mutation",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
    },
    expectedAllowed: false,
    expectedReason: "missing-digital-twin-change-contract",
  },
  {
    name: "rule-6: outside DTC changeBoundary path token denied",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/other.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/y/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
    },
    expectedAllowed: false,
    expectedReason: "outside-dtc-change-boundary",
  },
  {
    name: "rule-7: blocking unmitigated known issue denies",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      knownIssues: [{ issueId: "issue-1", severity: "blocking", mitigationStatus: "unmitigated", projectId: "test", title: "blocker", source: "test", firstObservedAt: "2026-05-01", lastObservedAt: "2026-05-01", observedCount: 1, triggerPatterns: [], affectedCapabilityRefs: [], affectedSurfaceRefs: [], validationPackRefs: [], status: "open", recommendedAction: "fix it", sourceRefs: [] }],
    },
    expectedAllowed: false,
    expectedReason: "blocking-known-issue-unmitigated",
  },
  {
    name: "rule-7: mitigated blocking issue does not deny",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      knownIssues: [{ issueId: "issue-2", severity: "blocking", mitigationStatus: "mitigated", projectId: "test", title: "resolved", source: "test", firstObservedAt: "2026-05-01", lastObservedAt: "2026-05-01", observedCount: 1, triggerPatterns: [], affectedCapabilityRefs: [], affectedSurfaceRefs: [], validationPackRefs: [], status: "mitigated", recommendedAction: "none", sourceRefs: [] }],
    },
    expectedAllowed: true,
    expectedReason: "default-allow",
  },
  {
    name: "rule-8: required validation pack missing recent green denies",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      validationPacks: { required: ["pack-a"], recentGreen: [] },
    },
    expectedAllowed: false,
    expectedReason: "validation-pack-missing",
  },
  {
    name: "rule-8: required validation pack present in recentGreen passes",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      validationPacks: { required: ["pack-a"], recentGreen: ["pack-a"] },
    },
    expectedAllowed: true,
    expectedReason: "default-allow",
  },
  {
    name: "rule-9: workflow trace in wrong mode denies",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      activeWorkflowTrace: { schemaVersion: "palantir-mini/ontology-workflow-trace/v1", traceId: "t-1", createdAt: "2026-05-13T00:00:00.000Z", mode: "router", refs: { capabilityRefs: [], knownIssueRefs: [], validationPackRefs: [], implementationRefs: [], ratchetRefs: [] } },
    },
    expectedAllowed: false,
    expectedReason: "workflow-trace-not-opened",
  },
  {
    name: "rule-9: workflow trace in pre-mutation mode passes",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      activeWorkflowTrace: { schemaVersion: "palantir-mini/ontology-workflow-trace/v1", traceId: "t-2", createdAt: "2026-05-13T00:00:00.000Z", mode: "pre-mutation", refs: { capabilityRefs: [], knownIssueRefs: [], validationPackRefs: [], implementationRefs: [], ratchetRefs: [] } },
    },
    expectedAllowed: true,
    expectedReason: "default-allow",
  },
  {
    name: "rule-10: all rules pass — default allow",
    input: {
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      activeWorkflowTrace: { schemaVersion: "palantir-mini/ontology-workflow-trace/v1", traceId: "t-1", createdAt: "2026-05-13T00:00:00.000Z", mode: "implementation", refs: { capabilityRefs: [], knownIssueRefs: [], validationPackRefs: [], implementationRefs: [], ratchetRefs: [] } },
    },
    expectedAllowed: true,
    expectedReason: "default-allow",
  },
  {
    name: "mixed-1: read-only tool wins even with no DTC + no scope",
    input: { toolName: "Grep", targetFiles: ["/x/y.ts"] },
    expectedAllowed: true,
    expectedReason: "read-only-allow",
  },
  {
    name: "mixed-2: empty Bash command is read-only without DTC",
    input: { toolName: "Bash", targetFiles: [] },
    expectedAllowed: true,
    expectedReason: "read-only-allow",
  },
  {
    name: "mixed-3: prose changeBoundary is not path-checked (default allow)",
    input: {
      toolName: "Edit",
      targetFiles: ["/completely/different/path.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://test", changeBoundary: "Plugin-local PreToolUse prompt-DTC enforcement only.", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
    },
    expectedAllowed: true,
    expectedReason: "default-allow",
  },
];

describe("compilePreMutationPolicy", () => {
  for (const fx of FIXTURES) {
    test(fx.name, () => {
      const result = compilePreMutationPolicy(fx.input);
      expect(result.allowed).toBe(fx.expectedAllowed);
      expect(result.reason).toBe(fx.expectedReason);
    });
  }

  test("refs carry contractId from DTC and SIC", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION, contractId: "dtc://abc", changeBoundary: "/x/", affectedSurfaces: [], risks: [], status: "approved", semanticIntentContractRef: "sic://test", branchProposalPolicy: "none", permissionBoundary: "none", replayMigrationPlan: "none", observabilityPlan: "none", toolSurfaceReadiness: "none", evaluationPlan: "none" },
      sic: { schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION, contractId: "sic://xyz", status: "approved", rawIntent: "test", confirmedIntent: "test", nonGoals: [], approvedNouns: ["X"], approvedVerbs: ["add"], affectedSurfaces: [], permissionsAndProposal: "", acceptedRisks: [], downstreamAllowed: [], downstreamForbidden: [], clarificationQuestions: [] },
      activeWorkflowTrace: { schemaVersion: "palantir-mini/ontology-workflow-trace/v1", traceId: "trace-xyz", createdAt: "2026-05-13T00:00:00.000Z", mode: "implementation", refs: { capabilityRefs: [], knownIssueRefs: [], validationPackRefs: [], implementationRefs: [], ratchetRefs: [] } },
    });
    expect(result.refs.digitalTwinChangeContractRef).toBe("dtc://abc");
    expect(result.refs.semanticIntentContractRef).toBe("sic://xyz");
    expect(result.refs.workflowTraceId).toBe("trace-xyz");
  });

  test("empty targetFiles with protected mutation and no DTC denies at rule-5", () => {
    const result = compilePreMutationPolicy({
      toolName: "Write",
      targetFiles: [],
      isProtectedMutation: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing-digital-twin-change-contract");
  });

  test("humanReason string is non-empty for all fixture outcomes", () => {
    for (const fx of FIXTURES) {
      const result = compilePreMutationPolicy(fx.input);
      expect(result.humanReason.length).toBeGreaterThan(0);
    }
  });
});

// ─── Helper: base DTC for new rule tests ─────────────────────────────────────

const BASE_DTC = {
  schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION as typeof DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
  contractId: "dtc://base",
  changeBoundary: "/x/",
  affectedSurfaces: [],
  risks: [],
  status: "approved" as const,
  semanticIntentContractRef: "sic://base",
  branchProposalPolicy: "none",
  permissionBoundary: "none",
  replayMigrationPlan: "none",
  observabilityPlan: "none",
  toolSurfaceReadiness: "none",
  evaluationPlan: "none",
};

function testApprovalRef(promptId: string) {
  return createUserApprovalRef({
    promptId,
    promptHash: `sha256:${promptId}`,
    sessionId: "session-test",
    runtime: "codex",
    userVisibleSummary: "Approve the DigitalTwinChangeContract boundary for this test.",
    userAnswer: "Approved.",
    approvalSurface: "digital-twin-change",
    approvedAt: "2026-05-15T00:00:00.000Z",
  });
}

// ─── Rule 11: dtc-fill-incomplete ────────────────────────────────────────────

describe("rule-11: dtc-fill-incomplete", () => {
  const PARTIAL_DTC: DtcWithFillFields = {
    ...BASE_DTC,
    verdict: "draft",
  };
  const FILLED_DTC: DtcWithFillFields = {
    ...BASE_DTC,
    verdict: "dtc-filled",
  };
  const APPROVED_DTC: DtcWithFillFields = {
    ...BASE_DTC,
    verdict: "dtc-approved",
    approvalRef: testApprovalRef("prompt-apr-1"),
  };

  test("blocks when DTC partial — 3 completed turns, verdict=draft", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: BASE_DTC,
      dtcWithFill: PARTIAL_DTC,
      dtcCompletedTurnCount: 3,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("dtc-fill-incomplete");
    expect(result.refs.dtcFillSequenceStep).toBe(3);
    expect(result.humanReason).toContain("3 of 7");
  });

  test("blocks at turn 0 — no turns completed yet", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: BASE_DTC,
      dtcWithFill: PARTIAL_DTC,
      dtcCompletedTurnCount: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("dtc-fill-incomplete");
    expect(result.refs.dtcFillSequenceStep).toBe(0);
  });

  test("passes when verdict=dtc-filled (all 7 turns done)", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: FILLED_DTC,
      dtcWithFill: FILLED_DTC,
      dtcCompletedTurnCount: 7,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("passes when verdict=dtc-approved regardless of turn count", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: APPROVED_DTC,
      dtcWithFill: APPROVED_DTC,
      dtcCompletedTurnCount: 7,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("rule 11 skipped when dtcWithFill is absent (existing flow preserved)", () => {
    // No dtcWithFill → rule 11 does not trigger; rule 5 (no DTC) fires
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
    });
    expect(result.reason).toBe("missing-digital-twin-change-contract");
  });
});

// ─── Rule 12: ontology-affecting-intent-without-dtc-ref ──────────────────────

describe("rule-12: ontology-affecting-intent-without-dtc-ref", () => {
  test("blocks when ontology surface touched and DTC has no approvalRef", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: { ...BASE_DTC, approvalRef: undefined },
      touchedSurfaces: ["ontology/shared-core/", "lib/lead-intent/contracts.ts"],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ontology-affecting-intent-without-dtc-ref");
    expect(result.humanReason).toContain("DigitalTwinChangeContract");
  });

  test("passes when DTC has approvalRef (approved DTC present)", () => {
    const approvedDtc = {
      ...BASE_DTC,
      approvalRef: testApprovalRef("prompt-apr-2"),
    };
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: approvedDtc,
      touchedSurfaces: ["ontology/shared-core/"],
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("rule 12 skipped when no touchedSurfaces (existing flow preserved)", () => {
    // No touchedSurfaces → rule 12 does not trigger
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: BASE_DTC,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("rule 12 skipped when touchedSurfaces is empty", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: BASE_DTC,
      touchedSurfaces: [],
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("rule 12 skipped when surfaces are non-ontology (e.g. UI only)", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      isProtectedMutation: true,
      dtc: BASE_DTC,
      touchedSurfaces: ["src/components/Button.tsx", "styles/theme.css"],
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("Codex MCP schema_get spelling is read-only", () => {
    const result = compilePreMutationPolicy({
      toolName: "mcp__palantir_mini__ontology_schema_get",
      targetFiles: [],
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("read-only-allow");
  });

  test("Codex MCP commit_edits spelling is protected when caller omits the flag", () => {
    const result = compilePreMutationPolicy({
      toolName: "mcp__palantir_mini__commit_edits",
      targetFiles: [],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing-digital-twin-change-contract");
  });
});

// ─── Structured DTC mutation surface boundary ────────────────────────────────

describe("structured DTC mutation surface boundary", () => {
  test("extracts allowed surfaces and closed review domains from DTC", () => {
    const policy = extractDtcMutationSurfacePolicy({
      ...BASE_DTC,
      affectedSurfaces: ["lib/governance/policy-compiler.ts"],
      permittedMutationSurfaces: [{
        mutationKind: "write",
        surfaceRef: {
          kind: "FileSurface",
          rid: "file:lib/governance/*.ts",
          displayName: "governance files",
          sourcePath: "lib/governance/",
          pathGlob: "lib/governance/*.ts",
          confidence: "exact",
        },
      }],
      requiredUserDecisions: [{
        decisionId: "decision-tech",
        domain: "TECHNOLOGY",
        label: "Technology review",
        status: "approved",
        blocking: true,
        evidenceRefs: ["test://tech"],
        approvalRef: "user:approved:tech",
      }, {
        decisionId: "decision-gov",
        domain: "GOVERNANCE",
        label: "Governance review",
        status: "open",
        blocking: true,
        evidenceRefs: ["test://gov"],
      }],
    });

    expect(policy.allowedSurfaceRefs).toContain("lib/governance/*.ts");
    expect(policy.allowedSurfaceRefs).toContain("lib/governance/");
    expect(policy.allowedSurfaceRefs).toContain("lib/governance/policy-compiler.ts");
    expect(policy.requiredUserDecisionIds).toEqual(["decision-tech", "decision-gov"]);
    expect(policy.reviewDomainsClosed).toEqual(["TECHNOLOGY"]);
  });

  test("does not convert semantic affectedSurface ids into file mutation surfaces", () => {
    const policy = extractDtcMutationSurfacePolicy({
      ...BASE_DTC,
      changeBoundary: "Rendering lane prose boundary.",
      affectedSurfaces: ["seq.rendering-scene"],
    });

    expect(policy.allowedSurfaceRefs).toEqual([]);
  });

  test("blocks target outside structured allowed FileSurface before prose boundary fallback", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/repo/lib/lead-intent/contracts.ts"],
      isProtectedMutation: true,
      dtc: {
        ...BASE_DTC,
        changeBoundary: "Governance implementation prose.",
        affectedSurfaces: [],
        permittedMutationSurfaces: [{
          mutationKind: "write",
          surfaceRef: {
            kind: "FileSurface",
            rid: "file:lib/governance/*.ts",
            sourcePath: "lib/governance/",
            pathGlob: "lib/governance/*.ts",
            confidence: "exact",
          },
        }],
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("outside-dtc-change-boundary");
    expect(result.humanReason).toContain("allowed mutation surfaces");
  });

  test("allows absolute target inside relative structured FileSurface glob", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/repo/lib/governance/policy-compiler.ts"],
      isProtectedMutation: true,
      dtc: {
        ...BASE_DTC,
        changeBoundary: "Governance implementation prose.",
        affectedSurfaces: [],
        permittedMutationSurfaces: [{
          mutationKind: "write",
          surfaceRef: {
            kind: "FileSurface",
            rid: "file:lib/governance/*.ts",
            pathGlob: "lib/governance/*.ts",
            confidence: "exact",
          },
        }],
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("default-allow");
  });

  test("does not match structured relative FileSurface by arbitrary substring", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/repo/app-lib/governance/policy-compiler.ts"],
      isProtectedMutation: true,
      dtc: {
        ...BASE_DTC,
        changeBoundary: "Governance implementation prose.",
        affectedSurfaces: [],
        permittedMutationSurfaces: [{
          mutationKind: "write",
          surfaceRef: {
            kind: "FileSurface",
            rid: "file:lib/governance",
            sourcePath: "lib/governance",
            confidence: "exact",
          },
        }],
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("outside-dtc-change-boundary");
  });

  test("blocks target matching structured read-only FileSurface", () => {
    const result = compilePreMutationPolicy({
      toolName: "Edit",
      targetFiles: ["/repo/lib/governance/policy-compiler.ts"],
      isProtectedMutation: true,
      dtc: {
        ...BASE_DTC,
        changeBoundary: "Governance implementation prose.",
        affectedSurfaces: ["lib/governance/"],
        permittedMutationSurfaces: [{
          mutationKind: "read-only",
          surfaceRef: {
            kind: "FileSurface",
            rid: "file:lib/governance/policy-compiler.ts",
            sourcePath: "lib/governance/policy-compiler.ts",
            pathGlob: "lib/governance/policy-compiler.ts",
            confidence: "exact",
          },
        }],
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("forbidden-pattern");
    expect(result.humanReason).toContain("DTC forbidden mutation surface");
  });
});

// ─── isFillComplete helper ───────────────────────────────────────────────────

describe("isFillComplete", () => {
  const DRAFT_DTC: DtcWithFillFields = { ...BASE_DTC, verdict: "draft" };
  const FILLED_DTC: DtcWithFillFields = { ...BASE_DTC, verdict: "dtc-filled" };
  const APPROVED_DTC: DtcWithFillFields = { ...BASE_DTC, verdict: "dtc-approved" };
  const NO_VERDICT_DTC: DtcWithFillFields = { ...BASE_DTC };

  test("returns true when verdict=dtc-filled", () => {
    expect(isFillComplete(FILLED_DTC)).toBe(true);
  });

  test("returns true when verdict=dtc-approved", () => {
    expect(isFillComplete(APPROVED_DTC)).toBe(true);
  });

  test("returns false when verdict=draft with 3 completed turns", () => {
    expect(isFillComplete(DRAFT_DTC, 3)).toBe(false);
  });

  test("returns true when completedTurnCount=7 (boundary)", () => {
    expect(isFillComplete(DRAFT_DTC, 7)).toBe(true);
  });

  test("returns false when completedTurnCount=6 (one turn short)", () => {
    expect(isFillComplete(DRAFT_DTC, 6)).toBe(false);
  });

  test("returns false when no verdict and no completedTurnCount (defaults to 0)", () => {
    expect(isFillComplete(NO_VERDICT_DTC)).toBe(false);
  });

  test("returns false at boundary -1 equivalent (count=0)", () => {
    expect(isFillComplete(DRAFT_DTC, 0)).toBe(false);
  });
});

// ─── isOntologyAffectingBySurfaces helper ────────────────────────────────────

describe("isOntologyAffectingBySurfaces", () => {
  test("returns true for ontology/ path", () => {
    expect(isOntologyAffectingBySurfaces(["ontology/shared-core/types.ts"])).toBe(true);
  });

  test("returns true for schema surface", () => {
    expect(isOntologyAffectingBySurfaces(["schema/primitives/rule.ts"])).toBe(true);
  });

  test("returns true for lib/lead-intent path", () => {
    expect(isOntologyAffectingBySurfaces(["lib/lead-intent/contracts.ts"])).toBe(true);
  });

  test("returns true for bridge/handlers/ path", () => {
    expect(isOntologyAffectingBySurfaces(["bridge/handlers/pm-semantic-intent-gate.ts"])).toBe(true);
  });

  test("returns true for skills/ path", () => {
    expect(isOntologyAffectingBySurfaces(["skills/pm-dtc-fill/SKILL.md"])).toBe(true);
  });

  test("returns false for pure UI paths", () => {
    expect(isOntologyAffectingBySurfaces(["src/components/Button.tsx"])).toBe(false);
  });

  test("returns false for empty array", () => {
    expect(isOntologyAffectingBySurfaces([])).toBe(false);
  });

  test("returns true for mixed (any ontology surface)", () => {
    expect(isOntologyAffectingBySurfaces([
      "src/app/page.tsx",
      "lib/governance/policy-compiler.ts",
    ])).toBe(true);
  });
});
