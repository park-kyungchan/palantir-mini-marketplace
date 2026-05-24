// palantir-mini v3.3.0 — pm-plugin-self-check primitive seed advisory cross-check (B.3)
// Extracted from pm-plugin-self-check.ts. ADVISORY-ONLY — does NOT affect overallStatus.

import * as fs from "fs";
import * as path from "path";
import { AGENT_DEFINITION_REGISTRY } from "#schemas/ontology/primitives/agent-definition";
import { SKILL_DEFINITION_REGISTRY } from "#schemas/ontology/primitives/skill-definition";
// Side-effect imports — populate the registries at module load.
import "#schemas/ontology/seeds/agent-definitions";
import "#schemas/ontology/seeds/skill-definitions";
import { PLUGIN_ROOT } from "./types";
import type { PmPluginSelfCheckResult } from "./types";

const RETIRED_SKILL_SEEDS = new Set([
  // Deleted with semantic_change_plan removal; schema seed promotion is external.
  "pm-change-plan",
]);

/**
 * Cross-check filesystem walk vs primitive seed registry. ADVISORY-ONLY this
 * version — does not affect overallStatus. Filesystem stays authoritative.
 */
export function checkPrimitiveSeedAdvisories(): PmPluginSelfCheckResult["primitiveSeedAdvisories"] {
  const advisories: PmPluginSelfCheckResult["primitiveSeedAdvisories"] = {
    agents: { filesystemOnly: [], seedOnly: [] },
    skills: { filesystemOnly: [], seedOnly: [] },
  };

  // Plugin agents — walk disk vs query registry by scope=plugin
  try {
    const agentsDir = path.join(PLUGIN_ROOT, "agents");
    if (fs.existsSync(agentsDir)) {
      const fsSlugs = new Set(
        fs
          .readdirSync(agentsDir)
          .filter((f) => f.endsWith(".md") && !f.startsWith("."))
          .map((f) => f.replace(/\.md$/, "")),
      );
      const seedSlugs = new Set(
        AGENT_DEFINITION_REGISTRY.findByScope("plugin").map((a) => a.slug),
      );
      for (const s of fsSlugs) if (!seedSlugs.has(s)) advisories.agents.filesystemOnly.push(s);
      for (const s of seedSlugs) if (!fsSlugs.has(s)) advisories.agents.seedOnly.push(s);
    }
  } catch {
    // best-effort — advisory swallows errors
  }

  // Plugin skills — walk disk vs query registry by scope=plugin
  try {
    const skillsDir = path.join(PLUGIN_ROOT, "skills");
    if (fs.existsSync(skillsDir)) {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      const fsSlugs = new Set(
        entries
          .filter(
            (e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."),
          )
          .map((e) => e.name)
          .filter((name) =>
            fs.existsSync(path.join(skillsDir, name, "SKILL.md")),
          ),
      );
      const seedSlugs = new Set(
        SKILL_DEFINITION_REGISTRY.findByScope("plugin")
          .map((s) => s.slug)
          .filter((slug) => !RETIRED_SKILL_SEEDS.has(slug)),
      );
      for (const s of fsSlugs) if (!seedSlugs.has(s)) advisories.skills.filesystemOnly.push(s);
      for (const s of seedSlugs) if (!fsSlugs.has(s)) advisories.skills.seedOnly.push(s);
    }
  } catch {
    // best-effort — advisory swallows errors
  }

  // Stable sort for deterministic output
  advisories.agents.filesystemOnly.sort();
  advisories.agents.seedOnly.sort();
  advisories.skills.filesystemOnly.sort();
  advisories.skills.seedOnly.sort();

  return advisories;
}
