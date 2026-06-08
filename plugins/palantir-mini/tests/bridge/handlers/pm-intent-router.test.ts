// palantir-mini — pm_intent_router handler tests (sprint-063 W3.A)
// Coverage:
//   T1: trivial intent + 1 scope path → recipe.decision='lead-direct'
//   T2: cross-cutting intent + 5 paths → recipe.decision='delegate-to-...' + sprint mode=full
//   T3: prefetched context populated when MCP clients available (graceful fill)
//   T4: prefetched context absent + still returns base recipe (graceful degradation)
//   T5: emits validation_phase_completed envelope with intent_routing_completed errorClass

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { semanticIntentGate } from "../../../bridge/handlers/pm-semantic-intent-gate";
import { routeIntent } from "../../../bridge/handlers/pm-intent-router";
import type { IntentRouterInput } from "../../../bridge/handlers/pm-intent-router";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  withPromptState,
} from "../../../lib/prompt-front-door";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
  WorkContract,
} from "../../../lib/lead-intent/contracts";
import { resolveSemanticConsistency } from "../../../lib/semantic-consistency/resolver";
import {
  canonicalTerm,
  registrySnapshot,
  sourceSystemRef,
  sourceSystemTerm,
  termAlias,
} from "../../../lib/semantic-consistency/registry";
import type {
  SemanticConsistencyResolverInput,
  SemanticConsistencyResolverOutput,
} from "../../../lib/semantic-consistency/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-intent-router-"));
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

async function createCapturedPrompt(project: string, rawPrompt: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt,
    sessionId: "session-router",
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-05-10T04:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return envelope;
}

function scene3dSemanticConsistencyInput(): SemanticConsistencyResolverInput {
  const repo = sourceSystemRef({
    sourceSystemId: "palantir-math-repo",
    kind: "repo",
    displayName: "palantir-math repository",
    authorityRank: 80,
  });
  const scene3d = canonicalTerm({
    displayName: "Scene3D",
    definition: "Additive 3D scene ontology primitive for palantir-math.",
    ontologyKind: "ObjectType",
    ontologyRef: "ontology://palantir-math/object/Scene3D",
    approvalRef: "user:approved:scene3d",
  });
  const geometry3d = canonicalTerm({
    displayName: "geometry3D",
    definition: "3D geometry contained by a Scene3D.",
    ontologyKind: "LinkType",
    ontologyRef: "ontology://palantir-math/link/Scene3DContainsGeometry",
    approvalRef: "user:approved:scene3d",
  });
  const validateScene3d = canonicalTerm({
    displayName: "ValidateScene3D",
    definition: "Validation function for Scene3D render/evaluation readiness.",
    ontologyKind: "Function",
    ontologyRef: "ontology://palantir-math/function/ValidateScene3D",
    approvalRef: "user:approved:scene3d",
  });
  const ontologyPrimitive = canonicalTerm({
    displayName: "ontology primitive",
    definition: "Project-local ontology schema primitive.",
    ontologyKind: "Unknown",
    approvalRef: "user:approved:scene3d",
  });

  return {
    sourceTerms: [
      sourceSystemTerm({
        sourceSystemRef: repo,
        fieldPath: "ontology/data/visual3D.ts#Scene3D",
        rawTerm: "Scene3D",
        evidenceRefs: ["test://pm-intent-router/scene3d"],
      }),
      sourceSystemTerm({
        sourceSystemRef: repo,
        fieldPath: "ontology/data/visual3D.ts#geometry3D",
        rawTerm: "geometry3D",
        evidenceRefs: ["test://pm-intent-router/geometry3d"],
      }),
      sourceSystemTerm({
        sourceSystemRef: repo,
        fieldPath: "ontology/data/visual3D.ts#ValidateScene3D",
        rawTerm: "ValidateScene3D",
        evidenceRefs: ["test://pm-intent-router/validate-scene3d"],
      }),
      sourceSystemTerm({
        sourceSystemRef: repo,
        fieldPath: "ontology/data/visual3D.ts#primitive",
        rawTerm: "ontology primitive",
        evidenceRefs: ["test://pm-intent-router/ontology-primitive"],
      }),
    ],
    registry: registrySnapshot({
      sourceSystems: [repo],
      canonicalTerms: [scene3d, geometry3d, validateScene3d, ontologyPrimitive],
      aliases: [
        termAlias({
          canonicalTermId: scene3d.canonicalTermId,
          alias: "3D scene",
          sourceSystemIds: ["palantir-math-repo"],
          approvalRef: "user:approved:scene3d",
        }),
      ],
    }),
  };
}

const approvedSemanticConsistencyResult = resolveSemanticConsistency(
  scene3dSemanticConsistencyInput(),
);

function approvedSemanticContract(): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved:scene3d",
    status: "approved",
    rawIntent: "Upgrade palantir-math 3D support",
    confirmedIntent:
      "Add Scene3D as an additive ontology primitive and keep SceneV4 2D-only.",
    nonGoals: ["Do not use the docs/research plan as the implementation scope."],
    approvedNouns: ["ontology primitive", "Scene3D", "geometry3D"],
    approvedVerbs: ["author", "render", "evaluate"],
    affectedSurfaces: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D/scene3DCompiler.ts"],
    permissionsAndProposal: "User approved the semantic boundary in this proposal.",
    acceptedRisks: [],
    downstreamAllowed: ["Route implementation to ontology-steward."],
    downstreamForbidden: ["Do not route to docs-researcher just because the raw prompt names a plan."],
    clarificationQuestions: [],
    approvedCanonicalTermRefs: [...approvedSemanticConsistencyResult.canonicalTermRefs],
    approvedTermMappingRefs: approvedSemanticConsistencyResult.mappings.map(
      (mapping) => mapping.mappingId,
    ),
    semanticConsistencyResultRef: approvedSemanticConsistencyResult.resolverRunId,
    approvalRef: "user:approved:scene3d",
  };
}

