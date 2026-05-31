import * as fs from "fs";
import * as path from "path";
import { DEPRECATION_MAP } from "../_deprecation-map";
import { HANDLER_MODULES } from "../../mcp-server";
import { PLUGIN_ROOT } from "./types";

type DeletionRegistryStatus = "keep" | "register" | "retire" | "removed";

export interface DeletionReadinessReference {
  path: string;
  kind: "active" | "test" | "historical" | "evidence";
}

export interface DeletionReadinessCandidate {
  surfaceName: string;
  ownerPath: string;
  ownerExists: boolean;
  registryStatus: DeletionRegistryStatus;
  surfaceStatus?: string;
  replacement?: string;
  evidenceRefs: string[];
  referenceNeedles: string[];
  references: DeletionReadinessReference[];
  blockingReasons: string[];
  deletionAllowed: boolean;
}

export interface DeletionReadinessResult {
  status: "pass" | "fail" | "skipped";
  details: string;
  candidateCount: number;
  blockedCount: number;
  deletionAllowedCount: number;
  missingDecisionSurfaces: string[];
  candidates: DeletionReadinessCandidate[];
}

interface SurfaceToolDecision {
  toolName?: string;
  registryStatus?: string;
  surfaceStatus?: string;
  reason?: string;
}

const MANAGED_SETTINGS_REF = "managed-settings.d/50-palantir-mini.json";
const DEPRECATION_MAP_REF = "bridge/handlers/_deprecation-map.ts";
const CODEX_RUNTIME_CONTRACT_REF = "runtime-adapters/codex/contract.json";
const CODEX_RUNTIME_EVIDENCE_REF = "contracts/runtime-evidence/codex.json";

const SEARCH_ENTRIES = [
  ".codex-plugin",
  ".mcp.json",
  "agents",
  "bridge",
  "codex-skills",
  "contracts",
  "core",
  "docs",
  "eval-suites",
  "hooks",
  "lib",
  "managed-settings.d",
  "runtime-adapters",
  "schemas",
  "scripts",
  "skills",
  "tests",
  "workbenches",
  "README.md",
  "CHANGELOG.md",
] as const;

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const TEXT_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".jsonl",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const REMOVED_TOOL_OWNER_PATHS: Record<string, string> = {
  propagation_audit_forward: "bridge/handlers/propagation-audit-forward.ts",
  propagation_audit_backward: "bridge/handlers/propagation-audit-backward.ts",
  propagation_chain_health: "bridge/handlers/propagation-chain-health.ts",
  detect_doc_drift: "bridge/handlers/detect-doc-drift.ts",
  verify_schema_pin: "bridge/handlers/verify-schema-pin.ts",
  verify_codegen_headers: "bridge/handlers/verify-codegen-headers.ts",
  grade_planner_output: "bridge/handlers/grade_planner_output.ts",
  grade_classification_accuracy: "bridge/handlers/grade-classification-accuracy.ts",
  apply_refinement_target: "bridge/handlers/apply-refinement-target.ts",
  run_playwright_scenario: "bridge/handlers/run-playwright-scenario.ts",
  complete_playwright_scenario: "bridge/handlers/complete-playwright-scenario.ts",
  pm_value_grade_metrics: "bridge/handlers/pm-value-grade-metrics.ts",
  validate_hook_citations: "bridge/handlers/validate-hook-citations.ts",
  validate_hook_event_allowlist: "bridge/handlers/validate-hook-event-allowlist.ts",
};

const MANAGED_DECISION_OWNER_PATHS: Record<string, string> = {
  pm_semantic_workbench_state: "bridge/handlers/pm-semantic-workbench-state.ts",
  pm_semantic_consistency_gate: "bridge/handlers/pm-semantic-consistency-gate.ts",
};

function readJson<T>(relPath: string): T | undefined {
  const absPath = path.join(PLUGIN_ROOT, relPath);
  if (!fs.existsSync(absPath)) return undefined;
  return JSON.parse(fs.readFileSync(absPath, "utf8")) as T;
}

function managedSurfaceDecisions(): SurfaceToolDecision[] {
  const parsed = readJson<{
    permissions?: { surfaceToolDecisions?: SurfaceToolDecision[] };
  }>(MANAGED_SETTINGS_REF);
  return parsed?.permissions?.surfaceToolDecisions ?? [];
}

