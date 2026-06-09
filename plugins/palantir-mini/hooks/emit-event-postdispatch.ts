// palantir-mini — emit-event-postdispatch aggregator (HOOK-3 coalesce)
// Fires on: PostToolUse with matcher
//   mcp__plugin_palantir-mini_palantir-mini__emit_event (advisory, async)
//
// PURPOSE: a single in-process dispatcher that replaces four separate cold-start
// `bun` processes in the hooks.json `hook-step:posttool-emit-event-value` group.
// Each emit_event PostToolUse previously spawned 4 bun processes — one per consumer
// (outcome-pair-tracker, memory-layer-validator, t3-circuit-feeder,
// t4-canonical-emit-watch). All four read the SAME PostToolUse payload (p.tool_name +
// p.tool_input.envelope + p.tool_input.project/p.cwd), so this aggregator parses the
// payload ONCE and fans out to the four consumers' default exports in a single bun
// start via Promise.allSettled.
//
// BEHAVIOR PRESERVATION (this is a behavior-preserving coalesce):
//   - Fail isolation: Promise.allSettled mirrors the prior four independent async
//     procs — one consumer throwing does not abort the others.
//   - Ordering is non-semantic: each consumer writes to a distinct session subdir
//     (outcome-pairs/, decisions/, advisory events; t4 reads append-only events.jsonl),
//     so order across the four does not change outcomes.
//   - Advisory + best-effort: never blocks emit. Errors are written to stderr; the
//     handler resolves (run.ts exits 0). Each consumer also keeps its own internal
//     early-return short-circuit, so passing the same payload to each is equivalent
//     to the prior per-proc invocation.
//
// Each of the four hooks remains a wired LOGIC MODULE (orphanInRegistry:false) — they
// are no longer listed individually in hooks.json; they fire via this aggregator.

import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";
import outcomePairTracker from "./outcome-pair-tracker";
import memoryLayerValidator from "./memory-layer-validator";
import t3CircuitFeeder from "./t3-circuit-feeder";
import t4CanonicalEmitWatch from "./t4-canonical-emit-watch";

const TARGET_TOOL = "emit_event";

interface PostToolUsePayload {
  tool_name?: string;
  tool_input?: {
    envelope?: { type?: string } | undefined;
  };
}

/**
 * Run a single consumer, isolating its failure (advisory contract — never block).
 * Errors are surfaced to stderr only; the aggregator always resolves.
 */
async function runConsumer(
  name: string,
  fn: (payload: unknown) => Promise<unknown>,
  payload: unknown,
): Promise<void> {
  try {
    await fn(payload);
  } catch (e) {
    process.stderr.write(
      `[emit-event-postdispatch] consumer "${name}" failed: ${(e as Error).message ?? String(e)}\n`,
    );
  }
}

export default async function emitEventPostDispatch(rawPayload: unknown): Promise<void> {
  const p = (rawPayload ?? {}) as PostToolUsePayload;

  // Short-circuit ONCE before fanning out — matches each consumer's own early return
  // (tool not emit_event alias, or no envelope). The consumers also re-check internally.
  const toolName = p.tool_name ?? "";
  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) return;

  const envelope = p.tool_input?.envelope;
  if (!envelope || !envelope.type) return;

  // Fan out to the four consumers in-process. allSettled preserves fail-isolation:
  // a throwing consumer does not abort the others (matches the prior 4 async procs).
  await Promise.allSettled([
    runConsumer("outcome-pair-tracker", outcomePairTracker, rawPayload),
    runConsumer("memory-layer-validator", memoryLayerValidator, rawPayload),
    runConsumer("t3-circuit-feeder", t3CircuitFeeder, rawPayload),
    runConsumer("t4-canonical-emit-watch", t4CanonicalEmitWatch, rawPayload),
  ]);
}
