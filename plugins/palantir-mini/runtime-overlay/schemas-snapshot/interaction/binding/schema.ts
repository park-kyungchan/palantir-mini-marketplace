/**
 * BINDING Subdomain Schema — Interaction Schema §2
 *
 * Decision heuristics and hard constraints for GESTURE BINDINGS.
 * Answers: "How does a physical gesture map to a system action?"
 *
 * Parallel to ontology/logic/schema.ts (links, derived properties, functions).
 * Binding = the mapping between gesture input and system response.
 * Link = the mapping between two entities in the data model.
 *
 * A binding bridges two worlds:
 *   Physical world: human performs gesture on DOM element
 *   Ontology world: system executes ACTION mutation or LOGIC navigation
 *
 * Authority: Tool Exposure Model §TE-02 (gesture ↔ action symmetry)
 */

import type {
  InteractionHardConstraint,
  InteractionDecisionHeuristic,
} from "../types";

export const SCHEMA_VERSION = "0.2.0" as const;

// =========================================================================
// Section 1: Binding Categories
// =========================================================================

/**
 * Reserved action reference prefixes for non-mutation bindings.
 * These don't require an ontology ACTION — they change UI state only.
 */
export const RESERVED_ACTION_PREFIXES = {
  navigate: {
    prefix: "navigate:",
    examples: ["navigate:next", "navigate:prev", "navigate:goto", "navigate:home"],
    description: "UI navigation — changes which content is visible",
    ontologyDomain: "logic" as const,
  },
  view: {
    prefix: "view:",
    examples: ["view:zoom", "view:scroll", "view:reset", "view:expand", "view:collapse"],
    description: "View manipulation — changes how content is rendered",
    ontologyDomain: "data" as const,
  },
  tool: {
    prefix: "tool:",
    examples: ["tool:pen", "tool:eraser", "tool:highlighter", "tool:select"],
    description: "Tool selection — changes the active input mode",
    ontologyDomain: "logic" as const,
  },
} as const;

/**
 * Binding strength — how strongly the gesture is coupled to the action.
 * Direct: gesture IS the only way to trigger this action.
 * Shortcut: gesture is a convenience; UI button also exists.
 * Enhancement: gesture improves quality (pressure → line width) but action works without it.
 */
export type BindingStrength = "direct" | "shortcut" | "enhancement";

// =========================================================================
// Section 2: Decision Heuristics (DH-BIND-*)
// =========================================================================

/**
 * DH-BIND-01: Action Reference Type
 *
 * Determines whether a gesture binding references an ontology action (mutation)
 * or a reserved UI action (navigation/view/tool).
 */
export const DH_BIND_01: InteractionDecisionHeuristic = {
  id: "DH-BIND-01",
  name: "Action Reference Type",
  question: "Does this gesture trigger a database mutation or only a UI state change?",
  options: [
    "ontology action — references a mutation from ontology/action.ts (e.g., recordAnnotation)",
    "reserved navigate: — changes visible content without DB mutation (e.g., navigate:next)",
    "reserved view: — changes display mode without DB mutation (e.g., view:zoom)",
    "reserved tool: — changes active input tool without DB mutation (e.g., tool:eraser)",
  ],
  guideline:
    "If the result persists after browser refresh → ontology action. " +
    "If the result resets on refresh → reserved prefix. " +
    "Exception: some navigation may persist via URL params or session state, " +
    "but the binding itself is still 'navigate:' because the gesture doesn't " +
    "directly call a Convex mutation.",
};

/**
 * DH-BIND-02: Binding Strength
 */
export const DH_BIND_02: InteractionDecisionHeuristic = {
  id: "DH-BIND-02",
  name: "Binding Strength",
  question: "Is this gesture the only way to trigger this action, or is there a UI fallback?",
  options: [
    "direct — gesture is the primary/only input (e.g., pen-draw → annotation, no button equivalent)",
    "shortcut — gesture duplicates a UI button (e.g., swipe-left = 'Next' button)",
    "enhancement — gesture improves quality but action works without it (e.g., pressure → line width)",
  ],
  guideline:
    "Mutation bindings should be 'shortcut' or 'direct' — never 'enhancement'. " +
    "If a mutation can only be triggered by gesture (no button fallback), it's 'direct'. " +
    "If a button exists for the same action, the gesture is 'shortcut'. " +
    "Device-specific features (pressure, tilt) are always 'enhancement'.",
};

