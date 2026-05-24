import type { ConstraintContext } from "../meta/types";

/**
 * Interaction Schema — Shared Types
 *
 * Project-independent meta-framework for frontend interaction semantics.
 * Validates HOW users interact with ontology entities — the missing axis
 * that backend ontology schemas (schemas/ontology/) do not cover.
 *
 * Parallel to schemas/ontology/types.ts:
 *   ontology/types.ts  → OntologyExports (what exists and how it changes)
 *   interaction/types.ts → InteractionExports (how users interact with what exists)
 *
 * Design principle: Tool Exposure symmetry
 *   Palantir AIP:    Ontology → Tool Exposure → AI Agent
 *   Interaction:     Ontology → Gesture Exposure → Human Agent
 */

// ─── Interaction Domain Classification ─────────────────────────

/**
 * Semantic classification of a gesture's purpose.
 * Parallels SemanticDomainId ("data" | "logic" | "action") in ontology.
 */
export type InteractionDomain =
  | "navigation"   // LOGIC analog — changes view state, not data (swipe, tap-to-select, scroll)
  | "mutation"     // ACTION analog — triggers a data change (pen-draw → recordAnnotation)
  | "view"         // DATA analog — adjusts how data is displayed (pinch-zoom, scroll)
  | "device";      // Device-specific capability (S-Pen pressure, barrel button, eraser)

/**
 * The gesture system responsible for handling an interaction.
 * HC-INT-01: One element → one gesture system.
 *
 * This is a string (not a union literal) to be tech-stack independent.
 * Projects declare which gesture system they use; the validator checks
 * that each element uses exactly ONE system, regardless of which it is.
 *
 * Well-known values (for reference, NOT enforced by the type system):
 *   "gesture-lib"    — a dedicated gesture library (e.g., @use-gesture, Hammer.js, interact.js)
 *   "animation-lib"  — an animation library with gesture support (e.g., Motion, GSAP Draggable)
 *   "framework"      — framework built-in events (e.g., Vue v-on:*, Svelte on:*, React onClick)
 *   "browser-native" — CSS/HTML native behavior (overflow scroll, touch-action, focus)
 *   "canvas-api"     — Canvas 2D/WebGL imperative drawing
 */
export type GestureSystem = string;

/**
 * The browser event stream used by a gesture system.
 * HC-INT-04: One element uses one event stream type.
 *
 * These are W3C standard event types — tech-stack independent.
 */
export type EventStream =
  | "pointer"   // W3C PointerEvent (pointerdown/pointermove/pointerup)
  | "touch"     // W3C TouchEvent (touchstart/touchmove/touchend)
  | "mouse"     // DOM MouseEvent (mousedown/mousemove/mouseup)
  | "wheel"     // DOM WheelEvent (wheel, deltaX/deltaY)
  | "keyboard"  // DOM KeyboardEvent (keydown/keyup)
  | "none";     // Browser handles natively (CSS-driven, no JS listeners)

/**
 * Input device type that triggers the gesture.
 * Maps to PointerEvent.pointerType in the browser.
 */
export type InputDevice =
  | "touch"     // Finger on touchscreen
  | "pen"       // Stylus / S-Pen (pointerType === "pen")
  | "mouse"     // Mouse / trackpad
  | "keyboard"  // Keyboard navigation
  | "any";      // Device-agnostic

/**
 * CSS touch-action value required for a DOM element.
 * HC-INT-03: touch-action must match gesture bindings.
 */
export type TouchAction =
  | "none"           // All gestures handled by JS (canvas, full-custom drag areas)
  | "auto"           // All gestures handled by browser (no custom interaction)
  | "pan-x"          // Browser handles horizontal scroll, JS handles vertical
  | "pan-y"          // Browser handles vertical scroll, JS handles horizontal
  | "pan-x pan-y"    // Browser handles both scroll axes
  | "manipulation"   // Pan + pinch-zoom only, no double-tap-to-zoom
  | "pinch-zoom";    // Only pinch-zoom, no panning

// ─── Gesture Declaration ────────────────────────────────────────

/**
 * A declared gesture — what input and how it maps to an action.
 * Project-independent: no reference to specific components or entities.
 */
export interface GestureDeclaration {
  readonly apiName: string;
  readonly description: string;
  readonly domain: InteractionDomain;
  readonly inputDevice: InputDevice;
  readonly gestureType: string;        // "swipe-left", "tap", "pinch-in", "pen-draw", etc.
  readonly actionRef: string;          // Reference to ontology ACTION or LOGIC function
  readonly library: GestureSystem;
  readonly eventStream: EventStream;
}

