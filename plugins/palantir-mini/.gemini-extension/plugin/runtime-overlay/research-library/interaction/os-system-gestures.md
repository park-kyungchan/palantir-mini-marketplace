# OS System Gestures — Web App Conflict Reference

> **Layer:** CROSS (interaction schema)
> **SSoT for:** HC-GEST-02 (No OS-Conflicting Gestures)
> **Provenance:** [Official] — Microsoft Support, Apple HIG, Android Developer docs
> **Verified:** 2026-03-22 via scrapling MCP (3 Opus researchers)

## [§GEST.OS-01] Cross-Platform Quick Reference

| Gesture | Windows | iOS/iPadOS | Android |
|---------|---------|------------|---------|
| 1-finger swipe from left edge | Widgets panel | Back navigation | Back navigation |
| 1-finger swipe from right edge | Notification Center | Forward navigation | Back navigation |
| 1-finger swipe up from bottom | Taskbar (fullscreen) | Home | Home |
| 1-finger swipe up from bottom + hold | — | App Switcher | Recent Apps |
| 1-finger swipe down from top | — | Notifications | Notifications |
| 1-finger swipe down from top-right | — | Control Center | Quick Settings |
| 3-finger swipe up | Task View | — | — |
| 3-finger swipe down | Show Desktop | — | — |
| 3-finger swipe left/right | Switch app | — | — |
| 4-finger swipe left/right | Switch desktop | Switch app (iPad) | — |
| 4/5-finger pinch | — | Home (iPad) | — |

**All are intercepted before reaching the browser. No web API exists to override them.**

## [§GEST.OS-02] Unsafe Zones (pixels from viewport edge)

| Zone | All Platforms | Notes |
|------|--------------|-------|
| Bottom | ~48px | Home gesture (iOS/Android), Taskbar (Windows fullscreen) |
| Left edge | ~20px | Back navigation (iOS Safari, Android), Widgets (Windows) |
| Right edge | ~20px | Forward navigation (iOS Safari), Back (Android), Notifications (Windows) |
| Top edge | ~20px | Notifications (iOS/Android) |

## [§GEST.OS-03] Windows 3/4-Finger Touchscreen

- **3-finger swipe up**: Task View (all open windows)
- **3-finger swipe down**: Show Desktop (minimize all)
- **3-finger swipe left/right**: Switch to last open app
- **4-finger swipe left/right**: Switch virtual desktops
- **Configurable**: Settings > Bluetooth & devices > Touch > "Three- and four-finger touch gestures" = Off
- **When enabled (default)**: OS intercepts before browser — no pointer/touch events reach web content

## [§GEST.OS-04] iOS System Gesture Override Limits

- Native apps: `preferredScreenEdgesDeferringSystemGestures` (UIViewController) — **defers** (not overrides) first swipe
- Web apps: **No access** — Safari/WKWebView does not expose this API to web content
- PWA standalone mode: Same limits as Safari
- `touch-action: none`: Does NOT prevent edge swipe navigation on iOS Safari
- `overscroll-behavior: none`: Partially supported Safari 16+, does NOT prevent edge swipes

## [§GEST.OS-05] Android Back Gesture

- Back gesture zone: ~20dp from left AND right edges
- Native apps: `View.setSystemGestureExclusionRects()` — exclude up to 200dp of edge length
- Web apps: **No standard mechanism** — W3C Pointer Events Issue #295 closed without implementation (2020)
- Predictive back (Android 13+): System shows destination preview during back gesture

## [§GEST.OS-06] Samsung Galaxy Book S-Pen

- **Wacom EMR (passive) stylus** — standard PointerEvents, no proprietary gesture layer
- `pointerType: "pen"`, pressure (0-1), tilt (±60°), buttons bitmask
- Air Command: Windows desktop app, NOT a system gesture interceptor
- **No web app conflicts** — S-Pen produces standard W3C PointerEvents
- Air Actions (BLE gestures): Only on Galaxy Tab/Phone S-Pen, NOT Galaxy Book

## Sources

- Microsoft Support: Touch gestures for Windows (support.microsoft.com)
- Apple HIG: Gestures (developer.apple.com/design/human-interface-guidelines/gestures)
- Android Developer: Gesture Navigation Compatibility (developer.android.com)
- Samsung Support: S Pen Air Actions, Air Command
- W3C Pointer Events Issue #295 (closed 2020)