/**
 * DH-BIND-03: Binding Priority for Conflict Resolution
 *
 * When two bindings could match the same physical input, priority determines
 * which one fires.
 */
export const DH_BIND_03: InteractionDecisionHeuristic = {
  id: "DH-BIND-03",
  name: "Binding Priority",
  question: "If two gestures could match the same physical input, which takes precedence?",
  options: [
    "mutation > navigation > view — mutations are irreversible, must not fire accidentally",
    "specific > general — barrel-tap (specific) > tap (general)",
    "child > parent — gesture on a specific element > gesture on container",
  ],
  guideline:
    "Priority determines which binding fires when ambiguous. " +
    "Lower priority number = higher precedence. Mutations should have highest " +
    "precedence (lowest number) to prevent accidental navigation during drawing. " +
    "Within the same category, more specific gestures override general ones.",
};

export const BINDING_DECISION_HEURISTICS: readonly InteractionDecisionHeuristic[] = [
  DH_BIND_01,
  DH_BIND_02,
  DH_BIND_03,
] as const;

// =========================================================================
// Section 3: Hard Constraints (HC-BIND-*)
// =========================================================================

/**
 * HC-BIND-01: Mutation Bindings Must Have UI Fallback
 *
 * Gestures that trigger ontology ACTION mutations must have a visible
 * UI control (button, menu item) as fallback. Gesture-only mutation
 * triggers are invisible to users who don't know the gesture.
 */
export const HC_BIND_01: InteractionHardConstraint = {
  id: "HC-BIND-01",
  name: "Mutation Bindings Must Have UI Fallback",
  description:
    "Every gesture binding with an ontology action reference (non-reserved prefix) " +
    "MUST have a corresponding visible UI control (button, menu item, toolbar icon) " +
    "that triggers the same action. Gesture-only mutations are undiscoverable. " +
    "Exception: pen-draw is inherently discoverable (user sees the canvas and pen).",
  severity: "warn",
  domain: "mutation",
  validationFn:
    "For each binding with non-reserved actionRef: verify a UI control component " +
    "exists that references the same actionRef.",
  context: {
    mechanism:
      "WCAG 2.5.1 (Level A) requires single-pointer alternatives for ALL multipoint " +
      "and path-based gestures. WCAG 2.5.7 (Level AA, new in 2.2) requires non-drag " +
      "single-pointer alternatives for ALL drag operations. Gesture-only mutation " +
      "triggers are undiscoverable to users who don't know the gesture AND inaccessible " +
      "to users who cannot perform it (motor impairments, assistive technology, " +
      "unfamiliar users). A drag-to-reorder without buttons fails both SC 2.5.1 and SC 2.5.7.",
    antiPattern:
      "A 'drag-to-reorder' gesture is the ONLY way to reorder items — no up/down " +
      "buttons, no menu option. Users with motor impairments, keyboard-only users, " +
      "and users on devices without drag support cannot reorder.",
    correctPattern:
      "Every mutation binding has a visible control: <Button onClick={reorder}> or a " +
      "context menu item. For drag-to-reorder: add up/down arrow buttons per item. " +
      "For pen-draw: provide a text annotation alternative. Exception: pen-draw for " +
      "freehand strokes on a canvas is inherently discoverable (canvas + pen is self-evident).",
    detectionSignal:
      "Cross-file: for each binding with non-reserved actionRef (not navigate:, view:, " +
      "tool:), search the same feature folder for a <Button>, <button>, <MenuItem>, or " +
      "<IconButton> that triggers the same actionRef. Missing = violation.",
    evidence:
      "WCAG 2.5.1 (Level A) and WCAG 2.5.7 (Level AA, new in WCAG 2.2). " +
      "Verified against W3C Understanding documents (2026-03-22).",
  },
};

/**
 * HC-BIND-02: No Ambiguous Bindings on Same Element
 *
 * Two bindings on the same element must not match the same physical input.
 * Example: tap + barrel-tap are distinguishable (barrel button state).
 * But tap + long-press-then-release could be ambiguous.
 */
