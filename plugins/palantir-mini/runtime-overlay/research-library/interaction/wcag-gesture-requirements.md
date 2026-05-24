# WCAG 2.2 Gesture Requirements — Interaction Schema Reference

> **Layer:** CROSS (interaction schema)
> **SSoT for:** HC-BIND-01 (UI fallback), HC-INT-07 (single-pointer alternative), HC-ELEM-05 (target size)
> **Provenance:** [Official] — W3C WCAG 2.2 Understanding documents
> **Verified:** 2026-03-22 via WebFetch (Opus researcher)

## [§WCAG.PG-01] SC 2.5.1 — Pointer Gestures (Level A)

> "All functionality that uses multipoint or path-based gestures for operation can be operated with a single pointer without a path-based gesture, unless essential."

- **Multipoint**: pinch-zoom, multi-finger swipe, rotate
- **Path-based**: swipe (direction matters), drag along path
- **Single-pointer alternatives**: tap, click, double-tap, long press
- **Dragging**: excluded from this SC (covered by SC 2.5.7)
- **Essential exception**: when the multipoint/path nature IS the function itself (rare)
- **Failure**: F105 — path-based gesture with no simple pointer alternative

### Implications for interaction schema
- HC-BIND-01 covers mutation bindings only — **scope too narrow**
- SC 2.5.1 requires alternatives for ALL multipoint/path-based gestures including navigation (swipe) and view (pinch)
- Compliant: pinch-zoom + plus/minus buttons, swipe-to-advance + Next button

## [§WCAG.PC-01] SC 2.5.2 — Pointer Cancellation (Level A)

> "For single pointer: No Down-Event (action on up-event), OR Abort/Undo mechanism, OR Up Reversal, OR Essential."

- Effectively requires **action on pointerup, not pointerdown**
- Drag: down-event can START drag, but final action (drop) must be on up-event + abort/undo
- Essential exception: virtual keyboard, on-screen piano
- @use-gesture filterTaps: fires on release → naturally compliant for taps
- **Risk**: any `onPointerDown` handler that immediately executes a mutation

## [§WCAG.DM-01] SC 2.5.7 — Dragging Movements (Level AA, NEW in 2.2)

> "All functionality that uses a dragging movement can be achieved by a single pointer without dragging, unless essential."

- **Dragging**: pointer engages on down-event, element follows pointer until up-event
- **Keyboard-only alternatives do NOT satisfy this SC** — single-pointer non-dragging alternative independently required
- **Essential exception**: when dragging IS the function (rare)

### Compliant alternatives (from W3C examples)
| Drag Operation | Non-Drag Alternative |
|---------------|---------------------|
| drag-to-reorder list | Up/down arrow buttons per item |
| drag-across map | Directional buttons (NSEW) |
| drag between columns (kanban) | Pop-up menu for column selection |
| color wheel drag | Tap/click specific positions |
| slider drag | Tap/click any point on track |

### Implications for interaction schema
- `drag-reorder` and `drag-drop` in GESTURE_TYPES → must each have non-drag alternative
- HC-BIND-01 partially covers (requires UI fallback for mutations)
- Gap: drag-based navigation gestures not covered

## [§WCAG.KB-01] SC 2.1.1 — Keyboard (Level A)

> "All functionality operable through keyboard interface, except where underlying function requires path-dependent input."

- Every gesture-triggered action needs keyboard equivalent (or comparable keyboard-accessible path)
- **Path-dependent exception**: freehand drawing exempt (path IS the function)
- But: resizing, dragging to location, connecting points → NOT exempt (endpoints matter, not path)
- Handwriting for text input: NOT exempt (underlying function is text input, not drawing)

## [§WCAG.TS-01] SC 2.5.8 — Target Size Minimum (Level AA)

> "Target for pointer inputs at least 24 by 24 CSS pixels."

- **24×24 CSS px** = Level AA minimum
- **44×44 CSS px** = Level AAA enhanced (SC 2.5.5)
- Spacing exception: undersized targets OK if 24px-diameter circles don't overlap neighbors
- Applies to gesture-target elements with `data-*` attributes
- Inline text exception: targets in sentences exempt

### Implications for interaction schema
- `gesture-target` elements (StepCard, ToolButton) MUST meet 24×24 minimum
- No existing HC addresses target size

## [§WCAG.MAP-01] WCAG ↔ Interaction Schema Mapping

| WCAG SC | Level | Existing Coverage | Gap |
|---------|-------|-------------------|-----|
| 2.5.1 (Pointer Gestures) | A | HC-BIND-01 (mutation only), HC-GEST-01 (device only) | Multipoint/path-based for ALL gestures |
| 2.5.2 (Pointer Cancellation) | A | DH-GEST-05 (hardware buttons) | Broader no-action-on-down rule |
| 2.5.7 (Dragging Movements) | AA | HC-BIND-01 (partial) | Drag-specific non-drag alternative |
| 2.1.1 (Keyboard) | A | None | Keyboard fallback for all actions |
| 2.5.8 (Target Size) | AA | None | 24×24 minimum |
| 2.5.5 (Target Size Enhanced) | AAA | None | 44×44 enhanced |

## Sources

- W3C WCAG 2.2 Understanding: SC 2.5.1, 2.5.2, 2.5.7, 2.1.1, 2.5.8, 2.5.5
- W3C Failure F105: path-based gesture without simple pointer alternative