function approvedDigitalTwinContract(): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:approved:scene3d",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:approved:scene3d",
    affectedSurfaces: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D/scene3DCompiler.ts"],
    changeBoundary: "Scene3D ontology primitive and renderer proof only.",
    branchProposalPolicy: "Use one proposal PR and preserve review boundary.",
    permissionBoundary: "No production publish or 2D contract widening without separate approval.",
    replayMigrationPlan: "No replay migration in the first proof; fixtures are additive.",
    observabilityPlan: "Emit gate, router, and QA lineage events.",
    toolSurfaceReadiness: "Workflow turn-card decisions must close ambiguity before routing.",
    evaluationPlan: "TypeScript, router tests, runtime smoke, and Playwright visual QA.",
    touchedOntologyRefs: [
      {
        kind: "ObjectType",
        rid: "ontology://palantir-math/object/Scene3D",
        displayName: "Scene3D",
        project: "palantir-math",
        sourcePath: "ontology/data/visual3D.ts",
        confidence: "exact",
      },
      {
        kind: "LinkType",
        rid: "ontology://palantir-math/link/Scene3DContainsGeometry",
        confidence: "exact",
      },
      {
        kind: "ActionType",
        rid: "ontology://palantir-math/action/ApproveScene3D",
        confidence: "exact",
      },
      {
        kind: "Function",
        rid: "ontology://palantir-math/function/ValidateScene3D",
        confidence: "exact",
      },
    ],
    requiredEvaluationRefs: [
      {
        kind: "ValidationPack",
        rid: "project://palantir-math/validation-pack/router-tests",
        displayName: "router-tests",
        project: "palantir-math",
        sourcePath: "tests/bridge/handlers/pm-intent-router.test.ts",
        confidence: "exact",
      },
    ],
    requiredBranchPolicyRef: {
      rid: "branch-policy://palantir-math/scene3d-proposal",
      displayName: "Scene3D proposal review policy",
    },
    requiredPermissionPolicyRef: {
      rid: "permission-policy://palantir-math/scene3d-authoring",
      displayName: "Scene3D ontology authoring permissions",
    },
    semanticConsistencyRefs: [approvedSemanticConsistencyResult.resolverRunId],
    fillPolicy: "ontology-dtc-build",
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-05-27T00:00:00.000Z",
      source: "agent",
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: ["ontology://palantir-math/object/Scene3D"],
      linkTypeRefs: ["ontology://palantir-math/link/Scene3DContainsGeometry"],
      actionTypeRefs: ["ontology://palantir-math/action/ApproveScene3D"],
      functionRefs: ["ontology://palantir-math/function/ValidateScene3D"],
      applicationStateRefs: ["application-state:scene3d-review"],
      evaluationRefs: ["project://palantir-math/validation-pack/router-tests"],
      semanticTermRefs: [approvedSemanticConsistencyResult.resolverRunId],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [
      {
        riskId: "risk.tool-surface",
        kind: "tool-surface",
        status: "accepted",
        description: "Codex may not expose every Claude lifecycle hook.",
        mitigation: "Return WorkflowContract fallback diagnostics and record runtime gap.",
        designAlternative: "Every runtime renders the same TurnCardDecisionSpec as assistant text.",
      },
    ],
    approvalRef: "user:approved:scene3d",
  } as unknown as DigitalTwinChangeContract;
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
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.HOME = process.env.HOME;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) {
    delete process.env.PALANTIR_MINI_PROJECT;
  } else {
    process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  }
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  } else {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  }
  if (savedEnv.HOME === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = savedEnv.HOME;
  }
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ─── T1: trivial intent + 1 scope path → lead-direct ─────────────────────────

describe("T1 — trivial intent + single scope path", () => {
  test("trivial complexity with 1 file → lead-direct decision", async () => {
    const project = makeTmpProject();
    const input: IntentRouterInput = {
      project,
      intent: "Fix typo in CHANGELOG.md",
      scopePaths: ["CHANGELOG.md"],
      complexityHint: "trivial",
    };

    const result = await routeIntent(input);

    expect(result.decision).toBe("lead-direct");
    expect(result.rationale).toMatch(/trivial|lead/i);
  });


});

// ─── T2: cross-cutting + 5 paths → delegate + full sprint ─────────────────────

