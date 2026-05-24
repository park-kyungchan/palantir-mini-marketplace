/**
 * Interaction Semantic Definitions — Frontend Interaction Schema
 *
 * TERMINOLOGY NOTICE — LOCAL NORMALIZATION
 * This schema defines WHAT each interaction domain MEANS. It is the foundational
 * contract for frontend interaction validation, parallel to ontology/semantics.ts.
 *
 * IMPORTANT: Palantir's Tool Exposure Model (3 categories: data queries, logic
 * functions, actions) is the official pattern for exposing ontology to AI agents.
 * We extend this symmetry to human agents: ontology is exposed via GESTURES.
 * This is a LOCAL INFERENCE — Palantir does not define "gesture exposure."
 *
 * Origin: palantir-math v2.0 session (2026-03-22) — discovered that two gesture
 * libraries (@use-gesture/react + Motion) on the same DOM element caused touch/pointer
 * event stream conflicts. This schema formalizes the rules to prevent such conflicts
 * at the ontology design level, not the debugging level.
 *
 * Schema version following semver convention.
 */
export const SCHEMA_VERSION = "0.2.0" as const;

// =========================================================================
// Section 0: Research Authority Chain
// =========================================================================

/**
 * GESTURE_EXPOSURE_SYMMETRY — The foundational claim of this schema.
 *
 * Authority: ~/.claude/research/palantir/cross-cutting/tool-exposure.md
 *   §TE-02: Ontology auto-surfaces 3 tool categories to AI agents (Data/Logic/Action)
 *   §TE-04: 7 tool types in Agent Studio
 *   §TE-05: 4 memory types, ALL served by the Ontology
 *
 * LOCAL INFERENCE: Palantir's Tool Exposure exposes the ontology to AI agents.
 * We extend this symmetry: the ontology should also be exposed to HUMAN agents
 * via gestures. The 3-category structure (Data=View, Logic=Navigation, Action=Mutation)
 * mirrors Tool Exposure exactly. Palantir does NOT define "gesture exposure" —
 * this is our original framework.
 *
 * Evidence for validity: The palantir-math v2.0 gesture conflict (Motion onTap +
 * @use-gesture useDrag on overlapping DOM) was a design-time error that could
 * have been caught by HC-INT-01 + HC-INT-04 if these rules existed during
 * ontology design. The backend ontology defined ACTION mutations (advanceStep,
 * recordAnnotation) without declaring HOW they map to physical input — leaving
 * the gesture layer as orphan UI outside the authority chain.
 */
export const GESTURE_EXPOSURE_SYMMETRY = {
  officialSource: "§TE-02 (tool-exposure.md): Ontology auto-surfaces 3 tool categories",
  localInference: "Extend to human agents: ontology exposes gestures in 4 categories",
  mapping: [
    { aiTool: "Data queries (SENSE)",   humanGesture: "View gestures (pinch-zoom, scroll)" },
    { aiTool: "Logic functions (DECIDE)", humanGesture: "Navigation gestures (swipe, tap-to-select)" },
    { aiTool: "Actions (ACT)",           humanGesture: "Mutation gestures (pen-draw, barrel-clear)" },
    { aiTool: "— (no AI equivalent)",    humanGesture: "Device gestures (S-Pen pressure, eraser tip)" },
  ],
  gapNote: "AI agents have no equivalent of 'device gestures' — their input is text/tool-call. " +
    "Human agents have physical capabilities (pressure sensitivity, spatial awareness) that " +
    "AI agents lack. The 'device' category captures this asymmetry.",
} as const;

import type {
  InteractionHardConstraint,
  InteractionDecisionHeuristic,
  InteractionSemanticHeuristic,
} from "./types";

// =========================================================================
// Section 1: Hard Constraints (HC-INT-*)
// =========================================================================

/**
 * HC-INT-01: Single Gesture Library Per Element
 *
 * A DOM element MUST be handled by exactly ONE gesture library.
 * Mixing libraries on the same element causes event stream conflicts
 * (e.g., pointer events vs touch events fire independently, causing
 * dual-handler execution on a single physical gesture).
 *
 * Evidence: palantir-math v2.0 — a child component used animation library gesture
 * handlers (pointer events) while the parent used a gesture library (touch events).
 * Result: swipe gestures triggered BOTH the swipe handler AND the tap handler
 * because they used independent event streams.
 *
 * Fix pattern: Unify all gesture handling in the parent element's gesture system.
 * Child elements become pure display (no gesture handlers).
 */
