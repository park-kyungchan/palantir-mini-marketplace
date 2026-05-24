/**
 * @stable — HarnessSpeciesCostProfile primitive (prim-harness-12, v1.42.0)
 *
 * Typed cost profile per harness species vendor. Backs the "3rd pricing
 * arbitrage option" public positioning documented in plans/mellow-plotting-
 * oasis.md §Wave 2 W2.D — palantir-mini + Max X20 = BYO-CLI-via-Max,
 * neither Anthropic-managed-runtime ($0.08/session-hour) nor OpenAI-open-
 * source-with-BYO-sandbox (free runtime + standard tokens). Anchored to
 * The New Stack 4-vendor pricing-split article (2026-04-18) and the
 * Anthropic / OpenAI / Google / Microsoft launch posts cited there.
 *
 * Use cases:
 *   1. Cost-routing decisions — Brain dispatcher (Wave 3 W3.A
 *      BrainProvider) selects vendor by per-task cost estimate.
 *   2. Public economic positioning — palantirkc Brain-of-Swarms can
 *      machine-render a comparison table from this typed registry.
 *   3. Audit baseline — sprint cost retros compare actual spend to the
 *      vendor profile's billing axes.
 *
 * Authority chain:
 *   research/harness-engineering-2026/the-new-stack-4-vendor-harness-
 *     pricing-split-2026-04.md (vendor consensus + per-vendor pricing)
 *     + research/anthropic/scaling-managed-agents-2026-04-08.md
 *       (Managed Agents $0.08/session-hour)
 *     + research/openai/agents-sdk-next-evolution-2026-04-15.md
 *       (OpenAI open-source SDK + BYO sandbox)
 *     ↓
 *   plans/mellow-plotting-oasis.md §Wave 2 W2.A.3 + §Wave 2 W2.D
 *     ↓
 *   schemas/ontology/primitives/harness-species-cost-profile.ts (this file)
 *     ↓
 *   palantir-mini/lib/brain/BrainProvider.ts (Wave 3 W3.A wiring)
 *     + bridge/handlers/pm-cost-route.ts (Wave 3+)
 *
 * D/L/A domain: DATA (declarative cost shape — stored fact, not action).
 *
 * Rule cross-refs: rule 16 v4.1.0 §0 (5+ harness species; this primitive
 * extends to 7 with Gemini Enterprise + Microsoft Foundry per W2.C
 * CONTEXT.md update); rule 26 v1.0.0 §Axis D (Shareable — provider-
 * neutral surface).
 *
 * @owner palantirkc-ontology
 * @purpose Per-vendor cost profile for harness-species cost-routing
 */

/**
 * Vendor identifier covering the 7-species harness landscape (post-W2.C
 * CONTEXT.md §15 expansion). Each vendor entry below is a concrete
 * billing surface, not a generic species.
 *
 * - `claude-code-cli-max`         — palantir-mini canonical: BYO Claude
 *                                    Code CLI + Anthropic Max X20
 *                                    subscription. No marginal cost
 *                                    above $200/mo subscription cap.
 * - `anthropic-managed-agents`    — Anthropic-hosted runtime; $0.08/
 *                                    session-hour + standard tokens.
 * - `openai-agents-sdk`           — OpenAI open-source SDK + BYO sandbox.
 *                                    No first-party runtime fee; sandbox
 *                                    + storage cost per provider.
 * - `google-gemini-enterprise`    — Google Vertex AI Agent Engine; per-
 *                                    component metering (sessions /
 *                                    memory / code execution / observability).
 * - `microsoft-foundry`           — Microsoft Foundry Agent Service;
 *                                    consumption-based per model + tool
 *                                    + vCPU + memory.
 * - `microsoft-copilot-studio`    — Microsoft Copilot Studio; pre-paid
 *                                    flat tier + per-message overage.
 * - `local-ollama`                — local model + local runtime; effective
 *                                    marginal cost = electricity + opportunity.
 */
export type HarnessSpeciesVendor =
  | "claude-code-cli-max"
  | "anthropic-managed-agents"
  | "openai-agents-sdk"
  | "google-gemini-enterprise"
  | "microsoft-foundry"
  | "microsoft-copilot-studio"
  | "local-ollama";

/**
 * Canonical billing-axis enum. A vendor profile lists every axis its
 * pricing meters; cost-routing decisions sum across axes.
 *
 * - `session-hour`        — wall-clock hour while the session is running
 *                            (Anthropic Managed Agents).
 * - `per-message`         — per inbound user message (Microsoft Copilot
 *                            Studio overage).
 * - `per-token-in`        — per input token (standard model billing).
 * - `per-token-out`       — per output token (standard model billing).
 * - `vcpu-hour`           — per vCPU-hour of compute (Microsoft Foundry).
 * - `memory-gib-hour`     — per GiB of memory per hour (Microsoft Foundry).
 * - `events-1k`           — per 1000 events emitted (some observability
 *                            metering surfaces).
 * - `flat-subscription`   — flat per-period fee (Anthropic Max X20 $200/mo).
 */
