/**
 * @stable — SceneCouplingV4 primitive (prim-data-17, v1.33.0)
 *
 * 12-kind discriminated union describing cross-scene dependencies in the
 * palantir-math dual-canvas board. Each variant carries exactly the fields its
 * binder reads; the discriminant is the `kind` field. Replaces the former flat
 * optional-field interface so `Extract<SceneCouplingV4, { kind: K }>` produces
 * a real narrow type, resolving the `never` collapse in CouplingBinder<K>.
 *
 * Authority:
 *   - palantir-math src/types/seq-data.ts SceneCouplingV4 (1618-1778)
 *
 * D/L/A domain: DATA (declarative cross-scene dependency spec — stored fact,
 * not logic; runtime binding happens in src/lib/jsxGraph/sceneCoupling.ts)
 * @owner palantirkc-ontology
 * @purpose Canonical SceneCouplingV4 primitive for W5-A consumer surface
 * @source palantir-math/src/types/seq-data.ts:1618-1778
 * @fetched 2026-05-01
 * @version 1.33.0
 */

/**
 * All 12 coupling kinds. Backward-compatible — the 5 v3 kinds (derivative,
 * integral, zoom, mirror, independent) retain an optional `type` field.
 * The 6 geometric kinds omit `type` entirely.
 * `curveintersection` is the 12th geometric kind.
 */
export type SceneCouplingV4Kind =
  | "derivative"
  | "integral"
  | "zoom"
  | "mirror"
  | "independent"
  | "expression"
  | "tangent"
  | "perpendicular"
  | "reflection"
  | "mirrorpoint"
  | "intersection"
  | "curveintersection";

/** Shared base fields present on every SceneCouplingV4 variant. */
export interface SceneCouplingBase {
  /** Source scene key — 'primary' refers to the canonical primary canvas scene. */
  readonly sourceScene: "primary" | string;
  /** Target scene key — 'primary' or an auxScenes key. */
  readonly targetScene: "primary" | string;
}

/** Reverse manipulation policy for expression-coupling. */
export type FunctionDependencyMode =
  | "none"
  | "parameter-writeback"
  | "inverse-solver";

/** Source function alias binding for expression-coupling. */
export interface FunctionSourceBinding {
  /** Alias used inside a dependent expression, e.g. f in g(x)=abs(f(x))-abs(x). */
  readonly alias: string;
  /** Source scene key. Defaults to the coupling sourceScene. */
  readonly scene?: "primary" | string;
  /** Functiongraph/curve element id in the source scene. */
  readonly elementId: string;
}

/**
 * v4 SceneCoupling as a discriminated union — one variant per coupling kind.
 *
 * Backward-compatible: the 5 v3 kinds (derivative, integral, zoom, mirror,
 * independent) retain an optional `type` field mirroring `kind`.
 * The 7 geometric kinds omit `type` entirely.
 */
