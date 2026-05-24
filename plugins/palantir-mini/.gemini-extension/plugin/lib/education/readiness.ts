export interface EducationReadinessDefaults {
  readonly templateId: string;
  readonly requiredAxes: readonly string[];
  readonly requiredValidationPacks: readonly string[];
  readonly deferredPilots: readonly string[];
}

export const EDUCATION_READINESS_DEFAULTS: EducationReadinessDefaults = {
  templateId: "education-template.v1",
  requiredAxes: [
    "learning-domain",
    "lesson-artifact",
    "surface-authority",
    "interaction-semantics",
    "rendering-semantics",
    "effect-semantics",
    "evaluation-lineage",
  ],
  requiredValidationPacks: [
    "deterministic-core",
    "artifact-compiler",
    "semantic-loop",
    "presenter-parity",
  ],
  deferredPilots: [
    "palantir-math ontology pilot",
  ],
};

export function educationReadinessChecklist(
  defaults: EducationReadinessDefaults = EDUCATION_READINESS_DEFAULTS,
): string[] {
  return [
    ...defaults.requiredAxes.map((axis) => `axis:${axis}`),
    ...defaults.requiredValidationPacks.map((pack) => `validation:${pack}`),
  ];
}
