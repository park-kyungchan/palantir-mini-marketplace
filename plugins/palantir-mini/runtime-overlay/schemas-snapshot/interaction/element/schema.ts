/**
 * ELEMENT Subdomain Schema — Interaction Schema §3
 *
 * Decision heuristics and hard constraints for ELEMENT INTERACTION PROFILES.
 * Answers: "Which DOM elements own which gestures, and how are they configured?"
 *
 * Parallel to ontology/action/schema.ts (mutations on entities).
 * ElementProfile = the runtime configuration of a DOM element's gesture behavior.
 * Mutation = the runtime execution of a state change.
 *
 * This subdomain addresses the ROOT CAUSE of the palantir-math v2.0 gesture conflict:
 * two components (NarrativePanel, StepCard) each declared gesture handlers independently,
 * using different libraries and event streams, on overlapping DOM scopes.
 *
 * Authority: HC-INT-01 (Single Library Per Element), HC-INT-06 (Parent Owns Gesture)
 */

import type {
  InteractionHardConstraint,
  InteractionDecisionHeuristic,
} from "../types";

export const SCHEMA_VERSION = "0.1.2" as const;

// =========================================================================
// Section 1: Element Role Classification
// =========================================================================

/**
 * Role of a DOM element in the gesture hierarchy.
 * Determines whether the element owns gestures or delegates to parent.
 */
export type ElementRole =
  | "gesture-owner"     // Owns gesture handlers — processes raw events
  | "gesture-target"    // Has data-* attributes for identification — no own handlers
  | "gesture-isolated"  // Independent gesture scope (e.g., ChalkCanvas in separate DOM branch)
  | "scroll-container"  // Browser handles scroll natively — touch-action: pan-y/auto
  | "inert";            // No gesture interaction at all

/**
 * The CSS touch-action ↔ gesture handler compatibility matrix.
 * Validated by HC-INT-03.
 */
export const TOUCH_ACTION_MATRIX = {
  "none": {
    jsHandles: ["horizontal", "vertical", "pinch", "all"],
    browserHandles: [],
    useCase: "Canvas, full-custom gesture areas (ChalkCanvas, GeometryPanel)",
  },
  "pan-y": {
    jsHandles: ["horizontal", "pinch"],
    browserHandles: ["vertical-scroll"],
    useCase: "Panels with vertical scroll + horizontal swipe (NarrativePanel)",
  },
  "pan-x": {
    jsHandles: ["vertical", "pinch"],
    browserHandles: ["horizontal-scroll"],
    useCase: "Horizontal scroll containers with vertical swipe",
  },
  "manipulation": {
    jsHandles: [],
    browserHandles: ["pan", "pinch-zoom"],
    useCase: "Standard scroll + zoom, no custom gestures (content areas)",
  },
  "auto": {
    jsHandles: [],
    browserHandles: ["pan", "pinch-zoom", "double-tap-zoom"],
    useCase: "No custom gestures at all (static content)",
  },
} as const;

// =========================================================================
// Section 2: Decision Heuristics (DH-ELEM-*)
// =========================================================================

/**
 * DH-ELEM-01: Element Role Assignment
 */
export const DH_ELEM_01: InteractionDecisionHeuristic = {
  id: "DH-ELEM-01",
  name: "Element Role Assignment",
  question: "Should this element own gesture handlers, be a target, or be isolated?",
  options: [
    "gesture-owner — handles raw events (drag/pinch handlers), manages child targets",
    "gesture-target — has data-* attrs, no handlers (StepCard with data-step-index)",
    "gesture-isolated — separate DOM branch, own gesture scope (ChalkCanvas overlay)",
    "scroll-container — browser handles scroll, no JS gestures",
    "inert — no interaction at all (decorative elements)",
  ],
  guideline:
    "Apply HC-INT-06: if a parent also needs gestures, THIS element should be a " +
    "gesture-target (no own handlers). Only use gesture-owner when the element " +
    "is at the TOP of its gesture scope. Use gesture-isolated when the element " +
    "is in a separate DOM branch AND needs different gesture behavior (e.g., " +
    "ChalkCanvas overlay on top of GeometryPanel — separate z-index, separate scope).",
};

