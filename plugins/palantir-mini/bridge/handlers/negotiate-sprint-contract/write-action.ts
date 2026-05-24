// palantir-mini v6.22.0 — negotiate-sprint-contract sibling: write-action orchestrator
// v3.5.0 N1-LARGE wave 3 decomposition (was 218 LOC). Helpers extracted to
// ./policy.ts (checkPolicyThreshold), ./bind.ts (bindContract), ./record.ts
// (appendRoundBlock + computeApprovals). Public API unchanged: handleWriteAction.
// v6.22.0: advisory check 2 (action × status invariant) wired in (sprint-112 PR 5.2).

import { emit } from "../../../scripts/log";
import { extractPolicy } from "./state";
import { appendRoundBlock, computeApprovals } from "./record";
import { bindContract } from "./bind";
import { checkPolicyThreshold } from "./policy";
import {
  isValidActionForStatus,
  type NegotiateAction,
  type NegotiationStatus,
} from "../../../lib/sprint-contract/validation";
import type {
  ArbitrationSignal,
  NegotiateSprintContractArgs,
  NegotiateSprintContractResult,
} from "./types";

export interface WriteActionArgs {
  args: NegotiateSprintContractArgs;
  project: string;
  negotiationFile: string;
  contractFile: string;
  round: number;
  generatorApproved: boolean;
  evaluatorApproved: boolean;
}

/**
 * Write-action: handles propose / counter / approve. Drives state transitions
 * and emits sprint_contract_negotiated / sprint_contract_bound /
 * sprint_contract_dissent_preserved events.
 */
export async function handleWriteAction(
  ctx: WriteActionArgs,
): Promise<NegotiateSprintContractResult> {
  // v6.22.0 — Check 2: action × status invariant (sprint-112 PR 5.2, canonical plan v2 §4 row 5.2).
  // Advisory: emit event but continue execution regardless.
  {
    // Derive current negotiation status from approval flags + round count.
    const currentNegotiationStatus: NegotiationStatus =
      (ctx.generatorApproved && ctx.evaluatorApproved)
        ? "bound"
        : ctx.round > 15
          ? "aborted"
          : "negotiating";
    const actionValid = isValidActionForStatus(
      ctx.args.action as NegotiateAction,
      currentNegotiationStatus,
    );
    if (!actionValid) {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "sprint_contract_write",
          passed: false,
          errorClass: "sprint_contract_action_status_mismatch",
          action: ctx.args.action,
          negotiationStatus: currentNegotiationStatus,
          sprintNumber: ctx.args.sprintNumber,
          role: ctx.args.role,
          project: ctx.project,
        } as Record<string, unknown>,
        toolName: "negotiate_sprint_contract",
        cwd: ctx.project,
        reasoning: `Sprint-112 PR 5.2 — SprintContract runtime advisory validation (status transitions + scope paths + action invariants + sprint# collisions) per canonical plan v2 §4 row 5.2 + Phase 5 hardening. Action "${ctx.args.action}" is not valid when negotiation status is "${currentNegotiationStatus}".`,
      });
    }
  }

  appendRoundBlock(ctx.negotiationFile, ctx.args, ctx.round);

  const { genApproved, evalApproved } = computeApprovals(
    ctx.args,
    ctx.generatorApproved,
    ctx.evaluatorApproved,
  );

  let status: NegotiateSprintContractResult["status"] = "negotiating";
  let arbitrationSignal: ArbitrationSignal | undefined;
  let writtenContractPath: string | null = null;
  let finalContract: unknown = ctx.args.contract ?? null;

  if (genApproved && evalApproved) {
    status = "bound";
    const bound = await bindContract(
      {
        args: ctx.args,
        project: ctx.project,
        negotiationFile: ctx.negotiationFile,
        contractFile: ctx.contractFile,
        round: ctx.round,
      },
      ctx.args.contract,
    );
    writtenContractPath = bound.writtenContractPath;
    finalContract = bound.finalContract;
  } else if (ctx.round > 15) {
    status = "aborted";
    arbitrationSignal = {
      policy: "abort-on-disagreement",
      triggerRound: ctx.round,
      rationale: "Exceeded global 15-round safety net.",
    };
  } else {
    const policy = extractPolicy(ctx.negotiationFile);
    arbitrationSignal = checkPolicyThreshold(policy, ctx.round, ctx.args.action);
    if (arbitrationSignal?.policy === "abort-on-disagreement") {
      status = "aborted";
    }

    await emit({
      type: "sprint_contract_negotiated",
      payload: {
        project: ctx.project,
        sprintNumber: ctx.args.sprintNumber,
        round: ctx.round,
        role: ctx.args.role,
        action: ctx.args.action,
      },
      toolName: "negotiate_sprint_contract",
      cwd: ctx.project,
      reasoning: `Round ${ctx.round} — ${ctx.args.role} ${ctx.args.action}${arbitrationSignal ? ` (arbitration: ${arbitrationSignal.policy})` : ""}`,
    });
  }

  return {
    status,
    round: ctx.round,
    generatorApproved: genApproved,
    evaluatorApproved: evalApproved,
    latestProposal: finalContract,
    negotiationFile: ctx.negotiationFile,
    contractFile: writtenContractPath,
    message:
      status === "bound"
        ? "Contract bound. Both sides approved."
        : status === "aborted"
          ? `Aborted — ${arbitrationSignal?.rationale ?? "exceeded 15 negotiation rounds."}`
          : `Round ${ctx.round} recorded (${ctx.args.role} ${ctx.args.action}).${arbitrationSignal ? ` Arbitration signal: ${arbitrationSignal.policy}.` : ""}`,
    arbitrationSignal,
  };
}
