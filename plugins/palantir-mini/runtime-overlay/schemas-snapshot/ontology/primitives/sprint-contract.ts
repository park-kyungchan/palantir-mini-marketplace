/**
 * @stable — SprintContract primitive (prim-action-05, v1.48.0)
 *
 * File-based agreement between Generator and Evaluator defining "what done
 * looks like" for a sprint. Bridges spec-level user stories with verifiable
 * implementation criteria. Mirrors Palantir Two-Tier Action pattern — the
 * contract is a Tier-2 function-backed action (returns Edits[] without
 * commit until iteration passes hard threshold).
 *
 * v1.48.0 addendum (sprint-060 W1.13, 2026-05-09): SprintContract is now
 * the species-5 concrete subtype of `DispatchContract` (prim-action-12).
 * `SprintContractDeclaration` is preserved unchanged; the dispatch base is
 * a sibling abstraction layered above. Back-compat alias `SprintContract`
 * is exported below as
 * `Extract<DispatchContract, { species: "palantir-mini-sprint-harness" }>`.
 * Closes architecture review §5.A.3 / R1-F9 (B2). See
 * `dispatch-contract.ts` for the abstract base + 7-species union.
 *
 * Authority:
 *   - Prithvi Rajasekaran's harness (research/claude-code — sprint
 *     contracts with 27+ criteria per sprint)
 *   - Palantir Two-Tier Action: research/palantir-foundry/ontology/
 *     ontology-actions-*.md
 *   - research/claude-code/palantir-mini-blueprint.md §Palantir 5 infra
 *     patterns (Two-Tier Action Architecture)
 *
 * v1.44.0 addendum (sprint-052 W4.B, 2026-05-07): adds 2 optional advisory
 * fields to SprintContractDeclaration — `taskBudgetTokens` (advisory token
 * budget per sprint, min 20K, surfaced as advisory countdown to graders;
 * pairs with rule 16 v4.1.0 §Quick Sprint budget tracking) and `taskFitness`
 * ({ species, expectedBenchmark, observedScore? } — per-sprint species
 * selection record + post-hoc fitness score; species matches
 * HarnessSpeciesCostProfile.vendor for `pm_recap` per-species win-rate
 * aggregation). Both additive MINOR per rule 08; backwards-compatible.
 *
 * D/L/A domain: ACTION (executable contract binding input spec → verifiable
 * output; mirrors Palantir ActionType semantics)
 * @owner palantirkc-ontology
 * @purpose Sprint negotiation contract (Two-Tier Action-aligned;
 *           DispatchContract species-5 concrete subtype as of v1.48.0)
 */

import type { DispatchContract } from "./dispatch-contract";

export type SprintContractRid = string & { readonly __brand: "SprintContractRid" };

export const sprintContractRid = (s: string): SprintContractRid => s as SprintContractRid;

/**
 * Status of the negotiation at read time. Contract is file-based and
 * mutable during "negotiating"; frozen at "bound". Once "bound",
 * modifications require a new contract (version bump).
 */
export type SprintContractStatus =
  | "drafting"
  | "negotiating"
  | "bound"
  | "aborted";

/**
 * Disagreement resolution policy when Generator and Evaluator fail to
 * converge on the contract during "negotiating" phase.
 *   lead-arbitrated       — Orchestrator agent decides
 *   priority-criterion    — criterion with highest weightInRubric wins
 *   abort-on-disagreement — any disagreement aborts sprint (strictest)
 */
export type DisagreementResolution =
  | "lead-arbitrated"
  | "priority-criterion"
  | "abort-on-disagreement";

export interface FeatureSpecRef {
  /** Stable identifier for the feature within the parent Planner spec */
  readonly featureId: string;
  /** Human-readable feature name */
  readonly title: string;
  /** 1-3 sentence description */
  readonly description: string;
}

export interface HardThresholdPolicy {
  /**
   * Per-GradingCriterion minimum — keyed by GradingCriterionRid string form.
   * If ANY criterion falls below its threshold the sprint FAILS regardless
   * of the overall weighted score. Prithvi's "hard threshold" pattern.
   */
  readonly perCriterion: Readonly<Record<string, number>>;
  /**
   * Overall weighted-score threshold. Separate from perCriterion — overall
   * gates PASS, perCriterion gates FAIL.
   */
  readonly overall: number;
  /** Score scale reference */
  readonly scale: "0-10" | "0-1" | "pass-fail";
}

