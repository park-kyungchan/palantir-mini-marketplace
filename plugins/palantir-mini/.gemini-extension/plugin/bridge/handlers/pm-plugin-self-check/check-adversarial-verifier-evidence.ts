import {
  artifactExists,
  classifyReleaseChangedSurfaces,
  collectChangedFiles,
  eventType,
  payloadObject,
  readJsonArtifacts,
  readProjectEvents,
  stringValues,
  uniqueSorted,
  type ReleaseChangedSurface,
} from "../../../lib/harness/release-evidence";
import type { PmPluginSelfCheckResult } from "./types";

type AdversarialVerifierEvidenceResult =
  PmPluginSelfCheckResult["adversarialVerifierEvidenceResult"];
type RequiredCategory = "governance" | "security" | "runtime";

interface AdversarialEvidence {
  readonly sourceRef: string;
  readonly categories: readonly string[];
  readonly passed: boolean;
}

const ADVERSARIAL_ARTIFACT_DIRS = [
  ".palantir-mini/session/adversarial-verifier",
  ".palantir-mini/session/artifacts/adversarial-verifier",
  ".palantir-mini/harness/adversarial-verifier",
] as const;

function stringField(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function requiredCategoryFor(surface: ReleaseChangedSurface): RequiredCategory[] {
  switch (surface) {
    case "governance":
    case "router":
    case "contract":
    case "prompt":
    case "dtc":
      return ["governance"];
    case "security":
      return ["security"];
    case "runtime":
    case "harness":
    case "agent":
      return ["runtime"];
  }
}

function passedFrom(data: Record<string, unknown>): boolean {
  if (data.passed === true) return true;
  const verdict = stringField(data, "verdict") ?? stringField(data, "status");
  return verdict !== undefined && ["pass", "passed", "success", "succeeded"].includes(verdict.toLowerCase());
}

function evidenceRefs(data: Record<string, unknown>): string[] {
  return [
    ...stringValues(data.evidenceRefs),
    ...stringValues(data.sourceRefs),
    ...stringValues(data.artifactRefs),
    ...(stringField(data, "artifactPath") ? [stringField(data, "artifactPath")!] : []),
  ];
}

function categoriesFrom(data: Record<string, unknown>): string[] {
  return uniqueSorted([
    ...stringValues(data.categories),
    ...stringValues(data.scopes),
    ...stringValues(data.surfaces),
    ...(stringField(data, "category") ? [stringField(data, "category")!] : []),
    ...(stringField(data, "scope") ? [stringField(data, "scope")!] : []),
    ...(stringField(data, "surface") ? [stringField(data, "surface")!] : []),
  ].map((item) => item.toLowerCase()));
}

function isAdversarial(data: Record<string, unknown>, explicitType: boolean): boolean {
  const role = `${stringField(data, "verifierRole") ?? ""} ${stringField(data, "role") ?? ""}`.toLowerCase();
  return explicitType || role.includes("adversarial") || role.includes("verifier-adversarial");
}

function evidence(
  sourceRef: string,
  categories: readonly string[],
  passed: boolean,
): AdversarialEvidence {
  return { sourceRef, categories, passed };
}

function eventEvidence(project: string): AdversarialEvidence[] {
  return readProjectEvents(project).flatMap((event) => {
    const data = payloadObject(event);
    const type = eventType(event);
    const explicitType = [
      "adversarial_verifier_completed",
      "verifier_adversarial_evidence_recorded",
      "release_adversarial_verification_completed",
    ].includes(type) || stringField(data, "errorClass") === "adversarial_verifier_evidence";
    if (!isAdversarial(data, explicitType)) return [];
    const refs = evidenceRefs(data);
    const artifactPath = stringField(data, "artifactPath");
    if (artifactPath && !artifactExists(project, artifactPath)) return [];
    if (refs.length === 0) return [];
    return [evidence(refs[0]!, categoriesFrom(data), passedFrom(data))];
  });
}

function fileEvidence(project: string): AdversarialEvidence[] {
  return readJsonArtifacts(project, ADVERSARIAL_ARTIFACT_DIRS).flatMap((artifact) => {
    if (!isAdversarial(artifact.data, true)) return [];
    const refs = uniqueSorted([...evidenceRefs(artifact.data), artifact.sourcePath]);
    if (refs.length === 0) return [];
    return [evidence(artifact.sourcePath, categoriesFrom(artifact.data), passedFrom(artifact.data))];
  });
}

function coversCategory(evidenceItem: AdversarialEvidence, category: string): boolean {
  const categories = evidenceItem.categories.map((item) => item.toLowerCase());
  return evidenceItem.passed && (
    categories.includes(category) ||
    categories.includes("release") ||
    categories.includes("all") ||
    categories.includes("governance/security/runtime")
  );
}

export function checkAdversarialVerifierEvidence(
  project: string,
  changedFiles = collectChangedFiles(project),
): AdversarialVerifierEvidenceResult {
  const changedSurfaces = classifyReleaseChangedSurfaces(changedFiles);
  const requiredCategories = uniqueSorted(
    changedSurfaces.flatMap((surface) => requiredCategoryFor(surface.surface)),
  ) as RequiredCategory[];
  const evidenceItems = [...eventEvidence(project), ...fileEvidence(project)];
  const missingCategories = requiredCategories.filter((category) =>
    !evidenceItems.some((item) => coversCategory(item, category))
  );
  const status: AdversarialVerifierEvidenceResult["status"] =
    missingCategories.length > 0 ? "fail" : "pass";

  return {
    status,
    details: requiredCategories.length === 0
      ? "No governance/security/runtime release slice requires adversarial verifier evidence."
      : `Required adversarial categories=${requiredCategories.join(",")}; evidence=${evidenceItems.length}; missing=${missingCategories.length}.`,
    requiredCategories,
    evidenceCount: evidenceItems.length,
    evidenceRefs: uniqueSorted(evidenceItems.map((item) => item.sourceRef)),
    missingCategories,
  };
}