export const HC_INT_01: InteractionHardConstraint = {
  id: "HC-INT-01",
  name: "Single Gesture Library Per Element",
  description:
    "A DOM element and its interactive children MUST use exactly ONE gesture system. " +
    "Mixing two gesture systems (e.g., a gesture library and an animation library's gesture API) " +
    "on overlapping DOM scopes causes independent event stream processing " +
    "(touch vs pointer), leading to dual-handler execution on a single physical gesture.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each ElementProfile: all bindings[].library must equal profile.library. " +
    "For parent-child relationships: child elements with gesture handlers must use the same library as the parent.",
  context: {
    mechanism:
      "Two gesture systems (e.g., Motion onTap + @use-gesture useDrag) attach independent " +
      "event listeners. The browser fires both pointer AND touch events for a single physical " +
      "touch. Each system processes its own event stream — one gesture triggers two handlers.",
    antiPattern:
      "<motion.div onTap={handleTap}> wrapping a <div {...useDrag(handleSwipe)()}> — " +
      "Motion listens to pointer events, useDrag listens to touch events, both fire on every touch",
    correctPattern:
      "Single useDrag handler on the parent with tap detection (filterTaps: true). " +
      "Child elements become pure display (data-step-index attribute, no handlers).",
    detectionSignal:
      "onTap or onClick on a parent/child of an element that also has useDrag/usePinch bindings",
    evidence: "palantir-math v2.0 Session 2 (2026-03-22) — StepCard onTap + NarrativePanel useDrag conflict",
  },
};

/**
 * HC-INT-02: Gesture Binding References Valid Action
 *
 * Every GestureDeclaration.actionRef MUST reference an existing
 * ACTION mutation or LOGIC function from the ontology.
 * Prevents orphan gesture bindings that trigger undefined behavior.
 */
export const HC_INT_02: InteractionHardConstraint = {
  id: "HC-INT-02",
  name: "Gesture Binding References Valid Action",
  description:
    "Every GestureDeclaration.actionRef MUST reference an existing ACTION mutation " +
    "or LOGIC function declared in the project's ontology. Orphan bindings (gestures " +
    "that trigger non-existent actions) are design-time errors, not runtime errors.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each gesture: actionRef must match an entry in ontology.action.mutations[].apiName " +
    "or ontology.logic.functions[].apiName or be a reserved navigation action " +
    "('navigate:next', 'navigate:prev', 'navigate:goto', 'view:zoom', 'view:scroll').",
  context: {
    mechanism:
      "A gesture binding with an actionRef that doesn't match any ontology mutation " +
      "or logic function silently does nothing when triggered. The gesture fires, the " +
      "handler looks up the action, finds nothing, and the user's input is discarded " +
      "without error or feedback. This is a design-time referential integrity error — " +
      "the interaction schema references an action that doesn't exist in the ontology.",
    antiPattern:
      "GestureDeclaration with actionRef: 'saveAnnotation' when ontology/action.ts " +
      "only defines 'recordAnnotation'. The gesture binding compiles without error " +
      "but the runtime lookup fails silently.",
    correctPattern:
      "actionRef values must exactly match ontology.action.mutations[].apiName " +
      "or ontology.logic.functions[].apiName. Reserved prefixes (navigate:, view:, tool:) " +
      "bypass ontology lookup and are always valid.",
    detectionSignal:
      "Cross-file: grep all actionRef values in interaction declarations → compare against " +
      "exported mutation/function apiNames in ontology/action.ts and ontology/logic.ts. " +
      "Any actionRef not in the ontology AND not starting with a reserved prefix is a violation.",
    evidence:
      "Preventive constraint — discovered during interaction schema design (2026-03-22). " +
      "Pattern mirrors HC-BIND-03 (orphan binding references).",
  },
};

/**
 * HC-INT-03: Touch-Action CSS Consistency
 *
 * The `touch-action` CSS property on a gesture-interactive element MUST be
 * consistent with its gesture bindings. If an element handles horizontal
 * swipe via JS, `touch-action` must NOT include `pan-x` (browser would
 * compete for horizontal panning).
 */
