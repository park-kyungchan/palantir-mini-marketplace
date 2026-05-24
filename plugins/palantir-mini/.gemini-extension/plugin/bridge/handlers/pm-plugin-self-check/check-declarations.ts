// palantir-mini v3.3.0 — pm-plugin-self-check declared-agents + declared-skills checks (B.3)
// Extracted from pm-plugin-self-check.ts. Filesystem walk only — primitive cross-check
// lives in check-primitive-seeds.ts (advisory).

import * as fs from "fs";
import * as path from "path";
import { PLUGIN_ROOT } from "./types";
import type { PmPluginSelfCheckResult } from "./types";

export function checkDeclaredAgents(): PmPluginSelfCheckResult["declaredAgentsResult"] {
  try {
    const agentsDir = path.join(PLUGIN_ROOT, "agents");
    if (!fs.existsSync(agentsDir)) {
      return { status: "fail", total: 0, missing: [] };
    }
    // Walk agents/ for .md files (excluding hidden files like .disabled/)
    const files = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("."));

    const total = files.length;
    const missingOntologyAgent = files.flatMap((file) => {
      const source = fs.readFileSync(path.join(agentsDir, file), "utf8");
      if (!source.includes("## Ontology Context Bootstrap")) return [];
      const frontmatterEnd = source.startsWith("---\n") ? source.indexOf("\n---", 4) : -1;
      const frontmatter = frontmatterEnd >= 0 ? source.slice(4, frontmatterEnd) : "";
      const hasOntologyAgent = /^ontologyAgent:\s*$/m.test(frontmatter) ||
        /^ontologyAgent:\s*\{.*\}\s*$/m.test(frontmatter);
      const requiresDtc = /^requiresDtcForMutation:\s*true\s*$/m.test(frontmatter);
      return hasOntologyAgent && requiresDtc
        ? []
        : [`${file} missing ontologyAgent or requiresDtcForMutation frontmatter`];
    });
    const isPass = total > 0 && missingOntologyAgent.length === 0;
    return {
      status: isPass ? "pass" : "fail",
      total,
      missing: missingOntologyAgent,
    };
  } catch (err) {
    return {
      status: "fail",
      total: 0,
      missing: [`error reading agents/: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

const SKILL_CATEGORY_RE = /^category:\s*(\S+)\s*$/m;

export function checkDeclaredSkills(): PmPluginSelfCheckResult["declaredSkillsResult"] {
  try {
    const skillsDir = path.join(PLUGIN_ROOT, "skills");
    if (!fs.existsSync(skillsDir)) {
      return { status: "fail", total: 0, missing: [], missingCategory: [] };
    }
    // A skill is a subdirectory containing a SKILL.md file.
    // Skip _shared/ (reference material, not a skill by design).
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skillDirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."),
    );

    const withSkillMd: string[] = [];
    const withoutSkillMd: string[] = [];
    const missingCategory: string[] = [];
    for (const dir of skillDirs) {
      const skillMdPath = path.join(skillsDir, dir.name, "SKILL.md");
      if (fs.existsSync(skillMdPath)) {
        withSkillMd.push(dir.name);
        const source = fs.readFileSync(skillMdPath, "utf8");
        if (!SKILL_CATEGORY_RE.test(source)) {
          missingCategory.push(
            `Skill '${dir.name}' missing required category frontmatter; see plan §W1.C`,
          );
        }
      } else {
        withoutSkillMd.push(dir.name);
      }
    }

    const total = withSkillMd.length;
    const isPass = total > 0 && missingCategory.length === 0 && withoutSkillMd.length === 0;
    return {
      status: isPass ? "pass" : "fail",
      total,
      missing: withoutSkillMd,
      missingCategory,
    };
  } catch (err) {
    return {
      status: "fail",
      total: 0,
      missing: [`error reading skills/: ${err instanceof Error ? err.message : String(err)}`],
      missingCategory: [],
    };
  }
}
