// palantir-mini — PR contract boundary validator tests.
//
// Covers the Wave 9 binding between DigitalTwinChangeContract branch/proposal
// policy, permission boundary, PR body evidence, and changed-file surfaces.

import { describe, expect, test } from "bun:test";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";
import {
  validatePrContractBoundary,
  type PrContractBoundaryInput,
} from "../../scripts/validate-pr-contract-boundary";

function semanticContract(): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "sic-wave-9-pr-boundary",
    status: "approved",
    rawIntent: "Bind PR review metadata to Prompt-to-DTC contracts.",
    confirmedIntent: "Validate PR branch, body, and file boundary against approved contracts.",
    nonGoals: ["Do not change Prompt-DTC default gate mode"],
    approvedNouns: ["DigitalTwinChangeContract", "PR boundary", "permissionBoundary"],
    approvedVerbs: ["validate", "bind", "report"],
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/scripts/",
      ".claude/plugins/palantir-mini/tests/scripts/",
    ],
    permissionsAndProposal: "PR validator only; no mutation execution.",
    acceptedRisks: [],
    downstreamAllowed: [
      ".claude/plugins/palantir-mini/scripts/",
      ".claude/plugins/palantir-mini/tests/scripts/",
    ],
    downstreamForbidden: ["Prompt-DTC default gate mode change"],
    clarificationQuestions: [],
  };
}

function digitalTwinContract(overrides: Partial<DigitalTwinChangeContract> = {}): DigitalTwinChangeContract {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "dtc-wave-9-pr-boundary",
    status: "approved",
    semanticIntentContractRef: "sic-wave-9-pr-boundary",
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/scripts/",
      ".claude/plugins/palantir-mini/tests/scripts/",
    ],
    changeBoundary: "Add a PR contract boundary validator and focused tests.",
    branchProposalPolicy:
      "Branch names must include contract slug, wave token, and scope kind before PR review.",
    permissionBoundary:
      "Only .claude/plugins/palantir-mini/scripts/ and .claude/plugins/palantir-mini/tests/scripts/ may change.",
    replayMigrationPlan: "No data migration.",
    observabilityPlan: "Validator result reports blocking issues.",
    toolSurfaceReadiness: "CLI and pure TypeScript helper only.",
    evaluationPlan: "Run focused validator tests and typecheck.",
    risks: [],
    ...overrides,
  };
}

function validPrBody(extra = ""): string {
  return [
    "## Why",
    "SemanticIntentContract: sic-wave-9-pr-boundary",
    "DigitalTwinChangeContract: dtc-wave-9-pr-boundary",
    "Affected Typed Refs: FileSurfaceRef scripts and tests",
    "branchProposalPolicy: contract slug + wave token + scope kind",
    "permissionBoundary: scripts and tests only",
    "evaluationPlan: focused validator tests and typecheck",
    "## Recovery",
    "Revert this PR.",
    "## Excluded Scope",
    "Prompt-DTC default gate mode change.",
    extra,
  ].join("\n");
}

function input(overrides: Partial<PrContractBoundaryInput> = {}): PrContractBoundaryInput {
  return {
    branchName: "feat/wave-9-dtc-wave-9-pr-boundary-branch",
    prBody: validPrBody(),
    changedFiles: [
      ".claude/plugins/palantir-mini/scripts/validate-pr-contract-boundary.ts",
      ".claude/plugins/palantir-mini/tests/scripts/validate-pr-contract-boundary.test.ts",
    ],
    semanticIntentContract: semanticContract(),
    digitalTwinChangeContract: digitalTwinContract(),
    ...overrides,
  };
}

describe("validatePrContractBoundary", () => {
  test("passes when branch, PR body, and files satisfy contract boundary", () => {
    const result = validatePrContractBoundary(input());

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.branchPolicy.valid).toBe(true);
    expect(result.permissionBoundary.valid).toBe(true);
    expect(result.permissionBoundary.authorizedFiles).toHaveLength(2);
  });

  test("blocks when required PR body sections are missing", () => {
    const result = validatePrContractBoundary(
      input({
        prBody: [
          "## Why",
          "SemanticIntentContract: sic-wave-9-pr-boundary",
          "DigitalTwinChangeContract: dtc-wave-9-pr-boundary",
        ].join("\n"),
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.requiredSections.recovery?.present).toBe(false);
    expect(result.requiredSections.excludedScope?.present).toBe(false);
    expect(result.issues.map((issue) => issue.field)).toContain("prBody.evaluationPlan");
  });

  test("blocks when branch name omits contract slug, wave token, or scope kind", () => {
    const result = validatePrContractBoundary(
      input({
        branchName: "feat/generic-validator",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.branchPolicy.contractSlugRequired).toBe(true);
    expect(result.branchPolicy.waveTokenRequired).toBe(true);
    expect(result.branchPolicy.scopeKindRequired).toBe(true);
  });

  test("blocks when changed file is outside permissionBoundary surfaces", () => {
    const result = validatePrContractBoundary(
      input({
        changedFiles: [
          ".claude/plugins/palantir-mini/scripts/validate-pr-contract-boundary.ts",
          ".claude/plugins/palantir-mini/bridge/mcp-server.ts",
        ],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.permissionBoundary.unauthorizedFiles).toContain(
      ".claude/plugins/palantir-mini/bridge/mcp-server.ts",
    );
  });

  test("blocks generated file changes without regeneration evidence", () => {
    const result = validatePrContractBoundary(
      input({
        branchName: "feat/wave-9-dtc-wave-9-pr-boundary-project-scope",
        prBody: validPrBody(),
        changedFiles: ["projects/palantir-math/src/generated/project-ontology-scope.generated.ts"],
        digitalTwinChangeContract: digitalTwinContract({
          affectedSurfaces: ["projects/palantir-math/src/generated/**"],
          permissionBoundary: "Generated project scope files may change only through regeneration.",
        }),
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.permissionBoundary.generatedFilesRequiringEvidence).toContain(
      "projects/palantir-math/src/generated/project-ontology-scope.generated.ts",
    );
  });

  test("allows generated file changes when PR body includes regeneration evidence", () => {
    const result = validatePrContractBoundary(
      input({
        branchName: "feat/wave-9-dtc-wave-9-pr-boundary-project-scope",
        prBody: validPrBody("\nverify_codegen_headers passed after pm-codegen regeneration."),
        changedFiles: ["projects/palantir-math/src/generated/project-ontology-scope.generated.ts"],
        digitalTwinChangeContract: digitalTwinContract({
          affectedSurfaces: ["projects/palantir-math/src/generated/**"],
          permissionBoundary: "Generated project scope files may change only through regeneration.",
        }),
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.permissionBoundary.generatedFilesRequiringEvidence).toHaveLength(0);
  });
});
