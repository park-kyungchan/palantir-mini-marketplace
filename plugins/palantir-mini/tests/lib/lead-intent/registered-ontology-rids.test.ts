// Improvement #4 — production-caller wiring for the 0-new-term DYNAMIC re-bind lane.
// Proves the LIVE-snapshot derivation feeds the readiness gate so the lane actually
// ACTIVATES on a real register-shaped snapshot, and FAIL-CLOSES (legacy) when the
// snapshot is unavailable. Body-validity of the SIC/DTC (a UNIVERSAL check) is built
// genuinely here so the ONLY thing the rebind relaxes is the construction artifacts.

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { deriveRegisteredOntologyRids } from "../../../lib/lead-intent/registered-ontology-rids";
import {
  assessOntologyDtcBuildReadinessGate,
  isZeroNewTermRebind,
} from "../../../lib/lead-intent/contracts";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";
import { advanceOntologyDTCBuildSequence } from "../../../lib/semantic-intent/ontology-dtc-build-sequence";
import {
  canonicalTerm,
  registrySnapshot,
  sourceSystemRef,
  sourceSystemTerm,
} from "../../../lib/semantic-consistency/registry";
import { resolveSemanticConsistency } from "../../../lib/semantic-consistency/resolver";

const tmpDirs: string[] = [];

// --- Build a genuinely body-valid approved SIC + DTC (mirrors contracts.test.ts) ---
const src = sourceSystemRef({
  sourceSystemId: "rebind-fixture",
  kind: "repo",
  displayName: "Rebind fixture",
  authorityRank: 100,
});
const scr = resolveSemanticConsistency({
  sourceTerms: [
    sourceSystemTerm({ sourceSystemRef: src, rawTerm: "Scene3D", evidenceRefs: ["semantic-intent:rebind"] }),
  ],
  registry: registrySnapshot({
    sourceSystems: [src],
    canonicalTerms: [
      canonicalTerm({
        displayName: "Scene3D",
        definition: "Existing Scene3D primitive.",
        ontologyKind: "ObjectType",
        ontologyRef: "ri.ontology.main.object-type.scene3d",
        approvalRef: "user:approved:test",
      }),
    ],
  }),
});

function approvedSemantic(): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:rebind",
    status: "approved",
    rawIntent: "Re-bind Scene3D",
    confirmedIntent: "Re-elevate the existing Scene3D primitive.",
    nonGoals: ["Do not add new primitives."],
    approvedNouns: ["Scene3D"],
    approvedVerbs: ["author"],
    affectedSurfaces: ["ontology/data/visual3D.ts"],
    approvedCanonicalTermRefs: [...scr.canonicalTermRefs],
    approvedTermMappingRefs: scr.mappings.map((m) => m.mappingId),
    semanticConsistencyResultRef: scr.resolverRunId,
    permissionsAndProposal: "Re-bind via proposal PR.",
    acceptedRisks: [],
    downstreamAllowed: ["Route after DTC approval."],
    downstreamForbidden: ["No new primitives."],
    clarificationQuestions: [],
    approvalRef: "user:approved:test",
  };
}

function approvedRebindDtc(): DigitalTwinChangeContract {
  let dtc: DigitalTwinChangeContract = {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin:rebind",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:rebind",
    affectedSurfaces: ["ontology/data/visual3D.ts"],
    changeBoundary: "Re-bind Scene3D only.",
    branchProposalPolicy: "Use proposal PR before merge.",
    permissionBoundary: "No production publish without QA signoff.",
    replayMigrationPlan: "No migration; re-bind of an existing primitive.",
    observabilityPlan: "Emit contract gate events.",
    toolSurfaceReadiness: "No new tool surface.",
    evaluationPlan: "Existing eval pack re-run.",
    touchedOntologyRefs: [
      { kind: "ObjectType", rid: "ri.ontology.main.object-type.scene3d", confidence: "exact" },
    ],
    requiredEvaluationRefs: [
      { kind: "ValidationPack", rid: "ri.ontology.main.validation-pack.scene3d-v1", confidence: "exact" },
    ],
    semanticConsistencyRefs: [scr.resolverRunId],
    risks: [],
    approvalRef: "user:approved:test",
  };
  const originalAffected = dtc.affectedSurfaces;
  dtc = advanceOntologyDTCBuildSequence(dtc, 0, "ObjectType:PluginCapability").dtcDraft;
  dtc = advanceOntologyDTCBuildSequence(dtc, 1, "LinkType:l").dtcDraft;
  dtc = advanceOntologyDTCBuildSequence(dtc, 2, "ActionType:a").dtcDraft;
  dtc = advanceOntologyDTCBuildSequence(dtc, 3, "Function:f").dtcDraft;
  dtc = advanceOntologyDTCBuildSequence(dtc, 4, "ApplicationState:s").dtcDraft;
  dtc = advanceOntologyDTCBuildSequence(dtc, 5, "R | O | E || ValidationPack:v").dtcDraft;
  dtc = advanceOntologyDTCBuildSequence(
    dtc,
    6,
    ["ready-for-dtc", scr.resolverRunId, ...scr.mappings.map((m) => m.mappingId)].join(","),
  ).dtcDraft;
  // GATE-LEVEL construction-build governance evidence intentionally ABSENT: branch +
  // permission policy refs are NOT set, so readiness is reachable ONLY if the rebind
  // relaxes them. (requiredEvaluationRefs is kept — it is a body-validity field.)
  return { ...dtc, affectedSurfaces: originalAffected };
}

