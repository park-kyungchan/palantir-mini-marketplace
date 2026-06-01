// palantir-mini — pm_intent_router fail-closed predicate tests (sprint-097 W5-A dtc-T5)
//
// Verifies the router fail-closed behavior per plan §8.2 + §8.3:
//   FC-A: Prompt A — ontology-affecting intent + typed-ref-present DTC → NOT contract_required
//   FC-B: Prompt B — ontology-affecting intent + NO DTC → contract_required + advisory event
//   FC-C: Prompt C — non-ontology-affecting intent + raw-intent → normal routing (no fail-closed)
//   FC-D: Bypass — PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1 → fail-closed predicate skipped
//           + router_fail_closed_bypass_invoked event emitted
//
// Rule cross-refs: rule 12 v3.13.0, plan §8.2.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { routeIntent } from "../../../bridge/handlers/pm-intent-router";
import type { IntentRouterInput } from "../../../bridge/handlers/pm-intent-router";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";
import {
  canonicalTerm,
  registrySnapshot,
  sourceSystemRef,
  sourceSystemTerm,
} from "../../../lib/semantic-consistency/registry";
import { resolveSemanticConsistency } from "../../../lib/semantic-consistency/resolver";
import type { SemanticConsistencyResolverOutput } from "../../../lib/semantic-consistency/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-router-fc-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function readEvents(
  project: string,
): Array<{
  type: string;
  payload?: Record<string, unknown>;
  withWhat?: Record<string, unknown>;
}> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

const routerFailClosedSource = sourceSystemRef({
  sourceSystemId: "router-fail-closed-fixture",
  kind: "repo",
  displayName: "Router fail-closed fixture",
  authorityRank: 100,
});
const hookTerm = canonicalTerm({
  displayName: "hook",
  definition: "Codex-side hook surface used for ontology drift detection.",
  ontologyKind: "Function",
  ontologyRef: "ontology://palantir-mini/function/OntologyDriftHook",
  approvalRef: "user:approved:fc-test",
});
const ontologyDriftTerm = canonicalTerm({
  displayName: "ontology drift",
  definition: "Detected mismatch between ontology source authority and runtime behavior.",
  ontologyKind: "ObjectType",
  ontologyRef: "ontology://palantir-mini/object/OntologyDriftSignal",
  approvalRef: "user:approved:fc-test",
});
const detectionTerm = canonicalTerm({
  displayName: "detection",
  definition: "Detection action for ontology drift evidence.",
  ontologyKind: "ActionType",
  ontologyRef: "ontology://palantir-mini/action/RegisterOntologyDriftDetection",
  approvalRef: "user:approved:fc-test",
});
const addTerm = canonicalTerm({
  displayName: "add",
  definition: "Additive implementation verb.",
  ontologyKind: "ActionType",
  approvalRef: "user:approved:fc-test",
});
const emitTerm = canonicalTerm({
  displayName: "emit",
  definition: "Emit deterministic hook evidence.",
  ontologyKind: "Function",
  approvalRef: "user:approved:fc-test",
});
const detectTerm = canonicalTerm({
  displayName: "detect",
  definition: "Detect ontology drift without widening existing hooks.",
  ontologyKind: "Function",
  approvalRef: "user:approved:fc-test",
});
const approvedSemanticConsistencyResult = resolveSemanticConsistency({
  sourceTerms: ["hook", "ontology drift", "detection", "add", "emit", "detect"].map(
    (term) =>
      sourceSystemTerm({
        sourceSystemRef: routerFailClosedSource,
        fieldPath: `approved-term:${term}`,
        rawTerm: term,
        evidenceRefs: ["test://pm-intent-router-fail-closed/fc-a"],
      }),
  ),
  registry: registrySnapshot({
    sourceSystems: [routerFailClosedSource],
    canonicalTerms: [
      hookTerm,
      ontologyDriftTerm,
      detectionTerm,
      addTerm,
      emitTerm,
      detectTerm,
    ],
  }),
});