/**
 * v1.24 W3 Dissent Record — single round of negotiation audit trail.
 * Recorded by negotiate_sprint_contract on every counter-proposal so
 * harness-analyzer (+ future post-sprint audits) can trace which
 * fields were disputed and whether the disagreement was accepted into
 * the final contract. When any entry has `acceptedInFinal: false`,
 * `sprint_contract_dissent_preserved` is emitted at bind time.
 */
export interface NegotiationHistoryRound {
  readonly round: number;
  readonly proposer: "generator" | "evaluator" | "lead-arbitrator";
  /** Dot-path to the contract field being negotiated, e.g. "hardThreshold.overall". */
  readonly targetField: string;
  /** Delta in the proposed value. Both sides cast to string|number. */
  readonly delta: { readonly from: string | number; readonly to: string | number };
  readonly rationale: string;
  /** True when this proposal's value appears in the bound contract. */
  readonly acceptedInFinal: boolean;
  /** ISO8601 when this round was appended. */
  readonly at: string;
}

export interface SprintContractDeclaration {
  readonly contractId: SprintContractRid;
  /** Parent sprint number (1-based) within the harness execution */
  readonly sprintNumber: number;
  readonly status: SprintContractStatus;
  /** Features this sprint delivers. Pulled from Planner spec. */
  readonly inputs: readonly FeatureSpecRef[];
  /**
   * GradingCriterion RIDs (as strings) that define success. Evaluator
   * scores artifacts against these criteria at sprint end.
   */
  readonly successCriteriaRids: readonly string[];
  /**
   * 5-15 per Prithvi's original paper. Hard cap enforced by FeedbackLoop
   * orchestrator; re-spawning a Generator+Evaluator pair beats extending
   * beyond 15 iterations.
   */
  readonly iterationLimit: number;
  /** Hard threshold policy — both per-criterion floors + overall ceiling */
  readonly hardThreshold: HardThresholdPolicy;
  /**
   * Wall-clock budget in milliseconds. Orchestrator aborts the sprint on
   * timeout (emits sprint_contract_bound event with reason="timeout_aborted").
   */
  readonly timeoutMs: number;
  /**
   * Token budget hint — not a hard cap (model-dependent), used by
   * orchestrator for auto-shutdown planning.
   */
  readonly budgetTokens: number;
  /**
   * File path (relative to project harness/ dir) where Generator proposals
   * and Evaluator counter-proposals are exchanged during negotiation.
   * File-based IPC per Prithvi's design; direct messaging is not used
   * for contract negotiation to preserve audit trail.
   */
  readonly negotiationFile: string;
  /** How to resolve Generator↔Evaluator disagreements during negotiation */
  readonly disagreementResolution: DisagreementResolution;
  readonly description?: string;
  /**
   * v1.24 W3 — negotiation round audit trail. Each counter-proposal /
   * arbitration appends one entry. When any entry has
   * `acceptedInFinal: false` at bind time, the handler emits
   * `sprint_contract_dissent_preserved`. Optional for backward compat
   * (pre-v1.24 contracts omit it entirely).
   */
  readonly negotiationHistory?: readonly NegotiationHistoryRound[];
  /**
   * v1.25 W4 — Context Reset Optional hook (field-only; runtime
   * implementation deferred pending W5 component audit). Controls
   * whether Generator context is reset between iterations:
   *   - "disabled" (default) — continuous session, Claude Agent SDK
   *     compaction handles context growth.
   *   - "manual" — Lead explicitly triggers a reset via handoff manifest.
   *   - "auto" — Generator is re-spawned fresh at each iteration boundary
   *     with the handoff manifest as seed context.
   * When policy != "disabled" and a reset occurs, the handler emits
   * `context_reset_handoff_emitted` with the manifest contents.
   * Default "disabled" preserves v2.19.0 and earlier behavior.
   */
  readonly iterationResetPolicy?: "auto" | "manual" | "disabled";
  /**
   * v1.30 — Harness default-on mode (per harness-base-mode blueprint
   * §4-P0 + rule 16 v3.0.0 §Default-On Policy). Controls how this
   * SprintContract participates in the default-on commit gate:
   *   - "full" (or null) — default. Standard harness sprint with
   *     Planner→Generator→Evaluator pipeline. iterationLimit 5-15.
   *   - "quick" — 1-iteration wrapper for Lead-direct work created via
   *     `/palantir-mini:pm-quick-sprint`. iterationLimit=1,
   *     timeoutMs=900000 typical. Lead acts as Evaluator inline; no
   *     separate Generator spawn. Inline 3-criterion rubric default.
   *   - "lite" — 2-role harness explicitly opting out of separate-context
   *     grader (P1). Falls back to Lead-as-Evaluator inline grading.
   *   - "strict" — Prithvi-faithful: Generator-Evaluator separation
   *     enforced for ALL code edits. No Lead-direct edits permitted.
   *     Most expensive; opt-in only.
   * `commit-edits-precondition` hook (W1.2) reads this field to
   * adjust gate strictness.
   */
  readonly mode?: "full" | "quick" | "lite" | "strict" | null;
  /**
   * v1.34.1+ — Project slug for cross-project contractId disambiguation
   * (crystalline-resilient-narwhal P-EXTRA, 2026-05-01).
   *
   * Stable, human-readable slug derived from the consumer project's
   * `package.json#name` (basename, scope stripped) or `path.basename(projectPath)`.
   * Same value used to slug-prefix `contractId` itself; storing it as a
   * dedicated field allows queries (replay_lineage, pm_workflow_lineage_query)
   * to filter by slug without parsing the contractId string.
   *
   * Backward-compat: legacy contracts without this field are interpreted as
   * "unspecified-slug" — readers should fall back to either parsing
   * contractId for a `<slug>-sprint-` prefix or to `path.basename(projectPath)`
   * derived from the contract's enclosing dir.
   *
   * Authority: ~/.claude/plans/crystalline-resilient-narwhal.md §4.1
   *            palantir-mini/lib/project/slug.ts (deriveProjectSlug helper)
   */
  readonly projectSlug?: string;
  /**
   * v1.25 W4 — when iterationResetPolicy triggers, this manifest
   * governs what seeds the fresh Generator session. Mirrors
   * Rajasekaran's claude-progress.txt + feature_list.json pattern.
   */
  readonly resetHandoffManifest?: {
    readonly includeFiles: readonly string[];
    /** default 15000 per rule 13 ≤15K ctx budget */
    readonly maxTokens: number;
  };
  /**
   * v1.44.0 (sprint-052 W4.B) — Advisory token budget for the sprint's
   * tasks. Min 20000 — surfaced as advisory countdown to graders.
   *
   * Distinct from `budgetTokens` (which is a per-iteration auto-shutdown
   * planning hint): `taskBudgetTokens` is the SUM of expected per-task
   * token cost across the sprint, used by the harness orchestrator + grader
   * dispatch to render an advisory countdown ("420K of 500K consumed").
   *
   * Validation: when present, must be >= 20000 (helper
   * validateTaskBudgetTokens). Optional + additive — pre-v1.44 contracts
   * omit the field entirely.
   *
   * Pairs with rule 16 v4.1.0 §Quick Sprint budget tracking; consumed by
   * pm_dispatch_cost_estimate (sprint-046 Wave 3) for cost-aware species
   * selection.
   */
  readonly taskBudgetTokens?: number;
  /**
   * v1.44.0 (sprint-052 W4.B) — Per-sprint species selection record +
   * post-hoc fitness score.
   *
   *   - `species`           matches HarnessSpeciesCostProfile.vendor
   *                         (rule 16 v4.1.0 §0; 7 species). Records which
   *                         vendor / species was actually selected for
   *                         this sprint's task graph.
   *   - `expectedBenchmark` pre-task estimate (e.g. expected pass rate or
   *                         expected duration in ms; unit determined by
   *                         the consuming `pm_recap` aggregator). Set
   *                         at SprintContract bind time.
   *   - `observedScore`     filled by Evaluator post-iteration; absent
   *                         until pass-verdict. Once set, enables
   *                         pm_recap to compute per-species win rate
   *                         (observedScore vs expectedBenchmark).
   *
   * Cross-ref: HarnessSpeciesCostProfile.vendor (schemas v1.42.0 W2.A.3).
   * Validation: helper validateTaskFitness — if present, must have
   * non-empty `species` (string) + finite `expectedBenchmark` (number);
   * `observedScore` if present must also be finite. Optional + additive.
   */
  readonly taskFitness?: TaskFitness;
}

