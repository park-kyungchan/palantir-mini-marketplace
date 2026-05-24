/**
 * @stable — HarnessComponent primitive (prim-learn-04, v1.26.0)
 *
 * Captures a single harness component + the model-capability assumption
 * it encodes + a "simpleVariant" describing how the same outcome would
 * be pursued WITHOUT that component. Consumed by
 * `pm_harness_component_audit` MCP to stress-test Rajasekaran's principle:
 *
 *   "every component in a harness encodes an assumption … worth stress
 *    testing, both because they may be incorrect, and because they can
 *    quickly go stale as models improve"
 *
 * When an audit canary shows the simpleVariant matches or outperforms the
 * full-component run on a fixed rubric, the component becomes a
 * `remove-candidate` for the next MAJOR bump. This keeps Opus-4-7 self-
 * designed harness from accumulating 4.5-era workarounds indefinitely.
 *
 * Authority:
 *   - research/claude-code/harness-design-long-running-apps.md
 *     (Rajasekaran Anthropic blog, 2026-04-xx; §"every component encodes
 *     an assumption").
 *   - ~/.claude/plans/cheeky-wandering-yeti.md §W5 + §E (S1/S2/S3 drift
 *     candidates: sprint-construct, per-sprint-evaluator, context-reset).
 *
 * D/L/A domain: LEARN (audit + stress-test metadata; BackwardProp input)
 * @owner palantirkc-ontology
 * @purpose harness self-audit primitive (Gap 1 closure)
 */

export type HarnessComponentRid = string & { readonly __brand: "HarnessComponentRid" };

export const harnessComponentRid = (s: string): HarnessComponentRid =>
  s as HarnessComponentRid;

export type ComponentAuditResult =
  | "load-bearing"
  | "remove-candidate"
  | "needs-rework"
  | "never-audited";

export interface HarnessComponentDeclaration {
  readonly componentId: HarnessComponentRid;
  /** 1-sentence statement of the model-capability assumption this component encodes. */
  readonly assumptionEncoded: string;
  /** How the same outcome would be pursued WITHOUT this component. */
  readonly simpleVariant: {
    readonly description: string;
    /** Short id of the simpler alternative (e.g. "end-only-evaluator"). */
    readonly enabledBy: string;
  };
  /** RID of the GradingRubric used for audit canary runs. */
  readonly canaryRubricRid: string;
  /** ISO8601 of last audit pass — null when never audited. */
  readonly lastAuditedAt: string | null;
  /** Outcome of the last audit. "never-audited" when lastAuditedAt is null. */
  readonly lastAuditResult: ComponentAuditResult;
  /**
   * Optional rationale written by harness-analyzer summarizing WHY the
   * audit reached its verdict. Populated on every audit except the
   * initial "never-audited" stub.
   */
  readonly lastAuditRationale?: string;
}

export const HARNESS_COMPONENT_SEED_IDS = [
  "sprint-construct",
  "per-sprint-evaluator",
  "context-reset",
  "planner",
  "harness-analyzer",
  "file-ipc-feedback",
  "sprint-contract-negotiation",
] as const;

export type HarnessComponentSeedId = typeof HARNESS_COMPONENT_SEED_IDS[number];

export class HarnessComponentRegistry {
  private readonly items = new Map<HarnessComponentRid, HarnessComponentDeclaration>();

  register(decl: HarnessComponentDeclaration): void {
    this.items.set(decl.componentId, decl);
  }

  get(rid: HarnessComponentRid): HarnessComponentDeclaration | undefined {
    return this.items.get(rid);
  }

  byAuditResult(result: ComponentAuditResult): HarnessComponentDeclaration[] {
    return [...this.items.values()].filter((c) => c.lastAuditResult === result);
  }

  list(): HarnessComponentDeclaration[] {
    return [...this.items.values()];
  }
}

export const HARNESS_COMPONENT_REGISTRY = new HarnessComponentRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Harness-component self-audit primitive for stress-testing component-encoded assumptions; palantir-mini-native",
};
export { categoryFoundryEquivalent as harnessComponentFoundryEquivalent };
