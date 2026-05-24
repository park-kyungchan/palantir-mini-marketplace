/**
 * PERFORMANCE Subdomain Schema — Rendering Schema §4
 *
 * Hard constraints for frame budget, React re-render optimization,
 * texture lifecycle, and text rendering in 3D contexts.
 * Answers: "Is the rendering performant and leak-free?"
 *
 * Includes HC-RENDER-TEXT-* (text rendering) here because text
 * performance issues (CJK wrap, CanvasTexture lifecycle) are
 * tightly coupled with rendering performance concerns.
 */

import type { RenderingHardConstraint } from "../types";

export const SCHEMA_VERSION = "0.1.0" as const;

// =========================================================================
// HC-RENDER-PERF-01: useFrame setState Prevention
// =========================================================================

export const HC_RENDER_PERF_01: RenderingHardConstraint = {
  id: "HC-RENDER-PERF-01",
  name: "useFrame setState Prevention",
  description: "Calling React setState inside useFrame (60fps) causes 60 re-renders per second. Use useRef for Three.js-only mutations (scale, position, opacity). Batch setState to integer boundaries for values that must trigger React re-renders.",
  severity: "error",
  domain: "performance",
  validationFn: "In useFrame callbacks, grep for setState/set* calls. Must use ref mutation or batched integer boundary.",
  context: {
    mechanism: "R3F useFrame fires every animation frame (~60fps). React setState triggers a full component re-render including all children. At 60fps, this means 60 re-renders/second per component using setState in useFrame. For components with Canvas 2D texture generation (CanvasText3D), each re-render triggers texture upload to GPU → significant CPU+GPU overhead.",
    antiPattern: "useFrame(() => {\n  setAnimScale(prev => prev + 0.01); // 60 setState calls/sec\n  setRevealedChars(prev => prev + 0.3); // 60 re-renders/sec\n});",
    correctPattern: "const scaleRef = useRef(0.01);\nconst charsRef = useRef(0);\nuseFrame(() => {\n  scaleRef.current = Math.min(scaleRef.current + 0.08, 1); // Three.js only — no re-render\n  meshRef.current.scale.setScalar(scaleRef.current);\n  charsRef.current += 0.3;\n  const intChars = Math.floor(charsRef.current);\n  if (intChars !== prevIntRef.current) { // Batch: only setState at integer boundary\n    prevIntRef.current = intChars;\n    setRevealed(intChars); // ~10 setState/sec instead of 60\n  }\n});",
    detectionSignal: "In useFrame callbacks, search for set[A-Z] (React setState pattern). If the setter is called unconditionally (not gated by a boundary check), flag as HC-RENDER-PERF-01 violation.",
    evidence: "mathcrew v0.10 (2026-03-24): Board3D typewriter animation called setState 60x/sec for both animScale and revealedChars. CanvasText3D re-rendered every frame → texture re-upload. Fix: animScale→useRef imperative, revealedChars→batched integer boundary. Result: ~10 re-renders/sec.",
  },
};

// =========================================================================
// HC-RENDER-PERF-02: React Key Stability
// =========================================================================

export const HC_RENDER_PERF_02: RenderingHardConstraint = {
  id: "HC-RENDER-PERF-02",
  name: "React Key Stability for 3D Components",
  description: "React key changes cause full unmount+remount of the component and all its Three.js resources. Using content-derived keys (key={text.length}) causes instability during animations like typewriter effects.",
  severity: "warn",
  domain: "performance",
  validationFn: "Check key props on 3D components. Keys must be stable identifiers (index, id), not derived from changing content.",
  context: {
    mechanism: "React uses key props to identify components across re-renders. When key changes, React unmounts the old component and mounts a new one. For Three.js components, this means: (1) dispose all geometries, materials, textures, (2) remove from scene graph, (3) create new geometries, materials, textures, (4) add to scene graph. During a typewriter animation where text grows character by character, key={text.trimmed.length} changes every ~100ms → full Three.js lifecycle every 100ms.",
    antiPattern: "<CanvasText3D key={i + '-' + trimmedText.length}> // Key changes every character during typewriter",
    correctPattern: "<CanvasText3D key={i}> // Stable key — content changes via children prop, not key-driven remount",
    detectionSignal: "Search for key={ expressions that include .length, .trim(), or any value that changes during animation. Dynamic content should change via props, not key-driven remount.",
    evidence: "mathcrew v0.10 (2026-03-24): Board3D key={i-trimmed.length} caused CanvasText3D to unmount/remount every character during typewriter. Adversarial verifier caught this. Fix: key={i}.",
  },
};

// =========================================================================
// HC-RENDER-PERF-03: CJK Word Wrap
// =========================================================================

