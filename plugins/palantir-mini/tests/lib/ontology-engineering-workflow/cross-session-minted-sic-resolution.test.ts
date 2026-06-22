// palantir-mini — bd-011 (P0-2): cross-session minted-SIC resolution BY-REF.
//
// The MINTED approved-SIC snapshot is persisted ONLY onto the MINTING session's
// session-keyed state. A fresh `start` in a NON-minting session writes a
// snapshot-less session file AND overwrites `current.json` (last-writer-wins), so
// neither the active session-keyed read nor `current.json` can see the snapshot.
// `resolveProjectMintedSicSnapshot` scans the projectRoot store dir and returns the
// minted snapshot the session-keyed + current.json reads miss. The CALLER still
// re-verifies via `isApprovedSemanticIntentContract` (fail-closed) — this resolver
// only widens the READ scope, it does not validate.

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  resolveProjectMintedSicSnapshot,
  writeOntologyEngineeringWorkflowState,
  type OntologyEngineeringWorkflowState,
} from "../../../lib/ontology-engineering-workflow";
import { isApprovedSemanticIntentContract } from "../../../lib/semantic-intent/approved-contract";
import { mintApprovedSemanticIntentContract } from "../../fixtures/minted-approved-sic";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-xsession-sic-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

const NOW = "2026-06-22T00:00:00.000Z";

/** Persist a workflow state keyed to `sessionId`, optionally carrying a minted snapshot. */
function writeState(
  root: string,
  sessionId: string,
  snapshot?: SemanticIntentContract,
): void {
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: `ontology-engineering-workflow:${sessionId}`,
    projectRoot: root,
    fdeSessionId: sessionId,
    fdeSessionRef: `fde-ontology-engineering://session/${sessionId}`,
    semanticIntentContractRef: snapshot?.contractId,
    semanticIntentContractStatus: snapshot !== undefined ? "approved" : undefined,
    digitalTwinChangeContractRef: "dtc:placeholder",
    digitalTwinChangeContractStatus: "approved",
    phase: "digital-twin-approved",
    allowedNextActions: ["status"],
    mutationAuthorized: false,
    sourceRefs: [`fde-ontology-engineering://session/${sessionId}`],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    ...(snapshot !== undefined ? { approvedSemanticIntentContractSnapshot: snapshot } : {}),
    createdAt: NOW,
    updatedAt: NOW,
  };
  writeOntologyEngineeringWorkflowState(state);
}

describe("resolveProjectMintedSicSnapshot — cross-session minted-SIC BY-REF (bd-011 / P0-2)", () => {
  test("cross-session resolve: finds the minting-session snapshot that session-keyed + current.json reads miss", () => {
    const root = setupRoot("resolve");
    const minted = mintApprovedSemanticIntentContract();

    // Session A is the MINTING session — its session-keyed state carries the snapshot,
    // and its dual-write also seeds current.json (with the snapshot).
    writeState(root, "session-A", minted);
    // Session B is a FRESH non-minting `start`: snapshot-less session file, AND its
    // dual-write OVERWRITES current.json snapshot-less (last-writer-wins, poisoning it).
    writeState(root, "session-B", undefined);

    const resolved = resolveProjectMintedSicSnapshot(root);
    expect(resolved).toBeDefined();
    expect(isApprovedSemanticIntentContract(resolved)).toBe(true);
    expect(resolved?.contractId).toBe(minted.contractId);
  });

  test("prefer-by-ref: binds to the snapshot whose contractId matches the active SIC ref, not an arbitrary prior", () => {
    const root = setupRoot("prefer");
    // Two GENUINELY-minted snapshots with DISTINCT contractIds. The fixture derives a
    // fixed contractId from its intent, so re-key the second onto a distinct contractId
    // while preserving the unforgeable minted approvalRef (still passes the gate).
    const first = mintApprovedSemanticIntentContract();
    const second: SemanticIntentContract = {
      ...mintApprovedSemanticIntentContract(),
      contractId: "semantic-intent:concept-second",
    };
    expect(first.contractId).not.toBe(second.contractId);
    expect(isApprovedSemanticIntentContract(second)).toBe(true);

    writeState(root, "session-first", first);
    writeState(root, "session-second", second);

    const resolved = resolveProjectMintedSicSnapshot(root, second.contractId);
    expect(resolved?.contractId).toBe(second.contractId);
    expect(isApprovedSemanticIntentContract(resolved)).toBe(true);
  });

  test("F3 — >=2 DISTINCT minted SICs and no preferContractId ⇒ undefined (fail-closed, no wrong-concept bind)", () => {
    const root = setupRoot("ambiguous");
    const first = mintApprovedSemanticIntentContract();
    const second: SemanticIntentContract = {
      ...mintApprovedSemanticIntentContract(),
      contractId: "semantic-intent:concept-ambiguous-second",
    };
    expect(first.contractId).not.toBe(second.contractId);

    writeState(root, "session-first", first);
    writeState(root, "session-second", second);

    // No preferContractId ⇒ ambiguous ⇒ fail-closed rather than returning a first-match.
    expect(resolveProjectMintedSicSnapshot(root)).toBeUndefined();

    // But supplying the ref still binds (the prefer-by-ref branch is unaffected).
    expect(resolveProjectMintedSicSnapshot(root, second.contractId)?.contractId).toBe(
      second.contractId,
    );
  });

  test("F3 — same contractId across multiple session files is NOT ambiguous ⇒ still resolves (single-SIC resume preserved)", () => {
    const root = setupRoot("dup-same-id");
    const minted = mintApprovedSemanticIntentContract();
    // Two session files carrying the SAME minted contractId (one distinct concept).
    writeState(root, "session-A", minted);
    writeState(root, "session-B", minted);

    const resolved = resolveProjectMintedSicSnapshot(root);
    expect(resolved?.contractId).toBe(minted.contractId);
    expect(isApprovedSemanticIntentContract(resolved)).toBe(true);
  });

  test("no snapshot anywhere ⇒ undefined (fail-closed; the caller's gate then refuses)", () => {
    const root = setupRoot("none");
    writeState(root, "session-A", undefined);
    writeState(root, "session-B", undefined);
    expect(resolveProjectMintedSicSnapshot(root)).toBeUndefined();
  });

  test("no store dir ⇒ undefined (no throw)", () => {
    expect(resolveProjectMintedSicSnapshot("/nonexistent-projectroot-xyz")).toBeUndefined();
  });
});