// Canned approved contracts for Prompt A
function approvedSemanticContract(): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved:fc-test",
    status: "approved",
    rawIntent: "Add hook for ontology drift detection",
    confirmedIntent:
      "Add ontology drift detection hook — additive only, does not modify existing primitives.",
    nonGoals: ["Do not rewrite existing hooks."],
    approvedNouns: ["hook", "ontology drift", "detection"],
    approvedVerbs: ["add", "emit", "detect"],
    affectedSurfaces: ["hooks/ontology-drift-detect.ts"],
    permissionsAndProposal: "User approved this scope in plan §8.3.",
    acceptedRisks: [],
    downstreamAllowed: ["Route implementation to hook-builder."],
    downstreamForbidden: ["Do not widen scope to lib/lead-intent/."],
    clarificationQuestions: [],
    approvedCanonicalTermRefs: [...approvedSemanticConsistencyResult.canonicalTermRefs],
    approvedTermMappingRefs: approvedSemanticConsistencyResult.mappings.map(
      (mapping) => mapping.mappingId,
    ),
    semanticConsistencyResultRef: approvedSemanticConsistencyResult.resolverRunId,
    approvalRef: "user:approved:fc-test",
  };
}

function approvedDigitalTwinContract(): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:approved:fc-test",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:approved:fc-test",
    affectedSurfaces: ["hooks/ontology-drift-detect.ts"],
    changeBoundary: "New hook only — no existing hook modifications.",
    branchProposalPolicy: "One PR per hook addition.",
    permissionBoundary: "No changes outside hooks/.",
    replayMigrationPlan: "No replay migration required.",
    observabilityPlan: "Emit gate events per rule 10.",
    toolSurfaceReadiness: "WorkflowContract turn-card decision used to confirm scope.",
    evaluationPlan: "TypeScript, bun test, router smoke test.",
    touchedOntologyRefs: [
      {
        kind: "ObjectType",
        rid: "ontology://palantir-mini/object/OntologyDriftSignal",
        displayName: "OntologyDriftSignal",
        confidence: "exact",
      },
      {
        kind: "LinkType",
        rid: "ontology://palantir-mini/link/HookDetectsOntologyDrift",
        displayName: "HookDetectsOntologyDrift",
        confidence: "exact",
      },
      {
        kind: "ActionType",
        rid: "ontology://palantir-mini/action/RegisterOntologyDriftHook",
        displayName: "RegisterOntologyDriftHook",
        confidence: "exact",
      },
      {
        kind: "Function",
        rid: "ontology://palantir-mini/function/DetectOntologyDrift",
        displayName: "DetectOntologyDrift",
        confidence: "exact",
      },
    ],
    requiredEvaluationRefs: [
      {
        kind: "ValidationPack",
        rid: "project://palantir-mini/validation-pack/router-fail-closed",
        displayName: "router-fail-closed",
        project: "palantir-mini",
        confidence: "exact",
      },
    ],
    requiredBranchPolicyRef: {
      rid: "branch-policy://palantir-mini/router-fail-closed",
      displayName: "Router fail-closed proposal policy",
    },
    requiredPermissionPolicyRef: {
      rid: "permission-policy://palantir-mini/router-fail-closed",
      displayName: "Router fail-closed permission boundary",
    },
    semanticConsistencyRefs: [approvedSemanticConsistencyResult.resolverRunId],
    fillPolicy: "ontology-dtc-build",
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-06-01T00:00:00.000Z",
      source: "agent",
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: ["ontology://palantir-mini/object/OntologyDriftSignal"],
      linkTypeRefs: ["ontology://palantir-mini/link/HookDetectsOntologyDrift"],
      actionTypeRefs: ["ontology://palantir-mini/action/RegisterOntologyDriftHook"],
      functionRefs: ["ontology://palantir-mini/function/DetectOntologyDrift"],
      applicationStateRefs: ["application-state:ontology-drift-review"],
      evaluationRefs: ["project://palantir-mini/validation-pack/router-fail-closed"],
      semanticTermRefs: [
        approvedSemanticConsistencyResult.resolverRunId,
        ...approvedSemanticConsistencyResult.mappings.map((mapping) => mapping.mappingId),
      ],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    approvalRef: "user:approved:fc-test",
  };
}

