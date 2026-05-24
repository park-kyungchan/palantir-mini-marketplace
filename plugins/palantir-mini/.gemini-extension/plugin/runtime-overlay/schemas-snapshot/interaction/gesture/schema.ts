/**
 * GESTURE Subdomain Schema — Interaction Schema §1
 *
 * Decision heuristics and hard constraints for GESTURE DECLARATIONS.
 * Answers: "What physical inputs exist, and how are they classified?"
 *
 * Parallel to ontology/data/schema.ts (entity declarations).
 * Gesture = the physical input that a human agent performs.
 * Entity = the data structure that a system agent queries.
 *
 * Authority: Tool Exposure Model §TE-02 (3 categories mapped to 4 gesture domains)
 */

import type {
  InteractionHardConstraint,
  InteractionDecisionHeuristic,
} from "../types";

export const SCHEMA_VERSION = "0.1.2" as const;

// =========================================================================
// Section 1: Gesture Type Taxonomy
// =========================================================================

/**
 * Complete gesture type catalog — every physical input must map to one of these.
 * Extensible per project, but these are the universal base types.
 */
export const GESTURE_TYPES = [
  // ─── Navigation (LOGIC analog) ────────────────────────────
  "tap",             // Single-finger/pen tap on a target
  "double-tap",      // Two taps in quick succession
  "swipe-left",      // Horizontal swipe → advance/next
  "swipe-right",     // Horizontal swipe → back/previous
  "swipe-up",        // Vertical swipe → scroll up / dismiss
  "swipe-down",      // Vertical swipe → pull to refresh / reveal
  "long-press",      // Press and hold (delay-based)

  // ─── View (DATA analog) ───────────────────────────────────
  "pinch-in",        // Two-finger pinch → zoom out
  "pinch-out",       // Two-finger pinch → zoom in
  "scroll-x",        // Horizontal scroll (native or JS)
  "scroll-y",        // Vertical scroll (native or JS)
  "rotate",          // Two-finger rotation

  // ─── Mutation (ACTION analog) ─────────────────────────────
  "pen-draw",        // S-Pen / stylus contact + drag → create annotation
  "pen-erase",       // Eraser tip contact + drag → delete annotation
  "drag-reorder",    // Long press + drag → reorder items
  "drag-drop",       // Drag element to a drop target

  // ─── Device-specific ──────────────────────────────────────
  "pen-hover",       // Pen within digitizer range, not touching
  "pen-barrel-tap",  // Barrel button pressed, no drag (tap)
  "pen-barrel-drag", // Barrel button pressed + drag (highlight)
  "pen-pressure",    // Pressure sensitivity (continuous 0-1)
  "pen-tilt",        // Tilt angle (continuous ±60°)
  "trackpad-pinch",  // Trackpad pinch-zoom (Ctrl+wheel internally)
] as const;

export type GestureType = typeof GESTURE_TYPES[number];

// =========================================================================
// Section 2: Decision Heuristics (DH-GEST-*)
// =========================================================================

/**
 * DH-GEST-01: Gesture Domain Classification
 *
 * Every gesture belongs to exactly one of 4 domains.
 * This parallels SH-01 in ontology (EXISTS vs REASON vs CHANGE).
 */
export const DH_GEST_01: InteractionDecisionHeuristic = {
  id: "DH-GEST-01",
  name: "Gesture Domain Classification",
  question: "Does this gesture navigate, display, mutate, or use device hardware?",
  options: [
    "navigation — changes which content is visible (swipe, tap-to-select)",
    "view — changes HOW content is displayed without changing data (zoom, scroll)",
    "mutation — creates, modifies, or deletes persistent data (pen-draw, drag-reorder)",
    "device — uses hardware capability not available on all devices (pressure, barrel)",
  ],
  guideline:
    "Apply SH-INT-01 deletion test: if you removed this gesture, would the data " +
    "still change through another path? YES → navigation/view. NO → mutation. " +
    "Device gestures enhance mutation/navigation but are never the ONLY input method.",
};