export type SceneCouplingV4 =
  /** Integral: renders ∫(integrationFrom→x) f(t) dt in target board. */
  | (SceneCouplingBase & {
      readonly kind: "integral";
      /** v3 backward-compat mirror. */
      readonly type?: "integral";
      /** Element ID of the source functiongraph whose Y-evaluator is integrated. */
      readonly sourceElementId?: string;
      /** Integration lower bound. Required at runtime; optional here to allow partial construction. */
      readonly integrationFrom?: number;
      /** When true, target board tracks source x-axis range. */
      readonly xAxisSync?: boolean;
    })
  /** Derivative: renders d/dx f(x) in target board. */
  | (SceneCouplingBase & {
      readonly kind: "derivative";
      /** v3 backward-compat mirror. */
      readonly type?: "derivative";
      /** Element ID of the source functiongraph to differentiate. */
      readonly sourceElementId?: string;
      /** When true, target board tracks source x-axis range. */
      readonly xAxisSync?: boolean;
    })
  /** Zoom: sets target board bounding box to a subregion of source. */
  | (SceneCouplingBase & {
      readonly kind: "zoom";
      /** v3 backward-compat mirror. */
      readonly type?: "zoom";
      /** Subregion to display in the target board. */
      readonly zoomRegion?: { readonly left: number; readonly right: number; readonly bottom: number; readonly top: number };
      /** Optional source element to anchor the zoom region. */
      readonly sourceElementId?: string;
      /** When true, target board tracks source x-axis range. */
      readonly xAxisSync?: boolean;
    })
  /** Mirror: copies source functiongraph Y-evaluator into target board. */
  | (SceneCouplingBase & {
      readonly kind: "mirror";
      /** v3 backward-compat mirror. */
      readonly type?: "mirror";
      /** Element ID of the source functiongraph to mirror. */
      readonly sourceElementId?: string;
      /** When true, target board tracks source x-axis range. */
      readonly xAxisSync?: boolean;
    })
  /** Independent: no-op coupling — boards operate fully independently. */
  | (SceneCouplingBase & {
      readonly kind: "independent";
      /** v3 backward-compat mirror. */
      readonly type?: "independent";
    })
  /** Expression: renders a target function from one or more source function aliases. */
  | (SceneCouplingBase & {
      readonly kind: "expression";
      /** v3 backward-compat mirror. */
      readonly type?: "expression";
      /** RHS expression, e.g. abs(f(x))-abs(x). */
      readonly expression?: string;
      /** Element id to create/update in the target scene. */
      readonly targetElementId?: string;
      /** Target display function name, e.g. g. */
      readonly targetFunctionName?: string;
      /** Source function aliases referenced by expression. */
      readonly sourceBindings?: readonly FunctionSourceBinding[];
      /** Optional legacy/default source element, treated as alias f when sourceBindings is omitted. */
      readonly sourceElementId?: string;
      /** When true, target board tracks source x-axis range. */
      readonly xAxisSync?: boolean;
      /** Reverse manipulation policy; defaults to none for non-invertible expressions. */
      readonly dependencyMode?: FunctionDependencyMode;
    })
  /** Tangent: creates a JSXGraph tangent element at `at` (or `sourceElementId`). */
  | (SceneCouplingBase & {
      readonly kind: "tangent";
      /** Free-point or glider ID at which the tangent is evaluated. Falls back to sourceElementId. */
      readonly at?: string;
      /** Curve ID to differentiate (defaults to sourceElementId). */
      readonly of?: string;
      /** Alternative source element ID — used when `at` is absent. */
      readonly sourceElementId?: string;
    })
  /** Perpendicular: drops a perpendicular from `point` (or `at`) onto `line` (or `sourceElementId`). */
  | (SceneCouplingBase & {
      readonly kind: "perpendicular";
      /** Line element ID in source scene. Falls back to sourceElementId. */
      readonly line?: string;
      /** Free-point ID from which perpendicular is dropped. Falls back to `at`. */
      readonly point?: string;
      /** Alternative point ID — used when `point` is absent. */
      readonly at?: string;
      /** Alternative line ID — used when `line` is absent. */
      readonly sourceElementId?: string;
    })
  /** Reflection: reflects `subject` (or `sourceElementId`) across `axis`. */
  | (SceneCouplingBase & {
      readonly kind: "reflection";
      /** Element ID to reflect. Falls back to sourceElementId. */
      readonly subject?: string;
      /** Line element ID serving as the axis of reflection. */
      readonly axis?: string;
      /** Alternative subject ID — used when `subject` is absent. */
      readonly sourceElementId?: string;
    })
  /** Mirrorpoint: reflects `subject` (or `sourceElementId`) through center point `mirror`. */
  | (SceneCouplingBase & {
      readonly kind: "mirrorpoint";
      /** Element ID to reflect. Falls back to sourceElementId. */
      readonly subject?: string;
      /** Point element ID serving as the mirror center. */
      readonly mirror?: string;
      /** Alternative subject ID — used when `subject` is absent. */
      readonly sourceElementId?: string;
    })
  /** Intersection: creates the intersection point of two elements in `ofPair`. */
  | (SceneCouplingBase & {
      readonly kind: "intersection";
      /** JSON-serialized [string, string] of element IDs in source scene. */
      readonly ofPair?: string;
      /** Branch selector 0 or 1 when two intersection points exist. Default: 0. */
      readonly branch?: number;
    })
  /** CurveIntersection: finds the intersection of two curves in `ofPair`. */
  | (SceneCouplingBase & {
      readonly kind: "curveintersection";
      /** JSON-serialized [string, string] of curve element IDs in source scene. */
      readonly ofPair?: string;
    });

// ── Type guards (one per kind) ─────────────────────────────────────────────────

export const isIntegralCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "integral" }> => c.kind === "integral";

export const isDerivativeCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "derivative" }> => c.kind === "derivative";

export const isZoomCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "zoom" }> => c.kind === "zoom";

export const isMirrorCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "mirror" }> => c.kind === "mirror";

export const isIndependentCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "independent" }> => c.kind === "independent";

export const isExpressionCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "expression" }> => c.kind === "expression";

export const isTangentCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "tangent" }> => c.kind === "tangent";

export const isPerpendicularCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "perpendicular" }> => c.kind === "perpendicular";

export const isReflectionCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "reflection" }> => c.kind === "reflection";

export const isMirrorpointCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "mirrorpoint" }> => c.kind === "mirrorpoint";

export const isIntersectionCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "intersection" }> => c.kind === "intersection";

export const isCurveIntersectionCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { kind: "curveintersection" }> =>
  c.kind === "curveintersection";

export const isAxisShareCoupling = (
  c: SceneCouplingV4,
): c is Extract<SceneCouplingV4, { xAxisSync?: boolean }> =>
  c.kind === "integral" ||
  c.kind === "derivative" ||
  c.kind === "zoom" ||
  c.kind === "mirror" ||
  c.kind === "expression";

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "palantir-math scene-coupling primitive (project-promoted); domain-specific, not Foundry surface",
};
export { categoryFoundryEquivalent as sceneCouplingV4FoundryEquivalent };
