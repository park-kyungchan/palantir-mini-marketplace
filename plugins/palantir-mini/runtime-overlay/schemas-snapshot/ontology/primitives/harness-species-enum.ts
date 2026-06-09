/**
 * @stable — HarnessSpeciesEnum primitive (prim-meta-02, v1.50.0)
 *
 * Promotes the 7-species `HarnessSpeciesId` literal union from a
 * dispatch-contract-local declaration to a stand-alone schema-canonical
 * primitive. Closes architecture review §3.4 / R1-F4 (Minor): until
 * v1.50.0 the species inventory was duplicated across 3 surfaces with no
 * single SSoT primitive — `dispatch-contract.ts` declared a local literal
 * union (W1.13), `harness-species-cost-profile.ts` declared `HarnessSpeciesVendor`
 * (parallel vendor axis), and `rules/CONTEXT.md §15` carried the human-
 * readable enumeration. This primitive consolidates the architectural-class
 * axis as a single typed canonical source consumed by all three surfaces.
 *
 * Design:
 *   - `HarnessSpeciesId`             — branded string literal union covering
 *                                       7 architectural species per
 *                                       CONTEXT.md §15.
 *   - `HARNESS_SPECIES_IDS`          — runtime inventory const matching the
 *                                       union for `Object.values`-style
 *                                       iteration.
 *   - `HARNESS_SPECIES_DESCRIPTIONS` — frozen Record<HarnessSpeciesId, string>
 *                                       carrying 1-line description per
 *                                       species (mirrors CONTEXT.md §15
 *                                       glossary). Useful for cost-aware
 *                                       dispatch UIs + audit reports.
 *   - `isHarnessSpeciesId`           — runtime type guard.
 *
 * Authority chain:
 *   research/anthropic/scaling-managed-agents-2026-04-08.md
 *     + research/anthropic/harness-design-2026-03-24.md
 *     + research/harness-engineering-2026/the-new-stack-4-vendor-
 *         harness-pricing-split-2026-04.md
 *   ↓ rules/CONTEXT.md §15 (canonical 7-species enumeration)
 *   ↓ rules/CONTEXT.md §17 (Brain-of-Swarms layer model)
 *   ↓ ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §3.4 (R1-F4)
 *   ↓ schemas/ontology/primitives/harness-species-enum.ts (this file)
 *   ↓ schemas/ontology/primitives/dispatch-contract.ts (re-imports)
 *   ↓ schemas/ontology/primitives/harness-species-cost-profile.ts (vendor axis ref)
 *   ↓ ~/ontology/shared-core/index.ts (re-export surface)
 *   ↓ palantir-mini bridge handlers (dispatch-route-decide, pm-dispatch-cost-estimate)
 *
 * Cross-refs:
 *   - rule 16 v4.1.0 §0 (5-species governance — predecessor 5-species
 *     listing prior to W2.C 7-species expansion).
 *   - rule 24 v1.1.0 §Dispatch flowchart step 1 ("identify species").
 *   - rule 24 v1.1.0 §Cost-aware dispatch (HarnessSpeciesCostProfile).
 *   - HarnessSpeciesVendor (vendor axis) in
 *     harness-species-cost-profile.ts — parallel axis, not synonymous.
 *   - dispatch-contract.ts (v1.48.0) — pre-W2.1 declared local union now
 *     replaced with re-export from this primitive.
 *
 * Vendor-vs-species distinction (mirrors dispatch-contract.ts comment):
 *   - **Species** = architectural class (this primitive). 7 distinct loop
 *     architectures: CLI / Agent SDK / task-specific / Managed Agents /
 *     palantir-mini-sprint / Gemini Enterprise / Microsoft Foundry.
 *   - **Vendor** = billing/runtime surface
 *     (`HarnessSpeciesCostProfile.vendor`). 7+ vendors, e.g.
 *     `claude-code-cli-max`, `openai-agents-sdk`, `local-ollama`. Same
 *     architectural species can map to multiple vendors (e.g. species
 *     `claude-agent-sdk` → vendors `openai-agents-sdk` BYO loop OR
 *     `claude-code-cli-max` BYO loop).
 *
 * D/L/A domain: DATA (enumeration shape — declarative architectural
 * taxonomy, no executable surface).
 *
 * @owner palantirkc-ontology
 * @purpose Canonical 7-species architectural taxonomy enum
 */