/**
 * DH-ELEM-02: Touch-Action Selection
 */
export const DH_ELEM_02: InteractionDecisionHeuristic = {
  id: "DH-ELEM-02",
  name: "Touch-Action Selection",
  question: "Which axes should the browser handle vs JavaScript?",
  options: [
    "none — JS handles everything (canvas, full-custom drag)",
    "pan-y — browser handles vertical scroll, JS handles horizontal swipe",
    "pan-x — browser handles horizontal scroll, JS handles vertical gestures",
    "manipulation — browser handles pan + pinch, no JS gestures",
    "auto — no JS gestures at all",
  ],
  guideline:
    "Start with 'auto' (browser handles everything). Only restrict touch-action when " +
    "JS needs to handle a specific axis. Every axis you claim from the browser " +
    "is an axis you must implement and maintain. Claim the MINIMUM axes needed. " +
    "Validated pattern: pan-y for swipe containers, none for canvas/drawing areas.",
};

/**
 * DH-ELEM-03: Event Stream Selection for Element
 */
export const DH_ELEM_03: InteractionDecisionHeuristic = {
  id: "DH-ELEM-03",
  name: "Event Stream Selection",
  question: "Should this element use pointer events, touch events, or let the browser handle it?",
  options: [
    "pointer (default) — works with mouse/touch/pen, cancelled during browser scroll",
    "touch — survives browser scroll (W3C spec: touch events not cancelled during pan), needed for swipe+scroll coexistence",
    "none — browser handles natively (scroll-container, inert elements)",
  ],
  guideline:
    "Use POINTER (default) for elements with touch-action: none (no browser scroll conflict). " +
    "Use TOUCH for elements with touch-action: pan-y/pan-x (need swipe during browser scroll). " +
    "The key rule: if the element scrolls AND swipes, use touch events because pointer events " +
    "get cancelled during scroll. This was the palantir-math v2.0 fix.",
};

/**
 * DH-ELEM-04: Parent-Child Gesture Delegation
 */
export const DH_ELEM_04: InteractionDecisionHeuristic = {
  id: "DH-ELEM-04",
  name: "Parent-Child Gesture Delegation",
  question: "How should children communicate their identity to the parent gesture handler?",
  options: [
    "data-* attribute — child has data-step-index, parent uses closest() to find it",
    "callback prop — parent passes onSelect callback, child calls it (CAUTION: can conflict)",
    "event.target inspection — parent checks event.target class/tag (fragile, avoid)",
  ],
  guideline:
    "ALWAYS use data-* attributes (DH-ELEM-04 option 1). This is the only approach " +
    "that avoids gesture handler conflicts. Callback props (option 2) require the " +
    "child to have click/tap handlers — which is a separate gesture system and violates " +
    "HC-INT-01. Event.target inspection (option 3) is fragile and breaks with DOM changes. " +
    "Pattern: child has data-step-index={n}, parent's tap-filtered handler uses " +
    "event.target.closest('[data-step-index]').getAttribute('data-step-index').",
};

export const ELEMENT_DECISION_HEURISTICS: readonly InteractionDecisionHeuristic[] = [
  DH_ELEM_01,
  DH_ELEM_02,
  DH_ELEM_03,
  DH_ELEM_04,
] as const;

// =========================================================================
// Section 3: Hard Constraints (HC-ELEM-*)
// =========================================================================

/**
 * HC-ELEM-01: Gesture-Target Elements Must Not Have Handlers
 *
 * An element with role "gesture-target" MUST NOT have click, tap,
 * pointerdown handlers, or any gesture system bindings. It provides data-*
 * attributes only.
 */
