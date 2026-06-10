// palantir-mini — ontology-dtc-build sicTypedRefs pre-seed (Slice E / G10).
//
// Verifies the OPTIONAL sicTypedRefs param on advanceOntologyDTCBuildSequence:
//   - empty/absent userInput + sicTypedRefs → the proposal IS the SIC refs (G10:
//     close the re-type-CSV gap — the user confirms by sending nothing).
//   - supplied userInput + sicTypedRefs → union; user entries take precedence on
//     rid collision and extend with new refs (confirm-or-correct semantics).
//   - no sicTypedRefs → byte-identical to the prior raw-CSV behavior.

import { describe, expect, test } from "bun:test";
import {
  advanceOntologyDTCBuildSequence,
  type SicTypedRefDefaults,
} from "../../../lib/semantic-intent/ontology-dtc-build-sequence";
import type { DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";
import type { OntologyEngineeringRef } from "#schemas/ontology/primitives/ontology-engineering-ref";

function baseDtc(): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin:slice-e-test",
    status: "draft",
    semanticIntentContractRef: "semantic-intent:slice-e-test",
    affectedSurfaces: ["ontology/data/example.ts"],
    changeBoundary: "Slice E pre-seed proof only.",
    branchProposalPolicy: "Proposal PR before merge.",
    permissionBoundary: "No production publish.",
    replayMigrationPlan: "Additive fixtures only.",
    observabilityPlan: "Emit gate events.",
    toolSurfaceReadiness: "Refs threaded additively.",
    evaluationPlan: "Targeted typecheck and tests.",
    touchedOntologyRefs: [],
    requiredEvaluationRefs: [],
    risks: [],
  } as unknown as DigitalTwinChangeContract;
}

function objRef(rid: string): OntologyEngineeringRef {
  return { kind: "ObjectType", rid, confidence: "exact" } as OntologyEngineeringRef;
}

function sicRefs(): SicTypedRefDefaults {
  return {
    objectTypeRefs: [
      objRef("ri.ontology.main.object-type.invoice"),
      objRef("ri.ontology.main.object-type.customer"),
    ],
    linkTypeRefs: [
      { kind: "LinkType", rid: "ri.ontology.main.link-type.invoice-customer", confidence: "exact" } as OntologyEngineeringRef,
    ],
    actionTypeRefs: [
      { kind: "ActionType", rid: "ri.ontology.main.action-type.issue-invoice", confidence: "exact" } as OntologyEngineeringRef,
    ],
    functionRefs: [
      { kind: "Function", rid: "ri.ontology.main.function.compute-total", confidence: "exact" } as OntologyEngineeringRef,
    ],
  };
}

describe("advanceOntologyDTCBuildSequence — sicTypedRefs pre-seed (Slice E)", () => {
  test("T0 with sicTypedRefs + empty userInput proposes the SIC ObjectType refs", () => {
    const result = advanceOntologyDTCBuildSequence(baseDtc(), 0, "", undefined, sicRefs());
    const rids = result.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs ?? [];
    expect(rids).toEqual([
      "ri.ontology.main.object-type.invoice",
      "ri.ontology.main.object-type.customer",
    ]);
    // touchedOntologyRefs carries the structured SIC refs (not lossy strings).
    const touched = (result.dtcDraft.touchedOntologyRefs ?? []).map((r) => r.rid);
    expect(touched).toContain("ri.ontology.main.object-type.invoice");
    expect(touched).toContain("ri.ontology.main.object-type.customer");
  });

  test("T0 with sicTypedRefs + absent (undefined) userInput proposes the SIC refs", () => {
    const result = advanceOntologyDTCBuildSequence(baseDtc(), 0, undefined, undefined, sicRefs());
    const rids = result.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs ?? [];
    expect(rids).toEqual([
      "ri.ontology.main.object-type.invoice",
      "ri.ontology.main.object-type.customer",
    ]);
  });

  test("T0 with userInput unions/extends the SIC default refs", () => {
    const result = advanceOntologyDTCBuildSequence(
      baseDtc(),
      0,
      "ObjectType:ri.ontology.main.object-type.refund",
      undefined,
      sicRefs(),
    );
    const rids = result.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs ?? [];
    // user entry first (precedence), then the SIC defaults fill the rest.
    expect(rids).toEqual([
      "ri.ontology.main.object-type.refund",
      "ri.ontology.main.object-type.invoice",
      "ri.ontology.main.object-type.customer",
    ]);
  });

  test("T0 with userInput overriding a SIC rid dedupes (user wins, no double entry)", () => {
    const result = advanceOntologyDTCBuildSequence(
      baseDtc(),
      0,
      "ObjectType:ri.ontology.main.object-type.invoice",
      undefined,
      sicRefs(),
    );
    const rids = result.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs ?? [];
    expect(rids).toEqual([
      "ri.ontology.main.object-type.invoice",
      "ri.ontology.main.object-type.customer",
    ]);
    // exactly one structured ref for the colliding rid.
    const matches = (result.dtcDraft.touchedOntologyRefs ?? []).filter(
      (r) => r.rid === "ri.ontology.main.object-type.invoice",
    );
    expect(matches.length).toBe(1);
  });

  test("T1/T2/T3 also pre-seed from the matching SIC kind", () => {
    const refs = sicRefs();
    const t1 = advanceOntologyDTCBuildSequence(baseDtc(), 1, "", undefined, refs);
    expect(t1.dtcDraft.ontologyDtcBuildReadiness?.linkTypeRefs).toEqual([
      "ri.ontology.main.link-type.invoice-customer",
    ]);
    const t2 = advanceOntologyDTCBuildSequence(baseDtc(), 2, "", undefined, refs);
    expect(t2.dtcDraft.ontologyDtcBuildReadiness?.actionTypeRefs).toEqual([
      "ri.ontology.main.action-type.issue-invoice",
    ]);
    const t3 = advanceOntologyDTCBuildSequence(baseDtc(), 3, "", undefined, refs);
    expect(t3.dtcDraft.ontologyDtcBuildReadiness?.functionRefs).toEqual([
      "ri.ontology.main.function.compute-total",
    ]);
  });

  test("no sicTypedRefs → raw-CSV path byte-identical (4th-arg-only call)", () => {
    const withParam = advanceOntologyDTCBuildSequence(
      baseDtc(),
      0,
      "ObjectType:ri.x,ObjectType:ri.y",
      undefined,
      undefined,
    );
    const withoutParam = advanceOntologyDTCBuildSequence(
      baseDtc(),
      0,
      "ObjectType:ri.x,ObjectType:ri.y",
    );
    // identical readiness arrays + identical structured refs (modulo filledAt timestamps).
    expect(withParam.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs).toEqual(
      withoutParam.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs,
    );
    expect(withParam.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs).toEqual([
      "ri.x",
      "ri.y",
    ]);
    expect((withParam.dtcDraft.touchedOntologyRefs ?? []).map((r) => r.rid)).toEqual(
      (withoutParam.dtcDraft.touchedOntologyRefs ?? []).map((r) => r.rid),
    );
  });

  test("empty userInput + no sicTypedRefs → no refs proposed (unchanged behavior)", () => {
    const result = advanceOntologyDTCBuildSequence(baseDtc(), 0, "", undefined, undefined);
    expect(result.dtcDraft.ontologyDtcBuildReadiness?.objectTypeRefs ?? []).toEqual([]);
    expect(result.dtcDraft.touchedOntologyRefs ?? []).toEqual([]);
  });
});
