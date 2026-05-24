/**
 * COMPONENT Subdomain Schema — Interaction Schema §4
 *
 * Decision heuristics and hard constraints for COMPONENT COMPOSITION BEHAVIOR.
 * Answers: "How do components compose state, propagate configuration, generate
 * identifiers, and respond to user selection — consistently across all domains?"
 *
 * This subdomain addresses a gap discovered during the palantir-math v9.0 studio
 * 4-layer E2E audit (2026-03-24): the gesture/binding/element sub-schemas cover
 * the PHYSICAL input layer (event streams, touch-action, DOM roles), but not the
 * LOGICAL composition layer (how React components wire click handlers, generate
 * runtime IDs, compose wrapper layers, and manage selection state).
 *
 * 7 bugs were discovered that NO existing HC/DH would have caught:
 *   - MathBlock gated onClick on `isData` (domain-specific behavior)
 *   - atomId convention mismatch (step-{n+1} vs step-{n})
 *   - AmbientWrapper silently overriding preset repeatType
 *   - goToStep firing onStepChange twice
 *   - No toggle-deselect on clickable selections
 *   - DOMAIN_COLORS 3-source divergence
 *   - rAF timer running when paused
 *
 * All 7 are UNIVERSAL patterns — they apply to any project with component
 * composition, not just palantir-math.
 *
 * Authority: Axiom A3 (Explicit over Implicit) + §PHIL.LG-03 (Semantic Integrity)
 */

import type {
  InteractionHardConstraint,
  InteractionDecisionHeuristic,
} from "../types";

export const SCHEMA_VERSION = "0.1.0" as const;

// =========================================================================
// Section 1: Component Behavior Map
// =========================================================================

/**
 * Declares which component behaviors vary by domain/data value.
 * HC-COMP-01 requires this declaration when behavior differs per domain.
 *
 * Without this: `isData && onAtomClick` is an implicit domain gate that
 * breaks when new domains are added (LOGIC/ACTION/LEARN atoms become
 * non-clickable with no TypeScript error or runtime warning).
 *
 * With this: the DomainBehaviorMap explicitly declares "click is DATA-only"
 * or "click applies to all domains" — making the decision visible and auditable.
 */
export interface DomainBehaviorMap {
  readonly componentName: string;       // e.g., "MathBlock"
  readonly behavior: string;            // e.g., "atomClick", "progressiveReveal"
  readonly domains: string[] | "all";   // Which domains enable this behavior
  readonly rationale: string;           // WHY this varies (or doesn't)
}

/**
 * Declares a runtime ID contract between a data source and a consumer.
 * HC-COMP-02 requires this when components generate IDs that must match
 * a source declaration (e.g., viz-data.json atoms vs MathBlock atomId).
 */
export interface IdConventionContract {
  readonly source: string;              // e.g., "viz-data.json atoms[]"
  readonly consumer: string;            // e.g., "MathBlock atomId generation"
  readonly pattern: string;             // e.g., "step-{stepIndex}-formula-{i+1}"
  readonly indexBase: "0-based" | "1-based";
}

/**
 * Declares which wrapper-level config values are "sealed" (cannot be overridden).
 * HC-COMP-03 requires wrappers to preserve source config unless opt-in override.
 */
export interface WrapperConfigContract {
  readonly wrapperName: string;         // e.g., "AmbientWrapper"
  readonly sourceField: string;         // e.g., "transition.repeatType"
  readonly behavior: "preserve" | "override";  // "preserve" = must keep source value
  readonly defaultIfMissing?: string;   // e.g., "mirror" — only applied when source omits the field
}

// =========================================================================
// Section 2: Hard Constraints (HC-COMP-*)
// =========================================================================

/**
 * HC-COMP-01: Domain-Agnostic Component Behavior
 *
 * Component behaviors (click handlers, cursor styles, selection highlights)
 * MUST apply uniformly across all domains UNLESS a DomainBehaviorMap
 * explicitly declares domain-specific variation with rationale.
 *
 * Evidence: palantir-math v9.0 — MathBlock.tsx gated `onClick`, `cursor: pointer`,
 * and selection highlight on `isData` (domain === "data"). LOGIC/ACTION/LEARN
 * step atoms were rendered but non-interactive. No TypeScript error, no runtime
 * warning — the gate was invisible until a user manually tested each domain tab.
 */