export const HC_BIND_02: InteractionHardConstraint = {
  id: "HC-BIND-02",
  name: "No Ambiguous Bindings on Same Element",
  description:
    "Two gesture bindings on the same element MUST be physically distinguishable. " +
    "Distinguishing factors: (1) different gesture type (tap vs swipe), " +
    "(2) different modifier (barrel button vs no button), " +
    "(3) different input device (pen vs finger, when pointerType check is used). " +
    "Two bindings that could both match the same physical input cause " +
    "nondeterministic behavior.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each ElementProfile: no two bindings should have the same gestureType " +
    "AND the same inputDevice. If they do, one must have a modifier (barrel, eraser).",
  context: {
    mechanism:
      "Two gesture bindings on the same element that match the same physical input " +
      "(e.g., both respond to a single-finger tap with no modifier) produce " +
      "nondeterministic behavior. The gesture system processes the input once but " +
      "two bindings match — which fires depends on declaration order, not user intent. " +
      "This creates unpredictable UI behavior that changes silently with code refactoring.",
    antiPattern:
      "Two bindings on 'NarrativePanel': (1) tap → navigate:next, (2) tap → navigate:goto. " +
      "Both match a single-finger tap with no modifier. The user taps — does it advance " +
      "to next step or select the tapped step? Answer depends on which binding was " +
      "declared first.",
    correctPattern:
      "Disambiguate bindings using different distinguishing factors: (1) different gesture " +
      "type (tap vs long-press), (2) different modifier (barrel button via buttons & 2 vs " +
      "no button), (3) different input device (pen via pointerType === 'pen' vs finger). " +
      "Each unique physical input must match exactly one binding.",
    detectionSignal:
      "For each ElementProfile: find all binding pairs with the same gestureType AND same " +
      "inputDevice. If no modifier (barrel, eraser, pressure threshold) differentiates " +
      "them, they are ambiguous.",
  },
};

/**
 * HC-BIND-03: Binding References Declared Gesture
 *
 * A binding's gestureApiName must reference an existing GestureDeclaration.
 * Prevents orphan bindings.
 */
export const HC_BIND_03: InteractionHardConstraint = {
  id: "HC-BIND-03",
  name: "Binding References Declared Gesture",
  description:
    "Every GestureBinding.gestureApiName MUST reference an existing " +
    "GestureDeclaration.apiName in the project's interaction schema. " +
    "Orphan bindings (referencing non-existent gestures) are design-time errors.",
  severity: "error",
  domain: "cross",
  validationFn:
    "For each binding: gestureApiName must match a gesture in InteractionExports.gestures[].",
  context: {
    mechanism:
      "A GestureBinding.gestureApiName that doesn't match any GestureDeclaration.apiName " +
      "creates an orphan binding. At validation time, the binding cannot be checked for " +
      "library consistency (HC-INT-01), event stream consistency (HC-INT-04), or " +
      "touch-action consistency (HC-INT-03) because the referenced gesture's properties " +
      "(library, eventStream, gestureType) are unknown. This breaks the validation chain.",
    antiPattern:
      "GestureBinding with gestureApiName: 'swipe-advance' when gestures[] only declares " +
      "'swipe-left-advance'. The binding passes structural validation but cross-reference " +
      "validation catches the mismatch — a typo creates an orphan.",
    correctPattern:
      "gestureApiName must exactly match a GestureDeclaration.apiName. Define gesture " +
      "apiNames as TypeScript constants to prevent typos: " +
      "const GESTURES = { SWIPE_ADVANCE: 'swipe-left-advance' } as const.",
    detectionSignal:
      "Cross-reference: collect all gestureApiName values from bindings[], compare against " +
      "all apiName values from gestures[]. Any gestureApiName not found in gestures[] " +
      "is an orphan binding.",
  },
};

/**
 * HC-BIND-04: Impact Chain Must Be Declared
 *
 * Every mutation binding must declare its full impact chain:
 * gesture → action → entity change → UI updates (cascade).
 *
 * This is the frontend application of Palantir's Impact Propagation Graph
 * (§LOGIC.R-02): "every LOGIC element answers 'When X changes, what is affected?'"
 *
 * Without explicit impact chains:
 * - New components added later don't know they should re-render
 * - Developers can't trace "why did this panel update?" back to a gesture
 * - Testing is incomplete (can't verify all cascade targets updated)
 *
 * Authority: §LOGIC.R-02 (Impact Propagation Graph thesis)
 *            §LOGIC.R-03 (multi-hop cascade: explicit, not automatic)
 *            A3 Axiom (Explicit over implicit)
 */
