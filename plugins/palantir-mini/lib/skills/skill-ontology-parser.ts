import * as path from "path";
import {
  SKILL_ONTOLOGY_SCHEMA_VERSION,
  isSkillOntologyCategory,
  normalizeSkillOntologyContract,
  validateSkillOntologyContract,
  type SkillOntologyCategory,
  type SkillOntologyContract,
  type SkillIntentMatcher,
  type SkillOntologyValidationIssue,
} from "./skill-ontology-contract";

type FrontmatterValue = string | boolean | readonly string[];
type FrontmatterRecord = Record<string, FrontmatterValue>;

export interface SkillOntologyParseSource {
  readonly hasFrontmatter: boolean;
  readonly hasOntologySkillFrontmatter: boolean;
  readonly sourceVersion?: string;
  readonly explicitMutationBoundary: boolean;
  readonly explicitDtcApproval: boolean;
}

export interface SkillOntologyContractParseResult {
  readonly contract: SkillOntologyContract;
  readonly source: SkillOntologyParseSource;
  readonly issues: readonly SkillOntologyValidationIssue[];
}

interface ParsedFrontmatter {
  readonly top: FrontmatterRecord;
  readonly ontologySkill: FrontmatterRecord;
  readonly hasFrontmatter: boolean;
  readonly body: string;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineValue(value: string): FrontmatterValue | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inside = trimmed.slice(1, -1).trim();
    if (inside.length === 0) return [];
    return inside.split(",").map((item) => stripQuotes(item)).filter(Boolean);
  }
  return stripQuotes(trimmed);
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return {
      top: {},
      ontologySkill: {},
      hasFrontmatter: false,
      body: markdown,
    };
  }

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) {
    return {
      top: {},
      ontologySkill: {},
      hasFrontmatter: false,
      body: markdown,
    };
  }

  const block = normalized.slice(4, end);
  const body = normalized.slice(end + "\n---".length).replace(/^\n/, "");
  const top: Record<string, FrontmatterValue> = {};
  const ontologySkill: Record<string, FrontmatterValue> = {};
  let inOntologySkill = false;
  let currentArrayKey: string | null = null;

  for (const line of block.split("\n")) {
    if (line.trim().length === 0) continue;

    const listItem = /^\s*-\s+(.+)$/.exec(line);
    if (currentArrayKey !== null && listItem) {
      const existing = ontologySkill[currentArrayKey];
      const next = stripQuotes(listItem[1] ?? "");
      ontologySkill[currentArrayKey] = Array.isArray(existing)
        ? [...existing, next]
        : [next];
      continue;
    }

    const topMatch = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (topMatch) {
      const key = topMatch[1] ?? "";
      const rawValue = topMatch[2] ?? "";
      inOntologySkill = key === "ontologySkill";
      currentArrayKey = null;
      if (!inOntologySkill) {
        const parsed = parseInlineValue(rawValue);
        if (parsed !== undefined) top[key] = parsed;
      }
      continue;
    }

    if (!inOntologySkill) continue;

    const nestedMatch = /^\s+([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!nestedMatch) continue;
    const key = nestedMatch[1] ?? "";
    const rawValue = nestedMatch[2] ?? "";
    const parsed = parseInlineValue(rawValue);
    currentArrayKey = parsed === undefined ? key : null;
    ontologySkill[key] = parsed ?? [];
  }

  return {
    top,
    ontologySkill,
    hasFrontmatter: true,
    body,
  };
}

