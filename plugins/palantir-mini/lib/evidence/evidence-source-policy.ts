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

const HOME_DOCS_ROOT = "/home/palantirkc/docs";
const DOC_FILENAMES = new Set(["BROWSE.md", "INDEX.md", "CLAUDE.md", "AGENTS.md", "GEMINI.md"]);
const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".json", ".yaml", ".yml"]);

function normalizeAbsolute(projectRoot: string, sourcePath: string): string {
  const base = path.resolve(projectRoot);
  return path.resolve(path.isAbsolute(sourcePath) ? sourcePath : path.join(base, sourcePath));
}

function isWithin(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isProjectDoc(normalizedPath: string, projectRoot: string): boolean {
  if (!isWithin(normalizedPath, projectRoot)) return false;

  const relative = path.relative(projectRoot, normalizedPath);
  const segments = relative.split(path.sep);
  const basename = path.basename(normalizedPath);

  return (
    DOC_FILENAMES.has(basename) ||
    segments.includes("docs") ||
    segments.includes("ontology") ||
    segments.includes(".palantir-mini")
  ) && DOC_EXTENSIONS.has(path.extname(normalizedPath).toLowerCase());
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

export function classifyEvidenceSource(input: EvidenceSourcePolicyInput): EvidenceSourcePolicyDecision {
  const projectRoot = path.resolve(input.projectRoot);
  const normalizedPath = normalizeAbsolute(projectRoot, input.sourcePath);
  const homeDocsRoot = path.resolve(HOME_DOCS_ROOT);
  const relativeProject = path.relative(projectRoot, normalizedPath).split(path.sep);

  if (
    relativeProject.includes("agent-ready") ||
    relativeProject.includes("curriculum") ||
    normalizedPath.includes("/docs/2022-math-curriculum/") ||
    normalizedPath.includes("/docs/myp-")
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

  if (isWithin(normalizedPath, homeDocsRoot) && DOC_EXTENSIONS.has(path.extname(normalizedPath).toLowerCase())) {
    return decision(
      projectRoot,
      true,
      "home-doc",
      normalizedPath,
      "/home/palantirkc/docs evidence is allowed as long-term reference evidence only.",
      input.sourcePath,
    );
  }

  if (isProjectDoc(normalizedPath, projectRoot)) {
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
    "Only project documentation and /home/palantirkc/docs/** documentation are accepted by this policy.",
    input.sourcePath,
  );
}

export function isReferenceEvidenceAllowed(input: EvidenceSourcePolicyInput): boolean {
  return classifyEvidenceSource(input).allowed;
}

export function evaluateFDEEvidencePromotionSeverity(
  input: FDEEvidencePromotionSeverityInput,
): FDEEvidencePromotionSeverityDecision {
  const policyDecision = classifyEvidenceSource(input);
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