export const HC_BIND_04: InteractionHardConstraint = {
  id: "HC-BIND-04",
  name: "Impact Chain Must Be Declared",
  description:
    "Every binding with an ontology action reference MUST declare its impact chain: " +
    "(1) which entity field changes, (2) which UI elements re-render as a result, " +
    "(3) any cascading UI updates beyond the direct target. " +
    "This is the frontend analog of Palantir's Impact Propagation Graph " +
    "(§LOGIC.R-02): 'When X changes, what is affected?' " +
    "Example: swipe-left → advanceStep → Lecture.currentStepIndex++ → " +
    "[NarrativePanel (progress bar), GeometryPanel (highlights), Header (domain badge)]",
  severity: "warn",
  domain: "mutation",
  validationFn:
    "For each binding with non-reserved actionRef: verify an impactChain array " +
    "is declared listing entityField + uiTargets[].",
  context: {
    mechanism:
      "Without explicit impact chains, the causal path from gesture to UI update is " +
      "invisible. When a mutation changes an entity field, which UI elements should " +
      "re-render? Without the chain, developers add components that consume the same " +
      "field but don't know about each other — one gets updated, the other shows stale " +
      "data. This is the frontend analog of Palantir's Impact Propagation Graph " +
      "(§LOGIC.R-02): 'When X changes, what is affected?' Impact propagation must be " +
      "explicit, not automatic (Axiom A3).",
    antiPattern:
      "Binding for 'advanceStep' mutation with no impactChain. Three components consume " +
      "currentStepIndex (NarrativePanel, GeometryPanel, Header) but the developer only " +
      "knows about NarrativePanel — GeometryPanel shows stale highlights.",
    correctPattern:
      "impactChain: { actionRef: 'advanceStep', entityField: 'Lecture.currentStepIndex', " +
      "directTargets: ['NarrativePanel'], cascadeTargets: ['GeometryPanel', 'Header'] }. " +
      "Every mutation binding declares ALL UI elements affected by the entity field change.",
    detectionSignal:
      "For each binding with non-reserved actionRef: check for impactChain array. " +
      "Missing = undeclared impact path. Also: compare impactChain targets against actual " +
      "component imports of the affected entity field to find undeclared consumers.",
    evidence:
      "Authority: §LOGIC.R-02 (Impact Propagation Graph thesis). Axiom A3 " +
      "(Explicit over implicit — verified across 5 research files).",
  },
};

/**
 * HC-BIND-05: Mutation Bindings Must Be Idempotent Under Rapid Input
 *
 * Origin: palantir-math v2.0 — rapid successive swipes sent 4 advanceStep
 * mutations using the same stale closure state (currentStepIndex=0).
 * All 4 passed the client-side guard because React hadn't re-rendered.
 *
 * In ANY reactive framework (React, Vue, Svelte), gesture callbacks capture
 * state at render time. Rapid inputs between renders reuse the same stale value.
 * Client-side guards based on captured state are unreliable for rate-limiting.
 *
 * Authority: A3 Axiom (Explicit over implicit) — state flow must be explicit.
 */
export const HC_BIND_05: InteractionHardConstraint = {
  id: "HC-BIND-05",
  name: "Mutation Bindings Must Be Idempotent Under Rapid Input",
  description:
    "Gesture bindings that trigger mutations MUST produce correct results " +
    "when invoked multiple times in rapid succession (< 100ms apart) with " +
    "the same captured state. Two approaches: (1) make the server mutation " +
    "idempotent (return current state instead of throwing on bounds), " +
    "(2) use server-side state as the sole source of truth (no client-side guards). " +
    "Client-side guards based on reactive state (closure captures) are unreliable " +
    "because gesture events fire faster than the framework re-renders.",
  severity: "error",
  domain: "mutation",
  validationFn:
    "For each mutation binding: verify the server mutation handles duplicate " +
    "calls gracefully (returns current state, not throws).",
  context: {
    mechanism:
      "React/Vue/Svelte callbacks capture state at render time (closure). Rapid swipes " +
      "(4 within 100ms) all see the same stale currentStepIndex=0 because React hasn't " +
      "re-rendered between events. Each calls advanceStep(lectureId) — server receives 4 " +
      "identical mutations. If the mutation throws on bounds (index >= totalSteps), " +
      "3 of 4 produce unhandled ConvexError noise in the console.",
    antiPattern:
      "Server mutation: if (nextIndex >= steps.length) throw new ConvexError('BOUNDS_EXCEEDED') " +
      "— throws on the 2nd-4th rapid calls, causing console errors for valid user input",
    correctPattern:
      "Server mutation: if (nextIndex >= steps.length) return { currentStepIndex, atEnd: true } " +
      "— idempotent return instead of throw. Client receives stale-but-harmless result.",
    detectionSignal:
      "throw.*ConvexError.*BOUNDS or throw.*Error inside a mutation that can be triggered by gestures",
    evidence: "palantir-math v2.0 Session 2 (2026-03-22) — advanceStep mutation 4x rapid swipe",
  },
};

