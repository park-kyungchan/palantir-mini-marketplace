// palantir-mini — P2-1: transactional coupling of the per-concept session-keyed
// store and the project-scoped `current.json` pointer.
//
// The dual-write in `writeOntologyEngineeringWorkflowState` writes the same state to
// a session-keyed file (authoritative per-concept "envelope") AND to `current.json`
// (project-scoped active pointer, last-writer-wins across sessions). Before P2-1, a
// fresh snapshot-less `start` in a NON-minting session overwrote `current.json`
// snapshot-less, POISONING the pointer: the minted approved-SIC snapshot and the
// developer `sourceMutationApprovals` the gate reads from `current.json` silently
// vanished (per-concept approval desync). F3 made the cross-session READ fail-closed
// via `resolveProjectMintedSicSnapshot`, but left the pointer itself desynced.
//
// P2-1 reconciles ONLY the `current.json` copy so per-concept approval cannot desync:
//   - SIC snapshot: a snapshot-less write resolves the project's minted snapshot
//     BY-REF (F3-fail-closed on ambiguity), so the pointer never goes snapshot-less
//     while a minted snapshot exists.
//   - source-mutation approvals: unioned with any already on the pointer (the gate
//     re-verifies each against the captured envelope, so carry-forward only preserves).

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  readCurrentOntologyEngineeringWorkflowState,
  writeOntologyEngineeringWorkflowState,
  type OntologyEngineeringWorkflowState,
  type SourceMutationApprovalRecord,
} from "../../../lib/ontology-engineering-workflow";
import { isApprovedSemanticIntentContract } from "../../../lib/semantic-intent/approved-contract";
import { mintApprovedSemanticIntentContract } from "../../fixtures/minted-approved-sic";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-pointer-couple-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

const NOW = "2026-06-23T00:00:00.000Z";

function writeState(
  root: string,
  sessionId: string,
  opts: {
    readonly snapshot?: SemanticIntentContract;
    readonly approvals?: readonly SourceMutationApprovalRecord[];
  } = {},
): void {
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: `ontology-engineering-workflow:${sessionId}`,
    projectRoot: root,
    fdeSessionId: sessionId,
    fdeSessionRef: `fde-ontology-engineering://session/${sessionId}`,
    semanticIntentContractRef: opts.snapshot?.contractId,
    semanticIntentContractStatus: opts.snapshot !== undefined ? "approved" : undefined,
    digitalTwinChangeContractRef: "dtc:placeholder",
    digitalTwinChangeContractStatus: "approved",
    phase: "digital-twin-approved",
    allowedNextActions: ["status"],
    mutationAuthorized: false,
    sourceRefs: [`fde-ontology-engineering://session/${sessionId}`],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    ...(opts.snapshot !== undefined ? { approvedSemanticIntentContractSnapshot: opts.snapshot } : {}),
    ...(opts.approvals !== undefined ? { sourceMutationApprovals: opts.approvals } : {}),
    createdAt: NOW,
    updatedAt: NOW,
  };
  writeOntologyEngineeringWorkflowState(state);
}

function syntheticApproval(promptId: string, paths: readonly string[]): SourceMutationApprovalRecord {
  return {
    kind: "developer-source-mutation",
    approvedSourcePaths: paths,
    approvedAtPromptId: promptId,
    approvedPromptHash: `sha256:${promptId}`,
    sessionId: `front-door:${promptId}`,
    approvedAt: NOW,
    userQuote: "go ahead and edit those",
  } as unknown as SourceMutationApprovalRecord;
}

describe("current.json transactional coupling — per-concept approval cannot desync (P2-1)", () => {
  test("snapshot-less write does NOT poison current.json when a minted snapshot exists for the project", () => {
    const root = setupRoot("no-poison");
    const minted = mintApprovedSemanticIntentContract();

    // Session A mints + seeds current.json WITH the snapshot.
    writeState(root, "session-A", { snapshot: minted });
    // Session B is a fresh snapshot-less `start`. Under the bare dual-write this
    // overwrote current.json snapshot-less; P2-1 reconciles it back.
    writeState(root, "session-B");

    const current = readCurrentOntologyEngineeringWorkflowState(root);
    expect(current?.fdeSessionId).toBe("session-B"); // pointer still advances to the active session
    expect(current?.approvedSemanticIntentContractSnapshot).toBeDefined();
    expect(isApprovedSemanticIntentContract(current?.approvedSemanticIntentContractSnapshot)).toBe(true);
    expect(current?.approvedSemanticIntentContractSnapshot?.contractId).toBe(minted.contractId);
  });

  test("F3 — >=2 DISTINCT minted SICs and no matching ref ⇒ pointer stays snapshot-less (no wrong-concept bind)", () => {
    const root = setupRoot("ambiguous");
    const first = mintApprovedSemanticIntentContract();
    const second: SemanticIntentContract = {
      ...mintApprovedSemanticIntentContract(),
      contractId: "semantic-intent:concept-pointer-second",
    };
    expect(first.contractId).not.toBe(second.contractId);

    writeState(root, "session-first", { snapshot: first });
    writeState(root, "session-second", { snapshot: second });
    // Fresh start with NO SIC ref ⇒ ambiguous ⇒ fail-closed: no arbitrary snapshot.
    writeState(root, "session-third");

    expect(readCurrentOntologyEngineeringWorkflowState(root)?.approvedSemanticIntentContractSnapshot)
      .toBeUndefined();
  });

  test("an incoming snapshot always wins on the pointer (active concept's snapshot, not a resolved prior)", () => {
    const root = setupRoot("incoming-wins");
    const first = mintApprovedSemanticIntentContract();
    const second: SemanticIntentContract = {
      ...mintApprovedSemanticIntentContract(),
      contractId: "semantic-intent:concept-incoming-wins",
    };
    writeState(root, "session-first", { snapshot: first });
    writeState(root, "session-second", { snapshot: second });

    expect(readCurrentOntologyEngineeringWorkflowState(root)?.approvedSemanticIntentContractSnapshot?.contractId)
      .toBe(second.contractId);
  });

  test("source-mutation approvals survive a snapshot-/approvals-less write (gate reads them off current.json)", () => {
    const root = setupRoot("approvals-survive");
    const grant = syntheticApproval("prompt-1", ["hooks/**"]);

    // Session A persists a source-mutation grant onto current.json.
    writeState(root, "session-A", { approvals: [grant] });
    // Session B is a fresh `start` carrying NO approvals — must not erase the grant.
    writeState(root, "session-B");

    const current = readCurrentOntologyEngineeringWorkflowState(root);
    expect(current?.fdeSessionId).toBe("session-B");
    expect(current?.sourceMutationApprovals?.length).toBe(1);
    expect(current?.sourceMutationApprovals?.[0]?.approvedAtPromptId).toBe("prompt-1");
  });

  test("approvals union across writes is deduped by (promptId, hash, scope)", () => {
    const root = setupRoot("approvals-dedup");
    const grant = syntheticApproval("prompt-shared", ["hooks/**"]);
    const grant2 = syntheticApproval("prompt-other", ["skills/**"]);

    writeState(root, "session-A", { approvals: [grant] });
    // Re-assert the same grant + a new distinct one; union keeps two, not three.
    writeState(root, "session-B", { approvals: [grant, grant2] });

    const current = readCurrentOntologyEngineeringWorkflowState(root);
    expect(current?.sourceMutationApprovals?.length).toBe(2);
    const ids = (current?.sourceMutationApprovals ?? []).map((r) => r.approvedAtPromptId).sort();
    expect(ids).toEqual(["prompt-other", "prompt-shared"]);
  });
});
