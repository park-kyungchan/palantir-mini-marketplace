// palantir-mini v3.4.0 — negotiate-sprint-contract sibling: types
// Extracted from bridge/handlers/negotiate-sprint-contract.ts during N1-LARGE wave 2 decomp.

import * as path from "path";

export type NegotiateAction = "propose" | "counter" | "approve" | "read";

export interface NegotiateSprintContractArgs {
  /** Absolute project path (defaults to cwd if omitted) */
  projectPath?: string;
  /** 1-based sprint number */
  sprintNumber: number;
  /** Which role is calling */
  role: "generator" | "evaluator" | "orchestrator";
  /** What the caller is doing this round */
  action: NegotiateAction;
  /**
   * For propose/counter: the full contract JSON (SprintContractDeclaration shape).
   * For approve: null (acceptance of the latest proposal).
   * For read: null (returns current state without mutation).
   */
  contract?: unknown;
  /** Free-text rationale appended to the negotiation log */
  rationale?: string;
  /**
   * v3.13.0+ — Optional project slug override (crystalline-resilient-narwhal
   * P-EXTRA, 2026-05-01). When omitted, the handler derives it from
   * `projectPath` via deriveProjectSlug(). Plumbed into the bound
   * sprint_contract_bound event payload for cross-project lineage queries.
   */
  projectSlug?: string;
}

export type ArbitrationPolicy = "lead-arbitrated" | "priority-criterion" | "abort-on-disagreement";

export interface ArbitrationSignal {
  policy: ArbitrationPolicy;
  triggerRound: number;
  rationale: string;
}

export interface NegotiateSprintContractResult {
  status: "negotiating" | "bound" | "aborted";
  round: number;
  generatorApproved: boolean;
  evaluatorApproved: boolean;
  latestProposal: unknown;
  negotiationFile: string;
  contractFile: string | null;
  message: string;
  /**
   * Phase H3 — surfaces when disagreementResolution policy is triggered.
   * See bridge/handlers/negotiate-sprint-contract.ts header comment for full
   * policy semantics (lead-arbitrated / priority-criterion / abort-on-disagreement).
   */
  arbitrationSignal?: ArbitrationSignal;
}

export function sprintDir(project: string, n: number): string {
  return path.join(
    project,
    ".palantir-mini",
    "harness",
    "sprints",
    `sprint-${String(n).padStart(3, "0")}`,
  );
}