export type CostBillingAxis =
  | "session-hour"
  | "per-message"
  | "per-token-in"
  | "per-token-out"
  | "vcpu-hour"
  | "memory-gib-hour"
  | "events-1k"
  | "flat-subscription";

/**
 * Cost amount paired with a billing unit. The unit is free-form (e.g.
 * `"month"`, `"session-hour"`, `"1M-tokens"`) — caller MUST interpret it
 * within the vendor's documented billing convention.
 *
 * - `unit`   — the billing unit string.
 * - `amount` — the cost in the vendor's billed currency. Currency is
 *               implied by vendor (USD for all current entries); add
 *               `currency` field at v1.43+ if multi-currency support
 *               becomes needed.
 */
export interface CostAmount {
  readonly unit: string;
  readonly amount: number;
}

/**
 * Top-level vendor cost profile.
 *
 * - `vendor`        — the canonical vendor identifier.
 * - `billingAxes`   — every axis the vendor meters (informational; full
 *                      cost computation requires per-axis amounts which
 *                      the consumer pulls from idleCost / memoryCost /
 *                      vendor-doc references).
 * - `idleCost`      — cost while the session/runtime is idle (no model
 *                      calls in flight). Many vendors charge nothing
 *                      while idle; some (e.g. Microsoft Foundry vCPU
 *                      reservations) do.
 * - `memoryCost`    — cost specifically for memory consumption. Null
 *                      when memory is bundled into another axis.
 * - `notes`         — 1-line citation + free-form. Cite the canonical
 *                      research/ mirror path so audits can re-verify.
 */
export interface HarnessSpeciesCostProfileDeclaration {
  readonly vendor: HarnessSpeciesVendor;
  readonly billingAxes: readonly CostBillingAxis[];
  readonly idleCost: CostAmount;
  readonly memoryCost: CostAmount | null;
  readonly notes: string;
}

/**
 * Runtime-readable list of all valid vendor identifiers.
 */
export const HARNESS_SPECIES_VENDORS: readonly HarnessSpeciesVendor[] = [
  "claude-code-cli-max",
  "anthropic-managed-agents",
  "openai-agents-sdk",
  "google-gemini-enterprise",
  "microsoft-foundry",
  "microsoft-copilot-studio",
  "local-ollama",
] as const;

/**
 * Runtime-readable list of all valid billing axes.
 */
export const COST_BILLING_AXES: readonly CostBillingAxis[] = [
  "session-hour",
  "per-message",
  "per-token-in",
  "per-token-out",
  "vcpu-hour",
  "memory-gib-hour",
  "events-1k",
  "flat-subscription",
] as const;

export function isHarnessSpeciesVendor(s: string): s is HarnessSpeciesVendor {
  return (HARNESS_SPECIES_VENDORS as readonly string[]).includes(s);
}

export function isCostBillingAxis(s: string): s is CostBillingAxis {
  return (COST_BILLING_AXES as readonly string[]).includes(s);
}

/**
 * Type guard for the top-level declaration shape. Validates structural
 * presence + axis-membership; does not range-check `amount` values.
 */
export function isHarnessSpeciesCostProfileDeclaration(
  x: unknown,
): x is HarnessSpeciesCostProfileDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const p = x as HarnessSpeciesCostProfileDeclaration;
  if (!isHarnessSpeciesVendor(p.vendor as string)) return false;
  if (!Array.isArray(p.billingAxes)) return false;
  for (const a of p.billingAxes) {
    if (!isCostBillingAxis(a as string)) return false;
  }
  if (
    typeof p.idleCost !== "object" ||
    p.idleCost === null ||
    typeof p.idleCost.unit !== "string" ||
    typeof p.idleCost.amount !== "number"
  ) {
    return false;
  }
  if (p.memoryCost !== null) {
    if (
      typeof p.memoryCost !== "object" ||
      typeof p.memoryCost.unit !== "string" ||
      typeof p.memoryCost.amount !== "number"
    ) {
      return false;
    }
  }
  if (typeof p.notes !== "string") return false;
  return true;
}

/**
 * Initial 7-vendor inventory documenting the 4-vendor consensus +
 * palantir-mini's BYO-CLI-via-Max arbitrage position + local fallback.
 *
 * Cite: research/harness-engineering-2026/the-new-stack-4-vendor-harness-
 * pricing-split-2026-04.md (Janakiram MSV, 2026-04-18).
 *
 * NOTE: Pricing is informational; vendor docs are authoritative for
 * billing purposes. Re-verify before any commercial decision.
 */
