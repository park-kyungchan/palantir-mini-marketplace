// palantir-mini — tests for DTC ref-resolver helpers.
// Covers resolveDTCToolSurfaceTerms + evaluateProjectScopeConformanceForDTC.

import { describe, expect, it } from "bun:test";
import { resolveDTCToolSurfaceTerms } from "./ontology-ref-resolver";
import { evaluateProjectScopeConformanceForDTC } from "./project-scope-policy";
import type { DigitalTwinChangeContract } from "./contracts";

// ---------------------------------------------------------------------------
// Minimal DTC factory — only fields needed for these helpers.
// ---------------------------------------------------------------------------

function makeDTC(overrides: Partial<DigitalTwinChangeContract>): DigitalTwinChangeContract {
  return {
    contractId: "test-dtc-001",
    status: "draft",
    semanticIntentContractRef: "sic-001",
    affectedSurfaces: [],
    changeBoundary: "",
    branchProposalPolicy: "",
    permissionBoundary: "",
    replayMigrationPlan: "",
    observabilityPlan: "",
    toolSurfaceReadiness: "",
    evaluationPlan: "",
    risks: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveDTCToolSurfaceTerms
// ---------------------------------------------------------------------------

describe("resolveDTCToolSurfaceTerms", () => {
  it("known tool in toolSurfaceReadiness prose → resolvedTools populated, unresolvedTerms empty", () => {
    const dtc = makeDTC({ toolSurfaceReadiness: "Uses emit_event to append lineage." });
    const result = resolveDTCToolSurfaceTerms(dtc);
    expect(result.resolvedTools).toContain("emit_event");
    expect(result.unresolvedToolSurfaceTerms).not.toContain("emit_event");
  });

  it("unknown tool → moved to unresolvedToolSurfaceTerms", () => {
    const dtc = makeDTC({ toolSurfaceReadiness: "Uses totally_fake_tool_xyz for processing." });
    const result = resolveDTCToolSurfaceTerms(dtc);
    expect(result.resolvedTools).not.toContain("totally_fake_tool_xyz");
    expect(result.unresolvedToolSurfaceTerms).toContain("totally_fake_tool_xyz");
  });

  it("empty toolSurfaceReadiness + no permittedMutationSurfaces → empty resolved arrays", () => {
    const dtc = makeDTC({ toolSurfaceReadiness: "", permittedMutationSurfaces: [] });
    const result = resolveDTCToolSurfaceTerms(dtc);
    expect(result.resolvedTools).toEqual([]);
    expect(result.unresolvedToolSurfaceTerms).toEqual([]);
  });

  it("known tool via permittedMutationSurfaces MCPTool entry → resolved", () => {
    const dtc = makeDTC({
      toolSurfaceReadiness: "",
      permittedMutationSurfaces: [
        {
          surfaceRef: {
            kind: "MCPTool",
            rid: "mcp://palantir-mini/impact_query",
            displayName: "impact_query",
            toolName: "impact_query",
            sourcePath: "palantir-mini/bridge/mcp-server.ts",
            confidence: "exact",
          },
          mutationKind: "write",
        },
      ],
    });
    const result = resolveDTCToolSurfaceTerms(dtc);
    expect(result.resolvedTools).toContain("impact_query");
  });
});

// ---------------------------------------------------------------------------
// evaluateProjectScopeConformanceForDTC
// ---------------------------------------------------------------------------

describe("evaluateProjectScopeConformanceForDTC", () => {
  it("in-scope affectedSurfaces → conformant=true, coverageRatio=1.0", () => {
    // The default project scope has writableRoot="." which allows all paths.
    const dtc = makeDTC({
      affectedSurfaces: ["lib/lead-intent/contracts.ts", "lib/event-log/read.ts"],
      changeBoundary: "Extend lib/lead-intent/contracts.ts.",
    });
    const result = evaluateProjectScopeConformanceForDTC(dtc);
    expect(result.conformant).toBe(true);
    expect(result.coverageRatio).toBe(1.0);
    expect(result.outOfScopePaths).toEqual([]);
  });

  it("surfaces matching forbiddenPatterns → conformant=false, outOfScopePaths populated", () => {
    // src/generated/** is a standard forbidden pattern.
    const dtc = makeDTC({
      affectedSurfaces: ["src/generated/ontology-types.ts"],
      changeBoundary: "Modifying src/generated/ontology-types.ts directly.",
    });
    const result = evaluateProjectScopeConformanceForDTC(dtc, undefined, {
      strictForbiddenPatterns: true,
    });
    expect(result.conformant).toBe(false);
    expect(result.outOfScopePaths).toContain("src/generated/ontology-types.ts");
  });

  it("empty affectedSurfaces and no file-like tokens in changeBoundary → conformant=true, coverageRatio=1.0", () => {
    const dtc = makeDTC({
      affectedSurfaces: [],
      changeBoundary: "General refactoring pass.",
    });
    const result = evaluateProjectScopeConformanceForDTC(dtc);
    expect(result.conformant).toBe(true);
    expect(result.coverageRatio).toBe(1.0);
  });
});
