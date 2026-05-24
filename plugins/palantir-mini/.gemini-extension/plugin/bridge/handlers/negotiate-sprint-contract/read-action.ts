// palantir-mini v3.4.0 — negotiate-sprint-contract sibling: read-action handler

import * as fs from "fs";
import {
  extractLatestProposal,
  parseNegotiationState,
} from "./state";
import type { NegotiateSprintContractResult } from "./types";

/**
 * Read-action: returns a snapshot of negotiation state without mutation. No
 * round increment. No event emit.
 */
export function handleReadAction(args: {
  content: string;
  negotiationFile: string;
  contractFile: string;
}): NegotiateSprintContractResult {
  const state = parseNegotiationState(args.content);
  const latestProposal = extractLatestProposal(args.content);
  const round = state.roundMatches.length;

  const status: NegotiateSprintContractResult["status"] =
    state.generatorApproved && state.evaluatorApproved
      ? "bound"
      : round > 10
        ? "aborted"
        : "negotiating";

  return {
    status,
    round,
    generatorApproved: state.generatorApproved,
    evaluatorApproved: state.evaluatorApproved,
    latestProposal,
    negotiationFile: args.negotiationFile,
    contractFile: fs.existsSync(args.contractFile) ? args.contractFile : null,
    message: "read-only snapshot",
  };
}