/**
 * A gesture binding — attaches a gesture to a specific element scope.
 * This is what projects declare.
 */
export interface GestureBinding {
  readonly elementScope: string;       // Logical element name (e.g., "NarrativePanel", "GeometryPanel")
  readonly gestureApiName: string;     // Reference to GestureDeclaration.apiName
  readonly library: GestureSystem;
  readonly eventStream: EventStream;
  readonly touchAction: TouchAction;
  readonly priority: number;           // Lower = higher priority for conflict resolution
  readonly impactChain?: ImpactChain;  // Required for mutation bindings (HC-BIND-04)
}

/**
 * An element interaction profile — all gesture bindings for one DOM element.
 * HC-INT-01 is validated against this: one library per element.
 */
export interface ElementProfile {
  readonly elementName: string;
  readonly bindings: GestureBinding[];
  readonly library: GestureSystem;     // Single library for all bindings
  readonly eventStream: EventStream;    // Single stream for all bindings
  readonly touchAction: TouchAction;
  readonly role?: string;              // ElementRole from element/schema.ts (optional for backward compat)
  readonly dataAttributes?: readonly string[];  // data-* attribute names on this element (HC-ELEM-04)
}

// ─── InteractionExports (project contract) ──────────────────────

/**
 * The contract that project interaction files must satisfy.
 * Parallel to OntologyExports in schemas/ontology/types.ts.
 *
 * Projects export this from: {project}/interaction/schema.ts
 * Validated by: schemas/interaction/validator.ts
 */
export interface InteractionExports {
  readonly gestures: GestureDeclaration[];
  readonly elements: ElementProfile[];
  readonly deviceProfiles: DeviceProfile[];
}

/**
 * Device-specific capabilities and constraints.
 * Declares what a target device can do natively.
 */
export interface DeviceProfile {
  readonly deviceId: string;           // "galaxy-book-4-pro-360", "ipad-pro", etc.
  readonly capabilities: DeviceCapability[];
  readonly constraints: DeviceConstraint[];
}

export interface DeviceCapability {
  readonly name: string;               // "pressure", "tilt", "hover", "barrel-button", "eraser"
  readonly pointerEventProperty: string; // "pressure", "tiltX", "buttons & 2"
  readonly inputDevice: InputDevice;
}

export interface DeviceConstraint {
  readonly name: string;               // "no-3-finger", "palm-rejection-os-level"
  readonly description: string;
}

// ─── Impact Chain (§LOGIC.R-02 frontend analog) ────────────────

/**
 * Explicit impact chain for a gesture→action binding.
 * Declares the full causality path from gesture to UI update.
 *
 * Palantir principle (§LOGIC.R-02): "Impact propagation is explicit, not automatic."
 * Frontend analog: "Which UI elements re-render when this gesture triggers?"
 */
export interface ImpactChain {
  readonly actionRef: string;           // The mutation triggered (e.g., "advanceStep")
  readonly entityField: string;         // Which entity field changes (e.g., "Lecture.currentStepIndex")
  readonly directTargets: string[];     // UI elements that directly consume this field
  readonly cascadeTargets: string[];    // UI elements that update as a consequence
}

// ─── Decision Heuristic / Hard Constraint types ────────────────

export type InteractionSeverity = "error" | "warn" | "info";

export interface InteractionHardConstraint {
  readonly id: string;                 // "HC-INT-01", "HC-INT-02", etc.
  readonly name: string;
  readonly description: string;
  readonly severity: InteractionSeverity;
  readonly domain: InteractionDomain | "cross";
  readonly validationFn?: string;      // Runtime check description
  readonly context?: ConstraintContext; // AI agent context (backpropagated from project bugs)
}

export interface InteractionDecisionHeuristic {
  readonly id: string;                 // "DH-INT-01", "DH-INT-02", etc.
  readonly name: string;
  readonly question: string;           // Decision question
  readonly options: readonly string[];
  readonly guideline: string;
  readonly context?: ConstraintContext; // AI agent context (backpropagated from project bugs)
}

export interface InteractionSemanticHeuristic {
  readonly id: string;                 // "SH-INT-01", "SH-INT-02", etc.
  readonly name: string;
  readonly method: string;             // How to resolve ambiguity
}