export const HC_INT_03: InteractionHardConstraint = {
  id: "HC-INT-03",
  name: "Touch-Action CSS Consistency",
  description:
    "The CSS touch-action value on a gesture-interactive element MUST not claim axes " +
    "that the element's gesture bindings also handle. If JS handles horizontal swipe, " +
    "touch-action must not include pan-x. If JS handles vertical drag, touch-action " +
    "must not include pan-y. Violation causes browser and JS to compete for the same axis.",
  severity: "error",
  domain: "cross",
  context: {
    mechanism:
      "CSS touch-action tells the browser which axes to claim for native scrolling/panning. " +
      "touch-action: auto (default) claims ALL axes. When JS also handles horizontal " +
      "swipe via a gesture library, the browser and JS compete — the browser may consume " +
      "the pointerdown event for native panning before JS can detect the swipe.",
    antiPattern:
      "Element with useDrag for horizontal swipe but no touch-action override — " +
      "browser default (auto) claims horizontal axis, JS swipe detection fails intermittently",
    correctPattern:
      "touch-action: pan-y (allows vertical scroll, yields horizontal to JS) on elements " +
      "with horizontal swipe. touch-action: none on elements where JS owns all axes (canvas, zoom).",
    detectionSignal:
      "useDrag or usePinch binding on an element without explicit touch-action: none or touch-action: pan-y/pan-x in style",
    evidence: "palantir-math v2.0 — GeometryPanel needed touch-action: none for pinch zoom",
  },
  validationFn:
    "For each ElementProfile: if any binding handles horizontal gestures (swipe-left, " +
    "swipe-right, drag-x), touchAction must not be 'auto' or contain 'pan-x'. " +
    "If any binding handles vertical gestures (swipe-up, swipe-down, drag-y), " +
    "touchAction must not be 'auto' or contain 'pan-y'.",
};

/**
 * HC-INT-04: Event Stream Isolation
 *
 * All gesture bindings on a single DOM element MUST use the same event stream
 * type (all pointer, all touch, or all native). Mixing event streams causes
 * independent event processing — one physical gesture triggers handlers in
 * multiple streams.
 */
export const HC_INT_04: InteractionHardConstraint = {
  id: "HC-INT-04",
  name: "Event Stream Isolation",
  description:
    "All gesture bindings on a single DOM element MUST use the same event stream " +
    "(pointer, touch, or native). Mixing pointer event listeners with touch event " +
    "listeners on the same element causes both to fire independently for the same " +
    "physical input. The browser dispatches touch AND pointer events for a single " +
    "touch — if handlers listen to different streams, they both execute.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each ElementProfile: all bindings[].eventStream must equal profile.eventStream.",
  context: {
    mechanism:
      "The browser generates a touch event AND a pointer event for each physical touch. " +
      "If one handler uses addEventListener('pointerdown') and another uses the gesture " +
      "library's touch-based handler, both fire for a single finger tap. This is by " +
      "W3C spec (Pointer Events Level 2 §10 — pointer events do not suppress touch events).",
    antiPattern:
      "element.addEventListener('pointerdown', fn1) alongside useDrag({ pointer: { touch: true } }, fn2) " +
      "on the same or nested elements — fn1 gets pointerdown, fn2 gets touchstart, both execute",
    correctPattern:
      "Unify to a single event stream. Use { pointer: { touch: true } } on all gesture bindings " +
      "AND remove raw addEventListener calls. Or use pointer: false and handle only touch events.",
    detectionSignal:
      "addEventListener('pointer' on an element that also has useDrag/usePinch, or vice versa",
    evidence: "palantir-math v2.0 Session 2 (2026-03-22) — mixed pointer + touch on teaching interface",
  },
};

/**
 * HC-INT-05: Component-Entity Mapping Declaration
 *
 * Every interactive component MUST declare which ontology entity it represents.
 * This ensures the authority chain extends from ontology through to the UI:
 * ontology/data.ts → convex/schema.ts → src/components/*.tsx → interaction/schema.ts
 */
