/**
 * @stable — UserPrompt primitive (prim-learn-25, v1.0.0)
 *
 * Atomic raw user-prompt identity. Captures prompt continuity metadata as a
 * Phase 2 ImpactGraph node — complementary to PromptEnvelope (which carries
 * lifecycle state + contract refs). UserPrompt is the immutable identity node
 * for a single raw user input; PromptEnvelope is the stateful wrapper.
 *
 * Field names reuse prompt-envelope.ts for cross-ref-friendly joins:
 * promptId, promptHash, sessionId, runtime, capturedAt, projectRoot.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/user-prompt.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (immutable prompt-identity node; no logic, no action)
 * @owner palantirkc-ontology
 * @purpose UserPrompt graph-node identity (Phase 2 ImpactGraph node-type)
 */

import type { PromptRuntime } from "./approval-ref";

export type UserPromptRid = string & { readonly __brand: "UserPromptRid" };
export const userPromptRid = (s: string): UserPromptRid => s as UserPromptRid;

export interface UserPromptDeclaration {
  readonly promptId: UserPromptRid;
  /** SHA-256 hex digest of the raw prompt text (no truncation). */
  readonly promptHash: string;
  /** Session identifier (matches PromptEnvelope.sessionId for joins). */
  readonly sessionId: string;
  /** Runtime that captured this prompt — claude | codex | gemini | cursor. */
  readonly runtime: PromptRuntime;
  /** ISO 8601 timestamp when the prompt was captured. */
  readonly capturedAt: string;
  /** Absolute path to the project root in which the prompt was issued. */
  readonly projectRoot: string;
}

export function isUserPromptDeclaration(x: unknown): x is UserPromptDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as UserPromptDeclaration;
  return (
    typeof d.promptId === "string" &&
    d.promptId.length > 0 &&
    typeof d.promptHash === "string" &&
    typeof d.sessionId === "string" &&
    typeof d.runtime === "string" &&
    typeof d.capturedAt === "string" &&
    typeof d.projectRoot === "string"
  );
}
