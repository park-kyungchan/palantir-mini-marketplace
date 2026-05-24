/**
 * palantir-mini — SemanticRid primitive (prim-learn-13)
 *
 * === ONTOLOGY-FIRST IMPACT SUBSTRATE ===
 *
 * The primary identity model for the semantic graph. Every ontology entity,
 * generated contract, runtime surface, eval/monitor/doc/lineage/artifact
 * target is a SemanticRid with a namespaced kind prefix. file:* RIDs are
 * DEMOTED to evidence, never primary identity.
 *
 * Authority chain:
 *   research/palantir-vision/synthesis/2026-04-23-palantir-mini-ontology-first-rebuild-proposal.md §L1
 *   → schemas/ontology/primitives/semantic-rid.ts (this file)
 *   → palantir-mini/lib/semantic-graph/*
 *
 * Wave 2 of the ontology-first rebuild (plan: ~/.claude/plans/dapper-baking-treasure.md).
 *
 * @owner palantirkc-ontology
 * @purpose SemanticRid primitive (prim-learn-13) — ontology-first semantic impact
 */

export type SemanticRidKind =
  | "ontology"
  | "gen"
  | "runtime"
  | "eval"
  | "mon"
  | "doc"
  | "lineage"
  | "artifact"
  | "file";

export type SemanticRid = string & { readonly __brand: "SemanticRid" };

/** Factory: constructs "kind:value" SemanticRid. Throws on empty value or (except for kind="file") embedded colons. */
export const semanticRid = (kind: SemanticRidKind, value: string): SemanticRid => {
  if (!value) {
    throw new Error(`semanticRid: value must be non-empty (kind='${kind}')`);
  }
  if (value.includes(":") && kind !== "file") {
    throw new Error(`semanticRid: value must be colon-free for kind '${kind}' (got '${value}')`);
  }
  return `${kind}:${value}` as SemanticRid;
};

/** Parses a SemanticRid into its kind + value components. */
export const parseSemanticRid = (rid: SemanticRid): { kind: SemanticRidKind; value: string } => {
  const idx = (rid as string).indexOf(":");
  if (idx === -1) throw new Error(`parseSemanticRid: missing colon in '${rid}'`);
  const kind = (rid as string).slice(0, idx) as SemanticRidKind;
  const value = (rid as string).slice(idx + 1);
  return { kind, value };
};

export interface SemanticRidDeclaration {
  readonly rid: SemanticRid;
  readonly kind: SemanticRidKind;
  readonly value: string;
  /** Human-readable label for reports. */
  readonly label?: string;
  /** ISO timestamp of first registration. */
  readonly registeredAt: string;
}

export class SemanticRidRegistry {
  private readonly byRid = new Map<SemanticRid, SemanticRidDeclaration>();
  private readonly byKind = new Map<SemanticRidKind, Set<SemanticRid>>();

  register(decl: SemanticRidDeclaration): void {
    this.byRid.set(decl.rid, decl);
    const set = this.byKind.get(decl.kind) ?? new Set<SemanticRid>();
    set.add(decl.rid);
    this.byKind.set(decl.kind, set);
  }

  get(rid: SemanticRid): SemanticRidDeclaration | undefined {
    return this.byRid.get(rid);
  }

  listByKind(kind: SemanticRidKind): ReadonlyArray<SemanticRidDeclaration> {
    const rids = this.byKind.get(kind) ?? new Set<SemanticRid>();
    return [...rids].map((r) => this.byRid.get(r)!).filter(Boolean);
  }

  list(): ReadonlyArray<SemanticRidDeclaration> {
    return [...this.byRid.values()];
  }

  size(): number {
    return this.byRid.size;
  }

  clear(): void {
    this.byRid.clear();
    this.byKind.clear();
  }
}

export const SEMANTIC_RID_REGISTRY = new SemanticRidRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Semantic-RID parsed-form primitive for impact-query traversal; palantir-mini-native",
};
export { categoryFoundryEquivalent as semanticRidFoundryEquivalent };
