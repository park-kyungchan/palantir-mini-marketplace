/**
 * palantir-mini v6.22.0 — SprintContract runtime validation (advisory)
 *
 * Pure functions for 4 advisory checks wired into negotiate_sprint_contract:
 *   1. isValidTransition       — legal status → status transitions
 *   2. isValidActionForStatus  — legal action × status pairings
 *   3. findSprintNumberCollisions — duplicate sprintNumber in same projectPath
 *   4. findMissingScopePaths   — scope paths that don't resolve on disk
 *
 * All functions are ADVISORY only — callers emit validation_phase_completed
 * events but continue execution (soft guard). Per canonical plan v2 §4 row 5.2.
 *
 * Authority: ~/.claude/schemas/ontology/primitives/sprint-contract.ts
 * Rules: 10 (5-dim emit), 16 (sprint-harness species)
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Check 1 — Status transition validity
// Legal sequence: drafting → negotiating → bound → (passed|failed|aborted)
//                 drafting → aborted (early abort allowed)
//                 negotiating → aborted (early abort allowed)
// The SprintContractStatus enum in the schema has:
//   "drafting" | "negotiating" | "bound" | "aborted"
// Runtime states (not in schema status field but used in negotiate result):
//   "in-progress" | "passed" | "failed"
// We treat the full lifecycle to cover what the plan describes.
// ---------------------------------------------------------------------------

export type ContractStatus =
  | "drafting"
  | "negotiating"
  | "bound"
  | "in-progress"
  | "passed"
  | "failed"
  | "aborted";

/**
 * VALID_TRANSITIONS maps each "from" status to the set of legal "to" statuses.
 * Terminal states (passed, failed, aborted) cannot transition to anything.
 */
const VALID_TRANSITIONS: Readonly<Record<ContractStatus, ReadonlySet<ContractStatus>>> = {
  drafting:      new Set<ContractStatus>(["negotiating", "bound", "aborted"]),
  negotiating:   new Set<ContractStatus>(["bound", "aborted"]),
  bound:         new Set<ContractStatus>(["in-progress", "aborted"]),
  "in-progress": new Set<ContractStatus>(["passed", "failed", "aborted"]),
  passed:        new Set<ContractStatus>(),
  failed:        new Set<ContractStatus>(),
  aborted:       new Set<ContractStatus>(),
};

/**
 * Returns true when transitioning from → to is a legal status progression.
 * Pure function — no side effects.
 */
export function isValidTransition(from: ContractStatus, to: ContractStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

// ---------------------------------------------------------------------------
// Check 2 — Action × status invariant
// Valid pairings per plan v2 §4 row 5.2:
//   action="approve"  → status must be "negotiating"
//   action="counter"  → status must be "negotiating"
//   action="propose"  → status must be "drafting" or "negotiating"
//   action="read"     → any status (read-only; always valid)
// ---------------------------------------------------------------------------

export type NegotiateAction = "propose" | "counter" | "approve" | "read";
export type NegotiationStatus = "negotiating" | "bound" | "aborted";

/**
 * Returns true when the given action is valid for the given contract status.
 * "status" here is the runtime negotiation status (negotiating/bound/aborted),
 * not the full ContractStatus lifecycle. Pure function — no side effects.
 */
export function isValidActionForStatus(
  action: NegotiateAction,
  status: NegotiationStatus,
): boolean {
  switch (action) {
    case "read":
      return true; // always valid
    case "approve":
    case "counter":
      return status === "negotiating";
    case "propose":
      return status === "negotiating"; // "drafting" maps to first "negotiating" round in practice
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Check 3 — Sprint number collision detection
// Scan <projectPath>/.palantir-mini/harness/sprints/sprint-* directories for
// contract.json files that share the same sprintNumber but different contractId.
// ---------------------------------------------------------------------------

export interface SprintCollision {
  /** sprintNumber that collides */
  sprintNumber: number;
  /** The existing contractId found on disk */
  existingContractId: string;
  /** The new contractId being bound (or proposed) */
  incomingContractId: string;
  /** Absolute path to the directory with the existing contract.json */
  existingContractPath: string;
}

/**
 * Scans sprint directories under projectPath for contracts that share the
 * same sprintNumber as the incoming contract but carry a different contractId.
 * Returns an array of collision records (empty = no collision).
 * Pure function — only reads disk; no side effects.
 */
export function findSprintNumberCollisions(
  projectPath: string,
  sprintNumber: number,
  incomingContractId: string,
): SprintCollision[] {
  const sprintsDir = path.join(projectPath, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return [];

  const collisions: SprintCollision[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(sprintsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const contractPath = path.join(sprintsDir, entry, "contract.json");
    if (!fs.existsSync(contractPath)) continue;
    let parsed: { sprintNumber?: number; contractId?: string } | null = null;
    try {
      parsed = JSON.parse(fs.readFileSync(contractPath, "utf8")) as {
        sprintNumber?: number;
        contractId?: string;
      };
    } catch {
      continue;
    }
    if (
      parsed !== null &&
      typeof parsed.sprintNumber === "number" &&
      parsed.sprintNumber === sprintNumber &&
      typeof parsed.contractId === "string" &&
      parsed.contractId !== incomingContractId
    ) {
      collisions.push({
        sprintNumber,
        existingContractId: parsed.contractId,
        incomingContractId,
        existingContractPath: path.join(sprintsDir, entry),
      });
    }
  }
  return collisions;
}

// ---------------------------------------------------------------------------
// Check 4 — Scope path existence validation
// For each path in inputs[].scopePaths (if the field exists on the contract),
// verify the path resolves relative to projectPath. Non-existent → advisory.
// ---------------------------------------------------------------------------

export interface MissingScopePath {
  /** The raw scope path as declared in the contract */
  scopePath: string;
  /** The resolved absolute path that does not exist */
  resolvedPath: string;
  /** featureId of the input that declares this scopePath */
  featureId?: string;
}

/**
 * Checks each scopePath entry in inputs[].scopePaths against the filesystem.
 * Returns a list of paths that could not be resolved (relative to projectPath).
 * Glob patterns (contain `*` or `?`) are accepted as-is and not checked.
 * Pure function — only reads disk; no side effects.
 */
export function findMissingScopePaths(
  projectPath: string,
  contract: unknown,
): MissingScopePath[] {
  if (!contract || typeof contract !== "object" || contract === null) return [];
  const c = contract as { inputs?: unknown };
  if (!Array.isArray(c.inputs)) return [];

  const missing: MissingScopePath[] = [];

  for (const input of c.inputs as unknown[]) {
    if (!input || typeof input !== "object") continue;
    const inp = input as { featureId?: string; scopePaths?: unknown };
    if (!Array.isArray(inp.scopePaths)) continue;

    for (const sp of inp.scopePaths as unknown[]) {
      if (typeof sp !== "string") continue;
      // Skip glob patterns
      if (sp.includes("*") || sp.includes("?")) continue;
      // Resolve relative to projectPath
      const resolved = path.isAbsolute(sp) ? sp : path.join(projectPath, sp);
      if (!fs.existsSync(resolved)) {
        missing.push({
          scopePath: sp,
          resolvedPath: resolved,
          ...(typeof inp.featureId === "string" ? { featureId: inp.featureId } : {}),
        });
      }
    }
  }
  return missing;
}