export const HC_ELEM_01: InteractionHardConstraint = {
  id: "HC-ELEM-01",
  name: "Gesture-Target Has No Handlers",
  description:
    "An element with role 'gesture-target' (identified by data-* attributes) " +
    "MUST NOT have click, tap, or pointerdown handlers, or any gesture system " +
    "bindings. All gesture detection is delegated to the parent gesture-owner. " +
    "Violation causes dual-handler bug: parent gesture system (touch events) + " +
    "child gesture system (pointer events) fire independently for the same physical touch.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each element with role 'gesture-target': verify no gesture handler props " +
    "exist on the component (click, tap, pointerdown handlers, or gesture system bindings).",
  context: {
    mechanism:
      "A child element with data-step-index (gesture-target role) that also has onClick " +
      "or onTap creates a second event listener in the pointer event stream. The parent's " +
      "gesture library (touch stream) fires independently — one tap triggers both handlers. " +
      "This is HC-INT-01 manifested at the element level.",
    antiPattern:
      "<StepCard data-step-index={i} onClick={handleSelect}> inside a parent with useDrag — " +
      "StepCard's onClick (pointer) + parent's useDrag (touch) both fire on tap",
    correctPattern:
      "<StepCard data-step-index={i} /> with NO handlers. Parent's useDrag handler uses " +
      "event.target.closest('[data-step-index]') to identify which child was tapped.",
    detectionSignal:
      "onClick or onTap or onPointerDown on a component that also has data-step-index or data-card-id or data-*-index attributes",
    evidence: "palantir-math v2.0 Session 2 (2026-03-22) — StepCard had onTap inside NarrativePanel useDrag",
  },
};

/**
 * HC-ELEM-02: Gesture-Isolated Must Be In Separate DOM Branch
 *
 * An element with role "gesture-isolated" must not be a child of a
 * gesture-owner in the same DOM nesting. It should be in a portal,
 * overlay, or separate panel.
 */
export const HC_ELEM_02: InteractionHardConstraint = {
  id: "HC-ELEM-02",
  name: "Gesture-Isolated Must Be Separate DOM Branch",
  description:
    "An element with role 'gesture-isolated' MUST be in a separate DOM branch " +
    "from any gesture-owner. Typically via: (1) sibling panels (GeometryPanel ↔ " +
    "separate panel), (2) z-index overlay with pointer-events isolation, (3) framework portal. " +
    "If a gesture-isolated element is nested inside a gesture-owner, the owner's " +
    "gesture bindings will capture events intended for the isolated element.",
  severity: "error",
  domain: "cross",
  context: {
    mechanism:
      "DOM event bubbling propagates events from child to parent through the DOM tree. " +
      "If a 'gesture-isolated' element is nested inside a 'gesture-owner' parent, the " +
      "parent's gesture handler receives events from the isolated element via bubbling — " +
      "the isolation is broken. Additionally, @use-gesture activates setPointerCapture " +
      "(default for touch input per W3C Pointer Events Level 3). When pointer capture is " +
      "active, ALL subsequent pointer events for that pointer are redirected to the " +
      "captured element, bypassing the nested isolated element entirely.",
    antiPattern:
      "<GeometryPanel {...useDrag(handlePan)()}>\n" +
      "  <ChalkCanvas {...useDrag(handleDraw)()} />  ← nested inside gesture-owner\n" +
      "</GeometryPanel>\n" +
      "Draw events on ChalkCanvas bubble to GeometryPanel's pan handler. Both handlers " +
      "fire — canvas draws AND panel pans simultaneously.",
    correctPattern:
      "Separate DOM branches (siblings, not parent-child):\n" +
      "<div className='layout'>\n" +
      "  <GeometryPanel {...useDrag(handlePan)()} />\n" +
      "  <ChalkCanvas {...useDrag(handleDraw)()} style={{ position: 'absolute', zIndex: 10 }} />\n" +
      "</div>\n" +
      "Or use a React portal to render ChalkCanvas outside the GeometryPanel DOM tree.",
    detectionSignal:
      "A component with role='gesture-isolated' (own gesture handlers, independent scope) " +
      "that is a DOM descendant of a component with role='gesture-owner'. Check JSX nesting: " +
      "if both parent and nested child have useDrag/usePinch/useGesture, the nested component " +
      "should be gesture-isolated via sibling placement or portal.",
    evidence:
      "Preventive constraint — ChalkCanvas overlay architecture in palantir-math v2.0. " +
      "setPointerCapture behavior confirmed via W3C Pointer Events Level 3 §10.",
  },
};

