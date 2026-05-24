/**
 * Meta Schema Types — Universal Constraint & Heuristic Framework
 *
 * The "schema for schemas." Defines how ANY schema domain (ontology, interaction,
 * or future domains) should structure its constraints, heuristics, and — critically —
 * the CONTEXT that AI agents need to apply these rules correctly.
 *
 * Design principle: AI agents read these schemas before generating code.
 * A constraint without context is a rule; a constraint WITH context is knowledge.
 * The difference determines whether the agent follows the rule mechanically
 * (and misapplies it in edge cases) or understands WHY the rule exists
 * (and applies it correctly even in novel situations).
 *
 * Both `schemas/ontology/` and `schemas/interaction/` should derive their
 * constraint types from these meta types. Existing schemas can adopt incrementally —
 * ConstraintContext fields are optional for backward compatibility.
 *
 * Project-independent. Tech-stack-independent.
 */

// =========================================================================
// Section 1: Constraint Context — What AI Agents Need
// =========================================================================

/**
 * The context an AI agent needs to apply a constraint correctly.
 *
 * Without context: "Don't mix gesture systems on one element" → agent might
 * not recognize that onClick + useDrag IS mixing systems.
 *
 * With context: mechanism explains WHY (independent event streams), antiPattern
 * shows WHAT to avoid (code example), correctPattern shows WHAT to do instead,
 * detectionSignal tells HOW to spot violations during code review.
 */
export interface ConstraintContext {
  /**
   * The causal mechanism — WHY violating this constraint causes failure.
   * Written for an AI agent: explains the chain of events from violation → bug.
   *
   * Example: "Two gesture systems add independent event listeners (pointer + touch).
   * The browser fires BOTH event types for a single physical touch. Each system
   * processes the event independently → two handlers execute for one gesture."
   */
  readonly mechanism: string;

  /**
   * Code-level anti-pattern — WHAT violating code looks like.
   * Tech-stack independent description of the structural pattern.
   *
   * Example: "Parent element binds gesture handler using system A.
   * Child element binds gesture handler using system B. Both handle
   * the same physical input type (tap, drag) on overlapping DOM scope."
   */
  readonly antiPattern: string;

  /**
   * Code-level correct pattern — WHAT compliant code looks like.
   * Tech-stack independent description of the correct structure.
   *
   * Example: "Parent element binds ALL gesture handlers using ONE system.
   * Child elements have data-* attributes for identification only.
   * Parent's handler uses event.target.closest('[data-*]') for child targeting."
   */
  readonly correctPattern: string;

  /**
   * Detection signal — HOW an AI agent recognizes violations during code review.
   * Practical grep patterns, file-level checks, or structural patterns to look for.
   *
   * Example: "Search for gesture handler props on child components when the parent
   * also has gesture handlers. If parent uses useDrag AND child has onClick/onTap,
   * this is a violation."
   */
  readonly detectionSignal: string;

  /**
   * Real-world evidence — optional but valuable. Which project/session discovered
   * this constraint and what was the concrete impact.
   *
   * Example: "palantir-math v2.0 (2026-03-22): StepCard onTap + NarrativePanel
   * useDrag caused swipe to trigger both advance AND card select. 3 debug sessions
   * to diagnose. Root cause: pointer events (onTap) and touch events (useDrag)
   * fire independently for the same finger tap."
   */
  readonly evidence?: string;
}

// =========================================================================
// Section 2: Meta Constraint Types
// =========================================================================

export type ConstraintSeverity = "error" | "warn" | "info";

/**
 * A constraint with full AI-agent context.
 * Extends the minimal {id, name, description, severity} with ConstraintContext.
 *
 * Domain schemas (ontology/, interaction/) can use this directly or extend it.
 */
export interface MetaConstraint {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: ConstraintSeverity;
  readonly domain: string;

  /**
   * AI agent execution context. Optional for backward compatibility with
   * existing ontology constants (216 constants without context).
   * REQUIRED for new constants.
   */
  readonly context?: ConstraintContext;

