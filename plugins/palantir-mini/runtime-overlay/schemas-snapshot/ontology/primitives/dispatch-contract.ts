/**
 * @stable — DispatchContract primitive (prim-action-12, v1.48.0)
 *
 * Abstract superclass for cross-species harness dispatch gating. Promotes the
 * `palantir-mini-sprint-harness`-only `SprintContractDeclaration`
 * (prim-action-05) into the species-5 concrete subtype of a 7-species
 * discriminated union, closing architecture review §5.A.3 / R1-F9 (B2).
 *
 * Issue (architecture review §5.A.3):
 *   Rule 24 step 3 unconditionally requires SprintContract bind, but the
 *   contract primitive itself is sprint-harness-species-specific. The
 *   palantir-mini Brain dispatches across 7 harness species
 *   (CONTEXT.md §15) yet only species 1 + 5 had a formal contract
 *   primitive. Cross-species dispatch (e.g. Agent SDK species 2,
 *   Managed Agents species 4, Gemini Enterprise species 6) lacked an
 *   analogous gate substrate.
 *
 * Design:
 *   - `DispatchContractBase`        — common fields (id, status, species,
 *                                      timestamps, optional budgets).
 *   - `HarnessSpeciesId`            — 7-species architectural literal
 *                                      union mirroring CONTEXT.md §15.
 *                                      (W2.1 R1-F4 promotes to enum
 *                                      primitive; this primitive declares
 *                                      a local union to unblock W1.13.)
 *   - `DispatchContract`            — discriminated union of 7 concrete
 *                                      subtypes, one per species.
 *   - `SprintContract` (alias)      — `Extract<DispatchContract, {
 *                                      species: "palantir-mini-sprint-
 *                                      harness" }>`. Existing
 *                                      `SprintContractDeclaration`
 *                                      consumers unaffected (sprint-
 *                                      contract.ts re-exports this alias
 *                                      for back-compat).
 *
 * Authority chain:
 *   research/anthropic/scaling-managed-agents-2026-04-08.md
 *     + research/anthropic/harness-design-2026-03-24.md
 *     + research/harness-engineering-2026/the-new-stack-4-vendor-
 *         harness-pricing-split-2026-04.md
 *   ↓ rules/CONTEXT.md §15 (7-species enumeration)
 *   ↓ ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.A.3
 *   ↓ schemas/ontology/primitives/dispatch-contract.ts (this file)
 *   ↓ schemas/ontology/primitives/sprint-contract.ts (species-5 binding)
 *   ↓ ~/ontology/shared-core/index.ts (re-export surface)
 *   ↓ palantir-mini bridge handlers (negotiate_sprint_contract +
 *       future negotiate_dispatch_contract Wave-N)
 *
 * Cross-refs:
 *   - rule 16 v4.1.0 §SprintContract (species-5 contract; this file
 *     promotes to abstract base).
 *   - rule 24 v1.1.0 §Dispatch flowchart step 3 ("SprintContract or
 *     species-native contract" — this primitive types the disjunction).
 *   - rule 26 v1.0.0 §Axis E (memory-mapped) — DispatchContract bind
 *     emits `dispatch_contract_bound` semantic-layer event.
 *   - HarnessSpeciesCostProfile (v1.42.0) — vendor cost profile is a
 *     parallel axis (vendor != species; e.g. species 1 = CLI maps to
 *     vendor `claude-code-cli-max`).
 *
 * D/L/A domain: ACTION (typed gate binding scope → permissioned execution).
 *
 * @owner palantirkc-ontology
 * @purpose Cross-species harness dispatch contract abstract superclass
 */

import type {
  SprintContractDeclaration,
  SprintContractRid,
} from "./sprint-contract";

/**
 * 7-species architectural taxonomy.
 *
 * v1.50.0 (sprint-060 W2.1 R1-F4): promoted to stand-alone canonical
 * primitive at `harness-species-enum.ts`. This primitive re-exports
 * `HarnessSpeciesId` + `HARNESS_SPECIES_IDS` + `isHarnessSpeciesId` from
 * the canonical source for back-compat (consumers importing from
 * `dispatch-contract` continue to work unchanged). Type identity
 * preserved — this is an additive MINOR migration.
 *
 * Species axis (architectural class) is distinct from the vendor axis
 * captured in HarnessSpeciesCostProfile. See `harness-species-enum.ts`
 * for the species → vendor mapping table.
 */
export type { HarnessSpeciesId } from "./harness-species-enum";
export {
  HARNESS_SPECIES_IDS,
  isHarnessSpeciesId,
} from "./harness-species-enum";