function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  function flush(): void {
    if (currentTitle === null) return;
    sections.set(currentTitle, currentLines.join("\n").trim());
    currentLines = [];
  }

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const heading = /^#{2,3}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      currentTitle = normalizeSectionTitle(heading[1] ?? "");
    } else if (currentTitle !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

function section(
  sections: ReadonlyMap<string, string>,
  aliases: readonly string[],
): string | undefined {
  for (const alias of aliases) {
    const found = sections.get(normalizeSectionTitle(alias));
    if (found !== undefined && found.trim().length > 0) return found.trim();
  }
  return undefined;
}

function bulletsFromSection(text: string | undefined): string[] {
  if (text === undefined) return [];
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines
    .map((line) => /^[-*]\s+(.+)$/.exec(line)?.[1] ?? /^\d+\.\s+(.+)$/.exec(line)?.[1])
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .map((line) => line.trim());
  return bulletLines.length > 0 ? bulletLines : lines;
}

function stringValue(record: FrontmatterRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function booleanValue(record: FrontmatterRecord, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function arrayValue(record: FrontmatterRecord, key: string): string[] {
  const value = record[key];
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  }
  if (typeof value === "string" && value.trim().length > 0) return [value.trim()];
  return [];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function inferSkillId(skillPath: string): string {
  const base = path.basename(skillPath) === "SKILL.md"
    ? path.basename(path.dirname(skillPath))
    : path.basename(skillPath, path.extname(skillPath));
  return base.trim().length > 0 ? base : "unknown-skill";
}

function inferCategory(markdown: string, skillPath: string): SkillOntologyCategory {
  const hint = `${skillPath}\n${markdown}`.toLowerCase();
  if (hint.includes("vc-scenario") || hint.includes("visual scenario")) return "visual-scenario";
  if (hint.includes("sequencer")) return "sequencer-compile";
  if (hint.includes("concept")) return "concept-authoring";
  if (hint.includes("presenter")) return "presenter-readiness";
  if (hint.includes("debug") || hint.includes("triage") || hint.includes("walk")) return "debug-triage";
  return "problem-authoring";
}

function explicitCategory(
  ontologySkill: FrontmatterRecord,
  markdown: string,
  skillPath: string,
): SkillOntologyCategory {
  const value = stringValue(ontologySkill, "category");
  if (value !== undefined && isSkillOntologyCategory(value)) return value;
  return inferCategory(markdown, skillPath);
}

function buildIntentMatchers(
  skillId: string,
  ontology: FrontmatterRecord,
): readonly SkillIntentMatcher[] {
  const naturalLanguageExamples = [
    ...arrayValue(ontology, "intentExamples"),
    ...arrayValue(ontology, "naturalLanguageExamples"),
  ];
  const nouns = [
    ...arrayValue(ontology, "intentNouns"),
    ...arrayValue(ontology, "nouns"),
  ];
  const verbs = [
    ...arrayValue(ontology, "intentVerbs"),
    ...arrayValue(ontology, "verbs"),
  ];
  const projectScopeLanes = [
    ...arrayValue(ontology, "intentProjectScopeLanes"),
    ...arrayValue(ontology, "projectScopeLanes"),
  ];
  const requiredArtifacts = [
    ...arrayValue(ontology, "intentPrerequisites"),
    ...arrayValue(ontology, "matcherPrerequisites"),
    ...arrayValue(ontology, "prerequisites"),
    ...arrayValue(ontology, "intentRequiredArtifacts"),
    ...arrayValue(ontology, "matcherRequiredArtifacts"),
  ];
  const optionalExistingArtifacts = [
    ...arrayValue(ontology, "intentOptionalExistingArtifacts"),
    ...arrayValue(ontology, "optionalExistingArtifacts"),
  ];
  const createsArtifacts = [
    ...arrayValue(ontology, "intentCreatesArtifacts"),
    ...arrayValue(ontology, "createsArtifacts"),
  ];
  const consumesArtifacts = [
    ...arrayValue(ontology, "intentConsumesArtifacts"),
    ...arrayValue(ontology, "consumesArtifacts"),
  ];
  const negativeExamples = [
    ...arrayValue(ontology, "intentNegativeExamples"),
    ...arrayValue(ontology, "negativeExamples"),
  ];
  const hasMatcher =
    naturalLanguageExamples.length > 0 ||
    nouns.length > 0 ||
    verbs.length > 0 ||
    projectScopeLanes.length > 0 ||
    requiredArtifacts.length > 0 ||
    optionalExistingArtifacts.length > 0 ||
    createsArtifacts.length > 0 ||
    consumesArtifacts.length > 0 ||
    negativeExamples.length > 0;

  if (!hasMatcher) return [];

  return [
    {
      matcherId: `${skillId}:default`,
      naturalLanguageExamples: [...new Set(naturalLanguageExamples)],
      nouns: [...new Set(nouns)],
      verbs: [...new Set(verbs)],
      projectScopeLanes: [...new Set(projectScopeLanes)],
      prerequisites: uniqueStrings(requiredArtifacts),
      optionalExistingArtifacts: uniqueStrings(optionalExistingArtifacts),
      createsArtifacts: uniqueStrings(createsArtifacts),
      consumesArtifacts: uniqueStrings(
        consumesArtifacts.length > 0 ? consumesArtifacts : requiredArtifacts,
      ),
      requiredArtifacts: uniqueStrings(requiredArtifacts),
      negativeExamples: [...new Set(negativeExamples)],
    },
  ];
}

function missingIssue(
  issueId: string,
  field: string,
  message: string,
): SkillOntologyValidationIssue {
  return { issueId, field, message, severity: "fail" };
}

export function parseSkillOntologyContractResult(
  markdown: string,
  skillPath: string,
): SkillOntologyContractParseResult {
  const frontmatter = parseFrontmatter(markdown);
  const sections = extractSections(frontmatter.body);
  const ontology = frontmatter.ontologySkill;
  const skillId = stringValue(ontology, "skillId") ?? inferSkillId(skillPath);
  const displayName =
    stringValue(ontology, "displayName") ??
    stringValue(frontmatter.top, "name") ??
    skillId;
  const userFacingPurpose =
    stringValue(ontology, "userFacingPurpose") ??
    section(sections, ["User-facing purpose", "User facing purpose"]) ??
    stringValue(frontmatter.top, "description") ??
    "";
  const leadFacingPurpose =
    stringValue(ontology, "leadFacingPurpose") ??
    section(sections, ["Lead-facing ontology role", "Lead-facing purpose", "Ontology role"]) ??
    "";
  const nonGoals = [
    ...arrayValue(ontology, "nonGoals"),
    ...bulletsFromSection(section(sections, ["Must not do", "Do not", "Non-goals", "Non goals"])),
  ];
  const failureModes = [
    ...arrayValue(ontology, "failureModes"),
    ...bulletsFromSection(section(sections, ["Failure handling", "Failure modes"])),
  ];
  const explicitMutationBoundary = Object.prototype.hasOwnProperty.call(
    ontology,
    "mayMutateProjectFiles",
  );
  const explicitDtcApproval =
    Object.prototype.hasOwnProperty.call(ontology, "requiresPromptDtc") ||
    Object.prototype.hasOwnProperty.call(ontology, "requiresDtcApproval");
  const requiredArtifacts = uniqueStrings([
    ...arrayValue(ontology, "requiredArtifacts"),
    ...arrayValue(ontology, "prerequisites"),
    ...bulletsFromSection(section(sections, ["Inputs", "Input artifacts"])),
  ]);
  const optionalInputs = uniqueStrings([
    ...arrayValue(ontology, "optionalInputs"),
    ...arrayValue(ontology, "optionalExistingArtifacts"),
  ]);
  const outputArtifacts = uniqueStrings([
    ...arrayValue(ontology, "artifactRefs"),
    ...arrayValue(ontology, "createsArtifacts"),
    ...bulletsFromSection(section(sections, ["Outputs", "Output artifacts"])),
  ]);
  const mutationSurfaces = arrayValue(ontology, "mutationSurfaces");

  const contract: SkillOntologyContract = {
    skillId,
    skillPath,
    displayName,
    category: explicitCategory(ontology, markdown, skillPath),
    userFacingPurpose,
    leadFacingPurpose,
    inputOntology: {
      objectRefs: arrayValue(ontology, "inputOntology"),
      requiredArtifacts,
      artifactLifecycle: {
        prerequisites: requiredArtifacts,
        optionalInputs,
        creates: outputArtifacts,
        mutates: mutationSurfaces,
      },
      allowedRawInputs: arrayValue(ontology, "allowedRawInputs"),
    },
    outputOntology: {
      objectRefs: arrayValue(ontology, "outputOntology"),
      artifactRefs: outputArtifacts,
      validationPacks: [
        ...arrayValue(ontology, "validationPacks"),
        ...bulletsFromSection(section(sections, ["Validation"])),
      ],
    },
    actionBoundary: {
      mayMutateProjectFiles: booleanValue(ontology, "mayMutateProjectFiles") ?? false,
      mutationSurfaces,
      requiresDtcApproval:
        booleanValue(ontology, "requiresDtcApproval") ??
        booleanValue(ontology, "requiresPromptDtc") ??
        false,
      requiresTeacherApproval: booleanValue(ontology, "requiresTeacherApproval") ?? false,
    },
    nonGoals: [...new Set(nonGoals.map((item) => item.trim()).filter(Boolean))],
    failureModes: [...new Set(failureModes.map((item) => item.trim()).filter(Boolean))],
    intentMatchers: buildIntentMatchers(skillId, ontology),
    readSurfaces: arrayValue(ontology, "readSurfaces"),
    writeSurfaces: arrayValue(ontology, "writeSurfaces"),
    knownIssueRefs: arrayValue(ontology, "knownIssueRefs"),
  };

  const source: SkillOntologyParseSource = {
    hasFrontmatter: frontmatter.hasFrontmatter,
    hasOntologySkillFrontmatter: Object.keys(ontology).length > 0,
    sourceVersion: stringValue(ontology, "version"),
    explicitMutationBoundary,
    explicitDtcApproval,
  };
  const normalizedContract = normalizeSkillOntologyContract(contract);
  const validation = validateSkillOntologyContract(normalizedContract);
  const issues = [...validation.issues];

  if (!source.hasOntologySkillFrontmatter) {
    issues.push(missingIssue(
      "skill-ontology.missing-frontmatter",
      "ontologySkill",
      "Project skills must declare ontologySkill frontmatter before routing.",
    ));
  }
  if (source.sourceVersion !== SKILL_ONTOLOGY_SCHEMA_VERSION) {
    issues.push(missingIssue(
      "skill-ontology.unsupported-version",
      "ontologySkill.version",
      `Expected ontologySkill.version '${SKILL_ONTOLOGY_SCHEMA_VERSION}'.`,
    ));
  }
  if (!source.explicitMutationBoundary) {
    issues.push(missingIssue(
      "skill-ontology.missing-mutation-policy",
      "ontologySkill.mayMutateProjectFiles",
      "Skill ontology frontmatter must explicitly declare mayMutateProjectFiles.",
    ));
  }
  if (normalizedContract.actionBoundary.mayMutateProjectFiles && !source.explicitDtcApproval) {
    issues.push(missingIssue(
      "skill-ontology.missing-dtc-policy",
      "ontologySkill.requiresPromptDtc",
      "Mutation-capable skills must explicitly declare requiresPromptDtc or requiresDtcApproval.",
    ));
  }

  return { contract: normalizedContract, source, issues };
}

export function parseSkillOntologyContract(
  markdown: string,
  skillPath: string,
): SkillOntologyContract {
  return parseSkillOntologyContractResult(markdown, skillPath).contract;
}