export const HC_INT_05: InteractionHardConstraint = {
  id: "HC-INT-05",
  name: "Component-Entity Mapping Declaration",
  description:
    "Every interactive frontend component MUST declare which ontology entity it " +
    "represents or operates on. This maps the authority chain to the UI layer: " +
    "if a component handles gestures that trigger mutations on LectureStep, the " +
    "interaction schema must declare this mapping. Unmapped components are orphan UI — " +
    "they exist outside the authority chain.",
  severity: "warn",
  domain: "cross",
  validationFn:
    "For each ElementProfile: elementName should map to an ontology entity via a " +
    "declared component-entity mapping table.",
  context: {
    mechanism:
      "Without a component-entity mapping, the authority chain breaks at the UI layer: " +
      "ontology/data.ts → convex/schema.ts → src/components/*.tsx → ???. The component " +
      "exists outside the semantic pipeline. When the ontology entity changes (property " +
      "renamed, type altered), the component is not flagged for update because no mapping " +
      "connects them. The compile-time type safety that protects convex/ from ontology " +
      "drift does not extend to unmapped frontend components.",
    antiPattern:
      "A React component <StepCard> renders LectureStep data and handles gestures " +
      "that trigger mutations on LectureStep, but no interaction schema declares " +
      "'StepCard represents LectureStep'. The component is an orphan — invisible to " +
      "ontology-level audits and authority chain validation.",
    correctPattern:
      "Declare component-entity mappings in the project's interaction schema: " +
      "{ elementName: 'StepCard', entityRef: 'LectureStep', entityFields: ['title', 'content'] }. " +
      "This extends the authority chain through the UI layer and enables automated " +
      "drift detection when ontology entities change.",
    detectionSignal:
      "Cross-file: find all components with gesture bindings (useDrag, usePinch, useGesture) " +
      "or data-* attributes. Check each against the interaction schema's component-entity " +
      "mapping table. Components with gestures but no mapping are orphans.",
  },
};

/**
 * HC-INT-06: Parent Owns Gesture, Child Displays
 *
 * When multiple sibling/child elements need gesture interaction, the PARENT
 * element should own the unified gesture handler. Children provide data-*
 * attributes for target identification. This prevents the HC-INT-01 violation
 * pattern where parent and child use different gesture libraries.
 */
export const HC_INT_06: InteractionHardConstraint = {
  id: "HC-INT-06",
  name: "Parent Owns Gesture, Child Displays",
  description:
    "When a parent element and its children both need gesture interaction (e.g., parent " +
    "detects swipe, children detect tap), the parent MUST own the unified gesture handler. " +
    "Children use data-* attributes (e.g., data-step-index) for target identification. " +
    "The parent's gesture system uses tap-vs-drag disambiguation (e.g., displacement " +
    "threshold) and event.target.closest('[data-*]') to identify which child was tapped.",
  severity: "error",
  domain: "cross",
  validationFn:
    "No ElementProfile should have child elements with separate gesture system declarations. " +
    "If a child needs tap detection, the parent's binding must include a tap handler.",
  context: {
    mechanism:
      "When a parent and child both declare gesture handlers, the child's handler creates " +
      "an independent event listener. The browser fires events at the deepest target first " +
      "(bubble phase). If the child uses a different gesture system than the parent " +
      "(e.g., child onClick vs parent useDrag), HC-INT-01 is violated. Even with the same " +
      "system, two independent handler registrations produce dual execution — both the " +
      "child handler and the parent handler fire for a single physical gesture. " +
      "@use-gesture's state.event.target preserves the original DOM target, making " +
      "event.target.closest('[data-*]') viable for parent-to-child delegation.",
    antiPattern:
      "<NarrativePanel {...useDrag(handleSwipe)()}>\n" +
      "  <StepCard onClick={handleSelect} />  ← child has its own click handler\n" +
      "</NarrativePanel>\n" +
      "Tap on StepCard fires onClick (pointer event) AND parent's useDrag tap detection " +
      "(touch event) — two handlers for one physical tap.",
    correctPattern:
      "<NarrativePanel {...useDrag(handler)()}>\n" +
      "  <StepCard data-step-index={i} />  ← no handlers, only data attributes\n" +
      "</NarrativePanel>\n" +
      "Parent handler: if (tap) { const el = event.target.closest('[data-step-index]'); " +
      "if (el) selectStep(Number(el.getAttribute('data-step-index'))); }",
    detectionSignal:
      "Child component inside a gesture-owner parent that has onClick, onTap, " +
      "onPointerDown, or any useDrag/usePinch/useGesture binding. The parent already " +
      "owns gestures — any gesture handler on a child is a violation.",
    evidence:
      "palantir-math v2.0 Session 2 (2026-03-22) — StepCard onTap inside NarrativePanel useDrag",
  },
};