import type { HarnessSpeciesId } from "./harness-species-enum";
import { isHarnessSpeciesId } from "./harness-species-enum";

/**
 * Generic dispatch contract id. Concrete subtypes may narrow to a more
 * specific brand (e.g. `SprintContractRid` for species 5).
 */
export type DispatchContractRid = string & {
  readonly __brand: "DispatchContractRid";
};

export const dispatchContractRid = (s: string): DispatchContractRid =>
  s as DispatchContractRid;

/**
 * Lifecycle status common to all species. Sprint species adds richer
 * `drafting` + `negotiating` distinctions via SprintContractStatus; the
 * abstract base flattens to a 4-state core ("negotiating" subsumes
 * "drafting" for non-sprint species that have no separate draft phase).
 */
export type DispatchContractStatus =
  | "negotiating"
  | "bound"
  | "completed"
  | "aborted";

/**
 * Common abstract base. Every concrete species subtype extends these
 * fields; species-specific extensions are declared per-subtype below.
 */
export interface DispatchContractBase {
  /** Stable identifier; concrete subtypes may narrow the brand. */
  readonly contractId: DispatchContractRid | SprintContractRid;
  /** ISO8601 timestamp when the contract entered the current `status`. */
  readonly bindTimestamp: string;
  /** Lifecycle status. */
  readonly status: DispatchContractStatus;
  /** Architectural species discriminator (CONTEXT.md §15). */
  readonly species: HarnessSpeciesId;
  /** Optional 1-3 sentence human-readable description. */
  readonly description?: string;
  /** Advisory token budget for the dispatch (model-dependent; not a hard cap). */
  readonly budgetTokens?: number;
  /** Wall-clock budget in milliseconds; orchestrator aborts on timeout. */
  readonly timeoutMs?: number;
}

/**
 * Species 1 — Claude Code CLI. The default Claude Code CLI loop.
 * Mode discriminator routes between Lead-direct (single agent) and
 * Agent Teams (multi-agent fan-out via ~/.claude/teams/).
 */
export interface ClaudeCodeCliDispatchContract extends DispatchContractBase {
  readonly species: "claude-code-cli";
  readonly mode: "lead-direct" | "agent-team";
  /** Optional team config slug when mode=agent-team. */
  readonly teamConfigSlug?: string;
}

/**
 * Species 2 — Claude Agent SDK. User-authored harness loop calling the
 * SDK directly. No built-in sprint gate; contract records the loop
 * identity for audit lineage.
 */
export interface ClaudeAgentSdkDispatchContract extends DispatchContractBase {
  readonly species: "claude-agent-sdk";
  /** Stable identifier of the user-authored loop (file path or rid). */
  readonly harnessLoopRid?: string;
}

/**
 * Species 3 — task-specific harness. Examples: Prithvi Rajasekaran
 * 3-agent pattern (2026-03-24). The harness configuration is the
 * identity; carry its config path for cross-session resolution.
 */
export interface TaskSpecificDispatchContract extends DispatchContractBase {
  readonly species: "task-specific-harness";
  /** Path or rid of the task-specific harness configuration. */
  readonly harnessConfigPath: string;
}

/**
 * Species 4 — Anthropic Managed Agents (meta-harness containing pre-built
 * species). Billed per session-hour; budget surfaces session-hour cap.
 */
export interface AnthropicManagedAgentsDispatchContract
  extends DispatchContractBase {
  readonly species: "anthropic-managed-agents";
  /** Optional per-dispatch session-hour cap (multiplied by $0.08 / hr). */
  readonly sessionHourBudget?: number;
}

/**
 * Species 5 — palantir-mini-sprint-harness. The full SprintContract
 * payload lives here as a nested field, preserving back-compat for
 * existing SprintContractDeclaration consumers (sprint-contract.ts
 * re-exports `SprintContract` as a type alias narrowing to this case).
 */
export interface PalantirMiniSprintDispatchContract
  extends DispatchContractBase {
  readonly species: "palantir-mini-sprint-harness";
  /**
   * Embedded SprintContractDeclaration payload. Preserves all sprint-
   * specific fields (sprintNumber, inputs, successCriteriaRids,
   * iterationLimit, hardThreshold, mode, taskFitness, projectSlug, ...)
   * without duplication. Existing SprintContractDeclaration consumers
   * import `SprintContract` (type alias to this nested shape) — see
   * sprint-contract.ts §back-compat alias.
   */
  readonly sprint: SprintContractDeclaration;
}