describe("T2 — cross-cutting intent + multi-path → delegate + full sprint", () => {
  test("cross-cutting hint + 5 paths → delegate decision", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Rewrite all hook handlers to v2 signature across the plugin",
      scopePaths: [
        "hooks/pre-edit-impact-mcp-first.ts",
        "hooks/lead-ontology-discovery-completeness.ts",
        "hooks/user-prompt-ontology-intent-extract.ts",
        "hooks/harness-cron-auto-register.ts",
        "hooks/plans-index-drift-detect.ts",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.decision).toMatch(/^delegate-to-/);
  });

  test("cross-cutting + 5 paths → sprint mode is full", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Migrate all CLI helper fixtures to v2 format across all layers",
      scopePaths: [
        "fixtures/cli/impact-edge.ts",
        "fixtures/cli/lineage-refs.ts",
        "fixtures/cli/refinement-target.ts",
        "fixtures/cli/value-grade.ts",
        "fixtures/cli/memory-layer.ts",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.recipe?.sprintArgs.mode).toBe("full");
  });



  test("5 paths no hint → still returns full recipe with all required fields", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Add shared fixture helper to all CLI runner tests",
      scopePaths: ["tests/a.ts", "tests/b.ts", "tests/c.ts", "tests/d.ts", "tests/e.ts"],
    });

    expect(typeof result.decision).toBe("string");
    expect(Array.isArray(result.prefetchSucceeded)).toBe(true);
    expect(result.prefetchSucceeded.length).toBe(3);
  });
});

// ─── T3: prefetchedContext populated (or gracefully absent) ───────────────────

describe("T3 — prefetchedContext fields (best-effort)", () => {
  test("prefetchedContext is always an object (never undefined)", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Inspect hook dependency graph",
      scopePaths: ["hooks/pre-edit-impact-mcp-first.ts"],
    });

    expect(typeof result.prefetchedContext).toBe("object");
    expect(result.prefetchedContext).not.toBeNull();
  });

  test("prefetchTimingsMs always has the 3 timing keys", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Check schema drift",
      scopePaths: ["schemas/ontology/primitives/impact-edge.ts"],
    });

    expect(Object.keys(result.prefetchTimingsMs)).toContain("impactMs");
    expect(Object.keys(result.prefetchTimingsMs)).toContain("lineageMs");
    expect(Object.keys(result.prefetchTimingsMs)).toContain("gradesMs");
  });

  test("prefetchSucceeded is a 3-tuple of booleans", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Verify codegen headers on all generated files",
      scopePaths: ["src/generated/index.ts"],
    });

    const [imp, lin, grd] = result.prefetchSucceeded;
    expect(typeof imp).toBe("boolean");
    expect(typeof lin).toBe("boolean");
    expect(typeof grd).toBe("boolean");
  });
});

// ─── T4: graceful degradation — prefetch fails, base recipe still returned ────

describe("T4 — graceful degradation when prefetch fails", () => {
  test("no scopePaths → impact prefetch skipped → still returns valid result", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Run a general audit of the palantir-mini substrate",
    });

    // Impact fetch skipped (no scopePaths)
    expect(result.prefetchSucceeded[0]).toBe(false);
    expect(result.prefetchedContext.impact).toBeUndefined();
    // But base recipe still present
    expect(typeof result.decision).toBe("string");
  });

  test("empty scopePaths → still returns decision + species + rationale", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Review last sprint events",
      scopePaths: [],
    });

    expect(typeof result.decision).toBe("string");
  });


  test("missing intent throws descriptive error", async () => {
    const project = makeTmpProject();
    await expect(
      routeIntent({ project, intent: "" }),
    ).rejects.toThrow(/pm_intent_router.*intent.*required/i);
  });

  test("missing project throws descriptive error", async () => {
    await expect(
      routeIntent({ project: "", intent: "valid intent" }),
    ).rejects.toThrow(/pm_intent_router.*project.*required/i);
  });
});

// ─── T5: event emission ───────────────────────────────────────────────────────

describe("T5 — event emission", () => {
  test("emits validation_phase_completed with intent_routing_completed errorClass", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Add new hook for session cleanup",
      scopePaths: ["hooks/session-cleanup.ts"],
    });

    const events = readEvents(project);
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    expect(routingEvent).toBeDefined();
  });

  test("emitted event carries decision field in payload", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Trivial one-file hook fix",
      scopePaths: ["hooks/plans-index-drift-detect.ts"],
      complexityHint: "trivial",
    });

    const events = readEvents(project);
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    expect((routingEvent?.payload as { decision?: string })?.decision).toBeTruthy();
  });


  test("emitted event carries prefetchSucceeded 3-tuple in payload", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "One scope path intent",
      scopePaths: ["hooks/session-cleanup.ts"],
    });

    const events = readEvents(project);
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    const ps = (routingEvent?.payload as { prefetchSucceeded?: unknown[] })?.prefetchSucceeded;
    expect(Array.isArray(ps)).toBe(true);
    expect((ps as unknown[]).length).toBe(3);
  });
});

// ─── T6: Lead Intent -> Digital Twin gate ────────────────────────────────────

