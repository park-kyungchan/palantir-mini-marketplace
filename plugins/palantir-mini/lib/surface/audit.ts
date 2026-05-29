import * as fs from "fs";
import * as path from "path";
import { parseSurfaceContractFromMarkdown, type SurfaceContractIssue } from "./parse";

export const SURFACE_AUDIT_MODES = [
  "agents",
  "skills",
  "mcp-tools",
  "hooks",
  "evals",
  "runtime-adapters",
  "all",
] as const;

export type SurfaceAuditMode = (typeof SURFACE_AUDIT_MODES)[number];

export interface SurfaceContractAuditArgs {
  readonly pluginRoot: string;
  readonly mode?: SurfaceAuditMode;
  readonly failClosed?: boolean;
}

export interface SurfaceContractAuditFinding {
  readonly filePath: string;
  readonly surfaceKind: string;
  readonly contractRequired: boolean;
  readonly requirementReason: string;
  readonly issues: readonly SurfaceContractIssue[];
}

export interface SurfaceContractAuditBreakdown {
  readonly surfaceKind: string;
  readonly scannedFileCount: number;
  readonly requiredSurfaceCount: number;
  readonly helperFileCount: number;
  readonly contractCount: number;
  readonly missingContractCount: number;
  readonly missingRequiredContractCount: number;
  readonly invalidContractCount: number;
  readonly unsupportedRepresentationCount: number;
}

export interface SurfaceContractAuditResult {
  readonly status: "pass" | "fail" | "advisory";
  readonly mode: SurfaceAuditMode;
  readonly pluginRoot: string;
  readonly scannedFileCount: number;
  readonly requiredSurfaceCount: number;
  readonly helperFileCount: number;
  readonly contractCount: number;
  readonly missingContractCount: number;
  readonly missingRequiredContractCount: number;
  readonly invalidContractCount: number;
  readonly unsupportedRepresentationCount: number;
  readonly surfaceBreakdown: readonly SurfaceContractAuditBreakdown[];
  readonly findings: readonly SurfaceContractAuditFinding[];
}

const MODE_DIRS: Record<Exclude<SurfaceAuditMode, "all">, readonly string[]> = {
  agents: ["agents"],
  skills: ["skills"],
  "mcp-tools": ["bridge/handlers"],
  hooks: ["hooks"],
  evals: ["eval-suites"],
  "runtime-adapters": ["lib/runtime", "lib/codex", "docs"],
};

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function walkFiles(root: string, fileNames: string[]): string[] {
  if (!exists(root)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...walkFiles(abs, fileNames));
      continue;
    }
    if (entry.isFile() && fileNames.some((suffix) => entry.name.endsWith(suffix))) out.push(abs);
  }
  return out.sort((left, right) => left.localeCompare(right));
}

function filesForMode(pluginRoot: string, mode: SurfaceAuditMode): string[] {
  const modes = mode === "all"
    ? (Object.keys(MODE_DIRS) as Exclude<SurfaceAuditMode, "all">[])
    : [mode];

  const files = new Set<string>();
  for (const currentMode of modes) {
    for (const relDir of MODE_DIRS[currentMode]) {
      const root = path.join(pluginRoot, relDir);
      const suffixes = currentMode === "skills"
        ? ["SKILL.md"]
        : currentMode === "mcp-tools"
          ? [".ts"]
          : [".md", ".json", ".ts"];
      for (const filePath of walkFiles(root, suffixes)) files.add(filePath);
    }
  }
  return [...files].sort((left, right) => left.localeCompare(right));
}

function kindForPath(pluginRoot: string, filePath: string): string {
  const rel = path.relative(pluginRoot, filePath);
  if (rel.startsWith("agents/")) return "agent";
  if (rel.startsWith("skills/")) return "skill";
  if (rel.startsWith("bridge/handlers/")) return "mcp-tool";
  if (rel.startsWith("hooks/")) return "hook";
  if (rel.startsWith("eval-suites/")) return "eval-suite";
  return "runtime-adapter";
}