/**
 * HC-BIND-06: Async Data Must Arrive Before State Machine Initialization
 *
 * Origin: palantir-math v2.0 — useTeachingState(stepCount) was called with
 * stepCount=0 because Convex subscription hadn't delivered data yet.
 * The reducer initialized with totalSteps=0, making the first advance()
 * immediately transition to "completed" (1 >= 0).
 *
 * In ANY framework with async data (Convex, Firebase, SWR, Apollo), the
 * first render has data=undefined. State machines initialized with default
 * values from undefined data produce valid-but-wrong initial states.
 */
export const HC_BIND_06: InteractionHardConstraint = {
  id: "HC-BIND-06",
  name: "Async Data Must Not Initialize State Machines With Defaults",
  description:
    "When a state machine depends on async data (DB subscription, API fetch), " +
    "the state machine MUST NOT initialize with a default value derived from " +
    "the not-yet-arrived data. Two approaches: (1) defer state machine creation " +
    "until data arrives (guard with loading check), (2) pass async-dependent " +
    "values at action dispatch time, not at initialization. " +
    "Violation produces valid-but-wrong states (e.g., totalSteps=0 makes the " +
    "first advance immediately complete the session).",
  severity: "error",
  domain: "mutation",
  validationFn:
    "For each state machine: verify that fields dependent on async data are " +
    "either (a) not in initial state or (b) passed as action payload at dispatch time.",
  context: {
    mechanism:
      "useReducer(reducer, { totalSteps: steps?.length ?? 0 }) initializes ONCE on mount. " +
      "Convex useQuery returns undefined on first render, then delivers data ~200ms later. " +
      "The reducer captures totalSteps=0 at init. advance() checks nextIndex >= 0 → " +
      "immediately transitions to 'completed'. The data arrives AFTER the wrong transition.",
    antiPattern:
      "const { state } = useTeachingState(steps?.length ?? 0) — totalSteps baked into " +
      "initial reducer state, stale from the moment Convex data arrives",
    correctPattern:
      "const { state, advance } = useTeachingState() — no args. " +
      "advance(steps.length) passes totalSteps at dispatch time, always current.",
    detectionSignal:
      "useReducer initial state containing a value derived from useQuery/useSWR/useSubscription " +
      "that defaults to 0 or [] when data is undefined",
    evidence: "palantir-math v2.0 Session 2 (2026-03-22) — useTeachingState stale totalSteps=0",
  },
};

/**
 * HC-BIND-07: Discrete Key Actions Must Use Event Listeners, Not Polling
 *
 * Discrete actions (pickup, drop, confirm) require 100% input capture.
 * Polling-based approaches (setInterval + getKeys) miss key events that
 * occur between polling intervals. Event-driven listeners never miss.
 *
 * Continuous actions (movement, camera) can use polling since they read
 * state every frame via useFrame — missing one sample is imperceptible.
 */