// Register a real register-shaped events.jsonl committing the given rids.
function makeTmpProjectRegistering(rids: string[]): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-rebind-wire-"));
  tmpDirs.push(project);
  const sessionDir = path.join(project, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const event = JSON.stringify({
    eventId: "evt-1",
    sequence: 1,
    type: "edit_committed",
    when: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    atopWhich: { commitSha: "abc" },
    throughWhich: { sessionId: "s", toolName: "t", cwd: "c" },
    byWhom: { agentName: "t", identity: "claude-code" },
    decision: {
      atopWhich: { commitSha: "abc" },
      throughWhich: { surface: "t", tool: "t" },
      byWhom: { agent: "t", identity: "claude-code" },
      withWhat: { reasoning: "register fixture" },
    },
    payload: {
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      appliedEdits: rids.map((rid) => ({
        kind: "object",
        rid,
        properties: { primitiveKind: "ObjectType", plainName: rid },
      })),
      submissionCriteriaPassed: [],
    },
  });
  fs.writeFileSync(path.join(sessionDir, "events.jsonl"), event + "\n");
  return project;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("deriveRegisteredOntologyRids — production wiring", () => {
  test("real snapshot registering every touched rid ⇒ readiness gate ACTIVATES the re-bind lane", async () => {
    const semantic = approvedSemantic();
    const digitalTwin = approvedRebindDtc();
    const touchedRids = (digitalTwin.touchedOntologyRefs ?? []).map((r) => r.rid);
    const project = makeTmpProjectRegistering(touchedRids);

    const registeredOntologyRids = await deriveRegisteredOntologyRids(project);
    // 1. Live snapshot really yielded the registered rids (not a guessed list).
    expect(registeredOntologyRids).toBeDefined();
    for (const rid of touchedRids) expect(registeredOntologyRids).toContain(rid);

    // 2. Predicate true on the same structural truth.
    expect(
      isZeroNewTermRebind({ digitalTwinChangeContract: digitalTwin, registeredOntologyRids }),
    ).toBe(true);

    // 3. Gate ready WITHOUT WorkContract / RouterBinding / branch+permission policy
    //    refs — because the LIVE-derived rids activate the lane. Universal checks
    //    (SIC/DTC body validity + approval-ref) still passed on their own merits.
    const gate = assessOntologyDtcBuildReadinessGate({
      semanticIntentContractRef: semantic.contractId,
      digitalTwinChangeContractRef: digitalTwin.contractId,
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      registeredOntologyRids,
    });
    expect(gate.readyForRouter).toBe(true);
    expect(gate.checks["body-validated"].valid).toBe(true);
    expect(gate.checks["approval-ref-present"].valid).toBe(true);
    expect(gate.checks["work-contract-valid"].valid).toBe(true);
    expect(gate.checks["router-binding-valid"].valid).toBe(true);
  });

  test("missing project ⇒ undefined (fail-closed) ⇒ predicate false ⇒ full gate (legacy)", async () => {
    const rids = await deriveRegisteredOntologyRids(undefined);
    expect(rids).toBeUndefined();

    const semantic = approvedSemantic();
    const digitalTwin = approvedRebindDtc();
    expect(
      isZeroNewTermRebind({ digitalTwinChangeContract: digitalTwin, registeredOntologyRids: rids }),
    ).toBe(false);

    const gate = assessOntologyDtcBuildReadinessGate({
      semanticIntentContractRef: semantic.contractId,
      digitalTwinChangeContractRef: digitalTwin.contractId,
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      registeredOntologyRids: rids,
    });
    // Construction-only blockers fire again (branch + permission policy refs absent).
    expect(gate.readyForRouter).toBe(false);
    const fields = gate.issues.map((i) => i.field);
    expect(fields).toContain("digitalTwinChangeContract.requiredBranchPolicyRef");
    expect(fields).toContain("digitalTwinChangeContract.requiredPermissionPolicyRef");
  });

  test("project with no events.jsonl ⇒ empty registry ⇒ touched rid is NEW ⇒ NOT a rebind", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-rebind-empty-"));
    tmpDirs.push(project);
    const rids = await deriveRegisteredOntologyRids(project);
    expect(rids).toEqual([]);

    const digitalTwin = approvedRebindDtc();
    expect(
      isZeroNewTermRebind({ digitalTwinChangeContract: digitalTwin, registeredOntologyRids: rids }),
    ).toBe(false);
  });
});
