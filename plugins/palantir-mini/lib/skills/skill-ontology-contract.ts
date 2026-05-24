import type { SkillOntologyRef } from "../chatbot-studio/semantic-conversation-state";

export const SKILL_ONTOLOGY_SCHEMA_VERSION = "palantir-mini/skill-ontology/v1";

export const SKILL_ONTOLOGY_CATEGORIES = [
  "problem-authoring",
  "sequencer-compile",
  "visual-scenario",
  "concept-authoring",
  "debug-triage",
  "presenter-readiness",
] as const;

export type SkillOntologyCategory = typeof SKILL_ONTOLOGY_CATEGORIES[number];

export interface SkillArtifactLifecycle {
  readonly prerequisites: readonly string[];
  readonly optionalInputs: readonly string[];
  readonly creates: readonly string[];
  readonly mutates: readonly string[];
}

export interface SkillIntentMatcher {
  readonly matcherId: string;
  readonly naturalLanguageExamples: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly projectScopeLanes: readonly string[];
  readonly prerequisites?: readonly string[];
  readonly optionalExistingArtifacts?: readonly string[];
  readonly createsArtifacts?: readonly string[];
  readonly consumesArtifacts?: readonly string[];
  readonly requiredArtifacts?: readonly string[];
  readonly negativeExamples?: readonly string[];
}

export interface SkillOntologyContract {
  readonly skillId: string;
  readonly skillPath: string;
  readonly displayName: string;
  readonly category: SkillOntologyCategory;

  readonly userFacingPurpose: string;
  readonly leadFacingPurpose: string;

  readonly inputOntology: {
    readonly objectRefs: readonly string[];
    readonly requiredArtifacts: readonly string[];
    readonly artifactLifecycle: SkillArtifactLifecycle;
    readonly allowedRawInputs: readonly string[];
  };

  readonly outputOntology: {
    readonly objectRefs: readonly string[];
    readonly artifactRefs: readonly string[];
    readonly validationPacks: readonly string[];
  };

  readonly actionBoundary: {
    readonly mayMutateProjectFiles: boolean;
    readonly mutationSurfaces: readonly string[];
    readonly requiresDtcApproval: boolean;
    readonly requiresTeacherApproval: boolean;
  };

  readonly nonGoals: readonly string[];
  readonly failureModes: readonly string[];
  readonly intentMatchers: readonly SkillIntentMatcher[];
  readonly readSurfaces?: readonly string[];
  readonly writeSurfaces?: readonly string[];
  readonly knownIssueRefs?: readonly string[];
}

export interface SkillOntologyValidationIssue {
  readonly issueId: string;
  readonly field: string;
  readonly message: string;
  readonly severity: "fail" | "warn";
}

export interface SkillOntologyValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SkillOntologyValidationIssue[];
}

