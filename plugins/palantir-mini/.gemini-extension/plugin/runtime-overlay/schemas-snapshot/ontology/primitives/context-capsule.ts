/**
 * @stable — ContextCapsule primitive (prim-learn-26, v1.0.0)
 *
 * Frozen retrieved-context snapshot bundled into a prompt. A ContextCapsule
 * captures one retrieval event — the research / BROWSE.md / ontology slice
 * that was injected into a UserPrompt at a specific point in time. Enables
 * the PR 2.3 ProjectOntologyIndex store to audit "what context did this agent
 * have when it made this decision?" via the sourceRid → UserPromptRid edge.
 *
 * See proposal §8 Stage 2/3 RetrievalContext discussion for the capsule
 * lifecycle: captured → (optional) expired.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/context-capsule.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (immutable snapshot node — once captured, content is frozen)
 * @owner palantirkc-ontology
 * @purpose ContextCapsule graph-node identity (Phase 2 ImpactGraph node-type)
 */

export type ContextCapsuleRid = string & { readonly __brand: "ContextCapsuleRid" };
export const contextCapsuleRid = (s: string): ContextCapsuleRid => s as ContextCapsuleRid;

export interface ContextCapsuleDeclaration {
  readonly capsuleId: ContextCapsuleRid;
  /** ISO 8601 timestamp when this retrieval snapshot was captured. */
  readonly capturedAt: string;
  /**
   * RID of the source that yielded this capsule (UserPromptRid, ResearchDocumentRid,
   * etc.) — typed as string to avoid circular import; PR 2.2 edges carry the full type.
   */
  readonly sourceRid: string;
  /** SHA-256 hex digest of the raw context content at capture time. */
  readonly contentHash: string;
  /** Byte size of the frozen content. */
  readonly byteSize: number;
  /** ISO 8601 expiry timestamp; absent = capsule never expires. */
  readonly expiresAt?: string;
}

export function isContextCapsuleDeclaration(x: unknown): x is ContextCapsuleDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as ContextCapsuleDeclaration;
  return (
    typeof d.capsuleId === "string" &&
    d.capsuleId.length > 0 &&
    typeof d.capturedAt === "string" &&
    typeof d.sourceRid === "string" &&
    typeof d.contentHash === "string" &&
    typeof d.byteSize === "number"
  );
}
