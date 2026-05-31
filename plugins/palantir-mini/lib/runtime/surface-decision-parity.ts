import type {
  RuntimeDecision,
  RuntimeDecisionParityDifference,
  RuntimeDecisionParityResult,
} from "../../core/contracts/aip-fde-local-surface";

const COMPARED_FIELDS = [
  "workflowFamily",
  "phaseId",
  "requiredContracts",
  "allowedTools",
  "forbiddenTools",
  "blockingGates",
  "advisoryGates",
  "decision",
  "evalRequirementRefs",
  "replayRequirementRefs",
  "lineageRequirementRefs",
  "outputContractRefs",
] as const;

const ALLOWED_RUNTIME_SPECIFIC_FIELDS = [
  "runtime",
  "unsupportedSurfaceRefs",
  "runtimeEventName",
  "pluginManifestSyntax",
  "hookResponseSchema",
  "reloadProcedure",
  "uiPresentation",
] as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) out[key] = input[key];
    return JSON.stringify(out);
  }
  return JSON.stringify(value ?? null);
}

function valueFor(decision: RuntimeDecision, field: typeof COMPARED_FIELDS[number]): unknown {
  return decision[field];
}

export function compareRuntimeDecisionParity(input: {
  readonly neutral: RuntimeDecision;
  readonly claude: RuntimeDecision;
  readonly codex: RuntimeDecision;
  readonly gemini?: RuntimeDecision;
}): RuntimeDecisionParityResult {
  const differences: RuntimeDecisionParityDifference[] = [];
  for (const field of COMPARED_FIELDS) {
    const neutral = valueFor(input.neutral, field);
    const claude = valueFor(input.claude, field);
    const codex = valueFor(input.codex, field);
    const gemini = input.gemini ? valueFor(input.gemini, field) : undefined;
    if (
      stable(neutral) !== stable(claude) ||
      stable(neutral) !== stable(codex) ||
      (input.gemini ? stable(neutral) !== stable(gemini) : false)
    ) {
      differences.push(input.gemini ? { field, neutral, claude, codex, gemini } : { field, neutral, claude, codex });
    }
  }
  return {
    status: differences.length > 0 ? "fail" : "pass",
    comparedFields: COMPARED_FIELDS,
    allowedRuntimeSpecificFields: ALLOWED_RUNTIME_SPECIFIC_FIELDS,
    differences,
  };
}
