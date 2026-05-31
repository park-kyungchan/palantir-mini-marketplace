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
}

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