/**
 * HC-ELEM-03: Scroll Container Must Not Have JS Gesture Handlers
 *
 * An element with role "scroll-container" relies on browser-native scrolling.
 * Adding JS gesture handlers (drag, pinch) on the same element
 * creates a conflict between browser scroll and JS gesture detection.
 */
export const HC_ELEM_03: InteractionHardConstraint = {
  id: "HC-ELEM-03",
  name: "Scroll Container Has No JS Handlers",
  description:
    "An element with role 'scroll-container' MUST NOT have JS gesture system " +
    "gesture bindings. Browser-native scroll and JS gesture handlers on the same " +
    "element compete for the same touch/pointer events. " +
    "Pattern: wrap the scroll container in a gesture-owner parent that handles " +
    "swipe, and let the scroll container handle scroll natively.",
  severity: "warn",
  domain: "cross",
  validationFn:
    "For each element with role 'scroll-container': verify no gesture handler " +
    "bindings exist. If swipe is needed, it should be on a parent wrapper.",
  context: {
    mechanism:
      "Browser-native scroll consumes touch events on overflow: scroll/auto elements. " +
      "When a JS gesture library also binds to the same element, the browser's scroll " +
      "handler and JS gesture handler both attempt to process pointerdown/pointermove. " +
      "Result: scroll stutters, gestures fire during scroll, or scroll cancels gestures.",
    antiPattern:
      "A div with overflow-y: auto AND {...useDrag(handleSwipe)()} on the same element — " +
      "vertical scroll and horizontal swipe compete for the same touch sequence",
    correctPattern:
      "Outer wrapper: useDrag (swipe) with touch-action: pan-y. " +
      "Inner container: overflow-y: auto (scroll), no JS gesture bindings. " +
      "Separation: parent owns gestures, child owns scroll.",
    detectionSignal:
      "useDrag or usePinch binding on an element that also has overflow: scroll or overflow: auto or overflow-y: scroll",
    evidence: "palantir-math v2.0 — NarrativePanel scroll + swipe coexistence architecture",
  },
};

/**
 * HC-ELEM-04: Data Attribute Naming Convention
 *
 * Gesture-target elements must use a standardized data-* attribute naming
 * pattern for parent gesture-owners to identify them.
 */
export const HC_ELEM_04: InteractionHardConstraint = {
  id: "HC-ELEM-04",
  name: "Data Attribute Naming Convention",
  description:
    "Gesture-target elements MUST use data-{entity}-{field} naming pattern. " +
    "Examples: data-step-index, data-card-id, data-tool-type. " +
    "The parent gesture-owner uses event.target.closest('[data-step-index]') " +
    "to identify which child was interacted with. " +
    "Avoid generic names (data-id, data-value) — they collide across components.",
  severity: "warn",
  domain: "cross",
  context: {
    mechanism:
      "Parent gesture-owner elements identify which child was interacted with using " +
      "event.target.closest('[data-*]'). Generic attribute names (data-id, data-value) " +
      "collide when multiple component types coexist in the same DOM tree. The closest() " +
      "traversal walks UP the DOM — a generic name matches the wrong ancestor component. " +
      "Note: @use-gesture's state.event.target preserves the original DOM target, so " +
      "closest() works in gesture callbacks. However, during drag with pointer capture " +
      "active (default for touch), event.target becomes the captured element — closest() " +
      "is reliable for tap detection (first/last events) but not mid-drag.",
    antiPattern:
      "Two component types both use data-id: <StepCard data-id={stepId} /> and " +
      "<ToolButton data-id={toolId} />. Parent handler calls " +
      "event.target.closest('[data-id]').getAttribute('data-id') — which data-id " +
      "did it find? Depends on DOM nesting, which changes with layout.",
    correctPattern:
      "Use data-{entity}-{field} pattern: <StepCard data-step-index={i} /> and " +
      "<ToolButton data-tool-type='eraser' />. Parent handler uses specific selectors: " +
      "event.target.closest('[data-step-index]') vs event.target.closest('[data-tool-type]'). " +
      "No collision possible.",
    detectionSignal:
      "Grep data- attributes on gesture-target elements. Any attribute that doesn't follow " +
      "data-{entity}-{field} pattern (e.g., data-id, data-value, data-index without " +
      "entity prefix) is a collision risk across component types.",
    evidence:
      "@use-gesture state.event.target behavior verified via context7 docs and DragEngine " +
      "source (2026-03-22). setPointerCapture redirect behavior per W3C Pointer Events L3.",
  },
};