/**
 * HC-INT-07: Multipoint/Path-Based Gestures Must Have Single-Pointer Alternative
 *
 * WCAG 2.5.1 (Level A): All functionality using multipoint or path-based gestures
 * must be operable with a single pointer without a path-based gesture.
 * This applies to ALL gesture domains — navigation, view, AND mutation.
 *
 * HC-BIND-01 covers mutation bindings only. This HC extends the requirement
 * to navigation gestures (swipe-to-advance) and view gestures (pinch-to-zoom).
 *
 * Authority: WCAG 2.2 SC 2.5.1 (Level A), SC 2.5.7 (Level AA)
 * Research: ~/.claude/research/interaction/wcag-gesture-requirements.md [§WCAG.PG-01]
 */
export const HC_INT_07: InteractionHardConstraint = {
  id: "HC-INT-07",
  name: "Single-Pointer Alternative for Multipoint/Path Gestures",
  description:
    "Every multipoint gesture (pinch, rotate, multi-finger swipe) and path-based gesture " +
    "(swipe, drag) MUST have a single-pointer non-path alternative. WCAG 2.5.1 (Level A) " +
    "requires this for ALL gestures — not just mutations. A pinch-to-zoom without +/- buttons " +
    "fails Level A conformance. A swipe-to-advance without a Next button fails Level A. " +
    "WCAG 2.5.7 (Level AA) additionally requires non-drag alternatives for all drag operations.",
  severity: "warn",
  domain: "cross",
  validationFn:
    "For each gesture with gestureType in ['pinch-in', 'pinch-out', 'rotate', 'swipe-left', " +
    "'swipe-right', 'swipe-up', 'swipe-down', 'drag-reorder', 'drag-drop']: verify a " +
    "single-pointer non-path alternative exists (tap-based UI control with same actionRef).",
  context: {
    mechanism:
      "WCAG 2.5.1 (Level A) requires single-pointer alternatives because: (1) users with " +
      "motor impairments may not be able to perform multipoint gestures (pinch requires two " +
      "fingers), (2) path-based gestures (swipe) require directional control that some users " +
      "lack, (3) assistive technologies may not support multipoint input. WCAG 2.5.7 (Level AA, " +
      "new in 2.2) adds: dragging operations must have non-drag alternatives because users " +
      "may not be able to maintain pointer contact while moving.",
    antiPattern:
      "Pinch-to-zoom with no +/- buttons. Swipe-to-advance with no Next/Prev buttons. " +
      "Drag-to-reorder with no up/down arrow buttons. These all fail WCAG Level A or AA.",
    correctPattern:
      "Every multipoint/path gesture has a tap-based alternative: " +
      "pinch-zoom + <Button>+/-</Button>, swipe-advance + <Button>Next</Button>, " +
      "drag-reorder + <Button>Move Up/Down</Button>. The alternative must be visible and " +
      "trigger the same actionRef.",
    detectionSignal:
      "For each gesture with multipoint type (pinch-in/out, rotate) or path-based type " +
      "(swipe-*, drag-*): check if a gesture with type 'tap' or 'double-tap' exists with " +
      "the same actionRef, OR if a UI control (button) references the same actionRef.",
    evidence:
      "WCAG 2.2 SC 2.5.1 (Level A) and SC 2.5.7 (Level AA). Verified against W3C " +
      "Understanding documents (2026-03-22). W3C Failure F105: path-based gesture " +
      "without simple pointer alternative.",
  },
};

export const HARD_CONSTRAINTS: readonly InteractionHardConstraint[] = [
  HC_INT_01,
  HC_INT_02,
  HC_INT_03,
  HC_INT_04,
  HC_INT_05,
  HC_INT_06,
  HC_INT_07,
] as const;

// =========================================================================
// Section 2: Decision Heuristics (DH-INT-*)
// =========================================================================

