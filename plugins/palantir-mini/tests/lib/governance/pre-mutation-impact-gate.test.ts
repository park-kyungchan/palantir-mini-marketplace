import { afterEach, describe, expect, test } from "bun:test";
import {
  evaluatePreMutationImpactGate,
  type PreMutationImpactGateInput,
} from "../../../lib/governance/pre-mutation-impact-gate";
import { extractDtcMutationSurfacePolicy } from "../../../lib/governance/dtc-surface-policy";
import type { DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";
import type { McpToolCapability } from "../../../lib/capability-registry/mcp-tool-capability";
import { fixtureOutputs } from "../../../lib/semantic-consistency/fixtures";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const BASE_DTC: DigitalTwinChangeContract = {
  schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
  contractId: "digital-twin-change:test",
  status: "approved",
  semanticIntentContractRef: "semantic-intent:test",
  affectedSurfaces: [],
  changeBoundary: "Governance test boundary.",
  branchProposalPolicy: "test",
  permissionBoundary: "test",
  replayMigrationPlan: "none",
  observabilityPlan: "test",
  toolSurfaceReadiness: "test",
  evaluationPlan: "bun test tests/lib/governance",
  risks: [],
  approvalRef: "user:approved:test",
};

const RELEASE_CAPABILITY: McpToolCapability = {
  schemaVersion: "palantir-mini/mcp-tool-capability/v1",
  toolName: "release_bundle",
  rid: "mcp://palantir-mini/release_bundle",
  ownerModule: "tests",
  lifecycle: "public",
  domain: "GOVERNANCE",
  effects: ["validate"],
  mutationKind: "none",
  requiresDtcApproval: true,
  requiresSprintContract: true,
  dataAction: "none",
  releaseDeploy: true,
  externalEgress: false,
  classifierProjection: {
    legacyOperation: "unknown",
    classificationMode: "legacy-fallback",
    preservesRuntimeBlocking: true,
    reason: "test capability",
  },
};

function evaluate(input: Partial<PreMutationImpactGateInput>) {
  return evaluatePreMutationImpactGate({
    projectRoot: "/repo",
    toolName: "Edit",
    toolInput: {},
    resolvedTargetFiles: [],
    ...input,
  });
}

describe("PreMutationImpactGate typed surface policy", () => {
  afterEach(() => {
    delete process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
  });

  test("FileSurface: allowed target produces allow with matched surface", () => {
    const dtc: DigitalTwinChangeContract = {
      ...BASE_DTC,
      permittedMutationSurfaces: [{
        mutationKind: "write",
        surfaceRef: {
          kind: "FileSurface",
          rid: "file:lib/governance/*.ts",
          pathGlob: "lib/governance/*.ts",
          confidence: "exact",
        },
      }],
    };
    const result = evaluate({
      toolName: "Edit",
      resolvedTargetFiles: ["/repo/lib/governance/pre-mutation-impact-gate.ts"],
      digitalTwinChangeContract: dtc,
      mode: "blocking",
    });
    expect(result.decision).toBe("allow");
    expect(result.matchedSurfaces).toContain("FileSurface:lib/governance/*.ts");
  });

  test("MCPTool and DataAction: commit_edits matches capability metadata", () => {
    const dtc: DigitalTwinChangeContract = {
      ...BASE_DTC,
      permittedMutationSurfaces: [{
        mutationKind: "commit",
        surfaceRef: {
          kind: "MCPTool",
          rid: "mcp://palantir-mini/commit_edits",
          toolName: "commit_edits",
          confidence: "exact",
        },
      }],
    };
    const policy = extractDtcMutationSurfacePolicy(dtc);
    expect(policy.allowedMcpToolRefs).toContain("commit_edits");
    expect(policy.allowedDataActions).toContain("read-or-write-contract");

    const result = evaluate({
      toolName: "mcp__palantir_mini__commit_edits",
      toolInput: { actionTypeRid: "ontology-action://approve-change" },
      digitalTwinChangeContract: dtc,
      digitalTwinChangeContractRef: dtc.contractId,
      workContractRef: "work-contract:test",
      mode: "blocking",
    });
    expect(result.decision).toBe("allow");
    expect(result.matchedSurfaces).toContain("MCPTool:commit_edits");
    expect(result.matchedSurfaces).toContain("DataAction:read-or-write-contract");
  });

  test("ActionType: commit_edits denies mismatched actionTypeRid in blocking mode", () => {
    const dtc: DigitalTwinChangeContract = {
      ...BASE_DTC,
      permittedMutationSurfaces: [{
        mutationKind: "commit",
        surfaceRef: {
          kind: "ActionType",
          rid: "ontology-action://approved-action",
          displayName: "approved-action",
          confidence: "exact",
        },
      }],
    };
    const result = evaluate({
      toolName: "mcp__palantir_mini__commit_edits",
      toolInput: { actionTypeRid: "ontology-action://different-action" },
      digitalTwinChangeContract: dtc,
      digitalTwinChangeContractRef: dtc.contractId,
      workContractRef: "work-contract:test",
      mode: "blocking",
    });
    expect(result.decision).toBe("deny");
    expect(result.requiredNextActions.join("\n")).toContain("ActionType");
  });

  test("ProjectSurface: sourcePath surface matches scoped target file", () => {
    const dtc: DigitalTwinChangeContract = {
      ...BASE_DTC,
      permittedMutationSurfaces: [{
        mutationKind: "write",
        surfaceRef: {
          kind: "ProjectSurface",
          rid: "project://demo/surface/publish",
          surfaceId: "publish",
          sourcePath: "src/publish/",
          confidence: "exact",
        },
      }],
    };
    const result = evaluate({
      toolName: "Edit",
      resolvedTargetFiles: ["/repo/src/publish/cloud.ts"],
      digitalTwinChangeContract: dtc,
      mode: "blocking",
    });
    expect(result.decision).toBe("allow");
    expect(result.matchedSurfaces).toContain("ProjectSurface:src/publish/");
  });

  test("read-only DTC surface is treated as forbidden for mutation", () => {
    const dtc: DigitalTwinChangeContract = {
      ...BASE_DTC,
      permittedMutationSurfaces: [{
        mutationKind: "read-only",
        surfaceRef: {
          kind: "MCPTool",
          rid: "mcp://palantir-mini/commit_edits",
          toolName: "commit_edits",
          confidence: "exact",
        },
      }],
    };
    const result = evaluate({
      toolName: "mcp__palantir_mini__commit_edits",
      digitalTwinChangeContract: dtc,
      digitalTwinChangeContractRef: dtc.contractId,
      mode: "blocking",
    });
    expect(result.decision).toBe("deny");
    expect(result.requiredNextActions.join("\n")).toContain("forbidden surface");
  });

  test("release/deploy is advisory by default but deny in blocking mode without explicit approval", () => {
    const advisory = evaluate({
      toolName: "release_bundle",
      capability: RELEASE_CAPABILITY,
    });
    expect(advisory.decision).toBe("advisory");
    expect(advisory.missingApprovals).toContain("ReleaseDeploy:release_bundle");

    const blocking = evaluate({
      toolName: "release_bundle",
      capability: RELEASE_CAPABILITY,
      mode: "blocking",
    });
    expect(blocking.decision).toBe("deny");
  });

  test("egress requires explicit approval in blocking mode but remains advisory by default", () => {
    const advisory = evaluate({
      toolName: "mcp__palantir_mini__research_library_refresh",
    });
    expect(advisory.decision).toBe("advisory");
    expect(advisory.missingApprovals).toContain("ExternalEgress:research_library_refresh");

    const blocking = evaluate({
      toolName: "mcp__palantir_mini__research_library_refresh",
      mode: "blocking",
    });
    expect(blocking.decision).toBe("deny");
  });

  test("semantic consistency conflicts deny mutation when semantic gate is blocking", () => {
    process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE = "blocking";

    const semanticConsistencyResult = fixtureOutputs().overloaded;
    const result = evaluate({
      toolName: "Edit",
      resolvedTargetFiles: ["/repo/lib/lead-intent/contracts.ts"],
      semanticConsistencyResult,
      semanticConsistencyResultRef: semanticConsistencyResult.resolverRunId,
    });

    expect(result.decision).toBe("deny");
    expect(result.missingApprovals).toContain(
      `${semanticConsistencyResult.resolverRunId}:SemanticConsistencyApproval`,
    );
    expect(result.requiredNextActions.join("\n")).toContain("Resolve semantic consistency conflicts");
    expect(result.evidenceRefs).toContain(semanticConsistencyResult.resolverRunId);
  });
});
