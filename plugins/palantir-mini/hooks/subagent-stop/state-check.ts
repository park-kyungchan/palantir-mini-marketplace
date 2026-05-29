// palantir-mini v3.7.0 — hooks/subagent-stop/state-check.ts
// State file existence + JSON parse + contract validation pipeline.
// Extracted from subagent-stop.ts during A.1 decomposition.

import * as fs from "fs";
import * as path from "path";
import type { OutputContract, ValidationResult } from "./types";
import { validateAgainstContract } from "./contract";

export type StateCheckOutcome =
  | { kind: "missing"; statePath: string }
  | { kind: "invalid-json"; statePath: string; message: string }
  | { kind: "missing-markdown-report"; statePath: string; markdownReportPath: string }
  | { kind: "invalid-markdown-report"; statePath: string; markdownReportPath: string; message: string }
  | { kind: "validated"; statePath: string; markdownReportPath?: string; result: ValidationResult };

/**
 * Resolves the contract's statePath against cwd, then:
 *   - missing → "missing"
 *   - parse fails → "invalid-json"
 *   - parse ok → run validateAgainstContract → "validated"
 */
export function checkStateFile(contract: OutputContract, cwd: string): StateCheckOutcome {
  const statePath = path.isAbsolute(contract.statePath)
    ? contract.statePath
    : path.resolve(cwd, contract.statePath);

  if (!fs.existsSync(statePath)) {
    return { kind: "missing", statePath: contract.statePath };
  }

  let parsed: unknown;
  try {
    const raw = fs.readFileSync(statePath, "utf8");
    parsed = JSON.parse(raw);
  } catch (e) {
    return { kind: "invalid-json", statePath: contract.statePath, message: (e as Error).message };
  }

  const result = validateAgainstContract(parsed, contract);
  if (!result.passed) {
    return { kind: "validated", statePath: contract.statePath, result };
  }

  const markdownReportPath = contract.markdownReportPath?.trim();
  if (!markdownReportPath) {
    return { kind: "validated", statePath: contract.statePath, result };
  }

  if (path.extname(markdownReportPath).toLowerCase() !== ".md") {
    return {
      kind: "invalid-markdown-report",
      statePath: contract.statePath,
      markdownReportPath,
      message: "markdownReportPath must end with .md",
    };
  }

  const resolvedMarkdownReportPath = path.isAbsolute(markdownReportPath)
    ? markdownReportPath
    : path.resolve(cwd, markdownReportPath);

  if (!fs.existsSync(resolvedMarkdownReportPath)) {
    return { kind: "missing-markdown-report", statePath: contract.statePath, markdownReportPath };
  }

  try {
    const stat = fs.statSync(resolvedMarkdownReportPath);
    if (!stat.isFile()) {
      return {
        kind: "invalid-markdown-report",
        statePath: contract.statePath,
        markdownReportPath,
        message: "markdownReportPath does not point to a file",
      };
    }
    if (stat.size === 0) {
      return {
        kind: "invalid-markdown-report",
        statePath: contract.statePath,
        markdownReportPath,
        message: "markdown report file is empty",
      };
    }
  } catch (e) {
    return {
      kind: "invalid-markdown-report",
      statePath: contract.statePath,
      markdownReportPath,
      message: (e as Error).message,
    };
  }

  return { kind: "validated", statePath: contract.statePath, markdownReportPath, result };
}