export const HC_COMP_01: InteractionHardConstraint = {
  id: "HC-COMP-01",
  name: "Domain-Agnostic Component Behavior",
  description:
    "Component behaviors (click, cursor, highlight) must not vary by domain " +
    "unless a DomainBehaviorMap is declared. Implicit domain gates (e.g., " +
    "`if (domain === 'data') { onClick = ... }`) create invisible feature " +
    "gaps for non-gated domains.",
  severity: "error",
  domain: "cross",
  validationFn:
    "Grep for domain-conditional UI behavior: `isData &&`, `domain === ` " +
    "followed by event handler or style assignment. Each match must have " +
    "a corresponding DomainBehaviorMap declaration or apply to all domains.",
  context: {
    mechanism:
      "When a component gates interactive behavior on a specific domain value " +
      "(e.g., `isData && onAtomClick`), the behavior silently disappears for all " +
      "other domains. TypeScript sees no error because the handler prop is optional. " +
      "The browser renders the element identically (no cursor change, no highlight). " +
      "Only manual testing of each domain reveals the gap.",
    antiPattern:
      "onClick={isData && onAtomClick ? () => onAtomClick(id) : undefined} — " +
      "gates click handler on domain, making non-DATA atoms non-interactive. " +
      "Similarly: style={{ cursor: isData ? 'pointer' : 'default' }}",
    correctPattern:
      "onClick={onAtomClick ? () => onAtomClick(id) : undefined} — " +
      "domain-agnostic. The click handler applies if the prop is provided, " +
      "regardless of which domain the data belongs to.",
    detectionSignal:
      "Search for: `isData &&` or `domain === \"data\"` near `onClick`, `cursor`, " +
      "`style` assignments. Also check for `startsWith(\"cond-\")` or similar " +
      "prefix-based discriminators that implicitly encode domain assumptions.",
    evidence:
      "palantir-math v9.0 studio audit (2026-03-24): MathBlock.tsx lines 141-145 " +
      "and VisualEffectsPanel.tsx line 35 both used domain-specific gates. " +
      "Fix required changes to 3 files (MathBlock, VisualEffectsPanel, StudioShell).",
  },
};

/**
 * HC-COMP-02: Runtime ID Convention Matching
 *
 * Runtime-generated IDs MUST match their source declaration convention.
 * When a data source (e.g., viz-data.json) declares atom IDs as `step-{N}-formula-*`,
 * the consuming component MUST generate IDs using the same convention.
 *
 * Evidence: palantir-math v9.0 — MathBlock used `step-{stepIndex+1}-formula-*`
 * (1-based offset) but viz-data.json and teaching-config.json used
 * `step-{stepIndex}-formula-*` (direct index). The mismatch caused
 * targetOverrides lookups to silently miss.
 */
export const HC_COMP_02: InteractionHardConstraint = {
  id: "HC-COMP-02",
  name: "Runtime ID Convention Matching",
  description:
    "Runtime-generated IDs must match their source declaration convention. " +
    "An IdConventionContract should declare the pattern and index base. " +
    "Off-by-one in ID generation causes silent lookup failures.",
  severity: "error",
  domain: "cross",
  validationFn:
    "Cross-reference ID generation code (template literals with index arithmetic) " +
    "against source data files. Verify index base (0 vs 1) matches.",
  context: {
    mechanism:
      "A component generates IDs using `step-${stepIndex+1}-formula-*` (1-based). " +
      "The source data stores IDs as `step-{stepIndex}-formula-*` (0-based index). " +
      "When the component dispatches SELECT_ATOM with the generated ID, the state " +
      "manager checks atomTargets.includes(id) — returns false because the ID " +
      "doesn't match. No error, no warning — the selection silently fails.",
    antiPattern:
      "const stepNum = stepIndex + 1; const atomId = `step-${stepNum}-formula-${i+1}`; " +
      "when source uses `step-${stepIndex}-formula-${i+1}`",
    correctPattern:
      "const atomId = `step-${stepIndex}-formula-${i+1}`; // matches source convention",
    detectionSignal:
      "Look for `stepIndex + 1` or `index + 1` in template literals that generate " +
      "IDs consumed by other systems. Cross-reference with source data patterns.",
    evidence:
      "palantir-math v9.0 (2026-03-24): MathBlock.tsx line 103 `stepNum = stepIndex + 1` " +
      "produced `step-2-formula-1` for vizStep index 1, but viz-data had `step-1-formula-1`. " +
      "All per-atom override lookups silently failed for non-DATA steps.",
  },
};