/**
 * Generic consumption-budget shape used by Gemini Enterprise + Microsoft
 * Foundry. Each axis carries the vendor-billed unit + amount cap.
 */
export interface DispatchConsumptionBudget {
  /** Optional cap on per-vendor billing axes (e.g. vCPU-hour, GiB-hour). */
  readonly perAxisCaps?: Readonly<Record<string, number>>;
  /** Optional total budget ceiling in vendor's native currency. */
  readonly totalCap?: number;
  /** Currency code (default "USD"). */
  readonly currency?: string;
}

/**
 * Species 6 — Google Gemini Enterprise Agent Platform (April 2026).
 * Components-metered: compute + memory + storage + model. Budget caps
 * per axis routed via DispatchConsumptionBudget.
 */
export interface GeminiEnterpriseDispatchContract extends DispatchContractBase {
  readonly species: "gemini-enterprise";
  readonly consumptionBudget?: DispatchConsumptionBudget;
}

/**
 * Species 7 — Microsoft Foundry Agent Service (April 2026). vCPU-hour +
 * memory-GiB-hour + per-1K-events billing. Budget caps per axis routed
 * via DispatchConsumptionBudget.
 */
export interface MicrosoftFoundryDispatchContract
  extends DispatchContractBase {
  readonly species: "microsoft-foundry";
  readonly consumptionBudget?: DispatchConsumptionBudget;
}

/**
 * Top-level discriminated union covering all 7 species. New species
 * promote into this union via additive MINOR.
 */
export type DispatchContract =
  | ClaudeCodeCliDispatchContract
  | ClaudeAgentSdkDispatchContract
  | TaskSpecificDispatchContract
  | AnthropicManagedAgentsDispatchContract
  | PalantirMiniSprintDispatchContract
  | GeminiEnterpriseDispatchContract
  | MicrosoftFoundryDispatchContract;

/**
 * Type guard for DispatchContractStatus.
 */
export function isDispatchContractStatus(
  s: string,
): s is DispatchContractStatus {
  return s === "negotiating" || s === "bound" || s === "completed" || s === "aborted";
}

/**
 * Structural runtime validator. Returns true when `x` is a well-formed
 * DispatchContract (any species). Performs species-specific shape
 * checking after discriminator dispatch.
 */
export function isDispatchContract(x: unknown): x is DispatchContract {
  if (typeof x !== "object" || x === null) return false;
  const c = x as DispatchContractBase;
  if (typeof c.contractId !== "string") return false;
  if (typeof c.bindTimestamp !== "string") return false;
  if (!isDispatchContractStatus(c.status as string)) return false;
  if (!isHarnessSpeciesId(c.species as string)) return false;
  // Species-specific narrow check.
  switch ((c as DispatchContract).species) {
    case "claude-code-cli": {
      const m = (c as ClaudeCodeCliDispatchContract).mode;
      return m === "lead-direct" || m === "agent-team";
    }
    case "claude-agent-sdk":
      return true;
    case "task-specific-harness":
      return (
        typeof (c as TaskSpecificDispatchContract).harnessConfigPath === "string"
      );
    case "anthropic-managed-agents":
      return true;
    case "palantir-mini-sprint-harness": {
      const sprint = (c as PalantirMiniSprintDispatchContract).sprint;
      return typeof sprint === "object" && sprint !== null;
    }
    case "gemini-enterprise":
      return true;
    case "microsoft-foundry":
      return true;
    default:
      return false;
  }
}

/**
 * Generic dispatch contract registry. Stores species-typed contracts
 * keyed by contractId. Mirrors SprintContractRegistry shape.
 */
export class DispatchContractRegistry {
  private readonly items = new Map<string, DispatchContract>();

  register(decl: DispatchContract): void {
    this.items.set(decl.contractId as string, decl);
  }

  get(rid: string): DispatchContract | undefined {
    return this.items.get(rid);
  }

  bySpecies<S extends HarnessSpeciesId>(
    species: S,
  ): Extract<DispatchContract, { species: S }>[] {
    return [...this.items.values()].filter(
      (c): c is Extract<DispatchContract, { species: S }> => c.species === species,
    );
  }

  byStatus(status: DispatchContractStatus): DispatchContract[] {
    return [...this.items.values()].filter((c) => c.status === status);
  }

  list(): DispatchContract[] {
    return [...this.items.values()];
  }
}

export const DISPATCH_CONTRACT_REGISTRY = new DispatchContractRegistry();
