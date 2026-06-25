export type ProjectGateMode =
  | "off"
  | "advisory"
  | "selective-blocking"
  | "scoped-blocking"
  | "blocking";

export type ProtectedMutationClass =
  | "ontology-write"
  | "external-command"
  | "commit"
  | "pull-request"
  | "release"
  | "generic-mutation";

export const PROJECT_GATE_MODE_ORDER: readonly ProjectGateMode[] = [
  "off",
  "advisory",
  "selective-blocking",
  "scoped-blocking",
  "blocking",
] as const;

export const PROJECT_GATE_POLICY_REASON_CODES = {
  minimumApplied: "project_gate_policy_minimum_applied",
  requestedModeHonored: "project_gate_policy_requested_mode_honored",
  invalidRequestedMode: "project_gate_policy_invalid_requested_mode",
  bypassDenied: "project_gate_policy_env_bypass_denied",
} as const;

export const PROJECT_GATE_POLICY_MINIMUMS: Record<
  ProtectedMutationClass,
  ProjectGateMode
> = {
  "ontology-write": "blocking",
  "external-command": "scoped-blocking",
  commit: "blocking",
  "pull-request": "blocking",
  release: "blocking",
  "generic-mutation": "scoped-blocking",
};

export interface EffectiveGateModeInput {
  readonly requestedMode: ProjectGateMode;
  readonly mutationClass?: ProtectedMutationClass;
  /**
   * A2: true iff the env explicitly set PALANTIR_MINI_PROMPT_DTC_GATE_MODE (vs. an
   * implicit default). Plumbed for audit/symmetry only — it is floor-NEUTRAL: a
   * blunt `off` is strengthen-only and never relaxes a protected floor (the A2
   * delivery escape is the unforgeable per-turn user-approval envelope, not a mode
   * toggle). See the note in {@link resolveEffectiveGateMode}.
   */
  readonly hasExplicitGateMode?: boolean;
}

/**
 * A2 authorized-delivery class allowlist — a POSITIVE ENUMERATION of the delivery
 * mutation surfaces (merge / PR / commit / release / push) eligible for the
 * authorized-delivery lane. `ontology-write` is deliberately EXCLUDED: the A1
 * ontology-write DTC gate is NEVER cleared by a delivery approval.
 *
 * SECURITY (do NOT re-introduce a class-only A2 pass): membership in this set is
 * NECESSARY but NOT SUFFICIENT to grant the A2 PASS. `generic-mutation` is included
 * ONLY as a de-floored delivery surface — the de-floor legitimately maps an
 * all-non-ontology commit/PR/Edit to it — but a `generic-mutation` (or any other
 * class here) only A2-passes when the prompt-DTC gate's `isProvenNonOntologyDelivery`
 * guard ADDITIONALLY proves the resolved write-set is entirely non-ontology (the
 * classifier + write-set predicate). The fail-closed property lives in THAT guard,
 * NOT in this set, because an ontology write can de-floor to `commit`/`generic-mutation`
 * (NOT `ontology-write`) and would otherwise slip through class membership alone. See
 * `hooks/prompt-dtc-enforcement-gate.ts` → `isProvenNonOntologyDelivery`.
 */
export const AUTHORIZED_DELIVERY_CLASSES: ReadonlySet<ProtectedMutationClass> =
  new Set(["pull-request", "commit", "release", "generic-mutation"]);

export interface EffectiveGateModeResult {
  readonly requestedMode: ProjectGateMode;
  readonly effectiveMode: ProjectGateMode;
  readonly mutationClass?: ProtectedMutationClass;
  readonly minimumMode?: ProjectGateMode;
  readonly reasonCode:
    | typeof PROJECT_GATE_POLICY_REASON_CODES.minimumApplied
    | typeof PROJECT_GATE_POLICY_REASON_CODES.requestedModeHonored;
  readonly strengthened: boolean;
}

export function isProjectGateMode(value: unknown): value is ProjectGateMode {
  return (
    value === "off" ||
    value === "advisory" ||
    value === "selective-blocking" ||
    value === "scoped-blocking" ||
    value === "blocking"
  );
}

export function compareProjectGateModes(
  left: ProjectGateMode,
  right: ProjectGateMode,
): number {
  return PROJECT_GATE_MODE_ORDER.indexOf(left) - PROJECT_GATE_MODE_ORDER.indexOf(right);
}

export function strongestProjectGateMode(
  left: ProjectGateMode,
  right: ProjectGateMode,
): ProjectGateMode {
  return compareProjectGateModes(left, right) >= 0 ? left : right;
}

export function resolveEffectiveGateMode(
  input: EffectiveGateModeInput,
): EffectiveGateModeResult {
  // NOTE (A2): a blunt env `off` is INTENTIONALLY strengthen-only — it never
  // defeats a protected mutation-class floor (ratified by the prompt-DTC gate
  // tests: "mode off is strengthen-only for protected edit mutations" and "mode
  // off (explicit) is strengthened for commit_edits"). The A2 authorized-delivery
  // escape is the UNFORGEABLE per-turn user-approval envelope re-verified in
  // assessPromptDtc, NOT a mode toggle, so `hasExplicitGateMode` does not relax the
  // floor here. The field is plumbed for audit/symmetry only.
  const minimumMode = input.mutationClass
    ? PROJECT_GATE_POLICY_MINIMUMS[input.mutationClass]
    : undefined;
  const effectiveMode = minimumMode
    ? strongestProjectGateMode(input.requestedMode, minimumMode)
    : input.requestedMode;
  const strengthened = effectiveMode !== input.requestedMode;

  return {
    requestedMode: input.requestedMode,
    effectiveMode,
    mutationClass: input.mutationClass,
    minimumMode,
    reasonCode: strengthened
      ? PROJECT_GATE_POLICY_REASON_CODES.minimumApplied
      : PROJECT_GATE_POLICY_REASON_CODES.requestedModeHonored,
    strengthened,
  };
}

export function gateModeFromEnv(
  value: unknown,
  fallback: ProjectGateMode = "selective-blocking",
): ProjectGateMode {
  return isProjectGateMode(value) ? value : fallback;
}
