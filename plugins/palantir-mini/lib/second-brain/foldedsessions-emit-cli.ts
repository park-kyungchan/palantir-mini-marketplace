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
// W3 workstream B — VALIDATE-BEFORE-COMMIT: a `batch` invocation validates the WHOLE
// {"kind":"batch",...} NDJSON line (lib/second-brain/graph-contract.ts, backed by the
// #schemas/ontology/primitives/second-brain-graph.ts governed contract) BEFORE emitting
// ANY of that batch's verdicts. An invalid batch is rejected (exit 2, actionable stderr)
// with ZERO verdicts emitted for it — all-or-nothing per batch, so a malformed batch can
// never partially land and never corrupts an already-committed prior batch (each batch's
// validate+emit is independent; a rejection here does not touch the manifest at all — the
// caller simply does not proceed to bump that batch, per agents/second-brain-fold.md's
// emit-THEN-bump ordering).
//
// Usage:
//   bun run lib/second-brain/foldedsessions-emit-cli.ts <projectRoot> <sessionId> <emitObjJson>
//     Back-compat single-EmitObj emit (still individually shape-validated). Exit 0 on
//     success; nonzero + stderr on bad/missing input or a malformed EmitObj.
//
//   bun run lib/second-brain/foldedsessions-emit-cli.ts batch <projectRoot> <sessionId> <batchLineJson>
//     Validates the WHOLE {"kind":"batch","batchIndex":k,"verdicts":[...]}" line against
//     the governed contract FIRST; on failure, exits 2 with every error on stderr and
//     emits NOTHING. On success, emits every verdict in order and prints
//     {emitted:true, count, sequences:[...]}.
//
//   bun run lib/second-brain/foldedsessions-emit-cli.ts summary <projectRoot> <sessionId> <summaryLineJson> [<byWhom>] [<fromStatus>] [<toStatus>] [<foldedAt>]
//     Validates the {"kind":"summary","summary":EmitObj,"totalBatches":n} line FIRST;
//     on failure, exits 2 with every error on stderr and emits NOTHING. On success,
//     ADDITIVELY enriches a memory_fold_committed summary's payload with the W3
//     workstream C audit fields (byWhom/fromStatus/toStatus/totalBatches/foldedAt — all
//     optional; only the ones the caller supplied are attached) before emitting.
// Exit 0 on success; nonzero + stderr on bad/missing input.

import { emit } from "../../scripts/log";
import { resolveHostRuntimeIdentity, type RuntimeIdentity } from "../runtime/identity";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";
import {
  validateBatchLine,
  validateSummaryLine,
  formatGraphContractErrors,
} from "./graph-contract";

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

/** W3 workstream C — optional audit fields additively merged onto a memory_fold_committed payload. */
export interface FoldCompletionAudit {
  byWhom?:       string;
  fromStatus?:   string;
  toStatus?:     string;
  totalBatches?: number;
  foldedAt?:     string;
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

/**
 * Validate + emit an ENTIRE batch line's verdicts, all-or-nothing. Throws (with the full
 * formatted contract-error list) BEFORE emitting anything if the batch fails validation —
 * a caller catching the throw is guaranteed zero verdicts were forwarded for this batch.
 * Returns the sequence numbers assigned, in verdict order.
 */
export async function emitBatchLine(
  raw: string,
  projectRoot: string,
  sessionId: string,
): Promise<number[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`batchLineJson is not valid JSON: ${(e as Error).message}`);
  }
  const result = validateBatchLine(parsed);
  if (!result.ok) {
    throw new Error(`batch line failed contract validation: ${formatGraphContractErrors(result.errors)}`);
  }
  const line = parsed as { verdicts: EngineEmitObj[] };
  const sequences: number[] = [];
  // Validation already passed for every verdict up-front; emit sequentially. A mid-stream
  // emit() I/O failure here is a DIFFERENT failure class than a validation rejection (it
  // throws too, but some earlier verdicts in THIS batch may already be durably appended —
  // that is an I/O fault, not a contract violation, and is reported distinctly by the
  // caller never bumping the batch on ANY non-zero exit, per agents/second-brain-fold.md).
  for (const verdict of line.verdicts) {
    sequences.push(await emitFoldObj(verdict, projectRoot, sessionId));
  }
  return sequences;
}

