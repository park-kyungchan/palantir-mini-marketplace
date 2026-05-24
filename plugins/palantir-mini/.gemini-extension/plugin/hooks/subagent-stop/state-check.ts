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
  | { kind: "validated"; statePath: string; result: ValidationResult };

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
  return { kind: "validated", statePath: contract.statePath, result };
}