interface SurfaceInventoryClassification {
  readonly contractRequired: boolean;
  readonly requirementReason: string;
  readonly representationSupported: boolean;
}

function isTopLevelFileUnder(relPath: string, prefix: string): boolean {
  if (!relPath.startsWith(prefix)) return false;
  return !relPath.slice(prefix.length).includes("/");
}

function classifySurfaceInventory(pluginRoot: string, filePath: string): SurfaceInventoryClassification {
  const rel = path.relative(pluginRoot, filePath).replace(/\\/g, "/");
  const baseName = path.basename(rel);
  const extension = path.extname(rel);

  if (rel.startsWith("agents/")) {
    return {
      contractRequired: true,
      requirementReason: "agent markdown files are public delegation surfaces",
      representationSupported: extension === ".md",
    };
  }
  if (rel.startsWith("skills/")) {
    return {
      contractRequired: true,
      requirementReason: "SKILL.md files are public workflow entrypoints",
      representationSupported: baseName === "SKILL.md",
    };
  }
  if (rel.startsWith("eval-suites/")) {
    return {
      contractRequired: true,
      requirementReason: "eval suite JSON files are public validation surfaces",
      representationSupported: extension === ".json",
    };
  }
  if (rel.startsWith("bridge/handlers/")) {
    const topLevelHandler = isTopLevelFileUnder(rel, "bridge/handlers/") && !baseName.startsWith("_");
    return {
      contractRequired: topLevelHandler,
      requirementReason: topLevelHandler
        ? "top-level handler modules are public or promoted MCP handler surfaces"
        : "nested or underscored handler files are helper inventory until promoted",
      representationSupported: extension === ".ts",
    };
  }
  if (rel.startsWith("hooks/")) {
    const registry = rel === "hooks/hooks.json" ||
      rel === "hooks/codex-hooks.json" ||
      rel === "hooks/claude-hooks.json";
    return {
      contractRequired: registry,
      requirementReason: registry
        ? "hook registries define runtime policy groups"
        : "hook scripts and docs are helper inventory until grouped by registry policy",
      representationSupported: registry ? extension === ".json" : extension === ".md",
    };
  }
  if (rel.startsWith("lib/codex/") || rel.startsWith("lib/runtime/")) {
    return {
      contractRequired: true,
      requirementReason: "runtime adapter source files project cross-runtime behavior",
      representationSupported: extension === ".ts",
    };
  }
  return {
    contractRequired: false,
    requirementReason: "runtime docs are evidence references, not required contract-bearing surfaces",
    representationSupported: extension === ".md",
  };
}

function findingIssues(
  issues: readonly SurfaceContractIssue[],
  classification: SurfaceInventoryClassification,
): readonly SurfaceContractIssue[] {
  if (classification.contractRequired || issues.length === 0) return issues;
  return issues.map((issue) => issue.issueId === "surface.contract-missing"
    ? {
      ...issue,
      issueId: "surface.helper-contract-missing",
      severity: "warn" as const,
      message: `${issue.message} Helper inventory is observed but not required for fail-closed enforcement.`,
    }
    : issue);
}

function emptyBreakdown(surfaceKind: string): SurfaceContractAuditBreakdown {
  return {
    surfaceKind,
    scannedFileCount: 0,
    requiredSurfaceCount: 0,
    helperFileCount: 0,
    contractCount: 0,
    missingContractCount: 0,
    missingRequiredContractCount: 0,
    invalidContractCount: 0,
    unsupportedRepresentationCount: 0,
  };
}