/**
 * HC-COMP-03: Wrapper Must Not Override Source Configuration
 *
 * Wrapper components that receive configuration from a registry or source
 * MUST NOT silently override values. If the wrapper needs to enforce defaults,
 * it must only set values that the source did NOT specify (null coalescing).
 *
 * Evidence: palantir-math v9.0 — AmbientWrapper.makeLooping() spread
 * `...props.transition` then overwrote `repeatType: "mirror"`, deleting
 * the preset's `repeatType: "loop"` and `repeatDelay: 1`.
 */
export const HC_COMP_03: InteractionHardConstraint = {
  id: "HC-COMP-03",
  name: "Wrapper Must Not Override Source Configuration",
  description:
    "Wrapper components must use null-coalescing (??) for defaults, not spread-then-overwrite. " +
    "Source values (from effect registry, config files, parent props) are authoritative.",
  severity: "error",
  domain: "cross",
  validationFn:
    "In wrapper functions that compose configuration objects, check for " +
    "spread-then-overwrite patterns: `{ ...source, key: hardcoded }` where " +
    "`key` could already exist in source. Should be `key: source.key ?? default`.",
  context: {
    mechanism:
      "A wrapper function spreads source config then hardcodes a field: " +
      "`{ ...props.transition, repeatType: 'mirror' }`. If the source already " +
      "specified `repeatType: 'loop'`, the spread places 'loop' first, then " +
      "the hardcoded 'mirror' overwrites it. The source's intent is silently lost.",
    antiPattern:
      "return { ...props, transition: { ...props.transition, repeat: Infinity, " +
      "repeatType: 'mirror' } }; // overwrites preset repeatType",
    correctPattern:
      "return { ...props, transition: { ...props.transition, repeat: Infinity, " +
      "repeatType: props.transition?.repeatType ?? 'mirror' } }; // preserves preset",
    detectionSignal:
      "Look for wrapper/HOC functions that spread config objects then set explicit " +
      "values. The pattern `{ ...x, key: literal }` is the signal.",
    evidence:
      "palantir-math v9.0 (2026-03-24): AmbientWrapper.tsx:28-37 makeLooping() " +
      "forced repeatType:'mirror', breaking shake-attention (wanted 'loop') and " +
      "color-flash (lost repeatDelay:1).",
  },
};

/**
 * HC-COMP-04: Single Source of Truth for Visual Tokens
 *
 * A visual concept (domain color, font, spacing) MUST have exactly one
 * source of truth. Components must consume from that source, not from
 * parallel constants or hardcoded values.
 */