/**
 * HC-ELEM-05: Minimum Touch Target Size
 *
 * WCAG 2.5.8 (Level AA): Pointer input targets must be at least 24×24 CSS pixels.
 * WCAG 2.5.5 (Level AAA): Enhanced target size is 44×44 CSS pixels.
 *
 * Gesture-target elements (data-* attributes) ARE pointer targets for the parent's
 * gesture system. Even though the parent owns the gesture handler, the visual
 * target area that the user taps must meet the minimum size.
 *
 * Authority: WCAG 2.2 SC 2.5.8 (Level AA)
 * Research: ~/.claude/research/interaction/wcag-gesture-requirements.md [§WCAG.TS-01]
 */
export const HC_ELEM_05: InteractionHardConstraint = {
  id: "HC-ELEM-05",
  name: "Minimum Touch Target Size",
  description:
    "Gesture-target elements and interactive controls MUST have a minimum size of " +
    "24×24 CSS pixels (WCAG 2.5.8, Level AA). Recommended: 44×44 CSS pixels " +
    "(WCAG 2.5.5, Level AAA). Spacing exception: undersized targets are acceptable " +
    "if a 24px-diameter circle centered on each target does not overlap neighbors. " +
    "Inline text exception: targets within sentences are exempt.",
  severity: "warn",
  domain: "cross",
  validationFn:
    "For each element with role 'gesture-target' or 'gesture-owner': verify the " +
    "rendered element dimensions meet 24×24 CSS pixel minimum. This requires " +
    "runtime measurement (Playwright/browser DevTools), not declaration checking.",
  context: {
    mechanism:
      "Users with motor impairments, tremors, or limited dexterity cannot reliably " +
      "tap targets smaller than 24×24 CSS px. On touch devices, finger contact area " +
      "is ~7mm (~40px at 160dpi) — targets below 24px have a high miss rate. " +
      "WCAG 2.5.8 (Level AA, new in 2.2) codifies this as a conformance requirement.",
    antiPattern:
      "StepCard with data-step-index rendered at 16×16px. Parent gesture-owner detects " +
      "tap via closest('[data-step-index]'), but the visual target area is too small " +
      "for reliable touch input.",
    correctPattern:
      "StepCard with min-width: 24px, min-height: 24px (Level AA). For touch-primary " +
      "interfaces: min-width: 44px, min-height: 44px (Level AAA / Apple HIG / Material).",
    detectionSignal:
      "Runtime: Playwright getComputedStyle() or getBoundingClientRect() on elements " +
      "with role='gesture-target'. Any target with width < 24 or height < 24 is a violation. " +
      "Static: check CSS for explicit width/height < 24px on gesture-target components.",
    evidence:
      "WCAG 2.2 SC 2.5.8 (Level AA) and SC 2.5.5 (Level AAA). 24px minimum from " +
      "W3C, 44px from Apple HIG and Material Design guidelines.",
  },
};

export const ELEMENT_HARD_CONSTRAINTS: readonly InteractionHardConstraint[] = [
  HC_ELEM_01,
  HC_ELEM_02,
  HC_ELEM_03,
  HC_ELEM_04,
  HC_ELEM_05,
] as const;
