// palantir-mini v3.4.0 — MCP tool handler: negotiate_sprint_contract
// Domain: ACTION (prim-action-05 SprintContract)
//
// Thin orchestrator after v3.4.0 N1-LARGE wave 2 decomposition. Logic extracted
// to ./negotiate-sprint-contract/{types, state, read-action, write-action}.ts.
//
// File-based IPC substrate for Generator↔Evaluator SprintContract negotiation.
// Reads/writes <project>/.palantir-mini/harness/sprints/sprint-<NNN>/contract-negotiation.md
// and emits sprint_contract_negotiated (per round) + sprint_contract_bound (on approval).
//
// Stateless — Generator and Evaluator agents drive negotiation via repeated calls.
//
// v4.2.0 handler-v3.X — Quick Sprint single-round binding (rule 16 §Quick Sprint single-round):
// When role=orchestrator + action=propose + contract.mode="quick" + inline rubric/criteria
// is present, the contract binds atomically in a single call. Non-Quick modes (full/lite/strict)
// retain the 3-round handshake unchanged.
//
// Authority: ~/.claude/schemas/ontology/primitives/sprint-contract.ts
// Rules: 07 (file-ownership), 10 (5-dim emit), 16 (harness 2-role default + v4.2.0 Quick single-round)

import * as fs from "fs";
import * as path from "path";
import { projectRoot as resolveProjectRoot } from "../../scripts/log";
import { handleReadAction } from "./negotiate-sprint-contract/read-action";
import { handleWriteAction } from "./negotiate-sprint-contract/write-action";
import { loadOrInitNegotiation, parseNegotiationState } from "./negotiate-sprint-contract/state";
import { bindContract } from "./negotiate-sprint-contract/bind";
import { appendRoundBlock } from "./negotiate-sprint-contract/record";
import { sprintDir } from "./negotiate-sprint-contract/types";
import type {
  NegotiateSprintContractArgs,
  NegotiateSprintContractResult,
} from "./negotiate-sprint-contract/types";

// Backward-compat re-exports
export type {
  NegotiateAction,
  NegotiateSprintContractArgs,
  NegotiateSprintContractResult,
  ArbitrationPolicy,
  ArbitrationSignal,
} from "./negotiate-sprint-contract/types";

/**
 * Quick Sprint auto-bind eligibility check (rule 16 v4.2.0).
 *
 * Returns true when all conditions are met for single-round binding:
 * 1. role === "orchestrator" (Lead is the sole actor in Quick Sprint)
 * 2. action === "propose" (first and only round)
 * 3. contract.mode === "quick"
 * 4. Contract has inline rubric OR successCriteriaRids (non-empty)
 *
 * Non-Quick modes and generator/evaluator proposers fall through to the
 * standard 3-round handshake. Quick mode without rubric/criteria also falls
 * through — rubric presence is a safety gate.
 */
function isQuickAutoBind(args: NegotiateSprintContractArgs): boolean {
  if (args.role !== "orchestrator") return false;
  if (args.action !== "propose") return false;
  const contract = args.contract as Record<string, unknown> | null | undefined;
  if (!contract) return false;
  if (contract["mode"] !== "quick") return false;

  // Must have at least one rubric criterion OR successCriteriaRid declared.
  const hasRubricInline =
    Array.isArray(contract["rubricInline"]) &&
    (contract["rubricInline"] as unknown[]).length > 0;
  const hasSuccessCriteria =
    Array.isArray(contract["successCriteriaRids"]) &&
    (contract["successCriteriaRids"] as unknown[]).length > 0;
  // Also accept GradingRubric nested inside the contract (sprint-pm-quick-sprint format)
  const hasGradingRubric =
    contract["gradingRubric"] != null &&
    typeof contract["gradingRubric"] === "object" &&
    Array.isArray((contract["gradingRubric"] as { criteria?: unknown[] })["criteria"]) &&
    ((contract["gradingRubric"] as { criteria: unknown[] })["criteria"]).length > 0;

  return hasRubricInline || hasSuccessCriteria || hasGradingRubric;
}

export default async function negotiateSprintContract(
  rawArgs: unknown,
): Promise<NegotiateSprintContractResult> {
  const args = (rawArgs ?? {}) as NegotiateSprintContractArgs;
  if (typeof args.sprintNumber !== "number" || args.sprintNumber < 1) {
    throw new Error("negotiate_sprint_contract: `sprintNumber` (>=1) required");
  }
  if (!["generator", "evaluator", "orchestrator"].includes(args.role)) {
    throw new Error(
      "negotiate_sprint_contract: `role` must be generator|evaluator|orchestrator",
    );
  }
  if (!["propose", "counter", "approve", "read"].includes(args.action)) {
    throw new Error(
      "negotiate_sprint_contract: `action` must be propose|counter|approve|read",
    );
  }

  const project = args.projectPath ?? resolveProjectRoot();
  const dir = sprintDir(project, args.sprintNumber);
  fs.mkdirSync(dir, { recursive: true });
  const negotiationFile = path.join(dir, "contract-negotiation.md");
  const contractFile = path.join(dir, "contract.json");

  const content = loadOrInitNegotiation(negotiationFile, args.sprintNumber);
  const state = parseNegotiationState(content);

  if (args.action === "read") {
    return handleReadAction({ content, negotiationFile, contractFile });
  }

  const round = state.roundMatches.length + 1;

  // ── Quick Sprint single-round binding (rule 16 v4.2.0) ──────────────────────
  // When orchestrator proposes a quick-mode contract with inline rubric, bind
  // atomically in a single call. Lead proxies generator + evaluator implicitly.
  // Non-quick modes and ineligible quick contracts fall through to the standard
  // 3-round handleWriteAction path below.
  if (isQuickAutoBind(args)) {
    // Record the single propose round in the negotiation log for audit trail.
    appendRoundBlock(negotiationFile, args, round);

    // Bind the contract — reuses the same bindContract helper used by the 3-round path.
    // sprint_contract_bound event is emitted identically (audit trail preserved).
    const { writtenContractPath, finalContract } = await bindContract(
      {
        args,
        project,
        negotiationFile,
        contractFile,
        round,
      },
      args.contract,
    );

    return {
      status: "bound",
      round,
      generatorApproved: true,
      evaluatorApproved: true,
      latestProposal: finalContract,
      negotiationFile,
      contractFile: writtenContractPath,
      message:
        "Contract bound via Quick Sprint single-round binding (rule 16 v4.2.0). " +
        "Lead proxies generator + evaluator inline. No additional approve calls required.",
    };
  }
  // ────────────────────────────────────────────────────────────────────────────

  return handleWriteAction({
    args,
    project,
    negotiationFile,
    contractFile,
    round,
    generatorApproved: state.generatorApproved,
    evaluatorApproved: state.evaluatorApproved,
  });
}
