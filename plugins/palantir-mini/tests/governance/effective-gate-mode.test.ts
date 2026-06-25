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

  // A2 — a blunt env `off` is STRENGTHEN-ONLY: it must NOT defeat any protected
  // mutation-class floor, even when EXPLICITLY set. The A2 delivery escape is the
  // unforgeable per-turn user-approval envelope (verified in assessPromptDtc), not a
  // mode toggle. These pin that hasExplicitGateMode never relaxes the floor here.

  test("explicit off is strengthen-only for the delivery classes (floor preserved)", () => {
    for (const mutationClass of ["pull-request", "commit", "release", "generic-mutation"] as const) {
      const result = resolveEffectiveGateMode({
        requestedMode: "off",
        mutationClass,
        hasExplicitGateMode: true,
      });
      // requested `off` is the weakest mode, so the effective mode is exactly the
      // class floor — explicit off NEVER relaxes it.
      expect(result.effectiveMode).toBe(PROJECT_GATE_POLICY_MINIMUMS[mutationClass]);
      expect(result.minimumMode).toBe(PROJECT_GATE_POLICY_MINIMUMS[mutationClass]);
      expect(result.strengthened).toBe(true);
    }
  });

  test("explicit off NEVER relaxes the ontology-write floor (stays blocking)", () => {
    const result = resolveEffectiveGateMode({
      requestedMode: "off",
      mutationClass: "ontology-write",
      hasExplicitGateMode: true,
    });
    expect(result.effectiveMode).toBe("blocking");
    expect(result.minimumMode).toBe(PROJECT_GATE_POLICY_MINIMUMS["ontology-write"]);
    expect(result.reasonCode).toBe(PROJECT_GATE_POLICY_REASON_CODES.minimumApplied);
    expect(result.strengthened).toBe(true);
  });

  test("hasExplicitGateMode is floor-neutral: same result with or without it", () => {
    for (const mutationClass of ["commit", "ontology-write", "generic-mutation"] as const) {
      const withFlag = resolveEffectiveGateMode({
        requestedMode: "off",
        mutationClass,
        hasExplicitGateMode: true,
      });
      const withoutFlag = resolveEffectiveGateMode({
        requestedMode: "off",
        mutationClass,
      });
      expect(withFlag.effectiveMode).toBe(withoutFlag.effectiveMode);
    }
  });
});