export const HC_COMP_04: InteractionHardConstraint = {
  id: "HC-COMP-04",
  name: "Single Source of Truth for Visual Tokens",
  description:
    "Each visual token (color, font, spacing) must have one canonical source. " +
    "JS constants, CSS variables, and per-theme values for the same concept " +
    "must derive from the same source, not be independently maintained.",
  severity: "warn",
  domain: "cross",
  validationFn:
    "Grep for domain color constants (DOMAIN_COLORS, --color-data, --data-accent). " +
    "If the same concept appears in >1 source with different values, flag as violation.",
  context: {
    mechanism:
      "Three sources define domain colors independently: (1) JS constant DOMAIN_COLORS " +
      "in teaching.ts, (2) CSS variables in index.css :root, (3) per-theme tokens in " +
      "tokens.ts. When a theme changes, only (3) updates. Components using (1) show " +
      "stale colors. The divergence is invisible until a non-default theme is applied.",
    antiPattern:
      "const DOMAIN_COLORS = { data: '#93c5fd' }; // JS constant " +
      "alongside var(--data-accent) in CSS // diverges on non-default themes",
    correctPattern:
      "Use CSS variables everywhere: style={{ color: 'var(--data-accent)' }}. " +
      "Or derive the JS constant from CSS: getComputedStyle().getPropertyValue('--data-accent')",
    detectionSignal:
      "Search for hardcoded color values (#hex) that match known token names. " +
      "Search for parallel definitions: DOMAIN_COLORS + --color-data + dataAccent.",
    evidence:
      "palantir-math v9.0 (2026-03-24): 7 components used static DOMAIN_COLORS, " +
      "18+ used var(--data-accent). Colors diverged on 5 of 7 themes.",
  },
};

/**
 * HC-COMP-05: Clickable Selections Must Support Toggle Deselect
 *
 * Any element that supports click-to-select MUST also support click-to-deselect
 * (clicking the already-selected item sets selection to null/empty).
 * The deselected state must be visually distinct (empty state, not fallback content).
 */
export const HC_COMP_05: InteractionHardConstraint = {
  id: "HC-COMP-05",
  name: "Clickable Selections Must Support Toggle Deselect",
  description:
    "Click-to-select implies click-to-deselect. Re-clicking the selected item " +
    "must clear the selection. The deselected state must show an empty/neutral state, " +
    "not fall back to a different inspector or content.",
  severity: "error",
  domain: "navigation",
  validationFn:
    "For each onClick that dispatches a SELECT action, verify: " +
    "(1) The handler checks if the item is already selected and sends null/clear if so. " +
    "(2) The UI has an explicit empty/deselected state (not just a fallback branch).",
  context: {
    mechanism:
      "A selection handler always sets the new value: `dispatch({ type: 'SELECT', id })`. " +
      "Re-clicking the same item sets it again (no-op or re-render with same value). " +
      "The user expects deselection but gets no visible change. Worse: if the UI uses " +
      "a ternary (selected ? Inspector : Fallback), deselection shows the Fallback " +
      "content (e.g., Ambient Inspector) instead of an empty state.",
    antiPattern:
      "onClick={() => dispatch({ type: 'SELECT_ATOM', atomId })} — always selects. " +
      "UI: {selectedAtomId ? <AtomInspector /> : <AmbientInspector />} — no empty state.",
    correctPattern:
      "onClick={() => dispatch({ type: 'SELECT_ATOM', atomId: selected === id ? null : id })} " +
      "UI: {selectedAtomId ? <AtomInspector /> : <EmptyState />}",
    detectionSignal:
      "Search for SELECT/SET actions in onClick without a `=== current ? null : value` guard. " +
      "Search for ternary UI branches where the else case shows a non-empty fallback.",
    evidence:
      "palantir-math v9.0 (2026-03-24): atom selection, layer mixer, and effect cards " +
      "all lacked toggle-deselect. Re-clicking showed the previous inspector instead of empty.",
  },
};

// =========================================================================
// Section 3: Decision Heuristics (DH-COMP-*)
// =========================================================================

/**
 * DH-COMP-01: Gate Animation Loops on Playback State
 *
 * Continuous animation loops (rAF, setInterval for rendering) should be
 * gated on whether playback is active. An idle timer wastes CPU/battery
 * and causes unnecessary re-renders.
 */