/**
 * Validate + emit the terminal summary line, all-or-nothing, additively enriching a
 * memory_fold_committed payload with the W3 workstream C audit fields (only the ones
 * present in `audit` are attached; existing payload fields are never removed/renamed).
 * Throws BEFORE emitting if the summary line fails contract validation.
 */
export async function emitSummaryLine(
  raw: string,
  projectRoot: string,
  sessionId: string,
  audit: FoldCompletionAudit = {},
): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`summaryLineJson is not valid JSON: ${(e as Error).message}`);
  }
  const result = validateSummaryLine(parsed);
  if (!result.ok) {
    throw new Error(`summary line failed contract validation: ${formatGraphContractErrors(result.errors)}`);
  }
  const line = parsed as { summary: EngineEmitObj };
  const summary = line.summary;
  const enriched: EngineEmitObj =
    summary.type === "memory_fold_committed"
      ? {
          ...summary,
          payload: {
            ...summary.payload,
            ...(audit.byWhom !== undefined ? { byWhom: audit.byWhom } : {}),
            ...(audit.fromStatus !== undefined ? { fromStatus: audit.fromStatus } : {}),
            ...(audit.toStatus !== undefined ? { toStatus: audit.toStatus } : {}),
            ...(audit.totalBatches !== undefined ? { totalBatches: audit.totalBatches } : {}),
            ...(audit.foldedAt !== undefined ? { foldedAt: audit.foldedAt } : {}),
          },
        }
      : summary;
  return emitFoldObj(enriched, projectRoot, sessionId);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);

  async function main(): Promise<void> {
    if (argv[0] === "batch") {
      const [, projectRoot, sessionId, batchLineJson] = argv;
      if (!projectRoot || !sessionId || batchLineJson === undefined) {
        process.stderr.write(
          "usage: foldedsessions-emit-cli.ts batch <projectRoot> <sessionId> <batchLineJson>\n",
        );
        process.exit(2);
      }
      const sequences = await emitBatchLine(batchLineJson, projectRoot, sessionId);
      process.stdout.write(JSON.stringify({ emitted: true, count: sequences.length, sequences }) + "\n");
      return;
    }

    if (argv[0] === "summary") {
      const [, projectRoot, sessionId, summaryLineJson, byWhom, fromStatus, toStatus, foldedAt] = argv;
      if (!projectRoot || !sessionId || summaryLineJson === undefined) {
        process.stderr.write(
          "usage: foldedsessions-emit-cli.ts summary <projectRoot> <sessionId> <summaryLineJson> [<byWhom>] [<fromStatus>] [<toStatus>] [<foldedAt>]\n",
        );
        process.exit(2);
      }
      const sequence = await emitSummaryLine(summaryLineJson, projectRoot, sessionId, {
        ...(byWhom ? { byWhom } : {}),
        ...(fromStatus ? { fromStatus } : {}),
        ...(toStatus ? { toStatus } : {}),
        ...(foldedAt ? { foldedAt } : {}),
      });
      process.stdout.write(JSON.stringify({ emitted: true, sequence }) + "\n");
      return;
    }

    // Back-compat: single positional EmitObj emit.
    const [projectRoot, sessionId, emitObjJson] = argv;
    if (!projectRoot || !sessionId || emitObjJson === undefined) {
      process.stderr.write(
        "usage: foldedsessions-emit-cli.ts <projectRoot> <sessionId> <emitObjJson>\n",
      );
      process.exit(2);
    }
    const obj = parseEmitObj(emitObjJson);
    const seq = await emitFoldObj(obj, projectRoot, sessionId);
    process.stdout.write(JSON.stringify({ emitted: true, sequence: seq }) + "\n");
  }

  /**
   * Bad/malformed INPUT (parse failure, missing required field, contract-validation
   * rejection) is a caller mistake — exit 2 (matches the original single-EmitObj CLI's
   * "usage/parse error -> exit 2" contract). An emit() I/O failure (already-parsed,
   * already-validated input; the write itself failed) is a runtime fault — exit 1.
   */
  function isInputError(e: unknown): boolean {
    const msg = (e as Error).message ?? "";
    return (
      msg.includes("is not valid JSON") ||
      msg.includes("must be a") ||
      msg.includes("must be a non-empty string") ||
      msg.includes("failed contract validation")
    );
  }

  main()
    .then(() => process.exit(0))
    .catch((e) => {
      process.stderr.write(`foldedsessions-emit-cli: ${(e as Error).message}\n`);
      process.exit(isInputError(e) ? 2 : 1);
    });
}
