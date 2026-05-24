import {
  isPalantirSourceClass,
  type AipFdeLocalSurfaceContract,
  type PalantirSourceAuthorityRef,
} from "../../core/contracts/aip-fde-local-surface";

export interface PalantirSourceAuthorityIssue {
  readonly issueId: string;
  readonly field: string;
  readonly message: string;
}

export interface PalantirSourceAuthorityValidationResult {
  readonly status: "pass" | "fail" | "not-required";
  readonly checkedRefCount: number;
  readonly issues: readonly PalantirSourceAuthorityIssue[];
}

const AIP_SURFACES_REQUIRING_AUTHORITY = new Set([
  "application-state-variables",
  "retrieval-context",
  "tools-action",
  "tools-object-query",
  "tools-function",
  "tools-update-application-variable",
  "tools-command",
  "tools-request-clarification",
  "chatbots-as-functions",
  "evals-observability",
  "security-governance",
]);

function issue(issueId: string, field: string, message: string): PalantirSourceAuthorityIssue {
  return { issueId, field, message };
}

function localPathLooksLikePalantirResearch(value: string): boolean {
  return value.startsWith("~/.claude/research/palantir-") ||
    value.startsWith("/home/palantirkc/.claude/research/palantir-");
}

function externalUrlLooksOfficial(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.palantir.com";
  } catch {
    return false;
  }
}

function hasIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

export function validatePalantirSourceAuthorityRef(
  ref: PalantirSourceAuthorityRef,
  index: number,
): readonly PalantirSourceAuthorityIssue[] {
  const prefix = `palantirSourceAuthorityRefs[${index}]`;
  const issues: PalantirSourceAuthorityIssue[] = [];

  if (!localPathLooksLikePalantirResearch(ref.localResearchPath)) {
    issues.push(issue(
      "palantir-authority.invalid-local-research-path",
      `${prefix}.localResearchPath`,
      "Expected a local ~/.claude/research/palantir-* authority path.",
    ));
  }
  if (!externalUrlLooksOfficial(ref.externalUrl)) {
    issues.push(issue(
      "palantir-authority.invalid-external-url",
      `${prefix}.externalUrl`,
      "Expected an official https://www.palantir.com URL.",
    ));
  }
  if (!hasIsoDate(ref.lastVerified)) {
    issues.push(issue(
      "palantir-authority.invalid-last-verified",
      `${prefix}.lastVerified`,
      "Expected lastVerified in YYYY-MM-DD format.",
    ));
  }
  if (!isPalantirSourceClass(ref.sourceClass)) {
    issues.push(issue(
      "palantir-authority.invalid-source-class",
      `${prefix}.sourceClass`,
      "Expected a known Palantir source class.",
    ));
  }

  return issues;
}

export function validatePalantirSourceAuthority(
  surface: AipFdeLocalSurfaceContract,
): PalantirSourceAuthorityValidationResult {
  const required = surface.aipSurfaceRefs.some((ref) => AIP_SURFACES_REQUIRING_AUTHORITY.has(ref));
  if (!required) {
    return { status: "not-required", checkedRefCount: 0, issues: [] };
  }

  const issues = surface.palantirSourceAuthorityRefs.flatMap((ref, index) =>
    validatePalantirSourceAuthorityRef(ref, index),
  );

  if (surface.palantirSourceAuthorityRefs.length === 0) {
    issues.push(issue(
      "palantir-authority.missing-refs",
      "palantirSourceAuthorityRefs",
      "AIP/FDE surface claims require at least one local research path and official Palantir URL.",
    ));
  }

  return {
    status: issues.length > 0 ? "fail" : "pass",
    checkedRefCount: surface.palantirSourceAuthorityRefs.length,
    issues,
  };
}
