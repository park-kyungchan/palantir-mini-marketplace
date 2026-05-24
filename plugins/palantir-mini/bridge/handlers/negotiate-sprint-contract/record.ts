// palantir-mini v3.5.0 — negotiate-sprint-contract sibling: round-block append + approval calc
// Pure helpers (one fs append). No event emit.

import * as fs from "fs";
import type { NegotiateSprintContractArgs } from "./types";

/** Append a single round block to the negotiation log. */
export function appendRoundBlock(
  file: string,
  args: NegotiateSprintContractArgs,
  round: number,
): void {
  const now = new Date().toISOString();
  let block = `\n## Round ${round} [${args.role}] ${args.action.toUpperCase()}\n`;
  block += `_${now}_\n`;
  if (args.rationale) block += `\n> ${args.rationale}\n`;
  if (args.contract !== undefined && args.contract !== null) {
    block += `\n\`\`\`json\n${JSON.stringify(args.contract, null, 2)}\n\`\`\`\n`;
  }
  fs.appendFileSync(file, block, "utf8");
}

/** Compute updated approval flags after this round. */
export function computeApprovals(
  args: NegotiateSprintContractArgs,
  generatorApproved: boolean,
  evaluatorApproved: boolean,
): { genApproved: boolean; evalApproved: boolean } {
  const genApproved =
    args.action === "approve" && args.role === "generator" ? true : generatorApproved;
  const evalApproved =
    args.action === "approve" && args.role === "evaluator" ? true : evaluatorApproved;
  return { genApproved, evalApproved };
}