/**
 * v1.44.0 (sprint-052 W4.B) — Per-sprint species selection record + post-
 * hoc fitness score. See `SprintContractDeclaration.taskFitness` JSDoc for
 * field semantics. Hoisted to a named interface for ergonomic re-use by
 * downstream `pm_recap` aggregators.
 */
export interface TaskFitness {
  /** Matches HarnessSpeciesCostProfile.vendor (rule 16 v4.1.0 §0; 7 species). */
  readonly species: string;
  /** Pre-task estimate (unit per consuming aggregator; pass rate or duration). */
  readonly expectedBenchmark: number;
  /** Filled post-iteration by Evaluator; absent until pass-verdict. */
  readonly observedScore?: number;
}

/**
 * v1.44.0 — Validator for `SprintContractDeclaration.taskBudgetTokens`.
 * Returns true when value is undefined OR a finite number >= 20000.
 * Type guard narrows to `number | undefined`.
 */
export function validateTaskBudgetTokens(
  value: unknown,
): value is number | undefined {
  if (value === undefined) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 20000;
}

/**
 * v1.44.0 — Validator for `SprintContractDeclaration.taskFitness`.
 * Returns true when value is undefined OR a well-formed TaskFitness object
 * (non-empty `species` string + finite `expectedBenchmark`; optional
 * `observedScore` must be finite if present). Type guard narrows.
 */
