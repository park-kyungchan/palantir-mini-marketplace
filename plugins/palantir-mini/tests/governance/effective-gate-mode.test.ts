import { describe, expect, test } from "bun:test";
import {
  PROJECT_GATE_POLICY_MINIMUMS,
  PROJECT_GATE_POLICY_REASON_CODES,
  compareProjectGateModes,
  gateModeFromEnv,
  resolveEffectiveGateMode,
  strongestProjectGateMode,
} from "../../lib/governance/effective-gate-mode";

describe("effective project gate mode", () => {
  test("orders gate modes from disabled to fully blocking", () => {
    expect(compareProjectGateModes("off", "advisory")).toBeLessThan(0);
    expect(compareProjectGateModes("selective-blocking", "scoped-blocking")).toBeLessThan(0);
    expect(compareProjectGateModes("blocking", "blocking")).toBe(0);
    expect(strongestProjectGateMode("advisory", "blocking")).toBe("blocking");
  });

  test("keeps unprotected calls at the requested mode", () => {
    expect(resolveEffectiveGateMode({ requestedMode: "off" })).toEqual({
      requestedMode: "off",
      effectiveMode: "off",
      reasonCode: PROJECT_GATE_POLICY_REASON_CODES.requestedModeHonored,
      strengthened: false,
    });
  });

  test("strengthens ontology-write, commit, pull-request, and release to blocking", () => {
    for (const mutationClass of ["ontology-write", "commit", "pull-request", "release"] as const) {
      const result = resolveEffectiveGateMode({
        requestedMode: "off",
        mutationClass,
      });
      expect(result.effectiveMode).toBe("blocking");
      expect(result.minimumMode).toBe(PROJECT_GATE_POLICY_MINIMUMS[mutationClass]);
      expect(result.reasonCode).toBe(PROJECT_GATE_POLICY_REASON_CODES.minimumApplied);
      expect(result.strengthened).toBe(true);
    }
  });

  test("strengthens generic mutation and external command to scoped-blocking", () => {
    for (const mutationClass of ["generic-mutation", "external-command"] as const) {
      const result = resolveEffectiveGateMode({
        requestedMode: "advisory",
        mutationClass,
      });
      expect(result.effectiveMode).toBe("scoped-blocking");
      expect(result.reasonCode).toBe(PROJECT_GATE_POLICY_REASON_CODES.minimumApplied);
    }
  });

  test("environment parsing keeps invalid values at the safe fallback", () => {
    expect(gateModeFromEnv("off")).toBe("off");
    expect(gateModeFromEnv("not-a-mode")).toBe("selective-blocking");
    expect(gateModeFromEnv(undefined, "blocking")).toBe("blocking");
  });
});
