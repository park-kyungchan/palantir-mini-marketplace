/**
 * Rendering Semantic Definitions — 3D Scene Schema
 *
 * Axis 3 of the validation framework. Validates HOW 3D scenes are
 * constructed, rendered, and optimized — catching semantic bugs that
 * tsc, builds, and even Playwright screenshots cannot detect.
 *
 * Origin: mathcrew v0.1–v0.10 (2026-03-23/24) — 24+ bugs discovered
 * during 3D educational math world development. Each bug was first
 * fixed in project code, then backpropagated here as a typed HC/DH
 * constant with full ConstraintContext.
 *
 * Authority chain:
 *   teaching-framework.md (project-level backpropagation table)
 *     → schemas/rendering/ (this domain — meta-level)
 *       → project world/*.tsx (validated by 3D Scene Audit skill)
 *
 * Schema version following semver convention.
 */
export const SCHEMA_VERSION = "0.1.0" as const;

// =========================================================================
// Section 0: Research Authority Chain
// =========================================================================

/**
 * RENDERING_AUTHORITY — Source provenance for this schema domain.
 *
 * Unlike ontology/ (backed by 73 Palantir research files) and interaction/
 * (backed by §TE-02 Tool Exposure), the rendering domain is backed by
 * EMPIRICAL PROJECT EVIDENCE. Every HC constant traces to a specific
 * bug in a specific commit with a specific root cause.
 *
 * This is the LEARN loop applied to the meta-framework:
 *   Project bug (SENSE) → Root cause analysis (DECIDE) →
 *   Schema constant (ACT) → Future prevention (LEARN)
 */
export const RENDERING_AUTHORITY = {
  primarySource: "mathcrew v0.1–v0.10 backpropagation table (teaching-framework.md)",
  secondarySource: "Three.js r182–r183 changelog + WebGPU spec + R3F v9.5 release notes",
  totalConstants: 20,
  subdomains: [
    { name: "materials", prefix: "HC-RENDER-MAT", count: 5 },
    { name: "pipeline", prefix: "HC-RENDER-PIPE", count: 5 },
    { name: "scene", prefix: "HC-RENDER-SC", count: 4 },
    { name: "performance", prefix: "HC-RENDER-PERF", count: 6 },
  ],
  validationMethod: "Static source analysis (3D Scene Audit skill) + optional runtime inspection (threejs-devtools-mcp)",
} as const;

// =========================================================================
// Section 1: Cross-Domain Constants
// =========================================================================

/**
 * RENDERER_MATERIAL_MATRIX — Which material types are valid per renderer backend.
 *
 * WebGPU cannot auto-convert ShaderMaterial to NodeMaterial. This matrix
 * is the lookup table that HC-RENDER-MAT-03 validates against.
 */
export const RENDERER_MATERIAL_MATRIX = {
  webgpu: {
    allowed: [
      "MeshToonNodeMaterial",
      "MeshStandardNodeMaterial",
      "MeshPhysicalNodeMaterial",
      "MeshBasicNodeMaterial",
      "SpriteNodeMaterial",
      "LineBasicNodeMaterial",
    ],
    forbidden: [
      "ShaderMaterial",
      "RawShaderMaterial",
      "MeshToonMaterial",      // classic variant
      "MeshStandardMaterial",  // classic variant
      "MeshPhysicalMaterial",  // classic variant
      "MeshBasicMaterial",     // classic variant
    ],
    note: "WebGPU uses TSL (three/tsl) for shader logic. drei components using ShaderMaterial internally (Stars, Sparkles, SoftShadows) are also forbidden.",
  },
  webgl2: {
    allowed: ["*"],  // All material types valid
    forbidden: [],
    note: "WebGL2 supports both classic and NodeMaterial. Classic is more stable.",
  },
} as const;

/**
 * CDN_DEPENDENCY_RULE — Runtime CDN fetches are forbidden for critical rendering.
 *
 * drei components that fetch from CDN at runtime:
 *   <Environment preset="..."> → raw.githubusercontent.com (HDRI)
 *   <Text font="..."> → Google Fonts CDN (if URL)
 *   <Loader> → Google Fonts CDN
 *
 * In WSL2, corporate networks, or offline environments, these fetches
 * block in Suspense forever → scene invisible.
 */
export const CDN_DEPENDENCY_RULE = {
  forbidden: ["Environment preset=", "font=https://", "font=http://"],
  alternatives: {
    hdri: "Procedural sky (hemisphere mesh + vertex colors) or local HDRI in public/",
    fonts: "drei <Text> default SDF font (no CDN) or CanvasTexture text rendering",
    textures: "Inline generation or bundled in public/ directory",
  },
  evidence: "mathcrew v0.3 (2026-03-23): Environment preset blocked in WSL2 → Suspense fallback forever → entire scene invisible",
} as const;
