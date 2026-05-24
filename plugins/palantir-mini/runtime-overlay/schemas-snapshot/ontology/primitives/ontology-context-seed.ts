/**
 * @stable — OntologyContextSeed primitive (prim-data-NN, v1.62.0)
 *
 * Promotes OntologyContextSeed from ghost to typed primitive. Closes the gap
 * where OntologyContextSeed was permanently stuck at "unapproved-context-seed"
 * with no canonical typed shape (see ontology-context-approval.ts:5).
 *
 * A seed is the proto-context: the system's inferred ontology entry points +
 * scope hints + supporting evidence, BEFORE human/agent approval transforms
 * it into a sanctioned OntologyContextApproval.
 *
 * Lifecycle:
 *   drafted → (via pm_intent_router / ontology_context_query)
 *   approved → (via createOntologyContextApproval in plugin lib)
 *   rejected / expired / superseded → terminal states
 *
 * Authority:
 *   - rule 01 §Ontology-First Core
 *   - rule 26 §Axes (D — Shareable)
 *   - canonical plan v2 §4 row 5.9
 *   - ontology-context-approval.ts (approval is downstream of seed)
 *
 * @owner palantirkc-ontology
 * @since v1.62.0
 */

export type OntologyContextSeedRid = string & {
  readonly __brand: "OntologyContextSeedRid";
};

export const ontologyContextSeedRid = (s: string): OntologyContextSeedRid =>
  s as OntologyContextSeedRid;

/**
 * Lifecycle status of an OntologyContextSeed.
 *   drafted    — system-generated, not yet reviewed.
 *   approved   — promoted to OntologyContextApproval (see approvalRef).
 *   rejected   — explicitly rejected; not eligible for reuse.
 *   expired    — TTL elapsed or superseded session.
 *   superseded — replaced by a newer seed for the same intent.
 */
export type OntologyContextSeedStatus =
  | "drafted"
  | "approved"
  | "rejected"
  | "expired"
  | "superseded";

/**
 * A single scope hint: a file path, glob, or RID prefix with a weight signal.
 * weight = 0-1 (1 = highest confidence this path is in scope).
 */
export interface OntologyContextSeedScopeHint {
  /** File path, glob pattern, or RID prefix */
  readonly path: string;
  /** Confidence weight 0-1 */
  readonly weight: number;
}

/**
 * Canonical schema shape for an OntologyContextSeed.
 *
 * Created by ontology_context_query / pm_intent_router when they infer an
 * entry point from the prompt. The seed is promoted to an
 * OntologyContextApproval by createOntologyContextApproval() (plugin lib)
 * once confidence + user/lead approval is satisfied.
 */
export interface OntologyContextSeedDeclaration {
  /** Deterministic or uuid-based seed identifier. */
  readonly seedId: OntologyContextSeedRid;
  /** Lifecycle status. */
  readonly status: OntologyContextSeedStatus;
  /** ISO8601 creation timestamp. */
  readonly generatedAt: string;
  /** ISO8601 expiry — if absent, expires with the session. */
  readonly expiresAt?: string;
  /** Prompt identity that triggered seed generation. */
  readonly sourcePromptId?: string;
  /** Session that generated this seed. */
  readonly sourceSessionId?: string;
  /**
   * Entry RIDs returned by impact_query / get_ontology as entry-points for
   * this seed (ObjectType, ActionType, Function, AIPAgent RIDs).
   */
  readonly sourceRids: readonly string[];
  /**
   * Scope hints inferred from ontology + surface-policy routing.
   * Ordered by descending weight.
   */
  readonly scopeHints: readonly OntologyContextSeedScopeHint[];
  /**
   * Paths under research/ that supply supporting evidence for the
   * scope inference (e.g. BROWSE.md citations, canonical source refs).
   */
  readonly supportingResearchRefs: readonly string[];
  /** Overall confidence score 0-1 for the scope inference. */
  readonly confidenceScore?: number;
  /** RIDs whose outgoing edges weren't yet indexed at seed-generation time. */
  readonly missingEdges?: readonly string[];
  /**
   * RID of the OntologyContextApproval produced when this seed was approved.
   * Populated by the plugin's createOntologyContextApproval() factory.
   */
  readonly approvalRef?: string;
  /** Free-text provenance annotation (generator, prompt excerpt, etc). */
  readonly provenance?: string;
}

/**
 * In-memory registry for OntologyContextSeed declarations.
 * Lifecycle-aware: byStatus() filters for quick querying.
 */
export class OntologyContextSeedRegistry {
  private readonly items = new Map<
    OntologyContextSeedRid,
    OntologyContextSeedDeclaration
  >();

  register(decl: OntologyContextSeedDeclaration): void {
    this.items.set(decl.seedId, decl);
  }

  get(rid: OntologyContextSeedRid): OntologyContextSeedDeclaration | undefined {
    return this.items.get(rid);
  }

  list(): OntologyContextSeedDeclaration[] {
    return [...this.items.values()];
  }

  byStatus(status: OntologyContextSeedStatus): OntologyContextSeedDeclaration[] {
    return [...this.items.values()].filter((s) => s.status === status);
  }
}

export const ONTOLOGY_CONTEXT_SEED_REGISTRY = new OntologyContextSeedRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "OntologyContextSeed is palantir-mini-originated (proto-context lifecycle layer above Foundry's ontology branching). Carries scope-hints + research-refs + lifecycle-status fields with no direct Foundry counterpart.",
};
export { categoryFoundryEquivalent as ontologyContextSeedFoundryEquivalent };