/**
 * DH-GEST-02: Universal vs Device-Specific
 *
 * Every gesture must be classified as universal (works on any device)
 * or device-specific (requires particular hardware).
 */
export const DH_GEST_02: InteractionDecisionHeuristic = {
  id: "DH-GEST-02",
  name: "Universal vs Device-Specific",
  question: "Does this gesture require hardware not present on a standard touch/mouse device?",
  options: [
    "universal — works with finger, mouse, pen, keyboard (tap, swipe, pinch)",
    "device-specific — requires S-Pen, pressure sensor, barrel button, etc.",
  ],
  guideline:
    "Device-specific gestures MUST have a universal fallback. Pen pressure enhances " +
    "line thickness but drawing must also work with constant-pressure touch. " +
    "Barrel button enables quick-clear but a button must also exist. " +
    "Eraser tip is a shortcut for the erase tool selector.",
};

/**
 * DH-GEST-03: Tap vs Drag Disambiguation
 *
 * Gesture libraries typically provide tap-vs-drag disambiguation via a displacement threshold.
 */
export const DH_GEST_03: InteractionDecisionHeuristic = {
  id: "DH-GEST-03",
  name: "Tap vs Drag Disambiguation",
  question: "On this element, can both tap and drag gestures occur?",
  options: [
    "tap only — no drag on this element (button, card selector)",
    "drag only — no tap on this element (canvas, slider)",
    "both — element accepts tap AND drag (enable tap filtering, threshold ≤ 3px)",
  ],
  guideline:
    "When both tap and drag are possible, enable the gesture system's tap filtering " +
    "(displacement threshold, typically ≤ 3px). For pen input, a higher threshold " +
    "(~8px) prevents jitter-induced false drags due to pen precision sensitivity. " +
    "Use the gesture system's built-in tap/drag disambiguation — do not reimplement.",
};

/**
 * DH-GEST-04: Swipe Threshold Tuning
 */
export const DH_GEST_04: InteractionDecisionHeuristic = {
  id: "DH-GEST-04",
  name: "Swipe Threshold Tuning",
  question: "What are the right swipe distance and velocity thresholds?",
  options: [
    "tight (distance: 30px, velocity: 0.3) — responsive, risk of false positives",
    "default (distance: 50px, velocity: 0.5) — balanced",
    "loose (distance: 80px, velocity: 0.8) — conservative, requires deliberate swipe",
  ],
  guideline:
    "Default (50px, 0.5) is validated for Galaxy Book 4 Pro 360 touch + pen. " +
    "Tighter thresholds work for pen-only interfaces (pen movements are more precise). " +
    "Looser thresholds work when scroll coexistence is critical (avoids false swipes " +
    "during vertical scroll attempts).",
};

/**
 * DH-GEST-05: Hardware Button State Must Be Captured on pointerdown, Not pointerup
 *
 * Origin: palantir-math v2.0 Session 3 — barrel tap → clear, eraser tap → undo.
 * event.buttons reflects CURRENT button state. On pointerup (tap completion),
 * all buttons are released → event.buttons === 0. Reading buttons on the tap
 * event silently fails for ALL hardware button mappings.
 */
