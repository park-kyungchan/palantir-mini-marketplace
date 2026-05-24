/**
 * MATERIALS Subdomain Schema — Rendering Schema §1
 *
 * Hard constraints for material selection, construction, and dependencies.
 * Answers: "Which material type is correct for this renderer and component?"
 *
 * All 4 constants trace to mathcrew v0.3–v0.9 bugs with full ConstraintContext.
 */

import type { RenderingHardConstraint } from "../types";

export const SCHEMA_VERSION = "0.1.0" as const;

// =========================================================================
// HC-RENDER-MAT-01: R3F Suspense + Custom Fonts
// =========================================================================

export const HC_RENDER_MAT_01: RenderingHardConstraint = {
  id: "HC-RENDER-MAT-01",
  name: "R3F Suspense Font Trap",
  description: "Custom font loading via drei <Text font={...}> triggers React Suspense, which R3F handles by setting visible=false on ALL scene objects. The scene disappears silently — no error, no crash.",
  severity: "error",
  domain: "materials",
  validationFn: "Grep for '<Text font=' or 'font={' in world/*.tsx — zero matches expected.",
  context: {
    mechanism: "drei <Text font={url}> uses suspend-react to load fonts asynchronously. When the font promise is pending, React Suspense activates. R3F's Suspense handler sets visible=false on the entire subtree instead of unmounting. All meshes, lights, and effects become invisible. No console error. threejs-devtools-mcp scene_tree shows objects with visible=false.",
    antiPattern: "<Text font=\"/fonts/MapleStory.woff2\" ... /> — any custom font URL triggers Suspense.",
    correctPattern: "<Text ... /> — use drei's default SDF font (no font prop). Or use CanvasText3D (Canvas 2D → CanvasTexture) which bypasses Suspense entirely.",
    detectionSignal: "Grep for 'font=' in <Text> components. If custom font URL found, flag as HC-RENDER-MAT-01 violation. Runtime: threejs-devtools-mcp find_objects where visible=false on normally-visible meshes.",
    evidence: "mathcrew v0.7 (2026-03-23): MapleStory font applied to Board3D + NpcBubble3D → entire 4-island world disappeared. Diagnosed via threejs-devtools-mcp scene_tree (all objects visible=false). Font files preserved in public/fonts/ for future re-attempt when R3F improves Suspense handling.",
  },
};

// =========================================================================
// HC-RENDER-MAT-02: drei SoftShadows + Three.js r183
// =========================================================================

export const HC_RENDER_MAT_02: RenderingHardConstraint = {
  id: "HC-RENDER-MAT-02",
  name: "drei SoftShadows Shader Corruption",
  description: "drei <SoftShadows> monkeypatches Three.js shadow shaders at runtime. Three.js r183 changed internal shadow chunk names, breaking the patch. Once corrupted, WebGL context is broken across ALL browser tabs.",
  severity: "error",
  domain: "materials",
  validationFn: "Grep for '<SoftShadows' or 'SoftShadows' import — zero matches expected.",
  context: {
    mechanism: "SoftShadows replaces Three.js internal shadow shader chunks (unpackRGBAToDepth) via string manipulation. r183 renamed these chunks. The patched shader fails to compile → GPU shader cache is corrupted → affects ALL tabs sharing the same GPU process.",
    antiPattern: "import { SoftShadows } from '@react-three/drei'; <SoftShadows samples={17} focus={0.5} />",
    correctPattern: "<Canvas shadows> with default PCFShadowMap. Set directionalLight shadow-mapSize to [2048, 2048] for quality. drei SoftShadows relies on shader functions removed in three r182+.",
    detectionSignal: "Grep for 'SoftShadows' in imports or JSX. If found, flag as HC-RENDER-MAT-02 violation.",
    evidence: "mathcrew v0.4 (2026-03-23): SoftShadows caused unpackRGBAToDepth error. Corrupted WebGL across all Chrome tabs. Only fix: close ALL tabs with WebGL contexts to clear GPU shader cache.",
  },
};

// =========================================================================
// HC-RENDER-MAT-03: No ShaderMaterial in WebGPU
// =========================================================================