/**
 * 7-species architectural taxonomy mirroring rules/CONTEXT.md §15.
 *
 * Each species is a distinct "loop that calls Claude/the model and routes
 * tool calls to infrastructure" (Lance Martin "Scaling Managed Agents"
 * 2026-04-08 verbatim definition). palantir-mini Brain dispatches across
 * all 7 species; it is NOT itself a species (control plane).
 *
 * Species inventory (architectural class):
 *   1. claude-code-cli              — Anthropic Claude Code CLI default.
 *   2. claude-agent-sdk             — User-authored loop via SDK.
 *   3. task-specific-harness        — Bespoke harness (e.g. Prithvi 3-agent).
 *   4. anthropic-managed-agents     — Anthropic Managed Agents meta-harness
 *                                       (contains a pre-built species).
 *   5. palantir-mini-sprint-harness — palantir-mini sprint contract loop
 *                                       (rule 16 governs).
 *   6. gemini-enterprise            — Google Gemini Enterprise Agent
 *                                       Platform (April 2026).
 *   7. microsoft-foundry            — Microsoft Foundry Agent Service
 *                                       (April 2026).
 *
 * NOTE: New species promote into this union via additive MINOR. Rename or
 * remove triggers MAJOR per rule 08.
 */
export type HarnessSpeciesId =
  | "claude-code-cli"
  | "claude-agent-sdk"
  | "task-specific-harness"
  | "anthropic-managed-agents"
  | "palantir-mini-sprint-harness"
  | "gemini-enterprise"
  | "microsoft-foundry";

/**
 * Runtime-readable inventory of all 7 species ids. Mirrors the literal
 * union for use in `Object.values`-style iteration, runtime validators,
 * and audit reports. Frozen via `as const` for type narrowness.
 */
export const HARNESS_SPECIES_IDS: readonly HarnessSpeciesId[] = [
  "claude-code-cli",
  "claude-agent-sdk",
  "task-specific-harness",
  "anthropic-managed-agents",
  "palantir-mini-sprint-harness",
  "gemini-enterprise",
  "microsoft-foundry",
] as const;

/**
 * 1-line description per species mirroring rules/CONTEXT.md §15 glossary.
 * Useful for cost-aware dispatch UIs (`dispatch-route-decide` handler) +
 * audit reports + species-comparison surfaces.
 */
export const HARNESS_SPECIES_DESCRIPTIONS: Readonly<
  Record<HarnessSpeciesId, string>
> = Object.freeze({
  "claude-code-cli":
    "Anthropic Claude Code CLI default species; rule 16 governs sprint-harness layer within it.",
  "claude-agent-sdk":
    "Claude Agent SDK — user-authored loop; no built-in sprint gate.",
  "task-specific-harness":
    "Task-specific harness (e.g. Prithvi 3-agent pattern 2026-03-24).",
  "anthropic-managed-agents":
    "Anthropic Managed Agents meta-harness (contains a pre-built harness species).",
  "palantir-mini-sprint-harness":
    "palantir-mini-sprint-harness — Sprint Contract + grader dispatch loop (rule 16 governs).",
  "gemini-enterprise":
    "Google Gemini Enterprise Agent Platform (April 2026); components-metered (compute + memory + storage + model).",
  "microsoft-foundry":
    "Microsoft Foundry Agent Service (April 2026); bundled in M365 + AI Foundry; vCPU-hour + GiB-hour + per-1K-events billing.",
});

/**
 * Type guard for HarnessSpeciesId. Useful for runtime input validation
 * before narrowing into discriminated unions or dispatch routing.
 *
 * @example
 *   const raw: string = userInput;
 *   if (isHarnessSpeciesId(raw)) {
 *     // raw is now narrowed to HarnessSpeciesId
 *     dispatch.route(raw);
 *   }
 */
export function isHarnessSpeciesId(s: string): s is HarnessSpeciesId {
  return (HARNESS_SPECIES_IDS as readonly string[]).includes(s);
}