export const DH_GEST_05: InteractionDecisionHeuristic = {
  id: "DH-GEST-05",
  name: "Capture Hardware Button State on pointerdown",
  question: "How should hardware button state (barrel, eraser) be read for tap gestures?",
  options: [
    "read on pointerdown (first event) and store in gesture memo — CORRECT",
    "read on pointerup (tap event) — WRONG: buttons === 0 on release",
  ],
  guideline:
    "PointerEvent.buttons reflects the current state of pressed buttons at the moment " +
    "of the event. On pointerup (which is when filterTaps detects a tap), all buttons " +
    "have been released, so event.buttons is always 0. The correct pattern: capture " +
    "the tool type from event.buttons on the FIRST gesture event (pointerdown) and " +
    "store it in the gesture handler's memo object. On the TAP event (last === true, " +
    "tap === true), read from memo, not from event.buttons. This applies to all " +
    "hardware modifier detection: S-Pen barrel button (buttons & 2), eraser tip " +
    "(buttons & 32), and any future hardware input differentiators.",
  context: {
    mechanism:
      "PointerEvent.buttons is a live bitmask of currently-pressed buttons. " +
      "pointerup fires AFTER the button is released → buttons = 0. " +
      "Gesture libraries that detect taps fire the handler with { tap: true } " +
      "on the pointerup event, not on pointerdown.",
    antiPattern:
      "if (tap && event.buttons & 2) { clear(); } " +
      "// SILENT FAILURE: event.buttons is always 0 on tap (pointerup)",
    correctPattern:
      "if (first) { return { toolType: getToolType(event) }; } " +
      "if (tap) { if (memo.toolType === 'highlighter') clear(); }",
    detectionSignal:
      "event.buttons checked inside a tap/last/pointerup handler",
    evidence: "palantir-math v2.0 Session 3 (2026-03-22) — barrel tap gesture mapping",
  },
};

export const GESTURE_DECISION_HEURISTICS: readonly InteractionDecisionHeuristic[] = [
  DH_GEST_01,
  DH_GEST_02,
  DH_GEST_03,
  DH_GEST_04,
  DH_GEST_05,
] as const;

// =========================================================================
// Section 3: Hard Constraints (HC-GEST-*)
// =========================================================================

/**
 * HC-GEST-01: Device Fallback Required
 *
 * Every device-specific gesture MUST have a universal fallback.
 * Users without S-Pen must still be able to use all features.
 */
export const HC_GEST_01: InteractionHardConstraint = {
  id: "HC-GEST-01",
  name: "Device Fallback Required",
  description:
    "Every device-specific gesture (pen-pressure, pen-barrel-tap, pen-erase) MUST " +
    "have a universal fallback. pen-pressure → constant-width drawing with finger. " +
    "pen-barrel-tap → UI button for clear. pen-erase → tool selector button for eraser. " +
    "A teaching interface must work on a device without S-Pen, even if degraded.",
  severity: "warn",
  domain: "device",
  validationFn:
    "For each gesture with inputDevice !== 'any': verify a gesture with the same " +
    "actionRef and inputDevice === 'any' exists in the declarations.",
  context: {
    mechanism:
      "Device-specific gestures use PointerEvent properties only available on specific " +
      "hardware: pointerType === 'pen' (S-Pen/stylus), buttons & 2 (barrel button, same " +
      "bit as right-click per W3C Pointer Events Level 3), buttons & 32 (eraser tip), " +
      "pressure (0-1 float, 0.5 for mouse). Users on devices without these capabilities " +
      "(finger touch, mouse, keyboard) receive no pointer events with these properties — " +
      "the feature silently doesn't exist for them.",
    antiPattern:
      "Gesture declaration: { gestureType: 'pen-barrel-tap', inputDevice: 'pen', " +
      "actionRef: 'clearCanvas' }. No matching gesture with inputDevice: 'any' exists. " +
      "Users without S-Pen have no way to clear the canvas.",
    correctPattern:
      "For each device-specific gesture, declare a universal fallback with the same actionRef: " +
      "{ gestureType: 'pen-barrel-tap', inputDevice: 'pen', actionRef: 'clearCanvas' } " +
      "AND a visible <Button onClick={clearCanvas}> with inputDevice: 'any'. " +
      "Device gesture enhances speed; universal fallback ensures access.",
    detectionSignal:
      "For each gesture with inputDevice !== 'any': search for another gesture with the " +
      "same actionRef and inputDevice === 'any'. Missing = no universal fallback. " +
      "Also check: mutation actionRef without a corresponding <Button> in the UI.",
    evidence:
      "Galaxy Book 4 Pro 360 S-Pen is Wacom EMR (passive) — standard PointerEvents, " +
      "pointerType: 'pen', pressure/tilt, buttons bitmask. No proprietary gesture layer, " +
      "no system conflicts with web apps (verified via Samsung/Wacom docs 2026-03-22).",
  },
};

