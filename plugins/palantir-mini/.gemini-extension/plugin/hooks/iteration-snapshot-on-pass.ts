// palantir-mini v4.6.0 — iteration-snapshot-on-pass hook (sprint-052 W4.A)
// Fires on: PostToolUse with matcher mcp__plugin_palantir-mini_palantir-mini__commit_edits
//
// Records a content-addressable iteration snapshot (git tree-sha + manifestRef)
// whenever commit_edits closes a non-quick sprint iteration. Enables exact-state
// replay and resume for full/lite/strict sprint modes.
//
// Logic:
//   1. tool_name gate — only handles commit_edits
//   2. cwd → projectRoot via findProjectRoot
//   3. findBoundContract() — resolve latest active/completed contract
//   4. If contract.mode === "quick" → exit 0 (no snapshot for quick sprints)
//   5. Compute git tree-sha via `git write-tree`
//   6. Compute manifestRef: sha256 of {sprintId, iteration, sortedChangedFiles}
//   7. Resolve iterationDir from contract
//   8. Emit iteration_snapshot_taken envelope (rule 10 5-dim + rule 26)
//
// Authority: ~/.claude/rules/16-3-agent-harness.md §Loop step 5
//            ~/.claude/rules/10-events-jsonl.md §5 dimensions
//            ~/.claude/rules/26-valuable-data-standard.md §Axis E

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";
import { emit } from "../scripts/log";
import { findProjectRoot, harnessDirExists } from "./harness-base-mode-advisory";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";

const TARGET_TOOL = "commit_edits";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?:       string;
    iteration?:     number;
    changedFiles?:  string[];
    dryRunRef?:     string;
  };
  tool_response?: {
    verdict?:         "pass" | "fail" | "timeout" | "aborted";
    sprintNumber?:    number;
    iterationCount?:  number;
    contractId?:      string;
  };
}

interface HookResult {
  message:            string;
  decision?:          "continue";
  reason?:            string;
  additionalContext?: string;
}

interface ContractJson {
  status?:         string;
  contractId?:     string;
  sprintNumber?:   number;
  iterationLimit?: number;
  mode?:           string;
  [key: string]:   unknown;
}

/**
 * Walks up from startDir searching for the latest sprint contract.
 * Returns { contractPath, obj } for bound or completed contracts.
 */
function findAnyActiveContract(
  projectRoot: string,
): { contractPath: string; obj: ContractJson } | null {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return null;

  const entries = fs.readdirSync(sprintsDir, { withFileTypes: true });
  let boundHit:     { contractPath: string; obj: ContractJson } | null = null;
  let completedHit: { contractPath: string; obj: ContractJson } | null = null;

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const contractPath = path.join(sprintsDir, ent.name, "contract.json");
    if (!fs.existsSync(contractPath)) continue;
    try {
      const obj = JSON.parse(fs.readFileSync(contractPath, "utf8")) as ContractJson;
      if (obj?.status === "bound") {
        boundHit = { contractPath, obj };
        break; // bound wins immediately
      }
      if (obj?.status === "completed" && !completedHit) {
        completedHit = { contractPath, obj };
      }
    } catch {
      // skip malformed
    }
  }
  return boundHit ?? completedHit;
}

