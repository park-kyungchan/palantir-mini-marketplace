# PointerEvent W3C Spec — Key Facts for Interaction Schema

> **Layer:** CROSS (interaction schema)
> **SSoT for:** HC-INT-01/04 (event stream isolation), HC-GEST-01 (device detection), HC-ELEM-02 (DOM isolation)
> **Provenance:** [Official] — W3C Pointer Events Level 3, MDN Web Docs
> **Verified:** 2026-03-22 via scrapling MCP (Opus researcher)

## [§PE.BTN-01] PointerEvent.buttons Bitmask (Complete Table)

| Bit | Decimal | State |
|-----|---------|-------|
| 0 | 1 | Left mouse / Touch contact / Pen contact |
| 1 | **2** | Right mouse / **Pen barrel button** |
| 2 | 4 | Middle mouse (wheel click) |
| 3 | 8 | X1 (Browser Back) mouse |
| 4 | 16 | X2 (Browser Forward) mouse |
| 5 | **32** | **Pen eraser button** |

- `button` (singular) = which button CHANGED: 0=primary, 2=secondary/**barrel**, 5=**eraser**
- `buttons` (plural) = bitmask of ALL currently pressed buttons
- **On pointerup**: `buttons = 0` (all released). **On pointerdown**: includes newly pressed bit.
- Chorded: left + barrel = `1 | 2 = 3`

## [§PE.PTR-01] PointerEvent.pointerType Values

| Value | Device |
|-------|--------|
| `"mouse"` | Mouse device |
| `"pen"` | Pen / stylus (S-Pen) |
| `"touch"` | Finger touch |
| `""` | Undetectable (empty string) |

- `pointerType === "pen"` is **reliable** for S-Pen detection
- Vendor-prefixed strings possible for non-standard devices

## [§PE.PEN-01] Pen-Specific Properties

- `pressure`: 0-1 float. **Mouse: always 0.5 when pressed, 0 otherwise.** Pen/touch: hardware value.
- `tiltX/tiltY`: ±90°. Platform-dependent: some devices use `altitudeAngle/azimuthAngle` instead — NOT both reliably.
- `pressure > 0` distinguishes pen-contact from pen-hover (hovering over digitizer without touching)

## [§PE.FIRE-01] Event Firing Order (Single Touch)

```
pointerover → pointerenter → pointerdown → touchstart →
[gotpointercapture] → pointermove → touchmove →
pointerup → [lostpointercapture] → pointerout → pointerleave →
touchend →
mouseover → mouseenter → mousemove → mousedown → [focus] → mouseup → click
```

**Order: Pointer FIRST → Touch → Mouse compatibility.**

## [§PE.FIRE-02] preventDefault Behavior

- `preventDefault()` on pointerdown → suppresses compatibility **mouse** events (sets PREVENT MOUSE EVENT flag)
- Does **NOT** suppress touch events (independent event stream)
- `mouseover`, `mouseenter`, `mouseout`, `mouseleave` are **NEVER** prevented
- Multi-touch → mouse compatibility events suppressed entirely

## [§PE.TA-01] CSS touch-action and Pointer Events

### Values (complete)
`auto` | `none` | `pan-x` | `pan-y` | `pan-left` | `pan-right` | `pan-up` | `pan-down` | `pinch-zoom` | `manipulation` (= `pan-x pan-y pinch-zoom`)

### Interaction with pointer events
| touch-action | Browser Claims | JS Gets | Scroll Behavior |
|-------------|---------------|---------|-----------------|
| `auto` | All axes + zoom + double-tap | `pointercancel` when browser starts scroll | JS gesture handlers cancelled |
| `none` | Nothing | ALL pointer events | No browser scroll, **violates WCAG 1.4 (zoom)** |
| `pan-y` | Vertical scroll | Horizontal pointer events | Vertical scroll native, horizontal to JS |
| `manipulation` | Pan + pinch-zoom (no double-tap) | `pointercancel` during scroll | Like `auto` minus double-tap-to-zoom |

### Critical rule (W3C spec)
> "Viewport manipulations are intentionally NOT a default action of pointer events. Authors must use `touch-action` to declare direct manipulation behavior."

**`event.preventDefault()` on pointerdown does NOT prevent scrolling.** Only CSS `touch-action` controls which axes the browser claims.

### Suppression sequence (when browser claims gesture)
1. Fire `pointercancel`
2. Fire `pointerout`
3. Fire `pointerleave`
4. Implicitly release pointer capture
5. All subsequent pointer events suppressed until pointer becomes active again

## [§PE.CAP-01] setPointerCapture and event.target

- `@use-gesture` activates `setPointerCapture` by default for touch input
- When capture active: ALL subsequent pointer events redirected to the captured element
- **event.target during drag = captured element, NOT element under finger**
- `event.target.closest('[data-*]')` works for tap (pointerdown/pointerup) but NOT mid-drag
- Disable with `pointer: { capture: false }` in @use-gesture options

## [§PE.UG-01] @use-gesture Event Model

- `state.event.target` = original DOM event target (preserved, not replaced)
- `state.target` = event.target shorthand
- `state.currentTarget` = bound element
- `pointer.touch = true` (default on touch devices) → uses **touch events** (survive scroll)
- `pointer.touch = false` → uses **pointer events** (cancelled during scroll)
- `filterTaps`: tap = true when displacement < `tapsThreshold` (default 3px)
- `swipe`: detected via `swipe.velocity` (default [0.5, 0.5]) and `swipe.duration` (default 250ms) **at release time**
- `memo`: first handler can `return` value, persisted across gesture lifecycle

## Sources

- W3C Pointer Events Level 3 (w3.org/TR/pointerevents3/)
- MDN: PointerEvent.buttons, PointerEvent.pointerType, CSS touch-action
- Patrick Lauke: touch/pointer event cross-browser test results
- @use-gesture docs (context7, pmndrs/use-gesture)
