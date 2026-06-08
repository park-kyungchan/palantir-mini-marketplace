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

/**
 * Injectable policy literals. Defaults preserve the historical hardcoded behavior
 * exactly; callers may override any subset and absent fields fall back to defaults.
 */
export interface PalantirSourceAuthorityConfig {
  /** AIP/FDE surface refs that require at least one Palantir source authority ref. */
  readonly surfacesRequiringAuthority: readonly string[];
  /** Path prefixes accepted as local Palantir research authority paths. */
  readonly localResearchPathPrefixes: readonly string[];
  /** Substring marker for absolute local Palantir research authority paths. */
  readonly localResearchPathMarker: string;
  /** Required protocol for the official external URL (e.g. "https:"). */
  readonly officialUrlProtocol: string;
  /** Required hostname for the official external URL. */
  readonly officialUrlHostname: string;
  /** Path segments composing the palantir-official research root suffix. */
  readonly officialRootSuffixSegments: readonly string[];
  /** Manifest filename consulted under the official research root. */
  readonly manifestFilename: string;
}

export const DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG: PalantirSourceAuthorityConfig = {
  surfacesRequiringAuthority: [
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
  ],
  localResearchPathPrefixes: [
    "~/.claude/research/palantir-",
    "/home/palantirkc/.claude/research/palantir-",
  ],
  localResearchPathMarker: "/.claude/research/palantir-",
  officialUrlProtocol: "https:",
  officialUrlHostname: "www.palantir.com",
  officialRootSuffixSegments: [".claude", "research", "palantir-official"],
  manifestFilename: "_manifest.json",
};

function resolveConfig(
  config?: Partial<PalantirSourceAuthorityConfig>,
): PalantirSourceAuthorityConfig {
  if (!config) return DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG;
  return {
    surfacesRequiringAuthority:
      config.surfacesRequiringAuthority ??
      DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.surfacesRequiringAuthority,
    localResearchPathPrefixes:
      config.localResearchPathPrefixes ??
      DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.localResearchPathPrefixes,
    localResearchPathMarker:
      config.localResearchPathMarker ??
      DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.localResearchPathMarker,
    officialUrlProtocol:
      config.officialUrlProtocol ?? DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.officialUrlProtocol,
    officialUrlHostname:
      config.officialUrlHostname ?? DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.officialUrlHostname,
    officialRootSuffixSegments:
      config.officialRootSuffixSegments ??
      DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.officialRootSuffixSegments,
    manifestFilename:
      config.manifestFilename ?? DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG.manifestFilename,
  };
}

function issue(issueId: string, field: string, message: string): PalantirSourceAuthorityIssue {
  return { issueId, field, message };
}

function localPathLooksLikePalantirResearch(
  value: string,
  cfg: PalantirSourceAuthorityConfig,
): boolean {
  const normalized = value.replace(/\\/g, "/");
  return cfg.localResearchPathPrefixes.some((prefix) => normalized.startsWith(prefix)) ||
    (path.isAbsolute(value) && normalized.includes(cfg.localResearchPathMarker));
}

function externalUrlLooksOfficial(
  value: string,
  cfg: PalantirSourceAuthorityConfig,
): boolean {
  try {
    const url = new URL(value);
    return url.protocol === cfg.officialUrlProtocol && url.hostname === cfg.officialUrlHostname;
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

function palantirOfficialRoot(
  localResearchPath: string,
  cfg: PalantirSourceAuthorityConfig,
): string | null {
  const normalized = path.normalize(localResearchPath);
  const suffix = path.join(...cfg.officialRootSuffixSegments);
  const index = normalized.indexOf(suffix);
  if (index < 0) return null;
  return normalized.slice(0, index + suffix.length);
}

function manifestContainsLocalPath(
  localResearchPath: string,
  officialRoot: string,
  cfg: PalantirSourceAuthorityConfig,
): boolean | null {
  const manifestPath = path.join(officialRoot, cfg.manifestFilename);
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
  config?: Partial<PalantirSourceAuthorityConfig>,
): readonly PalantirSourceAuthorityIssue[] {
  const cfg = resolveConfig(config);
  const prefix = `palantirSourceAuthorityRefs[${index}]`;
  const issues: PalantirSourceAuthorityIssue[] = [];
  const localPathShapeOk = localPathLooksLikePalantirResearch(ref.localResearchPath, cfg);

  if (!localPathShapeOk) {
    issues.push(issue(
      "palantir-authority.invalid-local-research-path",
      `${prefix}.localResearchPath`,
      "Expected a local ~/.claude/research/palantir-* authority path.",
    ));
  }
  if (!externalUrlLooksOfficial(ref.externalUrl, cfg)) {
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
      const officialRoot = palantirOfficialRoot(localResearchPath, cfg);
      const manifestContainsPath = officialRoot
        ? manifestContainsLocalPath(localResearchPath, officialRoot, cfg)
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
  config?: Partial<PalantirSourceAuthorityConfig>,
): PalantirSourceAuthorityValidationResult {
  const cfg = resolveConfig(config);
  const requiredSet = new Set(cfg.surfacesRequiringAuthority);
  const required = surface.aipSurfaceRefs.some((ref) => requiredSet.has(ref));
  if (!required) {
    return { status: "not-required", checkedRefCount: 0, issues: [] };
  }

  const issues = surface.palantirSourceAuthorityRefs.flatMap((ref, index) =>
    validatePalantirSourceAuthorityRef(ref, index, config),
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
