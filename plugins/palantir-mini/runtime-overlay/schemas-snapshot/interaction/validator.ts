/**
 * Interaction Schema Validator
 *
 * Validates project interaction declarations against HC-INT, HC-GEST, HC-BIND, HC-ELEM.
 * Project-independent: takes InteractionExports and validates consistency.
 *
 * Coverage: 13 of 20 HC constants have runtime validators.
 * Remaining 7 (HC-INT-05/06, HC-ELEM-02, HC-BIND-05/06, HC-GEST-04) need LSP/code analysis.
 *
 * Usage:
 *   const results = validateInteraction(interaction, ["recordAnnotation"], [], GESTURE_TYPES);
 */

import type {
  InteractionExports,
  ElementProfile,
  GestureDeclaration,
} from "./types";

export interface ValidationResult {
  readonly id: string;
  readonly passed: boolean;
  readonly severity: "error" | "warn" | "info";
  readonly message: string;
  readonly element?: string;
  readonly details?: string;
}

/**
 * Reserved action prefixes — these don't need ontology action references.
 * Matches RESERVED_ACTION_PREFIXES in binding/schema.ts.
 */
const RESERVED_ACTION_PREFIXES = [
  "navigate:",  // navigate:next, navigate:prev, navigate:goto
  "view:",      // view:zoom, view:scroll, view:reset
  "tool:",      // tool:pen, tool:eraser, tool:highlighter
] as const;

function isReservedAction(actionRef: string): boolean {
  return RESERVED_ACTION_PREFIXES.some((p) => actionRef.startsWith(p));
}

// ─── HC-INT-01: Single Gesture Library Per Element ─────────────

function validateSingleLibrary(elements: ElementProfile[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const el of elements) {
    const libraries = new Set(el.bindings.map((b) => b.library));
    if (libraries.size > 1) {
      results.push({
        id: "HC-INT-01",
        passed: false,
        severity: "error",
        message: `Element "${el.elementName}" uses ${libraries.size} gesture libraries: ${[...libraries].join(", ")}`,
        element: el.elementName,
        details: "A DOM element and its interactive children MUST use exactly ONE gesture library.",
      });
    } else {
      results.push({
        id: "HC-INT-01",
        passed: true,
        severity: "info",
        message: `Element "${el.elementName}" uses single library: ${el.library}`,
        element: el.elementName,
      });
    }
  }

  return results;
}

// ─── HC-INT-02: Gesture Binding References Valid Action ─────────

function validateActionRefs(
  gestures: GestureDeclaration[],
  ontologyActionNames: string[],
  ontologyFunctionNames: string[],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const validRefs = new Set([...ontologyActionNames, ...ontologyFunctionNames]);

  for (const g of gestures) {
    if (isReservedAction(g.actionRef)) {
      results.push({
        id: "HC-INT-02",
        passed: true,
        severity: "info",
        message: `Gesture "${g.apiName}" references reserved action: ${g.actionRef}`,
      });
    } else if (validRefs.has(g.actionRef)) {
      results.push({
        id: "HC-INT-02",
        passed: true,
        severity: "info",
        message: `Gesture "${g.apiName}" references valid action: ${g.actionRef}`,
      });
    } else {
      results.push({
        id: "HC-INT-02",
        passed: false,
        severity: "error",
        message: `Gesture "${g.apiName}" references unknown action: "${g.actionRef}"`,
        details: `Valid actions: ${[...validRefs].join(", ")}. Reserved prefixes: navigate:, view:, tool:`,
      });
    }
  }

  return results;
}

// ─── HC-INT-03: Touch-Action CSS Consistency ───────────────────

