/**
 * PIPELINE Subdomain Schema — Rendering Schema §2
 *
 * Hard constraints for post-processing chain composition, MRT setup,
 * fog configuration, and rendering pipeline ordering.
 * Answers: "Is the post-processing pipeline semantically correct?"
 *
 * All 4 constants trace to mathcrew v0.9–v0.10 (Phase 1–3) bugs.
 */

import type { RenderingHardConstraint } from "../types";

export const SCHEMA_VERSION = "0.1.0" as const;

// =========================================================================
// HC-RENDER-PIPE-01: MRT Selective Bloom
// =========================================================================

export const HC_RENDER_PIPE_01: RenderingHardConstraint = {
  id: "HC-RENDER-PIPE-01",
  name: "MRT Selective Bloom",
  description: "Bloom must operate on the EMISSIVE MRT channel only, not the full color output. Blooming the color channel causes bright surfaces (white text, lit geometry) to bleed glow artifacts.",
  severity: "warn",
  domain: "pipeline",
  validationFn: "In PostProcessingSetup, verify bloom() receives emissiveTexture from MRT, not colorTexture.",
  context: {
    mechanism: "MRT (Multiple Render Targets) renders color, emissive, and normals to separate textures in a single pass. If bloom() receives the full color output, ANY bright pixel blooms — white text on a chalkboard glows, lit ground surfaces bleed. Selective bloom on the emissive channel means only objects with emissive materials (rings, indicators) bloom.",
    antiPattern: "const bloomPass = bloom(colorTexture); // WRONG — blooms everything bright",
    correctPattern: "scenePass.setMRT(mrt({ output, emissive, normal: normalView })); const emissiveTex = scenePass.getTextureNode('emissive'); const bloomPass = bloom(emissiveTex); // Selective — only emissive blooms",
    detectionSignal: "Read PostProcessingSetup. Check that bloom() argument comes from getTextureNode('emissive'), not getTextureNode('output') or the scenePass directly.",
    evidence: "mathcrew Phase 1 (2026-03-24): MRT selective bloom implemented. Without MRT, bloom on full color caused Board3D white text to glow distractingly.",
  },
};

// =========================================================================
// HC-RENDER-PIPE-02: GTAO RedFormat Channel Extraction
// =========================================================================

export const HC_RENDER_PIPE_02: RenderingHardConstraint = {
  id: "HC-RENDER-PIPE-02",
  name: "GTAO RedFormat .r Extraction",
  description: "GTAONode renders to a RedFormat texture. Only the .r channel contains AO data. Using the full texture (RGB) causes a red tint on the entire scene because G and B channels are zero.",
  severity: "error",
  domain: "pipeline",
  validationFn: "In PostProcessingSetup, verify aoPass.getTextureNode() is followed by .r extraction.",
  context: {
    mechanism: "Three.js GTAONode (Activision's Ground Truth AO algorithm) writes AO values to a RedFormat render target. The texture has data in the .r channel only; .g and .b are 0. When multiplied with the scene color without extracting .r first, the operation is: color.rgb * vec3(ao, 0, 0) — zeroing green and blue channels → everything turns red.",
    antiPattern: "const aoValue = aoPass.getTextureNode(); // WRONG — returns vec4(ao, 0, 0, 1)\ncolorTexture.mul(aoValue); // Red tint: G and B zeroed",
    correctPattern: "const aoValue = aoPass.getTextureNode().r; // Extract scalar float\ncolorTexture.mul(aoValue); // Broadcasts: color.rgb * vec3(ao, ao, ao)",
    detectionSignal: "Grep for 'getTextureNode()' after aoPass. If not followed by '.r', flag as HC-RENDER-PIPE-02 violation.",
    evidence: "mathcrew Phase 3 commit 7160cb9 (2026-03-24): 'fix: GTAO red tint — RedFormat texture needs .r channel extraction'. Scene had a strong red cast until .r extraction was added.",
  },
};

// =========================================================================
// HC-RENDER-PIPE-03: TSL Fog for NodeMaterial Compatibility
// =========================================================================

export const HC_RENDER_PIPE_03: RenderingHardConstraint = {
  id: "HC-RENDER-PIPE-03",
  name: "TSL Fog for WebGPU",
  description: "Legacy <fog> JSX element or scene.fog is incompatible with WebGPU NodeMaterials. Use scene.fogNode with TSL fog() instead.",
  severity: "error",
  domain: "pipeline",
  validationFn: "Grep for '<fog attach' or 'scene.fog =' — zero matches. Grep for 'scene.fogNode' — should be present.",
  context: {
    mechanism: "Classic Three.js fog (scene.fog = new Fog()) injects fog calculations into the fragment shader of each material. NodeMaterials in WebGPU use a different shader compilation pipeline (TSL → WGSL). Classic fog injection doesn't work with this pipeline. scene.fogNode accepts TSL fog nodes that compile correctly to WGSL.",
    antiPattern: "<fog attach='fog' args={['#0f1b3d', 50, 140]} /> OR scene.fog = new THREE.Fog('#0f1b3d', 50, 140)",
    correctPattern: "import { fog, rangeFogFactor, color } from 'three/tsl';\nscene.fogNode = fog(color(0x0f1b3d), rangeFogFactor(50, 140));",
    detectionSignal: "Grep for '<fog' or 'new.*Fog(' or 'scene.fog =' (without 'Node'). Any match is a violation when renderer is WebGPU.",
    evidence: "mathcrew Phase 3 (2026-03-24): TSL fog replaced legacy <fog> JSX. scene.fogNode with rangeFogFactor provides depth perception for the 4-island archipelago.",
  },
};

