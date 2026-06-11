/**
 * Slice B (Round 2) — the gate front-door is the SECOND `mutationAuthorized` producer
 * (the first, the OE-workflow state, shipped in PR #155). This file LOCKS the additive
 * mutation-mode lane + the self-describing front-door on `pm_semantic_intent_gate`:
 *
 *  - ROUTING-INVARIANT LOCK (the load-bearing one): with no `mutationMode` (or an
 *    explicit default `builder-structure-write`), the projection's `mutationAuthorized`,
 *    `currentPhase`, and `allowedNextActions` are IDENTICAL to pre-change — the promotion
 *    path is untouched. A declared `consumer-data-write` (with its lighter proof) yields
 *    the consumer lane in `allowedNextActions` WITHOUT the promotion gate, and WITHOUT
 *    widening the legacy `mutationAuthorized` boolean.
 *  - P5b: the projection states the phase (`currentPhase`) and the canonical next action
 *    (head of `allowedNextActions`).
 *  - P6: an Ontology-Engineering intent that reaches the gate WITHOUT FDE provenance
 *    bounces to `contract_required`, the projection names the EXACT next call
 *    (`pm_ontology_engineering_workflow start`) as the head of `allowedNextActions`, AND
 *    a distinct `fde_provenance_required` 5-dim event is persisted with the asserted
 *    payload shape (diagnosis P6 part B: previously this bounce was never persisted).
 *
 * Drives the REAL `semanticIntentGate` handler (no mocks). The default-vs-explicit-default
 * comparison is the invariant: two calls identical except for `mutationMode` must produce
 * the same routing surface, proving the new lane is a no-op under the default mode.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { semanticIntentGate } from "../../../bridge/handlers/pm-semantic-intent-gate";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-gate-mutation-mode-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function readEvents(project: string): Array<{
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
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

beforeEach(() => {
  // no-op; each test makes its own tmp project
});

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A non-FDE, ontology-affecting intent (no FDE-provenance marker, so it does NOT trip the
 * P6 bounce — it exercises the promotion lane only). `human_collaborative` + a `runtime`
 * produce a populated `workflowContract` projection.
 */
const PROMOTION_GATE_INPUT = {
  rawIntent: "Implement contract questions before DigitalTwinChangeContract approval",
  scopePaths: ["bridge/handlers/pm-semantic-intent-gate.ts"],
  complexityHint: "multi-file" as const,
  runtime: "codex" as const,
  interactionMode: "human_collaborative" as const,
};

describe("pm_semantic_intent_gate — Slice B routing-invariant lock (default mutationMode)", () => {
  test("no mutationMode is byte-identical to explicit builder-structure-write on the routing surface", async () => {
    const projectA = makeTmpProject();
    const projectB = makeTmpProject();

    // A: caller declares nothing (the historical call shape).
    const noMode = await semanticIntentGate({ project: projectA, ...PROMOTION_GATE_INPUT });
    // B: caller declares the DEFAULT mode explicitly — must be a no-op vs A.
    const explicitDefault = await semanticIntentGate({
      project: projectB,
      ...PROMOTION_GATE_INPUT,
      mutationMode: "builder-structure-write",
    } as Parameters<typeof semanticIntentGate>[0]);

    // The whole point of the invariant: the gate-level routing decision is unchanged.
    expect(noMode.status).toBe(explicitDefault.status);
    expect(noMode.allowsRouting).toBe(explicitDefault.allowsRouting);

    // The projection's promotion verdict + routing surface are IDENTICAL.
    expect(noMode.workflowContract?.mutationAuthorized).toBe(false);
    expect(explicitDefault.workflowContract?.mutationAuthorized).toBe(false);
    expect(noMode.workflowContract?.mutationAuthorized).toBe(
      explicitDefault.workflowContract?.mutationAuthorized,
    );
    expect(noMode.workflowContract?.currentPhase).toBe(explicitDefault.workflowContract?.currentPhase);
    expect(noMode.workflowContract?.allowedNextActions).toEqual(
      explicitDefault.workflowContract?.allowedNextActions,
    );

    // The default mode is surfaced as builder-structure-write, and the per-mode verdict
    // tracks the promotion gate (it does NOT widen mutationAuthorized).
    expect(noMode.workflowContract?.mutationMode).toBe("builder-structure-write");
    expect(noMode.workflowContract?.mutationAuthorization?.mode).toBe("builder-structure-write");
    expect(noMode.workflowContract?.mutationAuthorization?.authorized).toBe(
      noMode.workflowContract?.mutationAuthorized,
    );

    // Anchor against the LITERAL pre-change surface (not just A===B): the unauthorized
    // promotion lane renders the turn card and does not route. If the default lane's action
    // list ever drifts, this lock goes red.
    expect(noMode.workflowContract?.allowedNextActions).toEqual([
      "render-turn-card-as-text",
      "record-user-decision",
      "do-not-route",
    ]);
  });

  test("default-mode allowedNextActions does NOT advertise a mutation-mode route (promotion path unchanged)", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({ project, ...PROMOTION_GATE_INPUT });

    const actions = result.workflowContract?.allowedNextActions ?? [];
    // Pre-change behavior: the unauthorized promotion lane renders a turn card; it never
    // names a lighter-lane route under the default mode.
    expect(actions.some((a) => a.startsWith("route-with-mutation-mode:"))).toBe(false);
    expect(actions).toContain("do-not-route");
  });
});

