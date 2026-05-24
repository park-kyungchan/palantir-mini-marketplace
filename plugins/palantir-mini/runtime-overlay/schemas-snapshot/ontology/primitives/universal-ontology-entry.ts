/**
 * @stable — UniversalOntologyEntry primitive (prim-learn-28, v1.54.0)
 *
 * Promotes the UniversalOntologyEntry type shape from the palantir-mini plugin
 * (lib/ontology-entry/universal-entry.ts) to schema-level authority.
 *
 * This file contains TYPE SHAPE ONLY — no classifier logic, no loader, no
 * createUniversalOntologyEntry() factory. Those remain in the plugin
 * (lib/ontology-entry/universal-entry.ts) which depends on crypto + PromptRuntime.
 *
 * PromptRuntime is defined in approval-ref.ts which is already at schemas level,
 * so UniversalOntologyEntry can reference it here without plugin imports.
 *
 * Authority chain: research/ → schemas/ (this file) → shared-core/ →
 * plugin lib (createUniversalOntologyEntry + transitionUniversalOntologyEntry) →
 * callers (hooks + handlers).
 *
 * Promoted at: v1.54.0 (foamy-giggling-kettle PR-3).
 *
 * @owner palantirkc-ontology
 * @since v1.54.0
 */

import type { PromptRuntime } from "./approval-ref";

export const UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION =
  "palantir-mini/universal-ontology-entry/v1" as const;

/**
 * Kind of user request captured by a UniversalOntologyEntry.
 * Classifier lives in plugin; this enum is schema-authoritative.
 */
export type UniversalRequestKind =
  | "question"
  | "analysis"
  | "planning"
  | "implementation"
  | "debugging"
  | "content-authoring"
  | "review"
  | "release";

/**
 * Status lifecycle of a UniversalOntologyEntry.
 * Transitions are performed by transitionUniversalOntologyEntry() in plugin lib.
 *
 * Valid forward transitions:
 *   captured → context-retrieved → clarifying | semantic-approved
 *   semantic-approved → dtc-required | routed
 *   clarifying → semantic-approved
 */
export type UniversalOntologyEntryStatus =
  | "captured"
  | "context-retrieved"
  | "clarifying"
  | "semantic-approved"
  | "dtc-required"
  | "routed";

/**
 * Canonical schema shape for a UniversalOntologyEntry.
 * Created by the plugin's createUniversalOntologyEntry() factory;
 * transitioned by transitionUniversalOntologyEntry() in plugin lib.
 */
export interface UniversalOntologyEntry {
  readonly entryId: string;
  readonly schemaVersion: typeof UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION;
  readonly createdAt: string;
  /** updatedAt is set on every status transition. */
  readonly updatedAt?: string;

  readonly prompt: {
    readonly promptId?: string;
    readonly promptHash?: string;
    readonly sessionId?: string;
    readonly runtime?: PromptRuntime;
    readonly excerpt: string;
  };

  readonly project: {
    readonly projectRoot: string;
    readonly candidateProjectIds: readonly string[];
  };

  readonly classification: {
    readonly requestKind: UniversalRequestKind;
    readonly mutationExpected: boolean;
    readonly learnerVisible: boolean;
    readonly requiresDtc: boolean;
    readonly canProceedReadOnly: boolean;
  };

  readonly ontologySeed: {
    readonly nouns: readonly string[];
    readonly verbs: readonly string[];
    readonly surfaceHints: readonly string[];
    readonly capabilityHints: readonly string[];
  };

  readonly status: UniversalOntologyEntryStatus;
}

/**
 * Type guard for schema version literal.
 */
export function isUniversalOntologyEntrySchemaVersionV1(
  candidate: unknown,
): candidate is typeof UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION {
  return candidate === UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION;
}

/**
 * Type guard for UniversalOntologyEntry.
 */
export function isUniversalOntologyEntry(
  candidate: unknown,
): candidate is UniversalOntologyEntry {
  if (typeof candidate !== "object" || candidate === null) return false;
  const entry = candidate as UniversalOntologyEntry;
  return (
    entry.schemaVersion === UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION &&
    typeof entry.entryId === "string" &&
    entry.entryId.length > 0 &&
    typeof entry.status === "string"
  );
}

// --- Foundry equivalence (prompt-front-door ontology capture entry) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "Prompt-capture + lifecycle-state entry for palantir-mini's Universal Ontology layer; no direct Foundry object-type equivalent (it is a control-plane substrate primitive).",
};
export { categoryFoundryEquivalent as universalOntologyEntryFoundryEquivalent };