function incrementBreakdown(
  breakdown: Map<string, SurfaceContractAuditBreakdown>,
  surfaceKind: string,
  delta: Omit<SurfaceContractAuditBreakdown, "surfaceKind">,
): void {
  const current = breakdown.get(surfaceKind) ?? emptyBreakdown(surfaceKind);
  breakdown.set(surfaceKind, {
    surfaceKind,
    scannedFileCount: current.scannedFileCount + delta.scannedFileCount,
    requiredSurfaceCount: current.requiredSurfaceCount + delta.requiredSurfaceCount,
    helperFileCount: current.helperFileCount + delta.helperFileCount,
    contractCount: current.contractCount + delta.contractCount,
    missingContractCount: current.missingContractCount + delta.missingContractCount,
    missingRequiredContractCount: current.missingRequiredContractCount + delta.missingRequiredContractCount,
    invalidContractCount: current.invalidContractCount + delta.invalidContractCount,
    unsupportedRepresentationCount: current.unsupportedRepresentationCount + delta.unsupportedRepresentationCount,
  });
}

export function auditSurfaceContracts(args: SurfaceContractAuditArgs): SurfaceContractAuditResult {
  const mode = args.mode ?? "all";
  const files = filesForMode(args.pluginRoot, mode);
  const findings: SurfaceContractAuditFinding[] = [];
  const breakdown = new Map<string, SurfaceContractAuditBreakdown>();
  let requiredSurfaceCount = 0;
  let helperFileCount = 0;
  let contractCount = 0;
  let missingContractCount = 0;
  let missingRequiredContractCount = 0;
  let invalidContractCount = 0;
  let unsupportedRepresentationCount = 0;

  for (const filePath of files) {
    const parsed = parseSurfaceContractFromMarkdown(fs.readFileSync(filePath, "utf8"));
    const surfaceKind = kindForPath(args.pluginRoot, filePath);
    const classification = classifySurfaceInventory(args.pluginRoot, filePath);
    const hasContract = parsed.contract !== undefined;
    const isMissing = parsed.source === "missing";
    const isMissingRequired = isMissing && classification.contractRequired;
    const isInvalid = parsed.source !== "missing" &&
      parsed.issues.some((issue) => issue.severity === "fail");
    const unsupportedRepresentation = classification.contractRequired &&
      isMissing &&
      !classification.representationSupported;

    if (classification.contractRequired) requiredSurfaceCount += 1;
    else helperFileCount += 1;
    if (parsed.contract) contractCount += 1;
    if (isMissing) missingContractCount += 1;
    if (isMissingRequired) missingRequiredContractCount += 1;
    if (isInvalid) invalidContractCount += 1;
    if (unsupportedRepresentation) unsupportedRepresentationCount += 1;
    incrementBreakdown(breakdown, surfaceKind, {
      scannedFileCount: 1,
      requiredSurfaceCount: classification.contractRequired ? 1 : 0,
      helperFileCount: classification.contractRequired ? 0 : 1,
      contractCount: hasContract ? 1 : 0,
      missingContractCount: isMissing ? 1 : 0,
      missingRequiredContractCount: isMissingRequired ? 1 : 0,
      invalidContractCount: isInvalid ? 1 : 0,
      unsupportedRepresentationCount: unsupportedRepresentation ? 1 : 0,
    });
    if (parsed.issues.length > 0) {
      findings.push({
        filePath: path.relative(args.pluginRoot, filePath),
        surfaceKind,
        contractRequired: classification.contractRequired,
        requirementReason: classification.requirementReason,
        issues: findingIssues(parsed.issues, classification),
      });
    }
  }

  const hasFailures = invalidContractCount > 0 || (args.failClosed === true && missingRequiredContractCount > 0);
  return {
    status: hasFailures ? "fail" : missingContractCount > 0 ? "advisory" : "pass",
    mode,
    pluginRoot: args.pluginRoot,
    scannedFileCount: files.length,
    requiredSurfaceCount,
    helperFileCount,
    contractCount,
    missingContractCount,
    missingRequiredContractCount,
    invalidContractCount,
    unsupportedRepresentationCount,
    surfaceBreakdown: [...breakdown.values()].sort((left, right) =>
      left.surfaceKind.localeCompare(right.surfaceKind)
    ),
    findings,
  };
}