export const HC_RENDER_MAT_03: RenderingHardConstraint = {
  id: "HC-RENDER-MAT-03",
  name: "WebGPU NodeMaterial Only",
  description: "WebGPURenderer cannot auto-convert ShaderMaterial/RawShaderMaterial to NodeMaterial. drei components using ShaderMaterial internally (Stars, Sparkles) are also forbidden.",
  severity: "error",
  domain: "materials",
  validationFn: "Grep for 'ShaderMaterial|RawShaderMaterial' in world/*.tsx — zero matches in code (comments OK). Grep for '<Stars|<Sparkles' — zero matches.",
  context: {
    mechanism: "WebGPURenderer uses WGSL shaders internally. GLSL ShaderMaterial cannot be translated. drei Stars uses custom GLSL vertex shader for point distribution. drei Sparkles uses custom GLSL fragment shader for particle effects. Both fail silently — no error, just invisible or broken rendering.",
    antiPattern: "new ShaderMaterial({ vertexShader: '...', fragmentShader: '...' }) OR <Stars /> OR <Sparkles />",
    correctPattern: "Use NodeMaterial variants (MeshToonNodeMaterial, MeshStandardNodeMaterial, etc.) with TSL (three/tsl) for shader logic. Replace Stars with procedural sky mesh. Replace Sparkles with geometry-based particle effects.",
    detectionSignal: "Grep for ShaderMaterial, RawShaderMaterial, <Stars, <Sparkles in world/*.tsx. Any match in code (not comments) is a violation.",
    evidence: "mathcrew v0.8 (2026-03-24): Stars→ProceduralSky, Sparkles→CampfireGlow. 17 files changed (+569 -101). ShaderMaterial completely eliminated. v0.10: WebGL2 fallback code also removed.",
  },
};

// =========================================================================
// HC-RENDER-MAT-04: No Runtime CDN Dependencies
// =========================================================================

export const HC_RENDER_MAT_04: RenderingHardConstraint = {
  id: "HC-RENDER-MAT-04",
  name: "No Runtime CDN Dependencies",
  description: "drei components that fetch from CDN at runtime (Environment presets, external fonts) will block forever in restricted network environments (WSL2, firewalls, offline).",
  severity: "error",
  domain: "materials",
  validationFn: "Grep for '<Environment' or 'https://' in material/texture context — zero matches expected.",
  context: {
    mechanism: "drei <Environment preset='sunset'> downloads HDRI from raw.githubusercontent.com. In WSL2 or behind corporate firewalls, this URL is blocked. The component wraps the fetch in React Suspense. When blocked, Suspense shows fallback forever — the entire scene never renders.",
    antiPattern: "<Environment preset='sunset' /> — ANY preset value triggers CDN fetch. Also: <Text font='https://fonts.google.com/...' />",
    correctPattern: "Procedural sky (hemisphere mesh + vertex colors) for environment lighting. CanvasText3D for text rendering. Local HDRI files in public/ if photorealistic lighting is needed.",
    detectionSignal: "Grep for '<Environment' or 'font=https://' or 'font=http://' in world/*.tsx.",
    evidence: "mathcrew v0.3 (2026-03-23): Environment preset blocked in WSL2 → scene invisible. Teaching-framework.md RQ-01 established the 'no external CDN' rule.",
  },
};

// =========================================================================
// HC-RENDER-MAT-05: WebGPU-only Import Path
// =========================================================================

export const HC_RENDER_MAT_05: RenderingHardConstraint = {
  id: "HC-RENDER-MAT-05",
  name: "WebGPU Import Path Enforcement",
  description: "In WebGPU-only projects, all THREE imports MUST use 'three/webgpu' (not 'three'). The base 'three' module exports WebGL-era classes that lack NodeMaterial support.",
  severity: "error",
  domain: "materials",
  validationFn: "Grep for \"from 'three'\" or 'from \"three\"' in client source — zero matches expected (except type-only imports from @types/three).",
  context: {
    mechanism: "The 'three' entry point exports the classic WebGL-oriented classes (e.g., WebGLRenderer, ShaderMaterial). The 'three/webgpu' entry point exports WebGPU-compatible classes (WebGPURenderer, NodeMaterial variants) and re-exports compatible base classes. Mixing imports causes runtime errors: WebGPURenderer expects NodeMaterial but receives ShaderMaterial from the base path. TSL (three/tsl) only works with three/webgpu classes.",
    antiPattern: "import * as THREE from 'three'; import { MeshStandardMaterial } from 'three'; — base module imports in a WebGPU project.",
    correctPattern: "import * as THREE from 'three/webgpu'; import { MeshStandardNodeMaterial } from 'three/webgpu'; — all THREE imports use the webgpu subpath.",
    detectionSignal: "grep -r \"from 'three'\" --include='*.tsx' --include='*.ts' packages/client/src/ — any match that is NOT a type-only import is a violation.",
    evidence: "mathcrew v0.9 (2026-03-24): 9 files had 'from \"three\"' instead of 'from \"three/webgpu\"'. Materials rendered as black or invisible because WebGPURenderer received legacy class instances. All 9 files fixed in one batch. Handoff doc flagged this for backpropagation.",
  },
};

// =========================================================================
// Export
// =========================================================================

export const MATERIAL_HARD_CONSTRAINTS = [
  HC_RENDER_MAT_01,
  HC_RENDER_MAT_02,
  HC_RENDER_MAT_03,
  HC_RENDER_MAT_04,
  HC_RENDER_MAT_05,
] as const;
