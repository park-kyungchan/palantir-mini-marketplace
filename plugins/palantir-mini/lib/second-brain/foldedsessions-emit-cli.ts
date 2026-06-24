// @domain: LEARN
// foldedsessions-emit-cli — Path-B governed-emit CLI for the second-brain fold (G-emit).
//
// WHY THIS EXISTS (root-cause fix, ssot/palantir Altitude-2 BackwardProp doctrine):
// the second-brain-fold AGENT must land the fold's governed verdicts
// (resolution_verdict / memory_fold_committed) into events.jsonl. Its prior locus —
// the MCP emit_event tool — is HIDDEN under the live altitude-2 MCP profile
// (mcp-tool-capability.ts: emit_event ∈ INTERNAL_TELEMETRY; the altitude-2 surface is
// studio-core + altitude-2-read only), so the governed write never lands. This thin CLI
// routes the SAME governed emit through pm's in-process scripts/log.ts emit() (Path B),
// which is NOT subject to the MCP profile and already accepts BOTH fold types (neither is
// in lib/event-log/reserved-provenance.ts RESERVED_PROVENANCE_TYPES).
//
// SEPARATION (ssot/ontology-first-program.md): the fold ENGINE
// (<root>/second-brain/scripts/fold.ts) stays PURE — it only PRINTS NDJSON and never
// emits. This CLI is the ADAPTER's governed-emit step; it imports pm's emit() and is
// invoked by the second-brain-fold agent (Claude Agent / Codex worker) per batch.
//
// 5-DIM PARITY with the prior gated MCP emit_event path is LOAD-BEARING (governance is the
// whole point). For these two fold event types the MCP-path rows carried:
//   - byWhom.identity   = the REAL runtime (e.g. "claude-code"), NEVER "monitor";
//   - throughWhich.toolName = "mcp__emit_event" (which also makes propagationDepth OMIT,
//     since derivePropagationDepthFromPath("mcp__emit_event") === undefined);
//   - withWhat.memoryLayers = the EmitObj's memoryLayers (these two types have NO
//     AUTO_TAG_HEURISTICS entry, so they MUST be forwarded EXPLICITLY or Axis-E is lost).
// This CLI replicates all three exactly.
//
// Usage:
//   bun run lib/second-brain/foldedsessions-emit-cli.ts <projectRoot> <sessionId> <emitObjJson>
//     <emitObjJson> — a JSON-encoded EmitObj:
//       { type, payload, memoryLayers, hypothesis?, refinementTarget? }
// Exit 0 on success; nonzero + stderr on bad/missing input.

import { emit } from "../../scripts/log";
import { resolveHostRuntimeIdentity, type RuntimeIdentity } from "../runtime/identity";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";

/**
 * toolName parity with the gated MCP emit_event path: the live fold rows carry
 * throughWhich.toolName === "mcp__emit_event". It is ALSO load-bearing for
 * propagationDepth parity — derivePropagationDepthFromPath("mcp__emit_event") is
 * undefined, so emit() OMITS propagationDepth exactly as the MCP path did.
 */
const EMIT_TOOL_NAME = "mcp__emit_event";

/** identity types emit() accepts (excludes "unknown"); the MCP path resolved a REAL runtime. */
type EmitIdentity = "claude-code" | "codex" | "gemini" | "user" | "monitor" | "test-agent";

/** One emit-ready object as PRINTED by the engine's NDJSON contract (fold.ts EmitObj). */
export interface EngineEmitObj {
  type:              string;
  payload:           Record<string, unknown>;
  memoryLayers?:     readonly AgenticMemoryLayer[];
  hypothesis?:       string;
  refinementTarget?: RefinementTarget;
}

/**
 * Resolve the REAL runtime identity exactly as the MCP emit_event path does — from
 * PALANTIR_MINI_HOST_RUNTIME — falling back to "claude-code" (the live fold-row value),
 * NEVER the prior hard-coded "monitor". "unknown" is coerced to "claude-code" so the
 * value is always a concrete real runtime that emit()'s identity param accepts.
 */
export function resolveEmitIdentity(): EmitIdentity {
  const resolved: RuntimeIdentity = resolveHostRuntimeIdentity(
    process.env.PALANTIR_MINI_HOST_RUNTIME,
    "claude-code",
  );
  return resolved === "unknown" ? "claude-code" : resolved;
}

/**
 * Forward ONE engine emit-ready object into the project's events.jsonl via Path-B emit().
 * Maps the EmitObj 5-dim-relevant fields with full parity to the prior gated MCP path:
 * the engine's hypothesis → withWhat.reasoning AND withWhat.hypothesis, memoryLayers
 * forwarded EXPLICITLY (no heuristic for these types), refinementTarget passed through,
 * identity = real runtime, toolName = "mcp__emit_event" (→ propagationDepth omitted).
 * Returns the assigned sequence number.
 */
export async function emitFoldObj(
  obj: EngineEmitObj,
  projectRoot: string,
  sessionId: string,
): Promise<number> {
  return emit({
    type:             obj.type as never,
    payload:          obj.payload as never,
    toolName:         EMIT_TOOL_NAME,
    cwd:              projectRoot,
    sessionId,
    identity:         resolveEmitIdentity(),
    // EXPLICIT memoryLayers — resolution_verdict / memory_fold_committed have NO
    // AUTO_TAG_HEURISTICS entry, so omitting these would drop Axis-E (rule 26).
    memoryLayers:     obj.memoryLayers,
    // The engine's hypothesis is the decision WHY; mirror the MCP path's
    // reasoning = hypothesis mapping AND keep it as hypothesis (Axis B).
    reasoning:        obj.hypothesis,
    hypothesis:       obj.hypothesis,
    refinementTarget: obj.refinementTarget,
  });
}

/** Parse + structurally validate an EmitObj JSON string. Throws on malformed input. */
export function parseEmitObj(raw: string): EngineEmitObj {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`emitObjJson is not valid JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("emitObjJson must be a JSON object { type, payload, memoryLayers, ... }");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.type !== "string" || o.type.length === 0) {
    throw new Error("emitObjJson.type must be a non-empty string");
  }
  if (!o.payload || typeof o.payload !== "object" || Array.isArray(o.payload)) {
    throw new Error("emitObjJson.payload must be a JSON object");
  }
  return parsed as EngineEmitObj;
}

if (import.meta.main) {
  const [, , projectRoot, sessionId, emitObjJson] = process.argv;
  if (!projectRoot || !sessionId || emitObjJson === undefined) {
    process.stderr.write(
      "usage: foldedsessions-emit-cli.ts <projectRoot> <sessionId> <emitObjJson>\n",
    );
    process.exit(2);
  }
  let obj: EngineEmitObj;
  try {
    obj = parseEmitObj(emitObjJson);
  } catch (e) {
    process.stderr.write(`foldedsessions-emit-cli: ${(e as Error).message}\n`);
    process.exit(2);
  }
  emitFoldObj(obj, projectRoot, sessionId)
    .then((seq) => {
      process.stdout.write(JSON.stringify({ emitted: true, sequence: seq }) + "\n");
      process.exit(0);
    })
    .catch((e) => {
      process.stderr.write(`foldedsessions-emit-cli: ${(e as Error).message}\n`);
      process.exit(1);
    });
}