/** Compute git tree-sha via `git write-tree`. Returns empty string on failure. */
function gitWriteTree(cwd: string): string {
  try {
    return execSync("git write-tree", { cwd, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** git rev-parse HEAD — best-effort. */
function gitHeadSha(cwd: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd, encoding: "utf8" }).trim();
  } catch {
    return "no-git";
  }
}

/** Compute sha256-based manifestRef from stable JSON of identifying fields. */
function computeManifestRef(
  sprintId: string,
  iteration: number,
  changedFiles: string[],
): string {
  const sorted = [...changedFiles].sort();
  const payload = JSON.stringify({ sprintId, iteration, sortedChangedFiles: sorted });
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Resolve the sprint iteration directory (relative). */
function resolveIterationDir(contractPath: string, iteration: number): string {
  // contractPath = <projectRoot>/.palantir-mini/harness/sprints/<sprint-id>/contract.json
  const sprintDir = path.dirname(contractPath);
  return path.join(sprintDir, "iterations", `iteration-${String(iteration).padStart(3, "0")}`);
}

export default async function iterationSnapshotOnPass(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  // 1. tool_name gate
  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return {
      message: `palantir-mini: iteration-snapshot-on-pass skipped (tool=${toolName})`,
      decision: "continue",
    };
  }

  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id ?? "no-session";

  // 2. Resolve projectRoot
  const projectFromInput = p.tool_input?.project;
  const projectRoot = (projectFromInput && projectFromInput.length > 0)
    ? projectFromInput
    : findProjectRoot(cwd);

  if (!projectRoot || !harnessDirExists(projectRoot)) {
    return {
      message: "palantir-mini: iteration-snapshot-on-pass skipped (no-harness-dir)",
      decision: "continue",
    };
  }

  // 3. Locate active contract
  const contractHit = findAnyActiveContract(projectRoot);
  if (!contractHit) {
    return {
      message: "palantir-mini: iteration-snapshot-on-pass skipped (no-bound-contract)",
      decision: "continue",
    };
  }

  const { contractPath, obj: contract } = contractHit;

  // 4. Quick sprint guard — no snapshots for mode=quick
  if (contract.mode === "quick") {
    return {
      message: "palantir-mini: iteration-snapshot-on-pass skipped (mode=quick)",
      decision: "continue",
    };
  }

  // Only snapshot on pass verdict (or when passed_criteria derived is clear)
  const verdict = p.tool_response?.verdict;
  if (verdict && verdict !== "pass") {
    return {
      message: `palantir-mini: iteration-snapshot-on-pass skipped (verdict=${verdict}, not pass)`,
      decision: "continue",
    };
  }

  // 5. Compute git tree-sha
  const worktreeRef = gitWriteTree(projectRoot);
  const headSha     = gitHeadSha(projectRoot);

  // 6. Compute manifestRef
  const iteration    = p.tool_input?.iteration ?? p.tool_response?.iterationCount ?? 1;
  const changedFiles = p.tool_input?.changedFiles ?? [];
  const contractId   = contract.contractId
    ?? p.tool_response?.contractId
    ?? path.basename(path.dirname(contractPath));
  const sprintId     = contractId;

  const manifestRef = computeManifestRef(sprintId, iteration, changedFiles);

  // 7. Resolve iterationDir (relative to projectRoot)
  const iterationDirAbs = resolveIterationDir(contractPath, iteration);
  const iterationDir    = path.relative(projectRoot, iterationDirAbs);

  // Ensure the iteration directory exists (best-effort; allows snapshot to land there)
  try {
    fs.mkdirSync(iterationDirAbs, { recursive: true });
  } catch {
    // non-fatal — emit proceeds even if mkdir fails
  }

  const sprintNumber = contract.sprintNumber ?? p.tool_response?.sprintNumber ?? -1;
  const mode         = (contract.mode as string | undefined) ?? "full";

  // 8. Emit iteration_snapshot_taken envelope (rule 10 5-dim + rule 26 valueGrade-aware)
  // NOTE: "iteration_snapshot_taken" is a pre-registration event type (W4.B adds it to the
  // schema enum). Until that schema bump lands, we cast through EventEnvelope["type"] to
  // satisfy the discriminated-union check — the append-only substrate accepts any string type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ITERATION_SNAPSHOT_EVENT_TYPE = "iteration_snapshot_taken" as any;
  try {
    await emit({
      type: ITERATION_SNAPSHOT_EVENT_TYPE,
      // payload cast needed: "iteration_snapshot_taken" is pre-registration (W4.B adds it to schema).
      // The append-only substrate accepts any payload object; cast bypasses discriminated-union check.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: {
        worktreeRef,
        manifestRef,
        iterationDir,
        sprintId,
        iteration,
        mode,
        sprintNumber,
      } as any,
      toolName:   "iteration-snapshot-on-pass",
      cwd:        projectRoot,
      sessionId,
      identity:   "monitor",
      reasoning:  `iteration ${iteration} pass-verdict snapshot for content-addressable resume`,
      hypothesis: "git tree-sha + iteration dir restoration enables exact-state replay",
      refinementTarget: {
        // "event-type-add": schema W4.B will add iteration_snapshot_taken to EventEnvelope union
        kind:            "event-type-add" as const,
        filePathOrRid:   "iteration-snapshot-content-addressable",
        description:     "iteration snapshot hook enabling exact-state replay — schema W4.B adds the envelope type",
        confidenceLevel: "high",
      },
      memoryLayers:     ["procedural", "episodic"],
      propagationDepth: 0,
    });
  } catch {
    // best-effort — emission failure is non-fatal
  }

  return {
    message:   `palantir-mini: iteration-snapshot-on-pass recorded iteration ${iteration} (sprint=${sprintId}, mode=${mode})`,
    decision:  "continue",
    additionalContext: [
      "=== ITERATION SNAPSHOT RECORDED ===",
      `Sprint: ${sprintId} (sprintNumber=${sprintNumber}) | mode=${mode}`,
      `Iteration: ${iteration} | worktreeRef: ${worktreeRef || "(none)"}`,
      `manifestRef: ${manifestRef}`,
      `iterationDir: ${iterationDir}`,
      `headSha: ${headSha}`,
      "iteration_snapshot_taken event emitted — content-addressable resume enabled.",
    ].join("\n"),
  };
}
