import * as fs from "fs";
import * as path from "path";
import { parseSkillOntologyContractResult } from "../../../lib/skills/skill-ontology-parser";
import type { PmPluginSelfCheckResult } from "./types";

type ProjectSkillOntologyResult = PmPluginSelfCheckResult["projectSkillOntologyResult"];

function relativeSkillPath(projectRoot: string, skillPath: string): string {
  const relative = path.relative(projectRoot, skillPath);
  return relative.startsWith("..") ? skillPath : relative;
}

function listProjectSkillFiles(projectRoot: string): string[] {
  const skillsDir = path.join(projectRoot, ".claude", "skills");
  if (!fs.existsSync(skillsDir)) return [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(skillsDir, entry.name, "SKILL.md"))
    .filter((skillPath) => fs.existsSync(skillPath))
    .sort((left, right) => left.localeCompare(right));
}

function isNegativeLine(lower: string): boolean {
  return /(must not|do not|does not|never|forbidden|cannot|can't|not\s+)/.test(lower);
}

function lineMatches(
  markdown: string,
  projectRoot: string,
  skillPath: string,
  predicate: (lowerLine: string) => boolean,
  opts: { readonly skipNegativeSections?: boolean } = {},
): string[] {
  const matches: string[] = [];
  let inNegativeSection = false;
  markdown.split(/\r?\n/).forEach((line, index) => {
    const heading = /^#{2,3}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const title = (heading[1] ?? "").toLowerCase();
      inNegativeSection = /(must not|do not|non-goal|non goal)/.test(title);
    }
    const lower = line.toLowerCase();
    if (opts.skipNegativeSections && inNegativeSection) return;
    if (!predicate(lower)) return;
    matches.push(`${relativeSkillPath(projectRoot, skillPath)}:${index + 1}: ${line.trim()}`);
  });
  return matches;
}

function staleSemanticSources(
  markdown: string,
  projectRoot: string,
  skillPath: string,
): string[] {
  return lineMatches(markdown, projectRoot, skillPath, (lower) =>
    lower.includes("teaching-config.json") ||
    lower.includes("aip agent studio") ||
    lower.includes("agent studio")
  );
}

function presenterEditViolations(
  markdown: string,
  projectRoot: string,
  skillPath: string,
): string[] {
  return lineMatches(
    markdown,
    projectRoot,
    skillPath,
    (lower) =>
      lower.includes("presenter") &&
      /(edit|editing|edits|mutate|mutation|write|writes|writer)/.test(lower) &&
      !isNegativeLine(lower),
    { skipNegativeSections: true },
  );
}

function studioStructureViolations(
  markdown: string,
  projectRoot: string,
  skillPath: string,
): string[] {
  return lineMatches(
    markdown,
    projectRoot,
    skillPath,
    (lower) =>
      lower.includes("studio") &&
      lower.includes("sequencer") &&
      /(own|owns|owner|structure|ordering|generate|generates|author)/.test(lower) &&
      !isNegativeLine(lower),
    { skipNegativeSections: true },
  );
}

export function checkProjectSkillOntology(projectRoot: string): ProjectSkillOntologyResult {
  const skillsDir = path.join(projectRoot, ".claude", "skills");
  if (!fs.existsSync(skillsDir)) {
    return {
      status: "skipped",
      details: `No project .claude/skills directory found at ${skillsDir}.`,
      projectRoot,
      skillCount: 0,
      contractsFound: 0,
      missingOntologyFrontmatter: [],
      staleSemanticSources: [],
      unsafeMutationSkills: [],
      presenterEditViolations: [],
      studioStructureViolations: [],
      contractIssues: [],
    };
  }

  const skillFiles = listProjectSkillFiles(projectRoot);
  const missingOntologyFrontmatter: string[] = [];
  const staleSources: string[] = [];
  const unsafeMutationSkills: string[] = [];
  const presenterViolations: string[] = [];
  const studioViolations: string[] = [];
  const contractIssues: ProjectSkillOntologyResult["contractIssues"] = [];
  let contractsFound = 0;

  for (const skillPath of skillFiles) {
    const markdown = fs.readFileSync(skillPath, "utf8");
    const parsed = parseSkillOntologyContractResult(markdown, skillPath);
    const relative = relativeSkillPath(projectRoot, skillPath);

    if (parsed.source.hasOntologySkillFrontmatter) contractsFound += 1;
    else missingOntologyFrontmatter.push(relative);

    if (
      parsed.contract.actionBoundary.mayMutateProjectFiles &&
      !parsed.contract.actionBoundary.requiresDtcApproval
    ) {
      unsafeMutationSkills.push(relative);
    }

    staleSources.push(...staleSemanticSources(markdown, projectRoot, skillPath));
    presenterViolations.push(...presenterEditViolations(markdown, projectRoot, skillPath));
    studioViolations.push(...studioStructureViolations(markdown, projectRoot, skillPath));
    contractIssues.push(...parsed.issues.map((issue) => ({
      skillPath: relative,
      issueId: issue.issueId,
      field: issue.field,
      severity: issue.severity,
      message: issue.message,
    })));
  }

  const hasBlockingContractIssues = contractIssues.some((issue) => issue.severity === "fail");
  const status =
    skillFiles.length > 0 &&
    !hasBlockingContractIssues &&
    staleSources.length === 0 &&
    unsafeMutationSkills.length === 0 &&
    presenterViolations.length === 0 &&
    studioViolations.length === 0
      ? "pass"
      : "fail";

  return {
    status,
    details:
      status === "pass"
        ? `Project skill ontology contracts found for ${contractsFound}/${skillFiles.length} skills.`
        : `Project skill ontology check found ${contractIssues.length} contract issue(s), ${staleSources.length} stale source line(s), ${unsafeMutationSkills.length} unsafe mutation skill(s), ${presenterViolations.length} Presenter edit violation(s), and ${studioViolations.length} Studio/Sequencer ownership violation(s).`,
    projectRoot,
    skillCount: skillFiles.length,
    contractsFound,
    missingOntologyFrontmatter,
    staleSemanticSources: staleSources,
    unsafeMutationSkills,
    presenterEditViolations: presenterViolations,
    studioStructureViolations: studioViolations,
    contractIssues,
  };
}
