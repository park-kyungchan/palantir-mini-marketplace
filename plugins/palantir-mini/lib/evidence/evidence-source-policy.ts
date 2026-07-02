import * as os from "node:os";
import * as path from "node:path";
import type { FDEOntologyEngineeringPhase } from "../fde-ontology-engineering/types";
import { findEvidencePromotionRecord } from "./evidence-promotion-ledger";

export type EvidenceAuthorityRole = "reference_only";
export type EvidencePromotionStatus =
  | "not_promoted"
  | "promoted_project_scope"
  | "promoted_shared_core";

export type EvidenceSourceKind =
  | "project-doc"
  | "home-doc"
  | "curriculum-reference"
  | "subrepo-read-only-index"
  | "unsupported";

export interface EvidenceRefClassification {
  readonly policyVersion: "v2";
  readonly sourcePath: string;
  readonly kind: EvidenceSourceKind;
  readonly allowed: boolean;
  readonly role: EvidenceAuthorityRole;
  readonly ssotStatus: EvidencePromotionStatus;
  readonly normalizedPath: string;
  readonly reason: string;
}

export interface EvidenceSourcePolicyInput {
  readonly projectRoot: string;
  readonly sourcePath: string;
}

export type FDEEvidenceUse = "reference" | "authority" | "mutation";
export type FDEEvidencePromotionPhase = FDEOntologyEngineeringPhase | "mutation";
export type FDEEvidencePromotionSeverity = "none" | "warn" | "fail";

export interface EvidenceSourcePolicyDecision extends EvidenceRefClassification {
  readonly allowed: boolean;
  readonly kind: EvidenceSourceKind;
  readonly normalizedPath: string;
  readonly role: EvidenceAuthorityRole;
  readonly ssotStatus: EvidencePromotionStatus;
  readonly reason: string;
}

export interface FDEEvidencePromotionSeverityInput extends EvidenceSourcePolicyInput {
  readonly phase: FDEEvidencePromotionPhase;
  readonly use?: FDEEvidenceUse;
}

export interface FDEEvidencePromotionSeverityDecision {
  readonly policyDecision: EvidenceSourcePolicyDecision;
  readonly phase: FDEEvidencePromotionPhase;
  readonly use: FDEEvidenceUse;
  readonly severity: FDEEvidencePromotionSeverity;
  readonly reason: string;
}

/**
 * Injectable policy literals. Defaults preserve the historical hardcoded behavior
 * exactly; callers may override any subset and absent fields fall back to defaults.
 */
export interface EvidenceSourcePolicyConfig {
  /** Absolute root for long-term reference docs (was hardcoded HOME_DOCS_ROOT). */
  readonly homeDocsRoot: string;
  /** Basenames recognised as project documentation regardless of directory. */
  readonly docFilenames: readonly string[];
  /** File extensions accepted as documentation evidence (lowercase, leading dot). */
  readonly docExtensions: readonly string[];
  /** Path segments that mark a project-scoped documentation directory. */
  readonly projectDocSegments: readonly string[];
  /** Path segments that mark curriculum/MYP reference evidence. */
  readonly curriculumSegments: readonly string[];
  /** Substrings (path-style) that mark curriculum/MYP reference evidence. */
  readonly curriculumPathMarkers: readonly string[];
}

export const DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG: EvidenceSourcePolicyConfig = {
  homeDocsRoot: path.join(process.env.HOME ?? os.homedir(), "docs"),
  docFilenames: ["BROWSE.md", "INDEX.md", "CLAUDE.md", "AGENTS.md", "GEMINI.md"],
  docExtensions: [".md", ".mdx", ".txt", ".json", ".yaml", ".yml"],
  projectDocSegments: ["docs", "ontology", ".palantir-mini"],
  curriculumSegments: ["agent-ready", "curriculum"],
  curriculumPathMarkers: ["/docs/2022-math-curriculum/", "/docs/myp-"],
};

function resolveConfig(
  config?: Partial<EvidenceSourcePolicyConfig>,
): EvidenceSourcePolicyConfig {
  if (!config) return DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG;
  return {
    homeDocsRoot: config.homeDocsRoot ?? DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG.homeDocsRoot,
    docFilenames: config.docFilenames ?? DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG.docFilenames,
    docExtensions: config.docExtensions ?? DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG.docExtensions,
    projectDocSegments:
      config.projectDocSegments ?? DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG.projectDocSegments,
    curriculumSegments:
      config.curriculumSegments ?? DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG.curriculumSegments,
    curriculumPathMarkers:
      config.curriculumPathMarkers ?? DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG.curriculumPathMarkers,
  };
}

function normalizeAbsolute(projectRoot: string, sourcePath: string): string {
  const base = path.resolve(projectRoot);
  return path.resolve(path.isAbsolute(sourcePath) ? sourcePath : path.join(base, sourcePath));
}