  /** Machine-readable validation description (what to check). */
  readonly validationFn?: string;
}

// =========================================================================
// Section 3: Meta Heuristic Types
// =========================================================================

/**
 * A decision heuristic — guides choices when multiple valid options exist.
 * The question + options + guideline pattern helps AI agents make consistent
 * decisions across sessions (LLM Grounding: §PHIL.LG-03 Semantic Integrity).
 */
export interface MetaDecisionHeuristic {
  readonly id: string;
  readonly name: string;
  readonly question: string;
  readonly options: readonly string[];
  readonly guideline: string;

  /** Why this decision matters — what goes wrong with the wrong choice. */
  readonly consequence?: string;
}

/**
 * A semantic heuristic — resolves ambiguity when classification is unclear.
 * The method describes a concrete procedure to follow (not just a principle).
 */
export interface MetaSemanticHeuristic {
  readonly id: string;
  readonly name: string;
  readonly method: string;

  /** Example application showing the heuristic in action. */
  readonly example?: string;
}

// =========================================================================
// Section 4: Schema Domain Registration
// =========================================================================

/**
 * A schema domain — a distinct axis of validation.
 * Each domain lives in its own directory under schemas/.
 *
 * Current domains:
 *   "ontology"     — what exists, how it changes (backend semantics)
 *   "interaction"  — how users interact with what exists (frontend gestures)
 *
 * Future domains could include:
 *   "deployment"   — how the system is built, tested, shipped
 *   "observability" — how the system is monitored and debugged
 */
export interface SchemaDomain {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly schemaVersion: string;
  readonly path: string;                    // e.g., "schemas/ontology/"
  readonly constraintPrefix: string;        // e.g., "HC-DATA", "HC-INT"
  readonly heuristicPrefix: string;         // e.g., "DH-DATA", "DH-INT"
  readonly authority: string;               // Research source reference
}

/**
 * Registry of all schema domains. AI agents read this to know
 * which validation axes exist and where to find the rules.
 */
export const SCHEMA_DOMAINS: readonly SchemaDomain[] = [
  {
    id: "ontology",
    name: "Backend Ontology",
    description: "Validates what entities exist, how they link, how they change, who can access them.",
    schemaVersion: "1.10.0",
    path: "schemas/ontology/",
    constraintPrefix: "HC-DATA|HC-LOGIC|HC-ACTION|HC-SEC",
    heuristicPrefix: "DH-DATA|DH-LOGIC|DH-ACTION|DH-SEC",
    authority: "~/.claude/research/palantir/ (61 files, 12 subdirs, ~14,500 lines)",
  },
  {
    id: "interaction",
    name: "Frontend Interaction",
    description: "Validates how users interact with ontology entities via gestures, bindings, and DOM elements.",
    schemaVersion: "0.1.2",
    path: "schemas/interaction/",
    constraintPrefix: "HC-INT|HC-GEST|HC-BIND|HC-ELEM",
    heuristicPrefix: "DH-INT|DH-GEST|DH-BIND|DH-ELEM",
    authority: "§TE-02 Tool Exposure symmetry + palantir-math v2.0 empirical",
  },
  {
    id: "rendering",
    name: "3D Rendering & WebGPU",
    description: "Validates 3D scene construction, material selection, post-processing pipelines, and R3F patterns. Catches semantic bugs invisible to tsc, builds, and screenshots.",
    schemaVersion: "0.1.0",
    path: "schemas/rendering/",
    constraintPrefix: "HC-RENDER-MAT|HC-RENDER-PIPE|HC-RENDER-SC|HC-RENDER-PERF",
    heuristicPrefix: "DH-RENDER-MAT|DH-RENDER-PIPE|DH-RENDER-SC|DH-RENDER-PERF",
    authority: "mathcrew v0.1–v0.10 backpropagation (24+ empirical bugs) + Three.js r182–r183 + WebGPU spec",
  },
] as const;