function validateTouchAction(elements: ElementProfile[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const horizontalGestures = ["swipe-left", "swipe-right", "drag-x", "pan-x"];
  const verticalGestures = ["swipe-up", "swipe-down", "drag-y", "pan-y"];

  for (const el of elements) {
    const gestureTypes = el.bindings.map((b) => b.gestureApiName);
    const hasHorizontal = gestureTypes.some((g) =>
      horizontalGestures.some((h) => g.includes(h))
    );
    const hasVertical = gestureTypes.some((g) =>
      verticalGestures.some((h) => g.includes(h))
    );

    if (hasHorizontal && (el.touchAction === "auto" || el.touchAction.includes("pan-x"))) {
      results.push({
        id: "HC-INT-03",
        passed: false,
        severity: "error",
        message: `Element "${el.elementName}" handles horizontal gestures but touch-action includes pan-x or is auto`,
        element: el.elementName,
        details: `touch-action="${el.touchAction}" conflicts with horizontal gesture bindings.`,
      });
    } else if (hasVertical && (el.touchAction === "auto" || el.touchAction.includes("pan-y"))) {
      results.push({
        id: "HC-INT-03",
        passed: false,
        severity: "error",
        message: `Element "${el.elementName}" handles vertical gestures but touch-action includes pan-y or is auto`,
        element: el.elementName,
      });
    } else {
      results.push({
        id: "HC-INT-03",
        passed: true,
        severity: "info",
        message: `Element "${el.elementName}" touch-action consistent: "${el.touchAction}"`,
        element: el.elementName,
      });
    }
  }

  return results;
}

// ─── HC-INT-04: Event Stream Isolation ─────────────────────────

function validateEventStreamIsolation(elements: ElementProfile[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const el of elements) {
    const streams = new Set(
      el.bindings.map((b) => b.eventStream).filter((s) => s !== "none")
    );
    if (streams.size > 1) {
      results.push({
        id: "HC-INT-04",
        passed: false,
        severity: "error",
        message: `Element "${el.elementName}" mixes event streams: ${[...streams].join(", ")}`,
        element: el.elementName,
        details: "All gesture bindings on a single DOM element MUST use the same event stream.",
      });
    } else {
      results.push({
        id: "HC-INT-04",
        passed: true,
        severity: "info",
        message: `Element "${el.elementName}" uses single event stream: ${el.eventStream}`,
        element: el.elementName,
      });
    }
  }

  return results;
}

// ─── HC-GEST-01: Device Fallback Required ──────────────────────

function validateDeviceFallback(gestures: GestureDeclaration[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const deviceSpecific = gestures.filter((g) => g.inputDevice !== "any");

  for (const g of deviceSpecific) {
    const hasFallback = gestures.some(
      (f) => f.actionRef === g.actionRef && f.inputDevice === "any"
    );
    results.push({
      id: "HC-GEST-01",
      passed: hasFallback,
      severity: hasFallback ? "info" : "warn",
      message: hasFallback
        ? `Gesture "${g.apiName}" (${g.inputDevice}) has universal fallback for "${g.actionRef}"`
        : `Gesture "${g.apiName}" (${g.inputDevice}) has NO universal fallback for "${g.actionRef}"`,
      details: hasFallback
        ? undefined
        : "Every device-specific gesture MUST have a universal fallback with inputDevice 'any'.",
    });
  }

  return results;
}

// ─── HC-GEST-02: No OS-Conflicting Gestures ────────────────────

const OS_CONFLICTING_PATTERNS = [
  "3-finger", "4-finger", "5-finger",
  "three-finger", "four-finger", "five-finger",
  "edge-swipe",
] as const;

function validateNoOsConflicts(gestures: GestureDeclaration[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const g of gestures) {
    const conflict = OS_CONFLICTING_PATTERNS.find((p) =>
      g.gestureType.toLowerCase().includes(p)
    );
    if (conflict) {
      results.push({
        id: "HC-GEST-02",
        passed: false,
        severity: "error",
        message: `Gesture "${g.apiName}" uses OS-conflicting pattern: "${conflict}"`,
        details:
          "OS-level gestures are intercepted before reaching the browser. " +
          "No pointerdown/touchstart events dispatched to web content.",
      });
    }
  }

  if (results.length === 0 && gestures.length > 0) {
    results.push({
      id: "HC-GEST-02",
      passed: true,
      severity: "info",
      message: "No OS-conflicting gesture types detected",
    });
  }

  return results;
}

// ─── HC-GEST-03: Gesture Type From Taxonomy ────────────────────

function validateGestureTypes(
  gestures: GestureDeclaration[],
  validTypes: readonly string[],
): ValidationResult[] {
  if (validTypes.length === 0) return []; // Skip if no taxonomy provided

  const results: ValidationResult[] = [];
  const typeSet = new Set(validTypes);

  for (const g of gestures) {
    const isValid = typeSet.has(g.gestureType);
    results.push({
      id: "HC-GEST-03",
      passed: isValid,
      severity: isValid ? "info" : "error",
      message: isValid
        ? `Gesture "${g.apiName}" uses valid type: ${g.gestureType}`
        : `Gesture "${g.apiName}" uses unknown type: "${g.gestureType}"`,
      details: isValid ? undefined : `Must be one of: ${validTypes.join(", ")}`,
    });
  }

  return results;
}

// ─── HC-BIND-02: No Ambiguous Bindings on Same Element ─────────

function validateNoAmbiguousBindings(
  elements: ElementProfile[],
  gestures: GestureDeclaration[],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const gestureMap = new Map(gestures.map((g) => [g.apiName, g]));

  for (const el of elements) {
    const resolved = el.bindings.map((b) => ({
      binding: b,
      gesture: gestureMap.get(b.gestureApiName),
    }));

    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i]!;
        const b = resolved[j]!;
        if (
          a.gesture && b.gesture &&
          a.gesture.gestureType === b.gesture.gestureType &&
          a.gesture.inputDevice === b.gesture.inputDevice
        ) {
          results.push({
            id: "HC-BIND-02",
            passed: false,
            severity: "error",
            message:
              `Element "${el.elementName}" has ambiguous bindings: ` +
              `"${a.binding.gestureApiName}" and "${b.binding.gestureApiName}" ` +
              `both match ${a.gesture.gestureType}/${a.gesture.inputDevice}`,
            element: el.elementName,
            details: "Two bindings with same gestureType AND inputDevice are physically indistinguishable.",
          });
        }
      }
    }

    if (!results.some((r) => r.id === "HC-BIND-02" && r.element === el.elementName)) {
      results.push({
        id: "HC-BIND-02",
        passed: true,
        severity: "info",
        message: `Element "${el.elementName}" has no ambiguous bindings`,
        element: el.elementName,
      });
    }
  }

  return results;
}