export const HC_RENDER_PERF_03: RenderingHardConstraint = {
  id: "HC-RENDER-PERF-03",
  name: "CJK Character-Level Word Wrap",
  description: "Text wrapping logic that splits only on spaces fails for CJK text (Korean, Chinese, Japanese) where long strings without spaces overflow the rendering boundary.",
  severity: "warn",
  domain: "performance",
  validationFn: "In text rendering components, check if word wrap handles oversized words with char-level breaking.",
  context: {
    mechanism: "Standard word wrap splits text on spaces and checks if each word fits the line width. Korean text often has long strings without spaces (e.g., '최대공약수의보물'). When a single 'word' exceeds the max line width, space-only splitting produces a line that overflows. The text either gets clipped or extends beyond the rendering surface.",
    antiPattern: "const words = text.split(' ');\nfor (const word of words) {\n  if (lineWidth + wordWidth > maxWidth) newLine();\n  // No handling for word > maxWidth\n}",
    correctPattern: "const words = text.split(' ');\nfor (const word of words) {\n  if (wordWidth > maxWidth) {\n    // Char-level break for oversized words\n    for (const char of word) {\n      if (lineWidth + charWidth > maxWidth) newLine();\n      addChar(char);\n    }\n  } else { /* normal space-break logic */ }\n}",
    detectionSignal: "In text rendering/wrapping code, search for split(' ') without a fallback for oversized words. If no char-level breaking exists, flag for CJK content.",
    evidence: "mathcrew v0.10 (2026-03-24): CanvasText3D Korean text overflow. Words like '최대공약수의보물' exceeded maxPx without spaces to break on. Fix: char-by-char line break for any word exceeding maxPx. Also fixed in NpcBubble3D.",
  },
};

// =========================================================================
// HC-RENDER-PERF-04: CanvasTexture GPU Lifecycle
// =========================================================================

export const HC_RENDER_PERF_04: RenderingHardConstraint = {
  id: "HC-RENDER-PERF-04",
  name: "CanvasTexture Dispose Before Resize",
  description: "When a Canvas 2D element changes dimensions and its CanvasTexture is marked needsUpdate, the GPU receives texSubImage2D with the new dimensions but the old GPU allocation size. Call texture.dispose() before needsUpdate to force full re-upload.",
  severity: "warn",
  domain: "performance",
  validationFn: "In CanvasTexture update logic, verify texture.dispose() is called before setting needsUpdate when canvas dimensions change.",
  context: {
    mechanism: "WebGL/WebGPU maintains a GPU-side texture allocation. When Canvas 2D dimensions change (e.g., different text content → different canvas size), setting texture.needsUpdate=true triggers texSubImage2D with the new canvas data. But the GPU allocation was sized for the OLD dimensions. If new > old, the upload exceeds the allocation → GL_INVALID_VALUE ANGLE warning. texture.dispose() releases the GPU allocation, forcing the next upload to use texImage2D (full re-allocation).",
    antiPattern: "canvas.width = newWidth;\ncanvas.height = newHeight;\n// ... draw on canvas ...\ntexture.needsUpdate = true; // GPU allocation still old size → ANGLE warning",
    correctPattern: "canvas.width = newWidth;\ncanvas.height = newHeight;\n// ... draw on canvas ...\ntexture.dispose(); // Release old GPU allocation\ntexture.needsUpdate = true; // Next frame: full texImage2D re-upload",
    detectionSignal: "In components using CanvasTexture with dynamic content, check if dispose() is called when canvas dimensions change. If needsUpdate is set without prior dispose when size changes, flag.",
    evidence: "mathcrew v0.10 (2026-03-24): CanvasText3D produced GL_INVALID_VALUE ANGLE warnings when board text changed (different step → different canvas size). Fix: texture.dispose() before needsUpdate. All ANGLE warnings eliminated.",
  },
};

// =========================================================================
// Export
// =========================================================================

// =========================================================================
// HC-RENDER-PERF-05: NodeMaterial Module-Level Caching
// =========================================================================