// =========================================================================
// HC-RENDER-PIPE-04: Post-Processing Chain Order
// =========================================================================

export const HC_RENDER_PIPE_04: RenderingHardConstraint = {
  id: "HC-RENDER-PIPE-04",
  name: "Post-Processing Chain Order",
  description: "Post-processing effects must be composed in a specific order. FXAA must be LAST (operates on final pixels). Bloom before vignette (vignette darkens edges, would reduce bloom at edges).",
  severity: "warn",
  domain: "pipeline",
  validationFn: "Read PostProcessingSetup, verify chain: scenePass → AO → bloom → composite → vignette → FXAA.",
  context: {
    mechanism: "Post-processing is a sequential pipeline. Each pass transforms pixels for the next pass. Wrong order produces wrong results: (1) FXAA before bloom → bloom re-introduces aliased edges. (2) Vignette before bloom → bloom at edges is darkened (fight between effects). (3) AO after bloom → AO darkens bloom artifacts. Correct: spatial effects first (AO), additive effects second (bloom), global adjustments third (vignette), anti-aliasing last (FXAA).",
    antiPattern: "pp.outputNode = fxaa(bloom(vignetteEffect(colorTexture))); // WRONG order",
    correctPattern: "const occluded = colorTexture.mul(aoValue);  // 1. AO\nconst bloomed = occluded.add(bloomPass);      // 2. bloom\nconst vignetted = vignetteEffect(bloomed);    // 3. vignette\nconst final = fxaa(vignetted);                // 4. FXAA (always last)",
    detectionSignal: "Read the PostProcessing chain. Verify FXAA wraps the outermost call. Verify bloom is applied before vignette.",
    evidence: "mathcrew Phase 1–3 (2026-03-24): Pipeline evolved from bloom-only → bloom+vignette+FXAA → full MRT+GTAO+bloom+vignette+FXAA. Order validated by 3D Scene Audit.",
  },
};

// =========================================================================
// HC-RENDER-PIPE-05: WebGPU Mandatory PostProcessing ScenePass
// =========================================================================

export const HC_RENDER_PIPE_05: RenderingHardConstraint = {
  id: "HC-RENDER-PIPE-05",
  name: "WebGPU Mandatory PostProcessing ScenePass",
  description: "WebGPU renderer delegates ALL rendering to PostProcessing.render(). Without a PostProcessing instance with at least a scenePass, the screen is blank. Even when all effects (GTAO, bloom, vignette, FXAA) are disabled, the scenePass must still exist.",
  severity: "error",
  domain: "pipeline",
  validationFn: "In PostProcessingSetup, verify PostProcessing is always instantiated with at least pass(scene, camera) as output. Never skip PostProcessing creation conditionally.",
  context: {
    mechanism: "R3F's default render loop calls gl.render(scene, camera) each frame. But WebGPURenderer with PostProcessing intercepts this — PostProcessing.render() replaces the default loop. When PostProcessing is not created (ppRef.current = null), useFrame's ppRef.current?.render() is a no-op, and R3F's default loop doesn't fill the gap because the WebGPU renderer expects PostProcessing to drive rendering. Result: completely blank canvas.",
    antiPattern: "if (!anyEffectEnabled) { ppRef.current = null; return; } // WRONG — blank screen",
    correctPattern: "// ALWAYS create PostProcessing, even with zero effects:\nconst pp = new THREE.PostProcessing(renderer);\nconst scenePass = pass(scene, camera);\npp.outputNode = scenePass; // Minimal passthrough\nppRef.current = pp;",
    detectionSignal: "In PostProcessingSetup useEffect, check for early return that sets ppRef.current = null. Any conditional that skips PostProcessing creation is a violation.",
    evidence: "mathcrew v0.10 (2026-03-24): Quality preset 'low' disabled all effects → PostProcessing was skipped → blank screen. Fix: always create scenePass, conditionally add effects on top.",
  },
};

// =========================================================================
// Export
// =========================================================================

export const PIPELINE_HARD_CONSTRAINTS = [
  HC_RENDER_PIPE_01,
  HC_RENDER_PIPE_02,
  HC_RENDER_PIPE_03,
  HC_RENDER_PIPE_04,
  HC_RENDER_PIPE_05,
] as const;
