/**
 * @stable — PedagogyContract primitive (prim-learn-12, v1.15.0)
 *
 * Composable plug-in pedagogy framework. A math (or general learning)
 * concept declares which pedagogies apply and in what role; the runtime
 * resolves the ordered list and applies their scene transformations /
 * scaffolding hooks in declared order. Audits enforce CLT meta-constraint
 * and Bloom alignment.
 *
 * Authority chain:
 *   research/palantir-vision/synthesis/2026-04-20-mathcrew-redesign-research.md
 *   §Topic 2 — Composable Pedagogy Framework
 *     ↓
 *   schemas/ontology/primitives/pedagogy-contract.ts (this file — canonical)
 *     ↓
 *   ~/ontology/shared-core v1.2.0 (re-export)
 *     ↓
 *   mathcrew/ontology/pedagogy.ts (thin re-export; project-local until v1.15)
 *
 * Provenance:
 *   - CPA: Bruner (1966) → Singapore Math (Maths No Problem)
 *   - Productive Failure: Manu Kapur (2008-2024)
 *   - Constructionism: Seymour Papert (1980)
 *   - Variation Theory: Ference Marton (Discourses on Learning in Education)
 *   - Bloom's Taxonomy revised: Anderson & Krathwohl (2001) — used as
 *     CLASSIFICATION axis, NOT as a pedagogy plug-in
 *   - Cognitive Load Theory: John Sweller — used as META-CONSTRAINT
 *     (audit), NOT as a plug-in
 *
 * D/L/A domain: LEARN (declarative pedagogy bindings — neither stored fact,
 * nor mutation, nor logic; produces scene transformations consumed by runtime)
 * @owner palantirkc-ontology
 * @purpose Composable pedagogy plug-in primitive (PF/CPA/VT/Constructionism)
 */

/** Stable IDs of supported pedagogy plug-ins. Add entries here, not inline. */
export type PedagogyId =
  | "cpa" //                  Concrete-Pictorial-Abstract (folds old CRA axis)
  | "productive-failure" //   Kapur — explore-before-instruct sequencing
  | "constructionism" //      Papert — build-debug-share artifacts
  | "variation-theory"; //    Marton — vary critical features against invariants

/** Bloom's Taxonomy revised — orthogonal classification, not a pedagogy. */
export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** CPA representation layer — folds old CRA into CPA. */
export type RepresentationLayer = "concrete" | "pictorial" | "abstract";

/** Variation Theory pattern. */
export type VariationPattern =
  | "contrast" //         vary one feature against an invariant background
  | "generalization" //   keep concept; vary surface representation
  | "separation" //       expose distinct aspects of the same concept
  | "fusion"; //          combine multiple separated aspects into one

/** Productive Failure phase — operates ACROSS multiple beats, not within one. */
export type PFPhase = "explore" | "instruct" | "consolidate";

/** Constructionism primitive verb — what the learner DOES with the artifact. */
export type ConstructionVerb = "build" | "tinker" | "debug" | "share";

/** CPA sequencing strategy when multiple layers declared on one beat. */
export type CpaSequencing = "strict" | "cycle" | "free";

/**
 * Per-pedagogy declaration on a beat or concept.
 * `role` controls resolution priority when multiple pedagogies apply:
 *   - primary    → drives top-level scene structure
 *   - supporting → wraps/scaffolds the primary's output
 */
export interface PedagogyApplication {
  readonly id: PedagogyId;
  readonly role: "primary" | "supporting";
  readonly params: PedagogyParams;
}

/** Discriminated-union params keyed off PedagogyId. */
export type PedagogyParams =
  | {
      kind: "cpa";
      layers: readonly RepresentationLayer[];
      sequencing: CpaSequencing;
    }
  | {
      kind: "productive-failure";
      phase: PFPhase;
      /** Failure modes the explore phase is designed to surface (M-codes). */
      expectedFailures: readonly string[];
    }
  | {
      kind: "constructionism";
      verb: ConstructionVerb;
      /** Type of artifact the learner produces (e.g., "rectangle-set", "factor-tree"). */
      artifactType: string;
    }
  | {
      kind: "variation-theory";
      pattern: VariationPattern;
      /** Features that vary across sibling beats. */
      varied: readonly string[];
      /** Features that stay invariant. */
      invariant: readonly string[];
    };

/**
 * Cognitive Load constraint — meta-level audit, NOT a plug-in.
 * Audit fails if intrinsic + extraneous > maxCombinedLoad for a grade-level beat.
 */
export interface CognitiveLoadConstraint {
  readonly intrinsicEstimate: 1 | 2 | 3 | 4 | 5;
  readonly extraneousEstimate: 1 | 2 | 3 | 4 | 5;
  readonly maxCombinedLoad: number;
}

/**
 * Top-level contract attached to a Concept (across beats) or to a single Beat.
 * Runtime composes `pedagogies` in declared order; audits enforce CLT and Bloom
 * alignment.
 *
 * Resolution rules (enforced by per-project audits):
 *   1. Exactly one role="primary" per contract.
 *   2. Primary applied first; supporting plug-ins applied in array order.
 *   3. Each plug-in is a pure function (SceneTree, params) → SceneTree.
 *   4. Conflict detection: productive-failure + worked-example-style supporting
 *      → audit warns; requires explicit phaseSequence to resolve.
 *   5. Bloom alignment: bloomTarget >= 4 with no PF or constructionism →
 *      audit warns ("remember/understand-only pedagogies rarely reach
 *      analyze/evaluate/create").
 *   6. Max plug-ins per contract: 1 primary + 3 supporting = 4 total.
 */
export interface PedagogyContract {
  readonly conceptId: string;
  readonly bloomTarget: BloomLevel | { readonly min: BloomLevel; readonly max: BloomLevel };
  readonly pedagogies: readonly PedagogyApplication[];
  readonly cognitiveLoad: CognitiveLoadConstraint;
  /** Optional human-readable rationale — surfaces in audits + content browse. */
  readonly description?: string;
}

/** Branded RID for PedagogyContract instances (for cross-reference in events.jsonl). */
export type PedagogyContractRid = string & { readonly __brand: "PedagogyContractRid" };

export const pedagogyContractRid = (s: string): PedagogyContractRid =>
  s as PedagogyContractRid;

/**
 * In-memory registry. Consumer processes (palantir-math, mathcrew) populate
 * their own instances at startup by calling `register()` from their content
 * declarations. Mirrors the HARNESS_AGENT_REGISTRY pattern.
 */
export class PedagogyContractRegistry {
  private readonly items = new Map<PedagogyContractRid, PedagogyContract>();

  register(rid: PedagogyContractRid, contract: PedagogyContract): void {
    this.items.set(rid, contract);
  }

  get(rid: PedagogyContractRid): PedagogyContract | undefined {
    return this.items.get(rid);
  }

  byConcept(conceptId: string): PedagogyContract[] {
    return [...this.items.values()].filter((c) => c.conceptId === conceptId);
  }

  keys(): IterableIterator<PedagogyContractRid> {
    return this.items.keys();
  }

  list(): PedagogyContract[] {
    return [...this.items.values()];
  }
}

export const PEDAGOGY_CONTRACT_REGISTRY = new PedagogyContractRegistry();