describe("pm_semantic_intent_gate — Slice B consumer-data-write lane (without promotion gate)", () => {
  test("declared consumer-data-write with proof authorizes the consumer lane, NOT the promotion gate", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      ...PROMOTION_GATE_INPUT,
      mutationMode: "consumer-data-write",
      consumerActionTypeRef: "action-type:record-observation",
      consumerWriteValidated: true,
    } as Parameters<typeof semanticIntentGate>[0]);

    // The lane is selected and its OWN predicate is satisfied …
    expect(result.workflowContract?.mutationMode).toBe("consumer-data-write");
    expect(result.workflowContract?.mutationAuthorization?.mode).toBe("consumer-data-write");
    expect(result.workflowContract?.mutationAuthorization?.authorized).toBe(true);

    // … WITHOUT the 9-axis promotion gate (the legacy boolean stays false — no SIC/DTC).
    expect(result.workflowContract?.mutationAuthorized).toBe(false);

    // The front door routes via the mutation-mode lane and explicitly says NOT to use the
    // promotion gate — so a consuming-layer write is not forced through SIC+DTC.
    const actions = result.workflowContract?.allowedNextActions ?? [];
    expect(actions).toContain("route-with-mutation-mode:consumer-data-write");
    expect(actions).toContain("do-not-route-via-promotion-gate");
    expect(actions[0]).toBe("route-with-mutation-mode:consumer-data-write");
  });

  test("consumer-data-write WITHOUT proof falls back to the standard unauthorized surface (no lighter route)", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      ...PROMOTION_GATE_INPUT,
      mutationMode: "consumer-data-write",
      // no consumerActionTypeRef / consumerWriteValidated -> lane gates false
    } as Parameters<typeof semanticIntentGate>[0]);

    expect(result.workflowContract?.mutationAuthorization?.authorized).toBe(false);
    expect(result.workflowContract?.mutationAuthorized).toBe(false);
    const actions = result.workflowContract?.allowedNextActions ?? [];
    // Lane not authorized -> NO lighter-lane route; identical posture to the default lane.
    expect(actions.some((a) => a.startsWith("route-with-mutation-mode:"))).toBe(false);
    expect(actions).toContain("do-not-route");
  });
});

describe("pm_semantic_intent_gate — P5b projection states phase + canonical next action", () => {
  test("projection carries currentPhase and a canonical (head) next action", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({ project, ...PROMOTION_GATE_INPUT });

    // Phase is stated (one of the projection's known phases) …
    const currentPhase = result.workflowContract?.currentPhase;
    expect(currentPhase).toBeDefined();
    expect(["semantic-intent", "digital-twin-change", "ready-to-route"]).toContain(
      currentPhase as string,
    );
    // … and there is a canonical next action (the head of the allowed set).
    const actions = result.workflowContract?.allowedNextActions ?? [];
    expect(actions.length).toBeGreaterThan(0);
    expect(typeof actions[0]).toBe("string");
  });
});

