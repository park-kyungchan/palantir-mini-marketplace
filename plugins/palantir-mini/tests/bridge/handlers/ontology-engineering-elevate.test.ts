// palantir-mini — COMPOSED GOVERNED OE-ELEVATION FLOW test (`elevate` seam).
//
// PROVES the conceptual completion of the operative ontology-first vertical
// slice: a SINGLE governed call composes the already-built governed steps
//   ingest → lint → draft_sic → APPROVAL GATE → register
// so a runtime adapter DRIVES the governed pipeline through pm (not ad-hoc
// individual calls). Two paths:
//   AUTHORIZED   — caller supplies approved SIC+DTC + readyForDigitalTwin →
//                  phase "elevated" + primitives READABLE in get_ontology.
//   UNAUTHORIZED — same call WITHOUT the approval fields → phase
//                  "awaiting-approval", NOTHING registered (governance gate).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { handleOntologyEngineeringWorkflow } from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import getOntology from "../../../bridge/handlers/get-ontology";
import { projectPrimitiveRid } from "../../../lib/actions/project-primitive-rid";
import {
  createFDEOntologyEngineeringSessionFromEntry,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../../lib/fde-ontology-engineering/session-store";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import type { FDEReadinessProfileEvaluation } from "../../../lib/fde-ontology-engineering/types";

const tmpRoots: string[] = [];
const tmpFiles: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-elevate-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
});

/**
 * 3-record SOURCE fixture: a DATA atom (object "선형함수"), a LOGIC atom
 * (function "기울기 계산"), and an EDGE between them. The edge is CROSS-LAYER
 * (object → function); since register builds a COMBINED cross-layer name→rid map,
 * the link resolves and is registerable.
 */
function writeFixture(): string {
  const records = [
    {
      kg_layer: "DATA",
      record_type: "kg_linear_function_data_atom_candidate",
      candidate_id: "lfa-dt-001",
      label_ko: "선형함수",
      description_ko: "y = ax + b 형태의 함수",
      atom_kind: "entity",
      source_basis_refs: ["ref:lf-entity"],
    },
    {
      kg_layer: "LOGIC",
      record_type: "kg_linear_function_logic_atom_candidate",
      candidate_id: "lfa-lg-010",
      label_ko: "기울기 계산",
      description_ko: "두 점으로 기울기를 계산한다",
      logic_kind: "computation",
      source_basis_refs: ["ref:slope-1"],
    },
    {
      // RESOLVES cross-layer: source=선형함수(object), target=기울기 계산(function)
      kg_layer: "EDGE",
      record_type: "kg_linear_function_composition_edge_candidate",
      candidate_id: "lfe-001",
      source_candidate_id: "lfa-dt-001",
      target_candidate_id: "lfa-lg-010",
      edge_kind: "computes",
    },
  ];
  const file = path.join(
    os.tmpdir(),
    `pm-elevate-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
  fs.writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  tmpFiles.push(file);
  return file;
}

/**
 * OE-2 (D3-2) — seed a GENUINELY-graded current FDE session. elevate no longer
 * fabricates a passing readiness from the caller flag; it reads the session's
 * INDEPENDENT grade. Ingest merges its candidates onto this current session,
 * preserving the grade. The grade stands for a prior real grading run.
 */
function seedGradedCurrentSession(projectRoot: string): void {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "elevate a linear-function ontology",
    projectRoot,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const readinessProfile: FDEReadinessProfileEvaluation = {
    profileId: "mission-decision",
    score: 1,
    readyForSemanticIntent: true,
    readyForDigitalTwin: true,
    requirementResults: [],
    missingRequired: [],
    warnings: [],
  };
  writeFDEOntologyEngineeringSessionSnapshot({
    ...base,
    readinessProfileId: "mission-decision",
    readinessProfile,
  });
}

describe("COMPOSED GOVERNED OE-ELEVATION FLOW — `elevate` seam", () => {
  test("AUTHORIZED: approved SIC+DTC + a GENUINELY-graded session → phase 'elevated' + READABLE primitives", async () => {
    const P = setupRoot("auth");
    const fixture = writeFixture();
    // OE-2: the caller flag is governance INTENT; the GRADE is read independently.
    seedGradedCurrentSession(P);

    const result = await handleOntologyEngineeringWorkflow({
      action: "elevate",
      project: P,
      sourceJsonlPath: fixture,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractStatus: "approved",
      readyForDigitalTwin: true,
    });

    // Composed flow ran all steps.
    expect(result.elevate?.phase).toBe("elevated");
    expect(result.elevate?.ingest.counts.objects).toBeGreaterThan(0);
    expect(result.elevate?.ingest.counts.functions).toBeGreaterThan(0);
    expect(result.elevate?.sic.contractRef).toBeTruthy();
    // Lint findings present (advisory — surfaced even when authorized).
    expect(Array.isArray(result.elevate?.lint.findings)).toBe(true);

    // Registered + READABLE in the project snapshot: object + function rids
    // and the resolved cross-layer link.
    expect(result.elevate?.register?.committed).toBe(true);
    const objRid = projectPrimitiveRid(P, "object-type", "선형함수");
    const fnRid = projectPrimitiveRid(P, "function", "기울기 계산");
    const linkRid = projectPrimitiveRid(P, "link-type", "computes");

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    // FOLD-1: buckets now hold { rid, declaration? } — project to rids to assert.
    expect(reg.objectTypes.map((e) => e.rid)).toContain(objRid);
    expect(reg.functions.map((e) => e.rid)).toContain(fnRid);
    expect(reg.linkTypes.map((e) => e.rid)).toContain(linkRid);
  });

  test("UNAUTHORIZED: no approval fields → phase 'awaiting-approval', NOTHING registered", async () => {
    const P = setupRoot("unauth");
    const fixture = writeFixture();

    const result = await handleOntologyEngineeringWorkflow({
      action: "elevate",
      project: P,
      sourceJsonlPath: fixture,
    });

    // Governance gate held: awaiting-approval, no register.
    expect(result.elevate?.phase).toBe("awaiting-approval");
    expect(result.elevate?.register).toBeUndefined();
    expect(result.elevate?.note).toContain("approved");

    // Steps still ran: ingest counts + sic ref + lint findings present (advisory).
    expect(result.elevate?.ingest.counts.objects).toBeGreaterThan(0);
    expect(result.elevate?.ingest.counts.functions).toBeGreaterThan(0);
    expect(result.elevate?.sic.contractRef).toBeTruthy();
    expect(Array.isArray(result.elevate?.lint.findings)).toBe(true);

    // NOTHING materialized for P.
    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.objectTypes.length).toBe(0);
    expect(reg.functions.length).toBe(0);
    expect(reg.linkTypes.length).toBe(0);
  });
});