export const HC_BIND_07: InteractionHardConstraint = {
  id: "HC-BIND-07",
  name: "Discrete Key Actions Must Use Event Listeners Not Polling",
  description:
    "Key-triggered discrete actions (pickup, drop, confirm, cancel) MUST use " +
    "window.addEventListener('keydown') — never setInterval + getKeys() polling. " +
    "Polling at 50ms intervals has a ~5% miss rate for fast keypresses (<50ms " +
    "press-release). For rapid E-key spam (pickup multiple objects), this " +
    "compounds to ~15-20% missed inputs. Event-driven listeners are 100% reliable.",
  severity: "error",
  domain: "mutation",
  validationFn:
    "For each discrete key action: verify it uses addEventListener('keydown'), " +
    "not setInterval/requestAnimationFrame + getKeys() polling.",
  context: {
    mechanism:
      "useKeyboardControls().getKeys() returns current key state at call time. " +
      "If polled at 50ms intervals, a keypress lasting <50ms (fast tap) may " +
      "start and end between two polls — never detected. The key was 'up' at " +
      "poll N, pressed and released, 'up' again at poll N+1. Event missed.",
    antiPattern:
      "setInterval(() => { const keys = getKeys(); if (keys.drop && !prev) onDrop(); }, 50) " +
      "— polling misses fast keypresses between intervals",
    correctPattern:
      "useEffect(() => { const h = (e: KeyboardEvent) => { if (e.code === 'KeyQ') " +
      "dropRef.current(); }; window.addEventListener('keydown', h); return () => " +
      "window.removeEventListener('keydown', h); }, []) — event-driven, never misses",
    detectionSignal:
      "setInterval or requestAnimationFrame loop that reads key state and dispatches " +
      "discrete actions (not continuous movement)",
    evidence: "mathcrew v0.3 (2026-03-23) — Q key not responding for pet drop. " +
      "Root cause: InteractHandler used 50ms polling via useKeyboardControls.getKeys(). " +
      "Fix: replaced with window.addEventListener('keydown').",
  },
};

/**
 * HC-BIND-08: Configurable State Override Must Support Explicit Disable
 *
 * Origin: palantir-math v9.0 — Studio 4-layer effect system. Each step has
 * auto-mapped effects (from VizData domain). Per-atom overrides let teachers
 * customize individual layers. Clicking an already-selected effect to "deselect"
 * dispatched CLEAR_TARGET_OVERRIDE, which REMOVED the override — resolveEffect
 * then fell back to the step-level auto-mapped default instead of disabling.
 *
 * Teacher intent: "I want NO block effect on this atom" (for isolated layer testing).
 * Actual result: "Block effect reset to auto-mapped default (stagger-fade)."
 *
 * Root cause: 2-state model (value | absent) in a system with layered defaults.
 * Fix: 3-state model — undefined (not set, fall through), null (explicitly disabled),
 * value (explicitly configured).
 *
 * This pattern applies to ANY configurable system with fallback chains:
 * CSS cascade (inherit vs initial vs value), theme overrides, permission inheritance.
 *
 * Authority: A3 Axiom (Explicit over implicit) — the user's intent must be
 * explicitly captured, not inferred from absence of data.
 */
export const HC_BIND_08: InteractionHardConstraint = {
  id: "HC-BIND-08",
  name: "Configurable State Override Must Support Explicit Disable",
  description:
    "When a UI system uses layered defaults (auto-map → step-level → per-target), " +
    "the override mechanism MUST distinguish between 'not configured' (fall through " +
    "to lower layer) and 'explicitly disabled' (no value, no fallthrough). " +
    "A 2-state model (value | absent) is insufficient when the system has default layers. " +
    "Use a 3-state model: undefined = not set (fall through), null = explicitly disabled " +
    "(no effect), value = explicitly configured. " +
    "This applies to effect layers, theme overrides, permission inheritance, " +
    "and any configurable property with auto-defaults.",
  severity: "error",
  domain: "mutation",
  validationFn:
    "For each configurable property with a fallback chain (resolveX function): " +
    "verify the clear/toggle-off action sets null (not deletes the key). " +
    "Verify the resolve function checks for explicit null before falling through.",
  context: {
    mechanism:
      "A layered default system (e.g., auto-map → step-level → per-target override) " +
      "uses a resolve function that checks layers in order, returning the first non-undefined " +
      "value. When the user 'clears' an override, the system REMOVES the key — the resolve " +
      "function sees no override and falls through to the lower layer (auto-mapped default). " +
      "The user intended 'disable this layer' but got 'reset to auto-mapped default.' " +
      "The root cause is that 'key absent' is overloaded: it means BOTH 'never configured' " +
      "AND 'explicitly disabled.' These are semantically different intents.",
    antiPattern:
      "// Clear handler removes the override key\n" +
      "dispatch({ type: 'CLEAR_TARGET_OVERRIDE', targetId, layer });\n" +
      "// Reducer: delete overrides[targetId][layer]\n" +
      "// resolveEffect: no override found → falls through to step-level auto-map\n" +
      "// User sees: effect RESET to auto-mapped default, not DISABLED",
    correctPattern:
      "// Clear handler sets null (explicitly disabled)\n" +
      "dispatch({ type: 'SET_TARGET_OVERRIDE', targetId, layer, effect: null });\n" +
      "// Reducer: overrides[targetId][layer] = null\n" +
      "// resolveEffect: override exists AND is null → return undefined (no fallthrough)\n" +
      "// User sees: effect DISABLED (no animation on this layer)",
    detectionSignal:
      "A 'clear' or 'toggle-off' action that DELETES a key from a configurable override " +
      "map where the resolve function falls through to a lower default layer. " +
      "Grep for: delete overrides[, CLEAR_TARGET_OVERRIDE, CLEAR_OVERRIDE paired with " +
      "a resolve function that has fallback logic (if (!override) return defaults[layer]).",
    evidence:
      "palantir-math v9.0 (2026-03-24) — Studio 4-layer effect system. " +
      "handleCondLayerClear dispatched CLEAR_TARGET_OVERRIDE → resolveEffect fell through " +
      "to auto-mapped step-level default. Fix: dispatch SET_TARGET_OVERRIDE with effect: null. " +
      "resolveEffect now checks (layer in overrides) before falling through.",
  },
};