export const HC_RENDER_PERF_05: RenderingHardConstraint = {
  id: "HC-RENDER-PERF-05",
  name: "NodeMaterial Module-Level Cache",
  description: "WebGPU NodeMaterials require TSL→WGSL compilation on first use. When 20+ components mount simultaneously (e.g., 12 pets + 8 build slots on island enter), each creating materials via useMemo, the compilation spike freezes the frame. Cache materials at module level by color key.",
  severity: "warn",
  domain: "performance",
  validationFn: "In components instantiated N>4 times (pets, slots, blocks), check if NodeMaterial creation uses a module-level Map cache instead of per-instance useMemo.",
  context: {
    mechanism: "TSL (Three.js Shading Language) compiles shader node graphs to WGSL at first render. MeshPhysicalNodeMaterial with fresnel + clearcoat is the most expensive (~5ms per compile). When 12 Pet3D components mount at once, each with 3 useMemo materials, the browser blocks for 12 × 3 × ~3ms = ~108ms — a visible stutter. On integrated GPUs, this can reach 200-400ms.",
    antiPattern: "// Inside component (called 12 times):\nconst bodyMat = useMemo(() => {\n  const m = new MeshPhysicalNodeMaterial();\n  m.colorNode = tslColor(color);\n  return m;\n}, [color]); // Creates + compiles 12 separate materials",
    correctPattern: "// Module level (called once per unique color):\nconst _cache = new Map<string, MeshPhysicalNodeMaterial>();\nfunction getBodyMat(color: string) {\n  let m = _cache.get(color);\n  if (!m) { m = new MeshPhysicalNodeMaterial(); m.colorNode = tslColor(color); _cache.set(color, m); }\n  return m;\n}\n// Inside component:\nconst bodyMat = useMemo(() => getBodyMat(color), [color]); // Reuses cached material",
    detectionSignal: "Count instances of 'new Mesh*NodeMaterial()' inside component functions (not module level). If the component is rendered N>4 times (check parent map/array), flag as HC-RENDER-PERF-05. Shared materials (eyes, ring) that are identical across instances should use module-level IIFE.",
    evidence: "mathcrew v0.10 (2026-03-24): Island 1 enter caused ~200ms freeze. 12 Pet3D × 3 mats + 8 BuildSlot3D × 3 mats = 60 NodeMaterial compilations. Fix: module-level Map cache by color key. Second island visit: 0 compilations (cache hit).",
  },
};

// =========================================================================
// HC-RENDER-PERF-06: Single CanvasText3D for Multi-Line Board Content
// =========================================================================

export const HC_RENDER_PERF_06: RenderingHardConstraint = {
  id: "HC-RENDER-PERF-06",
  name: "Single CanvasText3D for Multi-Line Board Content",
  description: "When rendering multi-line text on a 3D board (Board3D), use a SINGLE CanvasText3D instance with the full text. Do NOT create one CanvasText3D per line. CanvasText3D internally handles word-wrap, CJK line-breaking, and blank-line spacing. Per-line rendering causes layout mismatches because the parent cannot know each line's actual rendered height after word-wrap.",
  severity: "error",
  domain: "performance",
  validationFn: "In Board-like components, check if text is split into lines with individual CanvasText3D per line. Must use single CanvasText3D with maxWidth + onMeasure.",
  context: {
    mechanism: "When Board3D creates one CanvasText3D per text line, it must allocate a fixed Y-height per line (e.g., LINE_H=0.24). But CanvasText3D performs internal word-wrap when text exceeds maxWidth — a single source line can become 2-3 rendered lines. The parent doesn't know the actual rendered height, so it allocates LINE_H for a multi-line block → lines overlap and text clips below the board boundary. Blank lines (\\n\\n) compound the issue: they're skipped in rendering but consume Y-index positions.",
    antiPattern: "// Per-line rendering — Board3D doesn't know actual heights:\nlines.map((line, i) => (\n  <CanvasText3D\n    position={[0, totalHeight - i * LINE_H, 0]} // Fixed spacing, ignores word-wrap\n  >{line}</CanvasText3D>\n))",
    correctPattern: "// Single CanvasText3D — handles ALL layout internally:\n<CanvasText3D\n  maxWidth={boardWidth - padding}\n  onMeasure={(w, h) => setBoardHeight(h + padding)}\n>{fullText}</CanvasText3D>\n// Board background auto-sizes to actual rendered text height via onMeasure callback.",
    detectionSignal: "Search for patterns where text.split('\\n').map() creates multiple CanvasText3D instances inside a board/panel component. Each should be a single CanvasText3D with the full text and maxWidth.",
    evidence: "mathcrew v0.10 (2026-03-24): All 4 islands' Board3D chalkboards had text clipping. Korean text with \\n\\n paragraph breaks caused lines to overlap and fall below board boundary. Root cause: per-line CanvasText3D with fixed LINE_H=0.24. Fix: single CanvasText3D + onMeasure callback for dynamic board sizing. User-confirmed working.",
  },
};

export const PERFORMANCE_HARD_CONSTRAINTS = [
  HC_RENDER_PERF_01,
  HC_RENDER_PERF_02,
  HC_RENDER_PERF_03,
  HC_RENDER_PERF_04,
  HC_RENDER_PERF_05,
  HC_RENDER_PERF_06,
] as const;