// ─── HC-BIND-03: Binding References Declared Gesture ───────────

function validateBindingGestureRefs(
  elements: ElementProfile[],
  gestures: GestureDeclaration[],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const validApiNames = new Set(gestures.map((g) => g.apiName));

  for (const el of elements) {
    for (const b of el.bindings) {
      const isValid = validApiNames.has(b.gestureApiName);
      results.push({
        id: "HC-BIND-03",
        passed: isValid,
        severity: isValid ? "info" : "error",
        message: isValid
          ? `Binding on "${el.elementName}" references valid gesture: ${b.gestureApiName}`
          : `Binding on "${el.elementName}" references unknown gesture: "${b.gestureApiName}"`,
        element: el.elementName,
        details: isValid ? undefined : `Declared gestures: ${[...validApiNames].join(", ")}`,
      });
    }
  }

  return results;
}

// ─── HC-BIND-04: Impact Chain Must Be Declared ─────────────────

function validateImpactChains(
  elements: ElementProfile[],
  gestures: GestureDeclaration[],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const gestureMap = new Map(gestures.map((g) => [g.apiName, g]));

  for (const el of elements) {
    for (const b of el.bindings) {
      const gesture = gestureMap.get(b.gestureApiName);
      if (!gesture) continue; // HC-BIND-03 catches orphans

      if (!isReservedAction(gesture.actionRef)) {
        const hasChain = b.impactChain != null;
        results.push({
          id: "HC-BIND-04",
          passed: hasChain,
          severity: hasChain ? "info" : "warn",
          message: hasChain
            ? `Binding "${b.gestureApiName}" on "${el.elementName}" has impact chain`
            : `Binding "${b.gestureApiName}" on "${el.elementName}" has NO impact chain for action "${gesture.actionRef}"`,
          element: el.elementName,
          details: hasChain ? undefined : "Mutation bindings must declare impactChain: entityField + uiTargets[].",
        });
      }
    }
  }

  return results;
}

// ─── HC-INT-07: Single-Pointer Alternative for Multipoint/Path ──

const MULTIPOINT_TYPES = ["pinch-in", "pinch-out", "rotate"] as const;
const PATH_BASED_TYPES = [
  "swipe-left", "swipe-right", "swipe-up", "swipe-down",
  "drag-reorder", "drag-drop",
] as const;
const NEEDS_ALTERNATIVE = new Set<string>([...MULTIPOINT_TYPES, ...PATH_BASED_TYPES]);

