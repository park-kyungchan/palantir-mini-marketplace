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
  readonly issues: readonly SurfaceContractIssue[];
}

export interface SurfaceContractAuditResult {
  readonly status: "pass" | "fail" | "advisory";
  readonly mode: SurfaceAuditMode;
  readonly pluginRoot: string;
  readonly scannedFileCount: number;
  readonly contractCount: number;
  readonly missingContractCount: number;
  readonly invalidContractCount: number;
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

export function auditSurfaceContracts(args: SurfaceContractAuditArgs): SurfaceContractAuditResult {
  const mode = args.mode ?? "all";
  const files = filesForMode(args.pluginRoot, mode);
  const findings: SurfaceContractAuditFinding[] = [];
  let contractCount = 0;
  let missingContractCount = 0;
  let invalidContractCount = 0;

  for (const filePath of files) {
    const parsed = parseSurfaceContractFromMarkdown(fs.readFileSync(filePath, "utf8"));
    if (parsed.contract) contractCount += 1;
    if (parsed.source === "missing") missingContractCount += 1;
    if (parsed.source !== "missing" && parsed.issues.some((issue) => issue.severity === "fail")) {
      invalidContractCount += 1;
    }
    if (parsed.issues.length > 0) {
      findings.push({
        filePath: path.relative(args.pluginRoot, filePath),
        surfaceKind: kindForPath(args.pluginRoot, filePath),
        issues: parsed.issues,
      });
    }
  }

  const hasFailures = invalidContractCount > 0 || (args.failClosed === true && missingContractCount > 0);
  return {
    status: hasFailures ? "fail" : missingContractCount > 0 ? "advisory" : "pass",
    mode,
    pluginRoot: args.pluginRoot,
    scannedFileCount: files.length,
    contractCount,
    missingContractCount,
    invalidContractCount,
    findings,
  };
}