describe("pm_semantic_intent_gate — P6 FDE-provenance front-door is one self-describing, auditable hop", () => {
  /**
   * A READ-ONLY intent is not approval-gated, so the base gate routes (`not_required`,
   * allowsRouting:true); adding an FDE-provenance marker ("fde ontology engineering")
   * makes `applyFDEProvenanceFailure` flip it to `contract_required` when no FDE session
   * exists. This is exactly the P6 bounce.
   *
   * No `runtime`/`promptId`/`sessionId` are supplied: that is what lets `loadPromptEnvelope`
   * take its clean no-continuity early-return (gate stays routing) so the FDE check fires —
   * supplying `runtime` alone would trip a prompt-front-door continuity failure first and
   * mask the bounce. Consequently the persisted event records `runtime: "unknown"` (the
   * handler's `input.runtime ?? "unknown"` fallback), matching the existing gate-event test.
   */
  const FDE_BOUNCE_INPUT = {
    rawIntent: "Read-only triage of the fde ontology engineering plan and wait",
    scopePaths: ["ontology/data/visual3D.ts"],
    complexityHint: "cross-cutting" as const,
  };

  test("the gate bounces to contract_required for an FDE intent with no provenance", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({ project, ...FDE_BOUNCE_INPUT });

    expect(result.status).toBe("contract_required");
    expect(result.allowsRouting).toBe(false);
    expect(result.gate.reason).toContain("FDEOntologyEngineeringSession provenance is required");
  });

  test("the projection names pm_ontology_engineering_workflow start as the canonical next call", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({ project, ...FDE_BOUNCE_INPUT });

    const actions = result.workflowContract?.allowedNextActions ?? [];
    // The exact next call is the HEAD of the allowed set — one self-describing hop, not a
    // second unpersisted error.
    expect(actions[0]).toBe("pm_ontology_engineering_workflow start");
  });

  test("the FDE-provenance bounce is persisted as a distinct 5-dim event with the asserted payload shape", async () => {
    const project = makeTmpProject();
    await semanticIntentGate({ project, ...FDE_BOUNCE_INPUT });

    const event = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        (entry.payload as { errorClass?: string })?.errorClass === "fde_provenance_required",
    );
    // The event exists and is DISTINCT from the generic contract_required completion event.
    expect(event).toBeDefined();
    // Payload shape (the auditable record of the ordering decision).
    expect(event?.payload?.phase).toBe("design");
    expect(event?.payload?.passed).toBe(false);
    expect(event?.payload?.errorClass).toBe("fde_provenance_required");
    expect(event?.payload?.status).toBe("contract_required");
    expect(event?.payload?.requiredNextAction).toBe("pm_ontology_engineering_workflow start");
    expect(event?.payload?.requiredContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);
    expect(event?.payload?.projectRoot).toBe(project);
    // No runtime supplied (see FDE_BOUNCE_INPUT) -> handler records the "unknown" fallback.
    expect(event?.payload?.runtime).toBe("unknown");
    // No FDE session ref was supplied -> recorded as null (not omitted).
    expect(event?.payload?.fdeOntologyEngineeringSessionRef).toBeNull();
    // 5-dim provenance: the refinementTarget points the bounce at the gate handler.
    expect(event?.withWhat?.refinementTarget).toMatchObject({
      kind: "rule-conformance-policy",
      filePathOrRid: "bridge/handlers/pm-semantic-intent-gate.ts",
    });
  });

  test("an FDE intent WITH a session ref does not bounce and emits no provenance-required event", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      ...FDE_BOUNCE_INPUT,
      fdeOntologyEngineeringSessionRef: "fde-ontology-engineering://session/fde-session:supplied",
    });

    // Provenance satisfied -> the read-only intent routes normally, no bounce.
    expect(result.allowsRouting).toBe(true);
    const event = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        (entry.payload as { errorClass?: string })?.errorClass === "fde_provenance_required",
    );
    expect(event).toBeUndefined();
  });
});
