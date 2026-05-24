// palantir-mini v3.13.0 — sprint-terminal-detector hook (BackProp loop closure P2)
// Fires on: PostToolUse with matcher mcp__plugin_palantir-mini_palantir-mini__commit_edits
//
// Per sprint-006 plan §T3 + rule 16 §Loop step 5:
// When commit_edits closes a sprint (verdict=pass AND/OR iterationLimit reached),
// atomically marks contract.json status="completed" and emits sprint_completed.
//
// Logic:
//   1. tool_name gate — only handles commit_edits
//   2. cwd → projectRoot via findProjectRoot
//   3. findBoundContract() — or find any completed-candidate contract
//   4. Read contract.json — if status="completed" → idempotency no-op
//   5. Extract verdict from tool_response (passedCriteria / failedCriteria / perCriterion)
//   6. Iteration-limit check: compare tool_input.iteration vs contract.iterationLimit
//   7. Terminal condition (verdict=pass OR iterationLimit reached) → write completed + emit
//   8. Return decision="continue" + additionalContext
//
// Authority: ~/.claude/rules/16-3-agent-harness.md §Loop step 5 (pass) commit
//            ~/.claude/plans/tidy-stargazing-papert.md §T3
//            ~/.claude/plugins/palantir-mini/lib/event-log/types.ts SprintCompletedEnvelope

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot, harnessDirExists } from "./harness-base-mode-advisory";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";

const TARGET_TOOL = "commit_edits";

