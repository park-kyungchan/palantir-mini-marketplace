/**
 * SCENE Subdomain Schema — Rendering Schema §3
 *
 * Hard constraints for React/R3F component patterns, state management
 * in the render loop, and input handling in 3D contexts.
 * Answers: "Are React patterns correct for the Three.js render loop?"
 *
 * Both constants trace to mathcrew v0.7 interaction bugs — the most
 * subtle class of 3D bugs because they compile, render, and LOOK correct
 * but fail intermittently under user input.
 */

import type { RenderingHardConstraint } from "../types";

export const SCHEMA_VERSION = "0.1.0" as const;

// =========================================================================
// HC-RENDER-SC-01: useCallback/useFrame Stale Closure
// =========================================================================

export const HC_RENDER_SC_01: RenderingHardConstraint = {
  id: "HC-RENDER-SC-01",
  name: "R3F Stale Closure Prevention",
  description: "In R3F, useCallback and useFrame callbacks bind to Three.js objects. When React state changes (step progression, phase transitions) but the callback's dependency array doesn't include the changing state, the callback reads stale values. Use useRef bridge pattern.",
  severity: "error",
  domain: "scene",
  validationFn: "In files using useCallback or useFrame: any React state variable accessed inside the callback must either be in deps[] or accessed via useRef bridge.",
  context: {
    mechanism: "React's useCallback creates a closure over its dependencies. In R3F, callbacks are often bound to Three.js event handlers or useFrame loops that persist across renders. When a React state variable (e.g., interactionAllowed) changes due to step progression, the callback still reads the OLD value from its closure. The user presses E, the handler checks interactionAllowed=false (stale), and ignores the input — even though the current render shows interactionAllowed=true.",
    antiPattern: "const handlePickup = useCallback(() => {\n  if (!interactionAllowed) return; // STALE — reads value from when callback was created\n}, [activeIsland]); // interactionAllowed not in deps",
    correctPattern: "const interactionRef = useRef(interactionAllowed);\ninteractionRef.current = interactionAllowed; // Updated every render\nconst handlePickup = useCallback(() => {\n  if (!interactionRef.current) return; // Always current via ref\n}, [activeIsland]);",
    detectionSignal: "In useCallback/useFrame bodies, search for React state variables. If the variable is not in the deps array AND not accessed via .current (ref), flag as potential stale closure. Priority targets: boolean flags (interactionAllowed, isComplete), numeric state (step index, count).",
    evidence: "mathcrew v0.7 (2026-03-23): E key stopped working in demonstrate phase. interactionAllowed changed from false→true when step progressed, but handlePickup still read false. HC-REACT-01 in teaching-framework.md. Also found in Board3D (v0.10): useFrame read highlight/totalChars directly instead of via ref.",
  },
};

// =========================================================================
// HC-RENDER-SC-02: Event-Driven Input for Discrete Actions
// =========================================================================

export const HC_RENDER_SC_02: RenderingHardConstraint = {
  id: "HC-RENDER-SC-02",
  name: "Event-Driven Discrete Input",
  description: "Discrete user actions (E=interact, Q=drop, R=reset) MUST use window.addEventListener('keydown'), not polling-based input (useKeyboardControls.getKeys()). Polling at 50ms intervals misses keypresses that start and end between polls.",
  severity: "error",
  domain: "scene",
  validationFn: "Grep for interaction key handling (E, Q, R, Esc). Must use addEventListener, not getKeys() polling or setInterval.",
  context: {
    mechanism: "drei useKeyboardControls provides getKeys() which returns current key state. Some implementations poll this via setInterval(50ms). A keypress lasting <50ms (fast tap) can start AND end between two polls — the poll never sees keydown. For continuous input (WASD movement checked every useFrame), this is fine — missing one frame is invisible. For discrete actions (E to pick up a pet, Q to drop), missing the keypress means the action silently fails.",
    antiPattern: "const interval = setInterval(() => {\n  const keys = getKeys();\n  if (keys.drop && !prev) onDrop(); // Can miss if key pressed and released within 50ms\n}, 50);",
    correctPattern: "useEffect(() => {\n  const handler = (e: KeyboardEvent) => {\n    if (e.code === 'KeyQ') dropRef.current();\n  };\n  window.addEventListener('keydown', handler);\n  return () => window.removeEventListener('keydown', handler);\n}, []);",
    detectionSignal: "Search for getKeys() or setInterval combined with key checks for E/Q/R/Esc. If found, flag as HC-RENDER-SC-02 violation. Continuous input (WASD/Space/Shift in useFrame) is exempt — polling is acceptable for movement.",
    evidence: "mathcrew v0.7 (2026-03-23): Q key not responding for pet drop. Root cause: useKeyboardControls getKeys() polled at 50ms. Replaced with window.addEventListener('keydown'). HC-INPUT-01 in teaching-framework.md. Also validated in HC-BIND-07 (interaction schema).",
  },
};

// =========================================================================
// HC-RENDER-SC-03: Physics Spawn Tunneling Prevention
// =========================================================================

