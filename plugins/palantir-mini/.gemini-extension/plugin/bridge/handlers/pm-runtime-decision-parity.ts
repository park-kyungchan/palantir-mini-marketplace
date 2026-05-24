import type {
  RuntimeDecision,
  RuntimeDecisionParityResult,
} from "../../core/contracts/aip-fde-local-surface";
import { compareRuntimeDecisionParity } from "../../lib/runtime/surface-decision-parity";

export interface PmRuntimeDecisionParityArgs {
  readonly neutral: RuntimeDecision;
  readonly claude: RuntimeDecision;
  readonly codex: RuntimeDecision;
}

export async function pmRuntimeDecisionParity(
  args: PmRuntimeDecisionParityArgs,
): Promise<RuntimeDecisionParityResult> {
  return compareRuntimeDecisionParity(args);
}

export default async function pmRuntimeDecisionParityHandler(
  rawArgs: unknown,
): Promise<RuntimeDecisionParityResult> {
  return pmRuntimeDecisionParity((rawArgs ?? {}) as PmRuntimeDecisionParityArgs);
}
