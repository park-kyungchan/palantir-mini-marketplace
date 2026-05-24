// palantir-mini sprint-138 Slice 6 — prompt-fde-readiness-advisory hook
// Fires on: UserPromptSubmit (advisory, ALWAYS async, NEVER blocking)
//
// Classifies incoming prompts for read-only FDE design intent.
// When matched, emits a validation_phase_completed advisory event
// (errorClass="fde_readiness_advisory") so Lead knows the prompt is
// likely design-phase discussion rather than a mutating implementation request.
//
// HARD INVARIANT: NEVER exits with code 2. NEVER emits permissionDecision="deny".
// Advisory-only by design. Even on error, exits 0.
//
// Authority: sprint-138 FDE Slice 6; brief §12 + §16.5 (advisory-only, no promotion).
// Plan: ~/.claude/plans/splendid-mapping-lemur.md Slice 6.
// Companion: prompt-dtc-enforcement-gate.ts (additive FDE-aware skip branch).

import { emit } from "../scripts/log";
import { classifyReadOnlyFDEPrompt } from "../lib/fde-build/readonly-prompt-classifier";

interface HookPayload {
  readonly session_id?: string;
  readonly cwd?: string;
  readonly prompt?: string;
  readonly prompt_length?: number;
}

interface HookResult {
  readonly message: string;
  readonly additionalContext?: string;
}

export default async function promptFdeReadinessAdvisory(
  payload: unknown,
): Promise<HookResult> {
  try {
    const p = (payload ?? {}) as HookPayload;
    const promptText = String(p.prompt ?? "");
    const projectRoot = p.cwd ?? process.cwd();
    const sessionId = p.session_id;

    if (promptText.trim().length === 0) {
      return { message: "palantir-mini: prompt-fde-readiness-advisory — empty prompt, skip" };
    }

    const classification = classifyReadOnlyFDEPrompt({ promptText });

    if (classification.classifiedAs !== "read-only-fde-intent") {
      // Not a read-only FDE design prompt — pass through silently.
      return {
        message: `palantir-mini: prompt-fde-readiness-advisory — classifiedAs=${classification.classifiedAs}, no advisory emitted`,
      };
    }

    // Emit advisory event (NOT blocking — passed=true, advisory=true).
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "fde_readiness_advisory",
          advisory: true,
          classifiedAs: classification.classifiedAs,
          confidence: classification.confidence,
          fdeKeywordsHit: classification.fdeKeywordsHit,
          mutationVerbsHit: classification.mutationVerbsHit,
          reasoning: classification.reasoning,
          promptLengthChars: promptText.length,
        } as Record<string, unknown>,
        toolName: "prompt-fde-readiness-advisory",
        cwd: projectRoot,
        sessionId,
        identity: "monitor",
        memoryLayers: ["working", "episodic"],
        reasoning: [
          "prompt-fde-readiness-advisory: classified as read-only-fde-intent.",
          classification.reasoning,
          "Advisory event emitted to inform downstream hooks of design-phase prompt context.",
          "No contract_required suppression or mutation authorization in this hook.",
        ].join(" "),
      });
    } catch {
      // Best-effort emit — never let emit failure surface as blocking.
    }

    const additionalContext =
      `FDE readiness advisory: this prompt appears to be a read-only ontology design discussion ` +
      `(confidence=${classification.confidence.toFixed(2)}, ` +
      `FDE keywords: ${classification.fdeKeywordsHit.slice(0, 4).join(", ")}${classification.fdeKeywordsHit.length > 4 ? "…" : ""}). ` +
      `If this is a design-phase query (explain/describe/audit/review), no contract_required applies. ` +
      `For mutation work, ensure prompt-front-door capture + SemanticIntentContract approval first.`;

    return {
      message: "palantir-mini: prompt-fde-readiness-advisory — fde_readiness_advisory emitted (advisory only)",
      additionalContext,
    };
  } catch (err) {
    // HARD INVARIANT: even on unhandled error, NEVER block.
    // Exit 0 path guaranteed by scripts/run.ts error handler.
    return {
      message: `palantir-mini: prompt-fde-readiness-advisory — error (${(err as Error).message ?? String(err)})`,
    };
  }
}