export const HC_RENDER_SC_03: RenderingHardConstraint = {
  id: "HC-RENDER-SC-03",
  name: "Physics Spawn Tunneling Prevention",
  description: "Player rigid body with high gravity can tunnel through thin colliders on the first physics frame. The initial physics step after React mount often has a large dt, causing velocity to exceed collider thickness. Use CCD on player + thick spawn platform colliders.",
  severity: "error",
  domain: "scene",
  validationFn: "Player RigidBody must have ccdEnabled={true}. Spawn platform CuboidCollider half-height must be >= 1.0 (not 0.5).",
  context: {
    mechanism: "Rapier physics with timeStep='vary' uses variable dt. The first frame after React mount often has a large dt (100-300ms due to React hydration + Three.js setup). With gravity=-20, the player's velocity after one large step = -20 * 0.3 = -6 units/frame. A thin collider (half-height 0.5 = 1 unit total) can be completely passed through in a single step — the player is above the collider at time T and below it at time T+dt, and discrete collision detection misses the intersection.",
    antiPattern: "<RigidBody position={[0,3,5]}> // No CCD\n  <CapsuleCollider args={[0.3, 0.25]} />\n</RigidBody>\n// With spawn platform:\n<CuboidCollider args={[4, 0.5, 4]} /> // Too thin — tunneling risk",
    correctPattern: "<RigidBody position={[0,3,5]} ccd={true}> // CCD prevents tunneling\n  <CapsuleCollider args={[0.3, 0.25]} />\n</RigidBody>\n// Also: thick spawn platform + explicit colliders:\n<RigidBody type='fixed' colliders={false}>\n  <CuboidCollider args={[4, 2, 4]} position={[0, -2, 5]} /> // 4 units thick\n</RigidBody>\n// softCcdPrediction={0.5} is a cheaper alternative for slow-moving objects",
    detectionSignal: "Grep for player RigidBody — check for ccd={true} prop (NOT ccdEnabled — that's not the @react-three/rapier API). Also check softCcdPrediction. Grep for spawn/island CuboidCollider — check half-height arg >= 1.5. For platforms with mesh children, verify colliders={false} on RigidBody to disable auto-trimesh.",
    evidence: "mathcrew v0.10 (2026-03-24): Player spawns below ground on first load. PLAYER_SPAWN=[0,3,5] is correct but gravity=-20 with large first-frame dt causes capsule to tunnel through spawn platform CuboidCollider(half-height=0.5). 3D Scene Audit Layer A couldn't catch this — it's a runtime physics issue.",
  },
};

// =========================================================================
// HC-RENDER-SC-04: No Billboard for Multi-Instance 3D Content
// =========================================================================

export const HC_RENDER_SC_04: RenderingHardConstraint = {
  id: "HC-RENDER-SC-04",
  name: "Fixed-Position 3D Content Layout",
  description: "3D content displays (chalkboards, info panels) with multiple instances per scene MUST use fixed world-space positioning with rotation, NOT Billboard (camera-tracking). Billboard causes overlapping when multiple boards exist and breaks spatial navigation.",
  severity: "error",
  domain: "scene",
  validationFn: "Grep for Billboard usage in Board3D or equivalent content display components. Zero matches expected. Content boards must use group+rotationY for fixed orientation.",
  context: {
    mechanism: "Billboard (drei) makes a group always face the camera. When multiple boards exist in the same scene (5 teaching steps = 5 boards), all boards rotate to face the same camera position, causing z-fighting and visual overlap. The student cannot walk to individual boards because they all cluster toward the camera view. Fixed arc placement around the island perimeter allows museum-exhibit navigation: walk to each board, read it, move on.",
    antiPattern: "<Billboard position={position}>\n  <Board3D text={...} />\n</Billboard>\n// 5 boards all face camera → overlap, no spatial navigation",
    correctPattern: "<group position={position} rotation={[0, rotationY, 0]}>\n  <Board3D text={...} />\n</group>\n// Boards face island center, arranged in 240° arc\n// Player proximity triggers highlight (re-readable)",
    detectionSignal: "Grep for '<Billboard' in Board3D.tsx or SceneDirector.tsx. If found wrapping content displays (not single floating labels), flag as HC-RENDER-SC-04 violation. Single-instance floating text (e.g., 'Welcome') may use Billboard.",
    evidence: "mathcrew v0.10 (2026-03-24): User feedback — 'ChalkBoard가 시점에 연동되어서 변화되도록 하지 말고, 섬 둘레에 순차적으로 배치'. Multiple boards were all Billboard-tracked, causing visual chaos when camera rotated. Fixed: arc layout at island perimeter, inward-facing, proximity highlight.",
  },
};

// =========================================================================
// Export
// =========================================================================

export const SCENE_HARD_CONSTRAINTS = [
  HC_RENDER_SC_01,
  HC_RENDER_SC_02,
  HC_RENDER_SC_03,
  HC_RENDER_SC_04,
] as const;