/**
 * HC-GEST-02: No OS-Conflicting Gestures
 *
 * Gestures must not conflict with OS-level gestures (Windows, iOS, Android).
 * 3-finger gestures are banned on Windows (Task View, virtual desktops).
 */
export const HC_GEST_02: InteractionHardConstraint = {
  id: "HC-GEST-02",
  name: "No OS-Conflicting Gestures",
  description:
    "Gesture declarations MUST NOT use gesture types that conflict with OS-level gestures. " +
    "On Windows: 3-finger swipe (Task View), 3-finger tap (Action Center), " +
    "4-finger gestures (virtual desktop). On iOS: swipe from edge (back navigation), " +
    "4-finger pinch (home). Declare device constraints in DeviceProfile.constraints.",
  severity: "error",
  domain: "cross",
  context: {
    mechanism:
      "OS-level system gestures are intercepted before reaching the browser. No pointerdown " +
      "or touchstart event is dispatched to web content — the gesture silently fails with " +
      "no error, no event, no feedback. Conflicts: Windows 3-finger (Task View, Show Desktop, " +
      "Switch App) and 4-finger (Switch Virtual Desktop) are OS-intercepted on touchscreens. " +
      "All platforms reserve edge swipes: Windows (left=Widgets, right=Notifications), " +
      "iOS (left/right=Back/Forward, bottom=Home, top=Notifications/Control Center), " +
      "Android (left/right=Back ~20dp, bottom=Home/Recent Apps). Web apps cannot defer " +
      "or override these — no web API exists to claim system gesture zones.",
    antiPattern:
      "Declaring gestures using: (1) 3-finger swipe/tap (Windows Task View/Show Desktop), " +
      "(2) 4-finger swipe (Windows desktops, iPad app switching), (3) edge swipe from any " +
      "screen edge within ~20dp of viewport boundary, (4) swipe up from bottom edge " +
      "(Home gesture on all platforms). These work in desktop Chrome with a mouse " +
      "but silently fail on touchscreen devices.",
    correctPattern:
      "Use only center-screen gestures with max 2 contact points. For horizontal navigation: " +
      "swipe in content area (not from edges). For zoom: 2-finger pinch (universally supported). " +
      "Unsafe zones: bottom ~48px (Home), left/right ~20px (Back/navigation), " +
      "top ~20px (Notifications/Control Center).",
    detectionSignal:
      "Any gestureType containing '3-finger', '4-finger', '5-finger', or 'edge-swipe'. " +
      "Any gesture with a trigger zone within 20px of viewport edges. " +
      "Any gesture requiring 3+ simultaneous touch points.",
    evidence:
      "Verified against: Microsoft Support (Windows 11 touch gestures), Apple HIG (system " +
      "gestures), Android Developer (gesture navigation compatibility). iOS: " +
      "preferredScreenEdgesDeferringSystemGestures is UIViewController-only — not available " +
      "to web content. Android: setSystemGestureExclusionRects is native-only — W3C " +
      "Pointer Events Issue #295 was closed without shipping web API (2020).",
  },
};

/**
 * HC-GEST-03: Gesture Type Must Be From Taxonomy
 *
 * Every gesture declaration must reference a known gesture type.
 * Custom types must be added to the taxonomy first.
 */
