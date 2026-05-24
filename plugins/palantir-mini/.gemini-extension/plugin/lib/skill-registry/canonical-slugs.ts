/**
 * palantir-mini v1.36 / sprint-027 / W2.4 — Canonical skill slug registry.
 *
 * Derived dynamically from `${CLAUDE_PLUGIN_ROOT}/skills/` filesystem at module
 * load time. Used by `scripts/log.ts:emit()` to validate
 * `SkillStartedEnvelope.payload.skillName` against the canonical 47-slug set.
 *
 * Closes Agent #3 audit gap "free-text skill_started names ~18% of invocations
 * bypass canonical slug matching" (e.g. `cold-start-pending-task-audit`,
 * `report-claude-recent-work`, `pm-investigate schema lecture-recap retirement`).
 *
 * Mode: ADVISORY only — emit() never throws on free-text. Instead, emits a
 * `skill_invocation_suggested` envelope identifying the free-text name and
 * suggesting the closest canonical match (prefix-based, conservative).
 */

import * as fs from "fs";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../config/root";

/**
 * Loads canonical skill slugs from the plugin's skills/ directory.
 * Returns empty set on filesystem error (silent — never throws).
 */
function loadCanonicalSlugs(): Set<string> {
  const result = new Set<string>();
  const pluginRoot = resolvePalantirMiniRoot();
  const skillsDir = path.join(pluginRoot, "skills");
  try {
    if (!fs.existsSync(skillsDir)) return result;
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      // Skip private/utility directories (start with _)
      if (ent.name.startsWith("_")) continue;
      // Verify SKILL.md exists; only then count as canonical
      if (fs.existsSync(path.join(skillsDir, ent.name, "SKILL.md"))) {
        result.add(ent.name);
      }
    }
  } catch {
    // silent
  }
  return result;
}

/** Cached lazy singleton — first access reads filesystem, subsequent reads are O(1). */
let cachedSlugs: Set<string> | null = null;

/** Returns the canonical skill slug set. */
export function canonicalSkillSlugs(): Set<string> {
  if (cachedSlugs === null) {
    cachedSlugs = loadCanonicalSlugs();
  }
  return cachedSlugs;
}

/** Returns true when `slug` is a canonical SKILL.md directory name. */
export function isCanonicalSkillSlug(slug: string): boolean {
  return canonicalSkillSlugs().has(slug);
}

/**
 * Conservative prefix-match — tries to find a canonical slug whose name is a
 * prefix of `freeText`. Returns null when no match (caller should leave the
 * free-text as-is and emit only an advisory event).
 *
 * Examples:
 *   "pm-investigate schema lecture-recap retirement" → "pm-investigate"
 *   "pm-ship-active-runtime-dependency-slice"        → "pm-ship"
 *   "report-claude-recent-work"                      → null (no canonical prefix)
 */
export function inferCanonicalSlug(freeText: string): string | null {
  const slugs = canonicalSkillSlugs();
  let best: string | null = null;
  for (const slug of slugs) {
    if (freeText === slug || freeText.startsWith(`${slug}-`) || freeText.startsWith(`${slug} `)) {
      // Pick the longest match (more specific); avoids "pm" matching everything
      if (best === null || slug.length > best.length) {
        best = slug;
      }
    }
  }
  return best;
}