/**
 * HC-BIND-09: Parent Config Clear Must Cascade to Child Overrides
 *
 * When a layered config system has parent-level defaults AND per-child overrides
 * (e.g., step-level effects + per-atom targetOverrides), clearing the parent
 * layer MUST also remove that layer from ALL child overrides.
 *
 * Without cascade: user clears step-level block → null, but per-atom block
 * overrides remain → atoms still show effects → user sees "I cleared it but
 * it's still there."
 *
 * This is the complement to HC-BIND-08 (3-state semantics):
 *   HC-BIND-08: null vs undefined at a SINGLE level
 *   HC-BIND-09: clearing at parent level must PROPAGATE to child level
 *
 * Applies to: theme cascade (global → page → component), permission inheritance
 * (org → team → user), any hierarchical config with overrides.
 */
export const HC_BIND_09: InteractionHardConstraint = {
  id: "HC-BIND-09",
  name: "Parent Config Clear Must Cascade to Child Overrides",
  description:
    "When a hierarchical config system supports per-child overrides " +
    "(e.g., step-level effects + per-atom targetOverrides), clearing a layer " +
    "at the parent level MUST also strip that layer from ALL child overrides. " +
    "Otherwise, child overrides survive parent clear, and the user sees effects " +
    "they explicitly removed. The clear action must cascade downward.",
  severity: "error",
  domain: "mutation",
  validationFn:
    "For each 'clear parent config' action: verify the reducer also iterates " +
    "child overrides and removes the cleared layer. After clear + export, " +
    "grep the output JSON for the cleared layer name — it must not appear " +
    "in any child override entry.",
  context: {
    mechanism:
      "SET_LAYER_EFFECT(layer, null) sets effects[layer] = null but does NOT touch " +
      "effects.targetOverrides[*][layer]. Per-atom overrides survive because the reducer " +
      "only modifies the top-level effects object. resolveEffect checks targetOverrides " +
      "FIRST (priority 1), so child overrides take precedence over the parent null. " +
      "The user's clear intent is silently overridden by stale child config.",
    antiPattern:
      "// Reducer only sets parent\n" +
      "case 'SET_LAYER_EFFECT':\n" +
      "  return { ...s, effects: { ...s.effects, [layer]: null } };\n" +
      "// targetOverrides[atomId][layer] still has { type: 'stagger-fade', ... }\n" +
      "// resolveEffect: targetOverride exists → returns stagger-fade, ignoring parent null",
    correctPattern:
      "// Reducer sets parent AND strips layer from all child overrides\n" +
      "case 'SET_LAYER_EFFECT': {\n" +
      "  const newEffects = { ...s.effects, [layer]: effect };\n" +
      "  if (effect == null && newEffects.targetOverrides) {\n" +
      "    for (const [id, ov] of Object.entries(newEffects.targetOverrides)) {\n" +
      "      const { [layer]: _, ...rest } = ov;\n" +
      "      // remove empty override entries entirely\n" +
      "    }\n" +
      "  }\n" +
      "}",
    detectionSignal:
      "A 'SET_LAYER_EFFECT' or 'CLEAR_LAYER' reducer that modifies effects[layer] " +
      "without iterating effects.targetOverrides. Grep for: targetOverrides NOT " +
      "referenced in the same case block as the parent clear action.",
    evidence:
      "palantir-math v9.3 (2026-03-24) — Teacher cleared all block effects at step level, " +
      "exported config. Per-atom targetOverrides still contained block effects (cyber-glitch, " +
      "stagger-fade, spring-pulse). Playback showed effects despite all mixer buttons showing 'none'. " +
      "Fix: SET_LAYER_EFFECT reducer now iterates targetOverrides and strips the cleared layer.",
  },
};

