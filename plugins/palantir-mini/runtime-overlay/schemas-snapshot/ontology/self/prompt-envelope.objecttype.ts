/**
 * palantir-mini SELF-ONTOLOGY — PromptEnvelope as a registered ObjectType
 * (Wave 2, harness redesign self-model build). Mirrors the `mcp-tool.objecttype.ts`
 * idiom: ONE `PromptEnvelope` ObjectType (the type) registered into
 * OBJECT_TYPE_REGISTRY at module load.
 *
 * pm's prompt-front-door surface modeled AS ontology: the envelope minted at
 * UserPromptSubmit (promptId/promptHash + cached SIC approval) is the front-door
 * record every ontology-affecting dispatch keys off. The live source is
 * `lib/prompt-front-door/` — its `PromptEnvelope` interface is the type's provenance.
 *
 * Count provenance (catalog §2): instanceCount = 0 — a real surface whose instances
 * are RUNTIME-SEEDED per-run (one envelope per prompt), not hard-coded into the
 * self-model. The TYPE registration is the deliverable; `PROMPT_ENVELOPE_INSTANCES`
 * is the empty seed and the paired test is a registration-resolves check (no
 * filesystem drift guard — there is no static seed source to diff against).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology PromptEnvelope ObjectType. */
export const PROMPT_ENVELOPE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/prompt-envelope",
);

/**
 * PromptEnvelope modeled as a Palantir ObjectType. `promptId` is the stable primary
 * key (minted at UserPromptSubmit); the descriptor properties mirror the
 * prompt-front-door envelope record (promptHash, approvalRef, sicApprovalCached).
 */
export const PROMPT_ENVELOPE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: PROMPT_ENVELOPE_OBJECT_TYPE_RID,
  apiName: "PromptEnvelope",
  name: "PromptEnvelope",
  description:
    "palantir-mini prompt-front-door envelope modeled as an ObjectType: the record " +
    "minted at UserPromptSubmit (promptId/promptHash) that carries the cached SIC " +
    "approval reference for the prompt. Identity (promptId) plus front-door facts " +
    "(promptHash, approvalRef, sicApprovalCached); instances are runtime-seeded " +
    "per prompt (lib/prompt-front-door/), not hard-coded in this self-model.",
  primaryKeyProperty: "promptId",
  titleProperty: "promptId",
  properties: [
    { name: "promptId", type: "string" },
    { name: "promptHash", type: "string" },
    { name: "approvalRef", type: "string", optional: true },
    { name: "sicApprovalCached", type: "boolean", optional: true },
  ],
};

/**
 * A registered PromptEnvelope instance — the front-door envelope record (promptId
 * identity plus the prompt-front-door facts). Instances are runtime-seeded per prompt.
 */
export interface PromptEnvelopeInstance {
  readonly promptId: string;
  readonly promptHash: string;
  readonly approvalRef?: string;
  readonly sicApprovalCached?: boolean;
}

/**
 * The PromptEnvelope instances — EMPTY by design (catalog §2 count = 0). Envelopes
 * are minted at runtime (one per prompt) by the prompt-front-door surface, so the
 * self-model registers the TYPE and leaves the seed empty; the paired test is a
 * registration-resolves check, not a filesystem drift guard.
 */
export const PROMPT_ENVELOPE_INSTANCES: readonly PromptEnvelopeInstance[] = [];

// Register the PromptEnvelope ObjectType (the type). The instance seed above is empty
// by design — envelopes are runtime-seeded per prompt; the type registration is the
// Wave-2 deliverable. This turns OBJECT_TYPE_REGISTRY.register-grep one higher.
OBJECT_TYPE_REGISTRY.register(PROMPT_ENVELOPE_OBJECT_TYPE);