export const DH_INT_01: InteractionDecisionHeuristic = {
  id: "DH-INT-01",
  name: "Navigation vs Mutation Classification",
  question: "Does this gesture change persistent state (DB record), or only view state (UI navigation)?",
  options: ["navigation (LOGIC)", "mutation (ACTION)"],
  guideline:
    "If the gesture's result is reversible by navigating away (swipe to next step, " +
    "pinch to zoom, scroll to reveal), it's NAVIGATION. If the result persists after " +
    "the session ends (pen stroke saved to DB, annotation recorded), it's MUTATION.",
};

export const DH_INT_02: InteractionDecisionHeuristic = {
  id: "DH-INT-02",
  name: "Device-Specific vs Universal Gesture",
  question: "Does this gesture require a specific hardware capability?",
  options: ["device-specific", "universal"],
  guideline:
    "Pressure (S-Pen), barrel button, eraser tip, hover-before-contact are DEVICE-SPECIFIC. " +
    "Tap, swipe, pinch, scroll are UNIVERSAL (work with finger, mouse, or pen). " +
    "Device-specific gestures MUST have a universal fallback or be optional enhancements.",
};

export const DH_INT_03: InteractionDecisionHeuristic = {
  id: "DH-INT-03",
  name: "Gesture Ownership Resolution",
  question: "Should the parent or child element own this gesture handler?",
  options: ["parent", "child"],
  guideline:
    "PARENT owns when: (1) multiple children share the same gesture type (tap-to-select), " +
    "(2) the gesture spans across children (swipe), (3) the gesture conflicts with child handlers. " +
    "CHILD owns when: (1) only one specific element needs the gesture, (2) no parent gesture exists, " +
    "(3) the child is in a separate DOM branch from any parent gesture handler.",
};

export const DH_INT_04: InteractionDecisionHeuristic = {
  id: "DH-INT-04",
  name: "Event Stream Selection",
  question: "Which event stream should this element use?",
  options: ["pointer (default)", "touch (scroll coexistence)", "none (browser native)"],
  guideline:
    "Use POINTER (default) for most cases — works with mouse, touch, and pen. " +
    "Use TOUCH when the element needs drag/swipe to coexist with browser scroll " +
    "(touch events are not canceled by browser panning — W3C spec behavior). " +
    "Use NONE when the browser should handle everything (overflow: auto, native scroll).",
};

export const DECISION_HEURISTICS: readonly InteractionDecisionHeuristic[] = [
  DH_INT_01,
  DH_INT_02,
  DH_INT_03,
  DH_INT_04,
] as const;

// =========================================================================
// Section 3: Semantic Heuristics (SH-INT-*)
// =========================================================================

export const SH_INT_01: InteractionSemanticHeuristic = {
  id: "SH-INT-01",
  name: "Navigation vs Mutation Deletion Test",
  method:
    "If I deleted this gesture, would the data still change? " +
    "YES → the gesture is a UI convenience for an existing ACTION (navigation). " +
    "NO → the gesture IS the action (mutation). " +
    "Example: deleting swipe-to-advance doesn't prevent step advancement (button still works) — " +
    "therefore swipe is NAVIGATION. Deleting pen-draw prevents annotation creation — " +
    "therefore pen-draw is MUTATION.",
};

export const SH_INT_02: InteractionSemanticHeuristic = {
  id: "SH-INT-02",
  name: "Event Stream Conflict Detection",
  method:
    "List all event listeners on element X. Are they in the same event stream? " +
    "If element has onPointerDown (pointer) AND a parent has touchstart listener (touch), " +
    "both fire for a single finger tap — conflict. " +
    "Resolution: unify to one stream (prefer touch for scroll coexistence, pointer for precision).",
};

export const SH_INT_03: InteractionSemanticHeuristic = {
  id: "SH-INT-03",
  name: "Touch-Action Axis Conflict Detection",
  method:
    "For element X with touch-action: pan-y — does any JS gesture handler on X " +
    "listen for horizontal movement? If YES, potential conflict: the browser may " +
    "cancel pointer events before the JS handler detects the horizontal threshold. " +
    "Resolution: switch to touch events (which survive browser panning per W3C spec) " +
    "or change touch-action to 'none' and handle scroll in JS.",
};

export const SEMANTIC_HEURISTICS: readonly InteractionSemanticHeuristic[] = [
  SH_INT_01,
  SH_INT_02,
  SH_INT_03,
] as const;