function approvedContractEvidence(): {
  semanticIntentContract: SemanticIntentContract;
  digitalTwinChangeContract: DigitalTwinChangeContract;
  semanticConsistencyResult: SemanticConsistencyResolverOutput;
} {
  return {
    semanticIntentContract: approvedSemanticContract(),
    digitalTwinChangeContract: approvedDigitalTwinContract(),
    semanticConsistencyResult: approvedSemanticConsistencyResult,
  };
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS =
    process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"];
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"];
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  for (const key of [
    "PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS",
    "PALANTIR_MINI_PROJECT",
    "PALANTIR_MINI_EVENTS_FILE",
  ] as const) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ─── FC-A: Prompt A — ontology-affecting + typed-ref DTC present → normal routing ─────────────

describe("FC-A — ontology-affecting intent with approved typed-ref DTC present", () => {
  test("FC-A.1: inline contracts present → decision is NOT contract_required", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Add ontology hook for drift detection in hooks/ontology-drift-detect.ts",
      scopePaths: ["hooks/ontology-drift-detect.ts"],
      complexityHint: "single-file",
      ...approvedContractEvidence(),
    });

    // Must NOT be fail-closed when contracts are present
    expect(result.decision).not.toBe("contract_required");
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("ready-for-router");
    expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(true);
    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-A.2: unresolved contract refs block routing until dereferenced", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Implement ontology schema primitives for new hook pattern",
      scopePaths: ["schemas/ontology/primitives/new-hook-pattern.ts"],
      semanticIntentContractRef: "semantic-intent:approved:fc-a2-test",
      digitalTwinChangeContractRef: "digital-twin-change:approved:fc-a2-test",
    });

    expect(result.routingProjection.basis).toBe("unresolved-contract-refs");
    expect(result.contractGate.status).toBe("blocked_for_clarification");
    expect(result.decision).toBe("blocked_for_clarification");
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
    expect(result.ontologyDtcBuildReadinessGate?.checks["body-dereferenced"].valid).toBe(
      false,
    );
    expect(result.ontologyDtcBuildReadinessGate?.issues.map((issue) => issue.field)).toContain(
      "workContract",
    );
  });

  test("FC-A.3: basis is approved-inline-contracts when contracts are supplied", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Add ontology hook for drift detection in hooks/ontology-drift-detect.ts",
      scopePaths: ["hooks/ontology-drift-detect.ts"],
      ...approvedContractEvidence(),
    });

    expect(result.routingProjection.basis).toBe("approved-inline-contracts");
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("ready-for-router");
  });

  test("FC-A.4: unresolved-contract-refs basis when only raw refs are present", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Refactor ontology schemas to add new bridge handlers",
      scopePaths: ["bridge/handlers/new-handler.ts"],
      semanticIntentContractRef: "semantic-intent:approved:fc-a4",
      digitalTwinChangeContractRef: "digital-twin-change:approved:fc-a4",
    });

    expect(result.routingProjection.basis).toBe("unresolved-contract-refs");
    expect(result.decision).toBe("blocked_for_clarification");
  });
});

// ─── FC-B: Prompt B — ontology-affecting + NO DTC → contract_required + advisory event ────────

describe("FC-B — ontology-affecting intent with NO DTC → fail-closed", () => {
  test("FC-B.1: ontology-affecting intent without DTC returns contract_required", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Update ontology schema primitives and add a new bridge handler",
      scopePaths: ["bridge/handlers/new-ontology-handler.ts"],
    });

    expect(result.decision).toBe("contract_required");
    expect(result.routingProjection.basis).toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-B.2: fail-closed emits advisory event with raw_intent_ontology_affecting_fail_closed errorClass", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Refactor all ontology schema types in lib/lead-intent",
      scopePaths: ["lib/lead-intent/contracts.ts"],
    });

    const events = readEvents(project);
    const failClosedEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass ===
          "raw_intent_ontology_affecting_fail_closed",
    );
    expect(failClosedEvent).toBeDefined();
    expect((failClosedEvent?.payload as { passed?: boolean })?.passed).toBe(false);
    expect((failClosedEvent?.payload as { decision?: string })?.decision).toBe(
      "contract_required",
    );
    expect((failClosedEvent?.payload as { failClosedPredicate?: boolean })?.failClosedPredicate).toBe(true);
  });

  test("FC-B.3: fail-closed event routing basis is ontology-affecting-raw-intent-fail-closed", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Add new action type to the palantir-mini bridge handlers",
      scopePaths: ["bridge/handlers/new-action.ts"],
    });

    const events = readEvents(project);
    const failClosedEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass ===
          "raw_intent_ontology_affecting_fail_closed",
    );
    expect(
      (failClosedEvent?.payload as { routingBasis?: string })?.routingBasis,
    ).toBe("ontology-affecting-raw-intent-fail-closed");
  });

  test("FC-B.4: fail-closed result has undefined recipe (no dispatch instruction)", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Migrate all bridge handlers to v2 ontology contract signature",
      scopePaths: ["bridge/handlers/pm-semantic-intent-gate.ts"],
    });

    // Fail-closed → contract_required → no recipe dispatched
    expect(result.decision).toBe("contract_required");
    expect(result.recipe).toBeUndefined();
  });

  test("FC-B.5: fail-closed rationale mentions dtc-turn-fill instruction", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Refactor ontology primitive types for new bridge handler schema",
      scopePaths: ["lib/lead-intent/types.ts"],
    });

    expect(result.decision).toBe("contract_required");
    expect(result.rationale).toMatch(/FAIL-CLOSED|dtc-turn-fill|DTC|contract/i);
  });
});