function validateSinglePointerAlternative(gestures: GestureDeclaration[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const needsAlt = gestures.filter((g) => NEEDS_ALTERNATIVE.has(g.gestureType));

  for (const g of needsAlt) {
    const hasTapAlt = gestures.some(
      (f) =>
        f.actionRef === g.actionRef &&
        !NEEDS_ALTERNATIVE.has(f.gestureType) &&
        f.apiName !== g.apiName
    );
    results.push({
      id: "HC-INT-07",
      passed: hasTapAlt,
      severity: hasTapAlt ? "info" : "warn",
      message: hasTapAlt
        ? `Gesture "${g.apiName}" (${g.gestureType}) has single-pointer alternative for "${g.actionRef}"`
        : `Gesture "${g.apiName}" (${g.gestureType}) has NO single-pointer alternative for "${g.actionRef}"`,
      details: hasTapAlt
        ? undefined
        : "WCAG 2.5.1 (Level A): multipoint/path-based gestures must have a tap-based alternative.",
    });
  }

  return results;
}

// ─── HC-ELEM-01: Gesture-Target Has No Handlers ────────────────

function validateGestureTargetNoHandlers(elements: ElementProfile[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const el of elements) {
    if (el.role !== "gesture-target") continue;

    if (el.bindings.length > 0) {
      results.push({
        id: "HC-ELEM-01",
        passed: false,
        severity: "error",
        message: `Element "${el.elementName}" has role "gesture-target" but declares ${el.bindings.length} binding(s)`,
        element: el.elementName,
        details: "Gesture-target elements provide data-* attributes only — no handlers.",
      });
    } else {
      results.push({
        id: "HC-ELEM-01",
        passed: true,
        severity: "info",
        message: `Element "${el.elementName}" correctly has no bindings (gesture-target)`,
        element: el.elementName,
      });
    }
  }

  return results;
}

// ─── HC-ELEM-03: Scroll Container Has No JS Handlers ──────────

function validateScrollContainerNoHandlers(elements: ElementProfile[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const el of elements) {
    if (el.role !== "scroll-container") continue;

    if (el.bindings.length > 0) {
      results.push({
        id: "HC-ELEM-03",
        passed: false,
        severity: "warn",
        message: `Element "${el.elementName}" has role "scroll-container" but declares ${el.bindings.length} binding(s)`,
        element: el.elementName,
        details: "Scroll containers rely on browser-native scroll. JS gesture handlers compete for the same events.",
      });
    } else {
      results.push({
        id: "HC-ELEM-03",
        passed: true,
        severity: "info",
        message: `Element "${el.elementName}" correctly has no bindings (scroll-container)`,
        element: el.elementName,
      });
    }
  }

  return results;
}

// ─── HC-ELEM-04: Data Attribute Naming Convention ──────────────

const DATA_ATTR_PATTERN = /^data-[a-z]+-[a-z]+/;
const GENERIC_DATA_ATTRS = ["data-id", "data-value", "data-index", "data-key", "data-type"];

function validateDataAttributeNaming(elements: ElementProfile[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const el of elements) {
    if (!el.dataAttributes || el.dataAttributes.length === 0) continue;

    for (const attr of el.dataAttributes) {
      const isGeneric = GENERIC_DATA_ATTRS.includes(attr);
      const matchesPattern = DATA_ATTR_PATTERN.test(attr);

      if (isGeneric) {
        results.push({
          id: "HC-ELEM-04",
          passed: false,
          severity: "warn",
          message: `Element "${el.elementName}" uses generic data attribute "${attr}"`,
          element: el.elementName,
          details: `Use data-{entity}-{field} pattern instead (e.g., data-step-index, data-tool-type).`,
        });
      } else if (!matchesPattern) {
        results.push({
          id: "HC-ELEM-04",
          passed: false,
          severity: "warn",
          message: `Element "${el.elementName}" attribute "${attr}" doesn't follow data-{entity}-{field} pattern`,
          element: el.elementName,
        });
      } else {
        results.push({
          id: "HC-ELEM-04",
          passed: true,
          severity: "info",
          message: `Element "${el.elementName}" attribute "${attr}" follows naming convention`,
          element: el.elementName,
        });
      }
    }
  }

  return results;
}

// ─── Public API ────────────────────────────────────────────────

export function validateInteraction(
  interaction: InteractionExports,
  ontologyActionNames: string[] = [],
  ontologyFunctionNames: string[] = [],
  gestureTypesTaxonomy: readonly string[] = [],
): ValidationResult[] {
  return [
    // HC-INT-01..04 (original 4)
    ...validateSingleLibrary(interaction.elements),
    ...validateActionRefs(interaction.gestures, ontologyActionNames, ontologyFunctionNames),
    ...validateTouchAction(interaction.elements),
    ...validateEventStreamIsolation(interaction.elements),
    // HC-GEST-01..03
    ...validateDeviceFallback(interaction.gestures),
    ...validateNoOsConflicts(interaction.gestures),
    ...validateGestureTypes(interaction.gestures, gestureTypesTaxonomy),
    // HC-INT-07
    ...validateSinglePointerAlternative(interaction.gestures),
    // HC-BIND-02..04
    ...validateNoAmbiguousBindings(interaction.elements, interaction.gestures),
    ...validateBindingGestureRefs(interaction.elements, interaction.gestures),
    ...validateImpactChains(interaction.elements, interaction.gestures),
    // HC-ELEM-01, 03, 04
    ...validateGestureTargetNoHandlers(interaction.elements),
    ...validateScrollContainerNoHandlers(interaction.elements),
    ...validateDataAttributeNaming(interaction.elements),
  ];
}

export function summarize(results: ValidationResult[]): {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  warnings: number;
} {
  const passed = results.filter((r) => r.passed).length;
  const errors = results.filter((r) => !r.passed && r.severity === "error").length;
  const warnings = results.filter((r) => !r.passed && r.severity === "warn").length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    errors,
    warnings,
  };
}
