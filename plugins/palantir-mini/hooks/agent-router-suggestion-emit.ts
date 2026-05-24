// palantir-mini — agent-router-suggestion-emit hook (foamy-giggling-kettle PR-2 T5)
// Fires on: PostToolUse(mcp__plugin_palantir-mini_palantir-mini__pm_intent_router)
//
// PURPOSE: After each pm_intent_router MCP call, inspect the returned result.
// When the result contains suggestedAgents AND the recipe-builder chose a
// different agent than the top router suggestion, emit an advisory event so
// Lead can track drift between static-map and capability-router recommendations.
//
// This is an ADVISORY-ONLY hook — it never blocks routing.
//
// Authority:
//   rule 12 v3.13.0 §Lead routing canonical (pm_intent_router = single dispatch entry)
//   rule 12 §Pre-delegation analysis framework (router-suggested wins over static map)
//   rule 26 §Axis E — procedural memory layer (hook implementation)

import { emit } from "../scripts/log";

// ─── Hook input shape (PostToolUse stdin) ────────────────────────────────────

interface PostToolUsePayload {
  tool_input?:    unknown;
  tool_response?: unknown;
  session_id?:    string;
  cwd?:           string;
}

// ─── Result shape (subset of IntentRouterResult) ─────────────────────────────

interface CapabilityRouterDecisionLike {
  capabilityId: string;
  score:        number;
  decision:     string;
}

interface IntentRouterResultLike {
  decision?:       string;
  suggestedAgents?: CapabilityRouterDecisionLike[];
  recipe?:         { agent?: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the router result from tool_response.
 * pm_intent_router returns the full IntentRouterResult as the MCP response.
 */
function extractRouterResult(payload: PostToolUsePayload): IntentRouterResultLike | null {
  try {
    const resp = payload.tool_response;
    if (resp && typeof resp === "object") {
      return resp as IntentRouterResultLike;
    }
  } catch {
    // fall through
  }
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Read hook payload from stdin
  let rawInput = "";
  for await (const chunk of process.stdin) rawInput += chunk;

  let payload: PostToolUsePayload = {};
  try {
    payload = JSON.parse(rawInput) as PostToolUsePayload;
  } catch {
    // Malformed input — exit silently (advisory hook, never blocks)
    process.exit(0);
  }

  const cwd = payload.cwd ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();

  // Extract the router result
  const result = extractRouterResult(payload);
  if (!result) {
    process.exit(0); // Not a recognisable pm_intent_router response — skip
  }

  // Only care about results with suggestedAgents
  const suggestedAgents = result.suggestedAgents;
  if (!Array.isArray(suggestedAgents) || suggestedAgents.length === 0) {
    process.exit(0); // No agent suggestions in this call — skip
  }

  // Derive the top router suggestion (array non-empty is guaranteed by length check above)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const topSuggested = suggestedAgents[0]!;
  const routerSuggestedAgent = topSuggested.capabilityId.replace(/^agent:/, "");

  // Derive the chosen recipe agent (from the recipe field)
  const recipeAgent = result.recipe?.agent ?? null;

  // Determine if divergence occurred
  const hasDivergence = recipeAgent !== null && recipeAgent !== routerSuggestedAgent;

  if (!hasDivergence) {
    // No divergence: router and recipe agreed (or recipe was absent/lead-direct)
    process.exit(0);
  }

  // Emit advisory divergence event
  const divergenceReason =
    `Static recipe chose '${recipeAgent}' but capability router top-scored '${routerSuggestedAgent}' ` +
    `(score ${topSuggested.score}). This may indicate the static 6-domain map is stale ` +
    `relative to the current agent capability registry (rule 12 §Pre-delegation analysis framework).`;

  // NOTE: "agent_routing_divergence_advised" is not in the EventEnvelope type union.
  // Emitting as validation_phase_completed with errorClass="agent-routing-divergence-advised"
  // and embedding router/recipe divergence data in withWhat.reasoning (rule 10 §5-dim envelope).
  try {
    await emit({
      type:    "validation_phase_completed",
      // payload must match ValidationPhaseCompletedEnvelope shape (phase+passed+errorClass).
      // Extra divergence fields are embedded in reasoning per rule 10 §5-dim envelope.
      payload: {
        phase:      "runtime" as const,
        passed:     true,
        errorClass: "agent-routing-divergence-advised",
      },
      toolName:    "agent-router-suggestion-emit",
      cwd,
      reasoning:
        `Router scored a different agent (${routerSuggestedAgent}, score=${topSuggested.score}) ` +
        `than the static recipe map chose (${recipeAgent}). Advisory only — routing already completed. ` +
        `Per rule 12 v3.13.0 §Lead routing canonical: router suggestion already won in the handler; ` +
        `this event records the divergence for BackPropagation refinement of the static map.`,
      memoryLayers: ["procedural"],
    });
  } catch {
    // Best-effort — never block on emit failure
  }

  // Output advisory to stderr for Lead visibility
  process.stderr.write(
    `[agent-router-suggestion-emit] divergence: routerSuggested=${routerSuggestedAgent} recipeChose=${recipeAgent} score=${topSuggested.score}\n`,
  );

  // Advisory hook — always continue
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[agent-router-suggestion-emit] error: ${String(err)}\n`);
  process.exit(0); // Advisory — never block on failure
});