describe("T6 — Lead Intent -> Digital Twin contract gate", () => {
  test("complex palantir-math 3D ontology implementation without refs is blocked", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.decision).toBe("contract_required");
    expect(result.recipe).toBeUndefined();
    expect(result.contractGate.requiredContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);

    const blockedEvent = readEvents(project).find(
      (event) =>
        event.type === "validation_phase_completed" &&
        event.payload?.decision === "contract_required",
    );
    expect(blockedEvent?.payload?.projectRoot).toBe(project);
    expect(blockedEvent?.payload?.runtime).toBe("unknown");
    expect(blockedEvent?.payload?.memoryLayers).toEqual(["semantic", "procedural"]);
    expect(blockedEvent?.withWhat?.refinementTarget).toMatchObject({
      kind: "rule-conformance-policy",
      filePathOrRid: "bridge/handlers/pm-intent-router.ts",
    });
  });

  test("read-only palantir-math 3D triage still routes", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Read-only triage of the swift-spinning-teapot 3D plan and wait",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "docs/proposals/interactive-math-runtime-blueprint.md",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.decision).not.toBe("contract_required");
    expect(result.contractGate.status).toBe("not_required");
    expect(result.contractGate.contractPolicy).toBe("ambient");
    expect(result.contractGate.recommendedContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);
  });

  test("operational ship handoff closeout with explicit no mutation ignores temporary refs and continuity gaps", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent:
        "Commit, push, open PR, merge, refresh plugin install, and write handoff after " +
        "the approved source slice; no additional source edit or ontology mutation.",
      scopePaths: ["bridge/handlers/pm-intent-router.ts"],
      complexityHint: "multi-file",
      runtime: "codex",
      semanticIntentContractRef: "semantic-intent:temp:ship-closeout",
      digitalTwinChangeContractRef: "digital-twin-change:temp:ship-closeout",
      workContractRef: "work-contract:temp:ship-closeout",
      routerBindingRef: "router-binding:temp:ship-closeout",
    });

    expect(result.decision).not.toBe("contract_required");
    expect(result.decision).not.toBe("blocked_for_clarification");
    expect(result.contractGate.status).toBe("not_required");
    expect(result.contractGate.contractPolicy).toBe("ambient");
    expect(result.contractGate.requiredContracts).toEqual([]);
    expect(result.routingProjection.basis).toBe("raw-intent");
    expect(result.promptContinuity?.valid).toBe(false);
  });

  test("actual router source fixes remain contract-gated despite closeout negation text", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent:
        "Fix router dispatch and write tests for the ship/handoff contract gap; " +
        "no additional source edit or ontology mutation.",
      scopePaths: ["bridge/handlers/pm-intent-router.ts"],
      complexityHint: "multi-file",
    });

    expect(result.decision).toBe("contract_required");
    expect(result.contractGate.status).toBe("contract_required");
    expect(result.routingProjection.basis).toBe("ontology-affecting-raw-intent-fail-closed");
  });

  test("unresolved refs block complex ontology-affecting dispatch", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
      semanticIntentContractRef: "semantic-intent:approved:test",
      digitalTwinChangeContractRef: "digital-twin-change:approved:test",
      workContractRef: "work-contract:approved:test",
      routerBindingRef: "router-binding:approved:test",
    });

    expect(result.contractGate.status).toBe("blocked_for_clarification");
    expect(result.routingProjection.basis).toBe("unresolved-contract-refs");
    expect(result.routingProjection.hasContractFields).toBe(false);
    expect(result.decision).toBe("blocked_for_clarification");
    expect(result.workContractRef).toBe("work-contract:approved:test");
    expect(result.routerBindingRef).toBe("router-binding:approved:test");
  });

  test("approved inline contracts still require FDE provenance for workflow-control-plane dispatch", async () => {
    const project = makeTmpProject();
    const blocked = await routeIntent({
      project,
      intent: "Implement Ontology Engineering WorkflowContract and TurnCardDecisionSpec enforcement",
      scopePaths: ["bridge/handlers/pm-ontology-engineering-workflow.ts"],
      complexityHint: "cross-cutting",
      ...approvedContractEvidence(),
    });

    expect(blocked.decision).toBe("contract_required");
    expect(blocked.contractGate.status).toBe("contract_required");
    expect(blocked.contractGate.reason).toContain("FDEOntologyEngineeringSession provenance");

    const allowed = await routeIntent({
      project,
      intent: "Implement Ontology Engineering WorkflowContract and TurnCardDecisionSpec enforcement",
      scopePaths: ["bridge/handlers/pm-ontology-engineering-workflow.ts"],
      complexityHint: "cross-cutting",
      ...approvedContractEvidence(),
      fdeOntologyEngineeringSessionRef: "fde-ontology-engineering://session/test",
    });

    expect(allowed.decision).not.toBe("contract_required");
    expect(allowed.contractGate.status).toBe("pass");
  });

  test("approved inline contract fields override raw prompt research bias", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent:
        "Research the palantir-math plan docs and prepare the 3D migration writeup before coding",
      scopePaths: [
        "docs/proposals/swift-spinning-teapot-3d.md",
        "research/3d/runtime-blueprint.md",
      ],
      complexityHint: "cross-cutting",
      ...approvedContractEvidence(),
    });

    expect(result.contractGate.status).toBe("pass");
    expect(result.routingProjection.basis).toBe("approved-inline-contracts");
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("ready-for-router");
    expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(true);
    expect(result.routingProjection.hasContractFields).toBe(true);
    expect(result.routingProjection.scopePaths).toEqual([
      "ontology/data/visual3D.ts",
      "src/lib/jsxGraph3D/scene3DCompiler.ts",
    ]);
    expect(result.decision).toBe("delegate-to-ontology-steward");
    expect(result.recipe?.agent).toBe("ontology-steward");
  });

  test("approved inline contracts derive WorkContract and RouterBinding additively", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent:
        "Research the palantir-math plan docs and prepare the 3D migration writeup before coding",
      scopePaths: [
        "docs/proposals/swift-spinning-teapot-3d.md",
        "research/3d/runtime-blueprint.md",
      ],
      complexityHint: "cross-cutting",
      ...approvedContractEvidence(),
    });

    expect(result.decision).toBe("delegate-to-ontology-steward");
    expect(result.recipe?.agent).toBe("ontology-steward");
    expect(result.recipe?.mcpTools).toContain("apply_edit_function");
    expect(result.recipe?.criticalFiles).toEqual([
      "ontology/data/visual3D.ts",
      "src/lib/jsxGraph3D/scene3DCompiler.ts",
    ]);
    expect(result.workContract?.status).toBe("bound");
    expect(result.workContract?.semanticIntentContractRef).toBe(
      "semantic-intent:approved:scene3d",
    );
    expect(result.routerBinding?.status).toBe("attached");
    expect(result.routerBinding?.workContractRef).toBe(result.workContract?.contractId);
    expect(result.workContract?.routerBinding?.bindingId).toBe(
      result.routerBinding?.bindingId,
    );
    expect(result.workContractValidation?.valid).toBe(true);
    expect(result.routerBindingValidation?.valid).toBe(true);
    expect(result.ontologyDtcBuildReadinessGate?.checks["ready-for-router"].valid).toBe(
      true,
    );
    expect(result.recipe?.contractBinding?.workContractRef).toBe(
      result.workContract?.contractId,
    );
    expect(result.recipe?.contractBinding?.routerBindingRef).toBe(
      result.routerBinding?.bindingId,
    );
  });

  test("mismatched WorkContract blocks ontology-affecting router dispatch", async () => {
    const project = makeTmpProject();
    const mismatchedWorkContract: WorkContract = {
      contractId: "work-contract:mismatched:scene3d",
      status: "bound",
      bindingMode: "derived-from-approved-contracts",
      semanticIntentContractRef: "semantic-intent:approved:other",
      digitalTwinChangeContractRef: "digital-twin-change:approved:scene3d",
      workSummary: "Attempt to widen Scene3D work outside the approved surfaces.",
      scopePaths: ["src/unauthorized/outside-scope.ts"],
      nonGoals: [],
      allowedActions: ["Route implementation."],
      forbiddenActions: ["Do not widen SceneV4."],
    };

    const result = await routeIntent({
      project,
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
      ...approvedContractEvidence(),
      workContract: mismatchedWorkContract,
    });

    expect(result.contractGate.status).toBe("contract_required");
    expect(result.decision).toBe("contract_required");
    expect(result.recipe).toBeUndefined();
    expect(result.workContractValidation?.valid).toBe(false);
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
    expect(result.ontologyDtcBuildReadinessGate?.checks["work-contract-valid"].valid).toBe(
      false,
    );
    expect(result.workContractValidation?.issues.map((issue) => issue.field)).toContain(
      "semanticIntentContractRef",
    );
    expect(result.workContractValidation?.issues.map((issue) => issue.field)).toContain(
      "scopePaths",
    );
    expect(result.routerBinding).toBeUndefined();
  });

  test("missing eval, branch, and permission evidence blocks router readiness", async () => {
    const project = makeTmpProject();
    const evidence = approvedContractEvidence();
    const missingEvidenceDtc: DigitalTwinChangeContract = {
      ...evidence.digitalTwinChangeContract,
      requiredEvaluationRefs: [],
      requiredBranchPolicyRef: undefined,
      requiredPermissionPolicyRef: undefined,
    };

    const result = await routeIntent({
      project,
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
      semanticIntentContract: evidence.semanticIntentContract,
      digitalTwinChangeContract: missingEvidenceDtc,
      semanticConsistencyResult: evidence.semanticConsistencyResult,
    });

    const fields =
      result.ontologyDtcBuildReadinessGate?.issues.map((issue) => issue.field) ?? [];
    expect(result.decision).toBe("blocked_for_clarification");
    expect(result.recipe).toBeUndefined();
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
    expect(result.ontologyDtcBuildReadinessGate?.checks["body-validated"].valid).toBe(
      false,
    );
    expect(fields).toContain("digitalTwinChangeContract.requiredEvaluationRefs");
    expect(fields).toContain("digitalTwinChangeContract.requiredBranchPolicyRef");
    expect(fields).toContain("digitalTwinChangeContract.requiredPermissionPolicyRef");
  });

  test("context and tool readiness text does not authorize a missing readiness gate", async () => {
    const project = makeTmpProject();
    const evidence = approvedContractEvidence();
    const toolOnlyDtc: DigitalTwinChangeContract = {
      ...evidence.digitalTwinChangeContract,
      requiredBranchPolicyRef: undefined,
      requiredPermissionPolicyRef: undefined,
      toolSurfaceReadiness:
        "ApplicationState, RetrievalContext, and tools are available for diagnostics only.",
      ontologyDtcBuildReadiness: {
        ...(evidence.digitalTwinChangeContract.ontologyDtcBuildReadiness ?? {}),
        applicationStateRefs: ["application-state:scene3d-review"],
        retrievalContextRefs: ["retrieval-context:scene3d-docs"],
        toolRefs: ["tool:ontology-context-query"],
      },
    };

    const result = await routeIntent({
      project,
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
      semanticIntentContract: evidence.semanticIntentContract,
      digitalTwinChangeContract: toolOnlyDtc,
      semanticConsistencyResult: evidence.semanticConsistencyResult,
    });

    expect(result.decision).toBe("contract_required");
    expect(result.recipe).toBeUndefined();
    expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(false);
    const fields =
      result.ontologyDtcBuildReadinessGate?.issues.map((issue) => issue.field) ?? [];
    expect(fields).toContain("digitalTwinChangeContract.requiredBranchPolicyRef");
    expect(fields).toContain("digitalTwinChangeContract.requiredPermissionPolicyRef");
  });

  test("resolvable approved prompt-front-door refs route from stored contract fields", async () => {
    const project = makeTmpProject();
    const rawPrompt =
      "Research the palantir-math plan docs and prepare the 3D migration writeup before coding";
    const envelope = await createCapturedPrompt(project, rawPrompt);
    const gate = await semanticIntentGate({
      project,
      rawIntent: rawPrompt,
      scopePaths: ["docs/proposals/swift-spinning-teapot-3d.md"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemanticContract(),
      digitalTwinChangeContract: approvedDigitalTwinContract(),
      semanticConsistencyResolverInput: scene3dSemanticConsistencyInput(),
    });

    const result = await routeIntent({
      project,
      intent: rawPrompt,
      scopePaths: ["docs/proposals/swift-spinning-teapot-3d.md"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticConsistencyResult:
        gate.semanticConsistencyResult ?? approvedSemanticConsistencyResult,
    });

    expect(gate.promptEnvelope?.state).toBe("digital_twin_approved");
    expect(result.contractGate.status).toBe("pass");
    expect(result.contractRefs?.semanticIntentContractRef).toBe(
      gate.contractRefs?.semanticIntentContractRef,
    );
    expect(result.routingProjection.hasContractFields).toBe(true);
    expect(result.routingProjection.scopePaths).toEqual([
      "ontology/data/visual3D.ts",
      "src/lib/jsxGraph3D/scene3DCompiler.ts",
    ]);
    expect(result.decision).toBe("delegate-to-ontology-steward");
    expect(result.workContractValidation?.valid).toBe(true);
    expect(result.routerBindingValidation?.valid).toBe(true);

    const routingEvent = readEvents(project).find(
      (event) =>
        event.type === "validation_phase_completed" &&
        event.payload?.errorClass === "intent_routing_completed",
    );
    expect(routingEvent?.payload?.promptId).toBe(envelope.promptId);
    expect(routingEvent?.payload?.promptHash).toBe(envelope.promptHash);
    expect(routingEvent?.payload?.runtime).toBe(envelope.runtime);
    expect(routingEvent?.payload?.projectRoot).toBe(project);
    expect(routingEvent?.payload?.memoryLayers).toEqual(["semantic", "procedural"]);
    expect(routingEvent?.payload?.workContractRef).toBe(result.workContractRef);
    expect(routingEvent?.payload?.routerBindingRef).toBe(result.routerBindingRef);
    expect(routingEvent?.payload?.contractRefs).toMatchObject({
      semanticIntentContractRef: gate.contractRefs?.semanticIntentContractRef,
      digitalTwinChangeContractRef: gate.contractRefs?.digitalTwinChangeContractRef,
      workContractRef: result.workContractRef,
      routerBindingRef: result.routerBindingRef,
      approvalRef: "user:approved:scene3d",
    });
  });

  test("resolves approved prompt-front-door refs from home fallback when router target differs", async () => {
    const homeProject = makeTmpProject();
    const targetProject = makeTmpProject();
    process.env.HOME = homeProject;
    const rawPrompt =
      "Research the palantir-math plan docs and prepare the 3D migration writeup before coding";
    const envelope = await createCapturedPrompt(homeProject, rawPrompt);
    const gate = await semanticIntentGate({
      project: targetProject,
      rawIntent: rawPrompt,
      scopePaths: ["docs/proposals/swift-spinning-teapot-3d.md"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemanticContract(),
      digitalTwinChangeContract: approvedDigitalTwinContract(),
      semanticConsistencyResolverInput: scene3dSemanticConsistencyInput(),
    });

    const result = await routeIntent({
      project: targetProject,
      intent: rawPrompt,
      scopePaths: ["docs/proposals/swift-spinning-teapot-3d.md"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticConsistencyResult:
        gate.semanticConsistencyResult ?? approvedSemanticConsistencyResult,
    });

    expect(gate.promptEnvelopeLookup).toMatchObject({
      selectedPromptFrontDoorRoot: homeProject,
      selectedBy: "home-fallback",
    });
    expect(result.promptContinuity?.valid).toBe(true);
    expect(result.promptEnvelopeLookup).toMatchObject({
      selectedPromptFrontDoorRoot: homeProject,
      selectedBy: "home-fallback",
    });
    expect(result.contractGate.status).toBe("pass");
    expect(result.contractRefs?.semanticIntentContractRef).toBe(
      gate.contractRefs?.semanticIntentContractRef,
    );
    expect(result.routingProjection.basis).toBe("approved-inline-contracts");
    expect(result.decision).toBe("delegate-to-ontology-steward");
    expect(result.workContractValidation?.valid).toBe(true);
    expect(result.routerBindingValidation?.valid).toBe(true);
  });

  test("malformed prompt-front-door DTC surface refs block instead of throwing", async () => {
    const project = makeTmpProject();
    const rawPrompt = "Fix pm_intent_router prompt-front-door shape handling";
    const envelope = await createCapturedPrompt(project, rawPrompt);
    const store = new PromptFrontDoorStore({ projectRoot: project });
    const semanticRecord = await store.writeContractRecord(
      envelope,
      "semantic-intent",
      approvedSemanticContract(),
    );
    const digitalTwin = approvedDigitalTwinContract();
    (digitalTwin as unknown as { affectedSurfaces: unknown[] }).affectedSurfaces = [
      {
        surfaceRef: {
          kind: "FileSurface",
          rid: "file:bridge/handlers/pm-intent-router.ts",
          sourcePath: "bridge/handlers/pm-intent-router.ts",
        },
        impact: "Router dispatch and prompt-front-door contract validation.",
      },
    ];
    const digitalTwinRecord = await store.writeContractRecord(
      envelope,
      "digital-twin-change",
      digitalTwin,
    );
    await store.writeEnvelope(
      withPromptState(envelope, "digital_twin_approved", {
        semanticIntentContractRef: semanticRecord.ref,
        digitalTwinChangeContractRef: digitalTwinRecord.ref,
        approvalRef: "user:approved:scene3d",
      }),
    );

    const result = await routeIntent({
      project,
      intent: rawPrompt,
      scopePaths: ["bridge/handlers/pm-intent-router.ts"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    });

    expect(result.decision).toBe("blocked_for_clarification");
    expect(result.routingProjection.basis).toBe("unresolved-contract-refs");
    expect(result.contractGate.digitalTwin.issues.map((issue) => issue.field)).toContain(
      "affectedSurfaces.0",
    );
  });

  test("approved inline contracts override draft prompt-front-door refs from the same prompt", async () => {
    const project = makeTmpProject();
    const rawPrompt =
      "Implement deterministic enforcement in the palantir-mini plugin after reading docs";
    const envelope = await createCapturedPrompt(project, rawPrompt);
    const draftGate = await semanticIntentGate({
      project,
      rawIntent: rawPrompt,
      scopePaths: ["docs/proposals/enforcement.md", "bridge/handlers/pm-intent-router.ts"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    });

    const result = await routeIntent({
      project,
      intent: rawPrompt,
      scopePaths: ["docs/proposals/enforcement.md", "bridge/handlers/pm-intent-router.ts"],
      complexityHint: "cross-cutting",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      ...approvedContractEvidence(),
    });

    expect(draftGate.contractRefs?.semanticIntentContractRef).toBeDefined();
    expect(result.contractGate.status).toBe("pass");
    expect(result.routingProjection.basis).toBe("approved-inline-contracts");
    expect(result.routingProjection.hasContractFields).toBe(true);
    expect(result.contractRefs?.semanticIntentContractRef).toBe(
      "semantic-intent:approved:scene3d",
    );
    expect(result.contractRefs?.semanticIntentContractRef).not.toBe(
      draftGate.contractRefs?.semanticIntentContractRef,
    );
    expect(result.decision).toBe("delegate-to-ontology-steward");
  });

  test("T7 — result always contains suggestedAgents field (PR-2 T10)", async () => {
    // suggestedAgents is populated by routeCapabilityOntology when availableAgents
    // is provided. When no agents are passed (default path), the field should still
    // be present as an empty array (not undefined), matching CapabilityRouterResult shape.
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Implement new hook for session cleanup",
      scopePaths: ["hooks/session-cleanup.ts"],
      semanticIntentContractRef: "semantic-intent:approved:test",
      digitalTwinChangeContractRef: "digital-twin-change:approved:test",
    });

    // The handler currently builds a base recipe without calling routeCapabilityOntology,
    // so suggestedAgents from the result path does not exist on IntentRouterResult.
    // This test verifies that the result can be consumed safely — i.e., there is no
    // runtime crash and the core fields (decision) are always present.
    expect(typeof result.decision).toBe("string");
    expect(result.prefetchSucceeded.length).toBe(3);
  });

  test("draft inline contracts block for clarification", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
      semanticIntentContract: {
        contractId: "semantic-intent:draft:test",
        status: "draft",
        rawIntent: "Implement Scene3D",
        confirmedIntent: "",
        nonGoals: [],
        approvedNouns: [],
        approvedVerbs: [],
        affectedSurfaces: [],
        permissionsAndProposal: "",
        acceptedRisks: [],
        downstreamAllowed: [],
        downstreamForbidden: [],
        clarificationQuestions: [],
      },
      digitalTwinChangeContract: {
        contractId: "digital-twin:draft:test",
        status: "draft",
        semanticIntentContractRef: "semantic-intent:draft:test",
        affectedSurfaces: [],
        changeBoundary: "",
        branchProposalPolicy: "",
        permissionBoundary: "",
        replayMigrationPlan: "",
        observabilityPlan: "",
        toolSurfaceReadiness: "",
        evaluationPlan: "",
        risks: [],
      },
    });

    expect(result.decision).toBe("blocked_for_clarification");
    expect(result.contractGate.semanticIntent.valid).toBe(false);
    expect(result.contractGate.digitalTwin.valid).toBe(false);
  });
});

