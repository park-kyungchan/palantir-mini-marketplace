import type { ConstraintContext } from "../meta/types";

/**
 * Rendering Schema — Shared Types
 *
 * Project-independent meta-framework for 3D rendering semantics.
 * Validates HOW scenes are constructed, materials are chosen, and
 * pipelines are composed — the rendering axis that backend ontology
 * and frontend interaction schemas do not cover.
 *
 * Parallel to:
 *   schemas/ontology/types.ts  → OntologyExports (what exists)
 *   schemas/interaction/types.ts → InteractionExports (how users interact)
 *   schemas/rendering/types.ts  → RenderingExports (how things are displayed in 3D)
 *
 * Design principle: Teaching-framework backpropagation
 *   Project bugs (SENSE) → Root cause (DECIDE) → Schema constant (ACT) → Prevention (LEARN)
 *   24+ bugs from mathcrew v0.1–v0.10 are codified here as HC/DH constants.
 */

// ─── Rendering Domain Classification ────────────────────────────

/**
 * Semantic classification of a rendering concern.
 * Each subdomain has its own schema file with HC/DH constants.
 */
export type RenderingDomain =
  | "materials"     // Material selection, construction, CDN dependencies
  | "pipeline"      // Post-processing chain composition, MRT, fog
  | "scene"         // React/R3F component patterns, input handling, state management
  | "performance";  // Frame budget, re-render optimization, texture lifecycle

/**
 * Renderer backend — which GPU API the application targets.
 * HC-RENDER-MAT-03 constrains material types based on this.
 */
export type RendererBackend = "webgpu" | "webgl2" | "webgl1";

/**
 * Material system — which Three.js material API is in use.
 * WebGPU requires NodeMaterial variants; WebGL uses classic materials.
 */
export type MaterialSystem = "node" | "classic" | "custom-shader";

// ─── RenderingExports (project contract) ─────────────────────────

/**
 * The contract that project rendering declarations must satisfy.
 * Projects can optionally declare this for schema validation.
 *
 * Unlike OntologyExports/InteractionExports, rendering validation
 * primarily works via static grep analysis (3D Scene Audit skill)
 * rather than runtime type checking. This interface documents the
 * contract that the audit skill validates.
 */
export interface RenderingExports {
  readonly renderer: RendererBackend;
  readonly materialSystem: MaterialSystem;
  readonly postProcessing: PostProcessingDeclaration;
  readonly sceneHierarchy: SceneNode[];
}

export interface PostProcessingDeclaration {
  /** Ordered list of post-processing passes */
  readonly passes: readonly string[];
  /** Whether MRT is used for selective effects */
  readonly useMRT: boolean;
  /** MRT channels declared */
  readonly mrtChannels?: readonly string[];
}

export interface SceneNode {
  readonly name: string;
  readonly type: "group" | "mesh" | "light" | "camera" | "effect";
  readonly materialType?: string;
  readonly children?: SceneNode[];
}

// ─── Hard Constraint / Decision Heuristic types ──────────────────

export type RenderingSeverity = "error" | "warn" | "info";

export interface RenderingHardConstraint {
  readonly id: string;               // "HC-RENDER-MAT-01", etc.
  readonly name: string;
  readonly description: string;
  readonly severity: RenderingSeverity;
  readonly domain: RenderingDomain | "cross";
  readonly validationFn?: string;    // Static check description (grep pattern or audit step)
  readonly context: ConstraintContext; // REQUIRED for all rendering HC (learned from bugs)
}

export interface RenderingDecisionHeuristic {
  readonly id: string;               // "DH-RENDER-MAT-01", etc.
  readonly name: string;
  readonly question: string;
  readonly options: readonly string[];
  readonly guideline: string;
  readonly context?: ConstraintContext;
}