interface HookPayload {
  cwd?:         string;
  session_id?:  string;
  tool_name?:   string;
  tool_input?: {
    project?:    string;
    iteration?:  number;
    dryRunRef?:  string;
  };
  tool_response?: {
    verdict?:          "pass" | "fail" | "timeout" | "aborted";
    passedCriteria?:   number;
    failedCriteria?:   number;
    overallScore?:     number;
    maxPossibleScore?: number;
    perCriterion?:     Array<{ passFail?: "pass" | "fail" | "needs_human_review" }>;
    sprintNumber?:     number;
    iterationCount?:   number;
    contractId?:       string;
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
  closedAt?:       string;
  [key: string]:   unknown;
}

/** Derive overall verdict from tool_response. Returns "pass", "fail", or null. */
function deriveVerdict(resp: HookPayload["tool_response"]): "pass" | "fail" | null {
  if (!resp) return null;
  // Explicit verdict field (preferred)
  if (resp.verdict === "pass" || resp.verdict === "fail") return resp.verdict;
  // Numeric failedCriteria
  if (typeof resp.failedCriteria === "number" && typeof resp.passedCriteria === "number") {
    return resp.failedCriteria === 0 ? "pass" : "fail";
  }
  // perCriterion array
  if (Array.isArray(resp.perCriterion)) {
    const hasFail = resp.perCriterion.some((c) => c.passFail === "fail");
    return hasFail ? "fail" : "pass";
  }
  return null;
}

/** Derive best score (0–1) from tool_response. */
function deriveBestScore(resp: HookPayload["tool_response"]): number {
  if (!resp) return 0;
  if (
    typeof resp.overallScore === "number" &&
    typeof resp.maxPossibleScore === "number" &&
    resp.maxPossibleScore > 0
  ) {
    return resp.overallScore / resp.maxPossibleScore;
  }
  return 0;
}

/**
 * Like findBoundContract() but also returns "completed"-status contracts
 * that were just closed, so the idempotency guard can catch them.
 * Returns the absolute path to contract.json (or null).
 */
function findAnyActiveContract(projectRoot: string): { contractPath: string; obj: ContractJson } | null {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return null;
  const entries = fs.readdirSync(sprintsDir, { withFileTypes: true });
  // Prefer bound → then completed (idempotency), skip others
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

export default async function sprintTerminalDetector(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  // 1. tool_name gate
  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return {
      message: `palantir-mini: sprint-terminal-detector skipped (tool=${toolName})`,
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
      message: "palantir-mini: sprint-terminal-detector skipped (no-harness-dir)",
      decision: "continue",
      additionalContext: "no-bound-contract",
    };
  }

  // 3. Locate active contract
  const contractHit = findAnyActiveContract(projectRoot);
  if (!contractHit) {
    return {
      message: "palantir-mini: sprint-terminal-detector skipped (no-bound-contract)",
      decision: "continue",
      additionalContext: "no-bound-contract",
    };
  }

  const { contractPath, obj: contract } = contractHit;

  // 4. Idempotency — already completed
  if (contract.status === "completed") {
    return {
      message: `palantir-mini: sprint-terminal-detector no-op (contract already completed: ${path.basename(path.dirname(contractPath))})`,
      decision: "continue",
    };
  }

  // 5. Extract verdict
  const verdict = deriveVerdict(p.tool_response);
  if (!verdict) {
    return {
      message: "palantir-mini: sprint-terminal-detector skipped (verdict-indeterminate)",
      decision: "continue",
    };
  }

  // 6. Iteration-limit check
  const iteration     = p.tool_input?.iteration ?? p.tool_response?.iterationCount ?? 1;
  const iterationLimit = typeof contract.iterationLimit === "number" ? contract.iterationLimit : Infinity;
  const limitReached  = iteration >= iterationLimit;

  // Terminal = pass verdict OR iteration limit reached (forced close)
  const isTerminal = verdict === "pass" || limitReached;

  if (!isTerminal) {
    return {
      message: `palantir-mini: sprint-terminal-detector skipped (non-terminal: verdict=${verdict}, iter=${iteration}/${iterationLimit})`,
      decision: "continue",
    };
  }

  // 7. Atomic contract.json write — status=completed + closedAt
  const closedAt    = new Date().toISOString();
  const contractId  = contract.contractId ?? path.basename(path.dirname(contractPath));
  const sprintNumber = contract.sprintNumber ?? p.tool_response?.sprintNumber ?? -1;
  const iterationCount = p.tool_response?.iterationCount ?? iteration;
  const bestScore    = deriveBestScore(p.tool_response);
  const terminationCriteria: string[] = verdict === "pass"
    ? ["threshold_met"]
    : ["iteration_limit_reached"];

  const updatedContract: ContractJson = {
    ...contract,
    status:    "completed",
    closedAt,
  };

  try {
    fs.writeFileSync(contractPath, JSON.stringify(updatedContract, null, 2), "utf8");
  } catch (e) {
    return {
      message: `palantir-mini: sprint-terminal-detector contract write failed: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  // 8. Emit sprint_completed envelope
  try {
    await emit({
      type: "sprint_completed",
      payload: {
        project:             projectRoot,
        sprintNumber,
        contractId,
        verdict:             verdict === "pass" ? "passed" : "failed",
        iterationCount,
        bestScore,
        terminationCriteria,
      },
      toolName: "sprint-terminal-detector",
      cwd:      projectRoot,
      sessionId,
      identity: "monitor",
      reasoning: `sprint-terminal-detector: sprint ${sprintNumber} closed (verdict=${verdict}, iter=${iteration}/${iterationLimit}, contractId=${contractId})`,
    });
  } catch {
    // best-effort — contract write already succeeded; emission failure is non-fatal
  }

  return {
    message: `palantir-mini: sprint-terminal-detector closed sprint ${sprintNumber} (verdict=${verdict}, iter=${iteration}/${iterationLimit})`,
    decision: "continue",
    additionalContext: [
      "=== SPRINT TERMINAL DETECTED ===",
      `Sprint ${sprintNumber} (${contractId}) closed.`,
      `Verdict: ${verdict} | Iteration: ${iteration}/${iterationLimit} | Best score: ${bestScore.toFixed(3)}`,
      `contract.json status=completed written at ${closedAt}`,
      `sprint_completed event emitted — BackProp loop P2 substrate active.`,
    ].join("\n"),
  };
}