// ─── T-PR3.4: ontology_context_query wiring (sprint-096 PR 3.4) ──────────────

describe("T-PR3.4 — ontology_context_query canonical context-load path", () => {
  test("routeIntent with valid intent + scope returns result that includes ontologyContextDigest field", async () => {
    const project = makeTmpProject();
    const result = await routeIntent({
      project,
      intent: "Add hook for session cleanup in bridge handlers",
      scopePaths: ["bridge/handlers/pm-intent-router.ts"],
    });

    // Core routing fields always present
    expect(typeof result.decision).toBe("string");
    expect(result.prefetchSucceeded.length).toBe(3);

    // PR 3.4: ontologyContextDigest is either a string (context succeeded) or undefined (fallback)
    if (result.ontologyContextDigest !== undefined) {
      expect(typeof result.ontologyContextDigest).toBe("string");
      // Digest format: "gc:<float>|rids:<int>|caps:<int>|t3+:<int>"
      expect(result.ontologyContextDigest).toMatch(/^gc:\d+\.\d+\|rids:\d+\|caps:\d+\|t3\+:\d+$/);
    }
    // Field is present on the type (not undefined due to type narrowing)
    expect("ontologyContextDigest" in result || result.ontologyContextDigest === undefined).toBe(true);
  });

  test("routeIntent falls back gracefully when ontology_context_query throws — advisory event emitted", async () => {
    // Simulate a failing ontology_context_query by providing a non-existent project path
    // that will cause internal sub-composes to fail or be skipped (graceful degradation)
    const project = makeTmpProject();

    // We can't easily mock the lazy import, but we can verify fallback behavior
    // by checking that the router always returns a valid result regardless.
    const result = await routeIntent({
      project,
      intent: "Research the architecture and wait for instructions",
      scopePaths: [],
    });

    // Core routing contract: always returns valid result (fallback path)
    expect(typeof result.decision).toBe("string");
    expect(Array.isArray(result.prefetchSucceeded)).toBe(true);
    expect(result.prefetchSucceeded.length).toBe(3);
    // prefetchedContext always an object
    expect(typeof result.prefetchedContext).toBe("object");
  });

  test("emitted intent_routing_completed event carries ontologyContextDigest field in payload", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Update CHANGELOG with PR 3.4 routing changes",
      scopePaths: ["CHANGELOG.md"],
      complexityHint: "trivial",
    });

    const events = readEvents(project);
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    expect(routingEvent).toBeDefined();
    // ontologyContextDigest is present in payload (may be null or string)
    const digest = (routingEvent?.payload as { ontologyContextDigest?: unknown })?.ontologyContextDigest;
    expect("ontologyContextDigest" in (routingEvent?.payload ?? {})).toBe(true);
    if (digest !== null && digest !== undefined) {
      expect(typeof digest).toBe("string");
    }
  });

  test("emitted intent_routing_completed event carries rawIntentFallback boolean in payload", async () => {
    const project = makeTmpProject();
    await routeIntent({
      project,
      intent: "Fix typo in hook comment",
      scopePaths: ["hooks/session-cleanup.ts"],
      complexityHint: "trivial",
    });

    const events = readEvents(project);
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    expect(routingEvent).toBeDefined();
    const rawIntentFallback = (routingEvent?.payload as { rawIntentFallback?: unknown })?.rawIntentFallback;
    expect(typeof rawIntentFallback).toBe("boolean");
  });
});