export function validateTaskFitness(
  value: unknown,
): value is TaskFitness | undefined {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.species !== "string" || obj.species.length === 0) return false;
  if (
    typeof obj.expectedBenchmark !== "number" ||
    !Number.isFinite(obj.expectedBenchmark)
  ) {
    return false;
  }
  if (obj.observedScore !== undefined) {
    if (
      typeof obj.observedScore !== "number" ||
      !Number.isFinite(obj.observedScore)
    ) {
      return false;
    }
  }
  return true;
}

export class SprintContractRegistry {
  private readonly items = new Map<SprintContractRid, SprintContractDeclaration>();

  register(decl: SprintContractDeclaration): void {
    this.items.set(decl.contractId, decl);
  }

  get(rid: SprintContractRid): SprintContractDeclaration | undefined {
    return this.items.get(rid);
  }

  byStatus(status: SprintContractStatus): SprintContractDeclaration[] {
    return [...this.items.values()].filter((c) => c.status === status);
  }

  keys(): IterableIterator<SprintContractRid> {
    return this.items.keys();
  }

  list(): SprintContractDeclaration[] {
    return [...this.items.values()];
  }
}

export const SPRINT_CONTRACT_REGISTRY = new SprintContractRegistry();

/**
 * v1.48.0 (sprint-060 W1.13) — DispatchContract species-5 alias.
 *
 * `SprintContract` narrows the abstract `DispatchContract` discriminated
 * union to the concrete `palantir-mini-sprint-harness` species. Existing
 * consumers that previously imported `SprintContractDeclaration` directly
 * remain unchanged; new cross-species code paths import `DispatchContract`
 * (or this `SprintContract` alias) via shared-core.
 *
 * The dispatch base wraps the existing declaration as
 * `dispatch.sprint: SprintContractDeclaration` so all sprint-specific
 * fields (sprintNumber, inputs, successCriteriaRids, iterationLimit,
 * hardThreshold, mode, taskFitness, projectSlug, ...) survive verbatim.
 *
 * Closes architecture review §5.A.3 / R1-F9 (B2).
 */
export type SprintContract = Extract<
  DispatchContract,
  { species: "palantir-mini-sprint-harness" }
>;
