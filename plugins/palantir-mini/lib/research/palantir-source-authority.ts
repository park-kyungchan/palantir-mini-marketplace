import * as fs from "fs";
import * as os from "os";
import * as path from "path";
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
  const normalized = value.replace(/\\/g, "/");
  return normalized.startsWith("~/.claude/research/palantir-") ||
    normalized.startsWith("/home/palantirkc/.claude/research/palantir-") ||
    (path.isAbsolute(value) && normalized.includes("/.claude/research/palantir-"));
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

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function fileExists(value: string): boolean {
  try {
    return fs.statSync(value).isFile();
  } catch {
    return false;
  }
}

function palantirOfficialRoot(localResearchPath: string): string | null {
  const normalized = path.normalize(localResearchPath);
  const suffix = path.join(".claude", "research", "palantir-official");
  const index = normalized.indexOf(suffix);
  if (index < 0) return null;
  return normalized.slice(0, index + suffix.length);
}

function manifestContainsLocalPath(localResearchPath: string, officialRoot: string): boolean | null {
  const manifestPath = path.join(officialRoot, "_manifest.json");
  if (!fs.existsSync(manifestPath)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }

  const docs = Array.isArray((parsed as { docs?: unknown }).docs)
    ? (parsed as { docs: unknown[] }).docs
    : Array.isArray((parsed as { entries?: unknown }).entries)
      ? (parsed as { entries: unknown[] }).entries
      : [];
  const relativePath = path.relative(officialRoot, localResearchPath).split(path.sep).join("/");
  if (relativePath.startsWith("../") || path.isAbsolute(relativePath)) return false;

  return docs.some((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const doc = entry as { path?: unknown; status?: unknown };
    return doc.path === relativePath && (doc.status === undefined || doc.status === "fetched");
  });
}

export function validatePalantirSourceAuthorityRef(
  ref: PalantirSourceAuthorityRef,
  index: number,
): readonly PalantirSourceAuthorityIssue[] {
  const prefix = `palantirSourceAuthorityRefs[${index}]`;
  const issues: PalantirSourceAuthorityIssue[] = [];
  const localPathShapeOk = localPathLooksLikePalantirResearch(ref.localResearchPath);

  if (!localPathShapeOk) {
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

  if (localPathShapeOk) {
    const localResearchPath = expandHome(ref.localResearchPath);
    if (!fileExists(localResearchPath)) {
      issues.push(issue(
        "palantir-authority.local-research-path-not-found",
        `${prefix}.localResearchPath`,
        "Expected the local Palantir research authority file to exist.",
      ));
    } else {
      const officialRoot = palantirOfficialRoot(localResearchPath);
      const manifestContainsPath = officialRoot
        ? manifestContainsLocalPath(localResearchPath, officialRoot)
        : null;
      if (manifestContainsPath === false) {
        issues.push(issue(
          "palantir-authority.local-research-path-not-in-manifest",
          `${prefix}.localResearchPath`,
          "Expected the local Palantir official research path to be listed as fetched in _manifest.json.",
        ));
      }
    }
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