/**
 * HC-BIND-10: Visual Panel Must Wire Both Select and Deselect
 *
 * When a new visual renderer (DiagramPanel, ChartPanel, etc.) is added to
 * Studio's left panel, it MUST provide:
 *   1. Element-click → SELECT_ATOM (select a specific geo element)
 *   2. Background-click → SELECT_ATOM(null) (deselect all)
 *   3. Card-background-click → SELECT_ATOM(null) (deselect from card area)
 *
 * Without (2) and (3), the user gets stuck in a selection state — they select
 * a card formula atom but can't deselect it to focus on diagram elements.
 */
export const HC_BIND_10: InteractionHardConstraint = {
  id: "HC-BIND-10",
  name: "Visual Panel Must Wire Both Select and Deselect",
  description:
    "Every visual renderer added to Studio's VisualPanel must implement " +
    "both element-click-to-select AND background-click-to-deselect. " +
    "The simulation card area must also support background-click-to-deselect. " +
    "Without deselect, the user cannot switch from card atom selection to " +
    "diagram element selection or clear selection entirely.",
  severity: "error",
  domain: "navigation",
  validationFn:
    "For each visual renderer branch in VisualPanel: verify the container " +
    "div has an onClick handler that dispatches SELECT_ATOM(null) when the " +
    "click target is NOT a [data-geo] element. Also verify the simulation " +
    "card div dispatches SELECT_ATOM(null) on background clicks.",
  context: {
    mechanism:
      "Studio has two selection targets: card atoms (center panel) and geo " +
      "elements (left panel). SELECT_ATOM stores a single selectedAtomId. " +
      "When a card atom is selected, the effect editor shows per-atom overrides. " +
      "Without background-deselect, selectedAtomId persists across clicks on " +
      "the diagram panel, so the card appears permanently selected.",
    antiPattern:
      '// DiagramPanel container — NO deselect handler\n' +
      '<div style={styles.svgContainer}>\n' +
      '  <DiagramPanel onElementClick={handleSelect} />\n' +
      '</div>\n' +
      '// Card container — NO background deselect\n' +
      '<div style={S.liveCard}>\n' +
      '  <MathBlock onAtomClick={toggleSelect} />\n' +
      '</div>',
    correctPattern:
      '// DiagramPanel container — background deselect\n' +
      '<div onClick={(e) => {\n' +
      '  if (!e.target.closest("[data-geo]") && selectedAtomId)\n' +
      '    dispatch({ type: "SELECT_ATOM", atomId: null });\n' +
      '}}>\n' +
      '  <DiagramPanel onElementClick={handleSelect} />\n' +
      '</div>\n' +
      '// Card container — background deselect\n' +
      '<div onClick={(e) => {\n' +
      '  if (!e.target.closest("[data-label^=cond-], [data-label^=step-]") && selectedAtomId)\n' +
      '    dispatch({ type: "SELECT_ATOM", atomId: null });\n' +
      '}}>\n',
    detectionSignal:
      "A new visual renderer (DiagramPanel, ChartPanel, etc.) added to " +
      "VisualPanel without an onClick handler that dispatches SELECT_ATOM(null) " +
      "on background click. Grep for: container div wrapping a Panel component " +
      "WITHOUT onClick or without SELECT_ATOM in the same block.",
    evidence:
      "palantir-math v9.4 (2026-03-24) — DiagramPanel (Venn) added to VisualPanel " +
      "for probability problems. Container had no background-click handler. Card " +
      "simulation area also lacked background-deselect. User could select a card " +
      "atom but not deselect it, blocking diagram element selection for geo effects.",
  },
};

export const BINDING_HARD_CONSTRAINTS: readonly InteractionHardConstraint[] = [
  HC_BIND_01,
  HC_BIND_02,
  HC_BIND_03,
  HC_BIND_04,
  HC_BIND_05,
  HC_BIND_06,
  HC_BIND_07,
  HC_BIND_08,
  HC_BIND_09,
  HC_BIND_10,
] as const;
