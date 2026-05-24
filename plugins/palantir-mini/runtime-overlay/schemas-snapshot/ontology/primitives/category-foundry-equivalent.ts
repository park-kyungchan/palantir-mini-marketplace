/**
 * @stable — categoryFoundryEquivalent metadata primitive (prim-meta-01, v1.48.0)
 *
 * Machine-readable Foundry-mapping metadata for every schema primitive.
 *
 * Closes architecture review §3.4 R5-F14 (S3) — until v1.48.0, the relation
 * between palantir-mini schema primitives and their Palantir Foundry
 * counterparts was prose-only (in primitive file leading comments + Appendix
 * C of `~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md`).
 *
 * Each primitive file now exports a `categoryFoundryEquivalent` constant of
 * type `FoundryEquivalence` so audits, codegen, and migration tooling can
 * query the relationship structurally:
 *
 *   import { categoryFoundryEquivalent } from "./object-type";
 *   if (categoryFoundryEquivalent.kind === "equivalent") {
 *     // safe to invoke OSDK 2.0 round-trip generators
 *   }
 *
 * Aggregate access via `getFoundryEquivalents()` exported from the primitives
 * barrel (`./index.ts`); registry access via `FOUNDRY_EQUIVALENTS_REGISTRY`.
 *
 * Authority chain:
 *   research/palantir-foundry/** (Foundry surface)
 *     ↓
 *   ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md Appendix C
 *     ↓
 *   schemas/ontology/primitives/category-foundry-equivalent.ts (this file)
 *     ↓
 *   per-primitive `categoryFoundryEquivalent` exports
 *     ↓
 *   ~/ontology/shared-core/index.ts re-export
 *     ↓
 *   audits + migration tooling consumers
 *
 * D/L/A domain: META (metadata about other primitives — describes the
 * relation between schema-layer atoms and Foundry's canonical surface;
 * SH-01: "delete this file, do objects still describe reality?" YES → META).
 *
 * @owner palantirkc-ontology
 * @purpose Foundry-equivalence metadata primitive (R5-F14 / S3 closure)
 */

/**
 * Discriminated union expressing how a palantir-mini primitive relates to
 * its Palantir Foundry counterpart. Four kinds, each with a distinct shape:
 *
 *   - equivalent      — schema mirrors Foundry's surface; round-trippable.
 *   - partial         — Foundry counterpart exists but schema is a subset;
 *                       `gaps` enumerates the missing fields/concepts.
 *   - over-specified  — schema is a superset of Foundry's surface;
 *                       `extensions` enumerates palantir-mini-native additions.
 *   - claude-extension — palantir-mini/Claude-overlay only; no Foundry
 *                        equivalent exists. `rationale` documents why.
 */
export type FoundryEquivalence =
  | { readonly kind: "equivalent"; readonly foundryType: string }
  | { readonly kind: "partial"; readonly foundryType: string; readonly gaps: readonly string[] }
  | {
      readonly kind: "over-specified";
      readonly foundryType: string;
      readonly extensions: readonly string[];
    }
  | { readonly kind: "claude-extension"; readonly rationale: string };

/** All four discriminator values, exported for ergonomic enumeration. */
export const FOUNDRY_EQUIVALENCE_KINDS = [
  "equivalent",
  "partial",
  "over-specified",
  "claude-extension",
] as const;

export type FoundryEquivalenceKind = (typeof FOUNDRY_EQUIVALENCE_KINDS)[number];

/**
 * Runtime guard for `FoundryEquivalence`. Validates the discriminator + the
 * shape of the payload for each kind.
 */
export function isFoundryEquivalence(value: unknown): value is FoundryEquivalence {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v.kind) {
    case "equivalent":
      return typeof v.foundryType === "string";
    case "partial":
      return (
        typeof v.foundryType === "string" &&
        Array.isArray(v.gaps) &&
        v.gaps.every((g) => typeof g === "string")
      );
    case "over-specified":
      return (
        typeof v.foundryType === "string" &&
        Array.isArray(v.extensions) &&
        v.extensions.every((e) => typeof e === "string")
      );
    case "claude-extension":
      return typeof v.rationale === "string";
    default:
      return false;
  }
}

/**
 * Convenience helpers — short names that read well at primitive declaration
 * sites. Each constructs the matching `FoundryEquivalence` variant.
 */
export const foundryEquivalent = (foundryType: string): FoundryEquivalence => ({
  kind: "equivalent",
  foundryType,
});

export const foundryPartial = (
  foundryType: string,
  gaps: readonly string[],
): FoundryEquivalence => ({ kind: "partial", foundryType, gaps });

export const foundryOverSpecified = (
  foundryType: string,
  extensions: readonly string[],
): FoundryEquivalence => ({
  kind: "over-specified",
  foundryType,
  extensions,
});

export const claudeExtension = (rationale: string): FoundryEquivalence => ({
  kind: "claude-extension",
  rationale,
});

// --- Foundry equivalence (R5-F14 / S3) ---
// Self-reference: this metadata primitive describes how OTHER primitives map
// to Foundry; it has no Foundry counterpart of its own.
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "categoryFoundryEquivalent metadata primitive itself — describes other primitives' Foundry mapping; meta-meta-level, no Foundry equivalent",
};
export { categoryFoundryEquivalent as categoryFoundryEquivalentFoundryEquivalent };