function codexRuntimeEvidenceIsSourceOnly(): boolean {
  const contract = readJson<{ runtimeGapRefs?: string[] }>(CODEX_RUNTIME_CONTRACT_REF);
  const runtimeEvidence = readJson<{ smokeEvidenceRefs?: string[] }>(CODEX_RUNTIME_EVIDENCE_REF);
  return Boolean(
    contract?.runtimeGapRefs?.includes("codex:requires-plugin-reinstall-reload-and-process-restart") &&
    (runtimeEvidence?.smokeEvidenceRefs ?? []).every((ref) => ref.startsWith("tests/")),
  );
}

function isTextFile(filePath: string): boolean {
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath));
}

function walkTextFiles(absPath: string): string[] {
  if (!fs.existsSync(absPath)) return [];
  const stat = fs.statSync(absPath);
  if (stat.isFile()) return isTextFile(absPath) ? [absPath] : [];
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walkTextFiles(path.join(absPath, entry.name)));
      continue;
    }
    const next = path.join(absPath, entry.name);
    if (entry.isFile() && isTextFile(next)) files.push(next);
  }
  return files;
}

function searchableFiles(): string[] {
  const files = new Set<string>();
  for (const entry of SEARCH_ENTRIES) {
    for (const filePath of walkTextFiles(path.join(PLUGIN_ROOT, entry))) {
      files.add(path.relative(PLUGIN_ROOT, filePath).replace(/\\/g, "/"));
    }
  }
  return [...files].sort((left, right) => left.localeCompare(right));
}

function referenceKind(relPath: string, evidenceRefs: string[]): DeletionReadinessReference["kind"] {
  if (evidenceRefs.includes(relPath) || relPath === DEPRECATION_MAP_REF) return "evidence";
  if (relPath.startsWith("tests/") || relPath.startsWith("eval-suites/")) return "test";
  if (
    relPath === "CHANGELOG.md" ||
    relPath.startsWith("docs/") ||
    relPath.startsWith("runtime-overlay/")
  ) return "historical";
  return "active";
}

function findReferences(
  ownerPath: string,
  needles: string[],
  evidenceRefs: string[],
): DeletionReadinessReference[] {
  const out: DeletionReadinessReference[] = [];
  for (const relPath of searchableFiles()) {
    if (relPath === ownerPath) continue;
    const source = fs.readFileSync(path.join(PLUGIN_ROOT, relPath), "utf8");
    if (!needles.some((needle) => source.includes(needle))) continue;
    out.push({
      path: relPath,
      kind: referenceKind(relPath, evidenceRefs),
    });
  }
  return out;
}

function buildCandidate(input: {
  surfaceName: string;
  ownerPath: string;
  registryStatus: DeletionRegistryStatus;
  surfaceStatus?: string;
  replacement?: string;
  evidenceRefs: string[];
  referenceNeedles: string[];
}): DeletionReadinessCandidate {
  const ownerExists = fs.existsSync(path.join(PLUGIN_ROOT, input.ownerPath));
  const references = findReferences(input.ownerPath, input.referenceNeedles, input.evidenceRefs);
  const blockingReasons: string[] = [];

  if (!ownerExists) {
    blockingReasons.push("owner path is already absent; no physical deletion remains for this surface");
  }
  if (input.registryStatus === "keep" || input.registryStatus === "register") {
    blockingReasons.push(`registry status '${input.registryStatus}' does not authorize deletion`);
  }
  if (!input.replacement) {
    blockingReasons.push("missing replacement surface declaration");
  }

  const nonEvidenceRefs = references.filter((ref) => ref.kind !== "evidence");
  if (nonEvidenceRefs.length > 0) {
    blockingReasons.push(`no-reference proof incomplete: ${nonEvidenceRefs.length} non-evidence reference(s) remain`);
  }
  if (codexRuntimeEvidenceIsSourceOnly()) {
    blockingReasons.push(
      "runtime activation evidence is source-only; plugin reinstall/reload and Codex restart smoke evidence are still required",
    );
  }

  const deletionAllowed =
    ownerExists &&
    (input.registryStatus === "retire" || input.registryStatus === "removed") &&
    Boolean(input.replacement) &&
    nonEvidenceRefs.length === 0 &&
    !codexRuntimeEvidenceIsSourceOnly();

  return {
    surfaceName: input.surfaceName,
    ownerPath: input.ownerPath,
    ownerExists,
    registryStatus: input.registryStatus,
    surfaceStatus: input.surfaceStatus,
    replacement: input.replacement,
    evidenceRefs: input.evidenceRefs,
    referenceNeedles: input.referenceNeedles,
    references,
    blockingReasons,
    deletionAllowed,
  };
}