export const DH_COMP_01: InteractionDecisionHeuristic = {
  id: "DH-COMP-01",
  name: "Gate Animation Loops on Playback State",
  question: "Should this animation loop run when playback is paused/idle?",
  options: [
    "Always run (real-time display like a clock)",
    "Gate on isPlaying (playback timer, step elapsed)",
    "Gate on isVisible (IntersectionObserver)",
  ],
  guideline:
    "Default to gated. An rAF loop at 60fps causes setStepElapsed() → React re-render " +
    "every frame. When paused, this is pure waste. Gate with: if (!isPlaying) return; " +
    "in the useEffect. This also prevents downstream churn (context object identity " +
    "changes → useEffect dependencies fire → event listeners re-register at 60fps).",
  context: {
    mechanism:
      "An unconditional rAF loop calls setStepElapsed(Date.now() - start) every frame. " +
      "This triggers a React state update → context value identity changes → every " +
      "consumer useEffect with [context] in deps re-runs. In PresenterView, this " +
      "caused keyboard addEventListener/removeEventListener 60 times per second.",
    antiPattern:
      "useEffect(() => { const tick = () => { setState(Date.now()); raf = requestAnimationFrame(tick); }; " +
      "raf = requestAnimationFrame(tick); }, [currentStep]); // runs even when paused",
    correctPattern:
      "useEffect(() => { if (!isPlaying) return; const tick = () => { setState(Date.now()); " +
      "raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); " +
      "}, [currentStep, isPlaying]); // stops when paused",
    detectionSignal:
      "Search for requestAnimationFrame or setInterval inside useEffect without " +
      "an isPlaying/isActive guard. Check if the dependency array omits the play state.",
    evidence:
      "palantir-math v9.0 (2026-03-24): useTeachingTimeline.tsx:152-162 rAF loop " +
      "ran at 60fps even when paused. Combined with PresenterView useEffect([tl]) " +
      "dependency, caused keyboard listener churn at 60fps.",
  },
};

/**
 * DH-COMP-02: Single Callback Invocation Per User Action
 *
 * A single user action (one click, one keystroke) should fire each
 * callback at most once. Duplicate invocations cause double side effects.
 */
export const DH_COMP_02: InteractionDecisionHeuristic = {
  id: "DH-COMP-02",
  name: "Single Callback Invocation Per User Action",
  question: "Could this callback fire more than once per user action?",
  options: [
    "Direct call only (safe)",
    "Direct call + indirect trigger (e.g., timeline onUpdate) — RISK of double-fire",
    "State setter contains side effects — RISK of replay in concurrent mode",
  ],
  guideline:
    "Choose one invocation path. If a GSAP timeline onUpdate already calls the callback, " +
    "do NOT also call it directly. If using React state setters, never put external " +
    "callbacks or ref mutations inside — use useEffect watching the state instead.",
  context: {
    mechanism:
      "goToStep() calls tlRef.current.tweenTo() (which triggers onUpdate → onStepChange) " +
      "AND directly calls onStepChange(). The callback fires twice: once from the direct " +
      "call, once from the timeline. Additionally, setCurrentStep((prev) => { ... }) " +
      "contained onStepChange(), tl.pause(), setIsPlaying() — side effects inside a " +
      "state updater that React 18+ may replay in concurrent mode.",
    antiPattern:
      "function goToStep(i) { timeline.tweenTo(i); onStepChange(i); } // double-fire " +
      "setCurrentStep(prev => { onStepChange(idx); setIsPlaying(false); return idx; }); // side effects in setter",
    correctPattern:
      "function goToStep(i) { timeline.seek(i); setCurrentStep(i); } // state only " +
      "useEffect(() => { onStepChange(currentStep); }, [currentStep]); // side effects in effect",
    detectionSignal:
      "Search for callback invocations that appear both in a direct call AND inside " +
      "a timeline/animation onUpdate. Search for setState(prev => { sideEffect(); }).",
    evidence:
      "palantir-math v9.0 (2026-03-24): useTeachingTimeline.tsx goToStep at line 173-185 " +
      "called onStepChange directly AND via timeline onUpdate. Lines 115-128 had " +
      "onStepChange + tl.pause() + setIsPlaying inside a state setter.",
  },
};

// =========================================================================
// Section 4: All Constraints Export
// =========================================================================

export const COMPONENT_HARD_CONSTRAINTS = [
  HC_COMP_01,
  HC_COMP_02,
  HC_COMP_03,
  HC_COMP_04,
  HC_COMP_05,
] as const;

export const COMPONENT_DECISION_HEURISTICS = [
  DH_COMP_01,
  DH_COMP_02,
] as const;