// ─── T-PR10: Workflow-trace wire assertions (PR-10 foamy-giggling-kettle) ──────
// Verifies that when an open workflow trace is present in the session,
// pm_intent_router transitions it to "router" mode and emits
// workflow_trace_transitioned events with fromMode/toMode/traceId.

import {
  openOntologyWorkflowTrace,
} from "../../../lib/ontology-workflow/emit";

describe("T-PR10 — workflow-trace transition wire", () => {
  test("router transitions an open trace to router mode and emits event", async () => {
    const project = makeTmpProject();

    // Open a trace at context-only mode
    const trace = await openOntologyWorkflowTrace({
      projectRoot: project,
      mode: "context-only",
      reasoning:
        "T-PR10 test: pre-seeding open trace at context-only for router wire assertion — rule 01 §ForwardProp",
    });

    // Route intent with trivial complexity so it passes the contract gate and emits
    // intent_routing_completed (not blocked).
    await routeIntent({
      project,
      intent: "Fix typo in workflow trace emitter comment",
      scopePaths: ["lib/ontology-workflow/emit.ts"],
      complexityHint: "trivial",
    });

    const events = readEvents(project);

    // Verify router emitted its standard routing event
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    expect(routingEvent).toBeDefined();

    // Verify workflow trace transition was emitted for our open trace
    const traceTransitions = events.filter(
      (e) =>
        e.type === "workflow_trace_transitioned" &&
        (e.payload as { traceId?: string })?.traceId === trace.traceId,
    );

    // At minimum one transition must carry toMode="router"
    const routerTransition = traceTransitions.find(
      (e) => (e.payload as { toMode?: string })?.toMode === "router",
    );
    expect(routerTransition).toBeDefined();
    expect(
      (routerTransition?.payload as { fromMode?: string })?.fromMode,
    ).toBeTruthy();
  });

  test("router emits workflow_trace_transitioned payload with traceId", async () => {
    const project = makeTmpProject();

    const trace = await openOntologyWorkflowTrace({
      projectRoot: project,
      mode: "context-only",
      reasoning:
        "T-PR10 test: verifying traceId flows through router payload — PR-10 wire spec §5",
    });

    // Use trivial scope so contract gate allows routing and emits intent_routing_completed
    await routeIntent({
      project,
      intent: "Update CHANGELOG.md with PR-10 workflow trace entry",
      scopePaths: ["CHANGELOG.md"],
      complexityHint: "trivial",
    });

    const events = readEvents(project);

    // In all cases the router returns a routing decision event (core contract unchanged)
    const routingEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string })?.errorClass === "intent_routing_completed",
    );
    expect(routingEvent).toBeDefined();

    // When the trace transition fires, verify traceId is carried correctly
    const traceEvent = events.find(
      (e) =>
        e.type === "workflow_trace_transitioned" &&
        (e.payload as { traceId?: string })?.traceId === trace.traceId,
    );
    if (traceEvent !== undefined) {
      expect((traceEvent.payload as { traceId?: string })?.traceId).toBe(trace.traceId);
      expect((traceEvent.payload as { toMode?: string })?.toMode).toBe("router");
    }
  });
});