function managedDecisionCandidates(): DeletionReadinessCandidate[] {
  return managedSurfaceDecisions()
    .filter((decision) => typeof decision.toolName === "string")
    .map((decision) => {
      const toolName = decision.toolName!;
      const ownerPath = MANAGED_DECISION_OWNER_PATHS[toolName] ??
        `bridge/handlers/${toolName.replace(/^pm_/, "pm-").replaceAll("_", "-")}.ts`;
      return buildCandidate({
        surfaceName: toolName,
        ownerPath,
        registryStatus: REGISTRY_STATUSES.has(decision.registryStatus ?? "")
          ? decision.registryStatus as DeletionRegistryStatus
          : "keep",
        surfaceStatus: decision.surfaceStatus,
        replacement: decision.registryStatus === "register"
          ? "public MCP registration after explicit approval"
          : "managed-settings surfaceToolDecisions",
        evidenceRefs: [
          MANAGED_SETTINGS_REF,
          CODEX_RUNTIME_CONTRACT_REF,
          CODEX_RUNTIME_EVIDENCE_REF,
        ],
        referenceNeedles: [toolName, ownerPath, path.basename(ownerPath)],
      });
    });
}

const REGISTRY_STATUSES = new Set(["keep", "register", "retire", "removed"]);

function removedToolCandidates(): DeletionReadinessCandidate[] {
  return DEPRECATION_MAP.map((entry) => {
    const ownerPath = REMOVED_TOOL_OWNER_PATHS[entry.removed] ??
      `bridge/handlers/${entry.removed.replaceAll("_", "-")}.ts`;
    return buildCandidate({
      surfaceName: entry.removed,
      ownerPath,
      registryStatus: "removed",
      replacement: entry.replacement,
      evidenceRefs: [
        DEPRECATION_MAP_REF,
        CODEX_RUNTIME_CONTRACT_REF,
        CODEX_RUNTIME_EVIDENCE_REF,
      ],
      referenceNeedles: [entry.removed, ownerPath, path.basename(ownerPath)],
    });
  });
}

function internalLegacyCandidates(): DeletionReadinessCandidate[] {
  const legacyModule = HANDLER_MODULES.ontology_context_query_legacy;
  if (typeof legacyModule !== "string") return [];
  return [
    buildCandidate({
      surfaceName: "ontology_context_query_legacy",
      ownerPath: "bridge/handlers/ontology-context-query-legacy.ts",
      registryStatus: "keep",
      surfaceStatus: "internal",
      replacement: "ontology_context_query public Phase 3 read path",
      evidenceRefs: [
        "bridge/mcp-server.ts",
        CODEX_RUNTIME_CONTRACT_REF,
        CODEX_RUNTIME_EVIDENCE_REF,
      ],
      referenceNeedles: [
        "ontology_context_query_legacy",
        "ontology-context-query-legacy",
        "bridge/handlers/ontology-context-query-legacy.ts",
      ],
    }),
  ];
}

export function checkDeletionReadiness(): DeletionReadinessResult {
  const missingDecisionSurfaces = Object.keys(MANAGED_DECISION_OWNER_PATHS)
    .filter((surface) => !managedSurfaceDecisions().some((decision) => decision.toolName === surface));
  const candidates = [
    ...managedDecisionCandidates(),
    ...removedToolCandidates(),
    ...internalLegacyCandidates(),
  ];
  const deletionAllowedCount = candidates.filter((candidate) => candidate.deletionAllowed).length;
  const blockedCount = candidates.filter((candidate) => candidate.blockingReasons.length > 0).length;
  const status = missingDecisionSurfaces.length > 0 || deletionAllowedCount > 0 ? "fail" : "pass";

  return {
    status,
    details: status === "pass"
      ? `Deletion readiness gate checked ${candidates.length} candidate surface(s); ${blockedCount} remain blocked and no physical deletion is authorized.`
      : `Deletion readiness gate requires action: missing decisions=${missingDecisionSurfaces.length}, deletionAllowed=${deletionAllowedCount}.`,
    candidateCount: candidates.length,
    blockedCount,
    deletionAllowedCount,
    missingDecisionSurfaces,
    candidates,
  };
}
