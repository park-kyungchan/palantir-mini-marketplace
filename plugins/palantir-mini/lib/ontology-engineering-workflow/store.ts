import * as fs from "node:fs";
import * as path from "node:path";
import { atomicWriteJsonSync } from "../fs-atomic";
import { safeSegment } from "../id-segment";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import type { OntologyEngineeringWorkflowState } from "./types";

export interface WriteOntologyEngineeringWorkflowStateResult {
  readonly statePath: string;
  readonly currentPath: string;
}

export function ontologyEngineeringWorkflowStoreDir(projectRoot: string): string {
  return path.join(
    projectRoot,
    ".palantir-mini",
    "session",
    "ontology-engineering-workflow",
  );
}

export function ontologyEngineeringWorkflowStatePath(
  projectRoot: string,
  workflowId: string,
): string {
  return path.join(
    ontologyEngineeringWorkflowStoreDir(projectRoot),
    `${safeSegment(workflowId, { fallback: "workflow", maxLen: 128, allowColon: true })}.json`,
  );
}

export function ontologyEngineeringWorkflowCurrentPath(projectRoot: string): string {
  return path.join(ontologyEngineeringWorkflowStoreDir(projectRoot), "current.json");
}

export function writeOntologyEngineeringWorkflowState(
  state: OntologyEngineeringWorkflowState,
): WriteOntologyEngineeringWorkflowStateResult {
  const statePath = ontologyEngineeringWorkflowStatePath(state.projectRoot, state.contractId);
  const currentPath = ontologyEngineeringWorkflowCurrentPath(state.projectRoot);
  atomicWriteJsonSync(statePath, state);
  atomicWriteJsonSync(currentPath, state);
  return { statePath, currentPath };
}

export function readOntologyEngineeringWorkflowState(
  projectRoot: string,
  workflowId: string,
): OntologyEngineeringWorkflowState | null {
  const statePath = ontologyEngineeringWorkflowStatePath(projectRoot, workflowId);
  if (!fs.existsSync(statePath)) return null;
  return JSON.parse(fs.readFileSync(statePath, "utf8")) as OntologyEngineeringWorkflowState;
}

export function readCurrentOntologyEngineeringWorkflowState(
  projectRoot: string,
): OntologyEngineeringWorkflowState | null {
  const currentPath = ontologyEngineeringWorkflowCurrentPath(projectRoot);
  if (!fs.existsSync(currentPath)) return null;
  return JSON.parse(fs.readFileSync(currentPath, "utf8")) as OntologyEngineeringWorkflowState;
}

/**
 * Resolve the MINTED approved-SIC snapshot BY-REF for THIS projectRoot, independent
 * of which session is active (bd-011 fix). The snapshot is persisted ONLY onto the
 * MINTING session's session-keyed file; a fresh `start` in a non-minting session
 * creates a snapshot-less session file AND overwrites `current.json` (last-writer-wins),
 * so neither the active session-keyed read nor `current.json` can see it. Scan every
 * persisted workflow state for this projectRoot and return the first that carries a
 * snapshot field. The CALLER re-verifies it via `isApprovedSemanticIntentContract`
 * (fail-closed) — this resolver does NOT validate; it only widens the READ scope.
 *
 * When `preferContractId` is supplied (the active state's `semanticIntentContractRef`),
 * a snapshot whose `contractId` matches is preferred, so the resolved snapshot binds
 * to the SIC the active workflow already references rather than an arbitrary prior one.
 *
 * F3 — fail-closed ONLY when AMBIGUOUS. With no `preferContractId`, returning the
 * readdir FIRST-MATCH risks binding the resume to the wrong concept when multiple
 * distinct minted SICs coexist on disk. So: exactly ONE distinct minted-approved
 * contractId ⇒ return it (preserves the bd-011 single-SIC cross-session resume);
 * >=2 DISTINCT minted contractIds and no `preferContractId` ⇒ return undefined
 * (fail-closed; the caller's gate refuses rather than bind an arbitrary concept).
 */
export function resolveProjectMintedSicSnapshot(
  projectRoot: string,
  preferContractId?: string,
): SemanticIntentContract | undefined {
  const dir = ontologyEngineeringWorkflowStoreDir(projectRoot);
  if (!fs.existsSync(dir)) return undefined;
  // Track distinct minted contractIds so we can fail-closed on ambiguity. The first
  // snapshot seen for each contractId is retained (snapshots sharing a contractId are
  // the same concept; only DISTINCT contractIds create the wrong-concept risk).
  const byContractId = new Map<string, SemanticIntentContract>();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    let state: OntologyEngineeringWorkflowState;
    try {
      state = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as OntologyEngineeringWorkflowState;
    } catch {
      continue; // skip unreadable/partial files; fail-closed by omission
    }
    const snapshot = state.approvedSemanticIntentContractSnapshot;
    if (snapshot === undefined) continue;
    if (preferContractId !== undefined && snapshot.contractId === preferContractId) {
      return snapshot; // exact bind to the active workflow's SIC ref — best match
    }
    if (!byContractId.has(snapshot.contractId)) byContractId.set(snapshot.contractId, snapshot);
  }
  // No `preferContractId` match above. Single distinct minted SIC ⇒ unambiguous resume.
  // Zero or >=2 distinct ⇒ fail-closed (undefined): the caller's gate then refuses.
  if (byContractId.size === 1) return byContractId.values().next().value;
  return undefined;
}