export const HC_GEST_03: InteractionHardConstraint = {
  id: "HC-GEST-03",
  name: "Gesture Type From Taxonomy",
  description:
    "Every GestureDeclaration.gestureType MUST be a value from the GESTURE_TYPES " +
    "taxonomy. Custom gesture types must be explicitly added to the taxonomy " +
    "before being used in declarations. This prevents ad-hoc gesture invention " +
    "that bypasses the classification system.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each gesture: gestureType must be in GESTURE_TYPES array.",
  context: {
    mechanism:
      "Custom gesture types invented outside the GESTURE_TYPES taxonomy bypass the " +
      "classification system. A gesture with an unregistered type cannot be checked " +
      "against OS conflict rules (HC-GEST-02), cannot be classified into domains " +
      "(DH-GEST-01), and cannot be validated for tap-vs-drag disambiguation (DH-GEST-03). " +
      "The taxonomy ensures every gesture is classifiable and validatable.",
    antiPattern:
      "GestureDeclaration with gestureType: 'three-tap' when 'three-tap' is not in " +
      "GESTURE_TYPES. The declaration compiles but no validation rule covers it — " +
      "it might conflict with OS gestures, other bindings, or axis ownership, " +
      "and nobody knows.",
    correctPattern:
      "Use only values from GESTURE_TYPES (22 types across 4 categories: navigation, " +
      "view, mutation, device). If a genuinely new gesture type is needed, add it to " +
      "GESTURE_TYPES first, classify it in a domain (DH-GEST-01), check for OS conflicts " +
      "(HC-GEST-02), then use it in declarations.",
    detectionSignal:
      "For each GestureDeclaration: check gestureType against GESTURE_TYPES array. " +
      "Any value not in the array is an unregistered type.",
  },
};

/**
 * HC-GEST-04: Swipe Recognition Must Not Depend on Release-Time Velocity
 *
 * Origin: palantir-math v2.0 — @use-gesture's swipe detection uses instantaneous
 * velocity at pointer release. On laptop touchscreens, users naturally decelerate
 * before lifting their finger (unlike phone swipes which release at full speed).
 * Peak velocity was 2.7 px/ms but release velocity dropped to 0.28 — below the
 * 0.5 threshold — so swipe was never detected despite 264px of movement.
 *
 * This is a DEVICE-CLASS issue, not a library-specific issue. Laptop touchscreens
 * (Galaxy Book, Surface, etc.) have different swipe kinematics than phones.
 */
export const HC_GEST_04: InteractionHardConstraint = {
  id: "HC-GEST-04",
  name: "Swipe Recognition Must Not Depend on Release-Time Velocity",
  description:
    "Swipe detection MUST use total displacement + time window, NOT instantaneous " +
    "velocity at the moment of pointer release. On laptop/convertible touchscreens " +
    "(Galaxy Book, Surface Pro, etc.), users decelerate before lifting their finger — " +
    "the release-time velocity drops below thresholds even for fast, long swipes. " +
    "Robust pattern: if |displacement| > threshold AND elapsedTime < maxDuration, " +
    "classify as swipe regardless of release velocity. If the gesture system only " +
    "supports velocity-based swipe, bypass it and detect manually on gesture end.",
  severity: "error",
  domain: "navigation",
  validationFn:
    "For each swipe gesture declaration: verify the detection algorithm does not " +
    "depend solely on release-time instantaneous velocity.",
  context: {
    mechanism:
      "On laptop/convertible touchscreens, users naturally decelerate before lifting — " +
      "phone users release mid-swipe at full speed. @use-gesture's swipe detection " +
      "samples velocity at pointer release. Galaxy Book 4 Pro 360: peak velocity 2.7 px/ms " +
      "but release velocity 0.28 px/ms (below 0.5 threshold) — 264px of movement, not detected.",
    antiPattern:
      "Relying on @use-gesture's built-in swipe[] detection or any velocity-at-release check: " +
      "if (swipe[0] !== 0) { handleSwipe(swipe[0]); }",
    correctPattern:
      "if (last && Math.abs(mx) > 50 && elapsedTime < 500) { handleSwipe(mx > 0 ? 'right' : 'left'); } " +
      "— displacement + time window, no velocity dependency",
    detectionSignal:
      "swipe[0] or swipe[1] or velocity check in a gesture handler's last/end branch",
    evidence: "palantir-math v2.0 Session 2 (2026-03-22) — swipe navigation on Galaxy Book 4 Pro 360 touchscreen",
  },
};

export const GESTURE_HARD_CONSTRAINTS: readonly InteractionHardConstraint[] = [
  HC_GEST_01,
  HC_GEST_02,
  HC_GEST_03,
  HC_GEST_04,
] as const;