export function isSkillOntologyCategory(value: string): value is SkillOntologyCategory {
  return (SKILL_ONTOLOGY_CATEGORIES as readonly string[]).includes(value);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeArtifactLifecycle(
  inputOntology: {
    readonly requiredArtifacts?: readonly string[];
    readonly artifactLifecycle?: Partial<SkillArtifactLifecycle>;
  },
  outputArtifacts: readonly string[] = [],
  mutationSurfaces: readonly string[] = [],
): SkillArtifactLifecycle {
  const lifecycle = inputOntology.artifactLifecycle;
  return {
    prerequisites: uniqueStrings(
      lifecycle?.prerequisites ?? inputOntology.requiredArtifacts ?? [],
    ),
    optionalInputs: uniqueStrings(lifecycle?.optionalInputs ?? []),
    creates: uniqueStrings(lifecycle?.creates ?? outputArtifacts),
    mutates: uniqueStrings(lifecycle?.mutates ?? mutationSurfaces),
  };
}

export function normalizeSkillIntentMatcher(
  matcher: SkillIntentMatcher,
): SkillIntentMatcher {
  const prerequisites = uniqueStrings(
    matcher.prerequisites ?? matcher.requiredArtifacts ?? [],
  );
  const optionalExistingArtifacts = uniqueStrings(matcher.optionalExistingArtifacts ?? []);
  const createsArtifacts = uniqueStrings(matcher.createsArtifacts ?? []);
  const consumesArtifacts = uniqueStrings(matcher.consumesArtifacts ?? prerequisites);
  return {
    ...matcher,
    prerequisites,
    optionalExistingArtifacts,
    createsArtifacts,
    consumesArtifacts,
    requiredArtifacts: prerequisites,
  };
}

export function normalizeSkillOntologyContract(
  contract: SkillOntologyContract,
): SkillOntologyContract {
  const artifactLifecycle = normalizeArtifactLifecycle(
    contract.inputOntology,
    contract.outputOntology.artifactRefs,
    contract.actionBoundary.mutationSurfaces,
  );
  return {
    ...contract,
    inputOntology: {
      ...contract.inputOntology,
      requiredArtifacts: artifactLifecycle.prerequisites,
      artifactLifecycle,
    },
    intentMatchers: (contract.intentMatchers ?? []).map(normalizeSkillIntentMatcher),
    readSurfaces: contract.readSurfaces ?? [],
    writeSurfaces: contract.writeSurfaces ?? [],
    knownIssueRefs: contract.knownIssueRefs ?? [],
  };
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasPositivePresenterEditClaim(text: string): boolean {
  const normalized = text.toLowerCase();
  if (!normalized.includes("presenter")) return false;
  if (!/(edit|editing|edits|mutate|mutation|write|writes|writer)/.test(normalized)) return false;
  return !/(must not|do not|does not|never|forbidden|cannot|can't|not\s+)/.test(normalized);
}

function hasPositiveStudioSequencerStructureClaim(text: string): boolean {
  const normalized = text.toLowerCase();
  if (!normalized.includes("studio") || !normalized.includes("sequencer")) return false;
  if (!/(own|owns|owner|structure|ordering|generate|generates|author)/.test(normalized)) {
    return false;
  }
  return !/(must not|do not|does not|never|forbidden|cannot|can't|not\s+)/.test(normalized);
}

export function validateSkillOntologyContract(
  contract: SkillOntologyContract,
): SkillOntologyValidationResult {
  const issues: SkillOntologyValidationIssue[] = [];

  if (!hasText(contract.skillId)) {
    issues.push({
      issueId: "skill-ontology.missing-skill-id",
      field: "skillId",
      severity: "fail",
      message: "SkillOntologyContract must declare a stable skillId.",
    });
  }

  if (!hasText(contract.skillPath)) {
    issues.push({
      issueId: "skill-ontology.missing-skill-path",
      field: "skillPath",
      severity: "fail",
      message: "SkillOntologyContract must retain the source SKILL.md path.",
    });
  }

  if (!isSkillOntologyCategory(contract.category)) {
    issues.push({
      issueId: "skill-ontology.invalid-category",
      field: "category",
      severity: "fail",
      message: `Skill category '${contract.category}' is not in the allowed ontology category set.`,
    });
  }

  if (!hasText(contract.userFacingPurpose)) {
    issues.push({
      issueId: "skill-ontology.missing-user-purpose",
      field: "userFacingPurpose",
      severity: "fail",
      message: "Every skill contract needs a plain-language user-facing purpose.",
    });
  }

  if (!hasText(contract.leadFacingPurpose)) {
    issues.push({
      issueId: "skill-ontology.missing-lead-purpose",
      field: "leadFacingPurpose",
      severity: "warn",
      message: "Lead-facing ontology role is recommended so routing can explain the skill boundary.",
    });
  }

  if (contract.nonGoals.length === 0) {
    issues.push({
      issueId: "skill-ontology.missing-non-goals",
      field: "nonGoals",
      severity: "fail",
      message: "Every skill contract must state what the skill must not do.",
    });
  }

  if (
    contract.actionBoundary.mayMutateProjectFiles &&
    !contract.actionBoundary.requiresDtcApproval
  ) {
    issues.push({
      issueId: "skill-ontology.mutation-without-dtc",
      field: "actionBoundary.requiresDtcApproval",
      severity: "fail",
      message: "Mutation-capable skills must require DTC approval.",
    });
  }

  const artifactLifecycle = normalizeArtifactLifecycle(
    contract.inputOntology,
    contract.outputOntology.artifactRefs,
    contract.actionBoundary.mutationSurfaces,
  );
  const semanticText = [
    contract.userFacingPurpose,
    contract.leadFacingPurpose,
    ...contract.intentMatchers.flatMap((matcher) => [
      matcher.matcherId,
      ...matcher.naturalLanguageExamples,
      ...matcher.nouns,
      ...matcher.verbs,
      ...matcher.projectScopeLanes,
      ...(matcher.prerequisites ?? []),
      ...(matcher.optionalExistingArtifacts ?? []),
      ...(matcher.createsArtifacts ?? []),
      ...(matcher.consumesArtifacts ?? []),
      ...(matcher.requiredArtifacts ?? []),
      ...(matcher.negativeExamples ?? []),
    ]),
    ...contract.inputOntology.objectRefs,
    ...contract.inputOntology.requiredArtifacts,
    ...artifactLifecycle.prerequisites,
    ...artifactLifecycle.optionalInputs,
    ...artifactLifecycle.creates,
    ...artifactLifecycle.mutates,
    ...contract.inputOntology.allowedRawInputs,
    ...contract.outputOntology.objectRefs,
    ...contract.outputOntology.artifactRefs,
    ...contract.actionBoundary.mutationSurfaces,
    ...(contract.readSurfaces ?? []),
    ...(contract.writeSurfaces ?? []),
    ...(contract.knownIssueRefs ?? []),
    ...contract.failureModes,
  ].join("\n");

  if (hasPositivePresenterEditClaim(semanticText)) {
    issues.push({
      issueId: "skill-ontology.presenter-edit-claim",
      field: "leadFacingPurpose",
      severity: "fail",
      message: "Skill contracts must not claim that Presenter owns editing or mutation.",
    });
  }

  if (hasPositiveStudioSequencerStructureClaim(semanticText)) {
    issues.push({
      issueId: "skill-ontology.studio-sequencer-structure-claim",
      field: "leadFacingPurpose",
      severity: "fail",
      message: "Skill contracts must not claim that Studio owns Sequencer structure.",
    });
  }

  return {
    valid: !issues.some((issue) => issue.severity === "fail"),
    issues,
  };
}

export function skillContractToRef(contract: SkillOntologyContract): SkillOntologyRef {
  return {
    skillId: contract.skillId,
    skillPath: contract.skillPath,
    displayName: contract.displayName,
    confidence: "exact",
  };
}
