import * as fs from "node:fs";
import * as path from "node:path";
import type { OntologyEngineeringWorkflowState } from "./types";

export interface WriteOntologyEngineeringWorkflowStateResult {
  readonly statePath: string;
  readonly currentPath: string;
}

function safeSegment(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128) || "workflow";
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
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
    `${safeSegment(workflowId)}.json`,
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
  atomicWriteJson(statePath, state);
  atomicWriteJson(currentPath, state);
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
