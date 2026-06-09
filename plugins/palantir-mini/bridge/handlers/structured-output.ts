/**
 * structured_output MCP handler (verify/recover layer) — O-1 / SI-1.
 *
 * Composes the lib primitive (lib/structured-output:fillOrFallback) the way
 * bridge/handlers/commit-edits.ts composes commitEdits: (a) validate raw args +
 * throw on bad input, (b) build the typed StructuredOutputRequest, (c) inject the
 * concrete filesystem sink port at this wiring boundary, (d) call the engine,
 * (e) best-effort 5-dim lineage emit wrapped in try/catch so it NEVER blocks the
 * core call, (f) return the StructuredOutputResult.
 *
 * The engine's termination guarantee (fixed finite path) means this handler can
 * never enter the rule-05 unrecoverable validation loop — the result is always a
 * terminal {ok:true,value} | {ok:false,fallbackText,reason}.
 *
 * @owner hook-builder (bridge/handlers/**)
 * @purpose structured_output MCP handler — typed-artifact-or-safe-fallback (O-1)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { emit } from "../../scripts/log";
import {
  fillOrFallback,
  type FillOrFallbackDeps,
} from "../../lib/structured-output";
import {
  type JSONSchema,
  type StructuredOutputRequest,
  type StructuredOutputResult,
  type StructuredOutputSink,
  type StructuredOutputSinkPort,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_RETRIES,
} from "../../lib/structured-output/contract";

/** Raw MCP args for structured_output. */
export interface StructuredOutputArgs {
  /** Small bounded JSON-Schema validation target (required). */
  readonly schema?: unknown;
  /** Model-produced value to validate (optional). */
  readonly candidate?: unknown;
  /** Pre-size gate ceiling in bytes (default 16384). */
  readonly maxBytes?: unknown;
  /** Hard integer retry ceiling (default 2). */
  readonly maxRetries?: unknown;
  /** Only "file" is allowed. */
  readonly overflowSink?: unknown;
  /** Optional project root — where the overflow sink file is written. */
  readonly project?: unknown;
}

/**
 * Concrete filesystem sink port. Writes the oversized serialized candidate to a
 * unique file under the project's `.palantir-mini/structured-output-overflow/`
 * (or the OS tmp dir when no project given). This is the ONLY place this handler
 * touches the filesystem for sinking — the engine itself never calls fs.write.
 */
function makeFileSinkPort(projectRoot: string | undefined): StructuredOutputSinkPort {
  return {
    write(serialized: string): StructuredOutputSink {
      const dir = projectRoot
        ? path.join(projectRoot, ".palantir-mini", "structured-output-overflow")
        : fs.mkdtempSync(path.join(os.tmpdir(), "pm-structured-output-"));
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(
        dir,
        `overflow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.json`,
      );
      fs.writeFileSync(file, serialized, "utf8");
      return { path: file, bytes: Buffer.byteLength(serialized, "utf8") };
    },
  };
}

export default async function structuredOutputHandler(
  rawArgs: unknown,
): Promise<StructuredOutputResult> {
  const args = (rawArgs ?? {}) as StructuredOutputArgs;

  // ── Validate raw args + throw on bad input (commit-edits.ts:280-283 idiom). ──
  if (args.schema === null || typeof args.schema !== "object" || Array.isArray(args.schema)) {
    throw new Error("structured_output: `schema` (object) is required");
  }
  if (args.maxBytes !== undefined && (typeof args.maxBytes !== "number" || args.maxBytes <= 0)) {
    throw new Error("structured_output: `maxBytes` must be a positive number");
  }
  if (
    args.maxRetries !== undefined &&
    (typeof args.maxRetries !== "number" || args.maxRetries < 0 || !Number.isInteger(args.maxRetries))
  ) {
    throw new Error("structured_output: `maxRetries` must be a non-negative integer");
  }
  if (args.overflowSink !== undefined && args.overflowSink !== "file") {
    throw new Error('structured_output: `overflowSink` must be "file"');
  }
  const projectRoot =
    typeof args.project === "string" && args.project.length > 0 ? args.project : undefined;

  // ── Build the typed request. ──
  const request: StructuredOutputRequest = {
    schema: args.schema as JSONSchema,
    candidate: args.candidate,
    maxBytes: (args.maxBytes as number | undefined) ?? DEFAULT_MAX_BYTES,
    maxRetries: (args.maxRetries as number | undefined) ?? DEFAULT_MAX_RETRIES,
    overflowSink: "file",
  };

  // ── Inject the concrete sink port; call the non-looping engine. ──
  const deps: FillOrFallbackDeps = { sink: makeFileSinkPort(projectRoot) };
  const startedAt = Date.now();
  const result = await fillOrFallback(request, deps);

  // ── Best-effort 5-dim lineage (try/catch-swallowed — NEVER blocks the core call). ──
  try {
    await emit({
      type: "tool_invocation_completed",
      payload: {
        toolName: "structured_output",
        durationMs: Date.now() - startedAt,
        success: result.ok,
        ...(result.ok ? {} : { errorClass: result.reason }),
      },
      toolName: "structured_output",
      cwd: projectRoot ?? process.cwd(),
      reasoning:
        `structured_output: ${result.ok ? "validated structured value" : `fell back (reason=${result.reason})`} ` +
        `— rule 05 anti-stall structural form; termination guaranteed by the engine's finite path`,
      memoryLayers: ["procedural"],
    });
  } catch {
    // best-effort — lineage emit must not block the result
  }

  return result;
}