function isWithin(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isProjectDoc(
  normalizedPath: string,
  projectRoot: string,
  cfg: EvidenceSourcePolicyConfig,
): boolean {
  if (!isWithin(normalizedPath, projectRoot)) return false;

  const relative = path.relative(projectRoot, normalizedPath);
  const segments = relative.split(path.sep);
  const basename = path.basename(normalizedPath);

  return (
    cfg.docFilenames.includes(basename) ||
    cfg.projectDocSegments.some((segment) => segments.includes(segment))
  ) && cfg.docExtensions.includes(path.extname(normalizedPath).toLowerCase());
}

function decision(
  projectRoot: string,
  allowed: boolean,
  kind: EvidenceSourceKind,
  normalizedPath: string,
  reason: string,
  sourcePath = normalizedPath,
): EvidenceSourcePolicyDecision {
  const promotion = allowed
    ? findEvidencePromotionRecord(projectRoot, normalizedPath)
    : undefined;
  return {
    policyVersion: "v2",
    sourcePath,
    allowed,
    kind,
    normalizedPath,
    role: "reference_only",
    ssotStatus: promotion?.scope === "shared-core"
      ? "promoted_shared_core"
      : promotion?.scope === "project"
        ? "promoted_project_scope"
        : "not_promoted",
    reason,
  };
}

export function classifyEvidenceSource(
  input: EvidenceSourcePolicyInput,
  config?: Partial<EvidenceSourcePolicyConfig>,
): EvidenceSourcePolicyDecision {
  const cfg = resolveConfig(config);
  const projectRoot = path.resolve(input.projectRoot);
  const normalizedPath = normalizeAbsolute(projectRoot, input.sourcePath);
  const homeDocsRoot = path.resolve(cfg.homeDocsRoot);
  const relativeProject = path.relative(projectRoot, normalizedPath).split(path.sep);

  if (
    cfg.curriculumSegments.some((segment) => relativeProject.includes(segment)) ||
    cfg.curriculumPathMarkers.some((marker) => normalizedPath.includes(marker))
  ) {
    return decision(
      projectRoot,
      true,
      "curriculum-reference",
      normalizedPath,
      "Curriculum and MYP evidence is allowed only as reference_only / not_promoted evidence.",
      input.sourcePath,
    );
  }

  if (
    path.basename(normalizedPath) === "read-only-index.json" &&
    normalizedPath.includes(`${path.sep}.palantir-mini${path.sep}subrepos${path.sep}`)
  ) {
    return decision(
      projectRoot,
      true,
      "subrepo-read-only-index",
      normalizedPath,
      "Subrepo manifest evidence is a read-only application-state projection, not repository authority.",
      input.sourcePath,
    );
  }

  if (isWithin(normalizedPath, homeDocsRoot) && cfg.docExtensions.includes(path.extname(normalizedPath).toLowerCase())) {
    return decision(
      projectRoot,
      true,
      "home-doc",
      normalizedPath,
      `${homeDocsRoot} evidence is allowed as long-term reference evidence only.`,
      input.sourcePath,
    );
  }

  if (isProjectDoc(normalizedPath, projectRoot, cfg)) {
    return decision(
      projectRoot,
      true,
      "project-doc",
      normalizedPath,
      "Project docs evidence is allowed as project-scoped reference evidence only.",
      input.sourcePath,
    );
  }

  return decision(
    projectRoot,
    false,
    "unsupported",
    normalizedPath,
    `Only project documentation and ${homeDocsRoot}/** documentation are accepted by this policy.`,
    input.sourcePath,
  );
}

export function isReferenceEvidenceAllowed(
  input: EvidenceSourcePolicyInput,
  config?: Partial<EvidenceSourcePolicyConfig>,
): boolean {
  return classifyEvidenceSource(input, config).allowed;
}

export function evaluateFDEEvidencePromotionSeverity(
  input: FDEEvidencePromotionSeverityInput,
  config?: Partial<EvidenceSourcePolicyConfig>,
): FDEEvidencePromotionSeverityDecision {
  const policyDecision = classifyEvidenceSource(input, config);
  const use = input.use ?? "reference";

  if (!policyDecision.allowed || policyDecision.ssotStatus !== "not_promoted") {
    return {
      policyDecision,
      phase: input.phase,
      use,
      severity: "none",
      reason: policyDecision.allowed
        ? "Evidence already has a scoped promotion ledger entry."
        : "Unsupported evidence source is handled by the source policy validator.",
    };
  }

  if (use === "mutation") {
    return {
      policyDecision,
      phase: input.phase,
      use,
      severity: "fail",
      reason: "Mutation-phase FDE evidence requires a scoped promotion ledger entry before it can authorize writeback.",
    };
  }

  if (use === "authority") {
    const severity: FDEEvidencePromotionSeverity =
      input.phase === "dtc-ready" || input.phase === "mutation" ? "fail" : "warn";
    return {
      policyDecision,
      phase: input.phase,
      use,
      severity,
      reason: severity === "fail"
        ? "DTC-ready FDE authority evidence requires a scoped promotion ledger entry."
        : "FDE evidence is being used as authority before a scoped promotion ledger entry exists.",
    };
  }

  if (input.phase === "semantic-contract-ready") {
    return {
      policyDecision,
      phase: input.phase,
      use,
      severity: "warn",
      reason: "Semantic-contract-ready FDE evidence should be promoted before contract authority depends on it.",
    };
  }

  return {
    policyDecision,
    phase: input.phase,
    use,
    severity: "none",
    reason: "Early-phase FDE source evidence remains reference-only and is not yet used as authority.",
  };
}
