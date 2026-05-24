// palantir-mini v3.4.0 — negotiate-sprint-contract sibling: state
// Pure read-side: load negotiation log, parse round count + approvals, extract policy.

import * as fs from "fs";
import type { ArbitrationPolicy } from "./types";

export interface NegotiationState {
  content: string;
  roundMatches: RegExpMatchArray;
  generatorApproved: boolean;
  evaluatorApproved: boolean;
}

/** Read or initialize the negotiation log file. */
export function loadOrInitNegotiation(file: string, sprintNumber: number): string {
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, "utf8");
  }
  const seed = `# Sprint ${sprintNumber} — Contract Negotiation\n\n`;
  fs.writeFileSync(file, seed, "utf8");
  return seed;
}

/**
 * Parse the round count + approvals from the negotiation log markers.
 *
 * Regex tolerates both "APPROVE" (action.toUpperCase() output) and the legacy
 * "APPROVED" form documented in pm-harness-sprint skill + harness-evaluator
 * agent — pre-v3.3.0 the regex required "APPROVED" only, rendering the
 * bound-state path unreachable through the standard approve-action flow.
 *
 * Bug fix: APPROVED? trailing-D pattern matches both forms.
 */
export function parseNegotiationState(content: string): NegotiationState {
  const roundMatches = content.match(/^## Round \d+/gm) ?? ([] as unknown as RegExpMatchArray);
  const generatorApproved = /^## Round .* \[generator\] APPROVED?/m.test(content);
  const evaluatorApproved = /^## Round .* \[evaluator\] APPROVED?/m.test(content);
  return { content, roundMatches, generatorApproved, evaluatorApproved };
}

/** Extract the latest JSON proposal from the negotiation log, parsed. */
export function extractLatestProposal(content: string): unknown {
  const proposalMatches = content.match(/```json\n([\s\S]*?)\n```/g) ?? [];
  const lastJson = proposalMatches[proposalMatches.length - 1] ?? null;
  if (!lastJson) return null;
  return JSON.parse(lastJson.replace(/^```json\n/, "").replace(/\n```$/, ""));
}

/**
 * Phase H3 — extract disagreementResolution policy from the most recent proposal
 * in the negotiation log, walking backwards.
 */
export function extractPolicy(file: string): ArbitrationPolicy | null {
  const proposals =
    fs.readFileSync(file, "utf8").match(/```json\n([\s\S]*?)\n```/g) ?? [];
  if (proposals.length === 0) return null;
  for (let i = proposals.length - 1; i >= 0; i--) {
    const block = proposals[i];
    if (!block) continue;
    try {
      const json = JSON.parse(
        block.replace(/^```json\n/, "").replace(/\n```$/, ""),
      ) as { disagreementResolution?: string };
      const p = json.disagreementResolution;
      if (p === "lead-arbitrated" || p === "priority-criterion" || p === "abort-on-disagreement") {
        return p;
      }
    } catch {
      continue;
    }
  }
  return null;
}