export const HARNESS_SPECIES_COST_PROFILES: readonly HarnessSpeciesCostProfileDeclaration[] = [
  {
    vendor: "claude-code-cli-max",
    billingAxes: ["flat-subscription"],
    idleCost: { unit: "month", amount: 200 },
    memoryCost: null,
    notes:
      "Anthropic Max X20 $200/mo flat subscription (the palantir-mini canonical configuration). No per-token marginal cost above the cap; effectively the 3rd pricing arbitrage option vs Anthropic Managed Agents bundled session-hour + OpenAI free-runtime+BYO. Cite: research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md.",
  },
  {
    vendor: "anthropic-managed-agents",
    billingAxes: ["session-hour", "per-token-in", "per-token-out"],
    idleCost: { unit: "session-hour", amount: 0 },
    memoryCost: null,
    notes:
      "$0.08/session-hour while running + standard Claude Platform token rates. Memory + multi-agent orchestration + self-evaluating outcomes are gated behind separate research-preview access. Cite: research/anthropic/scaling-managed-agents-2026-04-08.md.",
  },
  {
    vendor: "openai-agents-sdk",
    billingAxes: ["per-token-in", "per-token-out"],
    idleCost: { unit: "session-hour", amount: 0 },
    memoryCost: null,
    notes:
      "Open-source SDK; no first-party runtime fee. Standard OpenAI token pricing + BYO sandbox compute (7-9 sandbox provider options) + BYO storage. Cite: research/openai/agents-sdk-next-evolution-2026-04-15.md + research/openai/sandbox-agents-developer-docs.md.",
  },
  {
    vendor: "google-gemini-enterprise",
    billingAxes: ["per-token-in", "per-token-out", "events-1k"],
    idleCost: { unit: "session-hour", amount: 0 },
    memoryCost: { unit: "GiB-month", amount: 0 },
    notes:
      "Vertex AI Agent Engine — per-component metering across sessions / memory / code execution / observability. Pricing varies by component; consult vendor docs for canonical rates. Cite: research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md §Google.",
  },
  {
    vendor: "microsoft-foundry",
    billingAxes: [
      "per-token-in",
      "per-token-out",
      "vcpu-hour",
      "memory-gib-hour",
    ],
    idleCost: { unit: "vcpu-hour", amount: 0.0994 },
    memoryCost: { unit: "GiB-hour", amount: 0.0149 },
    notes:
      "Foundry Agent Service — consumption-based across models + tools; specific session metering on tools like Code Interpreter rather than the platform as a whole. $0.0994/vCPU-hour reference rate. Cite: research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md §Microsoft.",
  },
  {
    vendor: "microsoft-copilot-studio",
    billingAxes: ["flat-subscription", "per-message"],
    idleCost: { unit: "month", amount: 200 },
    memoryCost: null,
    notes:
      "Pre-paid tier + per-message overage. Targeted at low-code business-process automation; less suitable for long-horizon dev agents. Cite: research/harness-engineering-2026/the-new-stack-4-vendor-harness-pricing-split-2026-04.md §Microsoft.",
  },
  {
    vendor: "local-ollama",
    billingAxes: [],
    idleCost: { unit: "session-hour", amount: 0 },
    memoryCost: null,
    notes:
      "Local model + local runtime fallback. Marginal cost is electricity + opportunity cost; not a 1차-자료 pricing line. Use for offline / air-gapped / data-residency-strict workflows.",
  },
] as const;

/**
 * Lookup helper — returns the cost profile for a given vendor, or
 * undefined when no inventory entry exists.
 */
export function costProfileForVendor(
  vendor: HarnessSpeciesVendor,
): HarnessSpeciesCostProfileDeclaration | undefined {
  return HARNESS_SPECIES_COST_PROFILES.find((p) => p.vendor === vendor);
}

/**
 * Convenience predicate — true if the vendor's pricing is dominated by a
 * flat-subscription axis (i.e. no per-token marginal cost). Currently
 * matches `claude-code-cli-max` + `microsoft-copilot-studio`. Used for
 * cost-routing tie-breaks where flat-cost throughput is preferred.
 */
export function isFlatSubscriptionVendor(
  vendor: HarnessSpeciesVendor,
): boolean {
  const p = costProfileForVendor(vendor);
  if (p === undefined) return false;
  return p.billingAxes.includes("flat-subscription");
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "7-vendor harness-species cost profile for Brain-of-Swarms cost-aware dispatch (rule 24); palantir-mini-native",
};
export { categoryFoundryEquivalent as harnessSpeciesCostProfileFoundryEquivalent };
