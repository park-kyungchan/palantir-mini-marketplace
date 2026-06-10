/**
 * Internal handler: ontology-context-approval-create
 *
 * Thin wrapper around lib/ontology-context/approval.ts:createOntologyContextApproval().
 * Performs input validation and returns a typed result envelope.
 *
 * Internal handler pattern: NOT registered in bridge/mcp-server.ts moduleMap and
 * NOT exposed as an MCP tool. Imported directly via TypeScript by callers:
 *   - bridge/handlers/pm-intent-router.ts (auto-low-risk approval path)
 *   - bridge/handlers/pm-lead-brief.ts   (lead-approved path, future)
 *   - bridge/handlers/pm-semantic-intent-gate.ts (user-approved path, future)
 *
 * This separation keeps the MCP surface stable while allowing TypeScript callers
 * to compose approval creation into their own routing logic without registering
 * a new tool in mcp-server.ts.
 *
 * Rule cross-refs:
 *   rule 07 §Plugin authority — file-ownership; handler files are hook-builder owned
 *   rule 10 (events.jsonl)   — emits phase_completed via lib helper
 *   Lead routing — pm_intent_router is the canonical single dispatch entry
 *
 * @since palantir-mini plugin v5.4.0 (foamy-giggling-kettle PR-4)
 */

import {
  createOntologyContextApproval,
  type CreateOntologyContextApprovalInput,
  type OntologyContextApproval,
  type OntologyContextApprovalKind,
} from "../../../lib/ontology-context/approval";

// ─── Input validation ────────────────────────────────────────────────────────

function validateInput(input: unknown): CreateOntologyContextApprovalInput {
  if (typeof input !== "object" || input === null) {
    throw new TypeError(
      "ontology-context-approval-create: input must be a non-null object",
    );
  }
  const raw = input as Record<string, unknown>;

  if (typeof raw["sourceQueryRef"] !== "string" || raw["sourceQueryRef"].length === 0) {
    throw new TypeError(
      "ontology-context-approval-create: `sourceQueryRef` is required (non-empty string)",
    );
  }
  if (
    typeof raw["universalOntologyEntryRef"] !== "string" ||
    raw["universalOntologyEntryRef"].length === 0
  ) {
    throw new TypeError(
      "ontology-context-approval-create: `universalOntologyEntryRef` is required (non-empty string)",
    );
  }
  if (typeof raw["approvalKind"] !== "string") {
    throw new TypeError(
      "ontology-context-approval-create: `approvalKind` is required (\"auto-low-risk\" | \"lead-approved\" | \"user-approved\")",
    );
  }
  const validKinds: OntologyContextApprovalKind[] = [
    "auto-low-risk",
    "lead-approved",
    "user-approved",
  ];
  if (!validKinds.includes(raw["approvalKind"] as OntologyContextApprovalKind)) {
    throw new TypeError(
      `ontology-context-approval-create: \`approvalKind\` must be one of ${validKinds.join(" | ")}; got "${raw["approvalKind"]}"`,
    );
  }
  if (typeof raw["approverIdentity"] !== "string" || raw["approverIdentity"].length === 0) {
    throw new TypeError(
      "ontology-context-approval-create: `approverIdentity` is required (non-empty string)",
    );
  }
  if (typeof raw["projectRoot"] !== "string" || raw["projectRoot"].length === 0) {
    throw new TypeError(
      "ontology-context-approval-create: `projectRoot` is required (non-empty absolute path)",
    );
  }

  return {
    sourceQueryRef: raw["sourceQueryRef"] as string,
    universalOntologyEntryRef: raw["universalOntologyEntryRef"] as string,
    approvedCapabilityRefs: Array.isArray(raw["approvedCapabilityRefs"])
      ? (raw["approvedCapabilityRefs"] as string[])
      : [],
    rejectedCapabilityRefs: Array.isArray(raw["rejectedCapabilityRefs"])
      ? (raw["rejectedCapabilityRefs"] as string[])
      : [],
    approvedSurfaceRefs: Array.isArray(raw["approvedSurfaceRefs"])
      ? (raw["approvedSurfaceRefs"] as string[])
      : [],
    forbiddenSurfaceRefs: Array.isArray(raw["forbiddenSurfaceRefs"])
      ? (raw["forbiddenSurfaceRefs"] as string[])
      : [],
    approvalKind: raw["approvalKind"] as OntologyContextApprovalKind,
    approverIdentity: raw["approverIdentity"] as string,
    projectRoot: raw["projectRoot"] as string,
    ...(typeof raw["approvedAt"] === "string" ? { approvedAt: raw["approvedAt"] } : {}),
    ...(typeof raw["promptId"] === "string" ? { promptId: raw["promptId"] } : {}),
    ...(typeof raw["promptHash"] === "string" ? { promptHash: raw["promptHash"] } : {}),
    ...(typeof raw["sessionId"] === "string" ? { sessionId: raw["sessionId"] } : {}),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export interface OntologyContextApprovalCreateResult {
  readonly approval: OntologyContextApproval;
  readonly approvalRef: string;
}

/**
 * Validate input and create an OntologyContextApproval record.
 * Throws TypeError on invalid input; delegates to createOntologyContextApproval()
 * for persistence + event emission.
 */
export async function ontologyContextApprovalCreate(
  rawInput: unknown,
): Promise<OntologyContextApprovalCreateResult> {
  const input = validateInput(rawInput);
  return createOntologyContextApproval(input);
}

export default ontologyContextApprovalCreate;
