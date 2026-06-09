/**
 * @stable — GraderEffort primitive (prim-harness-10, v1.42.0)
 *
 * 5-level reasoning-effort ladder unifying Anthropic Opus 4.7 `/effort` flag
 * + Claude Code CLI effort param + OpenAI GPT-5.5 `reasoning.effort` enum.
 * Supersedes the implicit binary `default | critical` tier used pre-W2 for
 * `pm_grader_dispatch` model selection (Sonnet 4.6 default vs Opus 4.7 for
 * `criterion.tier="critical"`); the binary collapsed everything between
 * "default thinking" and "deepest reasoning budget" into a single bucket
 * and could not express GPT-5.5's `none / low / medium / high / xhigh`
 * 5-level surface.
 *
 * Mapping intent — the helper `mapTierToClaudeCodeEffort` returns the
 * value to pass to Claude Code CLI's `/effort <flag>` command (or omit
 * when undefined). This is the canonical bridge from palantir-mini's
 * typed criterion tier to the runtime flag the grader subprocess sees:
 *
 *   tier="none"     → no model call (graders short-circuit)
 *   tier="low"      → undefined  (default thinking; cheapest path)
 *   tier="normal"   → undefined  (default thinking; Sonnet 4.6 default)
 *   tier="high"     → "high"     (extended thinking; Sonnet 4.6 with
 *                                   adaptive thinking on)
 *   tier="critical" → "xhigh"    (deepest reasoning budget; Opus 4.7 only;
 *                                   per Anthropic 2026-04-16 platform docs
 *                                   "Recommended effort levels for Claude
 *                                   Opus 4.7": "Start with the new `xhigh`
 *                                   effort level for coding and agentic
 *                                   use cases")
 *
 * D/L/A domain: DATA (enumeration shape — declarative tier label, not
 * an action invocation; runtime maps to CLI flag at dispatch time).
 *
 * Authority chain:
 *   research/anthropic/opus-4-7-whats-new-platform.md (xhigh introduced;
 *     budget_tokens removed; `/effort` flag canonical)
 *     + research/openai/gpt-5-5-introducing-2026-04-23.md
 *     + research/openai/gpt-5-5-model-developer-page.md (5-level effort)
 *     ↓
 *   plans/mellow-plotting-oasis.md §Wave 2 W2.A.1
 *     ↓
 *   schemas/ontology/primitives/grader-effort.ts (this file)
 *     ↓
 *   palantir-mini/lib/grader/buildGraderModelEnv.ts (Wave 3 wiring)
 *     + bridge/handlers/pm-grader-dispatch.ts (per-criterion effort routing)
 *
 * Rule cross-refs: rule 16 v4.1.0 §Roles (`pm_grader_dispatch` Sonnet 4.6 /
 * Opus 4.7 split); rule 26 v1.0.0 §Axis B (Verifiable — graders pair with
 * outcome-bearing rubric domains).
 *
 * @owner palantirkc-ontology
 * @purpose 5-level grader effort ladder (none / low / normal / high / critical)
 */

/**
 * Five canonical effort levels mapped onto cross-vendor reasoning ladders.
 *
 * - `none`     — no model call (the criterion is a deterministic shell /
 *                JSONSchema check; graders short-circuit before subprocess
 *                spawn). Cheapest path.
 * - `low`      — default thinking, low token budget. Sonnet 4.6 minimum.
 *                Equivalent to GPT-5.5 `reasoning.effort: "low"`.
 * - `normal`   — default thinking, no extended reasoning. Sonnet 4.6 default
 *                (matches pre-rule binary `tier="default"` semantics).
 *                Equivalent to GPT-5.5 `reasoning.effort: "medium"`.
 * - `high`     — extended thinking, adaptive on. Sonnet 4.6 with `/effort
 *                high`. Equivalent to GPT-5.5 `reasoning.effort: "high"`.
 * - `critical` — deepest reasoning budget. Opus 4.7 only with `/effort
 *                xhigh`. Equivalent to GPT-5.5 `reasoning.effort: "xhigh"`.
 *                Reserved for criteria where mis-grading produces durable
 *                consequence (rule violations, architectural breaks).
 *
 * Backwards-compat note: the binary tier (`default | critical`) referenced
 * in palantir-mini CHANGELOG v3.5.0 maps to (`normal | critical`).
 */
export type GraderEffortLevel =
  | "none"
  | "low"
  | "normal"
  | "high"
  | "critical";

/**
 * Runtime-readable list of all valid GraderEffortLevel values. Used by
 * pm_grader_dispatch handler + buildGraderModelEnv() helper to validate
 * inbound criterion tier strings before mapping to CLI flag.
 */
export const GRADER_EFFORT_LEVELS: readonly GraderEffortLevel[] = [
  "none",
  "low",
  "normal",
  "high",
  "critical",
] as const;

/**
 * Type guard — returns true if `s` is a valid GraderEffortLevel string.
 * Use to validate `criterion.tier` field on inbound rubric declarations.
 */
export function isGraderEffortLevel(s: string): s is GraderEffortLevel {
  return (GRADER_EFFORT_LEVELS as readonly string[]).includes(s);
}

/**
 * Map palantir-mini criterion tier to Anthropic Claude Code CLI `/effort`
 * flag value. Returns `undefined` when no `/effort` should be passed (the
 * subprocess uses the model default).
 *
 * Caller contract: when this returns `undefined`, the caller MUST NOT pass
 * an `--effort` arg or set the `/effort` flag. Passing an empty string or
 * literal "undefined" will surface as a Claude Code CLI parse error.
 *
 * - `"none"`     → `undefined` (caller skips the model call entirely).
 * - `"low"`      → `undefined` (default thinking; cheapest token path).
 * - `"normal"`   → `undefined` (Sonnet 4.6 default; matches pre-W2 binary
 *                                tier="default").
 * - `"high"`     → `"high"`    (Sonnet 4.6 with extended thinking on).
 * - `"critical"` → `"xhigh"`   (Opus 4.7 only; deepest reasoning budget).
 *
 * Authority: research/anthropic/opus-4-7-whats-new-platform.md §Recommended
 * effort levels for Claude Opus 4.7 (`xhigh` introduced 2026-04-16).
 */
export function mapTierToClaudeCodeEffort(
  tier: GraderEffortLevel,
): "high" | "xhigh" | undefined {
  switch (tier) {
    case "none":
      return undefined; // no model call
    case "low":
      return undefined; // default thinking; cheapest
    case "normal":
      return undefined; // default thinking (Sonnet 4.6 default)
    case "high":
      return "high"; // Sonnet 4.6 with extended thinking
    case "critical":
      return "xhigh"; // Opus 4.7 with deepest reasoning budget
  }
}

/**
 * Convenience predicate — true if the tier requires a model subprocess at
 * all. Returns false only for `"none"` (deterministic-only criteria).
 *
 * Use to short-circuit grader dispatch when `tier === "none"` — the
 * caller should evaluate the criterion's `validationExpression` directly
 * (shell command / regex / JSONSchema) and never spawn `claude -p`.
 */
export function tierRequiresModelCall(tier: GraderEffortLevel): boolean {
  return tier !== "none";
}

/**
 * Convenience predicate — true if the tier should select Opus 4.7 over
 * Sonnet 4.6 in pm_grader_dispatch. Currently only `"critical"` triggers
 * Opus; this maintains the v1.41 binary tier semantics post-expansion to
 * 5 levels (rule 16 v4.1.0 §Roles preserved verbatim).
 */
export function tierSelectsOpus(tier: GraderEffortLevel): boolean {
  return tier === "critical";
}
