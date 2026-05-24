import * as fs from "fs";
import * as path from "path";

export interface SprintContractRecord {
  readonly contractId?: string;
  readonly status?: string;
  readonly mode?: string;
  readonly sprintNumber?: number;
  readonly boundAt?: string;
  readonly autoBootstrapped?: boolean;
  readonly [key: string]: unknown;
}

export interface ActiveSprintContract {
  readonly projectRoot: string;
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly contract: SprintContractRecord;
  readonly selectedBy: "current-json" | "inventory";
}

interface Candidate {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly contract: SprintContractRecord;
}

const CURRENT_KEYS = [
  "contractPath",
  "contractRelPath",
  "activeContractPath",
  "activeContractRelPath",
  "path",
] as const;

function harnessRoot(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "harness");
}

function readJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function asContract(value: unknown): SprintContractRecord | null {
  if (typeof value !== "object" || value === null) return null;
  return value as SprintContractRecord;
}

function loadContract(projectRoot: string, contractPath: string): Candidate | null {
  const absolutePath = path.isAbsolute(contractPath)
    ? contractPath
    : path.join(projectRoot, contractPath);
  const parsed = asContract(readJson(absolutePath));
  if (!parsed || parsed.status !== "bound") return null;
  return {
    absolutePath,
    relativePath: path.relative(projectRoot, absolutePath),
    contract: parsed,
  };
}

function currentJsonCandidate(projectRoot: string): Candidate | null {
  const currentPath = path.join(harnessRoot(projectRoot), "current.json");
  const current = readJson(currentPath);
  if (typeof current === "string") {
    return loadContract(projectRoot, current);
  }
  if (typeof current !== "object" || current === null) return null;
  const obj = current as Record<string, unknown>;
  for (const key of CURRENT_KEYS) {
    if (typeof obj[key] === "string") {
      const candidate = loadContract(projectRoot, obj[key]);
      if (candidate) return candidate;
    }
  }
  if (typeof obj.sprintId === "string") {
    const candidate = loadContract(
      projectRoot,
      path.join(".palantir-mini", "harness", "sprints", obj.sprintId, "contract.json"),
    );
    if (candidate) return candidate;
  }
  if (typeof obj.sprintDir === "string") {
    const candidate = loadContract(projectRoot, path.join(obj.sprintDir, "contract.json"));
    if (candidate) return candidate;
  }
  if (typeof obj.sprintNumber === "number") {
    const sprintsDir = path.join(harnessRoot(projectRoot), "sprints");
    if (!fs.existsSync(sprintsDir)) return null;
    const prefix = `sprint-${String(obj.sprintNumber).padStart(3, "0")}`;
    for (const ent of fs.readdirSync(sprintsDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || !ent.name.startsWith(prefix)) continue;
      const candidate = loadContract(
        projectRoot,
        path.join(".palantir-mini", "harness", "sprints", ent.name, "contract.json"),
      );
      if (candidate) return candidate;
    }
  }
  return null;
}

function modeRank(mode: string | undefined): number {
  if (!mode) return 0;
  switch (mode) {
    case "strict":
      return 5;
    case "full":
      return 4;
    case "lite":
      return 3;
    case "quick":
      return 2;
    default:
      return 1;
  }
}

function timestampRank(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  const boundAtDiff = timestampRank(b.contract.boundAt) - timestampRank(a.contract.boundAt);
  if (boundAtDiff !== 0) return boundAtDiff;

  const sprintDiff = (b.contract.sprintNumber ?? -1) - (a.contract.sprintNumber ?? -1);
  if (sprintDiff !== 0) return sprintDiff;

  const modeDiff = modeRank(b.contract.mode) - modeRank(a.contract.mode);
  if (modeDiff !== 0) return modeDiff;

  const manualDiff = Number(a.contract.autoBootstrapped === true) -
    Number(b.contract.autoBootstrapped === true);
  if (manualDiff !== 0) return manualDiff;

  return b.relativePath.localeCompare(a.relativePath);
}

function inventoryCandidates(projectRoot: string): Candidate[] {
  const sprintsDir = path.join(harnessRoot(projectRoot), "sprints");
  if (!fs.existsSync(sprintsDir)) return [];
  const candidates: Candidate[] = [];
  for (const ent of fs.readdirSync(sprintsDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const candidate = loadContract(
      projectRoot,
      path.join(".palantir-mini", "harness", "sprints", ent.name, "contract.json"),
    );
    if (candidate) candidates.push(candidate);
  }
  return candidates.sort(compareCandidates);
}

export function findActiveBoundContract(projectRoot: string): ActiveSprintContract | null {
  const current = currentJsonCandidate(projectRoot);
  if (current) {
    return { projectRoot, ...current, selectedBy: "current-json" };
  }
  const [first] = inventoryCandidates(projectRoot);
  return first ? { projectRoot, ...first, selectedBy: "inventory" } : null;
}

export function findActiveBoundContractPath(projectRoot: string): string | null {
  return findActiveBoundContract(projectRoot)?.relativePath ?? null;
}
