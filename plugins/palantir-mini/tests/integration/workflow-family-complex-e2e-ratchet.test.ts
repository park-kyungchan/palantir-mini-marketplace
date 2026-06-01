import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  WORKFLOW_FAMILIES,
  WORKFLOW_FAMILY_COMPLEX_E2E_SCENARIO_DECLARATIONS,
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
  getWorkflowFamilyEnforcementContract,
  listWorkflowFamiliesMissingComplexE2EScenarioDeclarations,
} from "../../core/contracts";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

function refExists(ref: string): boolean {
  return fs.existsSync(path.join(PLUGIN_ROOT, ref));
}

describe("workflow family complex E2E ratchet", () => {
  test("every workflow family declares at least one complex end-to-end scenario", () => {
    expect(WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY).toHaveLength(
      WORKFLOW_FAMILIES.length,
    );
    expect(listWorkflowFamiliesMissingComplexE2EScenarioDeclarations()).toEqual([]);
  });

  test("declared scenarios are connected to executable validation evidence", () => {
    for (const scenario of WORKFLOW_FAMILY_COMPLEX_E2E_SCENARIO_DECLARATIONS) {
      const contract = getWorkflowFamilyEnforcementContract(scenario.workflowFamily);
      const phaseIds = new Set(contract.phases.map((phase) => phase.phaseId));

      expect(scenario.complexity).toBe("complex");
      expect(scenario.runtimeRefs).toContain("codex");
      expect(scenario.runtimeRefs).not.toContain("claude");
      expect(scenario.runtimeRefs).not.toContain("gemini");
      expect(new Set(scenario.runtimeRefs).size).toBe(scenario.runtimeRefs.length);
      expect(scenario.coveredPhaseIds.length).toBeGreaterThanOrEqual(2);

      for (const runtime of ["claude", "gemini"] as const) {
        const support = contract.runtimeProjection[runtime];
        expect(support.support).toBe("unsupported");
        expect(support.evidenceRefs).toEqual([]);
        expect(support.unsupportedSurfaceRefs.length).toBeGreaterThan(0);
      }

      for (const phaseId of scenario.coveredPhaseIds) {
        expect(phaseIds.has(phaseId)).toBe(true);
      }
      for (const ref of [...scenario.validationRefs, ...scenario.evidenceRefs]) {
        expect(refExists(ref)).toBe(true);
      }
    }
  });

  test("mutation or release capable families have deterministic blocking gates", () => {
    const mutationOrReleaseFamilies = new Set([
      "ontologyEngineering",
      "semanticIntentAndRouting",
      "hookAndPolicyEnforcement",
      "runtimeAdapterAndParity",
      "releaseAndShipping",
      "applicationAndChatbotAuthoring",
    ]);

    for (const contract of WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY) {
      if (!mutationOrReleaseFamilies.has(contract.workflowFamily)) continue;

      const blockingGateCount = contract.phases.reduce(
        (total, phase) => total + phase.blockingGates.length,
        0,
      );
      const enforcedPhaseCount = contract.phases.filter(
        (phase) => phase.deterministicStatus === "enforced",
      ).length;

      expect(blockingGateCount).toBeGreaterThan(0);
      expect(enforcedPhaseCount).toBeGreaterThan(0);
      expect(contract.unsupportedParityClaimsForbidden).toBe(true);
    }
  });
});