// ─── FC-C: Prompt C — non-ontology-affecting intent → normal raw-intent routing ───────────────

describe("FC-C — non-ontology-affecting intent → no fail-closed", () => {
  test("FC-C.1: README paragraph addition → normal routing (raw-intent accepted)", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Add a paragraph to README explaining the sprint workflow",
      scopePaths: ["README.md"],
    });

    // Non-affecting intent → raw-intent basis is acceptable, no fail-closed
    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
    expect(result.decision).not.toBe("contract_required");
  });

  test("FC-C.2: trivial CHANGELOG typo fix → normal routing", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Fix typo in CHANGELOG.md",
      scopePaths: ["CHANGELOG.md"],
      complexityHint: "trivial",
    });

    expect(result.decision).toBe("lead-direct");
    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-C.3: non-ontology hook test addition → normal routing", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Add unit tests for the session-cleanup hook",
      scopePaths: ["tests/hooks/session-cleanup.test.ts"],
    });

    // Test files don't match SEMANTIC_SCOPE_MARKERS → not ontology-affecting → no fail-closed
    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-C.4: read-only triage intent is not fail-closed", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Read and triage the current session events",
      scopePaths: ["docs/sprint-notes.md"],
    });

    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-C.5: non-affecting + raw-intent basis → NO advisory fail-closed event emitted", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Update the sprint plan document with retrospective notes",
      scopePaths: ["docs/retro.md"],
    });

    const events = readEvents(project);
    const failClosedEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass ===
          "raw_intent_ontology_affecting_fail_closed",
    );
    expect(failClosedEvent).toBeUndefined();
  });
});

// ─── FC-D: Bypass — PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1 ───────────────────────────────

describe("FC-D — bypass envvar PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1", () => {
  test("FC-D.1: bypass set → fail-closed predicate skipped for ontology-affecting intent", async () => {
    const project = makeTmpProject();
    process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"] = "1";

    const result = await routeIntent({
      project,
      intent: "Update ontology schema primitives and add a new bridge handler",
      scopePaths: ["bridge/handlers/new-ontology-handler.ts"],
    });

    // With bypass, fail-closed predicate is skipped → basis stays raw-intent
    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
    // Decision should NOT be contract_required from fail-closed (may still be blocked
    // if assessContractGate fires, but NOT from our fail-closed predicate)
    expect(result.routingProjection.basis).not.toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-D.2: bypass emits router_fail_closed_bypass_invoked event", async () => {
    const project = makeTmpProject();
    process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"] = "1";

    await routeIntent({
      project,
      intent: "Refactor ontology schema types for bridge handler migration",
      scopePaths: ["bridge/handlers/pm-intent-router.ts"],
    });

    const events = readEvents(project);
    const bypassEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass ===
          "router_fail_closed_bypass_invoked",
    );
    expect(bypassEvent).toBeDefined();
    expect((bypassEvent?.payload as { passed?: boolean })?.passed).toBe(true);
    expect((bypassEvent?.payload as { bypassEnvVar?: string })?.bypassEnvVar).toBe(
      "PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS",
    );
  });

  test("FC-D.3: bypass unset → normal fail-closed behavior restored", async () => {
    const project = makeTmpProject();
    // Ensure bypass is NOT set
    delete process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"];

    const result = await routeIntent({
      project,
      intent: "Update ontology schema primitives and add a new bridge handler",
      scopePaths: ["bridge/handlers/new-ontology-handler.ts"],
    });

    // Without bypass, fail-closed predicate fires for ontology-affecting intent
    expect(result.decision).toBe("contract_required");
    expect(result.routingProjection.basis).toBe(
      "ontology-affecting-raw-intent-fail-closed",
    );
  });

  test("FC-D.4: bypass does NOT emit fail_closed advisory event", async () => {
    const project = makeTmpProject();
    process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"] = "1";

    await routeIntent({
      project,
      intent: "Refactor all ontology contracts to v2 format",
      scopePaths: ["lib/lead-intent/contracts.ts"],
    });

    const events = readEvents(project);
    const failClosedEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass ===
          "raw_intent_ontology_affecting_fail_closed",
    );
    // With bypass active, no fail-closed event should be emitted
    expect(failClosedEvent).toBeUndefined();
  });
});
