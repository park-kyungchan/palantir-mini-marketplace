/**
 * palantir-mini v3.13.0+ — project slug derivation (crystalline-resilient-narwhal P-EXTRA)
 * @owner palantirkc-plugin-events
 * @purpose Derive a stable, human-readable slug for a palantir-mini project root.
 *
 * Used by harness sprint contract authoring (pm-quick-sprint skill +
 * harness-base-mode-advisory hook) and substrate lineage queries to
 * disambiguate contractIds across projects.
 *
 * Rules:
 *   1. Read `<projectPath>/package.json#name`. Strip leading `@scope/`.
 *   2. Else fall back to `path.basename(projectPath)`.
 *   3. Sanitize: non-alphanumeric → "-", collapse repeats, lowercase, trim, max 32 chars.
 *   4. Empty result → return "unknown" (sentinel; never silently fail).
 *
 * Pure synchronous; no side effects beyond a single fs.readFileSync.
 *
 * Authority: ~/.claude/plans/crystalline-resilient-narwhal.md §4.3
 */

import * as fs from "fs";
import * as path from "path";

const MAX_SLUG_LEN = 32;
const FALLBACK_SLUG = "unknown";

/**
 * Sanitize an arbitrary string into a slug-shaped value.
 * Lowercase, alphanumeric + dashes, collapsed, trimmed, length-capped.
 */
function sanitizeSlug(raw: string): string {
  if (typeof raw !== "string" || raw.length === 0) return "";
  // Strip leading @scope/ if present (npm scope convention).
  const noScope = raw.replace(/^@[^/]+\//, "");
  // Replace non-alphanumeric runs with single dash.
  const dashed = noScope.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // Trim leading/trailing dashes.
  const trimmed = dashed.replace(/^-+|-+$/g, "");
  // Cap length.
  return trimmed.slice(0, MAX_SLUG_LEN);
}

/**
 * Read package.json#name from a project root, returning null on missing or malformed.
 */
function readPackageName(projectPath: string): string | null {
  const pkgPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    const obj = JSON.parse(raw) as { name?: unknown };
    if (typeof obj.name === "string" && obj.name.length > 0) {
      return obj.name;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Derive a stable project slug from an absolute project path.
 *
 * Examples:
 *   /home/palantirkc                           → "monorepo-root" (from @palantirkc/monorepo-root)
 *   /home/palantirkc/projects/palantir-math    → "palantir-math"
 *   /home/palantirkc/projects/mathcrew         → "mathcrew"
 *   /home/palantirkc/projects/kosmos           → "kosmos"
 *   /tmp/no-package-json                       → "no-package-json" (basename fallback)
 *   ""                                         → "unknown"
 */
export function deriveProjectSlug(projectPath: string): string {
  if (typeof projectPath !== "string" || projectPath.length === 0) {
    return FALLBACK_SLUG;
  }

  // Try package.json#name first (authoritative for the project).
  const pkgName = readPackageName(projectPath);
  if (pkgName !== null) {
    const slug = sanitizeSlug(pkgName);
    if (slug.length > 0) return slug;
  }

  // Fall back to path basename.
  const base = path.basename(path.resolve(projectPath));
  const slug = sanitizeSlug(base);
  if (slug.length > 0) return slug;

  return FALLBACK_SLUG;
}

/**
 * Compose a slug-prefixed contractId from slug + sprintNumber + optional mode suffix.
 *
 *   composeSlugContractId("palantirkc", 19, "quick")   → "palantirkc-sprint-019-quick"
 *   composeSlugContractId("palantir-math", 18, null)   → "palantir-math-sprint-018"
 *   composeSlugContractId("palantir-math", 18, "default") → "palantir-math-sprint-018-default"
 *
 * Pads sprint number to 3 digits to match existing dir-name convention.
 */
export function composeSlugContractId(
  slug: string,
  sprintNumber: number,
  modeSuffix?: string | null,
): string {
  const cleanSlug = slug && slug.length > 0 ? slug : FALLBACK_SLUG;
  const padded = String(sprintNumber).padStart(3, "0");
  const suffix = modeSuffix && modeSuffix.length > 0 ? `-${modeSuffix}` : "";
  return `${cleanSlug}-sprint-${padded}${suffix}`;
}

/**
 * Detect whether a contractId already carries a slug prefix.
 * Heuristic: contractIds shaped `<anything>-sprint-NNN[-suffix]` where the prefix
 * is non-empty are slug-prefixed; the bare `sprint-NNN[-suffix]` shape is legacy.
 *
 *   isSlugPrefixedContractId("sprint-018")              → false (legacy)
 *   isSlugPrefixedContractId("sprint-018-quick")        → false (legacy)
 *   isSlugPrefixedContractId("palantir-math-sprint-018")→ true
 *   isSlugPrefixedContractId("palantirkc-sprint-019-quick") → true
 */
export function isSlugPrefixedContractId(contractId: string): boolean {
  if (typeof contractId !== "string" || contractId.length === 0) return false;
  // Look for `-sprint-NNN` somewhere with a non-empty prefix before it.
  const match = /^([a-z0-9-]+)-sprint-\d{3}(-[a-z0-9-]+)?$/i.exec(contractId);
  if (!match) return false;
  const prefix = match[1] ?? "";
  // The prefix must not itself BE just "sprint" (legacy shape).
  return prefix.length > 0 && prefix !== "sprint";
}
